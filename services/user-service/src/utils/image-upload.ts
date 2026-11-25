import fs from 'fs';
import path from 'path';
import { createHash, randomUUID } from 'crypto';
import multer from 'multer';
import { Request, Response, NextFunction } from 'express';

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const UPLOADS_URL_PREFIX = '/api/v1/uploads';
export const UPLOAD_FIELD = 'file';
export const DEFAULT_CLOUDINARY_FOLDER = 'vexeviet';

export type ImageFolder = 'avatars' | 'operator-avatars' | 'interior' | 'exterior';

export interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  folderPrefix: string;
}

const DELIVERY_TRANSFORM_BY_FOLDER: Record<ImageFolder, string> = {
  avatars: 'f_auto,q_auto,c_limit,w_512,h_512',
  'operator-avatars': 'f_auto,q_auto,c_limit,w_512,h_512',
  interior: 'f_auto,q_auto,c_limit,w_1600,h_1200',
  exterior: 'f_auto,q_auto,c_limit,w_1600,h_1200',
};

export const getUploadDir = (): string =>
  path.resolve(process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads'));

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/** Detect the real image type from magic bytes (the client-sent mimetype is not trusted). */
export const detectImageType = (buf: Buffer): 'image/jpeg' | 'image/png' | 'image/webp' | null => {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (
    buf.length >= 8 &&
    buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return 'image/png';
  }
  if (
    buf.length >= 12 &&
    buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buf.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp';
  }
  return null;
};

export class ImageUploadError extends Error {
  public readonly statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = 'ImageUploadError';
    this.statusCode = statusCode;
  }
}

const normalizeFolderPrefix = (raw: string | undefined): string => {
  const cleaned = (raw || DEFAULT_CLOUDINARY_FOLDER).trim().replace(/^\/+|\/+$/g, '');
  return cleaned && /^[a-zA-Z0-9/_-]+$/.test(cleaned) ? cleaned : DEFAULT_CLOUDINARY_FOLDER;
};

/** Parse Cloudinary credentials from discrete env vars or `CLOUDINARY_URL`. */
export const resolveCloudinaryConfig = (
  env: NodeJS.ProcessEnv = process.env
): CloudinaryConfig | null => {
  const folderPrefix = normalizeFolderPrefix(env.CLOUDINARY_FOLDER);
  const cloudName = env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = env.CLOUDINARY_API_SECRET?.trim();

  if (cloudName && apiKey && apiSecret) {
    return { cloudName, apiKey, apiSecret, folderPrefix };
  }

  const rawUrl = env.CLOUDINARY_URL?.trim();
  if (rawUrl) {
    try {
      const parsed = new URL(rawUrl);
      if (parsed.protocol === 'cloudinary:' && parsed.hostname && parsed.username && parsed.password) {
        return {
          cloudName: parsed.hostname,
          apiKey: decodeURIComponent(parsed.username),
          apiSecret: decodeURIComponent(parsed.password),
          folderPrefix,
        };
      }
    } catch {
      return null;
    }
  }

  return null;
};

type StorageDriver =
  | { mode: 'cloudinary'; config: CloudinaryConfig }
  | { mode: 'local' };

export const resolveStorageDriver = (env: NodeJS.ProcessEnv = process.env): StorageDriver => {
  const explicit = env.IMAGE_STORAGE?.trim().toLowerCase();
  const cloudinary = resolveCloudinaryConfig(env);

  if (explicit === 'local') {
    return { mode: 'local' };
  }

  if (explicit === 'cloudinary') {
    if (!cloudinary) {
      throw new ImageUploadError(
        'IMAGE_STORAGE is set to "cloudinary" but Cloudinary credentials are missing',
        500
      );
    }
    return { mode: 'cloudinary', config: cloudinary };
  }

  if (cloudinary) {
    return { mode: 'cloudinary', config: cloudinary };
  }

  if (env.NODE_ENV === 'production') {
    throw new ImageUploadError(
      'Cloudinary credentials are required in production (set CLOUDINARY_URL or CLOUDINARY_CLOUD_NAME/CLOUDINARY_API_KEY/CLOUDINARY_API_SECRET, or IMAGE_STORAGE=local for persistent volumes)',
      500
    );
  }

  return { mode: 'local' };
};

/** Compute Cloudinary SHA-1 request signature over sorted parameters. */
export const signCloudinaryParams = (
  params: Record<string, string | number>,
  apiSecret: string
): string => {
  const serialized = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');
  return createHash('sha1').update(`${serialized}${apiSecret}`, 'utf8').digest('hex');
};

export const injectCloudinaryTransformation = (secureUrl: string, folder: ImageFolder): string => {
  const transform = DELIVERY_TRANSFORM_BY_FOLDER[folder];
  const marker = '/image/upload/';
  const idx = secureUrl.indexOf(marker);
  if (idx === -1) return secureUrl;
  return `${secureUrl.slice(0, idx + marker.length)}${transform}/${secureUrl.slice(idx + marker.length)}`;
};

/** Extract `public_id` only if the URL belongs to our Cloudinary cloud and folder prefix. */
export const extractCloudinaryPublicId = (
  url: string,
  config: CloudinaryConfig
): string | null => {
  const match = /^https:\/\/res\.cloudinary\.com\/([^/]+)\/image\/upload\/(?:[^/]+\/)*v\d+\/(.+)\.[a-z0-9]+(?:\?.*)?$/i.exec(
    url
  );
  if (!match) return null;
  const [, cloud, publicId] = match;
  if (cloud !== config.cloudName) return null;
  if (!publicId.startsWith(`${config.folderPrefix}/`) || publicId.includes('..')) return null;
  return publicId;
};

const uploadToCloudinary = async (
  buf: Buffer,
  mimeType: string,
  folder: ImageFolder,
  config: CloudinaryConfig
): Promise<string> => {
  const targetFolder = `${config.folderPrefix}/${folder}`;
  const publicId = randomUUID();
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = signCloudinaryParams(
    { folder: targetFolder, public_id: publicId, timestamp },
    config.apiSecret
  );

  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(buf)], { type: mimeType }), `${publicId}.${EXT_BY_MIME[mimeType]}`);
  form.append('folder', targetFolder);
  form.append('public_id', publicId);
  form.append('timestamp', String(timestamp));
  form.append('api_key', config.apiKey);
  form.append('signature', signature);

  let response: globalThis.Response;
  try {
    response = await fetch(
      `https://api.cloudinary.com/v1_1/${encodeURIComponent(config.cloudName)}/image/upload`,
      {
        method: 'POST',
        body: form,
        signal: AbortSignal.timeout(30_000),
      }
    );
  } catch (error) {
    console.error('[uploads] Cloudinary network error', error);
    throw new ImageUploadError('Failed to reach image storage service', 502);
  }

  const payload = (await response.json().catch(() => null)) as
    | { secure_url?: unknown; error?: { message?: unknown } }
    | null;

  if (!response.ok || !payload || typeof payload.secure_url !== 'string') {
    const detail =
      payload && typeof payload.error?.message === 'string'
        ? payload.error.message
        : `HTTP ${response.status}`;
    console.error('[uploads] Cloudinary upload rejected:', detail);
    throw new ImageUploadError('Failed to upload image to cloud storage', 502);
  }

  return injectCloudinaryTransformation(payload.secure_url, folder);
};

const destroyFromCloudinary = async (publicId: string, config: CloudinaryConfig): Promise<void> => {
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = signCloudinaryParams(
    { invalidate: 'true', public_id: publicId, timestamp },
    config.apiSecret
  );

  const body = new URLSearchParams({
    public_id: publicId,
    invalidate: 'true',
    timestamp: String(timestamp),
    api_key: config.apiKey,
    signature,
  });

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${encodeURIComponent(config.cloudName)}/image/destroy`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
        signal: AbortSignal.timeout(15_000),
      }
    );
    if (!response.ok) {
      console.error('[uploads] Cloudinary destroy failed:', response.status, publicId);
    }
  } catch (error) {
    console.error('[uploads] Cloudinary destroy error:', publicId, error);
  }
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!EXT_BY_MIME[file.mimetype]) {
      cb(new ImageUploadError('Only JPEG, PNG or WebP images are allowed', 415));
      return;
    }
    cb(null, true);
  },
});

/** Express middleware parsing a single multipart `file` field, mapping errors to JSON. */
export const singleImageUpload = (req: Request, res: Response, next: NextFunction): void => {
  upload.single(UPLOAD_FIELD)(req as never, res as never, (err: unknown) => {
    if (!err) {
      next();
      return;
    }
    if (err instanceof multer.MulterError) {
      const tooLarge = err.code === 'LIMIT_FILE_SIZE';
      res.status(tooLarge ? 413 : 400).json({
        success: false,
        error: tooLarge ? 'Image must be 5MB or smaller' : `Upload error: ${err.message}`,
      });
      return;
    }
    if (err instanceof ImageUploadError) {
      res.status(err.statusCode).json({ success: false, error: err.message });
      return;
    }
    next(err);
  });
};

/** Validate the uploaded buffer, persist it (Cloudinary or local disk) and return its public URL. */
export const saveImage = async (
  file: Express.Multer.File | undefined,
  folder: ImageFolder
): Promise<string> => {
  if (!file) {
    throw new ImageUploadError(`Image file is required (multipart field "${UPLOAD_FIELD}")`);
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new ImageUploadError('Image must be 5MB or smaller', 413);
  }
  const type = detectImageType(file.buffer);
  if (!type) {
    throw new ImageUploadError('File content is not a valid JPEG, PNG or WebP image', 415);
  }

  const driver = resolveStorageDriver();
  if (driver.mode === 'cloudinary') {
    return uploadToCloudinary(file.buffer, type, folder, driver.config);
  }

  const dir = path.join(getUploadDir(), folder);
  await fs.promises.mkdir(dir, { recursive: true });
  const name = `${randomUUID()}.${EXT_BY_MIME[type]}`;
  await fs.promises.writeFile(path.join(dir, name), file.buffer);
  return `${UPLOADS_URL_PREFIX}/${folder}/${name}`;
};

/** Best-effort removal of a file previously produced by `saveImage` (ignores foreign URLs). */
export const deleteImageByUrl = async (url: string | null | undefined): Promise<void> => {
  if (!url) return;

  if (url.startsWith('https://res.cloudinary.com/')) {
    const config = resolveCloudinaryConfig();
    if (!config) return;
    const publicId = extractCloudinaryPublicId(url, config);
    if (!publicId) return;
    await destroyFromCloudinary(publicId, config);
    return;
  }

  if (!url.startsWith(`${UPLOADS_URL_PREFIX}/`)) return;
  const rel = url.slice(UPLOADS_URL_PREFIX.length + 1);
  const root = getUploadDir();
  const target = path.resolve(root, rel);
  if (!target.startsWith(root + path.sep)) return; // path traversal guard
  try {
    await fs.promises.unlink(target);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.error('[uploads] failed to delete', target, error);
    }
  }
};

import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import multer from 'multer';
import { Request, Response, NextFunction } from 'express';

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const UPLOADS_URL_PREFIX = '/api/v1/uploads';
export const UPLOAD_FIELD = 'file';

export type ImageFolder = 'avatars' | 'operator-avatars' | 'interior' | 'exterior';

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

/** Validate the uploaded buffer, persist it and return its public (relative) URL. */
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
  const dir = path.join(getUploadDir(), folder);
  await fs.promises.mkdir(dir, { recursive: true });
  const name = `${randomUUID()}.${EXT_BY_MIME[type]}`;
  await fs.promises.writeFile(path.join(dir, name), file.buffer);
  return `${UPLOADS_URL_PREFIX}/${folder}/${name}`;
};

/** Best-effort removal of a file previously produced by `saveImage` (ignores foreign URLs). */
export const deleteImageByUrl = async (url: string | null | undefined): Promise<void> => {
  if (!url || !url.startsWith(`${UPLOADS_URL_PREFIX}/`)) return;
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

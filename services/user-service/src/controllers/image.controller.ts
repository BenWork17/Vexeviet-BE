import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import {
  OperatorImageService,
  isGalleryType,
} from '../services/operator-image.service';
import { UserService, UserServiceError } from '../services/user.service';
import { OperatorImageRepository } from '../repositories/operator-image.repository';
import { ImageUploadError, deleteImageByUrl, saveImage } from '../utils/image-upload';
import { UserRepository } from '../repositories/user.repository';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const sendError = (res: Response, error: unknown, fallback: string): void => {
  if (error instanceof UserServiceError || error instanceof ImageUploadError) {
    res.status(error.statusCode).json({ success: false, error: error.message });
    return;
  }
  console.error('[images]', error);
  res.status(500).json({
    success: false,
    error: error instanceof Error ? error.message : fallback,
  });
};

/**
 * OPERATOR -> always their own id. ADMIN -> must pass `?operatorId=<uuid>`.
 * Returns null after responding when the target cannot be resolved.
 */
const resolveOperatorId = (req: AuthRequest, res: Response): string | null => {
  const user = req.user!;
  if (user.role === 'OPERATOR') return user.userId;
  const raw = req.query.operatorId;
  if (typeof raw !== 'string' || !UUID_PATTERN.test(raw)) {
    res.status(400).json({ success: false, error: 'operatorId (uuid) query parameter is required' });
    return null;
  }
  return raw;
};

export class ImageController {
  private readonly operatorImages = new OperatorImageService(new OperatorImageRepository());
  private readonly userService = new UserService();
  private readonly userRepo = new UserRepository();
  private readonly imageRepo = new OperatorImageRepository();

  // ---- user avatar ----
  uploadUserAvatar = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const current = await this.userRepo.findById(userId);
      if (!current) throw new UserServiceError('User not found', 404);
      const url = await saveImage(req.file, 'avatars');
      await this.imageRepo.setUserAvatar(userId, url);
      await deleteImageByUrl(current.avatarUrl);
      const user = await this.userService.getUserById(userId);
      res.status(200).json({ success: true, data: user });
    } catch (error) {
      sendError(res, error, 'Failed to update avatar');
    }
  };

  deleteUserAvatar = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const current = await this.userRepo.findById(userId);
      if (!current) throw new UserServiceError('User not found', 404);
      await this.imageRepo.setUserAvatar(userId, null);
      await deleteImageByUrl(current.avatarUrl);
      const user = await this.userService.getUserById(userId);
      res.status(200).json({ success: true, data: user });
    } catch (error) {
      sendError(res, error, 'Failed to remove avatar');
    }
  };

  // ---- operator images ----
  getOwnImages = async (req: AuthRequest, res: Response): Promise<void> => {
    const operatorId = resolveOperatorId(req, res);
    if (!operatorId) return;
    try {
      res.status(200).json({ success: true, data: await this.operatorImages.getImages(operatorId) });
    } catch (error) {
      sendError(res, error, 'Failed to load images');
    }
  };

  getPublicImages = async (req: AuthRequest, res: Response): Promise<void> => {
    const { id } = req.params;
    if (!id || !UUID_PATTERN.test(id)) {
      res.status(400).json({ success: false, error: 'id must be a valid uuid' });
      return;
    }
    try {
      res.status(200).json({ success: true, data: await this.operatorImages.getImages(id) });
    } catch (error) {
      sendError(res, error, 'Failed to load images');
    }
  };

  putAvatar = async (req: AuthRequest, res: Response): Promise<void> => {
    const operatorId = resolveOperatorId(req, res);
    if (!operatorId) return;
    try {
      const data = await this.operatorImages.setAvatar(operatorId, req.file);
      res.status(200).json({ success: true, data });
    } catch (error) {
      sendError(res, error, 'Failed to update operator avatar');
    }
  };

  deleteAvatar = async (req: AuthRequest, res: Response): Promise<void> => {
    const operatorId = resolveOperatorId(req, res);
    if (!operatorId) return;
    try {
      res.status(200).json({ success: true, data: await this.operatorImages.removeAvatar(operatorId) });
    } catch (error) {
      sendError(res, error, 'Failed to remove operator avatar');
    }
  };

  addGalleryImage = async (req: AuthRequest, res: Response): Promise<void> => {
    const type = req.params.type;
    if (!type || !isGalleryType(type)) {
      res.status(400).json({ success: false, error: 'type must be "interior" or "exterior"' });
      return;
    }
    const operatorId = resolveOperatorId(req, res);
    if (!operatorId) return;
    try {
      const data = await this.operatorImages.addImage(operatorId, type, req.file);
      res.status(201).json({ success: true, data });
    } catch (error) {
      sendError(res, error, 'Failed to add image');
    }
  };

  deleteGalleryImage = async (req: AuthRequest, res: Response): Promise<void> => {
    const type = req.params.type;
    if (!type || !isGalleryType(type)) {
      res.status(400).json({ success: false, error: 'type must be "interior" or "exterior"' });
      return;
    }
    const body = (req.body ?? {}) as { url?: unknown };
    const url = typeof req.query.url === 'string' ? req.query.url : body.url;
    if (typeof url !== 'string' || !url) {
      res.status(400).json({ success: false, error: 'url is required' });
      return;
    }
    const operatorId = resolveOperatorId(req, res);
    if (!operatorId) return;
    try {
      res
        .status(200)
        .json({ success: true, data: await this.operatorImages.removeImage(operatorId, type, url) });
    } catch (error) {
      sendError(res, error, 'Failed to delete image');
    }
  };
}

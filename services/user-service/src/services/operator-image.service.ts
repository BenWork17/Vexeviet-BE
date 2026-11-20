import { deleteImageByUrl, saveImage, ImageFolder } from '../utils/image-upload';
import { ImageColumn, OperatorImageRepository, OperatorImagesRow } from '../repositories/operator-image.repository';
import { UserServiceError } from '../utils/errors';

export const MAX_IMAGES_PER_TYPE = 10;

export type GalleryType = 'interior' | 'exterior';

export interface OperatorImages {
  operatorAvatarUrl: string | null;
  interiorImages: string[];
  exteriorImages: string[];
}

const toUrlList = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];

export const toOperatorImages = (row: OperatorImagesRow): OperatorImages => ({
  operatorAvatarUrl: row.operatorAvatarUrl,
  interiorImages: toUrlList(row.interiorImages),
  exteriorImages: toUrlList(row.exteriorImages),
});

const COLUMN: Record<GalleryType, ImageColumn> = {
  interior: 'interiorImages',
  exterior: 'exteriorImages',
};

export const isGalleryType = (value: string): value is GalleryType =>
  value === 'interior' || value === 'exterior';

export class OperatorImageService {
  constructor(private readonly repo: OperatorImageRepository = new OperatorImageRepository()) {}

  private async requireOperator(operatorId: string): Promise<OperatorImagesRow> {
    const row = await this.repo.findById(operatorId);
    if (!row || row.role !== 'OPERATOR' || row.status === 'DELETED' || row.status === 'SUSPENDED') {
      throw new UserServiceError('Operator not found', 404);
    }
    return row;
  }

  async getImages(operatorId: string): Promise<OperatorImages> {
    return toOperatorImages(await this.requireOperator(operatorId));
  }

  async setAvatar(operatorId: string, file: Express.Multer.File | undefined): Promise<OperatorImages> {
    const current = await this.requireOperator(operatorId);
    const url = await saveImage(file, 'operator-avatars');
    const row = await this.repo.setAvatar(operatorId, url);
    await deleteImageByUrl(current.operatorAvatarUrl);
    return toOperatorImages(row);
  }

  async removeAvatar(operatorId: string): Promise<OperatorImages> {
    const current = await this.requireOperator(operatorId);
    const row = await this.repo.setAvatar(operatorId, null);
    await deleteImageByUrl(current.operatorAvatarUrl);
    return toOperatorImages(row);
  }

  async addImage(
    operatorId: string,
    type: GalleryType,
    file: Express.Multer.File | undefined
  ): Promise<OperatorImages> {
    const current = await this.requireOperator(operatorId);
    const column = COLUMN[type];
    const list = toUrlList(current[column]);
    if (list.length >= MAX_IMAGES_PER_TYPE) {
      throw new UserServiceError(`At most ${MAX_IMAGES_PER_TYPE} ${type} images are allowed`, 409);
    }
    const url = await saveImage(file, type as ImageFolder);
    return toOperatorImages(await this.repo.setGallery(operatorId, column, [...list, url]));
  }

  async removeImage(operatorId: string, type: GalleryType, url: string): Promise<OperatorImages> {
    const current = await this.requireOperator(operatorId);
    const column = COLUMN[type];
    const list = toUrlList(current[column]);
    if (!list.includes(url)) {
      throw new UserServiceError('Image not found', 404);
    }
    const row = await this.repo.setGallery(
      operatorId,
      column,
      list.filter((u) => u !== url)
    );
    await deleteImageByUrl(url);
    return toOperatorImages(row);
  }
}

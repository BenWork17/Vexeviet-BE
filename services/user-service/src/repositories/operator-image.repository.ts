import { prisma } from '@vexeviet/database';

export interface OperatorImagesRow {
  id: string;
  role: string;
  status: string;
  operatorAvatarUrl: string | null;
  interiorImages: unknown;
  exteriorImages: unknown;
}

const SELECT = {
  id: true,
  role: true,
  status: true,
  operatorAvatarUrl: true,
  interiorImages: true,
  exteriorImages: true,
} as const;

export type ImageColumn = 'interiorImages' | 'exteriorImages';

export class OperatorImageRepository {
  async findById(id: string): Promise<OperatorImagesRow | null> {
    return prisma.user.findUnique({ where: { id }, select: SELECT });
  }

  async setAvatar(id: string, url: string | null): Promise<OperatorImagesRow> {
    return prisma.user.update({ where: { id }, data: { operatorAvatarUrl: url }, select: SELECT });
  }

  async setGallery(id: string, column: ImageColumn, urls: string[]): Promise<OperatorImagesRow> {
    return prisma.user.update({ where: { id }, data: { [column]: urls }, select: SELECT });
  }

  async setUserAvatar(id: string, url: string | null): Promise<void> {
    await prisma.user.update({ where: { id }, data: { avatarUrl: url } });
  }
}

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';

process.env.UPLOAD_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'vxv-uploads-'));

import { detectImageType, saveImage, deleteImageByUrl, ImageUploadError } from './image-upload';
import {
  MAX_IMAGES_PER_TYPE,
  OperatorImageService,
} from '../services/operator-image.service';
import { OperatorImageRepository, OperatorImagesRow } from '../repositories/operator-image.repository';

const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(16),
]);
const JPG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(16)]);
const file = (buffer: Buffer): Express.Multer.File =>
  ({ buffer, size: buffer.length, mimetype: 'image/png' }) as Express.Multer.File;

test('detectImageType recognises png/jpeg/webp and rejects others', () => {
  assert.equal(detectImageType(PNG), 'image/png');
  assert.equal(detectImageType(JPG), 'image/jpeg');
  const webp = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP')]);
  assert.equal(detectImageType(webp), 'image/webp');
  assert.equal(detectImageType(Buffer.from('<svg></svg>')), null);
});

test('saveImage stores file, rejects fake/oversize/missing, deleteImageByUrl removes', async () => {
  const url = await saveImage(file(PNG), 'avatars');
  assert.match(url, /^\/api\/v1\/uploads\/avatars\/[0-9a-f-]+\.png$/);
  const onDisk = path.join(process.env.UPLOAD_DIR!, 'avatars', path.basename(url));
  assert.ok(fs.existsSync(onDisk));

  await assert.rejects(saveImage(file(Buffer.from('not an image')), 'avatars'), ImageUploadError);
  await assert.rejects(saveImage(undefined, 'avatars'), ImageUploadError);
  const big = { ...file(PNG), size: 6 * 1024 * 1024 } as Express.Multer.File;
  await assert.rejects(saveImage(big, 'avatars'), /5MB/);

  await deleteImageByUrl(url);
  assert.ok(!fs.existsSync(onDisk));
  await deleteImageByUrl('/api/v1/uploads/../../etc/passwd'); // traversal ignored
  await deleteImageByUrl('https://example.com/x.png'); // foreign ignored
});

class FakeRepo extends OperatorImageRepository {
  row: OperatorImagesRow = {
    id: 'op1',
    role: 'OPERATOR',
    status: 'ACTIVE',
    operatorAvatarUrl: null,
    interiorImages: null,
    exteriorImages: null,
  };
  async findById(id: string): Promise<OperatorImagesRow | null> {
    return id === 'op1' ? this.row : id === 'cust' ? { ...this.row, id, role: 'CUSTOMER' } : null;
  }
  async setAvatar(_id: string, url: string | null): Promise<OperatorImagesRow> {
    this.row = { ...this.row, operatorAvatarUrl: url };
    return this.row;
  }
  async setGallery(
    _id: string,
    column: 'interiorImages' | 'exteriorImages',
    urls: string[]
  ): Promise<OperatorImagesRow> {
    this.row = { ...this.row, [column]: urls };
    return this.row;
  }
}

test('OperatorImageService: avatar, gallery add/remove, limits and auth target', async () => {
  const svc = new OperatorImageService(new FakeRepo());
  assert.deepEqual(await svc.getImages('op1'), {
    operatorAvatarUrl: null,
    interiorImages: [],
    exteriorImages: [],
  });
  await assert.rejects(svc.getImages('nope'), /not found/);
  await assert.rejects(svc.getImages('cust'), /not found/);

  const a = await svc.setAvatar('op1', file(PNG));
  assert.ok(a.operatorAvatarUrl);
  const a2 = await svc.setAvatar('op1', file(JPG));
  assert.notEqual(a2.operatorAvatarUrl, a.operatorAvatarUrl);
  assert.equal((await svc.removeAvatar('op1')).operatorAvatarUrl, null);

  const r = await svc.addImage('op1', 'interior', file(PNG));
  assert.equal(r.interiorImages.length, 1);
  assert.equal(r.exteriorImages.length, 0);
  const removed = await svc.removeImage('op1', 'interior', r.interiorImages[0]);
  assert.equal(removed.interiorImages.length, 0);
  await assert.rejects(svc.removeImage('op1', 'interior', 'missing'), /not found/);

  for (let i = 0; i < MAX_IMAGES_PER_TYPE; i++) await svc.addImage('op1', 'exterior', file(PNG));
  await assert.rejects(svc.addImage('op1', 'exterior', file(PNG)), /At most/);
});

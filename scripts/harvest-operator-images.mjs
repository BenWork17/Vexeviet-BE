#!/usr/bin/env node
/**
 * Harvests real bus / sleeper / limousine interior & exterior photographs
 * from Wikimedia Commons API + curated open photography, generates crisp PNG
 * brand emblems in each Vietnamese bus operator's authentic brand palette,
 * uploads all assets idempotently to Cloudinary (`vexeviet/seed/*`), and
 * writes `packages/database/prisma/operator-media-manifest.json`.
 */

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const MANIFEST_PATH = path.join(
  ROOT_DIR,
  'packages',
  'database',
  'prisma',
  'operator-media-manifest.json'
);

const USER_AGENT =
  'VeXeVietMediaHarvester/1.0 (https://github.com/BenWork17/vexeviet-be; dev@vexeviet.com)';

// 25 Real Vietnamese Intercity Bus Operators with authentic brand colors & regional plates
export const VIETNAMESE_OPERATORS = [
  { slug: 'phuong-trang', firstName: 'Phương Trang', lastName: 'FUTA Bus Lines', email: 'phuongtrang@vexeviet.com', phone: '0901000001', platePrefix: '51B', bgHex: '#EA580C', accentHex: '#FFF7ED', code: 'FT', region: 'south' },
  { slug: 'thanh-buoi', firstName: 'Thành', lastName: 'Bưởi', email: 'thanhbuoi@vexeviet.com', phone: '0901000002', platePrefix: '51B', bgHex: '#15803D', accentHex: '#F0FDF4', code: 'TB', region: 'south' },
  { slug: 'hoang-long', firstName: 'Hoàng Long', lastName: 'Asia', email: 'hoanglong@vexeviet.com', phone: '0901000003', platePrefix: '15B', bgHex: '#1D4ED8', accentHex: '#EFF6FF', code: 'HL', region: 'north' },
  { slug: 'kumho-samco', firstName: 'Kumho', lastName: 'Samco', email: 'kumhosamco@vexeviet.com', phone: '0901000004', platePrefix: '51B', bgHex: '#DC2626', accentHex: '#FEF2F2', code: 'KS', region: 'south' },
  { slug: 'mai-linh', firstName: 'Mai Linh', lastName: 'Express', email: 'mailinh@vexeviet.com', phone: '0901000005', platePrefix: '51B', bgHex: '#059669', accentHex: '#ECFDF5', code: 'ML', region: 'south' },
  { slug: 'sao-viet', firstName: 'Sao', lastName: 'Việt', email: 'saoviet@vexeviet.com', phone: '0901000006', platePrefix: '29B', bgHex: '#BE123C', accentHex: '#FFF1F2', code: 'SV', region: 'north' },
  { slug: 'ha-son-hai-van', firstName: 'Hà Sơn', lastName: 'Hải Vân', email: 'hasonhaivan@vexeviet.com', phone: '0901000007', platePrefix: '24B', bgHex: '#C2410C', accentHex: '#FFF7ED', code: 'HS', region: 'north' },
  { slug: 'van-minh', firstName: 'Văn', lastName: 'Minh', email: 'vanminh@vexeviet.com', phone: '0901000008', platePrefix: '37B', bgHex: '#1E40AF', accentHex: '#FEF9C3', code: 'VM', region: 'central' },
  { slug: 'tan-kim-chi', firstName: 'Tân Kim', lastName: 'Chi', email: 'tankimchi@vexeviet.com', phone: '0901000009', platePrefix: '43B', bgHex: '#B45309', accentHex: '#FFFBEB', code: 'KC', region: 'central' },
  { slug: 'chin-nghia', firstName: 'Chín', lastName: 'Nghĩa', email: 'chinnghia@vexeviet.com', phone: '0901000010', platePrefix: '76B', bgHex: '#0F766E', accentHex: '#F0FDFA', code: 'CN', region: 'central' },
  { slug: 'quang-dung-vip', firstName: 'Quang Dũng', lastName: 'VIP Limousine', email: 'quangdung@vexeviet.com', phone: '0901000011', platePrefix: '74B', bgHex: '#78350F', accentHex: '#FEF3C7', code: 'QD', region: 'central' },
  { slug: 'cuc-tung', firstName: 'Cúc', lastName: 'Tùng', email: 'cuctung@vexeviet.com', phone: '0901000012', platePrefix: '79B', bgHex: '#0369A1', accentHex: '#F0F9FF', code: 'CT', region: 'central' },
  { slug: 'lien-hung', firstName: 'Liên', lastName: 'Hưng', email: 'lienhung@vexeviet.com', phone: '0901000013', platePrefix: '79B', bgHex: '#4338CA', accentHex: '#EEF2FF', code: 'LH', region: 'central' },
  { slug: 'hai-phong-travel', firstName: 'Hải Phòng', lastName: 'Travel', email: 'haiphongtravel@vexeviet.com', phone: '0901000014', platePrefix: '15B', bgHex: '#0E7490', accentHex: '#ECFEFF', code: 'HP', region: 'north' },
  { slug: 'anh-huy-dat-cang', firstName: 'Anh Huy', lastName: 'Đất Cảng', email: 'anhhuy@vexeviet.com', phone: '0901000015', platePrefix: '15B', bgHex: '#991B1B', accentHex: '#FEF2F2', code: 'AH', region: 'north' },
  { slug: 'hoa-mai', firstName: 'Hoa Mai', lastName: 'Limousine', email: 'hoamai@vexeviet.com', phone: '0901000016', platePrefix: '72B', bgHex: '#CA8A04', accentHex: '#FEFCE8', code: 'HM', region: 'south' },
  { slug: 'toan-thang', firstName: 'Toàn', lastName: 'Thắng', email: 'toanthang@vexeviet.com', phone: '0901000017', platePrefix: '72B', bgHex: '#B91C1C', accentHex: '#FEF2F2', code: 'TT', region: 'south' },
  { slug: 'tien-oanh', firstName: 'Tiến', lastName: 'Oanh', email: 'tienoanh@vexeviet.com', phone: '0901000018', platePrefix: '47B', bgHex: '#6D28D9', accentHex: '#F5F3FF', code: 'TO', region: 'central' },
  { slug: 'khanh-phong', firstName: 'Khanh', lastName: 'Phong', email: 'khanhphong@vexeviet.com', phone: '0901000019', platePrefix: '51B', bgHex: '#047857', accentHex: '#ECFDF5', code: 'KP', region: 'south' },
  { slug: 'tam-hanh', firstName: 'Tâm Hạnh', lastName: 'Travel', email: 'tamhanh@vexeviet.com', phone: '0901000020', platePrefix: '51B', bgHex: '#9A3412', accentHex: '#FFF7ED', code: 'TH', region: 'south' },
  { slug: 'hanh-cafe', firstName: 'Hạnh', lastName: 'Cafe', email: 'hanhcafe@vexeviet.com', phone: '0901000021', platePrefix: '51B', bgHex: '#1E293B', accentHex: '#F8FAFC', code: 'HC', region: 'south' },
  { slug: 'sinh-tourist', firstName: 'The Sinh', lastName: 'Tourist', email: 'sinhtourist@vexeviet.com', phone: '0901000022', platePrefix: '51B', bgHex: '#1D4ED8', accentHex: '#EFF6FF', code: 'ST', region: 'south' },
  { slug: 'inter-bus-lines', firstName: 'Inter', lastName: 'Bus Lines', email: 'interbus@vexeviet.com', phone: '0901000023', platePrefix: '29B', bgHex: '#DB2777', accentHex: '#FDF2F8', code: 'IB', region: 'north' },
  { slug: 'tuan-hung', firstName: 'Tuấn', lastName: 'Hưng', email: 'tuanhung@vexeviet.com', phone: '0901000024', platePrefix: '65B', bgHex: '#0284C7', accentHex: '#F0F9FF', code: 'TU', region: 'south' },
  { slug: 'son-tung', firstName: 'Sơn', lastName: 'Tùng', email: 'sontung@vexeviet.com', phone: '0901000025', platePrefix: '77B', bgHex: '#4F46E5', accentHex: '#EEF2FF', code: 'SO', region: 'central' },
];

// Curated fallback/supplement real coach, sleeper & luxury interior photos (Unsplash licensed)
const CURATED_EXTERIOR_URLS = [
  'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1400&q=85',
  'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&w=1400&q=85',
  'https://images.unsplash.com/photo-1464219789935-c2d9d9aba644?auto=format&fit=crop&w=1400&q=85',
  'https://images.unsplash.com/photo-1557223562-6c77ef16210f?auto=format&fit=crop&w=1400&q=85',
  'https://images.unsplash.com/photo-1494515843206-f3117d3f51b7?auto=format&fit=crop&w=1400&q=85',
  'https://images.unsplash.com/photo-1509749837427-ac94a2553d0e?auto=format&fit=crop&w=1400&q=85',
  'https://images.unsplash.com/photo-1562620669-98104534c6cd?auto=format&fit=crop&w=1400&q=85',
  'https://images.unsplash.com/photo-1519003722824-194d4455a60c?auto=format&fit=crop&w=1400&q=85',
];

const CURATED_INTERIOR_URLS = [
  'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1400&q=85',
  'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1400&q=85',
  'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=1400&q=85',
  'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=1400&q=85',
  'https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&w=1400&q=85',
  'https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?auto=format&fit=crop&w=1400&q=85',
  'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=1400&q=85',
  'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&w=1400&q=85',
];

// ---------------------------------------------------------------------------
// Minimal Pure-Node PNG Renderer (256x256 Crisp Brand Badge with 5x7 Bitmap Font)
// ---------------------------------------------------------------------------
const FONT_5X7 = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  C: ['01111', '10000', '10000', '10000', '10000', '10000', '01111'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  G: ['01111', '10000', '10000', '10011', '10001', '10001', '01111'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  Q: ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  X: ['10001', '01010', '00100', '00100', '00100', '01010', '10001'],
  Y: ['10001', '01010', '00100', '00100', '00100', '00100', '00100'],
};

function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function renderBrandBadgePng(code, bgHex, accentHex) {
  const W = 256;
  const H = 256;
  const [br, bg, bb] = hexToRgb(bgHex);
  const [ar, ag, ab] = hexToRgb(accentHex);

  const raw = Buffer.alloc(H * (1 + W * 4));
  const setPx = (x, y, r, g, b, a = 255) => {
    if (x < 0 || x >= W || y < 0 || y >= H) return;
    const idx = y * (1 + W * 4) + 1 + x * 4;
    raw[idx] = r;
    raw[idx + 1] = g;
    raw[idx + 2] = b;
    raw[idx + 3] = a;
  };

  // Subtle diagonal gradient background + crisp inner border ring
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 4)] = 0; // filter type None
    for (let x = 0; x < W; x++) {
      const t = (x + y) / (W + H);
      const shade = 1 - t * 0.22;
      const r = Math.max(0, Math.min(255, Math.round(br * shade)));
      const g = Math.max(0, Math.min(255, Math.round(bg * shade)));
      const b = Math.max(0, Math.min(255, Math.round(bb * shade)));
      setPx(x, y, r, g, b, 255);

      const dx = x - 127.5;
      const dy = y - 127.5;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist >= 106 && dist <= 111) {
        setPx(x, y, ar, ag, ab, 210);
      }
    }
  }

  // Draw top stylized coach roof accent bar
  for (let y = 58; y <= 66; y++) {
    for (let x = 76; x <= 180; x++) {
      setPx(x, y, ar, ag, ab, 235);
    }
  }

  // Draw 2-letter monogram centered at scale 12
  const chars = code.slice(0, 2).toUpperCase().split('');
  const scale = 12;
  const glyphW = 5 * scale;
  const glyphH = 7 * scale;
  const gap = 14;
  const totalW = chars.length * glyphW + (chars.length - 1) * gap;
  const startX = Math.round((W - totalW) / 2);
  const startY = Math.round((H - glyphH) / 2) + 10;

  chars.forEach((ch, idx) => {
    const rows = FONT_5X7[ch] || FONT_5X7.V;
    const gx = startX + idx * (glyphW + gap);
    for (let ry = 0; ry < 7; ry++) {
      for (let rx = 0; rx < 5; rx++) {
        if (rows[ry][rx] === '1') {
          for (let sy = 0; sy < scale; sy++) {
            for (let sx = 0; sx < scale; sx++) {
              setPx(gx + rx * scale + sx, startY + ry * scale + sy, ar, ag, ab, 255);
            }
          }
        }
      }
    }
  });

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const compressed = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// Magic-byte validator & Cloudinary uploader
// ---------------------------------------------------------------------------
function detectImageMime(buf) {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return { mime: 'image/jpeg', ext: 'jpg' };
  }
  if (
    buf.length >= 8 &&
    buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return { mime: 'image/png', ext: 'png' };
  }
  if (
    buf.length >= 12 &&
    buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buf.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return { mime: 'image/webp', ext: 'webp' };
  }
  return null;
}

function getCloudinaryConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
  const folderPrefix = (process.env.CLOUDINARY_FOLDER || 'vexeviet').trim().replace(/^\/+|\/+$/g, '');
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('Missing CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET in .env');
  }
  return { cloudName, apiKey, apiSecret, folderPrefix };
}

function signParams(params, apiSecret) {
  const str = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&');
  return createHash('sha1').update(`${str}${apiSecret}`, 'utf8').digest('hex');
}

async function uploadBufferToCloudinary(buf, mime, ext, folder, publicId, transform, cfg) {
  const timestamp = Math.floor(Date.now() / 1000);
  const paramsToSign = {
    folder,
    overwrite: 'true',
    public_id: publicId,
    timestamp,
  };
  const signature = signParams(paramsToSign, cfg.apiSecret);

  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(buf)], { type: mime }), `${publicId}.${ext}`);
  form.append('folder', folder);
  form.append('public_id', publicId);
  form.append('overwrite', 'true');
  form.append('timestamp', String(timestamp));
  form.append('api_key', cfg.apiKey);
  form.append('signature', signature);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(cfg.cloudName)}/image/upload`,
    {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(40_000),
    }
  );
  const data = await res.json();
  if (!res.ok || !data?.secure_url) {
    throw new Error(`Cloudinary upload failed (${res.status}): ${JSON.stringify(data?.error || data)}`);
  }
  return data.secure_url.replace('/image/upload/', `/image/upload/${transform}/`);
}

// ---------------------------------------------------------------------------
// Wikimedia Commons Real Bus Photo Crawler
// ---------------------------------------------------------------------------
const EXCLUDE_TITLE_RE =
  /map|diagram|logo|icon|route|ticket|sign|schedule|accident|crash|wreck|fire|burn|damage|protest|stamp|svg|pdf|flag/i;

async function searchWikimediaImages(query, limit = 18) {
  const url = new URL('https://commons.wikimedia.org/w/api.php');
  url.searchParams.set('action', 'query');
  url.searchParams.set('generator', 'search');
  url.searchParams.set('gsrsearch', `${query} filetype:bitmap`);
  url.searchParams.set('gsrnamespace', '6');
  url.searchParams.set('gsrlimit', String(limit));
  url.searchParams.set('prop', 'imageinfo');
  url.searchParams.set('iiprop', 'url|mime|size');
  url.searchParams.set('iiurlwidth', '1400');
  url.searchParams.set('format', 'json');

  try {
    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return [];
    const json = await res.json();
    const pages = Object.values(json?.query?.pages ?? {});
    const found = [];
    for (const page of pages) {
      const title = String(page.title || '');
      if (EXCLUDE_TITLE_RE.test(title)) continue;
      const info = page.imageinfo?.[0];
      if (!info) continue;
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(info.mime)) continue;
      if ((info.width || 0) < 640 || (info.height || 0) < 400) continue;
      if ((info.width || 0) < (info.height || 0)) continue; // landscape vehicle shots only
      const candidateUrl = info.thumburl || info.url;
      if (candidateUrl) {
        found.push({ title, url: candidateUrl });
      }
    }
    return found;
  } catch (err) {
    console.warn(`[wikimedia] query "${query}" skipped:`, err.message);
    return [];
  }
}

async function downloadValidImage(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'image/jpeg,image/png,image/webp,*/*' },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return null;
    const arr = await res.arrayBuffer();
    const buf = Buffer.from(arr);
    if (buf.length < 15_000 || buf.length > 5 * 1024 * 1024) return null;
    const detected = detectImageMime(buf);
    if (!detected) return null;
    return { buf, ...detected };
  } catch {
    return null;
  }
}

async function harvestPhotoPool(queries, fallbackUrls, targetCount, categoryLabel, folder, cfg) {
  console.log(`\n📸 Harvesting ${targetCount} real ${categoryLabel} photos...`);
  const candidates = [];
  const seenUrls = new Set();

  for (const q of queries) {
    const items = await searchWikimediaImages(q, 15);
    for (const item of items) {
      if (!seenUrls.has(item.url)) {
        seenUrls.add(item.url);
        candidates.push(item.url);
      }
    }
  }
  for (const u of fallbackUrls) {
    if (!seenUrls.has(u)) {
      seenUrls.add(u);
      candidates.push(u);
    }
  }

  console.log(`   Found ${candidates.length} candidate URLs for ${categoryLabel}. Downloading & uploading to Cloudinary...`);
  const uploadedUrls = [];
  let idx = 1;

  for (const candidateUrl of candidates) {
    if (uploadedUrls.length >= targetCount) break;
    const img = await downloadValidImage(candidateUrl);
    if (!img) continue;

    const publicId = `${categoryLabel}-${String(idx).padStart(2, '0')}`;
    try {
      const cdnUrl = await uploadBufferToCloudinary(
        img.buf,
        img.mime,
        img.ext,
        `${cfg.folderPrefix}/seed/${folder}`,
        publicId,
        'f_auto,q_auto,c_limit,w_1600,h_1200',
        cfg
      );
      uploadedUrls.push(cdnUrl);
      console.log(`   ✅ [${uploadedUrls.length}/${targetCount}] ${publicId} -> ${cdnUrl}`);
      idx++;
    } catch (err) {
      console.warn(`   ⚠️ Upload skipped for candidate:`, err.message);
    }
  }

  if (uploadedUrls.length === 0) {
    throw new Error(`Failed to harvest any ${categoryLabel} images!`);
  }
  return uploadedUrls;
}

async function main() {
  const cfg = getCloudinaryConfig();

  if (fs.existsSync(MANIFEST_PATH) && process.env.FORCE_HARVEST !== 'true') {
    try {
      const existing = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
      if (
        existing?.cloudName === cfg.cloudName &&
        Array.isArray(existing?.operators) &&
        existing.operators.length >= VIETNAMESE_OPERATORS.length
      ) {
        console.log(
          `✅ Existing Cloudinary manifest found at ${MANIFEST_PATH} (${existing.operators.length} operators on cloud "${cfg.cloudName}"). Set FORCE_HARVEST=true to re-crawl.`
        );
        return;
      }
    } catch {
      // Regenerate if corrupt
    }
  }

  console.log(`🚀 Starting VeXeViet Operator Media Harvest -> Cloudinary (${cfg.cloudName})...`);

  // 1. Upload 25 bespoke operator brand badges
  console.log(`\n🏷️  Generating & uploading 25 Vietnamese bus operator brand avatars...`);
  const avatarBySlug = new Map();
  for (const op of VIETNAMESE_OPERATORS) {
    const pngBuf = renderBrandBadgePng(op.code, op.bgHex, op.accentHex);
    const cdnUrl = await uploadBufferToCloudinary(
      pngBuf,
      'image/png',
      'png',
      `${cfg.folderPrefix}/seed/operator-avatars`,
      op.slug,
      'f_auto,q_auto,c_limit,w_512,h_512',
      cfg
    );
    avatarBySlug.set(op.slug, cdnUrl);
    console.log(`   ✅ ${op.firstName} ${op.lastName} (${op.code}) -> ${cdnUrl}`);
  }

  // 2. Crawl & upload 26 real exterior bus photos (Vietnamese coaches, sleepers, Thaco/Hyundai Universe)
  const exteriorPool = await harvestPhotoPool(
    [
      'Futa Bus Lines Vietnam',
      'Intercity bus Vietnam',
      'Hyundai Universe bus Vietnam',
      'Thaco Mobihome bus',
      'Bus Ho Chi Minh City',
      'Sleeper bus Vietnam',
      'Tour coach bus Asia',
    ],
    CURATED_EXTERIOR_URLS,
    26,
    'bus-exterior',
    'exterior',
    cfg
  );

  // 3. Crawl & upload 18 real interior sleeper/limousine/coach seat photos
  const interiorPool = await harvestPhotoPool(
    [
      'Sleeper bus interior',
      'Coach bus seats interior',
      'Luxury bus interior seats',
      'Tour bus interior',
      'Modern coach interior',
    ],
    CURATED_INTERIOR_URLS,
    18,
    'bus-interior',
    'interior',
    cfg
  );

  // 4. Assign 5 exterior & 5 interior Cloudinary URLs per operator (deterministic rotation)
  const manifestOperators = VIETNAMESE_OPERATORS.map((op, index) => {
    const exteriorImages = [];
    const interiorImages = [];
    for (let k = 0; k < 5; k++) {
      exteriorImages.push(exteriorPool[(index * 3 + k) % exteriorPool.length]);
      interiorImages.push(interiorPool[(index * 2 + k) % interiorPool.length]);
    }
    return {
      ...op,
      operatorAvatarUrl: avatarBySlug.get(op.slug),
      exteriorImages,
      interiorImages,
    };
  });

  const manifest = {
    generatedAt: new Date().toISOString(),
    cloudName: cfg.cloudName,
    totalUniqueCloudinaryAssets:
      VIETNAMESE_OPERATORS.length + exteriorPool.length + interiorPool.length,
    exteriorPool,
    interiorPool,
    operators: manifestOperators,
  };

  fs.mkdirSync(path.dirname(MANIFEST_PATH), { recursive: true });
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf8');
  console.log(
    `\n🎉 Harvest complete! Uploaded ${manifest.totalUniqueCloudinaryAssets} real assets to Cloudinary (${cfg.cloudName}) and saved manifest to:\n   ${MANIFEST_PATH}`
  );
}

main().catch((err) => {
  console.error('❌ Media harvest failed:', err);
  process.exit(1);
});

import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import {
  PrismaClient,
  Prisma,
  AuditSeverity,
  BookingStatus,
  BusStatus,
  BusType,
  PaymentMethod,
  PaymentStatus,
  ReviewStatus,
  RouteStatus,
  SeatPosition,
  SeatStatus,
  SeatType,
  TransactionStatus,
  TransactionType,
  UserRole,
  UserStatus,
} from '@prisma/client';

const prisma = new PrismaClient();
const BATCH_SIZE = 500;

interface ManifestOperator {
  slug: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  platePrefix: string;
  region: 'north' | 'central' | 'south';
  operatorAvatarUrl: string;
  interiorImages: string[];
  exteriorImages: string[];
}

interface OperatorMediaManifest {
  cloudName: string;
  operators: ManifestOperator[];
}

// Deterministic PRNG (Mulberry32) so generated distributions are reproducible
function createRng(seed = 20261126) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = createRng(20261126);
const randInt = (min: number, max: number): number =>
  Math.floor(rng() * (max - min + 1)) + min;
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)]!;

async function insertChunked<T>(
  label: string,
  items: T[],
  inserter: (chunk: T[]) => Promise<unknown>
): Promise<void> {
  if (items.length === 0) return;
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const slice = items.slice(i, i + BATCH_SIZE);
    await inserter(slice);
  }
  console.log(`   ✅ ${label}: ${items.length.toLocaleString('en-US')} rows`);
}

// Bijective 7-char booking code from integer index -> VXV + 7 chars (<= 10 chars, 0% collision)
const CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
function makeBookingCode(index: number): string {
  let n = ((index + 104729) * 2654435761) >>> 0;
  let out = '';
  for (let i = 0; i < 5; i++) {
    out += CODE_ALPHABET[n & 31];
    n >>>= 5;
  }
  const hi = index.toString(32).toUpperCase().padStart(2, '0').slice(-2);
  return `VXV${hi}${out}`;
}

// Authentic Vietnamese name components
const LAST_NAMES = [
  'Nguyễn', 'Nguyễn', 'Nguyễn', 'Trần', 'Trần', 'Lê', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh',
  'Phan', 'Vũ', 'Võ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý', 'Đinh', 'Trương',
  'Lương', 'Mai', 'Tạ', 'Đoàn', 'Hà', 'Tô', 'Châu', 'Quách',
];
const MIDDLE_NAMES = [
  'Văn', 'Thị', 'Minh', 'Hoàng', 'Đức', 'Ngọc', 'Thanh', 'Quốc', 'Gia', 'Hữu',
  'Tuấn', 'Phương', 'Anh', 'Bảo', 'Khánh', 'Thùy', 'Hồng', 'Nhật', 'Xuân', 'Trọng',
];
const FIRST_NAMES = [
  'An', 'Bình', 'Châu', 'Dũng', 'Đạt', 'Giang', 'Hà', 'Hải', 'Hiếu', 'Hoà',
  'Hùng', 'Hương', 'Huyền', 'Khánh', 'Khoa', 'Khôi', 'Lan', 'Linh', 'Long', 'Mai',
  'Minh', 'My', 'Nam', 'Ngân', 'Ngọc', 'Nhung', 'Oanh', 'Phát', 'Phúc', 'Phương',
  'Quân', 'Quang', 'Quỳnh', 'Sơn', 'Tâm', 'Tân', 'Thắng', 'Thảo', 'Thịnh', 'Thư',
  'Tiến', 'Trang', 'Trinh', 'Trung', 'Tú', 'Tuấn', 'Tùng', 'Uyên', 'Việt', 'Vy',
];

function stripAccents(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

// Provinces & authentic intercity bus stations matching FE VIETNAM_PROVINCES
interface CityHub {
  id: string;
  displayName: string;
  stations: Array<{ name: string; address: string }>;
}

const CITY_HUBS: Record<string, CityHub> = {
  hochiminh: {
    id: 'hochiminh',
    displayName: 'Hồ Chí Minh',
    stations: [
      { name: 'Bến xe Miền Đông Mới', address: '501 Hoàng Hữu Nam, TP. Thủ Đức, TP.HCM' },
      { name: 'Bến xe Miền Tây', address: '395 Kinh Dương Vương, Bình Tân, TP.HCM' },
      { name: 'Văn phòng Quận 1 (Phạm Ngũ Lão)', address: '272 Đề Thám, Quận 1, TP.HCM' },
    ],
  },
  hanoi: {
    id: 'hanoi',
    displayName: 'Hà Nội',
    stations: [
      { name: 'Bến xe Mỹ Đình', address: '20 Phạm Hùng, Nam Từ Liêm, Hà Nội' },
      { name: 'Bến xe Giáp Bát', address: 'Giải Phóng, Hoàng Mai, Hà Nội' },
      { name: 'Bến xe Nước Ngầm', address: 'Km8 Giải Phóng, Hoàng Mai, Hà Nội' },
    ],
  },
  danang: {
    id: 'danang',
    displayName: 'Đà Nẵng',
    stations: [
      { name: 'Bến xe Trung tâm Đà Nẵng', address: 'Tôn Đức Thắng, Liên Chiểu, Đà Nẵng' },
      { name: 'Văn phòng Hải Châu', address: '97 Điện Biên Phủ, Thanh Khê, Đà Nẵng' },
    ],
  },
  lamdong: {
    id: 'lamdong',
    displayName: 'Đà Lạt - Lâm Đồng',
    stations: [
      { name: 'Bến xe Liên tỉnh Đà Lạt', address: '01 Tô Hiến Thành, Phường 3, Đà Lạt' },
      { name: 'Văn phòng Bảo Lộc', address: '280 Trần Phú, TP. Bảo Lộc, Lâm Đồng' },
    ],
  },
  khanhhoa: {
    id: 'khanhhoa',
    displayName: 'Nha Trang - Khánh Hòa',
    stations: [
      { name: 'Bến xe Phía Nam Nha Trang', address: 'Km6 Đường 23/10, Vĩnh Trung, Nha Trang' },
      { name: 'Văn phòng Hoàng Hoa Thám', address: '07 Hoàng Hoa Thám, Lộc Thọ, Nha Trang' },
    ],
  },
  binhthuan: {
    id: 'binhthuan',
    displayName: 'Phan Thiết - Bình Thuận',
    stations: [
      { name: 'Bến xe Bắc Phan Thiết', address: '01 Từ Văn Tư, Phú Thủy, Phan Thiết' },
      { name: 'Văn phòng Mũi Né', address: '120 Nguyễn Đình Chiểu, Hàm Tiến, Phan Thiết' },
    ],
  },
  'baria-vungtau': {
    id: 'baria-vungtau',
    displayName: 'Vũng Tàu - Bà Rịa',
    stations: [
      { name: 'Bến xe Vũng Tàu', address: '192 Nam Kỳ Khởi Nghĩa, Phường 3, Vũng Tàu' },
    ],
  },
  cantho: {
    id: 'cantho',
    displayName: 'Cần Thơ',
    stations: [
      { name: 'Bến xe Trung tâm Cần Thơ', address: 'QL1A, Hưng Thạnh, Cái Răng, Cần Thơ' },
    ],
  },
  daklak: {
    id: 'daklak',
    displayName: 'Buôn Ma Thuột - Đắk Lắk',
    stations: [
      { name: 'Bến xe Phía Bắc Buôn Ma Thuột', address: '71 Nguyễn Chí Thanh, Buôn Ma Thuột' },
    ],
  },
  gialai: {
    id: 'gialai',
    displayName: 'Pleiku - Gia Lai',
    stations: [
      { name: 'Bến xe Đức Long Gia Lai', address: '43 Lý Nam Đế, TP. Pleiku, Gia Lai' },
    ],
  },
  binhdinh: {
    id: 'binhdinh',
    displayName: 'Quy Nhơn - Bình Định',
    stations: [
      { name: 'Bến xe Trung tâm Quy Nhơn', address: '71 Tây Sơn, Ghềnh Ráng, Quy Nhơn' },
    ],
  },
  phuyen: {
    id: 'phuyen',
    displayName: 'Tuy Hòa - Phú Yên',
    stations: [
      { name: 'Bến xe Liên tỉnh Phú Yên', address: '227 Nguyễn Tất Thành, Tuy Hòa, Phú Yên' },
    ],
  },
  thuathienhue: {
    id: 'thuathienhue',
    displayName: 'Huế - Thừa Thiên Huế',
    stations: [
      { name: 'Bến xe Phía Nam Huế', address: '97 An Dương Vương, An Đông, TP. Huế' },
    ],
  },
  quangnam: {
    id: 'quangnam',
    displayName: 'Hội An - Quảng Nam',
    stations: [
      { name: 'Bến xe Hội An', address: '74 Hùng Vương, Cẩm Phổ, Hội An' },
    ],
  },
  quangbinh: {
    id: 'quangbinh',
    displayName: 'Đồng Hới - Quảng Bình',
    stations: [
      { name: 'Bến xe Đồng Hới', address: '156 Trần Hưng Đạo, Đồng Hới, Quảng Bình' },
    ],
  },
  nghean: {
    id: 'nghean',
    displayName: 'Vinh - Nghệ An',
    stations: [
      { name: 'Bến xe Bắc Vinh', address: 'Xã Nghi Kim, TP. Vinh, Nghệ An' },
    ],
  },
  thanhhoa: {
    id: 'thanhhoa',
    displayName: 'Thanh Hóa',
    stations: [
      { name: 'Bến xe Phía Bắc Thanh Hóa', address: '01A Nguyễn Chí Thanh, Hàm Rồng, Thanh Hóa' },
    ],
  },
  ninhbinh: {
    id: 'ninhbinh',
    displayName: 'Ninh Bình',
    stations: [
      { name: 'Bến xe Khách Ninh Bình', address: '207 Lê Đại Hành, Thanh Bình, Ninh Bình' },
    ],
  },
  quangninh: {
    id: 'quangninh',
    displayName: 'Hạ Long - Quảng Ninh',
    stations: [
      { name: 'Bến xe Bãi Cháy', address: 'Khu 1, Bãi Cháy, TP. Hạ Long, Quảng Ninh' },
    ],
  },
  haiphong: {
    id: 'haiphong',
    displayName: 'Hải Phòng',
    stations: [
      { name: 'Bến xe Vĩnh Niệm', address: 'Bùi Viện, Vĩnh Niệm, Lê Chân, Hải Phòng' },
    ],
  },
  laocai: {
    id: 'laocai',
    displayName: 'Sa Pa - Lào Cai',
    stations: [
      { name: 'Bến xe Thị xã Sa Pa', address: '571 Điện Biên Phủ, Thị xã Sa Pa, Lào Cai' },
    ],
  },
  haigiang: {
    id: 'haigiang',
    displayName: 'Hà Giang',
    stations: [
      { name: 'Bến xe Khách Hà Giang', address: 'Đường 19/5, Phương Thiện, TP. Hà Giang' },
    ],
  },
  kiengiang: {
    id: 'kiengiang',
    displayName: 'Rạch Giá - Kiên Giang',
    stations: [
      { name: 'Bến xe Rạch Sỏi', address: '12 Mai Thị Hồng Hạnh, Rạch Sỏi, Rạch Giá' },
    ],
  },
  camau: {
    id: 'camau',
    displayName: 'Cà Mau',
    stations: [
      { name: 'Bến xe Khách Cà Mau', address: 'QL1A, Lý Thường Kiệt, Phường 6, Cà Mau' },
    ],
  },
  angiang: {
    id: 'angiang',
    displayName: 'Long Xuyên - An Giang',
    stations: [
      { name: 'Bến xe Long Xuyên', address: '392 Phạm Cự Lượng, Mỹ Quý, Long Xuyên' },
    ],
  },
};

interface CorridorSpec {
  from: keyof typeof CITY_HUBS;
  to: keyof typeof CITY_HUBS;
  distance: number;
  duration: number;
  basePrice: number;
  busTypes: BusType[];
  region: 'north' | 'central' | 'south';
}

const BASE_CORRIDORS: CorridorSpec[] = [
  // South & Central Highlands
  { from: 'hochiminh', to: 'lamdong', distance: 308, duration: 390, basePrice: 340000, busTypes: [BusType.LIMOUSINE, BusType.SLEEPER], region: 'south' },
  { from: 'hochiminh', to: 'khanhhoa', distance: 435, duration: 480, basePrice: 390000, busTypes: [BusType.SLEEPER, BusType.LIMOUSINE], region: 'south' },
  { from: 'hochiminh', to: 'binhthuan', distance: 205, duration: 210, basePrice: 210000, busTypes: [BusType.LIMOUSINE, BusType.SLEEPER, BusType.VIP], region: 'south' },
  { from: 'hochiminh', to: 'baria-vungtau', distance: 115, duration: 135, basePrice: 160000, busTypes: [BusType.LIMOUSINE, BusType.VIP], region: 'south' },
  { from: 'hochiminh', to: 'cantho', distance: 169, duration: 200, basePrice: 175000, busTypes: [BusType.SLEEPER, BusType.LIMOUSINE], region: 'south' },
  { from: 'hochiminh', to: 'daklak', distance: 352, duration: 450, basePrice: 360000, busTypes: [BusType.SLEEPER, BusType.LIMOUSINE], region: 'south' },
  { from: 'hochiminh', to: 'gialai', distance: 490, duration: 570, basePrice: 420000, busTypes: [BusType.SLEEPER], region: 'south' },
  { from: 'hochiminh', to: 'binhdinh', distance: 650, duration: 690, basePrice: 460000, busTypes: [BusType.SLEEPER, BusType.LIMOUSINE], region: 'south' },
  { from: 'hochiminh', to: 'kiengiang', distance: 248, duration: 300, basePrice: 230000, busTypes: [BusType.SLEEPER, BusType.VIP], region: 'south' },
  { from: 'hochiminh', to: 'camau', distance: 305, duration: 390, basePrice: 270000, busTypes: [BusType.SLEEPER], region: 'south' },
  { from: 'hochiminh', to: 'angiang', distance: 195, duration: 240, basePrice: 190000, busTypes: [BusType.SLEEPER, BusType.VIP], region: 'south' },
  { from: 'hochiminh', to: 'danang', distance: 958, duration: 960, basePrice: 550000, busTypes: [BusType.SLEEPER], region: 'south' },
  // North
  { from: 'hanoi', to: 'laocai', distance: 315, duration: 340, basePrice: 320000, busTypes: [BusType.SLEEPER, BusType.LIMOUSINE], region: 'north' },
  { from: 'hanoi', to: 'quangninh', distance: 155, duration: 150, basePrice: 220000, busTypes: [BusType.LIMOUSINE, BusType.VIP], region: 'north' },
  { from: 'hanoi', to: 'haiphong', distance: 118, duration: 105, basePrice: 150000, busTypes: [BusType.LIMOUSINE, BusType.VIP, BusType.STANDARD], region: 'north' },
  { from: 'hanoi', to: 'ninhbinh', distance: 96, duration: 100, basePrice: 140000, busTypes: [BusType.LIMOUSINE, BusType.VIP], region: 'north' },
  { from: 'hanoi', to: 'haigiang', distance: 298, duration: 390, basePrice: 300000, busTypes: [BusType.SLEEPER, BusType.LIMOUSINE], region: 'north' },
  { from: 'hanoi', to: 'thanhhoa', distance: 162, duration: 170, basePrice: 180000, busTypes: [BusType.LIMOUSINE, BusType.SLEEPER], region: 'north' },
  { from: 'hanoi', to: 'nghean', distance: 295, duration: 310, basePrice: 280000, busTypes: [BusType.SLEEPER, BusType.LIMOUSINE], region: 'north' },
  { from: 'hanoi', to: 'quangbinh', distance: 495, duration: 540, basePrice: 380000, busTypes: [BusType.SLEEPER], region: 'north' },
  { from: 'hanoi', to: 'thuathienhue', distance: 668, duration: 720, basePrice: 430000, busTypes: [BusType.SLEEPER], region: 'north' },
  { from: 'hanoi', to: 'danang', distance: 766, duration: 810, basePrice: 480000, busTypes: [BusType.SLEEPER, BusType.LIMOUSINE], region: 'north' },
  // Central
  { from: 'danang', to: 'thuathienhue', distance: 98, duration: 120, basePrice: 130000, busTypes: [BusType.LIMOUSINE, BusType.VIP], region: 'central' },
  { from: 'danang', to: 'quangnam', distance: 32, duration: 50, basePrice: 80000, busTypes: [BusType.VIP, BusType.STANDARD], region: 'central' },
  { from: 'danang', to: 'binhdinh', distance: 305, duration: 330, basePrice: 260000, busTypes: [BusType.SLEEPER, BusType.LIMOUSINE], region: 'central' },
  { from: 'danang', to: 'khanhhoa', distance: 530, duration: 570, basePrice: 380000, busTypes: [BusType.SLEEPER, BusType.LIMOUSINE], region: 'central' },
  { from: 'danang', to: 'lamdong', distance: 645, duration: 690, basePrice: 440000, busTypes: [BusType.SLEEPER, BusType.LIMOUSINE], region: 'central' },
  { from: 'danang', to: 'daklak', distance: 515, duration: 570, basePrice: 390000, busTypes: [BusType.SLEEPER], region: 'central' },
  { from: 'khanhhoa', to: 'lamdong', distance: 136, duration: 195, basePrice: 210000, busTypes: [BusType.LIMOUSINE, BusType.VIP], region: 'central' },
  { from: 'khanhhoa', to: 'phuyen', distance: 122, duration: 150, basePrice: 150000, busTypes: [BusType.VIP, BusType.STANDARD], region: 'central' },
];

// Bidirectional -> 60 realistic intercity corridors!
const ALL_CORRIDORS: CorridorSpec[] = [
  ...BASE_CORRIDORS,
  ...BASE_CORRIDORS.map((c) => ({ ...c, from: c.to, to: c.from })),
];

// Realistic Vietnamese customer reviews & operator replies
const REVIEWS_5_STAR = [
  'Xe mới tinh, chăn gối thơm tho sạch sẽ. Tài xế chạy êm qua đèo không bị say xe, sẽ ủng hộ nhà xe dài lâu!',
  'Cabin đôi rộng rãi, có rèm riêng tư và cổng sạc USB từng giường rất tiện. Đón trả khách đúng giờ hẹn.',
  'Nhân viên phòng vé hỗ trợ nhiệt tình, lên xe có sẵn khăn lạnh và nước suối miễn phí. Rất hài lòng 5 sao.',
  'Đặt vé qua VeXeViet quét mã QR lên xe cực nhanh không phải xếp hàng chờ lấy vé giấy. Xe chạy rất đúng giờ.',
  'Ghế massage êm ái, điều hòa mát vừa phải, wifi ổn định suốt hành trình đêm. Rất đáng tiền!',
  'Tài xế và phụ xe lịch sự, nhắc nhở điểm dừng nghỉ rõ ràng, không bắt khách dọc đường.',
];
const REVIEWS_4_STAR = [
  'Xe sạch sẽ, giường nằm êm. Xuất bến trễ khoảng 10 phút do kẹt xe giờ cao điểm nhưng vẫn đến nơi đúng dự kiến.',
  'Chất lượng xe tốt trong tầm giá, nhân viên thân thiện. Wifi lúc qua đèo hơi yếu một chút nhưng không đáng kể.',
  'Trải nghiệm ổn áp, ghế ngả sâu dễ ngủ, trạm dừng chân sạch sẽ nhiều đồ ăn ngon.',
  'Nhà xe gọi điện xác nhận điểm đón trước 30 phút rất chu đáo. Sẽ tiếp tục đặt lần sau.',
];
const REVIEWS_3_STAR = [
  'Xe chạy an toàn nhưng điều hòa hàng ghế cuối hơi lạnh, nhà xe nên chuẩn bị chăn dày hơn một chút.',
  'Tổng thể chấp nhận được, giờ khởi hành hơi trễ nhẹ 15 phút vào dịp cuối tuần đông khách.',
  'Xe ổn, nhân viên bình thường, mong nhà xe nâng cấp thêm ổ sạc ở các giường tầng trên.',
];
const REVIEWS_LOW = [
  'Xe đến điểm đón muộn hơn dự kiến 25 phút do tắc đường cửa ngõ, mong nhà xe thông báo sớm hơn cho hành khách.',
  'Cổng USB ngay ghế mình ngồi bị lỏng không sạc được điện thoại, hy vọng nhà xe kiểm tra bảo dưỡng định kỳ.',
];
const OPERATOR_REPLIES_POSITIVE = [
  'Cảm ơn quý khách đã tin tưởng lựa chọn nhà xe! Rất mong tiếp tục được phục vụ quý khách trên những hành trình sắp tới ạ.',
  'Nhà xe chân thành cảm ơn đánh giá 5 sao của quý khách. Chúc quý khách thật nhiều sức khỏe và những chuyến đi vui vẻ!',
  'Dạ cảm ơn anh/chị rất nhiều ạ! Đội ngũ tài xế và tiếp viên sẽ luôn giữ vững chất lượng phục vụ tốt nhất.',
];
const OPERATOR_REPLIES_CONSTRUCTIVE = [
  'Nhà xe xin ghi nhận góp ý của quý khách và đã chuyển bộ phận kỹ thuật kiểm tra khắc phục ngay. Rất mong quý khách thông cảm và ủng hộ lần sau ạ!',
  'Dạ nhà xe thành thật xin lỗi về sự bất tiện nhỏ trên chuyến đi. Chúng tôi đã nhắc nhở tổ vận hành điều phối giờ đón chuẩn xác hơn ạ.',
];

// ---------------------------------------------------------------------------
// Exact 7 BusTemplate + Seat Builder matching FE SeatMap layouts 100%
// ---------------------------------------------------------------------------
interface TemplateDef {
  key: string;
  name: string;
  busType: BusType;
  totalSeats: number;
  floors: number;
  rowsPerFloor: number;
  columns: string;
  description: string;
  buildSeats: (templateId: string) => Prisma.SeatCreateManyInput[];
}

function buildSeatTemplates(): TemplateDef[] {
  return [
    {
      key: 'SLEEPER_42',
      name: 'Xe Giường Nằm 42 Chỗ Tiêu Chuẩn',
      busType: BusType.SLEEPER,
      totalSeats: 42,
      floors: 2,
      rowsPerFloor: 7,
      columns: 'A,_,B,_,C',
      description: 'Xe giường nằm 2 tầng 42 giường bọc da êm ái, điều hòa, chăn đắp và nước suối miễn phí.',
      buildSeats: (templateId) => {
        const out: Prisma.SeatCreateManyInput[] = [];
        for (let floor = 1; floor <= 2; floor++) {
          const fl = floor === 1 ? 'L' : 'U';
          for (let row = 1; row <= 7; row++) {
            for (const col of ['A', 'B', 'C']) {
              out.push({
                id: randomUUID(),
                busTemplateId: templateId,
                seatNumber: `${row}${col}-${fl}`,
                seatLabel: `${row}${col}`,
                rowNumber: row,
                columnPosition: col,
                floor,
                seatType: SeatType.SLEEPER,
                position: col === 'B' ? SeatPosition.AISLE : SeatPosition.WINDOW,
                priceModifier: floor === 1 ? 20000 : 0,
                isAvailable: true,
              });
            }
          }
        }
        return out;
      },
    },
    {
      key: 'SLEEPER_34',
      name: 'Xe Giường Nằm 34 Phòng VIP',
      busType: BusType.SLEEPER,
      totalSeats: 34,
      floors: 2,
      rowsPerFloor: 6,
      columns: 'A,_,B,_,C',
      description: 'Xe phòng nằm VIP 34 chỗ có rèm che riêng từng giường, cổng sạc nhanh USB-C và màn hình giải trí.',
      buildSeats: (templateId) => {
        const out: Prisma.SeatCreateManyInput[] = [];
        // Floor 1: 6x3 = 18 seats; Floor 2: 5x3 + 1 = 16 seats -> 34 total
        for (let floor = 1; floor <= 2; floor++) {
          const fl = floor === 1 ? 'L' : 'U';
          for (let row = 1; row <= 6; row++) {
            const cols = floor === 2 && row === 6 ? ['A'] : ['A', 'B', 'C'];
            for (const col of cols) {
              out.push({
                id: randomUUID(),
                busTemplateId: templateId,
                seatNumber: `${row}${col}-${fl}`,
                seatLabel: `${row}${col}`,
                rowNumber: row,
                columnPosition: col,
                floor,
                seatType: SeatType.SLEEPER,
                position: col === 'B' ? SeatPosition.AISLE : SeatPosition.WINDOW,
                priceModifier: floor === 1 ? 40000 : 0,
                isAvailable: true,
              });
            }
          }
        }
        return out;
      },
    },
    {
      key: 'LIMOUSINE_20',
      name: 'Cabin Đôi Cung Điện Di Động 20 Phòng',
      busType: BusType.LIMOUSINE,
      totalSeats: 20,
      floors: 2,
      rowsPerFloor: 5,
      columns: 'A,_,B',
      description: 'Dòng xe Cabin Luxury 20 phòng riêng biệt, giường massage đa chế độ, đèn đọc sách, rèm kín 100%.',
      buildSeats: (templateId) => {
        const out: Prisma.SeatCreateManyInput[] = [];
        for (let floor = 1; floor <= 2; floor++) {
          const fl = floor === 1 ? 'L' : 'U';
          for (let row = 1; row <= 5; row++) {
            for (const col of ['A', 'B']) {
              out.push({
                id: randomUUID(),
                busTemplateId: templateId,
                seatNumber: `${row}${col}-${fl}`,
                seatLabel: `${row}${col}`,
                rowNumber: row,
                columnPosition: col,
                floor,
                seatType: SeatType.SLEEPER,
                position: SeatPosition.WINDOW,
                priceModifier: floor === 1 ? 50000 : 0,
                isAvailable: true,
              });
            }
          }
        }
        return out;
      },
    },
    {
      key: 'LIMOUSINE_22',
      name: 'Limousine 22 Phòng Hạng Thương Gia',
      busType: BusType.LIMOUSINE,
      totalSeats: 22,
      floors: 1,
      rowsPerFloor: 11,
      columns: 'A,_,B',
      description: 'Xe Limousine 22 ghế/phòng Boeing massage cao cấp, màn hình LCD riêng và sạc không dây.',
      buildSeats: (templateId) => {
        const out: Prisma.SeatCreateManyInput[] = [];
        for (let row = 1; row <= 11; row++) {
          for (const col of ['A', 'B']) {
            out.push({
              id: randomUUID(),
              busTemplateId: templateId,
              seatNumber: `${row}${col}`,
              seatLabel: `${row}${col}`,
              rowNumber: row,
              columnPosition: col,
              floor: 1,
              seatType: SeatType.VIP,
              position: SeatPosition.WINDOW,
              priceModifier: 0,
              isAvailable: true,
            });
          }
        }
        return out;
      },
    },
    {
      key: 'LIMOUSINE_34',
      name: 'Limousine 34 Chỗ Ngả Sâu 160°',
      busType: BusType.LIMOUSINE,
      totalSeats: 34,
      floors: 1,
      rowsPerFloor: 17,
      columns: 'A,_,B',
      description: 'Xe Limousine 34 chỗ da cao cấp ngả sâu 160 độ, bệ đỡ chân êm ái, Wifi tốc độ cao.',
      buildSeats: (templateId) => {
        const out: Prisma.SeatCreateManyInput[] = [];
        for (let row = 1; row <= 17; row++) {
          for (const col of ['A', 'B']) {
            out.push({
              id: randomUUID(),
              busTemplateId: templateId,
              seatNumber: `${row}${col}`,
              seatLabel: `${row}${col}`,
              rowNumber: row,
              columnPosition: col,
              floor: 1,
              seatType: SeatType.VIP,
              position: SeatPosition.WINDOW,
              priceModifier: 0,
              isAvailable: true,
            });
          }
        }
        return out;
      },
    },
    {
      key: 'VIP_29',
      name: 'Ghế Ngồi VIP 29 Chỗ Thaco/Solati',
      busType: BusType.VIP,
      totalSeats: 29,
      floors: 1,
      rowsPerFloor: 8,
      columns: 'A,B,_,C,D',
      description: 'Xe ghế ngồi VIP 29 chỗ đời mới, 2 hàng đầu hạng thương gia khoảng để chân cực rộng.',
      buildSeats: (templateId) => {
        const out: Prisma.SeatCreateManyInput[] = [];
        for (let row = 1; row <= 8; row++) {
          const cols = row === 8 ? ['A'] : ['A', 'B', 'C', 'D'];
          for (const col of cols) {
            out.push({
              id: randomUUID(),
              busTemplateId: templateId,
              seatNumber: `${row}${col}`,
              seatLabel: `${row}${col}`,
              rowNumber: row,
              columnPosition: col,
              floor: 1,
              seatType: row <= 2 ? SeatType.VIP : SeatType.NORMAL,
              position: col === 'A' || col === 'D' ? SeatPosition.WINDOW : SeatPosition.AISLE,
              priceModifier: row <= 2 ? 20000 : 0,
              isAvailable: true,
            });
          }
        }
        return out;
      },
    },
    {
      key: 'STANDARD_45',
      name: 'Xe Ghế Ngồi Hyundai Universe 45 Chỗ',
      busType: BusType.STANDARD,
      totalSeats: 45,
      floors: 1,
      rowsPerFloor: 12,
      columns: 'A,B,_,C,D',
      description: 'Xe khách Hyundai Universe 45 chỗ tiêu chuẩn, khoang hành lý lớn, giá vé tiết kiệm.',
      buildSeats: (templateId) => {
        const out: Prisma.SeatCreateManyInput[] = [];
        for (let row = 1; row <= 12; row++) {
          const cols = row === 12 ? ['A'] : ['A', 'B', 'C', 'D'];
          for (const col of cols) {
            out.push({
              id: randomUUID(),
              busTemplateId: templateId,
              seatNumber: `${row}${col}`,
              seatLabel: `${row}${col}`,
              rowNumber: row,
              columnPosition: col,
              floor: 1,
              seatType: SeatType.NORMAL,
              position: col === 'A' || col === 'D' ? SeatPosition.WINDOW : SeatPosition.AISLE,
              priceModifier: 0,
              isAvailable: true,
            });
          }
        }
        return out;
      },
    },
  ];
}

// ---------------------------------------------------------------------------
// Main 5,000-User Scale Seeder
// ---------------------------------------------------------------------------
async function main(): Promise<void> {
  const startedAt = Date.now();
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║   VeXeViet Production-Scale Seed (5,000 Users Dataset)   ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  const candidateManifestPaths = [
    path.join(__dirname, 'operator-media-manifest.json'),
    path.resolve(__dirname, '../prisma/operator-media-manifest.json'),
  ];
  const manifestPath = candidateManifestPaths.find((p) => fs.existsSync(p));
  if (!manifestPath) {
    throw new Error(
      `Missing operator-media-manifest.json. Run "pnpm media:harvest" first to upload operator images to Cloudinary.`
    );
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as OperatorMediaManifest;
  console.log(
    `📦 Loaded Cloudinary media manifest (${manifest.operators.length} operators on cloud "${manifest.cloudName}")\n`
  );

  // 1. Clean existing data in FK-safe order
  console.log('🗑️  Step 1: Cleaning existing tables...');
  await prisma.transaction.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.operatorReview.deleteMany();
  await prisma.bookingPassenger.deleteMany();
  await prisma.bookingSeat.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.route.deleteMany();
  await prisma.bus.deleteMany();
  await prisma.seat.deleteMany();
  await prisma.busTemplate.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.user.deleteMany();
  console.log('   ✅ Clean complete\n');

  // 2. Build 5,000 Users (2 Admins + 25 Real Operators + 4,973 Customers)
  console.log('👥 Step 2: Generating 5,000 users (Admins, 25 Bus Operators & 4,973 Customers)...');
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@vexeviet.com').trim();
  const adminPassword = (process.env.ADMIN_PASSWORD || 'Admin@123456').trim();
  const [adminHash, sharedHash] = await Promise.all([
    bcrypt.hash(adminPassword, 10),
    bcrypt.hash('Password@123', 10),
  ]);

  const now = new Date();
  const usersToInsert: Prisma.UserCreateManyInput[] = [];

  const primaryAdminId = randomUUID();
  usersToInsert.push({
    id: primaryAdminId,
    email: adminEmail,
    password: adminHash,
    firstName: process.env.ADMIN_FIRST_NAME?.trim() || 'Quản Trị',
    lastName: process.env.ADMIN_LAST_NAME?.trim() || 'Hệ Thống',
    phone: '0900000001',
    role: UserRole.ADMIN,
    status: UserStatus.ACTIVE,
    isEmailVerified: true,
    isPhoneVerified: true,
    registrationMethod: 'email',
    termsAcceptedAt: new Date(now.getTime() - 180 * 86400_000),
    createdAt: new Date(now.getTime() - 180 * 86400_000),
    updatedAt: now,
  });

  const opsAdminId = randomUUID();
  usersToInsert.push({
    id: opsAdminId,
    email: adminEmail === 'ops.admin@vexeviet.com' ? 'superadmin@vexeviet.com' : 'ops.admin@vexeviet.com',
    password: adminHash,
    firstName: 'Điều Hành',
    lastName: 'VeXeViet',
    phone: '0900000002',
    role: UserRole.ADMIN,
    status: UserStatus.ACTIVE,
    isEmailVerified: true,
    isPhoneVerified: true,
    registrationMethod: 'email',
    termsAcceptedAt: new Date(now.getTime() - 175 * 86400_000),
    createdAt: new Date(now.getTime() - 175 * 86400_000),
    updatedAt: now,
  });

  interface RuntimeOperator extends ManifestOperator {
    id: string;
    qualityBias: number; // 0..1 controls review star distribution per operator
  }

  const operators: RuntimeOperator[] = manifest.operators.map((op, idx) => {
    const id = randomUUID();
    const createdDaysAgo = randInt(120, 180);
    const createdAt = new Date(now.getTime() - createdDaysAgo * 86400_000);
    usersToInsert.push({
      id,
      email: op.email,
      password: sharedHash,
      firstName: op.firstName,
      lastName: op.lastName,
      phone: op.phone,
      role: UserRole.OPERATOR,
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
      isPhoneVerified: true,
      registrationMethod: 'email',
      termsAcceptedAt: createdAt,
      operatorAvatarUrl: op.operatorAvatarUrl,
      interiorImages: op.interiorImages,
      exteriorImages: op.exteriorImages,
      createdAt,
      updatedAt: now,
    });
    return {
      ...op,
      id,
      qualityBias: 0.62 + ((idx * 7) % 35) / 100, // distinct ~4.1 - 4.9 avg stars
    };
  });

  const TARGET_TOTAL_USERS = 5000;
  const customerCount = TARGET_TOTAL_USERS - usersToInsert.length; // 4,973 customers
  const EMAIL_DOMAINS = ['gmail.com', 'gmail.com', 'gmail.com', 'outlook.com', 'yahoo.com', 'icloud.com'];
  const PHONE_PREFIXES = ['090', '091', '093', '094', '096', '097', '098', '032', '035', '038', '070', '079', '083', '086'];

  interface RuntimeCustomer {
    id: string;
    email: string;
    phone: string;
    firstName: string;
    lastName: string;
    createdAt: Date;
  }
  const activeCustomers: RuntimeCustomer[] = [];

  // Demo test customer preserved for quick testing
  const demoCustomerId = randomUUID();
  const demoCreated = new Date(now.getTime() - 90 * 86400_000);
  usersToInsert.push({
    id: demoCustomerId,
    email: 'customer@vexeviet.com',
    password: sharedHash,
    firstName: 'Minh An',
    lastName: 'Nguyễn',
    phone: '0909000001',
    role: UserRole.CUSTOMER,
    status: UserStatus.ACTIVE,
    isEmailVerified: true,
    isPhoneVerified: true,
    registrationMethod: 'email',
    termsAcceptedAt: demoCreated,
    createdAt: demoCreated,
    updatedAt: now,
  });
  activeCustomers.push({
    id: demoCustomerId,
    email: 'customer@vexeviet.com',
    phone: '0909000001',
    firstName: 'Minh An',
    lastName: 'Nguyễn',
    createdAt: demoCreated,
  });

  for (let i = 1; i < customerCount; i++) {
    const id = randomUUID();
    const family = pick(LAST_NAMES);
    const middle = pick(MIDDLE_NAMES);
    const given = pick(FIRST_NAMES);
    const firstName = `${middle} ${given}`;
    const lastName = family;
    const slug = `${stripAccents(given)}.${stripAccents(family)}${i}`;
    const email = `${slug}@${pick(EMAIL_DOMAINS)}`;
    const prefix = PHONE_PREFIXES[i % PHONE_PREFIXES.length]!;
    const phone = `${prefix}${String(2000000 + i).slice(-7)}`;
    const createdDaysAgo = Math.floor(Math.pow(rng(), 1.35) * 160);
    const createdAt = new Date(now.getTime() - createdDaysAgo * 86400_000 - randInt(0, 86000) * 1000);

    const statusRoll = rng();
    const status =
      statusRoll < 0.89
        ? UserStatus.ACTIVE
        : statusRoll < 0.97
          ? UserStatus.PENDING_VERIFICATION
          : UserStatus.SUSPENDED;
    const isVerified = status === UserStatus.ACTIVE;

    usersToInsert.push({
      id,
      email,
      password: sharedHash,
      firstName,
      lastName,
      phone,
      role: UserRole.CUSTOMER,
      status,
      isEmailVerified: isVerified,
      isPhoneVerified: isVerified && rng() < 0.78,
      registrationMethod: rng() < 0.8 ? 'email' : 'phone',
      termsAcceptedAt: createdAt,
      createdAt,
      updatedAt: createdAt,
    });

    if (status === UserStatus.ACTIVE) {
      activeCustomers.push({ id, email, phone, firstName, lastName, createdAt });
    }
  }

  await insertChunked('Users', usersToInsert, (chunk) =>
    prisma.user.createMany({ data: chunk })
  );

  // 3. Bus Templates & Master Seats
  console.log('\n🚌 Step 3: Creating 7 Bus Templates & Master Seat Layouts...');
  const templateDefs = buildSeatTemplates();
  const templatesToInsert: Prisma.BusTemplateCreateManyInput[] = [];
  const seatsToInsert: Prisma.SeatCreateManyInput[] = [];

  interface RuntimeTemplate {
    id: string;
    key: string;
    name: string;
    busType: BusType;
    totalSeats: number;
    seats: Prisma.SeatCreateManyInput[];
  }
  const templatesByBusType: Record<BusType, RuntimeTemplate[]> = {
    [BusType.SLEEPER]: [],
    [BusType.LIMOUSINE]: [],
    [BusType.VIP]: [],
    [BusType.STANDARD]: [],
  };

  for (const def of templateDefs) {
    const id = randomUUID();
    const templateSeats = def.buildSeats(id);
    templatesToInsert.push({
      id,
      name: def.name,
      busType: def.busType,
      totalSeats: def.totalSeats,
      floors: def.floors,
      rowsPerFloor: def.rowsPerFloor,
      columns: def.columns,
      description: def.description,
      isActive: true,
    });
    seatsToInsert.push(...templateSeats);
    templatesByBusType[def.busType].push({
      id,
      key: def.key,
      name: def.name,
      busType: def.busType,
      totalSeats: def.totalSeats,
      seats: templateSeats,
    });
  }

  await insertChunked('BusTemplates', templatesToInsert, (chunk) =>
    prisma.busTemplate.createMany({ data: chunk })
  );
  await insertChunked('Seats', seatsToInsert, (chunk) =>
    prisma.seat.createMany({ data: chunk })
  );

  // 4. Create 250 Buses across 25 Operators
  console.log('\n🚐 Step 4: Creating 250 Fleet Buses...');
  interface RuntimeBus {
    id: string;
    licensePlate: string;
    operatorId: string;
    template: RuntimeTemplate;
  }
  const busesToInsert: Prisma.BusCreateManyInput[] = [];
  const busesByOperatorAndType = new Map<string, RuntimeBus[]>();
  const allTypes: BusType[] = [
    BusType.SLEEPER,
    BusType.SLEEPER,
    BusType.LIMOUSINE,
    BusType.LIMOUSINE,
    BusType.LIMOUSINE,
    BusType.VIP,
    BusType.VIP,
    BusType.STANDARD,
    BusType.SLEEPER,
    BusType.LIMOUSINE,
  ];

  operators.forEach((op, opIdx) => {
    for (let b = 0; b < 10; b++) {
      const busType = allTypes[b]!;
      const pool = templatesByBusType[busType];
      const tpl = pool[(opIdx + b) % pool.length]!;
      const serialA = String(opIdx * 12 + b + 101).padStart(3, '0');
      const serialB = String(((opIdx * 19 + b * 23) % 89) + 10);
      const licensePlate = `${op.platePrefix}-${serialA}.${serialB}`;
      const id = randomUUID();

      busesToInsert.push({
        id,
        licensePlate,
        operatorId: op.id,
        busTemplateId: tpl.id,
        status: BusStatus.ACTIVE,
      });

      const mapKey = `${op.id}_${busType}`;
      const list = busesByOperatorAndType.get(mapKey) || [];
      list.push({ id, licensePlate, operatorId: op.id, template: tpl });
      busesByOperatorAndType.set(mapKey, list);
    }
  });

  await insertChunked('Buses', busesToInsert, (chunk) =>
    prisma.bus.createMany({ data: chunk })
  );

  // 5. Generate ~4,200 Scheduled Routes (-30 days .. +21 days)
  console.log('\n🛣️  Step 5: Generating Scheduled Intercity Routes (-30d to +21d)...');
  const todayMidnight = new Date(now);
  todayMidnight.setHours(0, 0, 0, 0);

  const operatorsByRegion: Record<'north' | 'central' | 'south', RuntimeOperator[]> = {
    north: operators.filter((o) => o.region === 'north'),
    central: operators.filter((o) => o.region === 'central'),
    south: operators.filter((o) => o.region === 'south'),
  };

  interface RuntimeRoute {
    id: string;
    operator: RuntimeOperator;
    template: RuntimeTemplate;
    departureTime: Date;
    departureDateUtc: Date;
    price: number;
    dayOffset: number;
    pickupPointIds: string[];
    dropoffPointIds: string[];
  }

  const routesToInsert: Prisma.RouteCreateManyInput[] = [];
  const runtimeRoutes: RuntimeRoute[] = [];

  for (let dayOffset = -30; dayOffset <= 21; dayOffset++) {
    // Richer daily schedule around [-10 .. +14], lighter sampling on older history & far future
    const corridorStride = dayOffset >= -7 && dayOffset <= 10 ? 1 : 2;
    const baseDate = new Date(todayMidnight);
    baseDate.setDate(baseDate.getDate() + dayOffset);

    for (let cIdx = 0; cIdx < ALL_CORRIDORS.length; cIdx += corridorStride) {
      const corridor = ALL_CORRIDORS[(cIdx + Math.abs(dayOffset)) % ALL_CORRIDORS.length]!;
      const fromHub = CITY_HUBS[corridor.from]!;
      const toHub = CITY_HUBS[corridor.to]!;
      const regionalOps = operatorsByRegion[corridor.region];

      const tripsToday =
        dayOffset >= 0 && dayOffset <= 7 && cIdx < 16 ? 3 : dayOffset >= -10 && dayOffset <= 14 ? 2 : 1;
      const candidateHours =
        corridor.duration >= 360 ? [7, 19, 21, 22] : [6, 9, 13, 16, 19, 21];

      for (let t = 0; t < tripsToday; t++) {
        const depHour = candidateHours[(cIdx + t * 2) % candidateHours.length]!;
        const depMin = (cIdx + t) % 2 === 0 ? 0 : 30;
        const departureTime = new Date(baseDate);
        departureTime.setHours(depHour, depMin, 0, 0);

        const arrivalTime = new Date(departureTime.getTime() + corridor.duration * 60_000);
        const departureDateUtc = new Date(departureTime.toISOString().split('T')[0]!);

        const op = regionalOps[(cIdx + t + Math.abs(dayOffset)) % regionalOps.length]!;
        const busType = corridor.busTypes[(t + cIdx) % corridor.busTypes.length]!;
        const fleet = busesByOperatorAndType.get(`${op.id}_${busType}`)!;
        const chosenBus = fleet[(cIdx + t) % fleet.length]!;
        const tpl = chosenBus.template;

        const typeMultiplier =
          tpl.key === 'LIMOUSINE_20'
            ? 1.45
            : tpl.key === 'LIMOUSINE_22' || tpl.key === 'SLEEPER_34'
              ? 1.25
              : busType === BusType.STANDARD
                ? 0.85
                : 1.0;
        const price = Math.round((corridor.basePrice * typeMultiplier) / 10000) * 10000;

        const pickupPoints = fromHub.stations.map((st, sIdx) => ({
          id: `p${sIdx + 1}`,
          time: `${String((depHour + Math.floor((depMin + sIdx * 25) / 60)) % 24).padStart(2, '0')}:${String((depMin + sIdx * 25) % 60).padStart(2, '0')}`,
          location: st.name,
          address: st.address,
        }));
        const arrH = arrivalTime.getHours();
        const arrM = arrivalTime.getMinutes();
        const dropoffPoints = toHub.stations.map((st, sIdx) => ({
          id: `d${sIdx + 1}`,
          time: `${String((arrH + Math.floor((arrM + sIdx * 20) / 60)) % 24).padStart(2, '0')}:${String((arrM + sIdx * 20) % 60).padStart(2, '0')}`,
          location: st.name,
          address: st.address,
        }));

        const routeId = randomUUID();
        const timeStr = `${String(depHour).padStart(2, '0')}:${String(depMin).padStart(2, '0')}`;

        routesToInsert.push({
          id: routeId,
          name: `${fromHub.displayName} - ${toHub.displayName} (${timeStr})`,
          description: `${tpl.name} · Nhà xe ${op.firstName} ${op.lastName} phục vụ khăn lạnh, nước uống, Wifi xuyên suốt hành trình.`,
          origin: fromHub.displayName,
          destination: toHub.displayName,
          departureLocation: fromHub.stations[0]!.name,
          arrivalLocation: toHub.stations[0]!.name,
          distance: corridor.distance,
          departureTime,
          arrivalTime,
          duration: corridor.duration,
          busId: chosenBus.id,
          busTemplateId: tpl.id,
          busType,
          licensePlate: chosenBus.licensePlate,
          price,
          amenities: [
            { id: 'wifi', name: 'WiFi tốc độ cao', icon: 'wifi' },
            { id: 'ac', name: 'Điều hòa 2 chiều', icon: 'ac_unit' },
            { id: 'water', name: 'Khăn lạnh & Nước suối', icon: 'local_drink' },
            { id: 'usb', name: 'Cổng sạc USB từng ghế', icon: 'usb' },
          ],
          pickupPoints,
          dropoffPoints,
          policies: [
            {
              type: 'cancellation',
              title: 'Chính sách hoàn/hủy vé',
              description: 'Hủy trước 24h khởi hành: hoàn 85%. Trước 12h: hoàn 50%. Dưới 6h: không hỗ trợ hoàn vé.',
            },
            {
              type: 'luggage',
              title: 'Quy định hành lý',
              description: 'Miễn phí 20kg hành lý ký gửi + 1 túi xách tay nhỏ gọn mỗi hành khách.',
            },
          ],
          images: [...op.exteriorImages.slice(0, 2), ...op.interiorImages.slice(0, 2)],
          status: RouteStatus.ACTIVE,
          operatorId: op.id,
          createdAt: new Date(now.getTime() - 45 * 86400_000),
          updatedAt: now,
        });

        runtimeRoutes.push({
          id: routeId,
          operator: op,
          template: tpl,
          departureTime,
          departureDateUtc,
          price,
          dayOffset,
          pickupPointIds: pickupPoints.map((p) => p.id),
          dropoffPointIds: dropoffPoints.map((d) => d.id),
        });
      }
    }
  }

  await insertChunked('Routes', routesToInsert, (chunk) =>
    prisma.route.createMany({ data: chunk })
  );

  // 6. Generate ~10,000 Bookings, ~18,500 Seats & Passengers, Payments, Transactions & Reviews
  console.log(
    '\n🎫 Step 6: Generating Bookings, Seat Locks, Payments, Transactions & Verified Reviews...'
  );

  const bookingsToInsert: Prisma.BookingCreateManyInput[] = [];
  const bookingSeatsToInsert: Prisma.BookingSeatCreateManyInput[] = [];
  const passengersToInsert: Prisma.BookingPassengerCreateManyInput[] = [];
  const paymentsToInsert: Prisma.PaymentCreateManyInput[] = [];
  const transactionsToInsert: Prisma.TransactionCreateManyInput[] = [];
  const reviewsToInsert: Prisma.OperatorReviewCreateManyInput[] = [];

  // Power-law customer picker so frequent travelers have multiple trips & demoCustomer gets 6 trips
  const pickCustomer = (bookingIdx: number): RuntimeCustomer => {
    if (bookingIdx < 6) return activeCustomers[0]!; // customer@vexeviet.com gets rich history + upcoming
    const skewed = Math.floor(Math.pow(rng(), 1.45) * activeCustomers.length);
    return activeCustomers[Math.min(skewed, activeCustomers.length - 1)]!;
  };

  const PAYMENT_METHODS: PaymentMethod[] = [
    PaymentMethod.VNPAY,
    PaymentMethod.VNPAY,
    PaymentMethod.VNPAY,
    PaymentMethod.MOMO,
    PaymentMethod.MOMO,
    PaymentMethod.BANK_TRANSFER,
    PaymentMethod.ZALOPAY,
    PaymentMethod.CASH,
  ];

  let bookingSeq = 0;
  let paymentSeq = 0;

  for (const rt of runtimeRoutes) {
    const isPast = rt.departureTime.getTime() < now.getTime();
    // Past trips had higher final load; upcoming trips have realistic partial load (nearer dates fuller)
    const targetBookingsForRoute = isPast
      ? randInt(2, 5)
      : rt.dayOffset <= 3
        ? randInt(2, 5)
        : rt.dayOffset <= 10
          ? randInt(1, 3)
          : rng() < 0.65
            ? randInt(1, 2)
            : 0;

    if (targetBookingsForRoute === 0) continue;

    // Shuffle available master seats once per route to guarantee zero duplicate seatNumber collisions
    const availableMasterSeats = [...rt.template.seats];
    for (let i = availableMasterSeats.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = availableMasterSeats[i]!;
      availableMasterSeats[i] = availableMasterSeats[j]!;
      availableMasterSeats[j] = tmp;
    }

    let seatCursor = 0;

    for (let b = 0; b < targetBookingsForRoute; b++) {
      const seatCount = rng() < 0.52 ? 1 : rng() < 0.85 ? 2 : randInt(3, 4);
      if (seatCursor + seatCount > availableMasterSeats.length - 2) break;

      const chosenSeats = availableMasterSeats.slice(seatCursor, seatCursor + seatCount);
      seatCursor += seatCount;

      const cust = pickCustomer(bookingSeq);
      const bookingId = randomUUID();
      const bookingCode = makeBookingCode(bookingSeq);
      bookingSeq++;

      // Booking creation timestamp (1..12 days prior to departure, never in the future)
      const leadHours = isPast ? randInt(4, 180) : randInt(2, 96);
      const rawCreated = new Date(rt.departureTime.getTime() - leadHours * 3600_000);
      const createdAt =
        rawCreated.getTime() > now.getTime()
          ? new Date(now.getTime() - randInt(5, 720) * 60_000)
          : rawCreated;

      let status: BookingStatus;
      const roll = rng();
      if (isPast) {
        if (roll < 0.68) status = BookingStatus.COMPLETED;
        else if (roll < 0.82) status = BookingStatus.CONFIRMED;
        else if (roll < 0.93) status = BookingStatus.CANCELLED;
        else status = BookingStatus.EXPIRED;
      } else {
        if (roll < 0.76) status = BookingStatus.CONFIRMED;
        else if (roll < 0.88 && rt.dayOffset <= 5) status = BookingStatus.PENDING;
        else status = BookingStatus.CANCELLED;
      }

      const seatsTotal = chosenSeats.reduce(
        (sum, s) => sum + rt.price + Number(s.priceModifier || 0),
        0
      );
      const serviceFee = Math.round(seatsTotal * 0.05);
      const discount = rng() < 0.18 ? 20000 : 0;
      const totalPrice = Math.max(seatsTotal + serviceFee - discount, 50000);

      const paymentDeadline =
        status === BookingStatus.PENDING
          ? new Date(now.getTime() + randInt(5, 15) * 60_000)
          : new Date(createdAt.getTime() + 15 * 60_000);

      const confirmedAt =
        status === BookingStatus.CONFIRMED || status === BookingStatus.COMPLETED
          ? new Date(createdAt.getTime() + randInt(45, 420) * 1000)
          : null;
      const cancelledAt =
        status === BookingStatus.CANCELLED
          ? new Date(createdAt.getTime() + randInt(600, 14400) * 1000)
          : null;

      bookingsToInsert.push({
        id: bookingId,
        bookingCode,
        userId: cust.id,
        routeId: rt.id,
        departureDate: rt.departureDateUtc,
        status,
        totalPrice,
        serviceFee,
        discount,
        paymentDeadline,
        pickupPointId: pick(rt.pickupPointIds),
        dropoffPointId: pick(rt.dropoffPointIds),
        contactEmail: cust.email,
        contactPhone: cust.phone,
        promoCode: discount > 0 ? 'VEXEVIET20K' : null,
        idempotencyKey: `seed5k-idem-${bookingSeq}`,
        confirmedAt,
        cancelledAt,
        cancellationReason:
          status === BookingStatus.CANCELLED ? 'Khách hàng thay đổi lịch trình cá nhân' : null,
        createdAt,
        updatedAt: cancelledAt ?? confirmedAt ?? createdAt,
      });

      // Only active/confirmed/completed/pending bookings lock seats in BookingSeat
      // (avoiding occupying seats on cancelled/expired trips)
      const occupySeats =
        status === BookingStatus.CONFIRMED ||
        status === BookingStatus.COMPLETED ||
        status === BookingStatus.PENDING;

      chosenSeats.forEach((seat, sIdx) => {
        const seatPrice = rt.price + Number(seat.priceModifier || 0);
        if (occupySeats) {
          bookingSeatsToInsert.push({
            id: randomUUID(),
            bookingId,
            routeId: rt.id,
            seatId: seat.id,
            departureDate: rt.departureDateUtc,
            seatNumber: seat.seatNumber,
            status: status === BookingStatus.PENDING ? SeatStatus.HELD : SeatStatus.BOOKED,
            lockedAt: createdAt,
            lockedUntil: paymentDeadline,
            price: seatPrice,
            createdAt,
          });
        }

        const pFirst = sIdx === 0 ? cust.firstName : `${pick(MIDDLE_NAMES)} ${pick(FIRST_NAMES)}`;
        const pLast = sIdx === 0 ? cust.lastName : pick(LAST_NAMES);
        passengersToInsert.push({
          id: randomUUID(),
          bookingId,
          seatId: seat.id,
          firstName: pFirst,
          lastName: pLast,
          seatNumber: seat.seatNumber,
          idNumber: `0${randInt(10, 96)}${randInt(100000000, 999999999)}`,
          createdAt,
        });
      });

      // Create Payment & Transaction records
      if (status !== BookingStatus.EXPIRED || rng() < 0.5) {
        const paymentId = randomUUID();
        paymentSeq++;
        const method = pick(PAYMENT_METHODS);
        const payStatus =
          status === BookingStatus.CONFIRMED || status === BookingStatus.COMPLETED
            ? PaymentStatus.COMPLETED
            : status === BookingStatus.PENDING
              ? PaymentStatus.PENDING
              : rng() < 0.55
                ? PaymentStatus.REFUNDED
                : PaymentStatus.CANCELLED;

        const paidAt =
          payStatus === PaymentStatus.COMPLETED || payStatus === PaymentStatus.REFUNDED
            ? confirmedAt ?? new Date(createdAt.getTime() + 120_000)
            : null;
        const txnRef = `VXV${String(paymentSeq).padStart(7, '0')}${bookingCode.slice(-4)}`;

        paymentsToInsert.push({
          id: paymentId,
          bookingId,
          amount: totalPrice,
          method,
          status: payStatus,
          transactionRef: txnRef,
          paidAt,
          expiredAt: paymentDeadline,
          createdAt,
          updatedAt: cancelledAt ?? paidAt ?? createdAt,
        });

        transactionsToInsert.push({
          id: randomUUID(),
          paymentId,
          type: TransactionType.PAYMENT,
          amount: totalPrice,
          status:
            payStatus === PaymentStatus.COMPLETED || payStatus === PaymentStatus.REFUNDED
              ? TransactionStatus.COMPLETED
              : payStatus === PaymentStatus.PENDING
                ? TransactionStatus.PENDING
                : TransactionStatus.CANCELLED,
          providerTxnId: paidAt ? `NP${10000000 + paymentSeq}` : null,
          bankCode: method === PaymentMethod.VNPAY || method === PaymentMethod.BANK_TRANSFER ? 'NCB' : null,
          responseCode: paidAt ? '00' : payStatus === PaymentStatus.PENDING ? null : '24',
          responseMessage: paidAt ? 'Giao dịch thành công' : 'Khách hàng hủy hoặc chờ thanh toán',
          createdAt,
          updatedAt: paidAt ?? createdAt,
        });

        if (payStatus === PaymentStatus.REFUNDED && cancelledAt) {
          transactionsToInsert.push({
            id: randomUUID(),
            paymentId,
            type: TransactionType.REFUND,
            amount: Math.round(totalPrice * 0.85),
            status: TransactionStatus.COMPLETED,
            providerTxnId: `RF${10000000 + paymentSeq}`,
            responseCode: '00',
            responseMessage: 'Hoàn tiền theo chính sách hủy vé trước 24h',
            createdAt: cancelledAt,
            updatedAt: cancelledAt,
          });
        }
      }

      // Create realistic OperatorReview for ~38% of past completed/confirmed trips
      if (
        isPast &&
        (status === BookingStatus.COMPLETED || status === BookingStatus.CONFIRMED) &&
        rng() < 0.38
      ) {
        const starRoll = rng();
        const bias = rt.operator.qualityBias;
        const rating =
          starRoll < bias * 0.72
            ? 5
            : starRoll < bias * 0.98
              ? 4
              : starRoll < 0.93
                ? 3
                : starRoll < 0.98
                  ? 2
                  : 1;

        const comment =
          rating === 5
            ? pick(REVIEWS_5_STAR)
            : rating === 4
              ? pick(REVIEWS_4_STAR)
              : rating === 3
                ? pick(REVIEWS_3_STAR)
                : pick(REVIEWS_LOW);

        const hasReply = rng() < 0.68;
        const reviewCreated = new Date(
          Math.min(
            rt.departureTime.getTime() + randInt(6, 72) * 3600_000,
            now.getTime() - 60_000
          )
        );
        const repliedAt = hasReply
          ? new Date(
              Math.min(reviewCreated.getTime() + randInt(1, 24) * 3600_000, now.getTime() - 10_000)
            )
          : null;

        reviewsToInsert.push({
          id: randomUUID(),
          bookingId,
          userId: cust.id,
          operatorId: rt.operator.id,
          routeId: rt.id,
          rating,
          comment,
          status: ReviewStatus.VISIBLE,
          operatorReply: hasReply
            ? rating >= 4
              ? pick(OPERATOR_REPLIES_POSITIVE)
              : pick(OPERATOR_REPLIES_CONSTRUCTIVE)
            : null,
          repliedAt,
          createdAt: reviewCreated,
          updatedAt: repliedAt ?? reviewCreated,
        });
      }
    }
  }

  await insertChunked('Bookings', bookingsToInsert, (chunk) =>
    prisma.booking.createMany({ data: chunk })
  );
  await insertChunked('BookingSeats', bookingSeatsToInsert, (chunk) =>
    prisma.bookingSeat.createMany({ data: chunk })
  );
  await insertChunked('BookingPassengers', passengersToInsert, (chunk) =>
    prisma.bookingPassenger.createMany({ data: chunk })
  );
  await insertChunked('Payments', paymentsToInsert, (chunk) =>
    prisma.payment.createMany({ data: chunk })
  );
  await insertChunked('Transactions', transactionsToInsert, (chunk) =>
    prisma.transaction.createMany({ data: chunk })
  );
  await insertChunked('OperatorReviews', reviewsToInsert, (chunk) =>
    prisma.operatorReview.createMany({ data: chunk })
  );

  // 7. Create ~240 Admin & Operator Audit Logs
  console.log('\n📋 Step 7: Generating Operational Audit Logs...');
  const auditLogsToInsert: Prisma.AuditLogCreateManyInput[] = [];
  const AUDIT_TEMPLATES = [
    { action: 'BOOKING_CONFIRMED', severity: AuditSeverity.INFO, role: 'ADMIN' },
    { action: 'ROUTE_PUBLISHED', severity: AuditSeverity.INFO, role: 'OPERATOR' },
    { action: 'OPERATOR_IMAGES_UPDATED', severity: AuditSeverity.INFO, role: 'OPERATOR' },
    { action: 'REVIEW_REPLIED', severity: AuditSeverity.INFO, role: 'OPERATOR' },
    { action: 'PAYMENT_REFUND_ISSUED', severity: AuditSeverity.WARNING, role: 'ADMIN' },
    { action: 'USER_STATUS_SUSPENDED', severity: AuditSeverity.DANGER, role: 'ADMIN' },
  ];

  for (let i = 0; i < 240; i++) {
    const tpl = AUDIT_TEMPLATES[i % AUDIT_TEMPLATES.length]!;
    const isOp = tpl.role === 'OPERATOR';
    const op = operators[i % operators.length]!;
    const sampleBooking = bookingsToInsert[i % bookingsToInsert.length];
    const createdAt = new Date(now.getTime() - randInt(1, 30 * 24 * 60) * 60_000);

    auditLogsToInsert.push({
      id: randomUUID(),
      actorId: isOp ? op.id : primaryAdminId,
      actorName: isOp ? `${op.firstName} ${op.lastName}` : 'Quản Trị Hệ Thống',
      actorRole: tpl.role,
      action: tpl.action,
      target: sampleBooking ? `booking:${sampleBooking.bookingCode}` : `operator:${op.slug}`,
      targetId: sampleBooking ? sampleBooking.id : op.id,
      severity: tpl.severity,
      metadata: { source: 'production-console', verified: true },
      ipAddress: `113.161.${randInt(10, 220)}.${randInt(2, 250)}`,
      createdAt,
    });
  }

  await insertChunked('AuditLogs', auditLogsToInsert, (chunk) =>
    prisma.auditLog.createMany({ data: chunk })
  );

  const elapsedSec = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(`\n🎉 COMPLETED IN ${elapsedSec}s!`);
  console.log('──────────────────────────────────────────────────────────');
  console.log(`   👤 Users           : ${usersToInsert.length.toLocaleString('en-US')} (2 Admins, ${operators.length} Operators, ${customerCount} Customers)`);
  console.log(`   🚌 Bus Templates   : ${templatesToInsert.length} (${seatsToInsert.length} master seats)`);
  console.log(`   🚐 Fleet Buses     : ${busesToInsert.length}`);
  console.log(`   🛣️  Scheduled Trips : ${routesToInsert.length.toLocaleString('en-US')}`);
  console.log(`   🎫 Bookings        : ${bookingsToInsert.length.toLocaleString('en-US')} (${passengersToInsert.length.toLocaleString('en-US')} passengers)`);
  console.log(`   💳 Payments & Txns : ${paymentsToInsert.length.toLocaleString('en-US')} payments / ${transactionsToInsert.length.toLocaleString('en-US')} txns`);
  console.log(`   ⭐ Verified Reviews: ${reviewsToInsert.length.toLocaleString('en-US')}`);
  console.log(`   📋 Audit Logs      : ${auditLogsToInsert.length}`);
  console.log('──────────────────────────────────────────────────────────');
  console.log(`   🔑 Admin Login     : ${adminEmail} / ${adminPassword}`);
  console.log(`   🔑 Operator Login  : phuongtrang@vexeviet.com / Password@123`);
  console.log(`   🔑 Customer Login  : customer@vexeviet.com / Password@123\n`);
}

main()
  .catch((err) => {
    console.error('❌ Seed 5K failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

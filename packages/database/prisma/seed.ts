import {
  PrismaClient,
  BusType,
  SeatType,
  SeatPosition,
  RouteStatus,
  UserRole,
  UserStatus,
  SeatStatus,
  BusStatus,
} from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// =====================================================
// DANH SÁCH TỈNH THÀNH VIỆT NAM (63 TỈNH THÀNH)
// =====================================================
const provinces = [
  { id: 'hanoi', name: 'Hà Nội', displayName: 'Hà Nội' },
  { id: 'haiphong', name: 'Hải Phòng', displayName: 'Hải Phòng' },
  { id: 'quangninh', name: 'Quảng Ninh', displayName: 'Hạ Long - Quảng Ninh' },
  { id: 'haigiang', name: 'Hà Giang', displayName: 'Hà Giang' },
  { id: 'caobang', name: 'Cao Bằng', displayName: 'Cao Bằng' },
  { id: 'langson', name: 'Lạng Sơn', displayName: 'Lạng Sơn' },
  { id: 'laocai', name: 'Lào Cai', displayName: 'Sa Pa - Lào Cai' },
  { id: 'yenbai', name: 'Yên Bái', displayName: 'Yên Bái' },
  { id: 'tuyenquang', name: 'Tuyên Quang', displayName: 'Tuyên Quang' },
  { id: 'backan', name: 'Bắc Kạn', displayName: 'Bắc Kạn' },
  { id: 'thainguyen', name: 'Thái Nguyên', displayName: 'Thái Nguyên' },
  { id: 'bacgiang', name: 'Bắc Giang', displayName: 'Bắc Giang' },
  { id: 'bacninh', name: 'Bắc Ninh', displayName: 'Bắc Ninh' },
  { id: 'hanam', name: 'Hà Nam', displayName: 'Hà Nam' },
  { id: 'hungyen', name: 'Hưng Yên', displayName: 'Hưng Yên' },
  { id: 'haiduong', name: 'Hải Dương', displayName: 'Hải Dương' },
  { id: 'namdinh', name: 'Nam Định', displayName: 'Nam Định' },
  { id: 'thaibinh', name: 'Thái Bình', displayName: 'Thái Bình' },
  { id: 'ninhbinh', name: 'Ninh Bình', displayName: 'Ninh Bình' },
  { id: 'hoabinh', name: 'Hòa Bình', displayName: 'Hòa Bình' },
  { id: 'sonla', name: 'Sơn La', displayName: 'Sơn La' },
  { id: 'dienbien', name: 'Điện Biên', displayName: 'Điện Biên' },
  { id: 'laichau', name: 'Lai Châu', displayName: 'Lai Châu' },
  { id: 'phutho', name: 'Phú Thọ', displayName: 'Phú Thọ' },
  { id: 'vinhphuc', name: 'Vĩnh Phúc', displayName: 'Vĩnh Phúc' },
  { id: 'thanhhoa', name: 'Thanh Hóa', displayName: 'Thanh Hóa' },
  { id: 'nghean', name: 'Nghệ An', displayName: 'Vinh - Nghệ An' },
  { id: 'hatinh', name: 'Hà Tĩnh', displayName: 'Hà Tĩnh' },
  { id: 'quangbinh', name: 'Quảng Bình', displayName: 'Đồng Hới - Quảng Bình' },
  { id: 'quangtri', name: 'Quảng Trị', displayName: 'Quảng Trị' },
  { id: 'thuathienhue', name: 'Thừa Thiên Huế', displayName: 'Huế - Thừa Thiên Huế' },
  { id: 'danang', name: 'Đà Nẵng', displayName: 'Đà Nẵng' },
  { id: 'quangnam', name: 'Quảng Nam', displayName: 'Hội An - Quảng Nam' },
  { id: 'quangngai', name: 'Quảng Ngãi', displayName: 'Quảng Ngãi' },
  { id: 'binhdinh', name: 'Bình Định', displayName: 'Quy Nhơn - Bình Định' },
  { id: 'phuyen', name: 'Phú Yên', displayName: 'Tuy Hòa - Phú Yên' },
  { id: 'khanhhoa', name: 'Khánh Hòa', displayName: 'Nha Trang - Khánh Hòa' },
  { id: 'ninhthuan', name: 'Ninh Thuận', displayName: 'Phan Rang - Ninh Thuận' },
  { id: 'binhthuan', name: 'Bình Thuận', displayName: 'Phan Thiết - Bình Thuận' },
  { id: 'kontum', name: 'Kon Tum', displayName: 'Kon Tum' },
  { id: 'gialai', name: 'Gia Lai', displayName: 'Pleiku - Gia Lai' },
  { id: 'daklak', name: 'Đắk Lắk', displayName: 'Buôn Ma Thuột - Đắk Lắk' },
  { id: 'daknong', name: 'Đắk Nông', displayName: 'Đắk Nông' },
  { id: 'lamdong', name: 'Lâm Đồng', displayName: 'Đà Lạt - Lâm Đồng' },
  { id: 'hochiminh', name: 'Hồ Chí Minh', displayName: 'Hồ Chí Minh' },
  { id: 'baria-vungtau', name: 'Bà Rịa - Vũng Tàu', displayName: 'Vũng Tàu - Bà Rịa' },
  { id: 'binhduong', name: 'Bình Dương', displayName: 'Thủ Dầu Một - Bình Dương' },
  { id: 'binhphuoc', name: 'Bình Phước', displayName: 'Bình Phước' },
  { id: 'dongnai', name: 'Đồng Nai', displayName: 'Biên Hòa - Đồng Nai' },
  { id: 'tayninh', name: 'Tây Ninh', displayName: 'Tây Ninh' },
  { id: 'longan', name: 'Long An', displayName: 'Tân An - Long An' },
  { id: 'tiengiang', name: 'Tiền Giang', displayName: 'Mỹ Tho - Tiền Giang' },
  { id: 'bentre', name: 'Bến Tre', displayName: 'Bến Tre' },
  { id: 'travinh', name: 'Trà Vinh', displayName: 'Trà Vinh' },
  { id: 'vinhlong', name: 'Vĩnh Long', displayName: 'Vĩnh Long' },
  { id: 'dongtap', name: 'Đồng Tháp', displayName: 'Cao Lãnh - Đồng Tháp' },
  { id: 'angiang', name: 'An Giang', displayName: 'Long Xuyên - An Giang' },
  { id: 'kiengiang', name: 'Kiên Giang', displayName: 'Rạch Giá - Kiên Giang' },
  { id: 'cantho', name: 'Cần Thơ', displayName: 'Cần Thơ' },
  { id: 'haugiang', name: 'Hậu Giang', displayName: 'Vị Thanh - Hậu Giang' },
  { id: 'soctrang', name: 'Sóc Trăng', displayName: 'Sóc Trăng' },
  { id: 'baclieu', name: 'Bạc Liêu', displayName: 'Bạc Liêu' },
  { id: 'camau', name: 'Cà Mau', displayName: 'Cà Mau' },
];

// =====================================================
// BUS TEMPLATES DATA
// =====================================================

interface BusTemplateConfig {
  name: string;
  busType: BusType;
  totalSeats: number;
  floors: number;
  rowsPerFloor: number;
  columns: string;
  description: string;
  seatLayout: SeatLayoutConfig;
}

interface SeatLayoutConfig {
  seatType: SeatType;
  columnsArray: string[];
  rowCount: number;
  priceModifierFloor1: number;
  priceModifierFloor2: number;
}

const busTemplates: BusTemplateConfig[] = [
  // =====================================================
  // XE GIƯỜNG NẰM (SLEEPER BUS)
  // Layout thực tế: 2 tầng, mỗi tầng có 3 dãy giường:
  //   - Dãy A (trái - sát cửa sổ): 1 giường đơn
  //   - Lối đi 1 (giữa A và B)
  //   - Dãy B (giữa): 1 giường đơn  
  //   - Lối đi 2 (giữa B và C)
  //   - Dãy C (phải - sát cửa sổ): 1 giường đơn
  // Tổng mỗi tầng: 7 hàng × 3 giường = 21 giường
  // =====================================================
  
  // 1. Xe Giường Nằm 40 Chỗ (2 Tầng) - Phổ biến nhất
  // Tên gọi phổ biến: "Xe 40 chỗ" - số ghế thực tế: 42 giường
  // 2 tầng × 3 cột × 7 hàng = 42 giường
  // Sơ đồ mỗi tầng (nhìn từ trên xuống):
  //   [A1] [lối đi] [B1] [lối đi] [C1]
  //   [A2] [lối đi] [B2] [lối đi] [C2]
  //   ... (7 hàng)
  //   [A7] [lối đi] [B7] [lối đi] [C7]
  {
    name: 'Xe Giường Nằm 40 Chỗ',
    busType: BusType.SLEEPER,
    totalSeats: 42, // Số ghế thực tế trên sơ đồ
    floors: 2,
    rowsPerFloor: 7,
    columns: 'A,_,B,_,C', // A: trái (cửa sổ), _: lối đi, B: giữa, _: lối đi, C: phải (cửa sổ)
    description:
      'Xe giường nằm 2 tầng (loại 40 chỗ), 42 giường. Mỗi tầng 21 giường (7 hàng × 3 dãy). Dãy A và C sát cửa sổ, dãy B ở giữa.',
    seatLayout: {
      seatType: SeatType.SLEEPER,
      columnsArray: ['A', 'B', 'C'], // 3 cột giường, có 2 lối đi xen kẽ
      rowCount: 7,
      priceModifierFloor1: 30000, // Tầng dưới +30k
      priceModifierFloor2: 0,
    },
  },
  // 2. Xe Giường Nằm 34 Chỗ VIP (2 Tầng) - Cao cấp
  // Tên gọi phổ biến: "Xe 34 chỗ VIP" - số ghế thực tế: 36 giường
  // Layout: Tầng dưới 18 ghế (6 hàng × 3), Tầng trên 18 ghế (6 hàng × 3)
  // Tổng: 18 + 18 = 36 ghế
  // Giường rộng hơn, khoảng cách xa hơn
  {
    name: 'Xe Giường Nằm 34 Chỗ VIP',
    busType: BusType.SLEEPER,
    totalSeats: 36, // Số ghế thực tế trên sơ đồ
    floors: 2,
    rowsPerFloor: 6,
    columns: 'A,_,B,_,C',
    description:
      'Xe giường nằm VIP 2 tầng (loại 34 chỗ), 36 giường. Mỗi tầng 18 giường. Giường rộng hơn 20%.',
    seatLayout: {
      seatType: SeatType.SLEEPER,
      columnsArray: ['A', 'B', 'C'],
      rowCount: 6,
      priceModifierFloor1: 50000,
      priceModifierFloor2: 0,
    },
  },
  
  // =====================================================
  // XE LIMOUSINE (LUXURY BUS)
  // Layout: 1 tầng, ghế massage cao cấp
  // =====================================================
  
  // 4. Xe Limousine 22 Chỗ (Hạng thương gia)
  // 1 tầng × 2 cột (1-1) × 11 hàng = 22 ghế
  {
    name: 'Limousine 22 Chỗ VIP',
    busType: BusType.LIMOUSINE,
    totalSeats: 22,
    floors: 1,
    rowsPerFloor: 11,
    columns: 'A,_,B', // Mỗi hàng chỉ 2 ghế, cách nhau bởi lối đi rộng
    description:
      'Xe Limousine hạng thương gia, 22 ghế massage cao cấp. Khoảng cách ghế rộng, có màn hình riêng, wifi, nước uống.',
    seatLayout: {
      seatType: SeatType.VIP,
      columnsArray: ['A', 'B'],
      rowCount: 11,
      priceModifierFloor1: 0,
      priceModifierFloor2: 0,
    },
  },
  // 5. Xe Limousine 34 Chỗ
  // Tên gọi phổ biến: "Limousine 34 chỗ" - số ghế thực tế: 36 ghế
  // 1 tầng × 2 cột × 18 hàng = 36 ghế
  {
    name: 'Limousine 34 Chỗ',
    busType: BusType.LIMOUSINE,
    totalSeats: 36, // Số ghế thực tế trên sơ đồ
    floors: 1,
    rowsPerFloor: 18,
    columns: 'A,_,B',
    description:
      'Xe Limousine (loại 34 chỗ), 36 ghế da cao cấp, có thể ngả 160 độ. Wifi, USB sạc, nước uống miễn phí.',
    seatLayout: {
      seatType: SeatType.VIP,
      columnsArray: ['A', 'B'],
      rowCount: 18,
      priceModifierFloor1: 0,
      priceModifierFloor2: 0,
    },
  },
  
  // =====================================================
  // XE GHẾ NGỒI VIP
  // Layout: 1 tầng, 4 cột (2-2)
  // =====================================================
  
  // 6. Xe Ghế Ngồi VIP 29 Chỗ
  // 1 tầng × 4 cột × 7 hàng + 1 hàng cuối 1 ghế = 29 ghế
  {
    name: 'Ghế Ngồi VIP 29 Chỗ',
    busType: BusType.VIP,
    totalSeats: 29,
    floors: 1,
    rowsPerFloor: 8, // 7 hàng × 4 ghế = 28, hàng 8 có 1 ghế = 29
    columns: 'A,B,_,C,D',
    description:
      'Xe ghế ngồi VIP 29 chỗ, ghế rộng, có thể ngả. Phù hợp cho các chuyến đi ngắn và trung bình.',
    seatLayout: {
      seatType: SeatType.VIP,
      columnsArray: ['A', 'B', 'C', 'D'],
      rowCount: 8,
      priceModifierFloor1: 0,
      priceModifierFloor2: 0,
    },
  },
  
  // =====================================================
  // XE GHẾ NGỒI THƯỜNG (STANDARD)
  // Layout: 1 tầng, 4 cột (2-2)
  // =====================================================
  
  // 7. Xe Ghế Ngồi 45 Chỗ
  // 1 tầng × 4 cột × 11 hàng + hàng cuối 1 ghế = 45 ghế
  {
    name: 'Xe Ghế Ngồi 45 Chỗ',
    busType: BusType.STANDARD,
    totalSeats: 45,
    floors: 1,
    rowsPerFloor: 12, // 11 hàng × 4 = 44, hàng 12 có 1 ghế = 45
    columns: 'A,B,_,C,D',
    description:
      'Xe ghế ngồi thường 45 chỗ, tiêu chuẩn, giá cả phải chăng. Có điều hòa, wifi.',
    seatLayout: {
      seatType: SeatType.NORMAL,
      columnsArray: ['A', 'B', 'C', 'D'],
      rowCount: 12,
      priceModifierFloor1: 0,
      priceModifierFloor2: 0,
    },
  },
  
  // =====================================================
  // XE CABIN ĐÔI (LUXURY SLEEPER)
  // Layout: 2 tầng, mỗi tầng 2 dãy cabin riêng tư
  // =====================================================
  
  // 8. Xe Cabin Đôi 20 Chỗ (Luxury)
  // 2 tầng × 2 cột × 5 hàng = 20 cabin
  {
    name: 'Cabin Đôi Luxury 20 Chỗ',
    busType: BusType.LIMOUSINE,
    totalSeats: 20,
    floors: 2,
    rowsPerFloor: 5,
    columns: 'A,_,B',
    description:
      'Xe cabin đôi cao cấp nhất, 20 cabin riêng tư. Mỗi cabin có rèm che, đèn đọc sách, ổ cắm điện.',
    seatLayout: {
      seatType: SeatType.SLEEPER,
      columnsArray: ['A', 'B'],
      rowCount: 5,
      priceModifierFloor1: 50000,
      priceModifierFloor2: 0,
    },
  },
];

// =====================================================
// POPULAR ROUTES DATA
// =====================================================

interface RouteConfig {
  from: string;
  to: string;
  distance: number;
  duration: number;
  price: number;
  busType: BusType;
}

const popularRoutes: RouteConfig[] = [
  // === TỪ HỒ CHÍ MINH ===
  { from: 'hochiminh', to: 'lamdong', distance: 308, duration: 360, price: 350000, busType: BusType.LIMOUSINE },
  { from: 'hochiminh', to: 'khanhhoa', distance: 450, duration: 480, price: 400000, busType: BusType.SLEEPER },
  { from: 'hochiminh', to: 'binhthuan', distance: 198, duration: 240, price: 200000, busType: BusType.LIMOUSINE },
  { from: 'hochiminh', to: 'baria-vungtau', distance: 125, duration: 120, price: 150000, busType: BusType.VIP },
  { from: 'hochiminh', to: 'cantho', distance: 170, duration: 180, price: 150000, busType: BusType.LIMOUSINE },
  { from: 'hochiminh', to: 'binhduong', distance: 30, duration: 45, price: 50000, busType: BusType.STANDARD },
  { from: 'hochiminh', to: 'dongnai', distance: 32, duration: 50, price: 60000, busType: BusType.STANDARD },
  { from: 'hochiminh', to: 'tiengiang', distance: 72, duration: 90, price: 100000, busType: BusType.VIP },
  { from: 'hochiminh', to: 'daklak', distance: 350, duration: 420, price: 380000, busType: BusType.SLEEPER },
  { from: 'hochiminh', to: 'gialai', distance: 460, duration: 540, price: 420000, busType: BusType.SLEEPER },
  { from: 'hochiminh', to: 'danang', distance: 960, duration: 720, price: 500000, busType: BusType.SLEEPER },

  // === TỪ HÀ NỘI ===
  { from: 'hanoi', to: 'quangninh', distance: 160, duration: 180, price: 180000, busType: BusType.LIMOUSINE },
  { from: 'hanoi', to: 'haiphong', distance: 105, duration: 120, price: 120000, busType: BusType.VIP },
  { from: 'hanoi', to: 'laocai', distance: 320, duration: 360, price: 300000, busType: BusType.SLEEPER },
  { from: 'hanoi', to: 'haigiang', distance: 310, duration: 420, price: 280000, busType: BusType.SLEEPER },
  { from: 'hanoi', to: 'thanhhoa', distance: 160, duration: 180, price: 150000, busType: BusType.LIMOUSINE },
  { from: 'hanoi', to: 'nghean', distance: 300, duration: 300, price: 250000, busType: BusType.LIMOUSINE },
  { from: 'hanoi', to: 'thuathienhue', distance: 660, duration: 660, price: 400000, busType: BusType.SLEEPER },
  { from: 'hanoi', to: 'danang', distance: 780, duration: 720, price: 450000, busType: BusType.SLEEPER },
  { from: 'hanoi', to: 'ninhbinh', distance: 93, duration: 120, price: 100000, busType: BusType.VIP },
  { from: 'hanoi', to: 'sonla', distance: 310, duration: 360, price: 280000, busType: BusType.SLEEPER },
  { from: 'hanoi', to: 'dienbien', distance: 475, duration: 540, price: 380000, busType: BusType.SLEEPER },

  // === TỪ ĐÀ NẴNG ===
  { from: 'danang', to: 'thuathienhue', distance: 100, duration: 120, price: 120000, busType: BusType.VIP },
  { from: 'danang', to: 'quangnam', distance: 30, duration: 45, price: 50000, busType: BusType.STANDARD },
  { from: 'danang', to: 'quangngai', distance: 130, duration: 150, price: 150000, busType: BusType.VIP },
  { from: 'danang', to: 'binhdinh', distance: 300, duration: 300, price: 250000, busType: BusType.LIMOUSINE },
  { from: 'danang', to: 'khanhhoa', distance: 530, duration: 480, price: 350000, busType: BusType.SLEEPER },
  { from: 'danang', to: 'hochiminh', distance: 960, duration: 720, price: 500000, busType: BusType.SLEEPER },

  // === TỪ NHA TRANG ===
  { from: 'khanhhoa', to: 'lamdong', distance: 135, duration: 180, price: 180000, busType: BusType.LIMOUSINE },
  { from: 'khanhhoa', to: 'hochiminh', distance: 450, duration: 480, price: 400000, busType: BusType.SLEEPER },
  { from: 'khanhhoa', to: 'binhthuan', distance: 250, duration: 240, price: 200000, busType: BusType.VIP },
  { from: 'khanhhoa', to: 'phuyen', distance: 120, duration: 150, price: 150000, busType: BusType.VIP },

  // === TỪ ĐÀ LẠT ===
  { from: 'lamdong', to: 'hochiminh', distance: 308, duration: 360, price: 350000, busType: BusType.LIMOUSINE },
  { from: 'lamdong', to: 'khanhhoa', distance: 135, duration: 180, price: 180000, busType: BusType.LIMOUSINE },
  { from: 'lamdong', to: 'binhthuan', distance: 165, duration: 180, price: 150000, busType: BusType.VIP },

  // === TỪ CẦN THƠ ===
  { from: 'cantho', to: 'hochiminh', distance: 170, duration: 180, price: 150000, busType: BusType.LIMOUSINE },
  { from: 'cantho', to: 'kiengiang', distance: 115, duration: 150, price: 120000, busType: BusType.VIP },
  { from: 'cantho', to: 'camau', distance: 180, duration: 210, price: 180000, busType: BusType.LIMOUSINE },
  { from: 'cantho', to: 'angiang', distance: 60, duration: 90, price: 80000, busType: BusType.STANDARD },

  // === CÁC TUYẾN KHÁC ===
  { from: 'binhdinh', to: 'daklak', distance: 200, duration: 240, price: 200000, busType: BusType.LIMOUSINE },
  { from: 'thuathienhue', to: 'quangbinh', distance: 160, duration: 180, price: 150000, busType: BusType.VIP },
];

// =====================================================
// HELPER FUNCTIONS
// =====================================================

function getProvinceById(id: string) {
  return provinces.find((p) => p.id === id);
}

function formatTime(hour: number, minute: number = 0): string {
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}

function generateSeats(
  templateId: string,
  config: SeatLayoutConfig,
  floors: number
): Array<{
  busTemplateId: string;
  seatNumber: string;
  seatLabel: string;
  rowNumber: number;
  columnPosition: string;
  floor: number;
  seatType: SeatType;
  position: SeatPosition;
  priceModifier: number;
  isAvailable: boolean;
}> {
  const seats = [];
  const { seatType, columnsArray, rowCount, priceModifierFloor1, priceModifierFloor2 } = config;

  for (let floor = 1; floor <= floors; floor++) {
    const floorLabel = floor === 1 ? 'L' : 'U';
    const priceModifier = floor === 1 ? priceModifierFloor1 : priceModifierFloor2;

    for (let row = 1; row <= rowCount; row++) {
      for (let colIndex = 0; colIndex < columnsArray.length; colIndex++) {
        const col = columnsArray[colIndex];

        // Xác định vị trí ghế
        let position: SeatPosition;
        if (columnsArray.length === 2) {
          position = SeatPosition.WINDOW;
        } else if (columnsArray.length === 3) {
          position = col === 'B' ? SeatPosition.AISLE : SeatPosition.WINDOW;
        } else {
          // 4 cột: A,B,_,C,D hoặc A,_,B,C,D
          if (col === 'A' || col === 'D') {
            position = SeatPosition.WINDOW;
          } else {
            position = SeatPosition.AISLE;
          }
        }

        const seatNumber = floors > 1 ? `${row}${col}-${floorLabel}` : `${row}${col}`;
        const seatLabel = `${row}${col}`;

        seats.push({
          busTemplateId: templateId,
          seatNumber,
          seatLabel,
          rowNumber: row,
          columnPosition: col,
          floor,
          seatType,
          position,
          priceModifier,
          isAvailable: true,
        });
      }
    }
  }

  return seats;
}

// =====================================================
// MAIN SEED FUNCTION
// =====================================================

async function main() {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║     VeXeViet Database Seed Script          ║');
  console.log('╚════════════════════════════════════════════╝\n');

  // === STEP 1: CLEAN DATABASE ===
  console.log('🗑️  Step 1: Cleaning database...');
  await prisma.payment.deleteMany();
  await prisma.bookingPassenger.deleteMany();
  await prisma.bookingSeat.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.route.deleteMany();
  await prisma.bus.deleteMany();
  await prisma.seat.deleteMany();
  await prisma.busTemplate.deleteMany();
  await prisma.refreshToken.deleteMany();
  // Không xóa users để giữ lại admin accounts
  console.log('   ✅ Database cleaned\n');

  // === STEP 2: CREATE USERS ===
  console.log('👤 Step 2: Creating users...');
  const passwordHash = await bcrypt.hash('Password@123', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@vexeviet.com' },
    update: { password: passwordHash },
    create: {
      email: 'admin@vexeviet.com',
      password: passwordHash,
      firstName: 'Admin',
      lastName: 'VeXeViet',
      phone: '0900000001',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
    },
  });
  console.log(`   ✅ Admin: ${admin.email}`);

  const operator1 = await prisma.user.upsert({
    where: { email: 'thanhbuoi@vexeviet.com' },
    update: { password: passwordHash },
    create: {
      email: 'thanhbuoi@vexeviet.com',
      password: passwordHash,
      firstName: 'Thành',
      lastName: 'Bưởi',
      phone: '0900000002',
      role: UserRole.OPERATOR,
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
    },
  });
  console.log(`   ✅ Operator 1: ${operator1.email}`);

  const operator2 = await prisma.user.upsert({
    where: { email: 'phuongtrang@vexeviet.com' },
    update: { password: passwordHash },
    create: {
      email: 'phuongtrang@vexeviet.com',
      password: passwordHash,
      firstName: 'Phương',
      lastName: 'Trang',
      phone: '0900000003',
      role: UserRole.OPERATOR,
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
    },
  });
  console.log(`   ✅ Operator 2: ${operator2.email}`);

  const customer = await prisma.user.upsert({
    where: { email: 'customer@vexeviet.com' },
    update: { password: passwordHash },
    create: {
      email: 'customer@vexeviet.com',
      password: passwordHash,
      firstName: 'Nguyễn',
      lastName: 'An',
      phone: '0900000004',
      role: UserRole.CUSTOMER,
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
    },
  });
  console.log(`   ✅ Customer: ${customer.email}\n`);

  // === STEP 3: CREATE BUS TEMPLATES ===
  console.log('🚌 Step 3: Creating bus templates...');
  const createdTemplates: Record<string, { id: string; totalSeats: number; busType: BusType }> = {};

  for (const template of busTemplates) {
    const created = await prisma.busTemplate.create({
      data: {
        name: template.name,
        busType: template.busType,
        totalSeats: template.totalSeats,
        floors: template.floors,
        rowsPerFloor: template.rowsPerFloor,
        columns: template.columns,
        description: template.description,
        isActive: true,
      },
    });

    // Create seats for this template
    const seats = generateSeats(created.id, template.seatLayout, template.floors);
    await prisma.seat.createMany({ data: seats });

    createdTemplates[template.busType] = { id: created.id, totalSeats: template.totalSeats, busType: template.busType };
    console.log(`   ✅ ${template.name}: ${template.totalSeats} seats created`);
  }
  console.log('');

  // === STEP 4: CREATE BUSES ===
  console.log('🚐 Step 4: Creating buses...');
  const buses: { id: string; licensePlate: string; operatorId: string; busTemplateId: string }[] = [];

  // Buses cho Thành Bưởi
  const busesData1 = [
    { plate: '51B-001.01', templateType: BusType.SLEEPER },
    { plate: '51B-001.02', templateType: BusType.SLEEPER },
    { plate: '51B-001.03', templateType: BusType.LIMOUSINE },
    { plate: '51B-001.04', templateType: BusType.LIMOUSINE },
    { plate: '51B-001.05', templateType: BusType.VIP },
  ];

  for (const busData of busesData1) {
    const template = createdTemplates[busData.templateType];
    const bus = await prisma.bus.create({
      data: {
        licensePlate: busData.plate,
        operatorId: operator1.id,
        busTemplateId: template.id,
        status: BusStatus.ACTIVE,
      },
    });
    buses.push({ id: bus.id, licensePlate: bus.licensePlate, operatorId: operator1.id, busTemplateId: template.id });
  }
  console.log(`   ✅ Thành Bưởi: ${busesData1.length} buses`);

  // Buses cho Phương Trang
  const busesData2 = [
    { plate: '51B-002.01', templateType: BusType.SLEEPER },
    { plate: '51B-002.02', templateType: BusType.SLEEPER },
    { plate: '51B-002.03', templateType: BusType.LIMOUSINE },
    { plate: '51B-002.04', templateType: BusType.STANDARD },
    { plate: '51B-002.05', templateType: BusType.VIP },
  ];

  for (const busData of busesData2) {
    const template = createdTemplates[busData.templateType];
    const bus = await prisma.bus.create({
      data: {
        licensePlate: busData.plate,
        operatorId: operator2.id,
        busTemplateId: template.id,
        status: BusStatus.ACTIVE,
      },
    });
    buses.push({ id: bus.id, licensePlate: bus.licensePlate, operatorId: operator2.id, busTemplateId: template.id });
  }
  console.log(`   ✅ Phương Trang: ${busesData2.length} buses\n`);

  // === STEP 5: CREATE ROUTES ===
  console.log('🛤️  Step 5: Creating routes...');
  let routeCount = 0;

  // Tạo routes cho 7 ngày tới
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let dayOffset = 0; dayOffset <= 7; dayOffset++) {
    const routeDate = new Date(today);
    routeDate.setDate(routeDate.getDate() + dayOffset);

    for (const routeConfig of popularRoutes) {
      const fromProvince = getProvinceById(routeConfig.from);
      const toProvince = getProvinceById(routeConfig.to);

      if (!fromProvince || !toProvince) continue;

      // Tạo 2-3 chuyến mỗi ngày cho mỗi tuyến
      const departureTimes =
        routeConfig.busType === BusType.SLEEPER
          ? [20, 22] // Xe giường nằm chạy đêm
          : [6, 12, 18]; // Xe khác chạy sáng, trưa, chiều

      for (const departureHour of departureTimes) {
        const departureTime = new Date(routeDate);
        departureTime.setHours(departureHour, 0, 0, 0);

        const arrivalTime = new Date(departureTime);
        arrivalTime.setMinutes(arrivalTime.getMinutes() + routeConfig.duration);

        // Chọn bus và template phù hợp
        const template = createdTemplates[routeConfig.busType];
        const operatorId = routeCount % 2 === 0 ? operator1.id : operator2.id;
        const matchingBuses = buses.filter(
          (b) => b.operatorId === operatorId && b.busTemplateId === template.id
        );
        const bus = matchingBuses.length > 0 ? matchingBuses[routeCount % matchingBuses.length] : null;

        const routeName = `${fromProvince.displayName} - ${toProvince.displayName} (${formatTime(departureHour)})`;

        await prisma.route.create({
          data: {
            name: routeName,
            description: `Xe ${routeConfig.busType.toLowerCase()} chất lượng cao, ${template.totalSeats} chỗ`,
            origin: fromProvince.displayName,
            destination: toProvince.displayName,
            departureLocation: `Bến xe ${fromProvince.displayName}`,
            arrivalLocation: `Bến xe ${toProvince.displayName}`,
            distance: routeConfig.distance,
            departureTime,
            arrivalTime,
            duration: routeConfig.duration,
            busType: routeConfig.busType,
            busId: bus?.id,
            busTemplateId: template.id,
            licensePlate: bus?.licensePlate,
            price: routeConfig.price,
            amenities: [
              { id: 'wifi', name: 'WiFi miễn phí', icon: 'wifi' },
              { id: 'ac', name: 'Điều hòa', icon: 'ac_unit' },
              { id: 'water', name: 'Nước uống', icon: 'local_drink' },
              { id: 'usb', name: 'Sạc USB', icon: 'usb' },
            ],
            pickupPoints: [
              {
                id: 'p1',
                time: formatTime(departureHour),
                location: `Bến xe ${fromProvince.displayName}`,
                address: `Số 1, Đường chính, ${fromProvince.name}`,
              },
              {
                id: 'p2',
                time: formatTime(departureHour, 30),
                location: `Trung tâm ${fromProvince.displayName}`,
                address: `Số 100, Trung tâm, ${fromProvince.name}`,
              },
            ],
            dropoffPoints: [
              {
                id: 'd1',
                time: formatTime((departureHour + Math.floor(routeConfig.duration / 60)) % 24),
                location: `Bến xe ${toProvince.displayName}`,
                address: `Số 1, Đường chính, ${toProvince.name}`,
              },
            ],
            policies: [
              {
                type: 'cancellation',
                title: 'Chính sách hủy vé',
                description: 'Hủy trước 24h: Hoàn 80%. Hủy trước 12h: Hoàn 50%. Hủy trước 6h: Hoàn 20%.',
              },
              {
                type: 'luggage',
                title: 'Hành lý',
                description: 'Miễn phí 20kg hành lý. Hành lý quá cỡ tính phụ thu.',
              },
            ],
            status: RouteStatus.ACTIVE,
            operatorId,
          },
        });

        routeCount++;
      }
    }
  }
  console.log(`   ✅ Created ${routeCount} routes for 7 days\n`);

  // === STEP 6: CREATE SAMPLE BOOKING ===
  console.log('🎫 Step 6: Creating sample booking...');
  
  // Lấy một route để tạo booking mẫu
  const sampleRoute = await prisma.route.findFirst({
    where: { status: RouteStatus.ACTIVE },
    include: { busTemplate: true },
  });

  if (sampleRoute && sampleRoute.busTemplate) {
    const sampleSeats = await prisma.seat.findMany({
      where: { busTemplateId: sampleRoute.busTemplateId! },
      take: 3,
    });

    const booking = await prisma.booking.create({
      data: {
        bookingCode: 'VXV' + Math.random().toString(36).substring(2, 8).toUpperCase(),
        userId: customer.id,
        routeId: sampleRoute.id,
        departureDate: sampleRoute.departureTime,
        status: 'CONFIRMED',
        totalPrice: Number(sampleRoute.price) * sampleSeats.length,
        serviceFee: 10000,
        discount: 0,
        paymentDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
        contactEmail: customer.email,
        contactPhone: customer.phone || '0900000004',
        idempotencyKey: `seed-booking-${Date.now()}`,
        confirmedAt: new Date(),
      },
    });

    // Tạo booking seats
    for (const seat of sampleSeats) {
      await prisma.bookingSeat.create({
        data: {
          bookingId: booking.id,
          routeId: sampleRoute.id,
          seatId: seat.id,
          departureDate: sampleRoute.departureTime,
          seatNumber: seat.seatNumber,
          status: SeatStatus.BOOKED,
          lockedUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
          price: sampleRoute.price,
        },
      });

      await prisma.bookingPassenger.create({
        data: {
          bookingId: booking.id,
          seatId: seat.id,
          firstName: 'Hành khách',
          lastName: seat.seatNumber,
          seatNumber: seat.seatNumber,
        },
      });
    }

    console.log(`   ✅ Sample booking: ${booking.bookingCode} (${sampleSeats.length} seats)\n`);
  }

  // === SUMMARY ===
  console.log('╔════════════════════════════════════════════╗');
  console.log('║           SEED COMPLETED SUCCESSFULLY      ║');
  console.log('╚════════════════════════════════════════════╝\n');

  const templateCount = await prisma.busTemplate.count();
  const seatCount = await prisma.seat.count();
  const busCount = await prisma.bus.count();
  const totalRoutes = await prisma.route.count();
  const bookingCount = await prisma.booking.count();

  console.log('📊 Summary:');
  console.log(`   • Bus Templates: ${templateCount}`);
  console.log(`   • Seats: ${seatCount}`);
  console.log(`   • Buses: ${busCount}`);
  console.log(`   • Routes: ${totalRoutes}`);
  console.log(`   • Bookings: ${bookingCount}`);
  console.log('');
  console.log('🔐 Test Accounts (Password: Password@123):');
  console.log('   • Admin: admin@vexeviet.com');
  console.log('   • Operator 1: thanhbuoi@vexeviet.com');
  console.log('   • Operator 2: phuongtrang@vexeviet.com');
  console.log('   • Customer: customer@vexeviet.com');
  console.log('');
  console.log('🌍 Provinces: 63 (All Vietnam provinces)');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { PrismaClient, BusType, RouteStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Danh sách các tỉnh thành Việt Nam
const provinces = [
  { id: 'hanoi', name: 'Hà Nội', displayName: 'Hà Nội' },
  { id: 'haiphong', name: 'Hải Phòng', displayName: 'Hải Phòng' },
  { id: 'quangninh', name: 'Quảng Ninh', displayName: 'Hạ Long - Quảng Ninh' },
  { id: 'laocai', name: 'Lào Cai', displayName: 'Sa Pa - Lào Cai' },
  { id: 'thanhhoa', name: 'Thanh Hóa', displayName: 'Thanh Hóa' },
  { id: 'nghean', name: 'Nghệ An', displayName: 'Vinh - Nghệ An' },
  { id: 'thuathienhue', name: 'Thừa Thiên Huế', displayName: 'Huế - Thừa Thiên Huế' },
  { id: 'danang', name: 'Đà Nẵng', displayName: 'Đà Nẵng' },
  { id: 'quangnam', name: 'Quảng Nam', displayName: 'Hội An - Quảng Nam' },
  { id: 'binhdinh', name: 'Bình Định', displayName: 'Quy Nhơn - Bình Định' },
  { id: 'khanhhoa', name: 'Khánh Hòa', displayName: 'Nha Trang - Khánh Hòa' },
  { id: 'binhthuan', name: 'Bình Thuận', displayName: 'Phan Thiết - Bình Thuận' },
  { id: 'lamdong', name: 'Lâm Đồng', displayName: 'Đà Lạt - Lâm Đồng' },
  { id: 'hochiminh', name: 'Hồ Chí Minh', displayName: 'Hồ Chí Minh' },
  { id: 'baria-vungtau', name: 'Bà Rịa - Vũng Tàu', displayName: 'Vũng Tàu - Bà Rịa' },
  { id: 'binhduong', name: 'Bình Dương', displayName: 'Thủ Dầu Một - Bình Dương' },
  { id: 'dongnai', name: 'Đồng Nai', displayName: 'Biên Hòa - Đồng Nai' },
  { id: 'cantho', name: 'Cần Thơ', displayName: 'Cần Thơ' },
];

// Popular routes (major cities)
const popularRoutes = [
  // From Ho Chi Minh
  { from: 'hochiminh', to: 'lamdong', distance: 308, duration: 360, price: 350000, busType: 'LIMOUSINE' },
  { from: 'hochiminh', to: 'khanhhoa', distance: 450, duration: 540, price: 380000, busType: 'SLEEPER' },
  { from: 'hochiminh', to: 'binhthuan', distance: 220, duration: 240, price: 180000, busType: 'STANDARD' },
  { from: 'hochiminh', to: 'baria-vungtau', distance: 125, duration: 150, price: 120000, busType: 'STANDARD' },
  { from: 'hochiminh', to: 'danang', distance: 950, duration: 720, price: 450000, busType: 'SLEEPER' },
  { from: 'hochiminh', to: 'cantho', distance: 170, duration: 180, price: 150000, busType: 'STANDARD' },
  { from: 'hochiminh', to: 'binhduong', distance: 30, duration: 45, price: 50000, busType: 'STANDARD' },
  { from: 'hochiminh', to: 'dongnai', distance: 40, duration: 60, price: 60000, busType: 'STANDARD' },
  
  // From Hanoi
  { from: 'hanoi', to: 'quangninh', distance: 165, duration: 210, price: 150000, busType: 'VIP' },
  { from: 'hanoi', to: 'haiphong', distance: 120, duration: 150, price: 100000, busType: 'STANDARD' },
  { from: 'hanoi', to: 'laocai', distance: 345, duration: 360, price: 280000, busType: 'SLEEPER' },
  { from: 'hanoi', to: 'thanhhoa', distance: 160, duration: 180, price: 130000, busType: 'STANDARD' },
  { from: 'hanoi', to: 'nghean', distance: 290, duration: 300, price: 220000, busType: 'LIMOUSINE' },
  { from: 'hanoi', to: 'thuathienhue', distance: 660, duration: 720, price: 380000, busType: 'SLEEPER' },
  { from: 'hanoi', to: 'danang', distance: 770, duration: 840, price: 420000, busType: 'SLEEPER' },
  
  // From Da Nang
  { from: 'danang', to: 'thuathienhue', distance: 105, duration: 120, price: 100000, busType: 'STANDARD' },
  { from: 'danang', to: 'quangnam', distance: 30, duration: 45, price: 50000, busType: 'STANDARD' },
  { from: 'danang', to: 'binhdinh', distance: 290, duration: 300, price: 200000, busType: 'LIMOUSINE' },
  { from: 'danang', to: 'khanhhoa', distance: 540, duration: 540, price: 320000, busType: 'SLEEPER' },
  { from: 'danang', to: 'hochiminh', distance: 950, duration: 720, price: 450000, busType: 'SLEEPER' },
  
  // From Nha Trang
  { from: 'khanhhoa', to: 'lamdong', distance: 140, duration: 180, price: 150000, busType: 'LIMOUSINE' },
  { from: 'khanhhoa', to: 'hochiminh', distance: 450, duration: 540, price: 380000, busType: 'SLEEPER' },
  { from: 'khanhhoa', to: 'binhthuan', distance: 240, duration: 270, price: 200000, busType: 'LIMOUSINE' },
  
  // From Da Lat
  { from: 'lamdong', to: 'hochiminh', distance: 308, duration: 360, price: 350000, busType: 'LIMOUSINE' },
  { from: 'lamdong', to: 'khanhhoa', distance: 140, duration: 180, price: 150000, busType: 'LIMOUSINE' },
  { from: 'lamdong', to: 'binhthuan', distance: 165, duration: 180, price: 130000, busType: 'STANDARD' },
];

async function main() {
  console.log('🌱 Seeding full routes database...');

  // Get or create operator
  const operatorPassword = await bcrypt.hash('Operator@123456', 12);
  const operator = await prisma.user.upsert({
    where: { email: 'operator@vexeviet.com' },
    update: {},
    create: {
      email: 'operator@vexeviet.com',
      password: operatorPassword,
      firstName: 'Sample',
      lastName: 'Operator',
      phone: '+84901234567',
      role: 'OPERATOR',
      isEmailVerified: true,
      status: 'ACTIVE',
      registrationMethod: 'email',
      termsAcceptedAt: new Date(),
    },
  });

  console.log('✅ Operator ready:', operator.email);

  // Get bus templates
  const templates = await prisma.busTemplate.findMany();
  const limousineTemplate = templates.find(t => t.busType === 'LIMOUSINE');
  const sleeperTemplate = templates.find(t => t.busType === 'SLEEPER');
  const vipTemplate = templates.find(t => t.busType === 'VIP');
  const standardTemplate = templates.find(t => t.busType === 'STANDARD');

  console.log('🚌 Found templates:', templates.length);

  // Create ~1000 routes starting from 2026-05-05
  const targetRoutes = 1000;
  const startDate = new Date('2026-05-05T00:00:00');
  startDate.setHours(0, 0, 0, 0);

  let createdCount = 0;
  let skippedCount = 0;
  let dayOffset = 0;

  while (createdCount < targetRoutes) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + dayOffset);

    for (const routeConfig of popularRoutes) {
      if (createdCount >= targetRoutes) break;

      const fromProvince = provinces.find((p) => p.id === routeConfig.from);
      const toProvince = provinces.find((p) => p.id === routeConfig.to);

      if (!fromProvince || !toProvince) continue;

      const tripsPerDay = routeConfig.busType === 'SLEEPER' ? 2 : 3;

      for (let tripIndex = 0; tripIndex < tripsPerDay; tripIndex++) {
        if (createdCount >= targetRoutes) break;

        const departureHour =
          routeConfig.busType === 'SLEEPER' ? (tripIndex === 0 ? 20 : 22) : tripIndex === 0 ? 6 : tripIndex === 1 ? 12 : 18;

        const departureTime = new Date(date);
        departureTime.setHours(departureHour, 0, 0, 0);

        const arrivalTime = new Date(departureTime);
        arrivalTime.setMinutes(arrivalTime.getMinutes() + routeConfig.duration);

        let template = standardTemplate;
        if (routeConfig.busType === 'LIMOUSINE') template = limousineTemplate;
        else if (routeConfig.busType === 'SLEEPER') template = sleeperTemplate;
        else if (routeConfig.busType === 'VIP') template = vipTemplate;

        const existing = await prisma.route.findFirst({
          where: {
            origin: fromProvince.displayName,
            destination: toProvince.displayName,
            departureTime,
          },
        });

        if (existing) {
          skippedCount++;
          continue;
        }

        const routeName = `${fromProvince.displayName} - ${toProvince.displayName} ${departureHour}:00`;

        await prisma.route.create({
          data: {
            name: routeName,
            description: `Xe ${routeConfig.busType.toLowerCase()} chất lượng cao`,
            origin: fromProvince.displayName,
            destination: toProvince.displayName,
            departureLocation: `Bến Xe ${fromProvince.displayName}`,
            arrivalLocation: `Bến Xe ${toProvince.displayName}`,
            distance: routeConfig.distance,
            departureTime,
            arrivalTime,
            duration: routeConfig.duration,
            busType: routeConfig.busType as BusType,
            busTemplateId: template?.id,
            price: routeConfig.price,
            amenities: ['WiFi', 'AC', 'Water', 'USB Charging'],
            pickupPoints: [
              {
                id: 'p1',
                location: `Bến Xe ${fromProvince.displayName}`,
                time: `${departureHour}:00`,
                address: fromProvince.displayName,
              },
            ],
            dropoffPoints: [
              {
                id: 'd1',
                location: `Bến Xe ${toProvince.displayName}`,
                time: `${Math.floor(departureHour + routeConfig.duration / 60)}:${routeConfig.duration % 60}`,
                address: toProvince.displayName,
              },
            ],
            policies: {
              cancellation: 'Miễn phí hủy vé trước 24h',
              luggage: '20kg hành lý mỗi khách',
            },
            status: RouteStatus.ACTIVE,
            operatorId: operator.id,
          },
        });

        createdCount++;
      }
    }

    if ((dayOffset + 1) % 3 === 0) {
      console.log(`✅ Processed to day ${dayOffset + 1}: ${date.toISOString().split('T')[0]} | created=${createdCount} skipped=${skippedCount}`);
    }

    dayOffset++;
    if (dayOffset > 120) {
      throw new Error(`Could not reach ${targetRoutes} routes within 120 days window`);
    }
  }

  console.log(`\n🎉 Seeding completed!`);
  console.log(`✅ Created: ${createdCount} routes (target: ${targetRoutes})`);
  console.log(`⏭️  Skipped: ${skippedCount} routes`);
  console.log(`📅 Start date: ${startDate.toISOString().split('T')[0]}`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

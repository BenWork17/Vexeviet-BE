import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');
  console.log('📧 Admin email:', process.env.ADMIN_EMAIL || 'admin@vexeviet.com');
  console.log('🔑 Admin password:', process.env.ADMIN_PASSWORD || 'Admin@123456');

  // Create Admin User
  const adminPlainPassword = process.env.ADMIN_PASSWORD || 'Admin@123456';
  const adminPassword = await bcrypt.hash(adminPlainPassword, 12);
  
  console.log('🔐 Hashing password...');

  const admin = await prisma.user.upsert({
    where: { email: process.env.ADMIN_EMAIL || 'admin@vexeviet.com' },
    update: {},
    create: {
      email: process.env.ADMIN_EMAIL || 'admin@vexeviet.com',
      password: adminPassword,
      firstName: 'Admin',
      lastName: 'VeXeViet',
      role: 'ADMIN',
      isEmailVerified: true,
      status: 'ACTIVE',
      registrationMethod: 'email',
      termsAcceptedAt: new Date(),
    },
  });

  console.log('✅ Admin created:', {
    email: admin.email,
    role: admin.role,
  });

  // Create Sample Operator
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

  console.log('✅ Operator created:', {
    email: operator.email,
    role: operator.role,
  });

  // Create Sample Routes
  const routes = [
    {
      name: 'HCM - Da Lat Express',
      description: 'Limousine cao cấp, ghế nằm êm ái',
      origin: 'Ho Chi Minh City',
      destination: 'Da Lat',
      departureLocation: 'Bến Xe Miền Đông',
      arrivalLocation: 'Bến Xe Đà Lạt',
      distance: 308.5,
      departureTime: new Date('2026-02-15T08:00:00Z'),
      arrivalTime: new Date('2026-02-15T14:00:00Z'),
      duration: 360,
      busType: 'LIMOUSINE' as const,
      licensePlate: '51B-12345',
      totalSeats: 24,
      availableSeats: 24,
      price: 350000,
      amenities: ['WiFi', 'AC', 'Water', 'USB Charging'],
      pickupPoints: [
        { location: 'Bến Xe Miền Đông', time: '08:00', address: 'Q. Bình Thạnh' },
        { location: 'Thủ Đức', time: '08:30', address: 'TP. Thủ Đức' },
      ],
      dropoffPoints: [
        { location: 'Bến Xe Đà Lạt', time: '14:00', address: 'TP. Đà Lạt' },
      ],
      policies: {
        cancellation: 'Miễn phí hủy vé trước 24h',
        luggage: '20kg hành lý mỗi khách',
      },
      status: 'ACTIVE' as const,
      operatorId: operator.id,
    },
    {
      name: 'HCM - Nha Trang Sleeper',
      description: 'Xe giường nằm cao cấp',
      origin: 'Ho Chi Minh City',
      destination: 'Nha Trang',
      departureLocation: 'Bến Xe Miền Đông',
      arrivalLocation: 'Bến Xe Phía Nam Nha Trang',
      distance: 450,
      departureTime: new Date('2026-02-15T22:00:00Z'),
      arrivalTime: new Date('2026-02-16T05:00:00Z'),
      duration: 420,
      busType: 'SLEEPER' as const,
      licensePlate: '51B-67890',
      totalSeats: 40,
      availableSeats: 40,
      price: 280000,
      amenities: ['WiFi', 'AC', 'Blanket', 'Water'],
      pickupPoints: [
        { location: 'Bến Xe Miền Đông', time: '22:00', address: 'Q. Bình Thạnh' },
      ],
      dropoffPoints: [
        { location: 'Bến Xe Nha Trang', time: '05:00', address: 'TP. Nha Trang' },
      ],
      policies: {
        cancellation: 'Miễn phí hủy vé trước 12h',
        luggage: '25kg hành lý mỗi khách',
      },
      status: 'ACTIVE' as const,
      operatorId: operator.id,
    },
    {
      name: 'Hanoi - Ha Long Bay',
      description: 'Xe VIP đi Vịnh Hạ Long',
      origin: 'Hanoi',
      destination: 'Ha Long',
      departureLocation: 'Bến Xe Giáp Bát',
      arrivalLocation: 'Bến Xe Hạ Long',
      distance: 165,
      departureTime: new Date('2026-02-15T07:00:00Z'),
      arrivalTime: new Date('2026-02-15T10:30:00Z'),
      duration: 210,
      busType: 'VIP' as const,
      licensePlate: '29A-11111',
      totalSeats: 35,
      availableSeats: 35,
      price: 150000,
      amenities: ['AC', 'Water', 'USB Charging'],
      pickupPoints: [
        { location: 'Bến Xe Giáp Bát', time: '07:00', address: 'Q. Hoàng Mai' },
        { location: 'Mỹ Đình', time: '07:30', address: 'Q. Nam Từ Liêm' },
      ],
      dropoffPoints: [
        { location: 'Bến Xe Hạ Long', time: '10:30', address: 'TP. Hạ Long' },
      ],
      policies: {
        cancellation: 'Miễn phí hủy vé trước 6h',
        luggage: '15kg hành lý mỗi khách',
      },
      status: 'ACTIVE' as const,
      operatorId: operator.id,
    },
  ];

  for (const routeData of routes) {
    const route = await prisma.route.create({
      data: routeData,
    });
    console.log(`✅ Route created: ${route.name}`);
  }

  console.log('🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

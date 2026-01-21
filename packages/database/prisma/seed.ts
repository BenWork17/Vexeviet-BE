import { PrismaClient, BusType, SeatType, SeatPosition, BookingStatus, SeatStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// =====================================================
// BUS TEMPLATE SEED DATA
// =====================================================

interface SeatConfig {
  seatNumber: string;
  seatLabel?: string;
  rowNumber: number;
  columnPosition: string;
  floor: number;
  seatType: SeatType;
  position: SeatPosition;
  priceModifier: number;
}

function generateStandardBusSeats(): SeatConfig[] {
  const seats: SeatConfig[] = [];
  const columns = ['A', 'B', 'C', 'D'];
  
  // 11 rows, 4 columns = 44 seats + 1 driver seat area
  for (let row = 1; row <= 11; row++) {
    for (const col of columns) {
      // Skip some seats in last row (usually 3 seats)
      if (row === 11 && col === 'D') continue;
      
      const position: SeatPosition = 
        col === 'A' || col === 'D' ? 'WINDOW' : 'AISLE';
      
      seats.push({
        seatNumber: `${col}${row}`,
        rowNumber: row,
        columnPosition: col,
        floor: 1,
        seatType: 'NORMAL',
        position,
        priceModifier: 0,
      });
    }
  }
  
  return seats;
}

function generateLimousineSeats(): SeatConfig[] {
  const seats: SeatConfig[] = [];
  const columns = ['A', 'B', 'C']; // 3 columns for limousine
  
  // 9 rows for front section, wider seats
  for (let row = 1; row <= 9; row++) {
    for (const col of columns) {
      const position: SeatPosition = 
        col === 'A' || col === 'C' ? 'WINDOW' : 'AISLE';
      
      // VIP seats in first 2 rows
      const seatType: SeatType = row <= 2 ? 'VIP' : 'NORMAL';
      const priceModifier = row <= 2 ? 50000 : 0;
      
      seats.push({
        seatNumber: `${col}${row}`,
        rowNumber: row,
        columnPosition: col,
        floor: 1,
        seatType,
        position,
        priceModifier,
      });
    }
  }
  
  // Last row has 4 seats
  for (const col of ['A', 'B', 'C', 'D']) {
    seats.push({
      seatNumber: `${col}10`,
      rowNumber: 10,
      columnPosition: col,
      floor: 1,
      seatType: 'NORMAL',
      position: col === 'A' || col === 'D' ? 'WINDOW' : 'AISLE',
      priceModifier: -20000, // Back row discount
    });
  }
  
  return seats;
}

function generateSleeperBusSeats(): SeatConfig[] {
  const seats: SeatConfig[] = [];
  const columns = ['A', 'B', 'C']; // 3 columns
  
  // 2 floors, 10 rows each = 60 beds, but we limit to 40
  for (let floor = 1; floor <= 2; floor++) {
    for (let row = 1; row <= 7; row++) {
      for (const col of columns) {
        // Skip middle column in some rows for walkway
        if (row >= 4 && row <= 6 && col === 'B') continue;
        
        const position: SeatPosition = 
          col === 'A' || col === 'C' ? 'WINDOW' : 'MIDDLE';
        
        const suffix = floor === 1 ? 'L' : 'U'; // Lower/Upper
        const label = `${row}${col}-${suffix}`;
        
        // Upper floor slightly cheaper (harder to climb)
        const priceModifier = floor === 2 ? -20000 : 0;
        
        seats.push({
          seatNumber: `${row}${col}-${suffix}`,
          seatLabel: label,
          rowNumber: row,
          columnPosition: col,
          floor,
          seatType: 'SLEEPER',
          position,
          priceModifier,
        });
      }
    }
  }
  
  return seats;
}

function generateVIPSeats(): SeatConfig[] {
  const seats: SeatConfig[] = [];
  const columns = ['A', 'B']; // 2 columns only for VIP
  
  // 12 rows, 2 columns = 24 seats
  for (let row = 1; row <= 12; row++) {
    for (const col of columns) {
      const position: SeatPosition = col === 'A' ? 'WINDOW' : 'AISLE';
      
      // First 3 rows are premium VIP
      const seatType: SeatType = row <= 3 ? 'VIP' : 'NORMAL';
      const priceModifier = row <= 3 ? 100000 : 0;
      
      seats.push({
        seatNumber: `${col}${row}`,
        rowNumber: row,
        columnPosition: col,
        floor: 1,
        seatType,
        position,
        priceModifier,
      });
    }
  }
  
  return seats;
}

async function seedBusTemplates() {
  console.log('🚌 Seeding bus templates...');
  
  const templates = [
    {
      name: 'Xe ghế ngồi 45 chỗ',
      busType: 'STANDARD' as BusType,
      totalSeats: 45,
      floors: 1,
      rowsPerFloor: 11,
      columns: 'A,B,_,C,D',
      description: 'Xe khách tiêu chuẩn với 45 ghế ngồi, phù hợp cho các tuyến đường ngắn và trung bình.',
      generateSeats: generateStandardBusSeats,
    },
    {
      name: 'Limousine 34 chỗ',
      busType: 'LIMOUSINE' as BusType,
      totalSeats: 34,
      floors: 1,
      rowsPerFloor: 10,
      columns: 'A,_,B,_,C',
      description: 'Xe Limousine cao cấp với ghế rộng, massage, có khoang riêng.',
      generateSeats: generateLimousineSeats,
    },
    {
      name: 'Giường nằm 40 giường',
      busType: 'SLEEPER' as BusType,
      totalSeats: 40,
      floors: 2,
      rowsPerFloor: 7,
      columns: 'A,_,B,C',
      description: 'Xe giường nằm 2 tầng, lý tưởng cho các chuyến đi đêm dài.',
      generateSeats: generateSleeperBusSeats,
    },
    {
      name: 'VIP 24 chỗ',
      busType: 'VIP' as BusType,
      totalSeats: 24,
      floors: 1,
      rowsPerFloor: 12,
      columns: 'A,_,_,B',
      description: 'Xe VIP hạng sang với không gian rộng rãi, phục vụ cao cấp.',
      generateSeats: generateVIPSeats,
    },
  ];
  
  for (const templateData of templates) {
    const { generateSeats, ...data } = templateData;
    
    // Check if template already exists
    const existing = await prisma.busTemplate.findFirst({
      where: { name: data.name },
    });
    
    if (existing) {
      console.log(`  ⏭️  Template "${data.name}" already exists, skipping...`);
      continue;
    }
    
    // Create template with seats
    const template = await prisma.busTemplate.create({
      data: {
        ...data,
        seats: {
          create: generateSeats(),
        },
      },
      include: {
        seats: true,
      },
    });
    
    console.log(`  ✅ Created template: ${template.name} (${template.seats.length} seats)`);
  }
}

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

  // Seed Bus Templates
  await seedBusTemplates();

  // Get bus templates for routes
  const limousineTemplate = await prisma.busTemplate.findFirst({
    where: { busType: 'LIMOUSINE' },
  });
  const sleeperTemplate = await prisma.busTemplate.findFirst({
    where: { busType: 'SLEEPER' },
  });
  const vipTemplate = await prisma.busTemplate.findFirst({
    where: { busType: 'VIP' },
  });

  // Create Sample Routes with BusTemplate reference
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
      busTemplateId: limousineTemplate?.id,
      licensePlate: '51B-12345',
      totalSeats: limousineTemplate?.totalSeats || 34,
      availableSeats: limousineTemplate?.totalSeats || 34,
      price: 350000,
      amenities: ['WiFi', 'AC', 'Water', 'USB Charging'],
      pickupPoints: [
        { id: 'p1', location: 'Bến Xe Miền Đông', time: '08:00', address: 'Q. Bình Thạnh' },
        { id: 'p2', location: 'Thủ Đức', time: '08:30', address: 'TP. Thủ Đức' },
      ],
      dropoffPoints: [
        { id: 'd1', location: 'Bến Xe Đà Lạt', time: '14:00', address: 'TP. Đà Lạt' },
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
      busTemplateId: sleeperTemplate?.id,
      licensePlate: '51B-67890',
      totalSeats: sleeperTemplate?.totalSeats || 40,
      availableSeats: sleeperTemplate?.totalSeats || 40,
      price: 280000,
      amenities: ['WiFi', 'AC', 'Blanket', 'Water'],
      pickupPoints: [
        { id: 'p1', location: 'Bến Xe Miền Đông', time: '22:00', address: 'Q. Bình Thạnh' },
      ],
      dropoffPoints: [
        { id: 'd1', location: 'Bến Xe Nha Trang', time: '05:00', address: 'TP. Nha Trang' },
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
      busTemplateId: vipTemplate?.id,
      licensePlate: '29A-11111',
      totalSeats: vipTemplate?.totalSeats || 24,
      availableSeats: vipTemplate?.totalSeats || 24,
      price: 150000,
      amenities: ['AC', 'Water', 'USB Charging'],
      pickupPoints: [
        { id: 'p1', location: 'Bến Xe Giáp Bát', time: '07:00', address: 'Q. Hoàng Mai' },
        { id: 'p2', location: 'Mỹ Đình', time: '07:30', address: 'Q. Nam Từ Liêm' },
      ],
      dropoffPoints: [
        { id: 'd1', location: 'Bến Xe Hạ Long', time: '10:30', address: 'TP. Hạ Long' },
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
    // Check if route exists
    const existing = await prisma.route.findFirst({
      where: { name: routeData.name },
    });
    
    if (existing) {
      console.log(`⏭️  Route "${routeData.name}" already exists, checking template...`);
      if (!existing.busTemplateId && routeData.busTemplateId) {
        await prisma.route.update({
          where: { id: existing.id },
          data: { busTemplateId: routeData.busTemplateId }
        });
        console.log(`  ✅ Linked template to existing route: ${routeData.name}`);
      }
      continue;
    }
    
    const route = await prisma.route.create({
      data: routeData,
    });
    console.log(`✅ Route created: ${route.name} (template: ${routeData.busTemplateId ? 'linked' : 'none'})`);
  }

  // =====================================================
  // BOOKING SEED DATA (Iteration 1-4)
  // =====================================================
  console.log('🎫 Seeding sample bookings...');

  // Create Sample Customer
  const customerPassword = await bcrypt.hash('Customer@123456', 12);
  const customer = await prisma.user.upsert({
    where: { email: 'customer@vexeviet.com' },
    update: {},
    create: {
      email: 'customer@vexeviet.com',
      password: customerPassword,
      firstName: 'Thành',
      lastName: 'Khách',
      phone: '+84912345678',
      role: 'CUSTOMER',
      isEmailVerified: true,
      status: 'ACTIVE',
      registrationMethod: 'email',
      termsAcceptedAt: new Date(),
    },
  });

  console.log('✅ Customer created:', { email: customer.email });

  // Get all created routes
  const allRoutes = await prisma.route.findMany({
    where: { status: 'ACTIVE' },
    include: { busTemplate: { include: { seats: true } } },
  });

  console.log(`🔍 Found ${allRoutes.length} active routes for booking seeding`);

  for (const route of allRoutes) {
    // Check if bookings already exist for this route
    const existingBooking = await prisma.booking.findFirst({
      where: { routeId: route.id },
    });

    if (existingBooking) {
      console.log(`⏭️  Bookings for route \"${route.name}\" already exist, skipping...`);
      continue;
    }

    // Create 2 bookings for each route
    for (let i = 1; i <= 2; i++) {
      const bookingCode = `VXV${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
      const seatCount = i; // Booking 1 has 1 seat, Booking 2 has 2 seats
      
      // Get available seats from template
      const templateSeats = route.busTemplate?.seats || [];
      const selectedSeats = templateSeats.slice((i - 1) * 2, (i - 1) * 2 + seatCount);
      
      if (selectedSeats.length === 0) continue;

      const totalPrice = Number(route.price) * seatCount;

      const booking = await prisma.booking.create({
        data: {
          bookingCode,
          userId: customer.id,
          routeId: route.id,
          departureDate: route.departureTime,
          status: i === 1 ? BookingStatus.CONFIRMED : BookingStatus.PENDING,
          totalPrice,
          serviceFee: totalPrice * 0.05,
          contactEmail: customer.email,
          contactPhone: customer.phone || '0912345678',
          paymentDeadline: new Date(Date.now() + 15 * 60 * 1000),
          idempotencyKey: `seed-booking-${route.id}-${i}`,
          seats: {
            create: selectedSeats.map(seat => ({
              routeId: route.id,
              seatId: seat.id,
              departureDate: route.departureTime,
              seatNumber: seat.seatNumber,
              status: i === 1 ? SeatStatus.BOOKED : SeatStatus.HELD,
              lockedUntil: new Date(Date.now() + 15 * 60 * 1000),
              price: route.price,
            })),
          },
          passengers: {
            create: selectedSeats.map((seat, idx) => ({
              firstName: i === 1 ? 'Nguyễn' : 'Trần',
              lastName: `Khách ${idx + 1}`,
              seatNumber: seat.seatNumber,
              seatId: seat.id,
            })),
          },
        },
      });

      console.log(`✅ Booking created: ${booking.bookingCode} for route ${route.name} (${selectedSeats.length} seats)`);
    }
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

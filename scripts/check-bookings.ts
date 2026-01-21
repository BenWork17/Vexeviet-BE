const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkData() {
  const user = await prisma.user.findUnique({
    where: { email: 'customer@vexeviet.com' },
    include: {
      bookings: {
        include: {
          seats: true,
          route: true
        }
      }
    }
  });

  if (!user) {
    console.log('❌ User not found');
    return;
  }

  console.log(`👤 User: ${user.firstName} ${user.lastName} (${user.id})`);
  console.log(`🎫 Bookings count: ${user.bookings.length}`);

  user.bookings.forEach((b, i) => {
    console.log(`\n--- Booking ${i + 1} ---`);
    console.log(`Code: ${b.bookingCode}`);
    console.log(`Route: ${b.route.name}`);
    console.log(`Status: ${b.status}`);
    console.log(`Seats: ${b.seats.map(s => s.seatNumber).join(', ')}`);
  });

  const totalBookings = await prisma.booking.count();
  console.log(`\n📊 Total bookings in system: ${totalBookings}`);
}

checkData()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

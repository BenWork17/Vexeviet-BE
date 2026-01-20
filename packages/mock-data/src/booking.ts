import { BookingDetails } from './types';

// In-memory store to simulate database
const bookingsStore = new Map<string, BookingDetails>();

// Helper function to calculate if booking can be cancelled (more than 24h before departure)
const canCancelBooking = (departureTime: string): boolean => {
  const departureDate = new Date(departureTime);
  const now = new Date();
  const hoursUntilDeparture = (departureDate.getTime() - now.getTime()) / (1000 * 60 * 60);
  return hoursUntilDeparture > 24;
};

// Helper function to calculate refund amount
const calculateRefund = (totalPrice: number, departureTime: string): number => {
  const departureDate = new Date(departureTime);
  const now = new Date();
  const hoursUntilDeparture = (departureDate.getTime() - now.getTime()) / (1000 * 60 * 60);
  
  if (hoursUntilDeparture > 24) {
    return Math.floor(totalPrice * 0.9); // 90% refund if >24h
  } else if (hoursUntilDeparture > 12) {
    return Math.floor(totalPrice * 0.5); // 50% refund if >12h
  } else {
    return 0; // No refund if <12h
  }
};

// Mock API for booking operations
export const mockBookingApi = {
  /**
   * Create a new booking (called after payment success)
   */
  createBooking: async (data: {
    routeId: string;
    seats: string[];
    passengers: Array<{
      fullName: string;
      phone: string;
      email?: string;
      seatNumber: string;
    }>;
    totalPrice: number;
    paymentMethod: string;
    transactionId: string;
  }): Promise<BookingDetails> => {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Simulate seat conflict error (10% chance)
    const shouldFail = Math.random() < 0.1;
    if (shouldFail) {
      const conflictingSeat = data.seats[Math.floor(Math.random() * data.seats.length)];
      throw new Error(`Ghế ${conflictingSeat} đã được đặt bởi người khác. Vui lòng chọn ghế khác.`);
    }

    const bookingId = 'BK-' + Date.now();
    const bookingCode = `VXV-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const booking: BookingDetails = {
      id: bookingId,
      bookingCode,
      status: 'CONFIRMED',
      createdAt: new Date().toISOString(),

      route: {
        id: data.routeId,
        from: 'TP. Hồ Chí Minh',
        to: 'Đà Lạt',
        departureTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        arrivalTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 7 * 60 * 60 * 1000).toISOString(),
        duration: '7 giờ',
      },

      operator: {
        id: 'op-1',
        name: 'Phương Trang',
        logoUrl: '',
      },

      busType: 'Giường nằm 40 chỗ',
      licensePlate: '51B-12345',

      passengers: data.passengers,

      ticketPrice: data.totalPrice - 10000,
      serviceFee: 10000,
      totalPrice: data.totalPrice,

      paymentMethod: data.paymentMethod,
      paymentStatus: 'PAID',
      transactionId: data.transactionId,
    };

    // Store in memory
    bookingsStore.set(bookingId, booking);

    return booking;
  },

  /**
   * Get booking details by ID
   */
  getBookingById: async (bookingId: string): Promise<BookingDetails> => {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Check if booking exists in store
    const existingBooking = bookingsStore.get(bookingId);
    if (existingBooking) {
      return existingBooking;
    }

    // Otherwise, create mock data for demo purposes
    const timestamp = bookingId.startsWith('BK-') ? parseInt(bookingId.substring(3)) : Date.now();

    return {
      id: bookingId,
      bookingCode: `VXV-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      status: 'CONFIRMED',
      createdAt: new Date(timestamp).toISOString(),

      route: {
        id: 'route-1',
        from: 'TP. Hồ Chí Minh',
        to: 'Đà Lạt',
        departureTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        arrivalTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 7 * 60 * 60 * 1000).toISOString(),
        duration: '7 giờ',
      },

      operator: {
        id: 'op-1',
        name: 'Phương Trang',
        logoUrl: '',
      },

      busType: 'Giường nằm 40 chỗ',
      licensePlate: '51B-12345',

      passengers: [
        {
          fullName: 'Nguyễn Văn A',
          phone: '0901234567',
          email: 'nguyenvana@example.com',
          seatNumber: 'A1',
        },
      ],

      ticketPrice: 250000,
      serviceFee: 10000,
      totalPrice: 260000,

      paymentMethod: 'VNPAY',
      paymentStatus: 'PAID',
      transactionId: 'TXN-' + timestamp,
    };
  },

  /**
   * Get booking history for a user
   */
  getBookingHistory: async (_userId: string): Promise<BookingDetails[]> => {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Generate mock bookings with various statuses and dates
    const mockBookings: BookingDetails[] = [
      // Upcoming - Confirmed
      {
        id: 'BK-' + (Date.now() + 1000),
        bookingCode: 'VXV-ABC123',
        status: 'CONFIRMED',
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        route: {
          id: 'route-1',
          from: 'TP. Hồ Chí Minh',
          to: 'Đà Lạt',
          departureTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          arrivalTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 7 * 60 * 60 * 1000).toISOString(),
          duration: '7 giờ',
        },
        operator: { id: 'op-1', name: 'Phương Trang', logoUrl: '' },
        busType: 'Giường nằm 40 chỗ',
        licensePlate: '51B-12345',
        passengers: [
          { fullName: 'Nguyễn Văn A', phone: '0901234567', email: 'nguyenvana@example.com', seatNumber: 'A1' },
        ],
        ticketPrice: 250000,
        serviceFee: 10000,
        totalPrice: 260000,
        paymentMethod: 'VNPAY',
        paymentStatus: 'PAID',
        transactionId: 'TXN-001',
      },
      // Upcoming - Pending
      {
        id: 'BK-' + (Date.now() + 2000),
        bookingCode: 'VXV-DEF456',
        status: 'PENDING',
        createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        route: {
          id: 'route-2',
          from: 'Hà Nội',
          to: 'Hải Phòng',
          departureTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
          arrivalTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
          duration: '2 giờ',
        },
        operator: { id: 'op-2', name: 'Hoàng Long', logoUrl: '' },
        busType: 'Ghế ngồi 45 chỗ',
        licensePlate: '29B-98765',
        passengers: [
          { fullName: 'Trần Thị B', phone: '0902345678', seatNumber: 'B5' },
        ],
        ticketPrice: 120000,
        serviceFee: 5000,
        totalPrice: 125000,
        paymentMethod: 'MOMO',
        paymentStatus: 'PENDING',
        transactionId: 'TXN-002',
      },
      // Past - Confirmed
      {
        id: 'BK-' + (Date.now() + 3000),
        bookingCode: 'VXV-GHI789',
        status: 'CONFIRMED',
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        route: {
          id: 'route-3',
          from: 'TP. Hồ Chí Minh',
          to: 'Vũng Tàu',
          departureTime: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          arrivalTime: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000).toISOString(),
          duration: '3 giờ',
        },
        operator: { id: 'op-3', name: 'Mai Linh', logoUrl: '' },
        busType: 'Ghế ngồi 40 chỗ',
        licensePlate: '51B-54321',
        passengers: [
          { fullName: 'Lê Văn C', phone: '0903456789', seatNumber: 'C10' },
          { fullName: 'Phạm Thị D', phone: '0904567890', seatNumber: 'C11' },
        ],
        ticketPrice: 100000,
        serviceFee: 5000,
        totalPrice: 105000,
        paymentMethod: 'VNPAY',
        paymentStatus: 'PAID',
        transactionId: 'TXN-003',
      },
      // Past - Cancelled
      {
        id: 'BK-' + (Date.now() + 4000),
        bookingCode: 'VXV-JKL012',
        status: 'CANCELLED',
        createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
        route: {
          id: 'route-4',
          from: 'Hà Nội',
          to: 'Sapa',
          departureTime: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
          arrivalTime: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000 + 6 * 60 * 60 * 1000).toISOString(),
          duration: '6 giờ',
        },
        operator: { id: 'op-4', name: 'Sapa Express', logoUrl: '' },
        busType: 'Giường nằm 36 chỗ',
        licensePlate: '29B-11111',
        passengers: [
          { fullName: 'Hoàng Văn E', phone: '0905678901', seatNumber: 'D15' },
        ],
        ticketPrice: 300000,
        serviceFee: 10000,
        totalPrice: 310000,
        paymentMethod: 'VNPAY',
        paymentStatus: 'REFUNDED',
        transactionId: 'TXN-004',
      },
    ];

    // Include any bookings from store
    const storeBookings = Array.from(bookingsStore.values());
    
    // Combine and sort by departure time (upcoming first)
    const allBookings = [...mockBookings, ...storeBookings];
    return allBookings.sort((a, b) => {
      const dateA = new Date(a.route.departureTime).getTime();
      const dateB = new Date(b.route.departureTime).getTime();
      return dateA - dateB; // Ascending order (upcoming first)
    });
  },

  /**
   * Cancel a booking
   */
  cancelBooking: async (bookingId: string): Promise<{ 
    success: boolean; 
    message: string;
    refundAmount?: number;
  }> => {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const booking = bookingsStore.get(bookingId);
    
    if (!booking) {
      return {
        success: false,
        message: 'Booking not found',
      };
    }

    if (booking.status === 'CANCELLED') {
      return {
        success: false,
        message: 'Booking is already cancelled',
      };
    }

    if (!canCancelBooking(booking.route.departureTime)) {
      return {
        success: false,
        message: 'Cannot cancel booking less than 24 hours before departure',
      };
    }

    const refundAmount = calculateRefund(booking.totalPrice, booking.route.departureTime);

    // Update booking status
    booking.status = 'CANCELLED';
    booking.paymentStatus = refundAmount > 0 ? 'REFUNDED' : 'PAID';
    bookingsStore.set(bookingId, booking);

    return {
      success: true,
      message: `Booking cancelled successfully. Refund amount: ${refundAmount.toLocaleString('vi-VN')} VNĐ`,
      refundAmount,
    };
  },

  /**
   * Get all bookings for a user (legacy method - use getBookingHistory instead)
   */
  getUserBookings: async (userId: string): Promise<BookingDetails[]> => {
    return mockBookingApi.getBookingHistory(userId);
  },
};

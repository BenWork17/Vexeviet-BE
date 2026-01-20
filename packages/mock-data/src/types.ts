// Mock data types (simplified from FE)
// These are NOT production types, just for mock data reference

export interface Booking {
  id: string;
  userId: string;
  routeId: string;
  departureTime: string;
  arrivalTime: string;
  departureLocation: string;
  arrivalLocation: string;
  operatorName: string;
  totalPrice: number;
  status: 'UPCOMING' | 'COMPLETED' | 'CANCELLED' | 'PENDING';
  seatNumbers: string[];
}

export interface BookingDetails {
  id: string;
  bookingCode: string;
  status: 'CONFIRMED' | 'PENDING' | 'CANCELLED';
  createdAt: string;

  route: {
    id: string;
    from: string;
    to: string;
    departureTime: string;
    arrivalTime: string;
    duration: string;
  };

  operator: {
    id: string;
    name: string;
    logoUrl: string;
  };

  busType: string;
  licensePlate: string;

  passengers: Array<{
    fullName: string;
    phone: string;
    email?: string;
    seatNumber: string;
  }>;

  ticketPrice: number;
  serviceFee: number;
  totalPrice: number;

  paymentMethod: string;
  paymentStatus: 'PAID' | 'PENDING' | 'REFUNDED';
  transactionId: string;
}

export interface Route {
  id: string;
  operator: {
    id: string;
    name: string;
    logoUrl: string;
    rating: number;
    totalReviews: number;
  };
  busType: string;
  licensePlate: string;
  departureTime: string;
  arrivalTime: string;
  departureLocation: string;
  arrivalLocation: string;
  duration: string;
  price: number;
  availableSeats: number;
  amenities: Array<{
    id: string;
    name: string;
    icon: string;
  }>;
  pickupPoints: Array<{
    id: string;
    time: string;
    location: string;
    address: string;
  }>;
  dropoffPoints: Array<{
    id: string;
    time: string;
    location: string;
    address: string;
  }>;
  policies: Array<{
    type: string;
    title: string;
    description: string;
  }>;
  images: string[];
}

export interface InitiatePaymentRequest {
  bookingId: string;
  amount: number;
  paymentMethod: string;
}

export interface InitiatePaymentResponse {
  success: boolean;
  paymentUrl: string;
  transactionId: string;
}

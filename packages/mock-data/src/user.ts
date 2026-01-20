import { Booking } from './types';

const mockBookings: Booking[] = [
  {
    id: 'b1',
    userId: 'u1',
    routeId: '1',
    departureTime: '2026-01-20T08:00:00Z',
    arrivalTime: '2026-01-20T14:00:00Z',
    departureLocation: 'Mien Tay Bus Station, HCM',
    arrivalLocation: 'Da Lat Bus Station, Lam Dong',
    operatorName: 'Phuong Trang',
    totalPrice: 350000,
    status: 'UPCOMING',
    seatNumbers: ['A1'],
  },
  {
    id: 'b2',
    userId: 'u1',
    routeId: '2',
    departureTime: '2025-12-15T10:00:00Z',
    arrivalTime: '2025-12-15T12:00:00Z',
    departureLocation: 'HCM',
    arrivalLocation: 'Vung Tau',
    operatorName: 'Hoa Mai',
    totalPrice: 200000,
    status: 'COMPLETED',
    seatNumbers: ['B5', 'B6'],
  },
];

export async function getUserBookings(userId: string): Promise<Booking[]> {
  await new Promise((resolve) => setTimeout(resolve, 500));
  return mockBookings.filter(b => b.userId === userId);
}

import { Route } from '@vexeviet/database';
import { config } from '../config';
import type { AdminBookingRow } from '../repositories/booking-admin.repository';
import {
  AdminBooking,
  BookingDetailResponse,
  CreateBookingRequest,
  CreateBookingResponse,
  PriceBreakdown,
} from '../types';

export function formatUtcDateOnly(value: Date): string {
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, '0');
  const day = String(value.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatLocalDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDateStart(value: string): Date {
  return new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
}

export function parseDateEnd(value: string): Date {
  return new Date(`${value.slice(0, 10)}T23:59:59.999Z`);
}

export function calculateBookingPrice(
  ticketPrice: number,
  seatCount: number,
  addons?: CreateBookingRequest['addons']
): PriceBreakdown {
  const tickets = ticketPrice * seatCount;
  const insurance = addons?.insurance ? 50000 * seatCount : 0;
  const meal = addons?.meal ? 30000 * seatCount : 0;
  const extraLuggage = addons?.extraLuggage ? 100000 : 0;

  const subtotal = tickets + insurance + meal + extraLuggage;
  const serviceFee = Math.round(subtotal * (config.booking.serviceFeePercent / 100));
  const discount = 0;

  return {
    tickets,
    insurance: insurance || undefined,
    meal: meal || undefined,
    extraLuggage: extraLuggage || undefined,
    serviceFee,
    discount: discount || undefined,
    total: subtotal + serviceFee - discount,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function formatBookingResponse(booking: any): CreateBookingResponse {
  return {
    bookingId: booking.id,
    bookingCode: booking.bookingCode,
    status: booking.status,
    route: {
      id: booking.route?.id || booking.routeId,
      name: booking.route?.name || '',
      origin: booking.route?.origin || '',
      destination: booking.route?.destination || '',
      departureLocation: booking.route?.departureLocation ?? null,
      arrivalLocation: booking.route?.arrivalLocation ?? null,
      departureTime: booking.route?.departureTime?.toISOString() || '',
      arrivalTime: booking.route?.arrivalTime?.toISOString() || '',
      duration: booking.route?.duration || 0,
      busType: booking.route?.busType || 'STANDARD',
      operatorName: booking.route?.operator
        ? `${booking.route.operator.firstName} ${booking.route.operator.lastName}`
        : '',
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    passengers: booking.passengers?.map((p: any) => ({
      firstName: p.firstName,
      lastName: p.lastName,
      seatNumber: p.seatNumber,
      idNumber: p.idNumber,
      dateOfBirth: p.dateOfBirth?.toISOString(),
    })) || [],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    seats: booking.seats?.map((s: any) => s.seatNumber) || [],
    totalPrice: {
      amount: Number(booking.totalPrice),
      currency: 'VND',
      breakdown: {
        tickets:
          Number(booking.totalPrice) - Number(booking.serviceFee) + Number(booking.discount || 0),
        serviceFee: Number(booking.serviceFee),
        discount: Number(booking.discount || 0),
        total: Number(booking.totalPrice),
      },
    },
    paymentDeadline: booking.paymentDeadline.toISOString(),
    createdAt: booking.createdAt.toISOString(),
  };
}

export function formatCreateBookingResponse(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  booking: any,
  route: Route & { operator: { id: string; firstName: string; lastName: string } },
  request: CreateBookingRequest,
  priceBreakdown: PriceBreakdown,
  selectedSeats?: string[]
): CreateBookingResponse {
  return {
    bookingId: booking.id,
    bookingCode: booking.bookingCode,
    status: booking.status,
    route: {
      id: route.id,
      name: route.name,
      origin: route.origin,
      destination: route.destination,
      departureLocation: route.departureLocation,
      arrivalLocation: route.arrivalLocation,
      departureTime: route.departureTime.toISOString(),
      arrivalTime: route.arrivalTime.toISOString(),
      duration: route.duration,
      busType: route.busType,
      operatorName: route.operator
        ? `${route.operator.firstName} ${route.operator.lastName}`
        : 'Unknown Operator',
    },
    passengers: request.passengers,
    seats: selectedSeats || request.seats,
    totalPrice: {
      amount: priceBreakdown.total,
      currency: 'VND',
      breakdown: priceBreakdown,
    },
    paymentDeadline: booking.paymentDeadline.toISOString(),
    createdAt: booking.createdAt.toISOString(),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function formatBookingDetailResponse(booking: any): BookingDetailResponse {
  const baseResponse = formatBookingResponse(booking);
  return {
    ...baseResponse,
    pickupPointId: booking.pickupPointId || '',
    dropoffPointId: booking.dropoffPointId || '',
    contactInfo: {
      email: booking.contactEmail,
      phone: booking.contactPhone,
    },
    promoCode: booking.promoCode,
    confirmedAt: booking.confirmedAt?.toISOString(),
    cancelledAt: booking.cancelledAt?.toISOString(),
    cancellationReason: booking.cancellationReason,
    notes: booking.notes,
  };
}

export function formatAdminBooking(row: AdminBookingRow): AdminBooking {
  const { user, route } = row;

  const fullName = [user?.firstName, user?.lastName]
    .filter((part): part is string => Boolean(part && part.trim()))
    .join(' ')
    .trim();

  const seatNumbers = row.seats.map((seat) => seat.seatNumber);
  const fallbackSeats = row.passengers.map((passenger) => passenger.seatNumber);
  const seats = (seatNumbers.length > 0 ? seatNumbers : fallbackSeats)
    .slice()
    .sort((a, b) => a.localeCompare(b));

  const operatorName = [route.operator?.firstName, route.operator?.lastName]
    .filter((part): part is string => Boolean(part && part.trim()))
    .join(' ')
    .trim();

  return {
    id: row.id,
    bookingCode: row.bookingCode,
    customerName: fullName || row.contactEmail || 'Guest',
    customerEmail: user?.email ?? row.contactEmail,
    customerPhone: user?.phone ?? row.contactPhone,
    operatorId: route.operatorId,
    operatorName: operatorName || 'Unknown Operator',
    routeId: route.id,
    routeName: `${route.origin} → ${route.destination}`,
    departureDate: formatUtcDateOnly(row.departureDate),
    seats,
    status: row.status,
    paymentStatus: row.payments[0]?.status ?? null,
    totalAmount:
      Math.round((Number(row.totalPrice) + Number(row.serviceFee) - Number(row.discount)) * 100) /
      100,
    createdAt: row.createdAt.toISOString(),
  };
}

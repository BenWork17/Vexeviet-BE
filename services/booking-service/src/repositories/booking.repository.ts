import { prisma, Prisma, Booking, BookingStatus } from '@vexeviet/database';
import {
  BookingAdminRepository,
  type AdminBookingRow,
  type AdminCancelTargetRow,
  type AdminConfirmTargetRow,
  type AdminConfirmManyResult,
  type RevenueTrendRow,
} from './booking-admin.repository';

export { BookingAdminRepository };
export type {
  AdminBookingRow,
  AdminCancelTargetRow,
  AdminConfirmTargetRow,
  AdminConfirmManyResult,
  RevenueTrendRow,
};

export const bookingDetailInclude = {
  user: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
    },
  },
  route: {
    select: {
      id: true,
      name: true,
      origin: true,
      destination: true,
      departureLocation: true,
      arrivalLocation: true,
      departureTime: true,
      arrivalTime: true,
      duration: true,
      busType: true,
      licensePlate: true,
      price: true,
      operatorId: true,
      operator: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          operatorAvatarUrl: true,
        },
      },
    },
  },
  passengers: true,
  seats: true,
} satisfies Prisma.BookingInclude;

export type BookingDetailRow = Prisma.BookingGetPayload<{
  include: typeof bookingDetailInclude;
}>;

export class BookingRepository {
  private adminRepo = new BookingAdminRepository();

  async create(
    data: Prisma.BookingCreateInput,
    passengers: Prisma.BookingPassengerCreateManyBookingInput[],
    _seats?: Omit<Prisma.BookingSeatCreateManyBookingInput, 'bookingId'>[]
  ): Promise<Booking & { passengers: { id: string; seatNumber: string }[] }> {
    return prisma.booking.create({
      data: {
        ...data,
        passengers: {
          createMany: {
            data: passengers,
          },
        },
      },
      include: {
        passengers: {
          select: {
            id: true,
            seatNumber: true,
          },
        },
      },
    });
  }

  async findById(id: string): Promise<BookingDetailRow | null> {
    return prisma.booking.findUnique({
      where: { id },
      include: bookingDetailInclude,
    });
  }

  async findByCode(bookingCode: string): Promise<BookingDetailRow | null> {
    return prisma.booking.findUnique({
      where: { bookingCode },
      include: bookingDetailInclude,
    });
  }

  async findByIdempotencyKey(key: string): Promise<Booking | null> {
    return prisma.booking.findUnique({
      where: { idempotencyKey: key },
      include: {
        passengers: true,
        seats: true,
      },
    });
  }

  async findMany(params: {
    where?: Prisma.BookingWhereInput;
    orderBy?: Prisma.BookingOrderByWithRelationInput;
    skip?: number;
    take?: number;
  }): Promise<Booking[]> {
    return prisma.booking.findMany({
      ...params,
      include: {
        route: {
          select: {
            id: true,
            name: true,
            origin: true,
            destination: true,
            departureTime: true,
            arrivalTime: true,
            duration: true,
            busType: true,
            licensePlate: true,
            operatorId: true,
            operator: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                operatorAvatarUrl: true,
              },
            },
          },
        },
        passengers: {
          select: {
            firstName: true,
            lastName: true,
            seatNumber: true,
          },
        },
      },
    });
  }

  async count(where?: Prisma.BookingWhereInput): Promise<number> {
    return prisma.booking.count({ where });
  }

  async update(id: string, data: Prisma.BookingUpdateInput): Promise<Booking> {
    return prisma.booking.update({
      where: { id },
      data,
      include: {
        passengers: true,
        seats: true,
      },
    });
  }

  async updateStatus(
    id: string,
    status: BookingStatus,
    additionalData?: Partial<{
      confirmedAt: Date;
      cancelledAt: Date;
      cancellationReason: string;
    }>
  ): Promise<Booking> {
    return prisma.booking.update({
      where: { id },
      data: {
        status,
        ...additionalData,
      },
    });
  }

  async findByUserId(userId: string, skip?: number, take?: number): Promise<Booking[]> {
    return prisma.booking.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      include: {
        route: {
          select: {
            id: true,
            name: true,
            origin: true,
            destination: true,
            departureTime: true,
            arrivalTime: true,
            duration: true,
            busType: true,
            licensePlate: true,
            operatorId: true,
            operator: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                operatorAvatarUrl: true,
              },
            },
          },
        },
        passengers: {
          select: {
            firstName: true,
            lastName: true,
            seatNumber: true,
          },
        },
      },
    });
  }

  async findExpiredPendingBookings(): Promise<Booking[]> {
    return prisma.booking.findMany({
      where: {
        status: BookingStatus.PENDING,
        paymentDeadline: {
          lt: new Date(),
        },
      },
    });
  }

  async expireBookings(bookingIds: string[]): Promise<number> {
    const result = await prisma.booking.updateMany({
      where: {
        id: { in: bookingIds },
        status: BookingStatus.PENDING,
      },
      data: {
        status: BookingStatus.EXPIRED,
      },
    });
    return result.count;
  }

  // Delegated admin repository methods for backwards compatibility
  findAdminPage = this.adminRepo.findAdminPage.bind(this.adminRepo);
  countAdmin = this.adminRepo.countAdmin.bind(this.adminRepo);
  findIdsByLatestPaymentStatus = this.adminRepo.findIdsByLatestPaymentStatus.bind(this.adminRepo);
  findSupersededBookingIdsForPaymentStatus = this.adminRepo.findSupersededBookingIdsForPaymentStatus.bind(this.adminRepo);
  findIdsWithLatestPaymentStatusAmong = this.adminRepo.findIdsWithLatestPaymentStatusAmong.bind(this.adminRepo);
  countCreatedSince = this.adminRepo.countCreatedSince.bind(this.adminRepo);
  countByStatusSince = this.adminRepo.countByStatusSince.bind(this.adminRepo);
  sumCompletedPayments = this.adminRepo.sumCompletedPayments.bind(this.adminRepo);
  countPaymentsNeedingAction = this.adminRepo.countPaymentsNeedingAction.bind(this.adminRepo);
  countActiveRoutes = this.adminRepo.countActiveRoutes.bind(this.adminRepo);
  countActiveOperators = this.adminRepo.countActiveOperators.bind(this.adminRepo);
  findActorName = this.adminRepo.findActorName.bind(this.adminRepo);
  cancelAsAdmin = this.adminRepo.cancelAsAdmin.bind(this.adminRepo);
  updateNotes = this.adminRepo.updateNotes.bind(this.adminRepo);
  findCancelTargets = this.adminRepo.findCancelTargets.bind(this.adminRepo);
  cancelManyAsAdmin = this.adminRepo.cancelManyAsAdmin.bind(this.adminRepo);
  findConfirmTargets = this.adminRepo.findConfirmTargets.bind(this.adminRepo);
  confirmManyAsAdmin = this.adminRepo.confirmManyAsAdmin.bind(this.adminRepo);
  findRevenueTrend = this.adminRepo.findRevenueTrend.bind(this.adminRepo);
}

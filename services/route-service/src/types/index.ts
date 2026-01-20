import { Route as PrismaRoute, BusType, RouteStatus, UserRole, Decimal } from '@vexeviet/database';

export type Route = PrismaRoute;

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
}

export interface Amenity {
  id: string;
  name: string;
  icon: string;
}

export interface PickupDropoffPoint {
  id: string;
  time: string;
  location: string;
  address: string;
}

export interface Policy {
  type: string;
  title: string;
  description: string;
}

export interface CreateRouteRequest {
  name: string;
  description?: string;
  origin: string;
  destination: string;
  departureLocation?: string;
  arrivalLocation?: string;
  distance?: number;
  departureTime: string;
  arrivalTime: string;
  duration: number;
  busType?: BusType;
  licensePlate?: string;
  totalSeats?: number;
  price: number;
  amenities?: Amenity[];
  pickupPoints?: PickupDropoffPoint[];
  dropoffPoints?: PickupDropoffPoint[];
  policies?: Policy[];
  images?: string[];
}

export interface UpdateRouteRequest extends Partial<CreateRouteRequest> {
  status?: RouteStatus;
  availableSeats?: number;
}

export interface RouteQuery {
  origin?: string;
  destination?: string;
  departureDate?: string;
  busType?: BusType;
  minPrice?: number;
  maxPrice?: number;
  status?: RouteStatus;
  page?: number;
  limit?: number;
  sortBy?: 'price' | 'departureTime' | 'duration' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface RouteResponse {
  id: string;
  name: string;
  description: string | null;
  origin: string;
  destination: string;
  departureLocation: string | null;
  arrivalLocation: string | null;
  distance: number | null;
  departureTime: Date;
  arrivalTime: Date;
  duration: number;
  busType: BusType;
  licensePlate: string | null;
  totalSeats: number;
  availableSeats: number;
  price: Decimal;
  amenities: Amenity[] | null;
  pickupPoints: PickupDropoffPoint[] | null;
  dropoffPoints: PickupDropoffPoint[] | null;
  policies: Policy[] | null;
  images: string[] | null;
  status: RouteStatus;
  operatorId: string;
  createdAt: Date;
  updatedAt: Date;
}

export { BusType, RouteStatus, UserRole };

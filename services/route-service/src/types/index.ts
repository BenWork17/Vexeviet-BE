import {
  Route as PrismaRoute,
  BusType,
  RouteStatus,
  UserRole,
  UserStatus,
  Decimal,
} from '@vexeviet/database';

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
  /** Required: the seat layout this route sells. Must be an existing, active template. */
  busTemplateId: string;
  price: number;
  amenities?: Amenity[];
  pickupPoints?: PickupDropoffPoint[];
  dropoffPoints?: PickupDropoffPoint[];
  policies?: Policy[];
  images?: string[];
}

/**
 * `busTemplateId` is deliberately excluded: re-assigning a template on update is
 * not implemented (it would strand existing BookingSeat rows keyed on the old
 * layout), so it must not appear to be settable here either.
 */
export interface UpdateRouteRequest extends Omit<Partial<CreateRouteRequest>, 'busTemplateId'> {
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

/** Query accepted by `GET /routes/admin/all` (contract Shape 3). */
export interface AdminRouteQuery {
  status?: RouteStatus;
  operatorId?: string;
  q?: string;
  page?: number;
  limit?: number;
  includeDeleted?: boolean;
}

/** Contract Shape 3 — AdminRoute. `totalSeats`/`availableSeats` are `null` when seat data is unknown. */
export interface AdminRoute {
  id: string;
  operatorId: string;
  operatorName: string;
  name: string;
  origin: string;
  destination: string;
  departureTime: Date;
  busType: BusType;
  totalSeats: number | null;
  availableSeats: number | null;
  price: number;
  status: RouteStatus;
  seatDataAvailable: boolean;
  /**
   * Whether the route row has a `busTemplateId`. Deliberately distinct from
   * `seatDataAvailable`: that flag is also false when an id exists but its
   * template row and seat definitions are gone, so on its own it cannot tell
   * an admin "this route has no template" from "this template's seats vanished".
   */
  hasBusTemplate: boolean;
}

/**
 * `GET /routes/my/routes` — one of the operator's own routes.
 *
 * Deliberately an alias, not a parallel interface: the operator console renders
 * the same row the admin console renders, and both are built by
 * `RouteService.toAdminRoute`. The operator view differs only in scope (the
 * JWT's own `operatorId`), never in fields — so `operatorName` is the operator's
 * own name and the seat figures come from the same batched loader.
 */
export type OperatorRoute = AdminRoute;

/** Contract Shape 3 — AdminOperator, derived from `User` where `role=OPERATOR`. */
export interface AdminOperator {
  id: string;
  name: string;
  contactEmail: string;
  activeRoutes: number;
  monthlyBookings: number;
  /** Always `null`: no rating data exists in the schema (documented gap). */
  rating: null;
  status: UserStatus;
  createdAt: Date;
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

export { BusType, RouteStatus, UserRole, UserStatus };

# SAFe FRONTEND - DETAILED SPECIFICATIONS

## FOLDER STRUCTURE

### Web Frontend (Next.js Monorepo)
```
apps/web/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   ├── register/
│   │   │   │   └── page.tsx
│   │   │   └── layout.tsx
│   │   ├── (main)/
│   │   │   ├── page.tsx              # Homepage
│   │   │   ├── search/
│   │   │   │   └── page.tsx
│   │   │   ├── routes/
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx
│   │   │   ├── booking/
│   │   │   │   ├── [id]/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── confirm/
│   │   │   │       └── page.tsx
│   │   │   ├── profile/
│   │   │   │   └── page.tsx
│   │   │   └── layout.tsx
│   │   ├── api/                      # API routes (BFF)
│   │   │   ├── auth/
│   │   │   ├── search/
│   │   │   └── booking/
│   │   ├── layout.tsx                # Root layout
│   │   └── error.tsx
│   ├── components/                   # Shared components
│   │   ├── ui/                       # Design system components
│   │   │   ├── Button/
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Button.test.tsx
│   │   │   │   └── Button.stories.tsx
│   │   │   ├── Input/
│   │   │   ├── Card/
│   │   │   ├── Modal/
│   │   │   └── index.ts
│   │   ├── features/                 # Feature-specific components
│   │   │   ├── search/
│   │   │   │   ├── SearchForm/
│   │   │   │   ├── RouteList/
│   │   │   │   └── FilterPanel/
│   │   │   ├── booking/
│   │   │   │   ├── SeatMap/
│   │   │   │   ├── PassengerForm/
│   │   │   │   └── PaymentForm/
│   │   │   └── profile/
│   │   └── layouts/                  # Layout components
│   │       ├── Header/
│   │       ├── Footer/
│   │       └── Sidebar/
│   ├── lib/                          # Utilities & configs
│   │   ├── api/                      # API client
│   │   │   ├── client.ts
│   │   │   ├── endpoints.ts
│   │   │   └── types.ts
│   │   ├── hooks/                    # Custom hooks
│   │   │   ├── useAuth.ts
│   │   │   ├── useSearch.ts
│   │   │   └── useBooking.ts
│   │   ├── utils/                    # Helper functions
│   │   │   ├── date.ts
│   │   │   ├── currency.ts
│   │   │   └── validation.ts
│   │   └── constants/
│   ├── store/                        # State management
│   │   ├── slices/
│   │   │   ├── authSlice.ts
│   │   │   ├── searchSlice.ts
│   │   │   └── bookingSlice.ts
│   │   └── index.ts
│   ├── styles/                       # Global styles
│   │   ├── globals.css
│   │   └── theme.ts
│   └── types/                        # TypeScript types
│       ├── api.ts
│       ├── models.ts
│       └── index.ts
├── public/
│   ├── images/
│   ├── icons/
│   └── manifest.json
├── tests/
│   ├── e2e/                          # Playwright tests
│   │   ├── auth.spec.ts
│   │   ├── booking.spec.ts
│   │   └── search.spec.ts
│   └── integration/
├── package.json
├── tsconfig.json
├── next.config.js
└── tailwind.config.ts
```

### Mobile (React Native)
```
apps/mobile/
├── src/
│   ├── screens/                      # Screen components
│   │   ├── Auth/
│   │   │   ├── LoginScreen.tsx
│   │   │   └── RegisterScreen.tsx
│   │   ├── Home/
│   │   │   └── HomeScreen.tsx
│   │   ├── Search/
│   │   │   ├── SearchScreen.tsx
│   │   │   └── ResultsScreen.tsx
│   │   ├── Booking/
│   │   │   ├── SeatSelectionScreen.tsx
│   │   │   ├── PassengerInfoScreen.tsx
│   │   │   └── PaymentScreen.tsx
│   │   └── Profile/
│   │       └── ProfileScreen.tsx
│   ├── components/                   # Shared components
│   │   ├── ui/
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   └── Card.tsx
│   │   ├── features/
│   │   │   ├── SeatMap.tsx
│   │   │   └── RouteCard.tsx
│   │   └── layouts/
│   ├── navigation/                   # Navigation config
│   │   ├── AppNavigator.tsx
│   │   ├── AuthNavigator.tsx
│   │   └── MainNavigator.tsx
│   ├── services/                     # API services
│   │   ├── api.ts
│   │   ├── auth.ts
│   │   ├── search.ts
│   │   └── booking.ts
│   ├── store/                        # Redux store
│   │   ├── slices/
│   │   └── index.ts
│   ├── hooks/                        # Custom hooks
│   ├── utils/                        # Utilities
│   ├── types/                        # TypeScript types
│   └── theme/                        # Design tokens
│       ├── colors.ts
│       ├── spacing.ts
│       └── typography.ts
├── assets/
│   ├── images/
│   ├── icons/
│   └── fonts/
├── __tests__/
│   ├── screens/
│   └── components/
├── android/
├── ios/
├── app.json
├── package.json
└── tsconfig.json
```

### Shared Packages
```
packages/
├── ui/                               # Shared UI components
│   ├── src/
│   │   ├── components/
│   │   └── index.ts
│   └── package.json
├── types/                            # Shared TypeScript types
│   ├── src/
│   │   ├── api.ts
│   │   ├── models.ts
│   │   └── index.ts
│   └── package.json
├── utils/                            # Shared utilities
│   ├── src/
│   │   ├── date.ts
│   │   ├── currency.ts
│   │   └── index.ts
│   └── package.json
└── api-client/                       # Shared API client
    ├── src/
    │   ├── client.ts
    │   ├── endpoints.ts
    │   └── index.ts
    └── package.json
```

---

## API CONTRACTS

### 1. Search Routes API

**Endpoint:** `POST /api/v1/search/routes`

**Request:**
```typescript
interface SearchRoutesRequest {
  origin: string;              // City name or ID
  destination: string;         // City name or ID
  departureDate: string;       // ISO 8601 format: "2026-02-15"
  returnDate?: string;         // Optional for round trip
  passengers: number;          // Default: 1
  filters?: {
    minPrice?: number;
    maxPrice?: number;
    departureTimeRange?: {
      start: string;           // "06:00"
      end: string;             // "12:00"
    };
    busTypes?: string[];       // ["VIP", "LIMOUSINE", "STANDARD"]
    amenities?: string[];      // ["wifi", "ac", "toilet"]
  };
  sort?: {
    by: "price" | "duration" | "departure" | "rating";
    order: "asc" | "desc";
  };
  page?: number;               // Default: 1
  limit?: number;              // Default: 20
}
```

**Response:**
```typescript
interface SearchRoutesResponse {
  success: boolean;
  data: {
    routes: Route[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    filters: {
      priceRange: { min: number; max: number };
      departureTimeRange: { min: string; max: string };
      availableBusTypes: string[];
      availableAmenities: string[];
    };
  };
  metadata: {
    searchId: string;          // For analytics
    timestamp: string;
  };
}

interface Route {
  id: string;
  operatorId: string;
  operatorName: string;
  operatorLogo: string;
  operatorRating: number;
  busType: string;
  busNumber: string;
  origin: Location;
  destination: Location;
  departureTime: string;       // ISO 8601
  arrivalTime: string;
  duration: number;            // Minutes
  distance: number;            // Kilometers
  price: {
    amount: number;
    currency: "VND";
    originalPrice?: number;    // If discounted
  };
  availableSeats: number;
  totalSeats: number;
  amenities: string[];
  pickupPoints: PickupPoint[];
  dropoffPoints: DropoffPoint[];
  policies: {
    cancellation: string;
    refund: string;
  };
  images: string[];
}

interface Location {
  cityId: string;
  cityName: string;
  terminalId?: string;
  terminalName?: string;
  address?: string;
}

interface PickupPoint {
  id: string;
  name: string;
  address: string;
  coordinates: { lat: number; lng: number };
  time: string;                // ISO 8601
}
```

**Example:**
```bash
curl -X POST https://api.vexeviet.com/api/v1/search/routes \
  -H "Content-Type: application/json" \
  -d '{
    "origin": "Hanoi",
    "destination": "Ho Chi Minh City",
    "departureDate": "2026-02-15",
    "passengers": 2,
    "filters": {
      "maxPrice": 500000,
      "busTypes": ["VIP", "LIMOUSINE"]
    },
    "sort": {
      "by": "price",
      "order": "asc"
    }
  }'
```

---

### 2. Create Booking API

**Endpoint:** `POST /api/v1/bookings`

**Request:**
```typescript
interface CreateBookingRequest {
  routeId: string;
  departureDate: string;        // ISO 8601
  passengers: PassengerInfo[];
  seats: string[];              // ["A1", "A2"]
  pickupPointId: string;
  dropoffPointId: string;
  contactInfo: {
    email: string;
    phone: string;
  };
  addons?: {
    insurance?: boolean;
    meal?: boolean;
  };
  promoCode?: string;
}

interface PassengerInfo {
  firstName: string;
  lastName: string;
  idNumber?: string;            // Optional
  dateOfBirth?: string;         // ISO 8601
}
```

**Response:**
```typescript
interface CreateBookingResponse {
  success: boolean;
  data: {
    bookingId: string;
    bookingCode: string;         // Human-readable: "VXV123456"
    status: "PENDING" | "CONFIRMED" | "CANCELLED";
    route: RouteSnapshot;
    passengers: PassengerInfo[];
    seats: string[];
    totalPrice: {
      amount: number;
      currency: "VND";
      breakdown: {
        tickets: number;
        insurance?: number;
        meal?: number;
        discount?: number;
      };
    };
    paymentDeadline: string;     // ISO 8601, 15 minutes from now
    paymentUrl: string;          // Redirect to payment gateway
    createdAt: string;
  };
}
```

---

### 3. Payment API

**Endpoint:** `POST /api/v1/payments/initiate`

**Request:**
```typescript
interface InitiatePaymentRequest {
  bookingId: string;
  paymentMethod: "VNPAY" | "MOMO" | "ZALOPAY" | "CREDIT_CARD";
  returnUrl: string;            // Callback after payment
  cancelUrl: string;
}
```

**Response:**
```typescript
interface InitiatePaymentResponse {
  success: boolean;
  data: {
    paymentId: string;
    paymentUrl: string;          // Redirect user here
    qrCode?: string;             // For QR-based payments
    expiresAt: string;
  };
}
```

**Webhook (Payment Gateway → Backend):**
```typescript
interface PaymentWebhook {
  paymentId: string;
  bookingId: string;
  status: "SUCCESS" | "FAILED" | "PENDING";
  amount: number;
  transactionId: string;
  paidAt?: string;
  signature: string;             // HMAC signature for verification
}
```

---

### 4. User Authentication API

**Endpoint:** `POST /api/v1/auth/login`

**Request:**
```typescript
interface LoginRequest {
  method: "email" | "phone";
  email?: string;
  phone?: string;
  password?: string;            // If password-based
  otp?: string;                 // If OTP-based
}
```

**Response:**
```typescript
interface LoginResponse {
  success: boolean;
  data: {
    user: {
      id: string;
      email?: string;
      phone?: string;
      firstName: string;
      lastName: string;
      avatar?: string;
    };
    tokens: {
      accessToken: string;       // JWT, expires in 1 hour
      refreshToken: string;      // Expires in 30 days
      expiresIn: number;         // Seconds
    };
  };
}
```

**Endpoint:** `POST /api/v1/auth/refresh`

**Request:**
```typescript
interface RefreshTokenRequest {
  refreshToken: string;
}
```

**Response:**
```typescript
interface RefreshTokenResponse {
  success: boolean;
  data: {
    accessToken: string;
    expiresIn: number;
  };
}
```

---

### 5. AI Recommendation API

**Endpoint:** `GET /api/v1/ai/recommendations`

**Request:**
```typescript
interface RecommendationsRequest {
  userId?: string;               // Optional, for personalized recs
  context?: {
    currentLocation?: { lat: number; lng: number };
    recentSearches?: string[];
  };
  limit?: number;                // Default: 10
}
```

**Response:**
```typescript
interface RecommendationsResponse {
  success: boolean;
  data: {
    recommendations: Recommendation[];
  };
}

interface Recommendation {
  routeId: string;
  route: Route;
  score: number;                 // 0-1, confidence score
  reason: string;                // "Popular in your area", "Based on your history"
}
```

---

### 6. Chatbot API

**Endpoint:** `POST /api/v1/ai/chatbot`

**Request:**
```typescript
interface ChatbotRequest {
  sessionId: string;             // Unique session ID
  message: string;
  context?: {
    userId?: string;
    currentPage?: string;
  };
}
```

**Response:**
```typescript
interface ChatbotResponse {
  success: boolean;
  data: {
    message: string;
    suggestions?: string[];      // Quick reply suggestions
    actions?: {
      type: "search" | "booking" | "redirect";
      payload: any;
    }[];
  };
}
```

---

## COMPONENT SPECIFICATIONS

### 1. SearchForm Component (Web)

**File:** `components/features/search/SearchForm/SearchForm.tsx`

**Props:**
```typescript
interface SearchFormProps {
  initialValues?: {
    origin?: string;
    destination?: string;
    departureDate?: Date;
    returnDate?: Date;
    passengers?: number;
  };
  onSubmit: (values: SearchFormValues) => void;
  isLoading?: boolean;
  className?: string;
}

interface SearchFormValues {
  origin: string;
  destination: string;
  departureDate: Date;
  returnDate?: Date;
  passengers: number;
}
```

**Behavior:**
- Auto-complete for origin/destination (Elasticsearch)
- Date picker with minimum date = today
- Passenger count: 1-10
- Swap origin/destination button
- Form validation (Zod schema)
- Submit on Enter key

**Tests:**
```typescript
describe('SearchForm', () => {
  it('renders with initial values', () => {});
  it('validates required fields', () => {});
  it('calls onSubmit with correct values', () => {});
  it('swaps origin and destination', () => {});
  it('disables submit when loading', () => {});
  it('shows error messages for invalid input', () => {});
});
```

**Acceptance Criteria:**
```
✅ AC1: Origin and destination autocomplete shows top 5 cities
✅ AC2: Departure date cannot be in the past
✅ AC3: Return date must be after departure date (if provided)
✅ AC4: Passenger count defaults to 1, max 10
✅ AC5: Form submits only when all required fields are valid
✅ AC6: Swap button exchanges origin/destination values
✅ AC7: Loading state disables all inputs and submit button
✅ AC8: Error messages display below invalid fields (red text)
```

---

### 2. SeatMap Component (Mobile)

**File:** `components/features/SeatMap.tsx`

**Props:**
```typescript
interface SeatMapProps {
  busType: "STANDARD" | "VIP" | "LIMOUSINE";
  totalSeats: number;
  availableSeats: string[];      // ["A1", "A2", "B1", ...]
  selectedSeats: string[];
  maxSelection: number;          // Based on passenger count
  onSeatSelect: (seat: string) => void;
  onSeatDeselect: (seat: string) => void;
}
```

**Behavior:**
- Render seat layout based on busType
- Seats: Available (green), Occupied (gray), Selected (blue)
- Tap to select/deselect
- Disable selection when maxSelection reached
- Haptic feedback on selection (mobile)
- Show seat legend

**Tests:**
```typescript
describe('SeatMap', () => {
  it('renders correct number of seats', () => {});
  it('disables occupied seats', () => {});
  it('calls onSeatSelect when tapping available seat', () => {});
  it('calls onSeatDeselect when tapping selected seat', () => {});
  it('prevents selection beyond maxSelection', () => {});
  it('applies correct colors to seat states', () => {});
});
```

**Acceptance Criteria:**
```
✅ AC1: Seat layout matches busType (40 seats for STANDARD, 24 for VIP, 12 for LIMOUSINE)
✅ AC2: Occupied seats are gray and non-clickable
✅ AC3: Available seats are green and clickable
✅ AC4: Selected seats are blue with checkmark icon
✅ AC5: User cannot select more seats than maxSelection
✅ AC6: Haptic feedback on seat selection (iOS/Android)
✅ AC7: Legend shows seat states (Available, Occupied, Selected)
✅ AC8: Seat labels are clearly visible (A1, A2, etc.)
```

---

### 3. Button Component (Design System)

**File:** `packages/ui/src/components/Button/Button.tsx`

**Props:**
```typescript
interface ButtonProps {
  variant: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size: "sm" | "md" | "lg";
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  type?: "button" | "submit" | "reset";
  className?: string;
}
```

**Behavior:**
- Variants: primary (blue), secondary (gray), outline, ghost, danger (red)
- Sizes: sm (32px), md (40px), lg (48px)
- Loading state shows spinner, disables click
- Disabled state: gray, cursor not-allowed
- Hover/focus states (accessibility)
- Ripple effect on click (mobile)

**Tests:**
```typescript
describe('Button', () => {
  it('renders with correct variant styles', () => {});
  it('renders with correct size', () => {});
  it('calls onClick when clicked', () => {});
  it('does not call onClick when disabled', () => {});
  it('shows spinner when loading', () => {});
  it('renders left and right icons', () => {});
  it('supports fullWidth prop', () => {});
  it('has accessible focus styles', () => {});
});
```

**Acceptance Criteria:**
```
✅ AC1: Primary variant has blue background (#3B82F6)
✅ AC2: Button height: sm=32px, md=40px, lg=48px
✅ AC3: Loading state shows spinner, prevents clicks
✅ AC4: Disabled state: opacity 0.5, cursor not-allowed
✅ AC5: Hover state: brightness +10%
✅ AC6: Focus state: 2px blue outline (accessibility)
✅ AC7: Icons render on left/right with 8px margin
✅ AC8: Full width button stretches to container width
```

---

### 4. RouteCard Component (Web)

**File:** `components/features/search/RouteCard/RouteCard.tsx`

**Props:**
```typescript
interface RouteCardProps {
  route: Route;
  onSelect: (routeId: string) => void;
  showCompare?: boolean;
  onCompare?: (routeId: string) => void;
  isComparing?: boolean;
}
```

**Behavior:**
- Display route summary (operator, time, price, seats)
- Expandable details (amenities, policies)
- "Select" button → booking flow
- "Compare" checkbox (optional)
- Show discount badge if applicable
- Rating stars (1-5)

**Tests:**
```typescript
describe('RouteCard', () => {
  it('renders route information correctly', () => {});
  it('calls onSelect when Select button clicked', () => {});
  it('expands to show details on click', () => {});
  it('shows discount badge when price < originalPrice', () => {});
  it('renders compare checkbox when showCompare=true', () => {});
  it('calls onCompare when checkbox toggled', () => {});
});
```

**Acceptance Criteria:**
```
✅ AC1: Displays operator logo, name, rating (stars)
✅ AC2: Shows departure time, arrival time, duration
✅ AC3: Displays price (bold, large font) and currency
✅ AC4: Shows available seats count (e.g., "12 seats left")
✅ AC5: Discount badge appears if originalPrice exists (e.g., "-20%")
✅ AC6: Expandable section shows amenities (icons), policies (text)
✅ AC7: "Select" button is primary variant, full width
✅ AC8: Compare checkbox appears in top-right when showCompare=true
```

---

### 5. PaymentForm Component (Web)

**File:** `components/features/booking/PaymentForm/PaymentForm.tsx`

**Props:**
```typescript
interface PaymentFormProps {
  bookingId: string;
  totalAmount: number;
  onPaymentInitiate: (method: PaymentMethod) => void;
  availableMethods: PaymentMethod[];
  isLoading?: boolean;
}

type PaymentMethod = "VNPAY" | "MOMO" | "ZALOPAY" | "CREDIT_CARD";
```

**Behavior:**
- Display total amount prominently
- Payment method selection (radio buttons)
- Show payment method logos
- "Proceed to Payment" button
- Security badges (SSL, PCI DSS)
- Terms & conditions checkbox

**Tests:**
```typescript
describe('PaymentForm', () => {
  it('renders available payment methods', () => {});
  it('selects payment method on radio button click', () => {});
  it('disables submit when no method selected', () => {});
  it('disables submit when T&C not checked', () => {});
  it('calls onPaymentInitiate with selected method', () => {});
  it('shows loading spinner when processing', () => {});
});
```

**Acceptance Criteria:**
```
✅ AC1: Total amount displayed at top (large, bold font)
✅ AC2: Payment methods shown as radio buttons with logos
✅ AC3: Only available methods are enabled (based on props)
✅ AC4: Submit button disabled if no method selected
✅ AC5: Submit button disabled if T&C checkbox not checked
✅ AC6: Security badges (SSL, PCI DSS) displayed at bottom
✅ AC7: Loading state disables all inputs, shows spinner
✅ AC8: Error message displays if payment initiation fails
```

---

## FEATURE ACCEPTANCE CRITERIA

### PI 1 - Feature: FE-102 (Route Search Page)

**User Story:**
```
As a user,
I want to search for bus routes between cities,
So that I can find available trips on my desired date.
```

**Acceptance Criteria:**

**AC1: Search Form Validation**
- ✅ Origin and destination are required fields
- ✅ Departure date is required, cannot be in the past
- ✅ Return date (if provided) must be after departure date
- ✅ Form shows error messages for invalid inputs
- ✅ Submit button is disabled when form is invalid

**AC2: Search Results Display**
- ✅ Results load within 2 seconds (p95)
- ✅ Show at least 10 routes per page
- ✅ Each route card displays: operator, time, price, seats
- ✅ Empty state shows "No routes found" with suggestion

**AC3: Filtering**
- ✅ Filter by price range (slider)
- ✅ Filter by departure time (morning, afternoon, evening, night)
- ✅ Filter by bus type (checkboxes)
- ✅ Filter by amenities (checkboxes)
- ✅ Filters update results without page reload

**AC4: Sorting**
- ✅ Sort by price (low to high, high to low)
- ✅ Sort by duration (shortest first)
- ✅ Sort by departure time (earliest first)
- ✅ Sort by rating (highest first)
- ✅ Default sort: earliest departure time

**AC5: Pagination**
- ✅ Show 20 routes per page
- ✅ Pagination controls at bottom
- ✅ Scroll to top when page changes
- ✅ URL updates with page number (?page=2)

**AC6: Responsive Design**
- ✅ Mobile: Single column layout, collapsible filters
- ✅ Tablet: Two column layout
- ✅ Desktop: Three column layout with sidebar filters
- ✅ Touch-friendly buttons (min 44px height)

**AC7: Accessibility**
- ✅ Keyboard navigation works (Tab, Enter)
- ✅ Screen reader announces results count
- ✅ Focus indicators visible
- ✅ ARIA labels for all interactive elements

**AC8: Performance**
- ✅ Initial load: < 3s (Lighthouse)
- ✅ Filter/sort: < 500ms
- ✅ Images lazy-loaded
- ✅ Skeleton screens while loading

---

### PI 2 - Feature: FE-201 (Seat Selection UI)

**User Story:**
```
As a user,
I want to select my seats on the bus,
So that I can choose my preferred seating location.
```

**Acceptance Criteria:**

**AC1: Seat Map Rendering**
- ✅ Seat layout matches bus type (40/24/12 seats)
- ✅ Seats labeled clearly (A1, A2, B1, etc.)
- ✅ Driver seat icon at front
- ✅ Door icon on side

**AC2: Seat States**
- ✅ Available seats: Green background, clickable
- ✅ Occupied seats: Gray background, non-clickable, cursor disabled
- ✅ Selected seats: Blue background, checkmark icon
- ✅ Hover state: Border highlight (desktop)

**AC3: Seat Selection Logic**
- ✅ User can select up to [passenger count] seats
- ✅ Clicking selected seat deselects it
- ✅ Cannot select more seats than passenger count
- ✅ Show toast message when limit reached

**AC4: Seat Information**
- ✅ Legend displays seat states (Available, Occupied, Selected)
- ✅ Show selected seats summary (e.g., "A1, A2")
- ✅ Display total price update when seats selected

**AC5: Mobile Experience**
- ✅ Pinch to zoom on seat map
- ✅ Haptic feedback on seat selection
- ✅ Large touch targets (min 44x44px)
- ✅ Horizontal scroll for wide seat maps

**AC6: Real-time Updates**
- ✅ Seat availability updates every 10 seconds (polling)
- ✅ Show warning if selected seat becomes occupied
- ✅ Auto-deselect occupied seats, show notification

**AC7: Accessibility**
- ✅ Keyboard navigation (Arrow keys to move, Space to select)
- ✅ Screen reader announces seat state on focus
- ✅ High contrast mode support
- ✅ Focus indicators visible

**AC8: Error Handling**
- ✅ Network error: Show retry button
- ✅ Seat unavailable: Show error message, auto-deselect
- ✅ Timeout warning: 15-minute countdown timer
- ✅ Session expired: Redirect to search

---

### PI 3 - Feature: FE-301 (Progressive Web App)

**User Story:**
```
As a user,
I want to install the web app on my device,
So that I can access it like a native app.
```

**Acceptance Criteria:**

**AC1: PWA Installation**
- ✅ Web app manifest configured (name, icons, theme)
- ✅ Service worker registered on page load
- ✅ Install prompt appears after 2 visits
- ✅ "Add to Home Screen" button in settings

**AC2: Offline Functionality**
- ✅ Homepage loads offline (from cache)
- ✅ Tickets page loads offline (cached data)
- ✅ Offline indicator shown when network unavailable
- ✅ Queue failed requests, sync when online

**AC3: Caching Strategy**
- ✅ Static assets cached (CSS, JS, images)
- ✅ API responses cached (stale-while-revalidate)
- ✅ Cache expiry: 24 hours
- ✅ Manual cache clear option in settings

**AC4: App-like Experience**
- ✅ Splash screen on launch
- ✅ No browser UI (standalone mode)
- ✅ Status bar color matches theme
- ✅ Navigation gestures work (swipe back)

**AC5: Update Mechanism**
- ✅ New version detection
- ✅ Update notification (non-intrusive banner)
- ✅ "Update Now" button triggers reload
- ✅ Auto-update after 24 hours

**AC6: Performance**
- ✅ Lighthouse PWA score: 100
- ✅ Time to Interactive (offline): < 2s
- ✅ Cache size: < 50MB

**AC7: Compatibility**
- ✅ Works on Chrome, Edge, Safari (iOS 16+)
- ✅ Install prompt on Android (Chrome)
- ✅ Add to Home Screen on iOS (Safari)

**AC8: Analytics**
- ✅ Track PWA installs (Google Analytics)
- ✅ Track offline usage
- ✅ Track update adoption rate

---

### PI 4 - Feature: FE-401 (Chatbot Widget)

**User Story:**
```
As a user,
I want to chat with a bot for help,
So that I can get quick answers without searching.
```

**Acceptance Criteria:**

**AC1: Widget Appearance**
- ✅ Floating button in bottom-right corner
- ✅ Chat icon with unread badge (if messages)
- ✅ Expands to chat window on click
- ✅ Minimizes to button on close

**AC2: Chat Interface**
- ✅ Message history (user + bot)
- ✅ Text input with send button
- ✅ "Thinking..." indicator when bot processing
- ✅ Suggested quick replies (chips)

**AC3: Chatbot Functionality**
- ✅ Greet user on first open
- ✅ Handle common queries (search help, booking, cancellation)
- ✅ Provide deep links (e.g., "Search routes" → /search)
- ✅ Fallback: "Contact support" button if can't help

**AC4: Voice Input (Mobile)**
- ✅ Microphone button in input field
- ✅ Record voice, convert to text
- ✅ Display transcribed text
- ✅ User can edit before sending

**AC5: Conversation Flow**
- ✅ Multi-turn conversations (context maintained)
- ✅ Session persists across pages
- ✅ History saved in localStorage (last 10 messages)
- ✅ Clear history option

**AC6: Accessibility**
- ✅ Keyboard navigation (Tab, Enter)
- ✅ Screen reader announces new messages
- ✅ Focus management (trap focus in chat window)
- ✅ High contrast mode support

**AC7: Performance**
- ✅ Chat window opens < 300ms
- ✅ Bot response time < 2s (p95)
- ✅ No layout shift when widget loads

**AC8: Analytics**
- ✅ Track chatbot usage (opens, messages sent)
- ✅ Track resolution rate (user feedback)
- ✅ Track fallback rate (unanswered queries)

---

## TESTING STRATEGY

### Unit Tests (70% coverage minimum)
- **Tool:** Vitest + React Testing Library
- **Scope:** Components, hooks, utilities
- **Run:** Pre-commit hook, CI pipeline
- **Examples:**
  - Button: renders variants, handles clicks
  - SearchForm: validation, submission
  - useAuth hook: login, logout, token refresh

### Integration Tests
- **Tool:** Vitest + MSW (Mock Service Worker)
- **Scope:** Component + API interactions
- **Examples:**
  - SearchForm + API: submit search, handle errors
  - Booking flow: select seats, fill form, payment

### E2E Tests (Critical flows)
- **Tool:** Playwright (Web), Detox (Mobile)
- **Scope:** User journeys
- **Examples:**
  - Search → Select route → Book → Pay
  - Login → View profile → Edit profile
  - Chatbot conversation flow

### Visual Regression Tests
- **Tool:** Percy / Chromatic
- **Scope:** UI components, pages
- **Run:** On PR, before deployment

### Performance Tests
- **Tool:** Lighthouse CI
- **Metrics:** LCP < 2.5s, FID < 100ms, CLS < 0.1
- **Run:** On every deployment

### Accessibility Tests
- **Tool:** axe-core (automated), manual testing
- **Target:** WCAG 2.1 AA
- **Run:** On every PR

---

**Document Owner:** Frontend Tech Leads (Web + Mobile)  
**Last Updated:** January 12, 2026  
**Status:** Ready for Implementation  
**Next Review:** PI 1 Planning

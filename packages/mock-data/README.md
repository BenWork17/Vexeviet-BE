# @vexeviet/mock-data

Mock data package for VeXeViet platform. This package contains frontend mock data that serves as the **design reference** for backend database schema.

## Purpose

This is NOT production code. This package:
- ✅ Documents frontend data structure requirements
- ✅ Serves as reference for backend schema design
- ✅ Helps identify missing fields in backend models
- ✅ Can be used for frontend development/testing

## Usage

```typescript
import { mockBookingApi } from '@vexeviet/mock-data';

// Get mock bookings
const bookings = await mockBookingApi.getBookingHistory('user-id');
```

## Files

- `user.ts` - User bookings mock data
- `routes.ts` - Route details mock data
- `booking.ts` - Booking operations mock API
- `payment.ts` - Payment gateway mock API

## Integration with Backend

See `/docs/mock-analysis.md` for gap analysis between mock data and current backend schema.

---

## 🚌 BusTemplate & Seat Layout Architecture

### Overview

Hệ thống sử dụng mô hình **BusTemplate → Seat** để quản lý layout ghế:

```
BusTemplate (Master)
    └── Seat[] (Layout ghế chuẩn cho template)
            └── BookingSeat (Trạng thái ghế theo ngày)

Route
    └── references → BusTemplate
```

### BusTemplate Types

| Template | Bus Type | Total Seats | Floors | Description |
|----------|----------|-------------|--------|-------------|
| `tpl-standard-45` | STANDARD | 45 | 1 | Xe ghế ngồi tiêu chuẩn |
| `tpl-limousine-34` | LIMOUSINE | 34 | 1 | Xe Limousine VIP |
| `tpl-sleeper-40` | SLEEPER | 40 | 2 | Xe giường nằm 2 tầng |
| `tpl-vip-24` | VIP | 24 | 1 | Xe VIP massage |

### Seat Properties

```typescript
interface Seat {
  id: string;
  seatNumber: string;      // "A1", "B2", "1A-L" (L=Lower, U=Upper)
  seatLabel: string;       // Display label (có thể khác seatNumber)
  row: number;             // Hàng: 1, 2, 3...
  column: string;          // Cột: A, B, C, D
  floor: number;           // Tầng: 1 (dưới), 2 (trên)
  seatType: SeatType;      // NORMAL | VIP | SLEEPER | SEMI_SLEEPER
  position: Position;      // WINDOW | AISLE | MIDDLE
  priceModifier: number;   // Phụ thu/giảm giá (+50000, -20000)
  isAvailable: boolean;    // Master availability (ghế hỏng = false)
  metadata?: {
    hasUSB?: boolean;
    hasLegRoom?: boolean;
    width?: string;
    recline?: string;
  };
}
```

### Column Layout Convention

Sử dụng `_` để đánh dấu lối đi:

- **Standard (4 cột):** `["A", "B", "_", "C", "D"]`
- **Limousine (3 cột):** `["A", "_", "B", "_", "C"]`
- **Sleeper (3 cột):** `["A", "_", "B", "C"]`

### Seat Status Flow

```
AVAILABLE → HELD (15 min) → BOOKED
                ↓
            (expired) → AVAILABLE
                
BLOCKED (maintenance/reserved)
```

### API Endpoint

```
GET /api/v1/seats/availability?routeId={uuid}&departureDate={YYYY-MM-DD}
```

Response includes:
- `busTemplate`: Layout information
- `seats[]`: All seats with real-time status
- `summary`: Count of available/booked/held seats

### Frontend Rendering

```typescript
// Render seat map from API response
function renderSeatMap(data: SeatAvailabilityResponse) {
  const { busTemplate, seats } = data;
  
  // Group seats by floor
  const floors = groupBy(seats, 'floor');
  
  // For each floor, create grid based on columns
  floors.forEach((floorSeats, floorNum) => {
    const grid = createGrid(busTemplate.rowsPerFloor, busTemplate.columns);
    
    floorSeats.forEach(seat => {
      const colIndex = busTemplate.columns.indexOf(seat.column);
      grid[seat.row - 1][colIndex] = {
        ...seat,
        onClick: seat.isSelectable ? () => selectSeat(seat) : null,
        className: getSeatClassName(seat.status, seat.seatType)
      };
    });
    
    renderFloor(floorNum, grid);
  });
}
```

---

**Note:** This data structure should drive backend schema design, not the other way around.

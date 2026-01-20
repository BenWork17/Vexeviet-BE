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

**Note:** This data structure should drive backend schema design, not the other way around.

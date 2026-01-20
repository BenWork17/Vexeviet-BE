# Error Handling & State Cleanup Implementation

## 📋 Overview

Comprehensive error handling and state management for robust user experience across web and mobile platforms.

## ✨ Features Implemented

### 1. Global Error Boundary (Web)

**Location:** `apps/web/src/components/error/ErrorBoundary.tsx`

**Features:**
- Catches JavaScript errors anywhere in component tree
- Prevents entire app crash
- Shows user-friendly error UI with reload/home buttons
- Development mode: Shows error stack trace
- Production mode: Logs to error reporting service (Sentry ready)

**Usage:**
```tsx
// Already integrated in app/layout.tsx
<ErrorBoundary>
  <YourApp />
</ErrorBoundary>
```

### 2. Toast Notification System (Web)

**Location:** `apps/web/src/components/error/ToastProvider.tsx`

**Features:**
- Global toast notifications (success, error, warning, info)
- Auto-dismiss with configurable duration
- Animated slide-in from right
- Dismissable with X button
- Error toasts have longer duration (7s vs 5s)

**Usage:**
```tsx
import { useToast } from '@/components/error/ToastProvider';

function MyComponent() {
  const toast = useToast();

  const handleSuccess = () => {
    toast.showSuccess('Đặt vé thành công', 'Bạn sẽ nhận được email xác nhận');
  };

  const handleError = () => {
    toast.showError('Đặt vé thất bại', 'Ghế A1 đã được đặt');
  };

  const handleNetworkError = () => {
    toast.showError('Lỗi kết nối', 'Không thể kết nối đến máy chủ');
  };
}
```

### 3. API Error Handler (Web)

**Location:** `apps/web/src/lib/api/errorHandler.ts`

**Features:**
- Centralized error handling for all API calls
- Network error detection (offline, timeout)
- HTTP status code handling (4xx, 5xx)
- User-friendly Vietnamese error messages
- Retry with exponential backoff
- Fetch with timeout

**Usage:**
```tsx
import { handleAPIError, getUserErrorMessage, retryWithBackoff } from '@/lib/api/errorHandler';

// Simple error handling
try {
  const data = await apiCall();
} catch (error) {
  const userMessage = getUserErrorMessage(error);
  toast.showError('Lỗi', userMessage);
}

// Retry with backoff
try {
  const data = await retryWithBackoff(
    () => apiCall(),
    3, // max retries
    1000 // initial delay (ms)
  );
} catch (error) {
  // Failed after 3 retries
}

// Fetch with timeout
try {
  const response = await fetchWithTimeout('/api/routes', {}, 10000);
} catch (error) {
  // Timeout after 10s
}
```

### 4. Booking State Cleanup (Web)

**Location:** `apps/web/src/lib/hooks/useBookingCleanup.ts`

**Features:**
- Auto-cleanup on component unmount
- Manual reset for "Book Another Trip" buttons
- Prevents stale selected seats
- Ensures fresh booking flow

**Usage:**
```tsx
import { useBookingCleanup, useResetBooking } from '@/lib/hooks/useBookingCleanup';

// Auto-cleanup when user navigates away
function BookingPage() {
  useBookingCleanup(); // Automatically resets state on unmount
  
  return <YourBookingFlow />;
}

// Manual reset
function SuccessPage() {
  const resetBooking = useResetBooking();
  
  return (
    <button onClick={() => {
      resetBooking();
      router.push('/');
    }}>
      Đặt vé khác
    </button>
  );
}
```

### 5. Redux State Management (Web)

**Location:** `apps/web/src/store/slices/bookingSlice.ts`

**New Actions:**
```typescript
// Reset all booking state to initial values
dispatch(resetBookingState());

// Same as resetBooking (alias for clarity)
dispatch(resetBooking());
```

**When to Use:**
- ✅ User completes booking (navigates to success page)
- ✅ User clicks "Book Another Trip"
- ✅ User navigates away from booking flow
- ✅ User goes back to home page from any booking step

### 6. Seat Conflict Simulation (Web)

**Location:** `apps/web/src/lib/api/mock/booking.ts`

**Features:**
- 10% chance of seat conflict error
- Simulates real-world concurrency issues
- Tests frontend error handling

**Error Message:**
```
Ghế A1 đã được đặt bởi người khác. Vui lòng chọn ghế khác.
```

### 7. Mobile Error Boundary

**Location:** `apps/mobile/src/components/error/ErrorBoundary.tsx`

**Features:**
- Same as web but for React Native
- Uses MaterialCommunityIcons
- SafeAreaView for proper mobile display
- Try Again / Go Home buttons

---

## 🧪 Testing Scenarios

### Test 1: Network Error

```tsx
// Disable network in DevTools
// Try to load booking
// Expected: Toast shows "Không thể kết nối đến máy chủ"
```

### Test 2: Seat Conflict Error

```tsx
// Complete booking flow
// 10% chance of error: "Ghế X đã được đặt"
// Expected: Toast shows error, booking flow resets
```

### Test 3: JavaScript Error

```tsx
// Intentionally throw error in component
throw new Error('Test error');
// Expected: Error boundary catches, shows fallback UI
```

### Test 4: State Cleanup

```tsx
// 1. Select seats A1, A2
// 2. Navigate to home
// 3. Start new booking
// Expected: No seats pre-selected (state reset)
```

### Test 5: Timeout Error

```tsx
// Mock slow API (>30s)
// Expected: Timeout error after 30s
// Expected: Toast shows "Yêu cầu mất quá nhiều thời gian"
```

---

## 📱 Integration Points

### Web App (`apps/web`)

**Layout Integration:**
```tsx
// apps/web/src/app/layout.tsx
<ErrorBoundary>
  <StoreProvider>
    <ToastProvider>
      <Header />
      <main>{children}</main>
      <Footer />
    </ToastProvider>
  </StoreProvider>
</ErrorBoundary>
```

**Booking Page Integration:**
```tsx
// Add to booking pages
import { useBookingCleanup } from '@/lib/hooks/useBookingCleanup';

export default function BookingPage() {
  useBookingCleanup(); // Auto-reset on unmount
  
  // ... page content
}
```

**Success Page Integration:**
```tsx
// Add to success page
import { useResetBooking } from '@/lib/hooks/useBookingCleanup';

export default function SuccessPage() {
  const resetBooking = useResetBooking();
  
  const handleBookAnother = () => {
    resetBooking();
    router.push('/');
  };
  
  return (
    <button onClick={handleBookAnother}>
      Đặt vé khác
    </button>
  );
}
```

### Mobile App (`apps/mobile`)

**App Integration:**
```tsx
// apps/mobile/App.tsx
import { ErrorBoundary } from './src/components/error/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <NavigationContainer>
        {/* ... */}
      </NavigationContainer>
    </ErrorBoundary>
  );
}
```

---

## 🎯 Error Types Handled

### Network Errors
- ✅ No internet connection
- ✅ DNS resolution failure
- ✅ Connection timeout (30s)
- ✅ Request timeout (30s)

### HTTP Errors
- ✅ 400 Bad Request
- ✅ 401 Unauthorized
- ✅ 403 Forbidden
- ✅ 404 Not Found
- ✅ 408 Request Timeout
- ✅ 409 Conflict (seat already booked)
- ✅ 500 Internal Server Error
- ✅ 502 Bad Gateway
- ✅ 503 Service Unavailable

### Application Errors
- ✅ JavaScript runtime errors
- ✅ React component errors
- ✅ State management errors
- ✅ Validation errors

---

## 🔧 Configuration

### Error Boundary

```tsx
// Custom fallback UI
<ErrorBoundary fallback={<CustomErrorPage />}>
  <YourApp />
</ErrorBoundary>
```

### Toast Duration

```tsx
// Default durations
success: 5000ms
error: 7000ms
warning: 5000ms
info: 5000ms

// Custom duration
toast.showToast({
  type: 'success',
  title: 'Success',
  message: 'Operation completed',
  duration: 3000 // 3 seconds
});

// No auto-dismiss
toast.showToast({
  type: 'error',
  title: 'Critical Error',
  message: 'Manual dismiss only',
  duration: 0 // Won't auto-dismiss
});
```

### Retry Configuration

```tsx
// Customize retries
await retryWithBackoff(
  () => apiCall(),
  5, // 5 retries
  500 // start with 500ms delay
);

// Delays: 500ms, 1s, 2s, 4s, 8s
```

---

## 📊 Error Messages (Vietnamese)

| Error Type | Message |
|------------|---------|
| Network Error | Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối internet. |
| Timeout | Yêu cầu mất quá nhiều thời gian. Vui lòng thử lại. |
| Unauthorized | Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại. |
| Forbidden | Bạn không có quyền thực hiện hành động này. |
| Not Found | Không tìm thấy dữ liệu yêu cầu. |
| Seat Conflict | Ghế [X] đã được đặt bởi người khác. Vui lòng chọn ghế khác. |
| Server Error | Lỗi máy chủ. Vui lòng thử lại sau. |
| Generic Error | Đã xảy ra lỗi. Vui lòng thử lại. |

---

## 🐛 Known Issues & Future Enhancements

### Known Issues
- None at this time

### Future Enhancements

1. **Sentry Integration:**
   ```tsx
   // In ErrorBoundary
   Sentry.captureException(error, { extra: errorInfo });
   ```

2. **Offline Queue:**
   - Queue failed requests while offline
   - Retry when connection restored

3. **Error Analytics:**
   - Track error frequency
   - Identify problem areas
   - Monitor error trends

4. **Smart Retry:**
   - Retry only idempotent operations
   - Skip retry for payment/booking (use locks instead)

5. **Error Recovery Suggestions:**
   - "Check your internet connection"
   - "Try selecting different seats"
   - "Contact support at..."

---

## 📞 Support

For questions or issues:
- **Team:** QA & DevOps (Team 6)
- **Iteration:** PI 2 - Final
- **Features:** Error Handling & State Cleanup

## 🎯 Success Criteria

- [x] Error boundary catches all JS errors
- [x] Network errors show user-friendly messages
- [x] Booking state resets on navigation
- [x] Seat conflicts handled gracefully
- [x] Timeout errors don't hang UI
- [x] Toast notifications work across app
- [x] Mobile error boundary works
- [x] No loading spinners stuck forever

---

## 📸 Screenshots

*Screenshots should be added to demonstrate:*
- Error boundary fallback UI
- Toast notifications (success, error, warning, info)
- Network error handling
- Seat conflict error
- Loading timeout

---

**Status:** ✅ Ready for QA Testing  
**Last Updated:** 2026-01-14

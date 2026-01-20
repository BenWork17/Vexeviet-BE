# 🚀 Quick Reference: Error Handling

## Web App

### Show Toast Notification
```tsx
import { useToast } from '@/components/error/ToastProvider';

const toast = useToast();

// Success
toast.showSuccess('Đặt vé thành công');

// Error
toast.showError('Đặt vé thất bại', 'Ghế đã được đặt');

// Warning  
toast.showWarning('Cảnh báo', 'Vé sắp hết');

// Info
toast.showInfo('Thông tin', 'Chuyến xe sẽ khởi hành sớm 10 phút');
```

### Handle API Errors
```tsx
import { getUserErrorMessage } from '@/lib/api/errorHandler';
import { useToast } from '@/components/error/ToastProvider';

const toast = useToast();

try {
  await api.createBooking(data);
  toast.showSuccess('Đặt vé thành công');
} catch (error) {
  const message = getUserErrorMessage(error);
  toast.showError('Lỗi', message);
}
```

### Retry Failed Requests
```tsx
import { retryWithBackoff } from '@/lib/api/errorHandler';

try {
  const data = await retryWithBackoff(
    () => api.fetchRoutes(),
    3, // max retries
    1000 // initial delay
  );
} catch (error) {
  // Failed after 3 retries
}
```

### Cleanup Booking State
```tsx
import { useBookingCleanup } from '@/lib/hooks/useBookingCleanup';

// Auto-cleanup on unmount
export default function BookingPage() {
  useBookingCleanup();
  return <YourContent />;
}
```

### Manual Reset
```tsx
import { useResetBooking } from '@/lib/hooks/useBookingCleanup';

export default function SuccessPage() {
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

---

## Mobile App

### Error Boundary (Already Integrated)
```tsx
// Just throw errors, boundary will catch
throw new Error('Something went wrong');
```

---

## Common Patterns

### Loading with Timeout
```tsx
const [loading, setLoading] = useState(false);
const [timedOut, setTimedOut] = useState(false);

useEffect(() => {
  let timeout: NodeJS.Timeout;
  
  if (loading) {
    timeout = setTimeout(() => {
      setTimedOut(true);
      toast.showError('Timeout', 'Request took too long');
    }, 30000); // 30 seconds
  }
  
  return () => clearTimeout(timeout);
}, [loading]);
```

### Form Submission
```tsx
const handleSubmit = async (data) => {
  setLoading(true);
  
  try {
    await api.submit(data);
    toast.showSuccess('Thành công');
    router.push('/success');
  } catch (error) {
    const message = getUserErrorMessage(error);
    toast.showError('Lỗi', message);
  } finally {
    setLoading(false);
  }
};
```

### Network Check
```tsx
import { isNetworkError } from '@/lib/api/errorHandler';

try {
  await api.call();
} catch (error) {
  if (isNetworkError(error)) {
    toast.showError('Mất kết nối', 'Kiểm tra internet của bạn');
  } else {
    toast.showError('Lỗi', getUserErrorMessage(error));
  }
}
```

---

## Debugging

### Enable Error Logs
```tsx
// In development, errors are logged to console
console.error('Error details:', error);
```

### View Error Stack
```tsx
// In development mode, ErrorBoundary shows stack trace
// Click "Chi tiết lỗi (Development)" to expand
```

### Test Error Scenarios
```tsx
// Force network error
throw new Error('Failed to fetch');

// Force seat conflict (10% chance built-in)
// Just try booking multiple times

// Force timeout
await new Promise(resolve => setTimeout(resolve, 40000));
```

---

## Error Messages Reference

| Code | Message |
|------|---------|
| `NETWORK_ERROR` | Không thể kết nối đến máy chủ |
| `TIMEOUT` | Yêu cầu mất quá nhiều thời gian |
| `UNAUTHORIZED` | Phiên đăng nhập đã hết hạn |
| `FORBIDDEN` | Bạn không có quyền |
| `NOT_FOUND` | Không tìm thấy dữ liệu |
| `SEAT_CONFLICT` | Ghế đã được đặt |
| Server error (5xx) | Lỗi máy chủ |

---

## When to Use What

| Scenario | Use |
|----------|-----|
| API call failed | `toast.showError(getUserErrorMessage(error))` |
| Success action | `toast.showSuccess('Title', 'Message')` |
| Warning user | `toast.showWarning('Title', 'Message')` |
| Info message | `toast.showInfo('Title', 'Message')` |
| Need retry | `retryWithBackoff(() => apiCall())` |
| Reset booking | `dispatch(resetBookingState())` |
| Auto-cleanup | `useBookingCleanup()` |
| Manual reset | `useResetBooking()` |

---

Quick guide. See `ERROR-HANDLING.md` for full details.

# Error Handling - Manual Testing Checklist

> **Test Phase:** PI 2 Iteration 2-5  
> **Duration:** ~30 minutes  
> **Tester:** QA Team

---

## Prerequisites

```bash
# Start all services
make dev-up

# Open web app
cd apps/web && pnpm dev
# Open http://localhost:3000

# Open DevTools (F12)
# - Console tab (for errors)
# - Network tab (for request failures)
```

---

## Test Suite 1: Network Errors

### Test 1.1: Offline Mode (Complete Network Loss)

**Test ID:** `ERR-NET-001`  
**Priority:** P0 (Critical)

#### Steps:
1. ✅ **Setup:**
   - Login to the app
   - Navigate to "Search" page

2. ✅ **Simulate Offline:**
   - Open DevTools (F12) → Network tab
   - Enable "Offline" mode (dropdown)

3. ✅ **Test Search:**
   - Enter search: "Ho Chi Minh → Hanoi"
   - Click "Search"
   
4. ✅ **Expected Results:**
   ```
   ❌ Toast appears (top-right):
      Type: Error (red background)
      Icon: ⚠️
      Title: "No Internet Connection"
      Message: "Please check your network and try again."
      Duration: 5 seconds
      
   ❌ Search results: Empty state
      "Unable to load routes. Please check your connection."
      
   ❌ Console: Error logged
      [ERROR] Network request failed: TypeError: Failed to fetch
   ```

5. ✅ **Retry Logic:**
   - Disable "Offline" mode
   - Click "Retry" button in empty state
   - **Expected:** Search succeeds, routes appear

---

### Test 1.2: Request Timeout (Slow Network)

**Test ID:** `ERR-NET-002`  
**Priority:** P1 (High)

#### Steps:
1. ✅ **Simulate Slow Network:**
   - DevTools → Network tab
   - Throttling: "Slow 3G"

2. ✅ **Test Booking Creation:**
   - Complete booking flow (select route, seats, payment info)
   - Click "Confirm Booking"
   - **Expected:** Request takes > 10s

3. ✅ **Expected Results:**
   ```
   ⏳ Loading spinner on button (first 10s)
   
   ❌ After 10s timeout:
      Toast: "Request Timeout"
      Message: "The request took too long. Please try again."
      
   ❌ Booking NOT created in database
   
   ✅ User can retry immediately
   ```

---

### Test 1.3: Server Unreachable (503)

**Test ID:** `ERR-NET-003`  
**Priority:** P1 (High)

#### Steps:
1. ✅ **Stop Backend Service:**
   ```bash
   # In separate terminal
   docker stop vexeviet-api-gateway
   ```

2. ✅ **Test Any API Call:**
   - Navigate to "My Bookings"
   
3. ✅ **Expected Results:**
   ```
   ❌ Toast: "Service Unavailable"
      Message: "Our servers are temporarily down. Please try again later."
      
   ❌ Page shows: Error illustration
      "We're experiencing technical difficulties"
      "Our team has been notified. Please try again in a few minutes."
      
   ✅ Retry button available
   ```

4. ✅ **Recovery:**
   ```bash
   docker start vexeviet-api-gateway
   ```
   - Click "Retry"
   - **Expected:** Page loads successfully

---

## Test Suite 2: API Errors (4xx, 5xx)

### Test 2.1: 400 Bad Request (Validation Error)

**Test ID:** `ERR-API-001`  
**Priority:** P0 (Critical)

#### Steps:
1. ✅ **Test Invalid Search:**
   - Navigate to Search page
   - Open DevTools → Console
   - Run:
     ```javascript
     // Manually trigger API call with invalid data
     fetch('http://localhost:8000/api/v1/routes/search', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ fromCity: '', toCity: '', date: 'invalid-date' })
     })
     ```

2. ✅ **Expected Results:**
   ```
   ❌ Toast: "Invalid Request"
      Message: "Please check your search criteria."
      Details (if expanded):
        - "fromCity is required"
        - "toCity is required"
        - "date must be a valid date"
        
   ❌ Form validation errors appear:
      [Departure City] - "Please select a city"
      [Arrival City] - "Please select a city"
      [Date] - "Invalid date format"
   ```

---

### Test 2.2: 401 Unauthorized (Session Expired)

**Test ID:** `ERR-API-002`  
**Priority:** P0 (Critical)

#### Steps:
1. ✅ **Simulate Expired Token:**
   - Login to app
   - Open DevTools → Application → Cookies
   - Delete `access_token` cookie

2. ✅ **Test Protected Route:**
   - Navigate to "My Bookings" (requires auth)

3. ✅ **Expected Results:**
   ```
   ❌ Toast: "Session Expired"
      Message: "Please log in again to continue."
      
   ✅ Auto-redirect to Login page (after 2s)
   
   ✅ After login, redirect back to "My Bookings"
   ```

---

### Test 2.3: 403 Forbidden (No Permission)

**Test ID:** `ERR-API-003`  
**Priority:** P1 (High)

#### Steps:
1. ✅ **Test Access Control:**
   - Login as regular user
   - Manually navigate to admin route:
     ```
     http://localhost:3000/admin/dashboard
     ```

2. ✅ **Expected Results:**
   ```
   ❌ 403 Error Page:
      Title: "Access Denied"
      Message: "You don't have permission to view this page."
      
   ✅ Button: "Go to Homepage"
   
   ❌ Console: Error logged
      [ERROR] 403 Forbidden: Insufficient permissions
   ```

---

### Test 2.4: 404 Not Found

**Test ID:** `ERR-API-004`  
**Priority:** P2 (Medium)

#### Steps:
1. ✅ **Test Invalid Booking ID:**
   - Navigate to:
     ```
     http://localhost:3000/bookings/invalid-booking-id
     ```

2. ✅ **Expected Results:**
   ```
   ❌ 404 Error Page:
      Title: "Booking Not Found"
      Message: "The booking you're looking for doesn't exist."
      
   ✅ Buttons:
      - "View All Bookings"
      - "Go to Homepage"
   ```

---

### Test 2.5: 500 Internal Server Error

**Test ID:** `ERR-API-005`  
**Priority:** P1 (High)

#### Steps:
1. ✅ **Trigger Server Error:**
   - Use a test endpoint that throws 500:
     ```bash
     curl -X POST http://localhost:8000/api/v1/test/error-500
     ```

2. ✅ **Expected Results:**
   ```
   ❌ Toast: "Server Error"
      Message: "Something went wrong on our end. Please try again."
      
   ✅ Error ID displayed (for support):
      "Error ID: err_abc123xyz"
      
   ❌ Console: Full error logged
      [ERROR] 500 Internal Server Error
      Request ID: req_xyz789
      Timestamp: 2026-01-14T10:30:00Z
   ```

---

## Test Suite 3: Form Validation Errors

### Test 3.1: Empty Required Fields

**Test ID:** `ERR-VAL-001`  
**Priority:** P0 (Critical)

#### Steps:
1. ✅ **Test Search Form:**
   - Navigate to Search page
   - Leave all fields empty
   - Click "Search"

2. ✅ **Expected Results:**
   ```
   ❌ Inline validation errors (red text below each field):
      [Departure City]: "Please select a departure city"
      [Arrival City]: "Please select an arrival city"
      [Date]: "Please select a date"
      
   ❌ Search button remains enabled (but form doesn't submit)
   
   ❌ Toast: "Please fill in all required fields"
   ```

---

### Test 3.2: Invalid Email Format

**Test ID:** `ERR-VAL-002`  
**Priority:** P1 (High)

#### Steps:
1. ✅ **Test Login Form:**
   - Navigate to Login page
   - Enter email: `invalid-email`
   - Enter password: `Test123!`
   - Click "Login"

2. ✅ **Expected Results:**
   ```
   ❌ Inline error under email field:
      "Please enter a valid email address"
      
   ❌ Form doesn't submit
   
   ✅ Password field remains filled (not cleared)
   ```

---

### Test 3.3: Password Strength Validation

**Test ID:** `ERR-VAL-003`  
**Priority:** P1 (High)

#### Steps:
1. ✅ **Test Signup Form:**
   - Navigate to Signup page
   - Enter password: `weak`
   - Blur field (click outside)

2. ✅ **Expected Results:**
   ```
   ❌ Inline error:
      "Password must be at least 8 characters"
      "Password must contain: uppercase, lowercase, number, special character"
      
   ✅ Password strength meter shows: "Weak" (red)
   ```

---

## Test Suite 4: Payment Errors

### Test 4.1: Payment Gateway Timeout

**Test ID:** `ERR-PAY-001`  
**Priority:** P0 (Critical)

#### Steps:
1. ✅ **Test Payment Flow:**
   - Complete booking to payment step
   - Enter test card: `4111 1111 1111 1111`
   - Click "Pay Now"
   - **Simulate:** VNPay returns timeout error

2. ✅ **Expected Results:**
   ```
   ❌ Toast: "Payment Timeout"
      Message: "Payment gateway didn't respond. Your card was NOT charged."
      
   ✅ Booking status: Still "PENDING" (not "FAILED")
   
   ✅ User can retry payment:
      Button: "Try Again"
   ```

---

### Test 4.2: Insufficient Funds

**Test ID:** `ERR-PAY-002`  
**Priority:** P1 (High)

#### Steps:
1. ✅ **Use Test Card (Insufficient Funds):**
   - Card number: `4000 0000 0000 9995` (VNPay test card)
   - Click "Pay Now"

2. ✅ **Expected Results:**
   ```
   ❌ Toast: "Payment Declined"
      Message: "Insufficient funds. Please use a different payment method."
      
   ❌ Booking status: "PAYMENT_FAILED"
      
   ✅ Options shown:
      - "Try Different Card"
      - "Cancel Booking"
   ```

---

### Test 4.3: Payment Method Not Supported

**Test ID:** `ERR-PAY-003`  
**Priority:** P2 (Medium)

#### Steps:
1. ✅ **Test International Card (Not Supported):**
   - Enter Amex card: `3782 822463 10005`
   - Click "Pay Now"

2. ✅ **Expected Results:**
   ```
   ❌ Toast: "Card Not Supported"
      Message: "We currently only accept Visa and Mastercard."
      
   ✅ Supported cards shown:
      Icons: 💳 Visa, Mastercard, ATM
   ```

---

## Test Suite 5: Rate Limiting

### Test 5.1: Too Many Requests (429)

**Test ID:** `ERR-RATE-001`  
**Priority:** P1 (High)

#### Steps:
1. ✅ **Spam Search Requests:**
   - Open DevTools → Console
   - Run:
     ```javascript
     // Send 100 requests in 1 second
     for (let i = 0; i < 100; i++) {
       fetch('http://localhost:8000/api/v1/routes/search', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ fromCity: 'HCM', toCity: 'Hanoi', date: '2026-02-01' })
       });
     }
     ```

2. ✅ **Expected Results:**
   ```
   ✅ First 10 requests: Success (200 OK)
   
   ❌ After 10 requests:
      Status: 429 Too Many Requests
      Toast: "Slow Down!"
      Message: "Too many requests. Please wait 60 seconds before trying again."
      
   ✅ Countdown timer shown:
      "You can try again in 58 seconds..."
      
   ✅ After 60s: Requests work again
   ```

---

## Test Suite 6: Error Boundaries (React)

### Test 6.1: Component Crash

**Test ID:** `ERR-BND-001`  
**Priority:** P0 (Critical)

#### Steps:
1. ✅ **Trigger Render Error:**
   - Navigate to Booking page
   - Open DevTools → Console
   - Run:
     ```javascript
     // Simulate component crash
     window.__CRASH_COMPONENT__ = true;
     ```
   - Refresh page

2. ✅ **Expected Results:**
   ```
   ❌ Error Boundary UI shown:
      Title: "Something went wrong"
      Message: "We're sorry, but something unexpected happened."
      
   ✅ Actions:
      - "Reload Page" button
      - "Report Issue" button
      
   ✅ Error logged to monitoring (Sentry/LogRocket)
   
   ❌ Page doesn't completely break (navbar still works)
   ```

---

## Test Suite 7: Toast Notification System

### Test 7.1: Toast Queue (Multiple Errors)

**Test ID:** `ERR-TOAST-001`  
**Priority:** P2 (Medium)

#### Steps:
1. ✅ **Trigger Multiple Errors:**
   - Enable Offline mode
   - Click Search (triggers error 1)
   - Click My Bookings (triggers error 2)
   - Click Profile (triggers error 3)

2. ✅ **Expected Results:**
   ```
   ✅ Toasts appear in queue (not overlapping):
      Toast 1: "No Internet Connection" (shows for 5s)
      Toast 2: Appears after Toast 1 dismisses
      Toast 3: Appears after Toast 2 dismisses
      
   ✅ Max 3 toasts visible at once
   
   ✅ User can dismiss manually (X button)
   ```

---

### Test 7.2: Toast Auto-Dismiss

**Test ID:** `ERR-TOAST-002`  
**Priority:** P2 (Medium)

#### Steps:
1. ✅ **Test Auto-Dismiss Times:**
   - Trigger success toast: "Booking created" → **3s**
   - Trigger info toast: "Session expires in 5 min" → **5s**
   - Trigger error toast: "Payment failed" → **7s**
   - Trigger warning toast: "Slow network detected" → **5s**

2. ✅ **Expected Results:**
   ```
   ✅ Each toast auto-dismisses after correct duration
   
   ✅ User can hover to pause auto-dismiss
   
   ✅ Clicking X dismisses immediately
   ```

---

## Test Suite 8: Accessibility (Error States)

### Test 8.1: Screen Reader Announcements

**Test ID:** `ERR-A11Y-001`  
**Priority:** P1 (High)

#### Steps:
1. ✅ **Enable Screen Reader:**
   - Windows: NVDA
   - Mac: VoiceOver (Cmd+F5)

2. ✅ **Trigger Error:**
   - Submit form with validation errors

3. ✅ **Expected Results:**
   ```
   ✅ Screen reader announces:
      "Error: Please fill in all required fields"
      "Departure city: Error - Please select a departure city"
      
   ✅ Focus moves to first error field
   
   ✅ Error messages have role="alert"
   ```

---

### Test 8.2: Keyboard Navigation (Error Modals)

**Test ID:** `ERR-A11Y-002`  
**Priority:** P1 (High)

#### Steps:
1. ✅ **Test Error Modal:**
   - Trigger 500 error (modal appears)
   - Press `Tab` key

2. ✅ **Expected Results:**
   ```
   ✅ Focus trapped in modal:
      Tab 1: "Reload Page" button
      Tab 2: "Contact Support" link
      Tab 3: "X" close button
      Tab 4: Cycles back to "Reload Page"
      
   ✅ Pressing Esc closes modal
   
   ✅ Focus returns to trigger element after close
   ```

---

## ✅ Test Summary

### Coverage Checklist

- [x] ✅ Network errors (offline, timeout, 503)
- [x] ✅ API errors (400, 401, 403, 404, 500)
- [x] ✅ Form validation (empty fields, invalid formats)
- [x] ✅ Payment errors (timeout, declined, unsupported)
- [x] ✅ Rate limiting (429)
- [x] ✅ Error boundaries (component crashes)
- [x] ✅ Toast notifications (queue, auto-dismiss)
- [x] ✅ Accessibility (screen reader, keyboard nav)

### Test Results Template

```
Test ID: ERR-NET-001
Status: ✅ PASS / ❌ FAIL
Notes: [Any issues or observations]
Screenshot: [Path to screenshot if failed]
Tested By: [Your name]
Date: 2026-01-14
```

---

**Document Owner:** QA Team (Team 6)  
**Review Date:** End of PI 2 Iteration 2-5  
**Next Steps:** Run automated tests → Document issues → Regression testing

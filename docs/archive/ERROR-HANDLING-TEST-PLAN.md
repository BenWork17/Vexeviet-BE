# 🧪 Error Handling - QA Test Plan

## Test Environment Setup

**Required:**
- Chrome DevTools (Network tab)
- React DevTools
- Redux DevTools

**Test Data:**
- Mock booking with seats A1, A2
- Valid user session
- Network throttling presets

---

## Test Suite 1: Error Boundary (Web)

### TC-01: JavaScript Error - Component Level

**Steps:**
1. Navigate to any page
2. Open console
3. Execute: `throw new Error('Test error')`

**Expected:**
- ✅ Error boundary catches error
- ✅ Shows fallback UI with alert icon
- ✅ Shows "Đã xảy ra lỗi" title
- ✅ Shows "Reload" and "Go Home" buttons
- ✅ **Dev mode:** Stack trace visible
- ✅ Console logs error details

**Pass/Fail:** _____

---

### TC-02: Error Boundary - Reload Button

**Setup:** Trigger error (TC-01)

**Steps:**
1. Click "Tải lại trang" button

**Expected:**
- ✅ Page reloads
- ✅ Error cleared
- ✅ App works normally

**Pass/Fail:** _____

---

### TC-03: Error Boundary - Go Home Button

**Setup:** Trigger error (TC-01)

**Steps:**
1. Click "Về trang chủ" button

**Expected:**
- ✅ Navigates to home page
- ✅ Error cleared
- ✅ App works normally

**Pass/Fail:** _____

---

## Test Suite 2: Toast Notifications (Web)

### TC-04: Success Toast

**Steps:**
1. Trigger success action (e.g., complete booking)
2. Observe toast notification

**Expected:**
- ✅ Green toast appears top-right
- ✅ Shows checkmark icon
- ✅ Title and message visible
- ✅ Auto-dismisses after 5 seconds
- ✅ Can manually dismiss with X

**Pass/Fail:** _____

---

### TC-05: Error Toast

**Steps:**
1. Trigger error action (e.g., failed booking)
2. Observe toast notification

**Expected:**
- ✅ Red toast appears top-right
- ✅ Shows X circle icon
- ✅ Title and message visible
- ✅ Auto-dismisses after 7 seconds (longer than success)
- ✅ Can manually dismiss with X

**Pass/Fail:** _____

---

### TC-06: Multiple Toasts

**Steps:**
1. Trigger 3 actions quickly:
   - Success
   - Error
   - Warning

**Expected:**
- ✅ All 3 toasts appear stacked
- ✅ Each has correct color/icon
- ✅ Each auto-dismisses independently
- ✅ No overlap or visual glitches

**Pass/Fail:** _____

---

## Test Suite 3: Network Errors (Web)

### TC-07: No Internet Connection

**Steps:**
1. Open DevTools → Network tab
2. Set throttling to "Offline"
3. Try to load route data

**Expected:**
- ✅ Error toast appears
- ✅ Message: "Không thể kết nối đến máy chủ..."
- ✅ No infinite spinner
- ✅ User can retry

**Pass/Fail:** _____

---

### TC-08: Slow Connection (Timeout)

**Steps:**
1. Mock API to delay 40 seconds
2. Trigger API call

**Expected:**
- ✅ Timeout after 30 seconds
- ✅ Error toast: "Yêu cầu mất quá nhiều thời gian..."
- ✅ Loading state ends
- ✅ User can retry

**Pass/Fail:** _____

---

### TC-09: Server Error (500)

**Steps:**
1. Mock API to return 500 status
2. Trigger API call

**Expected:**
- ✅ Error toast appears
- ✅ Message: "Lỗi máy chủ. Vui lòng thử lại sau."
- ✅ No crash
- ✅ User can retry

**Pass/Fail:** _____

---

## Test Suite 4: Seat Conflict (Web)

### TC-10: Seat Already Booked

**Steps:**
1. Select seats A1, A2
2. Complete booking flow
3. Submit booking (10% chance of error)
4. If no error, retry until error occurs

**Expected:**
- ✅ Error toast appears
- ✅ Message: "Ghế [X] đã được đặt bởi người khác..."
- ✅ Booking form still accessible
- ✅ User can select different seats
- ✅ Can retry booking

**Pass/Fail:** _____

---

## Test Suite 5: State Cleanup (Web)

### TC-11: Booking State Reset on Navigation

**Steps:**
1. Start booking flow
2. Select seats A1, A2 (verify in Redux DevTools)
3. Click browser back button to home
4. Start new booking flow
5. Check Redux state

**Expected:**
- ✅ Selected seats: `[]` (empty array)
- ✅ Total price: `0`
- ✅ Step: `'seat-selection'`
- ✅ No previous booking data

**Pass/Fail:** _____

---

### TC-12: Manual Reset via "Book Another Trip"

**Steps:**
1. Complete successful booking
2. On success page, verify booking data in Redux
3. Click "Đặt vé khác" button
4. Check Redux state

**Expected:**
- ✅ State reset to initial values
- ✅ Navigates to home or search page
- ✅ No pre-selected seats
- ✅ Fresh booking flow

**Pass/Fail:** _____

---

### TC-13: Cleanup on Component Unmount

**Steps:**
1. Navigate to booking page (with `useBookingCleanup`)
2. Select seats A1, A2
3. Navigate to different page (e.g., profile)
4. Check Redux DevTools

**Expected:**
- ✅ Booking state reset
- ✅ Cleanup triggered on unmount
- ✅ Console shows no errors

**Pass/Fail:** _____

---

## Test Suite 6: Retry Logic (Web)

### TC-14: Retry with Backoff - Success After 2nd Attempt

**Steps:**
1. Mock API to fail once, succeed on 2nd attempt
2. Use `retryWithBackoff(() => apiCall(), 3, 1000)`
3. Observe retry behavior

**Expected:**
- ✅ First attempt fails
- ✅ Waits 1 second
- ✅ Second attempt succeeds
- ✅ Returns data successfully
- ✅ Total time: ~1 second

**Pass/Fail:** _____

---

### TC-15: Retry - All Attempts Fail

**Steps:**
1. Mock API to always fail (500 error)
2. Use `retryWithBackoff(() => apiCall(), 3, 1000)`
3. Observe retry behavior

**Expected:**
- ✅ Attempt 1 fails (immediate)
- ✅ Wait 1s → Attempt 2 fails
- ✅ Wait 2s → Attempt 3 fails
- ✅ Throws error after all retries
- ✅ Total time: ~3 seconds (1 + 2)

**Pass/Fail:** _____

---

### TC-16: Retry - Don't Retry Client Errors (4xx)

**Steps:**
1. Mock API to return 404 error
2. Use `retryWithBackoff(() => apiCall(), 3, 1000)`

**Expected:**
- ✅ Attempt 1 fails with 404
- ✅ No retry (client errors not retried)
- ✅ Throws error immediately
- ✅ Total time: < 1 second

**Pass/Fail:** _____

---

## Test Suite 7: Mobile Error Boundary

### TC-17: JavaScript Error - Mobile

**Platform:** iOS / Android

**Steps:**
1. Launch mobile app
2. Navigate to any screen
3. Trigger error: `throw new Error('Test')`

**Expected:**
- ✅ Error boundary catches error
- ✅ Shows error screen with icon
- ✅ Shows "Đã xảy ra lỗi" title
- ✅ Shows "Thử lại" and "Về trang chủ" buttons
- ✅ No crash
- ✅ **Dev:** Error details visible

**Pass/Fail:** _____

---

### TC-18: Mobile Error - Try Again

**Platform:** iOS / Android

**Setup:** Trigger error (TC-17)

**Steps:**
1. Tap "Thử lại" button

**Expected:**
- ✅ Error clears
- ✅ Component re-renders
- ✅ App works normally

**Pass/Fail:** _____

---

### TC-19: Mobile Error - Go Home

**Platform:** iOS / Android

**Setup:** Trigger error (TC-17)

**Steps:**
1. Tap "Về trang chủ" button

**Expected:**
- ✅ Error clears
- ✅ Navigates to home/wallet screen
- ✅ App works normally

**Pass/Fail:** _____

---

## Test Suite 8: Edge Cases

### TC-20: Concurrent API Calls

**Steps:**
1. Trigger 5 API calls simultaneously
2. Make 2 of them fail

**Expected:**
- ✅ All calls execute independently
- ✅ 2 error toasts appear
- ✅ 3 success toasts appear
- ✅ No race conditions
- ✅ State consistent

**Pass/Fail:** _____

---

### TC-21: Error During Booking Payment

**Steps:**
1. Complete booking flow to payment step
2. Mock payment API to fail
3. Submit payment

**Expected:**
- ✅ Error toast appears
- ✅ User not charged (mock only)
- ✅ Booking state NOT saved
- ✅ User can retry or go back
- ✅ No orphaned bookings

**Pass/Fail:** _____

---

### TC-22: Session Expired During Booking

**Steps:**
1. Start booking flow
2. Mock 401 Unauthorized response
3. Continue booking

**Expected:**
- ✅ Error toast: "Phiên đăng nhập đã hết hạn..."
- ✅ Redirects to login (if implemented)
- ✅ Booking data preserved (optional)
- ✅ User can resume after login

**Pass/Fail:** _____

---

## Test Suite 9: Performance

### TC-23: Error Handling Doesn't Block UI

**Steps:**
1. Trigger 10 rapid errors
2. Observe UI responsiveness

**Expected:**
- ✅ UI remains responsive
- ✅ Toasts appear without lag
- ✅ No janky animations
- ✅ Can still interact with app

**Pass/Fail:** _____

---

### TC-24: Memory Leaks - Toast Cleanup

**Steps:**
1. Open Chrome Performance monitor
2. Trigger 100 toasts (auto-dismiss)
3. Wait for all to dismiss
4. Check memory usage

**Expected:**
- ✅ Memory returns to baseline
- ✅ No retained detached DOM nodes
- ✅ No memory leak

**Pass/Fail:** _____

---

## Test Suite 10: Accessibility

### TC-25: Error Boundary - Keyboard Navigation

**Steps:**
1. Trigger error
2. Use Tab key to navigate
3. Press Enter on buttons

**Expected:**
- ✅ Can tab to "Reload" button
- ✅ Can tab to "Go Home" button
- ✅ Enter key activates buttons
- ✅ Focus visible

**Pass/Fail:** _____

---

### TC-26: Toast - Screen Reader

**Steps:**
1. Enable screen reader (NVDA/VoiceOver)
2. Trigger success toast
3. Listen to announcement

**Expected:**
- ✅ Toast content announced
- ✅ Role announced (alert/status)
- ✅ Dismiss button accessible

**Pass/Fail:** _____

---

## Summary

| Category | Total Tests | Passed | Failed |
|----------|-------------|--------|--------|
| Error Boundary (Web) | 3 | | |
| Toast Notifications | 3 | | |
| Network Errors | 3 | | |
| Seat Conflict | 1 | | |
| State Cleanup | 3 | | |
| Retry Logic | 3 | | |
| Mobile Error Boundary | 3 | | |
| Edge Cases | 3 | | |
| Performance | 2 | | |
| Accessibility | 2 | | |
| **TOTAL** | **26** | | |

---

## Bug Report Template

```markdown
### Bug: [Title]

**Test Case:** TC-XX  
**Severity:** Critical / High / Medium / Low  
**Platform:** Web / iOS / Android

**Steps to Reproduce:**
1. ...
2. ...

**Expected Result:**
- ...

**Actual Result:**
- ...

**Screenshot:** [Attach]

**Console Logs:**
```
[Paste here]
```

**Environment:**
- Browser/Device: ...
- OS: ...
- App Version: ...
```

---

## Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| QA Lead | | | |
| Developer | Antigravity AI | 2026-01-14 | ✓ |
| Product Owner | | | |

---

**Status:** Ready for Testing  
**Estimated Test Time:** 3-4 hours  
**Priority:** High (Blocks PI 2 completion)

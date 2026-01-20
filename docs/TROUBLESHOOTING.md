# Quick Test - Direct to User Service

Test directly on User Service (port 3001) to verify it works:

```bash
# Test register directly
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"method":"email","email":"direct@test.com","password":"Test1234","firstName":"Direct","lastName":"Test","agreeToTerms":true}'
```

If this works (returns 201 with user data), then the issue is with API Gateway proxy.

If this also hangs/times out, the issue is in User Service itself (likely database connection or bcrypt blocking).

**Common causes of timeout:**
1. Database connection not established (DATABASE_URL env var missing)
2. Bcrypt password hashing blocking (should be async)
3. Email/SMS service blocking
4. Missing await on async operations

**Check User Service logs** - it should print:
- `🚀 User service running on port 3001`
- `✅ Database connected successfully` (if database module initializes)

**If User Service works directly but Gateway times out:**
- Restart API Gateway
- Check proxy configuration
- Check network/firewall

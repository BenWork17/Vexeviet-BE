# Refactor Plan - Align with SAFe Backend Detailed Specs

> **Created:** 2026-01-19  
> **Target:** End of Week 4 (before Iteration 1-3)  
> **Status:** In Progress

---

## 🎯 Objectives

Refactor Iteration 1-2 deliverables để tuân theo SAFe-Backend-Detailed-Specs.md:
1. ✅ Folder structure alignment
2. ✅ API contracts compliance
3. ✅ Missing features implementation
4. ✅ Update docs (PostgreSQL → MySQL)

---

## 📋 Tasks Breakdown

### Task 1: Update Documentation (PostgreSQL → MySQL)

**Files to update:**
- [ ] `docs/SAFe-Plan-Backend.md` - Line 124: PostgreSQL → MySQL
- [ ] `docs/SAFe-Backend-Detailed-Specs.md` - All PostgreSQL references
- [ ] `docs/DATABASE-SETUP.md` - Already MySQL ✓
- [ ] Create `docs/adr/001-mysql-vs-postgresql.md` (Architecture Decision Record)

**Estimated Time:** 30 minutes

---

### Task 2: Folder Structure Alignment

**Current structure:**
```
services/user-service/src/
├── controllers/
├── services/
├── repositories/
├── middlewares/
├── validators/
├── routes/
└── types/
```

**Target structure (per Detailed Specs):**
```
services/user-service/src/
├── controllers/
├── services/
├── repositories/
├── models/           ⚠️ ADD
├── middlewares/
├── validators/
├── utils/            ⚠️ ADD
├── config/           ⚠️ ADD
├── types/
├── events/           ⚠️ ADD
├── routes/           ✓ KEEP (good practice)
└── tests/            ⚠️ ADD
    ├── unit/
    ├── integration/
    └── e2e/
```

**Subtasks:**
- [ ] Create `src/models/` folder + index.ts
- [ ] Create `src/utils/` (crypto.ts, email.ts, sms.ts)
- [ ] Create `src/config/` (database.ts, redis.ts, index.ts)
- [ ] Create `src/events/` (user.events.ts, publisher.ts)
- [ ] Create `src/tests/` structure
- [ ] Move route-related code to proper places

**Estimated Time:** 1 hour

---

### Task 3: API Contracts Alignment

#### 3.1 Register API - Add Missing Fields

**Current:**
```typescript
interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}
```

**Target (per Detailed Specs line 291-299):**
```typescript
interface RegisterRequest {
  method: "email" | "phone";     // ⚠️ ADD
  email?: string;
  phone?: string;
  password: string;
  firstName: string;
  lastName: string;
  agreeToTerms: boolean;         // ⚠️ ADD
}
```

**Subtasks:**
- [ ] Update `services/user-service/src/validators/auth.validator.ts`
- [ ] Update `services/user-service/src/services/auth.service.ts`
- [ ] Update `services/user-service/src/controllers/auth.controller.ts`
- [ ] Update Prisma schema (add `registrationMethod`, `termsAcceptedAt`)
- [ ] Create migration

**Estimated Time:** 1 hour

---

#### 3.2 Add OTP Verification Flow

**Acceptance Criteria AC3:** OTP sent to email/phone within 30 seconds

**Implementation:**
- [ ] Create `src/services/otp.service.ts`
- [ ] Create `src/utils/email.ts` (Mailhog integration)
- [ ] Create `src/utils/sms.ts` (stub for now)
- [ ] Update User model: add `verificationCode`, `verificationCodeExpiry`
- [ ] Add endpoint: `POST /api/v1/auth/verify-otp`
- [ ] Update register flow to send OTP
- [ ] Add Prisma migration

**Estimated Time:** 2 hours

---

### Task 4: Kafka Events Integration (Stub)

**Acceptance Criteria AC8:** Event published: UserRegistered (to Kafka)

**Implementation (stub for now, full implementation in PI 2):**
- [ ] Create `src/events/user.events.ts` (event types)
- [ ] Create `src/events/publisher.ts` (Kafka producer stub)
- [ ] Add `publishUserRegisteredEvent()` call in auth.service
- [ ] Update docker-compose.yml (ensure Kafka is configured)

**Estimated Time:** 1 hour

---

### Task 5: Missing Acceptance Criteria

#### AC4: Rate limit 5 registrations per IP per hour
- [ ] Update `apps/api-gateway/src/middlewares/rate-limiter.middleware.ts`
- [ ] Add endpoint-specific rate limits
- [ ] Test with Postman

#### AC5: User status "PENDING_VERIFICATION"
- [ ] Update Prisma schema: add `status` enum
- [ ] Update registration logic
- [ ] Create migration

**Estimated Time:** 45 minutes

---

### Task 6: Add Missing Utility Files

**Per Detailed Specs (line 34-36):**
- [ ] `src/utils/crypto.ts` - bcrypt wrapper, token generation
- [ ] `src/utils/email.ts` - Email service (Mailhog)
- [ ] `src/utils/sms.ts` - SMS service (stub)

**Estimated Time:** 1 hour

---

### Task 7: Configuration Files

**Per Detailed Specs (line 37-40):**
- [ ] `src/config/database.ts` - Prisma config
- [ ] `src/config/redis.ts` - Redis config
- [ ] `src/config/index.ts` - Export all configs

**Estimated Time:** 30 minutes

---

### Task 8: Models Layer

**Per Detailed Specs (line 23-25):**
- [ ] `src/models/user.model.ts` - User entity/DTO
- [ ] `src/models/session.model.ts` - Session entity
- [ ] `src/models/index.ts` - Export all models

**Purpose:** Decouple Prisma types from business logic

**Estimated Time:** 45 minutes

---

### Task 9: Update Tests

- [ ] Create `src/tests/unit/auth.service.test.ts`
- [ ] Create `src/tests/integration/auth.api.test.ts`
- [ ] Add Jest configuration
- [ ] Run tests: `pnpm test`

**Estimated Time:** 2 hours

---

### Task 10: Documentation Updates

- [ ] Update `docs/ITERATION-1-2-COMPLETE.md` with refactor notes
- [ ] Create `docs/API-CONTRACTS.md` (detailed API docs)
- [ ] Update AGENTS.md with new folder structure
- [ ] Update README.md

**Estimated Time:** 45 minutes

---

## 🗓️ Implementation Order (Priority)

### Phase 1: Critical (Do First) - 3 hours
1. ✅ Task 1: Update docs (PostgreSQL → MySQL)
2. ✅ Task 2: Folder structure
3. ✅ Task 3.1: API contracts (register fields)

### Phase 2: Important (Do Next) - 3 hours
4. ✅ Task 5: Missing acceptance criteria
5. ✅ Task 6: Utility files
6. ✅ Task 7: Config files
7. ✅ Task 8: Models layer

### Phase 3: Nice to Have (If Time Permits) - 4 hours
8. ⚠️ Task 3.2: OTP verification (can defer to Iteration 1-3)
9. ⚠️ Task 4: Kafka events stub (can defer to Iteration 1-3)
10. ⚠️ Task 9: Unit tests (can defer to Iteration 1-3)

### Phase 4: Always Do Last
11. ✅ Task 10: Documentation

---

## ✅ Acceptance Criteria for Refactor

- [ ] All files follow SAFe-Backend-Detailed-Specs.md structure
- [ ] Register API matches Detailed Specs contract
- [ ] PostgreSQL → MySQL in all docs
- [ ] ADR created for database choice
- [ ] `pnpm type-check` passes
- [ ] `pnpm lint` passes
- [ ] All services start without errors
- [ ] Postman tests pass

---

## 📊 Progress Tracking

| Task | Status | Time Spent | Assignee |
|------|--------|------------|----------|
| Task 1 | 🔴 Not Started | 0h | - |
| Task 2 | 🔴 Not Started | 0h | - |
| Task 3.1 | 🔴 Not Started | 0h | - |
| Task 3.2 | 🔴 Not Started | 0h | - |
| Task 4 | 🔴 Not Started | 0h | - |
| Task 5 | 🔴 Not Started | 0h | - |
| Task 6 | 🔴 Not Started | 0h | - |
| Task 7 | 🔴 Not Started | 0h | - |
| Task 8 | 🔴 Not Started | 0h | - |
| Task 9 | 🔴 Not Started | 0h | - |
| Task 10 | 🔴 Not Started | 0h | - |

**Total Estimated:** ~12 hours  
**Completed:** 0%

---

## 🚀 Next Steps

1. Review this plan
2. Start with Phase 1 (Critical tasks)
3. Create feature branch: `refactor/align-with-detailed-specs`
4. Implement task by task
5. Test after each task
6. Update progress tracking
7. Create PR when done

---

**Document Owner:** Backend Team Lead  
**Last Updated:** 2026-01-19  
**Status:** Ready for execution

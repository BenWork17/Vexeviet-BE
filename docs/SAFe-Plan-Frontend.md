# KẾ HOẠCH SAFe FRAMEWORK - FRONTEND TEAMS (Web + Mobile)

## THÔNG TIN CHUNG

**Agile Release Train (ART):** VeXeViet Platform Train  
**Teams:** Team 1 (Web Frontend) + Team 2 (Mobile)  
**Timeline:** 5 Program Increments (PI) × 10 tuần = 50 tuần (~12 tháng)  
**Configuration:** Portfolio SAFe  

---

## TEAM STRUCTURE

### Team 1: Web Frontend Team (8 người)
- 1 Product Owner
- 1 Scrum Master  
- 5 Frontend Developers (React/Next.js)
- 1 UX/UI Designer

### Team 2: Mobile Team (7 người)
- 1 Product Owner
- 1 Scrum Master
- 4 Mobile Developers (React Native)
- 1 Mobile UX Designer

**Shared Resources:**
- 1 Design Lead (part-time, chia sẻ với cả 2 teams)
- System Architect (support cả Web & Mobile)

---

## PROGRAM INCREMENT ROADMAP (5 PIs)

### PI 1: Foundation & MVP Core (Tuần 1-10)
**Theme:** "Xây nền móng vững chắc"

#### PI Objectives
1. **Setup Development Infrastructure** (WSJF: 35)
   - Repository setup (monorepo với Turborepo/Nx)
   - CI/CD pipelines (GitHub Actions)
   - Dev/Staging/Prod environments
   - Design system foundation (Figma + Storybook)

2. **Core User Journeys - Search & Browse** (WSJF: 40)
   - Trang chủ với search box
   - Tìm kiếm tuyến đường (origin → destination, date)
   - Danh sách kết quả tìm kiếm
   - Filter & sorting (giá, giờ khởi hành, loại xe)
   - Chi tiết tuyến xe (ghế, giá, điểm đón/trả)

3. **Authentication & User Profile** (WSJF: 28)
   - Đăng ký/Đăng nhập (Email/Phone + OTP)
   - Social login (Google, Facebook)
   - User profile management
   - Booking history view

#### Features by Team

**Web Team - PI 1 Features:**
- FE-101: Homepage with hero search
- FE-102: Route search page with filters
- FE-103: Route detail page  
- FE-104: User authentication flows
- FE-105: User dashboard & profile
- FE-106: Responsive design (mobile-first web)

**Mobile Team - PI 1 Features:**
- MOB-101: App shell & navigation
- MOB-102: Onboarding screens
- MOB-103: Search routes screen
- MOB-104: Route list & filters
- MOB-105: Authentication (Biometric + OTP)
- MOB-106: User profile screen

#### Iteration Breakdown (PI 1)

**Iteration 1-1 (Tuần 1-2):**
- Setup infrastructure
- Design system kickoff
- Homepage skeleton (Web)
- App shell (Mobile)

**Iteration 1-2 (Tuần 3-4):**
- Search functionality (Web)
- Search UI (Mobile)
- API integration layer

**Iteration 1-3 (Tuần 5-6):**
- Route listing & filters (Web)
- Route listing & filters (Mobile)
- State management setup (Redux Toolkit/Zustand)

**Iteration 1-4 (Tuần 7-8):**
- Route detail page (Web)
- Route detail screen (Mobile)
- Authentication flows

**Iteration 1-5 (Tuần 9-10):**
- User dashboard (Web & Mobile)
- Bug fixes & polish
- Performance optimization

**IP Iteration (Tuần 11-12):**
- Accessibility improvements (WCAG 2.1 AA)
- Unit test coverage → 70%
- E2E test suite setup (Playwright/Detox)
- PI 2 planning

#### Success Metrics (PI 1)
- ✅ Homepage load time < 2s (Web), < 1s (Mobile)
- ✅ Search results render < 500ms
- ✅ Test coverage ≥ 70%
- ✅ Zero critical bugs
- ✅ Design system 40+ components

---

### PI 2: Booking & Payment Flow (Tuần 11-20)
**Theme:** "Hoàn thiện trải nghiệm đặt vé"

#### PI Objectives
1. **Seat Selection & Booking Flow** (WSJF: 45)
   - Interactive seat map (2D visualization)
   - Seat availability real-time
   - Passenger information form
   - Add-ons (insurance, meal)
   - Booking confirmation

2. **Payment Integration** (WSJF: 42)
   - Multiple payment methods (ATM, Credit Card, E-Wallet)
   - Payment gateway integration (VNPay, Momo, ZaloPay)
   - Payment status tracking
   - E-ticket generation (QR code)

3. **Booking Management** (WSJF: 30)
   - View booking details
   - Cancel/Modify booking
   - Download/Share ticket
   - Booking notifications

#### Features by Team

**Web Team - PI 2 Features:**
- FE-201: Seat selection UI with SVG map
- FE-202: Multi-step booking form
- FE-203: Payment integration (Checkout page)
- FE-204: E-ticket display & download
- FE-205: Booking management dashboard
- FE-206: Booking modification flow

**Mobile Team - PI 2 Features:**
- MOB-201: Interactive seat selection (touch gestures)
- MOB-202: Passenger info form (auto-fill)
- MOB-203: Payment methods screen
- MOB-204: QR code ticket (scannable)
- MOB-205: Push notifications setup
- MOB-206: Ticket wallet

#### Iteration Breakdown (PI 2)

**Iteration 2-1 (Tuần 11-12):**
- Seat selection UI (Web & Mobile)
- Seat availability polling

**Iteration 2-2 (Tuần 13-14):**
- Booking form (Web & Mobile)
- Form validation & error handling

**Iteration 2-3 (Tuần 15-16):**
- Payment gateway integration (Web)
- Payment gateway integration (Mobile)
- Payment status webhook handling

**Iteration 2-4 (Tuần 17-18):**
- E-ticket generation (Web & Mobile)
- QR code implementation
- Download/Share functionality

**Iteration 2-5 (Tuần 19-20):**
- Booking management (Web & Mobile)
- Cancel/Modify flows
- Edge case handling

**IP Iteration (Tuần 21-22):**
- Security audit (PCI DSS compliance)
- Performance testing (100 concurrent bookings)
- Accessibility improvements
- PI 3 planning

#### Success Metrics (PI 2)
- ✅ Booking completion rate > 85%
- ✅ Payment success rate > 95%
- ✅ Average booking time < 3 minutes
- ✅ Zero payment security incidents
- ✅ E-ticket generation < 2s

---

### PI 3: Enhanced UX & Offline Support (Tuần 21-30)
**Theme:** "Nâng cao trải nghiệm người dùng"

#### PI Objectives
1. **Offline-First Architecture** (WSJF: 38)
   - Service Worker implementation (Web)
   - Local storage strategy
   - Offline ticket viewing
   - Sync when online

2. **Advanced UI Features** (WSJF: 35)
   - Dark mode support
   - Multi-language (Vietnamese/English)
   - Skeleton screens & loading states
   - Optimistic UI updates
   - Animations & micro-interactions

3. **Notifications & Alerts** (WSJF: 28)
   - Push notifications (Mobile)
   - Web push notifications
   - Email notifications
   - SMS reminders (trip countdown)
   - In-app notifications center

#### Features by Team

**Web Team - PI 3 Features:**
- FE-301: Progressive Web App (PWA) setup
- FE-302: Offline ticket cache
- FE-303: Dark mode toggle
- FE-304: i18n implementation (react-i18next)
- FE-305: Notification center UI
- FE-306: Skeleton screens library

**Mobile Team - PI 3 Features:**
- MOB-301: Offline ticket storage (SQLite/Realm)
- MOB-302: Push notification integration (FCM)
- MOB-303: Dark mode with system preference
- MOB-304: Localization (i18n)
- MOB-305: Notification center
- MOB-306: Gesture-based navigation

#### Iteration Breakdown (PI 3)

**Iteration 3-1 (Tuần 21-22):**
- PWA setup & Service Worker (Web)
- Offline storage (Mobile)

**Iteration 3-2 (Tuần 23-24):**
- Dark mode implementation (Web & Mobile)
- Theme switcher UI

**Iteration 3-3 (Tuần 25-26):**
- i18n setup (Web & Mobile)
- Translation management workflow

**Iteration 3-4 (Tuần 27-28):**
- Push notifications (Web & Mobile)
- Notification center UI

**Iteration 3-5 (Tuần 29-30):**
- Animations & transitions
- Skeleton screens
- Performance optimization

**IP Iteration (Tuần 31-32):**
- Offline testing scenarios
- Accessibility audit (screen readers)
- Performance budget review
- PI 4 planning

#### Success Metrics (PI 3)
- ✅ PWA installable on 100% devices
- ✅ Offline ticket access 100% reliable
- ✅ Push notification opt-in > 40%
- ✅ i18n coverage 100% UI strings
- ✅ Animation frame rate ≥ 60fps

---

### PI 4: AI-Powered Features & Personalization (Tuần 31-40)
**Theme:** "Trí tuệ nhân tạo nâng tầm trải nghiệm"

#### PI Objectives
1. **AI Chatbot Integration** (WSJF: 40)
   - In-app chatbot UI (Web & Mobile)
   - Voice input support (Mobile)
   - Booking assistance via chat
   - FAQ automation

2. **Personalized Recommendations** (WSJF: 36)
   - Recent searches widget
   - Favorite routes
   - Personalized route suggestions
   - Price alerts & notifications

3. **Smart Search** (WSJF: 32)
   - Auto-complete with ML
   - Search suggestions based on history
   - Fuzzy search (typo tolerance)
   - Natural language queries

#### Features by Team

**Web Team - PI 4 Features:**
- FE-401: Chatbot widget (floating button)
- FE-402: Recommendation carousel
- FE-403: Smart search with autocomplete
- FE-404: Price alert subscription UI
- FE-405: Personalization settings
- FE-406: Analytics tracking (GA4/Mixpanel)

**Mobile Team - PI 4 Features:**
- MOB-401: Chatbot screen with voice input
- MOB-402: Recommendations feed (Home tab)
- MOB-403: Smart search with voice
- MOB-404: Price drop notifications
- MOB-405: Favorites & saved searches
- MOB-406: User behavior tracking

#### Iteration Breakdown (PI 4)

**Iteration 4-1 (Tuần 31-32):**
- Chatbot UI integration (Web & Mobile)
- WebSocket connection for real-time chat

**Iteration 4-2 (Tuần 33-34):**
- Voice input (Mobile)
- Chatbot conversation flow

**Iteration 4-3 (Tuần 35-36):**
- Recommendation engine integration (Web & Mobile)
- Personalization API calls

**Iteration 4-4 (Tuần 37-38):**
- Smart search implementation (Web & Mobile)
- Auto-complete API integration

**Iteration 4-5 (Tuần 39-40):**
- Price alerts (Web & Mobile)
- Analytics dashboard integration

**IP Iteration (Tuần 41-42):**
- A/B testing setup (chatbot variations)
- ML model performance review
- Privacy compliance (GDPR-like)
- PI 5 planning

#### Success Metrics (PI 4)
- ✅ Chatbot usage > 30% users
- ✅ Chatbot resolution rate > 70%
- ✅ Recommendation CTR > 15%
- ✅ Voice search accuracy > 85%
- ✅ Price alert conversion > 10%

---

### PI 5: Optimization & Scale Preparation (Tuần 41-50)
**Theme:** "Tối ưu hóa và sẵn sàng tăng trưởng"

#### PI Objectives
1. **Performance Optimization** (WSJF: 42)
   - Code splitting & lazy loading
   - Image optimization (WebP, AVIF)
   - Bundle size reduction (-30%)
   - CDN integration
   - Database query optimization

2. **Advanced Features** (WSJF: 35)
   - Multi-city trips (round-trip)
   - Group booking
   - Corporate accounts
   - Loyalty program UI
   - Referral system

3. **Production Readiness** (WSJF: 40)
   - Error monitoring (Sentry)
   - Performance monitoring (New Relic/Datadog)
   - Feature flags (LaunchDarkly/Unleash)
   - Chaos engineering tests
   - Load testing (10k concurrent users)

#### Features by Team

**Web Team - PI 5 Features:**
- FE-501: Code splitting per route
- FE-502: Image lazy loading & srcset
- FE-503: Multi-city booking flow
- FE-504: Group booking UI
- FE-505: Loyalty dashboard
- FE-506: Error boundary & fallback UI

**Mobile Team - PI 5 Features:**
- MOB-501: App size reduction (< 20MB)
- MOB-502: Image caching strategy
- MOB-503: Round-trip booking
- MOB-504: Group booking flow
- MOB-505: Loyalty card screen
- MOB-506: Crash reporting (Firebase Crashlytics)

#### Iteration Breakdown (PI 5)

**Iteration 5-1 (Tuần 41-42):**
- Performance audit (Lighthouse)
- Code splitting implementation (Web & Mobile)

**Iteration 5-2 (Tuần 43-44):**
- Image optimization pipeline
- CDN setup & configuration

**Iteration 5-3 (Tuần 45-46):**
- Multi-city booking (Web & Mobile)
- Complex routing logic

**Iteration 5-4 (Tuần 47-48):**
- Group booking & corporate accounts (Web & Mobile)
- Loyalty program integration

**Iteration 5-5 (Tuần 49-50):**
- Monitoring & observability setup
- Load testing & optimization

**IP Iteration (Tuần 51-52):**
- Final security audit
- Production checklist review
- Launch readiness assessment
- PI 6 planning (Scale phase)

#### Success Metrics (PI 5)
- ✅ Lighthouse score > 90 (all categories)
- ✅ Bundle size < 200KB (Web), < 20MB (Mobile)
- ✅ Time to Interactive < 3s
- ✅ Crash rate < 0.1% (Mobile)
- ✅ Load test passed (10k concurrent users)

---

## CROSS-PI INITIATIVES (Chạy song song suốt 5 PIs)

### 1. Design System Evolution
**PI 1:** Foundation (40 components)  
**PI 2:** Expansion (80 components)  
**PI 3:** Advanced patterns (120 components)  
**PI 4:** Animation library  
**PI 5:** Dark mode variants  

### 2. Test Automation
**PI 1:** Unit tests 70% coverage  
**PI 2:** E2E critical flows (10 tests)  
**PI 3:** Visual regression tests  
**PI 4:** Performance tests  
**PI 5:** Chaos testing  

### 3. Accessibility (WCAG 2.1 AA)
**PI 1:** Keyboard navigation  
**PI 2:** Screen reader support  
**PI 3:** Color contrast audit  
**PI 4:** ARIA labels 100%  
**PI 5:** WCAG AAA (selected flows)  

### 4. Documentation
**PI 1:** Component docs (Storybook)  
**PI 2:** API integration guide  
**PI 3:** Developer handbook  
**PI 4:** User guide  
**PI 5:** Runbook & troubleshooting  

---

## DEPENDENCIES & RISKS

### Dependencies on Backend
- **PI 1:** Search API, Auth API, User API
- **PI 2:** Booking API, Payment API, Notification API
- **PI 3:** Offline data sync API
- **PI 4:** AI services APIs (Chatbot, Recommendations)
- **PI 5:** Analytics API, Loyalty API

**Mitigation:** Mock APIs early, contract testing, parallel development

### Dependencies on AI Team
- **PI 4:** Chatbot service, Recommendation engine, Smart search model
- **PI 5:** Pricing optimization API

**Mitigation:** API-first approach, fallback to rule-based logic

### Technical Risks
| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| React Native performance issues | High | Medium | Profiling, native modules, Hermes engine |
| Third-party API downtime | Medium | Low | Retry logic, circuit breakers, fallbacks |
| Browser compatibility | Medium | Medium | Progressive enhancement, polyfills |
| App store rejection | High | Low | Pre-submission review, compliance check |
| GDPR/Privacy violations | High | Low | Legal review, privacy-by-design |

---

## KEY CEREMONIES (Per PI)

### PI Planning (2 ngày đầu mỗi PI)
- Day 1: Business context, Vision, Architecture
- Day 2: Team breakouts, Draft PI Objectives, Confidence vote

### Iteration Planning (Mỗi 2 tuần)
- Review PI objectives
- Select stories from backlog (WSJF)
- Estimate & commit

### System Demo (Cuối mỗi iteration)
- Integrated demo (Web + Mobile)
- Stakeholder feedback

### Inspect & Adapt (Cuối mỗi PI)
- Demo toàn hệ thống
- Quantitative & qualitative review
- Problem-solving workshop
- Retrospective

### Daily Standup
- 15 phút mỗi sáng
- What did, what will do, blockers

---

## TOOLS & TECHNOLOGY STACK

### Web Frontend
- **Framework:** React 18 + Next.js 14 (App Router)
- **Language:** TypeScript 5
- **State:** Redux Toolkit / Zustand
- **Styling:** Tailwind CSS + CSS Modules
- **Testing:** Vitest, React Testing Library, Playwright
- **Build:** Vite / Turbopack
- **PWA:** Workbox

### Mobile
- **Framework:** React Native 0.73+
- **Language:** TypeScript 5
- **Navigation:** React Navigation 6
- **State:** Redux Toolkit / Zustand
- **Styling:** StyleSheet + Restyle
- **Testing:** Jest, Detox
- **Build:** EAS (Expo Application Services)
- **Push:** Firebase Cloud Messaging

### Shared
- **Design System:** Storybook 8
- **Monorepo:** Turborepo / Nx
- **Version Control:** Git + GitHub
- **CI/CD:** GitHub Actions
- **Monitoring:** Sentry, Datadog
- **Analytics:** Google Analytics 4, Mixpanel

---

## METRICS & REPORTING

### Velocity Tracking
- Story points completed per iteration
- Predictability (planned vs actual)
- Trend analysis across PIs

### Quality Metrics
- Test coverage (target: 80%)
- Bug escape rate (< 5%)
- Mean Time to Resolve (MTTR < 24h)
- Technical debt ratio (< 10%)

### Performance Metrics
- Core Web Vitals (LCP, FID, CLS)
- App startup time (< 2s)
- Memory usage (< 200MB)
- Battery consumption

### Business Metrics
- Feature adoption rate
- User engagement (DAU/MAU)
- Conversion funnel
- NPS score

### Reporting Cadence
- **Daily:** Standup updates
- **Bi-weekly:** Iteration review dashboard
- **Per PI:** Executive summary report
- **Quarterly:** OKR review

---

## SUCCESS CRITERIA (End of PI 5)

### Functional
- ✅ All core user journeys implemented (Search → Book → Pay → Travel)
- ✅ PWA installable on iOS & Android
- ✅ Offline ticket viewing 100% functional
- ✅ Multi-language support (VN/EN)
- ✅ AI chatbot operational (70%+ resolution)

### Non-Functional
- ✅ Lighthouse score > 90
- ✅ WCAG 2.1 AA compliant
- ✅ Zero critical security vulnerabilities
- ✅ Load tested for 10k concurrent users
- ✅ 99.9% uptime (3 nines)

### Team Health
- ✅ Team velocity stable (±10% variation)
- ✅ Employee satisfaction > 4/5
- ✅ Knowledge sharing sessions (2/month)
- ✅ Zero burnout incidents

---

## NEXT STEPS (Post PI 5)

1. **Launch Preparation:** Beta testing, marketing, soft launch
2. **PI 6-10:** Scale phase (new cities, features, optimizations)
3. **Continuous Improvement:** A/B testing, user feedback loops
4. **Innovation Sprints:** Explore AR seat selection, VR bus tours, blockchain ticketing

---

**Document Owner:** Product Management (Frontend)  
**Last Updated:** January 12, 2026  
**Status:** Ready for PI Planning 1  
**Approval Required:** RTE, System Architect, Frontend Tech Leads

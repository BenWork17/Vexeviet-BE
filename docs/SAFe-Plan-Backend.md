# KẾ HOẠCH SAFe FRAMEWORK - BACKEND TEAMS (Microservices)

## THÔNG TIN CHUNG

**Agile Release Train (ART):** VeXeViet Platform Train  
**Teams:** Team 3 (Core Services) + Team 4 (Payment & Integration) + Team 6 (QA & DevOps)  
**Timeline:** 5 Program Increments (PI) × 10 tuần = 50 tuần (~12 tháng)  
**Configuration:** Portfolio SAFe  

---

## TEAM STRUCTURE

### Team 3: Core Services Team (9 người)
- 1 Product Owner
- 1 Scrum Master
- 6 Backend Developers (Microservices)
- 1 API Designer

### Team 4: Payment & Integration Team (8 người)
- 1 Product Owner
- 1 Scrum Master
- 5 Backend Developers
- 1 Integration Specialist

### Team 6: QA & DevOps Team (7 người)
- 1 Product Owner
- 1 Scrum Master
- 3 QA Engineers (Automation)
- 2 DevOps Engineers

**Shared Resources:**
- 1 System Architect (full-time)
- 1 Database Administrator (part-time)
- 1 Security Engineer (part-time)
- Data Team (2-3 người) - data warehouse, analytics

---

## MICROSERVICES ARCHITECTURE

### Core Microservices
1. **User Service** - Authentication, profiles, preferences
2. **Search Service** - Route search, filtering, availability
3. **Booking Service** - Seat selection, reservations, modifications
4. **Payment Service** - Payment processing, refunds, wallets
5. **Route Service** - Routes, schedules, bus operators
6. **Notification Service** - Email, SMS, push notifications
7. **Review Service** - Ratings, reviews, feedback
8. **Partner Service** - Bus operator management, APIs
9. **Analytics Service** - Business intelligence, reporting

### Supporting Infrastructure
- **API Gateway** - Kong / AWS API Gateway
- **Service Mesh** - Istio (optional for later phases)
- **Message Queue** - RabbitMQ / Kafka
- **Cache** - Redis
- **Databases** - MySQL 8.0+ (transactional), MongoDB (flexible schema, optional)
- **Search Engine** - Elasticsearch
- **Object Storage** - S3 / MinIO

---

## PROGRAM INCREMENT ROADMAP (5 PIs)

### PI 1: Foundation & Core Services (Tuần 1-10)
**Theme:** "Xây dựng nền tảng vững chắc"

#### PI Objectives
1. **Infrastructure Setup** (WSJF: 45)
   - Kubernetes cluster (EKS/GKE/AKS)
   - CI/CD pipelines (Jenkins/GitLab CI/GitHub Actions)
   - Monitoring stack (Prometheus + Grafana)
   - Logging (ELK stack / Loki)
   - Service mesh evaluation

2. **Core Microservices MVP** (WSJF: 50)
   - User Service (Auth, Profile)
   - Route Service (CRUD routes, schedules)
   - Search Service (Basic search algorithm)
   - Booking Service (Seat reservation logic)

3. **API Gateway & Security** (WSJF: 38)
   - API Gateway setup (Kong)
   - JWT authentication
   - Rate limiting
   - API documentation (OpenAPI/Swagger)
   - CORS configuration

#### Features by Team

**Team 3 (Core Services) - PI 1:**
- BE-101: User Service - Registration, Login, Profile CRUD
- BE-102: Route Service - Routes, Schedules, Operators CRUD
- BE-103: Search Service - Basic search by origin/destination/date
- BE-104: Booking Service - Create booking, seat selection logic
- BE-105: Shared libraries - Error handling, logging, config
- **BE-106: BusTemplate & Seat Service** - Master data cho layout ghế các loại xe
- **BE-107: Seat Availability API** - Real-time seat availability với BusTemplate

**Team 4 (Payment & Integration) - PI 1:**
- BE-151: API Gateway setup & configuration
- BE-152: Authentication middleware (JWT)
- BE-153: Payment Service skeleton (no integrations yet)
- BE-154: External API client templates
- BE-155: Database connection pooling

**Team 6 (QA & DevOps) - PI 1:**
- BE-181: Kubernetes cluster setup (3 environments: Dev/Staging/Prod)
- BE-182: CI/CD pipelines (build, test, deploy)
- BE-183: Monitoring (Prometheus, Grafana dashboards)
- BE-184: Centralized logging (ELK stack)
- BE-185: Test automation framework (Postman/Newman, k6)

#### Iteration Breakdown (PI 1)

**Iteration 1-1 (Tuần 1-2):**
- Kubernetes cluster setup
- Repository structure (monorepo with microservices)
- Docker images & Helm charts
- User Service skeleton

**Iteration 1-2 (Tuần 3-4):**
- User Service - Auth endpoints (register, login, refresh token)
- API Gateway basic routing
- MySQL setup with migrations (Prisma)

**Iteration 1-3 (Tuần 5-6):**
- Route Service - CRUD operations
- Search Service - Basic search logic
- Redis cache integration
- **BusTemplate & Seat Master Data** - Schema và seed data cho các loại xe

**Iteration 1-4 (Tuần 7-8):**
- Booking Service - Seat reservation
- Booking Service - Concurrency handling (pessimistic locking)
- **Seat Availability API** - GET /api/v1/seats/availability
- Message queue setup (RabbitMQ)

**Iteration 1-5 (Tuần 9-10):**
- API documentation (Swagger UI)
- Integration tests (Postman collections)
- Performance baseline testing

**IP Iteration (Tuần 11-12):**
- Security audit (OWASP Top 10 check)
- Load testing (1k concurrent users)
- Database optimization (indexes, query plans)
- PI 2 planning

#### Success Metrics (PI 1)
- ✅ All core services deployed to Staging
- ✅ API response time p95 < 500ms
- ✅ 100% uptime in Dev/Staging
- ✅ Zero critical vulnerabilities
- ✅ Test coverage > 70%

---

### PI 2: Payment Integration & Advanced Booking (Tuần 11-20)
**Theme:** "Hoàn thiện giao dịch thanh toán"

#### PI Objectives
1. **Payment Gateway Integration** (WSJF: 50)
   - VNPay integration (ATM, Credit Card)
   - Momo integration (E-Wallet)
   - ZaloPay integration (E-Wallet)
   - Payment webhook handling
   - Refund processing

2. **Advanced Booking Features** (WSJF: 42)
   - Multi-seat booking
   - Booking modification (change seat, date)
   - Booking cancellation with refund
   - Seat hold mechanism (15-minute timer)
   - Overbooking prevention

3. **Notification Service** (WSJF: 35)
   - Email service (SendGrid/AWS SES)
   - SMS service (Twilio/SMSAPI.vn)
   - Push notification service (FCM)
   - Notification templates
   - Retry logic & dead letter queue

#### Features by Team

**Team 3 (Core Services) - PI 2:**
- BE-201: Booking Service - Multi-seat booking
- BE-202: Booking Service - Modification & cancellation logic
- BE-203: Booking Service - Seat hold with TTL (Redis)
- BE-204: User Service - Booking history API
- BE-205: Search Service - Seat availability aggregation

**Team 4 (Payment & Integration) - PI 2:**
- BE-251: Payment Service - VNPay integration
- BE-252: Payment Service - Momo integration
- BE-253: Payment Service - ZaloPay integration
- BE-254: Payment Service - Webhook verification & processing
- BE-255: Payment Service - Refund API
- BE-256: Idempotency mechanism (prevent double charge)

**Team 6 (QA & DevOps) - PI 2:**
- BE-281: Payment integration testing (sandbox environments)
- BE-282: End-to-end booking flow tests
- BE-283: Chaos engineering setup (Chaos Monkey)
- BE-284: Database backup & restore automation
- BE-285: Secret management (Vault/AWS Secrets Manager)

#### Iteration Breakdown (PI 2)

**Iteration 2-1 (Tuần 11-12):**
- VNPay integration (sandbox)
- Payment webhook endpoint
- Idempotency keys

**Iteration 2-2 (Tuần 13-14):**
- Momo & ZaloPay integration
- Payment status polling (fallback for webhook failure)

**Iteration 2-3 (Tuần 15-16):**
- Refund logic & API
- Booking modification service
- Concurrency testing

**Iteration 2-4 (Tuần 17-18):**
- Notification Service - Email & SMS
- Template engine integration
- Notification queue (RabbitMQ)

**Iteration 2-5 (Tuần 19-20):**
- Seat hold mechanism with Redis TTL
- Overbooking prevention logic
- Stress testing (payment gateway limits)

**IP Iteration (Tuần 21-22):**
- PCI DSS compliance review
- Payment reconciliation process
- Disaster recovery drill
- PI 3 planning

#### Success Metrics (PI 2)
- ✅ Payment success rate > 95%
- ✅ Refund processing time < 5 minutes
- ✅ Webhook processing < 2s
- ✅ Zero double-charge incidents
- ✅ Notification delivery rate > 98%

---

### PI 3: Performance & Scalability (Tuần 21-30)
**Theme:** "Tối ưu hóa hiệu năng và khả năng mở rộng"

#### PI Objectives
1. **Caching Strategy** (WSJF: 40)
   - Redis cache for search results
   - Cache invalidation strategy
   - CDN for static content
   - Database query caching

2. **Elasticsearch Integration** (WSJF: 38)
   - Index route data
   - Full-text search for bus operators
   - Geo-location search (nearby pickup points)
   - Search suggestions (autocomplete)

3. **Asynchronous Processing** (WSJF: 35)
   - Event-driven architecture (Kafka)
   - Background jobs (booking confirmations, analytics)
   - Saga pattern for distributed transactions
   - Dead letter queue handling

#### Features by Team

**Team 3 (Core Services) - PI 3:**
- BE-301: Search Service - Elasticsearch integration
- BE-302: Search Service - Autocomplete API
- BE-303: Route Service - Geo-location search
- BE-304: Booking Service - Event publishing (BookingCreated, BookingCancelled)
- BE-305: Analytics Service - Event consumers

**Team 4 (Payment & Integration) - PI 3:**
- BE-351: Payment Service - Payment reconciliation job
- BE-352: Partner Service - Bus operator API endpoints
- BE-353: Partner Service - Seat inventory sync
- BE-354: Integration Service - Third-party route data ingestion
- BE-355: Webhook retry mechanism with exponential backoff

**Team 6 (QA & DevOps) - PI 3:**
- BE-381: Kafka cluster setup (3 brokers)
- BE-382: Redis cluster (master-replica)
- BE-383: Elasticsearch cluster (3 nodes)
- BE-384: Horizontal Pod Autoscaling (HPA) configuration
- BE-385: Performance testing (10k concurrent users)

#### Iteration Breakdown (PI 3)

**Iteration 3-1 (Tuần 21-22):**
- Kafka setup & topic design
- Event schema registry

**Iteration 3-2 (Tuần 23-24):**
- Elasticsearch indexing pipeline
- Full-text search implementation

**Iteration 3-3 (Tuần 25-26):**
- Redis caching for search results
- Cache warming strategies

**Iteration 3-4 (Tuần 27-28):**
- Event-driven booking flow
- Saga orchestration (booking → payment → notification)

**Iteration 3-5 (Tuần 29-30):**
- Autoscaling configuration
- Load testing & bottleneck analysis

**IP Iteration (Tuần 31-32):**
- Elasticsearch tuning (shard allocation)
- Kafka consumer lag monitoring
- Database connection pool optimization
- PI 4 planning

#### Success Metrics (PI 3)
- ✅ Search latency < 200ms (p95)
- ✅ Cache hit rate > 80%
- ✅ Event processing lag < 1s
- ✅ Autoscaling response time < 30s
- ✅ Support 10k concurrent users

---

### PI 4: AI Integration & Advanced Features (Tuần 31-40)
**Theme:** "Tích hợp trí tuệ nhân tạo"

#### PI Objectives
1. **AI Service Integration** (WSJF: 45)
   - Recommendation engine API
   - Chatbot backend API
   - Smart pricing API
   - Fraud detection API
   - User behavior tracking

2. **Review & Rating System** (WSJF: 32)
   - Review CRUD operations
   - Rating aggregation
   - Review moderation (AI-assisted)
   - Review sentiment analysis

3. **Loyalty & Referral** (WSJF: 28)
   - Loyalty points calculation
   - Referral tracking & rewards
   - Promo code engine
   - Discount application logic

#### Features by Team

**Team 3 (Core Services) - PI 4:**
- BE-401: Review Service - CRUD APIs
- BE-402: Review Service - Rating aggregation
- BE-403: User Service - Loyalty points API
- BE-404: User Service - Referral tracking
- BE-405: Booking Service - Discount application

**Team 4 (Payment & Integration) - PI 4:**
- BE-451: AI Gateway - Proxy for AI services
- BE-452: Recommendation Service integration
- BE-453: Chatbot Service integration
- BE-454: Smart Pricing Service integration
- BE-455: Fraud Detection Service integration
- BE-456: Promo code validation & management

**Team 6 (QA & DevOps) - PI 4:**
- BE-481: AI service mocking for tests
- BE-482: A/B testing infrastructure (feature flags)
- BE-483: User behavior analytics pipeline
- BE-484: ML model versioning (MLflow/Kubeflow)
- BE-485: AI service monitoring (latency, accuracy)

#### Iteration Breakdown (PI 4)

**Iteration 4-1 (Tuần 31-32):**
- Review Service implementation
- Rating aggregation logic

**Iteration 4-2 (Tuần 33-34):**
- Recommendation engine integration
- Personalization API

**Iteration 4-3 (Tuần 35-36):**
- Chatbot backend API
- Conversation context management

**Iteration 4-4 (Tuần 37-38):**
- Smart pricing integration
- Fraud detection integration

**Iteration 4-5 (Tuần 39-40):**
- Loyalty & referral logic
- Promo code engine

**IP Iteration (Tuần 41-42):**
- A/B testing for AI features
- ML model performance review
- Privacy compliance (data anonymization)
- PI 5 planning

#### Success Metrics (PI 4)
- ✅ Recommendation API latency < 300ms
- ✅ Chatbot backend uptime > 99.5%
- ✅ Fraud detection accuracy > 90%
- ✅ Promo code application < 100ms
- ✅ Review moderation automation > 70%

---

### PI 5: Production Hardening & Scale (Tuần 41-50)
**Theme:** "Sẵn sàng ra mắt và mở rộng"

#### PI Objectives
1. **Production Readiness** (WSJF: 50)
   - Multi-region deployment (DR)
   - Database replication (master-slave)
   - Circuit breakers (Hystrix/Resilience4j)
   - Distributed tracing (Jaeger/Zipkin)
   - SLA monitoring

2. **Advanced Analytics** (WSJF: 35)
   - Data warehouse integration (BigQuery/Snowflake)
   - Real-time analytics dashboard
   - Business intelligence reports
   - Predictive analytics (demand forecasting)

3. **Partner Portal** (WSJF: 30)
   - Bus operator dashboard API
   - Seat inventory management API
   - Financial reports API
   - Partner API documentation portal

#### Features by Team

**Team 3 (Core Services) - PI 3:**
- BE-501: Analytics Service - Data warehouse sync
- BE-502: Analytics Service - Real-time aggregations
- BE-503: Partner Service - Dashboard APIs
- BE-504: Partner Service - Inventory management
- BE-505: User Service - Multi-factor authentication (MFA)

**Team 4 (Payment & Integration) - PI 5:**
- BE-551: Payment Service - Multi-currency support
- BE-552: Payment Service - Installment payment
- BE-553: Integration Service - Accounting system sync
- BE-554: Integration Service - CRM integration
- BE-555: Partner Service - Financial reports

**Team 6 (QA & DevOps) - PI 5:**
- BE-581: Multi-region Kubernetes setup (DR)
- BE-582: Database replication & failover automation
- BE-583: Distributed tracing (Jaeger)
- BE-584: Circuit breaker configuration
- BE-585: Chaos engineering tests (region failure)
- BE-586: Final security audit (penetration testing)

#### Iteration Breakdown (PI 5)

**Iteration 5-1 (Tuần 41-42):**
- Multi-region deployment setup
- Database replication configuration

**Iteration 5-2 (Tuần 43-44):**
- Circuit breakers & retry logic
- Distributed tracing implementation

**Iteration 5-3 (Tuần 45-46):**
- Data warehouse pipeline
- Real-time analytics

**Iteration 5-4 (Tuần 47-48):**
- Partner portal APIs
- Partner documentation

**Iteration 5-5 (Tuần 49-50):**
- Production hardening
- Chaos engineering tests
- Final load testing (50k concurrent users)

**IP Iteration (Tuần 51-52):**
- Production runbook finalization
- Incident response drills
- Launch readiness review
- PI 6 planning (International expansion)

#### Success Metrics (PI 5)
- ✅ Multi-region failover < 5 minutes
- ✅ Database replication lag < 1s
- ✅ Circuit breaker effectiveness 100%
- ✅ Distributed tracing coverage 100%
- ✅ Support 50k concurrent users
- ✅ SLA: 99.95% uptime

---

## CROSS-PI INITIATIVES

### 1. API Evolution
**PI 1:** RESTful APIs (CRUD)  
**PI 2:** Pagination, filtering, sorting  
**PI 3:** GraphQL (optional)  
**PI 4:** Webhooks for partners  
**PI 5:** API versioning strategy  

### 2. Database Strategy
**PI 1:** MySQL 8.0+ (primary), Redis (cache & logs)  
**PI 2:** Read replicas  
**PI 3:** Partitioning & sharding strategy  
**PI 4:** CQRS pattern (selected services)  
**PI 5:** Multi-region replication  

### 3. Security
**PI 1:** JWT, HTTPS, basic OWASP  
**PI 2:** PCI DSS compliance  
**PI 3:** Secrets management (Vault)  
**PI 4:** Data encryption at rest  
**PI 5:** Penetration testing, bug bounty  

### 4. Observability
**PI 1:** Logging (ELK), Metrics (Prometheus)  
**PI 2:** Alerting (PagerDuty/Opsgenie)  
**PI 3:** Distributed tracing  
**PI 4:** APM (Application Performance Monitoring)  
**PI 5:** SLO/SLI definition & monitoring  

---

## DEPENDENCIES & RISKS

### Dependencies on Frontend
- **PI 1:** API contracts agreed early
- **PI 2:** Payment UI flows aligned
- **PI 3:** Search UI expectations clear
- **PI 4:** AI feature UX finalized

**Mitigation:** API-first design, contract testing (Pact), weekly sync meetings

### Dependencies on AI Team
- **PI 4:** AI service APIs stable & documented
- **PI 5:** Model versioning & rollback strategy

**Mitigation:** Mock AI services, fallback to rule-based logic, SLA agreements

### Technical Risks
| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Database bottleneck | High | Medium | Read replicas, caching, query optimization |
| Payment gateway downtime | High | Low | Multi-gateway strategy, retry logic |
| Kafka message loss | Medium | Low | Replication factor 3, acks=all |
| Kubernetes cluster failure | High | Low | Multi-region, backup cluster |
| Third-party API rate limits | Medium | Medium | Caching, request batching, SLA negotiations |

---

## KEY CEREMONIES (Per PI)

### PI Planning (2 ngày đầu mỗi PI)
- Day 1: Architecture vision, Team breakouts
- Day 2: Dependencies mapping, Risk review, Confidence vote

### Iteration Planning (Mỗi 2 tuần)
- Story refinement (INVEST criteria)
- Capacity planning (velocity-based)
- Dependency identification

### System Demo (Cuối mỗi iteration)
- Integrated demo (API + Frontend + Mobile)
- Stakeholder Q&A

### Inspect & Adapt (Cuối mỗi PI)
- Quantitative review (metrics)
- Qualitative review (team feedback)
- Problem-solving workshop (root cause analysis)

### Daily Standup
- 15 phút mỗi sáng
- Focus on blockers & dependencies

---

## TOOLS & TECHNOLOGY STACK

### Languages & Frameworks
- **Primary:** Node.js (NestJS) / Go / Python (FastAPI)
- **Language:** TypeScript / Go / Python 3.11+

### Databases
- **Relational:** MySQL 8.0+
- **NoSQL:** MongoDB 6+
- **Cache:** Redis 7+ (cluster mode)
- **Search:** Elasticsearch 8+

### Message Queue
- **Event Bus:** Apache Kafka 3+
- **Task Queue:** RabbitMQ 3.12+

### Infrastructure
- **Container:** Docker 24+
- **Orchestration:** Kubernetes 1.28+
- **Service Mesh:** Istio (optional)
- **API Gateway:** Kong / AWS API Gateway

### CI/CD & DevOps
- **CI/CD:** GitHub Actions / GitLab CI
- **IaC:** Terraform / Pulumi
- **Config Management:** Helm / Kustomize
- **Secret Management:** HashiCorp Vault / AWS Secrets Manager

### Monitoring & Observability
- **Metrics:** Prometheus + Grafana
- **Logging:** ELK Stack (Elasticsearch, Logstash, Kibana)
- **Tracing:** Jaeger / Zipkin
- **APM:** New Relic / Datadog
- **Error Tracking:** Sentry

### Testing
- **Unit:** Jest / Go testing / pytest
- **Integration:** Postman / Newman
- **Load:** k6 / Gatling
- **Chaos:** Chaos Monkey / LitmusChaos

---

## METRICS & REPORTING

### SLO/SLI (Service Level Objectives/Indicators)
- **Availability:** 99.95% uptime
- **Latency:** p95 < 500ms, p99 < 1s
- **Error Rate:** < 0.1% (5xx errors)
- **Throughput:** 10k requests/sec (peak)

### Quality Metrics
- **Test Coverage:** > 80% (unit + integration)
- **Code Quality:** SonarQube score A
- **Security:** Zero critical vulnerabilities
- **Technical Debt:** < 10% of codebase

### Performance Metrics
- **Database Query Time:** p95 < 100ms
- **Cache Hit Rate:** > 80%
- **Message Queue Lag:** < 1 second
- **API Response Time:** p95 < 300ms

### Business Metrics
- **API Calls:** Track per endpoint
- **Booking Success Rate:** > 95%
- **Payment Success Rate:** > 95%
- **Search-to-Book Conversion:** Track & optimize

### Reporting Cadence
- **Daily:** Incident reports (if any)
- **Bi-weekly:** Iteration health dashboard
- **Per PI:** Executive summary + OKR review
- **Quarterly:** Architecture review

---

## SUCCESS CRITERIA (End of PI 5)

### Functional
- ✅ All 9 microservices deployed to Production
- ✅ Multi-region deployment operational
- ✅ Partner portal fully functional
- ✅ AI services integrated (4/4)
- ✅ Payment gateways live (3 providers)

### Non-Functional
- ✅ SLA: 99.95% uptime achieved
- ✅ Support 50k concurrent users
- ✅ API latency p95 < 300ms
- ✅ Zero data breaches or security incidents
- ✅ Disaster recovery tested & verified

### Team Health
- ✅ On-call rotation established (24/7)
- ✅ Runbook completed (20+ scenarios)
- ✅ Team satisfaction > 4/5
- ✅ Zero critical incidents during launch

---

## NEXT STEPS (Post PI 5)

1. **Launch Preparation:** Production smoke tests, monitoring alerts tuning
2. **PI 6-10:** Scale phase (international routes, more payment gateways, advanced AI)
3. **Continuous Optimization:** Database tuning, cost optimization (cloud spend)
4. **Innovation:** Blockchain ticketing, IoT bus tracking, predictive maintenance

---

**Document Owner:** Product Management (Backend) + System Architect  
**Last Updated:** January 12, 2026  
**Status:** Ready for PI Planning 1  
**Approval Required:** RTE, CTO, Backend Tech Leads, Security Team

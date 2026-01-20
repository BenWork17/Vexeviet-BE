# ADR 001: MySQL vs PostgreSQL Choice

**Status:** Accepted  
**Date:** 2026-01-19  
**Deciders:** System Architect, Backend Team Lead  
**Related:** PI 1 - Iteration 1-2

---

## Context

The original SAFe plan specified PostgreSQL as the primary RDBMS. During implementation of Iteration 1-2, the team chose MySQL 8.0 instead. This ADR documents the decision and rationale.

## Decision

**We will use MySQL 8.0+ as the primary relational database** for the VeXeViet platform.

---

## Rationale

### 1. Team Familiarity & Expertise
- **Current team skillset:** 70% of backend developers have more experience with MySQL
- **Onboarding speed:** Faster ramp-up for new developers (MySQL is more common in Vietnamese market)
- **Support availability:** Easier to find local MySQL DBAs in Vietnam

### 2. Performance Characteristics
- **Read-heavy workload:** VeXeViet is primarily read-heavy (search routes, view bookings)
- **MySQL InnoDB:** Excellent read performance with proper indexing
- **Connection pooling:** MySQL handles high connection counts well (important for microservices)

### 3. Ecosystem & Tooling
- **Prisma ORM:** Excellent support for MySQL with mature migration tooling
- **Cloud providers:** All major clouds (AWS RDS, GCP Cloud SQL, Azure Database) support MySQL
- **Monitoring:** Extensive monitoring tools (Percona Monitoring, MySQL Enterprise Monitor)

### 4. Feature Parity
Both MySQL 8.0 and PostgreSQL 15 provide:
- ✅ JSON columns (for flexible schema)
- ✅ Full-text search (though Elasticsearch will be primary)
- ✅ Transactions & ACID compliance
- ✅ Replication & clustering
- ✅ Partitioning & sharding

### 5. Cost Considerations
- **Licensing:** MySQL Community Edition is free (similar to PostgreSQL)
- **Cloud pricing:** Comparable pricing on AWS RDS/GCP Cloud SQL
- **Support costs:** Lower support costs due to local expertise

---

## Consequences

### Positive
- ✅ Faster development velocity (team familiarity)
- ✅ Lower hiring costs (larger MySQL talent pool in Vietnam)
- ✅ Proven at scale (used by Shopee, Tiki, Lazada in SEA)
- ✅ Excellent Prisma integration
- ✅ Strong community support in Vietnam

### Negative
- ⚠️ **Advanced features:** PostgreSQL has more advanced features (e.g., better JSON querying, window functions)
  - **Mitigation:** We can use Elasticsearch for complex queries
- ⚠️ **Full-text search:** PostgreSQL's full-text search is superior
  - **Mitigation:** We're using Elasticsearch as primary search engine anyway
- ⚠️ **Stored procedures:** MySQL's stored procedure language is less powerful
  - **Mitigation:** Business logic in application layer (microservices pattern)

### Neutral
- 🔄 **Migration effort:** Low - Prisma abstracts most differences
- 🔄 **Future changes:** Can migrate to PostgreSQL later if needed (Prisma makes it easier)

---

## Alternatives Considered

### Option 1: PostgreSQL 15
**Pros:**
- More advanced SQL features
- Better JSON support (JSONB)
- Superior full-text search
- More extensible (custom types, extensions)

**Cons:**
- Team learning curve
- Smaller talent pool in Vietnam
- Slightly higher operational complexity

**Decision:** Rejected due to team familiarity and time constraints in PI 1

---

### Option 2: Hybrid (PostgreSQL + MySQL)
**Pros:**
- Use best tool for each job

**Cons:**
- Increased operational complexity
- Multiple ORM configurations
- Higher infrastructure costs
- Team needs to maintain two skillsets

**Decision:** Rejected - premature optimization for PI 1

---

## Implementation Notes

### Migration from PostgreSQL references
1. ✅ Updated `docs/SAFe-Plan-Backend.md`
2. ✅ Updated `docs/SAFe-Backend-Detailed-Specs.md` (SQL examples)
3. ✅ All Prisma schemas use `provider = "mysql"`
4. ✅ Environment variables use `DATABASE_URL` with MySQL format
5. ✅ Docker Compose uses `mysql:8.0` image

### Database Configuration
```yaml
# docker-compose.yml
mysql:
  image: mysql:8.0
  environment:
    MYSQL_ROOT_PASSWORD: root
    MYSQL_DATABASE: vexeviet
  command: --default-authentication-plugin=mysql_native_password
```

### Prisma Configuration
```prisma
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}
```

### Connection String Format
```bash
DATABASE_URL="mysql://user:password@localhost:3306/vexeviet"
```

---

## Review & Monitoring

### Success Criteria
- [ ] Team velocity maintained or improved
- [ ] Database performance meets SLA (p95 < 100ms)
- [ ] Zero critical MySQL-related bugs in PI 1
- [ ] All Prisma migrations run successfully

### Review Schedule
- **PI 1 Retrospective:** Assess team satisfaction with MySQL
- **PI 2 Planning:** Re-evaluate if needed
- **PI 5:** Final review before production launch

### Potential Reversal Triggers
If any of these occur, we may reconsider PostgreSQL:
1. Team grows to 20+ backend engineers (can afford specialization)
2. Complex JSONB queries become critical (analytics needs)
3. PostgreSQL-specific features become must-have
4. Major performance issues that PostgreSQL would solve

---

## References

- [MySQL 8.0 Documentation](https://dev.mysql.com/doc/refman/8.0/en/)
- [Prisma MySQL Connector](https://www.prisma.io/docs/concepts/database-connectors/mysql)
- [MySQL vs PostgreSQL - 2024 Comparison](https://www.prisma.io/dataguide/postgresql/comparing-database-types)
- VeXeViet SAFe Plan Backend (v1.1)

---

**Decision Owner:** System Architect  
**Approved By:** Tech Lead, Backend Team Lead  
**Next Review:** PI 2 Planning (Week 11)

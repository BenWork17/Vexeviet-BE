---
name: api-testing-k6-postman
description: Performs API testing using k6 (performance) and Postman (integration). Use when writing tests for new or existing endpoints.
---

# api-testing-k6-postman Skill

Ensures API reliability and performance through automated testing.

## Workflows
1. **Postman**: Used for functional and integration testing. Collections are stored in `tests/postman/`.
2. **k6**: Used for load and performance testing. Scripts are stored in `tests/k6/`.

## Commands
- Run integration tests: `pnpm test:integration`
- Run performance tests: `k6 run tests/k6/search-load-test.js`

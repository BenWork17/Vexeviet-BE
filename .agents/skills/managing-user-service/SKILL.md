---
name: managing-user-service
description: Manages authentication (JWT, RBAC) and user logic. Use when working on user registration, login, token rotation, or role-based access control.
---

# managing-user-service Skill

Handles core authentication and authorization logic for the VeXeViet platform.

## Key Responsibilities
- **JWT Management**: Issuance, verification, and rotation of access and refresh tokens.
- **RBAC**: Implementation of Role-Based Access Control (Admin, Operator, User).
- **Security**: Password hashing (Bcrypt) and secure token storage.

## Related Files
- `services/user-service/src/`: Core logic for user management.
- `packages/database/prisma/schema.prisma`: User and RefreshToken models.

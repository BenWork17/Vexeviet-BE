---
name: database-management-prisma
description: Manages database schemas using Prisma ORM, including schema definitions, migrations, and model generation. Use when defining database models, creating migrations, or working with User and Route services.
---

# Database Management with Prisma

Manages database schemas and migrations using Prisma ORM.

## Capabilities

- Define Prisma schema models
- Generate and run database migrations
- Set up Prisma Client
- Configure database connections
- Manage User and Route service schemas

## Workflow

1. Define schema in `prisma/schema.prisma`
2. Generate migration: `npx prisma migrate dev --name <migration-name>`
3. Generate Prisma Client: `npx prisma generate`
4. Apply migrations in production: `npx prisma migrate deploy`

## Common Prisma Commands

```bash
# Create a migration
npx prisma migrate dev --name init

# Generate Prisma Client
npx prisma generate

# Apply migrations
npx prisma migrate deploy

# Reset database (dev only)
npx prisma migrate reset

# Open Prisma Studio
npx prisma studio

# Format schema
npx prisma format

# Validate schema
npx prisma validate
```

## Example Schema Structure

```prisma
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Route {
  id          String   @id @default(uuid())
  name        String
  description String?
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

## Environment Variables

```env
DATABASE_URL="mysql://user:password@localhost:3306/dbname"
```

## Best Practices

- Always create migrations for schema changes
- Use meaningful migration names
- Run `prisma validate` before committing
- Keep schema.prisma under version control
- Use enums for fixed value sets
- Define proper relations between models

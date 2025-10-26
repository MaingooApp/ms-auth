# Auth Service

Handles user registration, authentication, and token refresh for Maingoo.

## Setup

```bash
pnpm install
cp .env.example .env
pnpm prisma:generate
pnpm prisma:migrate
pnpm run start:dev
```

Ensure a PostgreSQL instance is available and `DATABASE_URL` points to it.

## Environment variables

- `PORT`: optional, used for local debugging.
- `NATS_SERVERS`: comma-separated list of NATS URLs.
- `DATABASE_URL`: PostgreSQL connection string.
- `JWT_SECRET`, `JWT_EXPIRES_IN`: access token secret & TTL.
- `REFRESH_JWT_SECRET`, `REFRESH_EXPIRES_IN`: refresh token secret & TTL.
- `JWT_ISSUER`, `JWT_AUDIENCE`: optional claims metadata.

## Prisma schema

Entities:

- `User { id, enterpriseId?, name, phonePrefix?, phoneNumber?, email, emailFluvia?, passwordHash, roleId, createdAt, updatedAt }`
- `Role { id, name, description?, createdAt, updatedAt }`
- `Permission { id, name, description?, createdAt, updatedAt }`
- `RolePermission { roleId, permissionId, createdAt }`
- `RefreshToken { id, tokenHash, userId, expiresAt, createdAt, revokedAt? }`

Run migrations with `pnpm prisma:migrate`.

**Initial Seed**: Run `npx tsx prisma/seed.ts` to create default roles (admin, employee) and permissions.

## NATS Contracts

| Subject             | Payload                                                                                      | Response           |
| ------------------- | -------------------------------------------------------------------------------------------- | ------------------ |
| `auth.register`     | `{ email, password, name, roleId, enterpriseId?, phonePrefix?, phoneNumber?, emailFluvia? }` | `{ user, tokens }` |
| `auth.login`        | `{ email, password }`                                                                        | `{ user, tokens }` |
| `auth.refresh`      | `{ refreshToken }`                                                                           | `{ user, tokens }` |
| `auth.getProfile`   | `{ userId, businessId? }`                                                                    | `{ user }`         |
| `auth.verify`       | `{ token }`                                                                                  | `{ user }`         |
| `auth.health.check` | `void`                                                                                       | `{ status: 'ok' }` |

### Events

- `auth.user.created`: emitted after a successful registration with `{ userId, email, name, roleId, enterpriseId, createdAt }`.

## Tokens

Access & refresh tokens are signed with independent secrets. Refresh tokens are hashed with Argon2 and stored alongside expiry metadata. Refresh requests revoke the previous token (`revokedAt`).

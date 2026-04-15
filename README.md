# SafeCircle

**Consent-based real-time location sharing — privacy-first, transparent, GDPR-compliant.**

SafeCircle lets families and friend groups share their location *only when they choose to*. There is no covert tracking, no silent monitoring, and no data collection without explicit consent. Every share can be paused, ended, or restricted to city-level precision at any time.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Flutter Mobile App                        │
│  GoRouter • Riverpod • Google Maps • Firebase Auth/FCM           │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTPS REST + WebSocket (Socket.IO)
┌──────────────────────────▼──────────────────────────────────────┐
│                       NestJS Backend API                         │
│  Auth • Location • Circles • Geofence • SOS • Privacy • Admin    │
│  RS256 JWT (15 min) • httpOnly refresh cookies (30 days)         │
└────┬──────────────┬────────────────────┬────────────────────────┘
     │              │                    │
┌────▼────┐   ┌─────▼─────┐   ┌─────────▼────────┐
│Postgres │   │   Redis    │   │   S3 / R2        │
│PostGIS  │   │(Pub/Sub,   │   │   (avatars +     │
│(spatial │   │ BullMQ,    │   │   GDPR exports)  │
│queries) │   │ rate limit)│   └──────────────────┘
└─────────┘   └───────────┘
```

---

## Monorepo Structure

```
locationtracker/
├── docs/                        # Architecture & planning
│   ├── PRD.md
│   ├── DATABASE_SCHEMA.md
│   ├── API_SPEC.md
│   ├── SECURITY.md
│   ├── REALTIME_DESIGN.md
│   ├── UI_UX_SPEC.md
│   ├── BUILD_ROADMAP.md
│   ├── QA_TESTING.md
│   └── LAUNCH_CHECKLIST.md
│
├── backend/                     # NestJS API
│   ├── src/
│   │   ├── main.ts
│   │   ├── app.module.ts
│   │   └── modules/
│   │       ├── auth/            # Firebase + email auth, JWT, refresh tokens
│   │       ├── users/           # User CRUD, avatar upload
│   │       ├── circles/         # Groups — CRUD, invites, membership
│   │       ├── location/        # Upload, feed, share lifecycle, Socket.IO gateway
│   │       ├── geofence/        # PostGIS spatial zones + enter/exit triggers
│   │       ├── sos/             # Emergency countdown, broadcast, acknowledge
│   │       ├── notifications/   # FCM multicast push
│   │       ├── privacy/         # Dashboard, ghost mode, history deletion
│   │       ├── admin/           # User management, stats
│   │       └── common/          # Encryption (AES-256-GCM), audit, storage
│   ├── .env.example
│   ├── docker-compose.yml
│   └── package.json
│
└── mobile/                      # Flutter app
    ├── lib/
    │   ├── main.dart
    │   ├── core/
    │   │   ├── constants/       # AppConstants (base URLs, keys)
    │   │   ├── router/          # GoRouter with auth redirect
    │   │   └── theme/           # AppColors, AppSpacing, Material 3 theme
    │   ├── services/
    │   │   ├── api_service.dart     # Dio HTTP client + auth interceptor
    │   │   ├── socket_service.dart  # Socket.IO client wrapper
    │   │   └── location_service.dart # Foreground GPS tracking
    │   └── features/
    │       ├── auth/            # Splash, onboarding, sign-in, sign-up, permissions
    │       ├── map/             # Home map, real-time markers, circle selector
    │       ├── circles/         # Circle list, detail, create
    │       ├── geofence/        # Geofence management
    │       ├── sos/             # Emergency countdown + resolve
    │       ├── privacy/         # Privacy dashboard, ghost mode, consent log
    │       ├── notifications/   # Alerts feed
    │       └── profile/         # User profile + sign out
    └── pubspec.yaml
```

---

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Flutter SDK ≥ 3.22
- Node.js ≥ 20
- A Firebase project (Auth + FCM enabled)

### 1. Backend

```bash
cd backend

# Copy and configure environment
cp .env.example .env
# Edit .env — set DATABASE_URL, REDIS_URL, FIREBASE_PROJECT_ID,
# LOCATION_ENCRYPTION_KEY (64 hex chars), JWT_PRIVATE_KEY, etc.

# Start Postgres + PostGIS + Redis
docker-compose up -d

# Install dependencies and run
npm install
npm run start:dev
```

The API will be available at `http://localhost:3000`.

### 2. Mobile

```bash
cd mobile

# Install Flutter dependencies
flutter pub get

# Configure Firebase
# 1. Download google-services.json → android/app/
# 2. Download GoogleService-Info.plist → ios/Runner/
# 3. Set your API base URL in lib/core/constants/app_constants.dart

# Run on device / emulator
flutter run
```

---

## Environment Variables

See [backend/.env.example](backend/.env.example) for the full reference. Key variables:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (PostGIS extension required) |
| `REDIS_URL` | Redis connection string |
| `JWT_PRIVATE_KEY` | RS256 private key (PEM) for signing access tokens |
| `JWT_PUBLIC_KEY` | RS256 public key (PEM) for verification |
| `LOCATION_ENCRYPTION_KEY` | 64-char hex (32 bytes) for AES-256-GCM coordinate encryption |
| `FIREBASE_PROJECT_ID` | Firebase project ID |
| `FIREBASE_SERVICE_ACCOUNT` | Firebase Admin SDK service account JSON (stringified) |
| `AWS_S3_BUCKET` | S3 / R2 bucket name for avatar storage |
| `AWS_ACCESS_KEY_ID` | S3 / R2 access key |
| `AWS_SECRET_ACCESS_KEY` | S3 / R2 secret key |
| `AWS_ENDPOINT` | S3 endpoint (omit for AWS; set for Cloudflare R2) |

---

## Key Security Properties

- **Consent-first**: all location shares require explicit acceptance; no data flows without a `LocationShare` record in `active` status.
- **Encrypted at rest**: latitude/longitude stored as AES-256-GCM ciphertext; PostGIS geometry column marked `select: false` (never returned in queries).
- **Auth**: RS256 JWTs (15-min expiry) + httpOnly refresh cookies (30-day rolling); refresh token hashed with SHA-256 before storage; replay detection via one-time token rotation.
- **Rate limiting**: per-endpoint Redis token bucket (`@nestjs/throttler`); login capped at 5 req/15 min, location upload at 120 req/60 s.
- **GDPR**: append-only consent log (Article 7); one-click history deletion; ghost mode stops all active shares instantly.
- **No covert tracking**: the app never runs background location without foreground permission approval shown to the user at the OS level.

---

## Documentation

| Document | Description |
|---|---|
| [docs/PRD.md](docs/PRD.md) | Product requirements & MVP feature list |
| [docs/DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md) | Full PostgreSQL schema with PostGIS extensions |
| [docs/API_SPEC.md](docs/API_SPEC.md) | REST API endpoint specifications |
| [docs/REALTIME_DESIGN.md](docs/REALTIME_DESIGN.md) | Socket.IO event protocol & room architecture |
| [docs/SECURITY.md](docs/SECURITY.md) | Threat model, auth design, encryption decisions |
| [docs/UI_UX_SPEC.md](docs/UI_UX_SPEC.md) | Design system, screen inventory, interaction flows |
| [docs/BUILD_ROADMAP.md](docs/BUILD_ROADMAP.md) | Sprint-by-sprint build plan |
| [docs/QA_TESTING.md](docs/QA_TESTING.md) | Testing strategy, test cases, coverage targets |
| [docs/LAUNCH_CHECKLIST.md](docs/LAUNCH_CHECKLIST.md) | App Store / Play Store submission checklist |

---

## License

MIT
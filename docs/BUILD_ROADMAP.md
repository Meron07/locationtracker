# SafeCircle — Build Roadmap

---

## Phase 1: Architecture & Setup (Weeks 1–2)

### Goals
- Scaffold monorepo structure
- Provision infrastructure
- Establish development workflows
- Team onboarding

### Tasks
- [ ] Initialize monorepo (pnpm workspaces: `backend/`, `mobile/`, `docs/`)
- [ ] Backend: NestJS scaffold, TypeORM, PostgreSQL + PostGIS connection
- [ ] Backend: environment config (dotenv, Joi validation)
- [ ] Backend: Docker Compose for local dev (Postgres 15 + PostGIS, Redis 7, mailhog)
- [ ] Backend: ESLint + Prettier + Husky pre-commit hooks
- [ ] Backend: Jest test setup
- [ ] Mobile: Flutter project scaffold
- [ ] Mobile: flavors (dev, staging, prod) with separate Firebase projects
- [ ] Mobile: folder structure (features/, core/, services/)
- [ ] Mobile: GoRouter setup for navigation
- [ ] Mobile: Riverpod for state management
- [ ] CI/CD: GitHub Actions pipelines (test, lint, build)
- [ ] Infra: Provision Postgres on Railway / Supabase, Redis on Upstash
- [ ] Infra: Firebase project + service account configured
- [ ] Infra: S3 bucket for avatars (Cloudflare R2 for cost)
- [ ] DNS: `api.safecircle.app`, `rt.safecircle.app` (realtime)
- [ ] TLS: Certificates via Let's Encrypt / Cloudflare
- [ ] Monitoring: Sentry projects (backend + mobile)

### Exit Criteria
- `docker-compose up` runs full local stack
- Mobile app builds for iOS and Android
- CI pipeline passes on main branch

---

## Phase 2: Auth & Onboarding (Weeks 3–4)

### Goals
- Complete auth system
- Onboarding and permission flows
- User profile CRUD

### Tasks
- [ ] Backend: `POST /auth/register`, `POST /auth/login`
- [ ] Backend: Firebase Auth integration (`POST /auth/firebase`)
- [ ] Backend: JWT issuance (RS256, 15-min access token)
- [ ] Backend: Refresh token rotation + replay detection
- [ ] Backend: Password reset flow (email via SendGrid)
- [ ] Backend: Rate limiting (Redis token bucket)
- [ ] Backend: User CRUD endpoints (`GET/PATCH /users/me`)
- [ ] Backend: Avatar upload to S3
- [ ] Backend: Device registration (`POST /devices`)
- [ ] Mobile: Onboarding screens (4 slides)
- [ ] Mobile: Sign in / sign up screen (email + Google + Apple)
- [ ] Mobile: Permission screen (location + notifications)
- [ ] Mobile: Auth state management (Riverpod)
- [ ] Mobile: Secure token storage (flutter_secure_storage)
- [ ] Mobile: Token refresh interceptor in HTTP client
- [ ] Mobile: Profile screen (view + edit)
- [ ] Email: Verification email + password reset emails

### Exit Criteria
- User can register, verify email, sign in, and load profile
- Firebase Google + Apple sign-in works on both platforms
- Refresh token rotation working and tested

---

## Phase 3: Circles & Invites (Weeks 5–6)

### Goals
- Full circles feature with invite flows

### Tasks
- [ ] Backend: Circle CRUD endpoints
- [ ] Backend: Membership management (invite, accept, remove, leave)
- [ ] Backend: Invite token generation and validation
- [ ] Backend: Invite email sending
- [ ] Backend: Circle admin RBAC
- [ ] Mobile: Circles list screen
- [ ] Mobile: Circle details screen
- [ ] Mobile: Create circle modal
- [ ] Mobile: Invite by link / share sheet
- [ ] Mobile: Accept invite via deep link
- [ ] Mobile: Deep link routing (app.safecircle.app/join/:token)
- [ ] Mobile: Leave circle confirmation dialog
- [ ] Push: "You've been invited to [Circle]" notification

### Exit Criteria
- User can create circle, invite by link, other user opens link and joins
- Role management works (owner can make admin, remove member)
- Deep links open app on both iOS and Android

---

## Phase 4: Live Map & Realtime (Weeks 7–9)

### Goals
- Core location sharing feature — the product's heart

### Tasks
- [ ] Backend: Location upload endpoint + batch upload
- [ ] Backend: Map feed endpoint
- [ ] Backend: Socket.IO WebGateway (NestJS)
- [ ] Backend: Redis Socket.IO adapter
- [ ] Backend: Auth handshake in WebGateway
- [ ] Backend: Room management (user rooms, circle rooms)
- [ ] Backend: Location broadcast to authorized viewers only
- [ ] Backend: Location share request/accept/revoke endpoints
- [ ] Backend: Share expiry background job
- [ ] Backend: Share re-consent reminder job (30-day shares)
- [ ] Mobile: Location service (FusedLocation / CoreLocation)
- [ ] Mobile: Background location (ForegroundService on Android, BackgroundTask on iOS)
- [ ] Mobile: Adaptive update interval logic
- [ ] Mobile: Socket.IO client (socket_io_client)
- [ ] Mobile: Home map screen with Google Maps SDK
- [ ] Mobile: Contact markers with avatars
- [ ] Mobile: Person detail bottom sheet
- [ ] Mobile: Share location modal with duration picker
- [ ] Mobile: Sharing status bar (top banner)
- [ ] Mobile: Pause sharing flow
- [ ] Mobile: Stop sharing flow

### Exit Criteria
- Location updates appear on recipient's map within 3 seconds
- Pausing and revoking shares works in real time
- Background location works reliably on both platforms (tested via XCTest / Espresso)
- Battery impact < 5%/hour on background (profiled)

---

## Phase 5: Geofences & Alerts (Weeks 10–11)

### Goals
- Place-based notifications with geofencing

### Tasks
- [ ] Backend: Saved places CRUD
- [ ] Backend: Geofence CRUD with PostGIS polygon storage
- [ ] Backend: Geofence subscription management
- [ ] Backend: Async geofence evaluation worker (BullMQ + Redis)
- [ ] Backend: Alert creation and delivery to socket + FCM
- [ ] Backend: Alert deduplication (60-second cooldown)
- [ ] Backend: Notifications inbox (`GET /alerts`, `PATCH /alerts/:id/read`)
- [ ] Mobile: Geofence creation screen with map picker + radius slider
- [ ] Mobile: Saved places management
- [ ] Mobile: Notifications center screen
- [ ] Mobile: Notification preference settings
- [ ] Mobile: Native geofencing as backup (Android GeofencingAPI, iOS CLCircularRegion)
- [ ] Push: FCM + APNs geofence alert notifications

### Exit Criteria
- Alert fires within 60 seconds of entering/exiting geofence
- Push notifications received when app is in background
- No duplicate alerts for same crossing within 60 seconds

---

## Phase 6: SOS & Privacy Center (Weeks 12–13)

### Goals
- Emergency sharing mode and full privacy controls

### Tasks
- [ ] Backend: Emergency session CRUD
- [ ] Backend: SOS real-time broadcast to recipients
- [ ] Backend: SOS auto-expiry job
- [ ] Backend: Privacy dashboard endpoint
- [ ] Backend: Stop-all-sharing endpoint
- [ ] Backend: Hide-me endpoint
- [ ] Backend: Consent logs endpoint
- [ ] Backend: Data export job (JSON/CSV dump)
- [ ] Backend: Account deletion job (GDPR)
- [ ] Mobile: SOS screen + hold-to-activate button
- [ ] Mobile: Pre-activation countdown modal
- [ ] Mobile: Privacy dashboard screen
- [ ] Mobile: Consent log viewer
- [ ] Mobile: Export my data flow
- [ ] Mobile: Delete account flow with confirmation
- [ ] Mobile: Block user flow
- [ ] Mobile: Report user flow
- [ ] Push: High-priority SOS push notification (bypasses Do Not Disturb on iOS)

### Exit Criteria
- SOS activates within 5 seconds of button press (after countdown)
- Recipients receive push notification within 10 seconds
- Stop all sharing immediately revokes all active outgoing shares
- Account deletion flow works and queues GDPR deletion

---

## Phase 7: Testing & Hardening (Weeks 14–15)

### Goals
- Quality, security, and performance

### Tasks
- [ ] Unit tests: auth module (token rotation, replay detection)
- [ ] Unit tests: location service (share authorization, coordinate validation)
- [ ] Unit tests: geofence service (PostGIS intersection logic)
- [ ] Integration tests: all API endpoints (Supertest)
- [ ] Mobile UI tests: login, share flow, SOS activation, privacy dashboard
- [ ] Security tests: IDOR checks, RBAC, rate limiting
- [ ] Performance: load test socket connections (k6)
- [ ] Performance: geofence worker throughput test
- [ ] Privacy: verify deleted account leaves no PII in DB
- [ ] Privacy: verify paused share sends no location data
- [ ] Pen test: external security review (or self-audit with OWASP checklist)
- [ ] Battery profiling on Android + iOS (5% budget check)
- [ ] Error monitoring: Sentry coverage review
- [ ] Dependency audit: npm audit, Snyk scan

---

## Phase 8: Launch Prep (Weeks 16–17)

### Tasks
- [ ] App Store Connect: app listing, privacy nutrition label, screenshots
- [ ] Google Play Console: listing, background location declaration, privacy policy
- [ ] Privacy policy + Terms of Service (legal review)
- [ ] GDPR: Data Processing Agreement template ready
- [ ] Support system: Intercom or similar
- [ ] Marketing: landing page at safecircle.app
- [ ] Beta: TestFlight + Play Internal Testing
- [ ] Analytics: PostHog (privacy-friendly) integration
- [ ] Uptime monitoring: Betterstack / UptimeRobot
- [ ] Runbook: on-call procedures
- [ ] Production environment: final configuration review
- [ ] Load test: simulate 1000 concurrent users
- [ ] App submission and review

---

## Post-Launch Priorities (v1.1)

- Battery percentage sharing (requires user opt-in)
- QR code invites (physical sharing)
- Trip replay timeline animation
- Android widget (last seen, quick sharing toggle)
- iOS Live Activities (sharing status on Dynamic Island)
- Localization: Spanish, French, German

# SafeCircle — Security & Abuse Prevention Design

---

## 1. Threat Model

### Assets to Protect
| Asset | Risk if Compromised |
|---|---|
| User location history | Stalking, harassment, physical harm |
| Real-time coordinates | Targeted attack, compromise of vulnerable users |
| Account credentials | Account takeover, identity impersonation |
| Emergency contact list | Social engineering for abuse |
| Circle membership | Unauthorized surveillance of group |
| Auth tokens | Full account access |

### Threat Actors
| Actor | Motivation |
|---|---|
| Abusive partner / controller | Track victim without consent |
| Disgruntled ex-member | Access circle data after removal |
| External attacker | Mass data exfiltration, sell location data |
| Malicious admin in circle | Overstep role to surveil members |
| Insider threat | Employee accessing user data |
| Automated scrapers | Enumerate user locations at scale |

---

## 2. Authentication Security

### JWT Tokens
- Access token TTL: **15 minutes** (short to limit blast radius if stolen)
- Refresh token TTL: **30 days**, stored as httpOnly, Secure, SameSite=Strict cookie
- Refresh token stored as bcrypt hash in DB (never raw)
- **Token rotation:** Every refresh issues a new refresh token and invalidates the old one
- **Replay detection:** If a previously used refresh token is reused, all sessions for that user are immediately revoked and the user receives a security alert
- JWT signed with RS256 (asymmetric) — private key never exposed in app layer

### Password Policy
- Minimum 8 characters
- Must contain uppercase, lowercase, and digit
- Checked against HaveIBeenPwned API (k-anonymity model — no plain password sent)
- bcrypt with cost factor 12 for storage
- Timing-safe comparison to prevent timing attacks

### Anti-Enumeration
- Login: same error for wrong email and wrong password (`"Invalid credentials"`)
- Registration: same success response even if email already exists (follow-up email sent to existing user)
- Password reset: same success response regardless of whether email exists

### Rate Limiting
| Endpoint | Limit | Window |
|---|---|---|
| POST /auth/register | 5 per IP | 15 min |
| POST /auth/login | 10 per IP, 5 per email | 15 min |
| POST /auth/firebase | 20 per IP | 15 min |
| POST /auth/forgot-password | 3 per email | 1 hour |
| POST /circles/:id/invites | 10 per circle | 1 hour |
| POST /location/upload | 1 per user | 10 sec |
| POST /sos | 5 per user | 1 hour |

Implemented via Redis token bucket. Returns `Retry-After` header.

### CAPTCHA
Required on:
- Registration (if IP flagged)
- Login after 3 consecutive failures
- Password reset

Use hCaptcha (privacy-friendly alternative to reCAPTCHA).

---

## 3. Authorization Security

### Role-Based Access Control (RBAC)
| Role | Permissions |
|---|---|
| `user` | Own data, circles they're member of |
| `admin` (circle) | Manage members below them |
| `support` (platform) | Read-only user lookup, no PII export |
| `admin` (platform) | Full admin panel |

### Row-Level Security
- All location queries check ownership OR active share relationship
- Geofence access requires circle membership
- Circle member list requires active membership in that circle
- Emergency session details require being in recipient list
- Enforced both at API layer (guards) and DB layer (RLS policies)

### Insecure Direct Object Reference (IDOR) Prevention
- All resource IDs are UUIDv4 (not sequential integers)
- Every endpoint explicitly checks: "Does this authenticated user have permission to access this resource ID?"
- No resource is accessible by ID alone without ownership/membership check

### Principle of Least Privilege
- API keys / service accounts have minimum required DB permissions
- Location upload service cannot read other users' data
- Notification service cannot modify location data

---

## 4. Data Security

### Encryption at Rest
- Database: PostgreSQL Transparent Data Encryption (TDE) or encrypt at volume level (LUKS/AWS EBS encryption)
- Location coordinates: encrypted at application layer using AES-256-GCM before DB insert
  - Encryption key per-user, stored in AWS KMS or HashiCorp Vault
  - This means DB admin cannot read raw coordinates without key access
- Avatars and exports: S3 buckets with SSE-S3 or SSE-KMS

### Encryption in Transit
- All APIs: TLS 1.3 minimum, TLS 1.2 with approved ciphers
- HSTS with `max-age=31536000; includeSubDomains; preload`
- Certificate pinning in mobile app (bypass attempts logged)
- WebSocket connections use WSS (TLS)

### Location Data Precision
- Location coordinates rounded to ~10m precision when served to viewing users (not raw GPS)
- Full precision retained in DB for geofence calculations
- Users marked "paused" receive no coordinate updates regardless of share status

### Sensitive Field Handling
- Email addresses hashed for search (to prevent full-list enumeration by DB admin)
- Phone numbers stored encrypted
- Device push tokens stored encrypted (only decrypted for push sends)

---

## 5. Transport & API Security

### Headers
```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Content-Security-Policy: default-src 'self'; ...
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=()
```

### CORS
- Whitelist only known origins (mobile app's deep link domain, web dashboard)
- No wildcard CORS
- `Access-Control-Allow-Credentials: true` only for whitelisted origins

### Input Validation
- All inputs validated with class-validator (NestJS)
- Parameterized queries / TypeORM prevent SQL injection
- File uploads: magic byte validation, size limits, random key naming, served from CDN not app server
- JSON body size limit: 50KB default (except file upload endpoints)

### Request Signing for Background Uploads
- Mobile app signs location upload requests with HMAC-SHA256 using a device-specific secret
- Server verifies signature to prevent replay of location data
- Timestamp included in signed payload (5-minute window)

---

## 6. Privacy Infrastructure

### Consent Enforcement
- Every location share requires **both parties** to actively consent:
  1. Sharer creates a share request
  2. Viewer receives notification and must accept
  3. Only after acceptance does location flow
- Share requests expire after 48 hours if not accepted

### Transparent Sharing Indicators
- Mobile app shows persistent banner when background location is active
- Status bar indicator shows "Sharing Live Location"
- OS-level: iOS shows blue status bar, Android shows ongoing notification
- App sends a weekly push: "You are sharing with X people. Tap to review."

### Periodic Re-Consent
- Shares older than 30 days prompt for re-consent:
  - Push notification: "Still sharing with Alice? Confirm or stop."
  - Share paused after 7 days with no response
  - Share revoked after 14 days with no response

### Data Minimization
- Location only stored if user has opted into history AND has at least one active share
- Battery level only stored if user explicitly enables battery sharing
- No behavior analytics, no ad tracking

### Right to Erasure (GDPR Art. 17)
- Account deletion queued immediately (user can't sign in)
- All PII, location events, shares deleted within 30 days
- Consent logs pseudonymized (user_id replaced with hash, name removed)
- Audit logs: minimal anonymization (required for security investigations for 2 years)

---

## 7. Abuse Prevention

### Anti-Stalking Design
| Mechanism | Implementation |
|---|---|
| Mutual consent required | Share not active until both parties act |
| No phone-number tracking | No share possible without app install + voluntary consent |
| No silent enrollment | Every invite is visible on receiving device before acceptance |
| Revoke at any time | Single tap stop-sharing, no cooldown |
| Visible active indicator | OS-level location indicator when sharing |
| Re-consent reminders | Monthly re-confirmation for long-running shares |
| Block flow | Block immediately stops all location flow between parties |
| Emergency exit | Privacy dashboard → "Stop All Sharing" with one tap |

### Anomaly Detection
- Flag accounts that:
  - Create many circles and invite the same user repeatedly after rejection
  - Access location feed at unusual frequency (> 100 req/hour)
  - Have many blocked-by reports
  - Send invites from known VPN/Tor exit nodes

### Child / Minor Safety Mode (Guardian Mode)
- Minor must have the app installed
- Minor's device shows permanent visible "Location Sharing Active" notification
- Minor can see exactly who can view their location
- Minor can request to stop sharing (sends alert to guardian, logs event)
- No secret setup — any "family" tracking requires the minor device to physically accept setup

### Invite Abuse
- Rate-limited: 10 invites per circle per hour
- Same person cannot be re-invited within 24 hours of declining
- Blocked users cannot be invited

### Content Moderation
- User report system (harassment, stalking, unwanted tracking, impersonation)
- Reports reviewed by trust & safety team within 24 hours (SLA)
- Severe reports (stalking) escalated immediately

---

## 8. Secure Background Location

### Mobile-to-Server Upload Security
1. Location upload endpoint requires valid JWT
2. HMAC request signature (device secret) to prevent spoofed uploads
3. TLS certificate pinning on mobile HTTP client
4. Uploaded location validated: coordinates in plausible range, not future-dated
5. Server-side rate limiting (max 1 upload / 10 seconds per user)

### Background Service Transparency
- Android: Foreground Service with persistent notification ("SafeCircle is sharing your location")
- iOS: Background App Refresh + Significant Location Change mode (respects system limits)
- App cannot silently background-track — OS kills background processes without notification

---

## 9. Audit Logging

All of the following are logged with timestamp, actor, IP, user agent:

| Event |
|---|
| Login success / failure |
| Password change |
| Email change |
| Location share created/accepted/revoked |
| Circle created/joined/left/deleted |
| Member removed from circle |
| Geofence created/deleted |
| SOS activated/stopped |
| Account deletion requested |
| Data export requested |
| Admin action on user |
| Block/report filed |
| Privacy setting changed |
| New device login |

Admin audit logs retained for 2 years minimum.

---

## 10. Secure Development Practices

- Dependency scanning: `npm audit`, Snyk in CI pipeline
- SAST: ESLint security plugin, SonarQube
- Secrets scanning: GitLeaks in git hooks + CI
- No secrets in code — all via environment variables
- Docker images scanned for CVEs (Trivy)
- Penetration testing before launch and annually
- Bug bounty program post-launch
- Security.txt published at `/.well-known/security.txt`

---

## 11. Incident Response

1. **Detection:** Sentry alerts, anomaly detection flags, user reports
2. **Containment:** Suspend affected accounts, rotate compromised tokens, block IP ranges
3. **Investigation:** Audit log review, DB access logs
4. **Notification:** GDPR requires notifying supervisory authority within 72 hours of detected breach
5. **Remediation:** Patch, re-deploy, force re-authentication for affected users
6. **Post-mortem:** Written report, process update

---

## 12. Compliance

| Regulation | Approach |
|---|---|
| GDPR | DPA ready, data residency options, right to erasure, portability, consent logs |
| CCPA | Opt-out of data sale (we don't sell data), deletion on request |
| COPPA | No users under 13; age gate on registration |
| App Store guidelines | Background location explanation, privacy nutrition label, no deceptive pattern |
| Google Play | Background location permission declaration, foreground service notification |

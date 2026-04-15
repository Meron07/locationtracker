# SafeCircle — QA & Testing Plan

---

## 1. Testing Strategy Overview

| Layer | Tool | Coverage Target |
|---|---|---|
| Unit tests (backend) | Jest | 80% line coverage |
| Integration tests | Supertest + Jest | All API endpoints |
| E2E mobile tests | Patrol / Flutter Driver | Critical user flows |
| Security tests | Manual + OWASP ZAP | All auth + data endpoints |
| Performance tests | k6 | Socket connections, API latency |
| Background location tests | Manual device testing | iOS + Android |
| Abuse case tests | Manual | Privacy & consent flows |

---

## 2. Unit Tests (Backend)

### Auth Module
```typescript
describe('AuthService', () => {
  it('should register user and return access token')
  it('should reject duplicate email registration')
  it('should hash password with bcrypt before storing')
  it('should validate password with timing-safe comparison')
  it('should issue JWT with correct claims and RS256')
  it('should rotate refresh token on use')
  it('should revoke all sessions when suspicious replay detected')
  it('should reject expired refresh tokens')
  it('should reject revoked refresh tokens')
  it('should return identical error for wrong email and wrong password')
})
```

### Location Service
```typescript
describe('LocationService', () => {
  it('should accept valid location upload')
  it('should reject location with coordinates out of valid range')
  it('should reject location with future recorded_at')
  it('should reject location older than 1 hour')
  it('should only return locations from active shares')
  it('should not return paused share locations')
  it('should not return revoked share locations')
  it('should round coordinates to ~10m precision in feed response')
  it('should not store location if no active share exists')
  it('should deduplicate batch upload by user+timestamp')
})
```

### Geofence Service
```typescript
describe('GeofenceService', () => {
  it('should detect entry crossing correctly (PostGIS)')
  it('should detect exit crossing correctly')
  it('should not fire duplicate alert within 60 seconds')
  it('should fire dwell alert after configured minutes')
  it('should only alert subscribers with active shares')
  it('should not alert if geofence is deactivated')
})
```

### Circle Service
```typescript
describe('CircleService', () => {
  it('should create circle and set owner role')
  it('should generate unique invite code')
  it('should allow owner to change member to admin')
  it('should prevent admin from removing another admin')
  it('should prevent removed member from accessing circle')
  it('should clean up shares on member removal')
  it('should enforce max member limits')
})
```

### Share Service
```typescript
describe('LocationShareService', () => {
  it('should create pending share')
  it('should require viewer to accept before active')
  it('should expire share at configured time')
  it('should allow sharer to revoke at any time')
  it('should allow viewer to request revocation')
  it('should prevent sharing between blocked users')
  it('should trigger re-consent prompt after 30 days')
})
```

---

## 3. Integration Tests (API)

### Auth Endpoints
```typescript
describe('POST /auth/register', () => {
  it('201: creates user and returns token')
  it('409: rejects duplicate email (same response delay for timing safety)')
  it('400: rejects invalid email format')
  it('400: rejects weak password')
  it('429: rate limits after 5 attempts')
})

describe('POST /auth/login', () => {
  it('200: returns tokens for valid credentials')
  it('401: returns identical error for both wrong email and wrong password')
  it('429: rate limits after 10 attempts')
})

describe('POST /auth/refresh', () => {
  it('200: returns new access token and rotates refresh token')
  it('401: rejects previously used refresh token')
  it('401: revokes all sessions on replay attack detection')
  it('401: rejects expired refresh token')
})
```

### Location Endpoints  
```typescript
describe('GET /location/feed', () => {
  it('200: returns only authorized contacts')
  it('200: does not include paused shares')
  it('200: does not include contacts who have blocked caller')
  it('401: requires authentication')
})

describe('POST /location/upload', () => {
  it('204: stores valid location event')
  it('400: rejects invalid coordinates')
  it('429: rate limits to 1 per 10 seconds')
})
```

### Privacy Endpoints
```typescript
describe('POST /privacy/stop-all-sharing', () => {
  it('200: revokes all outgoing active shares')
  it('200: no locations visible to former viewers immediately after')
})

describe('DELETE /users/me', () => {
  it('204: soft-deletes user, cannot sign in after')
  it('204: queues GDPR deletion job')
})
```

---

## 4. Mobile UI Tests (Patrol)

### Critical Flows
```dart
// Sign up and onboarding
patrolTest('user can complete signup and onboarding', ($) async {
  await $.pumpAndSettle();
  await $.tap(find.text('Get Started'));
  await $.enterText(find.byKey(Key('email_field')), 'test@example.com');
  await $.enterText(find.byKey(Key('password_field')), 'Test1234!');
  await $.tap(find.text('Create Account'));
  expect(find.text('Allow Location'), findsOneWidget);
});

// Share location flow
patrolTest('user can send share request', ($) async { ... });

// SOS activation and cancellation
patrolTest('SOS activates after countdown and can be cancelled', ($) async {
  // Long-press SOS button
  await $.longPress(find.byKey(Key('sos_button')));
  expect(find.text('Alerting in 5...'), findsOneWidget);
  await $.tap(find.text('Cancel'));
  expect(find.text('SOS MODE ACTIVE'), findsNothing);
});

// Privacy dashboard stop all sharing
patrolTest('stop all sharing revokes all shares', ($) async { ... });
```

---

## 5. Permission Flow Tests

| Test | Platform | Expected |
|---|---|---|
| User denies location permission | iOS + Android | App works without location, graceful degradation |
| User grants "While Using" permission | iOS | Background sharing warns user and shows limitations |
| User revokes location in Settings | iOS + Android | App detects change, prompts re-enable |
| User denies notification permission | iOS + Android | Push not sent, in-app alerts still work |
| User revokes notification in Settings | iOS + Android | Fallback to in-app notification inbox |

---

## 6. Background Location Tests

| Scenario | iOS | Android | Pass Criteria |
|---|---|---|---|
| App backgrounded, user moving | Background App Refresh or significant change | ForegroundService | Location update within 60 sec |
| Device locked, user stationary | No update (significant change only) | ForegroundService at 5-min interval | Battery conserved |
| Low battery mode enabled | Reduced frequency | Doze mode fallback | Update every 10 min |
| Geofence entry while backgrounded | CLRegion monitoring fires | GeofencingAPI fires | Alert within 60 sec |
| Network disconnect then reconnect | Batch upload queued events | WorkManager uploads on reconnect | No events lost |

**Testing method:** Manual device testing. Two test devices, engineer 1 holds device with app active (map viewer), engineer 2 carries device (sharer). Walk through geofence boundaries, lock screen, enable airplane mode and reconnect.

---

## 7. Abuse Case Tests

| Abuse Scenario | Test | Expected |
|---|---|---|
| User A tries to read User B's location without share | `GET /location/feed` as A | B not in response |
| User tries to use another user's share ID | `PATCH /location/shares/{other_user_share}` | 403 Forbidden |
| User tries to join circle with invalid invite token | `POST /invites/invalid123/accept` | 404 Not Found |
| Blocked user sends share request | `POST /location/shares` to blocked user | 400 or silently dropped |
| User tries to enumerate user IDs | Sequential UUID requests | 404 (UUID not sequential, anti-enum) |
| User sends 1000 location uploads rapidly | Rate limit fires | 429 after 1st per 10s |
| Admin tries to access another org's data | `/admin/users/{id}` cross-org | 403 Forbidden |
| Expired share viewer requests feed | `GET /location/feed` | Expired sharer not in response |
| Re-invited user after blocking | Circle admin tries to invite blocked user | 400 (block prevents invite) |

---

## 8. Security Tests

### OWASP Top 10 Checklist
- [ ] A01 Broken Access Control: IDOR tests on all resource endpoints
- [ ] A02 Cryptographic Failures: Verify TLS cert, no HTTP fallback, token not in URL
- [ ] A03 Injection: SQL injection attempts on all text inputs; XSS on display name
- [ ] A04 Insecure Design: Re-consent flow tested; no bypass path to silent tracking
- [ ] A05 Security Misconfiguration: Security headers verified; no debug endpoints in prod
- [ ] A06 Vulnerable Components: `npm audit`; Snyk scan; no known high/critical CVEs
- [ ] A07 Auth Failures: Token replay tested; brute force rate limit tested
- [ ] A08 Software & Data Integrity: All uploads signed; no unsigned JWT accepted
- [ ] A09 Logging Failures: Verify all sensitive events appear in audit_logs
- [ ] A10 SSRF: Avatar URL upload doesn't allow internal network probing

### Specific Tests
```bash
# No raw password in logs
grep -r "password" logs/ → should return 0 matches

# Refresh token rotation – replay attack
1. Get refresh_token A
2. Use A → get token B + new refresh C
3. Replay A → expect 401 + all sessions revoked

# IDOR test
1. Create share as User 1 (share_id = X)
2. Try PATCH /location/shares/X as User 2 → 403

# Rate limit
for i in {1..20}; do curl -X POST /auth/login -d '...'; done
→ 429 on attempt 11 with Retry-After header
```

---

## 9. Performance Tests (k6)

### Socket Load Test
```javascript
// k6 script: 10,000 concurrent WebSocket connections
import ws from 'k6/ws';
export default function() {
  const url = 'wss://rt.safecircle.app/socket.io';
  const res = ws.connect(url, {}, function(socket) {
    socket.on('connected', () => {
      socket.send(JSON.stringify({ event: 'location:update', data: { /* ... */ } }));
    });
    socket.setTimeout(() => socket.close(), 30000);
  });
  check(res, { 'status is 101': (r) => r.status === 101 });
}
```

**Targets:**
- 10,000 concurrent connections without degradation
- p95 location broadcast latency < 500ms under load

### API Load Test
```javascript
// k6: 1,000 requests/second to GET /location/feed
export default function() {
  const res = http.get('https://api.safecircle.app/v1/location/feed', {
    headers: { Authorization: `Bearer ${TOKEN}` }
  });
  check(res, { 'status 200': (r) => r.status === 200, 'p95 < 300ms': ... });
}
```

---

## 10. Privacy Tests

| Test | Method | Pass Criteria |
|---|---|---|
| Delete account → no PII in DB | Delete user, then dump DB for user_id | Only pseudonymized consent log entries remain |
| Paused share sends no data | Pause share, upload location, GET /location/feed as viewer | Location not updated for viewer |
| History disabled → no events stored | Disable history, upload locations, query location_events | No events for that user |
| Export data includes all user data | POST /privacy/export, download file | Contains all user-related records |
| Consent log is append-only | Attempt DELETE on consent_logs | DB policy prevents deletion |

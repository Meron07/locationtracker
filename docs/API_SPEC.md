# SafeCircle — REST API Specification

> Base URL: `https://api.safecircle.app/v1`  
> All requests/responses are `application/json` unless noted  
> All authenticated endpoints require: `Authorization: Bearer <access_token>`

---

## General Conventions

| Convention | Detail |
|---|---|
| Auth | JWT Bearer token (`access_token` 15 min TTL) + `refresh_token` (httpOnly cookie, 30 day TTL) |
| Pagination | `?page=1&limit=20` with `{ data, meta: { page, limit, total } }` |
| Errors | `{ error: { code, message, details? } }` |
| Versioning | URL-based: `/v1/`, `/v2/` |
| Rate limiting | Per-route, per-IP and per-user via Redis token bucket |
| HTTPS | Enforced. HTTP redirects to HTTPS. HSTS header set. |

### Standard Error Codes

| Code | Meaning |
|---|---|
| `AUTH_REQUIRED` | Missing or invalid token |
| `FORBIDDEN` | Valid token but insufficient permission |
| `NOT_FOUND` | Resource doesn't exist or isn't visible to caller |
| `VALIDATION_ERROR` | Input validation failed |
| `RATE_LIMITED` | Too many requests |
| `CONFLICT` | Duplicate resource |

---

## Auth Endpoints

### POST /auth/register
Register with email and password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "Min8CharsWithUpperAndNumber1",
  "display_name": "Jane Smith"
}
```

**Response 201:**
```json
{
  "user": { "id": "uuid", "email": "user@example.com", "display_name": "Jane Smith" },
  "access_token": "eyJ...",
  "expires_in": 900
}
```
`refresh_token` set as httpOnly Secure SameSite=Strict cookie.

**Validation:** email format; password min 8 chars, mixed case + number; display_name min 2, max 50 chars  
**Errors:** `CONFLICT` if email already registered  
**Rate limit:** 5 attempts per IP per 15 minutes; CAPTCHA required after 3 failures  

---

### POST /auth/login
Login with email/password.

**Request:**
```json
{ "email": "user@example.com", "password": "..." }
```

**Response 200:**
```json
{
  "user": { "id": "uuid", "email": "...", "display_name": "..." },
  "access_token": "eyJ...",
  "expires_in": 900
}
```

**Rate limit:** 10 attempts per IP per 15 minutes; exponential backoff after 5 failures  
**Security:** Timing-safe comparison. Identical error message for wrong email and wrong password (anti-enumeration).

---

### POST /auth/firebase
Authenticate with Firebase ID token (Google/Apple sign-in).

**Request:**
```json
{ "firebase_token": "eyJ..." }
```

**Response 200:** Same as `/auth/login`

---

### POST /auth/refresh
Rotate refresh token and get new access token.

**Request:** httpOnly cookie `refresh_token` (no body)

**Response 200:**
```json
{ "access_token": "eyJ...", "expires_in": 900 }
```

**Security:** Old refresh token immediately invalidated on use (rotation). If a previously used token is reused, all user sessions revoked (replay attack detection).

---

### POST /auth/logout
Revoke current session.

**Auth:** Required

**Response 204:** No body. Refresh token cookie cleared.

---

### POST /auth/logout-all
Revoke all sessions across all devices.

**Auth:** Required

**Response 204**

---

### POST /auth/forgot-password
Initiate password reset.

**Request:** `{ "email": "user@example.com" }`

**Response 200:** Always returns same response to prevent email enumeration.

---

### POST /auth/reset-password
**Request:**
```json
{ "token": "...", "new_password": "NewPass123!" }
```

**Validation:** Token valid 1 hour; invalidated after use.

---

## User Endpoints

### GET /users/me
Get authenticated user's full profile.

**Response 200:**
```json
{
  "id": "uuid",
  "email": "...",
  "display_name": "...",
  "avatar_url": "...",
  "status_message": "...",
  "show_last_seen": true,
  "share_battery_level": false,
  "last_seen_at": "2026-04-15T12:00:00Z",
  "emergency_contact": { "id": "uuid", "display_name": "..." }
}
```

---

### PATCH /users/me
Update profile.

**Request:** Any subset of updatable fields:
```json
{
  "display_name": "Jane S.",
  "status_message": "At the park",
  "show_last_seen": false,
  "share_battery_level": true,
  "emergency_message": "Call 911 and come to me"
}
```

---

### POST /users/me/avatar
Upload avatar image.

**Request:** `multipart/form-data`, field: `avatar` (JPEG/PNG/WebP, max 5MB)

**Response 200:** `{ "avatar_url": "https://..." }`

**Security:** File type validated by magic bytes, not extension. Uploaded to S3 with random key.

---

### DELETE /users/me
Request account deletion.

**Request:** `{ "password": "...", "reason": "optional string" }`

**Behavior:** Queues deletion job. User soft-deleted immediately (cannot sign in). All location data, shares, circles owned purged within 30 days per GDPR Article 17. Consent log entries retained (pseudonymized) for legal compliance.

---

### GET /users/me/consent-log
Get user's consent history.

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "action": "location_share_granted",
      "target_display_name": "Bob",
      "created_at": "2026-04-01T10:00:00Z"
    }
  ]
}
```

---

### POST /users/me/emergency-contact
Set emergency contact.

**Request:** `{ "contact_user_id": "uuid" }`

**Validation:** Contact must have an active location share with the user.

---

## Circle Endpoints

### POST /circles
Create a circle.

**Request:**
```json
{ "name": "Smith Family", "description": "Family group" }
```

**Response 201:** Circle object with `invite_code`.

**Rate limit:** 5 circles per user (free), 20 (Pro).

---

### GET /circles
Get user's circles.

**Response 200:** Array of circles with member count and user's role.

---

### GET /circles/:id
Get circle details (members, geofences, settings).

**Auth:** Must be an active member.

---

### PATCH /circles/:id
Update circle (name, description, avatar).

**Auth:** Must be owner or admin.

---

### DELETE /circles/:id
Delete circle.

**Auth:** Must be owner.

**Behavior:** Removes all memberships, geofences, and shared location relationships within circle.

---

### GET /circles/:id/members
List members of a circle.

**Auth:** Must be active member.

---

### PATCH /circles/:id/members/:user_id
Update a member's role.

**Auth:** Owner only.

**Request:** `{ "role": "admin" }`

---

### DELETE /circles/:id/members/:user_id
Remove a member from circle.

**Auth:** Owner or admin. Admins cannot remove other admins.

---

### POST /circles/:id/leave
Leave a circle.

**Auth:** Must be active member. Owners must transfer ownership first.

---

## Invite Endpoints

### POST /circles/:id/invites
Create an invite link / token.

**Auth:** Owner or admin.

**Request:**
```json
{
  "method": "link",        // "link" | "email" | "qr"
  "email": "bob@example.com",   // required if method = email
  "expires_in_hours": 72
}
```

**Response 201:**
```json
{
  "invite_token": "abc123def",
  "invite_url": "https://safecircle.app/join/abc123def",
  "expires_at": "2026-04-18T12:00:00Z"
}
```

**Rate limit:** 10 invites per circle per hour.  
**Security:** Tokens are single-use, cryptographically random (32 bytes).

---

### POST /invites/:token/accept
Accept an invite.

**Auth:** Required (must be authenticated user).

**Behavior:** Creates circle_membership with status='active'. Token invalidated.

---

### GET /invites/:token/preview
Preview a circle before accepting (name, member count, inviter name).

**Auth:** Optional (for unauthenticated deep links).

---

## Location Upload Endpoints

### POST /location/upload
Upload a location event.

**Auth:** Required.

**Request:**
```json
{
  "latitude": 59.9139,
  "longitude": 10.7522,
  "accuracy": 15.0,
  "altitude": 25.0,
  "speed": 0.0,
  "heading": 0.0,
  "battery_level": 82,
  "is_charging": false,
  "activity": "stationary",
  "recorded_at": "2026-04-15T12:00:00Z"
}
```

**Response 204**

**Validation:** lat/lng in valid range; accuracy > 0; recorded_at not in future; not older than 1 hour from now.  
**Security:** Only stored if user has at least one active share. Coordinates encrypted at application layer before DB write. Rate limit: 1 upload per 10 seconds per user.

---

### POST /location/batch-upload
Upload up to 50 location events (for background sync).

**Request:** `{ "events": [... array of upload objects ...] }`

**Response 200:** `{ "accepted": 48, "rejected": 2 }`

---

## Map Feed Endpoints

### GET /location/feed
Get current location of all users sharing with the authenticated user.

**Response 200:**
```json
{
  "data": [
    {
      "user_id": "uuid",
      "display_name": "Bob",
      "avatar_url": "...",
      "latitude": 59.9,
      "longitude": 10.7,
      "accuracy": 20,
      "battery_level": 75,
      "activity": "walking",
      "last_updated": "2026-04-15T12:01:00Z",
      "share_id": "uuid",
      "share_expires_at": "2026-04-15T20:00:00Z"
    }
  ]
}
```

**Security:** Only returns users with `status='active'` share toward caller. Location precision may be reduced if accuracy > 100m. Never exposes raw DB coordinates—goes through authorization check on every request.

---

### GET /location/shares
Get all active location sharing relationships (both directions).

**Response 200:**
```json
{
  "sharing_with": [...],    // I am sharing with these users
  "shared_by": [...]        // These users are sharing with me
}
```

---

### POST /location/shares
Request to share location with someone.

**Request:** `{ "target_user_id": "uuid", "duration": "1hr", "share_battery": true }`

**Behavior:** Creates share with `status='pending'`. Sends push notification to target.

**Validation:** Target not blocked; not already sharing; user not deleted.

---

### PATCH /location/shares/:id
Update a share (pause, extend, change duration).

**Request:**
```json
{
  "status": "paused",
  "paused_until": "2026-04-15T14:00:00Z"
}
```

**Auth:** Sharer only can pause/revoke their own share.

---

### DELETE /location/shares/:id
Revoke a share.

**Auth:** Either party can revoke (sharer ends their share; viewer can ask sharer to stop).

---

### POST /location/shares/:id/respond
Accept or decline a share request.

**Auth:** The target user only.

**Request:** `{ "action": "accept" | "decline" }`

---

## Geofence Endpoints

### POST /geofences
Create a geofence.

**Request:**
```json
{
  "name": "School",
  "circle_id": "uuid",
  "center_lat": 59.92,
  "center_lng": 10.75,
  "radius_meters": 150,
  "alert_on_enter": true,
  "alert_on_exit": true,
  "alert_on_dwell": false,
  "subscriptions": [
    { "tracked_user_id": "uuid" }
  ]
}
```

**Response 201:** Geofence object.

**Rate limit:** 10 geofences per user (free), 50 (Pro).

---

### GET /geofences
Get user's geofences.

---

### PATCH /geofences/:id
Update geofence settings.

**Auth:** Owner only.

---

### DELETE /geofences/:id
Delete a geofence.

---

### POST /geofences/:id/subscriptions
Add a subscription (track another user for this geofence).

**Auth:** Geofence owner + must have active share from that user.

---

## Alert Endpoints

### GET /alerts
Get user's notifications/alerts.

**Query params:** `?type=geofence_enter&unread_only=true&limit=20`

---

### PATCH /alerts/:id/read
Mark alert as read.

---

### POST /alerts/read-all
Mark all alerts read.

---

## SOS Endpoints

### POST /sos
Activate SOS session.

**Request:**
```json
{
  "message": "I need help",
  "countdown_seconds": 5,
  "recipient_ids": ["uuid1", "uuid2"]
}
```

**Response 201:**
```json
{
  "session_id": "uuid",
  "status": "active",
  "expires_at": "2026-04-15T16:00:00Z"
}
```

**Behavior:** After `countdown_seconds`, sends push notifications + real-time socket events to recipients. Recipients immediately receive a special "SOS" alert with location.

---

### DELETE /sos/:session_id
Stop SOS session.

**Auth:** Session owner only.

---

### GET /sos/:session_id
Get SOS session details (for recipients).

**Auth:** Must be in recipient list.

---

## Privacy Endpoints

### GET /privacy/dashboard
Get a full summary of who can see what.

**Response 200:**
```json
{
  "active_shares_outgoing": 3,
  "active_shares_incoming": 2,
  "location_history_enabled": true,
  "history_retention_days": 7,
  "contacts_with_access": [
    {
      "user_id": "uuid",
      "display_name": "Alice",
      "share_since": "2026-03-01T00:00:00Z",
      "share_expires_at": null
    }
  ],
  "last_consent_reminder": "2026-03-01T00:00:00Z"
}
```

---

### PATCH /privacy/settings
Update privacy settings.

**Request:**
```json
{
  "location_history_enabled": true,
  "history_retention_days": 7,
  "show_last_seen": true,
  "share_battery_level": false
}
```

---

### POST /privacy/stop-all-sharing
Immediately revoke all active outgoing location shares.

**Response 200:** `{ "revoked_count": 3 }`

---

### POST /privacy/hide-me
Pause all sharing for a specified duration.

**Request:** `{ "duration_minutes": 60 }`

---

### GET /privacy/export
Request a personal data export.

**Behavior:** Queues export job. Returns immediately. User gets push notification when download is ready.

---

## Admin Endpoints

All admin endpoints require `role = 'admin'` or `role = 'support'`.

### GET /admin/users
List users with filter/search.

**Query:** `?email=...&status=active&page=1`

---

### GET /admin/users/:id
Get full user details (admin view).

---

### POST /admin/users/:id/suspend
Suspend a user account.

**Request:** `{ "reason": "...", "duration_hours": 24 }`

---

### GET /admin/reports
List abuse reports.

**Query:** `?status=pending`

---

### PATCH /admin/reports/:id
Update report status.

**Request:** `{ "status": "resolved", "action_taken": "user_warned" }`

---

### GET /admin/audit-logs
Query audit logs.

**Query:** `?action=login&user_id=...&start=2026-04-01&end=2026-04-15`

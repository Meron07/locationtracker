# SafeCircle — Database Schema

> PostgreSQL 15+ with PostGIS extension required  
> All timestamps stored as UTC `TIMESTAMPTZ`

---

## Setup

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

---

## 1. users

```sql
CREATE TABLE users (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email                 TEXT UNIQUE NOT NULL,
  email_verified        BOOLEAN NOT NULL DEFAULT FALSE,
  phone                 TEXT UNIQUE,
  phone_verified        BOOLEAN NOT NULL DEFAULT FALSE,
  display_name          TEXT NOT NULL,
  avatar_url            TEXT,
  status_message        TEXT,                          -- "At the park"
  firebase_uid          TEXT UNIQUE,                   -- Firebase Auth UID
  password_hash         TEXT,                          -- NULL for OAuth-only accounts
  role                  TEXT NOT NULL DEFAULT 'user'   CHECK (role IN ('user','admin','support')),

  -- Privacy preferences
  show_last_seen        BOOLEAN NOT NULL DEFAULT TRUE,
  share_battery_level   BOOLEAN NOT NULL DEFAULT FALSE,
  allow_search_by_email BOOLEAN NOT NULL DEFAULT TRUE,

  -- Emergency contact (FK resolved later)
  emergency_contact_id  UUID REFERENCES users(id) ON DELETE SET NULL,
  emergency_message     TEXT DEFAULT 'I need help. Here is my location.',

  -- Timestamps
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at          TIMESTAMPTZ,
  deleted_at            TIMESTAMPTZ                   -- soft delete
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_firebase_uid ON users(firebase_uid);
CREATE INDEX idx_users_deleted_at ON users(deleted_at) WHERE deleted_at IS NULL;
```

---

## 2. devices

```sql
CREATE TABLE devices (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_token    TEXT NOT NULL,                       -- FCM/APNs push token
  platform        TEXT NOT NULL CHECK (platform IN ('ios','android')),
  app_version     TEXT NOT NULL,
  os_version      TEXT,
  device_model    TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  last_active_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_devices_user_id ON devices(user_id);
CREATE UNIQUE INDEX idx_devices_token ON devices(device_token);
```

---

## 3. refresh_tokens

```sql
CREATE TABLE refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,                    -- bcrypt hash of token
  device_id   UUID REFERENCES devices(id) ON DELETE SET NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens(expires_at) WHERE revoked_at IS NULL;
```

---

## 4. circles

```sql
CREATE TABLE circles (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         TEXT NOT NULL,
  description  TEXT,
  avatar_url   TEXT,
  owner_id     UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  invite_code  TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(8), 'hex'),
  max_members  INTEGER NOT NULL DEFAULT 10,           -- Pro: up to 50
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_circles_owner_id ON circles(owner_id);
CREATE INDEX idx_circles_invite_code ON circles(invite_code);
```

---

## 5. circle_memberships

```sql
CREATE TABLE circle_memberships (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  circle_id       UUID NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role            TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner','admin','member','guest')),
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','declined','removed')),
  invited_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  invite_token    TEXT UNIQUE,                         -- secure random token for email invites
  invite_expires  TIMESTAMPTZ,
  joined_at       TIMESTAMPTZ,
  left_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(circle_id, user_id)
);

CREATE INDEX idx_memberships_circle_id ON circle_memberships(circle_id);
CREATE INDEX idx_memberships_user_id ON circle_memberships(user_id);
CREATE INDEX idx_memberships_invite_token ON circle_memberships(invite_token) WHERE invite_token IS NOT NULL;
```

---

## 6. location_shares

Tracks an active bilateral consent relationship between two users.

```sql
CREATE TABLE location_shares (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sharer_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,   -- who is sharing
  viewer_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,   -- who can see
  circle_id       UUID REFERENCES circles(id) ON DELETE SET NULL,         -- optional group context
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','active','paused','expired','revoked')),
  duration        TEXT CHECK (duration IN ('15min','1hr','8hr','indefinite')),
  share_battery   BOOLEAN NOT NULL DEFAULT FALSE,
  share_history   BOOLEAN NOT NULL DEFAULT FALSE,
  paused_until    TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(sharer_id, viewer_id)
);

CREATE INDEX idx_shares_sharer_id ON location_shares(sharer_id);
CREATE INDEX idx_shares_viewer_id ON location_shares(viewer_id);
CREATE INDEX idx_shares_status ON location_shares(status) WHERE status = 'active';
CREATE INDEX idx_shares_expires ON location_shares(expires_at) WHERE expires_at IS NOT NULL;
```

---

## 7. location_events

Stores raw location uploads. PostGIS geometry for efficient spatial queries.

```sql
CREATE TABLE location_events (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  coordinates     GEOMETRY(Point, 4326) NOT NULL,      -- PostGIS point (lng, lat)
  accuracy        FLOAT,                               -- meters
  altitude        FLOAT,
  speed           FLOAT,                               -- m/s
  heading         FLOAT,                               -- degrees
  battery_level   INTEGER CHECK (battery_level BETWEEN 0 AND 100),
  is_charging     BOOLEAN,
  activity        TEXT CHECK (activity IN ('stationary','walking','running','driving','unknown')),
  source          TEXT NOT NULL DEFAULT 'gps' CHECK (source IN ('gps','network','passive')),
  recorded_at     TIMESTAMPTZ NOT NULL,               -- when device recorded it
  uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()  -- when we received it
);

-- Spatial index for geofence queries
CREATE INDEX idx_location_events_coordinates ON location_events USING GIST(coordinates);
CREATE INDEX idx_location_events_user_id ON location_events(user_id);
CREATE INDEX idx_location_events_recorded_at ON location_events(user_id, recorded_at DESC);

-- Retention: partition by month for easy data expiry
-- Managed via pg_partman or scheduled cleanup job
```

---

## 8. saved_places

```sql
CREATE TABLE saved_places (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  type        TEXT NOT NULL DEFAULT 'custom'
              CHECK (type IN ('home','school','office','gym','custom')),
  address     TEXT,
  coordinates GEOMETRY(Point, 4326) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_saved_places_user_id ON saved_places(user_id);
CREATE INDEX idx_saved_places_coordinates ON saved_places USING GIST(coordinates);
```

---

## 9. geofences

```sql
CREATE TABLE geofences (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,  -- who created it
  circle_id       UUID REFERENCES circles(id) ON DELETE CASCADE,         -- optional circle scope
  saved_place_id  UUID REFERENCES saved_places(id) ON DELETE SET NULL,
  name            TEXT NOT NULL,
  boundary        GEOMETRY(Polygon, 4326) NOT NULL,   -- polygon for complex shapes
  radius_meters   INTEGER NOT NULL DEFAULT 200,
  alert_on_enter  BOOLEAN NOT NULL DEFAULT TRUE,
  alert_on_exit   BOOLEAN NOT NULL DEFAULT TRUE,
  alert_on_dwell  BOOLEAN NOT NULL DEFAULT FALSE,
  dwell_minutes   INTEGER,                            -- alert if inside for X minutes
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_geofences_owner_id ON geofences(owner_id);
CREATE INDEX idx_geofences_boundary ON geofences USING GIST(boundary);
CREATE INDEX idx_geofences_active ON geofences(is_active) WHERE is_active = TRUE;
```

---

## 10. geofence_subscriptions

Who gets alerted for which geofence and which tracked user.

```sql
CREATE TABLE geofence_subscriptions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  geofence_id     UUID NOT NULL REFERENCES geofences(id) ON DELETE CASCADE,
  subscriber_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,  -- receives alert
  tracked_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,  -- whose location triggers it
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(geofence_id, subscriber_id, tracked_user_id)
);

CREATE INDEX idx_geofence_subs_geofence_id ON geofence_subscriptions(geofence_id);
CREATE INDEX idx_geofence_subs_tracked_user ON geofence_subscriptions(tracked_user_id);
```

---

## 11. alerts

```sql
CREATE TABLE alerts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type            TEXT NOT NULL CHECK (type IN ('geofence_enter','geofence_exit','geofence_dwell','sos','low_battery','no_update','share_request','share_approved','share_revoked')),
  recipient_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_id        UUID REFERENCES users(id) ON DELETE SET NULL,           -- user who triggered
  geofence_id     UUID REFERENCES geofences(id) ON DELETE SET NULL,
  location_lat    FLOAT,
  location_lng    FLOAT,
  message         TEXT,
  is_read         BOOLEAN NOT NULL DEFAULT FALSE,
  push_sent       BOOLEAN NOT NULL DEFAULT FALSE,
  push_sent_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_alerts_recipient_id ON alerts(recipient_id, created_at DESC);
CREATE INDEX idx_alerts_unread ON alerts(recipient_id) WHERE is_read = FALSE;
```

---

## 12. emergency_sessions

```sql
CREATE TABLE emergency_sessions (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status            TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','stopped','expired')),
  message           TEXT NOT NULL DEFAULT 'I need help. Here is my live location.',
  countdown_seconds INTEGER NOT NULL DEFAULT 5,
  activated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at        TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '4 hours',
  stopped_at        TIMESTAMPTZ,
  last_location     GEOMETRY(Point, 4326),
  battery_at_start  INTEGER
);

CREATE INDEX idx_emergency_sessions_user_id ON emergency_sessions(user_id);
CREATE INDEX idx_emergency_sessions_active ON emergency_sessions(status, expires_at) WHERE status = 'active';
```

---

## 13. emergency_session_recipients

```sql
CREATE TABLE emergency_session_recipients (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id      UUID NOT NULL REFERENCES emergency_sessions(id) ON DELETE CASCADE,
  recipient_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notified_at     TIMESTAMPTZ,
  UNIQUE(session_id, recipient_id)
);
```

---

## 14. notification_preferences

```sql
CREATE TABLE notification_preferences (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                 UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  geofence_enter          BOOLEAN NOT NULL DEFAULT TRUE,
  geofence_exit           BOOLEAN NOT NULL DEFAULT TRUE,
  geofence_dwell          BOOLEAN NOT NULL DEFAULT TRUE,
  sos_alerts              BOOLEAN NOT NULL DEFAULT TRUE,
  low_battery             BOOLEAN NOT NULL DEFAULT TRUE,
  no_update_minutes       INTEGER DEFAULT 60,             -- alert after X mins of silence
  share_requests          BOOLEAN NOT NULL DEFAULT TRUE,
  share_approved          BOOLEAN NOT NULL DEFAULT TRUE,
  quiet_hours_enabled     BOOLEAN NOT NULL DEFAULT FALSE,
  quiet_start             TIME,                           -- e.g. 22:00
  quiet_end               TIME,                           -- e.g. 07:00
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 15. consent_logs

Immutable audit trail for all consent events.

```sql
CREATE TABLE consent_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,  -- RESTRICT to keep audit trail
  action      TEXT NOT NULL,
  -- Examples: 'location_share_granted', 'location_share_revoked', 'geofence_created',
  --           'sos_activated', 'account_deleted_requested', 'data_export_requested',
  --           'circle_joined', 'circle_left', 'privacy_setting_changed'
  target_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  target_resource_id UUID,
  target_resource_type TEXT,
  metadata    JSONB,
  ip_address  INET,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_consent_logs_user_id ON consent_logs(user_id, created_at DESC);
CREATE INDEX idx_consent_logs_action ON consent_logs(action);
-- This table is append-only; no updates or deletes allowed in normal flow
```

---

## 16. audit_logs

System-level security audit log.

```sql
CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  resource    TEXT,
  resource_id UUID,
  result      TEXT NOT NULL CHECK (result IN ('success','failure','denied')),
  metadata    JSONB,
  ip_address  INET,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_actor_id ON audit_logs(actor_id, created_at DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
-- Retain 2 years minimum for security investigations
```

---

## 17. blocked_users

```sql
CREATE TABLE blocked_users (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  blocker_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id)
);

CREATE INDEX idx_blocked_users_blocker ON blocked_users(blocker_id);
CREATE INDEX idx_blocked_users_blocked ON blocked_users(blocked_id);
```

---

## 18. reports

```sql
CREATE TABLE reports (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reported_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason          TEXT NOT NULL CHECK (reason IN ('harassment','stalking','unwanted_tracking','spam','impersonation','other')),
  description     TEXT,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','reviewed','resolved','dismissed')),
  reviewed_by     UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reports_reporter ON reports(reporter_id);
CREATE INDEX idx_reports_reported ON reports(reported_user_id);
CREATE INDEX idx_reports_status ON reports(status) WHERE status = 'pending';
```

---

## 19. data_export_requests

```sql
CREATE TABLE data_export_requests (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status          TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','processing','ready','downloaded','expired')),
  download_url    TEXT,
  download_token  TEXT UNIQUE,
  expires_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ
);
```

---

## Data Retention Policy

| Table | Retention | Notes |
|---|---|---|
| location_events | User-configurable: 24h / 7d / 30d / 90d | Default 7 days for opted-in users; 24h for non-opted-in |
| alerts | 90 days | Geofence + SOS alerts |
| consent_logs | 2 years | Legal audit trail |
| audit_logs | 2 years | Security audit trail |
| emergency_sessions | 1 year | Safety investigation reference |
| refresh_tokens | Until expired/revoked | Cleanup expired tokens weekly |
| data_export_requests | 7 days after ready | Download URL expires |

---

## Row-Level Security (RLS) Notes

Enable RLS on sensitive tables to enforce authorization at the database level:

```sql
ALTER TABLE location_events ENABLE ROW LEVEL SECURITY;

-- Users can only read their own events or events from approved sharers
CREATE POLICY location_events_select ON location_events
  FOR SELECT
  USING (
    user_id = current_setting('app.current_user_id')::UUID
    OR EXISTS (
      SELECT 1 FROM location_shares ls
      WHERE ls.sharer_id = location_events.user_id
        AND ls.viewer_id = current_setting('app.current_user_id')::UUID
        AND ls.status = 'active'
    )
  );

-- Users can only insert their own events
CREATE POLICY location_events_insert ON location_events
  FOR INSERT
  WITH CHECK (user_id = current_setting('app.current_user_id')::UUID);
```

Apply similar policies to `location_shares`, `circle_memberships`, `geofences`, `emergency_sessions`.

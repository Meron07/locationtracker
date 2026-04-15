# SafeCircle — Realtime Design

---

## 1. Technology Choice

**Socket.IO over NestJS WebGateways**, with Redis adapter for horizontal scaling.

| Option | Pros | Cons |
|---|---|---|
| Socket.IO | Full-duplex, reconnection handling, rooms, namespaces | Slightly more overhead than raw WS |
| Firebase Realtime DB | Easy setup, offline sync | Vendor lock-in, less control over auth/security |
| Raw WebSocket | Minimal overhead | Must reimplement rooms, reconnect, auth |
| Server-Sent Events | Simple for one-way push | Cannot send commands back |

**Decision:** Socket.IO — mature, battle-tested, excellent reconnection behavior, works well with NestJS, scales horizontally with Redis adapter.

---

## 2. Architecture Overview

```
Mobile App (Flutter)
     |
     | WSS (TLS 1.3)
     |
NestJS WebGateway (Socket.IO)
     |
     +-- Redis PubSub Adapter (horizontal scale)
     |
     +-- PostgreSQL (location persistence)
     |
     +-- Firebase Cloud Messaging (push when socket offline)
```

Multiple NestJS instances behind a load balancer are synchronized via the **Redis Socket.IO adapter** so a user on instance A can receive events emitted by a user on instance B.

---

## 3. Socket Connection Lifecycle

### 3.1 Client Connection
```
1. Client opens WSS connection to wss://rt.safecircle.app/socket.io
2. Client sends auth handshake in connection query or first event
3. Server validates JWT access token
4. On success: socket joins user's personal room + all active circle rooms
5. Server emits `connected` event with server timestamp
6. Client begins sending location pings at configured interval
```

### 3.2 Authentication Handshake
```javascript
// Client sends during connect:
{
  auth: {
    token: "eyJ..."  // JWT access token (NOT refresh token)
  }
}

// Server validates:
// 1. Token signature with RS256 public key
// 2. Token not expired
// 3. User not deleted / suspended
// 4. Sets socket.data.userId

// On failure: server emits 'auth_error' and disconnects
```

### 3.3 Room Model
```
user:{userId}           → personal room (SOS alerts, share requests, direct notifications)
circle:{circleId}       → circle room (group location events, circle notifications)
sos:{sessionId}         → SOS session room (emergency location stream)
```

The server controls room membership — clients cannot self-join rooms. Joining is validated against DB state.

### 3.4 Disconnection
```
1. Client disconnects (network loss or app background)
2. Server marks socket as inactive
3. Pending location events queued for 5 minutes
4. After 5 minutes of silence: emit `user_offline` to authorized viewers
5. On reconnect: server re-validates auth, re-joins rooms, sends missed events summary
```

---

## 4. Location Update Flow

### 4.1 Upload Event (Client → Server)
```javascript
// Event name: 'location:update'
// Payload:
{
  latitude: 59.9139,
  longitude: 10.7522,
  accuracy: 15.0,
  altitude: 25.0,
  speed: 1.2,
  battery_level: 78,
  activity: "walking",
  recorded_at: "2026-04-15T12:00:00Z"
}
```

### 4.2 Server Processing
```
1. Validate JWT (socket.data.userId)
2. Input validation (coordinate range, timestamp sanity)
3. Check user has at least one active location share
4. Persist to location_events (async, non-blocking)
5. Determine viewers: SELECT viewer_id FROM location_shares WHERE sharer_id = userId AND status = 'active'
6. For each viewer:
   a. If viewer is connected → emit 'location:updated' to user:{viewerId} room
   b. If viewer is offline → no real-time update (they'll get REST feed on next open)
7. Run geofence check asynchronously (queue job)
```

### 4.3 Broadcast Event (Server → Viewer)
```javascript
// Event name: 'location:updated'
// Sent to: user:{viewerId} room
{
  user_id: "uuid",
  display_name: "Alice",
  avatar_url: "...",
  latitude: 59.9139,      // Rounded to ~10m precision
  longitude: 10.7522,
  accuracy: 15,
  battery_level: 78,       // Only if sharer has battery sharing ON
  activity: "walking",
  last_updated: "2026-04-15T12:00:00Z",
  share_id: "uuid"
}
```

---

## 5. Update Frequency & Battery Optimization

### Adaptive Intervals
| User State | Upload Interval | Power Mode |
|---|---|---|
| App in foreground | Every 10 seconds | High accuracy GPS |
| App in background, moving | Every 30 seconds | Balanced power |
| App in background, stationary | Every 5 minutes | Significant change only |
| App in background, charging | Every 15 seconds | High accuracy GPS |
| Low battery (<20%) | Every 10 minutes | Low power |
| Share paused | No uploads | None |

### iOS Background Strategy
1. **Significant Location Change** (primary): wakes app on cell tower change (~500m movement)
2. **Background App Refresh**: system-scheduled wake-ups
3. **Silent Push Notifications**: server sends silent push to wake app for location update
4. Client uses `CLLocationManager` with `desiredAccuracy = kCLLocationAccuracyHundredMeters` in background

### Android Background Strategy
1. **FusedLocationProviderClient** with `PRIORITY_BALANCED_POWER_ACCURACY`
2. **Foreground Service** with persistent notification (required for reliable background on Android 8+)
3. **WorkManager** as fallback for doze mode
4. **Geofencing API** for arrival/departure without continuous GPS

### Server-Sent Frequency Control
Server can send `location:config` event to adjust client upload rate:
```javascript
// Server → Client
{
  event: 'location:config',
  data: {
    interval_seconds: 30,
    accuracy: 'balanced',
    reason: 'server_load'
  }
}
```

---

## 6. SOS Real-Time Flow

```javascript
// 1. User activates SOS (via REST: POST /sos)
// 2. Server creates emergency_session
// 3. Server emits to each recipient's personal room:
{
  event: 'sos:activated',
  data: {
    session_id: "uuid",
    from_user: { id: "uuid", display_name: "Alice", avatar_url: "..." },
    message: "I need help",
    latitude: 59.9139,
    longitude: 10.7522,
    battery_level: 45,
    activated_at: "2026-04-15T12:00:00Z"
  }
}

// 4. If recipient offline → FCM high-priority push notification

// 5. Server creates sos:{sessionId} room
// 6. Sharer and recipients auto-joined to room

// 7. Sharer's location updates emitted to sos:{sessionId} room at 10-second intervals
// regardless of normal sharing settings

// 8. When SOS ends:
{
  event: 'sos:ended',
  data: { session_id: "uuid", stopped_at: "2026-04-15T13:00:00Z" }
}
```

---

## 7. Share Request Real-Time Flow

```javascript
// Sharer sends POST /location/shares →
// Server stores pending share, then emits to viewer:
{
  event: 'share:request',
  data: {
    share_id: "uuid",
    from_user: { id: "uuid", display_name: "Bob", avatar_url: "..." },
    duration: "1hr",
    expires_in_seconds: 172800   // request expires in 48hrs
  }
}

// Viewer accepts via REST: POST /location/shares/:id/respond
// Server emits back to sharer:
{
  event: 'share:accepted',
  data: { share_id: "uuid", accepted_by: { display_name: "Alice" } }
}
// Sharer immediately starts receiving Alice's location
```

---

## 8. Geofence Alert Real-Time Flow

```
1. Location event received
2. Async job: for each active geofence, PostGIS query:
   ST_DWithin(geofence.boundary, event.coordinates, 0)
3. If crossing detected (in → out or out → in):
   a. Create alert in DB
   b. Emit to subscriber: 'geofence:alert' event
   c. If subscriber offline: FCM push
4. Alert deduplicated: same user + same geofence crossing not re-alerted within 60 seconds
```

---

## 9. Offline Behavior

### Client goes offline
- Socket disconnection detected via heartbeat timeout (30s)
- Server emits `user_offline` to authorized viewers (with timestamp)
- Map shows "Last seen X minutes ago" label with greyed-out marker

### Client comes back online
1. Socket reconnects with valid JWT (auto-retry with exponential backoff)
2. Server re-joins rooms
3. Client calls `GET /location/feed` to get fresh state
4. Client calls `GET /alerts?since={last_seen}` to get missed alerts
5. Socket stream resumes

### Network Partition Handling
- Location uploads queued locally in SQLite on mobile
- On reconnect, batch upload via `POST /location/batch-upload`
- Max queue: 4 hours of events (then discard if storage pressure)

---

## 10. Conflict Resolution

- **Duplicate location uploads:** Deduplicated by `(user_id, recorded_at)` unique constraint
- **Share status conflicts:** Server is source of truth; client always reconciles with server state on reconnect
- **Clock skew:** Server uses `uploaded_at` for ordering; `recorded_at` for display. Events with `recorded_at` > `NOW() + 5min` rejected.

---

## 11. Performance Targets

| Metric | Target |
|---|---|
| Location update latency (p50) | < 200ms |
| Location update latency (p99) | < 1000ms |
| Socket connections per instance | 10,000 |
| Geofence check time (p95) | < 500ms |
| Max circle size | 50 members (Pro) |
| Redis pub/sub throughput | > 100k events/sec |

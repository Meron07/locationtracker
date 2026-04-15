# SafeCircle — Product Requirements Document

> Version 1.0 | April 2026 | Status: Draft

---

## 1. Product Summary

SafeCircle is a consent-based, privacy-first real-time location sharing mobile app for families, friends, couples, and small field teams. Every location share is explicit, mutual, and revocable at any time. The app solves the everyday need to coordinate safety and meetups without resorting to surveillance—positioning itself between clunky manual check-ins and invasive tracking apps.

---

## 2. Problem Statement

Existing solutions fall into two extremes:

| Problem | Current Reality |
|---|---|
| Family safety apps feel like spyware | Silent background tracking, no transparency |
| Friend-finding apps are fragile | No real-time updates, no offline awareness |
| Teen/child safety tools are opaque | Kids don't know they're being tracked |
| Team coordination is manual | No group geofencing, alerting, or history |
| Privacy-aware users have no option | No app puts consent, transparency, and trust first |

SafeCircle fills the gap: a premium, trust-first, consent-every-step location sharing platform.

---

## 3. Goals

### Primary Goals
- Provide real-time location sharing between consenting users
- Make consent, visibility, and control the core UX—not an afterthought
- Deliver geofencing alerts for family coordination (school arrivals, etc.)
- Provide SOS / emergency sharing for safety situations
- Be the most trustworthy app in the location-sharing category

### Business Goals
- Launch freemium iOS + Android app
- Monetize via SafeCircle Pro subscription (larger circles, longer history, advanced geofences)
- Build brand trust to differentiate from surveillance-linked competitors

---

## 4. Non-Goals

- No silent / covert tracking of any kind
- No tracking by phone number alone without app install + consent
- No SIM triangulation or carrier-based location
- No sale of location data to advertisers
- No law enforcement data sharing without a valid legal process and transparency report
- No minor tracking without transparent, visible indicators on the minor's device
- No "stealth mode" or hidden installation flows

---

## 5. Target Users

### Persona 1: The Concerned Parent (35-50)
- Wants to know kids arrived at school or practice
- Doesn't want an adversarial "spying" dynamic
- Values simplicity and clear notifications

### Persona 2: The Social Coordinator (22-34)
- Planning trips, meetups, concerts with friends
- Wants temporary live sharing for specific events
- Privacy-conscious, dislikes always-on tracking

### Persona 3: The Traveling Couple (28-45)
- One partner travels for work or solo trips
- Wants voluntary check-in system with live map as option
- Values mutual transparency

### Persona 4: The Field Team Manager (30-55)
- Managing remote/field workers with their consent
- Needs audit trail, arrival/departure alerts for job sites
- Requires admin controls and team roles

---

## 6. User Stories

### Authentication
- As a new user, I can sign up with email/password, Google, or Apple ID so I can access the app
- As a new user, I am shown a clear privacy explanation before any location permission is requested
- As a returning user, I can sign in quickly and my session remains active unless I sign out
- As a user, my refresh token is rotated on re-use to prevent token theft

### Location Sharing
- As a user, I can choose to share my live location with specific people for a defined time window
- As a user, I can see who is currently viewing my location in real time
- As a user, I can stop sharing my location with one tap at any time
- As a user, I can pause sharing for 1 hour without revoking the connection
- As a user, I can set a sharing duration (15 min / 1 hr / 8 hrs / until stopped)
- As a user, I can see my contacts' locations only if they have actively consented to share with me

### Circles
- As a user, I can create a Circle (family, friends, team) and invite others
- As a user, I can invite others by link, QR code, or email
- As a user, I can leave a circle or remove members I own
- As a circle admin, I can manage roles (owner, admin, member)
- As a user, I can set per-circle privacy rules

### Geofencing
- As a user, I can save named places (Home, School, Office, Custom)
- As a user, I can create geofences with custom radii around my saved places
- As a user, I can get notifications when approved contacts arrive or leave a geofence
- As a user, I can configure alerts per-person and per-place

### SOS
- As a user, I can activate SOS mode with a panic button
- As a user in SOS mode, my live location is sent to pre-defined emergency contacts
- As a user, I can set a countdown before the SOS alert fires (to prevent accidents)
- As a user, SOS sessions expire automatically or can be stopped manually

### Privacy
- As a user, I can see a clear dashboard of exactly who can see my location right now
- As a user, I can download all my data
- As a user, I can delete my account and all associated data
- As a user, I receive periodic reminders about who has ongoing sharing permissions
- As a user, I manage consent logs showing what I agreed to and when

### Notifications
- As a user, I receive push notifications for geofence events, SOS alerts, sharing requests, and consent reminders

---

## 7. Acceptance Criteria

| Feature | Acceptance Criteria |
|---|---|
| Location sharing | Location is never shared without explicit user action; sharing stops at expiry time |
| Consent | Every new sharing relationship requires both-party opt-in |
| Geofence alerts | Alert fires within 60 seconds of geofence crossing |
| SOS | SOS alert delivered to emergency contacts within 10 seconds of activation |
| Privacy dashboard | Shows all active sharing relationships; stop-all reachable in ≤2 taps |
| Data deletion | Account + all location data deleted within 30 days of request (GDPR Article 17) |
| Re-consent | Long-running shares (30+ days) prompt for re-consent |
| Audit log | All sensitive actions logged with timestamp, user, and action type |
| Battery | Background location should not drain battery >5% per hour on average devices |

---

## 8. MVP Scope

| Feature | MVP |
|---|---|
| Email/Google/Apple auth | ✅ |
| Consent-based location sharing | ✅ |
| Live map with approved contacts | ✅ |
| Circles (create/invite/join/leave) | ✅ |
| Geofences (3 places per user) | ✅ |
| Arrive/depart alerts | ✅ |
| SOS mode | ✅ |
| Pause sharing | ✅ |
| Privacy dashboard | ✅ |
| Push notifications | ✅ |
| Location history (7-day opt-in) | ✅ |
| Basic profile + avatar | ✅ |
| Block/report user | ✅ |

---

## 9. Post-MVP Scope

| Feature | Phase |
|---|---|
| Battery % sharing | v1.1 |
| Trip replay animation | v1.1 |
| QR code invites | v1.1 |
| 90-day location history | Pro |
| Larger circles (>10 members) | Pro |
| Custom geofence shapes | v1.2 |
| Temporary guest access | v1.2 |
| Team admin audit dashboard | Pro |
| Web app (map viewer) | v2.0 |
| Wear OS / Apple Watch companion | v2.0 |
| Offline map tiles | v2.0 |
| Multi-language support | v1.2 |

---

## 10. Constraints and Risks

| Risk | Mitigation |
|---|---|
| App Store background location policy | Submit detailed privacy explanation; use significant location change mode where possible |
| GDPR / data residency | Offer EU data residency option; DPA ready for enterprise |
| Battery drain user complaints | Adaptive update intervals; user-configurable frequency |
| Abuse by controlling partners | Both-party consent enforced; anomaly detection; easy escape routes |
| Cold start latency on socket connection | Pre-warm socket on app open; optimistic UI |

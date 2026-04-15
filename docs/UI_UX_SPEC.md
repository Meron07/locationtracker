# SafeCircle — Mobile UI/UX Specification

---

## Design Principles

1. **Trust first** — every interaction reinforces user control
2. **Minimal cognitive load** — one primary action per screen
3. **Map-centric** — map is the hero; everything else is contextual
4. **Accessible by default** — WCAG AA minimum, AAA for critical flows
5. **Progressive disclosure** — surfacing complexity only when needed

---

## Design System

### Color Palette

| Token | Hex | Usage |
|---|---|---|
| `primary-600` | `#2563EB` | Primary CTA, active states |
| `primary-100` | `#DBEAFE` | Tint backgrounds |
| `success-500` | `#22C55E` | Online, sharing active |
| `warning-400` | `#FB923C` | Paused, low battery |
| `danger-500` | `#EF4444` | SOS, revoke, error |
| `neutral-900` | `#111827` | Primary text |
| `neutral-600` | `#4B5563` | Secondary text |
| `neutral-300` | `#D1D5DB` | Dividers, borders |
| `neutral-100` | `#F3F4F6` | Card backgrounds |
| `surface-white` | `#FFFFFF` | Sheet backgrounds |
| `map-overlay` | `rgba(0,0,0,0.45)` | Map sheet overlays |
| `sos-red` | `#DC2626` | SOS button |

### Typography (Inter font family)

| Token | Size | Weight | Line Height |
|---|---|---|---|
| `display-lg` | 28sp | 700 | 34sp |
| `title-md` | 20sp | 600 | 26sp |
| `title-sm` | 17sp | 600 | 22sp |
| `body-md` | 15sp | 400 | 22sp |
| `body-sm` | 13sp | 400 | 18sp |
| `label-md` | 13sp | 500 | 18sp |
| `label-sm` | 11sp | 500 | 16sp |
| `caption` | 11sp | 400 | 15sp |

### Spacing Scale (4px base)
`4, 8, 12, 16, 20, 24, 32, 40, 48, 64`

### Elevation / Shadows
| Level | Usage |
|---|---|
| `shadow-sm` | `0 1px 3px rgba(0,0,0,0.10)` — cards |
| `shadow-md` | `0 4px 12px rgba(0,0,0,0.12)` — bottom sheets |
| `shadow-lg` | `0 8px 24px rgba(0,0,0,0.16)` — modals, SOS button |

### Border Radius
- `radius-sm`: 8px — tags, chips
- `radius-md`: 12px — cards
- `radius-lg`: 16px — bottom sheets, modals
- `radius-full`: 9999px — buttons, avatars, badges

### Icon Style
- **Line icons** (Phosphor Icon set or equivalent)
- Stroke weight: 1.5px
- Size: 20px (inline), 24px (nav), 28px (FAB)
- Color: matches text color context

---

## Screen Specifications

---

### 1. Splash Screen

**Purpose:** App initialization + auth check

**Layout:**
- Full-screen primary-600 background
- SafeCircle wordmark + shield logo, vertically centered
- Subtle animation: logo scales from 0.8 to 1.0, opacity fade-in (200ms)

**Logic:**
- If valid refresh token → navigate to Home Map
- If no token → navigate to Onboarding

---

### 2. Onboarding (4 slides)

**Purpose:** Set expectations, build trust before requesting permissions

**Layout:** Full-screen slides with skip button (top-right)

**Slide 1 — "You're in control"**
- Illustration: friendly map with people icons
- Headline: "Share your location on your terms"
- Body: "Only the people you choose can see where you are. You control when, for how long, and with whom."

**Slide 2 — "Both ways, always"**
- Illustration: two phones with checkmark
- Headline: "Sharing is always mutual"
- Body: "Any location connection requires explicit confirmation from both sides. No surprises."

**Slide 3 — "Pause anytime"**
- Illustration: phone with pause button
- Headline: "One tap to go invisible"
- Body: "Pause sharing or stop completely, instantly. No questions asked."

**Slide 4 — "Your privacy, explained"**
- Illustration: privacy shield
- Headline: "We don't sell your data. Ever."
- Body: "Your location is encrypted, never shared with advertisers, and deleted when you ask."

**CTA (last slide):** Primary button "Get Started"  
**NavBar:** Dot indicators. Swipe or tap to advance.  
**Accessibility:** Each slide readable by screen reader; skip button visually distinct.

---

### 3. Sign In / Sign Up Screen

**Purpose:** Authentication

**Layout:**
- Logo at top (56px padding-top)
- "Welcome to SafeCircle" heading
- Tab row: Sign In | Sign Up (16px below heading)

**Sign In tab:**
- Email field (validate format on blur)
- Password field (show/hide toggle)
- "Forgot password?" link (right-aligned, below password)
- Primary button: "Sign In"
- Divider: "or"
- Social buttons: Google (white), Apple (black — iOS only)

**Sign Up tab:**
- Display name field
- Email field
- Password field (password strength indicator: 4 segments)
- Confirm password field
- Privacy notice: "By creating an account you agree to our Terms and Privacy Policy" with links
- Primary button: "Create Account"
- Social buttons as above

**Empty states:** All fields start empty with placeholder text  
**Error states:** Inline red text below failed field; shake animation on submit failure  
**Loading state:** Button shows spinner, disabled during API call

---

### 4. Permission Screen

**Purpose:** Request iOS/Android location + notification permissions with clear context

**Layout:**
- Back button (top-left)
- "Privacy first" heading
- Explanatory body text
- Permission cards (each with icon, title, description, and status badge)

**Permission cards:**

**Location (Always / While Using)**
- Icon: location pin
- Title: "Location Access"
- Body: "SafeCircle uses your location to show friends on the map and trigger geofence alerts. You control when sharing is active."
- Choice buttons: "While Using App" | "Always Allow" (with explanation of difference)
- "Always Allow" explanation modal: "Always Allow lets geofence alerts work in the background. You'll always see an OS indicator when location is active."

**Notifications**
- Icon: bell
- Title: "Push Notifications"
- Body: "Receive alerts when contacts arrive at saved places, when someone shares their location, and for SOS emergencies."
- Single CTA: "Allow Notifications"

**Logic:**
- Each permission can be granted independently
- If denied: show link to Settings with instructions to re-enable
- Never block app use for permission denial — degrade gracefully

---

### 5. Home Map Screen

**Purpose:** Primary screen — live map with contacts

**Layout:**
- Full-screen map (Google Maps or Mapbox)
- Bottom navigation bar (persistent): Map | Circles | Alerts | Profile
- Floating action buttons (bottom-right area):
  - SOS button (red, 56px) — always visible
  - My location FAB (grey, 44px)
- Sharing status bar (top, collapsible): "Sharing with 3 people • 2 hrs left" or "Not sharing"
- Search bar (top) for finding contacts / places

**Map Markers:**
Each contact has a marker:
- Avatar (32px circle) with white border (2px) + shadow-sm
- Colored ring: green = moving, grey = stationary, orange = paused, red = SOS
- Tap opens Person Detail Sheet

**Contact List Chip Row** (scrollable, above bottom nav if collapsed):
- Avatar + name chips for each contact
- Tap jumps map to that person

**Empty State (no contacts):**
- Subtle illustration of empty map
- "No one here yet. Invite contacts to see them on the map."
- CTA: "Invite Someone"

**Bottom Navigation:**
| Tab | Icon | Label |
|---|---|---|
| Map | Map outline | Map |
| Circles | People outline | Circles |
| Alerts | Bell outline | Alerts (badge for unread) |
| Profile | Person outline | Profile |

---

### 6. Person Detail Bottom Sheet

**Purpose:** View a contact's location details; manage sharing

**Trigger:** Tap on map marker or contact chip

**Layout (bottom sheet, 60% height, draggable):**
- Handle bar at top
- Avatar (48px) + Online indicator dot
- Display name (`title-md`)
- Status message (`body-sm`, neutral-600)
- Last updated: "Updated 2 min ago"
- Activity chip: "Walking" / "Stationary" / "Driving"
- Battery bar (if they share battery): 75% indicator
- Route button: "Get Directions" → opens native maps

**Sharing Section:**
- "Sharing since Nov 1 · 3 hrs left"
- "Pause for 1 hour" text button
- "Stop Sharing" danger text button

**More Actions:**
- "..." menu → Block, Report, View History (if they've opted in)

---

### 7. Share Location Modal

**Purpose:** Initiate a new location share

**Trigger:** "+" on contact list or invite flow

**Layout (modal, 70% height):**
- "Share Your Location" heading
- Contact picker (search field + recent contacts list)
- Duration selector (segmented):
  - 15 min | 1 hour | 8 hours | Until I stop
- Battery sharing toggle (default off)
- "Send Request" primary button

**Consent Copy:**
> "Your location will be shared with [Name] for [duration]. They can also see when you last updated. You can stop sharing anytime."

---

### 8. Circles Screen

**Purpose:** Manage groups

**Layout:**
- "My Circles" heading
- List of circles (card for each):
  - Circle avatar + name
  - Member count + active sharers
  - Your role (tag: Owner / Admin / Member)
  - Tap → Circle Details
- "+" FAB to create circle

**Empty State:**
- "Create your first circle — family, friends, or your team"
- CTA: "Create Circle"

---

### 9. Circle Details Screen

**Layout:**
- Circle banner (24px margin top)
- Circle name + description
- Member list:
  - Avatar, name, role, active/inactive status
  - Sharing status with me
- "Invite Members" CTA (if owner/admin)
- Geofences section: list of active geofences for this circle
- Your sharing status toggle for this circle

---

### 10. Geofence Creation Screen

**Purpose:** Create a place + geofence

**Flow:**
1. "Create Place" — name + type (Home, School, Office, Custom)
2. Set location: map with draggable pin OR search address
3. Set radius: slider 50m–2km with live map preview ring
4. Alert settings: toggle Enter / Exit / Dwell alerts
5. Track members: multi-select from circle members
6. Save → confirmation toast "Geofence created"

---

### 11. Notifications Center Screen

**Layout:**
- Filter chips: All | Geofences | SOS | Sharing | System
- Notification list (newest first):
  - Icon (color-coded by type)
  - Title + body
  - Timestamp (relative: "2 min ago")
  - Unread indicator (blue dot, left)
- "Mark all read" link

---

### 12. SOS Screen

**Purpose:** Emergency activation

**Entry points:**
- Red SOS button on map (holds 2 seconds to activate — prevents accidents)
- Accessibility: Settings → SOS shortcut

**Layout:**
- Full-screen red background
- "SOS MODE ACTIVE" in large white text
- Countdown timer (if configured): "Alerting in 4..."
- Cancel button (prominent, bottom) — active during countdown
- After countdown: "Emergency contacts notified"
- Live location pulsing indicator
- "Stop SOS" large button

**Pre-activation modal:**
- "Activate SOS?"
- "Your emergency contacts will receive your live location."
- "5 second countdown before alert fires."
- "Activate" button | "Cancel" link

---

### 13. Privacy Dashboard Screen

**Purpose:** Complete control center for location sharing

**Layout:**
- "Privacy Dashboard" title
- **At a glance card:**
  - "You are sharing with [N] people right now"
  - "Your location is visible to: Alice, Bob, +2"
  - [STOP ALL SHARING] danger button
- **Active shares list:**
  - Each row: avatar + name + since + expires
  - Tap → manage (pause / revoke)
- **History settings card:**
  - Location history on/off toggle
  - Retention selector: 24h / 7d / 30d / 90d
- **Consent log link:** "View all consent events →"
- **Data section:**
  - "Export my data" button
  - "Delete my account" danger text button

---

### 14. Profile Screen

**Layout:**
- Avatar (80px) + edit button
- Display name + email
- Status message (editable)
- Settings sections:
  - Sharing Defaults
  - Notification Preferences
  - Privacy & Data
  - Emergency Settings
  - Account
  - About & Legal

---

### 15. Settings Screen

**Sections and controls:**

**Sharing Defaults**
- Default duration selector
- Battery sharing toggle
- Location history toggle

**Notifications**
- Geofence enter/exit toggles
- SOS alert toggle
- Low battery warning toggle
- Quiet hours (time range picker)

**Privacy & Data**
- Show my last seen toggle
- Allow search by email toggle
- Location history retention
- Export my data
- Consent log

**Emergency**
- Set emergency contact
- SOS countdown duration (0s / 5s / 10s)
- SOS message (editable)

**Account**
- Change email
- Change password
- Sign out
- Device sessions (view and revoke)
- Delete account

---

## Accessibility Guidelines

- Minimum touch target: 44×44pt
- All interactive elements have accessible label
- Color is never the only differentiator (icons + text always accompany)
- Dark mode: full support (seeded from OS preference)
- Text scaling: all text supports Dynamic Type (iOS) / font scale (Android) up to 200%
- Screen reader: all map markers announced with name + distance + status
- SOS button: accessible via shake gesture or volume button shortcut (user-configurable)
- Error messages: announced immediately by screen reader
- Focus management: modals trap focus; on close, return focus to trigger

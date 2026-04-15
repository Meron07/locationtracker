# SafeCircle — App Store & Launch Checklist

---

## App Store (iOS)

### Privacy Nutrition Label — Required Disclosures

| Data Type | Collected | Linked to Identity | Used for Tracking |
|---|---|---|---|
| Precise Location | Yes | Yes | No |
| Coarse Location | Yes | Yes | No |
| Name | Yes | Yes | No |
| Email Address | Yes | Yes | No |
| Phone Number | Optional | Yes | No |
| User ID | Yes | Yes | No |
| Device ID | Yes | Yes | No |
| Crash Data | Yes | No | No |
| Performance Data | Yes | No | No |

**"Used for Tracking" is NO for all.** SafeCircle does not track users across apps or sell data.

### App Store Privacy Description (for Review Notes)
> SafeCircle is a consent-based location sharing app. Location is only shared between users who have both explicitly opted in. Users always see who can view their location and can stop sharing at any time. We request "Always On" location permission for background geofence alerts (e.g., arrival at school or home). A persistent OS-level notification is shown whenever background location is active. Location data is encrypted in transit and at rest. Users can delete all their data at any time.

### Background Location Justification (App Store Review)
> SafeCircle uses background location access exclusively for:
> 1. Sending geofence arrival/departure alerts (e.g., "Your child arrived at school") when the app is not in the foreground.
> 2. Providing continuous live location to contacts who have been explicitly approved by the user.
>
> Background location is only active while the user has an active, voluntary location share enabled. The user can disable sharing at any time via a single tap. An iOS system-level blue location indicator is always visible when background location is active.
>
> SafeCircle does NOT use background location for advertising, analytics, or any purpose other than the features described above.

### Review Risk Items to Avoid
- Do NOT use "track" in marketing copy — use "share" or "see"
- Do NOT allow child accounts (under 13) without COPPA flow
- Do NOT offer a "hidden" or "stealth" mode
- Do NOT request Always On permission before explaining it clearly inline
- Ensure permission request strings in Info.plist are descriptive and not vague
- Ensure Apple Sign-In is offered wherever Google Sign-In is offered

### Required Info.plist Strings
```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>SafeCircle uses your location to show your position on the map and share it with people you've approved. You control who can see your location.</string>

<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>Background location lets SafeCircle send you alerts when family members arrive or leave saved places (like home or school), even when the app is closed. A blue indicator will always appear in your status bar when location is active.</string>

<key>NSLocationAlwaysUsageDescription</key>
<string>Background location is used for geofence alerts and continuous location sharing with approved contacts. You can stop sharing anytime in the app.</string>
```

---

## Google Play (Android)

### Background Location Declaration

Submit a declaration form in Play Console explaining:

> **Purpose:** SafeCircle uses the `ACCESS_BACKGROUND_LOCATION` permission to:
> 1. Trigger geofence-based notifications (arrival/departure alerts for family safety)
> 2. Continue sharing location with consented contacts when app is in the background
>
> **User Control:** Background location is only active while a user-initiated sharing session is active. A persistent foreground service notification ("SafeCircle is sharing your location") is always visible. Users can stop sharing from the notification shade.
>
> **No unauthorized tracking:** The app never tracks users without their knowledge. Both sender and receiver must opt in. Background location is not used for advertising or data collection.

### Required Android Permissions
```xml
<!-- AndroidManifest.xml -->
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />  <!-- API 29+ -->
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION" />  <!-- API 34+ -->
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />  <!-- API 33+ -->
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />  <!-- Restart service on reboot -->
```

### Foreground Service Notification (Required)
```xml
<service
  android:name=".LocationForegroundService"
  android:foregroundServiceType="location"
  android:exported="false" />
```

---

## Privacy Policy Requirements

Your privacy policy must clearly state:

- [ ] What location data is collected and why
- [ ] Who can see a user's location (only consented contacts)
- [ ] How long data is retained (user-configurable, defaults stated)
- [ ] How users can delete their data
- [ ] That data is never sold or shared with advertisers
- [ ] Third-party services used: Firebase (Auth, FCM), Google Maps, AWS S3 / Cloudflare R2
- [ ] Data residency / server locations
- [ ] Contact email for privacy requests
- [ ] GDPR rights: access, rectification, erasure, portability, objection
- [ ] CCPA rights (California users)
- [ ] Age restriction: 13+ (18+ without parental consent in some jurisdictions)
- [ ] How to file a complaint with supervisory authority

---

## Consent Wording Examples

### Location Sharing Request Notification
> **[Name] wants to share locations with you**
> If you accept, you'll both see each other on the map. You can stop anytime.

### Share Active Reminder (in-app banner)
> You are sharing your live location with **Alice** and **2 others** · 3h remaining · [Manage]

### Onboarding Privacy Screen
> **Before we start: your privacy matters**
> SafeCircle only shares your location with people you explicitly approve. Both sides must agree. You can stop instantly. We never share your location with third parties and never sell your data.
> [Continue]

### 30-Day Re-Consent Push Notification
> **Still sharing with Bob?**
> You've been sharing your location with Bob for 30 days. Still comfortable with this? [Keep Sharing] [Stop Sharing]

### Background Location Permission Request (native dialog pre-prompt)
> **Allow background location for geofence alerts**
> To receive arrival and departure alerts (e.g., "Alice arrived home"), SafeCircle needs location access when the app is in the background. You'll always see an indicator when this is active.
> [Explain More] [Allow]

### Account Deletion Confirmation
> **Delete your account?**
> This will permanently delete your profile, all location history, shares, and circles. Your data will be removed within 30 days. This action cannot be undone.
> Type "DELETE" to confirm: [input field]
> [Delete My Account] [Cancel]

---

## Pre-Launch Checklist

### Legal & Compliance
- [ ] Privacy policy live at `https://safecircle.app/privacy`
- [ ] Terms of service live at `https://safecircle.app/terms`
- [ ] Data processing agreement drafted for enterprise / team users
- [ ] `/.well-known/security.txt` published with contact info
- [ ] Cookie policy (web dashboard, if applicable)
- [ ] GDPR representatives designated (EU, UK)
- [ ] Age gate on registration (13+)

### Security
- [ ] Penetration test completed (external or thorough internal)
- [ ] All high/critical vulnerabilities resolved
- [ ] Dependency audit clean (`npm audit --audit-level=high`)
- [ ] Secrets scanning run (GitLeaks) — no secrets in codebase
- [ ] TLS certificate valid + HSTS header active
- [ ] Firebase rules reviewed (if using Firestore)
- [ ] Response headers reviewed (CSP, CORS, etc.)
- [ ] Rate limiting verified end-to-end

### Infrastructure
- [ ] Production database: backups configured (daily + WAL archiving)
- [ ] Disaster recovery runbook written and tested
- [ ] Redis persistence configured
- [ ] Monitoring: Sentry error tracking live on production
- [ ] Uptime monitoring: Betterstack / UptimeRobot configured
- [ ] Alerting: PagerDuty / Slack alerts for downtime
- [ ] CDN for static assets + avatar serving
- [ ] Load test passed: 1000 concurrent users

### App Store Submission
- [ ] iOS: App Store Connect listing complete (screenshots, description, keywords)
- [ ] iOS: Privacy nutrition label complete and accurate
- [ ] iOS: Background location justification submitted
- [ ] iOS: TestFlight beta complete with feedback resolved
- [ ] iOS: All review guidelines read and compliance verified
- [ ] Android: Play Console listing complete
- [ ] Android: Background location declaration submitted
- [ ] Android: Privacy policy URL in Play store listing linked
- [ ] Android: Internal → Closed → Open testing progression complete
- [ ] Both: App version code / build number correct for release

### QA Signoff
- [ ] All critical user flows manually tested on physical devices
- [ ] iOS 16, 17, 18 tested
- [ ] Android 12, 13, 14, 15 tested
- [ ] Tablet layouts acceptable (basic responsiveness)
- [ ] No crashes in Sentry from beta testing
- [ ] Battery profiling passed (<5%/hr background)
- [ ] Offline mode graceful (no white screens or crashes without network)

### Support & Operations
- [ ] Support email or chat configured
- [ ] FAQ page live
- [ ] In-app feedback/contact form
- [ ] On-call schedule set for launch week
- [ ] Rollback plan documented

---

## Post-Launch Monitoring (Week 1)

| Metric | Alert Threshold | Action |
|---|---|---|
| API error rate | > 1% | Page on-call |
| Socket disconnect rate | > 5% | Page on-call |
| Location upload latency p95 | > 2s | Investigate + scale |
| App crashes (Sentry) | > 0.1% session crash rate | Hotfix |
| New user signups | ±50% expected | Investigate |
| Abuse reports | > 5/day | Trust & Safety review |
| Data export failures | Any | Immediate fix (GDPR obligation) |

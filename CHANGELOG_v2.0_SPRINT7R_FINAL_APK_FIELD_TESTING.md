# NEXO Ride v2.0 Sprint-7R — Final APK Field Testing

Added:
- `/field-test/` Mobile Field Test Center
- `/api/platform/field-test-readiness`
- `/api/platform/mobile-launch-gate`
- Admin field test dashboard, test run logging, issue reporting and status update APIs
- APK version bump to `2.0.7R` / versionCode `86`
- GitHub APK artifact naming updated to Sprint-7R
- Launch gate checks release QA, production config, safety readiness, and critical field-test issues

Safe deployment rule:
- Deploy latest cumulative ZIP only
- Preserve live `.env` and `data/` folder
- Run `npm run s7r:check` before restart

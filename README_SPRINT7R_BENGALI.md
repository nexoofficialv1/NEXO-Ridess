# NEXO Ride Sprint-7R — Final APK Field Testing

এই build latest cumulative Sprint-7B থেকে Sprint-7R পর্যন্ত সব update ধরে তৈরি।

## Main additions
- `/field-test/` Mobile Field Test Center
- `/api/platform/field-test-readiness`
- `/api/platform/mobile-launch-gate`
- Admin field test run logging
- Admin mobile issue tracker
- APK version `2.0.7R`, versionCode `86`
- Launch gate checks: production config, release QA, safety, field-test issue status

## Deploy rule
- Live `.env` preserve করুন
- Live `data/` folder overwrite করবেন না
- `npm run s7r:check` চালিয়ে server restart করুন

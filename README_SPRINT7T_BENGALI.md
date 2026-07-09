# NEXO Ride Sprint-7T — Public Launch + Onboarding Kit

এই build Sprint-7S-এর ওপর cumulative update। আগের সব Sprint included আছে।

## নতুন যোগ হয়েছে
- `/public-launch/` — public launch landing page
- `/driver-onboarding/` — driver training/onboarding kit
- `/passenger-help/` — passenger guest booking help guide
- `/qr-kit/` — printable Bengali QR poster material
- `/support-center/` — public support/FAQ center
- `/api/platform/public-launch-readiness`
- `/api/public/launch-kit`
- `/api/admin/public-launch-dashboard`
- `/api/admin/marketing-qr-materials`
- Public launch role permissions: `PUBLIC_LAUNCH_VIEW`, `PUBLIC_LAUNCH_MANAGE`, `MARKETING_QR_MANAGE`
- APK version `2.0.7T`, versionCode `88`

## Deploy Rule
Latest ZIP deploy করবেন। Live `.env` এবং `data/` folder overwrite করবেন না।

## Test Commands
```bash
npm run check
npm run public-launch:preflight
npm run s7t:check
```

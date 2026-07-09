# NEXO Ride Sprint-7V — Final Security Review + Production Deploy Guide + Rollback Pack

এই build latest cumulative Sprint-7V। আগের Sprint ZIP আলাদা deploy করতে হবে না।

## New Pages
- `/security-deploy/` — final security/deploy lock dashboard
- `/rollback/` — rollback + emergency guide
- `/maintenance/` — maintenance mode status/help

## New APIs
- `GET /api/platform/security-deploy-readiness`
- `GET /api/platform/launch-release-lock`
- `GET /api/platform/final-audit-checklist`
- `GET /api/public/maintenance-status`
- `GET /api/admin/final-security-dashboard`
- `GET /api/admin/deploy-rollback-guide`
- `GET/POST /api/admin/maintenance-mode`
- `POST /api/admin/maintenance-mode/event`
- `POST /api/admin/final-audit-checklist`

## Deploy Rule
- latest ZIP deploy করুন
- live `.env` overwrite করবেন না
- live `data/` folder overwrite করবেন না
- backup নিয়ে deploy করবেন
- `npm run s7v:check` চালিয়ে server restart করবেন

## Maintenance Mode
Main Admin public booking, QR booking, dispatch এবং payment separately pause করতে পারবে। QR/guest/payment APIs 503 দিয়ে pause respect করবে।

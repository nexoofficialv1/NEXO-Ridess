# Sprint-7N — Driver KYC + Area/Stand + QR Management

এই build-এ ৫,০০০–১০,০০০ Toto driver manage করার জন্য foundation যোগ করা হয়েছে।

## Admin Pages
- `/admin-drivers/` — Driver onboarding, search, status/KYC/approval stage
- `/admin-areas/` — Area ও Stand create/manage
- `/admin-qr/` — Area/Stand/Driver/General QR create, enable/disable, scan count

## Main API
- `GET /api/platform/driver-kyc-qr-readiness`
- `GET /api/admin/drivers?page=1&limit=50&q=&status=`
- `POST /api/admin/drivers/register`
- `POST /api/admin/drivers/:id/approval-stage`
- `POST /api/admin/drivers/:id/kyc-doc`
- `GET/POST /api/admin/areas`
- `GET/POST /api/admin/stands`
- `GET/POST /api/admin/qr-codes`
- `GET /api/qr/resolve?code=...`

## Safe Deploy Rule
Latest ZIP deploy করবেন। Server-এর live `.env` এবং `data/` folder overwrite করবেন না।

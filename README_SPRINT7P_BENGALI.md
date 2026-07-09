# NEXO Ride Sprint-7P — Safety + SOS + Trip Sharing

এই build Sprint-7O latest cumulative base-এর ওপর additive update।

## নতুন যোগ হয়েছে
- Passenger SOS / Emergency event
- Public trip tracking link: `/track/<guest-token>`
- Guest passenger emergency contact save
- Share trip text/link
- Driver safety note: passenger no response / unsafe ride / dispute / forced stop
- Route deviation alert foundation
- Admin Safety Center: `/admin-safety/`
- Readiness endpoint: `/api/platform/safety-readiness`

## Deploy rule
- Latest ZIP deploy করবেন
- Live `.env` overwrite করবেন না
- Live `data/` folder overwrite করবেন না
- Backup নিয়ে deploy করবেন

## Test
```bash
npm run s7p:check
node server.js
# open /api/health and /api/platform/safety-readiness
```

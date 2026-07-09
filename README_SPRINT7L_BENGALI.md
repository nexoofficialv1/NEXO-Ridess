# NEXO Ride Sprint-7L — Database Migration + Redis/PostgreSQL Upgrade Bridge

এই build-এ data layer future-scale ready করা হয়েছে। লক্ষ্য: current server নষ্ট না করে 5,000 → 10,000 driver এবং 3,000–3,500 active driver support করার upgrade path তৈরি করা।

## যোগ হয়েছে
- S7L schema foundation
- Versioned migration registry
- PostgreSQL migration contract
- Redis GEO live-location bridge contract
- Dispatch adapter readiness
- Admin/Public data health page: `/data-health/`
- Readiness APIs:
  - `/api/platform/data-layer-readiness`
  - `/api/platform/migration-readiness`
  - `/api/platform/redis-postgres-readiness`
  - `/api/platform/dispatch-adapter-readiness`
  - `/api/admin/data-health`
- Scripts:
  - `npm run data:preflight`
  - `npm run migration:preflight`
  - `npm run s7l:check`

## Production rule
Live `.env` এবং `data/` folder overwrite করবেন না। JSON fallback pilot testing-এর জন্য ঠিক আছে, কিন্তু 5k/10k production scale-এর আগে PostgreSQL + Redis GEO configure করা দরকার।

## Migration safety
এই sprint production data auto-migrate করে না। Admin/operator backup নিয়ে controlled migration করবে। Destructive migration allowed নয়।

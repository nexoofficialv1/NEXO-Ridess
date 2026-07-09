# NEXO Ride Sprint-7F — Production Ops + Scale Monitoring Foundation

এই build-এর লক্ষ্য: NEXO Ride-কে ৫,০০০ driver থেকে ১০,০০০ driver scale করার জন্য শুরু থেকেই monitoring, capacity profile, dispatch bottleneck visibility এবং additive migration contract দেওয়া।

## নতুন যোগ হয়েছে

- `/ops/` — Production Ops Monitor web page
- `/api/platform/ops-readiness` — public safe readiness + metrics endpoint
- `/api/admin/ops-dashboard` — admin authenticated detailed ops payload
- `/api/admin/capacity-profile` — admin capacity profile switch: `PILOT_5K`, `CITY_10K`, `DISTRICT_25K`
- `ops_scale_settings` DB metadata
- `capacity_upgrade_history` audit trail
- `scripts/scale_simulator.js` — 5k/10k load estimate, no external dependency

## Important production note

বর্তমান JSON database fallback pilot/testing-এর জন্য। ৫,০০০/১০,০০০ driver production target করতে হলে একই code/API রেখে DB layer PostgreSQL এবং live location/dispatch Redis GEO-তে upgrade করতে হবে। এই Sprint-7F সেই upgrade contract তৈরি করে, কিন্তু live production DB migration আলাদা deployment step।

## Upgrade contract

- Existing API ভাঙা যাবে না
- Existing APK পুরোনো route দিয়ে চলবে
- Existing data delete/rename করা যাবে না
- Additive migration only
- Driver live GPS high-frequency write main DB-তে যাবে না
- ১০,০০০ capacity profile DB/config migration দিয়ে enable হবে

## Test commands

```bash
npm run check
npm run scale:estimate
```

## Deploy caution

Production server-এর `data/` folder overwrite করবেন না। Deploy করার আগে full backup নেবেন।

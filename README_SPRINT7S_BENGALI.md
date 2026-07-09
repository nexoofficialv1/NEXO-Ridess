# NEXO Ride Sprint-7S — Pilot Launch Package

এই build Sprint-7R-এর ওপর cumulative update। আগের ZIP deploy করতে হবে না।

## নতুন যোগ হয়েছে

- `/pilot-launch/` Pilot Launch Center
- `/api/platform/pilot-launch-readiness`
- `/api/platform/pilot-go-live-gate`
- `/api/admin/pilot-dashboard`
- Daily pilot report logging
- Pilot stage management: PREP, READY_FOR_FIELD_TEST, PILOT_RUNNING, PILOT_PAUSED, PUBLIC_READY, ROLLBACK
- 10–50 driver pilot launch gate
- rollback/emergency plan
- APK version `2.0.7S`, versionCode `87`

## Pilot চালানোর নিয়ম

1. আগে latest ZIP deploy করুন।
2. live `.env` এবং `data/` folder overwrite করবেন না।
3. `/api/health` check করুন।
4. `/admin/config-center/` থেকে real service keys configure করুন।
5. `/field-test/` দিয়ে mobile field test record করুন।
6. `/pilot-launch/` থেকে go/no-go status দেখুন।
7. Pilot প্রথমে 10–50 driver-এর মধ্যে সীমাবদ্ধ রাখুন।

## Scale note

Pilot JSON fallback-এ চলতে পারে। 10k driver / 3.5k active driver production scale-এর আগে PostgreSQL + Redis mandatory।

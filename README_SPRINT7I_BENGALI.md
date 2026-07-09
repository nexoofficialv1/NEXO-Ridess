# NEXO Ride Sprint-7I — Production Deploy + Notification + Load-Test Readiness

## কী যোগ হয়েছে
- Production deploy safety guard
- `.env` ও live `data/` folder overwrite না করার deploy rule
- Admin backup endpoint: `POST /api/admin/backup-now`
- Production readiness endpoint: `/api/platform/production-readiness`
- Notification readiness endpoint: `/api/platform/notification-readiness`
- Load-test readiness endpoint: `/api/platform/loadtest-readiness`
- Admin production config endpoint: `/api/admin/production-config`
- DEMO OTP / DEMO Payment production lock
- Driver/passenger notification event contract
- 10,000 driver / 3,500 active driver scale estimator

## Deploy Rule
শুধু latest Sprint-7I ZIP deploy করবেন। আগের ZIP আলাদা করে deploy করার দরকার নেই।

**অবশ্যই করবেন:**
1. live server backup নিন।
2. server-এর `.env`, `data/production.env`, `data/nexo_ride_db.json` overwrite করবেন না।
3. code upload করুন।
4. `npm install` চালান যদি দরকার হয়।
5. `npm run check` চালান।
6. server restart করুন।
7. `/api/health` এবং `/api/platform/production-readiness` test করুন।

## Production Warning
Public launch-এর আগে DEMO OTP ও DEMO payment বন্ধ রাখুন। Real OTP provider, Razorpay webhook secret, PostgreSQL এবং Redis configure করা না থাকলে 5k/10k scale production launch করবেন না।

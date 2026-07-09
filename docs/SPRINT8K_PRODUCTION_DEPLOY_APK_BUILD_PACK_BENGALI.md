# NEXO Ride Sprint-8K — Production Deploy & APK Build Pack

এই pack কোনো নতুন passenger/driver feature যোগ করার জন্য নয়। Sprint-8J Market Stable Build-কে market run করার জন্য deploy, database migration, GitHub push এবং APK build-ready করার pack।

## Final Order

1. Sprint-8K ZIP GitHub repo `NEXO-Ridess`-এ push
2. Server `.env` production value set
3. PostgreSQL database migration চালানো
4. Server deploy/restart
5. GitHub Actions দিয়ে APK build
6. Phone install করে field test

## Termux Push

```bash
termux-setup-storage
pkg update -y
pkg install git unzip nodejs -y
cd ~
rm -rf NEXO-Ridess
git clone https://github.com/YOUR-USERNAME/NEXO-Ridess.git
cd NEXO-Ridess
rm -rf * .[^.]* 2>/dev/null || true
unzip /sdcard/Download/NEXO-Rides-main-SPRINT8K-PRODUCTION-DEPLOY-APK-BUILD-PACK.zip
npm install
npm run s8k:check
git add .
git commit -m "Sprint-8K production deploy apk build pack"
git push origin main
```

## Production `.env` Required

```env
NODE_ENV=production
APP_MODE=market
PORT=3333
HOST=0.0.0.0
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DBNAME
JWT_SECRET=CHANGE_THIS_STRONG_SECRET
PUBLIC_BASE_URL=https://ride.nexoofficial.in
```

Payment/Map/OTP/FCM live করলে এগুলোও set করতে হবে:

```env
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
MAP_API_KEY=
FCM_SERVER_KEY=
OTP_PROVIDER_KEY=
```

## Database Migration

Database empty থাকলে আগে migration চালাতে হবে।

```bash
npm run db:migrate:production
```

যদি direct SQL চালাতে হয়:

```bash
psql "$DATABASE_URL" -f docs/SPRINT8C_POSTGRES_MIGRATION.sql
```

## Server Deploy Check

```bash
npm install --omit=dev
npm run s8k:check
npm start
```

Browser/API check:

```bash
curl http://127.0.0.1:3333/api/health
curl http://127.0.0.1:3333/api/platform/sprint8j-market-readiness
```

## APK Build Check

GitHub → Actions → latest workflow → Artifacts → APK download.

APK install করার পর minimum field test:

- Passenger login
- Pickup + Drop select
- Route preview
- Driver search
- Driver accept
- Pay option
- Payment success/verify
- Passenger OTP
- Driver start ride
- Live tracking
- Destination reached
- Passenger confirm reached
- Rating + suggestion
- Receipt
- Cancel/support/safety panel

## Important

Market run-এর আগে নতুন feature add করা যাবে না। সমস্যা এলে hotfix হবে, feature launch-এর পরে।

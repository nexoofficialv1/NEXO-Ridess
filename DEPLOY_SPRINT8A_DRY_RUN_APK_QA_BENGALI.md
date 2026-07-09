# NEXO Ride Sprint-8A — Production Deploy Dry Run + APK QA

এই build নতুন feature যোগ করার জন্য নয়। এটি latest Sprint-7Z Security Hotfix RC2-এর ওপর stabilization pack।

## Deploy order
1. VPS/server backup নিন: `.env`, `data/`, `uploads/`, current code folder।
2. Latest Sprint-8A ZIP deploy করুন।
3. `.env`, `data/`, `data/production.env`, `data/config_vault.json`, `uploads/` overwrite করবেন না।
4. `npm install --omit=dev` প্রয়োজনে চালান।
5. `npm run s8a:check` চালান।
6. `npm run final:smoke` চালান।
7. Server restart করুন।
8. Check করুন: `/api/health`, `/deploy-dry-run/`, `/apk-qa/`, `/pilot-precheck/`।

## APK build
GitHub Actions → **Build NEXO Ride APK 8A RC3** চালান। আগে debug APK build করে field test করুন, তারপর release APK।

## Real phone QA
Passenger phone + Driver phone দিয়ে QR booking, payment, OTP, live tracking, driver remembered login, SOS, receipt/rating test করুন।

## Pilot
2 phone internal test → 5 driver → 10–20 driver → 50 driver। Critical issue থাকলে public launch নয়।

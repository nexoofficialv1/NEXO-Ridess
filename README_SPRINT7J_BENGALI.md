# NEXO Ride Sprint-7J — Final APK Release + End-to-End QA

এই build হলো latest cumulative build। আগের Sprint-7B/7C/7D/7E/7F/7G/7H/7I আলাদা deploy করার দরকার নেই।

## কী যোগ হয়েছে
- Final APK version: `2.0.7J` / versionCode `79`
- `/release/` Final QA dashboard
- `/api/platform/release-readiness`
- `/api/platform/final-qa-checklist`
- GitHub Actions APK workflow Sprint-7J নামে update
- App home-এ Final APK quick menu: Book Ride, QR Scanner, Driver Dashboard, Guest Ride Status, Release QA, Permissions
- Android WebView bridge version `2.0.7J`
- Final QA script: `npm run release:qa`
- Full check script: `npm run s7j:check`

## Deploy Rule
1. শুধুমাত্র latest Sprint-7J ZIP deploy করুন।
2. live `.env` overwrite করবেন না।
3. live `data/` folder overwrite করবেন না।
4. আগে backup নিন।
5. deploy-এর পর `npm install` দরকার হলে চালান।
6. `npm run s7j:check` চালান।
7. server restart করুন।
8. `/api/health`, `/api/platform/release-readiness`, `/release/` test করুন।
9. GitHub Actions থেকে APK build করুন।

## Final QA আগে public launch নয়
- Guest booking without login
- QR scanner
- Driver trusted-device login
- Driver online/GPS heartbeat
- Payment callback
- OTP ride start
- Live tracking
- Drop reached + passenger confirm + rating
- Notification
- 5 driver + 5 passenger + 20 completed ride field test

## Scale note
১০,০০০ driver / ৩,৫০০ active driver target-এর জন্য production public launch-এর আগে PostgreSQL + Redis GEO + FCM + real OTP/payment configure করা জরুরি। JSON fallback pilot/field test-এর জন্য রাখা হয়েছে।

# NEXO Ride Sprint-8J — Final Market Stable Consolidation Build

## সিদ্ধান্ত
এই Sprint থেকে নতুন feature যোগ বন্ধ। Market/Pilot run-এর আগে priority হলো stable, clean, deploy-ready package।

## করা হয়েছে
- Version consolidated to `2.0-SPRINT8J_MARKET_STABLE_BUILD`.
- Passenger/Driver booking journey preserved:
  Pickup → Drop → Route → Driver Accept → Payment → Confirm → Pickup Ready → OTP Start → Reached Confirm → Rating/Receipt.
- Public app-এর login screen থেকে demo login market mode-এ hidden করা হয়েছে; `?demo=1` বা configured dev flag থাকলে only testing-এর জন্য দেখা যাবে।
- Public `/api/config` এখন `app_mode` পাঠায়, যাতে app বুঝতে পারে market build/production mode।
- Market readiness API added: `/api/platform/sprint8j-market-readiness`.
- New preflight script: `npm run market:preflight`.
- New final check script: `npm run s8j:check`.
- PostgreSQL migration files preserved for deployment stage.
- Service worker cache name updated to Sprint-8J to avoid old APK/web cache issue.

## Deploy Rule
1. Latest Sprint-8J ZIP only push/deploy করতে হবে।
2. live `.env`, `data/`, `uploads/` overwrite করা যাবে না।
3. Database migration আগে verify/run করতে হবে।
4. Server deploy-এর পর `/api/health` এবং `/api/platform/sprint8j-market-readiness` check করতে হবে।
5. তারপর GitHub Actions দিয়ে APK build।

## পরে add হবে না এখন
Wallet advanced, referral, coupon, heatmap, fleet analytics, loyalty — এগুলো market feedback-এর পরে।

# NEXO Ride Sprint-7B Security Fix Notes

এই build-টি আগের Sprint-7B QR Scanner build-এর security hardening update। Existing server structure overwrite না করে QR Web Booking, Driver Lite Dashboard এবং OTP/config exposure risk কমানো হয়েছে।

## Fixed

1. QR Scanner fallback
- Native `BarcodeDetector` না থাকলে jsQR canvas fallback ব্যবহার করবে।
- Safari/iOS/Firefox/WebView support উন্নত হয়েছে।

2. Safe QR redirect
- `javascript:`, `data:`, `file:` এবং foreign domain block করা হয়েছে।
- শুধুমাত্র NEXO Ride allowed hosts এবং `/qr/` path খুলবে।

3. Driver Lite Stored XSS fix
- pickup/drop/status/source/ride fields HTML escape করা হয়েছে।
- raw user input আর direct `innerHTML`-এ unsafe ভাবে render হবে না।

4. QR Booking page XSS/DOM safety
- Popular places DOM API দিয়ে render করা হয়েছে।
- Server response/user-visible dynamic values escape করা হয়েছে।
- Mobile number client-side validation যোগ হয়েছে।
- QR passenger token `localStorage` থেকে `sessionStorage`-এ নেওয়া হয়েছে এবং clear session button যোগ হয়েছে।

5. Server-side sanitization
- `/api/qr/fare` এবং `/api/qr/book` pickup/drop/name/area strip/sanitize ও length cap করা হয়েছে।

6. OTP demo leakage hardening
- DEMO provider আর default response-এ OTP code ফেরত দেবে না।
- Local/dev emergency testing দরকার হলে শুধুমাত্র `EXPOSE_DEMO_OTP=true` দিলে demo_code response-এ আসবে। Production-এ এটি দেবেন না।
- DEMO OTP এখন hardcoded `123456` নয়, per-request random code।

7. Public config hardening
- `/api/config` থেকে private contact-like fields remove করা হয়েছে।
- integration readiness public-safe shape-এ limited করা হয়েছে।

## Deploy warning
Production deploy করার আগে backup নিন, `.env/production.env`-এ real OTP provider configure করুন এবং `EXPOSE_DEMO_OTP` unset/false রাখুন।

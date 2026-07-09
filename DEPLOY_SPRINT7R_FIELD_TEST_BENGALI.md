# Sprint-7R Deploy & Field Test Checklist

1. Live server backup নিন।
2. `.env` এবং `data/` folder overwrite করবেন না।
3. Latest Sprint-7R ZIP-এর code deploy করুন।
4. `npm install` প্রয়োজন হলে চালান।
5. `npm run s7r:check` চালান।
6. Server restart করুন।
7. `/api/health`, `/field-test/`, `/api/platform/mobile-launch-gate` test করুন।
8. GitHub Actions থেকে APK build করুন।
9. Real phone-এ test করুন: QR scan, guest booking, driver trusted device, GPS, payment, OTP, live tracking, SOS, receipt।
10. Field issue থাকলে `/field-test/` থেকে log করুন।

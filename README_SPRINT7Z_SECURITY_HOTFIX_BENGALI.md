# NEXO Ride Sprint-7Z Security Hotfix RC2

এই build Sprint-7Y RC1 security review-এর release blockers ঠিক করে।

## Fixed
- `/api/auth/login` এ real rate-limit + account lockout enforce করা হয়েছে।
- `/api/auth/login-otp` এবং reset-password OTP verify-তে attempt-limit + lockout যোগ হয়েছে।
- `.env.example` থেকে real mobile/email এবং weak default password সরানো হয়েছে।
- first-run admin password weak/default হলে server random password generate করে `data/INITIAL_ADMIN_CREDENTIALS.txt` এ লিখবে। first login-এর পর password change করা বাধ্যতামূলক।
- `/red-team/`, `/release-candidate/`, `/rc-issues/`, `/rc-deploy/` route bug fixed।
- CSP, HSTS, X-Frame-Options, nosniff, referrer policy security headers যোগ হয়েছে।
- CORS default deny; `ALLOWED_ORIGINS` এ production origin বসাতে হবে।

## Deploy Rule
Latest Sprint-7Z ZIP deploy করুন। live `.env` এবং `data/` folder overwrite করবেন না।

## Check
```bash
npm run s7z:check
npm run final:smoke
```

Web checks:
- `/security-hotfix/`
- `/api/platform/security-hotfix-readiness`
- `/api/platform/rc-launch-gate`

## Production Reminder
Production এ `OTP_PROVIDER=DEMO` বা `PAYMENT_PROVIDER=DEMO` রাখবেন না। Razorpay webhook secret, Google Maps key, FCM config এবং secure JWT/SESSION secrets configure করে Production Mode ON করুন।

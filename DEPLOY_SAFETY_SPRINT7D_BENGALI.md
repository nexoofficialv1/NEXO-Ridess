# Sprint-7D Deploy Safety Note

## খুব গুরুত্বপূর্ণ
Production VPS-এ deploy করার সময় existing `data/` folder বা `data/nexo_ride_db.json` overwrite করবেন না। ওই file-এ live users, drivers, rides, payments, sessions থাকতে পারে।

## Recommended Deploy
1. Current server folder backup নিন।
2. Code files update করুন।
3. `data/` folder untouched রাখুন।
4. Server restart করুন।
5. Check করুন:
   - `/api/health`
   - `/api/platform/scale-readiness`
   - `/api/platform/ride-flow-readiness`
   - `/qr/`
   - `/guest-ride/`
   - `/driver-lite/`

## Auto DB Migration
Server start হলে runtime-এ additive schema fields auto add হবে:
- `schema_version: S7D`
- `ride_flow_settings`
- `live_tracking_settings`
- `payment_flow_settings`
- `S7D_PAYMENT_OTP_LIVE_TRACKING` migration log

Existing data delete/rename করা হয়নি।

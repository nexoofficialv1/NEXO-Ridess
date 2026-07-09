# NEXO Ride v2.0 Sprint-7B
## QR Web Booking + Simple Driver Dashboard — Safe Server Add-on

এই update বর্তমান server/backend-এর ওপরেই কাজ করবে। আলাদা server লাগে না। Existing API, login, admin panel, APK permission patch overwrite করা হয়নি।

### Added
- `/qr/` public QR Web Booking page
- `/driver-lite/` simple driver dashboard page
- `GET /api/qr/config`
- `POST /api/qr/fare`
- `POST /api/qr/book`
- `GET /api/driver/simple-dashboard`
- JSON DB migration: `qr_web_bookings[]`, `qr_settings{}`

### Safety
- Existing data delete/rename করা হয়নি
- Existing routes overwrite করা হয়নি
- Local JSON DB auto-backward compatible migration added
- Root project ও `nexo_v153` duplicate pack দুটোতেই patch রাখা হয়েছে

### Deploy
1. Current server folder backup নিন
2. এই updated project upload করুন
3. `npm run check`
4. `pm2 restart nexo-ride` অথবা আপনার existing restart method ব্যবহার করুন
5. Test:
   - `/api/health`
   - `/qr/`
   - `/driver-lite/`

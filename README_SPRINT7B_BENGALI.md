# Sprint-7B Deploy Note — NEXO Ride

এটা full project update। আপনার বর্তমান VPS/server-এর ওপরেই deploy হবে। আলাদা server বানানোর দরকার নেই।

## New URLs
- QR Booking: `https://ride.nexoofficial.in/qr/`
- Driver Lite Dashboard: `https://ride.nexoofficial.in/driver-lite/`

## New APIs
- `GET /api/qr/config`
- `POST /api/qr/fare`
- `POST /api/qr/book`
- `GET /api/driver/simple-dashboard`

## Important
Driver Lite Dashboard-এ driver login token দরকার হবে। Main app-এ driver login করে token পাওয়া গেলে সেটা দিয়ে dashboard ব্যবহার করা যাবে। পরে চাইলে direct OTP loginও dashboard-এ যোগ করা যাবে।

## Server Safety
এই update existing backend-এর মধ্যে add-on হিসেবে বসানো হয়েছে। পুরনো server config, `.env`, data file, admin/login/driver approval flow untouched রাখা হয়েছে।

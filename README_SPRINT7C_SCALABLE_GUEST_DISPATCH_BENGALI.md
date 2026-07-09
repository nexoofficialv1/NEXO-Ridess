# NEXO Ride Sprint-7C — Scalable Guest Booking + Dispatch Foundation

এই build টি Sprint-7B Security Fix-এর ওপর **scalable ride-dispatch foundation** যোগ করেছে। লক্ষ্য: বর্তমানে 5,000 driver data এবং ভবিষ্যতে 10,000 driver / 3,500 active driver পর্যন্ত upgrade করার জন্য core structure আগে থেকেই ready রাখা।

## যোগ হয়েছে

### 1) Guest Passenger Booking Flow
Passenger account না খুলেও booking করতে পারবে:

1. Website `/qr/` অথবা QR scan `/qr-scanner/`
2. Pickup + Drop
3. Fare estimate
4. Driver searching
5. Driver accept করলে payment
6. Payment complete হলে OTP
7. Driver pickup reached → passenger OTP দিয়ে ride start
8. Driver drop reached
9. Passenger confirm reached + rating
10. Receipt/status page

### 2) New Guest Ride Status Page

URL:

```text
/guest-ride/?token=GUEST_RIDE_TOKEN
```

এই page থেকে passenger দেখতে পারবে:

- Ride status
- Driver details
- OTP
- Google Maps route links
- Timeline
- Demo payment button, only when DEMO payment mode
- Confirm Reached + Rating

### 3) New Public APIs

```text
GET  /api/platform/scale-readiness
POST /api/guest/quote
GET  /api/guest/rides/:token
POST /api/guest/rides/:token/payment-demo
POST /api/guest/rides/:token/confirm-reached
```

Existing API ভাঙা হয়নি। `/api/qr/book` এখন `guest_ride_token` এবং `guest_status_url` return করে।

### 4) Passenger Confirm Reached State Machine

Guest/QR ride-এর ক্ষেত্রে driver `complete` চাপলে সরাসরি final complete হবে না। আগে status হবে:

```text
DRIVER_REACHED_DROP
```

তারপর passenger `/guest-ride/` page থেকে confirm করলে final status হবে:

```text
COMPLETED
```

Registered passenger app ride আগের মতো চলবে।

### 5) Scale Foundation

Database/schema additive metadata added:

- `schema_version`
- `schema_migrations`
- `scale_settings`
- `dispatch_settings`
- `guest_booking_settings`
- `guest_ride_sessions`
- `dispatch_events`
- `driver_live_index`

Future upgrade policy:

```text
ADDITIVE_MIGRATIONS_ONLY
```

মানে future upgrade-এ existing table/data delete/rename না করে শুধু new column/table/index/config add হবে।

## 10,000 Driver Upgrade Design

Current pilot mode JSON fallback রেখেও future Redis/PostgreSQL switch-ready করা হয়েছে। পরে scale বাড়াতে:

```text
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
DISPATCH_MODE=REDIS_GEO
LIVE_LOCATION_STORE=REDIS_GEO
NEXO_TARGET_REGISTERED_DRIVERS=10000
NEXO_TARGET_ACTIVE_DRIVERS=3500
```

এই env/config দিয়ে same API structure রেখে backend scale করা যাবে।

## Test করা হয়েছে

- `node --check server.js`
- `npm run check`
- local `/api/health`
- local `/api/platform/scale-readiness`
- local `/api/guest/quote`
- local `/api/qr/book`
- local `/api/guest/rides/:token`

## Deploy Rule

Production server-এ deploy করার আগে:

1. Current server folder backup নিন।
2. `data/nexo_ride_db.json` backup নিন।
3. ZIP deploy করুন।
4. `npm run check` চালান।
5. Server restart করুন।
6. Test URLs:

```text
/api/health
/api/platform/scale-readiness
/qr/
/qr-scanner/
/guest-ride/?token=TEST_TOKEN
/driver-lite/
```

## গুরুত্বপূর্ণ

- Real production payment চালু না থাকলে `/payment-demo` শুধু DEMO mode-এ test করার জন্য।
- Live tracking এখন polling/status-ready; high-scale production-এ Redis + WebSocket/SSE worker enable করতে হবে।
- এই build existing app/API ভাঙার উদ্দেশ্যে নয়; scale foundation add-on হিসেবে করা হয়েছে।

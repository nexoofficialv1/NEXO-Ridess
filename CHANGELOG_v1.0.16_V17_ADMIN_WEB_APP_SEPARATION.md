# NEXO Ride v1.0.16 V17 — Admin Web App Separation

## Updated
- Admin is now separated as a browser-based Web App at `/admin/`.
- Passenger/Driver remains in the single APK/web app at `/app/`.
- `/admin/` has dedicated admin login and uses separate admin session storage.
- Passenger/Driver accounts cannot open Admin Web App.
- Admin Web dashboard keeps Driver Approval, Live Booking Monitor, Safety Monitor, Payment Monitor, and Payout Settlement.
- Termux guide now shows two URLs: `/app/` and `/admin/`.

## Admin Login
- Email: admin@example.com
- Mobile: <ADMIN_MOBILE>
- Password: <SET_STRONG_TEMP_PASSWORD> temporary; change before production.

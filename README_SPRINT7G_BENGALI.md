# Sprint-7G Bengali Note

এই update-এ Driver-দের জন্য Trusted Device Login যোগ করা হয়েছে।

## Driver Login
- Driver একবার OTP দিয়ে login করলে প্রতিদিন login করতে হবে না।
- Device server-side recognized থাকবে।
- Access token expire হলে refresh token দিয়ে auto login renew হবে।
- New device হলে আবার OTP login করতে হবে।

## Security
- Refresh token database-এ raw রাখা হয় না; hash রাখা হয়।
- Driver নিজে device revoke করতে পারবে।
- Main Admin হারানো phone/device revoke করতে পারবে।

## New APIs
- `POST /api/auth/refresh-session`
- `POST /api/auth/logout`
- `GET /api/driver/devices`
- `POST /api/driver/devices/:id/revoke`
- `GET /api/admin/driver-devices`
- `POST /api/admin/driver-devices/:id/revoke`
- `GET /api/passenger/my-rides`
- `GET /api/platform/session-readiness`

## Deploy Rule
Live server-এর `data/` folder overwrite করবেন না। আগে backup নেবেন।

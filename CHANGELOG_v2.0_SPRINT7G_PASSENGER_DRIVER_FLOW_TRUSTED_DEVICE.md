# NEXO Ride v2.0 Sprint-7G — Passenger/Driver Flow Polish + Trusted Driver Device Login

Added as an additive, rollback-safe update on top of Sprint-7F.

## Added
- Driver trusted device persistent login.
- Driver refresh-session endpoint.
- Driver device list/revoke endpoints.
- Admin driver device visibility and revoke endpoints.
- Passenger My Rides API foundation.
- Session readiness endpoint for production monitoring.
- Driver Lite OTP login with Remember Device, auto-refresh, logout, clear-device, and trusted device management.

## Safety
- Refresh tokens are stored only as SHA-256 hashes in database.
- Driver devices can be revoked by driver or main admin.
- Existing sessions and old APK APIs are not broken.
- `data/` folder is not included in release ZIP.

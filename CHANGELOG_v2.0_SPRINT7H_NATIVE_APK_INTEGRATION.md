# NEXO Ride v2.0 Sprint-7H — Native APK Integration

- APK base URL bumped to `/app/?v=apk7h&native=1`.
- Added native deep links for QR scanner, driver dashboard, guest ride status and app return.
- Added Android native bridge methods for device identity, trusted driver refresh token, permissions, QR scanner and driver dashboard.
- Driver trusted device login can use native device id and private app storage.
- Web app shows APK-native launcher shortcuts when opened inside the APK.
- GitHub APK workflow renamed to Sprint-7H and APK version bumped to 2.0.7H / code 78.

Deploy safety: keep live `.env` and `data/` folder unchanged.

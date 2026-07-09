# NEXO Ride Sprint-7H — Native APK Integration

এই build latest Sprint-7G cumulative server-এর ওপর native APK integration যোগ করে।

## কী যোগ হয়েছে

- APK Home/App WebView এখন `/app/?v=apk7h&native=1` খুলবে।
- Native QR Scanner route: `/qr-scanner/?native=1`
- Driver Dashboard route: `/driver-lite/?native=1`
- Guest Ride Status route: `/guest-ride/?native=1`
- Driver trusted device login-এর জন্য native `device_id` bridge।
- Driver refresh token native app-private storage bridge।
- Location, Camera, Notification, Media/File chooser permission bridge।
- Google Login external browser return-to-app deep link support।
- `nexoride://qr`, `nexoride://driver`, `nexoride://guest-ride`, `nexoride://book` deep link support।
- `/api/platform/apk-readiness` readiness endpoint।

## Deploy rule

শুধু latest Sprint-7H ZIP deploy করবেন। আগের ZIP আলাদা করে deploy করতে হবে না।

কিন্তু live server-এর `data/` folder এবং `.env` overwrite করবেন না।

## APK build

GitHub Actions → `Build NEXO Ride APK 7H` workflow run করলে APK artifact তৈরি হবে।

## Driver login

Driver একবার login করলে trusted device হিসেবে থাকবে। Access token expire হলেও refresh token দিয়ে app session restore করার foundation আছে। Phone হারালে Admin device revoke করবে।

# Sprint-7B QR Scanner Fix

আগের Sprint-7B ZIP-এ QR booking page ছিল, কিন্তু scanner screen ছিল না। এই fix-এ যোগ করা হয়েছে:

- `/qr-scanner/` camera QR scanner page
- Passenger app home-এ QR Scanner shortcut
- Scanner QR URL পড়লে সরাসরি booking page খুলবে
- Existing database/API/config পরিবর্তন করা হয়নি

## ব্যবহার

Deploy করার পর খুলুন:

`https://ride.nexoofficial.in/qr-scanner/`

Camera permission Allow করতে হবে। Android WebView/Chrome-এ HTTPS ছাড়া camera চলবে না। কোনো device-এ scanner support না করলে manual QR link paste করার fallback আছে।

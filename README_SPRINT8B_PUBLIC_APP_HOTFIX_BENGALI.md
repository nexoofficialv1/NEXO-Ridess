# NEXO Ride Sprint-8B Public App Hotfix

এই hotfix public passenger app-এর field-test bug ঠিক করে:

- Passenger login করার পর internal QA cards আর দেখাবে না।
- Passenger home এখন public booking home হবে।
- Back button চাপলে app restart/exit না করে প্রথমে Home-এ ফিরবে।
- Booking sheet-এ Current Location / GPS pickup button যোগ হয়েছে।
- Pickup/Drop input-এ visible suggestion chips/dropdown যোগ হয়েছে।
- QR booking page-এ current geo-tag, Google Map link এবং pickup/drop suggestions যোগ হয়েছে।
- APK version: 2.0.8B-HOTFIX, versionCode 96.

Deploy rule: latest ZIP deploy করবেন, live `.env` এবং `data/` folder overwrite করবেন না।

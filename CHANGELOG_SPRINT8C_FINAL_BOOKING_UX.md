# NEXO Ride Sprint-8C Final Booking UX + DB Migration Ready

## Passenger booking flow
- Map-first booking sheet redesigned with NEXO premium UI.
- Pickup and Drop are mandatory before driver search.
- Pickup selection automatically guides the user to Drop selection.
- Pickup + Drop fixed হলে map preview-এ route line, distance, ETA and fare preview দেখাবে।
- Driver search screen added with smooth pulse/progress animation.
- Driver found stage added before payment.
- Payment method stage added before final booking confirmation.
- Booking confirmation sends payment metadata and route/fare metadata to the backend.
- OTP ride start flow remains preserved for driver/passenger ride execution.
- Reached/Completed rating flow remains preserved and styled to match final journey.

## UI/UX
- Premium NEXO gradient design language applied to booking flow.
- Smooth cards, timeline, bottom sheet interaction, route preview, and payment UI added.
- Mobile-small screen fit improved for booking and map screens.
- Back button behavior improved in Android wrapper to avoid app restart/exit during booking.

## Android APK wrapper
- Native version bumped to Sprint-8C.
- Android User-Agent bumped to NEXO-Ride-Android/8C.
- Default app URL cache version bumped to apk8c.
- Back press closes booking sheet or sends app to background instead of forced restart.

## Database migration
- Added docs/SPRINT8C_POSTGRES_MIGRATION.sql.
- Added scripts/postgres_migrate_sprint8c.js.
- Added npm script: npm run db:migrate:sprint8c.
- Migration creates core production tables: users, driver_profiles, rides, notifications, device_tokens, payments, audit_log.
- Migration uses CREATE TABLE IF NOT EXISTS and safe indexes.

## Checks
- npm run check passed.

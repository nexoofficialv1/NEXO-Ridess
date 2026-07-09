# Sprint-8E — Reached Confirm + Rating + Receipt Flow

## Added
- Driver `Complete` now sends **Destination Reached** notification/state first.
- Passenger must tap **Confirm Reached** before the ride is fully completed.
- Confirm Reached opens **Rating + Suggestion** flow.
- Receipt button added for reached/completed rides.
- Passenger auto prompt opens ride details when `DRIVER_REACHED_DROP` is detected.

## Server
- Added `POST /api/rides/:id/confirm-reached`.
- Complete action now supports `DRIVER_REACHED_DROP -> passenger confirm -> COMPLETED`.
- Driver receives passenger reached-confirmation notification.

## UI
- Added green highlighted reached-pending ride card.
- Added polished receipt modal with fare, payment, driver and vehicle details.
- Improved driver complete toast so driver understands passenger confirmation is pending.

## Checks
- `npm run check`
- `npm run final:smoke`

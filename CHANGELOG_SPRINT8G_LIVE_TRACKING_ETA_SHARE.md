# NEXO Ride — Sprint-8G Live Tracking + ETA + Share

## Added
- Passenger/Driver live tracking panel inside app.
- Track button on active ride cards.
- Live ETA/remaining distance display from latest driver GPS.
- Route map, fare, OTP/safety information in one screen.
- Share Trip text now includes live tracking link.
- Server API: `GET /api/rides/:id/live-track`.

## Preserved
- Sprint-8C pickup/drop/route flow.
- Sprint-8D real driver accept/payment gate.
- Sprint-8E reached confirm/rating/receipt.
- Sprint-8F cancel/support/safety panel.

## QA
- `npm run check`
- `npm run final:smoke`

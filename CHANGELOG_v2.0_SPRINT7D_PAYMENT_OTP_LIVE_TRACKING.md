# NEXO Ride v2.0 Sprint-7D — Payment + OTP + Live Tracking Foundation

## Added
- Guest passenger payment order endpoint after driver accepts booking.
- Guest payment reference/demo confirmation endpoints.
- Guest live tracking snapshot endpoint with driver-to-pickup/drop Google Maps links.
- S7D ride flow settings and migration metadata.
- Platform ride-flow readiness endpoint.
- Guest status page upgraded for payment order, reference payment, OTP, live tracking, confirm reached and rating.
- Driver Lite dashboard upgraded with navigation links and GPS heartbeat.

## Safety / Upgrade Policy
- Additive migration only. Existing tables/data are not deleted.
- Existing driver/passenger app API flow remains supported.
- Real production payment still requires Razorpay keys/webhook verification before public launch.

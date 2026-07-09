# NEXO Ride Sprint-7M — Admin Ops + Fraud/Abuse + Support Desk

এই build Sprint-7L cumulative base-এর ওপর তৈরি।

## যোগ হয়েছে
- `/admin-ops/` Admin Ride Operations Center
- `/api/platform/admin-ops-readiness`
- `/api/admin/ride-ops`
- `/api/admin/rides/:id/intervention`
- `/api/admin/abuse-control`
- `/api/admin/driver-misuse`
- `/api/admin/support-desk`
- Guest booking rate-limit / unpaid ride abuse blocker
- Driver misuse alerts: too many rejects, stale GPS, accepted but not started
- Manual intervention: Reassign, Force Cancel, Mark Payment Resolved, Resend OTP, Passenger No Response, Admin Note
- Full audit trail for admin actions

## Deploy Rule
Latest ZIP deploy করবেন। live `.env` এবং `data/` folder overwrite করবেন না।

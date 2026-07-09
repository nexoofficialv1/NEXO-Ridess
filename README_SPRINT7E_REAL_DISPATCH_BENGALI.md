# Sprint-7E Real Dispatch + Payment Webhook Foundation

এই build-এ NEXO Ride-এর dispatch engine আরও production-ready করা হয়েছে।

## নতুন যোগ হয়েছে
1. Driver candidate queue
2. Accept timeout
3. Reject করলে auto reassign
4. Timeout হলে auto reassign
5. Dispatch attempts/history
6. Admin dispatch status endpoint
7. Razorpay webhook signature verification
8. Payment webhook idempotency
9. Future Redis/PostgreSQL scale hook

## Important URLs
- `/api/platform/dispatch-readiness`
- `/api/platform/payment-webhook-readiness`
- `/api/admin/dispatch/status`
- `/api/admin/dispatch/cleanup`
- `/api/payments/webhook/razorpay`

## Deploy Safety
- `data/` folder overwrite করবেন না।
- Existing database delete/replace করা যাবে না।
- Deploy করার আগে backup নেবেন।
- এই update additive; old APIs kept compatible.

## Scale Direction
বর্তমানে JSON fallback pilot mode থাকবে। পরে production scale-এ PostgreSQL + Redis GEO + worker increase করলে ৫,০০০ থেকে ১০,০০০ driver scale করা যাবে without APK/API rewrite.

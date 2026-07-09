# NEXO Ride Sprint-7O — Fare Engine + Commission + Driver Wallet + Settlement

এই build latest cumulative Sprint-7O. আগের Sprint-7B থেকে 7N পর্যন্ত update এর মধ্যে আছে।

## নতুন যোগ হয়েছে
- Fare Engine: base fare, minimum fare, extra step, waiting charge, peak/night/manual override foundation
- Area-wise fare rule
- Commission rules: percent/fixed/hybrid, area-wise, driver-wise special commission
- Driver wallet + wallet ledger
- Settlement Center: pending payout, mark paid, reference note
- Passenger receipt API ও receipt viewer `/receipt/`
- Admin finance dashboard `/admin-finance/`
- Readiness endpoint `/api/platform/finance-readiness`

## Deploy Rule
- শুধু latest ZIP deploy করবেন
- live `.env` overwrite করবেন না
- live `data/` folder overwrite করবেন না
- deploy পরে `npm run s7o:check` চালাতে পারেন

## Important
Existing rides/driver/payment data delete করা হয়নি। সব update additive.

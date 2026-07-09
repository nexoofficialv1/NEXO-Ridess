# Sprint-7D: Payment + OTP + Live Tracking Foundation

এই build-এর উদ্দেশ্য হলো guest passenger booking flow-কে complete ride lifecycle-এর দিকে নেওয়া।

## Flow
1. Guest passenger QR/website থেকে booking করবে।
2. Driver accept করলে guest status page-এ payment order তৈরি হবে।
3. Payment confirm হলে ride `CONFIRMED` হবে এবং OTP generate হবে।
4. Driver pickup point-এ এসে `Reached Pickup` দেবে।
5. Passenger OTP দিলে driver ride start করবে।
6. Driver drop point-এ গিয়ে `Complete/Reached Drop` দেবে।
7. Guest passenger `Confirm Reached` করে rating দেবে।
8. Receipt metadata তৈরি হবে।

## New Endpoints
- `GET /api/platform/ride-flow-readiness`
- `GET /api/guest/rides/:token/live`
- `POST /api/guest/rides/:token/payment-order`
- `POST /api/guest/rides/:token/payment-reference`
- Existing: `POST /api/guest/rides/:token/payment-demo`
- Existing: `POST /api/guest/rides/:token/confirm-reached`

## Important
- এই build production-scale structure তৈরি করে, কিন্তু 3000–3500 active driver-এর real load test এখনো আলাদা করে করতে হবে।
- Production payment চালুর আগে Razorpay key + webhook verification বাধ্যতামূলক।
- Existing server/config overwrite করা হয়নি।

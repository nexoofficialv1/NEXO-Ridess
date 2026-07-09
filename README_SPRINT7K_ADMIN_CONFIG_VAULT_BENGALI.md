# NEXO Ride Sprint-7K — Admin Config Vault + Real Service Integration Lock

এই build-এ Main Admin portal থেকে production service keys configure করার system যোগ করা হয়েছে।

## New Admin URL

- `/admin/config-center/`
- API readiness: `/api/platform/config-vault-readiness`

## Admin portal থেকে configure করা যাবে

- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`
- `GOOGLE_MAPS_API_KEY`
- `FCM_SERVER_KEY`
- `FIREBASE_SERVICE_ACCOUNT_JSON`
- `JWT_SECRET`
- `SESSION_SECRET`
- `PRODUCTION_MODE`

## Security rules

- Full secret value UI/API response-এ ফেরত দেওয়া হয় না।
- Secret encrypted vault-এ save হয়।
- Master key server-side `data/nexo_config_master.key` file-এ auto-generate হয়, অথবা `NEXO_CONFIG_MASTER_KEY` env দিয়ে override করা যায়।
- Only Main Admin/Super Admin access.
- Audit log থাকে, কিন্তু old/new secret value log হয় না।
- `JWT_SECRET` / `SESSION_SECRET` change করলে existing session logout হতে পারে—UI warning আছে।

## Production Mode Lock

Production Mode ON করার আগে validator check করে:

- Razorpay key ID/secret/webhook secret configured
- Google Maps API key configured
- FCM server key অথবা Firebase service account configured
- JWT_SECRET configured
- SESSION_SECRET configured

Missing থাকলে Production Mode ON হবে না।

## Deploy Safety

Latest ZIP cumulative. আগের Sprint ZIP deploy করতে হবে না।

Production deploy করার সময় live `.env` এবং `data/` folder overwrite করবেন না।

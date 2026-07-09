# Sprint-7L Deploy Note

1. Latest ZIP deploy করুন।
2. Live `.env` রাখুন।
3. Live `data/` folder রাখুন।
4. Deploy-এর আগে backup নিন: `npm run backup:now`
5. Server restart করুন।
6. Check করুন:
   - `/api/health`
   - `/data-health/`
   - `/api/platform/data-layer-readiness`

5k/10k public production launch-এর আগে `DATABASE_URL` এবং `REDIS_URL` configure করতে হবে।

Rule: never data/ folder overwrite during deploy.

# Sprint-7T Deploy Note

1. শুধু latest ZIP deploy করুন।
2. live `.env` ও `data/` folder রাখবেন, replace করবেন না।
3. `npm install` প্রয়োজনে চালান।
4. `npm run s7t:check` চালান।
5. server restart করুন।
6. Check করুন:
   - `/api/health`
   - `/api/platform/public-launch-readiness`
   - `/public-launch/`
   - `/driver-onboarding/`
   - `/passenger-help/`
   - `/qr-kit/`
   - `/support-center/`

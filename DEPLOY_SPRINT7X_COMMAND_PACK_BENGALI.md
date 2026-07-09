# Sprint-7X Deploy Command Pack

1. Backup নিন: `npm run backup:now`
2. latest ZIP code deploy করুন
3. `.env` এবং `data/` আগেরটাই রাখুন
4. `npm install --omit=dev`
5. `npm run s7x:check`
6. server restart
7. `/api/health` এবং `/api/platform/final-smoke-test` check

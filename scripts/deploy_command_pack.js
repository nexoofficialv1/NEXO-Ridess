console.log(`NEXO Ride Sprint-7Y RC1 Deploy Command Pack
1) Backup: npm run backup:now
2) Keep live .env and data/ untouched
3) Install: npm install --omit=dev
4) Preflight: npm run s7y:check
5) Restart: pm2 restart nexo-ride || npm start
6) Health: /api/health
7) Smoke: /api/platform/final-smoke-test
8) Rollback: restore previous code folder, keep current data unless corruption confirmed`);
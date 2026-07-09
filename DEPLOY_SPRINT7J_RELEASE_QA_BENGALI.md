# Sprint-7J Safe Deploy Checklist

## যা কখনো overwrite করবেন না
- live `.env`
- live `data/` folder
- `data/nexo_ride_db.json`
- uploaded KYC/files/backups

## VPS Deploy
```bash
# 1. backup
npm run backup:now

# 2. code update করুন, কিন্তু data/ folder overwrite নয়
npm install
npm run s7j:check
pm2 restart nexo-ride

# 3. check
curl https://ride.nexoofficial.in/api/health
curl https://ride.nexoofficial.in/api/platform/release-readiness
```

## APK Build
GitHub Actions → `Build NEXO Ride APK 7J` → Run workflow → debug/release select → artifact download।

## Rollback
Previous code restore করুন + live data backup restore করুন।

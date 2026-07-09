# Sprint-8K Market Release Checklist

## Before Push
- [ ] ZIP name verified
- [ ] `npm run s8k:check` passed
- [ ] `.env.example` checked
- [ ] migration SQL present
- [ ] demo login hidden in market mode

## Database
- [ ] PostgreSQL database created
- [ ] No manual table creation
- [ ] `npm run db:migrate:production` run
- [ ] tables visible in public schema

## Server
- [ ] `DATABASE_URL` set
- [ ] `JWT_SECRET` changed
- [ ] `APP_MODE=market`
- [ ] server starts without error
- [ ] health API works

## APK
- [ ] GitHub Actions build success
- [ ] APK artifact downloaded
- [ ] Installed on Android phone
- [ ] Location permission works
- [ ] Notification permission works
- [ ] Google login return checked

## Field Test
- [ ] Passenger booking full flow
- [ ] Driver accept/OTP/reached full flow
- [ ] Rating/receipt works
- [ ] Back button does not restart app
- [ ] Public user does not see admin/internal screen

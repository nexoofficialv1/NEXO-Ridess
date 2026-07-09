# Sprint-7Q — Role Permission + Policy + Security Hardening

এই build latest cumulative ZIP। আগের ZIP আলাদা deploy করতে হবে না।

## নতুন যোগ হয়েছে
- `/admin-roles/` Role Security Center
- `/policies/` Public Policy Center
- Main Admin / Safety Admin / Finance Admin / Support Admin / KYC Admin / Ops Admin / Area Admin role matrix
- Config Vault এবং Production Mode Main Admin only lock
- Security Audit endpoint
- Draft policy pages

## Deploy Rule
- `.env` overwrite করবেন না
- live `data/` folder overwrite করবেন না
- deploy করার আগে backup নিন

## Test
- `npm run s7q:check`
- `/api/health`
- `/api/platform/role-security-readiness`
- `/admin-roles/`
- `/policies/`

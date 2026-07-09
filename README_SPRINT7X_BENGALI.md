# NEXO Ride Sprint-7X — Final Cleanup + Red Team Security + Deploy Commands

এই build latest cumulative package. আগের Sprint ZIP আলাদা deploy করার দরকার নেই।

## যোগ হয়েছে
- `/final-cleanup/` cleanup readiness
- `/red-team/` red-team security pass
- `/deploy-commands/` production deploy command pack
- `/env-freeze/` environment freeze report
- `/api/platform/final-smoke-test` smoke-test contract
- `npm run s7x:check` final preflight

## Deploy Rule
- live `.env` overwrite করবেন না
- live `data/` folder overwrite করবেন না
- backup নিয়ে deploy করবেন

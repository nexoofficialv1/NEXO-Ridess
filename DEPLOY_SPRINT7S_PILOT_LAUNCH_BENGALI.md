# Sprint-7S Deploy Note

শুধু latest Sprint-7S ZIP deploy করবেন। আগের Sprint ZIP আলাদা করে deploy করার দরকার নেই।

## Deploy Safety

- `.env` overwrite করবেন না
- `data/` folder overwrite করবেন না
- deploy-এর আগে backup নিন
- deploy-এর পর `npm run s7s:check` চালান
- server restart করে `/api/health` দেখুন

## Pilot Gate

- `/pilot-launch/` খুলে readiness দেখুন
- Main Admin/OPS Admin daily report save করতে পারবে
- Critical issue থাকলে public launch gate block থাকবে

# NEXO Ride Sprint-7W — Final APK Build + Launch Gate

## কী যোগ হয়েছে
- Final APK build readiness API
- Release notes center
- APK distribution page
- Version history / rollback target
- Final public launch gate

## Deploy Rule
শুধু latest cumulative ZIP deploy করবেন। live `.env` এবং `data/` folder overwrite করবেন না।

## APK Build
GitHub Actions → **Build NEXO Ride APK 7W** → `build_type=debug` বা `release`।

## Test URLs
- `/apk-release/`
- `/release-notes/`
- `/version-history/`
- `/api/platform/apk-build-readiness`
- `/api/platform/final-launch-gate`

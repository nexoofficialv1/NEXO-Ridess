# NEXO Ride Sprint-7Y — Release Candidate RC1

এই build Sprint-7B থেকে Sprint-7Y পর্যন্ত cumulative update।

## যোগ হয়েছে
- Release Candidate RC1 dashboard: `/release-candidate/`
- RC issue register: `/rc-issues/`
- RC deploy package: `/rc-deploy/`
- RC test suite API: `/api/platform/rc-test-suite`
- RC launch gate: `/api/platform/rc-launch-gate`
- APK version: `2.0.7Y-RC1` / versionCode `93`
- GitHub APK artifacts: `NEXO_Ride_APK_v2_0_7Y_RC1_debug` and `NEXO_Ride_APK_v2_0_7Y_RC1_release`

## Deploy Rule
শুধু latest Sprint-7Y ZIP deploy করবেন। live `.env` এবং `data/` folder overwrite করবেন না।

## Production Note
RC1 launch-ready দেখাবে না যতক্ষণ না real production keys, APK build, field/pilot tests এবং critical/high issue closure complete হয়।

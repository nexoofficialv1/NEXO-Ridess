# Sprint-8K FIX1 — APK Workflow Precheck Fix

Fixed GitHub Actions APK workflow that was still running old Sprint-8A precheck (`npm run s8a:check`).

## Changes
- `.github/workflows/android-apk.yml` now runs `npm run s8k:check`.
- Workflow labels updated to Sprint-8K Market Stable.
- APK artifact name updated to `NEXO_Ride_APK_v2_0_8K_MARKET`.
- Legacy deploy preflight version gate now accepts Sprint-8K marker.

## Result
APK build should no longer fail with `FAIL: Sprint 8A version constant`.

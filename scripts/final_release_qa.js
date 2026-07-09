#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
function has(file, pattern){ try{ const t=fs.readFileSync(path.join(root,file),'utf8'); return typeof pattern === 'string' ? t.includes(pattern) : pattern.test(t); }catch(e){ return false; }}
const checks = [
  ['server_latest', 'server.js', /SPRINT7(T|U)_/],
  ['release_endpoint', 'server.js', '/api/platform/release-readiness'],
  ['final_qa_endpoint', 'server.js', '/api/platform/final-qa-checklist'],
  ['data_layer_endpoint', 'server.js', '/api/platform/data-layer-readiness'],
  ['migration_endpoint', 'server.js', '/api/platform/migration-readiness'],
  ['driver_kyc_qr_endpoint', 'server.js', '/api/platform/driver-kyc-qr-readiness'],
  ['android_version_name', 'apk/app/build.gradle', /versionName '2\.0\.7[TU]'/],
  ['android_version_code', 'apk/app/build.gradle', /versionCode (88|89)/],
  ['manifest_deeplink_qr', 'apk/app/src/main/AndroidManifest.xml', 'android:host="qr"'],
  ['manifest_deeplink_driver', 'apk/app/src/main/AndroidManifest.xml', 'android:host="driver"'],
  ['native_bridge_present', 'apk/app/src/main/java/com/astratechnologies/nexoride/MainActivity.java', 'getDeviceId'],
  ['apk_workflow_latest', '.github/workflows/android-apk.yml', /Sprint7[TU]|7S/],
  ['release_page', 'web/release/index.html', 'Sprint-7'],
  ['data_health_page', 'web/data-health/index.html', 'Data Health'],
  ['config_center_page', 'web/config-center/index.html', 'Admin Config Center'],
  ['admin_ops_page', 'web/admin-ops/index.html', 'Admin Ride Ops'],
  ['admin_drivers_page', 'web/admin-drivers/index.html', 'Driver Onboarding'],
  ['admin_areas_page', 'web/admin-areas/index.html', 'Area / Stand Management'],
  ['admin_qr_page', 'web/admin-qr/index.html', 'QR Management'],
  ['readme_7t', 'README_SPRINT7T_BENGALI.md', 'Sprint-7T'],
  ['finance_page', 'web/admin-finance/index.html', 'Finance Center'],
  ['receipt_page', 'web/receipt/index.html', 'NEXO Ride Receipt'],
  ['admin_safety_page', 'web/admin-safety/index.html', 'NEXO Safety Center'],
  ['track_page', 'web/track/index.html', 'NEXO Ride Live Track'],
  ['role_center_page', 'web/admin-roles/index.html', 'Role Security Center'],
  ['policies_page', 'web/policies/index.html', 'Policy Center'],
  ['field_test_page', 'web/field-test/index.html', 'Field Test Center'],
  ['field_test_endpoint', 'server.js', '/api/platform/field-test-readiness'],
  ['launch_gate_endpoint', 'server.js', '/api/platform/mobile-launch-gate'],
  ['pilot_launch_page', 'web/pilot-launch/index.html', 'Pilot Launch'],
  ['pilot_launch_endpoint', 'server.js', '/api/platform/pilot-launch-readiness']
].map(([key,file,pat])=>({key,file,ok:has(file,pat)}));
const ok = checks.every(c=>c.ok);
console.log(JSON.stringify({ok, sprint:'7U', score:`${checks.filter(c=>c.ok).length}/${checks.length}`, checks}, null, 2));
if(!ok) process.exit(1);

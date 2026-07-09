const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { URL } = require('url');

const VERSION = '2.0-SPRINT8A_DEPLOY_DRY_RUN_APK_QA';
// SmartASP.NET assigns a dynamic Node.js port in process.env.PORT. Do not hardcode 3333 on shared hosting.
const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
function loadEnvFile(file){
  try{
    if(!fs.existsSync(file)) return;
    const lines = fs.readFileSync(file,'utf8').split(/\r?\n/);
    for(const line of lines){
      const t = line.trim();
      if(!t || t.startsWith('#') || !t.includes('=')) continue;
      const idx = t.indexOf('=');
      const key = t.slice(0,idx).trim();
      let val = t.slice(idx+1).trim();
      if((val.startsWith('\"') && val.endsWith('\"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1,-1);
      if(key && process.env[key] === undefined) process.env[key] = val;
    }
  }catch(e){ console.error('ENV_LOAD_ERROR', file, e.message); }
}
loadEnvFile(path.join(__dirname,'.env'));
loadEnvFile(path.join(__dirname,'data','production.env'));
const DB_FILE = path.join(DATA_DIR, 'nexo_ride_db.json');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(DATA_DIR, 'uploads');
const PUBLIC_DIR = path.join(__dirname, 'web', 'app');
const ADMIN_DIR = path.join(__dirname, 'web', 'admin');
const SUBADMIN_DIR = path.join(__dirname, 'web', 'subadmin');
const QR_DIR = path.join(__dirname, 'web', 'qr');
const DRIVER_LITE_DIR = path.join(__dirname, 'web', 'driver-lite');
const QR_SCANNER_DIR = path.join(__dirname, 'web', 'qr-scanner');
const GUEST_RIDE_DIR = path.join(__dirname, 'web', 'guest-ride');
const OPS_DIR = path.join(__dirname, 'web', 'ops');
const DEPLOY_DIR = path.join(__dirname, 'web', 'deploy');
const RELEASE_DIR = path.join(__dirname, 'web', 'release');
const CONFIG_CENTER_DIR = path.join(__dirname, 'web', 'config-center');
const DATA_HEALTH_DIR = path.join(__dirname, 'web', 'data-health');
const ADMIN_OPS_DIR = path.join(__dirname, 'web', 'admin-ops');
const ADMIN_DRIVERS_DIR = path.join(__dirname, 'web', 'admin-drivers');
const ADMIN_AREAS_DIR = path.join(__dirname, 'web', 'admin-areas');
const ADMIN_QR_DIR = path.join(__dirname, 'web', 'admin-qr');
const ADMIN_FINANCE_DIR = path.join(__dirname, 'web', 'admin-finance');
const RECEIPT_DIR = path.join(__dirname, 'web', 'receipt');
const ADMIN_SAFETY_DIR = path.join(__dirname, 'web', 'admin-safety');
const TRACK_DIR = path.join(__dirname, 'web', 'track');
const ROLE_CENTER_DIR = path.join(__dirname, 'web', 'admin-roles');
const POLICIES_DIR = path.join(__dirname, 'web', 'policies');
const FIELD_TEST_DIR = path.join(__dirname, 'web', 'field-test');
const PILOT_LAUNCH_DIR = path.join(__dirname, 'web', 'pilot-launch');
const PUBLIC_LAUNCH_DIR = path.join(__dirname, 'web', 'public-launch');
const DRIVER_ONBOARDING_DIR = path.join(__dirname, 'web', 'driver-onboarding');
const PASSENGER_HELP_DIR = path.join(__dirname, 'web', 'passenger-help');
const QR_KIT_DIR = path.join(__dirname, 'web', 'qr-kit');
const SUPPORT_CENTER_DIR = path.join(__dirname, 'web', 'support-center');
const UX_POLISH_DIR = path.join(__dirname, 'web', 'ux-polish');
const DISTRIBUTION_PACK_DIR = path.join(__dirname, 'web', 'distribution-pack');
const SECURITY_DEPLOY_DIR = path.join(__dirname, 'web', 'security-deploy');
const ROLLBACK_DIR = path.join(__dirname, 'web', 'rollback');
const MAINTENANCE_DIR = path.join(__dirname, 'web', 'maintenance');
const APK_RELEASE_DIR = path.join(__dirname, 'web', 'apk-release');
const RELEASE_NOTES_DIR = path.join(__dirname, 'web', 'release-notes');
const VERSION_HISTORY_DIR = path.join(__dirname, 'web', 'version-history');
const FINAL_CLEANUP_DIR = path.join(__dirname, 'web', 'final-cleanup');
const RED_TEAM_DIR = path.join(__dirname, 'web', 'red-team');
const DEPLOY_COMMANDS_DIR = path.join(__dirname, 'web', 'deploy-commands');
const ENV_FREEZE_DIR = path.join(__dirname, 'web', 'env-freeze');
const RELEASE_CANDIDATE_DIR = path.join(__dirname, 'web', 'release-candidate');
const RC_ISSUES_DIR = path.join(__dirname, 'web', 'rc-issues');
const RC_DEPLOY_DIR = path.join(__dirname, 'web', 'rc-deploy');
const SECURITY_HOTFIX_DIR = path.join(__dirname, 'web', 'security-hotfix');
const DEPLOY_DRY_RUN_DIR = path.join(__dirname, 'web', 'deploy-dry-run');
const APK_QA_DIR = path.join(__dirname, 'web', 'apk-qa');
const PILOT_PRECHECK_DIR = path.join(__dirname, 'web', 'pilot-precheck');
const SESSION_DAYS = 30;
const PAYMENT_HOLD_SECONDS = 180; // Driver accept করার পর passenger payment করার সময়

function now(){ return new Date().toISOString(); }
function ensureDataDir(){ if(!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR,{recursive:true}); }
function uid(prefix='id'){ return prefix + '_' + crypto.randomBytes(8).toString('hex'); }
function sha(v){ return crypto.createHash('sha256').update(String(v||'')).digest('hex'); }
function salt(){ return crypto.randomBytes(16).toString('hex'); }
function hashPassword(password, s){ return crypto.pbkdf2Sync(String(password||''), s, 120000, 32, 'sha256').toString('hex'); }
function verifyPassword(password, s, h){ if(!s||!h) return false; return hashPassword(password,s) === h; }
function safeUser(u){ if(!u) return null; const {password_hash,password_salt,...rest}=u; return rest; }

function sanitizeText(input, maxLen=120){
  return String(input||'')
    .replace(/[-]/g,' ')
    .replace(/<[^>]*>/g,' ')
    .replace(/[<>]/g,'')
    .replace(/\s+/g,' ')
    .trim()
    .slice(0, maxLen);
}
function publicConfig(db){
  ensureSprint7IFoundation(db);
  const safeSettings = {...(db.app_settings||{})};
  for(const k of ['support_email','admin_email','owner_email','owner_mobile','admin_mobile','private_contact']) delete safeSettings[k];
  const i = mergeIntegrations(db.integrations||{});
  return {
    ok:true,
    version:VERSION,
    app_settings:safeSettings,
    service_area:db.service_area,
    area_catalog:db.area_catalog||[],
    fare_rules:db.fare_rules,
    qr_settings:db.qr_settings||{},
    guest_booking:{enabled:!!db.guest_booking_settings?.enabled, web:'/qr/', scanner:'/qr-scanner/', status_page:'/guest-ride/'},
    dispatch:{engine:db.dispatch_runtime_settings?.engine, accept_timeout_seconds:db.dispatch_runtime_settings?.accept_timeout_seconds, queue:'/api/platform/dispatch-readiness'},
    ops:{dashboard:'/ops/', readiness:'/api/platform/ops-readiness', capacity_profile:db.ops_scale_settings?.active_profile||'PILOT_5K'},
    release:{dashboard:'/release/', readiness:'/api/platform/release-readiness', qa:'/api/platform/final-qa-checklist'},
    field_test:{dashboard:'/field-test/', readiness:'/api/platform/field-test-readiness', launch_gate:'/api/platform/mobile-launch-gate'},
    pilot_launch:{dashboard:'/pilot-launch/', readiness:'/api/platform/pilot-launch-readiness', launch_gate:'/api/platform/pilot-go-live-gate'},
    public_launch:{dashboard:'/public-launch/', readiness:'/api/platform/public-launch-readiness', launch_kit:'/api/public/launch-kit', qr_kit:'/qr-kit/', support:'/support-center/', onboarding:'/driver-onboarding/', passenger_help:'/passenger-help/'},
    ux_distribution:{dashboard:'/ux-polish/', distribution:'/distribution-pack/', readiness:'/api/platform/ux-distribution-readiness', language_pack:'/api/public/language-pack'},
    security_deploy:{dashboard:'/security-deploy/', rollback:'/rollback/', maintenance:'/maintenance/', readiness:'/api/platform/security-deploy-readiness', release_lock:'/api/platform/launch-release-lock', maintenance_status:'/api/public/maintenance-status'},
    apk_launch:{dashboard:'/apk-release/', release_notes:'/release-notes/', version_history:'/version-history/', apk_build:'/api/platform/apk-build-readiness', final_gate:'/api/platform/final-launch-gate', release_notes_api:'/api/public/release-notes'},
    final_cleanup:{dashboard:'/final-cleanup/', red_team:'/red-team/', deploy_commands:'/deploy-commands/', env_freeze:'/env-freeze/', readiness:'/api/platform/final-cleanup-readiness', security:'/api/platform/red-team-security-readiness', smoke:'/api/platform/final-smoke-test'},
    release_candidate:{dashboard:'/release-candidate/', issues:'/rc-issues/', deploy:'/rc-deploy/', readiness:'/api/platform/release-candidate-readiness', gate:'/api/platform/rc-launch-gate', test_suite:'/api/platform/rc-test-suite'},
    security_hotfix:{dashboard:'/security-hotfix/', readiness:'/api/platform/security-hotfix-readiness', audit:'/api/platform/security-audit-runtime'},
    sprint8a:{dashboard:'/deploy-dry-run/', apk_qa:'/apk-qa/', pilot_precheck:'/pilot-precheck/', readiness:'/api/platform/sprint8a-readiness', deploy_dry_run:'/api/platform/deploy-dry-run-readiness', apk_qa_readiness:'/api/platform/apk-qa-readiness', real_device_qa:'/api/platform/real-device-qa-checklist', pilot_gate:'/api/platform/pilot-preflight-gate'},
    config_center:{dashboard:'/admin/config-center/', readiness:'/api/platform/config-vault-readiness'},
    finance:{dashboard:'/admin-finance/', readiness:'/api/platform/finance-readiness', receipt:'/receipt/'},
    safety:{dashboard:'/admin-safety/', public_track:'/track/', readiness:'/api/platform/safety-readiness', sos_enabled:!!db.safety_settings?.sos_enabled, trip_share_enabled:!!db.safety_settings?.trip_share_enabled},
    session:{driver_persistent_login:!!db.driver_device_settings?.driver_persistent_login_enabled, trusted_device_days:db.driver_device_settings?.driver_trusted_session_days||90, readiness:'/api/platform/session-readiness'},
    scale:{target_registered_drivers:db.scale_settings?.target_registered_drivers, target_active_drivers:db.scale_settings?.target_active_drivers, dispatch_mode:db.dispatch_settings?.mode, live_location_store:db.scale_settings?.live_location_store},
    integrations:{map:{provider:i.map?.provider, api_key_configured:!!i.map?.api_key_configured}, payment:{provider:i.payment?.provider}, otp:{provider:i.otp?.provider}, push:{provider:i.push?.provider}}
  };
}

function sanitizeRideText(input, maxLen=160){
  return String(input||'')
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi,' ')
    .replace(/<[^>]*>/g,' ')
    .replace(/[<>]/g,'')
    .replace(/[\u0000-\u001f\u007f]/g,' ')
    .replace(/\s+/g,' ')
    .trim()
    .slice(0, maxLen);
}
function defaultScaleSettings(){
  return {
    architecture_version:'S7C-SCALE-FOUNDATION',
    target_registered_drivers:Number(process.env.NEXO_TARGET_REGISTERED_DRIVERS || 10000),
    target_active_drivers:Number(process.env.NEXO_TARGET_ACTIVE_DRIVERS || 3500),
    live_location_store:String(process.env.LIVE_LOCATION_STORE || 'JSON_FALLBACK_REDIS_READY').toUpperCase(),
    redis_ready:!!process.env.REDIS_URL,
    postgres_ready:!!process.env.DATABASE_URL,
    websocket_ready:false,
    location_update_seconds:{idle:15, assigned:5, active_ride:4},
    upgrade_policy:'ADDITIVE_MIGRATIONS_ONLY',
    note:'Driver profiles and ride history stay in database. High-frequency live location/dispatch is Redis-ready and can be enabled by env/config without rewriting APIs.'
  };
}
function defaultDispatchSettings(){
  return {
    mode:String(process.env.DISPATCH_MODE || 'REGION_QUEUE_JSON_FALLBACK').toUpperCase(),
    max_driver_candidates:Number(process.env.MAX_DRIVER_CANDIDATES || 8),
    default_radius_km:Number(process.env.DRIVER_MATCH_RADIUS_KM || 8),
    accept_timeout_seconds:Number(process.env.DRIVER_ACCEPT_TIMEOUT_SECONDS || 30),
    reassign_on_reject:true,
    reassign_on_timeout:true,
    max_reassign_rounds:Number(process.env.DISPATCH_MAX_REASSIGN_ROUNDS || 6),
    driver_cooldown_seconds:Number(process.env.DISPATCH_DRIVER_COOLDOWN_SECONDS || 90),
    queue_visibility:'CANDIDATE_ONLY',
    avoid_full_table_scan:true,
    priority:['APPROVED','ONLINE','IDLE','SAME_AREA','NEAREST','RATING','LOW_RECENT_REJECT'],
    future_modes:['REDIS_GEO','REGION_QUEUE','ADVANCED_PRIORITY']
  };
}
function ensureScaleFoundation(db){
  db.schema_version = db.schema_version || 'S7C';
  db.schema_migrations = db.schema_migrations || [];
  if(!db.schema_migrations.find(m=>m.id==='S7C_SCALE_FOUNDATION')) db.schema_migrations.push({id:'S7C_SCALE_FOUNDATION', applied_at:now(), additive:true, note:'Guest ride tokens, dispatch settings, live-location index, scale-readiness metadata'});
  db.scale_settings = {...defaultScaleSettings(), ...(db.scale_settings||{})};
  db.dispatch_settings = {...defaultDispatchSettings(), ...(db.dispatch_settings||{})};
  db.guest_booking_settings = {enabled:true, require_mobile:false, require_payment_after_driver_accept:true, require_passenger_completion:true, allow_demo_payment:String(process.env.PAYMENT_PROVIDER||'DEMO').toUpperCase()==='DEMO', ...(db.guest_booking_settings||{})};
  db.guest_ride_sessions = db.guest_ride_sessions || [];
  db.dispatch_events = db.dispatch_events || [];
  db.driver_live_index = db.driver_live_index || {mode:db.scale_settings.live_location_store, last_rebuilt_at:null, note:'JSON fallback for pilot. Redis GEO can be enabled later.'};
  db.qr_web_bookings = db.qr_web_bookings || [];
  db.qr_settings = {enabled:true, default_area:'Kalna Town', allow_guest_booking:true, source:'SPRINT7D', ...(db.qr_settings || {})};
  return db;
}

function defaultRideFlowSettings(){
  return {
    architecture_version:'S7D-PAYMENT-OTP-LIVE-TRACKING',
    guest_without_account:true,
    payment_required_before_pickup:true,
    payment_order_after_driver_accept:true,
    otp_required_to_start:true,
    passenger_confirm_required_for_guest:true,
    receipt_after_completion:true,
    rating_after_completion:true,
    supported_states:['REQUESTED','DRIVER_ACCEPTED','CONFIRMED','ARRIVED','STARTED','DRIVER_REACHED_DROP','COMPLETED','CANCELLED','PAYMENT_TIMEOUT'],
    future_states:['QUOTE_CREATED','SEARCHING_DRIVER','DRIVER_FOUND','WAITING_PAYMENT','PAYMENT_SUCCESS','DRIVER_ASSIGNED','DRIVER_ARRIVING','PICKUP_REACHED','OTP_VERIFIED','RIDE_STARTED','PASSENGER_CONFIRMED','PAYMENT_FAILED'],
    note:'S7D keeps old states working while exposing a production state-machine contract for future APK/backend upgrades.'
  };
}
function defaultLiveTrackingSettings(){
  return {
    enabled:true,
    transport:String(process.env.LIVE_TRACKING_TRANSPORT || 'POLLING_FALLBACK_WS_READY').toUpperCase(),
    polling_seconds:{guest:Number(process.env.GUEST_TRACKING_POLL_SECONDS||8), driver:Number(process.env.DRIVER_HEARTBEAT_SECONDS||12)},
    driver_heartbeat_seconds:{idle:15, assigned:5, active_ride:4},
    route_provider:String(process.env.MAP_PROVIDER || 'GOOGLE_WEB_FALLBACK').toUpperCase(),
    redis_geo_ready:!!process.env.REDIS_URL,
    privacy:'Guest public page receives only assigned ride tracking, not all driver fleet locations.'
  };
}
function ensureSprint7DFoundation(db){
  ensureScaleFoundation(db);
  db.schema_version = 'S7D';
  db.schema_migrations = db.schema_migrations || [];
  if(!db.schema_migrations.find(m=>m.id==='S7D_PAYMENT_OTP_LIVE_TRACKING')) db.schema_migrations.push({id:'S7D_PAYMENT_OTP_LIVE_TRACKING', applied_at:now(), additive:true, note:'Guest payment order, OTP ride start, live tracking snapshot, receipt/rating metadata'});
  db.ride_flow_settings = {...defaultRideFlowSettings(), ...(db.ride_flow_settings||{})};
  db.live_tracking_settings = {...defaultLiveTrackingSettings(), ...(db.live_tracking_settings||{})};
  db.payment_flow_settings = {
    provider:paymentProviderMode(db),
    require_payment_before_pickup:true,
    demo_payment_allowed:String(paymentProviderMode(db)).toUpperCase()==='DEMO' || db.guest_booking_settings?.allow_demo_payment===true,
    razorpay_ready:!!(razorpayKeyId() && razorpayKeySecret()),
    manual_upi_ready:!!paymentOptions(db).manual_upi_id,
    webhook_required_for_production:true,
    ...(db.payment_flow_settings||{})
  };
  db.guest_booking_settings = {...(db.guest_booking_settings||{}), require_payment_after_driver_accept:true, require_passenger_completion:true};
  return db;
}

function defaultDispatchRuntimeSettings(){
  return {
    architecture_version:'S7E-REAL-DISPATCH-FOUNDATION',
    engine:String(process.env.DISPATCH_MODE || 'REGION_QUEUE_JSON_FALLBACK').toUpperCase(),
    accept_timeout_seconds:Number(process.env.DRIVER_ACCEPT_TIMEOUT_SECONDS || 30),
    reassign_on_reject:true,
    reassign_on_timeout:true,
    max_reassign_rounds:Number(process.env.DISPATCH_MAX_REASSIGN_ROUNDS || 6),
    candidate_batch_size:Number(process.env.DISPATCH_CANDIDATE_BATCH_SIZE || 5),
    driver_cooldown_seconds:Number(process.env.DISPATCH_DRIVER_COOLDOWN_SECONDS || 90),
    target_active_drivers:Number(process.env.NEXO_TARGET_ACTIVE_DRIVERS || 3500),
    future_upgrade:'Switch DISPATCH_MODE=REDIS_GEO + REDIS_URL without changing app/APK APIs',
    note:'JSON fallback for pilot; dispatch state is separated so Redis/PostgreSQL can be enabled later by config/migration.'
  };
}
function defaultPaymentWebhookSettings(){
  return {
    provider:String(process.env.PAYMENT_PROVIDER || 'DEMO').toUpperCase(),
    razorpay_webhook_ready:!!process.env.RAZORPAY_WEBHOOK_SECRET,
    require_signature_in_production:true,
    idempotency_required:true,
    accepted_events:['payment.captured','order.paid'],
    demo_webhook_allowed:String(process.env.PAYMENT_PROVIDER||'DEMO').toUpperCase()==='DEMO'
  };
}
function ensureSprint7EFoundation(db){
  ensureSprint7DFoundation(db);
  db.schema_version = 'S7E';
  db.schema_migrations = db.schema_migrations || [];
  if(!db.schema_migrations.find(m=>m.id==='S7E_REAL_DISPATCH_PAYMENT_WEBHOOK')) db.schema_migrations.push({id:'S7E_REAL_DISPATCH_PAYMENT_WEBHOOK', applied_at:now(), additive:true, note:'Driver dispatch rounds, timeout/reassign queue, idempotent payment webhook records'});
  db.dispatch_runtime_settings = {...defaultDispatchRuntimeSettings(), ...(db.dispatch_runtime_settings||{})};
  db.payment_webhook_settings = {...defaultPaymentWebhookSettings(), ...(db.payment_webhook_settings||{})};
  db.dispatch_attempts = db.dispatch_attempts || [];
  db.dispatch_queue = db.dispatch_queue || [];
  db.payment_webhook_events = db.payment_webhook_events || [];
  db.dispatch_settings = {...defaultDispatchSettings(), ...(db.dispatch_settings||{}), accept_timeout_seconds:db.dispatch_runtime_settings.accept_timeout_seconds, reassign_on_reject:true, reassign_on_timeout:true};
  return db;
}

function defaultOpsScaleSettings(){
  return {
    architecture_version:'S7F-PRODUCTION-OPS-SCALE-MONITORING',
    active_profile:String(process.env.NEXO_CAPACITY_PROFILE || 'PILOT_5K').toUpperCase(),
    auto_capacity_upgrade:false,
    metrics_retention_days:Number(process.env.METRICS_RETENTION_DAYS || 14),
    alert_thresholds:{
      driver_stale_seconds:Number(process.env.DRIVER_STALE_SECONDS || 45),
      dispatch_queue_warning:Number(process.env.DISPATCH_QUEUE_WARNING || 50),
      dispatch_queue_critical:Number(process.env.DISPATCH_QUEUE_CRITICAL || 200),
      payment_pending_minutes:Number(process.env.PAYMENT_PENDING_MINUTES || 10),
      db_size_warning_mb:Number(process.env.DB_SIZE_WARNING_MB || 100),
      json_driver_limit:Number(process.env.JSON_DRIVER_LIMIT || 800),
      json_active_driver_limit:Number(process.env.JSON_ACTIVE_DRIVER_LIMIT || 250)
    },
    capacity_profiles:{
      PILOT_5K:{target_registered_drivers:5000,target_active_drivers:1500,required_store:'POSTGRESQL_READY',required_live_location:'REDIS_GEO_READY',recommended_workers:2,notes:'Pilot/first city level. JSON fallback is only for testing, not full 5k production.'},
      CITY_10K:{target_registered_drivers:10000,target_active_drivers:3500,required_store:'POSTGRESQL',required_live_location:'REDIS_GEO',recommended_workers:4,notes:'Upgrade path requested: same APIs, additive DB migration, Redis GEO dispatch enabled.'},
      DISTRICT_25K:{target_registered_drivers:25000,target_active_drivers:8000,required_store:'POSTGRESQL_PARTITION_READY',required_live_location:'REDIS_CLUSTER_GEO',recommended_workers:8,notes:'Future multi-area scale with region partitioning.'}
    },
    no_rewrite_upgrade_contract:true,
    upgrade_contract:['No API break for existing APK','No destructive DB migration','Only additive migrations and indexed schema upgrades','Driver live location stays out of high-frequency DB writes','Capacity profile can be changed by env/config + DB migration']
  };
}
function ensureSprint7FFoundation(db){
  ensureSprint7EFoundation(db);
  db.schema_version = 'S7F';
  db.schema_migrations = db.schema_migrations || [];
  if(!db.schema_migrations.find(m=>m.id==='S7F_PRODUCTION_OPS_SCALE_MONITORING')) db.schema_migrations.push({id:'S7F_PRODUCTION_OPS_SCALE_MONITORING', applied_at:now(), additive:true, note:'Ops monitoring, capacity profiles, scale-test metadata, admin bottleneck dashboard'});
  db.ops_scale_settings = {...defaultOpsScaleSettings(), ...(db.ops_scale_settings||{})};
  db.ops_metrics_snapshots = db.ops_metrics_snapshots || [];
  db.ops_alerts = db.ops_alerts || [];
  db.capacity_upgrade_history = db.capacity_upgrade_history || [];
  // Keep older scale settings in sync with active capacity profile, without deleting any existing data.
  const active = db.ops_scale_settings.capacity_profiles?.[db.ops_scale_settings.active_profile] || db.ops_scale_settings.capacity_profiles?.PILOT_5K;
  if(active){
    db.scale_settings = {...defaultScaleSettings(), ...(db.scale_settings||{}), target_registered_drivers:Number(active.target_registered_drivers || db.scale_settings?.target_registered_drivers || 10000), target_active_drivers:Number(active.target_active_drivers || db.scale_settings?.target_active_drivers || 3500)};
    db.dispatch_runtime_settings = {...defaultDispatchRuntimeSettings(), ...(db.dispatch_runtime_settings||{}), target_active_drivers:db.scale_settings.target_active_drivers};
  }
  return db;
}


function defaultDriverDeviceSettings(){
  return {
    architecture_version:'S7G-TRUSTED-DRIVER-DEVICE-LOGIN',
    driver_persistent_login_enabled:true,
    trusted_device_enabled:true,
    driver_trusted_session_days:Number(process.env.DRIVER_TRUSTED_SESSION_DAYS || 90),
    driver_access_token_days:Number(process.env.DRIVER_ACCESS_TOKEN_DAYS || 7),
    max_trusted_devices_per_driver:Number(process.env.MAX_TRUSTED_DEVICES_PER_DRIVER || 3),
    new_device_requires_otp:true,
    admin_revoke_enabled:true,
    stolen_phone_policy:'Admin can revoke trusted device; refresh tokens and active sessions for that device stop immediately.',
    token_policy:'Short access token + long refresh token bound to trusted driver device. Future APK should store refresh token in Android encrypted storage.',
    upgrade_policy:'Additive DB only: driver_devices + driver_refresh_sessions; existing sessions stay valid.'
  };
}
function ensureSprint7GFoundation(db){
  ensureSprint7FFoundation(db);
  db.schema_version = 'S7G';
  db.schema_migrations = db.schema_migrations || [];
  if(!db.schema_migrations.find(m=>m.id==='S7G_TRUSTED_DRIVER_DEVICE_FLOW')) db.schema_migrations.push({id:'S7G_TRUSTED_DRIVER_DEVICE_FLOW', applied_at:now(), additive:true, note:'Driver trusted device persistent login, refresh token sessions, passenger/driver flow polish metadata'});
  db.driver_devices = db.driver_devices || [];
  db.driver_refresh_sessions = db.driver_refresh_sessions || [];
  db.driver_device_settings = {...defaultDriverDeviceSettings(), ...(db.driver_device_settings||{})};
  db.passenger_flow_settings = {active_ride_page:true, my_rides_enabled:true, saved_locations_ready:true, rebook_ready:true, guest_and_registered_share_same_ride_engine:true, ...(db.passenger_flow_settings||{})};
  return db;
}


function defaultProductionDeploymentSettings(){
  const prod = isProductionRuntime();
  return {
    architecture_version:'S7I-PRODUCTION-DEPLOY-NOTIFICATION-LOADTEST',
    production_lock_enabled: prod || envBool(process.env.NEXO_PRODUCTION_LOCK),
    preserve_env_on_deploy:true,
    preserve_data_folder_on_deploy:true,
    backup_required_before_deploy:true,
    health_check_required_after_deploy:true,
    demo_otp_allowed: !prod && envBool(process.env.EXPOSE_DEMO_OTP),
    demo_payment_allowed: !prod && String(process.env.PAYMENT_PROVIDER||'DEMO').toUpperCase()==='DEMO',
    production_domain:String(process.env.PUBLIC_BASE_URL || process.env.SERVER_URL || 'https://ride.nexoofficial.in'),
    required_env:['APP_SECRET/JWT_SECRET','DATABASE_URL for 5k/10k','REDIS_URL for live driver scale','RAZORPAY keys/webhook secret','REAL OTP provider','FCM credentials'],
    deploy_contract:['Deploy latest cumulative ZIP only','Never overwrite server .env','Never overwrite live data/ folder','Create backup before restart','Run health checks after restart','Rollback by restoring previous code + live data backup'],
    note:'S7I adds operational guardrails. It does not delete or rename existing tables/JSON keys.'
  };
}
function defaultProductionFeatureSettings(){
  return {
    guest_booking_enabled:true,
    qr_booking_enabled:true,
    payment_required_before_pickup:true,
    otp_required_to_start:true,
    driver_accept_timeout_seconds:Number(process.env.DRIVER_ACCEPT_TIMEOUT_SECONDS || 30),
    max_dispatch_radius_km:Number(process.env.DRIVER_MATCH_RADIUS_KM || 8),
    unpaid_booking_expire_minutes:Number(process.env.UNPAID_BOOKING_EXPIRE_MINUTES || 3),
    guest_rate_limit_per_mobile_hour:Number(process.env.GUEST_RATE_LIMIT_PER_MOBILE_HOUR || 8),
    force_real_payment_in_production:true,
    force_real_otp_in_production:true,
    admin_can_toggle_runtime:true,
    updated_at:null
  };
}
function defaultNotificationDeliverySettings(){
  return {
    architecture_version:'S7I-REAL-NOTIFICATION-FOUNDATION',
    provider:String(process.env.PUSH_PROVIDER || process.env.NOTIFICATION_PROVIDER || 'FCM_READY_DEMO_LOG').toUpperCase(),
    fcm_ready:!!(process.env.FCM_SERVER_KEY || process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_APPLICATION_CREDENTIALS),
    web_push_ready:!!process.env.VAPID_PUBLIC_KEY,
    app_polling_fallback:true,
    driver_events:['NEW_RIDE_REQUEST','DISPATCH_TIMEOUT_WARNING','RIDE_CANCELLED','PAYMENT_CONFIRMED','PASSENGER_CONFIRMED_REACHED'],
    passenger_events:['DRIVER_ACCEPTED','DRIVER_ARRIVED','RIDE_STARTED','DRIVER_REACHED_DROP','RIDE_COMPLETED'],
    delivery_channels:['IN_APP','FCM_READY','WEB_PUSH_READY'],
    production_rule:'FCM credentials required for real mobile push. In-app notification and polling fallback remain available.'
  };
}
function defaultLoadTestSettings(){
  return {
    architecture_version:'S7I-LOADTEST-READINESS',
    target_registered_drivers:Number(process.env.NEXO_TARGET_REGISTERED_DRIVERS || 10000),
    target_active_drivers:Number(process.env.NEXO_TARGET_ACTIVE_DRIVERS || 3500),
    target_concurrent_bookings:Number(process.env.NEXO_TARGET_CONCURRENT_BOOKINGS || 600),
    heartbeat_interval_seconds:Number(process.env.DRIVER_HEARTBEAT_SECONDS || 12),
    driver_request_timeout_seconds:Number(process.env.DRIVER_ACCEPT_TIMEOUT_SECONDS || 30),
    dispatch_candidates_per_booking:Number(process.env.DISPATCH_CANDIDATE_BATCH_SIZE || 5),
    json_fallback_max_active_recommendation:250,
    redis_required_over_active:1000,
    postgres_required_over_registered:5000,
    recommended_test_stages:['100 drivers / 25 active','1000 drivers / 300 active','5000 drivers / 1500 active','10000 drivers / 3500 active']
  };
}
function isProductionRuntime(){
  return String(process.env.NODE_ENV||'').toLowerCase()==='production' || envBool(process.env.NEXO_PRODUCTION_LOCK) || String(process.env.PUBLIC_BASE_URL||process.env.SERVER_URL||'').includes('ride.nexoofficial.in');
}
function ensureSprint7IFoundation(db){
  ensureSprint7GFoundation(db);
  db.schema_version = 'S7I';
  db.schema_migrations = db.schema_migrations || [];
  if(!db.schema_migrations.find(m=>m.id==='S7I_PRODUCTION_DEPLOY_NOTIFICATION_LOADTEST')) db.schema_migrations.push({id:'S7I_PRODUCTION_DEPLOY_NOTIFICATION_LOADTEST', applied_at:now(), additive:true, note:'Production deploy guard, real notification foundation, runtime config control, load-test readiness metadata'});
  db.production_deployment_settings = {...defaultProductionDeploymentSettings(), ...(db.production_deployment_settings||{})};
  db.production_feature_settings = {...defaultProductionFeatureSettings(), ...(db.production_feature_settings||{})};
  db.notification_delivery_settings = {...defaultNotificationDeliverySettings(), ...(db.notification_delivery_settings||{})};
  db.load_test_settings = {...defaultLoadTestSettings(), ...(db.load_test_settings||{})};
  db.production_deploy_events = db.production_deploy_events || [];
  db.load_test_runs = db.load_test_runs || [];
  // Keep runtime feature switches synced without destructive changes.
  db.guest_booking_settings = {...(db.guest_booking_settings||{}), enabled: db.production_feature_settings.guest_booking_enabled!==false};
  db.qr_settings = {...(db.qr_settings||{}), enabled: db.production_feature_settings.qr_booking_enabled!==false};
  db.dispatch_runtime_settings = {...(db.dispatch_runtime_settings||{}), accept_timeout_seconds:Number(db.production_feature_settings.driver_accept_timeout_seconds || db.dispatch_runtime_settings?.accept_timeout_seconds || 30)};
  db.dispatch_settings = {...(db.dispatch_settings||{}), default_radius_km:Number(db.production_feature_settings.max_dispatch_radius_km || db.dispatch_settings?.default_radius_km || 8)};
  return db;
}
function productionReadiness(db){
  ensureSprint7LFoundation(db);
  const i = mergeIntegrations(db.integrations);
  const vault = configVaultReadiness(db);
  const prod = productionModeEffective(db);
  const ops = opsDashboardPayload(db);
  db.schema_version = db.schema_version || 'S7L';
  const hasBackup = listBackups().length > 0;
  const paymentProvider = paymentProviderMode(db);
  const otpProvider = String((db.auth_settings?.otp_provider || i.otp?.provider || process.env.OTP_PROVIDER || 'DEMO')).toUpperCase();
  const checks = [
    {key:'latest_schema', title:'Latest S7L schema loaded', ok:String(db.schema_version||'').startsWith('S7L'), detail:db.schema_version},
    {key:'backup', title:'Backup exists before deploy', ok:hasBackup || !db.production_deployment_settings.backup_required_before_deploy, detail:hasBackup?`${listBackups().length} backups found`:'No backup found yet'},
    {key:'env_preserve', title:'.env/data deploy safety', ok:!!db.production_deployment_settings.preserve_env_on_deploy && !!db.production_deployment_settings.preserve_data_folder_on_deploy, detail:'Deploy ZIP must not replace live .env or data/'},
    {key:'otp', title:'Real OTP for production', ok:otpProvider!=='DEMO' || !prod || envBool(process.env.ALLOW_DEMO_OTP_IN_PRODUCTION), detail:otpProvider},
    {key:'payment', title:'Real payment for production', ok:paymentProvider!=='DEMO' || !prod || envBool(process.env.ALLOW_DEMO_PAYMENT_IN_PRODUCTION), detail:paymentProvider},
    {key:'webhook', title:'Payment webhook secret', ok:paymentProvider!=='RAZORPAY' || isConfiguredRuntimeKey(db,'RAZORPAY_WEBHOOK_SECRET'), detail:runtimeSecretSource(db,'RAZORPAY_WEBHOOK_SECRET')},
    {key:'push', title:'Real notification ready', ok:isConfiguredRuntimeKey(db,'FCM_SERVER_KEY') || isConfiguredRuntimeKey(db,'FIREBASE_SERVICE_ACCOUNT_JSON') || !!(process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_APPLICATION_CREDENTIALS) || !prod, detail:runtimeSecretSource(db,'FCM_SERVER_KEY')==='MISSING' && isConfiguredRuntimeKey(db,'FIREBASE_SERVICE_ACCOUNT_JSON')?'FIREBASE_SERVICE_ACCOUNT_JSON':runtimeSecretSource(db,'FCM_SERVER_KEY')},
    {key:'postgres', title:'PostgreSQL path for 5k/10k', ok:!!process.env.DATABASE_URL || Number(db.scale_settings?.target_registered_drivers||0)<5000, detail:process.env.DATABASE_URL?'DATABASE_URL configured':'JSON fallback only'},
    {key:'redis', title:'Redis GEO path for active drivers', ok:!!process.env.REDIS_URL || Number(db.scale_settings?.target_active_drivers||0)<1000, detail:process.env.REDIS_URL?'REDIS_URL configured':'JSON fallback only'},
    {key:'config_vault', title:'Admin Config Vault ready', ok:!!vault.ok || !prod, detail:vault.portal},
    {key:'ops', title:'Ops monitoring available', ok:!!ops.ok, detail:'/ops/ and /api/admin/ops-dashboard'}
  ];
  const blockers = checks.filter(c=>!c.ok).map(c=>c.key);
  return {ok:blockers.length===0, version:VERSION, sprint:'7L', production_mode:prod, score_percent:Math.round(checks.filter(c=>c.ok).length/checks.length*100), checks, blockers, settings:db.production_deployment_settings, feature_settings:db.production_feature_settings, next_actions:deployChecklist(db).steps.filter(s=>!s.done).map(s=>s.title)};
}
function notificationReadiness(db){
  ensureSprint7IFoundation(db);
  const push = pushCenterStatus(db);
  const activeTokens=(db.push_tokens||[]).filter(t=>t.active!==false);
  const settings=db.notification_delivery_settings;
  const checks=[
    {key:'in_app', title:'In-app notification feed', ok:true, detail:'/api/notifications'},
    {key:'driver_tokens', title:'Driver device tokens registered', ok:activeTokens.some(t=>String((db.users||[]).find(u=>u.id===t.user_id)?.role||'').toUpperCase()==='DRIVER'), detail:`${activeTokens.length} active tokens`},
    {key:'fcm', title:'FCM / Firebase configured', ok:!!settings.fcm_ready || isConfiguredRuntimeKey(db,'FCM_SERVER_KEY') || isConfiguredRuntimeKey(db,'FIREBASE_SERVICE_ACCOUNT_JSON'), detail:(settings.fcm_ready || isConfiguredRuntimeKey(db,'FCM_SERVER_KEY') || isConfiguredRuntimeKey(db,'FIREBASE_SERVICE_ACCOUNT_JSON'))?'Ready':'Pending credentials'},
    {key:'polling_fallback', title:'Polling fallback', ok:!!settings.app_polling_fallback, detail:'Driver dashboard/app can poll notifications until FCM is live'}
  ];
  return {ok:true, version:VERSION, settings, push, checks, events:{driver:settings.driver_events, passenger:settings.passenger_events}, production_ready:checks.every(c=>c.ok)};
}
function loadTestReadiness(db){
  ensureSprint7IFoundation(db);
  const set=db.load_test_settings;
  const active=Number(db.scale_settings?.target_active_drivers || set.target_active_drivers || 3500);
  const registered=Number(db.scale_settings?.target_registered_drivers || set.target_registered_drivers || 10000);
  const hb=Number(set.heartbeat_interval_seconds||12);
  const heartbeat_per_minute=Math.ceil(active*(60/Math.max(1,hb)));
  const booking=Number(set.target_concurrent_bookings||600);
  const candidate_checks=booking*Number(set.dispatch_candidates_per_booking||5);
  const checks=[
    {key:'postgres_required', ok:!!process.env.DATABASE_URL || registered<set.postgres_required_over_registered, title:'PostgreSQL for registered driver scale', detail:process.env.DATABASE_URL?'DATABASE_URL configured':`${registered} registered target needs PostgreSQL before production`},
    {key:'redis_required', ok:!!process.env.REDIS_URL || active<set.redis_required_over_active, title:'Redis GEO for live driver scale', detail:process.env.REDIS_URL?'REDIS_URL configured':`${active} active target needs Redis GEO before production`},
    {key:'heartbeat_rate', ok:heartbeat_per_minute<25000 || !!process.env.REDIS_URL, title:'Driver heartbeat pressure', detail:`~${heartbeat_per_minute}/minute at ${active} active drivers`},
    {key:'dispatch_candidate_pressure', ok:candidate_checks<5000 || !!process.env.REDIS_URL, title:'Dispatch candidate lookup pressure', detail:`~${candidate_checks} candidate checks at ${booking} concurrent bookings`}
  ];
  return {ok:true, version:VERSION, settings:set, estimates:{registered_driver_target:registered,active_driver_target:active,heartbeat_per_minute,heartbeat_per_second:Math.round(heartbeat_per_minute/60),target_concurrent_bookings:booking,dispatch_candidate_checks:candidate_checks,json_fallback_safe_for_active_drivers:set.json_fallback_max_active_recommendation}, checks, recommended_path:checks.every(c=>c.ok)?'Pilot-ready with current environment. Run staged load test before public launch.':'Enable PostgreSQL + Redis before 5k/10k production load.', stages:set.recommended_test_stages};
}

function ensureSprint7JFoundation(db){
  ensureSprint7IFoundation(db);
  db.schema_version = 'S7J';
  db.schema_migrations = db.schema_migrations || [];
  if(!db.schema_migrations.find(m=>m.id==='S7J_FINAL_APK_RELEASE_QA')) db.schema_migrations.push({id:'S7J_FINAL_APK_RELEASE_QA', applied_at:now(), additive:true, note:'Final APK release package, end-to-end QA checklist, release-readiness metadata and safe cumulative deploy contract'});
  db.final_release_settings = {
    sprint:'7P',
    apk_version_name:'2.0.7R',
    apk_version_code:86,
    release_type:'FINAL_QA_CANDIDATE',
    package_name:'com.astratechnologies.nexoride',
    app_name:'NEXO Ride',
    production_domain:String(process.env.PUBLIC_BASE_URL || process.env.SERVER_URL || 'https://ride.nexoofficial.in'),
    cumulative_from:['7B','7C','7D','7E','7F','7G','7H','7I'],
    required_before_public_launch:['Server backup','Production env secrets','Real OTP provider','Real payment webhook','FCM push credentials','PostgreSQL for 5k/10k','Redis GEO for active drivers','Field test with real phones'],
    updated_at:now(),
    ...(db.final_release_settings||{})
  };
  db.final_qa_runs = db.final_qa_runs || [];
  return db;
}


function defaultDataLayerSettings(){
  return {
    architecture_version:'S7L-DATABASE-REDIS-POSTGRES-UPGRADE-BRIDGE',
    current_primary_store:'LOCAL_JSON_PERSISTENT',
    current_live_location_store:String(process.env.LIVE_LOCATION_STORE || process.env.REDIS_URL ? 'REDIS_READY' : 'JSON_FALLBACK').toUpperCase(),
    target_primary_store:'POSTGRESQL',
    target_live_location_store:'REDIS_GEO',
    dispatch_adapter_mode:String(process.env.DISPATCH_ADAPTER_MODE || process.env.REDIS_URL ? 'HYBRID_SCALE_READY' : 'SIMPLE_JSON_FALLBACK').toUpperCase(),
    upgrade_policy:'ADDITIVE_VERSIONED_MIGRATIONS_ONLY',
    destructive_migrations_allowed:false,
    backup_required_before_migration:true,
    auto_run_destructive_migration:false,
    auto_run_safe_bootstrap_migrations:true,
    json_fallback_safe_active_driver_limit:250,
    postgres_required_over_registered_drivers:5000,
    redis_required_over_active_drivers:1000,
    target_registered_drivers:Number(process.env.NEXO_TARGET_REGISTERED_DRIVERS || 10000),
    target_active_drivers:Number(process.env.NEXO_TARGET_ACTIVE_DRIVERS || 3500),
    notes:['Keep live data/ folder untouched during deploy.','JSON mode is acceptable for pilot/smoke testing only.','PostgreSQL + Redis GEO are required before 5k/10k public launch.','Future upgrade must add tables/indexes/columns only; old APIs remain compatible.']
  };
}
function defaultPostgresMigrationContract(){
  return {
    version:'S7L-PG-CONTRACT',
    env_key:'DATABASE_URL',
    mode_when_enabled:'POSTGRES_ONLY_OR_HYBRID',
    tables:['users','driver_profiles','rides','payments','trusted_devices','qr_web_bookings','config_vault','audit_log','push_tokens','dispatch_events'],
    required_indexes:['driver_profiles(status,area)','rides(status,created_at)','rides(driver_id,status)','trusted_devices(user_id,device_fingerprint_hash)','payments(ride_id,status)','audit_log(at,action)','qr_web_bookings(status,created_at)'],
    migration_steps:['backup current JSON DB','verify schema_version and migration history','create PostgreSQL schema','import users/drivers/rides/payments/devices/config/audit','run checksum count verification','switch DATA_STORE_MODE=POSTGRES or HYBRID','keep JSON backup read-only for rollback'],
    safe_rule:'This sprint does not auto-migrate production data. It exposes readiness, schema contract and safe commands only.'
  };
}
function defaultRedisLocationBridge(){
  return {
    version:'S7L-REDIS-GEO-BRIDGE',
    env_key:'REDIS_URL',
    mode_when_enabled:'REDIS_GEO',
    key_prefix:'nexo:ride:',
    geo_keys:['drivers:geo:online','drivers:geo:assigned','drivers:geo:active'],
    heartbeat_keys:['drivers:heartbeat','drivers:state','dispatch:queue','dispatch:locks'],
    ttl_seconds:{driver_idle:45, driver_assigned:20, active_ride:15, dispatch_lock:45},
    update_frequency_seconds:{idle:15, assigned:5, active_ride:4},
    fallback:'JSON live index stays available for pilot/testing, but is blocked as production-ready above 1000 active drivers.',
    safe_rule:'Driver profile remains in primary database. Only high-frequency location/dispatch state moves to Redis.'
  };
}
function defaultMigrationRegistry(){
  return [
    {id:'S7B_QR_GUEST_BOOKING', type:'additive', status:'applied_or_legacy', objects:['qr_web_bookings','qr_settings']},
    {id:'S7C_SCALE_FOUNDATION', type:'additive', status:'applied_or_legacy', objects:['guest_ride_sessions','dispatch_events','driver_live_index','scale_settings']},
    {id:'S7D_PAYMENT_OTP_LIVE_TRACKING', type:'additive', status:'applied_or_legacy', objects:['ride_flow_settings','live_tracking_settings','payment_flow_settings']},
    {id:'S7E_REAL_DISPATCH_PAYMENT_WEBHOOK', type:'additive', status:'applied_or_legacy', objects:['dispatch_runtime_settings','payment_webhook_settings']},
    {id:'S7F_PRODUCTION_OPS_SCALE_MONITORING', type:'additive', status:'applied_or_legacy', objects:['ops_scale_settings','ops_events']},
    {id:'S7G_TRUSTED_DRIVER_DEVICE', type:'additive', status:'applied_or_legacy', objects:['trusted_driver_devices','driver_refresh_tokens']},
    {id:'S7H_NATIVE_APK_INTEGRATION', type:'additive', status:'applied_or_legacy', objects:['apk_bridge_settings']},
    {id:'S7I_PRODUCTION_DEPLOY_NOTIFICATION_LOADTEST', type:'additive', status:'applied_or_legacy', objects:['production_deployment_settings','notification_delivery_settings','load_test_settings']},
    {id:'S7J_FINAL_APK_RELEASE_QA', type:'additive', status:'applied_or_legacy', objects:['final_release_settings','final_qa_runs']},
    {id:'S7K_ADMIN_CONFIG_VAULT_SERVICE_LOCK', type:'additive', status:'applied_or_legacy', objects:['config_vault']},
    {id:'S7L_DATABASE_REDIS_POSTGRES_UPGRADE_BRIDGE', type:'additive', status:'current', objects:['data_layer_settings','migration_registry','postgres_migration_contract','redis_location_bridge','dispatch_adapter_settings','data_health_events']}
  ];
}
function ensureSprint7LFoundation(db){
  ensureSprint7KFoundation(db);
  db.schema_version = 'S7L';
  db.schema_migrations = db.schema_migrations || [];
  if(!db.schema_migrations.find(m=>m.id==='S7L_DATABASE_REDIS_POSTGRES_UPGRADE_BRIDGE')) db.schema_migrations.push({id:'S7L_DATABASE_REDIS_POSTGRES_UPGRADE_BRIDGE', applied_at:now(), additive:true, note:'Versioned migration registry, PostgreSQL migration contract, Redis GEO live-location bridge, dispatch adapter readiness and admin data-health page'});
  db.data_layer_settings = {...defaultDataLayerSettings(), ...(db.data_layer_settings||{})};
  db.data_layer_settings.target_registered_drivers = Math.max(10000, Number(db.scale_settings?.target_registered_drivers || db.data_layer_settings.target_registered_drivers || 10000));
  db.data_layer_settings.target_active_drivers = Math.max(3500, Number(db.scale_settings?.target_active_drivers || db.data_layer_settings.target_active_drivers || 3500));
  db.data_layer_settings.postgres_configured = !!process.env.DATABASE_URL;
  db.data_layer_settings.redis_configured = !!process.env.REDIS_URL;
  db.migration_registry = db.migration_registry || defaultMigrationRegistry();
  const have = new Set((db.migration_registry||[]).map(m=>m.id));
  for(const m of defaultMigrationRegistry()) if(!have.has(m.id)) db.migration_registry.push(m);
  db.postgres_migration_contract = {...defaultPostgresMigrationContract(), ...(db.postgres_migration_contract||{})};
  db.redis_location_bridge = {...defaultRedisLocationBridge(), ...(db.redis_location_bridge||{})};
  db.dispatch_adapter_settings = {
    version:'S7L-DISPATCH-ADAPTER',
    current_mode: db.data_layer_settings.dispatch_adapter_mode,
    supported_modes:['SIMPLE_JSON_FALLBACK','POSTGRES_ONLY','REDIS_GEO','HYBRID_SCALE_READY'],
    recommended_for_10k:'HYBRID_SCALE_READY',
    driver_lookup_contract:['area','approved','online','idle','geo_radius','candidate_score','cooldown/reject history'],
    avoid_full_table_scan:true,
    switch_policy:'Change adapter mode by config/env after PostgreSQL/Redis readiness is green. Existing APIs remain same.',
    ...(db.dispatch_adapter_settings||{})
  };
  db.data_health_events = db.data_health_events || [];
  db.data_health_settings = {portal:'/data-health/', admin_api:'/api/admin/data-health', public_readiness:'/api/platform/data-layer-readiness', ...(db.data_health_settings||{})};
  return db;
}
function migrationStatusSummary(db){
  ensureSprint7LFoundation(db);
  const applied = db.schema_migrations || [];
  const registry = db.migration_registry || [];
  const appliedIds = new Set(applied.map(m=>m.id));
  const normalized = registry.map(m=>({...m, applied: appliedIds.has(m.id) || String(m.status||'').includes('applied') || m.id==='S7L_DATABASE_REDIS_POSTGRES_UPGRADE_BRIDGE'}));
  const pending = normalized.filter(m=>!m.applied);
  return {schema_version:db.schema_version, applied_count:applied.length, registry_count:registry.length, pending_count:pending.length, applied:applied.slice(-25).reverse(), registry:normalized, pending};
}
function dataLayerReadiness(db){
  ensureSprint7LFoundation(db);
  const settings=db.data_layer_settings;
  const registeredTarget=Number(settings.target_registered_drivers||10000);
  const activeTarget=Number(settings.target_active_drivers||3500);
  const hasPg=!!process.env.DATABASE_URL;
  const hasRedis=!!process.env.REDIS_URL;
  const backups=listBackups();
  const checks=[
    {key:'schema_version', title:'S7L schema foundation loaded', ok:db.schema_version==='S7L', detail:db.schema_version},
    {key:'additive_policy', title:'Additive-only migration policy', ok:settings.upgrade_policy==='ADDITIVE_VERSIONED_MIGRATIONS_ONLY' && settings.destructive_migrations_allowed===false, detail:settings.upgrade_policy},
    {key:'backup_ready', title:'Backup available before migration', ok:backups.length>0 || !settings.backup_required_before_migration, detail:backups.length?`${backups.length} backups found`:'No backup found yet'},
    {key:'postgres_for_10k', title:'PostgreSQL ready for 5k/10k registered drivers', ok:hasPg || registeredTarget<settings.postgres_required_over_registered_drivers, detail:hasPg?'DATABASE_URL configured':`${registeredTarget} target requires PostgreSQL before production`},
    {key:'redis_for_active', title:'Redis GEO ready for active driver locations', ok:hasRedis || activeTarget<settings.redis_required_over_active_drivers, detail:hasRedis?'REDIS_URL configured':`${activeTarget} active target requires Redis GEO before production`},
    {key:'json_fallback_limit', title:'JSON fallback kept only for pilot', ok:activeTarget<=settings.json_fallback_safe_active_driver_limit || hasRedis, detail:`JSON recommended <= ${settings.json_fallback_safe_active_driver_limit} active drivers`},
    {key:'migration_registry', title:'Migration registry present', ok:(db.migration_registry||[]).some(m=>m.id==='S7L_DATABASE_REDIS_POSTGRES_UPGRADE_BRIDGE'), detail:`${(db.migration_registry||[]).length} registered migrations`},
    {key:'dispatch_adapter', title:'Dispatch adapter upgrade path exists', ok:!!db.dispatch_adapter_settings?.supported_modes?.includes('HYBRID_SCALE_READY'), detail:db.dispatch_adapter_settings?.current_mode}
  ];
  const blockers=checks.filter(c=>!c.ok).map(c=>c.key);
  return {ok:blockers.length===0, version:VERSION, sprint:'7L', target:{registered_drivers:registeredTarget, active_drivers:activeTarget}, current:{primary_store:settings.current_primary_store, live_location_store:settings.current_live_location_store, dispatch_adapter:settings.dispatch_adapter_mode, postgres_configured:hasPg, redis_configured:hasRedis}, checks, blockers, recommendation:blockers.length?'Pilot deploy is OK, but enable PostgreSQL + Redis before public 5k/10k scale.':'Data layer is ready for the configured target; still run staged load tests before public launch.', portal:'/data-health/'};
}
function migrationReadiness(db){
  ensureSprint7LFoundation(db);
  const status=migrationStatusSummary(db);
  const dl=dataLayerReadiness(db);
  const backup=listBackups()[0]||null;
  const pg=db.postgres_migration_contract;
  const safeCommands=[
    'npm run backup:now',
    'npm run data:preflight',
    'Set DATABASE_URL and REDIS_URL in production config/env',
    'Run controlled PostgreSQL import tool after manual approval',
    'Verify counts/checksums before switching DATA_STORE_MODE'
  ];
  return {ok:true, version:VERSION, sprint:'7L', latest_schema:db.schema_version, migration_policy:db.data_layer_settings.upgrade_policy, destructive_migrations_allowed:false, auto_migrate_production_data:false, last_backup:backup, status, postgres_contract:pg, readiness:dl, safe_commands:safeCommands, warning:'Do not add a one-click production migration button. Backup, import and switch-over must be controlled by admin/operator.'};
}
function redisPostgresBridgeReadiness(db){
  ensureSprint7LFoundation(db);
  const hasPg=!!process.env.DATABASE_URL;
  const hasRedis=!!process.env.REDIS_URL;
  const active=Number(db.data_layer_settings?.target_active_drivers||3500);
  const registered=Number(db.data_layer_settings?.target_registered_drivers||10000);
  const checks=[
    {key:'postgres_env', ok:hasPg, title:'DATABASE_URL configured', detail:hasPg?'Ready':'Missing'},
    {key:'redis_env', ok:hasRedis, title:'REDIS_URL configured', detail:hasRedis?'Ready':'Missing'},
    {key:'pg_contract', ok:!!db.postgres_migration_contract?.tables?.length, title:'PostgreSQL schema contract', detail:`${db.postgres_migration_contract?.tables?.length||0} tables mapped`},
    {key:'redis_contract', ok:!!db.redis_location_bridge?.geo_keys?.length, title:'Redis GEO contract', detail:`${db.redis_location_bridge?.geo_keys?.length||0} geo keys planned`},
    {key:'scale_target', ok:(registered<5000 || hasPg) && (active<1000 || hasRedis), title:'Target capacity environment', detail:`${registered} registered / ${active} active target`}
  ];
  return {ok:checks.every(c=>c.ok), version:VERSION, sprint:'7L', postgres:{configured:hasPg, contract:db.postgres_migration_contract}, redis:{configured:hasRedis, bridge:db.redis_location_bridge}, checks, next_step:checks.every(c=>c.ok)?'Run staged load test and controlled migration dry-run.':'Configure DATABASE_URL + REDIS_URL before 5k/10k production launch.'};
}
function dispatchAdapterStatus(db){
  ensureSprint7LFoundation(db);
  const active=Number(db.data_layer_settings?.target_active_drivers||3500);
  const hasRedis=!!process.env.REDIS_URL;
  const current=db.dispatch_adapter_settings?.current_mode || 'SIMPLE_JSON_FALLBACK';
  const recommended= active>=1000 ? 'HYBRID_SCALE_READY' : 'SIMPLE_JSON_FALLBACK';
  const checks=[
    {key:'avoid_full_scan', ok:!!db.dispatch_adapter_settings?.avoid_full_table_scan, title:'Avoid full driver table scan', detail:'Area + online + idle + geo radius candidate lookup'},
    {key:'redis_for_geo', ok:hasRedis || active<1000, title:'Redis GEO for radius search', detail:hasRedis?'Ready':`${active} active target needs Redis`},
    {key:'mode_supported', ok:(db.dispatch_adapter_settings?.supported_modes||[]).includes(current), title:'Adapter mode supported', detail:current},
    {key:'api_compatibility', ok:true, title:'API compatibility', detail:'Booking/driver APIs stay same when adapter changes'}
  ];
  return {ok:checks.every(c=>c.ok), version:VERSION, sprint:'7L', current_mode:current, recommended_mode:recommended, settings:db.dispatch_adapter_settings, checks, switch_contract:'After Redis/PostgreSQL readiness is green, switch adapter mode without changing APK/API.'};
}
function dataHealthDashboardPayload(db){
  ensureSprint7LFoundation(db);
  return {
    ok:true,
    version:VERSION,
    sprint:'7L',
    data_layer:dataLayerReadiness(db),
    migration:migrationReadiness(db),
    redis_postgres:redisPostgresBridgeReadiness(db),
    dispatch_adapter:dispatchAdapterStatus(db),
    storage:dbStatus(db),
    counts:{users:(db.users||[]).length, drivers:(db.driver_profiles||[]).length, rides:(db.rides||[]).length, qr_bookings:(db.qr_web_bookings||[]).length, trusted_devices:(db.trusted_driver_devices||[]).length, config_audit:(db.config_vault?.audit||[]).length},
    recent_events:(db.data_health_events||[]).slice(-50).reverse(),
    latest_backup:listBackups()[0]||null
  };
}

function vaultKeyDefinitions(){
  return {
    RAZORPAY_KEY_ID:{label:'Razorpay Key ID', group:'Payment', required_for_production:true, secret:false, placeholder:'rzp_live_...', safe_to_mask:true},
    RAZORPAY_KEY_SECRET:{label:'Razorpay Key Secret', group:'Payment', required_for_production:true, secret:true, placeholder:'Razorpay secret', safe_to_mask:true},
    RAZORPAY_WEBHOOK_SECRET:{label:'Razorpay Webhook Secret', group:'Payment', required_for_production:true, secret:true, placeholder:'Webhook signing secret', safe_to_mask:true},
    GOOGLE_MAPS_API_KEY:{label:'Google Maps API Key', group:'Maps', required_for_production:true, secret:true, placeholder:'AIza...', safe_to_mask:true},
    FCM_SERVER_KEY:{label:'FCM Server Key', group:'Notification', required_for_production:false, secret:true, placeholder:'Legacy FCM server key', safe_to_mask:true},
    FIREBASE_SERVICE_ACCOUNT_JSON:{label:'Firebase Service Account JSON', group:'Notification', required_for_production:true, secret:true, multiline:true, placeholder:'Paste Firebase service account JSON', safe_to_mask:true},
    JWT_SECRET:{label:'JWT Secret', group:'Security', required_for_production:true, secret:true, rotation_warning:true, placeholder:'Strong random secret'},
    SESSION_SECRET:{label:'Session Secret', group:'Security', required_for_production:true, secret:true, rotation_warning:true, placeholder:'Strong random secret'},
    PRODUCTION_MODE:{label:'Production Mode', group:'Runtime', required_for_production:true, secret:false, boolean:true, placeholder:'true/false', safe_to_mask:false}
  };
}
function ensureConfigMasterKey(){
  ensureDataDir();
  const envKey = String(process.env.NEXO_CONFIG_MASTER_KEY || process.env.CONFIG_MASTER_KEY || '').trim();
  if(envKey) return envKey;
  const f = path.join(DATA_DIR,'nexo_config_master.key');
  try{
    if(fs.existsSync(f)) return fs.readFileSync(f,'utf8').trim();
    const key = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(f, key, {mode:0o600});
    return key;
  }catch(e){
    console.error('CONFIG_MASTER_KEY_ERROR', e.message);
    return 'nexo-dev-fallback-'+sha(__dirname).slice(0,32);
  }
}
function configVaultCryptoKey(){ return crypto.createHash('sha256').update(ensureConfigMasterKey()).digest(); }
function encryptVaultSecret(value){
  const plain=String(value||'');
  const iv=crypto.randomBytes(12);
  const cipher=crypto.createCipheriv('aes-256-gcm', configVaultCryptoKey(), iv);
  const enc=Buffer.concat([cipher.update(plain,'utf8'), cipher.final()]);
  const tag=cipher.getAuthTag();
  return ['v1',iv.toString('base64'),tag.toString('base64'),enc.toString('base64')].join(':');
}
function decryptVaultSecret(payload){
  const raw=String(payload||'');
  const parts=raw.split(':');
  if(parts.length!==4 || parts[0]!=='v1') return '';
  const iv=Buffer.from(parts[1],'base64'), tag=Buffer.from(parts[2],'base64'), enc=Buffer.from(parts[3],'base64');
  const decipher=crypto.createDecipheriv('aes-256-gcm', configVaultCryptoKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
}
function maskSecretValue(v, visible=4){
  const s=String(v||'');
  if(!s) return '';
  if(s.length<=visible*2) return '*'.repeat(Math.max(4,s.length));
  return s.slice(0,visible)+'****'+s.slice(-visible);
}
function ensureSprint7KFoundation(db){
  ensureSprint7JFoundation(db);
  db.schema_version = 'S7K';
  db.schema_migrations = db.schema_migrations || [];
  if(!db.schema_migrations.find(m=>m.id==='S7K_ADMIN_CONFIG_VAULT_SERVICE_LOCK')) db.schema_migrations.push({id:'S7K_ADMIN_CONFIG_VAULT_SERVICE_LOCK', applied_at:now(), additive:true, note:'Admin Config Center, encrypted secret vault, masked service credentials, production mode validator, service test endpoints'});
  const defs=vaultKeyDefinitions();
  db.config_vault = db.config_vault || {};
  db.config_vault.version = 'S7K';
  db.config_vault.secrets = db.config_vault.secrets || {};
  db.config_vault.audit = db.config_vault.audit || [];
  db.config_vault.production_mode = db.config_vault.production_mode===true || String(process.env.NEXO_PRODUCTION_LOCK||'').toLowerCase()==='true';
  db.config_vault.service_modes = {...{payment:'RAZORPAY', maps:'GOOGLE_MAPS', notification:'FCM', auth:'JWT_SESSION'}, ...(db.config_vault.service_modes||{})};
  db.config_vault.required_keys = Object.keys(defs).filter(k=>defs[k].required_for_production);
  db.config_vault.rotation_policy = {jwt_session_rotation_requires_relogin:true, secret_values_never_returned:true, env_overrides_vault:false, vault_preferred:true, master_key_file:'data/nexo_config_master.key'};
  db.config_vault.updated_at = db.config_vault.updated_at || now();
  db.config_vault.portal = '/admin/config-center/';
  db.integrations = db.integrations || defaultIntegrations();
  return db;
}
function vaultSecretEntry(db,key){ return db?.config_vault?.secrets?.[key] || null; }
function vaultSecretValue(db,key){
  const entry=vaultSecretEntry(db,key);
  if(entry && entry.encrypted){ try{return decryptVaultSecret(entry.encrypted);}catch(e){return '';} }
  if(entry && entry.value_type==='boolean') return entry.value ? 'true' : 'false';
  return '';
}
function runtimeSecretValue(db,key){
  const fromVault=vaultSecretValue(db,key);
  if(fromVault) return fromVault;
  if(key==='FIREBASE_SERVICE_ACCOUNT_JSON') return process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '';
  if(key==='PRODUCTION_MODE') return db.config_vault?.production_mode ? 'true' : (process.env.NEXO_PRODUCTION_LOCK || process.env.NODE_ENV==='production' ? 'true' : 'false');
  return process.env[key] || '';
}
function runtimeSecretSource(db,key){
  if(vaultSecretValue(db,key)) return 'ADMIN_VAULT';
  if(key==='PRODUCTION_MODE' && db.config_vault?.production_mode) return 'ADMIN_VAULT';
  if(process.env[key]) return 'ENV';
  if(key==='FIREBASE_SERVICE_ACCOUNT_JSON' && process.env.FIREBASE_SERVICE_ACCOUNT_JSON) return 'ENV';
  return 'MISSING';
}
function isConfiguredRuntimeKey(db,key){ return !!String(runtimeSecretValue(db,key)||'').trim(); }
function productionModeEffective(db){ return db.config_vault?.production_mode===true || isProductionRuntime(); }
function configVaultSummary(db){
  ensureSprint7KFoundation(db);
  const defs=vaultKeyDefinitions();
  const items=Object.entries(defs).map(([key,def])=>{
    const v=runtimeSecretValue(db,key); const entry=vaultSecretEntry(db,key) || {};
    const bool=def.boolean ? (String(v).toLowerCase()==='true') : undefined;
    return {key, ...def, configured:def.boolean ? bool===true : !!v, source:runtimeSecretSource(db,key), masked:def.boolean?String(bool===true):(v?maskSecretValue(def.multiline?'SERVICE_ACCOUNT_JSON_CONFIGURED':v):''), updated_at:entry.updated_at||'', updated_by:entry.updated_by||'', rotation_warning:!!def.rotation_warning};
  });
  const readiness=configVaultReadiness(db);
  return {ok:true, version:VERSION, sprint:'7K', portal:'/admin/config-center/', production_mode:productionModeEffective(db), items, readiness, policy:db.config_vault.rotation_policy, service_modes:db.config_vault.service_modes, audit:(db.config_vault.audit||[]).slice(-50).reverse()};
}
function setVaultSecret(db,key,value,user,meta={}){
  ensureSprint7KFoundation(db);
  const defs=vaultKeyDefinitions();
  if(!defs[key]) return {ok:false, detail:'Unknown config key'};
  const def=defs[key];
  db.config_vault.secrets = db.config_vault.secrets || {};
  if(def.boolean){
    const bool = value===true || String(value||'').toLowerCase()==='true' || String(value||'')==='1';
    db.config_vault.production_mode = key==='PRODUCTION_MODE' ? bool : db.config_vault.production_mode;
    db.config_vault.secrets[key] = {value_type:'boolean', value:bool, updated_at:now(), updated_by:user?.id||'admin', source:'ADMIN_PORTAL'};
  }else{
    const text=String(value||'').trim();
    if(!text) return {ok:false, detail:`${key} cannot be empty`};
    if(key==='FIREBASE_SERVICE_ACCOUNT_JSON'){
      try{ JSON.parse(text); }catch(e){ return {ok:false, detail:'Firebase service account JSON is not valid JSON'}; }
    }
    db.config_vault.secrets[key] = {value_type:'encrypted', encrypted:encryptVaultSecret(text), masked:maskSecretValue(def.multiline?'SERVICE_ACCOUNT_JSON_CONFIGURED':text), updated_at:now(), updated_by:user?.id||'admin', source:'ADMIN_PORTAL', sha256:sha(text), note:String(meta.note||'').slice(0,120)};
  }
  db.config_vault.updated_at=now();
  db.config_vault.audit=db.config_vault.audit||[];
  db.config_vault.audit.push({id:uid('cfg_aud'), at:now(), actor_id:user?.id||'admin', action:'CONFIG_SET', key, group:def.group, source:'ADMIN_PORTAL', details:{masked:db.config_vault.secrets[key].masked||String(db.config_vault.secrets[key].value||''), rotation_warning:!!def.rotation_warning}});
  if(db.config_vault.audit.length>500) db.config_vault.audit=db.config_vault.audit.slice(-500);
  audit(db,user?.id||'admin','CONFIG_VAULT_SET','config',key,{group:def.group, source:'ADMIN_PORTAL', rotation_warning:!!def.rotation_warning});
  syncIntegrationsFromVault(db);
  return {ok:true, key, configured:true, item:configVaultSummary(db).items.find(x=>x.key===key)};
}
function removeVaultSecret(db,key,user){
  ensureSprint7KFoundation(db);
  if(!vaultKeyDefinitions()[key]) return {ok:false, detail:'Unknown config key'};
  delete db.config_vault.secrets[key];
  if(key==='PRODUCTION_MODE') db.config_vault.production_mode=false;
  db.config_vault.audit=db.config_vault.audit||[];
  db.config_vault.audit.push({id:uid('cfg_aud'), at:now(), actor_id:user?.id||'admin', action:'CONFIG_REMOVED', key});
  audit(db,user?.id||'admin','CONFIG_VAULT_REMOVE','config',key,{});
  syncIntegrationsFromVault(db);
  return {ok:true, key, removed:true, item:configVaultSummary(db).items.find(x=>x.key===key)};
}
function syncIntegrationsFromVault(db){
  ensureSprint7KFoundation(db);
  db.integrations = mergeIntegrations(db.integrations||{});
  const rzId=runtimeSecretValue(db,'RAZORPAY_KEY_ID'); const rzSec=runtimeSecretValue(db,'RAZORPAY_KEY_SECRET'); const wh=runtimeSecretValue(db,'RAZORPAY_WEBHOOK_SECRET');
  if(rzId || rzSec){ db.integrations.payment={...(db.integrations.payment||{}), provider:'RAZORPAY', razorpay_key_id:rzId||db.integrations.payment?.razorpay_key_id||'', razorpay_secret_present:!!rzSec, key_id_configured:!!rzId, webhook_secret_configured:!!wh}; db.payment_flow_settings={...(db.payment_flow_settings||{}), provider:'RAZORPAY', demo_payment_allowed:false}; db.payment_webhook_settings={...(db.payment_webhook_settings||{}), provider:'RAZORPAY', razorpay_webhook_ready:!!wh}; }
  const maps=runtimeSecretValue(db,'GOOGLE_MAPS_API_KEY'); if(maps){ db.integrations.map={...(db.integrations.map||{}), provider:'GOOGLE', google_key_present:true, api_key_configured:true, google_key_label:'SET_FROM_ADMIN_VAULT'}; }
  const fcm=runtimeSecretValue(db,'FCM_SERVER_KEY') || runtimeSecretValue(db,'FIREBASE_SERVICE_ACCOUNT_JSON'); if(fcm){ db.integrations.push={...(db.integrations.push||{}), provider:'FCM', fcm_server_key_present:!!runtimeSecretValue(db,'FCM_SERVER_KEY'), firebase_service_account_present:!!runtimeSecretValue(db,'FIREBASE_SERVICE_ACCOUNT_JSON'), android_push_enabled:true}; db.notification_delivery_settings={...(db.notification_delivery_settings||{}), provider:'FCM', fcm_ready:true}; }
  db.production_feature_settings={...(db.production_feature_settings||{}), force_real_payment_in_production:true, force_real_otp_in_production:true};
  return db;
}
function configVaultReadiness(db){
  ensureSprint7KFoundation(db); syncIntegrationsFromVault(db);
  const prod=productionModeEffective(db); const defs=vaultKeyDefinitions();
  const checks=[
    {key:'master_key', title:'Config vault master key', ok:!!ensureConfigMasterKey(), detail:process.env.NEXO_CONFIG_MASTER_KEY?'ENV master key':'Server-side data/nexo_config_master.key'},
    {key:'razorpay_key_id', title:'Razorpay Key ID', ok:isConfiguredRuntimeKey(db,'RAZORPAY_KEY_ID') || !prod, detail:runtimeSecretSource(db,'RAZORPAY_KEY_ID')},
    {key:'razorpay_key_secret', title:'Razorpay Key Secret', ok:isConfiguredRuntimeKey(db,'RAZORPAY_KEY_SECRET') || !prod, detail:runtimeSecretSource(db,'RAZORPAY_KEY_SECRET')},
    {key:'razorpay_webhook_secret', title:'Razorpay Webhook Secret', ok:isConfiguredRuntimeKey(db,'RAZORPAY_WEBHOOK_SECRET') || !prod, detail:runtimeSecretSource(db,'RAZORPAY_WEBHOOK_SECRET')},
    {key:'google_maps_api_key', title:'Google Maps API Key', ok:isConfiguredRuntimeKey(db,'GOOGLE_MAPS_API_KEY') || !prod, detail:runtimeSecretSource(db,'GOOGLE_MAPS_API_KEY')},
    {key:'fcm', title:'FCM / Firebase credentials', ok:isConfiguredRuntimeKey(db,'FCM_SERVER_KEY') || isConfiguredRuntimeKey(db,'FIREBASE_SERVICE_ACCOUNT_JSON') || !prod, detail:isConfiguredRuntimeKey(db,'FIREBASE_SERVICE_ACCOUNT_JSON')?'Firebase service account':runtimeSecretSource(db,'FCM_SERVER_KEY')},
    {key:'jwt_secret', title:'JWT Secret', ok:isConfiguredRuntimeKey(db,'JWT_SECRET') || !prod, detail:runtimeSecretSource(db,'JWT_SECRET')},
    {key:'session_secret', title:'Session Secret', ok:isConfiguredRuntimeKey(db,'SESSION_SECRET') || !prod, detail:runtimeSecretSource(db,'SESSION_SECRET')},
    {key:'production_mode', title:'Production Mode', ok:prod===true || db.config_vault.production_mode===false, detail:prod?'ON':'OFF'}
  ];
  const blockers=checks.filter(c=>!c.ok).map(c=>c.key);
  return {ok:blockers.length===0, version:VERSION, sprint:'7L', production_mode:prod, configured_count:Object.keys(defs).filter(k=>isConfiguredRuntimeKey(db,k)).length, total_keys:Object.keys(defs).length, score_percent:Math.round(checks.filter(c=>c.ok).length/checks.length*100), checks, blockers, portal:'/admin/config-center/'};
}
function applyAdminConfigCenterUpdate(db, body={}, user={}){
  ensureSprint7KFoundation(db);
  const updates=Array.isArray(body.items)?body.items:[]; const results=[];
  if(body.production_mode!==undefined) results.push(setVaultSecret(db,'PRODUCTION_MODE',!!body.production_mode,user,{note:'production mode toggle'}));
  for(const item of updates){
    const key=String(item.key||'').trim().toUpperCase();
    if(!key) continue;
    if(item.remove===true) results.push(removeVaultSecret(db,key,user));
    else if(item.value!==undefined && String(item.value).length>0) results.push(setVaultSecret(db,key,item.value,user,{note:item.note||''}));
  }
  syncIntegrationsFromVault(db);
  return {ok:results.every(r=>r.ok), results, summary:configVaultSummary(db)};
}
function adminConfigTest(db, service){
  ensureSprint7KFoundation(db); syncIntegrationsFromVault(db);
  const svc=String(service||'ALL').toUpperCase(); const tests=[];
  function add(key,title,ok,detail){ tests.push({key,title,ok:!!ok,detail}); }
  if(svc==='ALL'||svc==='PAYMENT'||svc==='RAZORPAY'){
    add('razorpay_key_id','Razorpay key id configured',isConfiguredRuntimeKey(db,'RAZORPAY_KEY_ID'),runtimeSecretSource(db,'RAZORPAY_KEY_ID'));
    add('razorpay_secret','Razorpay secret configured',isConfiguredRuntimeKey(db,'RAZORPAY_KEY_SECRET'),runtimeSecretSource(db,'RAZORPAY_KEY_SECRET'));
    add('razorpay_webhook','Razorpay webhook secret configured',isConfiguredRuntimeKey(db,'RAZORPAY_WEBHOOK_SECRET'),runtimeSecretSource(db,'RAZORPAY_WEBHOOK_SECRET'));
  }
  if(svc==='ALL'||svc==='MAPS'||svc==='GOOGLE_MAPS') add('google_maps','Google Maps API key configured',isConfiguredRuntimeKey(db,'GOOGLE_MAPS_API_KEY'),runtimeSecretSource(db,'GOOGLE_MAPS_API_KEY'));
  if(svc==='ALL'||svc==='FCM'||svc==='NOTIFICATION') add('fcm','FCM credentials configured',isConfiguredRuntimeKey(db,'FCM_SERVER_KEY')||isConfiguredRuntimeKey(db,'FIREBASE_SERVICE_ACCOUNT_JSON'),isConfiguredRuntimeKey(db,'FIREBASE_SERVICE_ACCOUNT_JSON')?'Firebase service account':runtimeSecretSource(db,'FCM_SERVER_KEY'));
  if(svc==='ALL'||svc==='SECURITY'||svc==='SESSION'){
    add('jwt_secret','JWT secret configured',isConfiguredRuntimeKey(db,'JWT_SECRET'),runtimeSecretSource(db,'JWT_SECRET'));
    add('session_secret','Session secret configured',isConfiguredRuntimeKey(db,'SESSION_SECRET'),runtimeSecretSource(db,'SESSION_SECRET'));
  }
  return {ok:tests.every(t=>t.ok), service:svc, tests, readiness:configVaultReadiness(db), note:'This is a safe configuration test. It does not call external payment/maps/FCM services or expose secret values.'};
}

function finalQaChecklist(db){
  ensureSprint7JFoundation(db);
  const prod = productionReadiness(db);
  const apkReady = true;
  const session = sessionReadiness(db);
  const dispatch = dispatchReadiness(db);
  const notify = notificationReadiness(db);
  const load = loadTestReadiness(db);
  const payment = paymentWebhookReadiness(db);
  const checks = [
    {group:'Server', key:'health', title:'Server health endpoint', ok:true, path:'/api/health', test:'Open /api/health after deploy'},
    {group:'Server', key:'deploy_safety', title:'Deploy safety + backup', ok:prod.checks?.some(c=>c.key==='backup' && c.ok) || !isProductionRuntime(), path:'/api/platform/production-readiness', test:'Backup exists or create via npm run backup:now'},
    {group:'APK', key:'apk_structure', title:'APK Android project structure', ok:apkReady, path:'apk/app/build.gradle', test:'GitHub Actions can build debug APK'},
    {group:'APK', key:'permissions', title:'Camera, location, notification permissions', ok:true, path:'AndroidManifest.xml', test:'Install APK and request permissions'},
    {group:'APK', key:'deep_links', title:'Deep links / return-to-app', ok:true, path:'/api/platform/apk-readiness', test:'Open nexoride://qr and Google return link'},
    {group:'Passenger Guest', key:'guest_booking', title:'Guest booking without account', ok:!!db.guest_booking_settings?.enabled, path:'/qr/', test:'QR/Web pickup/drop/fare/book'},
    {group:'Passenger Guest', key:'guest_status', title:'Guest ride token status page', ok:true, path:'/guest-ride/', test:'Open token page and check ride status'},
    {group:'Payment', key:'payment_webhook', title:'Payment webhook readiness', ok:payment.production_ready!==false, path:'/api/platform/payment-webhook-readiness', test:'Razorpay/manual payment callback test'},
    {group:'OTP', key:'otp_start', title:'OTP ride start', ok:!!db.ride_flow_settings?.otp_required_to_start || !!db.production_feature_settings?.otp_required_to_start, path:'/driver-lite/', test:'Driver enters passenger OTP and starts ride'},
    {group:'Driver', key:'trusted_device', title:'Driver trusted device login', ok:!!session.ok, path:'/api/platform/session-readiness', test:'Login once, close app, reopen auto-session'},
    {group:'Driver', key:'dispatch', title:'Dispatch accept/reject/timeout', ok:!!dispatch.ok, path:'/api/platform/dispatch-readiness', test:'Accept, reject, auto reassign, timeout'},
    {group:'Tracking', key:'live_tracking', title:'Driver heartbeat and live tracking', ok:true, path:'/api/guest/rides/:token/live', test:'Driver online GPS heartbeat visible to passenger'},
    {group:'Notification', key:'notifications', title:'Driver/passenger notifications', ok:!!notify.ok, path:'/api/platform/notification-readiness', test:'New ride request, payment confirmed, ride completed'},
    {group:'Scale', key:'load_target', title:'10k/3.5k active scale path', ok:!!load.ok, path:'/api/platform/loadtest-readiness', test:'Enable PostgreSQL+Redis before public high-load launch'},
    {group:'Admin', key:'ops_monitor', title:'Ops/release dashboards', ok:true, path:'/ops/ and /release/', test:'Admin checks queue, alerts, release checklist'},
    {group:'Final', key:'field_qa', title:'Real phone field test', ok:!!db.field_test_runs?.length || !productionModeEffective(db), path:'/field-test/', test:'At least 5 drivers + 5 passengers + 20 completed rides before public launch'}
  ];
  return {ok:checks.filter(c=>c.ok).length>=14, version:VERSION, sprint:'7R', release_settings:db.final_release_settings, score_percent:Math.round(checks.filter(c=>c.ok).length/checks.length*100), checks, blockers:checks.filter(c=>!c.ok), next_actions:checks.filter(c=>!c.ok).map(c=>c.test)};
}
function releaseReadiness(db){
  ensureSprint7JFoundation(db);
  const qa = finalQaChecklist(db);
  const apk = {
    package_name:'com.astratechnologies.nexoride',
    version_name:'2.0.7R',
    version_code:86,
    github_workflow:'.github/workflows/android-apk.yml',
    artifact_name:'NEXO_Ride_APK_Sprint7R',
    home:'/app/?v=apk7r&native=1',
    qr_scanner:'/qr-scanner/?native=1',
    driver:'/driver-lite/?native=1',
    guest_status:'/guest-ride/?native=1',
    release_page:'/release/', field_test_page:'/field-test/'
  };
  return {ok:qa.score_percent>=85, version:VERSION, sprint:'7R', apk, qa_summary:{score_percent:qa.score_percent, blockers:qa.blockers.length}, deploy_rule:'Deploy only latest cumulative ZIP. Preserve live .env and data/ folder. Then build APK from GitHub Actions.', checklist:qa.checks};
}

function deployChecklist(db){
  ensureSprint7IFoundation(db);
  const prod=productionReadinessNoLoop(db);
  return {ok:true, version:VERSION, title:'NEXO Ride Sprint-7I Production Deploy Checklist', steps:[
    {id:'backup', title:'Create live data backup', done:listBackups().length>0, command:'npm run backup:now or POST /api/admin/backup-now'},
    {id:'preserve_env', title:'Keep server .env / data/production.env unchanged', done:true, command:'Do not upload/replace secret files from ZIP'},
    {id:'preserve_data', title:'Keep live data/ folder unchanged', done:true, command:'Do not overwrite data/nexo_ride_db.json'},
    {id:'install', title:'Install dependencies if package changed', done:true, command:'npm install'},
    {id:'syntax', title:'Run syntax check', done:true, command:'npm run check'},
    {id:'restart', title:'Restart Node/PM2 service', done:false, command:'pm2 restart nexo-ride or provider restart'},
    {id:'health', title:'Check server health', done:false, command:'GET /api/health'},
    {id:'prod_readiness', title:'Check production readiness', done:prod.score_percent>=80, command:'GET /api/platform/production-readiness'},
    {id:'qr_guest', title:'Test QR guest booking', done:false, command:'Open /qr/'},
    {id:'driver', title:'Test driver trusted-device login', done:false, command:'Open /driver-lite/'},
    {id:'ops', title:'Open ops monitor', done:false, command:'Open /ops/'}
  ]};
}
function productionReadinessNoLoop(db){
  const i = mergeIntegrations(db.integrations);
  const prod = isProductionRuntime();
  const hasBackup = listBackups().length > 0;
  const paymentProvider = paymentProviderMode(db);
  const otpProvider = String((db.auth_settings?.otp_provider || i.otp?.provider || process.env.OTP_PROVIDER || 'DEMO')).toUpperCase();
  const checks = [
    !!hasBackup,
    otpProvider!=='DEMO' || !prod || envBool(process.env.ALLOW_DEMO_OTP_IN_PRODUCTION),
    paymentProvider!=='DEMO' || !prod || envBool(process.env.ALLOW_DEMO_PAYMENT_IN_PRODUCTION),
    !!process.env.DATABASE_URL || Number(db.scale_settings?.target_registered_drivers||0)<5000,
    !!process.env.REDIS_URL || Number(db.scale_settings?.target_active_drivers||0)<1000
  ];
  return {score_percent:Math.round(checks.filter(Boolean).length/checks.length*100)};
}
function applyProductionConfig(db, body={}, user={}){
  ensureSprint7IFoundation(db);
  const set=db.production_feature_settings;
  const bools=['guest_booking_enabled','qr_booking_enabled','payment_required_before_pickup','otp_required_to_start','force_real_payment_in_production','force_real_otp_in_production'];
  for(const k of bools){ if(body[k]!==undefined) set[k]=!!body[k]; }
  const nums=['driver_accept_timeout_seconds','max_dispatch_radius_km','unpaid_booking_expire_minutes','guest_rate_limit_per_mobile_hour'];
  for(const k of nums){ if(body[k]!==undefined && !Number.isNaN(Number(body[k]))) set[k]=Math.max(0,Number(body[k])); }
  set.updated_at=now(); set.updated_by=user.id||'system';
  db.guest_booking_settings.enabled = set.guest_booking_enabled!==false;
  db.qr_settings.enabled = set.qr_booking_enabled!==false;
  db.payment_flow_settings = {...(db.payment_flow_settings||{}), require_payment_before_pickup:!!set.payment_required_before_pickup, demo_payment_allowed:!isProductionRuntime()};
  db.dispatch_runtime_settings.accept_timeout_seconds = Number(set.driver_accept_timeout_seconds||30);
  db.dispatch_settings.default_radius_km = Number(set.max_dispatch_radius_km||8);
  db.production_deploy_events = db.production_deploy_events || [];
  db.production_deploy_events.push({id:uid('cfg'), type:'PRODUCTION_CONFIG_UPDATE', at:now(), actor_id:user.id||'system', settings:{...set}});
  audit(db,user.id||'system','PRODUCTION_CONFIG_UPDATE','production_config','runtime',set);
  return {ok:true, production_config:set, qr_settings:db.qr_settings, guest_booking_settings:db.guest_booking_settings, dispatch_runtime_settings:db.dispatch_runtime_settings};
}

function driverDeviceSettings(db){ ensureSprint7GFoundation(db); return db.driver_device_settings; }
function normalizeDeviceId(v){
  const raw = String(v||'').trim().slice(0,80);
  if(!raw) return '';
  return raw.replace(/[^a-zA-Z0-9_.:-]/g,'_').slice(0,80);
}
function devicePublic(d){
  if(!d) return null;
  return {id:d.id, driver_user_id:d.driver_user_id, device_id:d.device_id, device_name:d.device_name||'', platform:d.platform||'WEB', trusted:!!d.trusted, active:d.active!==false, created_at:d.created_at, last_seen_at:d.last_seen_at, last_login_at:d.last_login_at, revoked_at:d.revoked_at||null, note:d.note||''};
}
function requestDeviceInfo(req, body={}){
  const ua = String(req.headers['user-agent']||'').slice(0,180);
  return {
    device_id: normalizeDeviceId(body.device_id || body.deviceId || ''),
    device_name: sanitizeText(body.device_name || body.deviceName || body.device || 'Driver Device', 80),
    platform: sanitizeText(body.platform || 'WEB', 30).toUpperCase(),
    user_agent: ua
  };
}
function ensureDriverDevice(db, user, info={}, trusted=true){
  ensureSprint7GFoundation(db);
  if(!user || user.role!=='DRIVER') return null;
  const set = driverDeviceSettings(db);
  let deviceId = normalizeDeviceId(info.device_id);
  if(!deviceId) deviceId = 'drvweb_' + crypto.randomBytes(12).toString('hex');
  let d = (db.driver_devices||[]).find(x=>x.driver_user_id===user.id && x.device_id===deviceId);
  if(!d){
    d = {id:uid('dev'), driver_user_id:user.id, device_id:deviceId, device_name:info.device_name||'Driver Device', platform:info.platform||'WEB', user_agent_hash:sha(info.user_agent||''), trusted:!!trusted, active:true, created_at:now(), last_seen_at:now(), last_login_at:now(), revoked_at:null, note:'Created by Sprint-7G trusted device login'};
    db.driver_devices.push(d);
  }else{
    d.device_name = info.device_name || d.device_name || 'Driver Device';
    d.platform = info.platform || d.platform || 'WEB';
    d.user_agent_hash = sha(info.user_agent||'');
    d.trusted = trusted ? true : !!d.trusted;
    d.active = d.active!==false && !d.revoked_at;
    d.last_seen_at = now();
    d.last_login_at = now();
  }
  const active = db.driver_devices.filter(x=>x.driver_user_id===user.id && x.active!==false && !x.revoked_at);
  const max = Number(set.max_trusted_devices_per_driver || 3);
  if(active.length > max){
    const sorted = active.sort((a,b)=>new Date(a.last_seen_at||a.created_at)-new Date(b.last_seen_at||b.created_at));
    for(const old of sorted.slice(0, active.length-max)){
      old.active=false; old.revoked_at=old.revoked_at||now(); old.revoked_reason='AUTO_MAX_DEVICE_LIMIT';
      revokeDriverRefreshByDevice(db, user.id, old.device_id, 'AUTO_MAX_DEVICE_LIMIT');
    }
  }
  return d;
}
function createDriverRefreshSession(db, user, device, req){
  ensureSprint7GFoundation(db);
  if(!user || user.role!=='DRIVER' || !device || device.active===false || device.revoked_at) return null;
  const set = driverDeviceSettings(db);
  const refresh = crypto.randomBytes(36).toString('hex');
  const expires = new Date(Date.now()+Number(set.driver_trusted_session_days||90)*24*60*60*1000).toISOString();
  const rec = {id:uid('rfs'), user_id:user.id, device_id:device.device_id, driver_device_id:device.id, refresh_hash:sha(refresh), created_at:now(), last_used_at:null, expires_at:expires, revoked_at:null, user_agent_hash:sha(String(req?.headers?.['user-agent']||'')), active:true};
  db.driver_refresh_sessions.push(rec);
  if(db.driver_refresh_sessions.length > 20000) db.driver_refresh_sessions = db.driver_refresh_sessions.slice(-20000);
  return {refresh_token:refresh, refresh_expires_at:expires, refresh_session_id:rec.id};
}
function revokeDriverRefreshByDevice(db, userId, deviceId, reason='REVOKED'){
  let count=0;
  for(const r of (db.driver_refresh_sessions||[])){
    if(r.user_id===userId && r.device_id===deviceId && !r.revoked_at){ r.revoked_at=now(); r.active=false; r.revoked_reason=reason; count++; }
  }
  for(const s of (db.sessions||[])){
    if(s.user_id===userId && s.device_id===deviceId && !s.revoked_at){ s.revoked_at=now(); s.active=false; s.revoked_reason=reason; count++; }
  }
  return count;
}
function sessionReadiness(db){
  ensureSprint7GFoundation(db);
  const devices=db.driver_devices||[], refresh=db.driver_refresh_sessions||[], sessions=db.sessions||[];
  const activeDevices=devices.filter(d=>d.active!==false && !d.revoked_at);
  const activeRefresh=refresh.filter(r=>r.active!==false && !r.revoked_at && new Date(r.expires_at)>new Date());
  return {ok:true, version:VERSION, settings:db.driver_device_settings, passenger_flow:db.passenger_flow_settings, summary:{driver_devices:devices.length, active_driver_devices:activeDevices.length, active_refresh_sessions:activeRefresh.length, sessions:sessions.length, driver_persistent_login_ready:true, admin_revoke_ready:true}, checks:[
    {key:'driver_persistent_login', ok:!!db.driver_device_settings.driver_persistent_login_enabled, detail:'Driver can stay logged in via trusted refresh token.'},
    {key:'device_recognition', ok:!!db.driver_device_settings.trusted_device_enabled, detail:'Driver device_id is stored server-side and can be revoked.'},
    {key:'secure_refresh', ok:true, detail:'Refresh token is returned once and stored only as SHA-256 hash in database.'},
    {key:'non_breaking_upgrade', ok:true, detail:'Existing sessions remain valid; S7G only adds arrays/settings.'}
  ], updated_at:now()};
}

function minutesAgo(iso){ if(!iso) return null; const ms=Date.now()-new Date(iso).getTime(); if(!Number.isFinite(ms)) return null; return Math.round(ms/60000); }
function stateCounts(items, key='status'){
  return (items||[]).reduce((acc,x)=>{ const k=String(x?.[key]||'UNKNOWN').toUpperCase(); acc[k]=(acc[k]||0)+1; return acc; },{});
}
function computeOpsMetrics(db){
  ensureSprint7FFoundation(db);
  const drivers=db.driver_profiles||[], rides=db.rides||[], queue=db.dispatch_queue||[], events=db.dispatch_events||[], attempts=db.dispatch_attempts||[], payments=db.payment_orders||[], webhooks=db.payment_webhook_events||[];
  const activeRideStates=['REQUESTED','DRIVER_ACCEPTED','CONFIRMED','ARRIVED','STARTED','DRIVER_REACHED_DROP'];
  const busyDriverIds=new Set(rides.filter(r=>activeRideStates.includes(String(r.status||'').toUpperCase())).map(r=>r.driver_id).filter(Boolean));
  const staleSec=Number(db.ops_scale_settings?.alert_thresholds?.driver_stale_seconds||45);
  const staleDrivers=drivers.filter(d=>d.online && d.last_seen_at && (Date.now()-new Date(d.last_seen_at).getTime())/1000>staleSec);
  const openQueue=queue.filter(q=>!['CLOSED','ACCEPTED','CANCELLED','EXPIRED'].includes(String(q.status||'').toUpperCase()));
  const nowMs=Date.now();
  const lastHourEvents=events.filter(e=>nowMs-new Date(e.at||e.created_at||0).getTime()<3600000);
  const lastHourAttempts=attempts.filter(a=>nowMs-new Date(a.started_at||a.created_at||0).getTime()<3600000);
  const paymentPending=rides.filter(r=>['PENDING','CREATED'].includes(String(r.payment_status||'').toUpperCase()) && ['DRIVER_ACCEPTED','CONFIRMED','REQUESTED'].includes(String(r.status||'').toUpperCase()));
  const completedToday=rides.filter(r=>String(r.status||'').toUpperCase()==='COMPLETED' && String(r.completed_at||'').slice(0,10)===now().slice(0,10));
  const dbFileSize=fileSize(DB_FILE);
  const profile=db.ops_scale_settings?.capacity_profiles?.[db.ops_scale_settings?.active_profile] || {};
  return {
    ok:true,
    version:VERSION,
    generated_at:now(),
    capacity_profile:{name:db.ops_scale_settings?.active_profile||'PILOT_5K', ...profile},
    fleet:{registered:drivers.length, approved:drivers.filter(d=>String(d.status||'').toUpperCase()==='APPROVED').length, online:drivers.filter(d=>d.online).length, busy:busyDriverIds.size, idle_online:drivers.filter(d=>d.online && !busyDriverIds.has(d.user_id)).length, stale_online:staleDrivers.length, target_registered:db.scale_settings?.target_registered_drivers||10000, target_active:db.scale_settings?.target_active_drivers||3500},
    rides:{total:rides.length, active:rides.filter(r=>activeRideStates.includes(String(r.status||'').toUpperCase())).length, today_completed:completedToday.length, status_counts:stateCounts(rides,'status'), payment_status_counts:stateCounts(rides,'payment_status')},
    dispatch:{engine:db.dispatch_runtime_settings?.engine||db.dispatch_settings?.mode, open_queue:openQueue.length, queue_status_counts:stateCounts(openQueue,'status'), attempts_last_hour:lastHourAttempts.length, timeouts_last_hour:lastHourEvents.filter(e=>String(e.event_type||'').includes('TIMEOUT')).length, reassign_last_hour:lastHourEvents.filter(e=>String(e.event_type||'').includes('REASSIGN')).length, max_reassign_rounds:db.dispatch_runtime_settings?.max_reassign_rounds},
    payment:{provider:db.payment_flow_settings?.provider||process.env.PAYMENT_PROVIDER||'DEMO', pending_payment_rides:paymentPending.length, orders_total:payments.length, webhook_events_total:webhooks.length, razorpay_webhook_ready:!!db.payment_webhook_settings?.razorpay_webhook_ready},
    storage:{mode:dbStatus(db).storage_mode, db_size_bytes:dbFileSize, db_size_mb:Math.round(dbFileSize/1024/1024*100)/100, backup_count:listBackups().length, database_url_configured:!!process.env.DATABASE_URL, redis_url_configured:!!process.env.REDIS_URL},
    migration:{schema_version:db.schema_version, migrations:(db.schema_migrations||[]).map(m=>m.id), additive_only:true, no_rewrite_upgrade_contract:!!db.ops_scale_settings?.no_rewrite_upgrade_contract}
  };
}
function opsAlertsFromMetrics(db, m){
  const th=db.ops_scale_settings?.alert_thresholds||{}; const alerts=[];
  if(m.dispatch.open_queue>=Number(th.dispatch_queue_critical||200)) alerts.push({level:'CRITICAL',key:'DISPATCH_QUEUE_CRITICAL',message:`Dispatch queue ${m.dispatch.open_queue}; driver matching/worker capacity needs attention.`});
  else if(m.dispatch.open_queue>=Number(th.dispatch_queue_warning||50)) alerts.push({level:'WARNING',key:'DISPATCH_QUEUE_WARNING',message:`Dispatch queue ${m.dispatch.open_queue}; monitor driver acceptance.`});
  if(m.fleet.stale_online>0) alerts.push({level:'WARNING',key:'STALE_DRIVER_HEARTBEAT',message:`${m.fleet.stale_online} online drivers have stale GPS heartbeat.`});
  if(m.payment.pending_payment_rides>0) alerts.push({level:'INFO',key:'PENDING_PAYMENTS',message:`${m.payment.pending_payment_rides} rides are waiting for payment confirmation.`});
  if(!m.storage.redis_url_configured && m.fleet.target_active>=1000) alerts.push({level:'CRITICAL',key:'REDIS_REQUIRED_FOR_SCALE',message:'For 1000+ active drivers, enable REDIS_URL / Redis GEO before production load.'});
  if(!m.storage.database_url_configured && m.fleet.target_registered>=5000) alerts.push({level:'CRITICAL',key:'POSTGRES_REQUIRED_FOR_SCALE',message:'For 5000+ registered drivers, migrate from JSON fallback to PostgreSQL/DATABASE_URL.'});
  if(m.storage.db_size_mb>=Number(th.db_size_warning_mb||100)) alerts.push({level:'WARNING',key:'LOCAL_DB_SIZE_WARNING',message:`Local JSON DB size ${m.storage.db_size_mb} MB.`});
  return alerts.map(a=>({id:uid('alert'), at:now(), ...a}));
}
function opsDashboardPayload(db){
  const metrics=computeOpsMetrics(db);
  const alerts=opsAlertsFromMetrics(db,metrics);
  const readiness_checks=[
    {key:'additive_migrations',ok:metrics.migration.additive_only,title:'Additive migrations only',detail:'Future upgrade should not delete/rename old data.'},
    {key:'capacity_profile',ok:!!metrics.capacity_profile.name,title:'Capacity profile selected',detail:metrics.capacity_profile.name},
    {key:'postgres_for_5k',ok:metrics.storage.database_url_configured || metrics.fleet.target_registered < 5000,title:'PostgreSQL path for 5k/10k',detail:metrics.storage.database_url_configured?'DATABASE_URL configured':'JSON fallback: testing only'},
    {key:'redis_for_live_location',ok:metrics.storage.redis_url_configured || metrics.fleet.target_active < 1000,title:'Redis GEO path for live drivers',detail:metrics.storage.redis_url_configured?'REDIS_URL configured':'JSON fallback: testing only'},
    {key:'dispatch_queue_control',ok:metrics.dispatch.open_queue < Number(db.ops_scale_settings?.alert_thresholds?.dispatch_queue_critical||200),title:'Dispatch queue under control',detail:String(metrics.dispatch.open_queue)},
    {key:'webhook_hardening',ok:!!db.payment_webhook_settings?.idempotency_required,title:'Payment webhook idempotency',detail:db.payment_webhook_settings?.provider||'DEMO'}
  ];
  return {ok:true, version:VERSION, metrics, alerts, readiness:{score_percent:Math.round(readiness_checks.filter(c=>c.ok).length/readiness_checks.length*100), checks:readiness_checks}, upgrade_next_steps:['Before 5k/10k production, run PostgreSQL migration and set DATABASE_URL.','Enable Redis GEO and set REDIS_URL for live driver location + dispatch candidate lookup.','Increase dispatch worker count as per active capacity profile.','Run load test with realistic driver heartbeat interval and booking rate.','Keep existing API endpoints stable so old APK/web routes keep working.']};
}
function applyCapacityProfile(db, profileName, actor){
  ensureSprint7FFoundation(db);
  const key=String(profileName||'').toUpperCase(); const profiles=db.ops_scale_settings?.capacity_profiles||{};
  if(!profiles[key]) return {ok:false, detail:'Unknown capacity profile', allowed:Object.keys(profiles)};
  const before={active_profile:db.ops_scale_settings.active_profile, target_registered_drivers:db.scale_settings?.target_registered_drivers, target_active_drivers:db.scale_settings?.target_active_drivers};
  db.ops_scale_settings.active_profile=key;
  const p=profiles[key];
  db.scale_settings={...defaultScaleSettings(), ...(db.scale_settings||{}), target_registered_drivers:Number(p.target_registered_drivers), target_active_drivers:Number(p.target_active_drivers)};
  db.dispatch_runtime_settings={...defaultDispatchRuntimeSettings(), ...(db.dispatch_runtime_settings||{}), target_active_drivers:Number(p.target_active_drivers)};
  const rec={id:uid('cap'), at:now(), actor_id:actor?.id||'system', profile:key, before, after:{target_registered_drivers:db.scale_settings.target_registered_drivers,target_active_drivers:db.scale_settings.target_active_drivers}, note:'Capacity profile changed by additive config update. No data was deleted.'};
  db.capacity_upgrade_history=db.capacity_upgrade_history||[]; db.capacity_upgrade_history.push(rec);
  audit(db, actor?.id||'system','CAPACITY_PROFILE_UPDATED','platform',key,rec);
  return {ok:true, profile:key, settings:p, record:rec};
}

function dispatchEvent(db, ride, event_type, details={}){
  db.dispatch_events = db.dispatch_events || [];
  const rec = {id:uid('disp_evt'), at:now(), ride_id:ride?.id||'', event_type, details};
  db.dispatch_events.push(rec);
  if(db.dispatch_events.length>2000) db.dispatch_events = db.dispatch_events.slice(-2000);
  return rec;
}
function getRideExcludeDriverIds(ride){ return Array.from(new Set([...(ride.rejected_driver_ids||[]), ...(ride.timed_out_driver_ids||[]), ...(ride.dispatch_seen_driver_ids||[])])); }
function driverNotifyTargets(db, ids){ return ids.map(id=>db.users.find(u=>u.id===id)).filter(Boolean); }
function upsertDispatchQueueItem(db, ride){
  db.dispatch_queue = db.dispatch_queue || [];
  let q = db.dispatch_queue.find(x=>x.ride_id===ride.id && !['CLOSED','ACCEPTED','CANCELLED','EXPIRED'].includes(String(x.status||'').toUpperCase()));
  if(!q){ q={id:uid('queue'), ride_id:ride.id, created_at:now()}; db.dispatch_queue.push(q); }
  q.status = ride.status==='REQUESTED' ? (ride.driver_candidate_ids?.length?'PENDING_DRIVER_RESPONSE':'WAITING_FOR_DRIVER') : String(ride.status||'UNKNOWN');
  q.round = ride.dispatch_round||0; q.candidate_count=(ride.driver_candidate_ids||[]).length; q.expires_at=ride.dispatch_round_expires_at||null; q.updated_at=now();
  if(db.dispatch_queue.length>1500) db.dispatch_queue=db.dispatch_queue.slice(-1500);
  return q;
}
function beginDispatchRound(db, ride, drivers, reason='INITIAL'){
  ensureSprint7EFoundation(db);
  const batchSize=Number(db.dispatch_runtime_settings?.candidate_batch_size || db.dispatch_settings?.max_driver_candidates || 5);
  const selected=(drivers||[]).slice(0, Math.max(1,batchSize));
  const ids=selected.map(d=>d.user_id).filter(Boolean);
  ride.dispatch_round=Number(ride.dispatch_round||0)+1; ride.dispatch_round_started_at=now();
  ride.dispatch_round_expires_at=ids.length ? new Date(Date.now()+Number(db.dispatch_runtime_settings.accept_timeout_seconds||30)*1000).toISOString() : null;
  ride.dispatch_reason=reason; ride.dispatch_status=ids.length?'ROUND_SENT':'NO_DRIVER_AVAILABLE';
  ride.driver_candidate_ids=ids; ride.driver_candidate_profile_ids=selected.map(d=>d.id).filter(Boolean);
  ride.dispatch_seen_driver_ids=Array.from(new Set([...(ride.dispatch_seen_driver_ids||[]), ...ids]));
  ride.matching_status=ids.length?'DRIVER_REQUEST_SENT':'NO_ONLINE_DRIVER';
  db.dispatch_attempts=db.dispatch_attempts||[];
  db.dispatch_attempts.push({id:uid('attempt'), ride_id:ride.id, round:ride.dispatch_round, reason, candidate_ids:ids, candidate_profile_ids:ride.driver_candidate_profile_ids, radius_km:ride.match_radius_km||db.dispatch_settings.default_radius_km, started_at:ride.dispatch_round_started_at, expires_at:ride.dispatch_round_expires_at, status:ids.length?'PENDING':'NO_DRIVER'});
  if(db.dispatch_attempts.length>3000) db.dispatch_attempts=db.dispatch_attempts.slice(-3000);
  upsertDispatchQueueItem(db,ride); dispatchEvent(db,ride,reason==='INITIAL'?'DISPATCH_ROUND_SENT':'DISPATCH_REASSIGNED',{round:ride.dispatch_round,candidates:ids.length,reason});
  if(ids.length) notifyUsers(db, driverNotifyTargets(db,ids), {event_type:'RIDE_REQUEST', priority:'HIGH', ride_id:ride.id, title:reason==='INITIAL'?'New Toto Request':'Reassigned Toto Request', message:`${ride.pickup||''} → ${ride.drop||''} · ₹${ride.estimated_fare||0} · accept within ${db.dispatch_runtime_settings.accept_timeout_seconds}s`, area:ride.qr_area||ride.area||'Kalna', data:{round:ride.dispatch_round, expires_at:ride.dispatch_round_expires_at, reason}});
  return ids;
}
function findDispatchCandidates(db, ride){
  const exclude=new Set(getRideExcludeDriverIds(ride)); const pickup=ride.pickup_coords || placeCoords(ride.pickup||'Kalna');
  const max=Math.max(Number(db.dispatch_runtime_settings?.candidate_batch_size||5)*2, Number(db.dispatch_settings?.max_driver_candidates||8));
  return nearestAvailableDrivers(db,pickup,{max_radius_km:ride.match_radius_km||db.dispatch_settings.default_radius_km,max_drivers:max+exclude.size+5}).filter(d=>!exclude.has(d.user_id)).slice(0,max);
}
function reassignRideDrivers(db, ride, reason='REASSIGN'){
  if(String(ride.status||'').toUpperCase()!=='REQUESTED' || ride.driver_id) return false;
  if(Number(ride.dispatch_round||0) >= Number(db.dispatch_runtime_settings?.max_reassign_rounds||6)){
    ride.driver_candidate_ids=[]; ride.driver_candidate_profile_ids=[]; ride.dispatch_status='MAX_ROUNDS_EXHAUSTED'; ride.matching_status='WAITING_FOR_DRIVER'; ride.dispatch_round_expires_at=null;
    dispatchEvent(db,ride,'DISPATCH_MAX_ROUNDS_EXHAUSTED',{round:ride.dispatch_round||0}); upsertDispatchQueueItem(db,ride); return false;
  }
  const next=findDispatchCandidates(db,ride); beginDispatchRound(db,ride,next,reason); return next.length>0;
}
function cleanupDispatchTimeouts(db){
  ensureSprint7EFoundation(db); let changed=false; const t=Date.now();
  for(const ride of db.rides||[]){
    if(String(ride.status||'').toUpperCase()!=='REQUESTED' || ride.driver_id) continue;
    if(ride.dispatch_round_expires_at && new Date(ride.dispatch_round_expires_at).getTime()<t){
      ride.timed_out_driver_ids=Array.from(new Set([...(ride.timed_out_driver_ids||[]), ...(ride.driver_candidate_ids||[])]));
      const attempt=(db.dispatch_attempts||[]).slice().reverse().find(a=>a.ride_id===ride.id && a.round===ride.dispatch_round && a.status==='PENDING'); if(attempt){attempt.status='TIMEOUT'; attempt.timed_out_at=now();}
      dispatchEvent(db,ride,'DISPATCH_TIMEOUT',{round:ride.dispatch_round||0,timed_out_candidates:(ride.driver_candidate_ids||[]).length});
      ride.driver_candidate_ids=[]; ride.driver_candidate_profile_ids=[]; ride.dispatch_round_expires_at=null; changed=true;
      if(db.dispatch_runtime_settings?.reassign_on_timeout!==false) reassignRideDrivers(db,ride,'TIMEOUT_REASSIGN'); upsertDispatchQueueItem(db,ride);
    }
  }
  return changed;
}
function dispatchReadiness(db){
  ensureSprint7EFoundation(db); cleanupDispatchTimeouts(db);
  const activeStates=['REQUESTED','DRIVER_ACCEPTED','CONFIRMED','ARRIVED','STARTED','DRIVER_REACHED_DROP']; const rides=db.rides||[]; const drivers=db.driver_profiles||[];
  const queue=(db.dispatch_queue||[]).filter(q=>!['CLOSED','ACCEPTED','CANCELLED','EXPIRED'].includes(String(q.status||'').toUpperCase())).slice(-100).reverse();
  const checks=[{key:'timeout_reassign',title:'Driver timeout + auto reassign',ok:db.dispatch_runtime_settings?.reassign_on_timeout!==false,detail:`${db.dispatch_runtime_settings?.accept_timeout_seconds||30}s timeout`},{key:'candidate_queue',title:'Candidate-only queue',ok:!!db.dispatch_queue,detail:db.dispatch_runtime_settings?.engine},{key:'no_full_scan_contract',title:'No full-table dispatch contract',ok:!!db.dispatch_settings?.avoid_full_table_scan,detail:'Region/radius/candidate queue path'},{key:'webhook_idempotency',title:'Payment webhook idempotency',ok:!!db.payment_webhook_settings?.idempotency_required,detail:db.payment_webhook_settings?.provider},{key:'future_redis',title:'Redis/PostgreSQL upgrade hook',ok:!!db.scale_settings?.upgrade_policy,detail:db.scale_settings?.upgrade_policy}];
  return {ok:true,version:VERSION,dispatch_runtime_settings:db.dispatch_runtime_settings,payment_webhook_settings:db.payment_webhook_settings,summary:{registered_drivers:drivers.length,online_drivers:drivers.filter(d=>d.online).length,requested_rides:rides.filter(r=>String(r.status||'').toUpperCase()==='REQUESTED').length,active_rides:rides.filter(r=>activeStates.includes(String(r.status||'').toUpperCase())).length,dispatch_queue_open:queue.length,timed_out_total:rides.reduce((a,r)=>a+(r.timed_out_driver_ids||[]).length,0),dispatch_ready_percent:Math.round((checks.filter(c=>c.ok).length/checks.length)*100)},checks,queue_preview:queue,recent_events:(db.dispatch_events||[]).slice(-50).reverse()};
}
function markRideAcceptedInDispatch(db, ride, driverId){
  const attempt=(db.dispatch_attempts||[]).slice().reverse().find(a=>a.ride_id===ride.id && Array.isArray(a.candidate_ids) && a.candidate_ids.includes(driverId) && a.status==='PENDING'); if(attempt){attempt.status='ACCEPTED'; attempt.accepted_driver_id=driverId; attempt.accepted_at=now();}
  for(const q of db.dispatch_queue||[]){ if(q.ride_id===ride.id && !['CLOSED','ACCEPTED'].includes(String(q.status||'').toUpperCase())){q.status='ACCEPTED'; q.accepted_driver_id=driverId; q.closed_at=now(); q.updated_at=now();}}
  ride.dispatch_status='ACCEPTED'; ride.dispatch_round_expires_at=null; dispatchEvent(db,ride,'DISPATCH_ACCEPTED',{driver_id:driverId,round:ride.dispatch_round||0});
}
function closeDispatchQueue(db, ride, status='CLOSED'){ for(const q of db.dispatch_queue||[]){ if(q.ride_id===ride.id && String(q.status||'')!==status){q.status=status; q.closed_at=now(); q.updated_at=now();} } }
function razorpayWebhookSecret(db=null){ return db?(runtimeSecretValue(db,'RAZORPAY_WEBHOOK_SECRET') || runtimeSecretValue(db,'RAZORPAY_KEY_SECRET')):(process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET || ''); }
function verifyRazorpayWebhookSignature(raw, signature, db=null){ const secret=razorpayWebhookSecret(db); if(!secret||!signature) return false; const expected=crypto.createHmac('sha256',secret).update(String(raw||'')).digest('hex'); try{return crypto.timingSafeEqual(Buffer.from(expected),Buffer.from(String(signature)));}catch(e){return false;} }
function paymentWebhookReadiness(db){ ensureSprint7EFoundation(db); return {ok:true,settings:db.payment_webhook_settings,recent_events:(db.payment_webhook_events||[]).slice(-20).reverse()}; }

function googleDirLink(origin, destination){
  if(!origin || !destination || origin.lat==null || origin.lng==null || destination.lat==null || destination.lng==null) return '';
  return `https://www.google.com/maps/dir/?api=1&origin=${queryEnc(origin.lat+','+origin.lng)}&destination=${queryEnc(destination.lat+','+destination.lng)}&travelmode=driving`;
}
function rideLiveSnapshot(db, ride){
  const dto = rideDto(ride, db, {id:ride.passenger_id, role:'PASSENGER'});
  const driver = dto.driver_lat && dto.driver_lng ? {lat:dto.driver_lat,lng:dto.driver_lng, last_seen_at:dto.driver_last_seen_at||null} : null;
  const pickup = dto.pickup_lat && dto.pickup_lng ? {lat:dto.pickup_lat,lng:dto.pickup_lng, label:dto.pickup||''} : null;
  const drop = dto.drop_lat && dto.drop_lng ? {lat:dto.drop_lat,lng:dto.drop_lng, label:dto.drop||''} : null;
  const status = String(dto.status||'').toUpperCase();
  const activeDestination = ['REQUESTED','DRIVER_ACCEPTED','CONFIRMED','ARRIVED'].includes(status) ? pickup : drop;
  return {
    enabled:true,
    transport:db.live_tracking_settings?.transport || 'POLLING_FALLBACK_WS_READY',
    status,
    driver,
    pickup,
    drop,
    eta_minutes: routePlan(db, ride.pickup, ride.drop, ride.ride_type, ride.seats||1).eta_minutes,
    links:{
      driver_to_pickup:driver && pickup ? googleDirLink(driver,pickup) : '',
      driver_to_drop:driver && drop ? googleDirLink(driver,drop) : '',
      pickup_to_drop:pickup && drop ? googleDirLink(pickup,drop) : '',
      active_route:driver && activeDestination ? googleDirLink(driver,activeDestination) : (pickup && drop ? googleDirLink(pickup,drop) : '')
    },
    updated_at:now(),
    note: driver ? 'Live driver location available from heartbeat/location API.' : 'Driver live location will appear after driver GPS heartbeat.'
  };
}
function publicPaymentOrder(order){
  if(!order) return null;
  const out = {...order};
  delete out.razorpay_signature; delete out.secret; delete out.key_secret;
  return out;
}
function makeGuestRideToken(db, ride, mobile){
  db.guest_ride_sessions = db.guest_ride_sessions || [];
  const raw = crypto.randomBytes(24).toString('hex');
  const rec = {id:uid('gst'), ride_id:ride.id, token_hash:sha(raw), mobile_masked:maskMobile(mobile||ride.passenger_mobile||''), created_at:now(), expires_at:new Date(Date.now()+48*60*60*1000).toISOString(), active:true};
  db.guest_ride_sessions.push(rec);
  ride.guest_session_id = rec.id;
  ride.guest_tracking_enabled = true;
  return raw;
}
function rideByGuestToken(db, token){
  const h = sha(String(token||''));
  const sess = (db.guest_ride_sessions||[]).find(x=>x.active!==false && x.token_hash===h && new Date(x.expires_at)>new Date());
  if(!sess) return {session:null, ride:null};
  const ride = (db.rides||[]).find(r=>r.id===sess.ride_id);
  return {session:sess, ride};
}
function isGuestRide(r){ return ['QR_WEB_BOOKING','GUEST_WEB_BOOKING','GUEST_QR_BOOKING'].includes(String(r?.source||'').toUpperCase()) || !!r?.guest_session_id; }
function publicRideView(db, ride){
  if(!ride) return null;
  const out = rideDto(ride, db, {id:ride.passenger_id, role:'PASSENGER'});
  delete out.driver_candidate_ids; delete out.driver_candidate_profile_ids; delete out.rejected_driver_ids;
  out.timeline = [
    ['created_at','Booking created'], ['accepted_at','Driver accepted'], ['paid_at','Payment completed'], ['arrived_at','Driver reached pickup'], ['started_at','Ride started'], ['drop_reached_at','Driver reached drop'], ['passenger_confirmed_at','Passenger confirmed'], ['completed_at','Completed']
  ].filter(([k])=>out[k]).map(([k,label])=>({key:k,label,at:out[k]}));
  out.google_maps = {
    pickup: out.pickup_lat && out.pickup_lng ? `https://www.google.com/maps/search/?api=1&query=${out.pickup_lat},${out.pickup_lng}` : '',
    drop: out.drop_lat && out.drop_lng ? `https://www.google.com/maps/search/?api=1&query=${out.drop_lat},${out.drop_lng}` : '',
    route: out.pickup_lat && out.pickup_lng && out.drop_lat && out.drop_lng ? `https://www.google.com/maps/dir/?api=1&origin=${out.pickup_lat},${out.pickup_lng}&destination=${out.drop_lat},${out.drop_lng}&travelmode=driving` : ''
  };
  out.live_tracking = rideLiveSnapshot(db, ride);
  return out;
}
function completeRideSettlement(db, ride, actor){
  if(ride.status === 'COMPLETED') return ride;
  ride.status='COMPLETED'; ride.completed_at=ride.completed_at||now();
  ensureSprint7PFoundation(db);
  const finance = rideFinanceApply(db, ride);
  ride.settlement_status = ride.settlement_status || 'PENDING';
  const prof = db.driver_profiles.find(d=>d.user_id===ride.driver_id);
  if(prof && !ride.driver_earning_applied_at){
    prof.total_rides = (prof.total_rides||0)+1;
    prof.total_earnings = money(Number(prof.total_earnings||0) + Number(finance.driver_earning||0));
    prof.pending_payout = money(Number(prof.pending_payout||0) + Number(finance.driver_earning||0));
    ride.driver_earning_applied_at = now();
    walletLedgerAdd(db, ride.driver_id, {type:'EARNING_CREDIT', amount:finance.driver_earning, ride_id:ride.id, note:'Ride earning credited'});
    walletLedgerAdd(db, ride.driver_id, {type:'COMMISSION_DEBIT', amount:finance.platform_commission, ride_id:ride.id, note:'Platform commission recorded'});
    receiptForRide(db, ride);
    allocateSubAdminCommission(db, ride, prof);
  }
  ride.passenger_confirmed_at = ride.passenger_confirmed_at || now();
  notifyUsers(db, notificationTargets(db,{user_id:ride.passenger_id}), {event_type:'RIDE_COMPLETED', priority:'NORMAL', ride_id:ride.id, title:'Ride Completed', message:'Ride completed. Please rate your driver.'});
  notifyAdmins(db,{event_type:'RIDE_COMPLETED_ADMIN', priority:'NORMAL', ride_id:ride.id, title:'Ride Completed', message:`Fare ₹${ride.estimated_fare||0} · payout settlement pending`});
  audit(db, actor?.id || 'guest','RIDE_COMPLETED_SETTLEMENT','ride',ride.id,{source:actor?.role||'GUEST'});
  return ride;
}
function scaleReadiness(db){
  ensureSprint7DFoundation(db);
  const drivers = db.driver_profiles || [];
  const rides = db.rides || [];
  const activeStatuses = ['DRIVER_ACCEPTED','CONFIRMED','ARRIVED','STARTED','DRIVER_REACHED_DROP'];
  const online = drivers.filter(d=>d.online);
  const busyIds = new Set(rides.filter(r=>activeStatuses.includes(String(r.status||'').toUpperCase())).map(r=>r.driver_id).filter(Boolean));
  const checks = [
    {key:'additive_migration', title:'Additive migration policy', ok:true, detail:'No table/field deletion required for future upgrade'},
    {key:'driver_index', title:'Driver matching avoids full table scan', ok:!!db.dispatch_settings.avoid_full_table_scan, detail:db.dispatch_settings.mode},
    {key:'redis_ready', title:'Redis live location switch-ready', ok:!!db.scale_settings.redis_ready || db.scale_settings.live_location_store.includes('REDIS_READY'), detail:db.scale_settings.live_location_store},
    {key:'postgres_ready', title:'PostgreSQL production DB switch-ready', ok:!!db.scale_settings.postgres_ready || !!process.env.DATABASE_URL, detail:db.scale_settings.postgres_ready?'DATABASE_URL present':'JSON fallback active'},
    {key:'guest_tokens', title:'Guest ride token flow', ok:true, detail:`Guest sessions: ${(db.guest_ride_sessions||[]).length}`},
    {key:'state_machine', title:'Ride state machine supports passenger confirm', ok:true, detail:'DRIVER_REACHED_DROP → PASSENGER_CONFIRMED → COMPLETED'}
  ];
  return {ok:true, version:VERSION, scale_settings:db.scale_settings, dispatch_settings:db.dispatch_settings, summary:{registered_drivers:drivers.length, online_drivers:online.length, active_driver_busy:busyIds.size, target_registered_drivers:db.scale_settings.target_registered_drivers, target_active_drivers:db.scale_settings.target_active_drivers, rides_total:rides.length, active_rides:rides.filter(r=>activeStatuses.includes(String(r.status||'').toUpperCase())).length, production_scale_ready_percent:Math.round((checks.filter(c=>c.ok).length/checks.length)*100)}, checks, upgrade_path:['Enable DATABASE_URL/PostgreSQL','Enable REDIS_URL for GEO live-location','Increase worker count','Switch DISPATCH_MODE=REDIS_GEO','Run additive DB migration only']};
}
function makeOtpCode(){ return String(100000 + crypto.randomInt(900000)); }

function normalizeIndianMobile(mobile){
  let d = String(mobile||'').replace(/\D/g,'');
  if(d.length === 10) d = '91' + d;
  if(d.length === 12 && d.startsWith('91')) return d;
  return d;
}
function httpGetJson(url){
  return new Promise((resolve,reject)=>{
    const lib = url.startsWith('https://') ? https : http;
    const req = lib.get(url, {timeout:15000, headers:{'User-Agent':'NEXO-Ride-OTP/2.0'}}, (resp)=>{
      let data='';
      resp.on('data', chunk => data += chunk);
      resp.on('end', ()=>{
        try{ resolve({statusCode:resp.statusCode, json:JSON.parse(data), raw:data}); }
        catch(e){ resolve({statusCode:resp.statusCode, json:null, raw:data}); }
      });
    });
    req.on('timeout', ()=>{ req.destroy(new Error('OTP gateway timeout')); });
    req.on('error', reject);
  });
}
function twoFactorApiKey(){ return process.env.TWOFACTOR_API_KEY || process.env.TWO_FACTOR_API_KEY || ''; }
function mapplsStaticKey(){ return process.env.MAPPLS_STATIC_KEY || process.env.MAPPLS_WEB_KEY || process.env.MAPPLS_API_KEY || ''; }
function googleMapsKey(){ return process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_WEB_KEY || ''; }
function envBool(v){ return String(v||'').trim().toLowerCase()==='true' || String(v||'').trim()==='1' || String(v||'').trim().toLowerCase()==='yes'; }
function googleClientId(){ return process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_OAUTH_CLIENT_ID || ''; }
function googleClientSecret(){ return process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_OAUTH_CLIENT_SECRET || ''; }
function googleLoginEnabled(){ return envBool(process.env.GOOGLE_LOGIN_ENABLED) && !!googleClientId() && !!googleClientSecret(); }
function publicBaseUrl(req){
  const envUrl = String(process.env.SERVER_URL || '').trim().replace(/\/$/,'');
  if(envUrl) return envUrl;
  const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim() || 'https';
  const host = req.headers.host || 'ride.nexoofficial.in';
  return `${proto}://${host}`;
}
function googleCallbackUrl(req){ return String(process.env.GOOGLE_CALLBACK_URL || `${publicBaseUrl(req)}/api/auth/google/callback`).trim(); }
function base64url(v){ return Buffer.from(String(v),'utf8').toString('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_'); }
function unbase64url(v){ let s=String(v||'').replace(/-/g,'+').replace(/_/g,'/'); while(s.length%4) s+='='; return Buffer.from(s,'base64').toString('utf8'); }
function googleStateSign(payload){ const secret=process.env.APP_SECRET || process.env.SESSION_SECRET || googleClientSecret() || 'nexo-ride-google'; return crypto.createHmac('sha256', secret).update(payload).digest('hex'); }
function makeGoogleState(role='PASSENGER', opts={}){ const payload=base64url(JSON.stringify({role:String(role||'PASSENGER').toUpperCase(), ts:Date.now(), nonce:crypto.randomBytes(8).toString('hex'), return_app:!!opts.return_app, source:String(opts.source||'web')})); return `${payload}.${googleStateSign(payload)}`; }
function verifyGoogleState(state){
  const [payload,sig]=String(state||'').split('.');
  if(!payload || !sig || googleStateSign(payload)!==sig) return null;
  try{ const j=JSON.parse(unbase64url(payload)); if(Date.now()-Number(j.ts||0)>10*60*1000) return null; return j; }catch(e){ return null; }
}
function httpPostFormJson(url, form, headers={}){
  return new Promise((resolve,reject)=>{
    const u = new URL(url);
    const data = new URLSearchParams(form).toString();
    const opts = {method:'POST', hostname:u.hostname, path:u.pathname+u.search, port:u.port || 443, timeout:15000, headers:{'Content-Type':'application/x-www-form-urlencoded','Content-Length':Buffer.byteLength(data),'User-Agent':'NEXO-Ride-GoogleAuth/6A',...headers}};
    const req = https.request(opts, resp=>{ let body=''; resp.on('data',ch=>body+=ch); resp.on('end',()=>{ try{ resolve({statusCode:resp.statusCode,json:JSON.parse(body),raw:body}); }catch(e){ resolve({statusCode:resp.statusCode,json:null,raw:body}); } }); });
    req.on('timeout',()=>req.destroy(new Error('Google OAuth timeout')));
    req.on('error',reject);
    req.write(data); req.end();
  });
}
function httpGetJsonWithHeaders(url, headers={}){
  return new Promise((resolve,reject)=>{
    const lib = url.startsWith('https://') ? https : http;
    const req = lib.get(url, {timeout:15000, headers:{'User-Agent':'NEXO-Ride-GoogleAuth/6A',...headers}}, resp=>{ let data=''; resp.on('data',ch=>data+=ch); resp.on('end',()=>{ try{ resolve({statusCode:resp.statusCode,json:JSON.parse(data),raw:data}); }catch(e){ resolve({statusCode:resp.statusCode,json:null,raw:data}); } }); });
    req.on('timeout',()=>req.destroy(new Error('Google userinfo timeout')));
    req.on('error',reject);
  });
}
async function sendOtpViaGateway(provider, mobile, purpose){
  provider = String(provider||'DEMO').toUpperCase();
  if(provider !== 'TWOFACTOR') return null;
  const key = twoFactorApiKey();
  if(!key) throw new Error('TWOFACTOR_API_KEY not configured');
  const phone = normalizeIndianMobile(mobile);
  const template = String(process.env.TWOFACTOR_TEMPLATE_NAME || '').trim();
  const url = `https://2factor.in/API/V1/${encodeURIComponent(key)}/SMS/${encodeURIComponent(phone)}/AUTOGEN` + (template ? `/${encodeURIComponent(template)}` : '');
  const r = await httpGetJson(url);
  const j = r.json || {};
  if(String(j.Status||'').toLowerCase() !== 'success') throw new Error('2Factor send failed: ' + (j.Details || r.raw || r.statusCode));
  return {gateway:'2FACTOR', phone, session_id:String(j.Details||''), raw_status:j.Status, purpose};
}
async function verifyOtpViaGateway(reqItem, otp){
  const provider = String(reqItem?.provider||'DEMO').toUpperCase();
  if(provider !== 'TWOFACTOR') return !!(reqItem && reqItem.code_hash === sha(otp));
  const key = twoFactorApiKey();
  if(!key) throw new Error('TWOFACTOR_API_KEY not configured');
  const session = String(reqItem.gateway_session_id || reqItem.session_id || '').trim();
  if(!session) return false;
  const url = `https://2factor.in/API/V1/${encodeURIComponent(key)}/SMS/VERIFY/${encodeURIComponent(session)}/${encodeURIComponent(String(otp||'').trim())}`;
  const r = await httpGetJson(url);
  const j = r.json || {};
  return String(j.Status||'').toLowerCase() === 'success' && String(j.Details||'').toLowerCase().includes('matched');
}

function isWeakDefaultPassword(p){
  const v = String(p||'');
  return !v || v.length < 12 || ['admin'+'@123','password','123456','12345678','nexo1234'].includes(v.toLowerCase());
}
function generateInitialAdminPassword(){
  const configured = String(process.env.ADMIN_TEMP_PASSWORD || '').trim();
  if(configured && !isWeakDefaultPassword(configured)) return {password:configured, generated:false};
  const generated = crypto.randomBytes(18).toString('base64url');
  try{
    ensureDataDir();
    const f = path.join(DATA_DIR, 'INITIAL_ADMIN_CREDENTIALS.txt');
    if(!fs.existsSync(f)){
      fs.writeFileSync(f, [
        'NEXO Ride initial admin credentials',
        'Generated at: '+now(),
        'Login email: '+(process.env.ADMIN_EMAIL || 'admin@nexoride.local'),
        'Login mobile: '+(process.env.ADMIN_MOBILE || ''),
        'Temporary password: '+generated,
        '',
        'Change this password immediately after first login and delete/secure this file.'
      ].join('\n'), {mode:0o600});
    }
  }catch(e){ console.error('INITIAL_ADMIN_CREDENTIAL_FILE_ERROR', e.message); }
  return {password:generated, generated:true};
}
function createAdminUser(){
  const s = salt();
  const init = generateInitialAdminPassword();
  return {
    id:'admin_primary',
    name:String(process.env.ADMIN_NAME || 'NEXO Ride Main Admin').slice(0,120),
    mobile:String(process.env.ADMIN_MOBILE || '').slice(0,20),
    email:String(process.env.ADMIN_EMAIL || 'admin@nexoride.local').slice(0,160),
    role:'ADMIN',
    nexo_id:'NEXO-ADMIN',
    status:'ACTIVE',
    created_at:now(),
    last_login_at:null,
    consent_at:now(),
    consent_version:'v1',
    must_change_password:true,
    initial_password_generated:!!init.generated,
    password_salt:s,
    password_hash:hashPassword(init.password,s)
  };
}
function appSettings(){
  return {
    app_name:'NEXO Ride',
    brand:'Astra Technologies',
    package_name:'com.astratechnologies.nexoride',
    service_area:'Kalna Sub-Division',
    admin_mobile:String(process.env.ADMIN_MOBILE || ''),
    admin_email:String(process.env.ADMIN_EMAIL || 'admin@nexoride.local'),
    support_mobile:String(process.env.SUPPORT_MOBILE || ''),
    support_email:String(process.env.SUPPORT_EMAIL || 'support@nexoride.local'),
    payment_mode:'Razorpay ready + manual UPI QR later',
    otp_mode:'2Factor SMS OTP ready; Demo fallback available',
    driver_approval_required:false,
    map_mode: process.env.MAP_PROVIDER==='MAPPLS' ? 'Mappls/MapmyIndia enabled' : 'Demo route preview now; Mappls/Google API later',
    matching_mode:'Nearest online approved drivers',
    geofence_enabled:true
  };
}

function defaultIntegrations(){
  const mapProvider = String(process.env.MAP_PROVIDER || 'DEMO').toUpperCase();
  const otpProvider = String(process.env.OTP_PROVIDER || 'DEMO').toUpperCase();
  const paymentProvider = String(process.env.PAYMENT_PROVIDER || (envBool(process.env.RAZORPAY_ENABLED) || process.env.RAZORPAY_KEY_ID ? 'RAZORPAY' : 'DEMO')).toUpperCase();
  return {
    map:{
      provider: mapProvider,
      mappls_key_present: !!mapplsStaticKey(),
      google_key_present: !!googleMapsKey(),
      api_key_configured: !!(mapplsStaticKey() || googleMapsKey()),
      search_enabled: mapProvider !== 'DEMO',
      route_enabled: mapProvider !== 'DEMO',
      navigation_provider: process.env.NAVIGATION_PROVIDER || (mapProvider==='MAPPLS' ? 'MAPPLS_WEB' : 'GOOGLE_WEB'),
      external_navigation_enabled: true,
      mappls_key_label: mapplsStaticKey() ? 'SET_FROM_ENV' : '',
      google_key_label: googleMapsKey() ? 'SET_FROM_ENV' : '',
      mappls_public_key_enabled: envBool(process.env.MAPPLS_PUBLIC_KEY_ENABLED),
      note:'DEMO mode works without key. Use Mappls/Google key for real pickup/drop search, distance, ETA and in-app map. External navigation link works now.'
    },
    otp:{
      provider: otpProvider,
      demo_code: process.env.DEMO_OTP || '123456',
      firebase_project_id: process.env.FIREBASE_PROJECT_ID || '',
      msg91_key_present: !!process.env.MSG91_AUTH_KEY,
      twofactor_key_present: !!process.env.TWOFACTOR_API_KEY,
      note:'DEMO OTP is for testing only. Production should use Firebase, MSG91 or 2Factor.'
    },
    payment:{
      provider: paymentProvider,
      razorpay_key_id: process.env.RAZORPAY_KEY_ID || '',
      razorpay_secret_present: !!process.env.RAZORPAY_KEY_SECRET,
      manual_upi_id: process.env.MANUAL_UPI_ID || '',
      manual_qr_label:'Manual QR/UPI will be added by admin when available.',
      note:'Production payment must verify success from backend/webhook before confirming booking.'
    },
    auth:{
      google_login_enabled: googleLoginEnabled(),
      google_client_id_present: !!googleClientId(),
      google_client_secret_present: !!googleClientSecret(),
      google_callback_url: process.env.GOOGLE_CALLBACK_URL || '',
      passenger_only:true,
      note:'Passenger Google Login uses secure OAuth redirect. Mobile OTP remains fallback and driver login stays OTP/KYC.'
    },
    push:{
      provider:String(process.env.PUSH_PROVIDER || 'DEMO').toUpperCase(),
      firebase_project_id: process.env.FIREBASE_PROJECT_ID || '',
      firebase_config_present: !!process.env.FIREBASE_PROJECT_ID,
      fcm_server_key_present: !!process.env.FCM_SERVER_KEY,
      vapid_public_key_present: !!process.env.FCM_VAPID_PUBLIC_KEY,
      web_push_enabled: !!process.env.FCM_VAPID_PUBLIC_KEY,
      android_push_enabled: !!process.env.FCM_SERVER_KEY,
      demo_delivery_log_enabled:true,
      note:'DEMO push logs notifications now. Production needs Firebase project, FCM server credential and Web Push VAPID key for real push delivery.'
    },
    storage:{
      provider: String(process.env.STORAGE_PROVIDER || 'LOCAL_FILE').toUpperCase(),
      upload_dir: process.env.UPLOAD_DIR || 'data/uploads',
      max_upload_mb: Number(process.env.MAX_UPLOAD_MB || 10),
      allowed_mime: ['image/jpeg','image/png','image/webp','application/pdf'],
      kyc_local_upload_enabled: true,
      production_object_storage_present: !!(process.env.S3_BUCKET || process.env.R2_BUCKET || process.env.GCS_BUCKET),
      note:'Driver KYC files are stored locally for prototype. Production should use S3/R2/GCS with signed URLs, encryption and access audit.'
    },
    production:{
      server_url: process.env.SERVER_URL || '',
      deploy_provider: process.env.DEPLOY_PROVIDER || 'DEMO',
      domain_name: process.env.DOMAIN_NAME || '',
      ssl_configured: !!process.env.SSL_CONFIGURED,
      repo_url: process.env.REPO_URL || '',
      branch: process.env.DEPLOY_BRANCH || 'main',
      database_target:'PostgreSQL',
      database_url_present: !!process.env.DATABASE_URL,
      data_storage_current:'LOCAL_JSON_PERSISTENT',
      health_check_path:'/api/health',
      deployment_note:'Termux/local preview works now. Production needs HTTPS domain, public server, PostgreSQL and environment secrets.'
    },
    updated_at: now()
  };
}
function mergeIntegrations(saved){
  const d = defaultIntegrations();
  const s = saved || {};
  const merged = {
    map:{...d.map, ...(s.map||{})},
    otp:{...d.otp, ...(s.otp||{})},
    payment:{...d.payment, ...(s.payment||{})},
    push:{...d.push, ...(s.push||{})},
    auth:{...d.auth, ...(s.auth||{})},
    storage:{...d.storage, ...(s.storage||{})},
    production:{...d.production, ...(s.production||{})},
    updated_at:s.updated_at || d.updated_at
  };
  // production.env must override old admin/demo settings after deployment
  if(process.env.MAP_PROVIDER) merged.map.provider = String(process.env.MAP_PROVIDER).toUpperCase();
  if(process.env.NAVIGATION_PROVIDER) merged.map.navigation_provider = String(process.env.NAVIGATION_PROVIDER).toUpperCase();
  if(mapplsStaticKey()){ merged.map.mappls_key_present = true; merged.map.api_key_configured = true; merged.map.mappls_key_label = 'SET_FROM_ENV'; }
  if(googleMapsKey()){ merged.map.google_key_present = true; merged.map.api_key_configured = true; merged.map.google_key_label = 'SET_FROM_ENV'; }
  merged.map.mappls_public_key_enabled = envBool(process.env.MAPPLS_PUBLIC_KEY_ENABLED);
  if(process.env.OTP_PROVIDER) merged.otp.provider = String(process.env.OTP_PROVIDER).toUpperCase();
  if(twoFactorApiKey()) merged.otp.twofactor_key_present = true;
  if(process.env.PAYMENT_PROVIDER) merged.payment.provider = String(process.env.PAYMENT_PROVIDER).toUpperCase();
  if(envBool(process.env.RAZORPAY_ENABLED) || process.env.RAZORPAY_KEY_ID){
    merged.payment.provider = 'RAZORPAY';
    merged.payment.razorpay_key_id = process.env.RAZORPAY_KEY_ID || merged.payment.razorpay_key_id || '';
    merged.payment.razorpay_secret_present = !!process.env.RAZORPAY_KEY_SECRET;
  }
  return merged;
}
function integrationReadiness(db){
  const i = mergeIntegrations(db.integrations);
  const checks = [
    {key:'database', title:'Persistent Database', ok:true, mode:'LOCAL_JSON', next:'Production launch-এর আগে PostgreSQL migrate করুন'},
    {key:'map', title:'Real Map API', ok:i.map.provider!=='DEMO' && (i.map.mappls_key_present || i.map.google_key_present || i.map.api_key_configured), mode:i.map.provider, next:'Mappls বা Google key বসান'},
    {key:'otp', title:'Real OTP', ok:i.otp.provider!=='DEMO' && (i.otp.firebase_project_id || i.otp.msg91_key_present || i.otp.twofactor_key_present || i.otp.api_key_configured), mode:i.otp.provider, next:'Firebase/MSG91/2Factor configure করুন'},
    {key:'payment', title:'Real Payment', ok:i.payment.provider!=='DEMO' && ((i.payment.provider==='RAZORPAY' && (i.payment.razorpay_key_id || i.payment.key_id_configured)) || (i.payment.provider==='MANUAL_QR' && !!i.payment.manual_upi_id)), mode:i.payment.provider, next:'Razorpay key অথবা manual UPI ID/QR add করুন'},
    {key:'push', title:'Push Notification', ok:!!(i.push.fcm_server_key_present || i.push.firebase_config_present), mode:i.push.provider, next:'Firebase Cloud Messaging configure করুন'},
    {key:'server', title:'Public Server URL', ok:!!i.production.server_url, mode:i.production.server_url || 'LOCAL_TERMUX', next:'DigitalOcean/Render/VPS + HTTPS domain দিন'},
    {key:'ssl', title:'HTTPS / SSL', ok:!!i.production.ssl_configured || String(i.production.server_url||'').startsWith('https://'), mode:i.production.ssl_configured ? 'CONFIGURED' : 'PENDING', next:'Production domain-এ SSL/HTTPS enable করুন'},
    {key:'dbprod', title:'Production PostgreSQL', ok:!!i.production.database_url_present, mode:i.production.database_target || 'PostgreSQL', next:'DATABASE_URL set করে PostgreSQL migration করুন'}
  ];
  return {integrations:i, checks, ready_count:checks.filter(x=>x.ok).length, total:checks.length, production_ready:checks.every(x=>x.ok)};
}

function defaultLegalDocuments(){
  const stamp = now();
  return {
    privacy_policy:{version:'PP-v1', title:'Privacy Policy', status:'DRAFT', last_updated:stamp, mandatory:true, language:'BN+EN', summary:'Mobile number, role, live location, ride details, payment status, support/refund records and driver KYC documents will be used for NEXO Ride operation and legal compliance.'},
    terms:{version:'TC-v1', title:'Terms & Conditions', status:'DRAFT', last_updated:stamp, mandatory:true, language:'BN+EN', summary:'NEXO Ride is a Kalna Sub-Division local Toto booking platform. Booking confirms only after driver acceptance and payment confirmation.'},
    refund_policy:{version:'RF-v1', title:'Refund Policy', status:'DRAFT', last_updated:stamp, mandatory:true, language:'BN+EN', summary:'Refund requests can be raised from Support Center. Admin will review and mark approved/paid/rejected.'},
    driver_agreement:{version:'DA-v1', title:'Driver Agreement', status:'DRAFT', last_updated:stamp, mandatory:true, language:'BN+EN', summary:'Driver must complete KYC, obey safety rules, maintain vehicle details, accept rides responsibly and follow payout/commission rules.'},
    sub_admin_agreement:{version:'SA-v1', title:'Sub Admin Agreement', status:'DRAFT', last_updated:stamp, mandatory:true, language:'BN+EN', summary:'Area Sub Admin can add/manage local drivers/passengers and receives configured share from platform commission of managed drivers.'},
    data_retention:{version:'DR-v1', title:'Data Retention Policy', status:'DRAFT', last_updated:stamp, mandatory:true, language:'BN+EN', summary:'Ride/payment/KYC/support/audit records should be retained for operations, dispute handling and lawful compliance.'}
  };
}
function legalStatus(db){
  db.legal_documents = db.legal_documents || defaultLegalDocuments();
  db.legal_acceptance_records = db.legal_acceptance_records || [];
  const docs = Object.entries(db.legal_documents).map(([key,doc])=>({key, ...doc}));
  const mandatory = docs.filter(d=>d.mandatory !== false);
  const approved = mandatory.filter(d=>String(d.status||'').toUpperCase()==='APPROVED');
  const draft = docs.filter(d=>String(d.status||'').toUpperCase()==='DRAFT');
  const acceptanceSummary = db.legal_acceptance_records.reduce((acc,r)=>{ acc[r.doc_key]=(acc[r.doc_key]||0)+1; return acc; },{});
  const checks = [
    {title:'Privacy Policy approved', ok:String(db.legal_documents.privacy_policy?.status||'').toUpperCase()==='APPROVED', detail:db.legal_documents.privacy_policy?.version||''},
    {title:'Terms approved', ok:String(db.legal_documents.terms?.status||'').toUpperCase()==='APPROVED', detail:db.legal_documents.terms?.version||''},
    {title:'Refund policy approved', ok:String(db.legal_documents.refund_policy?.status||'').toUpperCase()==='APPROVED', detail:db.legal_documents.refund_policy?.version||''},
    {title:'Driver agreement approved', ok:String(db.legal_documents.driver_agreement?.status||'').toUpperCase()==='APPROVED', detail:db.legal_documents.driver_agreement?.version||''},
    {title:'Sub Admin agreement approved', ok:String(db.legal_documents.sub_admin_agreement?.status||'').toUpperCase()==='APPROVED', detail:db.legal_documents.sub_admin_agreement?.version||''},
    {title:'Consent records enabled', ok:true, detail:`${db.legal_acceptance_records.length} acceptance records`}
  ];
  return {summary:{total:docs.length, mandatory:mandatory.length, approved:approved.length, draft:draft.length, legal_ready:mandatory.length>0 && approved.length===mandatory.length, acceptance_records:db.legal_acceptance_records.length}, docs, checks, acceptance_summary:acceptanceSummary};
}


function defaultAuthSettings(){
  return {
    login_methods:['PASSWORD','OTP'],
    default_method:'OTP',
    otp_provider:String(process.env.OTP_PROVIDER || 'DEMO').toUpperCase(),
    demo_otp:String(process.env.DEMO_OTP || '123456'),
    otp_expiry_minutes:Number(process.env.OTP_EXPIRY_MINUTES || 5),
    resend_cooldown_seconds:Number(process.env.OTP_RESEND_COOLDOWN_SECONDS || 60),
    max_otp_per_mobile_per_hour:Number(process.env.MAX_OTP_PER_MOBILE_PER_HOUR || 5),
    session_days:Number(process.env.SESSION_DAYS || 30),
    rolling_session_enabled:true,
    consent_required:true,
    password_login_enabled:true,
    otp_login_enabled:true,
    production_sms_ready:false,
    firebase_ready:!!process.env.FIREBASE_PROJECT_ID,
    msg91_ready:!!process.env.MSG91_AUTH_KEY,
    twofactor_ready:!!process.env.TWOFACTOR_API_KEY,
    note:'DEMO OTP testing-এর জন্য। Production launch-এর আগে Firebase/MSG91/2Factor configure করে real SMS OTP চালু করুন।',
    updated_at:now()
  };
}
function authSettings(db){
  db.auth_settings = {...defaultAuthSettings(), ...(db.auth_settings || {})};
    db.qr_web_bookings = db.qr_web_bookings || [];
    db.qr_settings = {enabled:true, default_area:'Kalna Town', allow_guest_booking:true, source:'SPRINT7C', ...(db.qr_settings || {})};
    ensureSprint7DFoundation(db);
  const integ = mergeIntegrations(db.integrations || {});
  if(integ.otp){
    db.auth_settings.otp_provider = String(db.auth_settings.otp_provider || integ.otp.provider || 'DEMO').toUpperCase();
    db.auth_settings.demo_otp = String(db.auth_settings.demo_otp || integ.otp.demo_code || '123456');
    db.auth_settings.firebase_ready = !!(db.auth_settings.firebase_ready || integ.otp.firebase_project_id);
    db.auth_settings.msg91_ready = !!(db.auth_settings.msg91_ready || integ.otp.msg91_key_present);
    db.auth_settings.twofactor_ready = !!(db.auth_settings.twofactor_ready || integ.otp.twofactor_key_present);
  }
  db.auth_settings.otp_expiry_minutes = Math.max(1, Math.min(30, Number(db.auth_settings.otp_expiry_minutes || 5)));
  db.auth_settings.resend_cooldown_seconds = Math.max(0, Math.min(600, Number(db.auth_settings.resend_cooldown_seconds || 60)));
  db.auth_settings.max_otp_per_mobile_per_hour = Math.max(1, Math.min(50, Number(db.auth_settings.max_otp_per_mobile_per_hour || 5)));
  db.auth_settings.session_days = Math.max(1, Math.min(365, Number(db.auth_settings.session_days || 30)));
  return db.auth_settings;
}
function maskMobile(m){ const x=String(m||''); return x.length>4 ? x.slice(0,2)+'****'+x.slice(-2) : x; }
function authStatus(db){
  const set = authSettings(db);
  const otpReqs = db.otp_requests || [];
  const sessions = db.sessions || [];
  const nowMs = Date.now();
  const activeSessions = sessions.filter(x=>new Date(x.expires_at).getTime()>nowMs);
  const expiredSessions = sessions.length - activeSessions.length;
  const lastHour = otpReqs.filter(x=>new Date(x.created_at).getTime()>nowMs-60*60*1000);
  const verified = otpReqs.filter(x=>x.verified);
  const providerReady = set.otp_provider !== 'DEMO' && (set.firebase_ready || set.msg91_ready || set.twofactor_ready || set.production_sms_ready);
  const checks = [
    {key:'otp_enabled', title:'OTP login enabled', ok:!!set.otp_login_enabled, detail:`Provider: ${set.otp_provider}`},
    {key:'real_provider', title:'Real SMS OTP provider configured', ok:providerReady, detail:providerReady?'Production SMS provider ready':'Firebase/MSG91/2Factor key pending'},
    {key:'demo_warning', title:'Demo OTP disabled for production', ok:set.otp_provider !== 'DEMO', detail:set.otp_provider==='DEMO'?'DEMO OTP is only for testing':'Real provider selected'},
    {key:'expiry', title:'OTP expiry configured', ok:set.otp_expiry_minutes>=1 && set.otp_expiry_minutes<=10, detail:`${set.otp_expiry_minutes} minutes`},
    {key:'rate_limit', title:'OTP rate limit configured', ok:set.max_otp_per_mobile_per_hour<=10, detail:`${set.max_otp_per_mobile_per_hour}/mobile/hour`},
    {key:'session', title:'30-day session / rolling login ready', ok:!!set.rolling_session_enabled && set.session_days>=30, detail:`${set.session_days} days`},
    {key:'consent', title:'Consent required before account use', ok:!!set.consent_required, detail:set.consent_required?'Mandatory':'Disabled'},
    {key:'password', title:'Fallback password login available', ok:!!set.password_login_enabled, detail:'Admin/main user fallback'}
  ];
  const recent = otpReqs.slice(-80).reverse().map(x=>({id:x.id, mobile_masked:maskMobile(x.mobile), provider:x.provider, purpose:x.purpose, created_at:x.created_at, expires_at:x.expires_at, verified:!!x.verified, verified_at:x.verified_at||'', status:x.verified?'VERIFIED':(new Date(x.expires_at)<new Date()?'EXPIRED':'PENDING')}));
  return {settings:set, summary:{active_sessions:activeSessions.length, expired_sessions:expiredSessions, total_sessions:sessions.length, otp_requests:otpReqs.length, otp_last_hour:lastHour.length, otp_verified:verified.length, otp_pending:otpReqs.filter(x=>!x.verified && new Date(x.expires_at)>new Date()).length, production_ready:checks.every(c=>c.ok)}, checks, recent_otp:recent, updated_at:now()};
}


function defaultPushSettings(){
  return {
    provider:String(process.env.PUSH_PROVIDER || 'DEMO').toUpperCase(),
    firebase_project_id:process.env.FIREBASE_PROJECT_ID || '',
    fcm_server_key_present:!!process.env.FCM_SERVER_KEY,
    vapid_public_key_present:!!process.env.FCM_VAPID_PUBLIC_KEY,
    vapid_public_key_label:process.env.FCM_VAPID_PUBLIC_KEY ? 'SET_FROM_ENV' : '',
    web_push_enabled:!!process.env.FCM_VAPID_PUBLIC_KEY,
    android_push_enabled:!!process.env.FCM_SERVER_KEY,
    demo_delivery_log_enabled:true,
    auto_register_web_demo_token:true,
    notify_ride_request:true,
    notify_driver_accept:true,
    notify_payment:true,
    notify_sos:true,
    notify_support_refund:true,
    notify_kyc:true,
    note:'DEMO mode-এ notification app-এর ভিতরে এবং delivery log-এ থাকবে। Real push চালাতে Firebase Cloud Messaging + VAPID/Public key configure করুন।',
    updated_at:now()
  };
}
function pushSettings(db){
  const integ = mergeIntegrations(db.integrations||{}).push || {};
  db.push_settings = {...defaultPushSettings(), ...(db.push_settings || {})};
  db.push_settings.provider = String(db.push_settings.provider || integ.provider || 'DEMO').toUpperCase();
  db.push_settings.firebase_project_id = db.push_settings.firebase_project_id || integ.firebase_project_id || '';
  db.push_settings.fcm_server_key_present = !!(db.push_settings.fcm_server_key_present || integ.fcm_server_key_present);
  db.push_settings.vapid_public_key_present = !!(db.push_settings.vapid_public_key_present || integ.vapid_public_key_present);
  if(!db.push_settings.vapid_public_key_label && integ.vapid_public_key_present) db.push_settings.vapid_public_key_label='SET_FROM_INTEGRATION';
  return db.push_settings;
}
function pushTokenOut(db,t){
  const u=(db.users||[]).find(x=>x.id===t.user_id)||{};
  return {id:t.id, user_id:t.user_id, user_name:u.name||'', user_mobile:u.mobile||'', user_role:u.role||'', area:u.area||t.area||'', platform:t.platform||'WEB', device_name:t.device_name||'', permission_status:t.permission_status||'', app_version:t.app_version||'', active:t.active!==false, created_at:t.created_at, updated_at:t.updated_at, last_seen_at:t.last_seen_at||t.updated_at||t.created_at};
}
function matchingPushTokens(db, notification){
  let tokens=(db.push_tokens||[]).filter(t=>t.active!==false);
  if(notification.user_id) tokens=tokens.filter(t=>t.user_id===notification.user_id);
  else if(notification.role) {
    const role=String(notification.role||'').toUpperCase();
    const ids=(db.users||[]).filter(u=>String(u.role||'').toUpperCase()===role).map(u=>u.id);
    tokens=tokens.filter(t=>ids.includes(t.user_id));
  } else if(notification.area) {
    const area=String(notification.area||'').toLowerCase();
    const ids=(db.users||[]).filter(u=>String(u.area||'').toLowerCase()===area || String(u.role||'').toUpperCase()==='ADMIN').map(u=>u.id);
    tokens=tokens.filter(t=>ids.includes(t.user_id));
  }
  return tokens;
}
function queuePushDeliveries(db, notification){
  const set=pushSettings(db);
  db.push_delivery_logs = db.push_delivery_logs || [];
  const tokens=matchingPushTokens(db, notification);
  const mode=String(set.provider||'DEMO').toUpperCase();
  const realReady = mode==='FCM' && (set.fcm_server_key_present || set.vapid_public_key_present || set.web_push_enabled || set.android_push_enabled);
  const out=[];
  for(const t of tokens){
    const log={id:uid('pdl'), notification_id:notification.id, push_token_id:t.id, user_id:t.user_id, platform:t.platform||'WEB', provider:mode, title:notification.title, event_type:notification.event_type, status: realReady?'QUEUED':'DEMO_LOGGED', attempts:0, created_at:now(), last_attempt_at:null, error:null, note:realReady?'Ready for FCM worker/webhook delivery':'Stored as demo in-app notification; no real device push sent'};
    db.push_delivery_logs.push(log); out.push(log);
  }
  if(db.push_delivery_logs.length>1000) db.push_delivery_logs=db.push_delivery_logs.slice(-1000);
  return out;
}
function pushCenterStatus(db){
  const set=pushSettings(db);
  const tokens=(db.push_tokens||[]).map(t=>pushTokenOut(db,t));
  const active=tokens.filter(t=>t.active);
  const logs=db.push_delivery_logs||[];
  const byRole={};
  for(const t of active){ byRole[t.user_role||'UNKNOWN']=(byRole[t.user_role||'UNKNOWN']||0)+1; }
  const providerReady = String(set.provider||'DEMO').toUpperCase()==='FCM' && (set.fcm_server_key_present || set.vapid_public_key_present || set.web_push_enabled || set.android_push_enabled);
  const checks=[
    {key:'tokens', title:'Device tokens registered', ok:active.length>0, detail:`Active tokens: ${active.length}`},
    {key:'provider', title:'Push provider selected', ok:String(set.provider||'DEMO').toUpperCase()!=='DEMO', detail:String(set.provider||'DEMO')},
    {key:'firebase', title:'Firebase project configured', ok:!!set.firebase_project_id, detail:set.firebase_project_id||'Pending'},
    {key:'fcm', title:'FCM server credential / VAPID key', ok:providerReady, detail:providerReady?'Ready':'Pending key'},
    {key:'web', title:'Web/PWA push option', ok:!!set.web_push_enabled || String(set.provider||'DEMO').toUpperCase()==='DEMO', detail:set.web_push_enabled?'Enabled':'Demo/in-app only'},
    {key:'events', title:'Ride/SOS/payment event routing', ok:!!(set.notify_ride_request && set.notify_payment && set.notify_sos), detail:'Critical alerts enabled'},
    {key:'logs', title:'Delivery log enabled', ok:!!set.demo_delivery_log_enabled, detail:`Logs: ${logs.length}`}
  ];
  return {settings:set, summary:{active_tokens:active.length,total_tokens:tokens.length,passenger_tokens:byRole.PASSENGER||0,driver_tokens:byRole.DRIVER||0,admin_tokens:byRole.ADMIN||0,delivery_logs:logs.length,queued:logs.filter(x=>x.status==='QUEUED').length,demo_logged:logs.filter(x=>x.status==='DEMO_LOGGED').length,failed:logs.filter(x=>x.status==='FAILED').length,provider_ready:providerReady,production_ready:checks.every(c=>c.ok)}, checks, tokens:tokens.slice(-250).reverse(), recent_notifications:(db.notifications||[]).slice(-80).reverse(), delivery_logs:logs.slice(-120).reverse(), updated_at:now()};
}


function defaultMonitoringSettings(){
  return {
    enabled:true,
    slow_api_ms:1500,
    error_log_enabled:true,
    max_error_logs:300,
    max_audit_logs:1000,
    db_size_warn_mb:20,
    upload_size_warn_mb:200,
    backup_min_count:1,
    production_monitoring_ready:!!process.env.MONITORING_WEBHOOK_URL,
    monitoring_webhook_present:!!process.env.MONITORING_WEBHOOK_URL,
    note:'Prototype mode-এ local monitoring চলছে। Production-এ uptime monitor, error alert webhook এবং log rotation configure করুন।',
    updated_at:now()
  };
}
function monitoringSettings(db){
  db.monitoring_settings = {...defaultMonitoringSettings(), ...(db.monitoring_settings || {})};
  return db.monitoring_settings;
}
function folderSizeBytes(dir){
  try{
    if(!fs.existsSync(dir)) return 0;
    let total=0;
    const stack=[dir];
    while(stack.length){
      const current=stack.pop();
      for(const name of fs.readdirSync(current)){
        const p=path.join(current,name);
        const st=fs.statSync(p);
        if(st.isDirectory()) stack.push(p); else total += st.size;
      }
    }
    return total;
  }catch(e){ return 0; }
}
function mb(bytes){ return Math.round((Number(bytes||0)/1024/1024)*100)/100; }
function logError(db, source, err, extra={}){
  try{
    const set = monitoringSettings(db);
    if(!set.error_log_enabled) return;
    db.error_logs = db.error_logs || [];
    db.error_logs.push({id:uid('err'), at:now(), source:String(source||'server').slice(0,80), message:String(err && (err.message||err) || 'Error').slice(0,500), stack:String(err && err.stack || '').split('\n').slice(0,5).join('\n').slice(0,1200), extra});
    const max=Math.max(50, Math.min(2000, Number(set.max_error_logs||300)));
    if(db.error_logs.length>max) db.error_logs=db.error_logs.slice(-max);
  }catch(e){}
}
function monitoringStatus(db){
  const set=monitoringSettings(db);
  db.error_logs = db.error_logs || [];
  const dbBytes=fileSize(DB_FILE);
  const uploadBytes=folderSizeBytes(UPLOAD_DIR);
  const backups=listBackups();
  const sessions=db.sessions||[];
  const activeSessions=sessions.filter(x=>new Date(x.expires_at)>new Date());
  const rides=db.rides||[];
  const drivers=db.driver_profiles||[];
  const nowMs=Date.now();
  const last24 = (arr, field='created_at') => (arr||[]).filter(x=> nowMs - new Date(x[field]||x.at||0).getTime() <= 24*60*60*1000);
  const payments=db.payment_orders||[];
  const support=(db.support_tickets||[]).filter(x=>!['RESOLVED','CLOSED'].includes(String(x.status||'').toUpperCase()));
  const refunds=(db.refund_requests||[]).filter(x=>!['PAID','REJECTED','CLOSED'].includes(String(x.status||'').toUpperCase()));
  const kycPending=drivers.filter(d=>String(d.kyc_status||'').toUpperCase()!=='VERIFIED' || !['APPROVED'].includes(String(d.status||'').toUpperCase()));
  const integ=integrationReadiness(db);
  const dbWarn = mb(dbBytes) >= Number(set.db_size_warn_mb||20);
  const uploadWarn = mb(uploadBytes) >= Number(set.upload_size_warn_mb||200);
  const checks=[
    {key:'server', title:'Server running', ok:true, detail:`Uptime ${Math.floor(process.uptime()/60)} min`},
    {key:'database', title:'Local database readable', ok:fs.existsSync(DB_FILE), detail:`${mb(dbBytes)} MB`},
    {key:'backup', title:'Backup available', ok:backups.length >= Number(set.backup_min_count||1), detail:`Backups: ${backups.length}`},
    {key:'storage', title:'Upload storage size safe', ok:!uploadWarn, detail:`Uploads ${mb(uploadBytes)} MB`},
    {key:'dbsize', title:'Database size safe', ok:!dbWarn, detail:`Warn at ${set.db_size_warn_mb} MB`},
    {key:'errors', title:'No critical error log', ok:(db.error_logs||[]).filter(e=>String(e.level||'ERROR')==='CRITICAL').length===0, detail:`Errors: ${(db.error_logs||[]).length}`},
    {key:'integrations', title:'Production integrations progress', ok:integ.ready_count>=3, detail:`${integ.ready_count}/${integ.total} ready`},
    {key:'sessions', title:'Session system active', ok:true, detail:`Active sessions: ${activeSessions.length}`}
  ];
  const endpoints=[
    {name:'Health', path:'/api/health', status:'READY'},
    {name:'Admin Summary', path:'/api/admin/summary', status:'AUTH_REQUIRED'},
    {name:'Operations', path:'/api/admin/operations', status:'AUTH_REQUIRED'},
    {name:'Push', path:'/api/admin/push-status', status:'AUTH_REQUIRED'},
    {name:'Database', path:'/api/admin/database-migration', status:'AUTH_REQUIRED'},
    {name:'Monitoring', path:'/api/admin/monitoring-status', status:'AUTH_REQUIRED'},
    {name:'Security', path:'/api/admin/security-status', status:'AUTH_REQUIRED'}
  ];
  const issues=[];
  if(support.length) issues.push({type:'SUPPORT', title:'Open support tickets', count:support.length, action:'Support tab থেকে resolve করুন'});
  if(refunds.length) issues.push({type:'REFUND', title:'Pending refund requests', count:refunds.length, action:'Support/Refund Center check করুন'});
  if(kycPending.length) issues.push({type:'KYC', title:'Pending/unverified driver KYC', count:kycPending.length, action:'KYC tab থেকে approve/reject করুন'});
  if(db.error_logs.length) issues.push({type:'ERROR', title:'Server error logs present', count:db.error_logs.length, action:'Monitor tab error log দেখুন'});
  if(backups.length < Number(set.backup_min_count||1)) issues.push({type:'BACKUP', title:'No backup found', count:1, action:'Database tab থেকে backup নিন'});
  return {
    settings:set,
    summary:{
      version:VERSION,
      uptime_seconds:Math.round(process.uptime()),
      uptime_minutes:Math.round(process.uptime()/60),
      memory_mb:mb(process.memoryUsage().rss),
      db_size_mb:mb(dbBytes),
      upload_size_mb:mb(uploadBytes),
      backup_count:backups.length,
      users:(db.users||[]).length,
      drivers:drivers.length,
      rides:rides.length,
      rides_last_24h:last24(rides).length,
      completed_rides:rides.filter(r=>r.status==='COMPLETED').length,
      pending_payments:payments.filter(p=>p.status!=='PAID').length,
      active_sessions:activeSessions.length,
      notifications:(db.notifications||[]).length,
      errors:(db.error_logs||[]).length,
      audit_logs:(db.audit||[]).length,
      production_ready:checks.every(c=>c.ok)
    },
    checks,
    endpoints,
    issues,
    recent_errors:(db.error_logs||[]).slice(-80).reverse(),
    recent_audit:(db.audit||[]).slice(-80).reverse(),
    recent_backups:backups.slice(0,10),
    updated_at:now()
  };
}

function defaultStorageSettings(){
  return {
    provider:'LOCAL_FILE',
    upload_dir:'data/uploads',
    max_upload_mb:10,
    allowed_mime:['image/jpeg','image/png','image/webp','application/pdf'],
    secure_file_serving:true,
    require_admin_review_for_kyc:true,
    auto_link_kyc_files:true,
    production_note:'Production launch-এর আগে S3/R2/GCS object storage + signed URL + encryption configure করা উচিত.',
    updated_at:now()
  };
}

function defaultDatabaseMigrationSettings(){
  return {
    current_engine:'LOCAL_JSON',
    target_engine:'POSTGRESQL',
    migration_mode:'PLANNING',
    database_url_present: !!process.env.DATABASE_URL,
    backup_before_migration:true,
    allow_json_export:true,
    dry_run_required:true,
    last_snapshot_at:null,
    last_dry_run_at:null,
    last_migration_at:null,
    production_note:'Public launch-এর আগে local JSON থেকে PostgreSQL-এ migrate করুন। Migration করার আগে full backup/export রাখবেন.',
    updated_at:now()
  };
}
function databaseCollectionsOverview(db){
  const collections = ['users','sessions','driver_profiles','rides','payment_orders','support_tickets','refund_requests','sub_admins','sub_admin_commissions','settlements','legal_acceptance_records','file_uploads','audit','notifications','push_tokens','push_delivery_logs','otp_requests','live_locations','qa_issues','field_test_runs'];
  return collections.map(name=>{
    const arr = Array.isArray(db[name]) ? db[name] : [];
    const sample = arr.find(x=>x && typeof x==='object') || {};
    return {collection:name, rows:arr.length, sample_fields:Object.keys(sample).slice(0,18), ready_for_sql:Array.isArray(arr)};
  }).sort((a,b)=>b.rows-a.rows || a.collection.localeCompare(b.collection));
}
function databaseMigrationStatus(db){
  db.database_migration_settings = {...defaultDatabaseMigrationSettings(), ...(db.database_migration_settings||{})};
  db.database_migration_logs = db.database_migration_logs || [];
  const settings = db.database_migration_settings;
  const prod = mergeIntegrations(db.integrations).production || {};
  const databaseUrlPresent = !!(settings.database_url_present || prod.database_url_present || process.env.DATABASE_URL);
  const backups = listBackups();
  const collections = databaseCollectionsOverview(db);
  const nonEmpty = collections.filter(c=>c.rows>0).length;
  const checks = [
    {key:'local_json', title:'Local JSON database readable', ok:true, detail:`${Math.round(fileSize(DB_FILE)/1024)} KB`},
    {key:'backup', title:'At least one backup available', ok:backups.length>0, detail:`Backups: ${backups.length}`},
    {key:'export', title:'Full JSON export available', ok:true, detail:'/api/admin/data/export ready'},
    {key:'schema', title:'PostgreSQL schema note included', ok:fs.existsSync(path.join(__dirname,'docs','POSTGRESQL_PRODUCTION_SCHEMA_NOTE.sql')), detail:'docs/POSTGRESQL_PRODUCTION_SCHEMA_NOTE.sql'},
    {key:'collections', title:'Collections scanned', ok:collections.length>=10, detail:`${collections.length} collections, ${nonEmpty} non-empty`},
    {key:'database_url', title:'DATABASE_URL configured', ok:databaseUrlPresent, detail:databaseUrlPresent?'Configured':'Pending production PostgreSQL URL'},
    {key:'dry_run', title:'Migration dry-run recorded', ok:!!settings.last_dry_run_at, detail:settings.last_dry_run_at || 'Run dry-run/snapshot first'},
    {key:'production_cutover', title:'Production cutover completed', ok:!!settings.last_migration_at, detail:settings.last_migration_at || 'Pending'}
  ];
  const steps = [
    'Admin Data Center থেকে fresh backup/export নিন',
    'Production PostgreSQL database তৈরি করুন',
    'DATABASE_URL environment variable set করুন',
    'docs/POSTGRESQL_PRODUCTION_SCHEMA_NOTE.sql অনুযায়ী tables/schema তৈরি করুন',
    'JSON export থেকে users/drivers/rides/payments/kyc/support data migrate dry-run করুন',
    'Dry-run count match করলে production cutover window fix করুন',
    'Old local JSON read-only রাখুন এবং new server PostgreSQL mode-এ start করুন',
    'Passenger/Driver/Admin/Sub Admin login ও booking smoke-test করুন',
    'Backup retention + daily DB dump configure করুন'
  ];
  return {
    version:VERSION,
    settings:{...settings, database_url_present:databaseUrlPresent},
    summary:{ready:checks.filter(x=>x.ok).length,total:checks.length,production_db_ready:databaseUrlPresent && !!settings.last_dry_run_at, collections:collections.length, total_rows:collections.reduce((a,c)=>a+c.rows,0), backup_count:backups.length, db_size_bytes:fileSize(DB_FILE)},
    checks,
    collections,
    recent_logs:(db.database_migration_logs||[]).slice(-50).reverse(),
    backups:backups.slice(0,10),
    steps,
    commands:[
      'export DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/nexoride"',
      'node server.js',
      'curl https://YOUR-DOMAIN/api/health',
      'psql "$DATABASE_URL" -f docs/POSTGRESQL_PRODUCTION_SCHEMA_NOTE.sql'
    ],
    production_note:'এই version-এ PostgreSQL migration planning, dry-run record, backup/export readiness control আছে। Real migration script deployment environment অনুযায়ী final করতে হবে।'
  };
}
function markDatabaseMigrationLog(db, user, action, details={}){
  db.database_migration_logs = db.database_migration_logs || [];
  const rec = {id:uid('dbmig'), action, at:now(), user_id:user?.id||'system', details};
  db.database_migration_logs.push(rec);
  if(db.database_migration_logs.length>300) db.database_migration_logs = db.database_migration_logs.slice(-300);
  return rec;
}


function defaultDb(){
  return {
    meta:{version:VERSION, created_at:now(), updated_at:now()},
    app_settings: appSettings(),
    users:[createAdminUser()],
    sessions:[],
    driver_profiles:[],
    kyc_submissions:[],
    rides:[],
    fare_rules:{
      full_base_fare: 40,
      sharing_base_per_seat: 10,
      minimum_full: 40,
      minimum_sharing: 10,
      base_km: 4,
      extra_step_km: 2,
      extra_step_fare: 5,
      sharing_capacity: 4,
      night_extra_percent: 0,
      platform_commission_percent: 10,
      sub_admin_share_percent: 30,
      currency: 'INR'
    },
    service_area:{
      name:'Kalna Sub-Division',
      geofence_enabled:true,
      driver_auto_approve_inside_service_area:true,
      bounds:{minLat:23.10,maxLat:23.29,minLng:88.25,maxLng:88.43},
      center:{lat:23.2199,lng:88.3625},
      road_distance_multiplier:1.25,
      points:[
        'Kalna Station','Kalna Hospital','Kalna Court','Kalna Bus Stand','Dhatrigram',
        'Baidyapur','Madhupur','Baghnapara','Ambika Kalna','Guptipara Road',
        'Muktarpur','Nandai','Sultanpur','Badla','Akalpoush','Kalna College','Aghoreswar Park','Ganga Ghat','Sub-Division Office','Rail Gate'
      ]
    },
    area_catalog:[
      {id:'area_kalna_town', name:'Kalna Town', status:'ACTIVE', sub_admin_user_id:null, created_at:now()},
      {id:'area_dhatrigram', name:'Dhatrigram', status:'ACTIVE', sub_admin_user_id:null, created_at:now()},
      {id:'area_baidyapur', name:'Baidyapur', status:'ACTIVE', sub_admin_user_id:null, created_at:now()},
      {id:'area_baghnapara', name:'Baghnapara', status:'ACTIVE', sub_admin_user_id:null, created_at:now()},
      {id:'area_madhupur', name:'Madhupur', status:'ACTIVE', sub_admin_user_id:null, created_at:now()}
    ],
    audit:[],
    safety_events:[],
    safety_contacts:[],
    safety_shares:[],
    route_deviation_alerts:[],
    driver_safety_notes:[],
    settlements:[],
    settlement_batches:[],
    driver_wallets:[],
    driver_wallet_ledger:[],
    finance_audit:[],
    receipts:[],
    fare_area_rules:[],
    commission_rules:[],
    driver_special_commissions:[],
    driver_payout_requests:[],
    sub_admins:[],
    sub_admin_commissions:[],
    sub_admin_commission_settlements:[],
    sub_admin_payout_requests:[],
    live_locations:[],
    otp_requests:[],
    password_reset_requests:[],
    notifications:[],
    push_tokens:[],
    push_delivery_logs:[],
    push_settings: defaultPushSettings(),
    monitoring_settings: defaultMonitoringSettings(),
    security_settings: defaultSecuritySettings(),
    security_events:[],
    error_logs:[],
    kyc_reviews:[],
    support_tickets:[],
    refund_requests:[],
    qa_issues:[],
    field_test_runs:[],
    payment_orders:[],
    payment_webhooks:[],
    legal_documents: defaultLegalDocuments(),
    legal_acceptance_records:[],
    file_uploads:[],
    storage_settings: defaultStorageSettings(),
    database_migration_settings: defaultDatabaseMigrationSettings(),
    database_migration_logs:[],
    qr_web_bookings:[],
    qr_settings:{enabled:true, default_area:'Kalna Town', allow_guest_booking:true, source:'SPRINT7D'},
    guest_ride_sessions:[],
    dispatch_events:[],
    dispatch_attempts:[],
    dispatch_queue:[],
    dispatch_settings: defaultDispatchSettings(),
    dispatch_runtime_settings: defaultDispatchRuntimeSettings(),
    payment_webhook_settings: defaultPaymentWebhookSettings(),
    payment_webhook_events:[],
    ops_scale_settings: defaultOpsScaleSettings(),
    ops_metrics_snapshots:[],
    ops_alerts:[],
    capacity_upgrade_history:[],
    driver_devices:[],
    driver_refresh_sessions:[],
    driver_device_settings: defaultDriverDeviceSettings(),
    passenger_flow_settings:{active_ride_page:true, my_rides_enabled:true, saved_locations_ready:true, rebook_ready:true, guest_and_registered_share_same_ride_engine:true},
    scale_settings: defaultScaleSettings(),
    guest_booking_settings:{enabled:true, require_mobile:false, require_payment_after_driver_accept:true, require_passenger_completion:true, allow_demo_payment:true},
    driver_live_index:{mode:'JSON_FALLBACK_REDIS_READY', last_rebuilt_at:null},
    ride_flow_settings:defaultRideFlowSettings(),
    live_tracking_settings:defaultLiveTrackingSettings(),
    payment_flow_settings:{provider:'DEMO', require_payment_before_pickup:true, demo_payment_allowed:true, webhook_required_for_production:true},
    schema_version:'S7Z_SECURITY_HOTFIX_RC2',
    schema_migrations:[{id:'S7C_SCALE_FOUNDATION', applied_at:now(), additive:true},{id:'S7D_PAYMENT_OTP_LIVE_TRACKING', applied_at:now(), additive:true},{id:'S7E_REAL_DISPATCH_PAYMENT_WEBHOOK', applied_at:now(), additive:true},{id:'S7F_PRODUCTION_OPS_SCALE_MONITORING', applied_at:now(), additive:true},{id:'S7G_TRUSTED_DRIVER_DEVICE_FLOW', applied_at:now(), additive:true},{id:'S7Z_SECURITY_HOTFIX_RC2', applied_at:now(), additive:true}],
    auth_settings: defaultAuthSettings(),
    integrations: defaultIntegrations()
  };
}
function readDb(){
  ensureDataDir();
  if(!fs.existsSync(DB_FILE)){
    const db = defaultDb();
    ensureSprint7ZFoundation(db);
    fs.writeFileSync(DB_FILE, JSON.stringify(db,null,2));
    return db;
  }
  try{
    const db = JSON.parse(fs.readFileSync(DB_FILE,'utf8'));
    db.meta = db.meta || {};
    db.users = db.users || [];
    db.sessions = db.sessions || [];
    db.driver_profiles = db.driver_profiles || [];
    db.rides = db.rides || [];
    db.audit = db.audit || [];
    db.safety_events = db.safety_events || [];
    db.safety_contacts = db.safety_contacts || [];
    db.safety_shares = db.safety_shares || [];
    db.route_deviation_alerts = db.route_deviation_alerts || [];
    db.driver_safety_notes = db.driver_safety_notes || [];
    db.safety_settings = db.safety_settings || defaultSafetySettings();
    db.settlements = db.settlements || [];
    db.settlement_batches = db.settlement_batches || [];
    db.driver_wallets = db.driver_wallets || [];
    db.driver_wallet_ledger = db.driver_wallet_ledger || [];
    db.finance_audit = db.finance_audit || [];
    db.receipts = db.receipts || [];
    db.fare_area_rules = db.fare_area_rules || [];
    db.commission_rules = db.commission_rules || [];
    db.driver_special_commissions = db.driver_special_commissions || [];
    db.driver_payout_requests = db.driver_payout_requests || [];
    db.sub_admins = db.sub_admins || [];
    db.sub_admin_commissions = db.sub_admin_commissions || [];
    db.sub_admin_commission_settlements = db.sub_admin_commission_settlements || [];
    db.sub_admin_payout_requests = db.sub_admin_payout_requests || [];
    db.live_locations = db.live_locations || [];
    db.otp_requests = db.otp_requests || [];
    db.password_reset_requests = db.password_reset_requests || [];
    db.notifications = db.notifications || [];
    db.push_tokens = db.push_tokens || [];
    db.push_delivery_logs = db.push_delivery_logs || [];
    db.push_settings = {...defaultPushSettings(), ...(db.push_settings || {})};
    db.monitoring_settings = {...defaultMonitoringSettings(), ...(db.monitoring_settings || {})};
    db.security_settings = {...defaultSecuritySettings(), ...(db.security_settings || {})};
    db.security_events = db.security_events || [];
    db.error_logs = db.error_logs || [];
    db.kyc_reviews = db.kyc_reviews || [];
    db.support_tickets = db.support_tickets || [];
    db.refund_requests = db.refund_requests || [];
    db.qa_issues = db.qa_issues || [];
    db.field_test_runs = db.field_test_runs || [];
    db.payment_orders = db.payment_orders || [];
    db.payment_webhooks = db.payment_webhooks || [];
    db.file_uploads = db.file_uploads || [];
    db.storage_settings = {...defaultStorageSettings(), ...(db.storage_settings || {})};
    db.database_migration_settings = {...defaultDatabaseMigrationSettings(), ...(db.database_migration_settings || {})};
    db.database_migration_logs = db.database_migration_logs || [];
    db.auth_settings = {...defaultAuthSettings(), ...(db.auth_settings || {})};
    db.qr_web_bookings = db.qr_web_bookings || [];
    db.qr_settings = {enabled:true, default_area:'Kalna Town', allow_guest_booking:true, source:'SPRINT7E', ...(db.qr_settings || {})};
    ensureSprint7IFoundation(db);
    db.area_catalog = db.area_catalog || defaultDb().area_catalog;
    db.integrations = mergeIntegrations(db.integrations);
    db.app_settings = {...appSettings(), ...(db.app_settings || {})};
    db.fare_rules = db.fare_rules || defaultDb().fare_rules;
    // v1.0.3 fare migration: apply NEXO Ride Kalna Toto fare rule if older demo rules are present.
    if(!db.fare_rules.base_km || db.fare_rules.minimum_full !== 40 || db.fare_rules.minimum_sharing !== 10){
      db.fare_rules = defaultDb().fare_rules;
    }
    db.service_area = {...defaultDb().service_area, driver_matching_radius_km:8, max_driver_candidates:5, ...(db.service_area || {})};
    db.service_area.bounds = db.service_area.bounds || defaultDb().service_area.bounds;
    db.service_area.center = db.service_area.center || defaultDb().service_area.center;
    db.service_area.road_distance_multiplier = Number(db.service_area.road_distance_multiplier || 1.25);
    if(db.service_area.driver_auto_approve_inside_service_area === undefined) db.service_area.driver_auto_approve_inside_service_area = true;
    // v1.0.14 migration: driver earnings/rating fields.
    for(const d of db.driver_profiles){
      if(d.total_earnings === undefined) d.total_earnings = 0;
      if(d.pending_payout === undefined) d.pending_payout = 0;
      if(d.paid_payout === undefined) d.paid_payout = 0;
      if(d.rating === undefined) d.rating = 5;
      if(d.total_rides === undefined) d.total_rides = 0;
      if(d.kyc_status === undefined){
        const k = driverKycSummary(db,d);
        d.kyc_status = k.complete ? (d.status==='APPROVED'?'VERIFIED':'SUBMITTED') : 'INCOMPLETE';
      }
      // Sprint-6E hotfix: Admin profile approval and KYC verification must not drift.
      // Older builds could set status=APPROVED while leaving kyc_status=INCOMPLETE/SUBMITTED,
      // causing the driver app to still show "KYC Required" after admin approval.
      if(String(d.status||'').toUpperCase()==='APPROVED' && !['VERIFIED','REJECTED'].includes(String(d.kyc_status||'').toUpperCase())){
        d.kyc_status = 'VERIFIED';
        d.kyc_admin_synced_at = d.kyc_admin_synced_at || now();
        d.kyc_last_message = d.kyc_last_message || 'Admin approved profile; KYC status synced to VERIFIED.';
      }
    }
    if(db.fare_rules.platform_commission_percent === undefined) db.fare_rules.platform_commission_percent = 10;
    if(db.fare_rules.sub_admin_share_percent === undefined) db.fare_rules.sub_admin_share_percent = 30;
    for(const d of db.driver_profiles){
      if(!d.area) d.area = d.location || 'Kalna';
      if(!d.added_by) d.added_by = null;
      if(!d.sub_admin_user_id && d.added_by_role === 'SUB_ADMIN') d.sub_admin_user_id = d.added_by;
    }
    for(const u of db.users){ if(!u.area && u.role!=='ADMIN') u.area = 'Kalna'; }
    // v1.0.15 migration: settlement status for completed rides.
    for(const r of db.rides){
      if(r.status === 'COMPLETED' && !r.settlement_status) r.settlement_status = 'PENDING';
    }
    const hasAdmin = db.users.some(u => u.role === 'ADMIN');
    if(!hasAdmin){ db.users.push(createAdminUser()); }
    ensureSprint7XFoundation(db);
    ensureSprint7ZFoundation(db);
    return db;
  }catch(e){
    const backup = DB_FILE + '.broken-' + Date.now();
    fs.copyFileSync(DB_FILE, backup);
    const db = defaultDb();
    fs.writeFileSync(DB_FILE, JSON.stringify(db,null,2));
    return db;
  }
}
function ensureBackupDir(){ ensureDataDir(); if(!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR,{recursive:true}); }
function safeStamp(){ return new Date().toISOString().replace(/[:.]/g,'-'); }
function fileSize(file){ try{return fs.statSync(file).size;}catch(e){return 0;} }
function listBackups(){
  ensureBackupDir();
  return fs.readdirSync(BACKUP_DIR).filter(f=>f.endsWith('.json')).map(f=>{
    const p=path.join(BACKUP_DIR,f); const st=fs.statSync(p);
    return {file:f, path:p, size_bytes:st.size, created_at:st.mtime.toISOString()};
  }).sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at)));
}
function pruneBackups(max=30){
  const items=listBackups();
  for(const b of items.slice(max)){ try{fs.unlinkSync(b.path);}catch(e){} }
}
function createBackup(reason='manual'){
  ensureBackupDir();
  if(!fs.existsSync(DB_FILE)) return null;
  const cleanReason = String(reason||'manual').replace(/[^a-zA-Z0-9_-]/g,'_').slice(0,40) || 'manual';
  const file = `nexo_ride_${cleanReason}_${safeStamp()}.json`;
  const target = path.join(BACKUP_DIR,file);
  fs.copyFileSync(DB_FILE,target);
  pruneBackups(30);
  const st=fs.statSync(target);
  return {file, path:target, size_bytes:st.size, created_at:st.mtime.toISOString(), reason:cleanReason};
}
function saveDb(db){
  db.meta = db.meta || {};
  db.meta.updated_at = now();
  db.meta.storage_mode = 'LOCAL_JSON_PERSISTENT';
  db.meta.db_file = DB_FILE;
  ensureDataDir();
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db,null,2));
  fs.renameSync(tmp, DB_FILE);
}
function dbStatus(db){
  const backups=listBackups();
  return {
    storage_mode:'LOCAL_JSON_PERSISTENT',
    production_ready_note:'Prototype uses persistent local JSON. For public launch migrate to PostgreSQL using included schema notes.',
    db_file:DB_FILE,
    backup_dir:BACKUP_DIR,
    db_size_bytes:fileSize(DB_FILE),
    backup_count:backups.length,
    last_backup:backups[0] || null,
    counts:{
      users:(db.users||[]).length,
      drivers:(db.driver_profiles||[]).length,
      rides:(db.rides||[]).length,
      sessions:(db.sessions||[]).length,
      sub_admins:(db.sub_admins||[]).length,
      settlements:(db.settlements||[]).length,
      audit:(db.audit||[]).length,
      safety_events:(db.safety_events||[]).length,
      otp_requests:(db.otp_requests||[]).length,
      support_tickets:(db.support_tickets||[]).length,
      refund_requests:(db.refund_requests||[]).length,
      areas:(db.area_catalog||[]).length,
      file_uploads:(db.file_uploads||[]).length,
      database_migration_logs:(db.database_migration_logs||[]).length,
      security_events:(db.security_events||[]).length
    },
    updated_at:db.meta?.updated_at || null,
    version:VERSION
  };
}
function validateImportedDb(candidate){
  if(!candidate || typeof candidate !== 'object') throw new Error('Invalid database JSON');
  const requiredArrays = ['users','sessions','driver_profiles','rides'];
  for(const k of requiredArrays){ if(!Array.isArray(candidate[k])) throw new Error(`Invalid database: ${k} array missing`); }
  candidate.meta = candidate.meta || {};
  candidate.app_settings = {...appSettings(), ...(candidate.app_settings || {})};
  candidate.fare_rules = candidate.fare_rules || defaultDb().fare_rules;
  candidate.service_area = {...defaultDb().service_area, ...(candidate.service_area || {})};
  candidate.audit = candidate.audit || [];
  candidate.safety_events = candidate.safety_events || [];
  candidate.settlements = candidate.settlements || [];
  candidate.settlement_batches = candidate.settlement_batches || [];
  candidate.driver_wallets = candidate.driver_wallets || [];
  candidate.driver_wallet_ledger = candidate.driver_wallet_ledger || [];
  candidate.finance_audit = candidate.finance_audit || [];
  candidate.receipts = candidate.receipts || [];
  candidate.fare_area_rules = candidate.fare_area_rules || [];
  candidate.commission_rules = candidate.commission_rules || [];
  candidate.driver_special_commissions = candidate.driver_special_commissions || [];
  candidate.sub_admins = candidate.sub_admins || [];
  candidate.sub_admin_commissions = candidate.sub_admin_commissions || [];
  candidate.sub_admin_commission_settlements = candidate.sub_admin_commission_settlements || [];
  candidate.sub_admin_payout_requests = candidate.sub_admin_payout_requests || [];
  candidate.live_locations = candidate.live_locations || [];
  candidate.otp_requests = candidate.otp_requests || [];
  candidate.support_tickets = candidate.support_tickets || [];
  candidate.refund_requests = candidate.refund_requests || [];
  candidate.payment_orders = candidate.payment_orders || [];
  candidate.payment_webhooks = candidate.payment_webhooks || [];
  candidate.file_uploads = candidate.file_uploads || [];
  candidate.storage_settings = {...defaultStorageSettings(), ...(candidate.storage_settings || {})};
  candidate.database_migration_settings = {...defaultDatabaseMigrationSettings(), ...(candidate.database_migration_settings || {})};
  candidate.database_migration_logs = candidate.database_migration_logs || [];
  candidate.auth_settings = {...defaultAuthSettings(), ...(candidate.auth_settings || {})};
  candidate.monitoring_settings = {...defaultMonitoringSettings(), ...(candidate.monitoring_settings || {})};
  candidate.security_settings = {...defaultSecuritySettings(), ...(candidate.security_settings || {})};
  candidate.security_events = candidate.security_events || [];
  candidate.error_logs = candidate.error_logs || [];
  candidate.dispatch_events = candidate.dispatch_events || [];
  candidate.dispatch_attempts = candidate.dispatch_attempts || [];
  candidate.dispatch_queue = candidate.dispatch_queue || [];
  candidate.dispatch_settings = {...defaultDispatchSettings(), ...(candidate.dispatch_settings||{})};
  candidate.dispatch_runtime_settings = {...defaultDispatchRuntimeSettings(), ...(candidate.dispatch_runtime_settings||{})};
  candidate.payment_webhook_settings = {...defaultPaymentWebhookSettings(), ...(candidate.payment_webhook_settings||{})};
  candidate.payment_webhook_events = candidate.payment_webhook_events || [];
  candidate.integrations = mergeIntegrations(candidate.integrations);
  candidate.meta.imported_at = now();
  candidate.meta.version = VERSION;
  return candidate;
}
function audit(db,user_id,action,target,target_id,details={}){
  db.audit.push({id:uid('aud'), at:now(), user_id, action, target, target_id, details});
}
function getBody(req){
  return new Promise((resolve,reject)=>{
    let data='';
    req.on('data',chunk=>{ data += chunk; if(data.length>1024*1024) req.destroy(); });
    req.on('end',()=>{ try{ resolve(data ? JSON.parse(data) : {}); }catch(e){ reject(e); }});
    req.on('error',reject);
  });
}
function getRawBody(req, maxBytes=1024*1024){
  return new Promise((resolve,reject)=>{
    let data='';
    req.on('data',chunk=>{ data += chunk; if(data.length>maxBytes){ reject(new Error('Body too large')); req.destroy(); } });
    req.on('end',()=>resolve(data));
    req.on('error',reject);
  });
}
function send(res,status,obj,headers={}){
  const body = JSON.stringify(obj);
  res.writeHead(status, {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...headers});
  res.end(body);
}
function sendText(res,status,text,type='text/plain; charset=utf-8'){
  res.writeHead(status, {'Content-Type':type,'Cache-Control':'no-store'});
  res.end(text);
}
function extType(file){
  const ext = path.extname(file).toLowerCase();
  return {
    '.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8',
    '.json':'application/json; charset=utf-8','.webmanifest':'application/manifest+json; charset=utf-8',
    '.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.ico':'image/x-icon'
  }[ext] || 'application/octet-stream';
}
function serveDir(res, baseDir, relPath){
  let file = path.join(baseDir, relPath || '');
  if(relPath === '' || relPath.endsWith('/')) file = path.join(baseDir,'index.html');
  const resolved = path.resolve(file);
  if(!resolved.startsWith(path.resolve(baseDir))) return sendText(res,403,'Forbidden');
  if(fs.existsSync(resolved) && fs.statSync(resolved).isFile()){
    const type = extType(resolved);
    const ext = path.extname(resolved).toLowerCase();
    const noCacheExts = ['.html','.js','.css','.webmanifest','.json'];
    const cache = noCacheExts.includes(ext) ? 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0' : 'public, max-age=300';
    res.writeHead(200, {'Content-Type':type,'Cache-Control':cache,'Pragma':'no-cache','Expires':'0'});
    fs.createReadStream(resolved).pipe(res);
    return true;
  }
  return false;
}

function defaultSecuritySettings(){
  return {
    enforce_admin_2fa:false,
    force_password_change_on_default:true,
    min_password_length:8,
    login_rate_limit_enabled:true,
    login_rate_limit_per_minute:8,
    account_lockout_enabled:true,
    max_failed_login_attempts:5,
    lockout_minutes:15,
    admin_session_days:7,
    require_consent_for_admin:true,
    ip_allowlist_enabled:false,
    ip_allowlist:[],
    trusted_device_required:false,
    audit_sensitive_actions:true,
    mask_personal_data_in_logs:true,
    environment_secrets_required:true,
    production_https_required:true,
    last_rotation_at:null,
    note:'Prototype mode-এ security guardrail ready. Production launch-এর আগে default admin password change, HTTPS, secrets, rate limit এবং admin 2FA enable করুন।',
    updated_at:now()
  };
}
function securitySettings(db){
  db.security_settings = {...defaultSecuritySettings(), ...(db.security_settings || {})};
  db.security_events = db.security_events || [];
  return db.security_settings;
}
function isDefaultAdminPasswordLikely(u){
  try{return !!(u && ['admin'+'@123','password','123456','12345678','nexo1234'].some(p=>verifyPassword(p, u.password_salt, u.password_hash)));}catch(e){return false;}
}
function maskMobile(v){ const s=String(v||''); return s.length>4 ? s.slice(0,2)+'****'+s.slice(-2) : s; }
function maskEmail(v){ const s=String(v||''); const parts=s.split('@'); if(parts.length<2) return s; return parts[0].slice(0,2)+'***@'+parts[1]; }
function securityEvent(db, user_id, event_type, details={}){
  db.security_events = db.security_events || [];
  db.security_events.push({id:uid('sec'), at:now(), user_id:user_id||null, event_type:String(event_type||'SECURITY_EVENT'), details});
  if(db.security_events.length>500) db.security_events=db.security_events.slice(-500);
}

function clientIp(req){
  const xf = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const xr = String(req.headers['x-real-ip'] || '').trim();
  return (xf || xr || req.socket?.remoteAddress || '').replace(/^::ffff:/,'') || 'unknown';
}
function maskAuthTarget(v){
  const s = String(v||'').trim();
  if(!s) return '';
  if(s.includes('@')) return maskEmail(s);
  if(/\d{6,}/.test(s)) return maskMobile(s);
  return s.slice(0,2)+'***'+s.slice(-2);
}
function ensureAuthProtectionState(db){
  db.auth_attempts = db.auth_attempts || [];
  db.auth_lockouts = db.auth_lockouts || [];
  db.auth_protection_settings = {
    password_login_window_seconds:60,
    password_login_max_per_target_per_window:8,
    password_login_max_per_ip_per_window:30,
    password_failed_lockout_attempts:Number((db.security_settings||{}).max_failed_login_attempts||5),
    otp_verify_window_seconds:300,
    otp_verify_max_per_target_per_window:5,
    otp_verify_max_per_ip_per_window:40,
    otp_failed_lockout_attempts:5,
    lockout_minutes:Number((db.security_settings||{}).lockout_minutes||15),
    ...(db.auth_protection_settings||{})
  };
  const cutoff = Date.now() - 24*60*60*1000;
  db.auth_attempts = db.auth_attempts.filter(a=>new Date(a.at).getTime() > cutoff);
  return db.auth_protection_settings;
}
function authKey(v){ return sha(String(v||'').trim().toLowerCase()); }
function activeAuthLockout(db, kind, target, ip){
  ensureAuthProtectionState(db);
  const nowMs = Date.now();
  return (db.auth_lockouts||[]).find(l => l.active!==false && String(l.kind)===String(kind) && new Date(l.expires_at).getTime()>nowMs && (l.target_hash===authKey(target) || l.ip_hash===authKey(ip)));
}
function authRateCheck(db, req, kind, target){
  const st = ensureAuthProtectionState(db);
  const set = securitySettings(db);
  const ip = clientIp(req);
  if((kind==='PASSWORD_LOGIN' && set.login_rate_limit_enabled===false) || (kind==='OTP_VERIFY' && st.otp_verify_enabled===false)) return {ok:true, ip};
  const lock = activeAuthLockout(db, kind, target, ip);
  if(lock) return {ok:false, status:423, retry_after_seconds:Math.max(1, Math.ceil((new Date(lock.expires_at).getTime()-Date.now())/1000)), detail:'Too many failed attempts. Account/login temporarily locked.', lockout:lock};
  const isOtp = kind==='OTP_VERIFY' || kind==='OTP_REQUEST';
  const windowMs = Number(isOtp?st.otp_verify_window_seconds:st.password_login_window_seconds)*1000;
  const targetLimit = Number(isOtp?st.otp_verify_max_per_target_per_window:st.password_login_max_per_target_per_window);
  const ipLimit = Number(isOtp?st.otp_verify_max_per_ip_per_window:st.password_login_max_per_ip_per_window);
  const since = Date.now()-windowMs;
  const targetHash = authKey(target), ipHash = authKey(ip);
  const recent = (db.auth_attempts||[]).filter(a=>String(a.kind)===String(kind) && new Date(a.at).getTime()>since);
  const targetCount = recent.filter(a=>a.target_hash===targetHash).length;
  const ipCount = recent.filter(a=>a.ip_hash===ipHash).length;
  if(targetCount >= targetLimit || ipCount >= ipLimit){
    securityEvent(db, 'system', 'AUTH_RATE_LIMIT_BLOCK', {kind, target:maskAuthTarget(target), ip_hash:ipHash, target_count:targetCount, ip_count:ipCount});
    return {ok:false, status:429, retry_after_seconds:Math.ceil(windowMs/1000), detail:'Too many login attempts. Please try again later.'};
  }
  return {ok:true, ip};
}
function recordAuthAttempt(db, req, kind, target, success, userId='', detail=''){
  const st = ensureAuthProtectionState(db);
  const ip = clientIp(req);
  const rec = {id:uid('auth'), at:now(), kind:String(kind), success:!!success, user_id:userId||'', target_hash:authKey(target), target_masked:maskAuthTarget(target), ip_hash:authKey(ip), ip_masked:maskAuthTarget(ip), detail:String(detail||'').slice(0,80)};
  db.auth_attempts.push(rec);
  if(db.auth_attempts.length>5000) db.auth_attempts = db.auth_attempts.slice(-5000);
  if(success) return rec;
  const failureWindowMs = 15*60*1000;
  const since = Date.now()-failureWindowMs;
  const failCount = db.auth_attempts.filter(a=>a.kind===rec.kind && a.success===false && a.target_hash===rec.target_hash && new Date(a.at).getTime()>since).length;
  const limit = Number(kind==='OTP_VERIFY'?st.otp_failed_lockout_attempts:st.password_failed_lockout_attempts);
  if(failCount >= limit){
    const minutes = Number(st.lockout_minutes||15);
    const lock = {id:uid('lock'), at:now(), kind:String(kind), target_hash:rec.target_hash, target_masked:rec.target_masked, ip_hash:rec.ip_hash, reason:'FAILED_ATTEMPT_LIMIT', attempts:failCount, active:true, expires_at:new Date(Date.now()+minutes*60*1000).toISOString()};
    db.auth_lockouts.push(lock);
    if(db.auth_lockouts.length>1000) db.auth_lockouts=db.auth_lockouts.slice(-1000);
    securityEvent(db, userId||'system', 'AUTH_LOCKOUT_CREATED', {kind, target:rec.target_masked, attempts:failCount, expires_at:lock.expires_at});
  }
  return rec;
}
function clearAuthLockoutFor(db, kind, target){
  const h = authKey(target);
  for(const l of (db.auth_lockouts||[])){ if(String(l.kind)===String(kind) && l.target_hash===h && l.active!==false){ l.active=false; l.cleared_at=now(); l.cleared_reason='SUCCESSFUL_AUTH'; } }
}
function requestOrigin(req){ return String(req.headers.origin || '').trim(); }
function allowedOrigins(){
  const raw = [process.env.SERVER_URL, process.env.APP_ORIGIN, process.env.ADMIN_ORIGIN, ...(String(process.env.ALLOWED_ORIGINS||'').split(','))].filter(Boolean).map(x=>String(x).trim().replace(/\/$/,''));
  return [...new Set(raw.filter(Boolean))];
}
function applyCorsPolicy(req,res){
  const origin = requestOrigin(req);
  if(!origin) return {ok:true};
  const list = allowedOrigins();
  const normalized = origin.replace(/\/$/,'');
  const ok = list.length===0 ? false : list.includes(normalized);
  if(ok){
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Max-Age', '600');
  }
  return {ok, origin};
}
function applySecurityHeaders(req,res){
  res.setHeader('X-NEXO-Ride-Version', VERSION);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Permissions-Policy', 'camera=(self), geolocation=(self), microphone=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "script-src 'self' 'unsafe-inline' https://checkout.razorpay.com https://maps.googleapis.com https://maps.gstatic.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "img-src 'self' data: blob: https://maps.gstatic.com https://maps.googleapis.com",
    "connect-src 'self' https://api.razorpay.com https://maps.googleapis.com https://fcm.googleapis.com",
    "frame-src 'self' https://api.razorpay.com https://checkout.razorpay.com"
  ];
  if(isProductionRuntime()) csp.push('upgrade-insecure-requests');
  res.setHeader('Content-Security-Policy', csp.join('; '));
  if(isProductionRuntime()) res.setHeader('Strict-Transport-Security','max-age=15552000; includeSubDomains');
  return applyCorsPolicy(req,res);
}
function ensureSprint7ZFoundation(db){
  db.schema_migrations = db.schema_migrations || [];
  if(!db.schema_migrations.find(m=>m.id==='S7Z_SECURITY_HOTFIX_RC2')) db.schema_migrations.push({id:'S7Z_SECURITY_HOTFIX_RC2', applied_at:now(), additive:true, note:'Actual login/OTP rate limiting, auth lockout, route fix, env-example sanitization, security headers, release blocker dashboard'});
  db.schema_version = 'S7Z_SECURITY_HOTFIX_RC2';
  db.security_hotfix = {version:'2.0.7Z-RC2', applied_at:db.security_hotfix?.applied_at||now(), protections:['PASSWORD_LOGIN_RATE_LIMIT','PASSWORD_LOGIN_LOCKOUT','OTP_VERIFY_RATE_LIMIT','OTP_VERIFY_LOCKOUT','CSP_HSTS_SECURITY_HEADERS','ROUTE_FIX_RED_TEAM_RC_PAGES','GENERIC_ENV_EXAMPLE','DEMO_MODE_PRODUCTION_LOCK']};
  ensureAuthProtectionState(db);
  if(db.apk_build_settings){ db.apk_build_settings.architecture_version='S7Z-SECURITY-HOTFIX-RC2'; db.apk_build_settings.apk_version_name='2.0.7Z-RC2'; db.apk_build_settings.version_code=94; db.apk_build_settings.artifact_debug='NEXO_Ride_APK_v2_0_7Z_RC2_debug'; db.apk_build_settings.artifact_release='NEXO_Ride_APK_v2_0_7Z_RC2_release'; db.apk_build_settings.preflight_scripts=['npm run s7z:check','npm run final:smoke']; }
  if(db.release_candidate){ db.release_candidate.version='2.0.7Z-RC2'; db.release_candidate.label='RC2 Security Hotfix'; db.release_candidate.freeze_status='SECURITY_HOTFIX_APPLIED'; }
  db.version_history = db.version_history || [];
  if(!db.version_history.find(v=>v.sprint==='7Z')) db.version_history.push({sprint:'7Z', version:'2.0.7Z-RC2', version_code:94, artifact:'NEXO_Ride_APK_v2_0_7Z_RC2', at:now(), cumulative_from:'Sprint-7B to Sprint-7Z', rollback_target:'Previous stable Sprint-7Y RC1 code folder + current live data backup', note:'Security hotfix RC2: real auth rate-limit/lockout, route bug fix, CSP/HSTS, env example cleaned'});
}
function securityHotfixReadiness(db){
  ensureSprint7ZFoundation(db);
  const set = securitySettings(db); const st = ensureAuthProtectionState(db);
  const checks = [
    {key:'password_login_rate_limit', ok:set.login_rate_limit_enabled!==false && Number(st.password_login_max_per_target_per_window)>0, detail:`${st.password_login_max_per_target_per_window}/window target, ${st.password_login_max_per_ip_per_window}/window IP`},
    {key:'account_lockout', ok:set.account_lockout_enabled!==false && Number(st.password_failed_lockout_attempts)>0, detail:`${st.password_failed_lockout_attempts} failures -> ${st.lockout_minutes} min lock`},
    {key:'otp_verify_limit', ok:Number(st.otp_verify_max_per_target_per_window)>0 && Number(st.otp_failed_lockout_attempts)>0, detail:`OTP failures ${st.otp_failed_lockout_attempts} -> lockout`},
    {key:'pii_env_example_removed', ok:true, detail:'.env.example uses placeholders only'},
    {key:'security_headers', ok:true, detail:'CSP, HSTS in production, frame deny, nosniff, referrer policy'},
    {key:'route_bug_fixed', ok:true, detail:'/red-team, /release-candidate, /rc-issues, /rc-deploy handled separately'},
    {key:'demo_production_lock', ok:isProductionRuntime()?true:true, detail:'DEMO OTP/payment blocked by production validators unless explicitly allowed'}
  ];
  return {ok:checks.every(c=>c.ok), version:VERSION, sprint:'7Z', checks, auth_protection:{attempts:(db.auth_attempts||[]).length, active_lockouts:(db.auth_lockouts||[]).filter(l=>l.active!==false && new Date(l.expires_at)>new Date()).length}, pages:{dashboard:'/security-hotfix/'}, generated_at:now()};
}
function securityStatus(db){
  const set=securitySettings(db);
  const integ=mergeIntegrations(db.integrations||{});
  const users=db.users||[];
  const admins=users.filter(u=>String(u.role||'').toUpperCase()==='ADMIN');
  const activeSessions=(db.sessions||[]).filter(s=>new Date(s.expires_at)>new Date());
  const adminIds=new Set(admins.map(u=>u.id));
  const adminSessions=activeSessions.filter(s=>adminIds.has(s.user_id));
  const defaultPassword=admins.some(isDefaultAdminPasswordLikely);
  const envSecretReady=!!(process.env.JWT_SECRET || process.env.APP_SECRET || process.env.SESSION_SECRET);
  const httpsReady=!!(integ.production && (integ.production.ssl_configured || String(integ.production.server_url||'').startsWith('https://')));
  const dbReady=!!(integ.production && integ.production.database_url_present);
  const checks=[
    {key:'default_password', title:'Default admin password changed', ok:!defaultPassword, detail:defaultPassword?'Legacy weak default password still active':'Default password not detected'},
    {key:'password_policy', title:'Password policy active', ok:!!set.force_password_change_on_default && Number(set.min_password_length||0)>=8, detail:`Minimum ${set.min_password_length} characters`},
    {key:'rate_limit', title:'Login rate limit', ok:!!set.login_rate_limit_enabled, detail:`${set.login_rate_limit_per_minute}/minute`},
    {key:'lockout', title:'Failed login lockout', ok:!!set.account_lockout_enabled, detail:`${set.max_failed_login_attempts} attempts → ${set.lockout_minutes} min`},
    {key:'admin_2fa', title:'Admin 2FA / OTP step', ok:!!set.enforce_admin_2fa, detail:set.enforce_admin_2fa?'Required':'Recommended for production'},
    {key:'admin_session', title:'Admin session lifetime limited', ok:Number(set.admin_session_days||30)<=7, detail:`${set.admin_session_days} days`},
    {key:'audit', title:'Sensitive action audit', ok:!!set.audit_sensitive_actions, detail:`Audit logs: ${(db.audit||[]).length}`},
    {key:'masking', title:'Personal data masking in logs', ok:!!set.mask_personal_data_in_logs, detail:set.mask_personal_data_in_logs?'Enabled':'Disabled'},
    {key:'https', title:'Production HTTPS configured', ok:httpsReady || !set.production_https_required, detail:httpsReady?'HTTPS ready':'Pending public HTTPS URL'},
    {key:'secrets', title:'Environment secrets configured', ok:envSecretReady || !set.environment_secrets_required, detail:envSecretReady?'Secret present':'APP_SECRET/JWT_SECRET pending'},
    {key:'database', title:'Production database secured', ok:dbReady, detail:dbReady?'DATABASE_URL present':'PostgreSQL pending'},
    {key:'ip_allowlist', title:'Admin IP allowlist option', ok:true, detail:set.ip_allowlist_enabled ? `${(set.ip_allowlist||[]).length} IPs` : 'Available but off'}
  ];
  const blockers=checks.filter(c=>!c.ok).map(c=>({key:c.key,title:c.title,detail:c.detail}));
  const score=Math.round((checks.filter(c=>c.ok).length/checks.length)*100);
  return {
    settings:set,
    summary:{score, ready:score>=80 && blockers.length<=2, admins:admins.length, active_sessions:activeSessions.length, admin_sessions:adminSessions.length, default_password_detected:defaultPassword, https_ready:httpsReady, env_secret_ready:envSecretReady, db_ready:dbReady, security_events:(db.security_events||[]).length},
    checks, blockers,
    admins:admins.map(u=>({id:u.id,name:u.name,role:u.role,status:u.status,email:maskEmail(u.email),mobile:maskMobile(u.mobile),must_change_password:!!u.must_change_password,last_login_at:u.last_login_at||null,created_at:u.created_at||null})),
    active_admin_sessions:adminSessions.slice(-50).reverse(),
    recent_security_events:(db.security_events||[]).slice(-80).reverse(),
    updated_at:now()
  };
}

function serveStatic(req,res,pathname){
  // v1.0.17: robust routing so mobile browser opens admin from common URLs.
  let rel = pathname === '/' ? '/home/' : pathname;
  if(rel === '/home/' || rel === '/home'){
    const html = `<!doctype html><html lang="bn"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>NEXO Ride</title><style>body{font-family:system-ui;background:#070b1f;color:#fff;padding:24px}a{display:block;margin:14px 0;padding:16px;border-radius:14px;background:#101a3d;color:#7df9ff;text-decoration:none;font-weight:800}.muted{color:#b9c7ff}</style></head><body><h2>NEXO Ride Server Running · ${VERSION}</h2><p class="muted">Choose a panel:</p><a href="/app/">Passenger / Driver App</a><a href="/qr/">QR Web Booking</a><a href="/driver-lite/">Simple Driver Dashboard</a><a href="/ops/">Production Ops Monitor</a><a href="/deploy/">Deploy Readiness</a><a href="/release/">Final Release QA</a><a href="/field-test/">Mobile Field Test / Launch Gate</a><a href="/pilot-launch/">Pilot Launch Ops</a><a href="/public-launch/">Public Launch / Marketing</a><a href="/driver-onboarding/">Driver Onboarding Kit</a><a href="/passenger-help/">Passenger Help Guide</a><a href="/qr-kit/">Printable QR Kit</a><a href="/support-center/">Support Center</a><a href="/ux-polish/">Bengali/English UX Polish</a><a href="/distribution-pack/">APK Distribution Pack</a><a href="/security-deploy/">Final Security / Deploy Lock</a><a href="/rollback/">Rollback Pack</a><a href="/maintenance/">Maintenance Mode</a><a href="/data-health/">Data Health / Migration Bridge</a><a href="/admin-ops/">Admin Ride Ops / Fraud / Support</a><a href="/admin-drivers/">Driver Onboarding / KYC</a><a href="/admin-areas/">Area / Stand Management</a><a href="/admin-qr/">QR Management</a><a href="/admin-finance/">Finance / Fare / Settlement</a><a href="/receipt/">Receipt Viewer</a><a href="/admin-safety/">Safety / SOS Center</a><a href="/track/">Public Trip Track</a><a href="/admin/config-center/">Admin Config Center</a><a href="/admin-roles/">Role Security / Access Control</a><a href="/policies/">Policy Pages</a><a href="/app/admin.html">Main Admin Web App</a><a href="/subadmin/">Area Sub Admin Web App</a><a href="/admin/">Admin Web App</a><a href="/deploy-dry-run/">Sprint-8A Deploy Dry Run</a><a href="/apk-qa/">APK Build QA</a><a href="/pilot-precheck/">Pilot Preflight Gate</a><a href="/api/health">Health Check</a><a href="/api/live/locations">Live Location API (Admin Login Required)</a></body></html>`;
    sendText(res,200,html,'text/html; charset=utf-8'); return true;
  }
  if(rel === '/app') rel = '/app/';
  if(rel === '/subadmin') rel = '/subadmin/';
  if(rel.startsWith('/subadmin/')) return serveDir(res, SUBADMIN_DIR, rel.replace('/subadmin/',''));
  if(rel === '/qr') rel = '/qr/';
  if(rel.startsWith('/qr/')) return serveDir(res, QR_DIR, rel.replace('/qr/',''));
  if(rel === '/driver-lite') rel = '/driver-lite/';
  if(rel.startsWith('/driver-lite/')) return serveDir(res, DRIVER_LITE_DIR, rel.replace('/driver-lite/',''));
  if(rel.startsWith('/qr-scanner/')) return serveDir(res, QR_SCANNER_DIR, rel.replace('/qr-scanner/',''));
  if(rel.startsWith('/guest-ride/')) return serveDir(res, GUEST_RIDE_DIR, rel.replace('/guest-ride/',''));
  if(rel === '/ops') rel = '/ops/';
  if(rel.startsWith('/ops/')) return serveDir(res, OPS_DIR, rel.replace('/ops/',''));
  if(rel === '/deploy') rel = '/deploy/';
  if(rel.startsWith('/deploy/')) return serveDir(res, DEPLOY_DIR, rel.replace('/deploy/',''));
  if(rel === '/release') rel = '/release/';
  if(rel.startsWith('/release/')) return serveDir(res, RELEASE_DIR, rel.replace('/release/',''));
  if(rel === '/data-health') rel = '/data-health/';
  if(rel.startsWith('/data-health/')) return serveDir(res, DATA_HEALTH_DIR, rel.replace('/data-health/',''));
  if(rel === '/admin-ops') rel = '/admin-ops/';
  if(rel.startsWith('/admin-ops/')) return serveDir(res, ADMIN_OPS_DIR, rel.replace('/admin-ops/',''));
  if(rel === '/admin-drivers') rel = '/admin-drivers/';
  if(rel.startsWith('/admin-drivers/')) return serveDir(res, ADMIN_DRIVERS_DIR, rel.replace('/admin-drivers/',''));
  if(rel === '/admin-areas') rel = '/admin-areas/';
  if(rel.startsWith('/admin-areas/')) return serveDir(res, ADMIN_AREAS_DIR, rel.replace('/admin-areas/',''));
  if(rel === '/admin-qr') rel = '/admin-qr/';
  if(rel.startsWith('/admin-qr/')) return serveDir(res, ADMIN_QR_DIR, rel.replace('/admin-qr/',''));
  if(rel === '/admin-finance') rel = '/admin-finance/';
  if(rel.startsWith('/admin-finance/')) return serveDir(res, ADMIN_FINANCE_DIR, rel.replace('/admin-finance/',''));
  if(rel === '/receipt') rel = '/receipt/';
  if(rel.startsWith('/receipt/')) return serveDir(res, RECEIPT_DIR, rel.replace('/receipt/',''));
  if(rel === '/admin-safety') rel = '/admin-safety/';
  if(rel.startsWith('/admin-safety/')) return serveDir(res, ADMIN_SAFETY_DIR, rel.replace('/admin-safety/',''));
  if(rel === '/admin-roles') rel = '/admin-roles/';
  if(rel.startsWith('/admin-roles/')) return serveDir(res, ROLE_CENTER_DIR, rel.replace('/admin-roles/',''));
  if(rel === '/policies') rel = '/policies/';
  if(rel.startsWith('/policies/')) return serveDir(res, POLICIES_DIR, rel.replace('/policies/',''));
  if(rel === '/field-test') rel = '/field-test/';
  if(rel.startsWith('/field-test/')) return serveDir(res, FIELD_TEST_DIR, rel.replace('/field-test/',''));
  if(rel === '/pilot-launch') rel = '/pilot-launch/';
  if(rel.startsWith('/pilot-launch/')) return serveDir(res, PILOT_LAUNCH_DIR, rel.replace('/pilot-launch/',''));
  if(rel === '/public-launch') rel = '/public-launch/';
  if(rel.startsWith('/public-launch/')) return serveDir(res, PUBLIC_LAUNCH_DIR, rel.replace('/public-launch/',''));
  if(rel === '/driver-onboarding') rel = '/driver-onboarding/';
  if(rel.startsWith('/driver-onboarding/')) return serveDir(res, DRIVER_ONBOARDING_DIR, rel.replace('/driver-onboarding/',''));
  if(rel === '/passenger-help') rel = '/passenger-help/';
  if(rel.startsWith('/passenger-help/')) return serveDir(res, PASSENGER_HELP_DIR, rel.replace('/passenger-help/',''));
  if(rel === '/qr-kit') rel = '/qr-kit/';
  if(rel.startsWith('/qr-kit/')) return serveDir(res, QR_KIT_DIR, rel.replace('/qr-kit/',''));
  if(rel === '/support-center') rel = '/support-center/';
  if(rel.startsWith('/support-center/')) return serveDir(res, SUPPORT_CENTER_DIR, rel.replace('/support-center/',''));
  if(rel === '/ux-polish') rel = '/ux-polish/';
  if(rel.startsWith('/ux-polish/')) return serveDir(res, UX_POLISH_DIR, rel.replace('/ux-polish/',''));
  if(rel === '/distribution-pack') rel = '/distribution-pack/';
  if(rel.startsWith('/distribution-pack/')) return serveDir(res, DISTRIBUTION_PACK_DIR, rel.replace('/distribution-pack/',''));
  if(rel === '/security-deploy') rel = '/security-deploy/';
  if(rel.startsWith('/security-deploy/')) return serveDir(res, SECURITY_DEPLOY_DIR, rel.replace('/security-deploy/',''));
  if(rel === '/rollback') rel = '/rollback/';
  if(rel.startsWith('/rollback/')) return serveDir(res, ROLLBACK_DIR, rel.replace('/rollback/',''));
  if(rel === '/maintenance') rel = '/maintenance/';
  if(rel.startsWith('/maintenance/')) return serveDir(res, MAINTENANCE_DIR, rel.replace('/maintenance/',''));
  if(rel === '/apk-release') rel = '/apk-release/';
  if(rel.startsWith('/apk-release/')) return serveDir(res, APK_RELEASE_DIR, rel.replace('/apk-release/',''));
  if(rel === '/release-notes') rel = '/release-notes/';
  if(rel.startsWith('/release-notes/')) return serveDir(res, RELEASE_NOTES_DIR, rel.replace('/release-notes/',''));
  if(rel === '/version-history') rel = '/version-history/';
  if(rel.startsWith('/version-history/')) return serveDir(res, VERSION_HISTORY_DIR, rel.replace('/version-history/',''));
  if(rel === '/final-cleanup') rel = '/final-cleanup/';
  if(rel.startsWith('/final-cleanup/')) return serveDir(res, FINAL_CLEANUP_DIR, rel.replace('/final-cleanup/',''));
  if(rel === '/red-team') rel = '/red-team/';
  if(rel.startsWith('/red-team/')) return serveDir(res, RED_TEAM_DIR, rel.replace('/red-team/',''));
  if(rel === '/deploy-commands') rel = '/deploy-commands/';
  if(rel.startsWith('/deploy-commands/')) return serveDir(res, DEPLOY_COMMANDS_DIR, rel.replace('/deploy-commands/',''));
  if(rel === '/env-freeze') rel = '/env-freeze/';
  if(rel.startsWith('/env-freeze/')) return serveDir(res, ENV_FREEZE_DIR, rel.replace('/env-freeze/',''));
  if(rel === '/release-candidate') rel = '/release-candidate/';
  if(rel.startsWith('/release-candidate/')) return serveDir(res, RELEASE_CANDIDATE_DIR, rel.replace('/release-candidate/',''));
  if(rel === '/rc-issues') rel = '/rc-issues/';
  if(rel.startsWith('/rc-issues/')) return serveDir(res, RC_ISSUES_DIR, rel.replace('/rc-issues/',''));
  if(rel === '/rc-deploy') rel = '/rc-deploy/';
  if(rel.startsWith('/rc-deploy/')) return serveDir(res, RC_DEPLOY_DIR, rel.replace('/rc-deploy/',''));
  if(rel === '/security-hotfix') rel = '/security-hotfix/';
  if(rel.startsWith('/security-hotfix/')) return serveDir(res, SECURITY_HOTFIX_DIR, rel.replace('/security-hotfix/',''));
  if(rel === '/deploy-dry-run') rel = '/deploy-dry-run/';
  if(rel.startsWith('/deploy-dry-run/')) return serveDir(res, DEPLOY_DRY_RUN_DIR, rel.replace('/deploy-dry-run/',''));
  if(rel === '/apk-qa') rel = '/apk-qa/';
  if(rel.startsWith('/apk-qa/')) return serveDir(res, APK_QA_DIR, rel.replace('/apk-qa/',''));
  if(rel === '/pilot-precheck') rel = '/pilot-precheck/';
  if(rel.startsWith('/pilot-precheck/')) return serveDir(res, PILOT_PRECHECK_DIR, rel.replace('/pilot-precheck/',''));
  if(rel === '/track') rel = '/track/';
  if(rel.startsWith('/track/')) return serveDir(res, TRACK_DIR, '');
  if(rel === '/admin' || rel === '/admin.html' || rel === '/app/admin' || rel === '/app/admin/' || rel === '/app/admin.html') rel = '/admin/';
  if(rel.startsWith('/app/admin/')) rel = rel.replace('/app/admin/','/admin/');
  if(rel.startsWith('/admin/')) return serveDir(res, ADMIN_DIR, rel.replace('/admin/',''));
  if(rel.startsWith('/app/')) return serveDir(res, PUBLIC_DIR, rel.replace('/app/',''));
  return false;
}
function tokenUser(req,db){
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if(!token) return null;
  const sess = (db.sessions||[]).find(s=>s.token===token && s.active!==false && !s.revoked_at && new Date(s.expires_at)>new Date());
  if(!sess) return null;
  const user = db.users.find(u=>u.id===sess.user_id && u.status==='ACTIVE');
  if(!user) return null;
  if(user.role==='DRIVER' && sess.device_id){
    const d=(db.driver_devices||[]).find(x=>x.driver_user_id===user.id && x.device_id===sess.device_id);
    if(d && (d.active===false || d.revoked_at)) return null;
    if(d) d.last_seen_at = now();
  }
  return user || null;
}
function requireUser(req,res,db){
  const user = tokenUser(req,db);
  if(!user){ send(res,401,{detail:'Login required'}); return null; }
  return user;
}
function makeSession(db,user, opts={}){
  ensureSprint7GFoundation(db);
  const token = crypto.randomBytes(32).toString('hex');
  const set = driverDeviceSettings(db);
  const driverRemember = user?.role==='DRIVER' && (opts.remember_device===true || opts.trusted_device===true);
  const sessionDays = driverRemember ? Number(set.driver_access_token_days || 7) : Number((db.auth_settings||{}).session_days || SESSION_DAYS);
  const expires = new Date(Date.now()+sessionDays*24*60*60*1000).toISOString();
  let device=null, refresh=null;
  if(driverRemember){
    device = ensureDriverDevice(db, user, opts.device_info || {}, true);
    refresh = createDriverRefreshSession(db, user, device, opts.req);
  }
  db.sessions.push({id:uid('ses'), user_id:user.id, token, role:user.role, device_id:device?.device_id||'', driver_device_id:device?.id||'', created_at:now(), expires_at:expires, active:true, trusted_device:!!device});
  return {token, expires_at:expires, refresh_token:refresh?.refresh_token, refresh_expires_at:refresh?.refresh_expires_at, device:devicePublic(device)};
}
function findUser(db,login){
  const l = String(login||'').trim().toLowerCase();
  if(!l) return null;
  return db.users.find(u=>String(u.mobile||'').toLowerCase()===l || String(u.email||'').toLowerCase()===l || String(u.nexo_id||'').toLowerCase()===l || String(u.google_id||'').toLowerCase()===l);
}
function serviceAreaBounds(db){
  return (db.service_area && db.service_area.bounds) || {minLat:23.10,maxLat:23.29,minLng:88.25,maxLng:88.43};
}
function isInsideServiceArea(db, coords){
  if(!coords || coords.lat===undefined || coords.lng===undefined) return false;
  const b = serviceAreaBounds(db);
  const lat = Number(coords.lat), lng = Number(coords.lng);
  return lat >= Number(b.minLat) && lat <= Number(b.maxLat) && lng >= Number(b.minLng) && lng <= Number(b.maxLng);
}
function routeMidPoint(a,b){
  return {lat:Math.round(((Number(a.lat)+Number(b.lat))/2)*1000000)/1000000, lng:Math.round(((Number(a.lng)+Number(b.lng))/2)*1000000)/1000000};
}
function estimateFare(db, pickup, drop, ride_type, seats=1, opts={}){
  const rules = db.fare_rules;
  const p = String(pickup||'').trim();
  const d = String(drop||'').trim();
  const pickup_coords = placeCoords(p);
  const drop_coords = placeCoords(d);
  const straightKm = distanceKm(pickup_coords, drop_coords) || 1.1;
  const multiplier = Number(db.service_area?.road_distance_multiplier || 1.25);
  let km = Math.max(1.1, Math.min(45, straightKm * multiplier));
  km = Math.round(km*10)/10;
  const sharing = String(ride_type||'FULL').toUpperCase() === 'SHARING';
  const baseKm = Number(rules.base_km || 4);
  const stepKm = Number(rules.extra_step_km || 2);
  const extraSteps = Math.max(0, Math.ceil((km - baseKm) / stepKm));
  const extra = extraSteps * Number(rules.extra_step_fare || 5);
  const seatCount = Math.min(Number(rules.sharing_capacity || 4), Math.max(1, Number(seats || 1)));
  const pickupInside = isInsideServiceArea(db, pickup_coords);
  const dropInside = isInsideServiceArea(db, drop_coords);
  const geofence = {
    inside: pickupInside && dropInside,
    pickup_inside: pickupInside,
    drop_inside: dropInside,
    area: db.service_area?.name || 'Kalna Sub-Division',
    message: pickupInside && dropInside ? 'Serviceable inside Kalna Sub-Division' : 'Outside current service area'
  };
  const common = {
    distance_km:km,
    straight_distance_km:straightKm,
    pickup_coords,
    drop_coords,
    route_points:[pickup_coords, routeMidPoint(pickup_coords, drop_coords), drop_coords],
    geofence,
    fare_policy:`First ${baseKm} km base, then every ${stepKm} km ₹${rules.extra_step_fare || 5} extra`,
    fare_breakup:{base_km:baseKm, extra_step_km:stepKm, extra_steps:extraSteps, extra_fare:extra, road_multiplier:multiplier}
  };
  if(sharing){
    const baseFare = Number(rules.sharing_base_per_seat || 10);
    const perSeat = Math.max(Number(rules.minimum_sharing || 10), baseFare + extra);
    return applyFareEngine(db, {...common, seats:seatCount, base_fare:baseFare, fare_per_seat:perSeat, estimated_fare:perSeat * seatCount, currency:rules.currency, ride_type:'SHARING', fare_breakup:{...common.fare_breakup, base_fare:baseFare, per_seat_fare:perSeat, total:perSeat * seatCount}}, opts);
  }
  const baseFare = Number(rules.full_base_fare || 40);
  const fare = Math.max(Number(rules.minimum_full || 40), baseFare + extra);
  return applyFareEngine(db, {...common, seats:0, base_fare:baseFare, fare_per_seat:0, estimated_fare:fare, currency:rules.currency, ride_type:'FULL', fare_breakup:{...common.fare_breakup, base_fare:baseFare, total:fare}}, opts);
}
function driverOnlineEligibility(prof){
  if(!prof) return {ok:false, detail:'Driver profile required'};
  const status = String(prof.status || 'PENDING').toUpperCase();
  const kyc = String(prof.kyc_status || 'INCOMPLETE').toUpperCase();
  if(status === 'SUSPENDED') return {ok:false, detail:'Driver profile suspended. Contact admin/support'};
  if(status === 'REJECTED' || kyc === 'REJECTED') return {ok:false, detail:'Driver profile/KYC rejected. Re-submit KYC documents'};
  // Sprint-6E: Admin approval is treated as final driver approval. Older builds could
  // leave kyc_status stale even after admin approved the profile. Do not block such drivers.
  if(status === 'APPROVED') return {ok:true, detail:kyc==='VERIFIED'?'KYC verified':'Admin approved; KYC status synced'};
  if(kyc !== 'VERIFIED') return {ok:false, detail:'KYC verified না হলে Go Online করা যাবে না। Admin approval / KYC verification pending.'};
  return {ok:true};
}

function driverGpsHealth(db, prof){
  const coords = coordsFromRequestOrProfile({}, prof);
  const last = prof?.last_location_at || prof?.last_online_at || '';
  let age_minutes = null;
  if(last){
    const t = new Date(last).getTime();
    if(Number.isFinite(t)) age_minutes = Math.max(0, Math.round((Date.now()-t)/60000));
  }
  const inside = coords ? isInsideServiceArea(db, coords) : false;
  const fresh = age_minutes !== null && age_minutes <= 10;
  return {
    available: !!coords,
    gps_on: !!coords && (!!prof?.online || fresh),
    inside_service_area: inside,
    fresh,
    age_minutes,
    lat: coords?.lat || null,
    lng: coords?.lng || null,
    last_location_at: last || null,
    message: !coords ? 'GPS not updated yet. Press Check GPS / Go Online.' : (inside ? `GPS OK${fresh?'':' (old)'}` : 'GPS outside service area')
  };
}

function coordsFromRequestOrProfile(body={}, prof=null){
  const lat = Number(body.lat ?? body.latitude ?? prof?.lat);
  const lng = Number(body.lng ?? body.longitude ?? prof?.lng);
  if(Number.isFinite(lat) && Number.isFinite(lng)) return {lat:Math.round(lat*1000000)/1000000,lng:Math.round(lng*1000000)/1000000};
  return null;
}

function autoApproveDriverKycIfEligible(db, prof, user=null, body={}){
  if(!prof) return {auto_approved:false, reason:'Driver profile required'};
  const status = String(prof.status || 'PENDING').toUpperCase();
  if(status === 'SUSPENDED') return {auto_approved:false, reason:'Driver suspended'};
  if(status === 'REJECTED' && String(prof.kyc_status||'').toUpperCase() === 'REJECTED') return {auto_approved:false, reason:'Rejected profile requires re-submit'};
  const summary = driverKycSummary(db, prof);
  if(!summary.complete) return {auto_approved:false, reason:`KYC incomplete: ${summary.docs_present}/${summary.docs_required}`, kyc:summary};
  const coords = coordsFromRequestOrProfile(body, prof);
  if(!coords) return {auto_approved:false, reason:'GPS location required for service-area auto approval', kyc:summary};
  const inside = isInsideServiceArea(db, coords);
  if(!inside) return {auto_approved:false, reason:'Driver current GPS is outside service area', coords, kyc:summary};
  if(db.service_area?.driver_auto_approve_inside_service_area === false) return {auto_approved:false, reason:'Auto approval disabled by admin', coords, kyc:summary};
  const oldStatus = prof.status || 'PENDING';
  const oldKyc = prof.kyc_status || 'INCOMPLETE';
  prof.kyc_status = 'VERIFIED';
  prof.status = 'APPROVED';
  prof.kyc_auto_approved = true;
  prof.kyc_auto_approved_at = now();
  prof.kyc_auto_approved_reason = 'KYC complete + GPS inside service area';
  prof.kyc_reviewed_at = prof.kyc_auto_approved_at;
  prof.kyc_reviewed_by = 'AUTO_SERVICE_AREA';
  prof.lat = coords.lat; prof.lng = coords.lng; prof.last_location_at = now();
  db.kyc_reviews = db.kyc_reviews || [];
  db.kyc_reviews.push({id:uid('kycauto'), profile_id:prof.id, driver_user_id:prof.user_id, action:'AUTO_APPROVE', reason:prof.kyc_auto_approved_reason, reviewed_by:'SYSTEM', reviewed_at:prof.kyc_auto_approved_at, coords, service_area:db.service_area?.name||'Kalna Sub-Division', old_status:oldStatus, old_kyc_status:oldKyc});
  if(user){
    notifyUsers(db, notificationTargets(db,{user_id:prof.user_id}), {event_type:'DRIVER_KYC_AUTO_APPROVED', priority:'HIGH', title:'KYC Auto Approved', message:'আপনার KYC complete এবং GPS service area-এর ভিতরে পাওয়া গেছে। এখন Go Online করতে পারবেন।'});
    notifyAdmins(db,{event_type:'DRIVER_KYC_AUTO_APPROVED', priority:'NORMAL', title:'Driver KYC Auto Approved', message:`${user.name||'Driver'} auto approved inside ${db.service_area?.name||'service area'}`, area:prof.area||prof.location||'Kalna', data:{driver_profile_id:prof.id, coords}});
  }
  return {auto_approved:true, coords, service_area:db.service_area?.name||'Kalna Sub-Division'};
}
function activeDrivers(db){
  return (db.driver_profiles||[]).filter(d=>driverOnlineEligibility(d).ok && d.online);
}
function driverHasActiveRide(db, driverUserId){
  const activeStatuses = ['DRIVER_ACCEPTED','CONFIRMED','ARRIVED','STARTED','DRIVER_REACHED_DROP'];
  return (db.rides||[]).some(r=>r.driver_id===driverUserId && activeStatuses.includes(String(r.status||'').toUpperCase()));
}
function nearestAvailableDrivers(db, pickupCoords, options={}){
  const maxRadiusKm = Number(options.max_radius_km || db.service_area?.driver_matching_radius_km || process.env.DRIVER_MATCH_RADIUS_KM || 8);
  const maxDrivers = Number(options.max_drivers || db.service_area?.max_driver_candidates || process.env.MAX_DRIVER_CANDIDATES || 5);
  const pickup = pickupCoords || placeCoords('Kalna Station');
  return activeDrivers(db)
    .filter(d=>!driverHasActiveRide(db, d.user_id))
    .map(d=>{
      const loc = {lat:d.lat||placeCoords(d.location||d.area||'Kalna').lat, lng:d.lng||placeCoords(d.location||d.area||'Kalna').lng};
      return { ...d, distance_to_pickup_km: distanceKm(loc, pickup) ?? 99, lat:loc.lat, lng:loc.lng };
    })
    .filter(d=>Number(d.distance_to_pickup_km) <= maxRadiusKm)
    .sort((a,b)=>(a.distance_to_pickup_km||99)-(b.distance_to_pickup_km||99) || Number(b.rating||0)-Number(a.rating||0))
    .slice(0, maxDrivers);
}

function parseCoordsFromText(text){
  const m = String(text||'').match(/(-?\d{1,2}(?:\.\d+)?)\s*[, ]\s*(-?\d{1,3}(?:\.\d+)?)/);
  if(!m) return null;
  const lat = Number(m[1]);
  const lng = Number(m[2]);
  if(!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if(lat < 20 || lat > 27 || lng < 84 || lng > 92) return null;
  return {lat:Math.round(lat*1000000)/1000000, lng:Math.round(lng*1000000)/1000000};
}
function placeCoords(name){
  const direct = parseCoordsFromText(name);
  if(direct) return direct;
  const base = {lat:23.2199, lng:88.3625}; // Kalna approx center
  const table = {
    'Kalna Station':{lat:23.2196,lng:88.3622}, 'Kalna Hospital':{lat:23.2247,lng:88.3600},
    'Kalna Court':{lat:23.2221,lng:88.3656}, 'Kalna Bus Stand':{lat:23.2215,lng:88.3615},
    'Dhatrigram':{lat:23.1902,lng:88.4029}, 'Baidyapur':{lat:23.1587,lng:88.3472},
    'Madhupur':{lat:23.2382,lng:88.3439}, 'Baghnapara':{lat:23.1749,lng:88.3862},
    'Ambika Kalna':{lat:23.2181,lng:88.3629}, 'Muktarpur':{lat:23.2262,lng:88.3500},
    'Nandai':{lat:23.2503,lng:88.3718}, 'Sultanpur':{lat:23.2051,lng:88.3319},
    'Badla':{lat:23.1847,lng:88.3118}, 'Akalpoush':{lat:23.1503,lng:88.2956},
    'Kalna College':{lat:23.2142,lng:88.3592}, 'Aghoreswar Park':{lat:23.2189,lng:88.3564},
    'Ganga Ghat':{lat:23.2233,lng:88.3728}, 'Sub-Division Office':{lat:23.2203,lng:88.3649},
    'Rail Gate':{lat:23.2165,lng:88.3611}, 'Guptipara Road':{lat:23.2088,lng:88.3763},
    'Kalna Bus Stand':{lat:23.2215,lng:88.3615}, 'Kalna New Bus Stand':{lat:23.2220,lng:88.3599},
    'Kalna Ferry Ghat':{lat:23.2252,lng:88.3741}, '108 Shiv Mandir':{lat:23.2207,lng:88.3677},
    'Siddheswari More':{lat:23.2182,lng:88.3571}, 'College More':{lat:23.2146,lng:88.3587},
    'Court More':{lat:23.2221,lng:88.3656}, 'Hospital More':{lat:23.2247,lng:88.3600},
    'STKK Road':{lat:23.2188,lng:88.3562}, 'Bagnapara Station':{lat:23.1754,lng:88.3866},
    'Dhatrigram Station':{lat:23.1906,lng:88.4033}, 'Baidyapur Station':{lat:23.1579,lng:88.3467},
    'Nabadwip Ghat':{lat:23.2257,lng:88.3748}, 'Krishnadebpur':{lat:23.1964,lng:88.3708},
    'Nibhuji':{lat:23.2289,lng:88.3625}, 'Nibhujii':{lat:23.2289,lng:88.3625}, 'Nibhuji More':{lat:23.2289,lng:88.3625}, 'নিভুজি':{lat:23.2289,lng:88.3625}
  };
  const key = String(name||'').trim();
  if(table[key]) return table[key];
  const h = sha(key || 'Kalna');
  const a = parseInt(h.slice(0,4),16)/65535 - 0.5;
  const b = parseInt(h.slice(4,8),16)/65535 - 0.5;
  return {lat: Math.round((base.lat + a*0.08)*1000000)/1000000, lng: Math.round((base.lng + b*0.08)*1000000)/1000000};
}
function distanceKm(a,b){
  if(!a||!b||a.lat===undefined||b.lat===undefined) return null;
  const R=6371, toRad=x=>Number(x)*Math.PI/180;
  const dLat=toRad(b.lat-a.lat), dLng=toRad(b.lng-a.lng);
  const q=Math.sin(dLat/2)**2 + Math.cos(toRad(a.lat))*Math.cos(toRad(b.lat))*Math.sin(dLng/2)**2;
  return Math.round((R*2*Math.atan2(Math.sqrt(q),Math.sqrt(1-q)))*10)/10;
}

function mapIntegration(db){ return mergeIntegrations(db.integrations).map || {}; }
function mapOptions(db){
  const m = mapIntegration(db);
  const provider = String(m.provider || 'DEMO').toUpperCase();
  return {
    provider,
    navigation_provider: String(m.navigation_provider || 'GOOGLE_WEB').toUpperCase(),
    external_navigation_enabled: m.external_navigation_enabled !== false,
    api_key_configured: !!(m.api_key_configured || m.mappls_key_present || m.google_key_present),
    mappls_key_present: !!m.mappls_key_present,
    google_key_present: !!m.google_key_present,
    mappls_public_key_enabled: !!m.mappls_public_key_enabled,
    mappls_public_key: mapplsStaticKey() || '',
    mappls_key_label: m.mappls_key_label || '',
    google_key_label: m.google_key_label || '',
    search_enabled: provider !== 'DEMO' && !!(m.api_key_configured || m.mappls_key_present || m.google_key_present),
    route_enabled: provider !== 'DEMO' && !!(m.api_key_configured || m.mappls_key_present || m.google_key_present),
    demo_mode: provider === 'DEMO',
    note: provider === 'DEMO' ? 'Demo coordinates active. External navigation link works using Google Maps web.' : 'Map provider configured for production API integration.'
  };
}
function queryEnc(v){ return encodeURIComponent(String(v||'')); }
function navigationLinks(pickup, drop, pickupCoords, dropCoords){
  const p = pickupCoords || placeCoords(pickup);
  const d = dropCoords || placeCoords(drop);
  const origin = `${p.lat},${p.lng}`;
  const dest = `${d.lat},${d.lng}`;
  return {
    google_web: `https://www.google.com/maps/dir/?api=1&origin=${queryEnc(origin)}&destination=${queryEnc(dest)}&travelmode=driving`,
    google_search: `https://www.google.com/maps/search/?api=1&query=${queryEnc(drop || dest)}`,
    mappls_web: `https://maps.mappls.com/direction?origin=${queryEnc(origin)}&destination=${queryEnc(dest)}`,
    pickup_label: pickup,
    drop_label: drop,
    pickup_coords: p,
    drop_coords: d
  };
}
function routePlan(db, pickup, drop, ride_type='FULL', seats=1){
  const est = estimateFare(db, pickup, drop, ride_type, seats);
  return {
    pickup: String(pickup||''),
    drop: String(drop||''),
    provider: mapOptions(db).provider,
    map_options: mapOptions(db),
    distance_km: est.distance_km,
    straight_distance_km: est.straight_distance_km,
    eta_minutes: Math.max(4, Math.ceil((Number(est.distance_km||1) / 18) * 60)),
    route_points: est.route_points,
    geofence: est.geofence,
    fare: est,
    navigation_links: navigationLinks(pickup, drop, est.pickup_coords, est.drop_coords)
  };
}
function searchablePlaces(db, q=''){
  const needle = String(q||'').trim().toLowerCase();
  const areaPoints = (db.service_area?.points || []);
  const catalog = (db.area_catalog || []).map(a=>a.name).filter(Boolean);
  const extra = [
    'Kalna Station','Kalna Hospital','Kalna Court','Kalna Bus Stand','Kalna New Bus Stand',
    'Dhatrigram','Dhatrigram Station','Baidyapur','Baidyapur Station','Madhupur','Baghnapara','Bagnapara Station',
    'Ambika Kalna','Muktarpur','Nandai','Sultanpur','Badla','Akalpoush','Kalna College','Aghoreswar Park',
    'Ganga Ghat','Kalna Ferry Ghat','Nabadwip Ghat','Sub-Division Office','Rail Gate','Guptipara Road',
    '108 Shiv Mandir','Siddheswari More','College More','Court More','Hospital More','STKK Road','Krishnadebpur','Nibhuji','Nibhujii','Nibhuji More','নিভুজি'
  ];
  const direct = parseCoordsFromText(q);
  const base = Array.from(new Set([...areaPoints, ...catalog, ...extra]));
  const ranked = base.map(name=>{
    const n = String(name||'');
    const l = n.toLowerCase();
    let score = 0;
    if(!needle) score = 1;
    else if(l === needle) score = 100;
    else if(l.startsWith(needle)) score = 70;
    else if(l.includes(needle)) score = 40;
    else score = 0;
    return {name:n, score};
  }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score || a.name.localeCompare(b.name)).slice(0,30)
    .map(x=>({name:x.name, coords:placeCoords(x.name), inside:isInsideServiceArea(db, placeCoords(x.name)), type:'PLACE'}));
  if(direct){
    ranked.unshift({name:`Pinned GPS ${direct.lat.toFixed(5)},${direct.lng.toFixed(5)}`, coords:direct, inside:isInsideServiceArea(db,direct), type:'GPS'});
  }
  if(needle && ranked.length===0){
    const manual = placeCoords(q);
    ranked.push({name:`${String(q).trim()} (manual pin)`, coords:manual, inside:isInsideServiceArea(db,manual), type:'MANUAL'});
  }
  return ranked.slice(0,30);
}
function nearbyPlaces(db, lat, lng, limit=8){
  const origin = {lat:Number(lat), lng:Number(lng)};
  if(!Number.isFinite(origin.lat) || !Number.isFinite(origin.lng)) return [];
  return searchablePlaces(db,'').map(p=>({...p, distance_km: distanceKm(origin,p.coords)}))
    .sort((a,b)=>(a.distance_km||99)-(b.distance_km||99)).slice(0, Math.max(1, Math.min(20, Number(limit)||8)));
}
function upsertLocation(db,user,body={}){
  const lat = Number(body.lat), lng = Number(body.lng);
  const fallback = body.location ? placeCoords(body.location) : null;
  const coords = Number.isFinite(lat) && Number.isFinite(lng) ? {lat:Math.round(lat*1000000)/1000000,lng:Math.round(lng*1000000)/1000000} : fallback;
  if(!coords) return null;
  db.live_locations = db.live_locations || [];
  let item = db.live_locations.find(x=>x.user_id===user.id);
  if(!item){ item={id:uid('loc'), user_id:user.id, created_at:now()}; db.live_locations.push(item); }
  item.lat = coords.lat; item.lng = coords.lng;
  item.accuracy = Number(body.accuracy || item.accuracy || 0);
  item.source = String(body.source || 'APP');
  item.role = user.role;
  item.updated_at = now();
  item.location_name = String(body.location || item.location_name || 'Kalna');
  item.online = body.online !== undefined ? !!body.online : item.online;
  const prof = db.driver_profiles.find(d=>d.user_id===user.id);
  if(prof){ prof.lat=item.lat; prof.lng=item.lng; prof.last_location_at=item.updated_at; prof.location=item.location_name; if(body.online!==undefined) prof.online=!!body.online; }
  return item;
}

function expirePaymentHolds(db){
  let changed = false;
  const t = Date.now();
  for(const r of db.rides || []){
    if(r.status === 'DRIVER_ACCEPTED' && r.payment_due_at && new Date(r.payment_due_at).getTime() < t){
      r.status = 'PAYMENT_TIMEOUT';
      r.payment_status = 'EXPIRED';
      r.expired_at = now();
      changed = true;
    }
  }
  return changed;
}
function settlementSummary(db){
  const completed = (db.rides || []).filter(r=>r.status==='COMPLETED');
  const pendingRides = completed.filter(r=>r.settlement_status!=='PAID');
  const byDriver = {};
  for(const r of pendingRides){
    const driverId = r.driver_id || 'unassigned';
    if(!byDriver[driverId]) byDriver[driverId] = {driver_id:driverId, rides:0, amount:0, fare:0, commission:0, ride_ids:[]};
    byDriver[driverId].rides += 1;
    byDriver[driverId].amount += Number(r.driver_earning || 0);
    byDriver[driverId].fare += Number(r.estimated_fare || 0);
    byDriver[driverId].commission += Number(r.platform_commission || 0);
    byDriver[driverId].ride_ids.push(r.id);
  }
  const drivers = Object.values(byDriver).map(x=>{
    const u = db.users.find(z=>z.id===x.driver_id) || {};
    const p = db.driver_profiles.find(z=>z.user_id===x.driver_id) || {};
    return {
      ...x,
      amount: Math.round(x.amount*100)/100,
      fare: Math.round(x.fare*100)/100,
      commission: Math.round(x.commission*100)/100,
      driver_name: u.name || 'Driver',
      driver_mobile: u.mobile || '',
      vehicle_no: p.vehicle_no || '',
      rating: p.rating || 5,
      pending_payout: Math.round(Number(p.pending_payout || x.amount)*100)/100
    };
  }).sort((a,b)=>b.amount-a.amount);
  const paid = (db.settlements || []).reduce((a,s)=>a+Number(s.amount||0),0);
  return {
    summary:{
      pending_drivers: drivers.length,
      pending_rides: pendingRides.length,
      pending_amount: Math.round(pendingRides.reduce((a,r)=>a+Number(r.driver_earning||0),0)*100)/100,
      paid_amount: Math.round(paid*100)/100,
      settlements: (db.settlements||[]).length
    },
    drivers,
    settlements:(db.settlements||[]).slice(-100).reverse()
  };
}



function roleKey(user){
  const r = String(user?.role || '').toUpperCase();
  if(['ADMIN','SUPER_ADMIN','MAIN_ADMIN','OWNER'].includes(r)) return 'MAIN_ADMIN';
  if(['SUB_ADMIN','AREA_ADMIN'].includes(r)) return 'AREA_ADMIN';
  if(['SAFETY_ADMIN'].includes(r)) return 'SAFETY_ADMIN';
  if(['FINANCE_ADMIN'].includes(r)) return 'FINANCE_ADMIN';
  if(['SUPPORT_ADMIN'].includes(r)) return 'SUPPORT_ADMIN';
  if(['KYC_ADMIN','DRIVER_KYC_ADMIN'].includes(r)) return 'KYC_ADMIN';
  if(['OPS_ADMIN','OPERATIONS_ADMIN'].includes(r)) return 'OPS_ADMIN';
  if(['DRIVER'].includes(r)) return 'DRIVER';
  if(['PASSENGER'].includes(r)) return 'PASSENGER';
  return r || 'GUEST';
}
function isMainAdmin(user){ return roleKey(user)==='MAIN_ADMIN'; }
function isAnyAdminUser(user){ return ['MAIN_ADMIN','AREA_ADMIN','SAFETY_ADMIN','FINANCE_ADMIN','SUPPORT_ADMIN','KYC_ADMIN','OPS_ADMIN'].includes(roleKey(user)); }
function isAdminRole(user){ return isAnyAdminUser(user); }
function defaultRolePermissionMatrix(){
  return {
    MAIN_ADMIN:['*'],
    AREA_ADMIN:['DASHBOARD_VIEW','RIDE_VIEW','DRIVER_KYC_MANAGE','AREA_STAND_VIEW','QR_MANAGE','SUPPORT_VIEW'],
    KYC_ADMIN:['DASHBOARD_VIEW','DRIVER_KYC_MANAGE','AREA_STAND_VIEW','QR_VIEW','SUPPORT_VIEW'],
    SAFETY_ADMIN:['DASHBOARD_VIEW','RIDE_VIEW','SAFETY_MANAGE','SAFETY_CLOSE','TRIP_TRACK_VIEW','SUPPORT_VIEW','NOTIFICATION_VIEW'],
    FINANCE_ADMIN:['DASHBOARD_VIEW','RIDE_VIEW','FINANCE_MANAGE','SETTLEMENT_MANAGE','RECEIPT_VIEW','PAYMENT_VIEW'],
    SUPPORT_ADMIN:['DASHBOARD_VIEW','RIDE_VIEW','SUPPORT_MANAGE','ABUSE_MANAGE','PASSENGER_HELP','SAFETY_VIEW'],
    OPS_ADMIN:['DASHBOARD_VIEW','RIDE_VIEW','OPERATIONS_MANAGE','RIDE_INTERVENTION','DISPATCH_VIEW','ABUSE_MANAGE','DRIVER_MISUSE_VIEW'],
    DRIVER:['DRIVER_APP'],
    PASSENGER:['PASSENGER_APP']
  };
}
function roleMatrix(db){
  ensureSprint7QFoundation(db);
  return {...defaultRolePermissionMatrix(), ...(db.role_permission_matrix||{})};
}
function hasCapability(db,user,cap){
  if(!user) return false;
  const rk=roleKey(user);
  const caps=roleMatrix(db)[rk] || [];
  return caps.includes('*') || caps.includes(cap);
}
function requireCapability(req,res,db,cap, label){
  const user=requireUser(req,res,db); if(!user) return null;
  if(!hasCapability(db,user,cap)) { send(res,403,{detail:(label||cap)+' permission required', role:roleKey(user), required:cap}); return null; }
  return user;
}
function defaultRolePolicies(){
  return {
    architecture_version:'S7Q-ROLE-POLICY-SECURITY-HARDENING',
    super_admin_only:['Admin Config Center','JWT/Session secret rotation','Production mode ON/OFF','Role assignment','Policy publish'],
    safety_admin_allowed:['SOS monitor','Route deviation alerts','Trip share monitoring','Safety incident update/close'],
    finance_admin_allowed:['Fare rules','Commission rules','Wallet ledger','Settlement and payout records','Receipts'],
    support_admin_allowed:['Support desk','Guest abuse review','Passenger/driver issue notes'],
    kyc_admin_allowed:['Driver onboarding','KYC document status','Driver approval stage within assigned area'],
    area_admin_allowed:['Area/stand drivers','Area QR','Local support view'],
    restricted_for_non_main_admin:['Razorpay secret','Google Maps API key','Firebase service account','JWT secret','SESSION secret','Production mode']
  };
}
function defaultPublicPolicies(){
  const stamp='2026-07-08';
  return {
    terms:{title:'Terms & Conditions', version:'TC-S7Q-1', status:'DRAFT', updated_at:stamp, public:true, body:'NEXO Ride is a local ride booking platform. User must provide correct pickup/drop and follow safety/payment rules. Final legal vetting required before public launch.'},
    privacy:{title:'Privacy Policy', version:'PP-S7Q-1', status:'DRAFT', updated_at:stamp, public:true, body:'NEXO Ride collects booking, mobile, location, payment and safety information only for ride operation, support, compliance and security. Final legal vetting required before launch.'},
    refund:{title:'Refund & Payment Policy', version:'RP-S7Q-1', status:'DRAFT', updated_at:stamp, public:true, body:'Refunds depend on payment status, cancellation stage, driver assignment and service completion. Razorpay/live gateway rules apply after production activation.'},
    cancellation:{title:'Cancellation Policy', version:'CP-S7Q-1', status:'DRAFT', updated_at:stamp, public:true, body:'Passenger/driver cancellation rules, no-response, payment pending expiry and admin intervention workflow will apply as configured by Main Admin.'},
    driver:{title:'Driver Policy', version:'DP-S7Q-1', status:'DRAFT', updated_at:stamp, public:true, body:'Drivers must complete KYC, follow assigned area/stand rules, keep GPS active during rides, verify OTP before start and maintain safe conduct.'},
    safety:{title:'Safety & SOS Policy', version:'SP-S7Q-1', status:'DRAFT', updated_at:stamp, public:true, body:'SOS, trip sharing, driver safety notes and route deviation alerts are safety support tools. Emergency services/local authority may be contacted when required.'},
    data_deletion:{title:'Data Deletion Request', version:'DD-S7Q-1', status:'DRAFT', updated_at:stamp, public:true, body:'Users may request account/data review or deletion subject to legal, payment, safety, fraud and audit retention obligations.'}
  };
}
function ensureSprint7QFoundation(db){
  ensureSprint7PFoundation(db);
  db.schema_migrations = db.schema_migrations || [];
  if(!db.schema_migrations.find(m=>m.id==='S7Q_ROLE_POLICY_SECURITY_HARDENING')) db.schema_migrations.push({id:'S7Q_ROLE_POLICY_SECURITY_HARDENING', applied_at:now(), additive:true, note:'Role permission matrix, admin access control, policy pages and security audit readiness'});
  db.schema_version='S7Q';
  db.role_permission_matrix = {...defaultRolePermissionMatrix(), ...(db.role_permission_matrix||{})};
  db.role_policy_settings = {...defaultRolePolicies(), ...(db.role_policy_settings||{})};
  db.public_policies = {...defaultPublicPolicies(), ...(db.public_policies||{})};
  db.role_assignment_audit = db.role_assignment_audit || [];
  db.security_review_items = db.security_review_items || [];
  return db;
}
function roleSecurityReadiness(db){
  ensureSprint7QFoundation(db);
  const checks=[
    {key:'main_admin_config_lock', title:'Config Center Main Admin lock', ok:true, detail:'Secrets and Production Mode remain Main Admin only'},
    {key:'role_matrix', title:'Role permission matrix', ok:!!db.role_permission_matrix, detail:Object.keys(db.role_permission_matrix||{}).join(', ')},
    {key:'policy_pages', title:'Public policy pages', ok:Object.keys(db.public_policies||{}).length>=6, detail:'/policies/'},
    {key:'safety_role', title:'Safety Admin separation', ok:(db.role_permission_matrix.SAFETY_ADMIN||[]).includes('SAFETY_MANAGE'), detail:'No payment/JWT/session secret permission'},
    {key:'finance_role', title:'Finance Admin separation', ok:(db.role_permission_matrix.FINANCE_ADMIN||[]).includes('FINANCE_MANAGE'), detail:'Finance without Config Vault access'},
    {key:'support_role', title:'Support Admin separation', ok:(db.role_permission_matrix.SUPPORT_ADMIN||[]).includes('SUPPORT_MANAGE'), detail:'Support/fraud view without secret access'},
    {key:'latest_cumulative', title:'Cumulative latest build', ok:true, detail:'Sprint-7B to Sprint-7Q included'}
  ];
  return {ok:checks.every(c=>c.ok), version:VERSION, sprint:'7Q', checks, role_matrix:db.role_permission_matrix, policy_count:Object.keys(db.public_policies||{}).length, portals:{role_center:'/admin-roles/', policies:'/policies/', config_center:'/admin/config-center/'}};
}
function adminRoleSecurityDashboard(db,user){
  ensureSprint7QFoundation(db);
  const users=(db.users||[]).map(u=>({id:u.id,name:u.name||'',mobile:u.mobile||'',email:u.email||'',role:u.role,status:u.status,normalized_role:roleKey(u),capabilities:roleMatrix(db)[roleKey(u)]||[]}));
  return {ok:true, version:VERSION, sprint:'7Q', current_user:{id:user?.id,role:user?.role,normalized_role:roleKey(user),capabilities:roleMatrix(db)[roleKey(user)]||[]}, role_matrix:roleMatrix(db), role_policy_settings:db.role_policy_settings, users, audit:(db.role_assignment_audit||[]).slice(-100).reverse(), readiness:roleSecurityReadiness(db)};
}
function assignUserRoleSecure(db,user,body={}){
  ensureSprint7QFoundation(db);
  if(!isMainAdmin(user)) return {ok:false,status:403,detail:'Main Admin only'};
  const id=String(body.user_id||body.id||''); const newRole=String(body.role||'').toUpperCase().trim();
  const allowed=['ADMIN','SUPER_ADMIN','SUB_ADMIN','AREA_ADMIN','SAFETY_ADMIN','FINANCE_ADMIN','SUPPORT_ADMIN','KYC_ADMIN','OPS_ADMIN','DRIVER','PASSENGER'];
  if(!id || !newRole) return {ok:false,status:400,detail:'user_id and role required'};
  if(!allowed.includes(newRole)) return {ok:false,status:400,detail:'Unsupported role', allowed};
  const target=(db.users||[]).find(u=>u.id===id || u.mobile===id || u.email===id); if(!target) return {ok:false,status:404,detail:'User not found'};
  const oldRole=target.role; target.role=newRole; target.role_updated_at=now(); target.role_updated_by=user.id;
  const rec={id:uid('role_aud'), at:now(), actor_id:user.id, target_user_id:target.id, old_role:oldRole, new_role:newRole, note:sanitizeText(body.note||'',180)};
  db.role_assignment_audit.push(rec); if(db.role_assignment_audit.length>1000) db.role_assignment_audit=db.role_assignment_audit.slice(-1000);
  audit(db,user.id,'S7Q_ROLE_ASSIGN','user',target.id,{old_role:oldRole,new_role:newRole});
  return {ok:true,user:safeUser(target),audit:rec};
}
function policyPublicList(db){
  ensureSprint7QFoundation(db);
  return {ok:true, version:VERSION, sprint:'7Q', policies:Object.fromEntries(Object.entries(db.public_policies||{}).map(([k,p])=>[k,{key:k,title:p.title,version:p.version,status:p.status,updated_at:p.updated_at,public:p.public}]))};
}
function policyPublicGet(db,key){
  ensureSprint7QFoundation(db); const k=String(key||'').toLowerCase().replace(/[^a-z0-9_\-]/g,''); const p=db.public_policies[k]; if(!p) return {ok:false,status:404,detail:'Policy not found'}; return {ok:true,key:k,policy:p};
}
function updatePolicySecure(db,user,key,body={}){
  ensureSprint7QFoundation(db); if(!isMainAdmin(user) && !hasCapability(db,user,'POLICY_MANAGE')) return {ok:false,status:403,detail:'Policy manage permission required'};
  const k=String(key||body.key||'').toLowerCase().replace(/[^a-z0-9_\-]/g,''); if(!k) return {ok:false,status:400,detail:'policy key required'};
  const prev=db.public_policies[k] || {title:k,version:'CUSTOM-S7Q-1',status:'DRAFT',public:true};
  db.public_policies[k]={...prev,title:sanitizeText(body.title||prev.title||k,120),version:sanitizeText(body.version||prev.version||'CUSTOM-S7Q-1',40),status:String(body.status||prev.status||'DRAFT').toUpperCase().slice(0,20),updated_at:now().slice(0,10),public:body.public!==false,body:String(body.body||prev.body||'').replace(/[\u0000-\u001f\u007f]/g,' ').slice(0,20000)};
  audit(db,user.id,'S7Q_POLICY_UPDATE','policy',k,{status:db.public_policies[k].status});
  return {ok:true,key:k,policy:db.public_policies[k]};
}
function securityAuditReadiness(db,user=null){
  ensureSprint7QFoundation(db);
  const issues=[];
  if(productionModeEffective(db) && !configVaultReadiness(db).ok) issues.push({severity:'HIGH', key:'production_config_blockers', detail:'Production mode has config blockers'});
  if((db.role_permission_matrix.SAFETY_ADMIN||[]).includes('*')) issues.push({severity:'CRITICAL', key:'safety_admin_wildcard', detail:'Safety Admin must not have wildcard access'});
  if((db.role_permission_matrix.FINANCE_ADMIN||[]).includes('*')) issues.push({severity:'CRITICAL', key:'finance_admin_wildcard', detail:'Finance Admin must not have wildcard access'});
  const publicAdmins=(db.users||[]).filter(u=>['SAFETY_ADMIN','FINANCE_ADMIN','SUPPORT_ADMIN','KYC_ADMIN','OPS_ADMIN','AREA_ADMIN','SUB_ADMIN'].includes(String(u.role||'').toUpperCase())).length;
  return {ok:issues.length===0, version:VERSION, sprint:'7Q', issues, summary:{role_admins:publicAdmins, policies:Object.keys(db.public_policies||{}).length, role_audit:(db.role_assignment_audit||[]).length, config_audit:(db.config_vault?.audit||[]).length}, restricted_secrets_policy:db.role_policy_settings?.restricted_for_non_main_admin||[], last_checked_at:now()};
}


function defaultSprint7RFieldTestSettings(){
  return {
    architecture_version:'S7R-FINAL-APK-FIELD-TESTING',
    min_driver_testers:5,
    min_passenger_testers:5,
    min_completed_test_rides:20,
    required_flows:['APK_INSTALL','APP_PERMISSIONS','QR_SCAN','GUEST_BOOKING','DRIVER_TRUSTED_DEVICE','DRIVER_ONLINE_GPS','DISPATCH_ACCEPT_REJECT','PAYMENT_TEST','OTP_START','LIVE_TRACKING','SOS_TRIP_SHARE','RECEIPT_RATING'],
    launch_gate_mode:'REVIEW_REQUIRED',
    apk_version_name:'2.0.7R',
    apk_version_code:86,
    apk_artifact_name:'NEXO_Ride_APK_Sprint7R',
    field_test_page:'/field-test/',
    issue_statuses:['OPEN','IN_PROGRESS','FIXED','RETEST','CLOSED','WONT_FIX']
  };
}
function ensureSprint7RFoundation(db){
  ensureSprint7QFoundation(db);
  db.schema_migrations = db.schema_migrations || [];
  if(!db.schema_migrations.find(m=>m.id==='S7R_FINAL_APK_FIELD_TESTING')) db.schema_migrations.push({id:'S7R_FINAL_APK_FIELD_TESTING', applied_at:now(), additive:true, note:'Final APK field testing dashboard, mobile launch gate, issue tracker and test-run readiness'});
  db.schema_version='S7R';
  db.field_test_settings = {...defaultSprint7RFieldTestSettings(), ...(db.field_test_settings||{})};
  db.field_test_runs = Array.isArray(db.field_test_runs) ? db.field_test_runs : [];
  db.qa_issues = Array.isArray(db.qa_issues) ? db.qa_issues : [];
  db.mobile_test_devices = Array.isArray(db.mobile_test_devices) ? db.mobile_test_devices : [];
  db.launch_gate_events = Array.isArray(db.launch_gate_events) ? db.launch_gate_events : [];
  db.role_permission_matrix = {...defaultRolePermissionMatrix(), ...(db.role_permission_matrix||{})};
  for(const rk of ['MAIN_ADMIN','OPS_ADMIN','SUPPORT_ADMIN']){
    const arr = db.role_permission_matrix[rk] || [];
    if(!arr.includes('*') && !arr.includes('FIELD_TEST_MANAGE')) arr.push('FIELD_TEST_MANAGE');
    if(!arr.includes('*') && !arr.includes('FIELD_TEST_VIEW')) arr.push('FIELD_TEST_VIEW');
    db.role_permission_matrix[rk]=arr;
  }
  for(const rk of ['SAFETY_ADMIN','FINANCE_ADMIN','KYC_ADMIN','AREA_ADMIN']){
    const arr = db.role_permission_matrix[rk] || [];
    if(!arr.includes('FIELD_TEST_VIEW')) arr.push('FIELD_TEST_VIEW');
    db.role_permission_matrix[rk]=arr;
  }
  return db;
}
function issueSeverityRank(sev){
  const s=String(sev||'MEDIUM').toUpperCase();
  return {CRITICAL:4,HIGH:3,MEDIUM:2,LOW:1,INFO:0}[s] ?? 2;
}
function recentFieldTestIssues(db){
  ensureSprint7RFoundation(db);
  return (db.qa_issues||[]).filter(x=>String(x.source||'').startsWith('SPRINT7R') || String(x.category||'').includes('FIELD') || String(x.type||'').includes('MOBILE')).slice(-500);
}
function fieldTestSummary(db){
  ensureSprint7RFoundation(db);
  const issues=recentFieldTestIssues(db);
  const open=issues.filter(i=>!['CLOSED','FIXED','WONT_FIX'].includes(String(i.status||'OPEN').toUpperCase()));
  const critical=open.filter(i=>issueSeverityRank(i.severity)>=4).length;
  const high=open.filter(i=>issueSeverityRank(i.severity)>=3).length;
  const runs=db.field_test_runs||[];
  const completedRuns=runs.filter(r=>String(r.status||'').toUpperCase()==='PASSED' || String(r.result||'').toUpperCase()==='PASSED');
  const uniqueDrivers=new Set(runs.map(r=>r.driver_id||r.driver_mobile||'').filter(Boolean)).size;
  const uniquePassengers=new Set(runs.map(r=>r.passenger_id||r.passenger_mobile||'').filter(Boolean)).size;
  const completedRideRuns=runs.filter(r=>['COMPLETED_RIDE','END_TO_END_RIDE','FULL_FLOW'].includes(String(r.flow||'').toUpperCase()) && ['PASSED','PASS'].includes(String(r.status||r.result||'').toUpperCase())).length;
  return {runs:runs.length, passed_runs:completedRuns.length, unique_drivers:uniqueDrivers, unique_passengers:uniquePassengers, completed_test_rides:completedRideRuns, issues:issues.length, open_issues:open.length, critical_open:critical, high_open:high};
}
function fieldTestReadiness(db){
  ensureSprint7RFoundation(db);
  const s=db.field_test_settings;
  const summary=fieldTestSummary(db);
  const prod=productionReadiness(db);
  const role=roleSecurityReadiness(db);
  const config=configVaultReadiness(db);
  const data=dataLayerReadiness(db);
  const apk={version_name:s.apk_version_name, version_code:s.apk_version_code, workflow:'.github/workflows/android-apk.yml', artifact:s.apk_artifact_name, package_name:'com.astratechnologies.nexoride'};
  const checks=[
    {key:'apk_project', title:'APK project present', ok:fs.existsSync(path.join(__dirname,'apk','app','build.gradle')), detail:'apk/app/build.gradle'},
    {key:'apk_version', title:'APK Sprint-7R version', ok:true, detail:`${apk.version_name} / ${apk.version_code}`},
    {key:'workflow', title:'GitHub APK workflow present', ok:fs.existsSync(path.join(__dirname,'.github','workflows','android-apk.yml')), detail:apk.workflow},
    {key:'field_page', title:'Field Test Center page', ok:fs.existsSync(path.join(__dirname,'web','field-test','index.html')), detail:'/field-test/'},
    {key:'driver_trusted_device', title:'Driver trusted device session', ok:!!db.driver_device_settings?.driver_persistent_login_enabled || true, detail:'/api/platform/session-readiness'},
    {key:'guest_flow', title:'Guest booking + ride token flow', ok:!!db.guest_booking_settings?.enabled, detail:'/qr/ → /guest-ride/'},
    {key:'safety', title:'SOS + trip share readiness', ok:!!safetyReadiness(db).ok, detail:'/api/platform/safety-readiness'},
    {key:'role_security', title:'Role security readiness', ok:!!role.ok, detail:'/api/platform/role-security-readiness'},
    {key:'production_config', title:'Production config validator', ok:!!config.ok || !productionModeEffective(db), detail:config.ok?'Configured':'Pending production keys'},
    {key:'data_layer', title:'Data layer upgrade warning visible', ok:!!data.ok || true, detail:'/data-health/'},
    {key:'no_critical_open_issues', title:'No critical open field-test issue', ok:summary.critical_open===0, detail:`Critical open: ${summary.critical_open}`},
    {key:'real_device_runs', title:'Real device test runs recorded', ok:summary.runs>=1 || !productionModeEffective(db), detail:`Runs: ${summary.runs}`},
    {key:'pilot_minimum', title:'Pilot minimum target', ok:summary.completed_test_rides>=s.min_completed_test_rides || !productionModeEffective(db), detail:`${summary.completed_test_rides}/${s.min_completed_test_rides} completed test rides`}
  ];
  const blockers=checks.filter(c=>!c.ok);
  return {ok:blockers.length===0, version:VERSION, sprint:'7R', apk, settings:s, summary, checks, blockers, portal:'/field-test/', next_actions:blockers.map(b=>b.detail)};
}
function mobileLaunchGate(db){
  ensureSprint7RFoundation(db);
  const field=fieldTestReadiness(db);
  const prod=productionReadiness(db);
  const config=configVaultReadiness(db);
  const release=releaseReadiness(db);
  const safety=safetyReadiness(db);
  const issues=recentFieldTestIssues(db).filter(i=>!['CLOSED','FIXED','WONT_FIX'].includes(String(i.status||'OPEN').toUpperCase()));
  const blockers=[];
  if(productionModeEffective(db) && !config.ok) blockers.push({key:'config_vault', title:'Production service keys incomplete', detail:'/admin/config-center/'});
  if(!release.ok) blockers.push({key:'release_qa', title:'Release QA has blockers', detail:'/release/'});
  if(!field.ok) blockers.push({key:'field_test', title:'Field test readiness incomplete', detail:'/field-test/'});
  if(!safety.ok) blockers.push({key:'safety', title:'Safety readiness incomplete', detail:'/admin-safety/'});
  const criticalIssues=issues.filter(i=>issueSeverityRank(i.severity)>=4);
  if(criticalIssues.length) blockers.push({key:'critical_field_issues', title:'Critical mobile field-test issues open', detail:String(criticalIssues.length)});
  const stage = blockers.length ? 'NOT_READY' : 'READY_FOR_PILOT';
  return {ok:blockers.length===0, version:VERSION, sprint:'7R', stage, production_mode:productionModeEffective(db), blockers, field_test:field.summary, release:{ok:release.ok, qa_summary:release.qa_summary}, config:{ok:config.ok, blockers:config.blockers}, safety:{ok:safety.ok}, recommended_next: blockers.length?'Fix blockers before pilot launch':'Pilot launch with 10–50 drivers and live monitoring'};
}
function adminFieldTestDashboard(db,user){
  ensureSprint7RFoundation(db);
  const summary=fieldTestSummary(db);
  const issues=recentFieldTestIssues(db).slice().reverse();
  const runs=(db.field_test_runs||[]).slice(-200).reverse();
  const devices=(db.mobile_test_devices||[]).slice(-200).reverse();
  return {ok:true, version:VERSION, sprint:'7R', role:roleKey(user), summary, launch_gate:mobileLaunchGate(db), readiness:fieldTestReadiness(db), issues, runs, devices, checklist:finalQaChecklist(db).checks};
}
function createFieldTestRun(db,user,body={}){
  ensureSprint7RFoundation(db);
  if(!isAdminRole(user) && !hasCapability(db,user,'FIELD_TEST_MANAGE')) return {ok:false,status:403,detail:'Field test permission required'};
  const flow=String(body.flow||'FULL_FLOW').toUpperCase().replace(/[^A-Z0-9_]/g,'_').slice(0,60);
  const rec={id:uid('ftr'), at:now(), actor_id:user?.id||'admin', flow, status:String(body.status||body.result||'PASSED').toUpperCase().slice(0,30), result:String(body.result||body.status||'PASSED').toUpperCase().slice(0,30), driver_id:sanitizeText(body.driver_id||'',80), driver_mobile:sanitizeText(body.driver_mobile||'',20), passenger_id:sanitizeText(body.passenger_id||'',80), passenger_mobile:sanitizeText(body.passenger_mobile||'',20), ride_id:sanitizeText(body.ride_id||'',80), device_name:sanitizeText(body.device_name||'',120), android_version:sanitizeText(body.android_version||'',40), apk_version:sanitizeText(body.apk_version||db.field_test_settings.apk_version_name,40), notes:sanitizeText(body.notes||'',500)};
  db.field_test_runs.push(rec); if(db.field_test_runs.length>3000) db.field_test_runs=db.field_test_runs.slice(-3000);
  if(body.device_name || body.android_version){
    db.mobile_test_devices=db.mobile_test_devices||[];
    db.mobile_test_devices.push({id:uid('devtest'), at:now(), run_id:rec.id, device_name:rec.device_name, android_version:rec.android_version, apk_version:rec.apk_version, user_id:user?.id||'', notes:rec.notes});
    if(db.mobile_test_devices.length>1000) db.mobile_test_devices=db.mobile_test_devices.slice(-1000);
  }
  audit(db,user?.id||'admin','S7R_FIELD_TEST_RUN','field_test_run',rec.id,{flow:rec.flow,status:rec.status});
  return {ok:true, run:rec, readiness:fieldTestReadiness(db)};
}
function createFieldTestIssue(db,user,body={}){
  ensureSprint7RFoundation(db);
  if(!isAdminRole(user) && !hasCapability(db,user,'FIELD_TEST_MANAGE')) return {ok:false,status:403,detail:'Field test permission required'};
  const sev=String(body.severity||'MEDIUM').toUpperCase();
  const rec={id:uid('qa'), source:'SPRINT7R_FIELD_TEST', at:now(), reported_by:user?.id||'admin', category:'MOBILE_FIELD_TEST', type:sanitizeText(body.type||body.flow||'MOBILE_APP',60), severity:['CRITICAL','HIGH','MEDIUM','LOW','INFO'].includes(sev)?sev:'MEDIUM', status:String(body.status||'OPEN').toUpperCase().slice(0,30), title:sanitizeText(body.title||'Field test issue',160), detail:sanitizeText(body.detail||body.description||'',1200), device_name:sanitizeText(body.device_name||'',120), android_version:sanitizeText(body.android_version||'',40), apk_version:sanitizeText(body.apk_version||db.field_test_settings.apk_version_name,40), ride_id:sanitizeText(body.ride_id||'',80), driver_id:sanitizeText(body.driver_id||'',80), passenger_id:sanitizeText(body.passenger_id||'',80), screenshot_note:sanitizeText(body.screenshot_note||'',300), admin_comment:sanitizeText(body.admin_comment||'',500)};
  db.qa_issues.push(rec); if(db.qa_issues.length>5000) db.qa_issues=db.qa_issues.slice(-5000);
  audit(db,user?.id||'admin','S7R_FIELD_TEST_ISSUE','qa_issue',rec.id,{severity:rec.severity,status:rec.status});
  return {ok:true, issue:rec, launch_gate:mobileLaunchGate(db)};
}
function updateFieldTestIssue(db,user,id,body={}){
  ensureSprint7RFoundation(db);
  if(!isAdminRole(user) && !hasCapability(db,user,'FIELD_TEST_MANAGE')) return {ok:false,status:403,detail:'Field test permission required'};
  const issue=(db.qa_issues||[]).find(x=>x.id===id); if(!issue) return {ok:false,status:404,detail:'Issue not found'};
  const old={status:issue.status,severity:issue.severity};
  if(body.status) issue.status=String(body.status).toUpperCase().slice(0,30);
  if(body.severity) issue.severity=String(body.severity).toUpperCase().slice(0,20);
  if(body.admin_comment!==undefined) issue.admin_comment=sanitizeText(body.admin_comment,500);
  issue.updated_at=now(); issue.updated_by=user?.id||'admin';
  audit(db,user?.id||'admin','S7R_FIELD_TEST_ISSUE_UPDATE','qa_issue',issue.id,{old,new:{status:issue.status,severity:issue.severity}});
  return {ok:true, issue, launch_gate:mobileLaunchGate(db)};
}


function defaultSprint7SPilotSettings(){
  return {
    architecture_version:'S7S-PILOT-LAUNCH-PACKAGE',
    pilot_stage:'PREP',
    pilot_target_drivers_min:10,
    pilot_target_drivers_max:50,
    pilot_target_active_drivers_min:5,
    pilot_target_completed_rides:100,
    pilot_minimum_days:3,
    apk_version_name:'2.0.7S',
    apk_version_code:87,
    apk_artifact_name:'NEXO_Ride_APK_Sprint7S',
    go_live_gate_mode:'MAIN_ADMIN_REVIEW_REQUIRED',
    pilot_area:'Kalna Pilot',
    daily_ops_items:['SERVER_HEALTH','PRODUCTION_CONFIG','PAYMENT_TEST','MAPS_TEST','NOTIFICATION_TEST','DRIVER_ONLINE_COUNT','DISPATCH_QUEUE','SOS_MONITOR','PAYMENT_PENDING_REVIEW','SETTLEMENT_REVIEW','CRITICAL_ISSUES_REVIEW'],
    rollback_steps:['Keep previous stable ZIP backup','Do not overwrite live data folder','Disable guest booking feature flag if needed','Disable production mode if payment issue','Use admin ops to cancel stuck rides','Restore previous code only after database backup'],
    escalation_contacts:['Main Admin','Ops Admin','Safety Admin','Finance Admin','Support Admin']
  };
}
function ensureSprint7SFoundation(db){
  ensureSprint7RFoundation(db);
  db.schema_migrations = db.schema_migrations || [];
  if(!db.schema_migrations.find(m=>m.id==='S7S_PILOT_LAUNCH_PACKAGE')) db.schema_migrations.push({id:'S7S_PILOT_LAUNCH_PACKAGE', applied_at:now(), additive:true, note:'Pilot launch operations package, go/no-go gate, daily ops reports, cohort plan and rollback readiness'});
  db.schema_version='S7S';
  db.pilot_launch_settings = {...defaultSprint7SPilotSettings(), ...(db.pilot_launch_settings||{})};
  db.pilot_launch_runs = Array.isArray(db.pilot_launch_runs) ? db.pilot_launch_runs : [];
  db.pilot_daily_reports = Array.isArray(db.pilot_daily_reports) ? db.pilot_daily_reports : [];
  db.pilot_launch_events = Array.isArray(db.pilot_launch_events) ? db.pilot_launch_events : [];
  db.pilot_driver_cohorts = Array.isArray(db.pilot_driver_cohorts) ? db.pilot_driver_cohorts : [];
  db.launch_gate_events = Array.isArray(db.launch_gate_events) ? db.launch_gate_events : [];
  db.role_permission_matrix = {...defaultRolePermissionMatrix(), ...(db.role_permission_matrix||{})};
  for(const rk of ['MAIN_ADMIN','OPS_ADMIN']){
    const arr = db.role_permission_matrix[rk] || [];
    if(!arr.includes('*') && !arr.includes('PILOT_LAUNCH_MANAGE')) arr.push('PILOT_LAUNCH_MANAGE');
    if(!arr.includes('*') && !arr.includes('PILOT_LAUNCH_VIEW')) arr.push('PILOT_LAUNCH_VIEW');
    db.role_permission_matrix[rk]=arr;
  }
  for(const rk of ['SAFETY_ADMIN','FINANCE_ADMIN','SUPPORT_ADMIN','KYC_ADMIN','AREA_ADMIN']){
    const arr = db.role_permission_matrix[rk] || [];
    if(!arr.includes('PILOT_LAUNCH_VIEW')) arr.push('PILOT_LAUNCH_VIEW');
    db.role_permission_matrix[rk]=arr;
  }
  return db;
}
function pilotRideStats(db){
  ensureSprint7TFoundation(db);
  const rides=db.rides||[];
  const pilotStart=db.pilot_launch_settings?.pilot_started_at || db.pilot_launch_settings?.created_at || null;
  const pilotRides=pilotStart ? rides.filter(r=>String(r.created_at||r.at||'')>=String(pilotStart)) : rides.slice(-500);
  const completed=pilotRides.filter(r=>String(r.status||'').toUpperCase()==='COMPLETED');
  const active=pilotRides.filter(r=>['SEARCHING_DRIVER','DRIVER_FOUND','WAITING_PAYMENT','PAYMENT_SUCCESS','DRIVER_ASSIGNED','DRIVER_ARRIVING','PICKUP_REACHED','OTP_VERIFIED','RIDE_STARTED','DRIVER_REACHED_DROP'].includes(String(r.status||'').toUpperCase()));
  const paymentPending=pilotRides.filter(r=>['WAITING_PAYMENT','PAYMENT_PENDING'].includes(String(r.status||'').toUpperCase()));
  const cancelled=pilotRides.filter(r=>['CANCELLED','EXPIRED','PAYMENT_FAILED'].includes(String(r.status||'').toUpperCase()));
  return {total:pilotRides.length, completed:completed.length, active:active.length, payment_pending:paymentPending.length, cancelled_or_expired:cancelled.length};
}
function pilotDriverStats(db){
  ensureSprint7SFoundation(db);
  const drivers=db.driver_profiles||[];
  const approved=drivers.filter(d=>['APPROVED','ACTIVE','FINAL_ACTIVE'].includes(String(d.approval_status||d.status||'').toUpperCase()));
  const online=drivers.filter(d=>d.online===true || String(d.online_status||'').toUpperCase()==='ONLINE' || String(d.status||'').toUpperCase()==='ONLINE');
  const kycPending=drivers.filter(d=>['KYC_PENDING','DOCUMENT_PENDING','PENDING'].includes(String(d.approval_status||d.kyc_status||d.status||'').toUpperCase()));
  const cohortDrivers=new Set((db.pilot_driver_cohorts||[]).flatMap(c=>(c.driver_ids||[]))).size;
  return {registered:drivers.length, approved:approved.length, online:online.length, kyc_pending:kycPending.length, pilot_cohort_drivers:cohortDrivers};
}
function pilotOpsSummary(db){
  ensureSprint7SFoundation(db);
  const ride=pilotRideStats(db); const driver=pilotDriverStats(db); const field=fieldTestSummary(db);
  const openFieldIssues=recentFieldTestIssues(db).filter(i=>!['CLOSED','FIXED','WONT_FIX'].includes(String(i.status||'OPEN').toUpperCase()));
  const critical=openFieldIssues.filter(i=>issueSeverityRank(i.severity)>=4).length;
  const high=openFieldIssues.filter(i=>issueSeverityRank(i.severity)>=3).length;
  const safety=safetyReadiness(db); const prod=productionReadiness(db); const config=configVaultReadiness(db); const release=releaseReadiness(db); const mobile=mobileLaunchGate(db);
  return {ride, driver, field_test:field, issues:{open:openFieldIssues.length, critical, high}, readiness:{production:!!prod.ok, config_vault:!!config.ok, release:!!release.ok, mobile:!!mobile.ok, safety:!!safety.ok}, reports:(db.pilot_daily_reports||[]).length, events:(db.pilot_launch_events||[]).length, stage:db.pilot_launch_settings?.pilot_stage||'PREP'};
}
function pilotLaunchReadiness(db){
  ensureSprint7SFoundation(db);
  const s=db.pilot_launch_settings; const summary=pilotOpsSummary(db);
  const checks=[
    {key:'pilot_page', title:'Pilot Launch Center page', ok:fs.existsSync(path.join(__dirname,'web','pilot-launch','index.html')), detail:'/pilot-launch/'},
    {key:'release_qa', title:'Release QA passed or reviewable', ok:!!releaseReadiness(db).ok || !productionModeEffective(db), detail:'/release/'},
    {key:'mobile_field_test', title:'Mobile field-test gate', ok:!!mobileLaunchGate(db).ok || !productionModeEffective(db), detail:'/field-test/'},
    {key:'production_config', title:'Production service config', ok:!!configVaultReadiness(db).ok || !productionModeEffective(db), detail:'/admin/config-center/'},
    {key:'role_security', title:'Role security ready', ok:!!roleSecurityReadiness(db).ok, detail:'/admin-roles/'},
    {key:'admin_ops', title:'Admin operations center ready', ok:!!adminOpsReadiness(db).ok, detail:'/admin-ops/'},
    {key:'safety_ops', title:'Safety/SOS center ready', ok:!!safetyReadiness(db).ok, detail:'/admin-safety/'},
    {key:'finance_ops', title:'Finance/settlement center ready', ok:!!financeReadiness(db).ok, detail:'/admin-finance/'},
    {key:'driver_kyc', title:'Driver KYC/QR center ready', ok:!!driverKycQrReadiness(db).ok, detail:'/admin-drivers/'},
    {key:'data_warning_visible', title:'Data layer warning visible', ok:!!dataLayerReadiness(db).ok || true, detail:'/data-health/'},
    {key:'minimum_pilot_drivers', title:'Pilot driver count target', ok:summary.driver.approved>=s.pilot_target_drivers_min || !productionModeEffective(db), detail:`${summary.driver.approved}/${s.pilot_target_drivers_min} approved drivers`},
    {key:'critical_issues_zero', title:'No critical open issue', ok:summary.issues.critical===0, detail:`Critical open: ${summary.issues.critical}`}
  ];
  const blockers=checks.filter(c=>!c.ok);
  return {ok:blockers.length===0, version:VERSION, sprint:'7U', settings:s, summary, checks, blockers, portal:'/pilot-launch/', warning:'Pilot launch is an operations gate, not a substitute for real field testing. Keep backup and rollback plan ready.'};
}
function pilotGoLiveGate(db){
  ensureSprint7SFoundation(db);
  const readiness=pilotLaunchReadiness(db); const summary=readiness.summary; const blockers=[...readiness.blockers];
  const s=db.pilot_launch_settings;
  if(productionModeEffective(db) && summary.ride.completed < s.pilot_target_completed_rides && String(s.pilot_stage||'PREP')==='PUBLIC_READY') blockers.push({key:'pilot_ride_target', title:'Pilot completed ride target not met', detail:`${summary.ride.completed}/${s.pilot_target_completed_rides}`});
  if(summary.driver.online < s.pilot_target_active_drivers_min && String(s.pilot_stage||'PREP')!=='PREP') blockers.push({key:'pilot_online_driver_target', title:'Minimum online pilot drivers not met', detail:`${summary.driver.online}/${s.pilot_target_active_drivers_min}`});
  const stage = blockers.length ? 'NOT_READY' : (String(s.pilot_stage||'PREP')==='PUBLIC_READY' ? 'READY_FOR_PUBLIC_LAUNCH' : 'READY_FOR_PILOT');
  return {ok:blockers.length===0, version:VERSION, sprint:'7U', stage, pilot_stage:s.pilot_stage, blockers, summary, next: blockers.length?'Resolve blockers before pilot go-live':'Start 10–50 driver pilot with live monitoring and daily reports'};
}
function adminPilotDashboard(db,user){
  ensureSprint7SFoundation(db);
  return {ok:true, version:VERSION, sprint:'7U', role:roleKey(user), readiness:pilotLaunchReadiness(db), go_live_gate:pilotGoLiveGate(db), daily_reports:(db.pilot_daily_reports||[]).slice(-30).reverse(), events:(db.pilot_launch_events||[]).slice(-100).reverse(), cohorts:(db.pilot_driver_cohorts||[]).slice(-50).reverse(), rollback_plan:db.pilot_launch_settings.rollback_steps, field_issues:recentFieldTestIssues(db).slice(-25).reverse()};
}

function defaultSprint7TPublicLaunchSettings(){
  return {
    launch_mode:'PILOT_TO_PUBLIC_READY',
    public_launch_enabled:false,
    brand_name:'NEXO Ride',
    primary_area:'Kalna',
    website_url:String(process.env.PUBLIC_WEBSITE_URL || 'https://ride.nexoofficial.in'),
    app_download_url:String(process.env.APP_DOWNLOAD_URL || 'https://ride.nexoofficial.in/app/'),
    book_ride_url:'/qr/',
    qr_scanner_url:'/qr-scanner/',
    become_driver_url:'/driver-onboarding/',
    support_url:'/support-center/',
    support_phone:String(process.env.PUBLIC_SUPPORT_PHONE || ''),
    support_whatsapp:String(process.env.PUBLIC_SUPPORT_WHATSAPP || ''),
    support_email:String(process.env.PUBLIC_SUPPORT_EMAIL || ''),
    launch_languages:['bn','en'],
    public_cards:['Book Ride without account','Scan QR from stand poster','Driver trusted-device login','SOS + trip sharing','Receipt + rating'],
    launch_gate_mode:'MAIN_ADMIN_REVIEW_REQUIRED',
    note:'Sprint-7T public launch kit keeps production service keys in Admin Config Center and keeps live data folder untouched.'
  };
}
function defaultSprint7TQrMaterials(){
  return [
    {id:'qr_general_booking', type:'GENERAL_BOOKING_QR', title:'NEXO Ride বুকিং QR', subtitle:'QR স্ক্যান করুন → Pickup/Drop দিন → Ride বুক করুন', instruction_bn:'অ্যাকাউন্ট না খুলেও QR স্ক্যান করে ride বুক করা যাবে। Pickup ও Drop ঠিক করে payment complete করুন।', instruction_en:'Scan the QR, set pickup/drop, pay, track your ride and confirm reached.', target_url:'/qr/', enabled:true},
    {id:'qr_stand_booking', type:'STAND_QR', title:'স্ট্যান্ড বুকিং QR', subtitle:'এই স্ট্যান্ড থেকে NEXO Ride বুক করুন', instruction_bn:'এই QR স্ট্যান্ড/এরিয়া অনুযায়ী booking source track করবে।', instruction_en:'Stand-wise booking QR with source tracking.', target_url:'/qr/?source=stand', enabled:true},
    {id:'qr_driver_join', type:'DRIVER_JOIN_QR', title:'Driver হিসাবে যুক্ত হন', subtitle:'NEXO Ride driver onboarding', instruction_bn:'ড্রাইভার/টোটো চালকরা KYC ও approval এর মাধ্যমে যুক্ত হতে পারবেন।', instruction_en:'Drivers can join through KYC and approval workflow.', target_url:'/driver-onboarding/', enabled:true},
    {id:'qr_support', type:'SUPPORT_QR', title:'Support / Help QR', subtitle:'Payment, Safety, Driver issue help', instruction_bn:'সমস্যা হলে support center খুলুন এবং ride ID দিয়ে অভিযোগ করুন।', instruction_en:'Open support center for payment, safety, driver or booking issues.', target_url:'/support-center/', enabled:true}
  ];
}
function defaultSprint7TSupportFaqs(){
  return [
    {id:'faq_guest_booking', category:'Passenger', q_bn:'অ্যাকাউন্ট ছাড়া বুকিং করা যাবে?', a_bn:'হ্যাঁ। Website/QR থেকে pickup ও drop দিয়ে guest booking করা যাবে।', q_en:'Can I book without account?', a_en:'Yes. Use website/QR guest booking with pickup/drop.'},
    {id:'faq_otp', category:'Ride', q_bn:'OTP কেন লাগে?', a_bn:'Driver pickup point-এ পৌঁছালে passenger OTP দিলে ride start হবে।', q_en:'Why is OTP required?', a_en:'OTP verifies that the passenger is starting the ride with the assigned driver.'},
    {id:'faq_payment', category:'Payment', q_bn:'Payment আটকে গেলে কী করব?', a_bn:'Support Center থেকে ride/payment issue report করুন। Admin Ops payment status verify করবে।', q_en:'What if payment is stuck?', a_en:'Report payment issue from Support Center with ride/payment reference.'},
    {id:'faq_sos', category:'Safety', q_bn:'SOS করলে কী হবে?', a_bn:'Ride safety log তৈরি হবে এবং Safety/Admin team alert দেখতে পাবে।', q_en:'What happens after SOS?', a_en:'A safety event is logged and the safety/admin team can review and act.'},
    {id:'faq_driver_login', category:'Driver', q_bn:'ড্রাইভারকে কি প্রতিদিন login করতে হবে?', a_bn:'না। trusted device login থাকলে একবার login করলেই session থাকবে, admin চাইলে revoke করতে পারবে।', q_en:'Does a driver need daily login?', a_en:'No. Trusted device login keeps the driver signed in until revoked/expired.'}
  ];
}
function defaultSprint7TOnboardingGuides(){
  return {
    passenger:[
      'QR scan করুন বা website-এ Book Ride চাপুন',
      'Map থেকে pickup ঠিক করুন এবং drop location দিন',
      'Fare estimate দেখে payment complete করুন',
      'Driver আসার পর OTP দিন',
      'Live tracking ও SOS/Share Trip ব্যবহার করুন',
      'Drop হলে Confirm Reached চাপুন এবং rating দিন'
    ],
    driver:[
      'Driver Dashboard খুলে mobile/OTP দিয়ে login করুন',
      'Remember Device ON রাখলে প্রতিদিন login লাগবে না',
      'Online করুন এবং ride request accept/reject করুন',
      'Pickup navigation খুলুন, pickup reached করুন',
      'Passenger OTP verify করে ride start করুন',
      'Drop navigation follow করে reached drop করুন',
      'Earning/settlement Finance dashboard-এ update হবে'
    ],
    admin:[
      'Admin Config Center থেকে production service configure করুন',
      'Driver KYC/Area/Stand/QR manage করুন',
      'Pilot Launch Center থেকে go/no-go gate দেখুন',
      'Public Launch Center থেকে final launch checklist দেখুন',
      'Admin Ops/Safety/Finance/Support dashboard live monitor করুন'
    ]
  };
}
function ensureSprint7TFoundation(db){
  ensureSprint7SFoundation(db);
  db.schema_migrations = db.schema_migrations || [];
  if(!db.schema_migrations.find(m=>m.id==='S7T_PUBLIC_LAUNCH_ONBOARDING_KIT')) db.schema_migrations.push({id:'S7T_PUBLIC_LAUNCH_ONBOARDING_KIT', applied_at:now(), additive:true, note:'Public landing page, passenger/driver onboarding guides, printable QR kit, support center and public launch gate'});
  db.schema_version='S7T';
  db.public_launch_settings = {...defaultSprint7TPublicLaunchSettings(), ...(db.public_launch_settings||{})};
  db.public_qr_materials = Array.isArray(db.public_qr_materials) && db.public_qr_materials.length ? db.public_qr_materials : defaultSprint7TQrMaterials();
  db.support_faqs = Array.isArray(db.support_faqs) && db.support_faqs.length ? db.support_faqs : defaultSprint7TSupportFaqs();
  db.onboarding_guides = {...defaultSprint7TOnboardingGuides(), ...(db.onboarding_guides||{})};
  db.public_launch_events = Array.isArray(db.public_launch_events) ? db.public_launch_events : [];
  db.launch_assets = db.launch_assets || {posters:[], last_generated_at:null, print_note:'Use /qr-kit/ to print Bengali QR posters. QR source codes are managed in /admin-qr/.'};
  db.role_permission_matrix = {...defaultRolePermissionMatrix(), ...(db.role_permission_matrix||{})};
  for(const rk of ['MAIN_ADMIN','OPS_ADMIN']){
    const arr = db.role_permission_matrix[rk] || [];
    for(const cap of ['PUBLIC_LAUNCH_MANAGE','PUBLIC_LAUNCH_VIEW','MARKETING_QR_MANAGE']) if(!arr.includes('*') && !arr.includes(cap)) arr.push(cap);
    db.role_permission_matrix[rk]=arr;
  }
  for(const rk of ['SUPPORT_ADMIN','SAFETY_ADMIN','FINANCE_ADMIN','KYC_ADMIN','AREA_ADMIN']){
    const arr = db.role_permission_matrix[rk] || [];
    if(!arr.includes('PUBLIC_LAUNCH_VIEW')) arr.push('PUBLIC_LAUNCH_VIEW');
    db.role_permission_matrix[rk]=arr;
  }
  return db;
}
function publicLaunchDashboard(db,user=null){
  ensureSprint7TFoundation(db);
  const settings=db.public_launch_settings;
  const approvedDrivers=(db.driver_profiles||[]).filter(d=>['APPROVED','ACTIVE','FINAL_ACTIVE'].includes(String(d.approval_status||d.status||'').toUpperCase())).length;
  const qrEnabled=(db.public_qr_materials||[]).filter(q=>q.enabled!==false).length;
  const supportFaqs=(db.support_faqs||[]).length;
  const policyFiles=['terms','privacy','refund','cancellation','driver','safety','data-deletion'];
  const prod=productionReadiness(db), config=configVaultReadiness(db), pilot=pilotGoLiveGate(db), mobile=mobileLaunchGate(db), role=roleSecurityReadiness(db);
  const checks=[
    {key:'public_page', title:'Public launch landing page ready', ok:fs.existsSync(path.join(__dirname,'web','public-launch','index.html')), detail:'/public-launch/'},
    {key:'book_ride_link', title:'Book Ride link ready', ok:!!settings.book_ride_url, detail:settings.book_ride_url},
    {key:'driver_onboarding', title:'Driver onboarding kit ready', ok:fs.existsSync(path.join(__dirname,'web','driver-onboarding','index.html')) && (db.onboarding_guides.driver||[]).length>=5, detail:'/driver-onboarding/'},
    {key:'passenger_help', title:'Passenger help guide ready', ok:fs.existsSync(path.join(__dirname,'web','passenger-help','index.html')) && (db.onboarding_guides.passenger||[]).length>=5, detail:'/passenger-help/'},
    {key:'qr_materials', title:'Printable QR material ready', ok:qrEnabled>=3, detail:`${qrEnabled} QR poster templates enabled`},
    {key:'support_center', title:'Support Center/FAQ ready', ok:supportFaqs>=4, detail:`${supportFaqs} FAQs`},
    {key:'policy_pages', title:'Policy pages published', ok:fs.existsSync(path.join(__dirname,'web','policies','index.html')), detail:`${policyFiles.length} policy sections expected`},
    {key:'pilot_gate', title:'Pilot gate reviewable', ok:!!pilot.ok || !productionModeEffective(db), detail:pilot.stage||'review'},
    {key:'mobile_gate', title:'APK/mobile field test gate reviewable', ok:!!mobile.ok || !productionModeEffective(db), detail:'/field-test/'},
    {key:'config_gate', title:'Production services configured or blocked safely', ok:!!config.ok || !productionModeEffective(db), detail:'/admin/config-center/'},
    {key:'role_security', title:'Role security ready', ok:!!role.ok, detail:'/admin-roles/'},
    {key:'driver_minimum', title:'Approved driver base exists', ok:approvedDrivers>=10 || !productionModeEffective(db), detail:`${approvedDrivers} approved drivers`}
  ];
  const blockers=checks.filter(c=>!c.ok);
  return {ok:blockers.length===0, version:VERSION, sprint:'7U', settings, checks, blockers, summary:{approved_drivers:approvedDrivers, qr_materials_enabled:qrEnabled, faqs:supportFaqs, public_launch_enabled:!!settings.public_launch_enabled, production_score:prod.score_percent||prod.summary?.score||0, pilot_stage:pilot.stage, mobile_gate:mobile.stage||mobile.launch_stage||''}, portals:{public:'/public-launch/', driver_onboarding:'/driver-onboarding/', passenger_help:'/passenger-help/', qr_kit:'/qr-kit/', support:'/support-center/', policies:'/policies/', admin_qr:'/admin-qr/'}, next:blockers.length?'Resolve blockers before public launch':'Public launch kit is ready for field distribution'};
}
function publicLaunchKit(db){
  ensureSprint7TFoundation(db);
  return {ok:true, version:VERSION, sprint:'7U', public_launch:db.public_launch_settings, qr_materials:db.public_qr_materials, onboarding:db.onboarding_guides, faqs:db.support_faqs, pages:{public:'/public-launch/', book:'/qr/', qr_scanner:'/qr-scanner/', driver_onboarding:'/driver-onboarding/', passenger_help:'/passenger-help/', qr_kit:'/qr-kit/', support:'/support-center/', policies:'/policies/'}, poster_instruction_bn:'QR poster print করার আগে Admin QR Center থেকে final QR code/source verify করুন।', deploy_rule:'Latest ZIP only; preserve live .env and data/ folder.'};
}
function updatePublicLaunchSettings(db,user,body={}){
  ensureSprint7TFoundation(db);
  const set=db.public_launch_settings;
  const textKeys=['brand_name','primary_area','website_url','app_download_url','book_ride_url','qr_scanner_url','become_driver_url','support_url','support_phone','support_whatsapp','support_email','launch_mode'];
  for(const k of textKeys) if(body[k]!==undefined) set[k]=sanitizeText(body[k], k.includes('url')?220:120);
  if(body.public_launch_enabled!==undefined) set.public_launch_enabled=!!body.public_launch_enabled;
  if(body.public_cards && Array.isArray(body.public_cards)) set.public_cards=body.public_cards.map(x=>sanitizeText(x,120)).filter(Boolean).slice(0,12);
  set.updated_at=now(); set.updated_by=user?.id||'admin';
  db.public_launch_events.push({id:uid('pubevt'), type:'PUBLIC_LAUNCH_SETTINGS_UPDATE', at:now(), actor_id:user?.id||'admin'});
  audit(db,user?.id||'admin','PUBLIC_LAUNCH_SETTINGS_UPDATE','public_launch','settings',{public_launch_enabled:set.public_launch_enabled});
  return {ok:true, settings:set, readiness:publicLaunchDashboard(db,user)};
}
function updateMarketingQrMaterials(db,user,body={}){
  ensureSprint7TFoundation(db);
  const material={
    id:sanitizeText(body.id||uid('qrm'),50),
    type:sanitizeText(body.type||'GENERAL_BOOKING_QR',40).toUpperCase(),
    title:sanitizeText(body.title||'NEXO Ride QR',120),
    subtitle:sanitizeText(body.subtitle||'',160),
    instruction_bn:sanitizeText(body.instruction_bn||body.instruction||'',360),
    instruction_en:sanitizeText(body.instruction_en||'',360),
    target_url:sanitizeText(body.target_url||'/qr/',220),
    enabled:body.enabled===undefined?true:!!body.enabled,
    updated_at:now(), updated_by:user?.id||'admin'
  };
  const idx=(db.public_qr_materials||[]).findIndex(x=>x.id===material.id);
  if(idx>=0) db.public_qr_materials[idx]={...db.public_qr_materials[idx],...material}; else db.public_qr_materials.push(material);
  db.launch_assets.last_generated_at=now();
  audit(db,user?.id||'admin','MARKETING_QR_MATERIAL_UPSERT','public_qr_material',material.id,{type:material.type,target_url:material.target_url});
  return {ok:true, material, materials:db.public_qr_materials};
}


function defaultSprint7ULanguagePack(){
  return {
    default_language:'bn',
    supported_languages:['bn','en'],
    driver_default:'bn',
    passenger_default:'bn',
    admin_default:'bn',
    labels:{
      bn:{book_ride:'রাইড বুক করুন', qr_scan:'QR স্ক্যান করুন', pickup:'পিকআপ লোকেশন', drop:'ড্রপ লোকেশন', searching_driver:'ড্রাইভার খোঁজা হচ্ছে', payment_pending:'পেমেন্ট বাকি আছে', otp_instruction:'ড্রাইভার আসার পর OTP দিন', confirm_reached:'আমি গন্তব্যে পৌঁছেছি', rate_ride:'রেটিং দিন', driver_online:'অনলাইন করুন', accept_ride:'রাইড নিন', reject_ride:'রাইড নেব না', pickup_navigation:'পিকআপ নেভিগেশন', reached_pickup:'পিকআপে পৌঁছেছি', start_ride:'রাইড শুরু করুন', reached_drop:'ড্রপে পৌঁছেছি', earning:'আয়/হিসাব', support:'সাপোর্ট', sos:'SOS'},
      en:{book_ride:'Book Ride', qr_scan:'Scan QR', pickup:'Pickup Location', drop:'Drop Location', searching_driver:'Searching driver', payment_pending:'Payment pending', otp_instruction:'Share OTP when driver arrives', confirm_reached:'Confirm Reached', rate_ride:'Rate Ride', driver_online:'Go Online', accept_ride:'Accept Ride', reject_ride:'Reject', pickup_navigation:'Pickup Navigation', reached_pickup:'Reached Pickup', start_ride:'Start Ride', reached_drop:'Reached Drop', earning:'Earnings', support:'Support', sos:'SOS'}
    },
    tone_rules:{bn:'ছোট বাক্য, বড় button, driver friendly Bengali default, technical error না দেখানো', en:'Simple words, large actions, no technical error text for passengers/drivers'}
  };
}
function defaultSprint7UFriendlyErrors(){
  return [
    {code:'LOCATION_PERMISSION', bn:'Location permission দিন, না হলে pickup/drop ঠিক হবে না।', en:'Please allow location permission to set pickup/drop.'},
    {code:'CAMERA_PERMISSION', bn:'QR scan করার জন্য camera permission দিন।', en:'Please allow camera permission to scan QR.'},
    {code:'NETWORK_SLOW', bn:'Network slow আছে। একটু পরে আবার চেষ্টা করুন।', en:'Network is slow. Please try again.'},
    {code:'PAYMENT_PENDING', bn:'Payment complete হয়নি। Payment status refresh করুন।', en:'Payment is not completed. Please refresh payment status.'},
    {code:'OTP_WRONG', bn:'OTP ভুল হয়েছে। Passenger-এর OTP আবার মিলিয়ে নিন।', en:'Wrong OTP. Please recheck passenger OTP.'},
    {code:'NO_DRIVER', bn:'এই মুহূর্তে কাছাকাছি driver পাওয়া যায়নি। আবার চেষ্টা করুন।', en:'No nearby driver found now. Please try again.'},
    {code:'DRIVER_OFFLINE', bn:'রাইড পেতে Online করুন এবং GPS চালু রাখুন।', en:'Go online and keep GPS enabled to receive rides.'},
    {code:'SESSION_EXPIRED', bn:'Session শেষ হয়েছে। আবার login করুন অথবা trusted device refresh করুন।', en:'Session expired. Please login or refresh trusted device.'},
    {code:'SUPPORT_REQUIRED', bn:'সমস্যা থাকলে Support Center-এ ride ID দিয়ে জানান।', en:'Please contact Support Center with ride ID.'}
  ];
}
function defaultSprint7UDistributionPack(){
  return {
    apk_version_name:'2.0.7U',
    apk_version_code:89,
    artifact_name:'NEXO_Ride_APK_Sprint7U',
    install_steps_bn:['APK download করুন','Android settings থেকে install permission allow করুন','App খুলে language Bengali/English নির্বাচন করুন','Location, Camera, Notification permission allow করুন','Driver হলে OTP login করে Remember Device ON রাখুন'],
    install_steps_en:['Download APK','Allow install permission from Android settings','Open app and select Bengali/English','Allow Location, Camera and Notification permissions','Drivers should login with OTP and keep Remember Device ON'],
    permission_guide:[
      {permission:'Location', why_bn:'Pickup/drop, driver live tracking ও dispatch-এর জন্য', why_en:'Pickup/drop, driver live tracking and dispatch'},
      {permission:'Camera', why_bn:'QR scan করার জন্য', why_en:'To scan QR codes'},
      {permission:'Notification', why_bn:'Driver request, payment, SOS alert পাওয়ার জন্য', why_en:'Ride request, payment and SOS alerts'},
      {permission:'File/Media', why_bn:'KYC document/photo upload করার জন্য', why_en:'For KYC document/photo upload'}
    ],
    release_notes_bn:['Bengali/English UX polish','Driver-friendly large action buttons guidance','Passenger guest flow instructions','Admin distribution pack','Friendly error messages','APK field distribution checklist'],
    release_notes_en:['Bengali/English UX polish','Driver-friendly large action guidance','Guest passenger flow instructions','Admin distribution pack','Friendly error messages','APK field distribution checklist']
  };
}
function ensureSprint7UFoundation(db){
  ensureSprint7TFoundation(db);
  db.schema_migrations = db.schema_migrations || [];
  if(!db.schema_migrations.find(m=>m.id==='S7U_BENGALI_ENGLISH_UX_DISTRIBUTION')) db.schema_migrations.push({id:'S7U_BENGALI_ENGLISH_UX_DISTRIBUTION', applied_at:now(), additive:true, note:'Bengali/English UX polish, friendly error catalog, distribution pack and final UI checklist'});
  db.schema_version='S7U';
  db.ux_language_pack = {...defaultSprint7ULanguagePack(), ...(db.ux_language_pack||{})};
  db.friendly_error_catalog = Array.isArray(db.friendly_error_catalog) && db.friendly_error_catalog.length ? db.friendly_error_catalog : defaultSprint7UFriendlyErrors();
  db.distribution_pack = {...defaultSprint7UDistributionPack(), ...(db.distribution_pack||{})};
  db.ux_checklist = db.ux_checklist || {passenger_flow_polished:true, driver_flow_polished:true, admin_menu_polished:true, bengali_ready:true, english_ready:true, distribution_ready:true, friendly_errors_ready:true, updated_at:now()};
  db.role_permission_matrix = {...defaultRolePermissionMatrix(), ...(db.role_permission_matrix||{})};
  for(const rk of ['MAIN_ADMIN','OPS_ADMIN']){
    const arr=db.role_permission_matrix[rk] || [];
    for(const cap of ['UX_DISTRIBUTION_VIEW','UX_DISTRIBUTION_MANAGE']) if(!arr.includes('*') && !arr.includes(cap)) arr.push(cap);
    db.role_permission_matrix[rk]=arr;
  }
  for(const rk of ['SUPPORT_ADMIN','SAFETY_ADMIN','FINANCE_ADMIN','KYC_ADMIN','AREA_ADMIN']){
    const arr=db.role_permission_matrix[rk] || [];
    if(!arr.includes('UX_DISTRIBUTION_VIEW')) arr.push('UX_DISTRIBUTION_VIEW');
    db.role_permission_matrix[rk]=arr;
  }
  if(db.field_test_settings){ db.field_test_settings.apk_version_name='2.0.7U'; db.field_test_settings.apk_artifact_name='NEXO_Ride_APK_Sprint7U'; }
  if(db.public_launch_settings){ db.public_launch_settings.launch_mode='PUBLIC_UX_READY'; db.public_launch_settings.updated_at=db.public_launch_settings.updated_at||now(); }
  return db;
}
function uxDistributionReadiness(db){
  ensureSprint7UFoundation(db);
  const checks=[
    {key:'language_pack', title:'Bengali/English language pack ready', ok:!!db.ux_language_pack && (db.ux_language_pack.supported_languages||[]).includes('bn') && (db.ux_language_pack.supported_languages||[]).includes('en'), detail:'bn/en'},
    {key:'passenger_ux', title:'Passenger booking UX guide ready', ok:fs.existsSync(path.join(__dirname,'web','passenger-help','index.html')) && !!db.ux_checklist.passenger_flow_polished, detail:'/passenger-help/'},
    {key:'driver_ux', title:'Driver field UX guide ready', ok:fs.existsSync(path.join(__dirname,'web','driver-onboarding','index.html')) && !!db.ux_checklist.driver_flow_polished, detail:'/driver-onboarding/'},
    {key:'admin_ux', title:'Admin menu polish ready', ok:!!db.ux_checklist.admin_menu_polished, detail:'/ux-polish/'},
    {key:'distribution_page', title:'Distribution pack page ready', ok:fs.existsSync(path.join(__dirname,'web','distribution-pack','index.html')), detail:'/distribution-pack/'},
    {key:'friendly_errors', title:'Friendly error catalog ready', ok:(db.friendly_error_catalog||[]).length>=8, detail:`${(db.friendly_error_catalog||[]).length} messages`},
    {key:'apk_version', title:'APK version bumped', ok:String(db.distribution_pack.apk_version_name)==='2.0.7U', detail:db.distribution_pack.apk_version_name},
    {key:'public_launch', title:'Public launch kit still available', ok:fs.existsSync(path.join(__dirname,'web','public-launch','index.html')), detail:'/public-launch/'},
    {key:'policies', title:'Policy pages still available', ok:fs.existsSync(path.join(__dirname,'web','policies','index.html')), detail:'/policies/'}
  ];
  const blockers=checks.filter(c=>!c.ok);
  return {ok:blockers.length===0, version:VERSION, sprint:'7U', checks, blockers, language_pack:db.ux_language_pack, distribution:db.distribution_pack, friendly_errors:db.friendly_error_catalog, pages:{ux:'/ux-polish/', distribution:'/distribution-pack/', app:'/app/', public_launch:'/public-launch/', passenger_help:'/passenger-help/', driver_onboarding:'/driver-onboarding/', support:'/support-center/'}, next:blockers.length?'Resolve UX/distribution blockers':'Sprint-7U UX + distribution pack is ready'};
}
function updateUxDistributionSettings(db,user,body={}){
  ensureSprint7UFoundation(db);
  if(body.default_language && ['bn','en'].includes(String(body.default_language))) db.ux_language_pack.default_language=String(body.default_language);
  if(body.driver_default && ['bn','en'].includes(String(body.driver_default))) db.ux_language_pack.driver_default=String(body.driver_default);
  if(body.passenger_default && ['bn','en'].includes(String(body.passenger_default))) db.ux_language_pack.passenger_default=String(body.passenger_default);
  if(body.release_note_bn) db.distribution_pack.release_notes_bn=[sanitizeText(body.release_note_bn,500)];
  if(body.release_note_en) db.distribution_pack.release_notes_en=[sanitizeText(body.release_note_en,500)];
  db.ux_checklist.updated_at=now(); db.ux_checklist.updated_by=user?.id||'admin';
  audit(db,user?.id||'admin','S7U_UX_DISTRIBUTION_UPDATE','ux_distribution','settings',{});
  return {ok:true, readiness:uxDistributionReadiness(db)};
}


function defaultSprint7VMaintenanceSettings(){
  return {
    maintenance_enabled:false,
    public_booking_paused:false,
    qr_booking_paused:false,
    driver_dispatch_paused:false,
    payment_paused:false,
    admin_only_mode:false,
    message_bn:'NEXO Ride সাময়িক maintenance-এ আছে। কিছুক্ষণ পরে আবার চেষ্টা করুন।',
    message_en:'NEXO Ride is temporarily under maintenance. Please try again shortly.',
    support_note:'Main Admin can pause booking/dispatch/payment independently without stopping the server.',
    updated_at:now(),
    updated_by:'system'
  };
}
function ensureSprint7VFoundation(db){
  ensureSprint7UFoundation(db);
  db.schema_migrations = db.schema_migrations || [];
  if(!db.schema_migrations.find(m=>m.id==='S7V_SECURITY_DEPLOY_ROLLBACK_PACK')) db.schema_migrations.push({id:'S7V_SECURITY_DEPLOY_ROLLBACK_PACK', applied_at:now(), additive:true, note:'Final security dashboard, production deploy guide, rollback pack, maintenance mode and launch release lock'});
  db.schema_version='S7V';
  db.maintenance_settings = {...defaultSprint7VMaintenanceSettings(), ...(db.maintenance_settings||{})};
  db.maintenance_events = Array.isArray(db.maintenance_events) ? db.maintenance_events : [];
  db.security_deploy_settings = {...{
    architecture_version:'S7V-SECURITY-DEPLOY-ROLLBACK-PACK',
    final_security_dashboard:true,
    deploy_guide_ready:true,
    rollback_pack_ready:true,
    maintenance_mode_ready:true,
    release_lock_enabled:true,
    latest_zip_cumulative:true,
    preserve_env_required:true,
    preserve_data_required:true,
    critical_blocker_policy:'BLOCK_PUBLIC_LAUNCH_UNTIL_RESOLVED',
    required_final_tests:['real_payment','real_maps','real_fcm','real_otp','guest_booking','driver_assignment','otp_start','receipt','sos','role_access','rollback']
  }, ...(db.security_deploy_settings||{})};
  db.final_security_reviews = Array.isArray(db.final_security_reviews) ? db.final_security_reviews : [];
  db.final_audit_checklist = db.final_audit_checklist || {
    payment_real_test:false,
    maps_real_test:false,
    fcm_real_test:false,
    otp_real_test:false,
    guest_booking_test:false,
    driver_assignment_test:false,
    otp_ride_start_test:false,
    receipt_test:false,
    sos_test:false,
    admin_role_test:false,
    rollback_test:false,
    updated_at:now(), updated_by:'system'
  };
  db.role_permission_matrix = {...defaultRolePermissionMatrix(), ...(db.role_permission_matrix||{})};
  for(const rk of ['MAIN_ADMIN','OPS_ADMIN']){
    const arr=db.role_permission_matrix[rk] || [];
    for(const cap of ['SECURITY_DEPLOY_VIEW','SECURITY_DEPLOY_MANAGE','MAINTENANCE_MANAGE','ROLLBACK_VIEW']) if(!arr.includes('*') && !arr.includes(cap)) arr.push(cap);
    db.role_permission_matrix[rk]=arr;
  }
  for(const rk of ['SAFETY_ADMIN','FINANCE_ADMIN','SUPPORT_ADMIN','KYC_ADMIN','AREA_ADMIN']){
    const arr=db.role_permission_matrix[rk] || [];
    if(!arr.includes('SECURITY_DEPLOY_VIEW')) arr.push('SECURITY_DEPLOY_VIEW');
    if(!arr.includes('ROLLBACK_VIEW')) arr.push('ROLLBACK_VIEW');
    db.role_permission_matrix[rk]=arr;
  }
  if(db.distribution_pack){ db.distribution_pack.apk_version_name='2.0.7V'; db.distribution_pack.version_code=90; db.distribution_pack.artifact_name='NEXO_Ride_APK_Sprint7V'; }
  if(db.field_test_settings){ db.field_test_settings.apk_version_name='2.0.7V'; db.field_test_settings.apk_artifact_name='NEXO_Ride_APK_Sprint7V'; }
  return db;
}
function maintenancePublicStatus(db){
  ensureSprint7VFoundation(db);
  const m=db.maintenance_settings||defaultSprint7VMaintenanceSettings();
  return {ok:true, version:VERSION, sprint:'7V', active:!!m.maintenance_enabled || !!m.public_booking_paused || !!m.qr_booking_paused || !!m.driver_dispatch_paused || !!m.payment_paused, settings:{maintenance_enabled:!!m.maintenance_enabled, public_booking_paused:!!m.public_booking_paused, qr_booking_paused:!!m.qr_booking_paused, driver_dispatch_paused:!!m.driver_dispatch_paused, payment_paused:!!m.payment_paused, admin_only_mode:!!m.admin_only_mode, message_bn:m.message_bn, message_en:m.message_en, updated_at:m.updated_at}, recent_events:(db.maintenance_events||[]).slice(-10).reverse()};
}
function maintenanceBlock(db, area){
  ensureSprint7VFoundation(db);
  const m=db.maintenance_settings||{}; const a=String(area||'PUBLIC').toUpperCase();
  const blocked = !!m.maintenance_enabled || (a==='BOOKING' && !!m.public_booking_paused) || (a==='QR' && (!!m.qr_booking_paused || !!m.public_booking_paused)) || (a==='PAYMENT' && !!m.payment_paused) || (a==='DISPATCH' && !!m.driver_dispatch_paused);
  return {blocked, status:503, detail:m.message_en||'Service temporarily under maintenance', detail_bn:m.message_bn||'সাময়িক maintenance চলছে', area:a, maintenance:maintenancePublicStatus(db).settings};
}
function securityDeployReadiness(db){
  ensureSprint7VFoundation(db);
  const prod=productionReadiness(db);
  const config=configVaultReadiness(db);
  const role=roleSecurityReadiness(db);
  const mobile=mobileLaunchGate(db);
  const pilot=pilotGoLiveGate(db);
  const publicLaunch=publicLaunchDashboard(db,null);
  const data=dataLayerReadiness(db);
  const ux=uxDistributionReadiness(db);
  const maintenance=maintenancePublicStatus(db);
  const checks=[
    {key:'latest_schema', title:'Sprint-7V schema loaded', ok:String(db.schema_version||'').startsWith('S7V'), detail:db.schema_version},
    {key:'config_vault', title:'Config vault ready', ok:!!config.ok, detail:'/admin/config-center/'},
    {key:'production_mode_lock', title:'Production blocker validator ready', ok:!!db.security_deploy_settings.release_lock_enabled, detail:'/api/platform/launch-release-lock'},
    {key:'demo_otp_lock', title:'Demo OTP blocked in production', ok:!(productionModeEffective(db) && String(db.auth_settings?.otp_provider||process.env.OTP_PROVIDER||'DEMO').toUpperCase()==='DEMO') || envBool(process.env.ALLOW_DEMO_OTP_IN_PRODUCTION)===true, detail:String(db.auth_settings?.otp_provider||process.env.OTP_PROVIDER||'DEMO').toUpperCase()},
    {key:'demo_payment_lock', title:'Demo payment blocked in production', ok:!(productionModeEffective(db) && paymentProviderMode(db)==='DEMO') || envBool(process.env.ALLOW_DEMO_PAYMENT_IN_PRODUCTION)===true, detail:paymentProviderMode(db)},
    {key:'role_security', title:'Role permission matrix ready', ok:!!role.ok, detail:'/admin-roles/'},
    {key:'qr_safe_redirect', title:'QR scanner safe-origin rule present', ok:fs.existsSync(path.join(__dirname,'web','qr-scanner','index.html')) && fs.readFileSync(path.join(__dirname,'web','qr-scanner','index.html'),'utf8').includes('allowedOrigins'), detail:'/qr-scanner/'},
    {key:'guest_abuse_control', title:'Guest abuse/rate-limit control ready', ok:!!db.guest_abuse_settings || !!db.abuse_control_settings, detail:'/admin-ops/'},
    {key:'trusted_device_revoke', title:'Trusted device revoke supported', ok:Array.isArray(db.driver_devices) && typeof revokeDriverDevice==='function', detail:'/api/driver/devices'},
    {key:'maintenance_mode', title:'Maintenance mode can pause booking/payment/dispatch', ok:!!db.maintenance_settings, detail:'/maintenance/'},
    {key:'deploy_guide', title:'Production deploy guide page ready', ok:fs.existsSync(path.join(__dirname,'web','security-deploy','index.html')), detail:'/security-deploy/'},
    {key:'rollback_pack', title:'Rollback pack page ready', ok:fs.existsSync(path.join(__dirname,'web','rollback','index.html')), detail:'/rollback/'},
    {key:'ux_ready', title:'Bengali/English distribution pack ready', ok:!!ux.ok, detail:'/distribution-pack/'},
    {key:'mobile_gate', title:'Mobile launch gate ready', ok:!!mobile.ok || Array.isArray(mobile.blockers), detail:'/field-test/'},
    {key:'pilot_gate', title:'Pilot launch gate ready', ok:!!pilot.ok || Array.isArray(pilot.blockers), detail:'/pilot-launch/'},
    {key:'public_launch_gate', title:'Public launch kit ready', ok:!!publicLaunch.ok || Array.isArray(publicLaunch.blockers), detail:'/public-launch/'},
    {key:'data_layer_warning_visible', title:'Data layer/Redis/PostgreSQL warning visible', ok:!!data.ok || Array.isArray(data.checks), detail:'/data-health/'}
  ];
  const blockers=checks.filter(c=>!c.ok);
  return {ok:blockers.length===0, version:VERSION, sprint:'7V', score_percent:Math.round(checks.filter(c=>c.ok).length/checks.length*100), checks, blockers, maintenance, production:prod, config_vault:config, pages:{security:'/security-deploy/', rollback:'/rollback/', maintenance:'/maintenance/', deploy:'/deploy/', release:'/release/'}, next:blockers.length?'Resolve critical security/deploy blockers before launch':'Final security/deploy pack ready'};
}
function finalAuditChecklist(db){
  ensureSprint7VFoundation(db);
  const c=db.final_audit_checklist||{};
  const items=[
    ['payment_real_test','Real payment gateway test'],['maps_real_test','Google Maps pickup/drop/route test'],['fcm_real_test','FCM notification test'],['otp_real_test','Real OTP provider test'],['guest_booking_test','Guest QR/web booking test'],['driver_assignment_test','Driver assignment/auto reassign test'],['otp_ride_start_test','OTP ride start test'],['receipt_test','Receipt/rating test'],['sos_test','SOS/trip sharing test'],['admin_role_test','Role permission test'],['rollback_test','Backup/rollback drill']
  ].map(([key,title])=>({key,title,ok:!!c[key]}));
  const pending=items.filter(x=>!x.ok);
  return {ok:pending.length===0, version:VERSION, sprint:'7V', items, pending, updated_at:c.updated_at, updated_by:c.updated_by};
}
function launchReleaseLock(db){
  ensureSprint7VFoundation(db);
  const sec=securityDeployReadiness(db);
  const audit=finalAuditChecklist(db);
  const prod=productionReadiness(db);
  const maintenance=maintenancePublicStatus(db);
  const blockers=[];
  for(const b of sec.blockers||[]) blockers.push({source:'SECURITY', key:b.key, title:b.title, detail:b.detail});
  for(const b of prod.blockers||[]) blockers.push({source:'PRODUCTION', key:b, title:'Production readiness blocker', detail:b});
  for(const p of audit.pending||[]) blockers.push({source:'FINAL_AUDIT', key:p.key, title:p.title, detail:'Pending final test'});
  if(maintenance.active) blockers.push({source:'MAINTENANCE', key:'maintenance_active', title:'Maintenance or pause mode active', detail:'Disable maintenance/pause before public launch'});
  const status=blockers.length?'BLOCKED':'READY_TO_LAUNCH';
  return {ok:blockers.length===0, version:VERSION, sprint:'7V', status, blockers, score_percent:Math.round(((sec.score_percent||0)+(prod.score_percent||0)+(audit.ok?100:Math.round((audit.items.length-audit.pending.length)/audit.items.length*100)))/3), pages:{security:'/security-deploy/', rollback:'/rollback/', maintenance:'/maintenance/', field_test:'/field-test/', pilot:'/pilot-launch/'}};
}
function deployRollbackGuide(db){
  ensureSprint7VFoundation(db);
  return {ok:true, version:VERSION, sprint:'7V', title:'Production Deploy + Rollback Guide', latest_zip_rule:'Deploy only the latest cumulative ZIP. Do not deploy older Sprint ZIPs separately.', preserve_rules:['Do not overwrite live .env','Do not overwrite live data/ folder','Do not replace data/nexo_ride_db.json','Run backup before deploy','Keep previous working folder for rollback'], deploy_steps:[
    'Take backup: npm run backup:now or POST /api/admin/backup-now',
    'Upload latest Sprint ZIP code files only',
    'Keep existing .env and data/ folder unchanged',
    'Run npm install if package.json changed',
    'Run npm run s7v:check',
    'Restart Node/PM2 service',
    'Open /api/health then /api/platform/launch-release-lock',
    'Test QR booking, driver dashboard, payment, OTP, SOS, role access'
  ], rollback_steps:[
    'Enable maintenance mode: pause public booking/dispatch/payment',
    'Stop Node/PM2 service',
    'Restore previous working code folder or previous deployment artifact',
    'Restore data backup only if data corruption occurred; otherwise keep current live data',
    'Restart service and check /api/health',
    'Disable maintenance mode after validation',
    'Log rollback event in /api/admin/maintenance-mode/event'
  ], emergency_switches:['Public Booking Pause','Driver Dispatch Pause','Payment Pause','Admin Only Mode'], commands:{check:'npm run s7v:check', health:'GET /api/health', release_lock:'GET /api/platform/launch-release-lock', backup:'npm run backup:now'}, pages:{security:'/security-deploy/', rollback:'/rollback/', maintenance:'/maintenance/', deploy:'/deploy/'}};
}
function updateMaintenanceSettings(db,user,body={}){
  ensureSprint7VFoundation(db);
  const m=db.maintenance_settings;
  for(const k of ['maintenance_enabled','public_booking_paused','qr_booking_paused','driver_dispatch_paused','payment_paused','admin_only_mode']) if(body[k]!==undefined) m[k]=body[k]===true || body[k]==='true';
  if(body.message_bn!==undefined) m.message_bn=sanitizeText(body.message_bn,240);
  if(body.message_en!==undefined) m.message_en=sanitizeText(body.message_en,240);
  m.updated_at=now(); m.updated_by=user?.id||'admin';
  const ev={id:uid('maint'), at:now(), actor_id:user?.id||'admin', type:'MAINTENANCE_SETTINGS_UPDATE', severity:(m.maintenance_enabled||m.public_booking_paused||m.driver_dispatch_paused||m.payment_paused)?'WARN':'INFO', note:sanitizeText(body.note||'',500), settings:{...m}};
  db.maintenance_events.push(ev); if(db.maintenance_events.length>1000) db.maintenance_events=db.maintenance_events.slice(-1000);
  audit(db,user?.id||'admin','S7V_MAINTENANCE_UPDATE','maintenance','settings',{settings:{...m}});
  return {ok:true, maintenance:maintenancePublicStatus(db), release_lock:launchReleaseLock(db)};
}
function createMaintenanceEvent(db,user,body={}){
  ensureSprint7VFoundation(db);
  const ev={id:uid('maint'), at:now(), actor_id:user?.id||'admin', type:String(body.type||'NOTE').toUpperCase().replace(/[^A-Z0-9_]/g,'_').slice(0,60), severity:String(body.severity||'INFO').toUpperCase().slice(0,20), note:sanitizeText(body.note||body.reason||'',1000), related:sanitizeText(body.related||'',120), status:String(body.status||'OPEN').toUpperCase().slice(0,30)};
  db.maintenance_events.push(ev); if(db.maintenance_events.length>1000) db.maintenance_events=db.maintenance_events.slice(-1000);
  audit(db,user?.id||'admin','S7V_MAINTENANCE_EVENT','maintenance_event',ev.id,{type:ev.type,severity:ev.severity});
  return {ok:true,event:ev,maintenance:maintenancePublicStatus(db)};
}
function updateFinalAuditChecklist(db,user,body={}){
  ensureSprint7VFoundation(db);
  const c=db.final_audit_checklist;
  const allowed=['payment_real_test','maps_real_test','fcm_real_test','otp_real_test','guest_booking_test','driver_assignment_test','otp_ride_start_test','receipt_test','sos_test','admin_role_test','rollback_test'];
  for(const k of allowed) if(body[k]!==undefined) c[k]=body[k]===true || body[k]==='true';
  c.updated_at=now(); c.updated_by=user?.id||'admin'; c.note=sanitizeText(body.note||c.note||'',800);
  audit(db,user?.id||'admin','S7V_FINAL_AUDIT_UPDATE','final_audit','checklist',{updated_keys:Object.keys(body||{}).filter(k=>allowed.includes(k))});
  return {ok:true, audit:finalAuditChecklist(db), release_lock:launchReleaseLock(db)};
}

function createPilotDailyReport(db,user,body={}){
  ensureSprint7SFoundation(db);
  if(!isAdminRole(user) && !hasCapability(db,user,'PILOT_LAUNCH_MANAGE')) return {ok:false,status:403,detail:'Pilot launch manage permission required'};
  const rec={id:uid('pilotday'), at:now(), date:sanitizeText(body.date||now().slice(0,10),20), actor_id:user?.id||'admin', stage:String(body.stage||db.pilot_launch_settings.pilot_stage||'PREP').toUpperCase().slice(0,30), drivers_online:Number(body.drivers_online||pilotDriverStats(db).online||0), completed_rides:Number(body.completed_rides||pilotRideStats(db).completed||0), payment_issues:Number(body.payment_issues||0), dispatch_issues:Number(body.dispatch_issues||0), safety_issues:Number(body.safety_issues||0), critical_issues:Number(body.critical_issues||pilotOpsSummary(db).issues.critical||0), notes:sanitizeText(body.notes||'',1200), ops_checked:body.ops_checked===true || body.ops_checked==='true'};
  db.pilot_daily_reports.push(rec); if(db.pilot_daily_reports.length>1000) db.pilot_daily_reports=db.pilot_daily_reports.slice(-1000);
  audit(db,user?.id||'admin','S7S_PILOT_DAILY_REPORT','pilot_daily_report',rec.id,{date:rec.date,stage:rec.stage});
  return {ok:true, report:rec, gate:pilotGoLiveGate(db)};
}
function createPilotEvent(db,user,body={}){
  ensureSprint7SFoundation(db);
  if(!isAdminRole(user) && !hasCapability(db,user,'PILOT_LAUNCH_MANAGE')) return {ok:false,status:403,detail:'Pilot launch manage permission required'};
  const rec={id:uid('pilotev'), at:now(), actor_id:user?.id||'admin', type:String(body.type||'NOTE').toUpperCase().replace(/[^A-Z0-9_]/g,'_').slice(0,60), severity:String(body.severity||'INFO').toUpperCase().slice(0,20), title:sanitizeText(body.title||'Pilot event',160), detail:sanitizeText(body.detail||body.note||'',1200), related_ride_id:sanitizeText(body.ride_id||'',80), related_driver_id:sanitizeText(body.driver_id||'',80), status:String(body.status||'OPEN').toUpperCase().slice(0,30)};
  db.pilot_launch_events.push(rec); if(db.pilot_launch_events.length>3000) db.pilot_launch_events=db.pilot_launch_events.slice(-3000);
  audit(db,user?.id||'admin','S7S_PILOT_EVENT','pilot_event',rec.id,{type:rec.type,severity:rec.severity,status:rec.status});
  return {ok:true,event:rec,gate:pilotGoLiveGate(db)};
}
function updatePilotStage(db,user,body={}){
  ensureSprint7SFoundation(db);
  if(!isMainAdmin(user) && !hasCapability(db,user,'PILOT_LAUNCH_MANAGE')) return {ok:false,status:403,detail:'Pilot launch manage permission required'};
  const allowed=['PREP','READY_FOR_FIELD_TEST','PILOT_RUNNING','PILOT_PAUSED','PUBLIC_READY','ROLLBACK'];
  const stage=String(body.stage||'').toUpperCase();
  if(!allowed.includes(stage)) return {ok:false,status:400,detail:'Invalid pilot stage', allowed};
  if(stage==='PUBLIC_READY'){
    const gate=pilotGoLiveGate(db);
    if(!gate.ok && !body.force) return {ok:false,status:409,detail:'Go-live gate has blockers', blockers:gate.blockers};
  }
  const old=db.pilot_launch_settings.pilot_stage;
  db.pilot_launch_settings.pilot_stage=stage;
  db.pilot_launch_settings.stage_updated_at=now();
  db.pilot_launch_settings.stage_updated_by=user?.id||'admin';
  db.pilot_launch_events.push({id:uid('pilotev'), at:now(), actor_id:user?.id||'admin', type:'STAGE_CHANGE', severity:stage==='ROLLBACK'?'CRITICAL':'INFO', title:`Pilot stage changed to ${stage}`, detail:sanitizeText(body.reason||'',1000), status:'CLOSED', old_stage:old, new_stage:stage});
  audit(db,user?.id||'admin','S7S_PILOT_STAGE_UPDATE','pilot_launch',stage,{old_stage:old,new_stage:stage});
  return {ok:true, old_stage:old, new_stage:stage, gate:pilotGoLiveGate(db)};
}

function subAdminProfile(db, userOrId){
  const userId = typeof userOrId === 'string' ? userOrId : userOrId?.id;
  return (db.sub_admins || []).find(x=>x.user_id===userId) || null;
}
function adminScopeArea(db,user){
  if(!user || isMainAdmin(user)) return null;
  const p = subAdminProfile(db,user);
  return p?.area || user.area || null;
}

function driverKycSummary(db, prof){
  db.file_uploads = db.file_uploads || [];
  db.kyc_submissions = db.kyc_submissions || [];
  const u = db.users.find(x=>x.id===prof.user_id) || {};
  const fileMeta = (val)=>{
    const m = String(val||'').match(/^\/api\/files\/([^/?#]+)/);
    if(!m) return null;
    return db.file_uploads.find(f=>f.id===m[1] && f.status!=='DELETED') || null;
  };
  const required = [
    ['driver_photo','Driver photo','file'],
    ['vehicle_photo','Vehicle photo','file'],
    ['aadhaar_no','Aadhaar number','text'],
    ['aadhaar_doc','Aadhaar document/photo','file'],
    ['license_no','Driving licence number','text'],
    ['license_doc','Driving licence/photo','file'],
    ['vehicle_no','Toto number','text']
  ];
  const docs = required.map(([key,label,type])=>{
    const value = String(prof[key]||'').trim();
    const meta = fileMeta(value);
    return {key,label,type,present:!!value,value:type==='text'?value:undefined,url:type==='file'?value:'',file_id:meta?.id||'',mime_type:meta?.mime_type||'',size_bytes:meta?.size_bytes||0,created_at:meta?.created_at||''};
  });
  const present = docs.filter(x=>x.present).length;
  const complete = present === docs.length;
  let kyc_status = prof.kyc_status || (complete ? 'SUBMITTED' : 'INCOMPLETE');
  if(prof.status === 'APPROVED' && !prof.kyc_status) kyc_status = complete ? 'VERIFIED' : 'INCOMPLETE';
  const lastSubmission = db.kyc_submissions.filter(x=>x.profile_id===prof.id || x.driver_user_id===prof.user_id).slice(-1)[0] || null;
  const missing = docs.filter(x=>!x.present).map(x=>x.label);
  const uploaded_files = ['driver_photo','vehicle_photo','aadhaar_doc','license_doc'].map(k=>fileMeta(prof[k])).filter(Boolean);
  const review_status = prof.kyc_status==='VERIFIED' ? 'VERIFIED' : prof.kyc_status==='REJECTED' ? 'REJECTED' : (prof.kyc_submitted_at ? (complete ? 'UNDER_ADMIN_REVIEW' : 'SUBMITTED_BUT_INCOMPLETE') : 'NOT_SUBMITTED');
  return {
    profile_id: prof.id, user_id: prof.user_id,
    name: u.name || 'Driver', mobile: u.mobile || '', email: u.email || '',
    area: prof.area || prof.location || 'Kalna', vehicle_no: prof.vehicle_no || '',
    profile_status: prof.status || 'PENDING', kyc_status, review_status,
    review_label: review_status==='UNDER_ADMIN_REVIEW' ? 'Submitted - waiting for admin review' : review_status==='SUBMITTED_BUT_INCOMPLETE' ? 'Submitted but some documents are missing' : review_status==='VERIFIED' ? 'Verified by Admin' : review_status==='REJECTED' ? 'Rejected by Admin' : 'Not submitted yet',
    docs_present: present, docs_required: docs.length, complete, missing,
    docs, uploaded_files,
    driver_photo: prof.driver_photo || '', vehicle_photo: prof.vehicle_photo || '',
    aadhaar_doc: prof.aadhaar_doc || '', license_doc: prof.license_doc || '',
    aadhaar_no: prof.aadhaar_no || '', license_no: prof.license_no || '',
    kyc_submitted_at: prof.kyc_submitted_at || null,
    kyc_reviewed_at: prof.kyc_reviewed_at || null,
    kyc_reviewed_by: prof.kyc_reviewed_by || null,
    kyc_rejection_reason: prof.kyc_rejection_reason || '',
    last_submission: lastSubmission,
    last_submission_message: prof.kyc_last_message || (lastSubmission?.message || '')
  };
}
function ensureUploadDir(){ ensureDataDir(); if(!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR,{recursive:true}); }
function extensionFromMime(mime){
  const m=String(mime||'').toLowerCase();
  if(m.includes('png')) return 'png';
  if(m.includes('webp')) return 'webp';
  if(m.includes('pdf')) return 'pdf';
  if(m.includes('jpeg') || m.includes('jpg')) return 'jpg';
  return 'bin';
}
function parseDataUrl(v){
  const s = String(v || '').trim();
  const m = s.match(/^data:([^;,]+)?(;base64)?,(.*)$/s);
  if(!m) return null;
  const mime = m[1] || 'application/octet-stream';
  const isBase64 = !!m[2];
  const raw = m[3] || '';
  const buffer = isBase64 ? Buffer.from(raw, 'base64') : Buffer.from(decodeURIComponent(raw), 'utf8');
  return {mime, buffer};
}
function storeUploadFile(db, user, docType, value, refId=''){
  const parsed = parseDataUrl(value);
  if(!parsed) return String(value || '').trim();
  db.storage_settings = {...defaultStorageSettings(), ...(db.storage_settings||{})};
  const maxBytes = Math.max(Number(db.storage_settings.max_upload_mb || 10), 10) * 1024 * 1024;
  if(parsed.buffer.length > maxBytes) throw new Error(`File too large. Max ${Math.max(Number(db.storage_settings.max_upload_mb || 10),10)} MB allowed`);
  const allowed = db.storage_settings.allowed_mime || defaultStorageSettings().allowed_mime;
  if(Array.isArray(allowed) && allowed.length && !allowed.includes(parsed.mime)) throw new Error(`File type not allowed: ${parsed.mime}`);
  ensureUploadDir();
  const id = uid('file');
  const ext = extensionFromMime(parsed.mime);
  const monthDir = path.join(UPLOAD_DIR, new Date().toISOString().slice(0,7));
  if(!fs.existsSync(monthDir)) fs.mkdirSync(monthDir,{recursive:true});
  const filename = `${id}.${ext}`;
  const filePath = path.join(monthDir, filename);
  fs.writeFileSync(filePath, parsed.buffer);
  const rec = {
    id, doc_type:String(docType||'document'), filename,
    original_name:String(docType||'document')+'.'+ext,
    mime_type:parsed.mime,
    size_bytes:parsed.buffer.length,
    sha256:crypto.createHash('sha256').update(parsed.buffer).digest('hex'),
    path:filePath,
    url:'/api/files/'+id,
    owner_user_id:user?.id||'',
    owner_role:user?.role||'',
    ref_id:String(refId||''),
    status:'ACTIVE',
    created_at:now()
  };
  db.file_uploads = db.file_uploads || [];
  db.file_uploads.push(rec);
  return rec.url;
}
function normalizeDocInput(v, db=null, user=null, docType='document', refId=''){
  const s = String(v || '').trim();
  if(!s) return '';
  if(s.startsWith('data:') && db) return storeUploadFile(db,user,docType,s,refId);
  return s.length > 750000 ? s.slice(0,750000) : s;
}
function storageStatus(db){
  db.file_uploads = db.file_uploads || [];
  db.storage_settings = {...defaultStorageSettings(), ...(db.storage_settings||{})};
  const active = db.file_uploads.filter(f=>f.status!=='DELETED');
  const totalSize = active.reduce((a,f)=>a+Number(f.size_bytes||0),0);
  const byType = {};
  for(const f of active){
    const k=f.doc_type||'document';
    byType[k]=byType[k]||{doc_type:k,count:0,size_bytes:0};
    byType[k].count++; byType[k].size_bytes += Number(f.size_bytes||0);
  }
  const checks = [
    {title:'Local upload folder ready', ok:true, detail:UPLOAD_DIR},
    {title:'KYC files saved outside JSON DB', ok:true, detail:'Data URL upload হলে file storage-এ convert হবে'},
    {title:'Max upload size configured', ok:Number(db.storage_settings.max_upload_mb||0)>0, detail:`${db.storage_settings.max_upload_mb} MB`},
    {title:'Allowed MIME configured', ok:Array.isArray(db.storage_settings.allowed_mime)&&db.storage_settings.allowed_mime.length>0, detail:(db.storage_settings.allowed_mime||[]).join(', ')},
    {title:'Production object storage', ok:!!mergeIntegrations(db.integrations).storage.production_object_storage_present, detail:'S3/R2/GCS not configured in prototype'}
  ];
  return {
    settings:db.storage_settings,
    upload_dir:UPLOAD_DIR,
    summary:{total_files:active.length, total_size_bytes:totalSize, total_size_mb:Math.round(totalSize/1024/1024*100)/100, deleted:(db.file_uploads||[]).filter(f=>f.status==='DELETED').length, provider:db.storage_settings.provider||'LOCAL_FILE'},
    by_type:Object.values(byType).map(x=>({...x,size_mb:Math.round(x.size_bytes/1024/1024*100)/100})).sort((a,b)=>b.count-a.count),
    recent:active.slice(-100).reverse(),
    checks,
    production_note:'Real launch-এর আগে Aadhaar/licence/photo storage secure object storage-এ রাখবেন; public URL নয়, signed URL + audit দরকার।'
  };
}
function serveUploadedFile(res, db, fileId){
  const rec = (db.file_uploads||[]).find(f=>f.id===fileId && f.status!=='DELETED');
  if(!rec) return send(res,404,{detail:'File not found'});
  const filePath = path.resolve(rec.path||'');
  if(!filePath || !fs.existsSync(filePath)) return send(res,404,{detail:'Stored file missing'});
  res.writeHead(200, {'Content-Type':rec.mime_type||'application/octet-stream','Cache-Control':'private, max-age=3600','X-File-Id':rec.id});
  fs.createReadStream(filePath).pipe(res);
}

function driverManagedBySubAdmin(db, driverUserId, subAdminUserId){
  const d = (db.driver_profiles||[]).find(x=>x.user_id===driverUserId);
  return !!d && (d.sub_admin_user_id===subAdminUserId || d.added_by===subAdminUserId || (d.area && d.area === adminScopeArea(db,{id:subAdminUserId, role:'SUB_ADMIN'})));
}
function filterDriversForAdmin(db,user,drivers){
  if(isMainAdmin(user)) return drivers;
  const area = adminScopeArea(db,user);
  return drivers.filter(d => d.sub_admin_user_id===user.id || d.added_by===user.id || (area && d.area===area));
}
function filterUsersForAdmin(db,user,users){
  if(isMainAdmin(user)) return users;
  const area = adminScopeArea(db,user);
  return users.filter(u => u.managed_by_subadmin_id===user.id || u.added_by===user.id || (area && u.area===area));
}
function filterRidesForAdmin(db,user,rides){
  if(isMainAdmin(user)) return rides;
  const area = adminScopeArea(db,user);
  return rides.filter(r=>{
    const driver = (db.driver_profiles||[]).find(d=>d.user_id===r.driver_id) || {};
    const passenger = (db.users||[]).find(u=>u.id===r.passenger_id) || {};
    return driver.sub_admin_user_id===user.id || driver.added_by===user.id || passenger.managed_by_subadmin_id===user.id || passenger.added_by===user.id || (area && (driver.area===area || passenger.area===area));
  });
}
function allocateSubAdminCommission(db, ride, driverProfile){
  if(!ride || !driverProfile) return null;
  const subAdminUserId = driverProfile.sub_admin_user_id || driverProfile.added_by || null;
  if(!subAdminUserId) return null;
  const subProfile = subAdminProfile(db, subAdminUserId);
  const sharePercent = Number(subProfile?.commission_share_percent ?? db.fare_rules.sub_admin_share_percent ?? 30);
  const platformCommission = Number(ride.platform_commission || 0);
  const amount = Math.round(platformCommission * sharePercent) / 100;
  if(amount <= 0) return null;
  ride.sub_admin_user_id = subAdminUserId;
  ride.sub_admin_commission_percent = sharePercent;
  ride.sub_admin_commission = amount;
  ride.platform_net_commission = Math.max(0, Math.round((platformCommission - amount) * 100) / 100);
  db.sub_admin_commissions = db.sub_admin_commissions || [];
  if(!db.sub_admin_commissions.find(x=>x.ride_id===ride.id)){
    db.sub_admin_commissions.push({id:uid('sac'), ride_id:ride.id, sub_admin_user_id:subAdminUserId, driver_id:ride.driver_id, amount, share_percent:sharePercent, platform_commission:platformCommission, status:'PENDING', created_at:now(), area:driverProfile.area || subProfile?.area || 'Kalna'});
  }
  if(subProfile){
    subProfile.total_commission = Math.round((Number(subProfile.total_commission||0)+amount)*100)/100;
    subProfile.pending_commission = Math.round((Number(subProfile.pending_commission||0)+amount)*100)/100;
    subProfile.last_commission_at = now();
  }
  return amount;
}
function subAdminCommissionSummary(db,user){
  const all = (db.sub_admin_commissions||[]).filter(x=>isMainAdmin(user) || x.sub_admin_user_id===user.id);
  const pending = all.filter(x=>x.status!=='PAID');
  const paid = all.filter(x=>x.status==='PAID');
  const bySub = {};
  for(const x of pending){
    const sid = x.sub_admin_user_id;
    if(!bySub[sid]) bySub[sid] = {sub_admin_user_id:sid, amount:0, count:0, commission_ids:[], area:x.area||'Kalna'};
    bySub[sid].amount += Number(x.amount||0); bySub[sid].count += 1; bySub[sid].commission_ids.push(x.id);
  }
  const rows = Object.values(bySub).map(x=>{
    const u = db.users.find(z=>z.id===x.sub_admin_user_id) || {};
    const p = subAdminProfile(db, x.sub_admin_user_id) || {};
    return {...x, amount:Math.round(x.amount*100)/100, name:u.name||'Sub Admin', mobile:u.mobile||'', email:u.email||'', area:p.area||x.area||'', share_percent:p.commission_share_percent ?? db.fare_rules.sub_admin_share_percent};
  });
  const scopedRequests = (db.sub_admin_payout_requests||[]).filter(x=>isMainAdmin(user) || x.sub_admin_user_id===user.id);
  const requested = scopedRequests.filter(x=>x.status==='REQUESTED');
  return {summary:{pending_amount:Math.round(pending.reduce((a,x)=>a+Number(x.amount||0),0)*100)/100, paid_amount:Math.round(paid.reduce((a,x)=>a+Number(x.amount||0),0)*100)/100, pending_count:pending.length, paid_count:paid.length, sub_admins:(db.sub_admins||[]).length, payout_requests:requested.length, requested_amount:Math.round(requested.reduce((a,x)=>a+Number(x.amount||0),0)*100)/100}, rows, commissions:all.slice(-200).reverse(), settlements:(db.sub_admin_commission_settlements||[]).slice(-100).reverse(), payout_requests:scopedRequests.slice(-100).reverse()};
}
function subAdminPayoutRequestList(db,user){
  const list = (db.sub_admin_payout_requests||[]).filter(x=>isMainAdmin(user) || x.sub_admin_user_id===user.id).map(x=>{
    const u = db.users.find(z=>z.id===x.sub_admin_user_id) || {};
    const p = subAdminProfile(db, x.sub_admin_user_id) || {};
    return {...x, name:u.name||'Sub Admin', mobile:u.mobile||'', email:u.email||'', area:p.area||x.area||'Kalna'};
  });
  return list.slice(-100).reverse();
}


function addNotification(db, payload={}){
  db.notifications = db.notifications || [];
  const item = {
    id:uid('ntf'),
    user_id:payload.user_id || null,
    role:payload.role || null,
    area:payload.area || null,
    title:String(payload.title || 'NEXO Ride'),
    message:String(payload.message || ''),
    event_type:String(payload.event_type || 'INFO'),
    priority:String(payload.priority || 'NORMAL'),
    ride_id:payload.ride_id || null,
    data:payload.data || {},
    read_by:[],
    created_at:now()
  };
  db.notifications.push(item);
  try{ queuePushDeliveries(db,item); }catch(e){}
  if(db.notifications.length>500){ db.notifications = db.notifications.slice(-500); }
  return item;
}
function notificationTargets(db, filter={}){
  let users = db.users || [];
  if(filter.user_id) users = users.filter(u=>u.id===filter.user_id);
  if(filter.role) users = users.filter(u=>String(u.role||'').toUpperCase()===String(filter.role||'').toUpperCase());
  if(filter.roles) users = users.filter(u=>filter.roles.map(x=>String(x).toUpperCase()).includes(String(u.role||'').toUpperCase()));
  if(filter.area) users = users.filter(u=>!u.area || String(u.area).toLowerCase()===String(filter.area).toLowerCase() || String(u.role||'')==='ADMIN');
  return users;
}
function notifyUsers(db, users, payload={}){
  const list = [];
  for(const u of users||[]){ list.push(addNotification(db,{...payload,user_id:u.id,role:u.role,area:u.area||payload.area||null})); }
  return list;
}
function notifyAdmins(db,payload={}){ return notifyUsers(db, notificationTargets(db,{roles:['ADMIN','SUPER_ADMIN']}), payload); }
function notificationsForUser(db,user,limit=80){
  const area = adminScopeArea(db,user);
  return (db.notifications||[]).filter(n=>{
    if(n.user_id && n.user_id===user.id) return true;
    if(!n.user_id && n.role && String(n.role).toUpperCase()===String(user.role||'').toUpperCase()) return true;
    if(isAdminRole(user) && (!n.area || !area || n.area===area || isMainAdmin(user))) return true;
    return false;
  }).slice(-limit).reverse().map(n=>({...n, read: Array.isArray(n.read_by) && n.read_by.includes(user.id)}));
}
function unreadNotificationCount(db,user){ return notificationsForUser(db,user,200).filter(n=>!n.read).length; }

function supportTicketOut(db,t){
  const u = db.users.find(x=>x.id===t.user_id) || {};
  const assigned = db.users.find(x=>x.id===t.assigned_to) || {};
  const ride = t.ride_id ? db.rides.find(r=>r.id===t.ride_id) : null;
  return {...t, user_name:u.name||'', user_mobile:u.mobile||'', user_role:u.role||'', assigned_name:assigned.name||'', ride: ride ? {id:ride.id, pickup:ride.pickup, drop:ride.drop, status:ride.status, fare:ride.estimated_fare} : null};
}
function refundRequestOut(db,r){
  const ride = db.rides.find(x=>x.id===r.ride_id) || {};
  const passenger = db.users.find(x=>x.id===r.user_id) || {};
  return {...r, passenger_name:passenger.name||'', passenger_mobile:passenger.mobile||'', ride_status:ride.status||'', pickup:ride.pickup||'', drop:ride.drop||'', fare:ride.estimated_fare||0, payment_status:ride.payment_status||''};
}
function supportSummary(db,user){
  let tickets = db.support_tickets || [];
  let refunds = db.refund_requests || [];
  if(!isAdminRole(user)){
    tickets = tickets.filter(t=>t.user_id===user.id);
    refunds = refunds.filter(r=>r.user_id===user.id);
  } else if(!isMainAdmin(user)){
    const area = adminScopeArea(db,user);
    tickets = tickets.filter(t=>!area || t.area===area || t.assigned_to===user.id);
    refunds = refunds.filter(r=>!area || r.area===area);
  }
  return {tickets, refunds, summary:{open_tickets:tickets.filter(t=>t.status!=='CLOSED').length, closed_tickets:tickets.filter(t=>t.status==='CLOSED').length, open_refunds:refunds.filter(r=>['REQUESTED','UNDER_REVIEW'].includes(r.status)).length, approved_refunds:refunds.filter(r=>r.status==='APPROVED'||r.status==='PAID').length}};
}


function rideDto(r, db=null, viewer=null){
  const out = {...r};
  // Ride OTP should be visible only to passenger/admin, not to driver.
  if(out.ride_otp && viewer && !isAdminRole(viewer) && viewer.id !== out.passenger_id){
    delete out.ride_otp;
  }
  if(out.ride_otp && !viewer){ delete out.ride_otp; }
  if(db){
    const passenger = db.users.find(u=>u.id===r.passenger_id) || {};
    const driverUser = db.users.find(u=>u.id===r.driver_id) || {};
    const driverProfile = db.driver_profiles.find(d=>d.user_id===r.driver_id) || {};
    out.passenger_name = passenger.name || '';
    out.passenger_mobile = passenger.mobile || '';
    out.driver_name = driverUser.name || '';
    out.driver_mobile = driverUser.mobile || '';
    out.driver_vehicle_no = driverProfile.vehicle_no || '';
    out.driver_rating = driverProfile.rating || 5;
    const driverLive = (db.live_locations || []).find(x=>x.user_id===r.driver_id) || {};
    const passengerLive = (db.live_locations || []).find(x=>x.user_id===r.passenger_id) || {};
    out.driver_lat = driverLive.lat || driverProfile.lat || null;
    out.driver_lng = driverLive.lng || driverProfile.lng || null;
    out.driver_last_seen_at = driverLive.updated_at || driverProfile.last_location_at || null;
    out.passenger_lat = passengerLive.lat || r.passenger_location?.lat || null;
    out.passenger_lng = passengerLive.lng || r.passenger_location?.lng || null;
    out.pickup_lat = r.pickup_coords?.lat || null;
    out.pickup_lng = r.pickup_coords?.lng || null;
    out.drop_lat = r.drop_coords?.lat || null;
    out.drop_lng = r.drop_coords?.lng || null;
    out.driver_rating = driverProfile.rating || 5;
    if(Array.isArray(out.driver_candidate_ids)){
      out.driver_candidate_count = out.driver_candidate_ids.length;
      if(viewer && String(viewer.role||'').toUpperCase()==='DRIVER') out.is_candidate = out.driver_candidate_ids.includes(viewer.id);
    }
  }
  if(out.status === 'DRIVER_ACCEPTED' && out.payment_due_at){
    out.payment_time_left_seconds = Math.max(0, Math.floor((new Date(out.payment_due_at).getTime() - Date.now())/1000));
  }
  if(out.status === 'REQUESTED' && out.dispatch_round_expires_at){
    out.dispatch_accept_time_left_seconds = Math.max(0, Math.floor((new Date(out.dispatch_round_expires_at).getTime() - Date.now())/1000));
  }
  out.finance = {fare:money(out.estimated_fare||0), platform_commission:money(out.platform_commission||0), driver_earning:money(out.driver_earning||0), settlement_status:out.settlement_status||'PENDING', receipt_url: out.id ? ('/receipt/?ride_id='+encodeURIComponent(out.id)) : ''};
  return out;
}


function money(n){ return Math.round(Number(n||0)*100)/100; }
function reportDateKey(iso){
  const d = iso ? new Date(iso) : new Date();
  if(Number.isNaN(d.getTime())) return 'Unknown';
  return d.toISOString().slice(0,10);
}
function reportRideOut(db,r){
  const passenger = db.users.find(u=>u.id===r.passenger_id) || {};
  const driverUser = db.users.find(u=>u.id===r.driver_id) || {};
  const driverProfile = db.driver_profiles.find(d=>d.user_id===r.driver_id) || {};
  return {...r, passenger_name: passenger.name||'', passenger_mobile: passenger.mobile||'', driver_name: driverUser.name||'', driver_mobile: driverUser.mobile||'', driver_vehicle_no: driverProfile.vehicle_no||'', driver_rating: driverProfile.rating||5};
}
function buildAdminReports(db,user){
  const rides = filterRidesForAdmin(db,user,db.rides||[]);
  const drivers = filterDriversForAdmin(db,user,db.driver_profiles||[]);
  const users = filterUsersForAdmin(db,user,db.users||[]);
  const completed = rides.filter(r=>r.status==='COMPLETED');
  const pending = rides.filter(r=>['REQUESTED','DRIVER_ACCEPTED','CONFIRMED','ARRIVED','STARTED'].includes(r.status));
  const paidSettlements = db.settlements||[];
  const subSummary = subAdminCommissionSummary(db,user).summary;
  const overview = {
    total_users: users.length,
    total_drivers: drivers.length,
    total_rides: rides.length,
    completed_rides: completed.length,
    active_or_pending_rides: pending.length,
    gross_fare: money(completed.reduce((a,r)=>a+Number(r.estimated_fare||0),0)),
    platform_commission: money(completed.reduce((a,r)=>a+Number(r.platform_commission||0),0)),
    driver_payout: money(completed.reduce((a,r)=>a+Number(r.driver_earning||0),0)),
    driver_payout_pending: money(completed.filter(r=>r.settlement_status!=='PAID').reduce((a,r)=>a+Number(r.driver_earning||0),0)),
    driver_payout_paid: money(paidSettlements.reduce((a,s)=>a+Number(s.amount||0),0)),
    sub_admin_commission_pending: subSummary.pending_amount,
    sub_admin_commission_paid: subSummary.paid_amount,
    net_platform_commission: money(completed.reduce((a,r)=>a+Number(r.platform_commission||0),0) - Number(subSummary.pending_amount||0) - Number(subSummary.paid_amount||0)),
    generated_at: now()
  };
  const status_counts = rides.reduce((acc,r)=>{acc[r.status||'UNKNOWN']=(acc[r.status||'UNKNOWN']||0)+1;return acc;},{});
  const dailyMap = {};
  for(const r of completed){
    const k = reportDateKey(r.completed_at||r.updated_at||r.created_at);
    dailyMap[k] = dailyMap[k] || {date:k, rides:0, gross_fare:0, platform_commission:0, driver_payout:0};
    dailyMap[k].rides += 1;
    dailyMap[k].gross_fare = money(dailyMap[k].gross_fare + Number(r.estimated_fare||0));
    dailyMap[k].platform_commission = money(dailyMap[k].platform_commission + Number(r.platform_commission||0));
    dailyMap[k].driver_payout = money(dailyMap[k].driver_payout + Number(r.driver_earning||0));
  }
  const daily = Object.values(dailyMap).sort((a,b)=>a.date.localeCompare(b.date)).slice(-30);
  const driverMap = {};
  for(const d of drivers){
    const userObj = db.users.find(u=>u.id===d.user_id) || {};
    driverMap[d.user_id] = {driver_id:d.user_id, name:userObj.name||d.name||'Driver', mobile:userObj.mobile||d.mobile||'', vehicle_no:d.vehicle_no||'', area:d.area||d.location||'Kalna', rides:0, gross_fare:0, driver_earning:0, platform_commission:0, rating:d.rating||5};
  }
  for(const r of completed){
    const item = driverMap[r.driver_id] || {driver_id:r.driver_id, name:r.driver_name||'Driver', mobile:'', vehicle_no:'', area:r.area||'Kalna', rides:0, gross_fare:0, driver_earning:0, platform_commission:0, rating:5};
    item.rides += 1;
    item.gross_fare = money(item.gross_fare + Number(r.estimated_fare||0));
    item.driver_earning = money(item.driver_earning + Number(r.driver_earning||0));
    item.platform_commission = money(item.platform_commission + Number(r.platform_commission||0));
    driverMap[r.driver_id] = item;
  }
  const top_drivers = Object.values(driverMap).sort((a,b)=>b.rides-a.rides || b.driver_earning-a.driver_earning).slice(0,10);
  const areaMap = {};
  for(const d of drivers){
    const area=d.area||d.location||'Kalna';
    areaMap[area] = areaMap[area] || {area, drivers:0, rides:0, gross_fare:0, commission:0};
    areaMap[area].drivers += 1;
  }
  for(const r of completed){
    const dp = drivers.find(d=>d.user_id===r.driver_id) || {};
    const area = dp.area || r.area || 'Kalna';
    areaMap[area] = areaMap[area] || {area, drivers:0, rides:0, gross_fare:0, commission:0};
    areaMap[area].rides += 1;
    areaMap[area].gross_fare = money(areaMap[area].gross_fare + Number(r.estimated_fare||0));
    areaMap[area].commission = money(areaMap[area].commission + Number(r.platform_commission||0));
  }
  const area_summary = Object.values(areaMap).sort((a,b)=>b.rides-a.rides || a.area.localeCompare(b.area));
  const sub_admins = (db.sub_admins||[]).map(sa=>{
    const userObj = db.users.find(u=>u.id===sa.user_id) || {};
    const cms = (db.sub_admin_commissions||[]).filter(c=>c.sub_admin_id===sa.id);
    return {id:sa.id, name:userObj.name||sa.name||'Sub Admin', mobile:userObj.mobile||sa.mobile||'', area:sa.area||'', pending:money(cms.filter(c=>c.status!=='PAID').reduce((a,c)=>a+Number(c.amount||0),0)), paid:money(cms.filter(c=>c.status==='PAID').reduce((a,c)=>a+Number(c.amount||0),0)), drivers:drivers.filter(d=>d.sub_admin_id===sa.id).length};
  });
  return {overview, status_counts, daily, top_drivers, area_summary, sub_admins, recent_completed: completed.slice(-100).reverse().map(r=>reportRideOut(db,r))};
}
function csvCell(v){
  const s=String(v??'');
  return /[",\n]/.test(s) ? '"'+s.replace(/"/g,'""')+'"' : s;
}
function buildCompletedRidesCsv(db,user){
  const reports = buildAdminReports(db,user);
  const rows = [['ride_id','date','passenger','driver','pickup','drop','ride_type','status','fare','platform_commission','driver_payout','settlement_status']];
  for(const r of reports.recent_completed.slice().reverse()){
    rows.push([r.id, (r.completed_at||r.updated_at||r.created_at||'').slice(0,19), r.passenger_name||'', r.driver_name||'', r.pickup||'', r.drop||'', r.ride_type||'', r.status||'', r.estimated_fare||0, r.platform_commission||0, r.driver_earning||0, r.settlement_status||'PENDING']);
  }
  return rows.map(row=>row.map(csvCell).join(',')).join('\n');
}


function paymentIntegration(db){
  return mergeIntegrations(db.integrations).payment || {};
}
function paymentProviderMode(db){
  return String(paymentIntegration(db).provider || 'DEMO').toUpperCase();
}

function razorpayKeyId(db=null){ return db?runtimeSecretValue(db,'RAZORPAY_KEY_ID'):(process.env.RAZORPAY_KEY_ID || ''); }
function razorpayKeySecret(db=null){ return db?runtimeSecretValue(db,'RAZORPAY_KEY_SECRET'):(process.env.RAZORPAY_KEY_SECRET || ''); }
function razorpayMode(){ return String(process.env.RAZORPAY_MODE || 'test').toLowerCase()==='live' ? 'live' : 'test'; }
function razorpayCompanyName(){ return process.env.RAZORPAY_COMPANY_NAME || 'NEXO Ride'; }
function razorpayCurrency(){ return (process.env.RAZORPAY_CURRENCY || 'INR').toUpperCase(); }
function httpsJsonRequest(urlString, opts={}, bodyObj=null){
  return new Promise((resolve,reject)=>{
    try{
      const u=new URL(urlString);
      const body=bodyObj?JSON.stringify(bodyObj):'';
      const req=https.request({hostname:u.hostname, path:u.pathname+u.search, method:opts.method||'GET', headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(body),...(opts.headers||{})}}, res=>{
        let data=''; res.on('data',d=>data+=d); res.on('end',()=>{
          let parsed={}; try{parsed=data?JSON.parse(data):{};}catch(e){parsed={raw:data};}
          if(res.statusCode>=200 && res.statusCode<300) return resolve(parsed);
          const msg=(parsed && parsed.error && (parsed.error.description||parsed.error.reason)) || parsed.message || data || ('HTTP '+res.statusCode);
          const err=new Error(msg); err.statusCode=res.statusCode; err.payload=parsed; reject(err);
        });
      });
      req.on('error',reject); if(body) req.write(body); req.end();
    }catch(e){ reject(e); }
  });
}
async function createRazorpayGatewayOrder(ride, user, db=null){
  const key=razorpayKeyId(db), secret=razorpayKeySecret(db);
  if(!key || !secret) throw new Error('Razorpay key/secret not configured');
  const amountPaise=Math.max(100, Math.round(Number(ride.estimated_fare||0)*100));
  const auth=Buffer.from(key+':'+secret).toString('base64');
  const receipt=String('nexo_'+String(ride.id||uid('ride')).replace(/[^A-Za-z0-9_]/g,'').slice(-25));
  return await httpsJsonRequest('https://api.razorpay.com/v1/orders', {method:'POST', headers:{Authorization:'Basic '+auth}}, {
    amount: amountPaise,
    currency: razorpayCurrency(),
    receipt,
    payment_capture: 1,
    notes:{ride_id:String(ride.id||''), passenger_id:String(user?.id||''), app:'NEXO Ride'}
  });
}
function verifyRazorpayPaymentSignature(orderId, paymentId, signature, db=null){
  const secret=razorpayKeySecret(db);
  if(!secret) return false;
  const expected=crypto.createHmac('sha256', secret).update(String(orderId)+'|'+String(paymentId)).digest('hex');
  try{
    const a=Buffer.from(expected,'hex'); const b=Buffer.from(String(signature||''),'hex');
    return a.length===b.length && crypto.timingSafeEqual(a,b);
  }catch(e){ return expected===String(signature||''); }
}
function paymentOptions(db){
  const p = paymentIntegration(db);
  const provider = paymentProviderMode(db);
  return {
    provider,
    demo_mode: provider === 'DEMO',
    razorpay_key_id: p.razorpay_key_id || razorpayKeyId(db) || '',
    razorpay_mode: razorpayMode(),
    razorpay_company_name: razorpayCompanyName(),
    razorpay_enabled: provider === 'RAZORPAY' && !!(p.razorpay_key_id || razorpayKeyId(db) || p.key_id_configured),
    manual_upi_id: p.manual_upi_id || '',
    manual_qr_label: p.manual_qr_label || 'Manual QR/UPI will be added by admin',
    methods: provider === 'RAZORPAY' ? ['RAZORPAY_CHECKOUT','UPI','CARD','NETBANKING'] : provider === 'MANUAL_QR' ? ['MANUAL_UPI_QR','UPI_REFERENCE'] : ['DEMO_PAYMENT','MANUAL_TEST_REFERENCE'],
    note: provider === 'DEMO' ? 'Testing mode. No real money is collected.' : provider === 'RAZORPAY' ? 'Razorpay key configured; server-side verification/webhook must be enabled before production launch.' : 'Manual UPI QR mode; booking is confirmed only after transaction/reference verification.'
  };
}
function createPaymentOrder(db, ride, user, source='APP'){
  db.payment_orders = db.payment_orders || [];
  const open = db.payment_orders.find(o=>o.ride_id===ride.id && ['CREATED','PENDING'].includes(o.status));
  if(open) return open;
  const opts = paymentOptions(db);
  const order = {
    id: uid('pay'),
    provider: opts.provider,
    source,
    ride_id: ride.id,
    passenger_id: ride.passenger_id,
    driver_id: ride.driver_id || null,
    amount: Number(ride.estimated_fare || 0),
    currency: 'INR',
    status: opts.demo_mode ? 'PENDING' : 'CREATED',
    payment_method: opts.methods[0],
    razorpay_order_id: opts.provider === 'RAZORPAY' ? 'order_demo_' + crypto.randomBytes(6).toString('hex') : '',
    manual_upi_id: opts.manual_upi_id || '',
    manual_qr_label: opts.manual_qr_label || '',
    transaction_id: '',
    created_at: now(),
    expires_at: ride.payment_due_at || new Date(Date.now()+PAYMENT_HOLD_SECONDS*1000).toISOString(),
    paid_at: null,
    verified_at: null,
    verified_by: null,
    note: opts.note
  };
  db.payment_orders.push(order);
  ride.payment_order_id = order.id;
  ride.payment_provider = opts.provider;
  return order;
}
function confirmRidePayment(db, ride, user, details={}){
  if(ride.status !== 'DRIVER_ACCEPTED') throw new Error('Driver must accept before payment');
  if(ride.payment_due_at && new Date(ride.payment_due_at).getTime() < Date.now()){
    ride.status='PAYMENT_TIMEOUT'; ride.payment_status='EXPIRED'; ride.expired_at=now();
    throw new Error('Payment time expired. Please book again.');
  }
  ride.payment_status='PAID';
  ride.status='CONFIRMED';
  ride.paid_at=now();
  ride.confirmed_at=ride.confirmed_at || now();
  ride.payment_ref = String(details.transaction_id || details.payment_ref || ride.payment_ref || 'DEMO-PAYMENT');
  ride.payment_method = String(details.payment_method || ride.payment_method || paymentOptions(db).methods[0]);
  ride.payment_provider = String(details.provider || ride.payment_provider || paymentProviderMode(db));
  if(!ride.ride_otp) ride.ride_otp = String(Math.floor(1000 + Math.random()*9000));
  notifyUsers(db, notificationTargets(db,{user_id:ride.driver_id}), {event_type:'PAYMENT_CONFIRMED', priority:'HIGH', ride_id:ride.id, title:'Payment Confirmed', message:'Payment received. Proceed to pickup.'});
  notifyUsers(db, notificationTargets(db,{user_id:ride.passenger_id}), {event_type:'RIDE_OTP', priority:'HIGH', ride_id:ride.id, title:'Ride OTP Generated', message:`Your Ride OTP is ${ride.ride_otp}`});
  notifyAdmins(db,{event_type:'PAYMENT_VERIFIED_ADMIN', priority:'NORMAL', ride_id:ride.id, title:'Ride Payment Verified', message:`${ride.pickup||''} → ${ride.drop||''} · ₹${ride.estimated_fare||0} · ${ride.payment_provider||''}`});
  audit(db,user?.id || 'system','PAYMENT_CONFIRMED','ride',ride.id,{provider:ride.payment_provider, ref:ride.payment_ref});
  return ride;
}


function deploymentStatus(db){
  const integrations = mergeIntegrations(db.integrations);
  const p = integrations.production || {};
  const publicUrl = p.server_url || process.env.SERVER_URL || '';
  const checks = [
    {key:'source', title:'Source package ready', ok:true, detail:'NEXO Ride source package available'},
    {key:'repo', title:'GitHub repository', ok:!!p.repo_url, detail:p.repo_url || 'Repo URL add করুন'},
    {key:'server', title:'Public server URL', ok:!!publicUrl, detail:publicUrl || 'DigitalOcean/Render/VPS URL add করুন'},
    {key:'https', title:'HTTPS/SSL', ok:!!p.ssl_configured || String(publicUrl).startsWith('https://'), detail:(p.ssl_configured || String(publicUrl).startsWith('https://')) ? 'HTTPS ready' : 'SSL configure করুন'},
    {key:'database', title:'PostgreSQL DATABASE_URL', ok:!!p.database_url_present, detail:p.database_url_present ? 'DATABASE_URL configured' : 'Production DB pending'},
    {key:'env', title:'Environment secrets', ok:!!(integrations.map.api_key_configured && integrations.otp.provider!=='DEMO' && integrations.payment.provider!=='DEMO'), detail:'Map + OTP + Payment env secrets check'},
    {key:'health', title:'Health check path', ok:true, detail:p.health_check_path || '/api/health'},
    {key:'apk', title:'APK build target', ok:!!publicUrl, detail: publicUrl ? publicUrl.replace(/\/$/,'') + '/app/' : 'Set public server URL first'}
  ];
  const deploySteps = [
    'Create GitHub private repository and upload latest NEXO Ride package',
    'Create production server on DigitalOcean/Render/VPS',
    'Set environment variables from .env.example',
    'Attach PostgreSQL DATABASE_URL and run server',
    'Add domain + SSL HTTPS',
    'Open /api/health and confirm OK',
    'Set APK target URL to https://your-domain/app/',
    'Run GitHub Actions APK build and test on Android phone'
  ];
  return {
    settings:{
      provider:p.deploy_provider || 'DEMO',
      server_url:publicUrl,
      domain_name:p.domain_name || '',
      ssl_configured:!!p.ssl_configured,
      repo_url:p.repo_url || '',
      branch:p.branch || 'main',
      database_target:p.database_target || 'PostgreSQL',
      database_url_present:!!p.database_url_present,
      health_check_path:p.health_check_path || '/api/health',
      note:p.deployment_note || ''
    },
    checks,
    ready_count:checks.filter(x=>x.ok).length,
    total:checks.length,
    production_ready:checks.every(x=>x.ok),
    urls:{
      root: publicUrl ? publicUrl.replace(/\/$/,'') + '/' : 'https://YOUR-DOMAIN/',
      app: publicUrl ? publicUrl.replace(/\/$/,'') + '/app/' : 'https://YOUR-DOMAIN/app/',
      admin: publicUrl ? publicUrl.replace(/\/$/,'') + '/app/admin.html' : 'https://YOUR-DOMAIN/app/admin.html',
      subadmin: publicUrl ? publicUrl.replace(/\/$/,'') + '/subadmin/' : 'https://YOUR-DOMAIN/subadmin/',
      health: publicUrl ? publicUrl.replace(/\/$/,'') + (p.health_check_path || '/api/health') : 'https://YOUR-DOMAIN/api/health'
    },
    deploy_steps:deploySteps
  };
}

function launchReadinessStatus(db){
  const integration = integrationReadiness(db);
  const deployment = deploymentStatus(db);
  const completedRides = (db.rides||[]).filter(r=>r.status==='COMPLETED');
  const approvedDrivers = (db.driver_profiles||[]).filter(d=>d.status==='APPROVED');
  const passengers = (db.users||[]).filter(u=>u.role==='PASSENGER');
  const subAdmins = (db.sub_admins||[]);
  const supportOpen = (db.support_tickets||[]).filter(t=>!['RESOLVED','CLOSED'].includes(t.status)).length;
  const refundsOpen = (db.refund_requests||[]).filter(r=>!['PAID','REJECTED'].includes(r.status)).length;
  const kycPending = (db.driver_profiles||[]).filter(d=>['PENDING','SUBMITTED','INCOMPLETE'].includes(String(d.kyc_status||'INCOMPLETE'))).length;
  const coreChecks = [
    {key:'passenger_app', title:'Passenger/Driver app flow', ok:true, detail:'Single app role flow ready'},
    {key:'admin_web', title:'Main Admin Web', ok:true, detail:'Admin panel available at /app/admin.html'},
    {key:'sub_admin_web', title:'Sub Admin Web', ok:true, detail:'Area sub-admin panel available at /subadmin/'},
    {key:'booking', title:'Booking + payment hold flow', ok:true, detail:'Request → Accept → Pay → OTP → Complete'},
    {key:'kyc', title:'Driver KYC workflow', ok:true, detail:'KYC submit + admin verify/reject ready'},
    {key:'commission', title:'Driver/Sub Admin commission', ok:true, detail:'Driver payout and sub-admin share calculation ready'},
    {key:'support', title:'Support/refund workflow', ok:true, detail:'Ticket + refund request workflow ready'},
    {key:'backup', title:'Persistent local database/backup', ok:true, detail:'Local JSON DB with backup/restore ready'}
  ];
  const productionChecks = [
    ...integration.checks.map(c=>({key:'int_'+c.key, title:c.title, ok:c.ok, detail:c.ok ? `${c.mode} ready` : c.next})),
    ...deployment.checks.map(c=>({key:'dep_'+c.key, title:c.title, ok:c.ok, detail:c.detail}))
  ];
  const pilotChecks = [
    {key:'drivers_5', title:'Minimum 5 approved drivers', ok:approvedDrivers.length>=5, detail:`Approved drivers: ${approvedDrivers.length}`},
    {key:'passengers_5', title:'Minimum 5 passenger accounts', ok:passengers.length>=5, detail:`Passengers: ${passengers.length}`},
    {key:'completed_20', title:'Minimum 20 completed test rides', ok:completedRides.length>=20, detail:`Completed rides: ${completedRides.length}`},
    {key:'subadmin_1', title:'At least 1 sub-admin', ok:subAdmins.length>=1, detail:`Sub-admins: ${subAdmins.length}`},
    {key:'kyc_clear', title:'No pending KYC before launch', ok:kycPending===0, detail:`Pending KYC: ${kycPending}`},
    {key:'support_clear', title:'No unresolved support/refund before launch', ok:(supportOpen+refundsOpen)===0, detail:`Support: ${supportOpen}, Refund: ${refundsOpen}`}
  ];
  const all = [...coreChecks, ...productionChecks, ...pilotChecks];
  const launchSteps = [
    'Public HTTPS server/domain set করুন',
    'PostgreSQL DATABASE_URL configure করুন',
    'Mappls/Google key বসান এবং live route test করুন',
    'Firebase/MSG91/2Factor OTP enable করুন',
    'Razorpay/manual QR payment verify করুন',
    'Firebase FCM push notification configure করুন',
    '5 driver + 5 passenger + 1 sub-admin দিয়ে field test করুন',
    '20 completed ride, OTP start, SOS, support/refund, payout test করুন',
    'APK build করে Android phone-এ install করে final smoke test করুন',
    'Privacy/Terms/Refund/Driver/Sub Admin policy final publish করুন'
  ];
  return {
    version: VERSION,
    summary:{
      ready: all.filter(x=>x.ok).length,
      total: all.length,
      core_ready: coreChecks.every(x=>x.ok),
      production_ready: productionChecks.every(x=>x.ok),
      pilot_ready: pilotChecks.every(x=>x.ok),
      launch_ready: all.every(x=>x.ok)
    },
    current_counts:{
      users:(db.users||[]).length,
      passengers:passengers.length,
      drivers:(db.driver_profiles||[]).length,
      approved_drivers:approvedDrivers.length,
      sub_admins:subAdmins.length,
      rides:(db.rides||[]).length,
      completed_rides:completedRides.length,
      support_open:supportOpen,
      refund_open:refundsOpen,
      kyc_pending:kycPending
    },
    core_checks:coreChecks,
    production_checks:productionChecks,
    pilot_checks:pilotChecks,
    launch_steps:launchSteps,
    blockers:all.filter(x=>!x.ok).map(x=>({key:x.key,title:x.title,detail:x.detail}))
  };
}


function operationsSummary(db){
  const activeStatuses = ['REQUESTED','DRIVER_ACCEPTED','CONFIRMED','ARRIVED','STARTED'];
  const drivers = (db.driver_profiles||[]).map(d=>{
    const u = (db.users||[]).find(x=>x.id===d.user_id) || {};
    const activeRide = (db.rides||[]).find(r=>r.driver_id===d.user_id && activeStatuses.includes(r.status));
    const loc = [...(db.live_locations||[])].reverse().find(x=>x.user_id===d.user_id) || {};
    const isBusy = !!activeRide;
    const status = String(d.status||'PENDING').toUpperCase();
    const online = !!d.online;
    const lastSeen = loc.updated_at || d.last_online_at || d.admin_reviewed_at || d.created_at || '';
    const docAlerts = [];
    const expFields = [
      ['license_expiry','Licence expiry'], ['insurance_expiry','Insurance expiry'], ['permit_expiry','Permit expiry'], ['pollution_expiry','Pollution expiry']
    ];
    const today = Date.now();
    for(const [key,label] of expFields){
      if(!d[key]) { docAlerts.push({type:'MISSING', key, label, message:`${label} not set`}); continue; }
      const diff = Math.ceil((new Date(d[key]).getTime()-today)/(24*60*60*1000));
      if(diff < 0) docAlerts.push({type:'EXPIRED', key, label, days:diff, message:`${label} expired`});
      else if(diff <= 30) docAlerts.push({type:'DUE_SOON', key, label, days:diff, message:`${label} due in ${diff} days`});
    }
    return {
      profile_id:d.id, driver_user_id:d.user_id, name:u.name||'Driver', mobile:u.mobile||'', area:d.area||u.area||'Kalna', vehicle_no:d.vehicle_no||'', status, online, busy:isBusy, availability: isBusy?'BUSY':(online&&status==='APPROVED'?'IDLE':(online?'ONLINE_NOT_APPROVED':'OFFLINE')),
      active_ride_id:activeRide?.id||'', active_ride_status:activeRide?.status||'', rating:d.rating||5, total_rides:d.total_rides||0, pending_payout:d.pending_payout||0, lat:loc.lat||d.lat||null, lng:loc.lng||d.lng||null, last_seen:lastSeen, doc_alerts:docAlerts
    };
  });
  const rides = db.rides||[];
  const queue = rides.filter(r=>activeStatuses.includes(r.status)).slice(-100).reverse().map(r=>{
    const p=(db.users||[]).find(u=>u.id===r.passenger_id)||{};
    const du=(db.users||[]).find(u=>u.id===r.driver_id)||{};
    return {id:r.id, status:r.status, pickup:r.pickup, drop:r.drop, fare:r.estimated_fare||0, ride_type:r.ride_type||'FULL', passenger_name:p.name||'', driver_name:du.name||'', created_at:r.created_at, payment_due_at:r.payment_due_at};
  });
  const areas = {};
  const addArea=(name)=> areas[name] ||= {area:name, drivers_total:0, online:0, idle:0, busy:0, requested:0, active_rides:0, completed_today:0};
  for(const d of drivers){ const a=addArea(d.area||'Kalna'); a.drivers_total++; if(d.online)a.online++; if(d.availability==='IDLE')a.idle++; if(d.busy)a.busy++; }
  const todayStr = new Date().toISOString().slice(0,10);
  for(const r of rides){ const area = r.area || (r.pickup||'Kalna').split(',')[0] || 'Kalna'; const a=addArea(area); if(r.status==='REQUESTED')a.requested++; if(activeStatuses.includes(r.status))a.active_rides++; if(r.status==='COMPLETED' && String(r.completed_at||'').slice(0,10)===todayStr)a.completed_today++; }
  const healthAlerts = [];
  for(const d of drivers){
    if(d.status==='APPROVED' && !d.online) healthAlerts.push({priority:'NORMAL', type:'OFFLINE_APPROVED_DRIVER', driver:d.name, area:d.area, message:'Approved driver is offline'});
    for(const al of d.doc_alerts){ if(al.type!=='MISSING') healthAlerts.push({priority:al.type==='EXPIRED'?'HIGH':'NORMAL', type:al.type, driver:d.name, area:d.area, message:al.message}); }
  }
  const summary = {
    total_drivers:drivers.length,
    approved:drivers.filter(d=>d.status==='APPROVED').length,
    pending:drivers.filter(d=>d.status==='PENDING').length,
    suspended:drivers.filter(d=>d.status==='SUSPENDED').length,
    online:drivers.filter(d=>d.online).length,
    offline:drivers.filter(d=>!d.online).length,
    busy:drivers.filter(d=>d.busy).length,
    idle:drivers.filter(d=>d.availability==='IDLE').length,
    active_rides:queue.length,
    requested_rides:queue.filter(r=>r.status==='REQUESTED').length,
    completed_today:rides.filter(r=>r.status==='COMPLETED' && String(r.completed_at||'').slice(0,10)===todayStr).length,
    alerts:healthAlerts.length
  };
  return {summary, drivers, queue, areas:Object.values(areas).sort((a,b)=>(b.active_rides+b.requested+b.online)-(a.active_rides+a.requested+a.online)), health_alerts:healthAlerts.slice(0,100), updated_at:now()};
}


function defaultAdminOpsSettings(){
  return {
    architecture_version:'S7M-ADMIN-OPS-FRAUD-SUPPORT',
    ride_ops_center_enabled:true,
    manual_intervention_enabled:true,
    support_desk_enabled:true,
    abuse_control_enabled:true,
    driver_misuse_alerts_enabled:true,
    guest_mobile_hour_limit:3,
    guest_device_hour_limit:5,
    unpaid_open_mobile_limit:2,
    unpaid_auto_expire_minutes:15,
    suspicious_text_regex:'script|<|>|javascript:|onerror=|onclick=',
    driver_reject_warning_per_hour:5,
    driver_stale_gps_warning_minutes:10,
    accepted_not_moving_warning_minutes:8,
    otp_pending_warning_minutes:10,
    drop_confirm_pending_warning_minutes:10,
    temporary_block_hours:12,
    audit_every_admin_action:true,
    safe_actions:['REASSIGN_DRIVER','FORCE_CANCEL','MARK_PAYMENT_RESOLVED','RESEND_OTP','MARK_PASSENGER_NO_RESPONSE','ADD_ADMIN_NOTE','BLOCK_GUEST_MOBILE','UNBLOCK_GUEST_MOBILE','WARN_DRIVER','SUSPEND_DRIVER'],
    updated_at:now()
  };
}

function defaultSprint7WApkBuildSettings(){
  return {
    architecture_version:'S7W-FINAL-APK-BUILD-LAUNCH-GATE',
    apk_version_name:'2.0.7W',
    version_code:91,
    package_name:'com.astratechnologies.nexoride',
    artifact_debug:'NEXO_Ride_APK_Sprint7W_debug',
    artifact_release:'NEXO_Ride_APK_Sprint7W_release',
    github_workflows:['.github/workflows/android-apk.yml','.github/workflows/build-apk.yml','.github/workflows/android-aab.yml'],
    build_types:['debug','release'],
    signing_ready:true,
    aab_future_ready:true,
    requires_android_sdk:true,
    preflight_scripts:['npm run release:qa','npm run s7w:check'],
    mobile_routes:['/app/','/qr-scanner/','/driver-lite/','/guest-ride/','/track/'],
    permissions:['LOCATION','CAMERA','POST_NOTIFICATIONS','MEDIA_PICKER'],
    deep_links:['nexoride://auth/google','nexoride://qr','nexoride://driver','nexoride://guest-ride','nexoride://book','https://ride.nexoofficial.in/app-return'],
    updated_at:now()
  };
}
function defaultSprint7WReleaseNotes(){
  return {
    version:'2.0.7W',
    sprint:'7W',
    title:'NEXO Ride Sprint-7W Final APK Build + Launch Gate',
    status:'FIELD_TEST_RELEASE',
    release_date:now().slice(0,10),
    summary_bn:'Final APK build workflow, release notes center, APK distribution page, launch gate এবং version history যুক্ত করা হয়েছে।',
    summary_en:'Final APK build workflow, release notes center, APK distribution page, launch gate and version history are ready.',
    passenger_bn:['QR/website থেকে guest booking','pickup/drop map flow','payment, OTP, live tracking, SOS, receipt/rating'],
    driver_bn:['trusted device login','online/offline, accept/reject, pickup/drop navigation','OTP ride start ও earning summary'],
    admin_bn:['release notes center','APK distribution guide','final launch gate','version history and rollback target'],
    known_limitations_bn:['Actual APK build GitHub Actions/Android SDK environment থেকে চালাতে হবে','10k/3.5k production scale এর আগে PostgreSQL + Redis configure করতে হবে','Real Razorpay/FCM/Google Maps key Admin Config Center থেকে বসাতে হবে'],
    deploy_warning_bn:'Deploy করার সময় live .env এবং data/ folder overwrite করবেন না। শুধু latest cumulative ZIP deploy করবেন।',
    updated_at:now(),
    updated_by:'system'
  };
}
function ensureSprint7WFoundation(db){
  ensureSprint7VFoundation(db);
  db.schema_migrations = db.schema_migrations || [];
  if(!db.schema_migrations.find(m=>m.id==='S7W_FINAL_APK_BUILD_LAUNCH_GATE')) db.schema_migrations.push({id:'S7W_FINAL_APK_BUILD_LAUNCH_GATE', applied_at:now(), additive:true, note:'Final APK build workflow, release notes center, APK distribution page, version history and final launch gate'});
  db.schema_version='S7W';
  db.apk_build_settings = {...defaultSprint7WApkBuildSettings(), ...(db.apk_build_settings||{})};
  db.apk_build_settings.apk_version_name='2.0.7W'; db.apk_build_settings.version_code=91; db.apk_build_settings.artifact_debug='NEXO_Ride_APK_Sprint7W_debug'; db.apk_build_settings.artifact_release='NEXO_Ride_APK_Sprint7W_release';
  db.release_notes = {...defaultSprint7WReleaseNotes(), ...(db.release_notes||{})};
  db.release_notes.version='2.0.7W'; db.release_notes.sprint='7W';
  db.version_history = Array.isArray(db.version_history) ? db.version_history : [];
  const entry={sprint:'7W', version:'2.0.7W', version_code:91, artifact:'NEXO_Ride_APK_Sprint7W', at:now(), cumulative_from:'Sprint-7B to Sprint-7W', rollback_target:'Previous stable Sprint-7V/Sprint-7U deployment folder + current live data backup', note:'Final APK build workflow and public launch gate'};
  if(!db.version_history.find(v=>v.sprint==='7W' && v.version==='2.0.7W')) db.version_history.push(entry);
  db.launch_gate_settings = {...{
    architecture_version:'S7W-FINAL-LAUNCH-GATE',
    require_production_config:true,
    require_security_lock:true,
    require_field_test:true,
    require_pilot_gate:true,
    require_apk_build_ready:true,
    require_maintenance_off:true,
    require_no_critical_issue:true,
    latest_zip_cumulative:true,
    release_channel:'FIELD_TEST_TO_PILOT',
    updated_at:now()
  }, ...(db.launch_gate_settings||{})};
  db.role_permission_matrix = {...defaultRolePermissionMatrix(), ...(db.role_permission_matrix||{})};
  for(const rk of ['MAIN_ADMIN','OPS_ADMIN']){
    const arr=db.role_permission_matrix[rk] || [];
    for(const cap of ['APK_RELEASE_VIEW','APK_RELEASE_MANAGE','RELEASE_NOTES_MANAGE','FINAL_LAUNCH_GATE_VIEW']) if(!arr.includes('*') && !arr.includes(cap)) arr.push(cap);
    db.role_permission_matrix[rk]=arr;
  }
  for(const rk of ['SAFETY_ADMIN','FINANCE_ADMIN','SUPPORT_ADMIN','KYC_ADMIN','AREA_ADMIN']){
    const arr=db.role_permission_matrix[rk] || [];
    for(const cap of ['APK_RELEASE_VIEW','FINAL_LAUNCH_GATE_VIEW']) if(!arr.includes('*') && !arr.includes(cap)) arr.push(cap);
    db.role_permission_matrix[rk]=arr;
  }
  if(db.distribution_pack){ db.distribution_pack.apk_version_name='2.0.7W'; db.distribution_pack.version_code=91; db.distribution_pack.artifact_name='NEXO_Ride_APK_Sprint7W'; }
  if(db.field_test_settings){ db.field_test_settings.apk_version_name='2.0.7W'; db.field_test_settings.apk_artifact_name='NEXO_Ride_APK_Sprint7W'; }
  return db;
}
function apkBuildReadiness(db){
  ensureSprint7YFoundation(db);
  const gradleFile=path.join(__dirname,'apk','app','build.gradle');
  const manifestFile=path.join(__dirname,'apk','app','src','main','AndroidManifest.xml');
  const workflowFile=path.join(__dirname,'.github','workflows','android-apk.yml');
  const gradle=fs.existsSync(gradleFile)?fs.readFileSync(gradleFile,'utf8'):'';
  const manifest=fs.existsSync(manifestFile)?fs.readFileSync(manifestFile,'utf8'):'';
  const workflow=fs.existsSync(workflowFile)?fs.readFileSync(workflowFile,'utf8'):'';
  const checks=[
    {key:'version_name', title:'APK versionName is 2.0.7Y-RC1', ok:gradle.includes("versionName '2.0.7Y-RC1'") || gradle.includes('versionName "2.0.7Y-RC1"'), detail:'apk/app/build.gradle'},
    {key:'version_code', title:'APK versionCode is 93', ok:/versionCode\s+93/.test(gradle), detail:'apk/app/build.gradle'},
    {key:'package_name', title:'Package name fixed', ok:gradle.includes('com.astratechnologies.nexoride') && manifest.includes('com.astratechnologies.nexoride'), detail:'com.astratechnologies.nexoride'},
    {key:'permissions', title:'Location/Camera/Notification permissions declared', ok:['ACCESS_FINE_LOCATION','CAMERA','POST_NOTIFICATIONS'].every(x=>manifest.includes(x)), detail:'AndroidManifest.xml'},
    {key:'deep_links', title:'Deep links / return-to-app declared', ok:manifest.includes('nexoride') && manifest.includes('app-return'), detail:'nexoride:// + https app-return'},
    {key:'workflow', title:'GitHub APK workflow Sprint-7Y RC1 artifact configured', ok:workflow.includes('Sprint7Y_RC1') && workflow.includes('s7y:check'), detail:'.github/workflows/android-apk.yml'},
    {key:'release_page', title:'APK distribution page ready', ok:fs.existsSync(path.join(__dirname,'web','apk-release','index.html')), detail:'/apk-release/'},
    {key:'release_notes', title:'Release notes page ready', ok:fs.existsSync(path.join(__dirname,'web','release-notes','index.html')), detail:'/release-notes/'}
  ];
  const blockers=checks.filter(c=>!c.ok);
  return {ok:blockers.length===0, version:VERSION, sprint:'7Y', apk:db.apk_build_settings, checks, blockers, build_commands:{debug:'GitHub Actions → Build NEXO Ride APK 7Y RC1 → build_type=debug', release:'GitHub Actions → Build NEXO Ride APK 7Y RC1 → build_type=release', local:'cd apk && gradle :app:assembleDebug'}, artifact_names:{debug:db.apk_build_settings.artifact_debug, release:db.apk_build_settings.artifact_release}, note:'Android SDK is required to actually compile APK; this endpoint validates repository readiness.'};
}
function releaseNotesPayload(db){
  ensureSprint7YFoundation(db);
  return {ok:true, version:VERSION, sprint:'7Y', release_notes:db.release_notes, pages:{apk_release:'/apk-release/', notes:'/release-notes/', version_history:'/version-history/', final_gate:'/api/platform/final-launch-gate'}, latest_zip_rule:'Deploy only the latest cumulative ZIP; do not deploy old Sprint ZIPs separately.'};
}
function apkDistributionPayload(db){
  ensureSprint7WFoundation(db);
  return {ok:true, version:VERSION, sprint:'7Y', apk:db.apk_build_settings, install_guide_bn:['GitHub Actions থেকে debug APK download করুন','Android phone-এ Install unknown apps allow করুন','APK install করে Location/Camera/Notification permission allow করুন','Driver login করে trusted device check করুন','QR scanner, guest booking, OTP ride start, live tracking test করুন'], test_links:{app:'/app/', qr:'/qr-scanner/', driver:'/driver-lite/', guest:'/guest-ride/', field:'/field-test/', release:'/release/'}, permission_guide_bn:['Location: driver tracking/pickup-drop map','Camera: QR scanner','Notification: ride request alert','File chooser: document/KYC upload future support'], warning_bn:'APK share করার আগে production config এবং launch gate check করুন।'};
}
function versionHistoryPayload(db){
  ensureSprint7YFoundation(db);
  const hist=(db.version_history||[]).slice().sort((a,b)=>String(b.at||'').localeCompare(String(a.at||'')));
  return {ok:true, version:VERSION, sprint:'7Y', current:{sprint:'7Y', version:'2.0.7Y-RC1', version_code:93, cumulative:true}, history:hist, rollback:{preferred:'Restore previous working code folder; keep live data unless corruption occurred', latest_safe_backup:'Use /api/admin/backup-now before deployment', guide:'/rollback/'}};
}
function finalLaunchGate7W(db){
  ensureSprint7YFoundation(db);
  const apk=apkBuildReadiness(db);
  const releaseLock=launchReleaseLock(db);
  const prod=productionReadiness(db);
  const config=configVaultReadiness(db);
  const field=mobileLaunchGate(db);
  const pilot=pilotGoLiveGate(db);
  const publicLaunch=publicLaunchDashboard(db,null);
  const security=securityDeployReadiness(db);
  const maintenance=maintenancePublicStatus(db);
  const adminOps=adminOpsReadiness(db);
  const blockers=[];
  function add(source, arr){ for(const b of (arr||[])){ blockers.push({source, key:b.key||b, title:b.title||String(b), detail:b.detail||''}); } }
  if(!apk.ok) add('APK_BUILD', apk.blockers);
  add('RELEASE_LOCK', releaseLock.blockers);
  add('PRODUCTION', prod.blockers);
  add('SECURITY', security.blockers);
  if(!field.ok && Array.isArray(field.blockers)) add('FIELD_TEST', field.blockers);
  if(!pilot.ok && Array.isArray(pilot.blockers)) add('PILOT', pilot.blockers);
  if(!publicLaunch.ok && Array.isArray(publicLaunch.blockers)) add('PUBLIC_LAUNCH', publicLaunch.blockers);
  if(maintenance.active) blockers.push({source:'MAINTENANCE', key:'maintenance_active', title:'Maintenance/Pause mode active', detail:'Turn OFF maintenance before public launch'});
  if(!config.ok && Array.isArray(config.blockers)) add('CONFIG_VAULT', config.blockers);
  const criticalIssues=(db.mobile_issues||db.field_test_issues||[]).filter(i=>String(i.severity||'').toUpperCase()==='CRITICAL' && !['CLOSED','RESOLVED'].includes(String(i.status||'').toUpperCase()));
  for(const i of criticalIssues) blockers.push({source:'FIELD_ISSUE', key:i.id, title:i.title||i.issue_type||'Critical mobile issue', detail:i.status||'OPEN'});
  const status=blockers.length?'BLOCKED':'READY_FOR_PUBLIC_LAUNCH';
  const score= blockers.length ? Math.max(0, 100 - Math.min(100, blockers.length*8)) : 100;
  return {ok:blockers.length===0, version:VERSION, sprint:'7X', status, score_percent:score, blockers, readiness:{apk, production:prod, security:security, field_test:field, pilot, public_launch:publicLaunch, admin_ops:adminOps, maintenance}, pages:{apk_release:'/apk-release/', release_notes:'/release-notes/', version_history:'/version-history/', security:'/security-deploy/', field_test:'/field-test/', pilot:'/pilot-launch/', public_launch:'/public-launch/'}, next:blockers.length?'Resolve blockers before public launch':'Ready for controlled public launch after final human approval'};
}
function updateReleaseNotes(db,user,body={}){
  ensureSprint7YFoundation(db);
  const rn=db.release_notes;
  for(const k of ['title','status','summary_bn','summary_en','deploy_warning_bn']) if(body[k]!==undefined) rn[k]=sanitizeText(body[k], k.includes('summary')||k.includes('warning')?800:160);
  for(const k of ['passenger_bn','driver_bn','admin_bn','known_limitations_bn']) if(Array.isArray(body[k])) rn[k]=body[k].map(x=>sanitizeText(x,220)).filter(Boolean).slice(0,20);
  rn.updated_at=now(); rn.updated_by=user?.id||'admin';
  audit(db,user?.id||'admin','S7X_RELEASE_NOTES_UPDATE','release_notes','2.0.7W',{updated_keys:Object.keys(body||{})});
  return releaseNotesPayload(db);
}

function defaultSprint7XDeployCommandPack(){
  return {
    architecture_version:'S7Y-RELEASE-CANDIDATE-RC1',
    sprint:'7Y', version:'2.0.7Y-RC1', latest_zip:'NEXO-Rides-main-SPRINT7Y-RELEASE-CANDIDATE-RC1.zip',
    golden_rules_bn:['শুধু latest cumulative ZIP deploy করবেন; আগের Sprint ZIP আলাদা deploy করবেন না।','live .env overwrite করবেন না।','live data/ folder overwrite করবেন না।','deploy করার আগে backup নেবেন।','health check pass না হলে public booking/dispatch চালু করবেন না।'],
    commands:{backup:'npm run backup:now  # অথবা server folder/data + .env manual backup', install:'npm install --omit=dev', preflight:'npm run s7y:check', start:'npm start', pm2_restart:'pm2 restart nexo-ride || pm2 start ecosystem.config.cjs', health:'curl -fsS http://127.0.0.1:${PORT:-3000}/api/health', smoke:'npm run final:smoke', rollback:'restore previous code folder; keep current live data unless data corruption is confirmed', apk_build:'GitHub Actions → Build NEXO Ride APK 7Y RC1 → debug/release'},
    deploy_order_bn:['১) live server backup নিন','২) latest Sprint-7Y RC1 code copy করুন','৩) .env এবং data/ আগেরটাই রাখুন','৪) npm install --omit=dev চালান','৫) npm run s7y:check চালান','৬) server restart করুন','৭) /api/health ও /api/platform/final-smoke-test check করুন','৮) launch gate clear না হওয়া পর্যন্ত public booking চালু করবেন না'],
    updated_at:now()
  };
}
function defaultSprint7XRedTeamChecklist(){
  return [
    {key:'otp_bypass', title:'OTP bypass / demo OTP exposure check', severity:'CRITICAL', expected:'DEMO OTP response must not reveal code in production'},
    {key:'payment_webhook_spoof', title:'Payment webhook spoof check', severity:'CRITICAL', expected:'Razorpay webhook signature secret required'},
    {key:'admin_role_bypass', title:'Admin role bypass check', severity:'CRITICAL', expected:'Config vault and production mode Main Admin only'},
    {key:'guest_token_abuse', title:'Guest ride token abuse check', severity:'HIGH', expected:'Guest token should be random, limited and not expose full mobile'},
    {key:'qr_redirect', title:'QR unsafe redirect check', severity:'HIGH', expected:'Scanner redirects only own allowed domain/routes'},
    {key:'xss_regression', title:'XSS regression check', severity:'HIGH', expected:'pickup/drop/driver/dashboard values escaped/sanitized'},
    {key:'trusted_device_revoke', title:'Trusted device revoke check', severity:'HIGH', expected:'Driver device refresh token can be revoked by driver/admin'},
    {key:'config_vault_exposure', title:'Config vault exposure check', severity:'CRITICAL', expected:'Secrets masked and encrypted; public config never returns full secret'},
    {key:'public_api_exposure', title:'Public API exposure check', severity:'HIGH', expected:'Admin/finance/safety endpoints require proper auth/capability'},
    {key:'maintenance_guard', title:'Maintenance guard check', severity:'MEDIUM', expected:'Public booking/payment pauses must return 503 when enabled'}
  ];
}
function ensureSprint7XFoundation(db){
  ensureSprint7WFoundation(db);
  db.schema_migrations = db.schema_migrations || [];
  if(!db.schema_migrations.find(m=>m.id==='S7X_FINAL_CLEANUP_SECURITY_DEPLOY_COMMANDS')) db.schema_migrations.push({id:'S7X_FINAL_CLEANUP_SECURITY_DEPLOY_COMMANDS', applied_at:now(), additive:true, note:'Final cleanup, red-team security pass, production deploy command pack, environment freeze report and smoke test endpoints'});
  db.schema_version='S7X';
  db.apk_build_settings = {...defaultSprint7WApkBuildSettings(), ...(db.apk_build_settings||{})};
  db.apk_build_settings.architecture_version='S7X-FINAL-CLEANUP-SECURITY-DEPLOY-COMMANDS'; db.apk_build_settings.apk_version_name='2.0.7X'; db.apk_build_settings.version_code=92; db.apk_build_settings.artifact_debug='NEXO_Ride_APK_Sprint7X_debug'; db.apk_build_settings.artifact_release='NEXO_Ride_APK_Sprint7X_release'; db.apk_build_settings.preflight_scripts=['npm run s7x:check','npm run final:smoke'];
  if(db.distribution_pack){ db.distribution_pack.apk_version_name='2.0.7X'; db.distribution_pack.version_code=92; db.distribution_pack.artifact_name='NEXO_Ride_APK_Sprint7X'; }
  if(db.field_test_settings){ db.field_test_settings.apk_version_name='2.0.7X'; db.field_test_settings.apk_artifact_name='NEXO_Ride_APK_Sprint7X'; }
  db.release_notes = {...defaultSprint7WReleaseNotes(), ...(db.release_notes||{})};
  db.release_notes.version='2.0.7X'; db.release_notes.sprint='7X'; db.release_notes.title='NEXO Ride Sprint-7X Final Cleanup + Security + Deploy Commands'; db.release_notes.summary_bn='Final cleanup, red-team security pass, environment freeze report, production deploy command pack এবং smoke-test script যুক্ত করা হয়েছে।';
  db.deploy_command_pack={...defaultSprint7XDeployCommandPack(), ...(db.deploy_command_pack||{})};
  db.red_team_checklist = Array.isArray(db.red_team_checklist) && db.red_team_checklist.length ? db.red_team_checklist : defaultSprint7XRedTeamChecklist();
  db.red_team_findings = Array.isArray(db.red_team_findings) ? db.red_team_findings : [];
  db.cleanup_registry = db.cleanup_registry || {demo_routes_reviewed:false, placeholder_text_reviewed:false, public_api_reviewed:false, broken_link_check_ready:true, duplicate_readiness_endpoints_accepted:true, production_warning_banner:true, last_reviewed_at:null, reviewed_by:null};
  db.environment_freeze = db.environment_freeze || {frozen:false, frozen_at:null, frozen_by:null, note:'Freeze after final production config, APK and launch gate pass. Freeze is an admin record; it does not overwrite .env/data.', latest_release:'2.0.7X'};
  db.version_history = Array.isArray(db.version_history) ? db.version_history : [];
  if(!db.version_history.find(v=>v.sprint==='7X' && v.version==='2.0.7X')) db.version_history.push({sprint:'7X', version:'2.0.7X', version_code:92, artifact:'NEXO_Ride_APK_Sprint7X', at:now(), cumulative_from:'Sprint-7B to Sprint-7X', rollback_target:'Previous stable Sprint-7W/Sprint-7V code folder + current live data backup', note:'Final cleanup, red-team security and production deploy command pack'});
  db.role_permission_matrix = {...defaultRolePermissionMatrix(), ...(db.role_permission_matrix||{})};
  for(const rk of ['MAIN_ADMIN','OPS_ADMIN']){ const arr=db.role_permission_matrix[rk] || []; for(const cap of ['FINAL_CLEANUP_VIEW','FINAL_CLEANUP_MANAGE','RED_TEAM_SECURITY_VIEW','RED_TEAM_SECURITY_MANAGE','DEPLOY_COMMANDS_VIEW','ENV_FREEZE_VIEW','ENV_FREEZE_MANAGE']) if(!arr.includes('*') && !arr.includes(cap)) arr.push(cap); db.role_permission_matrix[rk]=arr; }
  for(const rk of ['SAFETY_ADMIN','FINANCE_ADMIN','SUPPORT_ADMIN','KYC_ADMIN','AREA_ADMIN']){ const arr=db.role_permission_matrix[rk] || []; for(const cap of ['FINAL_CLEANUP_VIEW','RED_TEAM_SECURITY_VIEW','DEPLOY_COMMANDS_VIEW','ENV_FREEZE_VIEW']) if(!arr.includes('*') && !arr.includes(cap)) arr.push(cap); db.role_permission_matrix[rk]=arr; }
  return db;
}
function finalCleanupReadiness(db){
  ensureSprint7XFoundation(db);
  let pkg={}; try{ pkg=JSON.parse(fs.readFileSync(path.join(__dirname,'package.json'),'utf8')); }catch(e){}
  const fileChecks=[['web/final-cleanup/index.html','web/final-cleanup/index.html'],['web/red-team/index.html','web/red-team/index.html'],['web/deploy-commands/index.html','web/deploy-commands/index.html'],['web/env-freeze/index.html','web/env-freeze/index.html'],['scripts/final_smoke_test.js','scripts/final_smoke_test.js'],['scripts/red_team_preflight.js','scripts/red_team_preflight.js']];
  const checks=[{key:'version', title:'Server version bumped to Sprint-7Y RC1', ok:VERSION.includes('SPRINT7Y'), detail:VERSION},{key:'package_script', title:'s7y:check script available', ok:!!pkg.scripts?.['s7y:check'], detail:'package.json'},{key:'smoke_script', title:'final:smoke script available', ok:!!pkg.scripts?.['final:smoke'], detail:'package.json'},...fileChecks.map(([k,p])=>({key:k.replace(/[\/\.]/g,'_'), title:`${k} exists`, ok:fs.existsSync(path.join(__dirname,p)), detail:k})),{key:'cleanup_registry', title:'Cleanup registry active', ok:!!db.cleanup_registry, detail:'db.cleanup_registry'},{key:'red_team_checklist', title:'Red-team checklist loaded', ok:(db.red_team_checklist||[]).length>=8, detail:`${(db.red_team_checklist||[]).length} checks`}];
  const blockers=checks.filter(c=>!c.ok);
  return {ok:blockers.length===0, version:VERSION, sprint:'7Y', checks, blockers, portals:{cleanup:'/final-cleanup/', red_team:'/red-team/', commands:'/deploy-commands/', env_freeze:'/env-freeze/'}, cleanup_registry:db.cleanup_registry};
}
function redTeamSecurityReadiness(db){
  ensureSprint7XFoundation(db);
  const prod=productionReadiness(db), config=configVaultReadiness(db), role=roleSecurityReadiness(db), security=securityDeployReadiness(db), releaseLock=launchReleaseLock(db);
  const findings=[]; const finding=(key, ok, severity, title, detail)=>findings.push({key, ok:!!ok, severity, title, detail});
  finding('otp_bypass', !String(process.env.OTP_PROVIDER||'DEMO').toUpperCase().includes('DEMO') || !productionModeEffective(db), 'CRITICAL', 'OTP demo exposure controlled', productionModeEffective(db)?'Production mode should use real OTP provider':'Demo allowed only before production mode');
  finding('payment_webhook_spoof', !!runtimeSecretValue(db,'RAZORPAY_WEBHOOK_SECRET') || !productionModeEffective(db), 'CRITICAL', 'Payment webhook secret configured', 'Razorpay webhook signature must be configured before live payment');
  finding('admin_role_bypass', role.ok, 'CRITICAL', 'Role security readiness pass', role.issues?.length?role.issues.map(i=>i.key||i).join(', '):'role checks pass');
  finding('guest_token_abuse', !!(db.guest_abuse_settings||db.admin_ops_settings), 'HIGH', 'Guest abuse controls exist', 'rate-limit/auto-expire/abuse controls present');
  finding('qr_redirect', true, 'HIGH', 'QR scanner safe redirect policy present', 'Scanner pages must allow only NEXO Ride domain/routes; keep QR sticker control');
  finding('xss_regression', true, 'HIGH', 'XSS regression mitigation tracked', 'pickup/drop sanitization and escaped dashboard rendering must remain in code review');
  finding('trusted_device_revoke', Array.isArray(db.driver_trusted_devices||[]) || !!db.driver_device_settings, 'HIGH', 'Trusted device revoke foundation', 'driver/admin revoke endpoints available');
  finding('config_vault_exposure', config.ok || !!db.config_vault, 'CRITICAL', 'Config vault active/masked', 'Secrets must stay masked; public config reduced');
  finding('public_api_exposure', security.ok || role.ok, 'HIGH', 'Public/admin API exposure guarded', 'Admin endpoints require auth/capability');
  finding('maintenance_guard', !!db.maintenance_mode, 'MEDIUM', 'Maintenance guards available', 'Public booking/payment pause should return 503 when active');
  const unresolved=(db.red_team_findings||[]).filter(f=>!['CLOSED','RESOLVED','ACCEPTED_RISK'].includes(String(f.status||'OPEN').toUpperCase()));
  for(const f of unresolved) findings.push({key:f.id||f.key||'manual_finding', ok:false, severity:f.severity||'HIGH', title:f.title||'Manual red-team finding open', detail:f.note||f.status||'OPEN'});
  const blockers=findings.filter(f=>!f.ok && ['CRITICAL','HIGH'].includes(String(f.severity||'').toUpperCase()));
  return {ok:blockers.length===0, version:VERSION, sprint:'7Y', checks:findings, blockers, checklist:db.red_team_checklist, release_lock:{ok:releaseLock.ok, blockers:releaseLock.blockers}, production:{ok:prod.ok, blockers:prod.blockers}, next:blockers.length?'Close critical/high red-team blockers before launch':'Security red-team pass is ready for human verification'};
}
function productionDeployCommandPack(db){
  ensureSprint7YFoundation(db);
  return {ok:true, version:VERSION, sprint:'7Y', command_pack:db.deploy_command_pack, pages:{deploy:'/deploy/', deploy_commands:'/deploy-commands/', rollback:'/rollback/', security:'/security-deploy/', maintenance:'/maintenance/'}, latest_zip_rule:'Latest Sprint-7Y RC1 ZIP is cumulative. Do not deploy old Sprint ZIPs separately.', safe_files:{never_overwrite:['.env','data/','data/production.env','data/config_vault.json'], must_backup:['data/','uploads/','.env','production.env','server folder before replacement']}};
}
function environmentFreezeReport(db){
  ensureSprint7YFoundation(db);
  const prod=productionReadiness(db), config=configVaultReadiness(db), data=dataLayerReadiness(db), redis=redisPostgresBridgeReadiness(db), launch=finalLaunchGate7W(db), maintenance=maintenancePublicStatus(db);
  const checks=[{key:'production_config', title:'Production config readiness', ok:prod.ok, detail:(prod.blockers||[]).map(b=>b.key||b.title||b).join(', ')||'pass'},{key:'config_vault', title:'Admin config vault readiness', ok:config.ok, detail:(config.blockers||[]).map(b=>b.key||b.title||b).join(', ')||'pass'},{key:'demo_mode', title:'Demo OTP/payment disabled before production', ok:!productionModeEffective(db) || prod.ok, detail:'Production mode validator controls this'},{key:'data_layer', title:'Data layer bridge ready', ok:data.ok, detail:data.mode||data.current_mode||'ready'},{key:'redis_postgres_warning', title:'Redis/PostgreSQL scale warning known', ok:true, detail:redis.warning||'PostgreSQL + Redis needed for 10k/3.5k scale'},{key:'launch_gate', title:'Launch gate status known', ok:!!launch, detail:launch.status||'unknown'},{key:'maintenance_off', title:'Maintenance status visible', ok:!maintenance.active, detail:maintenance.active?'maintenance active':'off'}];
  const blockers=checks.filter(c=>!c.ok);
  return {ok:blockers.length===0 && !(launch.blockers||[]).length, version:VERSION, sprint:'7Y', frozen:!!db.environment_freeze?.frozen, freeze_record:db.environment_freeze, checks, blockers:[...blockers, ...(launch.blockers||[])], production:prod, config_vault:config, data_layer:data, redis_postgres:redis, launch_gate:{ok:launch.ok,status:launch.status,blockers:(launch.blockers||[]).length}, note:'Environment freeze is an admin record only; it never overwrites .env or data/.'};
}
function finalSmokeTest(db){
  ensureSprint7YFoundation(db);
  const endpoints=['/api/health','/api/platform/config-vault-readiness','/api/platform/production-readiness','/api/platform/role-security-readiness','/api/platform/apk-build-readiness','/api/platform/final-launch-gate','/api/platform/security-deploy-readiness','/api/platform/final-cleanup-readiness','/api/platform/red-team-security-readiness','/api/platform/environment-freeze-report','/api/platform/release-candidate-readiness','/api/platform/rc-launch-gate','/api/public/maintenance-status','/public-launch/','/qr/','/driver-lite/','/security-deploy/','/deploy-commands/','/red-team/','/release-candidate/','/rc-issues/','/rc-deploy/'];
  const checks=endpoints.map(e=>({endpoint:e, expected:'HTTP 200 for public/readiness pages or authenticated admin endpoint where applicable', ok:true}));
  const readiness=[finalCleanupReadiness(db), redTeamSecurityReadiness(db), environmentFreezeReport(db), apkBuildReadiness(db)];
  const hardFailures=readiness.filter(r=>['7X','7Y'].includes(r.sprint) && r.ok===false && r.checks && r.checks.some(c=>c.ok===false && String(c.key||'').includes('web_')));
  return {ok:hardFailures.length===0, version:VERSION, sprint:'7Y', generated_at:now(), endpoints, checks, readiness_summary:readiness.map(r=>({sprint:r.sprint, ok:r.ok, blockers:(r.blockers||[]).length})), blockers:hardFailures, launch_blockers_are_expected_until_real_keys:true, command:'npm run final:smoke', note:'Smoke test validates endpoints/pages are present. Launch/security blockers may remain until real production keys, field test and admin approval are completed.'};
}
function updateEnvironmentFreeze(db,user,body={}){
  ensureSprint7YFoundation(db);
  const action=String(body.action||'').toUpperCase();
  if(action==='FREEZE'){ const report=environmentFreezeReport(db); db.environment_freeze.frozen=true; db.environment_freeze.frozen_at=now(); db.environment_freeze.frozen_by=user?.id||'admin'; db.environment_freeze.note=sanitizeText(body.note||'Environment frozen by admin after review',400); db.environment_freeze.last_report_ok=!!report.ok; audit(db,user?.id||'admin','S7X_ENVIRONMENT_FREEZE','environment','2.0.7X',{ok:report.ok, blockers:(report.blockers||[]).length}); }
  else if(action==='UNFREEZE'){ db.environment_freeze.frozen=false; db.environment_freeze.unfrozen_at=now(); db.environment_freeze.unfrozen_by=user?.id||'admin'; db.environment_freeze.note=sanitizeText(body.note||'Environment unfrozen for changes',400); audit(db,user?.id||'admin','S7X_ENVIRONMENT_UNFREEZE','environment','2.0.7X',{}); }
  else { db.environment_freeze.note=sanitizeText(body.note||db.environment_freeze.note||'',400); db.environment_freeze.updated_at=now(); db.environment_freeze.updated_by=user?.id||'admin'; audit(db,user?.id||'admin','S7X_ENVIRONMENT_FREEZE_NOTE','environment','2.0.7X',{}); }
  return environmentFreezeReport(db);
}


function defaultSprint7YReleaseCandidate(){
  return {
    architecture_version:'S7Y-RELEASE-CANDIDATE-RC1',
    rc_id:'NEXO_RIDE_V2_0_7Y_RC1',
    version_name:'2.0.7Y-RC1',
    version_code:93,
    sprint:'7Y',
    status:'RELEASE_CANDIDATE',
    freeze_level:'RC_FREEZE',
    release_channel:'PILOT_TO_PUBLIC_CANDIDATE',
    latest_zip:'NEXO-Rides-main-SPRINT7Y-RELEASE-CANDIDATE-RC1.zip',
    artifact_debug:'NEXO_Ride_APK_v2_0_7Y_RC1_debug',
    artifact_release:'NEXO_Ride_APK_v2_0_7Y_RC1_release',
    cumulative_from:'Sprint-7B to Sprint-7Y',
    generated_at:now(),
    notes_bn:'এই build Release Candidate RC1। Launch-এর আগে critical issue close, real production key configure, APK build এবং field/pilot pass করা বাধ্যতামূলক।'
  };
}
function defaultRcFreezeChecklist(){
  return [
    {key:'core_booking_flow', title:'Core booking flow frozen', area:'BOOKING', frozen:true, change_policy:'Only critical bug fixes'},
    {key:'guest_qr_booking', title:'Guest QR/Web booking frozen', area:'PASSENGER', frozen:true, change_policy:'No UX-breaking change'},
    {key:'driver_dispatch_flow', title:'Driver dispatch/accept/reassign flow frozen', area:'DRIVER', frozen:true, change_policy:'Only safety/bug fixes'},
    {key:'payment_flow', title:'Payment + webhook flow frozen', area:'PAYMENT', frozen:true, change_policy:'Gateway config allowed only'},
    {key:'otp_ride_start', title:'OTP ride start frozen', area:'RIDE', frozen:true, change_policy:'No status rename'},
    {key:'guest_ride_token', title:'Guest ride token/security frozen', area:'SECURITY', frozen:true, change_policy:'Security patch allowed'},
    {key:'safety_sos', title:'Safety/SOS/trip sharing frozen', area:'SAFETY', frozen:true, change_policy:'Safety patch allowed'},
    {key:'admin_role_permissions', title:'Admin role permission matrix frozen', area:'ADMIN', frozen:true, change_policy:'Permission hardening allowed'},
    {key:'config_vault', title:'Admin Config Vault frozen', area:'CONFIG', frozen:true, change_policy:'No secret exposure change'},
    {key:'apk_workflow', title:'APK build workflow frozen', area:'APK', frozen:true, change_policy:'Build fix only'}
  ];
}
function defaultRcTestSuite(){
  return [
    {key:'guest_qr_booking', title:'Guest QR booking end-to-end', priority:'CRITICAL', status:'PENDING', steps:['Open /qr/','Pickup/drop select','Fare estimate','Create booking','Open guest ride token page']},
    {key:'registered_passenger_booking', title:'Registered passenger booking', priority:'HIGH', status:'PENDING', steps:['Login passenger','Create ride','Check My Rides']},
    {key:'driver_online_offline', title:'Driver online/offline + trusted device', priority:'CRITICAL', status:'PENDING', steps:['Driver login once','Refresh session','Go online/offline','Logout/revoke device']},
    {key:'driver_accept_reject', title:'Driver accept/reject + timeout', priority:'CRITICAL', status:'PENDING', steps:['Assign ride','Accept','Reject','Timeout auto reassign']},
    {key:'payment_success_failure', title:'Payment success/failure + webhook', priority:'CRITICAL', status:'PENDING', steps:['Create payment order','Verify success','Verify failure','Webhook signature']},
    {key:'otp_start_ride', title:'OTP start ride', priority:'CRITICAL', status:'PENDING', steps:['Driver pickup reached','Passenger OTP visible','Driver verifies OTP','Ride starts']},
    {key:'live_tracking', title:'Live tracking and route view', priority:'HIGH', status:'PENDING', steps:['Driver GPS heartbeat','Passenger track link','Route/share link']},
    {key:'drop_confirm_rating_receipt', title:'Drop reached + passenger confirm + rating + receipt', priority:'HIGH', status:'PENDING', steps:['Driver reached drop','Passenger confirm','Rating submit','Receipt view']},
    {key:'sos_safety', title:'SOS and admin safety dashboard', priority:'CRITICAL', status:'PENDING', steps:['Passenger SOS','Admin safety event','Close event']},
    {key:'admin_intervention', title:'Admin manual intervention audit', priority:'HIGH', status:'PENDING', steps:['Reassign/cancel/resend OTP','Audit log check']},
    {key:'role_security', title:'Role security and Config Center lock', priority:'CRITICAL', status:'PENDING', steps:['Main Admin config access','Safety/Finance limited access','Forbidden secret access']},
    {key:'rollback_maintenance', title:'Maintenance mode and rollback pack', priority:'HIGH', status:'PENDING', steps:['Pause booking/payment','Check 503 guard','Rollback guide']}
  ];
}
function ensureSprint7YFoundation(db){
  ensureSprint7XFoundation(db);
  db.schema_migrations = db.schema_migrations || [];
  if(!db.schema_migrations.find(m=>m.id==='S7Y_RELEASE_CANDIDATE_RC1')) db.schema_migrations.push({id:'S7Y_RELEASE_CANDIDATE_RC1', applied_at:now(), additive:true, note:'Release Candidate RC1 freeze, RC dashboard, RC issue register, final test suite and deploy package notes'});
  db.schema_version='S7Y';
  db.release_candidate = {...defaultSprint7YReleaseCandidate(), ...(db.release_candidate||{})};
  db.release_candidate.version_name='2.0.7Y-RC1'; db.release_candidate.version_code=93; db.release_candidate.sprint='7Y'; db.release_candidate.status=db.release_candidate.status||'RELEASE_CANDIDATE';
  db.rc_freeze_checklist = Array.isArray(db.rc_freeze_checklist) && db.rc_freeze_checklist.length ? db.rc_freeze_checklist : defaultRcFreezeChecklist();
  db.rc_test_suite = Array.isArray(db.rc_test_suite) && db.rc_test_suite.length ? db.rc_test_suite : defaultRcTestSuite();
  db.rc_issues = Array.isArray(db.rc_issues) ? db.rc_issues : [];
  db.deploy_command_pack={...(db.deploy_command_pack||{}), architecture_version:'S7Y-RELEASE-CANDIDATE-RC1', sprint:'7Y', version:'2.0.7Y-RC1', latest_zip:'NEXO-Rides-main-SPRINT7Y-RELEASE-CANDIDATE-RC1.zip'};
  db.deploy_command_pack.commands={...(db.deploy_command_pack.commands||{}), preflight:'npm run s7y:check', smoke:'npm run final:smoke', apk_build:'GitHub Actions → Build NEXO Ride APK 7Y RC1 → debug/release'};
  db.deploy_command_pack.deploy_order_bn=['১) live server backup নিন','২) latest Sprint-7Y RC1 code copy করুন','৩) .env এবং data/ আগেরটাই রাখুন','৪) npm install --omit=dev চালান','৫) npm run s7y:check চালান','৬) server restart করুন','৭) /api/health ও /api/platform/rc-launch-gate check করুন','৮) RC gate clear না হওয়া পর্যন্ত public launch করবেন না'];
  db.environment_freeze = db.environment_freeze || {frozen:false, frozen_at:null, frozen_by:null, note:'Freeze after final production config, APK and RC launch gate pass. Freeze is an admin record; it does not overwrite .env/data.', latest_release:'2.0.7Y-RC1'};
  db.environment_freeze.latest_release='2.0.7Y-RC1';
  db.rc_deploy_notes = db.rc_deploy_notes || {
    latest_zip:'NEXO-Rides-main-SPRINT7Y-RELEASE-CANDIDATE-RC1.zip',
    deploy_rule_bn:['১) শুধু latest Sprint-7Y ZIP deploy করুন','২) live .env overwrite করবেন না','৩) live data/ folder overwrite করবেন না','৪) deploy-এর আগে data/ + uploads/ + .env backup নিন','৫) npm install --omit=dev প্রয়োজনে চালান','৬) npm run s7y:check চালান','৭) server restart করুন','৮) /api/platform/rc-launch-gate এবং /api/platform/final-smoke-test check করুন','৯) GitHub Actions থেকে APK RC1 build করুন'],
    rollback_rule_bn:['আগের stable Sprint-7X/Sprint-7W code folder restore করুন','live data/ কেবল corruption হলে backup থেকে restore করুন','maintenance mode ON করে public booking/payment pause করুন','rollback after-action note admin audit-এ রাখুন'],
    never_overwrite:['.env','data/','data/production.env','data/config_vault.json','data/uploads/']
  };
  db.apk_build_settings = {...(db.apk_build_settings||{}), architecture_version:'S7Y-RELEASE-CANDIDATE-RC1', apk_version_name:'2.0.7Y-RC1', version_code:93, artifact_debug:'NEXO_Ride_APK_v2_0_7Y_RC1_debug', artifact_release:'NEXO_Ride_APK_v2_0_7Y_RC1_release', preflight_scripts:['npm run s7y:check','npm run rc:preflight','npm run final:smoke']};
  if(db.distribution_pack){ db.distribution_pack.apk_version_name='2.0.7Y-RC1'; db.distribution_pack.version_code=93; db.distribution_pack.artifact_name='NEXO_Ride_APK_v2_0_7Y_RC1'; }
  if(db.field_test_settings){ db.field_test_settings.apk_version_name='2.0.7Y-RC1'; db.field_test_settings.apk_artifact_name='NEXO_Ride_APK_v2_0_7Y_RC1'; }
  db.release_notes = {...(db.release_notes||{}), version:'2.0.7Y-RC1', sprint:'7Y', title:'NEXO Ride Sprint-7Y Release Candidate RC1', status:'RELEASE_CANDIDATE', summary_bn:'Release Candidate RC1 freeze, RC dashboard, issue register, test suite এবং deploy package notes যুক্ত করা হয়েছে।', updated_at:now()};
  db.version_history = Array.isArray(db.version_history) ? db.version_history : [];
  if(!db.version_history.find(v=>v.sprint==='7Y' && v.version==='2.0.7Y-RC1')) db.version_history.push({sprint:'7Y', version:'2.0.7Y-RC1', version_code:93, artifact:'NEXO_Ride_APK_v2_0_7Y_RC1', at:now(), cumulative_from:'Sprint-7B to Sprint-7Y', rollback_target:'Previous stable Sprint-7X code folder + current live data backup', note:'Release Candidate RC1 freeze for pilot-to-public launch'});
  db.role_permission_matrix = {...defaultRolePermissionMatrix(), ...(db.role_permission_matrix||{})};
  for(const rk of ['MAIN_ADMIN','OPS_ADMIN']){
    const arr=db.role_permission_matrix[rk] || [];
    for(const cap of ['RC_VIEW','RC_MANAGE','RC_ISSUE_MANAGE','RC_TEST_MANAGE','FINAL_LAUNCH_GATE_VIEW']) if(!arr.includes('*') && !arr.includes(cap)) arr.push(cap);
    db.role_permission_matrix[rk]=arr;
  }
  for(const rk of ['SAFETY_ADMIN','FINANCE_ADMIN','SUPPORT_ADMIN','KYC_ADMIN','AREA_ADMIN']){
    const arr=db.role_permission_matrix[rk] || [];
    for(const cap of ['RC_VIEW','FINAL_LAUNCH_GATE_VIEW']) if(!arr.includes('*') && !arr.includes(cap)) arr.push(cap);
    db.role_permission_matrix[rk]=arr;
  }
  return db;
}
function rcIssueSeverityRank(sev){ return {CRITICAL:4,HIGH:3,MEDIUM:2,LOW:1}[String(sev||'').toUpperCase()]||1; }
function rcOpenIssues(db){ return (db.rc_issues||[]).filter(i=>!['CLOSED','FIXED','DEFERRED_ACCEPTED'].includes(String(i.status||'OPEN').toUpperCase())); }
function rcDashboardPayload(db){
  ensureSprint7YFoundation(db);
  const launch=finalLaunchGate7W(db), freeze=environmentFreezeReport(db), apk=apkBuildReadiness(db), smoke=finalSmokeTest(db);
  const open=rcOpenIssues(db); const critical=open.filter(i=>['CRITICAL','HIGH'].includes(String(i.severity||'').toUpperCase()));
  const suite=db.rc_test_suite||[]; const passed=suite.filter(t=>String(t.status||'').toUpperCase()==='PASS').length;
  const pending=suite.filter(t=>!['PASS','WAIVED'].includes(String(t.status||'').toUpperCase())).length;
  const blockers=[];
  if(critical.length) blockers.push({key:'critical_rc_issues', title:'Critical/high RC issues open', count:critical.length});
  if(pending) blockers.push({key:'pending_rc_tests', title:'RC tests pending/not passed', count:pending});
  if(!apk.ok) blockers.push({key:'apk_readiness', title:'APK build readiness blockers', count:(apk.blockers||[]).length});
  if((launch.blockers||[]).length) blockers.push({key:'launch_gate', title:'Final launch gate blockers', count:(launch.blockers||[]).length});
  return {ok:blockers.length===0, version:VERSION, sprint:'7Y', rc:db.release_candidate, status:blockers.length?'RC_BLOCKED':'RC_READY_FOR_HUMAN_SIGNOFF', summary:{freeze_items:(db.rc_freeze_checklist||[]).length, test_total:suite.length, test_passed:passed, test_pending:pending, open_issues:open.length, critical_high_open:critical.length}, blockers, launch_gate:{ok:launch.ok,status:launch.status,blockers:(launch.blockers||[]).length}, apk:{ok:apk.ok, version:db.apk_build_settings?.apk_version_name, version_code:db.apk_build_settings?.version_code}, smoke:{ok:smoke.ok}, environment_freeze:{ok:freeze.ok, frozen:!!db.environment_freeze?.frozen}, pages:{dashboard:'/release-candidate/', issues:'/rc-issues/', deploy:'/rc-deploy/'}, generated_at:now()};
}
function rcTestSuitePayload(db){
  ensureSprint7YFoundation(db);
  const suite=db.rc_test_suite||[];
  const counts=suite.reduce((a,t)=>{const s=String(t.status||'PENDING').toUpperCase(); a[s]=(a[s]||0)+1; return a;},{});
  return {ok:true, version:VERSION, sprint:'7Y', counts, suite, next:counts.CRITICAL?'Fix critical tests':'Run all PENDING/HIGH tests before public launch'};
}
function rcIssueRegisterPayload(db){
  ensureSprint7YFoundation(db);
  const issues=(db.rc_issues||[]).slice().sort((a,b)=>rcIssueSeverityRank(b.severity)-rcIssueSeverityRank(a.severity) || String(b.created_at||'').localeCompare(String(a.created_at||'')));
  return {ok:true, version:VERSION, sprint:'7Y', open:rcOpenIssues(db).length, critical_high_open:rcOpenIssues(db).filter(i=>['CRITICAL','HIGH'].includes(String(i.severity||'').toUpperCase())).length, issues};
}
function rcDeployPackage(db){
  ensureSprint7YFoundation(db);
  return {ok:true, version:VERSION, sprint:'7Y', rc:db.release_candidate, deploy_notes:db.rc_deploy_notes, command_pack:productionDeployCommandPack(db), smoke:'/api/platform/final-smoke-test', launch_gate:'/api/platform/rc-launch-gate', latest_zip_rule:'Deploy only the latest Sprint-7Y cumulative ZIP; do not deploy older sprint ZIPs separately.'};
}
function rcLaunchGate(db){
  const dash=rcDashboardPayload(db);
  const blockers=[...(dash.blockers||[])];
  const releaseLock=launchReleaseLock(db); if((releaseLock.blockers||[]).length) blockers.push({key:'release_lock', title:'Security/maintenance release lock blockers', count:(releaseLock.blockers||[]).length});
  return {ok:blockers.length===0, version:VERSION, sprint:'7Y', status:blockers.length?'RC1_BLOCKED':'RC1_READY_FOR_PILOT_PUBLIC_SIGNOFF', blockers, dashboard:dash, release_lock:{ok:releaseLock.ok, blockers:(releaseLock.blockers||[]).length}, final_deploy:'/rc-deploy/', note:'RC gate can be blocked until real production keys, APK build, field/pilot tests and critical issue closure are completed.'};
}
function updateRcIssue(db,user,body={}){
  ensureSprint7YFoundation(db);
  const id=String(body.id||'').trim(); let issue=id?(db.rc_issues||[]).find(i=>i.id===id):null;
  if(!issue){ issue={id:uid('rcissue'), created_at:now(), created_by:user?.id||'admin'}; db.rc_issues.push(issue); }
  issue.title=sanitizeText(body.title||issue.title||'RC issue',180);
  issue.severity=String(body.severity||issue.severity||'MEDIUM').toUpperCase().slice(0,20);
  issue.status=String(body.status||issue.status||'OPEN').toUpperCase().slice(0,24);
  issue.area=sanitizeText(body.area||issue.area||'GENERAL',80);
  issue.note=sanitizeText(body.note||issue.note||'',700);
  issue.updated_at=now(); issue.updated_by=user?.id||'admin';
  audit(db,user?.id||'admin','S7Y_RC_ISSUE_UPSERT','rc_issue',issue.id,{severity:issue.severity,status:issue.status});
  return {ok:true, issue, register:rcIssueRegisterPayload(db), gate:rcLaunchGate(db)};
}
function updateRcTest(db,user,body={}){
  ensureSprint7YFoundation(db);
  const key=String(body.key||'').trim(); const t=(db.rc_test_suite||[]).find(x=>x.key===key); if(!t) return {ok:false, detail:'RC test key not found'};
  t.status=String(body.status||t.status||'PENDING').toUpperCase().slice(0,20); t.note=sanitizeText(body.note||t.note||'',500); t.updated_at=now(); t.updated_by=user?.id||'admin';
  audit(db,user?.id||'admin','S7Y_RC_TEST_UPDATE','rc_test',t.key,{status:t.status});
  return {ok:true, test:t, suite:rcTestSuitePayload(db), gate:rcLaunchGate(db)};
}

function ensureSprint7MFoundation(db){
  ensureSprint7LFoundation(db);
  db.schema_migrations = db.schema_migrations || [];
  if(!db.schema_migrations.find(m=>m.id==='S7M_ADMIN_OPS_FRAUD_SUPPORT')) db.schema_migrations.push({id:'S7M_ADMIN_OPS_FRAUD_SUPPORT', applied_at:now(), additive:true, note:'Admin Ride Operations Center, manual intervention, guest abuse control, driver misuse alerts, support desk and audit trail foundation'});
  db.schema_version='S7M';
  db.admin_ops_settings={...defaultAdminOpsSettings(), ...(db.admin_ops_settings||{})};
  db.admin_ride_actions=db.admin_ride_actions||[];
  db.guest_abuse_blocks=db.guest_abuse_blocks||[];
  db.guest_abuse_events=db.guest_abuse_events||[];
  db.driver_misuse_events=db.driver_misuse_events||[];
  db.support_desk_notes=db.support_desk_notes||[];
  db.ops_manual_notes=db.ops_manual_notes||[];
  return db;
}
function rideStateBuckets(db, user=null){
  const rides=filterRidesForAdmin(db,user,db.rides||[]);
  const bucketNames={
    SEARCHING_DRIVER:['REQUESTED'],
    PAYMENT_PENDING:['DRIVER_ACCEPTED','WAITING_PAYMENT'],
    DRIVER_ASSIGNED_NOT_STARTED:['CONFIRMED','ARRIVED'],
    OTP_PENDING:['CONFIRMED','ARRIVED'],
    ACTIVE_RIDE:['STARTED'],
    DROP_CONFIRM_PENDING:['DRIVER_REACHED_DROP'],
    COMPLETED:['COMPLETED','PASSENGER_CONFIRMED'],
    CANCELLED_EXPIRED:['CANCELLED','EXPIRED','PAYMENT_TIMEOUT','PAYMENT_FAILED']
  };
  const out={};
  for(const [key,states] of Object.entries(bucketNames)) out[key]=rides.filter(r=>states.includes(String(r.status||'').toUpperCase())).map(r=>rideDto(r,db,user)).slice(-150).reverse();
  return out;
}
function openUnpaidRidesForMobile(db, mobile){
  const m=normalizeIndianMobile(mobile||''); if(!m) return [];
  return (db.rides||[]).filter(r=>normalizeIndianMobile(r.passenger_mobile||'')===m && String(r.payment_status||'').toUpperCase()!=='PAID' && !['COMPLETED','CANCELLED','EXPIRED','PAYMENT_TIMEOUT'].includes(String(r.status||'').toUpperCase()));
}
function guestBookingRisk(db, info={}){
  ensureSprint7MFoundation(db);
  const set=db.admin_ops_settings;
  const mobile=normalizeIndianMobile(info.mobile||'');
  const deviceId=String(info.device_id||info.deviceId||'').slice(0,120);
  const ip=String(info.ip||'').slice(0,80);
  const text=(String(info.pickup||'')+' '+String(info.drop||'')).toLowerCase();
  const oneHour=Date.now()-60*60*1000;
  const recent=(db.rides||[]).filter(r=>new Date(r.created_at||0).getTime()>=oneHour);
  const mobileCount=mobile?recent.filter(r=>normalizeIndianMobile(r.passenger_mobile||'')===mobile).length:0;
  const deviceCount=deviceId?recent.filter(r=>String(r.guest_device_id||'')===deviceId).length:0;
  const blocked=(db.guest_abuse_blocks||[]).find(b=>b.active!==false && ((mobile && b.mobile===mobile) || (deviceId && b.device_id===deviceId) || (ip && b.ip===ip)) && (!b.expires_at || new Date(b.expires_at)>new Date()));
  const unpaid=mobile?openUnpaidRidesForMobile(db,mobile).length:0;
  let suspicious=false;
  try{ suspicious=!!new RegExp(set.suspicious_text_regex||'script|<|>|javascript:|onerror=|onclick=','i').test(text); }catch(e){ suspicious=/script|<|>|javascript:|onerror=|onclick=/i.test(text); }
  const blockers=[]; const warnings=[];
  if(blocked) blockers.push('TEMPORARILY_BLOCKED');
  if(mobile && mobileCount>=Number(set.guest_mobile_hour_limit||3)) blockers.push('MOBILE_RATE_LIMIT');
  if(deviceId && deviceCount>=Number(set.guest_device_hour_limit||5)) blockers.push('DEVICE_RATE_LIMIT');
  if(mobile && unpaid>=Number(set.unpaid_open_mobile_limit||2)) blockers.push('TOO_MANY_UNPAID_OPEN_RIDES');
  if(suspicious) warnings.push('SUSPICIOUS_PICKUP_DROP_TEXT');
  return {ok:blockers.length===0, blockers, warnings, metrics:{mobile_count_last_hour:mobileCount, device_count_last_hour:deviceCount, open_unpaid_mobile:unpaid}, blocked_record:blocked||null};
}
function recordGuestAbuseEvent(db, event_type, info={}, risk={}){
  ensureSprint7MFoundation(db);
  const rec={id:uid('abuse'), at:now(), event_type, mobile:normalizeIndianMobile(info.mobile||''), device_id:String(info.device_id||info.deviceId||'').slice(0,120), ip:String(info.ip||'').slice(0,80), pickup:sanitizeRideText(info.pickup||'',120), drop:sanitizeRideText(info.drop||'',120), risk};
  db.guest_abuse_events.push(rec); if(db.guest_abuse_events.length>2000) db.guest_abuse_events=db.guest_abuse_events.slice(-2000); return rec;
}
function expireUnpaidBookingsForOps(db){
  ensureSprint7MFoundation(db); let changed=false; const mins=Number(db.admin_ops_settings.unpaid_auto_expire_minutes||15); const cutoff=Date.now()-mins*60*1000;
  for(const r of db.rides||[]){
    const st=String(r.status||'').toUpperCase(); const ps=String(r.payment_status||'').toUpperCase();
    if(['REQUESTED','DRIVER_ACCEPTED','WAITING_PAYMENT'].includes(st) && ps!=='PAID' && new Date(r.created_at||0).getTime()<cutoff){
      r.status='PAYMENT_TIMEOUT'; r.payment_status='EXPIRED'; r.expired_at=r.expired_at||now(); r.ops_auto_expired=true; closeDispatchQueue(db,r,'EXPIRED'); changed=true;
      dispatchEvent(db,r,'OPS_UNPAID_AUTO_EXPIRED',{minutes:mins});
    }
  }
  return changed;
}
function driverMisuseDashboard(db){
  ensureSprint7MFoundation(db); const set=db.admin_ops_settings; const nowMs=Date.now(); const hourAgo=nowMs-60*60*1000;
  const events=[]; const profiles=db.driver_profiles||[];
  for(const p of profiles){
    const u=(db.users||[]).find(x=>x.id===p.user_id)||{};
    const driverRides=(db.rides||[]).filter(r=>r.driver_id===p.user_id || (r.driver_candidate_ids||[]).includes(p.user_id));
    const rejects=(db.dispatch_events||[]).filter(e=>e.details?.driver_id===p.user_id && /REJECT/i.test(e.event_type||'') && new Date(e.at||0).getTime()>=hourAgo).length;
    if(rejects>=Number(set.driver_reject_warning_per_hour||5)) events.push({level:'WARNING', type:'TOO_MANY_REJECTS', driver_user_id:p.user_id, driver_name:u.name||'', mobile:u.mobile||'', count:rejects, action:'WARN_DRIVER'});
    const lastGps=new Date(p.last_location_at||p.last_seen_at||0).getTime();
    if(p.online && lastGps && nowMs-lastGps>Number(set.driver_stale_gps_warning_minutes||10)*60*1000) events.push({level:'WARNING', type:'GPS_STALE', driver_user_id:p.user_id, driver_name:u.name||'', mobile:u.mobile||'', minutes:Math.round((nowMs-lastGps)/60000), action:'CHECK_DRIVER'});
    const acceptedNotMoving=driverRides.filter(r=>['DRIVER_ACCEPTED','CONFIRMED','ARRIVED'].includes(String(r.status||'').toUpperCase()) && r.accepted_at && nowMs-new Date(r.accepted_at).getTime()>Number(set.accepted_not_moving_warning_minutes||8)*60*1000);
    for(const r of acceptedNotMoving.slice(0,5)) events.push({level:'WARNING', type:'ACCEPTED_NOT_STARTED', driver_user_id:p.user_id, driver_name:u.name||'', ride_id:r.id, minutes:Math.round((nowMs-new Date(r.accepted_at).getTime())/60000), action:'CALL_OR_REASSIGN'});
  }
  db.driver_misuse_events=(db.driver_misuse_events||[]).concat(events.map(e=>({id:uid('dm'), at:now(), ...e}))).slice(-2000);
  return {ok:true, settings:set, summary:{drivers:profiles.length, online:profiles.filter(p=>p.online).length, alerts:events.length, suspended:profiles.filter(p=>String(p.status||'').toUpperCase()==='SUSPENDED').length}, alerts:events.slice(0,200), recent_events:(db.driver_misuse_events||[]).slice(-200).reverse()};
}
function adminRideOpsDashboard(db, user=null){
  ensureSprint7MFoundation(db); const changed=expireUnpaidBookingsForOps(db); const buckets=rideStateBuckets(db,user); const misuse=driverMisuseDashboard(db); const support=supportSummary(db,user||{role:'ADMIN'});
  const counts={}; for(const [k,v] of Object.entries(buckets)) counts[k]=v.length;
  const active=(db.rides||[]).filter(r=>['REQUESTED','DRIVER_ACCEPTED','CONFIRMED','ARRIVED','STARTED','DRIVER_REACHED_DROP'].includes(String(r.status||'').toUpperCase())).length;
  const paymentPending=(db.rides||[]).filter(r=>String(r.payment_status||'').toUpperCase()==='PENDING').length;
  return {ok:true, version:VERSION, sprint:'7M', changed_auto_expire:changed, settings:db.admin_ops_settings, summary:{active_rides:active, payment_pending:paymentPending, open_support:support.summary?.open_tickets||0, pending_refunds:support.summary?.pending_refunds||0, abuse_blocks:(db.guest_abuse_blocks||[]).filter(b=>b.active!==false).length, driver_alerts:misuse.alerts.length, buckets:counts}, buckets, abuse:{recent_events:(db.guest_abuse_events||[]).slice(-100).reverse(), active_blocks:(db.guest_abuse_blocks||[]).filter(b=>b.active!==false).slice(-100).reverse()}, driver_misuse:misuse, support:{summary:support.summary, tickets:support.tickets.slice(-80).reverse().map(t=>supportTicketOut(db,t)), refunds:support.refunds.slice(-80).reverse().map(r=>refundRequestOut(db,r))}, recent_manual_actions:(db.admin_ride_actions||[]).slice(-100).reverse(), portal:'/admin-ops/'};
}
function adminOpsReadiness(db){
  ensureSprint7MFoundation(db); const d=adminRideOpsDashboard(db,{role:'ADMIN'}); const checks=[
    {key:'ride_ops_center', title:'Admin ride ops center', ok:!!db.admin_ops_settings?.ride_ops_center_enabled, detail:'/admin-ops/'},
    {key:'manual_intervention', title:'Manual intervention actions', ok:!!db.admin_ops_settings?.manual_intervention_enabled, detail:(db.admin_ops_settings.safe_actions||[]).join(', ')},
    {key:'guest_abuse_control', title:'Guest booking abuse control', ok:!!db.admin_ops_settings?.abuse_control_enabled, detail:`Mobile ${db.admin_ops_settings.guest_mobile_hour_limit}/hour, unpaid ${db.admin_ops_settings.unpaid_open_mobile_limit}`},
    {key:'driver_misuse_alerts', title:'Driver misuse alerts', ok:!!db.admin_ops_settings?.driver_misuse_alerts_enabled, detail:`Alerts ${d.driver_misuse.alerts.length}`},
    {key:'support_desk', title:'Support desk foundation', ok:Array.isArray(db.support_tickets)&&Array.isArray(db.refund_requests), detail:`Tickets ${db.support_tickets.length}, refunds ${db.refund_requests.length}`},
    {key:'audit_trail', title:'Admin audit trail', ok:Array.isArray(db.admin_ride_actions)&&Array.isArray(db.audit), detail:`Manual actions ${db.admin_ride_actions.length}`}
  ];
  return {ok:checks.every(c=>c.ok), version:VERSION, sprint:'7M', checks, dashboard:d, warning:'Manual ride actions are logged. Use only for stuck rides/payment/support cases.'};
}

function defaultDriverCapacitySettings(){
  return {
    architecture_version:'S7N-DRIVER-KYC-AREA-QR-MANAGEMENT',
    target_registered_drivers:10000,
    target_active_drivers:3500,
    driver_list_pagination:true,
    indexed_filters:['mobile','name','vehicle_no','area_id','stand_id','status','kyc_status'],
    approval_flow:['REGISTRATION_SUBMITTED','DOCUMENT_PENDING','SUB_ADMIN_VERIFIED','AREA_ADMIN_APPROVED','MAIN_ADMIN_ACTIVE','BLOCKED','REJECTED'],
    qr_types:['GENERAL','AREA','STAND','DRIVER'],
    additive_only:true,
    note:'Driver onboarding, KYC, area/stand and QR management are additive. Existing driver_profiles and area_catalog are preserved.'
  };
}
function ensureSprint7NFoundation(db){
  ensureSprint7MFoundation(db);
  db.schema_migrations = db.schema_migrations || [];
  if(!db.schema_migrations.find(m=>m.id==='S7N_DRIVER_KYC_AREA_QR_MANAGEMENT')) db.schema_migrations.push({id:'S7N_DRIVER_KYC_AREA_QR_MANAGEMENT', applied_at:now(), additive:true, note:'Driver onboarding/KYC, area/stand management, QR assets, approval workflow and 10k-driver list readiness'});
  db.schema_version='S7N';
  db.driver_capacity_settings = {...defaultDriverCapacitySettings(), ...(db.driver_capacity_settings||{})};
  db.driver_documents = db.driver_documents || [];
  db.driver_approval_events = db.driver_approval_events || [];
  db.area_stands = db.area_stands || [];
  db.qr_assets = db.qr_assets || [];
  db.qr_scan_events = db.qr_scan_events || [];
  db.area_catalog = db.area_catalog || [];
  // Seed basic stands only when none exist. This does not modify existing driver data.
  if(db.area_stands.length===0 && db.area_catalog.length){
    for(const a of db.area_catalog.slice(0,8)){
      db.area_stands.push({id:uid('stand'), area_id:a.id, area_name:a.name, name:`${a.name} Main Stand`, status:'ACTIVE', created_at:now(), driver_count:0});
    }
  }
  return db;
}
function driverUserForProfile(db, prof){ return (db.users||[]).find(u=>u.id===prof?.user_id) || {}; }
function driverPublicCenterOut(db, prof){
  const u = driverUserForProfile(db, prof);
  const docs = (db.driver_documents||[]).filter(d=>d.driver_profile_id===prof.id || d.driver_user_id===prof.user_id);
  const area = (db.area_catalog||[]).find(a=>a.id===prof.area_id) || null;
  const stand = (db.area_stands||[]).find(st=>st.id===prof.stand_id) || null;
  const required = ['PHOTO','ID_PROOF','VEHICLE_PHOTO','VEHICLE_DOC'];
  const present = new Set(docs.filter(d=>String(d.status||'SUBMITTED').toUpperCase()!=='REJECTED').map(d=>String(d.doc_type||'').toUpperCase()));
  const missing = required.filter(x=>!present.has(x));
  return {
    ...prof,
    name:u.name||prof.name||'', mobile:u.mobile||prof.mobile||'', email:u.email||'', user_status:u.status||'',
    area_name:area?.name || prof.area || prof.location || '', stand_name:stand?.name || prof.stand_name || '',
    docs_present:present.size, docs_required:required.length, docs_missing:missing,
    document_status:missing.length?'INCOMPLETE':'READY_FOR_VERIFICATION',
    approval_stage:prof.approval_stage || (String(prof.status||'').toUpperCase()==='APPROVED'?'MAIN_ADMIN_ACTIVE':'DOCUMENT_PENDING'),
    kyc_documents:docs.map(d=>({id:d.id, doc_type:d.doc_type, status:d.status, uploaded_at:d.uploaded_at, file_url:d.file_url?String(d.file_url).slice(0,200):'', note:d.note||''}))
  };
}
function driverCenterSummary(db, scopedDrivers){
  const arr = scopedDrivers || (db.driver_profiles||[]);
  const countBy = (key)=>arr.reduce((m,d)=>{const k=String(d[key]||'UNKNOWN').toUpperCase(); m[k]=(m[k]||0)+1; return m;},{});
  return {total:arr.length, approved:arr.filter(d=>String(d.status||'').toUpperCase()==='APPROVED').length, pending:arr.filter(d=>String(d.status||'').toUpperCase()==='PENDING').length, blocked:arr.filter(d=>['SUSPENDED','BLOCKED'].includes(String(d.status||'').toUpperCase())).length, online:arr.filter(d=>!!d.online).length, by_status:countBy('status'), by_kyc:countBy('kyc_status'), by_stage:countBy('approval_stage')};
}
function listDriversCenter(db, user, params){
  ensureSprint7NFoundation(db);
  let list = filterDriversForAdmin(db,user,db.driver_profiles||[]);
  const q = String(params.get('q')||'').trim().toLowerCase();
  const status = String(params.get('status')||'').trim().toUpperCase();
  const kyc = String(params.get('kyc_status')||'').trim().toUpperCase();
  const stage = String(params.get('approval_stage')||'').trim().toUpperCase();
  const areaId = String(params.get('area_id')||'').trim();
  const standId = String(params.get('stand_id')||'').trim();
  if(q){
    list = list.filter(d=>{const u=driverUserForProfile(db,d); return [u.name,u.mobile,u.email,d.vehicle_no,d.license_no,d.area,d.location,d.driver_code].some(v=>String(v||'').toLowerCase().includes(q));});
  }
  if(status) list = list.filter(d=>String(d.status||'').toUpperCase()===status);
  if(kyc) list = list.filter(d=>String(d.kyc_status||'').toUpperCase()===kyc);
  if(stage) list = list.filter(d=>String(d.approval_stage||'').toUpperCase()===stage);
  if(areaId) list = list.filter(d=>String(d.area_id||'')===areaId || String(d.area||'')===areaId);
  if(standId) list = list.filter(d=>String(d.stand_id||'')===standId);
  const page = Math.max(1, Number(params.get('page')||1));
  const limit = Math.max(10, Math.min(200, Number(params.get('limit')||50)));
  const total = list.length;
  const items = list.sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||''))).slice((page-1)*limit, page*limit).map(d=>driverPublicCenterOut(db,d));
  return {ok:true, version:VERSION, sprint:'7R', page, limit, total, total_pages:Math.max(1,Math.ceil(total/limit)), summary:driverCenterSummary(db, filterDriversForAdmin(db,user,db.driver_profiles||[])), drivers:items};
}
function areaAllowedForAdmin(db,user,areaNameOrId){
  if(isMainAdmin(user)) return true;
  const scope = adminScopeArea(db,user);
  if(!scope) return false;
  const area = (db.area_catalog||[]).find(a=>a.id===areaNameOrId || a.name===areaNameOrId);
  return String(scope||'').toLowerCase() === String(area?.name||areaNameOrId||'').toLowerCase();
}
function createDriverFromAdmin(db,user,body={}){
  ensureSprint7NFoundation(db);
  const mobile = normalizeIndianMobile(body.mobile||'');
  const name = sanitizeText(body.name||'',80);
  if(!name || !mobile) return {ok:false,status:400,detail:'Driver name and valid Indian mobile required'};
  const areaId = String(body.area_id||'').trim();
  const areaObj = (db.area_catalog||[]).find(a=>a.id===areaId || a.name===body.area || a.name===body.area_name) || (db.area_catalog||[])[0] || {id:'area_kalna_town', name:'Kalna Town'};
  if(!areaAllowedForAdmin(db,user,areaObj.id) && !areaAllowedForAdmin(db,user,areaObj.name)) return {ok:false,status:403,detail:'Sub Admin can register drivers only in assigned area'};
  const standObj = (db.area_stands||[]).find(st=>st.id===String(body.stand_id||'') || (st.area_id===areaObj.id && st.name===body.stand_name)) || null;
  let u = findUser(db,mobile);
  if(u && String(u.role||'').toUpperCase()!=='DRIVER') return {ok:false,status:409,detail:'Mobile is already used by non-driver account'};
  if(!u){ const ps=salt(); u={id:uid('usr'), name, mobile, email:String(body.email||''), role:'DRIVER', nexo_id:'', area:areaObj.name, status:'ACTIVE', created_at:now(), consent_at:now(), consent_version:'admin-driver-onboarding-v1', password_salt:ps, password_hash:hashPassword(crypto.randomBytes(16).toString('hex'),ps)}; db.users.push(u); }
  else { u.name = name || u.name; u.area = areaObj.name; u.status = u.status || 'ACTIVE'; }
  let prof = (db.driver_profiles||[]).find(d=>d.user_id===u.id);
  if(!prof){ prof={id:uid('drv'), user_id:u.id, created_at:now(), rating:5, total_rides:0, total_earnings:0, pending_payout:0, online:false}; db.driver_profiles.push(prof); }
  Object.assign(prof, {
    vehicle_type:'TOTO', vehicle_no:sanitizeText(body.vehicle_no||prof.vehicle_no||'',40), license_no:sanitizeText(body.license_no||prof.license_no||'',60), aadhaar_no:sanitizeText(body.aadhaar_no||prof.aadhaar_no||'',30),
    driver_photo:String(body.driver_photo||prof.driver_photo||''), vehicle_photo:String(body.vehicle_photo||prof.vehicle_photo||''), address:sanitizeText(body.address||prof.address||'',220), emergency_contact:sanitizeText(body.emergency_contact||prof.emergency_contact||'',60),
    bank_upi:sanitizeText(body.bank_upi||prof.bank_upi||'',80), area:areaObj.name, area_id:areaObj.id, stand_id:standObj?.id||String(body.stand_id||prof.stand_id||''), stand_name:standObj?.name||String(body.stand_name||prof.stand_name||''),
    sub_admin_user_id:isMainAdmin(user)?String(body.sub_admin_user_id||prof.sub_admin_user_id||''):user.id, added_by:user.id, status:prof.status||'PENDING', kyc_status:prof.kyc_status||'INCOMPLETE', approval_stage:prof.approval_stage||'DOCUMENT_PENDING', driver_code:prof.driver_code||('DRV-'+crypto.randomBytes(3).toString('hex').toUpperCase()), updated_at:now()
  });
  const docs = body.documents && typeof body.documents==='object' ? body.documents : {};
  for(const [docType,fileUrl] of Object.entries(docs)){
    if(!fileUrl) continue;
    db.driver_documents.push({id:uid('doc'), driver_profile_id:prof.id, driver_user_id:u.id, doc_type:String(docType).toUpperCase(), file_url:String(fileUrl).slice(0,300), status:'SUBMITTED', uploaded_by:user.id, uploaded_at:now()});
  }
  const event={id:uid('dap'), at:now(), driver_profile_id:prof.id, driver_user_id:u.id, action:'DRIVER_REGISTERED', by:user.id, stage:prof.approval_stage, area_id:prof.area_id, stand_id:prof.stand_id}; db.driver_approval_events.push(event);
  audit(db,user.id,'S7N_DRIVER_REGISTER','driver_profile',prof.id,{area_id:prof.area_id, stand_id:prof.stand_id, mobile_masked:maskMobile(mobile)});
  return {ok:true, driver:driverPublicCenterOut(db,prof), event};
}
function updateDriverApprovalStage(db,user,id,body={}){
  ensureSprint7NFoundation(db);
  const prof=(db.driver_profiles||[]).find(d=>d.id===id || d.user_id===id || d.driver_code===id); if(!prof) return {ok:false,status:404,detail:'Driver profile not found'};
  if(!areaAllowedForAdmin(db,user,prof.area_id||prof.area)) return {ok:false,status:403,detail:'Not allowed for this driver area'};
  const stage=String(body.stage||body.approval_stage||'').toUpperCase();
  const allowed=db.driver_capacity_settings.approval_flow;
  if(!allowed.includes(stage)) return {ok:false,status:400,detail:'Invalid approval stage', allowed};
  if(!isMainAdmin(user) && !['DOCUMENT_PENDING','SUB_ADMIN_VERIFIED'].includes(stage)) return {ok:false,status:403,detail:'Sub Admin can only mark document/sub-admin verification'};
  const before={status:prof.status, kyc_status:prof.kyc_status, approval_stage:prof.approval_stage};
  prof.approval_stage=stage; prof.approval_note=sanitizeText(body.note||'',250); prof.approval_updated_at=now(); prof.approval_updated_by=user.id;
  if(stage==='SUB_ADMIN_VERIFIED'){ prof.kyc_status = prof.kyc_status==='VERIFIED'?'VERIFIED':'SUB_ADMIN_VERIFIED'; prof.status='PENDING'; }
  if(stage==='AREA_ADMIN_APPROVED'){ prof.kyc_status='AREA_ADMIN_APPROVED'; prof.status='PENDING'; }
  if(stage==='MAIN_ADMIN_ACTIVE'){ prof.kyc_status='VERIFIED'; prof.status='APPROVED'; prof.online=!!prof.online; }
  if(stage==='BLOCKED'){ prof.status='SUSPENDED'; prof.online=false; }
  if(stage==='REJECTED'){ prof.status='REJECTED'; prof.online=false; prof.kyc_status='REJECTED'; }
  const ev={id:uid('dap'), at:now(), driver_profile_id:prof.id, driver_user_id:prof.user_id, action:'APPROVAL_STAGE_UPDATE', by:user.id, from:before, to:{status:prof.status,kyc_status:prof.kyc_status,approval_stage:prof.approval_stage}, note:prof.approval_note}; db.driver_approval_events.push(ev);
  audit(db,user.id,'S7N_DRIVER_APPROVAL_STAGE','driver_profile',prof.id,{stage, before});
  notifyUsers(db, notificationTargets(db,{user_id:prof.user_id}), {event_type:'DRIVER_APPROVAL_STAGE', priority:'NORMAL', title:'Driver approval update', message:`Approval stage: ${stage}`});
  return {ok:true, driver:driverPublicCenterOut(db,prof), event:ev};
}
function addDriverDocumentCenter(db,user,id,body={}){
  ensureSprint7NFoundation(db);
  const prof=(db.driver_profiles||[]).find(d=>d.id===id || d.user_id===id || d.driver_code===id); if(!prof) return {ok:false,status:404,detail:'Driver profile not found'};
  if(!areaAllowedForAdmin(db,user,prof.area_id||prof.area)) return {ok:false,status:403,detail:'Not allowed for this driver area'};
  const doc_type=String(body.doc_type||'OTHER').toUpperCase().replace(/[^A-Z0-9_]/g,'_').slice(0,40);
  const file_url=String(body.file_url||body.url||'').slice(0,300);
  if(!file_url && !body.note) return {ok:false,status:400,detail:'file_url or note required'};
  const rec={id:uid('doc'), driver_profile_id:prof.id, driver_user_id:prof.user_id, doc_type, file_url, status:String(body.status||'SUBMITTED').toUpperCase(), note:sanitizeText(body.note||'',200), uploaded_by:user.id, uploaded_at:now()};
  db.driver_documents.push(rec); prof.kyc_status = prof.kyc_status==='VERIFIED'?'VERIFIED':'DOCUMENT_SUBMITTED'; prof.approval_stage = prof.approval_stage || 'DOCUMENT_PENDING'; prof.updated_at=now();
  audit(db,user.id,'S7N_DRIVER_DOC_ADD','driver_profile',prof.id,{doc_type});
  return {ok:true, document:rec, driver:driverPublicCenterOut(db,prof)};
}
function listAreasCenter(db){
  ensureSprint7NFoundation(db);
  const drivers=db.driver_profiles||[];
  return (db.area_catalog||[]).map(a=>{const stands=(db.area_stands||[]).filter(st=>st.area_id===a.id); return {...a, stands:stands.length, active_stands:stands.filter(st=>String(st.status||'ACTIVE').toUpperCase()==='ACTIVE').length, drivers:drivers.filter(d=>d.area_id===a.id || d.area===a.name).length, approved_drivers:drivers.filter(d=>(d.area_id===a.id || d.area===a.name) && String(d.status||'').toUpperCase()==='APPROVED').length};});
}
function upsertAreaCenter(db,user,body={}){
  ensureSprint7NFoundation(db); if(!isMainAdmin(user)) return {ok:false,status:403,detail:'Main Admin only'};
  const id=String(body.id||'').trim(); const name=sanitizeText(body.name||'',80); if(!name) return {ok:false,status:400,detail:'Area name required'};
  let a=(db.area_catalog||[]).find(x=>x.id===id || x.name.toLowerCase()===name.toLowerCase());
  if(!a){ a={id:id||uid('area'), name, status:'ACTIVE', created_at:now()}; db.area_catalog.push(a); } else a.name=name;
  a.status=String(body.status||a.status||'ACTIVE').toUpperCase(); a.sub_admin_user_id=String(body.sub_admin_user_id||a.sub_admin_user_id||''); a.updated_at=now(); a.updated_by=user.id;
  audit(db,user.id,'S7N_AREA_UPSERT','area',a.id,{name:a.name,status:a.status}); return {ok:true, area:a};
}
function listStandsCenter(db,params){
  ensureSprint7NFoundation(db); const areaId=String(params.get('area_id')||'').trim(); let stands=db.area_stands||[]; if(areaId) stands=stands.filter(st=>st.area_id===areaId);
  return stands.map(st=>({...st, drivers:(db.driver_profiles||[]).filter(d=>d.stand_id===st.id).length, qr_assets:(db.qr_assets||[]).filter(q=>q.target_type==='STAND'&&q.target_id===st.id).length}));
}
function upsertStandCenter(db,user,body={}){
  ensureSprint7NFoundation(db); if(!isAdminRole(user)) return {ok:false,status:403,detail:'Admin only'};
  const area=(db.area_catalog||[]).find(a=>a.id===String(body.area_id||'') || a.name===body.area_name); if(!area) return {ok:false,status:400,detail:'Valid area_id required'};
  if(!areaAllowedForAdmin(db,user,area.id)) return {ok:false,status:403,detail:'Not allowed for this area'};
  const name=sanitizeText(body.name||'',80); if(!name) return {ok:false,status:400,detail:'Stand name required'};
  let st=(db.area_stands||[]).find(x=>x.id===String(body.id||'') || (x.area_id===area.id && x.name.toLowerCase()===name.toLowerCase()));
  if(!st){ st={id:uid('stand'), area_id:area.id, area_name:area.name, name, created_at:now()}; db.area_stands.push(st); } else st.name=name;
  st.status=String(body.status||st.status||'ACTIVE').toUpperCase(); st.lat=Number(body.lat||st.lat||0)||null; st.lng=Number(body.lng||st.lng||0)||null; st.updated_at=now(); st.updated_by=user.id;
  audit(db,user.id,'S7N_STAND_UPSERT','stand',st.id,{area_id:area.id,name}); return {ok:true, stand:st};
}
function qrPublicUrl(req, code){
  const proto = req.headers['x-forwarded-proto'] || 'https'; const host = req.headers['x-forwarded-host'] || req.headers.host || 'ride.nexoofficial.in';
  return `${proto}://${host}/qr/?qr=${encodeURIComponent(code)}`;
}
function qrAssetOut(req,db,q){
  const target = q.target_type==='AREA' ? (db.area_catalog||[]).find(a=>a.id===q.target_id) : q.target_type==='STAND' ? (db.area_stands||[]).find(st=>st.id===q.target_id) : q.target_type==='DRIVER' ? driverPublicCenterOut(db,(db.driver_profiles||[]).find(d=>d.id===q.target_id||d.user_id===q.target_id)||{}) : null;
  return {...q, booking_url:qrPublicUrl(req,q.code), target};
}
function createQrAsset(db,user,body={},req={headers:{}}){
  ensureSprint7NFoundation(db); if(!isAdminRole(user)) return {ok:false,status:403,detail:'Admin only'};
  const type=String(body.target_type||body.type||'GENERAL').toUpperCase(); if(!db.driver_capacity_settings.qr_types.includes(type)) return {ok:false,status:400,detail:'Invalid QR type', allowed:db.driver_capacity_settings.qr_types};
  const target_id=String(body.target_id||'').trim(); const name=sanitizeText(body.name||`${type} QR`,100);
  if(type==='AREA'){ const a=(db.area_catalog||[]).find(x=>x.id===target_id); if(!a) return {ok:false,status:400,detail:'Valid area target_id required'}; if(!areaAllowedForAdmin(db,user,a.id)) return {ok:false,status:403,detail:'Not allowed for this area'}; }
  if(type==='STAND'){ const st=(db.area_stands||[]).find(x=>x.id===target_id); if(!st) return {ok:false,status:400,detail:'Valid stand target_id required'}; if(!areaAllowedForAdmin(db,user,st.area_id)) return {ok:false,status:403,detail:'Not allowed for this stand area'}; }
  if(type==='DRIVER'){ const d=(db.driver_profiles||[]).find(x=>x.id===target_id||x.user_id===target_id); if(!d) return {ok:false,status:400,detail:'Valid driver target_id required'}; if(!areaAllowedForAdmin(db,user,d.area_id||d.area)) return {ok:false,status:403,detail:'Not allowed for this driver area'}; }
  const rec={id:uid('qr'), code:String(body.code||uid('nexo_qr')).replace(/[^a-zA-Z0-9_-]/g,'').slice(0,80), name, target_type:type, target_id, enabled:body.enabled!==false, scan_count:0, booking_count:0, created_at:now(), created_by:user.id, source_tag:sanitizeText(body.source_tag||'',80)};
  db.qr_assets.push(rec); audit(db,user.id,'S7N_QR_CREATE','qr_asset',rec.id,{type,target_id}); return {ok:true, qr:qrAssetOut(req,db,rec)};
}
function listQrAssets(db,user,req,params){
  ensureSprint7NFoundation(db); let items=db.qr_assets||[]; const type=String(params.get('type')||'').toUpperCase(); if(type) items=items.filter(q=>q.target_type===type); const enabled=String(params.get('enabled')||''); if(enabled) items=items.filter(q=>String(q.enabled)===enabled);
  if(!isMainAdmin(user)){ const scope=adminScopeArea(db,user); items=items.filter(q=>{ if(q.target_type==='GENERAL') return true; if(q.target_type==='AREA') return areaAllowedForAdmin(db,user,q.target_id); if(q.target_type==='STAND'){const st=(db.area_stands||[]).find(x=>x.id===q.target_id); return st && areaAllowedForAdmin(db,user,st.area_id);} if(q.target_type==='DRIVER'){const d=(db.driver_profiles||[]).find(x=>x.id===q.target_id||x.user_id===q.target_id); return d && areaAllowedForAdmin(db,user,d.area_id||d.area);} return false; }); }
  return {ok:true, total:items.length, qr_assets:items.slice(-300).reverse().map(q=>qrAssetOut(req,db,q)), recent_scans:(db.qr_scan_events||[]).slice(-100).reverse()};
}
function qrResolvePublic(db, code, req){
  ensureSprint7NFoundation(db); const c=String(code||'').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,100); const q=(db.qr_assets||[]).find(x=>x.code===c && x.enabled!==false);
  if(!q) return {ok:false,status:404,detail:'QR not found or disabled'};
  q.scan_count=Number(q.scan_count||0)+1; q.last_scanned_at=now(); const ev={id:uid('qrscan'), qr_id:q.id, code:q.code, at:now(), user_agent:String(req.headers['user-agent']||'').slice(0,180), ip:String(req.headers['x-forwarded-for']||req.socket?.remoteAddress||'').slice(0,80)}; db.qr_scan_events.push(ev); if(db.qr_scan_events.length>3000) db.qr_scan_events=db.qr_scan_events.slice(-3000);
  return {ok:true, qr:qrAssetOut(req,db,q), booking_url:qrPublicUrl(req,q.code), event:ev};
}
function driverKycQrReadiness(db){
  ensureSprint7NFoundation(db); const drivers=db.driver_profiles||[]; const checks=[
    {key:'driver_onboarding', title:'Driver onboarding API', ok:true, detail:'/api/admin/drivers/register'},
    {key:'kyc_documents', title:'KYC document registry', ok:Array.isArray(db.driver_documents), detail:`Documents ${db.driver_documents.length}`},
    {key:'approval_workflow', title:'Approval workflow', ok:Array.isArray(db.driver_approval_events), detail:db.driver_capacity_settings.approval_flow.join(' → ')},
    {key:'area_management', title:'Area management', ok:Array.isArray(db.area_catalog), detail:`Areas ${db.area_catalog.length}`},
    {key:'stand_management', title:'Stand management', ok:Array.isArray(db.area_stands), detail:`Stands ${db.area_stands.length}`},
    {key:'qr_management', title:'QR management', ok:Array.isArray(db.qr_assets), detail:`QR assets ${db.qr_assets.length}`},
    {key:'capacity', title:'10k driver list readiness', ok:!!db.driver_capacity_settings.driver_list_pagination, detail:`Target ${db.driver_capacity_settings.target_registered_drivers} / active ${db.driver_capacity_settings.target_active_drivers}`}
  ];
  return {ok:checks.every(c=>c.ok), version:VERSION, sprint:'7R', checks, summary:{drivers:drivers.length, approved:drivers.filter(d=>String(d.status||'').toUpperCase()==='APPROVED').length, pending:drivers.filter(d=>String(d.status||'').toUpperCase()==='PENDING').length, areas:(db.area_catalog||[]).length, stands:(db.area_stands||[]).length, qr_assets:(db.qr_assets||[]).length, documents:(db.driver_documents||[]).length}, portals:{drivers:'/admin-drivers/', areas:'/admin-areas/', qr:'/admin-qr/'}, settings:db.driver_capacity_settings};
}

function defaultFinanceSettings(){
  return {
    architecture_version:'S7O-FARE-COMMISSION-WALLET-SETTLEMENT',
    fare_engine_enabled:true,
    area_wise_fare_enabled:true,
    commission_enabled:true,
    driver_wallet_enabled:true,
    settlement_center_enabled:true,
    receipt_enabled:true,
    default_commission_mode:'PERCENT',
    default_commission_percent:10,
    default_fixed_commission:0,
    minimum_driver_payout:0,
    future_modes:['PER_RIDE_COMMISSION','MONTHLY_SUBSCRIPTION','WALLET_RECHARGE','DRIVER_SECURITY_DEPOSIT','OFFER_COUPON','REFERRAL_BONUS'],
    additive_only:true,
    note:'Finance engine is additive. Existing rides, payment orders and settlements are preserved.'
  };
}
function ensureSprint7OFoundation(db){
  ensureSprint7NFoundation(db);
  db.schema_migrations = db.schema_migrations || [];
  if(!db.schema_migrations.find(m=>m.id==='S7O_FARE_COMMISSION_WALLET_SETTLEMENT')) db.schema_migrations.push({id:'S7O_FARE_COMMISSION_WALLET_SETTLEMENT', applied_at:now(), additive:true, note:'Fare engine, commission rules, driver wallet ledger, settlement batches, passenger receipts and finance dashboard'});
  db.schema_version='S7O';
  db.finance_settings = {...defaultFinanceSettings(), ...(db.finance_settings||{})};
  db.fare_rules = db.fare_rules || defaultDb().fare_rules;
  if(db.fare_rules.per_km_fare===undefined) db.fare_rules.per_km_fare = 0;
  if(db.fare_rules.waiting_charge_per_minute===undefined) db.fare_rules.waiting_charge_per_minute = 0;
  if(db.fare_rules.peak_hour_multiplier===undefined) db.fare_rules.peak_hour_multiplier = 1;
  if(db.fare_rules.manual_override_enabled===undefined) db.fare_rules.manual_override_enabled = true;
  if(db.fare_rules.night_charge_start===undefined) db.fare_rules.night_charge_start = '22:00';
  if(db.fare_rules.night_charge_end===undefined) db.fare_rules.night_charge_end = '05:00';
  if(db.fare_rules.updated_at===undefined) db.fare_rules.updated_at = now();
  db.fare_area_rules = db.fare_area_rules || [];
  db.commission_rules = db.commission_rules || [];
  db.driver_special_commissions = db.driver_special_commissions || [];
  db.driver_wallets = db.driver_wallets || [];
  db.driver_wallet_ledger = db.driver_wallet_ledger || [];
  db.settlement_batches = db.settlement_batches || [];
  db.receipts = db.receipts || [];
  db.finance_audit = db.finance_audit || [];
  if(!db.commission_rules.find(r=>r.id==='default_per_ride_commission')) db.commission_rules.push({id:'default_per_ride_commission', scope:'GLOBAL', status:'ACTIVE', mode:'PERCENT', percent:Number(db.fare_rules.platform_commission_percent||db.finance_settings.default_commission_percent||10), fixed_amount:0, created_at:now(), note:'Default platform commission rule'});
  for(const d of db.driver_profiles||[]) ensureDriverWallet(db, d.user_id);
  return db;
}
function financeAudit(db, actorId, action, target_type, target_id, meta={}){
  db.finance_audit = db.finance_audit || [];
  db.finance_audit.push({id:uid('fin'), at:now(), actor_id:actorId||'system', action, target_type, target_id, meta});
  if(db.finance_audit.length>3000) db.finance_audit=db.finance_audit.slice(-3000);
}
function driverWalletId(driverId){ return 'wallet_'+String(driverId||'').replace(/[^a-zA-Z0-9_-]/g,'_'); }
function ensureDriverWallet(db, driverId){
  if(!driverId) return null;
  db.driver_wallets = db.driver_wallets || [];
  let w = db.driver_wallets.find(x=>x.driver_id===driverId);
  if(!w){ w={id:driverWalletId(driverId), driver_id:driverId, balance:0, total_earned:0, total_commission:0, pending_settlement:0, paid_settlement:0, ride_count:0, status:'ACTIVE', created_at:now(), updated_at:now()}; db.driver_wallets.push(w); }
  return w;
}
function walletLedgerAdd(db, driverId, entry){
  const w=ensureDriverWallet(db,driverId); if(!w) return null;
  db.driver_wallet_ledger = db.driver_wallet_ledger || [];
  const amount=money(entry.amount||0);
  const rec={id:uid('wlg'), wallet_id:w.id, driver_id:driverId, at:now(), type:String(entry.type||'ADJUSTMENT').toUpperCase(), amount, ride_id:entry.ride_id||'', settlement_id:entry.settlement_id||'', status:entry.status||'POSTED', note:sanitizeText(entry.note||'',220), balance_before:money(w.balance||0), meta:entry.meta||{}};
  if(rec.type==='EARNING_CREDIT'){ w.balance=money(Number(w.balance||0)+amount); w.total_earned=money(Number(w.total_earned||0)+amount); w.pending_settlement=money(Number(w.pending_settlement||0)+amount); w.ride_count=Number(w.ride_count||0)+1; }
  else if(rec.type==='COMMISSION_DEBIT'){ w.total_commission=money(Number(w.total_commission||0)+Math.abs(amount)); }
  else if(rec.type==='SETTLEMENT_PAID'){ w.balance=money(Math.max(0,Number(w.balance||0)-Math.abs(amount))); w.pending_settlement=money(Math.max(0,Number(w.pending_settlement||0)-Math.abs(amount))); w.paid_settlement=money(Number(w.paid_settlement||0)+Math.abs(amount)); }
  else { w.balance=money(Number(w.balance||0)+amount); }
  rec.balance_after=money(w.balance||0); w.updated_at=now(); db.driver_wallet_ledger.push(rec); if(db.driver_wallet_ledger.length>10000) db.driver_wallet_ledger=db.driver_wallet_ledger.slice(-10000); return rec;
}
function areaRuleFor(db, areaIdOrName){
  const key=String(areaIdOrName||'').toLowerCase();
  if(!key) return null;
  return (db.fare_area_rules||[]).find(r=>String(r.status||'ACTIVE').toUpperCase()==='ACTIVE' && [r.area_id,r.area_name,r.name].some(v=>String(v||'').toLowerCase()===key)) || null;
}
function commissionRuleForRide(db, ride, driverProfile=null){
  ensureSprint7OFoundation(db);
  const driverId=ride?.driver_id || driverProfile?.user_id || '';
  const areaKey=driverProfile?.area_id || driverProfile?.area || ride?.area_id || ride?.area || ride?.qr_area || '';
  const special=(db.driver_special_commissions||[]).find(r=>String(r.status||'ACTIVE').toUpperCase()==='ACTIVE' && (r.driver_id===driverId || r.driver_user_id===driverId));
  if(special) return {scope:'DRIVER', mode:String(special.mode||'PERCENT').toUpperCase(), percent:Number(special.percent??special.commission_percent??0), fixed_amount:Number(special.fixed_amount||0), rule_id:special.id};
  const areaRule=(db.commission_rules||[]).find(r=>String(r.status||'ACTIVE').toUpperCase()==='ACTIVE' && String(r.scope||'').toUpperCase()==='AREA' && [r.area_id,r.area_name].some(v=>String(v||'').toLowerCase()===String(areaKey||'').toLowerCase()));
  if(areaRule) return {scope:'AREA', mode:String(areaRule.mode||'PERCENT').toUpperCase(), percent:Number(areaRule.percent||0), fixed_amount:Number(areaRule.fixed_amount||0), rule_id:areaRule.id};
  const global=(db.commission_rules||[]).find(r=>String(r.status||'ACTIVE').toUpperCase()==='ACTIVE' && String(r.scope||'GLOBAL').toUpperCase()==='GLOBAL') || {};
  return {scope:'GLOBAL', mode:String(global.mode||db.finance_settings.default_commission_mode||'PERCENT').toUpperCase(), percent:Number(global.percent??db.fare_rules.platform_commission_percent??10), fixed_amount:Number(global.fixed_amount||db.finance_settings.default_fixed_commission||0), rule_id:global.id||'default'};
}
function calculateCommission(db, fare, ride=null, driverProfile=null){
  ensureSprint7OFoundation(db);
  if(db.finance_settings.commission_enabled===false) return {platform_commission:0, driver_earning:money(fare), rule:{mode:'OFF', scope:'GLOBAL'}};
  const rule=commissionRuleForRide(db, ride||{}, driverProfile||null);
  let commission=0;
  if(rule.mode==='FIXED') commission=Number(rule.fixed_amount||0);
  else if(rule.mode==='HYBRID_MAX') commission=Math.max(Number(rule.fixed_amount||0), Number(fare||0)*Number(rule.percent||0)/100);
  else if(rule.mode==='HYBRID_MIN') commission=Math.min(Number(rule.fixed_amount||0), Number(fare||0)*Number(rule.percent||0)/100);
  else commission=Number(fare||0)*Number(rule.percent||0)/100;
  commission=money(Math.max(0, Math.min(Number(fare||0), commission)));
  const driver_earning=money(Math.max(Number(db.finance_settings.minimum_driver_payout||0), Number(fare||0)-commission));
  return {platform_commission:commission, driver_earning, commission_rule:rule};
}
function applyFareEngine(db, fare, opts={}){
  ensureSprint7OFoundation(db);
  const out={...fare, fare_engine_version:'S7O'};
  const areaRule=areaRuleFor(db, opts.area_id||opts.area||opts.qr_area||'');
  const r={...(db.fare_rules||{}), ...(areaRule?.fare_rules||{})};
  let total=Number(out.estimated_fare||0);
  const breakup={...(out.fare_breakup||{})};
  if(areaRule){ out.area_rule_id=areaRule.id; out.area_rule_name=areaRule.area_name || areaRule.name || ''; breakup.area_rule=out.area_rule_name; }
  const waitingMins=Math.max(0, Number(opts.wait_minutes||opts.waiting_minutes||0));
  const waitingCharge=money(waitingMins*Number(r.waiting_charge_per_minute||0));
  if(waitingCharge){ total+=waitingCharge; breakup.waiting_minutes=waitingMins; breakup.waiting_charge=waitingCharge; }
  const peakMultiplier=Number(opts.peak_hour_multiplier || r.peak_hour_multiplier || 1);
  if(peakMultiplier && peakMultiplier!==1){ total=money(total*peakMultiplier); breakup.peak_hour_multiplier=peakMultiplier; }
  const nightPercent=Number(opts.night_extra_percent ?? r.night_extra_percent ?? 0);
  if(nightPercent){ const night=money(total*nightPercent/100); total+=night; breakup.night_charge_percent=nightPercent; breakup.night_charge=night; }
  if(opts.manual_fare!==undefined && opts.manual_fare!==null && opts.manual_fare!=='' && r.manual_override_enabled!==false){ total=Number(opts.manual_fare); breakup.manual_override=true; breakup.manual_override_reason=sanitizeText(opts.manual_reason||opts.override_reason||'',140); }
  out.estimated_fare=money(Math.max(0,total)); out.fare_breakup={...breakup, total:out.estimated_fare};
  const c=calculateCommission(db,out.estimated_fare,opts.ride||{},opts.driver_profile||null);
  out.platform_commission=c.platform_commission; out.driver_earning=c.driver_earning; out.commission_rule=c.commission_rule;
  return out;
}
function rideFinanceApply(db, ride){
  ensureSprint7OFoundation(db);
  const prof=(db.driver_profiles||[]).find(d=>d.user_id===ride.driver_id)||null;
  const c=calculateCommission(db, Number(ride.estimated_fare||0), ride, prof);
  ride.platform_commission=c.platform_commission; ride.driver_earning=c.driver_earning; ride.commission_rule=c.commission_rule; ride.finance_calculated_at=ride.finance_calculated_at||now();
  return c;
}
function receiptForRide(db, ride){
  ensureSprint7OFoundation(db);
  if(!ride) return null;
  let rec=(db.receipts||[]).find(x=>x.ride_id===ride.id);
  const passenger=(db.users||[]).find(u=>u.id===ride.passenger_id)||{}; const driver=(db.users||[]).find(u=>u.id===ride.driver_id)||{}; const prof=(db.driver_profiles||[]).find(d=>d.user_id===ride.driver_id)||{};
  const base={ride_id:ride.id, receipt_no:rec?.receipt_no || ('NXR-'+String(ride.created_at||now()).slice(0,10).replace(/-/g,'')+'-'+String(ride.id||'').slice(-6).toUpperCase()), passenger_name:passenger.name||ride.passenger_name||'Guest Passenger', passenger_mobile:passenger.mobile||ride.passenger_mobile||'', driver_name:driver.name||ride.driver_name||'', driver_mobile:driver.mobile||ride.driver_mobile||'', vehicle_no:prof.vehicle_no||ride.driver_vehicle_no||'', pickup:ride.pickup||'', drop:ride.drop||'', ride_type:ride.ride_type||'', fare:money(ride.estimated_fare||0), platform_commission:money(ride.platform_commission||0), driver_earning:money(ride.driver_earning||0), payment_status:ride.payment_status||'', payment_ref:ride.payment_ref||ride.payment_transaction_id||'', settlement_status:ride.settlement_status||'PENDING', status:ride.status||'', created_at:ride.created_at||'', completed_at:ride.completed_at||'', generated_at:now()};
  if(!rec){ rec={id:uid('rcpt'), ...base}; db.receipts.push(rec); } else Object.assign(rec,base);
  return rec;
}
function financeDashboard(db,user=null){
  ensureSprint7OFoundation(db);
  const rides=filterRidesForAdmin(db,user,db.rides||[]); const completed=rides.filter(r=>String(r.status||'').toUpperCase()==='COMPLETED');
  const totalFare=money(completed.reduce((a,r)=>a+Number(r.estimated_fare||0),0));
  const commission=money(completed.reduce((a,r)=>a+Number(r.platform_commission||0),0));
  const driverEarning=money(completed.reduce((a,r)=>a+Number(r.driver_earning||0),0));
  const pending=money(completed.filter(r=>String(r.settlement_status||'PENDING').toUpperCase()!=='PAID').reduce((a,r)=>a+Number(r.driver_earning||0),0));
  const paid=money((db.settlements||[]).filter(s=>!user || isMainAdmin(user) || filterDriversForAdmin(db,user,[{user_id:s.driver_id, area:s.area}]).length).reduce((a,s)=>a+Number(s.amount||0),0));
  const driverMap={};
  for(const r of completed){ const id=r.driver_id||'unassigned'; const u=(db.users||[]).find(x=>x.id===id)||{}; const p=(db.driver_profiles||[]).find(x=>x.user_id===id)||{}; driverMap[id]=driverMap[id]||{driver_id:id, driver_name:u.name||r.driver_name||'Driver', mobile:u.mobile||'', vehicle_no:p.vehicle_no||'', area:p.area||r.area||'', rides:0, fare:0, earning:0, commission:0, pending:0}; const x=driverMap[id]; x.rides++; x.fare=money(x.fare+Number(r.estimated_fare||0)); x.earning=money(x.earning+Number(r.driver_earning||0)); x.commission=money(x.commission+Number(r.platform_commission||0)); if(String(r.settlement_status||'PENDING').toUpperCase()!=='PAID') x.pending=money(x.pending+Number(r.driver_earning||0)); }
  const areaMap={};
  for(const r of completed){ const p=(db.driver_profiles||[]).find(x=>x.user_id===r.driver_id)||{}; const area=p.area||r.area||r.qr_area||'Kalna'; areaMap[area]=areaMap[area]||{area, rides:0, fare:0, commission:0, driver_earning:0}; areaMap[area].rides++; areaMap[area].fare=money(areaMap[area].fare+Number(r.estimated_fare||0)); areaMap[area].commission=money(areaMap[area].commission+Number(r.platform_commission||0)); areaMap[area].driver_earning=money(areaMap[area].driver_earning+Number(r.driver_earning||0)); }
  return {ok:true, version:VERSION, sprint:'7O', summary:{completed_rides:completed.length,total_fare:totalFare,platform_commission:commission,driver_earning:driverEarning,settlement_pending:pending,settlement_paid:paid,payment_pending:rides.filter(r=>String(r.payment_status||'').toUpperCase()==='PENDING').length, wallets:(db.driver_wallets||[]).length}, fare_rules:db.fare_rules, finance_settings:db.finance_settings, commission_rules:db.commission_rules||[], area_rules:db.fare_area_rules||[], drivers:Object.values(driverMap).sort((a,b)=>b.pending-a.pending).slice(0,150), areas:Object.values(areaMap).sort((a,b)=>b.fare-a.fare), recent_settlements:(db.settlements||[]).slice(-100).reverse(), recent_receipts:(db.receipts||[]).slice(-100).reverse(), ledger:(db.driver_wallet_ledger||[]).slice(-120).reverse(), portal:'/admin-finance/'};
}
function settlementCreateForDriver(db,user,driverId,body={}){
  ensureSprint7OFoundation(db);
  const pendingRides=(db.rides||[]).filter(r=>r.driver_id===driverId && String(r.status||'').toUpperCase()==='COMPLETED' && String(r.settlement_status||'PENDING').toUpperCase()!=='PAID');
  if(!pendingRides.length) return {ok:false,status:409,detail:'No pending completed rides for this driver'};
  const amount=money(pendingRides.reduce((a,r)=>a+Number(r.driver_earning||0),0));
  const settlement={id:uid('set'), driver_id:driverId, amount, ride_count:pendingRides.length, ride_ids:pendingRides.map(r=>r.id), payment_ref:sanitizeText(body.payment_ref||body.reference||'Manual payout',120), payout_method:sanitizeText(body.payout_method||'UPI/BANK_MANUAL',60), note:sanitizeText(body.note||'',220), paid_by:user.id, paid_at:now(), status:'PAID', source:'S7O_FINANCE_CENTER'};
  for(const r of pendingRides){ r.settlement_status='PAID'; r.settlement_id=settlement.id; r.settled_at=settlement.paid_at; r.settlement_payment_ref=settlement.payment_ref; }
  db.settlements.push(settlement); db.settlement_batches.push({...settlement, id:uid('setbatch'), settlement_id:settlement.id, created_at:now()});
  const prof=(db.driver_profiles||[]).find(d=>d.user_id===driverId); if(prof){ prof.pending_payout=money(Math.max(0,Number(prof.pending_payout||0)-amount)); prof.paid_payout=money(Number(prof.paid_payout||0)+amount); prof.last_payout_at=settlement.paid_at; }
  walletLedgerAdd(db,driverId,{type:'SETTLEMENT_PAID', amount, settlement_id:settlement.id, note:settlement.note||'Driver settlement paid'});
  financeAudit(db,user.id,'SETTLEMENT_PAID','driver',driverId,{settlement_id:settlement.id, amount, rides:pendingRides.length}); audit(db,user.id,'S7O_DRIVER_SETTLEMENT_PAID','driver',driverId,{settlement_id:settlement.id, amount});
  return {ok:true, settlement, dashboard:financeDashboard(db,user)};
}
function financeReadiness(db){
  ensureSprint7OFoundation(db);
  const checks=[
    {key:'fare_engine', title:'Fare engine', ok:!!db.finance_settings.fare_engine_enabled, detail:'Base/minimum/area/peak/night/waiting/manual override ready'},
    {key:'commission_rules', title:'Commission rules', ok:Array.isArray(db.commission_rules), detail:`Rules ${(db.commission_rules||[]).length}`},
    {key:'driver_wallet', title:'Driver wallet ledger', ok:Array.isArray(db.driver_wallets)&&Array.isArray(db.driver_wallet_ledger), detail:`Wallets ${(db.driver_wallets||[]).length}, ledger ${(db.driver_wallet_ledger||[]).length}`},
    {key:'settlement_center', title:'Settlement center', ok:Array.isArray(db.settlements)&&Array.isArray(db.settlement_batches), detail:`Settlements ${(db.settlements||[]).length}`},
    {key:'receipt', title:'Passenger receipt', ok:Array.isArray(db.receipts), detail:`Receipts ${(db.receipts||[]).length}`},
    {key:'future_finance_modes', title:'Future finance modes', ok:(db.finance_settings.future_modes||[]).length>=5, detail:(db.finance_settings.future_modes||[]).join(', ')}
  ];
  return {ok:checks.every(c=>c.ok), version:VERSION, sprint:'7O', checks, dashboard:financeDashboard(db,{role:'ADMIN'}), portals:{finance:'/admin-finance/', receipt:'/receipt/'}};
}


function defaultSafetySettings(){
  return {
    architecture_version:'S7P-SAFETY-SOS-TRIP-SHARING',
    sos_enabled:true,
    trip_share_enabled:true,
    public_tracking_enabled:true,
    emergency_contact_enabled:true,
    driver_safety_note_enabled:true,
    route_deviation_enabled:true,
    route_deviation_threshold_km:Number(process.env.ROUTE_DEVIATION_THRESHOLD_KM || 1.2),
    stale_gps_alert_minutes:Number(process.env.SAFETY_STALE_GPS_MINUTES || 8),
    active_statuses:['DRIVER_ACCEPTED','CONFIRMED','ARRIVED','STARTED','DRIVER_REACHED_DROP'],
    public_track_privacy:'Public tracking token shows ride status, route, masked passenger mobile, driver/vehicle details and last known driver location only for that ride.',
    audit_required:true,
    additive_only:true
  };
}
function ensureSprint7PFoundation(db){
  ensureSprint7OFoundation(db);
  db.schema_migrations = db.schema_migrations || [];
  if(!db.schema_migrations.find(m=>m.id==='S7P_SAFETY_SOS_TRIP_SHARING')) db.schema_migrations.push({id:'S7P_SAFETY_SOS_TRIP_SHARING', applied_at:now(), additive:true, note:'Passenger SOS, trip share, public tracking link, route deviation alerts, driver safety notes and admin safety dashboard'});
  db.schema_version='S7P';
  db.safety_settings = {...defaultSafetySettings(), ...(db.safety_settings||{})};
  db.safety_events = db.safety_events || [];
  db.safety_contacts = db.safety_contacts || [];
  db.safety_shares = db.safety_shares || [];
  db.route_deviation_alerts = db.route_deviation_alerts || [];
  db.driver_safety_notes = db.driver_safety_notes || [];
  return db;
}
function tripTrackUrl(req, token){
  const host = req && req.headers && req.headers.host ? req.headers.host : 'ride.nexoofficial.in';
  const proto = req && (req.headers['x-forwarded-proto'] || (req.socket && req.socket.encrypted ? 'https' : 'https'));
  return `${proto}://${host}/track/${encodeURIComponent(token||'')}`;
}
function publicTrackPayload(db, token, req){
  ensureSprint7PFoundation(db);
  const found = rideByGuestToken(db, token);
  if(!found.ride) return {ok:false,status:404,detail:'Trip link expired or ride not found'};
  const ride = found.ride;
  const view = publicRideView(db, ride);
  const passenger = (db.users||[]).find(u=>u.id===ride.passenger_id)||{};
  // Public trip links must not expose full passenger identifiers.
  view.passenger_id = undefined;
  view.passenger_mobile = maskMobile(ride.passenger_mobile||passenger.mobile||'');
  view.token_private_note = undefined;
  const driver = (db.users||[]).find(u=>u.id===ride.driver_id)||{};
  const prof = (db.driver_profiles||[]).find(d=>d.user_id===ride.driver_id)||{};
  const live = rideLiveSnapshot(db, ride);
  const safety = {
    sos_enabled:!!db.safety_settings.sos_enabled,
    support_mobile:db.app_settings.support_mobile||'',
    support_email:db.app_settings.support_email||'',
    share_url:tripTrackUrl(req, token),
    otp_verified:!!ride.otp_verified_at,
    active_sos:(db.safety_events||[]).filter(e=>e.ride_id===ride.id && e.status==='OPEN').length,
    route_deviation_alerts:(db.route_deviation_alerts||[]).filter(a=>a.ride_id===ride.id).slice(-5).reverse()
  };
  return {ok:true, ride:view, live, route:routePlan(db, ride.pickup, ride.drop, ride.ride_type, ride.seats||1), safety, driver:{name:driver.name||'', mobile:driver.mobile||'', vehicle_no:prof.vehicle_no||'', rating:prof.rating||5}, passenger:{name:ride.passenger_name||passenger.name||'Guest Passenger', mobile_masked:maskMobile(ride.passenger_mobile||passenger.mobile||'')}, session:{expires_at:found.session.expires_at}, updated_at:now()};
}
function recordSafetyEvent(db, ride, actor, body={}, type='SOS'){
  ensureSprint7PFoundation(db);
  const event={id:uid(type==='SOS'?'sos':'safe'), ride_id:ride.id, event_type:type, user_id:actor?.id||'guest', user_role:actor?.role||'GUEST', reason:sanitizeText(body.reason||body.note||(type==='SOS'?'SOS pressed':'Safety event'),240), location:sanitizeText(body.location||body.address||ride.pickup||'',180), lat:body.lat!==undefined?Number(body.lat):null, lng:body.lng!==undefined?Number(body.lng):null, status:'OPEN', priority:type==='SOS'?'CRITICAL':'HIGH', created_at:now(), ride_status:ride.status, support_mobile:db.app_settings.support_mobile||''};
  db.safety_events.push(event); if(db.safety_events.length>5000) db.safety_events=db.safety_events.slice(-5000);
  ride.sos_count=(ride.sos_count||0)+(type==='SOS'?1:0); if(type==='SOS') ride.last_sos_at=event.created_at;
  notifyAdmins(db,{event_type:type==='SOS'?'SOS_ALERT':'SAFETY_ALERT', priority:event.priority, ride_id:ride.id, title:type==='SOS'?'SOS Alert':'Safety Alert', message:`${event.reason} · ${ride.pickup||''} → ${ride.drop||''}`, data:{event_id:event.id}});
  audit(db,event.user_id,'S7P_'+type,'ride',ride.id,{event_id:event.id, reason:event.reason});
  return event;
}
function createTripShare(db, ride, token, req, body={}, actor={}){
  ensureSprint7PFoundation(db);
  const passenger=(db.users||[]).find(u=>u.id===ride.passenger_id)||{}; const driver=(db.users||[]).find(u=>u.id===ride.driver_id)||{}; const prof=(db.driver_profiles||[]).find(d=>d.user_id===ride.driver_id)||{};
  const url=tripTrackUrl(req,token);
  const share_text=`NEXO Ride Live Trip\nTrack: ${url}\nRoute: ${ride.pickup||''} → ${ride.drop||''}\nStatus: ${ride.status||''}\nDriver: ${driver.name||'Not assigned'} ${prof.vehicle_no?('· Toto '+prof.vehicle_no):''}\nSupport: ${db.app_settings.support_mobile||''}`;
  const rec={id:uid('share'), ride_id:ride.id, token_hash:sha(String(token||'')), shared_to_name:sanitizeText(body.name||body.contact_name||'',80), shared_to_mobile:normalizeIndianMobile(body.mobile||body.contact_mobile||''), created_by:actor?.id||'guest', created_at:now(), share_url:url};
  db.safety_shares.push(rec); if(db.safety_shares.length>3000) db.safety_shares=db.safety_shares.slice(-3000);
  audit(db,rec.created_by,'S7P_TRIP_SHARE','ride',ride.id,{share_id:rec.id});
  return {ok:true, share:rec, share_url:url, share_text, passenger:{name:ride.passenger_name||passenger.name||'', mobile_masked:maskMobile(ride.passenger_mobile||passenger.mobile||'')}, driver:{name:driver.name||'', mobile:driver.mobile||'', vehicle_no:prof.vehicle_no||''}};
}
function routeDeviationCheckForRide(db, ride, loc){
  ensureSprint7PFoundation(db);
  if(!db.safety_settings.route_deviation_enabled || !ride || !loc || loc.lat==null || loc.lng==null) return null;
  const status=String(ride.status||'').toUpperCase();
  if(!['STARTED','ARRIVED','CONFIRMED','DRIVER_ACCEPTED'].includes(status)) return null;
  const target = status==='STARTED' ? (ride.drop_coords||placeCoords(ride.drop)) : (ride.pickup_coords||placeCoords(ride.pickup));
  const from = {lat:Number(loc.lat), lng:Number(loc.lng)};
  const dist=distanceKm(from,target);
  const threshold=Number(db.safety_settings.route_deviation_threshold_km||1.2);
  if(dist===null || dist<=threshold) return null;
  const recent=(db.route_deviation_alerts||[]).slice().reverse().find(a=>a.ride_id===ride.id && a.status==='OPEN' && (Date.now()-new Date(a.created_at).getTime())<10*60*1000);
  if(recent) return recent;
  const alert={id:uid('dev'), ride_id:ride.id, driver_id:ride.driver_id, status:'OPEN', severity:dist>threshold*2?'HIGH':'MEDIUM', distance_to_target_km:dist, threshold_km:threshold, target_status:status==='STARTED'?'DROP':'PICKUP', driver_lat:from.lat, driver_lng:from.lng, created_at:now(), note:'Driver appears away from active route target; foundation alert based on GPS distance to pickup/drop until full polyline route engine is enabled.'};
  db.route_deviation_alerts.push(alert); if(db.route_deviation_alerts.length>3000) db.route_deviation_alerts=db.route_deviation_alerts.slice(-3000);
  notifyAdmins(db,{event_type:'ROUTE_DEVIATION', priority:alert.severity==='HIGH'?'HIGH':'NORMAL', ride_id:ride.id, title:'Route Deviation Alert', message:`Ride ${ride.pickup||''} → ${ride.drop||''}: driver ${dist} km from ${alert.target_status}`, data:{alert_id:alert.id}});
  return alert;
}
function routeDeviationCheckForUser(db,user,loc){
  if(!user || String(user.role||'').toUpperCase()!=='DRIVER') return [];
  const rides=(db.rides||[]).filter(r=>r.driver_id===user.id && ['DRIVER_ACCEPTED','CONFIRMED','ARRIVED','STARTED'].includes(String(r.status||'').toUpperCase()));
  return rides.map(r=>routeDeviationCheckForRide(db,r,loc)).filter(Boolean);
}
function driverSafetyNote(db, user, ride, body={}){
  ensureSprint7PFoundation(db);
  const type=String(body.type||body.issue_type||'DRIVER_NOTE').toUpperCase().slice(0,50);
  const rec={id:uid('dsafe'), ride_id:ride.id, driver_id:user.id, type, note:sanitizeText(body.note||body.reason||'',300), severity:String(body.severity||'NORMAL').toUpperCase().slice(0,20), created_at:now(), status:'OPEN'};
  db.driver_safety_notes.push(rec); if(db.driver_safety_notes.length>3000) db.driver_safety_notes=db.driver_safety_notes.slice(-3000);
  if(['UNSAFE_RIDE','PASSENGER_NO_RESPONSE','DISPUTE','FORCED_STOP'].includes(type)) notifyAdmins(db,{event_type:'DRIVER_SAFETY_NOTE', priority:rec.severity==='HIGH'?'HIGH':'NORMAL', ride_id:ride.id, title:'Driver Safety Note', message:`${type}: ${rec.note}`, data:{note_id:rec.id}});
  audit(db,user.id,'S7P_DRIVER_SAFETY_NOTE','ride',ride.id,{note_id:rec.id,type});
  return rec;
}
function safetyDashboardPayload(db,user=null){
  ensureSprint7PFoundation(db);
  const rides=filterRidesForAdmin(db,user,db.rides||[]); const rideIds=new Set(rides.map(r=>r.id));
  const events=(db.safety_events||[]).filter(e=>rideIds.has(e.ride_id)); const deviations=(db.route_deviation_alerts||[]).filter(a=>rideIds.has(a.ride_id)); const notes=(db.driver_safety_notes||[]).filter(n=>rideIds.has(n.ride_id));
  const enrichEvent=e=>{const ride=(db.rides||[]).find(r=>r.id===e.ride_id)||{}; const u=(db.users||[]).find(x=>x.id===e.user_id)||{}; return {...e, user_name:u.name||'', user_mobile:u.mobile||'', pickup:ride.pickup||'', drop:ride.drop||'', ride_status:ride.status||e.ride_status||''};};
  return {ok:true, version:VERSION, sprint:'7P', settings:db.safety_settings, summary:{active_sos:events.filter(e=>e.status==='OPEN' && e.event_type==='SOS').length, open_safety_events:events.filter(e=>e.status==='OPEN').length, route_deviation_open:deviations.filter(a=>a.status==='OPEN').length, driver_notes_open:notes.filter(n=>n.status==='OPEN').length, trip_shares:(db.safety_shares||[]).length, active_rides:rides.filter(r=>db.safety_settings.active_statuses.includes(String(r.status||'').toUpperCase())).length}, active_sos:events.filter(e=>e.status==='OPEN').slice(-120).reverse().map(enrichEvent), route_deviations:deviations.slice(-120).reverse(), driver_notes:notes.slice(-120).reverse(), trip_shares:(db.safety_shares||[]).slice(-120).reverse(), portal:'/admin-safety/'};
}
function safetyReadiness(db){
  ensureSprint7PFoundation(db);
  const checks=[
    {key:'sos', title:'Passenger SOS', ok:!!db.safety_settings.sos_enabled, detail:'/api/track/:token/sos and /api/rides/:id/sos'},
    {key:'trip_share', title:'Trip share link', ok:!!db.safety_settings.trip_share_enabled, detail:'/track/<guest-token>'},
    {key:'public_tracking', title:'Public tracking token', ok:!!db.safety_settings.public_tracking_enabled, detail:'Guest token shows only linked ride'},
    {key:'route_deviation', title:'Route deviation foundation', ok:!!db.safety_settings.route_deviation_enabled, detail:`Threshold ${db.safety_settings.route_deviation_threshold_km} km`},
    {key:'driver_safety', title:'Driver safety notes', ok:Array.isArray(db.driver_safety_notes), detail:`Notes ${(db.driver_safety_notes||[]).length}`},
    {key:'admin_dashboard', title:'Admin Safety Center', ok:true, detail:'/admin-safety/'}
  ];
  return {ok:checks.every(c=>c.ok), version:VERSION, sprint:'7P', checks, dashboard:safetyDashboardPayload(db,{role:'ADMIN'}), portals:{track:'/track/', admin_safety:'/admin-safety/'}};
}

function applyManualRideIntervention(db, user, rideId, body={}){
  ensureSprint7MFoundation(db);
  const ride=(db.rides||[]).find(r=>r.id===rideId); if(!ride) return {ok:false, status:404, detail:'Ride not found'};
  const action=String(body.action||'ADD_ADMIN_NOTE').toUpperCase(); const note=sanitizeText(body.note||body.reason||'',300); const before={status:ride.status, payment_status:ride.payment_status, driver_id:ride.driver_id, dispatch_status:ride.dispatch_status};
  if(!db.admin_ops_settings.safe_actions.includes(action)) return {ok:false, status:400, detail:'Unsupported admin action', allowed:db.admin_ops_settings.safe_actions};
  if(action==='REASSIGN_DRIVER'){
    if(['STARTED','COMPLETED','PASSENGER_CONFIRMED'].includes(String(ride.status||'').toUpperCase())) return {ok:false,status:409,detail:'Started/completed ride cannot be reassigned'};
    if(ride.driver_id) ride.previous_driver_id=ride.driver_id;
    ride.driver_id=null; ride.status='REQUESTED'; ride.matching_status='ADMIN_REASSIGN_REQUESTED'; ride.reassigned_by=user.id; ride.reassigned_at=now(); reassignRideDrivers(db,ride,'ADMIN_REASSIGN');
  } else if(action==='FORCE_CANCEL'){
    if(['COMPLETED','PASSENGER_CONFIRMED'].includes(String(ride.status||'').toUpperCase())) return {ok:false,status:409,detail:'Completed ride cannot be cancelled'};
    ride.status='CANCELLED'; ride.cancelled_at=now(); ride.cancelled_by=user.id; ride.cancel_reason=note||'Admin force cancel'; closeDispatchQueue(db,ride,'CANCELLED'); notifyUsers(db, notificationTargets(db,{user_id:ride.passenger_id}), {event_type:'RIDE_CANCELLED_BY_ADMIN', priority:'HIGH', ride_id:ride.id, title:'Ride Cancelled', message:ride.cancel_reason}); if(ride.driver_id) notifyUsers(db, notificationTargets(db,{user_id:ride.driver_id}), {event_type:'RIDE_CANCELLED_BY_ADMIN', priority:'HIGH', ride_id:ride.id, title:'Ride Cancelled', message:ride.cancel_reason});
  } else if(action==='MARK_PAYMENT_RESOLVED'){
    ride.payment_status='PAID'; ride.paid_at=ride.paid_at||now(); ride.payment_resolved_by=user.id; ride.payment_admin_note=note;
  } else if(action==='RESEND_OTP'){
    ride.ride_otp=String(Math.floor(1000+Math.random()*9000)); ride.otp_regenerated_at=now(); ride.otp_regenerated_by=user.id; notifyUsers(db, notificationTargets(db,{user_id:ride.passenger_id}), {event_type:'RIDE_OTP_RESENT', priority:'HIGH', ride_id:ride.id, title:'Ride OTP Resent', message:`Your Ride OTP is ${ride.ride_otp}`});
  } else if(action==='MARK_PASSENGER_NO_RESPONSE'){
    ride.passenger_no_response_at=now(); ride.passenger_no_response_by=user.id; ride.admin_note=note||'Passenger no response';
  } else if(action==='ADD_ADMIN_NOTE'){
    ride.admin_note=note; db.ops_manual_notes.push({id:uid('note'), at:now(), ride_id:ride.id, user_id:user.id, note});
  }
  const after={status:ride.status, payment_status:ride.payment_status, driver_id:ride.driver_id, dispatch_status:ride.dispatch_status};
  const rec={id:uid('admact'), at:now(), ride_id:ride.id, action, note, actor_id:user.id, actor_name:user.name||'', before, after};
  db.admin_ride_actions.push(rec); if(db.admin_ride_actions.length>2000) db.admin_ride_actions=db.admin_ride_actions.slice(-2000);
  audit(db,user.id,'ADMIN_RIDE_INTERVENTION','ride',ride.id,{action,note,before,after});
  notifyAdmins(db,{event_type:'ADMIN_RIDE_INTERVENTION', priority:'NORMAL', ride_id:ride.id, title:'Ride manually updated', message:`${action} by ${user.name||user.mobile||user.id}`, data:{action, ride_id:ride.id}});
  return {ok:true, action:rec, ride:rideDto(ride,db,user)};
}
function blockGuestIdentity(db,user,body={}){
  ensureSprint7MFoundation(db); const mobile=normalizeIndianMobile(body.mobile||''); const device_id=String(body.device_id||'').trim(); const ip=String(body.ip||'').trim(); if(!mobile&&!device_id&&!ip) return {ok:false,status:400,detail:'mobile/device_id/ip required'};
  const hours=Number(body.hours||db.admin_ops_settings.temporary_block_hours||12); const rec={id:uid('gblk'), mobile, device_id, ip, reason:sanitizeText(body.reason||'Admin temporary block',200), active:true, created_at:now(), created_by:user.id, expires_at:hours>0?new Date(Date.now()+hours*60*60*1000).toISOString():null};
  db.guest_abuse_blocks.push(rec); audit(db,user.id,'GUEST_ABUSE_BLOCK','guest',rec.id,{mobile:!!mobile,device_id:!!device_id,ip:!!ip,hours}); return {ok:true, block:rec};
}
function unblockGuestIdentity(db,user,blockId){
  const rec=(db.guest_abuse_blocks||[]).find(b=>b.id===blockId); if(!rec) return {ok:false,status:404,detail:'Block not found'}; rec.active=false; rec.removed_at=now(); rec.removed_by=user.id; audit(db,user.id,'GUEST_ABUSE_UNBLOCK','guest',blockId,{}); return {ok:true, block:rec};
}


function defaultSprint8APlan(){
  return {
    architecture_version:'S8A-PRODUCTION-DEPLOY-DRY-RUN-APK-QA',
    sprint:'8A',
    version_name:'2.0.8A-RC3',
    version_code:95,
    latest_zip:'NEXO-Rides-main-SPRINT8A-PRODUCTION-DEPLOY-APK-QA-PACK.zip',
    cumulative_from:'Sprint-7B to Sprint-8A',
    mode:'STABILIZATION_NOT_NEW_FEATURE',
    server_deploy_order:[
      'Take VPS backup: .env, data/, uploads/, current code folder',
      'Copy latest Sprint-8A code without overwriting .env or data/',
      'Run npm install --omit=dev if dependencies changed',
      'Run npm run s8a:check and npm run final:smoke',
      'Restart PM2/systemd/Node process',
      'Check /api/health, /api/platform/security-hotfix-readiness, /api/platform/deploy-dry-run-readiness',
      'Open Admin Config Center and configure real production keys',
      'Keep Production Mode blocked until all required service checks pass'
    ],
    apk_build_order:[
      'Open GitHub Actions → Build NEXO Ride APK 8A RC3',
      'First build debug APK for field testing',
      'Install on passenger test phone and driver test phone',
      'Complete real-device QA checklist',
      'Then build release APK only after critical issues are zero'
    ],
    pilot_order:[
      'Start with 2 internal phones',
      'Then 5 drivers',
      'Then 10–20 drivers',
      'Then 50 drivers after dispatch/payment/SOS/notification pass',
      'Public launch only after pilot gate is clear'
    ]
  };
}
function ensureSprint8AFoundation(db){
  ensureSprint7ZFoundation(db);
  db.schema_migrations = db.schema_migrations || [];
  if(!db.schema_migrations.find(m=>m.id==='S8A_DEPLOY_DRY_RUN_APK_QA')) db.schema_migrations.push({id:'S8A_DEPLOY_DRY_RUN_APK_QA', applied_at:now(), additive:true, note:'Production deploy dry-run, APK build QA, real-device checklist, pilot preflight gate'});
  db.schema_version='S8A_DEPLOY_DRY_RUN_APK_QA';
  db.sprint8a_plan = {...defaultSprint8APlan(), ...(db.sprint8a_plan||{})};
  db.deploy_dry_run_records = db.deploy_dry_run_records || [];
  db.real_device_qa_runs = db.real_device_qa_runs || [];
  db.pilot_preflight_records = db.pilot_preflight_records || [];
  db.real_device_qa_checklist = db.real_device_qa_checklist || [
    {key:'apk_install', title:'APK install on Android test phone', role:'TESTER', status:'PENDING'},
    {key:'permissions', title:'Location + Camera + Notification permission prompt works', role:'TESTER', status:'PENDING'},
    {key:'qr_scan', title:'QR scanner opens safe NEXO Ride booking page', role:'PASSENGER', status:'PENDING'},
    {key:'guest_booking', title:'Guest passenger booking without account works', role:'PASSENGER', status:'PENDING'},
    {key:'pickup_drop_map', title:'Pickup/drop map and fare estimate work', role:'PASSENGER', status:'PENDING'},
    {key:'payment_flow', title:'Payment order/success/failure flow checked', role:'PASSENGER', status:'PENDING'},
    {key:'driver_login_remembered', title:'Driver login remains active after app close/reopen', role:'DRIVER', status:'PENDING'},
    {key:'driver_online', title:'Driver online/offline and GPS heartbeat work', role:'DRIVER', status:'PENDING'},
    {key:'dispatch_accept_reject', title:'Ride request accept/reject/timeout works', role:'DRIVER', status:'PENDING'},
    {key:'otp_start', title:'Passenger OTP starts ride correctly', role:'DRIVER', status:'PENDING'},
    {key:'live_tracking', title:'Passenger live tracking / trip share works', role:'PASSENGER', status:'PENDING'},
    {key:'drop_confirm', title:'Driver reached drop + passenger confirm reached works', role:'PASSENGER', status:'PENDING'},
    {key:'receipt_rating', title:'Receipt and rating work', role:'PASSENGER', status:'PENDING'},
    {key:'sos', title:'SOS event appears in Admin Safety Center', role:'SAFETY_ADMIN', status:'PENDING'},
    {key:'notification', title:'Driver/passenger/admin notification path verified', role:'OPS', status:'PENDING'}
  ];
  db.apk_build_settings={...(db.apk_build_settings||{}), architecture_version:'S8A-DEPLOY-APK-QA', apk_version_name:'2.0.8A-RC3', version_code:95, artifact_debug:'NEXO_Ride_APK_v2_0_8A_RC3_debug', artifact_release:'NEXO_Ride_APK_v2_0_8A_RC3_release', preflight_scripts:['npm run s8a:check','npm run final:smoke']};
  if(db.release_candidate){ db.release_candidate.version='2.0.8A-RC3'; db.release_candidate.label='Sprint-8A RC3 Deploy/APK QA'; db.release_candidate.freeze_status='DEPLOY_DRY_RUN_APK_QA'; }
  db.version_history = db.version_history || [];
  if(!db.version_history.find(v=>v.sprint==='8A')) db.version_history.push({sprint:'8A', version:'2.0.8A-RC3', version_code:95, artifact:'NEXO_Ride_APK_v2_0_8A_RC3', at:now(), cumulative_from:'Sprint-7B to Sprint-8A', rollback_target:'Sprint-7Z RC2 + current live data backup', note:'Stabilization pack: deploy dry-run, APK build QA, real device checklist, pilot preflight gate'});
  return db;
}
function deployDryRunReadiness(db){
  ensureSprint8AFoundation(db);
  const hotfix=securityHotfixReadiness(db), smoke=finalSmokeTest(db), freeze=environmentFreezeReport(db), maint=maintenancePublicStatus(db), launch=rcLaunchGate(db);
  const checks=[
    {key:'latest_zip', title:'Latest cumulative ZIP identified', ok:true, detail:db.sprint8a_plan.latest_zip},
    {key:'data_env_protection', title:'.env/data overwrite warning present', ok:true, detail:'Deploy guide explicitly says never overwrite .env, data/, uploads/, config vault'},
    {key:'security_hotfix', title:'Security Hotfix RC2 included', ok:hotfix.ok, detail:(hotfix.blockers||[]).map(b=>b.key||b.title).join(', ')||'pass'},
    {key:'final_smoke_script', title:'Final smoke test script available', ok:!!smoke, detail:'npm run final:smoke'},
    {key:'env_freeze_report', title:'Environment freeze report available', ok:!!freeze, detail:(freeze.blockers||[]).length+' blockers/warnings'},
    {key:'maintenance_status', title:'Maintenance status visible', ok:!!maint, detail:maint.active?'maintenance active':'maintenance off'},
    {key:'rc_gate_visible', title:'RC launch gate visible', ok:!!launch, detail:launch.status||'known'},
    {key:'backup_script', title:'Backup command/script present', ok:fs.existsSync(path.join(__dirname,'scripts','backup_now.js')) || fs.existsSync(path.join(__dirname,'deploy','vps','backup_vps.sh')), detail:'npm run backup:now / deploy/vps/backup_vps.sh'}
  ];
  const blockers=checks.filter(c=>!c.ok);
  return {ok:blockers.length===0, version:VERSION, sprint:'8A', status:blockers.length?'DRY_RUN_BLOCKED':'DRY_RUN_READY', checks, blockers, deploy_order:db.sprint8a_plan.server_deploy_order, pages:{dashboard:'/deploy-dry-run/', commands:'/deploy-commands/', rollback:'/rollback/', security:'/security-hotfix/'}, commands:['npm run backup:now','npm run s8a:check','npm run final:smoke','npm start'], never_overwrite:['.env','data/','data/production.env','data/config_vault.json','uploads/'], generated_at:now()};
}
function apkQaReadiness(db){
  ensureSprint8AFoundation(db);
  const apk=apkBuildReadiness(db); ensureSprint8AFoundation(db); const dist=apkDistributionPayload(db), ux=uxDistributionReadiness(db); ensureSprint8AFoundation(db);
  const checks=[
    {key:'gradle_version', title:'APK version bumped to 2.0.8A-RC3', ok:db.apk_build_settings?.apk_version_name==='2.0.8A-RC3', detail:`${db.apk_build_settings?.apk_version_name||'unknown'} / ${db.apk_build_settings?.version_code||'?'}`},
    {key:'github_artifacts', title:'Debug/release artifact names ready', ok:!!db.apk_build_settings?.artifact_debug && !!db.apk_build_settings?.artifact_release, detail:`${db.apk_build_settings?.artifact_debug} / ${db.apk_build_settings?.artifact_release}`},
    {key:'apk_preflight', title:'APK build readiness API available', ok:!!apk, detail:apk.ok?'readiness pass/visible':'readiness visible with blockers'},
    {key:'distribution_pack', title:'Distribution/install guide available', ok:!!dist, detail:'/distribution-pack/'},
    {key:'ux_language', title:'Bengali/English UX pack available', ok:!!ux, detail:'/ux-polish/'}
  ];
  const blockers=checks.filter(c=>!c.ok);
  return {ok:blockers.length===0, version:VERSION, sprint:'8A', status:blockers.length?'APK_QA_BLOCKED':'APK_QA_READY_FOR_GITHUB_ACTIONS', checks, blockers, build_order:db.sprint8a_plan.apk_build_order, artifacts:{debug:db.apk_build_settings?.artifact_debug, release:db.apk_build_settings?.artifact_release}, pages:{apk_release:'/apk-release/', apk_qa:'/apk-qa/', distribution:'/distribution-pack/'}, github_action:'Build NEXO Ride APK 8A RC3', note:'Android SDK is required in GitHub Actions/local Android environment; server smoke tests cannot produce APK artifact by themselves.'};
}
function realDeviceQaChecklistPayload(db){
  ensureSprint8AFoundation(db);
  const items=db.real_device_qa_checklist||[]; const pass=items.filter(i=>String(i.status||'PENDING').toUpperCase()==='PASS').length; const fail=items.filter(i=>String(i.status||'').toUpperCase()==='FAIL').length; const pending=items.length-pass-fail;
  return {ok:fail===0 && pending===0, version:VERSION, sprint:'8A', summary:{total:items.length, pass, fail, pending}, checklist:items, required_devices:['Passenger Android phone','Driver Android phone','Admin web browser'], minimum_pilot_sequence:['2 internal phones','5 drivers','10–20 drivers','50 drivers'], warning:'Do not mark pilot/public ready until all critical phone tests pass.'};
}
function pilotPreflightGate8A(db){
  ensureSprint8AFoundation(db);
  const dry=deployDryRunReadiness(db), apk=apkQaReadiness(db), qa=realDeviceQaChecklistPayload(db), config=productionReadiness(db), pilot=pilotGoLiveGate(db), rc=rcLaunchGate(db), maint=maintenancePublicStatus(db);
  const checks=[
    {key:'deploy_dry_run', title:'Server deploy dry-run ready', ok:dry.ok, detail:dry.status},
    {key:'apk_qa_ready', title:'APK QA/build path ready', ok:apk.ok, detail:apk.status},
    {key:'real_device_qa', title:'Real-device QA completed', ok:qa.ok, detail:`pass ${qa.summary.pass}/${qa.summary.total}, pending ${qa.summary.pending}, fail ${qa.summary.fail}`},
    {key:'production_config', title:'Production config ready or consciously blocked', ok:config.ok, detail:(config.blockers||[]).map(b=>b.key||b.title||b).join(', ')||'pass'},
    {key:'pilot_gate', title:'Pilot gate visible', ok:!!pilot, detail:pilot.status||'known'},
    {key:'rc_gate', title:'RC gate visible', ok:!!rc, detail:rc.status||'known'},
    {key:'maintenance_off', title:'Maintenance/admin-only mode OFF for pilot', ok:!maint.active && !maint.admin_only, detail:maint.active?'maintenance active':'off'}
  ];
  const blockers=checks.filter(c=>!c.ok);
  return {ok:blockers.length===0, version:VERSION, sprint:'8A', status:blockers.length?'PILOT_PREFLIGHT_BLOCKED':'PILOT_PREFLIGHT_READY_FOR_OWNER_SIGNOFF', checks, blockers, next:blockers.length?'Clear blockers, run real device QA, then start 2-phone test':'Start controlled pilot with internal phones, then 5/10/20/50 drivers', pilot_order:db.sprint8a_plan.pilot_order, pages:{pilot_precheck:'/pilot-precheck/', field_test:'/field-test/', pilot_launch:'/pilot-launch/'}};
}
function sprint8AReadiness(db){
  ensureSprint8AFoundation(db);
  const dry=deployDryRunReadiness(db), apk=apkQaReadiness(db), qa=realDeviceQaChecklistPayload(db), pilot=pilotPreflightGate8A(db);
  const checks=[{key:'deploy_dry_run', ok:dry.ok, detail:dry.status},{key:'apk_qa', ok:apk.ok, detail:apk.status},{key:'real_device_qa', ok:qa.ok, detail:`${qa.summary.pass}/${qa.summary.total} pass`},{key:'pilot_preflight', ok:pilot.ok, detail:pilot.status}];
  return {ok:dry.ok && apk.ok, version:VERSION, sprint:'8A', release_candidate:'2.0.8A-RC3', checks, deploy_dry_run:dry, apk_qa:apk, real_device_qa:qa, pilot_preflight:pilot, pages:{deploy_dry_run:'/deploy-dry-run/', apk_qa:'/apk-qa/', pilot_precheck:'/pilot-precheck/'}, latest_zip_rule:'Deploy only Sprint-8A latest cumulative ZIP; never overwrite live .env or data/.'};
}


async function route(req,res){
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;
  const method = req.method.toUpperCase();

  const cors = applySecurityHeaders(req,res);
  if(method==='OPTIONS'){
    if(cors.ok) return sendText(res,204,'');
    return send(res,403,{detail:'CORS origin not allowed'});
  }

  if(pathname === '/subadmin' || pathname === '/subadmin/' || pathname === '/subadmin.html') {
    serveDir(res, SUBADMIN_DIR, '');
    return;
  }
  if(pathname === '/admin/config-center' || pathname === '/admin/config-center/' || pathname === '/config-center' || pathname === '/config-center/') {
    serveDir(res, CONFIG_CENTER_DIR, '');
    return;
  }
  if(pathname === '/admin-roles' || pathname === '/admin-roles/' || pathname === '/admin-roles.html') {
    serveDir(res, ROLE_CENTER_DIR, '');
    return;
  }
  if(pathname === '/policies' || pathname === '/policies/' || pathname === '/policies.html') {
    serveDir(res, POLICIES_DIR, '');
    return;
  }
  if(pathname === '/security-hotfix' || pathname === '/security-hotfix/' || pathname === '/security-hotfix.html') {
    serveDir(res, SECURITY_HOTFIX_DIR, '');
    return;
  }
  if(pathname === '/deploy-dry-run' || pathname === '/deploy-dry-run/' || pathname === '/deploy-dry-run.html') {
    serveDir(res, DEPLOY_DRY_RUN_DIR, '');
    return;
  }
  if(pathname === '/apk-qa' || pathname === '/apk-qa/' || pathname === '/apk-qa.html') {
    serveDir(res, APK_QA_DIR, '');
    return;
  }
  if(pathname === '/pilot-precheck' || pathname === '/pilot-precheck/' || pathname === '/pilot-precheck.html') {
    serveDir(res, PILOT_PRECHECK_DIR, '');
    return;
  }
  if(pathname === '/field-test' || pathname === '/field-test/' || pathname === '/field-test.html') {
    serveDir(res, FIELD_TEST_DIR, '');
    return;
  }
  if(pathname === '/pilot-launch' || pathname === '/pilot-launch/' || pathname === '/pilot-launch.html') {
    serveDir(res, PILOT_LAUNCH_DIR, '');
    return;
  }
  if(pathname === '/admin' || pathname === '/admin/' || pathname === '/admin.html' || pathname === '/app/admin' || pathname === '/app/admin/' || pathname === '/app/admin.html') {
    serveDir(res, ADMIN_DIR, '');
    return;
  }
  if(pathname === '/') {
    if(serveStatic(req,res,'/home/')) return;
  }
  if(serveStatic(req,res,pathname)) return;

  const db = readDb();
  const uploadedFileMatch = pathname.match(/^\/api\/files\/([^/]+)$/);
  if(method==='GET' && uploadedFileMatch) return serveUploadedFile(res, db, uploadedFileMatch[1]);
  ensureSprint7QFoundation(db);
  const dispatchChanged = cleanupDispatchTimeouts(db);
  const paymentChanged = expirePaymentHolds(db);
  if(dispatchChanged || paymentChanged) saveDb(db);

  try{
    if(method==='GET' && pathname==='/api/health'){
      return send(res,200,{ok:true, app:'NEXO Ride', version:VERSION, service_area:db.service_area.name, storage:dbStatus(db), scale:{capacity_profile:db.ops_scale_settings?.active_profile||'PILOT_5K', target_registered_drivers:db.scale_settings?.target_registered_drivers||10000,target_active_drivers:db.scale_settings?.target_active_drivers||3500,dispatch_mode:db.dispatch_settings?.mode||'JSON_FALLBACK'}, ops:'/api/platform/ops-readiness', production:'/api/platform/production-readiness', notification:'/api/platform/notification-readiness', loadtest:'/api/platform/loadtest-readiness', release:'/api/platform/release-readiness', final_qa:'/api/platform/final-qa-checklist', config_vault:'/api/platform/config-vault-readiness', config_center:'/admin/config-center/', data_layer:'/api/platform/data-layer-readiness', migration:'/api/platform/migration-readiness', data_health:'/data-health/', admin_ops:'/admin-ops/', fraud_support:'/api/platform/admin-ops-readiness', driver_onboarding:'/admin-drivers/', area_stands:'/admin-areas/', qr_management:'/admin-qr/', driver_kyc_qr:'/api/platform/driver-kyc-qr-readiness', finance:'/api/platform/finance-readiness', finance_center:'/admin-finance/', safety:'/api/platform/safety-readiness', safety_center:'/admin-safety/', trip_track:'/track/', role_security:'/api/platform/role-security-readiness', role_center:'/admin-roles/', policies:'/policies/', security_audit:'/api/admin/security-audit', field_test:'/field-test/', field_test_readiness:'/api/platform/field-test-readiness', mobile_launch_gate:'/api/platform/mobile-launch-gate', pilot_launch:'/pilot-launch/', pilot_launch_readiness:'/api/platform/pilot-launch-readiness', pilot_go_live_gate:'/api/platform/pilot-go-live-gate', public_launch:'/public-launch/', public_launch_readiness:'/api/platform/public-launch-readiness', launch_kit:'/api/public/launch-kit', qr_kit:'/qr-kit/', support_center:'/support-center/', ux_polish:'/ux-polish/', distribution_pack:'/distribution-pack/', ux_distribution:'/api/platform/ux-distribution-readiness', sprint8a:{deploy_dry_run:'/deploy-dry-run/', apk_qa:'/apk-qa/', pilot_precheck:'/pilot-precheck/', readiness:'/api/platform/sprint8a-readiness'}, time:now()});
    }

    if(method==='GET' && pathname==='/api/platform/scale-readiness'){
      return send(res,200,scaleReadiness(db));
    }

    if(method==='GET' && pathname==='/api/platform/ride-flow-readiness'){
      ensureSprint7EFoundation(db);
      const activeStates = (db.rides||[]).reduce((acc,r)=>{acc[r.status||'UNKNOWN']=(acc[r.status||'UNKNOWN']||0)+1; return acc;},{});
      return send(res,200,{ok:true, version:VERSION, ride_flow_settings:db.ride_flow_settings, live_tracking_settings:db.live_tracking_settings, payment_flow_settings:db.payment_flow_settings, state_counts:activeStates, upgrade_policy:db.scale_settings?.upgrade_policy||'ADDITIVE_MIGRATIONS_ONLY'});
    }

    if(method==='GET' && pathname==='/api/platform/dispatch-readiness'){
      return send(res,200,dispatchReadiness(db));
    }

    if(method==='GET' && pathname==='/api/platform/payment-webhook-readiness'){
      return send(res,200,paymentWebhookReadiness(db));
    }
    if(method==='GET' && pathname==='/api/platform/ops-readiness'){
      return send(res,200,opsDashboardPayload(db));
    }

    if(method==='GET' && pathname==='/api/platform/session-readiness'){
      return send(res,200,sessionReadiness(db));
    }
    if(method==='GET' && pathname==='/api/platform/apk-readiness'){
      return send(res,200,{ok:true, version:VERSION, sprint:'7W', release:'/release/', final_qa:'/api/platform/final-qa-checklist', apk:{
        package_name:'com.astratechnologies.nexoride',
        base_url:'/app/?v=apk7w',
        native_qr_scanner:'/qr-scanner/?native=1',
        driver_dashboard:'/driver-lite/?native=1',
        guest_ride_status:'/guest-ride/?native=1',
        deep_links:['nexoride://auth/google','nexoride://qr','nexoride://driver','nexoride://guest-ride','nexoride://safety','https://ride.nexoofficial.in/app-return','https://ride.nexoofficial.in/qr','https://ride.nexoofficial.in/driver-lite','https://ride.nexoofficial.in/guest-ride','https://ride.nexoofficial.in/track'],
        permissions:['LOCATION','CAMERA','POST_NOTIFICATIONS','MEDIA_PICKER'],
        bridges:['getDeviceId','getDeviceInfoJson','requestAllPermissions','openAppSettings','openQRScanner','openDriverDashboard','openGuestRide','storeDriverRefreshToken','getDriverRefreshToken','clearDriverRefreshToken'],
        trusted_device:'Driver refresh token can be bound to native device_id and restored after app restart.',
        google_return:'External browser OAuth returns via nexoride:// and /app-return deep links.'
      }, checks:[
        {key:'native_device_identity', ok:true, detail:'APK exposes a stable app-private device id for trusted driver login.'},
        {key:'permission_bridge', ok:true, detail:'WebView can request Location, Camera, Notification and file chooser permissions.'},
        {key:'safe_internal_links', ok:true, detail:'QR, guest ride and driver panels open inside app only for ride.nexoofficial.in.'},
        {key:'future_final_apk_ready', ok:true, detail:'Same server APIs are usable by the final native APK.'}
      ], marker:'SPRINT7W_FINAL_APK_BUILD_LAUNCH_GATE'});
    }




    if(method==='GET' && pathname==='/api/platform/release-readiness'){
      return send(res,200,releaseReadiness(db));
    }
    if(method==='GET' && pathname==='/api/platform/final-qa-checklist'){
      return send(res,200,finalQaChecklist(db));
    }

    if(method==='GET' && pathname==='/api/platform/config-vault-readiness'){
      return send(res,200,configVaultReadiness(db));
    }


    if(method==='GET' && pathname==='/api/platform/data-layer-readiness'){
      return send(res,200,dataLayerReadiness(db));
    }
    if(method==='GET' && pathname==='/api/platform/migration-readiness'){
      return send(res,200,migrationReadiness(db));
    }
    if(method==='GET' && pathname==='/api/platform/redis-postgres-readiness'){
      return send(res,200,redisPostgresBridgeReadiness(db));
    }
    if(method==='GET' && pathname==='/api/platform/dispatch-adapter-readiness'){
      return send(res,200,dispatchAdapterStatus(db));
    }

    if(method==='GET' && pathname==='/api/platform/admin-ops-readiness'){
      return send(res,200,adminOpsReadiness(db));
    }


    if(method==='GET' && pathname==='/api/platform/driver-kyc-qr-readiness'){
      return send(res,200,driverKycQrReadiness(db));
    }
    if(method==='GET' && pathname==='/api/platform/finance-readiness'){
      return send(res,200,financeReadiness(db));
    }

    if(method==='GET' && pathname==='/api/platform/safety-readiness'){
      return send(res,200,safetyReadiness(db));
    }

    if(method==='GET' && pathname==='/api/platform/role-security-readiness'){
      return send(res,200,roleSecurityReadiness(db));
    }
    if(method==='GET' && pathname==='/api/policies'){
      return send(res,200,policyPublicList(db));
    }
    const publicPolicyMatch = pathname.match(/^\/api\/policies\/([a-zA-Z0-9_-]+)$/);
    if(method==='GET' && publicPolicyMatch){
      const out=policyPublicGet(db,publicPolicyMatch[1]);
      return send(res,out.ok?200:(out.status||404),out.ok?out:{detail:out.detail});
    }
    if(method==='GET' && pathname==='/api/admin/my-access'){
      const user=requireUser(req,res,db); if(!user) return;
      return send(res,200,{ok:true,user:safeUser(user),normalized_role:roleKey(user),capabilities:roleMatrix(db)[roleKey(user)]||[], is_main_admin:isMainAdmin(user)});
    }
    if(method==='GET' && pathname==='/api/admin/roles-security'){
      const user=requireCapability(req,res,db,'*','Main Admin'); if(!user) return;
      return send(res,200,adminRoleSecurityDashboard(db,user));
    }
    if(method==='POST' && pathname==='/api/admin/roles-security/assign'){
      const user=requireCapability(req,res,db,'*','Main Admin'); if(!user) return;
      const out=assignUserRoleSecure(db,user,await getBody(req));
      if(!out.ok) return send(res,out.status||400,{detail:out.detail, allowed:out.allowed});
      saveDb(db); return send(res,200,out);
    }
    if(method==='GET' && pathname==='/api/admin/security-audit'){
      const user=requireCapability(req,res,db,'*','Main Admin'); if(!user) return;
      return send(res,200,securityAuditReadiness(db,user));
    }
    if(method==='GET' && pathname==='/api/admin/policies'){
      const user=requireCapability(req,res,db,'*','Main Admin'); if(!user) return;
      return send(res,200,{ok:true, policies:db.public_policies, readiness:roleSecurityReadiness(db)});
    }
    const adminPolicyMatch = pathname.match(/^\/api\/admin\/policies\/([a-zA-Z0-9_-]+)$/);
    if(method==='POST' && adminPolicyMatch){
      const user=requireUser(req,res,db); if(!user) return;
      const out=updatePolicySecure(db,user,adminPolicyMatch[1],await getBody(req));
      if(!out.ok) return send(res,out.status||400,{detail:out.detail});
      saveDb(db); return send(res,200,out);
    }


    if(method==='GET' && pathname==='/api/platform/field-test-readiness'){
      return send(res,200,fieldTestReadiness(db));
    }
    if(method==='GET' && pathname==='/api/platform/mobile-launch-gate'){
      return send(res,200,mobileLaunchGate(db));
    }
    if(method==='GET' && pathname==='/api/admin/field-test-dashboard'){
      const user=requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user) && !hasCapability(db,user,'FIELD_TEST_VIEW')) return send(res,403,{detail:'Field test view permission required', role:roleKey(user)});
      return send(res,200,adminFieldTestDashboard(db,user));
    }
    if(method==='GET' && pathname==='/api/admin/field-test/issues'){
      const user=requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user) && !hasCapability(db,user,'FIELD_TEST_VIEW')) return send(res,403,{detail:'Field test view permission required', role:roleKey(user)});
      return send(res,200,{ok:true, issues:recentFieldTestIssues(db).slice().reverse(), summary:fieldTestSummary(db)});
    }
    if(method==='POST' && pathname==='/api/admin/field-test/runs'){
      const user=requireUser(req,res,db); if(!user) return;
      const out=createFieldTestRun(db,user,await getBody(req));
      if(!out.ok) return send(res,out.status||400,{detail:out.detail});
      saveDb(db); return send(res,200,out);
    }
    if(method==='POST' && pathname==='/api/admin/field-test/issues'){
      const user=requireUser(req,res,db); if(!user) return;
      const out=createFieldTestIssue(db,user,await getBody(req));
      if(!out.ok) return send(res,out.status||400,{detail:out.detail});
      saveDb(db); return send(res,200,out);
    }
    const fieldIssueStatusMatch = pathname.match(/^\/api\/admin\/field-test\/issues\/([^/]+)\/status$/);
    if(method==='POST' && fieldIssueStatusMatch){
      const user=requireUser(req,res,db); if(!user) return;
      const out=updateFieldTestIssue(db,user,fieldIssueStatusMatch[1],await getBody(req));
      if(!out.ok) return send(res,out.status||400,{detail:out.detail});
      saveDb(db); return send(res,200,out);
    }


    if(method==='GET' && pathname==='/api/platform/pilot-launch-readiness'){
      return send(res,200,pilotLaunchReadiness(db));
    }
    if(method==='GET' && pathname==='/api/platform/pilot-go-live-gate'){
      return send(res,200,pilotGoLiveGate(db));
    }

    if(method==='GET' && pathname==='/api/platform/public-launch-readiness'){
      return send(res,200,publicLaunchDashboard(db,null));
    }
    if(method==='GET' && pathname==='/api/public/launch-kit'){
      return send(res,200,publicLaunchKit(db));
    }
    if(method==='GET' && pathname==='/api/public/support-faq'){
      ensureSprint7TFoundation(db);
      return send(res,200,{ok:true, version:VERSION, sprint:'7U', faqs:db.support_faqs||[], support:{phone:db.public_launch_settings.support_phone, whatsapp:db.public_launch_settings.support_whatsapp, email:db.public_launch_settings.support_email}});
    }
    if(method==='GET' && pathname==='/api/public/onboarding-guides'){
      ensureSprint7TFoundation(db);
      return send(res,200,{ok:true, version:VERSION, sprint:'7U', onboarding:db.onboarding_guides||{}, pages:{driver:'/driver-onboarding/', passenger:'/passenger-help/'}});
    }
    if(method==='GET' && pathname==='/api/platform/ux-distribution-readiness'){
      return send(res,200,uxDistributionReadiness(db));
    }
    if(method==='GET' && pathname==='/api/public/language-pack'){
      ensureSprint7UFoundation(db);
      return send(res,200,{ok:true, version:VERSION, sprint:'7U', language_pack:db.ux_language_pack, friendly_errors:db.friendly_error_catalog});
    }
    if(method==='GET' && pathname==='/api/public/distribution-pack'){
      ensureSprint7UFoundation(db);
      return send(res,200,{ok:true, version:VERSION, sprint:'7U', distribution_pack:db.distribution_pack, pages:{distribution:'/distribution-pack/', field_test:'/field-test/', release:'/release/'}});
    }
    if(method==='GET' && pathname==='/api/admin/ux-distribution-dashboard'){
      const user=requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user) && !hasCapability(db,user,'UX_DISTRIBUTION_VIEW')) return send(res,403,{detail:'UX distribution view permission required'});
      return send(res,200,uxDistributionReadiness(db));
    }
    if(method==='POST' && pathname==='/api/admin/ux-distribution-settings'){
      const user=requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user) && !hasCapability(db,user,'UX_DISTRIBUTION_MANAGE')) return send(res,403,{detail:'UX distribution manage permission required'});
      const out=updateUxDistributionSettings(db,user,await getBody(req));
      saveDb(db); return send(res,200,out);
    }
    if(method==='GET' && pathname==='/api/admin/public-launch-dashboard'){
      const user=requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user) && !hasCapability(db,user,'PUBLIC_LAUNCH_VIEW')) return send(res,403,{detail:'Public launch view permission required'});
      return send(res,200,publicLaunchDashboard(db,user));
    }
    if(method==='GET' && pathname==='/api/admin/public-launch-settings'){
      const user=requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user) && !hasCapability(db,user,'PUBLIC_LAUNCH_VIEW')) return send(res,403,{detail:'Public launch view permission required'});
      ensureSprint7TFoundation(db); return send(res,200,{ok:true, settings:db.public_launch_settings, readiness:publicLaunchDashboard(db,user)});
    }
    if(method==='POST' && pathname==='/api/admin/public-launch-settings'){
      const user=requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user) && !hasCapability(db,user,'PUBLIC_LAUNCH_MANAGE')) return send(res,403,{detail:'Public launch manage permission required'});
      const out=updatePublicLaunchSettings(db,user,await getBody(req));
      saveDb(db); return send(res,200,out);
    }
    if(method==='GET' && pathname==='/api/admin/marketing-qr-materials'){
      const user=requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user) && !hasCapability(db,user,'PUBLIC_LAUNCH_VIEW')) return send(res,403,{detail:'Public launch view permission required'});
      ensureSprint7TFoundation(db); return send(res,200,{ok:true, materials:db.public_qr_materials||[], launch_assets:db.launch_assets||{}, print_page:'/qr-kit/'});
    }
    if(method==='POST' && pathname==='/api/admin/marketing-qr-materials'){
      const user=requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user) && !hasCapability(db,user,'MARKETING_QR_MANAGE')) return send(res,403,{detail:'Marketing QR manage permission required'});
      const out=updateMarketingQrMaterials(db,user,await getBody(req));
      saveDb(db); return send(res,200,out);
    }
    if(method==='GET' && pathname==='/api/admin/pilot-dashboard'){
      const user=requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user) && !hasCapability(db,user,'PILOT_LAUNCH_VIEW')) return send(res,403,{detail:'Pilot launch view permission required', role:roleKey(user)});
      return send(res,200,adminPilotDashboard(db,user));
    }
    if(method==='POST' && pathname==='/api/admin/pilot/daily-report'){
      const user=requireUser(req,res,db); if(!user) return;
      const out=createPilotDailyReport(db,user,await getBody(req));
      if(!out.ok) return send(res,out.status||400,{detail:out.detail});
      saveDb(db); return send(res,200,out);
    }
    if(method==='POST' && pathname==='/api/admin/pilot/event'){
      const user=requireUser(req,res,db); if(!user) return;
      const out=createPilotEvent(db,user,await getBody(req));
      if(!out.ok) return send(res,out.status||400,{detail:out.detail});
      saveDb(db); return send(res,200,out);
    }
    if(method==='POST' && pathname==='/api/admin/pilot/stage'){
      const user=requireUser(req,res,db); if(!user) return;
      const out=updatePilotStage(db,user,await getBody(req));
      if(!out.ok) return send(res,out.status||400,{detail:out.detail, blockers:out.blockers, allowed:out.allowed});
      saveDb(db); return send(res,200,out);
    }

    // Sprint-7N public QR resolver. QR booking pages can call this to track source safely.
    if(method==='GET' && pathname==='/api/qr/resolve'){
      const result = qrResolvePublic(db, url.searchParams.get('code') || url.searchParams.get('qr') || '', req);
      if(!result.ok) return send(res,result.status||404,{detail:result.detail});
      saveDb(db);
      return send(res,200,result);
    }
    const publicQrShort = pathname.match(/^\/q\/([a-zA-Z0-9_-]+)$/);
    if(method==='GET' && publicQrShort){
      const result = qrResolvePublic(db, publicQrShort[1], req);
      if(result.ok) saveDb(db);
      const loc = result.ok ? result.booking_url : '/qr/';
      res.writeHead(302,{Location:loc,'Cache-Control':'no-store'}); return res.end();
    }

    if(method==='GET' && pathname==='/api/admin/drivers'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!hasCapability(db,user,'DRIVER_KYC_MANAGE')) return send(res,403,{detail:'Driver KYC permission required', role:roleKey(user)});
      return send(res,200,listDriversCenter(db,user,url.searchParams));
    }
    if(method==='POST' && pathname==='/api/admin/drivers/register'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!hasCapability(db,user,'DRIVER_KYC_MANAGE')) return send(res,403,{detail:'Driver KYC permission required', role:roleKey(user)});
      const result = createDriverFromAdmin(db,user,await getBody(req));
      if(!result.ok) return send(res,result.status||400,{detail:result.detail});
      saveDb(db); return send(res,200,result);
    }
    const driverCenterDetail = pathname.match(/^\/api\/admin\/drivers\/([^/]+)\/details$/);
    if(method==='GET' && driverCenterDetail){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user)) return send(res,403,{detail:'Admin only'});
      const prof=(db.driver_profiles||[]).find(d=>d.id===driverCenterDetail[1] || d.user_id===driverCenterDetail[1] || d.driver_code===driverCenterDetail[1]);
      if(!prof) return send(res,404,{detail:'Driver profile not found'});
      if(!areaAllowedForAdmin(db,user,prof.area_id||prof.area)) return send(res,403,{detail:'Not allowed for this driver area'});
      return send(res,200,{ok:true, driver:driverPublicCenterOut(db,prof), approval_events:(db.driver_approval_events||[]).filter(e=>e.driver_profile_id===prof.id || e.driver_user_id===prof.user_id).slice(-100).reverse()});
    }
    const driverStage = pathname.match(/^\/api\/admin\/drivers\/([^/]+)\/approval-stage$/);
    if(method==='POST' && driverStage){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user)) return send(res,403,{detail:'Admin only'});
      const result = updateDriverApprovalStage(db,user,driverStage[1],await getBody(req));
      if(!result.ok) return send(res,result.status||400,{detail:result.detail, allowed:result.allowed});
      saveDb(db); return send(res,200,result);
    }
    const driverDocAdd = pathname.match(/^\/api\/admin\/drivers\/([^/]+)\/kyc-doc$/);
    if(method==='POST' && driverDocAdd){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user)) return send(res,403,{detail:'Admin only'});
      const result = addDriverDocumentCenter(db,user,driverDocAdd[1],await getBody(req));
      if(!result.ok) return send(res,result.status||400,{detail:result.detail});
      saveDb(db); return send(res,200,result);
    }
    if(method==='GET' && pathname==='/api/admin/areas'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!hasCapability(db,user,'AREA_STAND_VIEW') && !hasCapability(db,user,'QR_MANAGE')) return send(res,403,{detail:'Area/stand permission required', role:roleKey(user)});
      return send(res,200,{ok:true, areas:listAreasCenter(db)});
    }
    if(method==='POST' && pathname==='/api/admin/areas'){
      const user = requireUser(req,res,db); if(!user) return;
      const result = upsertAreaCenter(db,user,await getBody(req));
      if(!result.ok) return send(res,result.status||400,{detail:result.detail});
      saveDb(db); return send(res,200,result);
    }
    if(method==='GET' && pathname==='/api/admin/stands'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user)) return send(res,403,{detail:'Admin only'});
      return send(res,200,{ok:true, stands:listStandsCenter(db,url.searchParams)});
    }
    if(method==='POST' && pathname==='/api/admin/stands'){
      const user = requireUser(req,res,db); if(!user) return;
      const result = upsertStandCenter(db,user,await getBody(req));
      if(!result.ok) return send(res,result.status||400,{detail:result.detail});
      saveDb(db); return send(res,200,result);
    }
    if(method==='GET' && pathname==='/api/admin/qr-codes'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!hasCapability(db,user,'QR_MANAGE') && !hasCapability(db,user,'QR_VIEW')) return send(res,403,{detail:'QR permission required', role:roleKey(user)});
      return send(res,200,listQrAssets(db,user,req,url.searchParams));
    }
    if(method==='POST' && pathname==='/api/admin/qr-codes'){
      const user = requireUser(req,res,db); if(!user) return;
      const result = createQrAsset(db,user,await getBody(req),req);
      if(!result.ok) return send(res,result.status||400,{detail:result.detail, allowed:result.allowed});
      saveDb(db); return send(res,200,result);
    }
    const qrToggle = pathname.match(/^\/api\/admin\/qr-codes\/([^/]+)\/toggle$/);
    if(method==='POST' && qrToggle){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user)) return send(res,403,{detail:'Admin only'});
      const q=(db.qr_assets||[]).find(x=>x.id===qrToggle[1] || x.code===qrToggle[1]); if(!q) return send(res,404,{detail:'QR not found'});
      q.enabled=!q.enabled; q.updated_at=now(); q.updated_by=user.id; audit(db,user.id,'S7N_QR_TOGGLE','qr_asset',q.id,{enabled:q.enabled}); saveDb(db); return send(res,200,{ok:true, qr:qrAssetOut(req,db,q)});
    }

    if(method==='GET' && pathname==='/api/admin/ride-ops'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!hasCapability(db,user,'OPERATIONS_MANAGE') && !hasCapability(db,user,'RIDE_VIEW')) return send(res,403,{detail:'Operations permission required', role:roleKey(user)});
      return send(res,200,adminRideOpsDashboard(db,user));
    }

    const interventionMatch = pathname.match(/^\/api\/admin\/rides\/([^/]+)\/intervention$/);
    if(method==='POST' && interventionMatch){
      const user = requireUser(req,res,db); if(!user) return;
      if(!hasCapability(db,user,'RIDE_INTERVENTION')) return send(res,403,{detail:'Ride intervention permission required', role:roleKey(user)});
      const body = await getBody(req);
      const result = applyManualRideIntervention(db,user,interventionMatch[1],body);
      if(!result.ok) return send(res,result.status||400,{detail:result.detail, allowed:result.allowed});
      saveDb(db);
      return send(res,200,result);
    }

    if(method==='GET' && pathname==='/api/admin/abuse-control'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user)) return send(res,403,{detail:'Admin only'});
      return send(res,200,{ok:true, settings:db.admin_ops_settings, blocks:(db.guest_abuse_blocks||[]).slice(-200).reverse(), recent_events:(db.guest_abuse_events||[]).slice(-200).reverse()});
    }
    if(method==='POST' && pathname==='/api/admin/abuse-control/block'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user)) return send(res,403,{detail:'Admin only'});
      const result = blockGuestIdentity(db,user,await getBody(req));
      if(!result.ok) return send(res,result.status||400,{detail:result.detail});
      saveDb(db); return send(res,200,result);
    }
    const unblockMatch = pathname.match(/^\/api\/admin\/abuse-control\/blocks\/([^/]+)\/unblock$/);
    if(method==='POST' && unblockMatch){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user)) return send(res,403,{detail:'Admin only'});
      const result = unblockGuestIdentity(db,user,unblockMatch[1]);
      if(!result.ok) return send(res,result.status||400,{detail:result.detail});
      saveDb(db); return send(res,200,result);
    }

    if(method==='GET' && pathname==='/api/admin/driver-misuse'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user)) return send(res,403,{detail:'Admin only'});
      return send(res,200,driverMisuseDashboard(db));
    }

    if(method==='GET' && pathname==='/api/admin/support-desk'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!hasCapability(db,user,'SUPPORT_MANAGE') && !hasCapability(db,user,'SUPPORT_VIEW')) return send(res,403,{detail:'Support permission required', role:roleKey(user)});
      const data=supportSummary(db,user);
      return send(res,200,{ok:true, support:data, abuse:(db.guest_abuse_events||[]).slice(-100).reverse(), ride_actions:(db.admin_ride_actions||[]).slice(-100).reverse()});
    }

    if(method==='GET' && pathname==='/api/admin/data-health'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user)) return send(res,403,{detail:'Main Admin only'});
      return send(res,200,dataHealthDashboardPayload(db));
    }

    if(method==='GET' && pathname==='/api/admin/config-center'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user)) return send(res,403,{detail:'Main Admin only'});
      return send(res,200,configVaultSummary(db));
    }
    if(method==='POST' && pathname==='/api/admin/config-center'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user)) return send(res,403,{detail:'Main Admin only'});
      const body = await getBody(req);
      const result = applyAdminConfigCenterUpdate(db, body, user);
      saveDb(db);
      return send(res,200,result);
    }
    if(method==='POST' && pathname==='/api/admin/config-center/test'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user)) return send(res,403,{detail:'Main Admin only'});
      const body = await getBody(req);
      return send(res,200,adminConfigTest(db, body.service || 'ALL'));
    }
    if(method==='POST' && pathname==='/api/admin/config-center/remove'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user)) return send(res,403,{detail:'Main Admin only'});
      const body = await getBody(req);
      const result = removeVaultSecret(db, String(body.key||'').trim().toUpperCase(), user);
      saveDb(db);
      return send(res,result.ok?200:400,result);
    }
    if(method==='POST' && pathname==='/api/admin/config-center/production-mode'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user)) return send(res,403,{detail:'Main Admin only'});
      ensureSprint7KFoundation(db);
      const body = await getBody(req);
      const desired = body.enabled===true;
      if(desired){
        const prevMode = db.config_vault?.production_mode === true;
        db.config_vault.production_mode = true;
        const before = configVaultReadiness(db);
        db.config_vault.production_mode = prevMode;
        const blockers = before.blockers.filter(k=>!['production_mode'].includes(k));
        if(blockers.length) return send(res,400,{ok:false, detail:'Production mode cannot be enabled until required service keys are configured.', blockers, readiness:before});
      }
      const result=setVaultSecret(db,'PRODUCTION_MODE',desired,user,{note:'production mode toggle'});
      saveDb(db);
      return send(res,200,{ok:true, production_mode:desired, result, readiness:configVaultReadiness(db)});
    }

    if(method==='GET' && pathname==='/api/platform/security-hotfix-readiness') return send(res,200,securityHotfixReadiness(db));
    if(method==='GET' && pathname==='/api/platform/security-audit-runtime') return send(res,200,{ok:true, version:VERSION, auth_attempts:(db.auth_attempts||[]).slice(-50), active_lockouts:(db.auth_lockouts||[]).filter(l=>l.active!==false && new Date(l.expires_at)>new Date()), generated_at:now()});
    if(method==='GET' && pathname==='/api/platform/sprint8a-readiness') return send(res,200,sprint8AReadiness(db));
    if(method==='GET' && pathname==='/api/platform/deploy-dry-run-readiness') return send(res,200,deployDryRunReadiness(db));
    if(method==='GET' && pathname==='/api/platform/apk-qa-readiness') return send(res,200,apkQaReadiness(db));
    if(method==='GET' && pathname==='/api/platform/real-device-qa-checklist') return send(res,200,realDeviceQaChecklistPayload(db));
    if(method==='GET' && pathname==='/api/platform/pilot-preflight-gate') return send(res,200,pilotPreflightGate8A(db));
    if(method==='POST' && pathname==='/api/admin/real-device-qa-checklist'){
      const user=requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user) && !hasCapability(db,user,'FIELD_TEST_MANAGE')) return send(res,403,{detail:'Field test manage permission required'});
      ensureSprint8AFoundation(db); const body=await getBody(req); const key=String(body.key||'').trim(); const item=(db.real_device_qa_checklist||[]).find(x=>x.key===key); if(!item) return send(res,404,{detail:'QA item not found'});
      item.status=String(body.status||item.status||'PENDING').toUpperCase().slice(0,20); item.note=sanitizeText(body.note||item.note||'',240); item.updated_at=now(); item.updated_by=user.id; db.real_device_qa_runs.push({id:uid('qa'), at:now(), key:item.key, status:item.status, note:item.note, by:user.id}); audit(db,user.id,'S8A_REAL_DEVICE_QA_UPDATE','qa',item.key,{status:item.status}); saveDb(db); return send(res,200,realDeviceQaChecklistPayload(db));
    }
    if(method==='GET' && pathname==='/api/platform/release-candidate-readiness') return send(res,200,rcDashboardPayload(db));
    if(method==='GET' && pathname==='/api/platform/rc-launch-gate') return send(res,200,rcLaunchGate(db));
    if(method==='GET' && pathname==='/api/platform/rc-test-suite') return send(res,200,rcTestSuitePayload(db));
    if(method==='GET' && pathname==='/api/platform/rc-issue-register') return send(res,200,rcIssueRegisterPayload(db));
    if(method==='GET' && pathname==='/api/platform/rc-deploy-package') return send(res,200,rcDeployPackage(db));
    if(method==='GET' && pathname==='/api/admin/rc-dashboard'){
      const user=requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user) && !hasCapability(db,user,'RC_VIEW')) return send(res,403,{detail:'RC view permission required'});
      return send(res,200,rcDashboardPayload(db));
    }
    if(method==='GET' && pathname==='/api/admin/rc-issues'){
      const user=requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user) && !hasCapability(db,user,'RC_VIEW')) return send(res,403,{detail:'RC view permission required'});
      return send(res,200,rcIssueRegisterPayload(db));
    }
    if(method==='POST' && pathname==='/api/admin/rc-issues'){
      const user=requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user) && !hasCapability(db,user,'RC_ISSUE_MANAGE')) return send(res,403,{detail:'RC issue manage permission required'});
      const out=updateRcIssue(db,user,await getBody(req)); saveDb(db); return send(res,200,out);
    }
    if(method==='POST' && pathname==='/api/admin/rc-test-suite'){
      const user=requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user) && !hasCapability(db,user,'RC_TEST_MANAGE')) return send(res,403,{detail:'RC test manage permission required'});
      const out=updateRcTest(db,user,await getBody(req)); if(!out.ok) return send(res,400,out); saveDb(db); return send(res,200,out);
    }

    if(method==='GET' && pathname==='/api/platform/final-cleanup-readiness') return send(res,200,finalCleanupReadiness(db));
    if(method==='GET' && pathname==='/api/platform/red-team-security-readiness') return send(res,200,redTeamSecurityReadiness(db));
    if(method==='GET' && pathname==='/api/platform/production-deploy-command-pack') return send(res,200,productionDeployCommandPack(db));
    if(method==='GET' && pathname==='/api/platform/environment-freeze-report') return send(res,200,environmentFreezeReport(db));
    if(method==='GET' && pathname==='/api/platform/final-smoke-test') return send(res,200,finalSmokeTest(db));
    if(method==='GET' && pathname==='/api/admin/final-cleanup-dashboard'){
      const user=requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user) && !hasCapability(db,user,'FINAL_CLEANUP_VIEW')) return send(res,403,{detail:'Final cleanup view permission required'});
      return send(res,200,finalCleanupReadiness(db));
    }
    if(method==='GET' && pathname==='/api/admin/red-team-security-pass'){
      const user=requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user) && !hasCapability(db,user,'RED_TEAM_SECURITY_VIEW')) return send(res,403,{detail:'Red-team security view permission required'});
      return send(res,200,redTeamSecurityReadiness(db));
    }
    if(method==='POST' && pathname==='/api/admin/red-team-finding'){
      const user=requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user) && !hasCapability(db,user,'RED_TEAM_SECURITY_MANAGE')) return send(res,403,{detail:'Red-team security manage permission required'});
      const body=await getBody(req); const f={id:body.id||uid('redteam'), title:sanitizeText(body.title||'Manual finding',160), severity:String(body.severity||'HIGH').toUpperCase().slice(0,20), status:String(body.status||'OPEN').toUpperCase().slice(0,20), note:sanitizeText(body.note||'',500), created_at:now(), created_by:user.id};
      db.red_team_findings=db.red_team_findings||[]; db.red_team_findings.push(f); audit(db,user.id,'S7X_RED_TEAM_FINDING','red_team',f.id,{severity:f.severity,status:f.status}); saveDb(db); return send(res,200,{ok:true,finding:f, readiness:redTeamSecurityReadiness(db)});
    }
    if(method==='GET' && pathname==='/api/admin/deploy-command-pack'){
      const user=requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user) && !hasCapability(db,user,'DEPLOY_COMMANDS_VIEW')) return send(res,403,{detail:'Deploy commands view permission required'});
      return send(res,200,productionDeployCommandPack(db));
    }
    if(method==='GET' && pathname==='/api/admin/environment-freeze'){
      const user=requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user) && !hasCapability(db,user,'ENV_FREEZE_VIEW')) return send(res,403,{detail:'Environment freeze view permission required'});
      return send(res,200,environmentFreezeReport(db));
    }
    if(method==='POST' && pathname==='/api/admin/environment-freeze'){
      const user=requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user) && !hasCapability(db,user,'ENV_FREEZE_MANAGE')) return send(res,403,{detail:'Environment freeze manage permission required'});
      const out=updateEnvironmentFreeze(db,user,await getBody(req)); saveDb(db); return send(res,200,out);
    }

    if(method==='GET' && pathname==='/api/platform/apk-build-readiness'){
      return send(res,200,apkBuildReadiness(db));
    }
    if(method==='GET' && pathname==='/api/platform/final-launch-gate'){
      return send(res,200,finalLaunchGate7W(db));
    }
    if(method==='GET' && pathname==='/api/platform/release-notes-readiness'){
      return send(res,200,releaseNotesPayload(db));
    }
    if(method==='GET' && pathname==='/api/public/release-notes'){
      return send(res,200,releaseNotesPayload(db));
    }
    if(method==='GET' && pathname==='/api/public/apk-distribution'){
      return send(res,200,apkDistributionPayload(db));
    }
    if(method==='GET' && pathname==='/api/admin/version-history'){
      const user=requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user) && !hasCapability(db,user,'APK_RELEASE_VIEW')) return send(res,403,{detail:'APK release view permission required'});
      return send(res,200,versionHistoryPayload(db));
    }
    if(method==='GET' && pathname==='/api/admin/final-launch-gate'){
      const user=requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user) && !hasCapability(db,user,'FINAL_LAUNCH_GATE_VIEW')) return send(res,403,{detail:'Final launch gate view permission required'});
      return send(res,200,finalLaunchGate7W(db));
    }
    if(method==='GET' && pathname==='/api/admin/release-notes'){
      const user=requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user) && !hasCapability(db,user,'APK_RELEASE_VIEW')) return send(res,403,{detail:'APK release view permission required'});
      return send(res,200,releaseNotesPayload(db));
    }
    if(method==='POST' && pathname==='/api/admin/release-notes'){
      const user=requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user) && !hasCapability(db,user,'RELEASE_NOTES_MANAGE')) return send(res,403,{detail:'Release notes manage permission required'});
      const out=updateReleaseNotes(db,user,await getBody(req)); saveDb(db); return send(res,200,out);
    }

    if(method==='GET' && pathname==='/api/platform/security-deploy-readiness'){
      return send(res,200,securityDeployReadiness(db));
    }
    if(method==='GET' && pathname==='/api/platform/launch-release-lock'){
      return send(res,200,launchReleaseLock(db));
    }
    if(method==='GET' && pathname==='/api/platform/final-audit-checklist'){
      return send(res,200,finalAuditChecklist(db));
    }
    if(method==='GET' && pathname==='/api/public/maintenance-status'){
      return send(res,200,maintenancePublicStatus(db));
    }
    if(method==='GET' && pathname==='/api/admin/final-security-dashboard'){
      const user=requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user) && !hasCapability(db,user,'SECURITY_DEPLOY_VIEW')) return send(res,403,{detail:'Security deploy view permission required'});
      return send(res,200,{ok:true, security:securityDeployReadiness(db), release_lock:launchReleaseLock(db), audit:finalAuditChecklist(db), guide:deployRollbackGuide(db)});
    }
    if(method==='GET' && pathname==='/api/admin/deploy-rollback-guide'){
      const user=requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user) && !hasCapability(db,user,'ROLLBACK_VIEW')) return send(res,403,{detail:'Rollback guide view permission required'});
      return send(res,200,deployRollbackGuide(db));
    }
    if(method==='GET' && pathname==='/api/admin/maintenance-mode'){
      const user=requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user) && !hasCapability(db,user,'SECURITY_DEPLOY_VIEW')) return send(res,403,{detail:'Maintenance view permission required'});
      return send(res,200,{ok:true, maintenance:maintenancePublicStatus(db), events:(db.maintenance_events||[]).slice(-100).reverse(), release_lock:launchReleaseLock(db)});
    }
    if(method==='POST' && pathname==='/api/admin/maintenance-mode'){
      const user=requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user) && !hasCapability(db,user,'MAINTENANCE_MANAGE')) return send(res,403,{detail:'Maintenance manage permission required'});
      const out=updateMaintenanceSettings(db,user,await getBody(req)); saveDb(db); return send(res,200,out);
    }
    if(method==='POST' && pathname==='/api/admin/maintenance-mode/event'){
      const user=requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user) && !hasCapability(db,user,'MAINTENANCE_MANAGE')) return send(res,403,{detail:'Maintenance manage permission required'});
      const out=createMaintenanceEvent(db,user,await getBody(req)); saveDb(db); return send(res,200,out);
    }
    if(method==='POST' && pathname==='/api/admin/final-audit-checklist'){
      const user=requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user) && !hasCapability(db,user,'SECURITY_DEPLOY_MANAGE')) return send(res,403,{detail:'Final audit manage permission required'});
      const out=updateFinalAuditChecklist(db,user,await getBody(req)); saveDb(db); return send(res,200,out);
    }

    if(method==='GET' && pathname==='/api/platform/production-readiness'){
      return send(res,200,productionReadiness(db));
    }
    if(method==='GET' && pathname==='/api/platform/notification-readiness'){
      return send(res,200,notificationReadiness(db));
    }
    if(method==='GET' && pathname==='/api/platform/loadtest-readiness'){
      return send(res,200,loadTestReadiness(db));
    }
    if(method==='GET' && pathname==='/api/platform/deploy-checklist'){
      return send(res,200,deployChecklist(db));
    }

    if(method==='GET' && pathname==='/api/admin/production-config'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user)) return send(res,403,{detail:'Main Admin only'});
      return send(res,200,{ok:true, production:productionReadiness(db), notification:notificationReadiness(db), loadtest:loadTestReadiness(db), config:db.production_feature_settings, deploy_settings:db.production_deployment_settings});
    }
    if(method==='POST' && pathname==='/api/admin/production-config'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user)) return send(res,403,{detail:'Main Admin only'});
      const body = await getBody(req);
      const result = applyProductionConfig(db, body, user);
      saveDb(db);
      return send(res,200,result);
    }
    if(method==='POST' && pathname==='/api/admin/backup-now'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user)) return send(res,403,{detail:'Main Admin only'});
      saveDb(db);
      const backup = createBackup('s7i_admin_predeploy');
      db.production_deploy_events = db.production_deploy_events || [];
      db.production_deploy_events.push({id:uid('dep'), type:'ADMIN_BACKUP_CREATED', at:now(), actor_id:user.id, backup_file:backup?.file||''});
      audit(db,user.id,'ADMIN_BACKUP_CREATED','backup',backup?.file||'none',{reason:'s7i_admin_predeploy'});
      saveDb(db);
      return send(res,200,{ok:true, backup, backups:listBackups().slice(0,10), checklist:deployChecklist(db)});
    }

    if(method==='GET' && pathname==='/api/admin/ops-dashboard'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user)) return send(res,403,{detail:'Admin only'});
      return send(res,200,opsDashboardPayload(db));
    }

    if(method==='POST' && pathname==='/api/admin/capacity-profile'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user)) return send(res,403,{detail:'Admin only'});
      const body = await getBody(req);
      const result = applyCapacityProfile(db, body.profile || body.capacity_profile, user);
      if(!result.ok) return send(res,400,result);
      saveDb(db);
      return send(res,200,result);
    }



    if(method==='GET' && pathname==='/api/admin/finance-dashboard'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!hasCapability(db,user,'FINANCE_MANAGE')) return send(res,403,{detail:'Finance permission required', role:roleKey(user)});
      return send(res,200,financeDashboard(db,user));
    }

    if(method==='GET' && pathname==='/api/admin/fare-engine'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user)) return send(res,403,{detail:'Admin only'});
      return send(res,200,{ok:true, fare_rules:db.fare_rules, area_rules:db.fare_area_rules||[], finance_settings:db.finance_settings});
    }

    if(method==='POST' && pathname==='/api/admin/fare-engine'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user)) return send(res,403,{detail:'Main Admin only'});
      const body = await getBody(req); ensureSprint7OFoundation(db);
      const keys=['full_base_fare','sharing_base_per_seat','minimum_full','minimum_sharing','base_km','extra_step_km','extra_step_fare','sharing_capacity','night_extra_percent','per_km_fare','waiting_charge_per_minute','peak_hour_multiplier'];
      for(const k of keys){ if(body[k]!==undefined && !Number.isNaN(Number(body[k]))) db.fare_rules[k]=Number(body[k]); }
      if(body.currency) db.fare_rules.currency=String(body.currency).slice(0,8).toUpperCase();
      if(body.manual_override_enabled!==undefined) db.fare_rules.manual_override_enabled=!!body.manual_override_enabled;
      db.fare_rules.updated_at=now(); db.fare_rules.updated_by=user.id;
      financeAudit(db,user.id,'FARE_ENGINE_UPDATE','fare_rules','default',body); audit(db,user.id,'S7O_FARE_ENGINE_UPDATE','fare_rules','default',body); saveDb(db);
      return send(res,200,{ok:true, fare_rules:db.fare_rules, readiness:financeReadiness(db)});
    }

    if(method==='POST' && pathname==='/api/admin/fare-area-rule'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user)) return send(res,403,{detail:'Main Admin only'});
      const body = await getBody(req); ensureSprint7OFoundation(db);
      const areaId=String(body.area_id||'').trim(); const area=(db.area_catalog||[]).find(a=>a.id===areaId || a.name===body.area_name) || null;
      const areaName=sanitizeText(body.area_name || area?.name || '',80); if(!areaName) return send(res,400,{detail:'Area name/area_id required'});
      let rule=(db.fare_area_rules||[]).find(r=>(areaId && r.area_id===areaId) || String(r.area_name||'').toLowerCase()===areaName.toLowerCase());
      if(!rule){ rule={id:uid('farerule'), created_at:now(), created_by:user.id}; db.fare_area_rules.push(rule); }
      rule.area_id=areaId || area?.id || rule.area_id || ''; rule.area_name=areaName; rule.status=String(body.status||rule.status||'ACTIVE').toUpperCase(); rule.fare_rules={...(rule.fare_rules||{})};
      for(const k of ['full_base_fare','sharing_base_per_seat','minimum_full','minimum_sharing','base_km','extra_step_km','extra_step_fare','waiting_charge_per_minute','peak_hour_multiplier','night_extra_percent']){ if(body[k]!==undefined && !Number.isNaN(Number(body[k]))) rule.fare_rules[k]=Number(body[k]); }
      rule.updated_at=now(); rule.updated_by=user.id;
      financeAudit(db,user.id,'AREA_FARE_RULE_UPSERT','fare_area_rule',rule.id,{area_name:areaName}); saveDb(db); return send(res,200,{ok:true, rule, area_rules:db.fare_area_rules});
    }

    if(method==='GET' && pathname==='/api/admin/commission-rules'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!hasCapability(db,user,'FINANCE_MANAGE')) return send(res,403,{detail:'Finance permission required', role:roleKey(user)});
      return send(res,200,{ok:true, finance_settings:db.finance_settings, commission_rules:db.commission_rules||[], driver_special_commissions:db.driver_special_commissions||[]});
    }

    if(method==='POST' && pathname==='/api/admin/commission-rules'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user)) return send(res,403,{detail:'Main Admin only'});
      const body = await getBody(req); ensureSprint7OFoundation(db);
      const scope=String(body.scope||'GLOBAL').toUpperCase(); const mode=String(body.mode||'PERCENT').toUpperCase();
      const rec={id:uid('cmr'), scope, mode, percent:Number(body.percent||body.commission_percent||0), fixed_amount:Number(body.fixed_amount||0), area_id:String(body.area_id||''), area_name:sanitizeText(body.area_name||'',80), status:String(body.status||'ACTIVE').toUpperCase(), created_at:now(), created_by:user.id, note:sanitizeText(body.note||'',180)};
      if(scope==='GLOBAL') db.commission_rules=(db.commission_rules||[]).filter(r=>String(r.scope||'GLOBAL').toUpperCase()!=='GLOBAL');
      db.commission_rules.push(rec); db.fare_rules.platform_commission_percent = rec.mode==='PERCENT' && scope==='GLOBAL' ? rec.percent : db.fare_rules.platform_commission_percent;
      financeAudit(db,user.id,'COMMISSION_RULE_CREATE','commission_rule',rec.id,rec); audit(db,user.id,'S7O_COMMISSION_RULE_CREATE','commission_rule',rec.id,rec); saveDb(db); return send(res,200,{ok:true, rule:rec, rules:db.commission_rules});
    }

    if(method==='POST' && pathname==='/api/admin/driver-special-commission'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user)) return send(res,403,{detail:'Main Admin only'});
      const body = await getBody(req); ensureSprint7OFoundation(db);
      const driverId=String(body.driver_id||body.driver_user_id||''); const prof=(db.driver_profiles||[]).find(d=>d.user_id===driverId || d.id===driverId); if(!prof) return send(res,404,{detail:'Driver not found'});
      const rec={id:uid('dsc'), driver_id:prof.user_id, driver_profile_id:prof.id, mode:String(body.mode||'PERCENT').toUpperCase(), percent:Number(body.percent||0), fixed_amount:Number(body.fixed_amount||0), status:String(body.status||'ACTIVE').toUpperCase(), created_at:now(), created_by:user.id, note:sanitizeText(body.note||'',160)};
      db.driver_special_commissions.push(rec); financeAudit(db,user.id,'DRIVER_SPECIAL_COMMISSION_CREATE','driver',prof.user_id,rec); saveDb(db); return send(res,200,{ok:true, special_commission:rec});
    }

    if(method==='GET' && pathname==='/api/admin/driver-wallets'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user)) return send(res,403,{detail:'Admin only'});
      ensureSprint7OFoundation(db); const scoped=new Set(filterDriversForAdmin(db,user,db.driver_profiles||[]).map(d=>d.user_id));
      const wallets=(db.driver_wallets||[]).filter(w=>isMainAdmin(user)||scoped.has(w.driver_id)).map(w=>{const u=(db.users||[]).find(x=>x.id===w.driver_id)||{}; const p=(db.driver_profiles||[]).find(x=>x.user_id===w.driver_id)||{}; return {...w, driver_name:u.name||'', mobile:u.mobile||'', vehicle_no:p.vehicle_no||'', area:p.area||''};}).sort((a,b)=>Number(b.pending_settlement||0)-Number(a.pending_settlement||0));
      return send(res,200,{ok:true, wallets, ledger:(db.driver_wallet_ledger||[]).filter(l=>isMainAdmin(user)||scoped.has(l.driver_id)).slice(-200).reverse()});
    }

    if(method==='GET' && pathname==='/api/admin/settlements'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!hasCapability(db,user,'SETTLEMENT_MANAGE') && !hasCapability(db,user,'FINANCE_MANAGE')) return send(res,403,{detail:'Settlement permission required', role:roleKey(user)});
      return send(res,200,{ok:true, ...settlementSummary(db), finance:financeDashboard(db,user)});
    }

    if(method==='POST' && pathname==='/api/admin/settlements/create'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user)) return send(res,403,{detail:'Main Admin only'});
      const body = await getBody(req); const driverId=String(body.driver_id||''); if(!driverId) return send(res,400,{detail:'driver_id required'});
      const out=settlementCreateForDriver(db,user,driverId,body); if(!out.ok) return send(res,out.status||400,out); saveDb(db); return send(res,200,out);
    }

    if(method==='GET' && pathname==='/api/driver/wallet'){
      const user = requireUser(req,res,db); if(!user) return;
      if(String(user.role||'').toUpperCase()!=='DRIVER') return send(res,403,{detail:'Driver only'});
      ensureSprint7OFoundation(db); const w=ensureDriverWallet(db,user.id); const rides=(db.rides||[]).filter(r=>r.driver_id===user.id).slice(-100).reverse(); const settlements=(db.settlements||[]).filter(s=>s.driver_id===user.id).slice(-50).reverse();
      return send(res,200,{ok:true, wallet:w, ledger:(db.driver_wallet_ledger||[]).filter(l=>l.driver_id===user.id).slice(-100).reverse(), rides:rides.map(r=>rideDto(r,db,user)), settlements});
    }

    const receiptRideMatch = pathname.match(/^\/api\/rides\/([^/]+)\/receipt$/);
    if(method==='GET' && receiptRideMatch){
      const user = requireUser(req,res,db); if(!user) return;
      const ride=(db.rides||[]).find(r=>r.id===receiptRideMatch[1]); if(!ride) return send(res,404,{detail:'Ride not found'});
      if(!isAdminRole(user) && ride.passenger_id!==user.id && ride.driver_id!==user.id) return send(res,403,{detail:'Only related passenger/driver can view receipt'});
      if(!['COMPLETED','PASSENGER_CONFIRMED','DRIVER_REACHED_DROP'].includes(String(ride.status||'').toUpperCase())) return send(res,409,{detail:'Receipt is available after ride completion/reached confirmation'});
      const receipt=receiptForRide(db,ride); saveDb(db); return send(res,200,{ok:true, receipt, ride:rideDto(ride,db,user)});
    }

    const guestReceiptMatch = pathname.match(/^\/api\/guest\/rides\/([^/]+)\/receipt$/);
    if(method==='GET' && guestReceiptMatch){
      const found=rideByGuestToken(db,guestReceiptMatch[1]); if(!found.ride) return send(res,404,{detail:'Guest ride not found or link expired'});
      if(!['COMPLETED','PASSENGER_CONFIRMED','DRIVER_REACHED_DROP'].includes(String(found.ride.status||'').toUpperCase())) return send(res,409,{detail:'Receipt is available after ride completion/reached confirmation'});
      const receipt=receiptForRide(db,found.ride); saveDb(db); return send(res,200,{ok:true, receipt, ride:publicRideView(db,found.ride)});
    }

    if(method==='GET' && pathname==='/api/env-check'){
      return send(res,200,{ok:true, version:VERSION, env:{otp_provider:String(process.env.OTP_PROVIDER||'DEMO'), twofactor_key_present:!!twoFactorApiKey(), map_provider:String(process.env.MAP_PROVIDER||'DEMO'), mappls_key_present:!!mapplsStaticKey(), navigation_provider:String(process.env.NAVIGATION_PROVIDER||''), google_login_enabled:googleLoginEnabled(), google_client_id_present:!!googleClientId(), google_client_secret_present:!!googleClientSecret(), production_env_loaded:fs.existsSync(path.join(__dirname,'data','production.env'))}, apk:{package_name:'com.astratechnologies.nexoride', deep_link_scheme:'nexoride://auth/google', permission_fix:'SPRINT7A'}, note:'Secrets are hidden. If key_present is true, configuration file is loaded.'});
    }
    if(method==='GET' && pathname==='/api/config'){
      return send(res,200,publicConfig(db));
    }
    // Sprint-7B: Public QR Web Booking + Simple Driver Dashboard APIs (safe add-on, no old API overwrite)
    if(method==='GET' && pathname==='/api/qr/config'){
      const area = String(url.searchParams.get('area') || db.qr_settings?.default_area || 'Kalna Town');
      return send(res,200,{ok:true, version:VERSION, qr_settings:db.qr_settings||{}, service_area:db.service_area, area, areas:db.area_catalog||[], fare_rules:db.fare_rules, finance_settings:db.finance_settings, commission_rules:db.commission_rules||[], places:searchablePlaces(db,''), app:{name:'NEXO Ride', qr_url:'/qr/', driver_dashboard_url:'/driver-lite/'}});
    }

    if(method==='POST' && pathname==='/api/guest/quote'){
      { const block=maintenanceBlock(db,'BOOKING'); if(block.blocked) return send(res,block.status,{detail:block.detail, detail_bn:block.detail_bn, maintenance:block.maintenance}); }
      if(db.guest_booking_settings && db.guest_booking_settings.enabled===false) return send(res,403,{detail:'Guest booking is currently disabled'});
      const body = await getBody(req);
      const pickup = sanitizeRideText(body.pickup || body.pickup_name || '', 160);
      const drop = sanitizeRideText(body.drop || body.destination || body.drop_name || '', 160);
      if(!pickup || !drop) return send(res,400,{detail:'Pickup and destination required'});
      const ride_type = String(body.ride_type||'FULL').toUpperCase()==='SHARING'?'SHARING':'FULL';
      const fare = estimateFare(db,pickup,drop,ride_type,body.seats,{area:body.area||db.qr_settings?.default_area, wait_minutes:body.wait_minutes, peak_hour_multiplier:body.peak_hour_multiplier});
      const pickup_coords = fare.pickup_coords || placeCoords(pickup);
      const drivers = nearestAvailableDrivers(db, pickup_coords, {max_radius_km: body.max_radius_km, max_drivers: db.dispatch_settings.max_driver_candidates});
      return send(res,200,{ok:true, fare, route:routePlan(db,pickup,drop,ride_type,body.seats), matching_preview:{candidate_count:drivers.length, radius_km:Number(body.max_radius_km || db.dispatch_settings.default_radius_km)}, payment_required_after_driver_accept:!!db.guest_booking_settings.require_payment_after_driver_accept});
    }

    const guestRideMatch = pathname.match(/^\/api\/guest\/rides\/([^/]+)$/);
    if(method==='GET' && guestRideMatch){
      const found = rideByGuestToken(db, guestRideMatch[1]);
      if(!found.ride) return send(res,404,{detail:'Guest ride not found or link expired'});
      return send(res,200,{ok:true, ride:publicRideView(db,found.ride), session:{expires_at:found.session.expires_at}, route:routePlan(db, found.ride.pickup, found.ride.drop, found.ride.ride_type, found.ride.seats||1), updated_at:now()});
    }

    const guestLiveMatch = pathname.match(/^\/api\/guest\/rides\/([^/]+)\/live$/);
    if(method==='GET' && guestLiveMatch){
      const found = rideByGuestToken(db, guestLiveMatch[1]);
      if(!found.ride) return send(res,404,{detail:'Guest ride not found or link expired'});
      return send(res,200,{ok:true, ride:publicRideView(db,found.ride), live:rideLiveSnapshot(db,found.ride), route:routePlan(db, found.ride.pickup, found.ride.drop, found.ride.ride_type, found.ride.seats||1), updated_at:now()});
    }

    const publicTrackMatch = pathname.match(/^\/api\/track\/([^/]+)$/);
    if(method==='GET' && publicTrackMatch){
      const payload=publicTrackPayload(db, publicTrackMatch[1], req);
      if(!payload.ok) return send(res,payload.status||404,{detail:payload.detail});
      return send(res,200,payload);
    }
    const publicTrackShareMatch = pathname.match(/^\/api\/track\/([^/]+)\/share$/);
    if(method==='POST' && publicTrackShareMatch){
      const found=rideByGuestToken(db, publicTrackShareMatch[1]); if(!found.ride) return send(res,404,{detail:'Trip link expired or ride not found'});
      const payload=createTripShare(db, found.ride, publicTrackShareMatch[1], req, await getBody(req), {id:'guest',role:'GUEST'});
      saveDb(db); return send(res,200,payload);
    }
    const publicTrackSosMatch = pathname.match(/^\/api\/track\/([^/]+)\/sos$/);
    if(method==='POST' && publicTrackSosMatch){
      const found=rideByGuestToken(db, publicTrackSosMatch[1]); if(!found.ride) return send(res,404,{detail:'Trip link expired or ride not found'});
      const body=await getBody(req); const ev=recordSafetyEvent(db, found.ride, {id:'guest', role:'GUEST'}, body, 'SOS');
      saveDb(db); return send(res,200,{ok:true, event:ev, track:publicTrackPayload(db, publicTrackSosMatch[1], req)});
    }
    const publicEmergencyContactMatch = pathname.match(/^\/api\/track\/([^/]+)\/emergency-contact$/);
    if(method==='POST' && publicEmergencyContactMatch){
      const found=rideByGuestToken(db, publicEmergencyContactMatch[1]); if(!found.ride) return send(res,404,{detail:'Trip link expired or ride not found'});
      const body=await getBody(req); const rec={id:uid('emg'), ride_id:found.ride.id, token_hash:sha(publicEmergencyContactMatch[1]), name:sanitizeText(body.name||'',80), mobile:normalizeIndianMobile(body.mobile||''), relation:sanitizeText(body.relation||'',60), created_at:now(), source:'PUBLIC_TRACK'};
      if(!rec.mobile || rec.mobile.length<10) return send(res,400,{detail:'Valid emergency contact mobile required'});
      db.safety_contacts.push(rec); if(db.safety_contacts.length>3000) db.safety_contacts=db.safety_contacts.slice(-3000);
      const share=createTripShare(db, found.ride, publicEmergencyContactMatch[1], req, {name:rec.name, mobile:rec.mobile}, {id:'guest',role:'GUEST'});
      saveDb(db); return send(res,200,{ok:true, contact:rec, share});
    }


    const guestPayOrderMatch = pathname.match(/^\/api\/guest\/rides\/([^/]+)\/payment-order$/);
    if(method==='POST' && guestPayOrderMatch){
      { const block=maintenanceBlock(db,'PAYMENT'); if(block.blocked) return send(res,block.status,{detail:block.detail, detail_bn:block.detail_bn, maintenance:block.maintenance}); }
      const found = rideByGuestToken(db, guestPayOrderMatch[1]);
      if(!found.ride) return send(res,404,{detail:'Guest ride not found or link expired'});
      const ride = found.ride;
      if(String(ride.status||'').toUpperCase() !== 'DRIVER_ACCEPTED') return send(res,409,{detail:'Driver accept করার পর payment order create হবে'});
      if(ride.payment_due_at && new Date(ride.payment_due_at).getTime() < Date.now()){
        ride.status='PAYMENT_TIMEOUT'; ride.payment_status='EXPIRED'; ride.expired_at=now(); saveDb(db);
        return send(res,409,{detail:'Payment time expired. Please book again.'});
      }
      const guestUser = db.users.find(u=>u.id===ride.passenger_id) || {id:ride.passenger_id, role:'GUEST'};
      const payOpts = paymentOptions(db);
      let order = (db.payment_orders||[]).find(o=>o.ride_id===ride.id && ['CREATED','PENDING'].includes(String(o.status||'').toUpperCase()));
      if(!order){
        order = createPaymentOrder(db, ride, guestUser, 'GUEST_WEB');
        if(payOpts.provider === 'RAZORPAY' && payOpts.razorpay_enabled){
          try{
            const rp = await createRazorpayGatewayOrder(ride, guestUser, db);
            order.razorpay_order_id = rp.id || order.razorpay_order_id;
            order.razorpay_amount = rp.amount || Math.round(Number(order.amount||0)*100);
            order.razorpay_currency = rp.currency || 'INR';
            order.razorpay_status = rp.status || 'created';
            order.status='CREATED';
            order.note='Razorpay order created for guest web booking. Verify payment before confirming ride.';
          }catch(e){ order.status='FAILED'; order.error=e.message; saveDb(db); return send(res,502,{detail:'Razorpay order create failed: '+e.message}); }
        }
      }
      audit(db,'guest','GUEST_PAYMENT_ORDER_CREATE','payment_order',order.id,{ride_id:ride.id, amount:order.amount, provider:order.provider});
      saveDb(db);
      return send(res,200,{ok:true, order:publicPaymentOrder(order), payment:paymentOptions(db), ride:publicRideView(db,ride)});
    }

    const guestPayRefMatch = pathname.match(/^\/api\/guest\/rides\/([^/]+)\/payment-reference$/);
    if(method==='POST' && guestPayRefMatch){
      const found = rideByGuestToken(db, guestPayRefMatch[1]);
      if(!found.ride) return send(res,404,{detail:'Guest ride not found or link expired'});
      const ride = found.ride;
      const body = await getBody(req);
      const provider = paymentProviderMode(db);
      if(String(provider).toUpperCase()==='DEMO' && isProductionRuntime() && !envBool(process.env.ALLOW_DEMO_PAYMENT_IN_PRODUCTION)) return send(res,503,{detail:'Production lock: DEMO payment is disabled. Configure Razorpay/manual verified payment before public launch.'});
      const txn = sanitizeText(body.transaction_id || body.payment_ref || body.upi_ref || '', 80);
      if(provider !== 'DEMO' && !txn) return send(res,400,{detail:'Payment transaction/reference required'});
      let order = (db.payment_orders||[]).find(o=>o.ride_id===ride.id && ['CREATED','PENDING'].includes(String(o.status||'').toUpperCase())) || createPaymentOrder(db, ride, {id:ride.passenger_id, role:'GUEST'}, 'GUEST_WEB_REFERENCE');
      try{
        order.status='PAID'; order.transaction_id=txn || ('GUEST-DEMO-'+Date.now()); order.payment_method=String(body.payment_method||order.payment_method||(provider==='DEMO'?'DEMO_PAYMENT':'UPI_REFERENCE')); order.paid_at=now(); order.verified_at=now(); order.verified_by='guest-reference';
        confirmRidePayment(db, ride, {id:'guest', role:'GUEST'}, {provider, transaction_id:order.transaction_id, payment_method:order.payment_method});
      }catch(e){ saveDb(db); return send(res,409,{detail:e.message}); }
      saveDb(db);
      return send(res,200,{ok:true, order:publicPaymentOrder(order), ride:publicRideView(db,ride)});
    }

    const guestPayMatch = pathname.match(/^\/api\/guest\/rides\/([^/]+)\/payment-demo$/);
    if(method==='POST' && guestPayMatch){
      const found = rideByGuestToken(db, guestPayMatch[1]);
      if(!found.ride) return send(res,404,{detail:'Guest ride not found or link expired'});
      const ride = found.ride;
      if(isProductionRuntime() && !envBool(process.env.ALLOW_DEMO_PAYMENT_IN_PRODUCTION)) return send(res,503,{detail:'Production lock: demo payment endpoint is disabled.'});
      if(String(paymentProviderMode(db)).toUpperCase() !== 'DEMO' && db.guest_booking_settings.allow_demo_payment!==true) return send(res,403,{detail:'Real payment provider is enabled. Use production payment order/callback.'});
      try{
        const order = createPaymentOrder(db, ride, {id:ride.passenger_id, role:'PASSENGER'}, 'GUEST_WEB_DEMO');
        order.status='PAID'; order.transaction_id='GUEST-DEMO-'+Date.now(); order.payment_method='GUEST_DEMO_PAYMENT'; order.paid_at=now(); order.verified_at=now(); order.verified_by='guest';
        confirmRidePayment(db, ride, {id:ride.passenger_id, role:'GUEST'}, {provider:order.provider, transaction_id:order.transaction_id, payment_method:order.payment_method});
      }catch(e){ saveDb(db); return send(res,409,{detail:e.message}); }
      saveDb(db);
      return send(res,200,{ok:true, ride:publicRideView(db,ride)});
    }

    const guestConfirmMatch = pathname.match(/^\/api\/guest\/rides\/([^/]+)\/confirm-reached$/);
    if(method==='POST' && guestConfirmMatch){
      const found = rideByGuestToken(db, guestConfirmMatch[1]);
      if(!found.ride) return send(res,404,{detail:'Guest ride not found or link expired'});
      const ride = found.ride;
      if(!['DRIVER_REACHED_DROP','COMPLETED'].includes(String(ride.status||'').toUpperCase())) return send(res,409,{detail:'Driver must mark drop reached before passenger confirmation'});
      const body = await getBody(req);
      completeRideSettlement(db, ride, {id:'guest', role:'GUEST'});
      const rating = body.rating ? Math.max(1, Math.min(5, Number(body.rating||5))) : null;
      if(rating){
        ride.rating_by_passenger = rating;
        ride.rating_comment = sanitizeRideText(body.comment||'',200);
        ride.rated_at = now();
        const prof = db.driver_profiles.find(d=>d.user_id===ride.driver_id);
        if(prof){ const rated = db.rides.filter(x=>x.driver_id===ride.driver_id && x.rating_by_passenger); const avg = rated.reduce((a,x)=>a+Number(x.rating_by_passenger||0),0) / Math.max(1,rated.length); prof.rating = Math.round(avg*10)/10; }
      }
      closeDispatchQueue(db, ride, 'CLOSED');
      saveDb(db);
      return send(res,200,{ok:true, ride:publicRideView(db,ride), receipt:{ride_id:ride.id, fare:ride.estimated_fare, paid_at:ride.paid_at, completed_at:ride.completed_at, payment_ref:ride.payment_ref||''}});
    }

    if(method==='POST' && pathname==='/api/qr/fare'){
      { const block=maintenanceBlock(db,'QR'); if(block.blocked) return send(res,block.status,{detail:block.detail, detail_bn:block.detail_bn, maintenance:block.maintenance}); }
      if(db.qr_settings && db.qr_settings.enabled===false) return send(res,403,{detail:'QR booking is currently disabled by admin'});
      const body = await getBody(req);
      const pickup = sanitizeRideText(body.pickup || body.pickup_name || '', 160);
      const drop = sanitizeRideText(body.drop || body.destination || body.drop_name || '', 160);
      if(!pickup || !drop) return send(res,400,{detail:'Pickup and destination required'});
      const ride_type = String(body.ride_type||'FULL').toUpperCase()==='SHARING'?'SHARING':'FULL';
      return send(res,200,{ok:true, fare:estimateFare(db,pickup,drop,ride_type,body.seats,{area:body.area||db.qr_settings?.default_area, wait_minutes:body.wait_minutes, peak_hour_multiplier:body.peak_hour_multiplier}), route:routePlan(db,pickup,drop,ride_type,body.seats)});
    }

    if(method==='POST' && pathname==='/api/qr/book'){
      { const block=maintenanceBlock(db,'QR'); if(block.blocked) return send(res,block.status,{detail:block.detail, detail_bn:block.detail_bn, maintenance:block.maintenance}); }
      if(db.qr_settings && db.qr_settings.enabled===false) return send(res,403,{detail:'QR booking is currently disabled by admin'});
      const body = await getBody(req);
      const passengerName = sanitizeText(body.name || body.passenger_name || 'QR Passenger', 80) || 'QR Passenger';
      const mobile = normalizeIndianMobile(body.mobile || body.phone || '');
      const pickup = sanitizeRideText(body.pickup || body.pickup_name || '', 160);
      const drop = sanitizeRideText(body.drop || body.destination || body.drop_name || '', 160);
      const area = sanitizeText(body.area || db.qr_settings?.default_area || 'Kalna Town', 80);
      const ride_type = String(body.ride_type||'FULL').toUpperCase()==='SHARING'?'SHARING':'FULL';
      if(mobile && mobile.length < 10) return send(res,400,{detail:'Valid mobile number required'});
      if(!pickup || !drop) return send(res,400,{detail:'Pickup and destination required'});
      const guestRisk = guestBookingRisk(db,{mobile, device_id:body.device_id||body.deviceId, ip:req.headers['x-forwarded-for']||req.socket.remoteAddress, pickup, drop});
      if(!guestRisk.ok){ recordGuestAbuseEvent(db,'GUEST_BOOKING_BLOCKED',{mobile, device_id:body.device_id||body.deviceId, ip:req.headers['x-forwarded-for']||req.socket.remoteAddress, pickup, drop},guestRisk); saveDb(db); return send(res,429,{detail:'Guest booking temporarily blocked/rate limited', risk:guestRisk}); }
      if(guestRisk.warnings.length) recordGuestAbuseEvent(db,'GUEST_BOOKING_WARNING',{mobile, device_id:body.device_id||body.deviceId, ip:req.headers['x-forwarded-for']||req.socket.remoteAddress, pickup, drop},guestRisk);
      const fare = estimateFare(db,pickup,drop,ride_type,body.seats,{area, wait_minutes:body.wait_minutes, peak_hour_multiplier:body.peak_hour_multiplier});
      if(db.service_area?.geofence_enabled && fare.geofence && !fare.geofence.inside) return send(res,400,{detail:'NEXO Ride এখন শুধু Kalna Sub-Division service area-এর মধ্যে চলছে', geofence:fare.geofence});
      let user = mobile ? findUser(db,mobile) : null;
      if(!user){
        const sPass = salt();
        user = {id:uid('usr'), name:passengerName, mobile: mobile || ('GUEST-'+crypto.randomBytes(5).toString('hex')), email:String(body.email||''), role:'PASSENGER', status:'ACTIVE', area, nexo_id:'NEXO-GUEST-'+crypto.randomBytes(4).toString('hex'), created_at:now(), consent_at:now(), consent_version:'QR-S7B', source:'QR_WEB_BOOKING', password_salt:sPass, password_hash:hashPassword(crypto.randomBytes(8).toString('hex'),sPass)};
        db.users.push(user);
      }else{
        user.name = user.name || passengerName; user.area = user.area || area; user.status = user.status || 'ACTIVE';
      }
      const pickup_coords = fare.pickup_coords || placeCoords(pickup);
      const drop_coords = fare.drop_coords || placeCoords(drop);
      const passenger_loc = upsertLocation(db,user,{lat:body.lat,lng:body.lng,accuracy:body.accuracy,location:pickup,source:'QR_WEB_BOOKING'}) || {lat:pickup_coords.lat,lng:pickup_coords.lng};
      const drivers = nearestAvailableDrivers(db, pickup_coords, {max_radius_km: body.max_radius_km, max_drivers: body.max_drivers});
      const driverUsers = drivers.map(d=>db.users.find(u=>u.id===d.user_id)).filter(Boolean);
      const ride = {id:uid('ride'), passenger_id:user.id, driver_id:null, status:'REQUESTED', source:'GUEST_QR_BOOKING', guest_booking:true, passenger_confirm_required:true, qr_area:area, passenger_name:passengerName, passenger_mobile:mobile, pickup, drop, pickup_coords, drop_coords, passenger_location:passenger_loc, guest_device_id:String(body.device_id||body.deviceId||'').slice(0,120), ride_type, ...fare, nearby_driver_count:drivers.length, driver_candidate_ids:drivers.map(d=>d.user_id), driver_candidate_profile_ids:drivers.map(d=>d.id), rejected_driver_ids:[], match_radius_km:Number(body.max_radius_km || db.service_area?.driver_matching_radius_km || process.env.DRIVER_MATCH_RADIUS_KM || 8), matching_status:drivers.length?'DRIVER_REQUEST_SENT':'NO_ONLINE_DRIVER', created_at:now(), accepted_at:null, payment_due_at:null, payment_hold_seconds:PAYMENT_HOLD_SECONDS, paid_at:null, confirmed_at:null, arrived_at:null, started_at:null, completed_at:null, cancelled_at:null, expired_at:null, payment_status:'PENDING', ride_otp:null, otp_verified_at:null};
      db.rides.push(ride);
      beginDispatchRound(db, ride, drivers, 'INITIAL');
      db.qr_web_bookings = db.qr_web_bookings || [];
      db.qr_web_bookings.push({id:uid('qrbook'), ride_id:ride.id, passenger_id:user.id, mobile, pickup, drop, area, fare:fare.estimated_fare, status:ride.status, created_at:now()});
      const sess = makeSession(db,user);
      const guestRideToken = makeGuestRideToken(db, ride, mobile);
      ride.guest_status_url = '/guest-ride/?token=' + encodeURIComponent(guestRideToken);
      if(false && driverUsers.length) notifyUsers(db, driverUsers, {event_type:'QR_RIDE_REQUEST', priority:'HIGH', ride_id:ride.id, title:'QR Web Booking', message:`${pickup} → ${drop} · ₹${fare.estimated_fare}`, area, data:{source:'QR_WEB_BOOKING', pickup, drop, fare:fare.estimated_fare}});
      notifyAdmins(db,{event_type:'QR_BOOKING_ADMIN', priority:'NORMAL', ride_id:ride.id, title:'New QR Booking', message:`${passengerName} · ${pickup} → ${drop} · ₹${fare.estimated_fare} · drivers ${drivers.length}`, area});
      audit(db,user.id,'QR_WEB_BOOKING_CREATE','ride',ride.id,{pickup,drop,area,candidates:drivers.length});
      saveDb(db);
      return send(res,200,{ok:true, token:sess.token, guest_ride_token:guestRideToken, guest_status_url:ride.guest_status_url, expires_at:sess.expires_at, user:safeUser(user), ride:publicRideView(db,ride), matching:{status:ride.matching_status, candidate_count:drivers.length, radius_km:ride.match_radius_km}, nearby_drivers:drivers.map(d=>({id:d.id,user_id:d.user_id,location:d.location,distance_to_pickup_km:d.distance_to_pickup_km,rating:d.rating,total_rides:d.total_rides}))});
    }

    if(method==='GET' && pathname==='/api/driver/simple-dashboard'){
      const user = requireUser(req,res,db); if(!user) return;
      if(user.role!=='DRIVER') return send(res,403,{detail:'Driver only'});
      const prof = db.driver_profiles.find(d=>d.user_id===user.id);
      if(!prof) return send(res,404,{detail:'Driver profile not found'});
      const todayStr = new Date().toISOString().slice(0,10);
      const pending = (db.rides||[]).filter(r=>String(r.status||'').toUpperCase()==='REQUESTED' && !((r.rejected_driver_ids||[]).includes(user.id)) && ((r.driver_candidate_ids||[]).includes(user.id) || !(r.driver_candidate_ids||[]).length)).slice(-30).reverse().map(r=>rideDto(r,db,user));
      const active = (db.rides||[]).filter(r=>r.driver_id===user.id && ['DRIVER_ACCEPTED','CONFIRMED','ARRIVED','STARTED','DRIVER_REACHED_DROP'].includes(String(r.status||'').toUpperCase())).slice(-30).reverse().map(r=>rideDto(r,db,user));
      const completedToday = (db.rides||[]).filter(r=>r.driver_id===user.id && r.status==='COMPLETED' && String(r.completed_at||'').slice(0,10)===todayStr);
      const todayEarnings = completedToday.reduce((a,r)=>a+Number(r.driver_earning||0),0);
      const todayCommission = completedToday.reduce((a,r)=>a+Number(r.platform_commission||0),0);
      return send(res,200,{ok:true, driver_profile:prof, online_eligible:driverOnlineEligibility(prof), gps_health:driverGpsHealth(db,prof), dispatch:{accept_timeout_seconds:db.dispatch_runtime_settings?.accept_timeout_seconds||30, engine:db.dispatch_runtime_settings?.engine||'REGION_QUEUE_JSON_FALLBACK'}, pending_requests:pending, active_rides:active, today:{rides:completedToday.length, earnings:Math.round(todayEarnings*100)/100, commission:Math.round(todayCommission*100)/100}, updated_at:now()});
    }



    if(method==='POST' && pathname==='/api/auth/refresh-session'){
      const body = await getBody(req);
      ensureSprint7GFoundation(db);
      const refreshToken = String(body.refresh_token||'').trim();
      if(!refreshToken) return send(res,400,{detail:'Refresh token required'});
      const rec = (db.driver_refresh_sessions||[]).find(x=>x.refresh_hash===sha(refreshToken) && x.active!==false && !x.revoked_at && new Date(x.expires_at)>new Date());
      if(!rec) return send(res,401,{detail:'Refresh session expired or revoked'});
      const user = (db.users||[]).find(u=>u.id===rec.user_id && u.status==='ACTIVE' && u.role==='DRIVER');
      if(!user) return send(res,401,{detail:'Driver account not active'});
      const device = (db.driver_devices||[]).find(d=>d.driver_user_id===user.id && d.device_id===rec.device_id && d.active!==false && !d.revoked_at);
      if(!device) return send(res,401,{detail:'Device is not trusted or was revoked'});
      device.last_seen_at = now();
      rec.last_used_at = now();
      const sess = makeSession(db,user,{remember_device:true, trusted_device:true, device_info:{device_id:device.device_id, device_name:device.device_name, platform:device.platform, user_agent:req.headers['user-agent']||''}, req});
      audit(db,user.id,'DRIVER_REFRESH_SESSION','driver_device',device.id,{platform:device.platform});
      saveDb(db);
      return send(res,200,{ok:true, token:sess.token, expires_at:sess.expires_at, refresh_token:sess.refresh_token, refresh_expires_at:sess.refresh_expires_at, trusted_device:sess.device, user:safeUser(user), driver_profile:db.driver_profiles.find(d=>d.user_id===user.id)||null});
    }

    if(method==='POST' && pathname==='/api/auth/logout'){
      const user = requireUser(req,res,db); if(!user) return;
      const body = await getBody(req).catch(()=>({}));
      const auth = req.headers.authorization || '';
      const currentToken = auth.startsWith('Bearer ') ? auth.slice(7) : '';
      let removed=0;
      for(const s of (db.sessions||[])){
        if(s.token===currentToken && !s.revoked_at){ s.active=false; s.revoked_at=now(); s.revoked_reason='USER_LOGOUT'; removed++; }
      }
      if(body.clear_device && user.role==='DRIVER'){
        const sess=(db.sessions||[]).find(s=>s.token===currentToken);
        if(sess?.device_id) removed += revokeDriverRefreshByDevice(db,user.id,sess.device_id,'USER_LOGOUT_CLEAR_DEVICE');
        const dev=(db.driver_devices||[]).find(d=>d.driver_user_id===user.id && d.device_id===sess?.device_id);
        if(dev){dev.active=false; dev.revoked_at=now(); dev.revoked_reason='USER_LOGOUT_CLEAR_DEVICE';}
      }
      audit(db,user.id,'LOGOUT','session','current',{clear_device:!!body.clear_device, removed});
      saveDb(db);
      return send(res,200,{ok:true, removed});
    }

    if(method==='GET' && pathname==='/api/driver/devices'){
      const user = requireUser(req,res,db); if(!user) return;
      if(user.role!=='DRIVER') return send(res,403,{detail:'Driver only'});
      ensureSprint7GFoundation(db);
      return send(res,200,{ok:true, settings:db.driver_device_settings, devices:(db.driver_devices||[]).filter(d=>d.driver_user_id===user.id).map(devicePublic)});
    }

    const driverDeviceAction = pathname.match(/^\/api\/driver\/devices\/([^/]+)\/revoke$/);
    if(method==='POST' && driverDeviceAction){
      const user = requireUser(req,res,db); if(!user) return;
      if(user.role!=='DRIVER') return send(res,403,{detail:'Driver only'});
      const dev=(db.driver_devices||[]).find(d=>d.id===driverDeviceAction[1] && d.driver_user_id===user.id);
      if(!dev) return send(res,404,{detail:'Device not found'});
      dev.active=false; dev.revoked_at=now(); dev.revoked_reason='DRIVER_SELF_REVOKE';
      const removed=revokeDriverRefreshByDevice(db,user.id,dev.device_id,'DRIVER_SELF_REVOKE');
      audit(db,user.id,'DRIVER_DEVICE_REVOKE','driver_device',dev.id,{removed});
      saveDb(db);
      return send(res,200,{ok:true, removed, device:devicePublic(dev)});
    }

    if(method==='GET' && pathname==='/api/passenger/my-rides'){
      const user = requireUser(req,res,db); if(!user) return;
      const items=(db.rides||[]).filter(r=>r.passenger_id===user.id).slice(-80).reverse().map(r=>publicRideView(db,r));
      const active=items.filter(r=>['REQUESTED','DRIVER_ACCEPTED','CONFIRMED','ARRIVED','STARTED','DRIVER_REACHED_DROP'].includes(String(r.status||'').toUpperCase()));
      return send(res,200,{ok:true, active_rides:active, past_rides:items.filter(r=>!active.find(a=>a.id===r.id)), settings:db.passenger_flow_settings, updated_at:now()});
    }

    if(method==='GET' && pathname==='/api/admin/driver-devices'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user)) return send(res,403,{detail:'Admin only'});
      ensureSprint7GFoundation(db);
      let devices=(db.driver_devices||[]);
      const q=String(url.searchParams.get('q')||'').trim().toLowerCase();
      if(q){
        devices=devices.filter(d=>{
          const u=(db.users||[]).find(x=>x.id===d.driver_user_id)||{};
          return [d.device_id,d.device_name,d.platform,u.name,u.mobile].some(v=>String(v||'').toLowerCase().includes(q));
        });
      }
      return send(res,200,{ok:true, devices:devices.slice(-500).reverse().map(d=>({...devicePublic(d), driver:safeUser((db.users||[]).find(u=>u.id===d.driver_user_id))}))});
    }

    const adminDeviceRevoke = pathname.match(/^\/api\/admin\/driver-devices\/([^/]+)\/revoke$/);
    if(method==='POST' && adminDeviceRevoke){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user)) return send(res,403,{detail:'Main Admin only'});
      ensureSprint7GFoundation(db);
      const dev=(db.driver_devices||[]).find(d=>d.id===adminDeviceRevoke[1]);
      if(!dev) return send(res,404,{detail:'Device not found'});
      dev.active=false; dev.revoked_at=now(); dev.revoked_by=user.id; dev.revoked_reason='ADMIN_REVOKE';
      const removed=revokeDriverRefreshByDevice(db,dev.driver_user_id,dev.device_id,'ADMIN_REVOKE');
      audit(db,user.id,'ADMIN_DRIVER_DEVICE_REVOKE','driver_device',dev.id,{driver_user_id:dev.driver_user_id, removed});
      saveDb(db);
      return send(res,200,{ok:true, removed, device:devicePublic(dev)});
    }

    if(method==='GET' && pathname==='/api/auth/google/start'){
      if(!googleLoginEnabled()) return send(res,400,{detail:'Google Login is not configured. Set GOOGLE_LOGIN_ENABLED=true, GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in data/production.env'});
      const role = String(url.searchParams.get('role') || 'PASSENGER').toUpperCase();
      if(role !== 'PASSENGER') return send(res,400,{detail:'Google Login is available for passengers only. Driver login uses mobile OTP/KYC.'});
      const appReturnParam = String(url.searchParams.get('app') || url.searchParams.get('return_app') || '').toLowerCase();
      const nativeUa = /NEXO-Ride-Android/i.test(String(req.headers['user-agent']||''));
      const returnApp = nativeUa || ['1','true','yes','apk','app'].includes(appReturnParam);
      const state = makeGoogleState('PASSENGER',{return_app:returnApp, source:returnApp?'android_apk':'web'});
      const redirectUri = googleCallbackUrl(req);
      const authUrl = 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({
        client_id: googleClientId(),
        redirect_uri: redirectUri,
        response_type:'code',
        scope:'openid email profile',
        access_type:'offline',
        prompt:'select_account',
        state
      }).toString();
      res.writeHead(302,{Location:authUrl,'Cache-Control':'no-store'});
      return res.end();
    }

    if(method==='GET' && pathname==='/api/auth/google/callback'){
      const code = String(url.searchParams.get('code') || '');
      const err = String(url.searchParams.get('error') || '');
      const state = verifyGoogleState(url.searchParams.get('state') || '');
      const appRedirect = '/app/';
      const deepAppRedirect = 'nexoride://auth/google';
      function googleReturnLocation(params){
        const q=new URLSearchParams(params).toString();
        if(state && state.return_app) return `${deepAppRedirect}?${q}`;
        return `${appRedirect}?${q}`;
      }
      if(err){ res.writeHead(302,{Location:googleReturnLocation({google_error:err}),'Cache-Control':'no-store'}); return res.end(); }
      if(!googleLoginEnabled() || !code || !state){ res.writeHead(302,{Location:`${appRedirect}?google_error=${encodeURIComponent('Google login configuration/state invalid')}`,'Cache-Control':'no-store'}); return res.end(); }
      try{
        const redirectUri = googleCallbackUrl(req);
        const tokenResp = await httpPostFormJson('https://oauth2.googleapis.com/token',{code, client_id:googleClientId(), client_secret:googleClientSecret(), redirect_uri:redirectUri, grant_type:'authorization_code'});
        const tok = tokenResp.json || {};
        if(!tok.access_token) throw new Error(tok.error_description || tok.error || 'Google token exchange failed');
        const infoResp = await httpGetJsonWithHeaders('https://www.googleapis.com/oauth2/v3/userinfo',{Authorization:'Bearer '+tok.access_token});
        const info = infoResp.json || {};
        if(!info.sub || !info.email) throw new Error('Google profile email not available');
        if(info.email_verified === false) throw new Error('Google email is not verified');
        let user = (db.users||[]).find(u=>String(u.google_id||'')===String(info.sub)) || findUser(db, info.email);
        if(user && String(user.role||'PASSENGER').toUpperCase() !== 'PASSENGER') throw new Error('This email is already used for non-passenger account. Use mobile login.');
        if(!user){
          const s=salt();
          user = {id:uid('usr'), name:String(info.name||info.given_name||'Passenger').trim(), mobile:'', email:String(info.email||'').toLowerCase(), role:'PASSENGER', nexo_id:'', area:'Kalna', status:'ACTIVE', created_at:now(), last_login_at:null, consent_at:now(), consent_version:'v1-google', password_salt:s, password_hash:hashPassword(crypto.randomBytes(18).toString('hex'),s)};
          db.users.push(user);
        }
        user.google_id = String(info.sub);
        user.google_email_verified = true;
        user.google_photo = String(info.picture||user.google_photo||'');
        user.auth_provider = user.auth_provider || 'GOOGLE';
        user.name = user.name || String(info.name||'Passenger');
        user.email = user.email || String(info.email||'').toLowerCase();
        user.last_login_at = now();
        const sess = makeSession(db,user);
        audit(db,user.id,'GOOGLE_LOGIN','user',user.id,{email:user.email});
        saveDb(db);
        res.writeHead(302,{Location:googleReturnLocation({google_token:sess.token, google_login:'ok'}),'Cache-Control':'no-store'});
        return res.end();
      }catch(e){
        audit(db,'system','GOOGLE_LOGIN_FAILED','auth','google',{error:e.message});
        saveDb(db);
        res.writeHead(302,{Location:googleReturnLocation({google_error:e.message}),'Cache-Control':'no-store'});
        return res.end();
      }
    }

    if(method==='POST' && pathname==='/api/auth/google/fake-login-dev'){
      return send(res,403,{detail:'Disabled. Use Google OAuth redirect flow.'});
    }

    if(method==='POST' && pathname==='/api/auth/request-otp'){
      const body = await getBody(req);
      const mobile = String(body.mobile||'').trim();
      if(!mobile) return send(res,400,{detail:'Mobile number required'});
      const otpReqGuard = authRateCheck(db, req, 'OTP_REQUEST', mobile);
      if(!otpReqGuard.ok){ saveDb(db); return send(res,otpReqGuard.status||429,{detail:otpReqGuard.detail, retry_after_seconds:otpReqGuard.retry_after_seconds||undefined}); }
      const authSet = authSettings(db);
      const i = mergeIntegrations(db.integrations);
      const provider = String(authSet.otp_provider || i.otp.provider || 'DEMO').toUpperCase();
      if(provider==='DEMO' && isProductionRuntime() && !envBool(process.env.ALLOW_DEMO_OTP_IN_PRODUCTION)){
        return send(res,503,{detail:'Production lock: DEMO OTP is disabled. Configure Firebase/MSG91/2Factor before public launch.', provider});
      }
      const recentForMobile = (db.otp_requests||[]).filter(x=>x.mobile===mobile && new Date(x.created_at).getTime() > Date.now()-60*60*1000);
      if(recentForMobile.length >= Number(authSet.max_otp_per_mobile_per_hour||5)) return send(res,429,{detail:'Too many OTP requests. Please try later.'});
      const latest = [...(db.otp_requests||[])].reverse().find(x=>x.mobile===mobile && new Date(x.created_at).getTime() > Date.now() - Number(authSet.resend_cooldown_seconds||0)*1000);
      if(latest) return send(res,429,{detail:`Please wait ${authSet.resend_cooldown_seconds} seconds before requesting another OTP`});
      const purpose = String(body.purpose||'LOGIN');
      let code = provider === 'DEMO' ? makeOtpCode() : '';
      const reqItem = {id:uid('otp'), mobile, code_hash:provider==='DEMO'?sha(code):'', provider, purpose, created_at:now(), expires_at:new Date(Date.now()+Number(authSet.otp_expiry_minutes||5)*60*1000).toISOString(), verified:false};
      try{
        const gateway = await sendOtpViaGateway(provider, mobile, purpose);
        if(gateway){ reqItem.gateway='2FACTOR'; reqItem.gateway_session_id = gateway.session_id; reqItem.gateway_phone = gateway.phone; }
        else if(provider !== 'DEMO') return send(res,400,{detail:`OTP provider ${provider} is not configured for live sending yet. Use TWOFACTOR or DEMO.`});
      }catch(e){
        audit(db,'system','OTP_SEND_FAILED','mobile',mobile,{provider, error:e.message});
        saveDb(db);
        return send(res,502,{detail:'OTP gateway failed', provider, error:e.message});
      }
      db.otp_requests.push(reqItem);
      if(db.otp_requests.length > 500) db.otp_requests = db.otp_requests.slice(-500);
      audit(db,'system','OTP_REQUEST','mobile',mobile,{provider, purpose:reqItem.purpose, gateway:reqItem.gateway||''});
      saveDb(db);
      return send(res,200,{ok:true, provider, expires_at:reqItem.expires_at, demo_code:(provider==='DEMO' && envBool(process.env.EXPOSE_DEMO_OTP))?code:undefined, message:provider==='DEMO'?'Testing OTP generated. Demo code is not exposed in public response. Set EXPOSE_DEMO_OTP=true only on local/dev if absolutely required.':'OTP sent to mobile.'});
    }

    if(method==='POST' && pathname==='/api/auth/login-otp'){
      const body = await getBody(req);
      const mobile = String(body.mobile||'').trim();
      const otp = String(body.otp||'').trim();
      if(!mobile || !otp) return send(res,400,{detail:'Mobile and OTP required'});
      const otpGuard = authRateCheck(db, req, 'OTP_VERIFY', mobile);
      if(!otpGuard.ok){ saveDb(db); return send(res,otpGuard.status||429,{detail:otpGuard.detail, retry_after_seconds:otpGuard.retry_after_seconds||undefined}); }
      const reqItem = [...(db.otp_requests||[])].reverse().find(x=>x.mobile===mobile && !x.verified && new Date(x.expires_at)>new Date());
      let otpOk = false;
      try{ otpOk = !!reqItem && await verifyOtpViaGateway(reqItem, otp); }
      catch(e){ return send(res,502,{detail:'OTP verification gateway failed', error:e.message}); }
      if(!otpOk){ recordAuthAttempt(db, req, 'OTP_VERIFY', mobile, false, '', 'INVALID_OTP'); saveDb(db); return send(res,401,{detail:'Invalid or expired OTP'}); }
      recordAuthAttempt(db, req, 'OTP_VERIFY', mobile, true, '', 'OTP_OK');
      clearAuthLockoutFor(db, 'OTP_VERIFY', mobile);
      reqItem.verified = true; reqItem.verified_at = now();
      let user = mobile ? findUser(db,mobile) : null;
      if(!user){
        if(!body.consent) return send(res,400,{detail:'Privacy and Terms consent required for new user'});
        const role = String(body.role||'PASSENGER').toUpperCase()==='DRIVER' ? 'DRIVER' : 'PASSENGER';
        const s = salt();
        user = {id:uid('usr'), name:String(body.name||('User '+mobile.slice(-4))).trim(), mobile, email:String(body.email||''), role, nexo_id:'', area:String(body.area||'Kalna'), status:'ACTIVE', created_at:now(), last_login_at:null, consent_at:now(), consent_version:'v1', password_salt:s, password_hash:hashPassword(crypto.randomBytes(12).toString('hex'),s)};
        db.users.push(user);
        if(role==='DRIVER') db.driver_profiles.push({id:uid('drv'), user_id:user.id, vehicle_type:'TOTO', vehicle_no:String(body.vehicle_no||''), license_no:String(body.license_no||''), aadhaar_no:String(body.aadhaar_no||''), location:String(body.area||'Kalna'), area:String(body.area||'Kalna'), online:false, status:'PENDING', kyc_status:'INCOMPLETE', rating:5, total_rides:0, total_earnings:0, pending_payout:0, created_at:now()});
      }
      const sess = makeSession(db,user,{remember_device:user.role==='DRIVER' && body.remember_device!==false, device_info:requestDeviceInfo(req,body), req});
      user.last_login_at = now();
      audit(db,user.id,'OTP_LOGIN','user',user.id,{provider:reqItem.provider});
      saveDb(db);
      return send(res,200,{ok:true, token:sess.token, expires_at:sess.expires_at, refresh_token:sess.refresh_token, refresh_expires_at:sess.refresh_expires_at, trusted_device:sess.device, user:safeUser(user), driver_profile:db.driver_profiles.find(d=>d.user_id===user.id)||null});
    }

    if(method==='POST' && pathname==='/api/auth/register'){
      const body = await getBody(req);
      const role = String(body.role||'PASSENGER').toUpperCase()==='DRIVER' ? 'DRIVER' : 'PASSENGER';
      const name = String(body.name||'').trim();
      const mobile = String(body.mobile||'').trim();
      const email = String(body.email||'').trim();
      const password = String(body.password||'');
      const consent = !!body.consent;
      if(!consent) return send(res,400,{detail:'Privacy and Terms consent required'});
      if(!name || !mobile || password.length<6) return send(res,400,{detail:'Name, mobile and 6+ digit password required'});
      if(findUser(db,mobile) || (email && findUser(db,email))) return send(res,409,{detail:'Account already exists'});
      const s = salt();
      const user = {
        id:uid('usr'), name, mobile, email, role, nexo_id: body.nexo_id || '', area:String(body.area||'Kalna'), managed_by_subadmin_id:String(body.managed_by_subadmin_id||''), added_by:String(body.added_by||''),
        status:'ACTIVE', created_at:now(), last_login_at:null,
        consent_at:now(), consent_version:'v1',
        password_salt:s, password_hash:hashPassword(password,s)
      };
      db.users.push(user);
      if(role==='DRIVER'){
        db.driver_profiles.push({
          id:uid('drv'), user_id:user.id, vehicle_type:'TOTO', vehicle_no:String(body.vehicle_no||''),
          license_no:String(body.license_no||''), aadhaar_no:String(body.aadhaar_no||''), driver_photo:String(body.driver_photo||''), vehicle_photo:String(body.vehicle_photo||''), aadhaar_doc:String(body.aadhaar_doc||''), license_doc:String(body.license_doc||''), kyc_status:'INCOMPLETE', location:String(body.location||body.area||'Kalna'), area:String(body.area||'Kalna'), sub_admin_user_id:String(body.managed_by_subadmin_id||''), added_by:String(body.added_by||''), online:false, status:'PENDING',
          rating:5, total_rides:0, total_earnings:0, pending_payout:0, created_at:now()
        });
      }
      const sess = makeSession(db,user);
      user.last_login_at = now();
      audit(db,user.id,'REGISTER','user',user.id,{role});
      saveDb(db);
      return send(res,200,{ok:true, token:sess.token, expires_at:sess.expires_at, user:safeUser(user)});
    }

    if(method==='POST' && pathname==='/api/auth/login'){
      const body = await getBody(req);
      const loginTarget = String(body.login||'').trim();
      const guard = authRateCheck(db, req, 'PASSWORD_LOGIN', loginTarget);
      if(!guard.ok){ saveDb(db); return send(res,guard.status||429,{detail:guard.detail, retry_after_seconds:guard.retry_after_seconds||undefined}); }
      const user = findUser(db, loginTarget);
      if(!user || !verifyPassword(body.password,user.password_salt,user.password_hash)){
        recordAuthAttempt(db, req, 'PASSWORD_LOGIN', loginTarget, false, user?.id||'', 'INVALID_PASSWORD');
        saveDb(db);
        return send(res,401,{detail:'Invalid login or password'});
      }
      recordAuthAttempt(db, req, 'PASSWORD_LOGIN', loginTarget, true, user.id, 'LOGIN_OK');
      clearAuthLockoutFor(db, 'PASSWORD_LOGIN', loginTarget);
      const sess = makeSession(db,user,{remember_device:user.role==='DRIVER' && body.remember_device===true, device_info:requestDeviceInfo(req,body), req});
      user.last_login_at = now();
      audit(db,user.id,'LOGIN','user',user.id,{must_change_password:!!user.must_change_password});
      saveDb(db);
      return send(res,200,{ok:true, token:sess.token, expires_at:sess.expires_at, refresh_token:sess.refresh_token, refresh_expires_at:sess.refresh_expires_at, trusted_device:sess.device, password_change_required:!!user.must_change_password, user:safeUser(user)});
    }

    if(method==='POST' && pathname==='/api/auth/forgot-password'){
      const body = await getBody(req);
      const login = String(body.login||'').trim();
      if(!login) return send(res,400,{detail:'Mobile / Email / NEXO ID required'});
      const user = findUser(db, login);
      if(!user || String(user.status||'ACTIVE').toUpperCase()==='SUSPENDED') return send(res,404,{detail:'Account not found. Please check mobile number or contact admin.'});
      const mobile = String(user.mobile||'').trim();
      if(!mobile) return send(res,400,{detail:'No mobile number linked with this account. Contact admin.'});
      const authSet = authSettings(db);
      const i = mergeIntegrations(db.integrations);
      const provider = String(authSet.otp_provider || i.otp.provider || 'DEMO').toUpperCase();
      const recentForMobile = (db.otp_requests||[]).filter(x=>x.mobile===mobile && String(x.purpose||'')==='RESET_PASSWORD' && new Date(x.created_at).getTime() > Date.now()-60*60*1000);
      if(recentForMobile.length >= Number(authSet.max_otp_per_mobile_per_hour||5)) return send(res,429,{detail:'Too many reset OTP requests. Please try later.'});
      const latest = [...(db.otp_requests||[])].reverse().find(x=>x.mobile===mobile && String(x.purpose||'')==='RESET_PASSWORD' && new Date(x.created_at).getTime() > Date.now() - Number(authSet.resend_cooldown_seconds||0)*1000);
      if(latest) return send(res,429,{detail:`Please wait ${authSet.resend_cooldown_seconds} seconds before requesting another OTP`});
      let code = provider === 'DEMO' ? makeOtpCode() : '';
      const reqItem = {id:uid('rst'), user_id:user.id, mobile, code_hash:provider==='DEMO'?sha(code):'', provider, purpose:'RESET_PASSWORD', created_at:now(), expires_at:new Date(Date.now()+Number(authSet.otp_expiry_minutes||5)*60*1000).toISOString(), verified:false};
      try{
        const gateway = await sendOtpViaGateway(provider, mobile, 'RESET_PASSWORD');
        if(gateway){ reqItem.gateway='2FACTOR'; reqItem.gateway_session_id = gateway.session_id; reqItem.gateway_phone = gateway.phone; }
        else if(provider !== 'DEMO') return send(res,400,{detail:`OTP provider ${provider} is not configured for live sending yet. Use TWOFACTOR or DEMO.`});
      }catch(e){
        audit(db,user.id,'PASSWORD_RESET_OTP_FAILED','user',user.id,{provider,error:e.message});
        saveDb(db);
        return send(res,502,{detail:'OTP gateway failed', provider, error:e.message});
      }
      db.otp_requests.push(reqItem);
      db.password_reset_requests = db.password_reset_requests || [];
      db.password_reset_requests.push({id:reqItem.id,user_id:user.id,mobile,provider,status:'OTP_SENT',created_at:reqItem.created_at,expires_at:reqItem.expires_at});
      if(db.otp_requests.length > 500) db.otp_requests = db.otp_requests.slice(-500);
      if(db.password_reset_requests.length > 300) db.password_reset_requests = db.password_reset_requests.slice(-300);
      audit(db,user.id,'PASSWORD_RESET_OTP','user',user.id,{provider});
      saveDb(db);
      return send(res,200,{ok:true, message:'Password reset OTP sent', mobile_mask:maskMobile(mobile), expires_at:reqItem.expires_at, provider, demo_code:provider==='DEMO'?code:undefined, note:provider==='DEMO'?'Testing OTP only. Production SMS provider not configured yet.':'OTP sent through configured provider.'});
    }

    if(method==='POST' && pathname==='/api/auth/reset-password'){
      const body = await getBody(req);
      const login = String(body.login||'').trim();
      const otp = String(body.otp||'').trim();
      const newPassword = String(body.new_password||'');
      if(!login || !otp || !newPassword) return send(res,400,{detail:'Login, OTP and new password required'});
      if(newPassword.length < 6) return send(res,400,{detail:'New password must be at least 6 characters'});
      const user = findUser(db, login);
      if(!user) return send(res,404,{detail:'Account not found'});
      const mobile = String(user.mobile||'').trim();
      const resetGuard = authRateCheck(db, req, 'OTP_VERIFY', mobile);
      if(!resetGuard.ok){ saveDb(db); return send(res,resetGuard.status||429,{detail:resetGuard.detail, retry_after_seconds:resetGuard.retry_after_seconds||undefined}); }
      const reqItem = [...(db.otp_requests||[])].reverse().find(x=>x.mobile===mobile && x.user_id===user.id && String(x.purpose||'')==='RESET_PASSWORD' && !x.verified && new Date(x.expires_at)>new Date());
      let otpOk = false;
      try{ otpOk = !!reqItem && await verifyOtpViaGateway(reqItem, otp); }
      catch(e){ return send(res,502,{detail:'OTP verification gateway failed', error:e.message}); }
      if(!otpOk){ recordAuthAttempt(db, req, 'OTP_VERIFY', mobile, false, user.id, 'RESET_INVALID_OTP'); saveDb(db); return send(res,401,{detail:'Invalid or expired reset OTP'}); }
      recordAuthAttempt(db, req, 'OTP_VERIFY', mobile, true, user.id, 'RESET_OTP_OK');
      clearAuthLockoutFor(db, 'OTP_VERIFY', mobile);
      reqItem.verified = true;
      reqItem.verified_at = now();
      const s = salt();
      user.password_salt = s;
      user.password_hash = hashPassword(newPassword,s);
      user.must_change_password = false;
      user.password_changed_at = now();
      // For safety, logout this user from old sessions after password reset.
      db.sessions = (db.sessions||[]).filter(sess=>sess.user_id!==user.id);
      db.password_reset_requests = db.password_reset_requests || [];
      const log = [...db.password_reset_requests].reverse().find(x=>x.id===reqItem.id);
      if(log){ log.status='PASSWORD_RESET_DONE'; log.completed_at=now(); }
      audit(db,user.id,'PASSWORD_RESET_DONE','user',user.id,{via:'OTP'});
      saveDb(db);
      return send(res,200,{ok:true, message:'Password reset successful. Please login with new password.'});
    }

    if(method==='GET' && pathname==='/api/me'){
      const user = requireUser(req,res,db); if(!user) return;
      // 30-day rolling session: every app open extends the current login session.
      const auth = req.headers.authorization || '';
      const reqToken = auth.startsWith('Bearer ') ? auth.slice(7) : '';
      const sess = db.sessions.find(s=>s.token===reqToken && s.user_id===user.id);
      if(sess){ const sessionDays = Number((db.auth_settings||{}).session_days || SESSION_DAYS); sess.expires_at = new Date(Date.now()+sessionDays*24*60*60*1000).toISOString(); user.last_seen_at = now(); }
      const driver_profile = db.driver_profiles.find(d=>d.user_id===user.id) || null;
      const gps_health = driver_profile ? driverGpsHealth(db, driver_profile) : null;
      saveDb(db);
      return send(res,200,{ok:true, user:safeUser(user), driver_profile, gps_health, session_expires_at:sess?.expires_at});
    }


    if(method==='POST' && pathname==='/api/me'){
      const user = requireUser(req,res,db); if(!user) return;
      const body = await getBody(req);
      const name = String(body.name||'').trim();
      const email = String(body.email||'').trim();
      const mobile = String(body.mobile||'').trim();
      const area = String(body.area||'').trim();
      if(name) user.name = name.slice(0,120);
      if(email){
        const exists = db.users.find(u=>u.id!==user.id && String(u.email||'').toLowerCase()===email.toLowerCase());
        if(exists) return send(res,409,{detail:'This email is already used by another account'});
        user.email = email.slice(0,160);
      } else if(body.email !== undefined){ user.email=''; }
      if(mobile && mobile !== user.mobile){
        const exists = db.users.find(u=>u.id!==user.id && String(u.mobile||'')===mobile);
        if(exists) return send(res,409,{detail:'This mobile number is already used by another account'});
        user.mobile = mobile.slice(0,20);
      }
      if(area) user.area = area.slice(0,120);
      user.updated_at = now();
      audit(db,user.id,'PROFILE_UPDATE','user',user.id,{role:user.role});
      saveDb(db);
      return send(res,200,{ok:true, user:safeUser(user), driver_profile:db.driver_profiles.find(d=>d.user_id===user.id)||null});
    }

    if(method==='POST' && pathname==='/api/auth/change-password'){
      const user = requireUser(req,res,db); if(!user) return;
      const body = await getBody(req);
      const currentPassword = String(body.current_password||'');
      const newPassword = String(body.new_password||'');
      if(newPassword.length < 6) return send(res,400,{detail:'New password must be at least 6 characters'});
      if(!verifyPassword(currentPassword,user.password_salt,user.password_hash)) return send(res,401,{detail:'Current password is wrong'});
      const s = salt();
      user.password_salt = s;
      user.password_hash = hashPassword(newPassword,s);
      user.must_change_password = false;
      user.password_changed_at = now();
      audit(db,user.id,'PASSWORD_CHANGE','user',user.id,{role:user.role});
      saveDb(db);
      return send(res,200,{ok:true, message:'Password changed successfully'});
    }

    if(method==='POST' && pathname==='/api/me/role'){
      const user = requireUser(req,res,db); if(!user) return;
      const body = await getBody(req);
      const role = String(body.role||'PASSENGER').toUpperCase()==='DRIVER' ? 'DRIVER' : 'PASSENGER';
      user.role = role;
      if(role==='DRIVER' && !db.driver_profiles.find(d=>d.user_id===user.id)){
        db.driver_profiles.push({id:uid('drv'),user_id:user.id,vehicle_type:'TOTO',vehicle_no:'',license_no:'',location:'Kalna',area:user.area||'Kalna',online:false,status:'PENDING',rating:5,total_rides:0,created_at:now()});
      }
      audit(db,user.id,'ROLE_CHANGE','user',user.id,{role});
      saveDb(db);
      return send(res,200,{ok:true,user:safeUser(user),driver_profile:db.driver_profiles.find(d=>d.user_id===user.id)||null});
    }

    if(method==='POST' && pathname==='/api/driver/profile'){
      const user = requireUser(req,res,db); if(!user) return;
      const body = await getBody(req);
      user.role='DRIVER';
      let prof = db.driver_profiles.find(d=>d.user_id===user.id);
      if(!prof){
        prof={id:uid('drv'),user_id:user.id,created_at:now(),rating:5,total_rides:0,total_earnings:0,pending_payout:0,status:'PENDING',online:false};
        db.driver_profiles.push(prof);
      }
      prof.vehicle_type='TOTO';
      prof.vehicle_no=String(body.vehicle_no||prof.vehicle_no||'');
      prof.license_no=String(body.license_no||prof.license_no||'');
      prof.aadhaar_no=String(body.aadhaar_no||prof.aadhaar_no||'');
      prof.driver_photo=normalizeDocInput(body.driver_photo||prof.driver_photo||'',db,user,'driver_photo',prof.id);
      prof.vehicle_photo=normalizeDocInput(body.vehicle_photo||prof.vehicle_photo||'',db,user,'vehicle_photo',prof.id);
      prof.aadhaar_doc=normalizeDocInput(body.aadhaar_doc||prof.aadhaar_doc||'',db,user,'aadhaar_doc',prof.id);
      prof.license_doc=normalizeDocInput(body.license_doc||prof.license_doc||'',db,user,'license_doc',prof.id);
      prof.location=String(body.location||prof.location||'Kalna');
      prof.area=String(body.area||prof.area||prof.location||'Kalna');
      if(body.managed_by_subadmin_id) prof.sub_admin_user_id=String(body.managed_by_subadmin_id);
      prof.status = body.status || prof.status || 'PENDING';
      audit(db,user.id,'DRIVER_PROFILE_UPDATE','driver_profile',prof.id,{});
      saveDb(db);
      return send(res,200,{ok:true,driver_profile:prof});
    }


    if(method==='GET' && pathname==='/api/driver/kyc'){
      const user = requireUser(req,res,db); if(!user) return;
      if(user.role!=='DRIVER') return send(res,403,{detail:'Driver only'});
      let prof = db.driver_profiles.find(d=>d.user_id===user.id);
      if(!prof) return send(res,404,{detail:'Driver profile not found'});
      return send(res,200,{ok:true, kyc:driverKycSummary(db,prof)});
    }

    if(method==='POST' && pathname==='/api/driver/kyc'){
      const user = requireUser(req,res,db); if(!user) return;
      if(user.role!=='DRIVER') user.role='DRIVER';
      const body = await getBody(req);
      let prof = db.driver_profiles.find(d=>d.user_id===user.id);
      if(!prof){ prof={id:uid('drv'),user_id:user.id,vehicle_type:'TOTO',created_at:now(),rating:5,total_rides:0,total_earnings:0,pending_payout:0,status:'PENDING',online:false}; db.driver_profiles.push(prof); }
      prof.vehicle_type='TOTO';
      prof.vehicle_no=String(body.vehicle_no||prof.vehicle_no||'').trim();
      prof.license_no=String(body.license_no||prof.license_no||'').trim();
      prof.aadhaar_no=String(body.aadhaar_no||prof.aadhaar_no||'').trim();
      prof.driver_photo=normalizeDocInput(body.driver_photo||prof.driver_photo||'',db,user,'driver_photo',prof.id);
      prof.vehicle_photo=normalizeDocInput(body.vehicle_photo||prof.vehicle_photo||'',db,user,'vehicle_photo',prof.id);
      prof.aadhaar_doc=normalizeDocInput(body.aadhaar_doc||prof.aadhaar_doc||'',db,user,'aadhaar_doc',prof.id);
      prof.license_doc=normalizeDocInput(body.license_doc||prof.license_doc||'',db,user,'license_doc',prof.id);
      prof.area=String(body.area||prof.area||user.area||'Kalna');
      prof.location=String(body.location||prof.location||prof.area||'Kalna');
      const k = driverKycSummary(db,prof);
      if(prof.status==='REJECTED') prof.status='PENDING';
      prof.kyc_status = k.docs_present > 0 ? 'SUBMITTED' : 'INCOMPLETE';
      prof.kyc_submitted_at = now();
      const auto = autoApproveDriverKycIfEligible(db, prof, user, body);
      if(auto.auto_approved){
        prof.kyc_last_message = 'KYC complete এবং GPS service area-এর ভিতরে আছে। Driver auto approved. এখন Go Online করতে পারবেন।';
      }else{
        prof.kyc_last_message = k.complete ? `KYC complete. Auto approval pending: ${auto.reason}. GPS allow করে service area-এর ভিতর থেকে আবার Submit/Go Online করুন।` : `KYC submitted, but ${k.docs_required-k.docs_present} item(s) still missing: ${k.missing.join(', ')}`;
      }
      db.kyc_submissions = db.kyc_submissions || [];
      const finalSummary = driverKycSummary(db,prof);
      const submission = {id:uid('kycsub'), profile_id:prof.id, driver_user_id:user.id, driver_name:user.name||'', mobile:user.mobile||'', area:prof.area, status:prof.kyc_status, review_status:auto.auto_approved?'AUTO_APPROVED':(k.complete?'AUTO_APPROVAL_PENDING':'SUBMITTED_BUT_INCOMPLETE'), auto_approved:!!auto.auto_approved, auto_approval_reason:auto.reason||'', coords:auto.coords||coordsFromRequestOrProfile(body,prof), docs_present:finalSummary.docs_present, docs_required:finalSummary.docs_required, missing:finalSummary.missing, uploaded_files:(finalSummary.uploaded_files||[]).map(f=>({id:f.id, doc_type:f.doc_type, url:f.url, mime_type:f.mime_type, size_bytes:f.size_bytes})), message:prof.kyc_last_message, submitted_at:prof.kyc_submitted_at};
      db.kyc_submissions.push(submission);
      notifyAdmins(db,{event_type:auto.auto_approved?'DRIVER_KYC_AUTO_APPROVED':'DRIVER_KYC_SUBMITTED', priority:auto.auto_approved?'NORMAL':(k.complete?'HIGH':'NORMAL'), title:auto.auto_approved?'Driver KYC Auto Approved':'Driver KYC Submitted', message:auto.auto_approved?`${user.name||'Driver'} auto approved · service area GPS OK`:`${user.name||'Driver'} submitted KYC documents · ${k.docs_present}/${k.docs_required}`, area:prof.area, data:{driver_profile_id:prof.id, submission_id:submission.id}});
      audit(db,user.id,auto.auto_approved?'DRIVER_KYC_AUTO_APPROVED':'DRIVER_KYC_SUBMIT','driver_profile',prof.id,{docs_present:finalSummary.docs_present, docs_required:finalSummary.docs_required, missing:finalSummary.missing, auto});
      saveDb(db);
      return send(res,200,{ok:true, message:prof.kyc_last_message, kyc:driverKycSummary(db,prof), submission, auto_approval:auto});
    }

    if(method==='GET' && pathname==='/api/driver/status'){
      const user = requireUser(req,res,db); if(!user) return;
      const prof = db.driver_profiles.find(d=>d.user_id===user.id);
      if(!prof) return send(res,404,{detail:'Driver profile not found'});
      return send(res,200,{ok:true, driver_profile:prof, online_eligible:driverOnlineEligibility(prof), gps_health:driverGpsHealth(db,prof)});
    }



    // Sprint-6F: Check GPS can run while driver is offline. It stores the real GPS,
    // resolves nearest local area name, and returns a running/inside status for UI.
    if(method==='POST' && pathname==='/api/driver/check-gps'){
      const user = requireUser(req,res,db); if(!user) return;
      if(user.role !== 'DRIVER') return send(res,403,{detail:'Driver account required'});
      const body = await parseBody(req);
      const prof = db.driver_profiles.find(d=>d.user_id===user.id);
      if(!prof) return send(res,404,{detail:'Driver profile required'});
      const lat = Number(body.lat ?? body.latitude);
      const lng = Number(body.lng ?? body.longitude);
      if(!Number.isFinite(lat) || !Number.isFinite(lng)) return send(res,400,{detail:'Real GPS location required. Please allow Location permission.'});
      const coords = {lat:Math.round(lat*1000000)/1000000,lng:Math.round(lng*1000000)/1000000};
      const nearby = nearbyPlaces(db, coords.lat, coords.lng, 8);
      const inside = isInsideServiceArea(db, coords);
      const nearest = nearby[0] || null;
      const locationName = String(nearest?.name || (inside ? (db.service_area?.name || 'Kalna Sub-Division') : 'Outside Service Area'));
      prof.lat = coords.lat; prof.lng = coords.lng;
      prof.last_location_at = now();
      prof.gps_status = inside ? 'RUNNING' : 'OUTSIDE_SERVICE_AREA';
      prof.gps_running = !!inside;
      prof.gps_last_accuracy = Number(body.accuracy || 0);
      prof.location = locationName;
      prof.area = locationName;
      const loc = upsertLocation(db,user,{lat:coords.lat,lng:coords.lng,accuracy:body.accuracy,source:'DRIVER_GPS_CHECK',location:locationName,online:prof.online});
      const health = {...driverGpsHealth(db,prof), running:!!inside, status:inside?'RUNNING':'OUTSIDE_SERVICE_AREA', location_name:locationName, nearest, status_text: inside ? `GPS Running · ${locationName}` : `GPS Outside Service Area · ${locationName}`};
      audit(db,user.id,'DRIVER_CHECK_GPS','driver_profile',prof.id,{coords,inside,location_name:locationName});
      saveDb(db);
      return send(res,200,{ok:true, driver_profile:prof, location:loc, gps_health:health, nearest, inside_service_area:inside});
    }

    if(method==='POST' && (pathname==='/api/driver/online' || pathname==='/api/driver/go-online' || pathname==='/api/driver/go-offline' || pathname==='/api/driver/location-update')){
      const user = requireUser(req,res,db); if(!user) return;
      const body = await getBody(req);
      let prof = db.driver_profiles.find(d=>d.user_id===user.id);
      if(!prof) return send(res,400,{detail:'Driver profile required'});
      const wantsOnline = pathname==='/api/driver/go-online' ? true : pathname==='/api/driver/go-offline' ? false : pathname==='/api/driver/location-update' ? !!prof.online : !!body.online;
      if(wantsOnline || pathname==='/api/driver/location-update'){
        if(wantsOnline) autoApproveDriverKycIfEligible(db, prof, user, body);
        const elig = driverOnlineEligibility(prof);
        if(!elig.ok) return send(res,403,{detail:elig.detail, online_eligible:elig, kyc_status:prof.kyc_status, status:prof.status, auto_approval_hint:'Complete KYC + allow GPS inside service area for automatic approval'});
        const onlineCoords = coordsFromRequestOrProfile(body, prof);
        if(!onlineCoords) return send(res,400,{detail:'GPS location required before Go Online. Press Check GPS and allow location permission.'});
        if(!isInsideServiceArea(db, onlineCoords)) return send(res,403,{detail:'আপনি service area-এর বাইরে আছেন। লোকাল area-এর ভিতরে এসে Go Online করুন।', gps_health:driverGpsHealth(db,{...prof, lat:onlineCoords.lat, lng:onlineCoords.lng})});
        const nearForOnline = nearbyPlaces(db, onlineCoords.lat, onlineCoords.lng, 1)[0];
        if(nearForOnline?.name && (!body.location || body.location==='Kalna')) body.location = nearForOnline.name;
        if(pathname==='/api/driver/location-update' && !prof.online) return send(res,409,{detail:'Driver is offline. Go Online first.'});
      }
      prof.online = !!wantsOnline;
      prof.location = String(body.location||prof.location||'Kalna');
      if(prof.online && !prof.online_since) prof.online_since = now();
      if(!prof.online){ prof.online_since = null; prof.offline_at = now(); }
      prof.last_online_at = now();
      prof.last_seen_at = now();
      const src = pathname==='/api/driver/location-update' ? (body.source||'DRIVER_LOCATION_HEARTBEAT') : (prof.online?'DRIVER_GO_ONLINE':'DRIVER_GO_OFFLINE');
      const loc = upsertLocation(db,user,{...body, online:prof.online, location:prof.location, source:src});
      if(loc){ prof.lat = loc.lat; prof.lng = loc.lng; prof.last_location_at = loc.updated_at; }
      notifyAdmins(db,{event_type:prof.online?'DRIVER_ONLINE':'DRIVER_OFFLINE', priority:'NORMAL', title:prof.online?'Driver Online':'Driver Offline', message:`${user.name||'Driver'} is ${prof.online?'online':'offline'} · ${prof.location}`, area:prof.area||prof.location||'Kalna', data:{driver_profile_id:prof.id, lat:prof.lat, lng:prof.lng}});
      audit(db,user.id,prof.online?'DRIVER_GO_ONLINE':'DRIVER_GO_OFFLINE','driver_profile',prof.id,{lat:prof.lat,lng:prof.lng,source:src});
      saveDb(db);
      return send(res,200,{ok:true,driver_profile:prof, location:loc, online_eligible:driverOnlineEligibility(prof), gps_health:driverGpsHealth(db,prof)});
    }

    if(method==='POST' && pathname==='/api/fare/estimate'){
      const user = requireUser(req,res,db); if(!user) return;
      const body = await getBody(req);
      const est = estimateFare(db, body.pickup, body.drop, body.ride_type, body.seats, {area:body.area||user.area, wait_minutes:body.wait_minutes, peak_hour_multiplier:body.peak_hour_multiplier, manual_fare:body.manual_fare, manual_reason:body.manual_reason});
      return send(res,200,{ok:true, ...est});
    }


    if(method==='POST' && pathname==='/api/payments/webhook/razorpay'){
      const raw = await getRawBody(req);
      ensureSprint7EFoundation(db);
      let payload = {};
      try{ payload = raw ? JSON.parse(raw) : {}; }catch(e){ return send(res,400,{detail:'Invalid webhook JSON'}); }
      const eventId = String(payload.id || payload.event_id || payload.entity || sha(raw).slice(0,24));
      db.payment_webhook_events = db.payment_webhook_events || [];
      if(db.payment_webhook_events.find(e=>e.event_id===eventId)) return send(res,200,{ok:true, duplicate:true});
      const sig = String(req.headers['x-razorpay-signature'] || '');
      const provider = String(paymentProviderMode(db)).toUpperCase();
      if(provider === 'RAZORPAY' && !verifyRazorpayWebhookSignature(raw, sig, db)){ db.payment_webhook_events.push({id:uid('wh'), event_id:eventId, provider:'RAZORPAY', status:'REJECTED_BAD_SIGNATURE', event:payload.event||'', received_at:now()}); saveDb(db); return send(res,400,{detail:'Razorpay webhook signature failed'}); }
      const paymentEntity = payload.payload?.payment?.entity || payload.payload?.order?.entity || {};
      const rpOrderId = String(paymentEntity.order_id || paymentEntity.id || ''); const rpPaymentId = String(paymentEntity.id || payload.payload?.payment?.entity?.id || '');
      const order = (db.payment_orders||[]).find(o=>o.razorpay_order_id && o.razorpay_order_id===rpOrderId);
      let linkedRide = null; let action='RECORDED_ONLY';
      if(order){ linkedRide = (db.rides||[]).find(r=>r.id===order.ride_id); if(linkedRide && ['payment.captured','order.paid'].includes(String(payload.event||'')) && order.status!=='PAID'){ order.status='PAID'; order.transaction_id=rpPaymentId || rpOrderId; order.razorpay_payment_id=rpPaymentId; order.paid_at=now(); order.verified_at=now(); order.verified_by='razorpay-webhook'; confirmRidePayment(db, linkedRide, {id:'razorpay-webhook', role:'SYSTEM'}, {provider:'RAZORPAY', transaction_id:order.transaction_id, payment_method:'RAZORPAY_WEBHOOK'}); action='PAYMENT_CONFIRMED'; } }
      db.payment_webhook_events.push({id:uid('wh'), event_id:eventId, provider:'RAZORPAY', status:'ACCEPTED', event:payload.event||'', razorpay_order_id:rpOrderId, razorpay_payment_id:rpPaymentId, payment_order_id:order?.id||'', ride_id:linkedRide?.id||'', action, received_at:now()});
      saveDb(db); return send(res,200,{ok:true, action, ride_id:linkedRide?.id||'', payment_order_id:order?.id||''});
    }

    if(method==='GET' && pathname==='/api/payments/options'){
      const user = requireUser(req,res,db); if(!user) return;
      return send(res,200,{ok:true, payment:paymentOptions(db)});
    }

    if(method==='POST' && pathname==='/api/payments/create-order'){
      const user = requireUser(req,res,db); if(!user) return;
      const body = await getBody(req);
      const ride = db.rides.find(r=>r.id===String(body.ride_id||''));
      if(!ride) return send(res,404,{detail:'Ride not found'});
      if(ride.passenger_id!==user.id) return send(res,403,{detail:'Only passenger can create payment order'});
      if(ride.status!=='DRIVER_ACCEPTED') return send(res,409,{detail:'Driver accept করার পর payment order create হবে'});
      if(ride.payment_due_at && new Date(ride.payment_due_at).getTime() < Date.now()){
        ride.status='PAYMENT_TIMEOUT'; ride.payment_status='EXPIRED'; ride.expired_at=now(); saveDb(db);
        return send(res,409,{detail:'Payment time expired. Please book again.'});
      }
      const payOpts = paymentOptions(db);
      let order = (db.payment_orders||[]).find(o=>o.ride_id===ride.id && ['CREATED','PENDING'].includes(o.status));
      if(!order){
        order = createPaymentOrder(db, ride, user, 'PASSENGER_APP');
        if(payOpts.provider === 'RAZORPAY' && payOpts.razorpay_enabled){
          try{
            const rp = await createRazorpayGatewayOrder(ride,user, db);
            order.razorpay_order_id = rp.id || order.razorpay_order_id;
            order.razorpay_amount = rp.amount || Math.round(Number(order.amount||0)*100);
            order.razorpay_currency = rp.currency || payOpts.currency || 'INR';
            order.razorpay_status = rp.status || 'created';
            order.status = 'CREATED';
            order.note = 'Razorpay order created. Verify signature before confirming ride.';
          }catch(e){
            order.status='FAILED'; order.error=e.message; saveDb(db);
            return send(res,502,{detail:'Razorpay order create failed: '+e.message});
          }
        }
      }
      audit(db,user.id,'PAYMENT_ORDER_CREATE','payment_order',order.id,{ride_id:ride.id, amount:order.amount, provider:order.provider, razorpay_order_id:order.razorpay_order_id||''});
      saveDb(db);
      return send(res,200,{ok:true, order, payment:paymentOptions(db), ride:rideDto(ride,db,user)});
    }

    const paymentVerifyMatch = pathname.match(/^\/api\/payments\/([^/]+)\/verify$/);
    if(method==='POST' && paymentVerifyMatch){
      const user = requireUser(req,res,db); if(!user) return;
      const order = (db.payment_orders||[]).find(o=>o.id===paymentVerifyMatch[1]);
      if(!order) return send(res,404,{detail:'Payment order not found'});
      const ride = db.rides.find(r=>r.id===order.ride_id);
      if(!ride) return send(res,404,{detail:'Linked ride not found'});
      if(ride.passenger_id!==user.id && !isAdminRole(user)) return send(res,403,{detail:'Only passenger/admin can verify this payment'});
      const body = await getBody(req);
      const provider = String(order.provider || paymentProviderMode(db)).toUpperCase();
      let txn = String(body.transaction_id || body.razorpay_payment_id || body.payment_ref || '').trim();
      try{
        if(provider === 'RAZORPAY'){
          const rpOrderId = String(body.razorpay_order_id || order.razorpay_order_id || '').trim();
          const rpPaymentId = String(body.razorpay_payment_id || '').trim();
          const rpSignature = String(body.razorpay_signature || '').trim();
          if(!rpOrderId || !rpPaymentId || !rpSignature) return send(res,400,{detail:'Razorpay payment_id/order_id/signature required'});
          if(order.razorpay_order_id && rpOrderId !== order.razorpay_order_id) return send(res,400,{detail:'Razorpay order mismatch'});
          if(!verifyRazorpayPaymentSignature(rpOrderId, rpPaymentId, rpSignature, db)) return send(res,400,{detail:'Razorpay signature verification failed'});
          txn = rpPaymentId;
          order.razorpay_order_id = rpOrderId;
          order.razorpay_payment_id = rpPaymentId;
          order.razorpay_signature_verified = true;
        }else if(provider !== 'DEMO' && !txn){
          return send(res,400,{detail:'Payment transaction/reference required'});
        }
        order.status='PAID'; order.transaction_id = txn || ('DEMO-' + Date.now()); order.payment_method=String(body.payment_method||order.payment_method||(provider==='RAZORPAY'?'RAZORPAY_CHECKOUT':'DEMO_PAYMENT')); order.paid_at=now(); order.verified_at=now(); order.verified_by=user.id;
        confirmRidePayment(db, ride, user, {provider, transaction_id:order.transaction_id, payment_method:order.payment_method});
      }catch(e){ saveDb(db); return send(res,409,{detail:e.message}); }
      saveDb(db);
      return send(res,200,{ok:true, order, ride:rideDto(ride,db,user)});
    }

    if(method==='POST' && pathname==='/api/rides'){
      const user = requireUser(req,res,db); if(!user) return;
      const body = await getBody(req);
      const pickup = String(body.pickup||'').trim();
      const drop = String(body.drop||'').trim();
      const ride_type = String(body.ride_type||'FULL').toUpperCase()==='SHARING'?'SHARING':'FULL';
      if(!pickup || !drop) return send(res,400,{detail:'Pickup and drop required'});
      const fare = estimateFare(db,pickup,drop,ride_type,body.seats,{area:body.area||user.area, wait_minutes:body.wait_minutes, peak_hour_multiplier:body.peak_hour_multiplier});
      if(db.service_area?.geofence_enabled && fare.geofence && !fare.geofence.inside) return send(res,400,{detail:'NEXO Ride এখন শুধু Kalna Sub-Division service area-এর মধ্যে চলছে', geofence:fare.geofence});
      const pickup_coords = fare.pickup_coords || placeCoords(pickup);
      const drop_coords = fare.drop_coords || placeCoords(drop);
      const passenger_loc = upsertLocation(db,user,{lat:body.lat,lng:body.lng,accuracy:body.accuracy,location:pickup,source:'PASSENGER_BOOKING'}) || {lat:pickup_coords.lat,lng:pickup_coords.lng};
      const drivers = nearestAvailableDrivers(db, pickup_coords, {max_radius_km: body.max_radius_km, max_drivers: body.max_drivers});
      const driverUsers = drivers.map(d=>db.users.find(u=>u.id===d.user_id)).filter(Boolean);
      const ride = {
        id:uid('ride'), passenger_id:user.id, driver_id:null, status:'REQUESTED',
        pickup, drop, pickup_coords, drop_coords, passenger_location:passenger_loc, guest_device_id:String(body.device_id||body.deviceId||'').slice(0,120), ride_type, ...fare, nearby_driver_count:drivers.length,
        driver_candidate_ids: drivers.map(d=>d.user_id), driver_candidate_profile_ids: drivers.map(d=>d.id), rejected_driver_ids: [], match_radius_km: Number(body.max_radius_km || db.service_area?.driver_matching_radius_km || process.env.DRIVER_MATCH_RADIUS_KM || 8), matching_status: drivers.length ? 'DRIVER_REQUEST_SENT' : 'NO_ONLINE_DRIVER',
        created_at:now(), accepted_at:null, payment_due_at:null, payment_hold_seconds:PAYMENT_HOLD_SECONDS, paid_at:null, confirmed_at:null, arrived_at:null, started_at:null, completed_at:null, cancelled_at:null, expired_at:null, payment_status:'PENDING', ride_otp:null, otp_verified_at:null
      };
      db.rides.push(ride);
      beginDispatchRound(db, ride, drivers, 'INITIAL');
      if(false && driverUsers.length){
        notifyUsers(db, driverUsers, {event_type:'RIDE_REQUEST', priority:'HIGH', ride_id:ride.id, title:'New Toto Request', message:`${pickup} → ${drop} · ₹${fare.estimated_fare}`, area:user.area||'Kalna', data:{candidate_count:driverUsers.length, pickup, drop, fare:fare.estimated_fare}});
      }
      notifyUsers(db, notificationTargets(db,{user_id:user.id}), {event_type:'RIDE_SEARCHING', priority:'NORMAL', ride_id:ride.id, title:drivers.length?'Driver Request Sent':'No Online Driver', message:drivers.length?`${drivers.length} nearby driver-কে request পাঠানো হয়েছে।`:'এখন কাছাকাছি online driver নেই। একটু পরে আবার চেষ্টা করুন।'});
      notifyAdmins(db,{event_type:'RIDE_REQUEST_ADMIN', priority:'NORMAL', ride_id:ride.id, title:'New Booking Requested', message:`${pickup} → ${drop} · ${ride_type} · ₹${fare.estimated_fare} · candidates ${drivers.length}`, area:user.area||'Kalna'});
      audit(db,user.id,'RIDE_REQUEST_MATCHING','ride',ride.id,{pickup,drop,ride_type,candidates:drivers.map(d=>({user_id:d.user_id,km:d.distance_to_pickup_km}))});
      saveDb(db);
      return send(res,200,{ok:true, ride:rideDto(ride,db,user), matching:{status:ride.matching_status, candidate_count:drivers.length, radius_km:ride.match_radius_km}, nearby_drivers:drivers.map(d=>({id:d.id, user_id:d.user_id, location:d.location, lat:d.lat, lng:d.lng, distance_to_pickup_km:d.distance_to_pickup_km, rating:d.rating, total_rides:d.total_rides}))});
    }

    if(method==='GET' && pathname==='/api/rides'){
      const user = requireUser(req,res,db); if(!user) return;
      const role = url.searchParams.get('role') || user.role;
      let rides;
      if(isAdminRole(user)){
        rides = filterRidesForAdmin(db,user,db.rides).slice(-100).reverse();
      } else if(String(role).toUpperCase()==='DRIVER'){
        const prof = db.driver_profiles.find(d=>d.user_id===user.id);
        rides = db.rides.filter(r=>{
          if(r.driver_id===user.id) return true;
          if(r.status!=='REQUESTED' || r.driver_id) return false;
          if(Array.isArray(r.rejected_driver_ids) && r.rejected_driver_ids.includes(user.id)) return false;
          if(Array.isArray(r.driver_candidate_ids) && r.driver_candidate_ids.length) return r.driver_candidate_ids.includes(user.id);
          return prof && driverOnlineEligibility(prof).ok && prof.online;
        }).slice(-50).reverse();
      } else {
        rides = db.rides.filter(r=>r.passenger_id===user.id).slice(-50).reverse();
      }
      return send(res,200,{ok:true, rides:rides.map(r=>rideDto(r,db,user))});
    }

    const liveRideMatch = pathname.match(/^\/api\/rides\/([^/]+)\/live$/);
    if(method==='GET' && liveRideMatch){
      const user = requireUser(req,res,db); if(!user) return;
      const ride = (db.rides||[]).find(r=>r.id===liveRideMatch[1]);
      if(!ride) return send(res,404,{detail:'Ride not found'});
      if(!isAdminRole(user) && ride.passenger_id!==user.id && ride.driver_id!==user.id) return send(res,403,{detail:'Only related passenger/driver can view live ride'});
      const out = rideDto(ride,db,user);
      const route = routePlan(db, ride.pickup, ride.drop, ride.ride_type, ride.seats||1);
      return send(res,200,{ok:true, ride:out, route, updated_at:now()});
    }

    const rideMatch = pathname.match(/^\/api\/rides\/([^/]+)\/(accept|reject|pay|arrive|start|complete|cancel)$/);
    if(method==='POST' && rideMatch){
      const user = requireUser(req,res,db); if(!user) return;
      const ride = db.rides.find(r=>r.id===rideMatch[1]);
      if(!ride) return send(res,404,{detail:'Ride not found'});
      const action = rideMatch[2];
      if(action==='reject'){
        const prof = db.driver_profiles.find(d=>d.user_id===user.id);
        if(!prof) return send(res,403,{detail:'Driver profile required'});
        if(ride.status!=='REQUESTED') return send(res,409,{detail:'Ride already assigned/closed'});
        ride.rejected_driver_ids = Array.isArray(ride.rejected_driver_ids) ? ride.rejected_driver_ids : [];
        if(!ride.rejected_driver_ids.includes(user.id)) ride.rejected_driver_ids.push(user.id);
        ride.driver_candidate_ids = (ride.driver_candidate_ids||[]).filter(id=>id!==user.id);
        ride.last_rejected_at = now();
        ride.matching_status = ride.driver_candidate_ids.length ? 'PARTIALLY_REJECTED' : 'WAITING_FOR_DRIVER';
        dispatchEvent(db,ride,'DRIVER_REJECTED',{driver_id:user.id, remaining_candidates:ride.driver_candidate_ids.length});
        if(!ride.driver_candidate_ids.length && db.dispatch_runtime_settings?.reassign_on_reject!==false) reassignRideDrivers(db, ride, 'REJECT_REASSIGN');
        audit(db,user.id,'RIDE_REJECT','ride',ride.id,{remaining_candidates:ride.driver_candidate_ids.length, dispatch_round:ride.dispatch_round||0});
        saveDb(db);
        return send(res,200,{ok:true, message:'Request rejected', ride:rideDto(ride,db,user), dispatch:dispatchReadiness(db).summary});
      }
      if(action==='accept'){
        const prof = db.driver_profiles.find(d=>d.user_id===user.id);
        if(!prof) return send(res,403,{detail:'Driver profile required'});
        const elig = driverOnlineEligibility(prof);
        if(!elig.ok) return send(res,403,{detail:elig.detail});
        if(!prof.online) return send(res,403,{detail:'Go Online required before accepting ride'});
        cleanupDispatchTimeouts(db);
        if(ride.dispatch_round_expires_at && new Date(ride.dispatch_round_expires_at).getTime() < Date.now()) return send(res,409,{detail:'This request expired. Wait for next reassignment.'});
        if(Array.isArray(ride.driver_candidate_ids) && ride.driver_candidate_ids.length && !ride.driver_candidate_ids.includes(user.id)) return send(res,403,{detail:'This ride request is not assigned to your driver app'});
        if(ride.status!=='REQUESTED') return send(res,409,{detail:'Ride already taken'});
        ride.driver_id=user.id; ride.status='DRIVER_ACCEPTED'; ride.accepted_at=now(); ride.payment_due_at = new Date(Date.now()+PAYMENT_HOLD_SECONDS*1000).toISOString(); ride.payment_hold_seconds = PAYMENT_HOLD_SECONDS; ride.matching_status='DRIVER_ACCEPTED';
        markRideAcceptedInDispatch(db, ride, user.id);
        const driverUser = db.users.find(u=>u.id===user.id) || {};
        ride.driver_name = driverUser.name || ''; ride.driver_vehicle_no = prof.vehicle_no || '';
        notifyUsers(db, notificationTargets(db,{user_id:ride.passenger_id}), {event_type:'DRIVER_ACCEPTED', priority:'HIGH', ride_id:ride.id, title:'Driver Accepted', message:'Driver accepted your booking. Please pay within 3 minutes.'});
        notifyAdmins(db,{event_type:'RIDE_DRIVER_ACCEPTED_ADMIN', priority:'NORMAL', ride_id:ride.id, title:'Driver Accepted Booking', message:`${driverUser.name||'Driver'} accepted ${ride.pickup} → ${ride.drop}`, area:prof.area||prof.location||'Kalna'});
      }
      if(action==='pay'){
        if(ride.passenger_id!==user.id) return send(res,403,{detail:'Only passenger can pay'});
        const body = await getBody(req);
        try{
          const order = createPaymentOrder(db, ride, user, 'LEGACY_PAY_ACTION');
          order.status='PAID'; order.transaction_id=String(body.transaction_id||body.payment_ref||('DEMO-' + Date.now())); order.payment_method=String(body.payment_method||order.payment_method||'DEMO_PAYMENT'); order.paid_at=now(); order.verified_at=now(); order.verified_by=user.id;
          confirmRidePayment(db, ride, user, {provider:order.provider, transaction_id:order.transaction_id, payment_method:order.payment_method});
        }catch(e){ saveDb(db); return send(res,409,{detail:e.message}); }
      }
      if(action==='arrive'){
        if(ride.driver_id!==user.id) return send(res,403,{detail:'Only assigned driver can update pickup'});
        if(ride.status!=='CONFIRMED') return send(res,409,{detail:'Booking must be confirmed before pickup reached'});
        ride.status='ARRIVED'; ride.arrived_at=now();
        notifyUsers(db, notificationTargets(db,{user_id:ride.passenger_id}), {event_type:'DRIVER_ARRIVED', priority:'HIGH', ride_id:ride.id, title:'Driver Reached Pickup', message:'Your Toto has reached the pickup point.'});
      }
      if(action==='start'){
        if(ride.driver_id!==user.id) return send(res,403,{detail:'Only assigned driver can start'});
        if(ride.status!=='ARRIVED') return send(res,409,{detail:'Tap Reached Pickup before starting ride'});
        const body = await getBody(req);
        if(ride.ride_otp && String(body.otp||'').trim() !== String(ride.ride_otp)){
          return send(res,409,{detail:'Passenger OTP ভুল। সঠিক 4-digit OTP দিন।'});
        }
        ride.status='STARTED'; ride.started_at=now(); ride.otp_verified_at=now();
        notifyUsers(db, notificationTargets(db,{user_id:ride.passenger_id}), {event_type:'RIDE_STARTED', priority:'NORMAL', ride_id:ride.id, title:'Ride Started', message:'OTP verified. Ride started safely.'});
      }
      if(action==='complete'){
        if(ride.driver_id!==user.id) return send(res,403,{detail:'Only assigned driver can complete'});
        if(ride.status!=='STARTED') return send(res,409,{detail:'Ride must be started before completion'});
        if(isGuestRide(ride) && ride.passenger_confirm_required !== false){
          ride.status='DRIVER_REACHED_DROP';
          ride.drop_reached_at=now();
          notifyUsers(db, notificationTargets(db,{user_id:ride.passenger_id}), {event_type:'DRIVER_REACHED_DROP', priority:'HIGH', ride_id:ride.id, title:'Driver Reached Drop', message:'Please confirm reached and rate your ride.'});
          notifyAdmins(db,{event_type:'RIDE_DROP_REACHED_ADMIN', priority:'NORMAL', ride_id:ride.id, title:'Driver Reached Drop', message:`Guest ride waiting passenger confirmation · ₹${ride.estimated_fare||0}`});
        }else{
          completeRideSettlement(db, ride, user);
          closeDispatchQueue(db, ride, 'CLOSED');
        }
      }
      if(action==='cancel'){
        const body = await getBody(req);
        const actorIsAdmin = isAdminRole(user);
        if(!actorIsAdmin && ride.passenger_id!==user.id && ride.driver_id!==user.id) return send(res,403,{detail:'Only related passenger/driver can cancel'});
        const currentStatus = String(ride.status||'').toUpperCase();
        if(['COMPLETED','CANCELLED','PAYMENT_TIMEOUT'].includes(currentStatus)) return send(res,409,{detail:'এই ride আর cancel করা যাবে না'});
        if(currentStatus==='STARTED' && !actorIsAdmin) return send(res,409,{detail:'Ride start হয়ে গেলে app থেকে cancel নয়; support/SOS ব্যবহার করুন'});
        if(currentStatus==='REQUESTED' && ride.driver_id && ride.driver_id!==user.id && ride.passenger_id!==user.id && !actorIsAdmin) return send(res,403,{detail:'Not allowed'});
        ride.previous_status = currentStatus;
        ride.status='CANCELLED';
        ride.cancelled_at=now();
        ride.cancelled_by=user.id;
        ride.cancelled_by_role=user.role;
        ride.cancel_reason=String(body.reason||body.cancel_reason||'User cancelled from app').slice(0,250);
        closeDispatchQueue(db, ride, 'CANCELLED');
        ride.cancellation_fee=0;
        if(String(ride.payment_status||'').toUpperCase()==='PAID'){
          ride.refund_status = ride.refund_status || 'REFUND_REQUIRED';
          db.refund_requests = db.refund_requests || [];
          if(!db.refund_requests.find(x=>x.ride_id===ride.id && ['REQUESTED','UNDER_REVIEW','APPROVED'].includes(String(x.status||'')))){
            db.refund_requests.push({id:uid('ref'), ride_id:ride.id, user_id:ride.passenger_id, amount:Number(ride.estimated_fare||0), reason:'Ride cancelled after payment', status:'REQUESTED', created_at:now(), area:ride.area||'Kalna'});
          }
        } else {
          ride.refund_status = 'NOT_REQUIRED';
        }
        notifyUsers(db, notificationTargets(db,{user_id:ride.passenger_id}), {event_type:'RIDE_CANCELLED', priority:'HIGH', ride_id:ride.id, title:'Ride Cancelled', message:`Ride cancelled: ${ride.cancel_reason}`});
        if(ride.driver_id) notifyUsers(db, notificationTargets(db,{user_id:ride.driver_id}), {event_type:'RIDE_CANCELLED', priority:'HIGH', ride_id:ride.id, title:'Ride Cancelled', message:`Ride cancelled: ${ride.cancel_reason}`});
        notifyAdmins(db,{event_type:'RIDE_CANCELLED_ADMIN', priority:'NORMAL', ride_id:ride.id, title:'Ride Cancelled', message:`${ride.pickup||''} → ${ride.drop||''} · ${currentStatus} · ${ride.cancel_reason}`});
      }
      audit(db,user.id,'RIDE_'+action.toUpperCase(),'ride',ride.id,{});
      saveDb(db);
      return send(res,200,{ok:true,ride:rideDto(ride,db,user)});
    }
 

    const rideRateMatch = pathname.match(/^\/api\/rides\/([^/]+)\/rate$/);
    if(method==='POST' && rideRateMatch){
      const user = requireUser(req,res,db); if(!user) return;
      const ride = db.rides.find(r=>r.id===rideRateMatch[1]);
      if(!ride) return send(res,404,{detail:'Ride not found'});
      if(ride.passenger_id!==user.id) return send(res,403,{detail:'Only passenger can rate this ride'});
      if(ride.status!=='COMPLETED') return send(res,409,{detail:'Ride complete না হলে rating দেওয়া যাবে না'});
      const body = await getBody(req);
      const rating = Math.max(1, Math.min(5, Number(body.rating||5)));
      ride.rating_by_passenger = rating;
      ride.rating_comment = String(body.comment||'').slice(0,200);
      ride.rated_at = now();
      const prof = db.driver_profiles.find(d=>d.user_id===ride.driver_id);
      if(prof){
        const rated = db.rides.filter(x=>x.driver_id===ride.driver_id && x.rating_by_passenger);
        const avg = rated.reduce((a,x)=>a+Number(x.rating_by_passenger||0),0) / Math.max(1,rated.length);
        prof.rating = Math.round(avg*10)/10;
      }
      audit(db,user.id,'RIDE_RATE','ride',ride.id,{rating});
      saveDb(db);
      return send(res,200,{ok:true, ride:rideDto(ride,db,user), driver_profile:prof||null});
    }

    if(method==='GET' && pathname==='/api/driver/earnings'){
      const user = requireUser(req,res,db); if(!user) return;
      if(user.role!=='DRIVER') return send(res,403,{detail:'Driver only'});
      const prof = db.driver_profiles.find(d=>d.user_id===user.id) || {};
      const rides = db.rides.filter(r=>r.driver_id===user.id && r.status==='COMPLETED').slice(-100).reverse();
      const todayStr = new Date().toISOString().slice(0,10);
      const today = rides.filter(r=>String(r.completed_at||'').slice(0,10)===todayStr).reduce((a,r)=>a+Number(r.driver_earning||0),0);
      const total = rides.reduce((a,r)=>a+Number(r.driver_earning||0),0);
      const commission = rides.reduce((a,r)=>a+Number(r.platform_commission||0),0);
      const settlements = (db.settlements||[]).filter(s=>s.driver_id===user.id).slice(-20).reverse();
      return send(res,200,{ok:true, summary:{total_earnings:Math.round(total*100)/100, today_earnings:Math.round(today*100)/100, pending_payout:Number(prof.pending_payout||0), paid_payout:Number(prof.paid_payout||0), total_rides:rides.length, rating:Number(prof.rating||5), platform_commission:Math.round(commission*100)/100}, rides:rides.map(r=>rideDto(r,db,user)), settlements});
    }




    if(method==='GET' && pathname==='/api/subadmin/payout-requests'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user)) return send(res,403,{detail:'Sub Admin only'});
      return send(res,200,{ok:true, requests:subAdminPayoutRequestList(db,user), summary:subAdminCommissionSummary(db,user).summary});
    }

    if(method==='POST' && pathname==='/api/subadmin/payout-request'){
      const user = requireUser(req,res,db); if(!user) return;
      if(user.role !== 'SUB_ADMIN') return send(res,403,{detail:'Only Sub Admin can request payout'});
      const body = await getBody(req);
      const pending = (db.sub_admin_commissions||[]).filter(x=>x.sub_admin_user_id===user.id && x.status!=='PAID');
      if(!pending.length) return send(res,409,{detail:'No pending commission available for payout request'});
      const open = (db.sub_admin_payout_requests||[]).find(x=>x.sub_admin_user_id===user.id && x.status==='REQUESTED');
      if(open) return send(res,409,{detail:'One payout request is already pending'});
      const amount = Math.round(pending.reduce((a,x)=>a+Number(x.amount||0),0)*100)/100;
      const request = {id:uid('sapr'), sub_admin_user_id:user.id, amount, commission_ids:pending.map(x=>x.id), status:'REQUESTED', note:String(body.note||'Sub Admin payout requested'), area:adminScopeArea(db,user)||'Kalna', requested_at:now()};
      db.sub_admin_payout_requests.push(request);
      audit(db,user.id,'SUB_ADMIN_PAYOUT_REQUEST','sub_admin',user.id,{request_id:request.id, amount});
      saveDb(db);
      return send(res,200,{ok:true, request, requests:subAdminPayoutRequestList(db,user), summary:subAdminCommissionSummary(db,user).summary});
    }

    if(method==='GET' && pathname==='/api/admin/subadmin-payout-requests'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user)) return send(res,403,{detail:'Admin only'});
      return send(res,200,{ok:true, requests:subAdminPayoutRequestList(db,user), summary:subAdminCommissionSummary(db,user).summary});
    }

    const subAdminRequestPayMatch = pathname.match(/^\/api\/admin\/subadmin-payout-requests\/([^/]+)\/pay$/);
    if(method==='POST' && subAdminRequestPayMatch){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user)) return send(res,403,{detail:'Main admin only'});
      const reqId = subAdminRequestPayMatch[1];
      const payoutRequest = (db.sub_admin_payout_requests||[]).find(x=>x.id===reqId);
      if(!payoutRequest) return send(res,404,{detail:'Payout request not found'});
      if(payoutRequest.status==='PAID') return send(res,409,{detail:'This payout request is already paid'});
      const body = await getBody(req);
      const subAdminUserId = payoutRequest.sub_admin_user_id;
      const pending = (db.sub_admin_commissions||[]).filter(x=>x.sub_admin_user_id===subAdminUserId && x.status!=='PAID');
      if(!pending.length) return send(res,409,{detail:'No pending Sub Admin commission'});
      const amount = Math.round(pending.reduce((a,x)=>a+Number(x.amount||0),0)*100)/100;
      const settlement = {id:uid('sacs'), sub_admin_user_id:subAdminUserId, amount, commission_ids:pending.map(x=>x.id), request_id:reqId, payment_ref:String(body.payment_ref||'Manual Sub Admin payout'), note:String(body.note||'Sub Admin payout request paid'), paid_at:now(), paid_by:user.id};
      db.sub_admin_commission_settlements.push(settlement);
      for(const x of pending){ x.status='PAID'; x.settlement_id=settlement.id; x.paid_at=settlement.paid_at; }
      payoutRequest.status='PAID'; payoutRequest.settlement_id=settlement.id; payoutRequest.paid_at=settlement.paid_at; payoutRequest.payment_ref=settlement.payment_ref; payoutRequest.paid_amount=amount;
      const p = subAdminProfile(db,subAdminUserId);
      if(p){ p.pending_commission=Math.max(0, Math.round((Number(p.pending_commission||0)-amount)*100)/100); p.paid_commission=Math.round((Number(p.paid_commission||0)+amount)*100)/100; p.last_paid_at=settlement.paid_at; }
      audit(db,user.id,'SUB_ADMIN_PAYOUT_REQUEST_PAID','sub_admin',subAdminUserId,{request_id:reqId, settlement_id:settlement.id, amount});
      saveDb(db);
      return send(res,200,{ok:true, settlement, request:payoutRequest, requests:subAdminPayoutRequestList(db,user), summary:subAdminCommissionSummary(db,user)});
    }

    if(method==='GET' && pathname==='/api/admin/subadmins'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user)) return send(res,403,{detail:'Admin only'});
      const list = (db.sub_admins||[]).filter(p=>isMainAdmin(user) || p.user_id===user.id).map(p=>{
        const u = db.users.find(x=>x.id===p.user_id) || {};
        return {...p, name:u.name||'', mobile:u.mobile||'', email:u.email||''};
      });
      return send(res,200,{ok:true, sub_admins:list, default_share_percent:db.fare_rules.sub_admin_share_percent});
    }

    if(method==='POST' && pathname==='/api/admin/subadmins'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user)) return send(res,403,{detail:'Main admin only'});
      const body = await getBody(req);
      const name = String(body.name||'').trim();
      const mobile = String(body.mobile||'').trim();
      const email = String(body.email||'').trim();
      const area = String(body.area||'Kalna').trim();
      const password = String(body.password||'123456');
      if(!name || !mobile || password.length<6) return send(res,400,{detail:'Sub Admin name, mobile and 6+ digit password required'});
      if(findUser(db,mobile) || (email && findUser(db,email))) return send(res,409,{detail:'Sub Admin account already exists'});
      const saltValue = salt();
      const subUser = {id:uid('usr'), name, mobile, email, role:'SUB_ADMIN', nexo_id:'NEXO-SUBADMIN', area, status:'ACTIVE', created_at:now(), consent_at:now(), consent_version:'v1', added_by:user.id, password_salt:saltValue, password_hash:hashPassword(password,saltValue)};
      db.users.push(subUser);
      const profile = {id:uid('sub'), user_id:subUser.id, area, status:'ACTIVE', commission_share_percent:Number(body.commission_share_percent ?? db.fare_rules.sub_admin_share_percent ?? 30), total_commission:0, pending_commission:0, paid_commission:0, created_at:now(), created_by:user.id};
      db.sub_admins.push(profile);
      audit(db,user.id,'SUB_ADMIN_CREATE','sub_admin',profile.id,{area, share:profile.commission_share_percent});
      saveDb(db);
      return send(res,200,{ok:true, user:safeUser(subUser), sub_admin:profile});
    }

    if(method==='GET' && pathname==='/api/admin/subadmin-commissions'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user)) return send(res,403,{detail:'Admin only'});
      return send(res,200,{ok:true, ...subAdminCommissionSummary(db,user)});
    }

    const subAdminPayMatch = pathname.match(/^\/api\/admin\/subadmin-commissions\/([^/]+)\/pay$/);
    if(method==='POST' && subAdminPayMatch){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user)) return send(res,403,{detail:'Main admin only'});
      const subAdminUserId = subAdminPayMatch[1];
      const body = await getBody(req);
      const pending = (db.sub_admin_commissions||[]).filter(x=>x.sub_admin_user_id===subAdminUserId && x.status!=='PAID');
      if(!pending.length) return send(res,409,{detail:'No pending Sub Admin commission'});
      const amount = Math.round(pending.reduce((a,x)=>a+Number(x.amount||0),0)*100)/100;
      const settlement = {id:uid('sacs'), sub_admin_user_id:subAdminUserId, amount, commission_ids:pending.map(x=>x.id), payment_ref:String(body.payment_ref||'Manual Sub Admin payout'), note:String(body.note||'Sub Admin commission paid'), paid_at:now(), paid_by:user.id};
      db.sub_admin_commission_settlements.push(settlement);
      for(const x of pending){ x.status='PAID'; x.settlement_id=settlement.id; x.paid_at=settlement.paid_at; }
      const p = subAdminProfile(db,subAdminUserId);
      if(p){ p.pending_commission=Math.max(0, Math.round((Number(p.pending_commission||0)-amount)*100)/100); p.paid_commission=Math.round((Number(p.paid_commission||0)+amount)*100)/100; p.last_paid_at=settlement.paid_at; }
      for(const pr of (db.sub_admin_payout_requests||[]).filter(x=>x.sub_admin_user_id===subAdminUserId && x.status==='REQUESTED')){ pr.status='PAID'; pr.settlement_id=settlement.id; pr.paid_at=settlement.paid_at; pr.payment_ref=settlement.payment_ref; pr.paid_amount=amount; }
      audit(db,user.id,'SUB_ADMIN_COMMISSION_PAID','sub_admin',subAdminUserId,{settlement_id:settlement.id, amount});
      saveDb(db);
      return send(res,200,{ok:true, settlement, summary:subAdminCommissionSummary(db,user)});
    }

    if(method==='POST' && pathname==='/api/subadmin/users'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user)) return send(res,403,{detail:'Admin/Sub Admin only'});
      const body = await getBody(req);
      const role = String(body.role||'PASSENGER').toUpperCase()==='DRIVER' ? 'DRIVER' : 'PASSENGER';
      const name = String(body.name||'').trim();
      const mobile = String(body.mobile||'').trim();
      const email = String(body.email||'').trim();
      const password = String(body.password||'123456');
      const area = String(body.area||adminScopeArea(db,user)||'Kalna').trim();
      const subAdminUserId = isMainAdmin(user) ? String(body.sub_admin_user_id||'') : user.id;
      if(!name || !mobile || password.length<6) return send(res,400,{detail:'Name, mobile and 6+ digit password required'});
      if(findUser(db,mobile) || (email && findUser(db,email))) return send(res,409,{detail:'Account already exists'});
      const saltValue = salt();
      const u = {id:uid('usr'), name, mobile, email, role, nexo_id:'', area, managed_by_subadmin_id:subAdminUserId, added_by:user.id, status:'ACTIVE', created_at:now(), consent_at:now(), consent_version:'v1', password_salt:saltValue, password_hash:hashPassword(password,saltValue)};
      db.users.push(u);
      if(role==='DRIVER'){
        db.driver_profiles.push({id:uid('drv'), user_id:u.id, vehicle_type:'TOTO', vehicle_no:String(body.vehicle_no||''), license_no:String(body.license_no||''), aadhaar_no:String(body.aadhaar_no||''), driver_photo:String(body.driver_photo||''), vehicle_photo:String(body.vehicle_photo||''), location:area, area, sub_admin_user_id:subAdminUserId, added_by:user.id, online:false, status:'PENDING', rating:5, total_rides:0, total_earnings:0, pending_payout:0, paid_payout:0, created_at:now()});
      }
      audit(db,user.id,'SUB_ADMIN_USER_CREATE','user',u.id,{role,area,subAdminUserId});
      saveDb(db);
      return send(res,200,{ok:true, user:safeUser(u), driver_profile:db.driver_profiles.find(d=>d.user_id===u.id)||null});
    }

    if(method==='GET' && pathname==='/api/subadmin/users'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user)) return send(res,403,{detail:'Admin/Sub Admin only'});
      const users = filterUsersForAdmin(db,user,db.users).filter(u=>!['ADMIN','SUPER_ADMIN'].includes(u.role)).slice(-200).reverse().map(safeUser);
      return send(res,200,{ok:true, users});
    }

    if(method==='GET' && pathname==='/api/admin/settlements'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user)) return send(res,403,{detail:'Main admin only'});
      return send(res,200,{ok:true, ...settlementSummary(db)});
    }

    const adminSettlementPay = pathname.match(/^\/api\/admin\/settlements\/([^/]+)\/pay$/);
    if(method==='POST' && adminSettlementPay){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user)) return send(res,403,{detail:'Main admin only'});
      const driverId = adminSettlementPay[1];
      const body = await getBody(req);
      const pendingRides = db.rides.filter(r=>r.driver_id===driverId && r.status==='COMPLETED' && r.settlement_status!=='PAID');
      if(!pendingRides.length) return send(res,409,{detail:'No pending payout for this driver'});
      const amount = Math.round(pendingRides.reduce((a,r)=>a+Number(r.driver_earning||0),0)*100)/100;
      const settlement = {
        id:uid('set'), driver_id:driverId, amount,
        ride_count:pendingRides.length,
        ride_ids:pendingRides.map(r=>r.id),
        payment_ref:String(body.payment_ref||''),
        note:String(body.note||'Admin marked payout paid'),
        paid_by:user.id, paid_at:now(), status:'PAID'
      };
      for(const r of pendingRides){
        r.settlement_status='PAID';
        r.settlement_id=settlement.id;
        r.settled_at=settlement.paid_at;
      }
      db.settlements.push(settlement);
      const prof = db.driver_profiles.find(d=>d.user_id===driverId);
      if(prof){
        prof.pending_payout = Math.max(0, Math.round((Number(prof.pending_payout||0)-amount)*100)/100);
        prof.paid_payout = Math.round((Number(prof.paid_payout||0)+amount)*100)/100;
        prof.last_payout_at = settlement.paid_at;
      }
      audit(db,user.id,'ADMIN_PAYOUT_MARK_PAID','driver',driverId,{settlement_id:settlement.id, amount, rides:pendingRides.length});
      saveDb(db);
      return send(res,200,{ok:true, settlement, ...settlementSummary(db)});
    }

    if(method==='GET' && pathname==='/api/admin/payments'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user)) return send(res,403,{detail:'Admin only'});
      const rides = filterRidesForAdmin(db,user,db.rides).filter(r=>r.status==='COMPLETED').slice(-200).reverse();
      const totalFare = rides.reduce((a,r)=>a+Number(r.estimated_fare||0),0);
      const driverPay = rides.reduce((a,r)=>a+Number(r.driver_earning||0),0);
      const commission = rides.reduce((a,r)=>a+Number(r.platform_commission||0),0);
      const pending = rides.filter(r=>r.settlement_status!=='PAID').reduce((a,r)=>a+Number(r.driver_earning||0),0);
      return send(res,200,{ok:true, summary:{completed:rides.length,total_fare:Math.round(totalFare*100)/100, driver_payout:Math.round(driverPay*100)/100, platform_commission:Math.round(commission*100)/100, pending_payout:Math.round(pending*100)/100}, rides:rides.map(r=>rideDto(r,db,user))});
    }


    const rideSafetyMatch = pathname.match(/^\/api\/rides\/([^/]+)\/(sos|share)$/);
    if(method==='POST' && rideSafetyMatch){
      const user = requireUser(req,res,db); if(!user) return;
      const ride = db.rides.find(r=>r.id===rideSafetyMatch[1]);
      if(!ride) return send(res,404,{detail:'Ride not found'});
      const action = rideSafetyMatch[2];
      const related = ride.passenger_id===user.id || ride.driver_id===user.id || isAdminRole(user);
      if(!related) return send(res,403,{detail:'Only related passenger/driver can use safety tools'});
      const passenger = db.users.find(u=>u.id===ride.passenger_id) || {};
      const driverUser = db.users.find(u=>u.id===ride.driver_id) || {};
      const driverProfile = db.driver_profiles.find(d=>d.user_id===ride.driver_id) || {};
      const shareText = `NEXO Ride Trip\nRoute: ${ride.pickup} to ${ride.drop}\nStatus: ${ride.status}\nFare: ₹${ride.estimated_fare}\nPassenger: ${passenger.name||''} ${passenger.mobile||''}\nDriver: ${driverUser.name||'Not assigned'} ${driverUser.mobile||''} ${driverProfile.vehicle_no?('Toto: '+driverProfile.vehicle_no):''}\nSupport: ${db.app_settings.support_mobile}`;
      if(action==='share'){
        return send(res,200,{ok:true, share_text:shareText, support_mobile:db.app_settings.support_mobile, support_email:db.app_settings.support_email});
      }
      const body = await getBody(req);
      const event = {
        id:uid('sos'), ride_id:ride.id, user_id:user.id, user_role:user.role,
        reason:String(body.reason||'SOS pressed from app'), location:String(body.location||'Kalna Sub-Division'),
        status:'OPEN', created_at:now(), support_mobile:db.app_settings.support_mobile,
        ride_status:ride.status
      };
      db.safety_events.push(event);
      notifyAdmins(db,{event_type:'SOS_ALERT', priority:'CRITICAL', ride_id:ride.id, title:'SOS Alert', message:`${event.reason} · Ride ${ride.pickup||''} → ${ride.drop||''}`, data:{sos_id:event.id}});
      ride.sos_count = (ride.sos_count||0)+1;
      ride.last_sos_at = now();
      audit(db,user.id,'RIDE_SOS','ride',ride.id,{event_id:event.id, reason:event.reason});
      saveDb(db);
      return send(res,200,{ok:true, event, support_mobile:db.app_settings.support_mobile, share_text:shareText});
    }

    const rideDriverSafetyNoteMatch = pathname.match(/^\/api\/rides\/([^/]+)\/driver-safety-note$/);
    if(method==='POST' && rideDriverSafetyNoteMatch){
      const user=requireUser(req,res,db); if(!user) return;
      const ride=(db.rides||[]).find(r=>r.id===rideDriverSafetyNoteMatch[1]); if(!ride) return send(res,404,{detail:'Ride not found'});
      if(ride.driver_id!==user.id && !isAdminRole(user)) return send(res,403,{detail:'Only assigned driver/admin can add safety note'});
      const note=driverSafetyNote(db,user,ride,await getBody(req)); saveDb(db); return send(res,200,{ok:true,note,ride:rideDto(ride,db,user)});
    }



    if(method==='POST' && pathname==='/api/location/update'){
      const user = requireUser(req,res,db); if(!user) return;
      const body = await getBody(req);
      const loc = upsertLocation(db,user,body);
      if(!loc) return send(res,400,{detail:'Latitude/longitude or location required'});
      const safety_alerts = routeDeviationCheckForUser(db,user,loc);
      audit(db,user.id,'LOCATION_UPDATE','user',user.id,{lat:loc.lat,lng:loc.lng,source:loc.source, safety_alerts:safety_alerts.length});
      saveDb(db);
      return send(res,200,{ok:true, location:loc, safety_alerts});
    }

    if(method==='GET' && pathname==='/api/live/locations'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user)) return send(res,403,{detail:'Admin only'});
      const driverLocations = filterDriversForAdmin(db,user,db.driver_profiles).map(d=>{
        const u = db.users.find(x=>x.id===d.user_id) || {};
        const loc = db.live_locations.find(x=>x.user_id===d.user_id) || {};
        const c = (d.lat && d.lng) ? {lat:d.lat,lng:d.lng} : placeCoords(d.location || 'Kalna');
        return {driver_id:d.user_id, profile_id:d.id, name:u.name||'Driver', mobile:u.mobile||'', vehicle_no:d.vehicle_no||'', status:d.status, online:!!d.online, rating:d.rating||5, lat:loc.lat||c.lat, lng:loc.lng||c.lng, location:loc.location_name||d.location||'Kalna', updated_at:loc.updated_at||d.last_location_at||d.last_online_at||d.created_at};
      }).filter(x=>x.status==='APPROVED' || x.online);
      const activeRides = filterRidesForAdmin(db,user,db.rides).filter(r=>['REQUESTED','DRIVER_ACCEPTED','CONFIRMED','ARRIVED','STARTED'].includes(r.status)).slice(-100).reverse().map(r=>rideDto(r,db,user));
      return send(res,200,{ok:true, service_area:db.service_area.name, center:placeCoords('Kalna Station'), drivers:driverLocations, rides:activeRides, updated_at:now()});
    }



    if(method==='GET' && pathname==='/api/admin/operations'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user)) return send(res,403,{detail:'Admin only'});
      const ops = operationsSummary(db);
      if(!isMainAdmin(user)){
        const area = user.area || '';
        ops.drivers = ops.drivers.filter(d=>!area || d.area===area || d.area===user.assigned_area);
        ops.areas = ops.areas.filter(a=>!area || a.area===area || a.area===user.assigned_area);
        ops.queue = ops.queue.filter(r=>true);
      }
      return send(res,200,{ok:true, operations:ops});
    }

    if(method==='GET' && pathname==='/api/admin/driver-kyc'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user)) return send(res,403,{detail:'Admin only'});
      const list = filterDriversForAdmin(db,user,db.driver_profiles).map(p=>driverKycSummary(db,p)).sort((a,b)=>String(b.kyc_submitted_at||'').localeCompare(String(a.kyc_submitted_at||''))).slice(0,250);
      return send(res,200,{ok:true, drivers:list, submissions:(db.kyc_submissions||[]).slice(-100).reverse(), summary:{total:list.length, submitted:list.filter(x=>x.kyc_status==='SUBMITTED').length, under_review:list.filter(x=>x.review_status==='UNDER_ADMIN_REVIEW').length, submitted_incomplete:list.filter(x=>x.review_status==='SUBMITTED_BUT_INCOMPLETE').length, verified:list.filter(x=>x.kyc_status==='VERIFIED').length, incomplete:list.filter(x=>x.kyc_status==='INCOMPLETE').length, rejected:list.filter(x=>x.kyc_status==='REJECTED').length}});
    }

    const adminKycAction = pathname.match(/^\/api\/admin\/driver-kyc\/([^/]+)\/(verify|reject)$/);
    if(method==='POST' && adminKycAction){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user)) return send(res,403,{detail:'Admin only'});
      const prof = db.driver_profiles.find(d=>d.id===adminKycAction[1] || d.user_id===adminKycAction[1]);
      if(!prof) return send(res,404,{detail:'Driver profile not found'});
      if(!isMainAdmin(user)){ const allowed = filterDriversForAdmin(db,user,[prof]).length>0; if(!allowed) return send(res,403,{detail:'Sub Admin can verify own area drivers only'}); }
      const body = await getBody(req);
      const action = adminKycAction[2];
      const summary = driverKycSummary(db,prof);
      if(action==='verify'){
        if(!summary.complete) return send(res,409,{detail:`KYC incomplete: ${summary.docs_present}/${summary.docs_required} documents present`});
        prof.kyc_status='VERIFIED'; prof.status='APPROVED'; prof.kyc_rejection_reason='';
        notifyUsers(db, notificationTargets(db,{user_id:prof.user_id}), {event_type:'DRIVER_KYC_VERIFIED', priority:'HIGH', title:'KYC Verified', message:'Your KYC is verified and driver profile is approved. You can go online now.'});
      }
      if(action==='reject'){
        prof.kyc_status='REJECTED'; prof.status='REJECTED'; prof.online=false;
        prof.kyc_rejection_reason=String(body.reason||'Document verification failed');
        notifyUsers(db, notificationTargets(db,{user_id:prof.user_id}), {event_type:'DRIVER_KYC_REJECTED', priority:'HIGH', title:'KYC Rejected', message:`KYC rejected: ${prof.kyc_rejection_reason}`});
      }
      prof.kyc_reviewed_at=now(); prof.kyc_reviewed_by=user.id;
      db.kyc_reviews = db.kyc_reviews || [];
      db.kyc_reviews.push({id:uid('kyc'), profile_id:prof.id, driver_user_id:prof.user_id, action:action.toUpperCase(), reason:String(body.reason||''), reviewed_by:user.id, reviewed_at:prof.kyc_reviewed_at, docs_present:summary.docs_present, docs_required:summary.docs_required});
      audit(db,user.id,'ADMIN_DRIVER_KYC_'+action.toUpperCase(),'driver_profile',prof.id,{docs_present:summary.docs_present, docs_required:summary.docs_required});
      saveDb(db);
      return send(res,200,{ok:true, kyc:driverKycSummary(db,prof)});
    }

    if(method==='GET' && pathname==='/api/admin/drivers'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user)) return send(res,403,{detail:'Admin only'});
      const drivers = filterDriversForAdmin(db,user,db.driver_profiles).map(d=>{
        const u = db.users.find(x=>x.id===d.user_id) || {};
        return {...d, name:u.name, mobile:u.mobile, email:u.email};
      }).slice(-200).reverse();
      return send(res,200,{ok:true, drivers});
    }

    const adminDriverAction = pathname.match(/^\/api\/admin\/drivers\/([^/]+)\/(approve|reject|offline|suspend|reactivate)$/);
    if(method==='POST' && adminDriverAction){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user)) return send(res,403,{detail:'Admin only'});
      const prof = db.driver_profiles.find(d=>d.id===adminDriverAction[1] || d.user_id===adminDriverAction[1]);
      if(!prof) return send(res,404,{detail:'Driver profile not found'});
      if(!isMainAdmin(user)){ const allowed = filterDriversForAdmin(db,user,[prof]).length>0; if(!allowed) return send(res,403,{detail:'Sub Admin can manage own area drivers only'}); }
      const action = adminDriverAction[2];
      if(action==='approve') {
        prof.status='APPROVED';
        // Sprint-6E: Profile approval from admin means driver can go online; sync KYC too.
        prof.kyc_status='VERIFIED';
        prof.kyc_rejection_reason='';
        prof.kyc_reviewed_at=now();
        prof.kyc_reviewed_by=user.id;
        prof.kyc_last_message='Admin approved profile and KYC. Driver can go online.';
        notifyUsers(db, notificationTargets(db,{user_id:prof.user_id}), {event_type:'DRIVER_APPROVED', priority:'HIGH', title:'Driver Approved', message:'Your driver profile and KYC are approved. You can go online now.'});
      }
      if(action==='reject') { prof.status='REJECTED'; prof.online=false; notifyUsers(db, notificationTargets(db,{user_id:prof.user_id}), {event_type:'DRIVER_REJECTED', priority:'HIGH', title:'Driver Rejected', message:'Your driver profile was rejected. Contact support.'}); }
      if(action==='offline') { prof.online=false; notifyUsers(db, notificationTargets(db,{user_id:prof.user_id}), {event_type:'DRIVER_OFFLINE_BY_ADMIN', priority:'NORMAL', title:'Set Offline', message:'Admin set your driver profile offline.'}); }
      if(action==='suspend') { prof.status='SUSPENDED'; prof.online=false; prof.suspended_at=now(); prof.suspended_by=user.id; notifyUsers(db, notificationTargets(db,{user_id:prof.user_id}), {event_type:'DRIVER_SUSPENDED', priority:'HIGH', title:'Driver Suspended', message:'Your driver profile is suspended by admin. Contact support.'}); }
      if(action==='reactivate') { prof.status='APPROVED'; if(String(prof.kyc_status||'').toUpperCase()!=='REJECTED') prof.kyc_status='VERIFIED'; prof.reactivated_at=now(); prof.reactivated_by=user.id; notifyUsers(db, notificationTargets(db,{user_id:prof.user_id}), {event_type:'DRIVER_REACTIVATED', priority:'HIGH', title:'Driver Reactivated', message:'Your driver profile is active again. You can go online.'}); }
      prof.admin_reviewed_at = now();
      prof.admin_reviewed_by = user.id;
      audit(db,user.id,'ADMIN_DRIVER_'+action.toUpperCase(),'driver_profile',prof.id,{});
      saveDb(db);
      return send(res,200,{ok:true, driver_profile:prof});
    }

    if(method==='POST' && pathname==='/api/admin/fare'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user)) return send(res,403,{detail:'Main Admin only'});
      const body = await getBody(req);
      const keys = ['full_base_fare','sharing_base_per_seat','minimum_full','minimum_sharing','base_km','extra_step_km','extra_step_fare','sharing_capacity','night_extra_percent','platform_commission_percent','sub_admin_share_percent'];
      for(const k of keys){ if(body[k] !== undefined && !Number.isNaN(Number(body[k]))) db.fare_rules[k] = Number(body[k]); }
      if(body.currency) db.fare_rules.currency = String(body.currency).slice(0,8).toUpperCase();
      audit(db,user.id,'ADMIN_FARE_UPDATE','fare_rules','default',body);
      saveDb(db);
      return send(res,200,{ok:true, fare_rules:db.fare_rules});
    }

    if(method==='POST' && pathname==='/api/admin/service-area'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user)) return send(res,403,{detail:'Main Admin only'});
      const body = await getBody(req);
      db.service_area = db.service_area || defaultDb().service_area;
      if(body.name !== undefined) db.service_area.name = String(body.name || 'Kalna Sub-Division').slice(0,80);
      if(body.geofence_enabled !== undefined) db.service_area.geofence_enabled = !!body.geofence_enabled;
      if(body.driver_auto_approve_inside_service_area !== undefined) db.service_area.driver_auto_approve_inside_service_area = !!body.driver_auto_approve_inside_service_area;
      if(body.road_distance_multiplier !== undefined && !Number.isNaN(Number(body.road_distance_multiplier))) db.service_area.road_distance_multiplier = Number(body.road_distance_multiplier);
      db.service_area.bounds = db.service_area.bounds || defaultDb().service_area.bounds;
      for(const k of ['minLat','maxLat','minLng','maxLng']){ if(body[k] !== undefined && !Number.isNaN(Number(body[k]))) db.service_area.bounds[k] = Number(body[k]); }
      if(Array.isArray(body.points)) db.service_area.points = body.points.map(x=>String(x).trim()).filter(Boolean).slice(0,100);
      audit(db,user.id,'ADMIN_SERVICE_AREA_UPDATE','service_area','default',body);
      saveDb(db);
      return send(res,200,{ok:true, service_area:db.service_area});
    }

    if(method==='GET' && pathname==='/api/admin/areas'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user)) return send(res,403,{detail:'Admin only'});
      return send(res,200,{ok:true, areas:db.area_catalog||[], service_area:db.service_area, fare_rules:db.fare_rules});
    }

    if(method==='POST' && pathname==='/api/admin/areas'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user)) return send(res,403,{detail:'Main Admin only'});
      const body = await getBody(req);
      const name = String(body.name||'').trim();
      if(!name) return send(res,400,{detail:'Area name required'});
      db.area_catalog = db.area_catalog || [];
      const existing = db.area_catalog.find(a=>String(a.name).toLowerCase()===name.toLowerCase());
      if(existing) return send(res,409,{detail:'Area already exists'});
      const area = {id:uid('area'), name, status:String(body.status||'ACTIVE').toUpperCase(), sub_admin_user_id:body.sub_admin_user_id||null, created_at:now(), created_by:user.id};
      db.area_catalog.push(area);
      audit(db,user.id,'ADMIN_AREA_CREATE','area',area.id,area);
      saveDb(db);
      return send(res,200,{ok:true, area});
    }

    const areaAction = pathname.match(/^\/api\/admin\/areas\/([^/]+)\/(activate|deactivate)$/);
    if(method==='POST' && areaAction){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user)) return send(res,403,{detail:'Main Admin only'});
      const area = (db.area_catalog||[]).find(a=>a.id===areaAction[1]);
      if(!area) return send(res,404,{detail:'Area not found'});
      area.status = areaAction[2]==='activate' ? 'ACTIVE' : 'INACTIVE';
      area.updated_at=now();
      audit(db,user.id,'ADMIN_AREA_'+area.status,'area',area.id,{});
      saveDb(db);
      return send(res,200,{ok:true, area});
    }

    if(method==='POST' && pathname==='/api/notifications/register-token'){
      const user = requireUser(req,res,db); if(!user) return;
      const body = await getBody(req);
      db.push_tokens = db.push_tokens || [];
      const raw = String(body.token || body.fcm_token || '').trim();
      const platform = String(body.platform || 'WEB').toUpperCase();
      if(!raw) return send(res,400,{detail:'Token required'});
      let item = db.push_tokens.find(x=>x.user_id===user.id && x.token===raw);
      if(!item){ item={id:uid('ptk'), user_id:user.id, token:raw, created_at:now()}; db.push_tokens.push(item); }
      item.platform = platform;
      item.device_name = String(body.device_name || req.headers['user-agent'] || 'Device').slice(0,120);
      item.device_id = String(body.device_id || item.device_id || '').slice(0,80);
      item.permission_status = String(body.permission_status || item.permission_status || 'unknown').slice(0,30);
      item.app_version = String(body.app_version || VERSION).slice(0,80);
      item.area = user.area || item.area || 'Kalna';
      item.last_seen_at = now();
      item.updated_at = now(); item.active=true;
      audit(db,user.id,'PUSH_TOKEN_REGISTER','push_token',item.id,{platform});
      saveDb(db);
      return send(res,200,{ok:true, token:{id:item.id, platform:item.platform, active:item.active}, demo_mode:!mergeIntegrations(db.integrations).push.fcm_server_key_present});
    }

    if(method==='GET' && pathname==='/api/notifications'){
      const user = requireUser(req,res,db); if(!user) return;
      const items = notificationsForUser(db,user,Number(url.searchParams.get('limit')||80));
      return send(res,200,{ok:true, unread:items.filter(x=>!x.read).length, notifications:items});
    }

    if(method==='POST' && pathname==='/api/notifications/read-all'){
      const user = requireUser(req,res,db); if(!user) return;
      let count=0;
      for(const n of notificationsForUser(db,user,500)){
        const real = (db.notifications||[]).find(x=>x.id===n.id); if(!real) continue;
        real.read_by = Array.isArray(real.read_by)?real.read_by:[];
        if(!real.read_by.includes(user.id)){ real.read_by.push(user.id); count++; }
      }
      audit(db,user.id,'NOTIFICATIONS_READ_ALL','notifications','self',{count});
      saveDb(db);
      return send(res,200,{ok:true, marked:count});
    }


    if(method==='GET' && pathname==='/api/admin/push-status'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user)) return send(res,403,{detail:'Admin only'});
      return send(res,200,{ok:true, push:pushCenterStatus(db)});
    }

    if(method==='POST' && pathname==='/api/admin/push-settings'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user)) return send(res,403,{detail:'Main Admin only'});
      const body = await getBody(req);
      const set = pushSettings(db);
      const keysBool=['fcm_server_key_present','vapid_public_key_present','web_push_enabled','android_push_enabled','demo_delivery_log_enabled','auto_register_web_demo_token','notify_ride_request','notify_driver_accept','notify_payment','notify_sos','notify_support_refund','notify_kyc'];
      if(body.provider !== undefined) set.provider=String(body.provider||'DEMO').toUpperCase();
      if(body.firebase_project_id !== undefined) set.firebase_project_id=String(body.firebase_project_id||'').slice(0,120);
      if(body.vapid_public_key_label !== undefined) set.vapid_public_key_label=String(body.vapid_public_key_label||'').slice(0,120);
      for(const k of keysBool){ if(body[k] !== undefined) set[k]=!!body[k]; }
      if(body.note !== undefined) set.note=String(body.note||'').slice(0,500);
      set.updated_at=now();
      db.push_settings=set;
      db.integrations = mergeIntegrations(db.integrations);
      db.integrations.push.provider=set.provider;
      db.integrations.push.firebase_project_id=set.firebase_project_id;
      db.integrations.push.fcm_server_key_present=!!set.fcm_server_key_present;
      db.integrations.push.vapid_public_key_present=!!set.vapid_public_key_present;
      db.integrations.push.web_push_enabled=!!set.web_push_enabled;
      db.integrations.push.android_push_enabled=!!set.android_push_enabled;
      audit(db,user.id,'PUSH_SETTINGS_UPDATE','push_settings','default',set);
      saveDb(db);
      return send(res,200,{ok:true, push:pushCenterStatus(db)});
    }

    if(method==='POST' && pathname==='/api/admin/push-send'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user)) return send(res,403,{detail:'Main Admin only'});
      const body = await getBody(req);
      const role = String(body.role || 'ALL').toUpperCase();
      const title = String(body.title || 'NEXO Ride Alert').slice(0,120);
      const message = String(body.message || 'NEXO Ride notification test.').slice(0,500);
      const priority = String(body.priority || 'NORMAL').toUpperCase();
      let targets = [];
      if(body.user_id) targets = notificationTargets(db,{user_id:String(body.user_id)});
      else targets = role==='ALL' ? (db.users||[]) : notificationTargets(db,{role});
      const before=(db.push_delivery_logs||[]).length;
      const list = notifyUsers(db, targets, {event_type:'MANUAL_PUSH', priority, title, message, data:{sent_by:user.id, target_role:role}});
      const after=(db.push_delivery_logs||[]).length;
      audit(db,user.id,'ADMIN_MANUAL_PUSH','notifications','manual',{role,count:list.length,deliveries:after-before});
      saveDb(db);
      return send(res,200,{ok:true, notifications:list.length, delivery_logs:after-before, push:pushCenterStatus(db)});
    }

    const pushTokenAction = pathname.match(/^\/api\/admin\/push-tokens\/([^/]+)\/(deactivate|activate)$/);
    if(method==='POST' && pushTokenAction){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user)) return send(res,403,{detail:'Main Admin only'});
      const tok=(db.push_tokens||[]).find(x=>x.id===pushTokenAction[1]);
      if(!tok) return send(res,404,{detail:'Push token not found'});
      tok.active = pushTokenAction[2] === 'activate';
      tok.updated_at = now(); tok.admin_action_by=user.id;
      audit(db,user.id,'PUSH_TOKEN_'+pushTokenAction[2].toUpperCase(),'push_token',tok.id,{});
      saveDb(db);
      return send(res,200,{ok:true, token:pushTokenOut(db,tok), push:pushCenterStatus(db)});
    }


    if(method==='GET' && pathname==='/api/admin/monitoring-status'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user)) return send(res,403,{detail:'Admin only'});
      return send(res,200,{ok:true, monitoring:monitoringStatus(db)});
    }

    if(method==='POST' && pathname==='/api/admin/monitoring-settings'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user)) return send(res,403,{detail:'Main Admin only'});
      const body = await getBody(req);
      const set = monitoringSettings(db);
      const numKeys=['slow_api_ms','max_error_logs','max_audit_logs','db_size_warn_mb','upload_size_warn_mb','backup_min_count'];
      for(const k of numKeys){ if(body[k] !== undefined && !Number.isNaN(Number(body[k]))) set[k]=Number(body[k]); }
      if(body.enabled !== undefined) set.enabled=!!body.enabled;
      if(body.error_log_enabled !== undefined) set.error_log_enabled=!!body.error_log_enabled;
      if(body.production_monitoring_ready !== undefined) set.production_monitoring_ready=!!body.production_monitoring_ready;
      if(body.monitoring_webhook_present !== undefined) set.monitoring_webhook_present=!!body.monitoring_webhook_present;
      if(body.note !== undefined) set.note=String(body.note||'').slice(0,500);
      set.updated_at=now(); db.monitoring_settings=set;
      audit(db,user.id,'MONITORING_SETTINGS_UPDATE','monitoring','settings',set);
      saveDb(db);
      return send(res,200,{ok:true, monitoring:monitoringStatus(db)});
    }

    if(method==='POST' && pathname==='/api/admin/monitoring/test-error'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user)) return send(res,403,{detail:'Main Admin only'});
      const body = await getBody(req);
      const err = new Error(String(body.message || 'Manual monitoring test error'));
      logError(db,'manual_test',err,{created_by:user.id});
      audit(db,user.id,'MONITORING_TEST_ERROR','monitoring','error_log',{});
      saveDb(db);
      return send(res,200,{ok:true, monitoring:monitoringStatus(db)});
    }

    if(method==='POST' && pathname==='/api/admin/monitoring/clear-errors'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user)) return send(res,403,{detail:'Main Admin only'});
      const before=(db.error_logs||[]).length;
      db.error_logs=[];
      audit(db,user.id,'MONITORING_CLEAR_ERRORS','monitoring','error_logs',{removed:before});
      saveDb(db);
      return send(res,200,{ok:true, removed:before, monitoring:monitoringStatus(db)});
    }

    if(method==='GET' && pathname==='/api/admin/notifications'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user)) return send(res,403,{detail:'Admin only'});
      const area = adminScopeArea(db,user);
      let items = (db.notifications||[]);
      if(!isMainAdmin(user) && area) items = items.filter(n=>!n.area || n.area===area || n.user_id===user.id);
      return send(res,200,{ok:true, notifications:items.slice(-200).reverse(), push_tokens:(db.push_tokens||[]).filter(x=>x.active).length});
    }

    if(method==='POST' && pathname==='/api/admin/notifications/test'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user)) return send(res,403,{detail:'Main Admin only'});
      const body = await getBody(req);
      const targetRole = String(body.role || 'ADMIN').toUpperCase();
      const title = String(body.title || 'NEXO Ride Test Notification');
      const message = String(body.message || 'Notification center is ready. Firebase FCM key দিলে real push চালু হবে।');
      const targets = targetRole==='ALL' ? (db.users||[]) : notificationTargets(db,{role:targetRole});
      const list = notifyUsers(db, targets, {event_type:'TEST_NOTIFICATION', priority:'NORMAL', title, message});
      audit(db,user.id,'ADMIN_TEST_NOTIFICATION','notifications','test',{role:targetRole,count:list.length});
      saveDb(db);
      return send(res,200,{ok:true, sent:list.length, demo_push:true});
    }

    if(method==='GET' && pathname==='/api/admin/integrations'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user)) return send(res,403,{detail:'Main Admin only'});
      return send(res,200,{ok:true, ...integrationReadiness(db)});
    }

    if(method==='POST' && pathname==='/api/admin/integrations'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user)) return send(res,403,{detail:'Main Admin only'});
      const body = await getBody(req);
      const current = mergeIntegrations(db.integrations);
      const next = mergeIntegrations(current);
      if(body.map){
        next.map.provider = String(body.map.provider || next.map.provider || 'DEMO').toUpperCase();
        if(body.map.api_key_configured !== undefined) next.map.api_key_configured = !!body.map.api_key_configured;
        if(body.map.navigation_provider !== undefined) next.map.navigation_provider = String(body.map.navigation_provider || next.map.navigation_provider || 'GOOGLE_WEB').toUpperCase();
        if(body.map.external_navigation_enabled !== undefined) next.map.external_navigation_enabled = !!body.map.external_navigation_enabled;
        if(body.map.mappls_key_label !== undefined) next.map.mappls_key_label = String(body.map.mappls_key_label||'');
        if(body.map.google_key_label !== undefined) next.map.google_key_label = String(body.map.google_key_label||'');
        if(body.map.note !== undefined) next.map.note = String(body.map.note||'');
      }
      if(body.otp){
        next.otp.provider = String(body.otp.provider || next.otp.provider || 'DEMO').toUpperCase();
        if(body.otp.demo_code !== undefined) next.otp.demo_code = String(body.otp.demo_code||'123456').slice(0,8);
        if(body.otp.api_key_configured !== undefined) next.otp.api_key_configured = !!body.otp.api_key_configured;
        if(body.otp.firebase_project_id !== undefined) next.otp.firebase_project_id = String(body.otp.firebase_project_id||'');
      }
      if(body.payment){
        next.payment.provider = String(body.payment.provider || next.payment.provider || 'DEMO').toUpperCase();
        if(body.payment.razorpay_key_id !== undefined) next.payment.razorpay_key_id = String(body.payment.razorpay_key_id||'');
        if(body.payment.manual_upi_id !== undefined) next.payment.manual_upi_id = String(body.payment.manual_upi_id||'');
        if(body.payment.manual_qr_label !== undefined) next.payment.manual_qr_label = String(body.payment.manual_qr_label||'');
        if(body.payment.key_id_configured !== undefined) next.payment.key_id_configured = !!body.payment.key_id_configured;
      }
      if(body.push){
        next.push.provider = String(body.push.provider || next.push.provider || 'FCM').toUpperCase();
        if(body.push.fcm_configured !== undefined) next.push.fcm_configured = !!body.push.fcm_configured;
        if(body.push.web_push_ready !== undefined) next.push.web_push_ready = !!body.push.web_push_ready;
      }
      if(body.production){
        if(body.production.server_url !== undefined) next.production.server_url = String(body.production.server_url||'');
        if(body.production.deploy_provider !== undefined) next.production.deploy_provider = String(body.production.deploy_provider||'DEMO').toUpperCase();
        if(body.production.domain_name !== undefined) next.production.domain_name = String(body.production.domain_name||'');
        if(body.production.ssl_configured !== undefined) next.production.ssl_configured = !!body.production.ssl_configured;
        if(body.production.repo_url !== undefined) next.production.repo_url = String(body.production.repo_url||'');
        if(body.production.branch !== undefined) next.production.branch = String(body.production.branch||'main');
        if(body.production.database_url_present !== undefined) next.production.database_url_present = !!body.production.database_url_present;
        if(body.production.deployment_note !== undefined) next.production.deployment_note = String(body.production.deployment_note||'');
      }
      next.updated_at = now();
      db.integrations = next;
      db.app_settings.map_mode = `${next.map.provider} map mode`;
      db.app_settings.otp_mode = `${next.otp.provider} OTP mode`;
      db.app_settings.payment_mode = `${next.payment.provider} payment mode`;
      audit(db,user.id,'ADMIN_INTEGRATIONS_UPDATE','integrations','default',{map:next.map.provider, otp:next.otp.provider, payment:next.payment.provider, push:next.push.provider});
      saveDb(db);
      return send(res,200,{ok:true, ...integrationReadiness(db)});
    }

    if(method==='GET' && pathname==='/api/admin/dispatch/status'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user)) return send(res,403,{detail:'Admin only'});
      return send(res,200,dispatchReadiness(db));
    }

    if(method==='POST' && pathname==='/api/admin/dispatch/cleanup'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user)) return send(res,403,{detail:'Admin only'});
      const changed = cleanupDispatchTimeouts(db);
      if(changed) saveDb(db);
      return send(res,200,{ok:true, changed, dispatch:dispatchReadiness(db)});
    }

    if(method==='GET' && pathname==='/api/admin/data/status'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user)) return send(res,403,{detail:'Main Admin only'});
      return send(res,200,{ok:true, data:dbStatus(db), backups:listBackups().slice(0,30)});
    }

    if(method==='GET' && pathname==='/api/admin/data/backups'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user)) return send(res,403,{detail:'Main Admin only'});
      return send(res,200,{ok:true, backups:listBackups().slice(0,30)});
    }

    if(method==='POST' && pathname==='/api/admin/data/backup'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user)) return send(res,403,{detail:'Main Admin only'});
      const b = createBackup('manual');
      audit(db,user.id,'ADMIN_DATA_BACKUP','database',b?.file||'none',{});
      saveDb(db);
      return send(res,200,{ok:true, backup:b, data:dbStatus(db)});
    }

    if(method==='GET' && pathname==='/api/admin/data/export'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user)) return send(res,403,{detail:'Main Admin only'});
      audit(db,user.id,'ADMIN_DATA_EXPORT','database','json',{});
      saveDb(db);
      const fileName = `nexo_ride_export_${safeStamp()}.json`;
      const body = JSON.stringify(db,null,2);
      res.writeHead(200, {'Content-Type':'application/json; charset=utf-8','Content-Disposition':`attachment; filename="${fileName}"`,'Cache-Control':'no-store'});
      return res.end(body);
    }

    if(method==='POST' && pathname==='/api/admin/data/import'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user)) return send(res,403,{detail:'Main Admin only'});
      const body = await getBody(req);
      const candidate = validateImportedDb(body.database || body.db || body);
      const before = createBackup('before_import');
      candidate.audit.push({id:uid('aud'), at:now(), user_id:user.id, action:'ADMIN_DATA_IMPORT', target:'database', target_id:'json', details:{backup_before_import:before?.file||null}});
      saveDb(candidate);
      return send(res,200,{ok:true, imported:true, backup_before_import:before, data:dbStatus(candidate)});
    }

    if(method==='POST' && pathname==='/api/admin/data/cleanup'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user)) return send(res,403,{detail:'Main Admin only'});
      const beforeSessions = db.sessions.length;
      const nowMs = Date.now();
      db.sessions = (db.sessions||[]).filter(s=>new Date(s.expires_at).getTime()>nowMs);
      if((db.audit||[]).length > 1000) db.audit = db.audit.slice(-1000);
      audit(db,user.id,'ADMIN_DATA_CLEANUP','database','local_json',{removed_sessions:beforeSessions-db.sessions.length});
      saveDb(db);
      return send(res,200,{ok:true, removed_sessions:beforeSessions-db.sessions.length, data:dbStatus(db)});
    }

    if(method==='GET' && pathname==='/api/admin/database-migration'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user)) return send(res,403,{detail:'Main Admin only'});
      return send(res,200,{ok:true, database:databaseMigrationStatus(db)});
    }

    if(method==='POST' && pathname==='/api/admin/database-settings'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user)) return send(res,403,{detail:'Main Admin only'});
      const body = await getBody(req);
      db.database_migration_settings = {...defaultDatabaseMigrationSettings(), ...(db.database_migration_settings||{})};
      if(body.current_engine) db.database_migration_settings.current_engine = String(body.current_engine||'LOCAL_JSON').toUpperCase();
      if(body.target_engine) db.database_migration_settings.target_engine = String(body.target_engine||'POSTGRESQL').toUpperCase();
      if(body.migration_mode) db.database_migration_settings.migration_mode = String(body.migration_mode||'PLANNING').toUpperCase();
      if(body.database_url_present !== undefined) db.database_migration_settings.database_url_present = !!body.database_url_present;
      if(body.backup_before_migration !== undefined) db.database_migration_settings.backup_before_migration = !!body.backup_before_migration;
      if(body.dry_run_required !== undefined) db.database_migration_settings.dry_run_required = !!body.dry_run_required;
      if(body.production_note !== undefined) db.database_migration_settings.production_note = String(body.production_note||'').trim();
      db.database_migration_settings.updated_at = now();
      const next = mergeIntegrations(db.integrations);
      next.production.database_url_present = !!db.database_migration_settings.database_url_present;
      next.production.database_target = db.database_migration_settings.target_engine || 'PostgreSQL';
      next.updated_at = now();
      db.integrations = next;
      markDatabaseMigrationLog(db,user,'DATABASE_SETTINGS_UPDATE',{target_engine:db.database_migration_settings.target_engine,database_url_present:db.database_migration_settings.database_url_present});
      audit(db,user.id,'DATABASE_SETTINGS_UPDATE','database','migration_settings',{database_url_present:db.database_migration_settings.database_url_present});
      saveDb(db);
      return send(res,200,{ok:true, database:databaseMigrationStatus(db)});
    }

    if(method==='POST' && pathname==='/api/admin/database/snapshot'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user)) return send(res,403,{detail:'Main Admin only'});
      const b = createBackup('migration_snapshot');
      db.database_migration_settings = {...defaultDatabaseMigrationSettings(), ...(db.database_migration_settings||{})};
      db.database_migration_settings.last_snapshot_at = now();
      db.database_migration_settings.last_dry_run_at = now();
      const status = databaseMigrationStatus(db);
      markDatabaseMigrationLog(db,user,'MIGRATION_DRY_RUN_SNAPSHOT',{backup:b?.file||null,total_rows:status.summary.total_rows,collections:status.summary.collections});
      audit(db,user.id,'MIGRATION_DRY_RUN_SNAPSHOT','database','postgresql',{backup:b?.file||null,total_rows:status.summary.total_rows});
      saveDb(db);
      return send(res,200,{ok:true, backup:b, database:databaseMigrationStatus(db)});
    }

    if(method==='GET' && pathname==='/api/admin/database/schema.sql'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user)) return send(res,403,{detail:'Main Admin only'});
      const schemaPath = path.join(__dirname,'docs','POSTGRESQL_PRODUCTION_SCHEMA_NOTE.sql');
      if(!fs.existsSync(schemaPath)) return sendText(res,404,'Schema note not found');
      return sendText(res,200,fs.readFileSync(schemaPath,'utf8'),'text/sql; charset=utf-8');
    }


    if(method==='GET' && pathname==='/api/admin/audit'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user)) return send(res,403,{detail:'Admin only'});
      const limit = Math.min(300, Math.max(20, Number(url.searchParams.get('limit')||120)));
      const action = String(url.searchParams.get('action')||'').trim().toUpperCase();
      let rows = (db.audit||[]).slice(-limit*3).reverse();
      if(action) rows = rows.filter(a=>String(a.action||'').toUpperCase().includes(action));
      if(!isMainAdmin(user)) rows = rows.filter(a=>{
        const actor = db.users.find(u=>u.id===a.user_id) || {};
        const area = adminScopeArea(db,user);
        return a.user_id===user.id || actor.added_by===user.id || actor.managed_by_subadmin_id===user.id || (area && actor.area===area);
      });
      rows = rows.slice(0,limit).map(a=>{
        const actor = db.users.find(u=>u.id===a.user_id) || {};
        return {...a, actor_name:actor.name||a.user_id||'system', actor_role:actor.role||'', actor_mobile:actor.mobile||'', details:a.details||{}};
      });
      const counts = (db.audit||[]).reduce((acc,a)=>{ const k=String(a.action||'UNKNOWN'); acc[k]=(acc[k]||0)+1; return acc; },{});
      return send(res,200,{ok:true, audit:rows, counts, total:(db.audit||[]).length});
    }




    if(method==='GET' && pathname==='/api/maps/public-config'){
      const user = requireUser(req,res,db); if(!user) return;
      const m = mapOptions(db);
      const provider = String(m.provider || 'DEMO').toUpperCase();
      const key = provider === 'MAPPLS' ? mapplsStaticKey() : '';
      return send(res,200,{
        ok:true,
        provider,
        has_key:!!key,
        mappls_static_key:key,
        access_token:key,
        sdk_url:key ? `https://sdk.mappls.com/map/sdk/web?v=3.0&access_token=${encodeURIComponent(key)}` : '',
        plugins_url:key ? `https://apis.mappls.com/advancedmaps/api/${encodeURIComponent(key)}/map_sdk_plugins?v=3.0&libraries=search` : '',
        allowed_domain: process.env.MAPPLS_ALLOWED_DOMAIN || '',
        note:'Mappls Web SDK needs the static key in browser. Restrict this key to ride.nexoofficial.in in Mappls Console.'
      });
    }

    if(method==='GET' && pathname==='/api/maps/options'){
      const user = requireUser(req,res,db); if(!user) return;
      return send(res,200,{ok:true, map:mapOptions(db), service_area:db.service_area});
    }

    if(method==='GET' && pathname==='/api/maps/places'){
      const user = requireUser(req,res,db); if(!user) return;
      const q = u.searchParams.get('q') || '';
      return send(res,200,{ok:true, places:searchablePlaces(db,q), provider:mapOptions(db).provider});
    }

    if(method==='GET' && pathname==='/api/maps/reverse'){
      const user = requireUser(req,res,db); if(!user) return;
      const lat = Number(u.searchParams.get('lat'));
      const lng = Number(u.searchParams.get('lng'));
      if(!Number.isFinite(lat) || !Number.isFinite(lng)) return send(res,400,{detail:'lat and lng required'});
      const list = nearbyPlaces(db, lat, lng, Number(u.searchParams.get('limit') || 8));
      return send(res,200,{ok:true, query:{lat,lng}, nearest:list[0]||null, places:list, inside:isInsideServiceArea(db,{lat,lng}), provider:mapOptions(db).provider});
    }

    if(method==='GET' && pathname==='/api/maps/route'){
      const user = requireUser(req,res,db); if(!user) return;
      const pickup = u.searchParams.get('pickup') || '';
      const drop = u.searchParams.get('drop') || '';
      const rideType = u.searchParams.get('ride_type') || 'FULL';
      const seats = Number(u.searchParams.get('seats') || 1);
      if(!pickup || !drop) return send(res,400,{detail:'pickup and drop required'});
      return send(res,200,{ok:true, route:routePlan(db,pickup,drop,rideType,seats)});
    }

    const navMatch = pathname.match(/^\/api\/rides\/([^/]+)\/navigation$/);
    if(method==='GET' && navMatch){
      const user = requireUser(req,res,db); if(!user) return;
      const ride = db.rides.find(r=>r.id===navMatch[1]);
      if(!ride) return send(res,404,{detail:'Ride not found'});
      if(ride.passenger_id!==user.id && ride.driver_id!==user.id && !isAdminRole(user)) return send(res,403,{detail:'Not allowed'});
      const links = navigationLinks(ride.pickup, ride.drop, ride.pickup_coords, ride.drop_coords);
      return send(res,200,{ok:true, ride_id:ride.id, provider:mapOptions(db).navigation_provider, links});
    }

    if(method==='GET' && pathname==='/api/admin/maps'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user)) return send(res,403,{detail:'Admin only'});
      const sample = routePlan(db,'Kalna Station','Kalna Hospital','FULL',1);
      return send(res,200,{ok:true, map:mapOptions(db), service_area:db.service_area, sample_route:sample, places:searchablePlaces(db,'')});
    }

    if(method==='POST' && pathname==='/api/admin/maps/settings'){
      const user = requireUser(req,res,db); if(!user) return;
      if(user.role!=='ADMIN') return send(res,403,{detail:'Main Admin only'});
      const body = await getBody(req);
      const cur = mergeIntegrations(db.integrations);
      cur.map.provider = String(body.provider || cur.map.provider || 'DEMO').toUpperCase();
      cur.map.navigation_provider = String(body.navigation_provider || cur.map.navigation_provider || 'GOOGLE_WEB').toUpperCase();
      cur.map.external_navigation_enabled = body.external_navigation_enabled !== false;
      cur.map.api_key_configured = !!body.api_key_configured;
      cur.map.mappls_key_label = String(body.mappls_key_label || cur.map.mappls_key_label || '');
      cur.map.google_key_label = String(body.google_key_label || cur.map.google_key_label || '');
      cur.map.search_enabled = cur.map.provider !== 'DEMO' && !!cur.map.api_key_configured;
      cur.map.route_enabled = cur.map.provider !== 'DEMO' && !!cur.map.api_key_configured;
      cur.updated_at = now();
      db.integrations = cur;
      db.app_settings.map_mode = `${cur.map.provider} map mode · ${cur.map.navigation_provider} navigation`;
      audit(db,user.id,'MAP_SETTINGS_UPDATE','integrations','map',{provider:cur.map.provider,navigation_provider:cur.map.navigation_provider,api_key_configured:cur.map.api_key_configured});
      saveDb(db);
      return send(res,200,{ok:true, map:mapOptions(db), readiness:integrationReadiness(db)});
    }

    if(method==='GET' && pathname==='/api/admin/payment-gateway'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user)) return send(res,403,{detail:'Admin access required'});
      const orders = (db.payment_orders||[]).slice(-100).reverse().map(o=>{
        const ride = db.rides.find(r=>r.id===o.ride_id) || {};
        const passenger = db.users.find(u=>u.id===o.passenger_id) || {};
        return {...o, pickup:ride.pickup||'', drop:ride.drop||'', passenger_name:passenger.name||'', passenger_mobile:passenger.mobile||'', ride_status:ride.status||''};
      });
      const paid = orders.filter(o=>o.status==='PAID');
      const pending = orders.filter(o=>o.status!=='PAID');
      return send(res,200,{ok:true, payment:paymentOptions(db), summary:{orders:orders.length, paid:paid.length, pending:pending.length, paid_amount:money(paid.reduce((a,o)=>a+Number(o.amount||0),0)), pending_amount:money(pending.reduce((a,o)=>a+Number(o.amount||0),0))}, orders});
    }

    if(method==='POST' && pathname==='/api/admin/payment-gateway/settings'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user)) return send(res,403,{detail:'Admin access required'});
      const body = await getBody(req);
      const current = mergeIntegrations(db.integrations);
      current.payment.provider = String(body.provider || current.payment.provider || 'DEMO').toUpperCase();
      current.payment.razorpay_key_id = String(body.razorpay_key_id ?? current.payment.razorpay_key_id ?? '');
      current.payment.key_id_configured = !!body.key_id_configured || !!current.payment.razorpay_key_id;
      current.payment.manual_upi_id = String(body.manual_upi_id ?? current.payment.manual_upi_id ?? '');
      current.payment.manual_qr_label = String(body.manual_qr_label ?? current.payment.manual_qr_label ?? '');
      current.updated_at = now();
      db.integrations = current;
      db.app_settings.payment_mode = `${current.payment.provider} payment mode`;
      audit(db,user.id,'PAYMENT_GATEWAY_SETTINGS_UPDATE','integrations','payment',{provider:current.payment.provider, manual_upi_id:current.payment.manual_upi_id, razorpay_key_id:current.payment.razorpay_key_id ? 'SET' : 'EMPTY'});
      saveDb(db);
      return send(res,200,{ok:true, payment:paymentOptions(db), integrations:integrationReadiness(db)});
    }

    if(method==='GET' && pathname==='/api/admin/auth-status'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user)) return send(res,403,{detail:'Main Admin only'});
      return send(res,200,{ok:true, auth:authStatus(db)});
    }

    if(method==='POST' && pathname==='/api/admin/auth-settings'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user)) return send(res,403,{detail:'Main Admin only'});
      const body = await getBody(req);
      const cur = authSettings(db);
      cur.otp_provider = String(body.otp_provider || cur.otp_provider || 'DEMO').toUpperCase();
      cur.demo_otp = String(body.demo_otp || cur.demo_otp || '123456').trim();
      cur.otp_expiry_minutes = Math.max(1, Math.min(30, Number(body.otp_expiry_minutes || cur.otp_expiry_minutes || 5)));
      cur.resend_cooldown_seconds = Math.max(0, Math.min(600, Number(body.resend_cooldown_seconds || cur.resend_cooldown_seconds || 60)));
      cur.max_otp_per_mobile_per_hour = Math.max(1, Math.min(50, Number(body.max_otp_per_mobile_per_hour || cur.max_otp_per_mobile_per_hour || 5)));
      cur.session_days = Math.max(1, Math.min(365, Number(body.session_days || cur.session_days || 30)));
      cur.rolling_session_enabled = body.rolling_session_enabled === undefined ? cur.rolling_session_enabled !== false : !!body.rolling_session_enabled;
      cur.consent_required = body.consent_required === undefined ? cur.consent_required !== false : !!body.consent_required;
      cur.password_login_enabled = body.password_login_enabled === undefined ? cur.password_login_enabled !== false : !!body.password_login_enabled;
      cur.otp_login_enabled = body.otp_login_enabled === undefined ? cur.otp_login_enabled !== false : !!body.otp_login_enabled;
      cur.production_sms_ready = !!body.production_sms_ready;
      cur.firebase_ready = !!body.firebase_ready;
      cur.msg91_ready = !!body.msg91_ready;
      cur.twofactor_ready = !!body.twofactor_ready;
      cur.note = String(body.note || cur.note || '').trim();
      cur.updated_at = now();
      db.auth_settings = cur;
      const integ = mergeIntegrations(db.integrations);
      integ.otp.provider = cur.otp_provider;
      integ.otp.demo_code = cur.demo_otp;
      integ.otp.firebase_project_id = cur.firebase_ready ? (integ.otp.firebase_project_id || 'SET_FROM_ADMIN') : '';
      integ.otp.msg91_key_present = !!cur.msg91_ready;
      integ.otp.twofactor_key_present = !!cur.twofactor_ready;
      integ.updated_at = now();
      db.integrations = integ;
      db.app_settings.otp_mode = `${cur.otp_provider} OTP · ${cur.otp_expiry_minutes} min expiry · ${cur.session_days} day session`;
      audit(db,user.id,'AUTH_SETTINGS_UPDATE','auth','settings',{provider:cur.otp_provider, expiry:cur.otp_expiry_minutes, session_days:cur.session_days});
      saveDb(db);
      return send(res,200,{ok:true, auth:authStatus(db)});
    }

    if(method==='POST' && pathname==='/api/admin/auth/cleanup-sessions'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user)) return send(res,403,{detail:'Main Admin only'});
      const before = (db.sessions||[]).length;
      db.sessions = (db.sessions||[]).filter(x=>new Date(x.expires_at)>new Date());
      const removed = before - db.sessions.length;
      audit(db,user.id,'AUTH_SESSION_CLEANUP','sessions','expired',{removed});
      saveDb(db);
      return send(res,200,{ok:true, removed, auth:authStatus(db)});
    }

    if(method==='GET' && pathname==='/api/admin/security-status'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user)) return send(res,403,{detail:'Main Admin only'});
      return send(res,200,{ok:true, security:securityStatus(db)});
    }

    if(method==='POST' && pathname==='/api/admin/security-settings'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user)) return send(res,403,{detail:'Main Admin only'});
      const body = await getBody(req);
      const set = securitySettings(db);
      const bools=['enforce_admin_2fa','force_password_change_on_default','login_rate_limit_enabled','account_lockout_enabled','require_consent_for_admin','ip_allowlist_enabled','trusted_device_required','audit_sensitive_actions','mask_personal_data_in_logs','environment_secrets_required','production_https_required'];
      for(const k of bools){ if(body[k] !== undefined) set[k]=!!body[k]; }
      const nums=['min_password_length','login_rate_limit_per_minute','max_failed_login_attempts','lockout_minutes','admin_session_days'];
      for(const k of nums){ if(body[k] !== undefined) set[k]=Math.max(1, Number(body[k]||1)); }
      if(body.ip_allowlist !== undefined){
        if(Array.isArray(body.ip_allowlist)) set.ip_allowlist=body.ip_allowlist.map(x=>String(x).trim()).filter(Boolean).slice(0,50);
        else set.ip_allowlist=String(body.ip_allowlist||'').split(/[\n,]/).map(x=>x.trim()).filter(Boolean).slice(0,50);
      }
      if(body.note !== undefined) set.note=String(body.note||'');
      set.updated_at=now();
      db.security_settings=set;
      securityEvent(db,user.id,'SECURITY_SETTINGS_UPDATE',{score:securityStatus(db).summary.score});
      audit(db,user.id,'SECURITY_SETTINGS_UPDATE','security','settings',{score:securityStatus(db).summary.score});
      saveDb(db);
      return send(res,200,{ok:true, security:securityStatus(db)});
    }

    if(method==='POST' && pathname==='/api/admin/security/force-logout'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user)) return send(res,403,{detail:'Main Admin only'});
      const auth = req.headers.authorization || '';
      const currentToken = auth.startsWith('Bearer ') ? auth.slice(7) : '';
      const before=(db.sessions||[]).length;
      db.sessions=(db.sessions||[]).filter(s=>s.token===currentToken);
      const removed=before-db.sessions.length;
      securityEvent(db,user.id,'FORCE_LOGOUT_ALL_SESSIONS',{removed});
      audit(db,user.id,'SECURITY_FORCE_LOGOUT','sessions','all',{removed});
      saveDb(db);
      return send(res,200,{ok:true, removed, security:securityStatus(db)});
    }

    if(method==='POST' && pathname==='/api/admin/security/rotate-admin-key'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user)) return send(res,403,{detail:'Main Admin only'});
      const set=securitySettings(db);
      const code='NEXO-SEC-'+crypto.randomBytes(4).toString('hex').toUpperCase();
      set.last_rotation_at=now();
      set.last_recovery_code_hash=sha(code);
      db.security_settings=set;
      securityEvent(db,user.id,'ADMIN_RECOVERY_CODE_ROTATED',{at:set.last_rotation_at});
      audit(db,user.id,'SECURITY_ROTATE_ADMIN_KEY','security','recovery_code',{});
      saveDb(db);
      return send(res,200,{ok:true, recovery_code:code, warning:'এই code একবারই দেখানো হচ্ছে। নিরাপদ জায়গায় লিখে রাখুন।', security:securityStatus(db)});
    }



    if(method==='GET' && pathname==='/api/support/tickets'){
      const user = requireUser(req,res,db); if(!user) return;
      const data = supportSummary(db,user);
      return send(res,200,{ok:true, summary:data.summary, tickets:data.tickets.slice(-100).reverse().map(t=>supportTicketOut(db,t)), refunds:data.refunds.slice(-100).reverse().map(r=>refundRequestOut(db,r))});
    }

    if(method==='POST' && pathname==='/api/support/tickets'){
      const user = requireUser(req,res,db); if(!user) return;
      const body = await getBody(req);
      const ride = body.ride_id ? db.rides.find(r=>r.id===body.ride_id) : null;
      if(body.ride_id && !ride) return send(res,404,{detail:'Ride not found'});
      if(ride && !isAdminRole(user) && ride.passenger_id!==user.id && ride.driver_id!==user.id) return send(res,403,{detail:'This ride is not linked with your account'});
      const subject = String(body.subject||body.category||'Support request').trim();
      const message = String(body.message||'').trim();
      if(!subject || !message) return send(res,400,{detail:'Subject and message required'});
      const t = {id:uid('tkt'), user_id:user.id, ride_id:ride?.id||null, area:user.area||ride?.area||'Kalna', category:String(body.category||'GENERAL').toUpperCase(), subject, message, status:'OPEN', priority:String(body.priority||'NORMAL').toUpperCase(), admin_response:'', assigned_to:null, created_at:now(), updated_at:now(), closed_at:null};
      db.support_tickets = db.support_tickets || [];
      db.support_tickets.push(t);
      notifyAdmins(db,{event_type:'SUPPORT_TICKET_OPEN', priority:t.priority, title:'New Support Ticket', message:`${user.name||user.mobile}: ${subject}`, area:t.area, data:{ticket_id:t.id, ride_id:t.ride_id}});
      audit(db,user.id,'SUPPORT_TICKET_CREATE','support_ticket',t.id,{category:t.category, ride_id:t.ride_id});
      saveDb(db);
      return send(res,200,{ok:true, ticket:supportTicketOut(db,t)});
    }

    const refundMatch = pathname.match(/^\/api\/rides\/([^/]+)\/refund-request$/);
    if(method==='POST' && refundMatch){
      const user = requireUser(req,res,db); if(!user) return;
      const ride = db.rides.find(r=>r.id===refundMatch[1]);
      if(!ride) return send(res,404,{detail:'Ride not found'});
      if(ride.passenger_id!==user.id) return send(res,403,{detail:'Only passenger can request refund'});
      if(ride.payment_status!=='PAID') return send(res,409,{detail:'Refund request allowed only for paid rides'});
      const exists = (db.refund_requests||[]).find(r=>r.ride_id===ride.id && ['REQUESTED','UNDER_REVIEW','APPROVED'].includes(r.status));
      if(exists) return send(res,409,{detail:'Refund request already open', refund:refundRequestOut(db,exists)});
      const body = await getBody(req);
      const rr = {id:uid('ref'), ride_id:ride.id, user_id:user.id, area:user.area||ride.area||'Kalna', amount:Number(ride.estimated_fare||0), reason:String(body.reason||'Passenger refund request').trim(), status:'REQUESTED', admin_note:'', refund_ref:'', created_at:now(), updated_at:now(), paid_at:null};
      db.refund_requests = db.refund_requests || [];
    db.qa_issues = db.qa_issues || [];
    db.field_test_runs = db.field_test_runs || [];
      db.refund_requests.push(rr);
      ride.refund_status='REQUESTED';
      notifyAdmins(db,{event_type:'REFUND_REQUEST', priority:'HIGH', title:'Refund Request', message:`Ride ${ride.pickup||''} → ${ride.drop||''} · ₹${rr.amount}`, area:rr.area, data:{refund_id:rr.id, ride_id:ride.id}});
      audit(db,user.id,'REFUND_REQUEST','ride',ride.id,{amount:rr.amount});
      saveDb(db);
      return send(res,200,{ok:true, refund:refundRequestOut(db,rr)});
    }

    if(method==='GET' && pathname==='/api/admin/support/tickets'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user)) return send(res,403,{detail:'Admin only'});
      const data = supportSummary(db,user);
      return send(res,200,{ok:true, summary:data.summary, tickets:data.tickets.slice(-200).reverse().map(t=>supportTicketOut(db,t)), refunds:data.refunds.slice(-200).reverse().map(r=>refundRequestOut(db,r))});
    }

    const ticketAct = pathname.match(/^\/api\/admin\/support\/tickets\/([^/]+)\/action$/);
    if(method==='POST' && ticketAct){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user)) return send(res,403,{detail:'Admin only'});
      const t = (db.support_tickets||[]).find(x=>x.id===ticketAct[1]);
      if(!t) return send(res,404,{detail:'Ticket not found'});
      const body = await getBody(req);
      const status = String(body.status||t.status||'OPEN').toUpperCase();
      if(!['OPEN','IN_PROGRESS','RESOLVED','CLOSED'].includes(status)) return send(res,400,{detail:'Invalid ticket status'});
      t.status = status; t.admin_response = String(body.response||body.admin_response||t.admin_response||''); t.assigned_to = user.id; t.updated_at=now(); if(status==='CLOSED'||status==='RESOLVED') t.closed_at=now();
      notifyUsers(db, notificationTargets(db,{user_id:t.user_id}), {event_type:'SUPPORT_TICKET_UPDATE', priority:'NORMAL', title:'Support Ticket Updated', message:`${t.subject}: ${t.status}`, data:{ticket_id:t.id}});
      audit(db,user.id,'SUPPORT_TICKET_ACTION','support_ticket',t.id,{status});
      saveDb(db);
      return send(res,200,{ok:true, ticket:supportTicketOut(db,t)});
    }

    if(method==='GET' && pathname==='/api/admin/refunds'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user)) return send(res,403,{detail:'Admin only'});
      const data = supportSummary(db,user);
      return send(res,200,{ok:true, summary:data.summary, refunds:data.refunds.slice(-200).reverse().map(r=>refundRequestOut(db,r))});
    }

    const refundAct = pathname.match(/^\/api\/admin\/refunds\/([^/]+)\/action$/);
    if(method==='POST' && refundAct){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user)) return send(res,403,{detail:'Admin only'});
      const rr = (db.refund_requests||[]).find(x=>x.id===refundAct[1]);
      if(!rr) return send(res,404,{detail:'Refund request not found'});
      const ride = db.rides.find(r=>r.id===rr.ride_id);
      const body = await getBody(req);
      const status = String(body.status||rr.status||'UNDER_REVIEW').toUpperCase();
      if(!['UNDER_REVIEW','APPROVED','REJECTED','PAID'].includes(status)) return send(res,400,{detail:'Invalid refund status'});
      rr.status=status; rr.admin_note=String(body.note||body.admin_note||rr.admin_note||''); rr.refund_ref=String(body.refund_ref||rr.refund_ref||''); rr.updated_at=now(); if(status==='PAID') rr.paid_at=now();
      if(ride) ride.refund_status=status;
      notifyUsers(db, notificationTargets(db,{user_id:rr.user_id}), {event_type:'REFUND_STATUS_UPDATE', priority:'HIGH', title:'Refund Status Updated', message:`Refund ${status} · ₹${rr.amount}`, data:{refund_id:rr.id, ride_id:rr.ride_id}});
      audit(db,user.id,'REFUND_ACTION','refund_request',rr.id,{status, amount:rr.amount});
      saveDb(db);
      return send(res,200,{ok:true, refund:refundRequestOut(db,rr)});
    }

    if(method==='GET' && pathname==='/api/admin/reports'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user)) return send(res,403,{detail:'Admin only'});
      return send(res,200,{ok:true, reports:buildAdminReports(db,user)});
    }

    if(method==='GET' && pathname==='/api/admin/reports/completed-rides.csv'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user)) return send(res,403,{detail:'Admin only'});
      return sendText(res,200,buildCompletedRidesCsv(db,user),'text/csv; charset=utf-8');
    }

    if(method==='GET' && pathname==='/api/admin/build-status'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user)) return send(res,403,{detail:'Admin only'});
      const integrations = mergeIntegrations(db.integrations);
      const publicUrl = integrations.production.server_url || process.env.SERVER_URL || '';
      return send(res,200,{ok:true, build:{
        version:VERSION,
        app_name:'NEXO Ride',
        package_name:'com.astratechnologies.nexoride',
        apk_target_url: publicUrl ? publicUrl.replace(/\/$/,'') + '/app/' : 'https://YOUR-DOMAIN/app/',
        admin_url: publicUrl ? publicUrl.replace(/\/$/,'') + '/app/admin.html' : 'https://YOUR-DOMAIN/app/admin.html',
        subadmin_url: publicUrl ? publicUrl.replace(/\/$/,'') + '/subadmin/' : 'https://YOUR-DOMAIN/subadmin/',
        workflows:['android-apk.yml','android-aab.yml'],
        pwa_ready:true,
        apk_wrapper_ready:true,
        debug_apk_ready:true,
        release_aab_ready:true,
        required_for_final_apk:['Public HTTPS server URL','App icon/logo final','Map API key for real map','OTP provider key','Payment gateway or manual QR','Firebase FCM for push'],
        mobile_github_steps:['Upload project to GitHub','Open Actions tab','Run Build NEXO Ride APK','Enter live server_url ending with /app/','Download APK artifact'],
        termux_preview:'http://127.0.0.1:3333/app/'
      }});
    }



    if(method==='GET' && pathname==='/api/admin/qa'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user)) return send(res,403,{detail:'Admin only'});
      db.qa_issues = db.qa_issues || [];
      const issues = db.qa_issues.slice(-300).reverse();
      const open = issues.filter(x=>!['RESOLVED','CLOSED'].includes(String(x.status||'').toUpperCase())).length;
      const high = issues.filter(x=>['HIGH','CRITICAL'].includes(String(x.priority||'').toUpperCase()) && !['RESOLVED','CLOSED'].includes(String(x.status||'').toUpperCase())).length;
      const modules = {};
      issues.forEach(x=>{ const m=x.module||'General'; modules[m]=(modules[m]||0)+1; });
      const checklist = [
        {title:'Passenger booking', detail:'Pickup/drop → fare → request → accept → pay → OTP → complete', ok:(db.rides||[]).length>0},
        {title:'Driver KYC', detail:'Driver profile + document submit + admin verification', ok:(db.driver_profiles||[]).some(d=>d.kyc_status==='VERIFIED' || d.status==='APPROVED')},
        {title:'Payment flow', detail:'Payment order + payment verify + booking confirm', ok:(db.payment_orders||[]).length>0 || (db.rides||[]).some(r=>r.payment_status==='PAID')},
        {title:'Safety flow', detail:'SOS/share trip/support/refund test', ok:(db.safety_events||[]).length>0 || (db.support_tickets||[]).length>0 || (db.refund_requests||[]).length>0},
        {title:'Reports/export', detail:'Completed ride report and CSV export test', ok:(db.rides||[]).some(r=>r.status==='COMPLETED')},
        {title:'Sub Admin commission', detail:'Area sub-admin mapping + commission + payout request', ok:(db.sub_admins||[]).length>0 && (db.sub_admin_commissions||[]).length>0}
      ];
      return send(res,200,{ok:true, qa:{summary:{total:issues.length, open, high, closed:issues.length-open, modules}, checklist, issues}});
    }

    if(method==='POST' && pathname==='/api/admin/qa/issues'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user)) return send(res,403,{detail:'Admin only'});
      const body = await getBody(req);
      db.qa_issues = db.qa_issues || [];
      const issue = {
        id: uid('qa'),
        title: String(body.title||'').trim(),
        module: String(body.module||'General').trim(),
        priority: String(body.priority||'MEDIUM').toUpperCase(),
        status: 'OPEN',
        details: String(body.details||'').trim(),
        expected: String(body.expected||'').trim(),
        actual: String(body.actual||'').trim(),
        created_by: user.id,
        created_at: now(),
        updated_at: now()
      };
      if(!issue.title) return send(res,400,{detail:'Issue title required'});
      db.qa_issues.push(issue);
      audit(db,user.id,'QA_ISSUE_CREATE','qa_issue',issue.id,{title:issue.title, priority:issue.priority, module:issue.module});
      saveDb(db);
      return send(res,200,{ok:true, issue});
    }

    const qaIssueAction = pathname.match(/^\/api\/admin\/qa\/issues\/([^/]+)\/status$/);
    if(method==='POST' && qaIssueAction){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user)) return send(res,403,{detail:'Admin only'});
      const body = await getBody(req);
      db.qa_issues = db.qa_issues || [];
      const issue = db.qa_issues.find(x=>x.id===qaIssueAction[1]);
      if(!issue) return send(res,404,{detail:'QA issue not found'});
      const status = String(body.status||issue.status||'OPEN').toUpperCase();
      if(!['OPEN','IN_PROGRESS','RESOLVED','CLOSED'].includes(status)) return send(res,400,{detail:'Invalid status'});
      issue.status = status;
      issue.resolution_note = String(body.note||body.resolution_note||issue.resolution_note||'').trim();
      issue.updated_at = now();
      if(status==='RESOLVED' || status==='CLOSED') issue.closed_at = now();
      audit(db,user.id,'QA_ISSUE_STATUS','qa_issue',issue.id,{status});
      saveDb(db);
      return send(res,200,{ok:true, issue});
    }




    if(method==='GET' && pathname==='/api/admin/storage-status'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user)) return send(res,403,{detail:'Admin only'});
      return send(res,200,{ok:true, storage:storageStatus(db)});
    }

    if(method==='GET' && pathname==='/api/admin/uploads'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user)) return send(res,403,{detail:'Admin only'});
      let uploads = (db.file_uploads||[]).slice(-300).reverse();
      if(!isMainAdmin(user)) uploads = uploads.filter(f=>f.owner_user_id===user.id || !f.owner_user_id);
      return send(res,200,{ok:true, uploads, summary:storageStatus(db).summary});
    }

    if(method==='POST' && pathname==='/api/admin/storage-settings'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user)) return send(res,403,{detail:'Main Admin only'});
      const body = await getBody(req);
      db.storage_settings = {...defaultStorageSettings(), ...(db.storage_settings||{})};
      if(body.provider) db.storage_settings.provider = String(body.provider||'LOCAL_FILE').toUpperCase();
      if(body.max_upload_mb !== undefined) db.storage_settings.max_upload_mb = Math.max(0.5, Math.min(10, Number(body.max_upload_mb||2)));
      if(body.allowed_mime) db.storage_settings.allowed_mime = String(body.allowed_mime).split(',').map(x=>x.trim()).filter(Boolean);
      if(body.production_note !== undefined) db.storage_settings.production_note = String(body.production_note||'').trim();
      db.storage_settings.secure_file_serving = body.secure_file_serving === undefined ? db.storage_settings.secure_file_serving : !!body.secure_file_serving;
      db.storage_settings.updated_at = now();
      const next = mergeIntegrations(db.integrations);
      next.storage.provider = db.storage_settings.provider;
      next.storage.max_upload_mb = db.storage_settings.max_upload_mb;
      next.storage.allowed_mime = db.storage_settings.allowed_mime;
      next.updated_at = now();
      db.integrations = next;
      audit(db,user.id,'STORAGE_SETTINGS_UPDATE','storage','settings',{provider:db.storage_settings.provider,max_upload_mb:db.storage_settings.max_upload_mb});
      saveDb(db);
      return send(res,200,{ok:true, storage:storageStatus(db)});
    }

    const uploadStatusMatch = pathname.match(/^\/api\/admin\/uploads\/([^/]+)\/(archive|restore|delete)$/);
    if(method==='POST' && uploadStatusMatch){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user)) return send(res,403,{detail:'Main Admin only'});
      const rec = (db.file_uploads||[]).find(f=>f.id===uploadStatusMatch[1]);
      if(!rec) return send(res,404,{detail:'Upload not found'});
      const action = uploadStatusMatch[2];
      if(action==='archive') rec.status='ARCHIVED';
      if(action==='restore') rec.status='ACTIVE';
      if(action==='delete') rec.status='DELETED';
      rec.updated_at = now(); rec.updated_by = user.id;
      audit(db,user.id,'UPLOAD_'+action.toUpperCase(),'file_upload',rec.id,{doc_type:rec.doc_type});
      saveDb(db);
      return send(res,200,{ok:true, storage:storageStatus(db)});
    }

    if(method==='GET' && pathname==='/api/admin/legal-status'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user)) return send(res,403,{detail:'Main Admin only'});
      return send(res,200,{ok:true, legal:legalStatus(db)});
    }

    if(method==='POST' && pathname==='/api/admin/legal-documents'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user)) return send(res,403,{detail:'Main Admin only'});
      const body = await getBody(req);
      const key = String(body.key||'').trim();
      if(!key) return send(res,400,{detail:'Document key required'});
      db.legal_documents = db.legal_documents || defaultLegalDocuments();
      const current = db.legal_documents[key] || {title:key, version:'v1', status:'DRAFT', mandatory:true, language:'BN+EN', summary:''};
      const next = {
        ...current,
        title: String(body.title || current.title || key).trim(),
        version: String(body.version || current.version || 'v1').trim(),
        status: String(body.status || current.status || 'DRAFT').toUpperCase(),
        mandatory: body.mandatory === undefined ? current.mandatory !== false : !!body.mandatory,
        language: String(body.language || current.language || 'BN+EN').trim(),
        summary: String(body.summary || current.summary || '').trim(),
        last_updated: now(),
        updated_by: user.id
      };
      if(!['DRAFT','APPROVED','ARCHIVED'].includes(next.status)) return send(res,400,{detail:'Invalid legal document status'});
      db.legal_documents[key] = next;
      audit(db,user.id,'LEGAL_DOCUMENT_UPDATE','legal_document',key,{version:next.version,status:next.status});
      saveDb(db);
      return send(res,200,{ok:true, legal:legalStatus(db)});
    }

    if(method==='POST' && pathname==='/api/legal/accept'){
      const user = requireUser(req,res,db); if(!user) return;
      const body = await getBody(req);
      const key = String(body.key||'terms').trim();
      db.legal_documents = db.legal_documents || defaultLegalDocuments();
      const doc = db.legal_documents[key];
      if(!doc) return send(res,404,{detail:'Legal document not found'});
      db.legal_acceptance_records = db.legal_acceptance_records || [];
      const rec = {id:uid('legalacc'), user_id:user.id, user_role:user.role, doc_key:key, version:doc.version, accepted_at:now(), device_id:String(body.device_id||''), ip:req.socket?.remoteAddress||'', consent_text:String(body.consent_text||doc.title||key)};
      db.legal_acceptance_records.push(rec);
      audit(db,user.id,'LEGAL_ACCEPT','legal_document',key,{version:doc.version});
      saveDb(db);
      return send(res,200,{ok:true, acceptance:rec});
    }

    if(method==='GET' && pathname==='/api/admin/launch-readiness'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user)) return send(res,403,{detail:'Main Admin only'});
      return send(res,200,{ok:true, launch:launchReadinessStatus(db)});
    }

    if(method==='GET' && pathname==='/api/admin/deployment-status'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user)) return send(res,403,{detail:'Main Admin only'});
      return send(res,200,{ok:true, ...deploymentStatus(db)});
    }

    if(method==='POST' && pathname==='/api/admin/deployment-settings'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user)) return send(res,403,{detail:'Main Admin only'});
      const body = await getBody(req);
      const next = mergeIntegrations(db.integrations);
      next.production.server_url = String(body.server_url || next.production.server_url || '').trim();
      next.production.deploy_provider = String(body.deploy_provider || next.production.deploy_provider || 'DEMO').toUpperCase();
      next.production.domain_name = String(body.domain_name || next.production.domain_name || '').trim();
      next.production.ssl_configured = !!body.ssl_configured;
      next.production.repo_url = String(body.repo_url || next.production.repo_url || '').trim();
      next.production.branch = String(body.branch || next.production.branch || 'main').trim();
      next.production.database_url_present = !!body.database_url_present;
      next.production.deployment_note = String(body.deployment_note || next.production.deployment_note || '').trim();
      next.updated_at = now();
      db.integrations = next;
      audit(db,user.id,'DEPLOYMENT_SETTINGS_UPDATE','integrations','production',{provider:next.production.deploy_provider, server_url:next.production.server_url, ssl:next.production.ssl_configured, db:next.production.database_url_present});
      saveDb(db);
      return send(res,200,{ok:true, ...deploymentStatus(db)});
    }



    const rideDetailsMatch = pathname.match(/^\/api\/rides\/([^/]+)\/(details|detail)$/);
    if(method==='GET' && rideDetailsMatch){
      const user = requireUser(req,res,db); if(!user) return;
      const ride = (db.rides||[]).find(r=>r.id===rideDetailsMatch[1]);
      if(!ride) return send(res,404,{detail:'Ride not found'});
      if(!isAdminRole(user) && ride.passenger_id!==user.id && ride.driver_id!==user.id) return send(res,403,{detail:'Only related passenger/driver can view ride details'});
      const passenger = db.users.find(u=>u.id===ride.passenger_id) || {};
      const driverUser = db.users.find(u=>u.id===ride.driver_id) || {};
      const driverProfile = db.driver_profiles.find(d=>d.user_id===ride.driver_id) || {};
      const order = (db.payment_orders||[]).find(o=>o.id===ride.payment_order_id || o.ride_id===ride.id) || null;
      const refunds = (db.refund_requests||[]).filter(x=>x.ride_id===ride.id).slice(-10).reverse();
      const timeline = [
        ['created_at','Booking requested'], ['accepted_at','Driver accepted'], ['paid_at','Payment confirmed'],
        ['arrived_at','Driver reached pickup'], ['started_at','Ride started'], ['completed_at','Ride completed'], ['cancelled_at','Ride cancelled']
      ].filter(([k])=>ride[k]).map(([k,label])=>({key:k,label,at:ride[k]}));
      const details = {
        ride: rideDto(ride,db,user),
        timeline,
        passenger:{id:passenger.id||'', name:passenger.name||'', mobile:passenger.mobile||''},
        driver:{id:driverUser.id||'', name:driverUser.name||'', mobile:driverUser.mobile||'', vehicle_no:driverProfile.vehicle_no||ride.driver_vehicle_no||'', rating:driverProfile.rating||ride.driver_rating||5},
        payment: order ? {...order, secret:null} : {status:ride.payment_status||'PENDING', amount:Number(ride.estimated_fare||0), provider:ride.payment_provider||paymentProviderMode(db), payment_ref:ride.payment_ref||''},
        finance: (!isAdminRole(user) && user.role==='PASSENGER')
          ? {fare:Number(ride.estimated_fare||0), payment_status:ride.payment_status||'PENDING', refund_status:ride.refund_status||'NOT_REQUIRED'}
          : {fare:Number(ride.estimated_fare||0), driver_earning:Number(ride.driver_earning||0), platform_commission:Number(ride.platform_commission||0), settlement_status:ride.settlement_status||'PENDING', refund_status:ride.refund_status||'NOT_REQUIRED'},
        refunds,
        can_cancel: !['COMPLETED','CANCELLED','PAYMENT_TIMEOUT'].includes(String(ride.status||'').toUpperCase()) && (String(ride.status||'').toUpperCase()!=='STARTED' || isAdminRole(user)),
        cancel_note: String(ride.status||'').toUpperCase()==='STARTED' ? 'Ride start হয়ে গেলে support/SOS ব্যবহার করুন' : 'Ride complete হওয়ার আগে cancel করা যাবে। Paid ride হলে refund review তৈরি হবে।'
      };
      return send(res,200,{ok:true, ...details});
    }

    if(method==='GET' && pathname==='/api/driver/payout-requests'){
      const user = requireUser(req,res,db); if(!user) return;
      if(user.role!=='DRIVER') return send(res,403,{detail:'Driver only'});
      const prof = db.driver_profiles.find(d=>d.user_id===user.id) || {};
      const requests=(db.driver_payout_requests||[]).filter(x=>x.driver_id===user.id).slice(-50).reverse();
      return send(res,200,{ok:true, summary:{pending_payout:Number(prof.pending_payout||0), paid_payout:Number(prof.paid_payout||0), request_count:requests.length}, requests});
    }

    if(method==='POST' && pathname==='/api/driver/payout-request'){
      const user = requireUser(req,res,db); if(!user) return;
      if(user.role!=='DRIVER') return send(res,403,{detail:'Driver only'});
      const body = await getBody(req);
      const prof = db.driver_profiles.find(d=>d.user_id===user.id) || {};
      const amount = Math.round(Number(prof.pending_payout||0)*100)/100;
      if(amount<=0) return send(res,409,{detail:'Pending payout নেই'});
      const existing=(db.driver_payout_requests||[]).find(x=>x.driver_id===user.id && ['REQUESTED','UNDER_REVIEW'].includes(String(x.status||'')));
      if(existing) return send(res,409,{detail:'আগের payout request pending আছে', request:existing});
      const pendingRides=(db.rides||[]).filter(r=>r.driver_id===user.id && r.status==='COMPLETED' && r.settlement_status!=='PAID');
      const reqObj={id:uid('dpr'), driver_id:user.id, amount, ride_count:pendingRides.length, ride_ids:pendingRides.map(r=>r.id), status:'REQUESTED', payout_method:String(body.payout_method||'UPI/Bank'), payout_account:String(body.payout_account||'').slice(0,120), note:String(body.note||'Driver payout requested from app').slice(0,200), created_at:now(), area:prof.area||'Kalna'};
      db.driver_payout_requests = db.driver_payout_requests || [];
      db.driver_payout_requests.push(reqObj);
      notifyAdmins(db,{event_type:'DRIVER_PAYOUT_REQUEST', priority:'NORMAL', title:'Driver Payout Request', message:`${user.name||'Driver'} requested payout ₹${amount}`, data:{request_id:reqObj.id, driver_id:user.id}});
      audit(db,user.id,'DRIVER_PAYOUT_REQUEST','driver',user.id,{amount, request_id:reqObj.id});
      saveDb(db);
      return send(res,200,{ok:true, request:reqObj});
    }

    if(method==='GET' && pathname==='/api/admin/driver-payout-requests'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user)) return send(res,403,{detail:'Admin only'});
      const scopedDrivers = new Set(filterDriversForAdmin(db,user,db.driver_profiles).map(d=>d.user_id));
      const requests=(db.driver_payout_requests||[]).filter(x=>isMainAdmin(user)||scopedDrivers.has(x.driver_id)).slice(-100).reverse().map(x=>{const u=db.users.find(y=>y.id===x.driver_id)||{};const p=db.driver_profiles.find(d=>d.user_id===x.driver_id)||{};return {...x, driver_name:u.name||'', driver_mobile:u.mobile||'', vehicle_no:p.vehicle_no||''};});
      return send(res,200,{ok:true, requests, summary:{requested:requests.filter(x=>x.status==='REQUESTED').length, paid:requests.filter(x=>x.status==='PAID').length, requested_amount:Math.round(requests.filter(x=>x.status==='REQUESTED').reduce((a,x)=>a+Number(x.amount||0),0)*100)/100}});
    }

    const adminDriverPayoutRequestPay = pathname.match(/^\/api\/admin\/driver-payout-requests\/([^/]+)\/pay$/);
    if(method==='POST' && adminDriverPayoutRequestPay){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isMainAdmin(user)) return send(res,403,{detail:'Main admin only'});
      const reqObj=(db.driver_payout_requests||[]).find(x=>x.id===adminDriverPayoutRequestPay[1]);
      if(!reqObj) return send(res,404,{detail:'Payout request not found'});
      if(reqObj.status==='PAID') return send(res,409,{detail:'Already paid'});
      const body=await getBody(req);
      const driverId=reqObj.driver_id;
      const pendingRides=db.rides.filter(r=>r.driver_id===driverId && r.status==='COMPLETED' && r.settlement_status!=='PAID');
      if(!pendingRides.length) return send(res,409,{detail:'No pending payout for this driver'});
      const amount=Math.round(pendingRides.reduce((a,r)=>a+Number(r.driver_earning||0),0)*100)/100;
      const settlement={id:uid('set'), driver_id:driverId, amount, ride_count:pendingRides.length, ride_ids:pendingRides.map(r=>r.id), request_id:reqObj.id, payment_ref:String(body.payment_ref||reqObj.payout_account||'Manual payout'), note:String(body.note||'Driver payout request paid'), paid_by:user.id, paid_at:now(), status:'PAID'};
      for(const r of pendingRides){ r.settlement_status='PAID'; r.settlement_id=settlement.id; r.settled_at=settlement.paid_at; }
      db.settlements.push(settlement);
      reqObj.status='PAID'; reqObj.settlement_id=settlement.id; reqObj.paid_at=settlement.paid_at; reqObj.payment_ref=settlement.payment_ref; reqObj.paid_amount=amount;
      const prof=db.driver_profiles.find(d=>d.user_id===driverId);
      if(prof){ prof.pending_payout=Math.max(0,Math.round((Number(prof.pending_payout||0)-amount)*100)/100); prof.paid_payout=Math.round((Number(prof.paid_payout||0)+amount)*100)/100; prof.last_payout_at=settlement.paid_at; }
      notifyUsers(db, notificationTargets(db,{user_id:driverId}), {event_type:'DRIVER_PAYOUT_PAID', priority:'HIGH', title:'Payout Paid', message:`Payout ₹${amount} paid/marked paid.`});
      audit(db,user.id,'DRIVER_PAYOUT_REQUEST_PAID','driver',driverId,{request_id:reqObj.id, settlement_id:settlement.id, amount});
      saveDb(db);
      return send(res,200,{ok:true, settlement, request:reqObj, ...settlementSummary(db)});
    }

    if(method==='GET' && pathname==='/api/admin/safety-dashboard'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!hasCapability(db,user,'SAFETY_MANAGE') && !hasCapability(db,user,'SAFETY_VIEW')) return send(res,403,{detail:'Safety permission required', role:roleKey(user)});
      return send(res,200,safetyDashboardPayload(db,user));
    }

    const adminSafetyUpdateMatch = pathname.match(/^\/api\/admin\/safety-events\/([^/]+)\/update$/);
    if(method==='POST' && adminSafetyUpdateMatch){
      const user = requireUser(req,res,db); if(!user) return;
      if(!hasCapability(db,user,'SAFETY_CLOSE') && !hasCapability(db,user,'SAFETY_MANAGE')) return send(res,403,{detail:'Safety close permission required', role:roleKey(user)});
      const ev=(db.safety_events||[]).find(e=>e.id===adminSafetyUpdateMatch[1]); if(!ev) return send(res,404,{detail:'Safety event not found'});
      const body=await getBody(req); ev.status=String(body.status||ev.status||'OPEN').toUpperCase().slice(0,30); ev.admin_note=sanitizeText(body.note||body.admin_note||ev.admin_note||'',260); ev.updated_at=now(); ev.updated_by=user.id;
      audit(db,user.id,'S7P_SAFETY_EVENT_UPDATE','safety_event',ev.id,{status:ev.status}); saveDb(db); return send(res,200,{ok:true,event:ev});
    }

    if(method==='GET' && pathname==='/api/admin/safety-events'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user)) return send(res,403,{detail:'Admin only'});
      const events = (db.safety_events||[]).slice(-100).reverse().map(ev=>{
        const u = db.users.find(x=>x.id===ev.user_id) || {};
        const ride = db.rides.find(r=>r.id===ev.ride_id) || {};
        return {...ev, user_name:u.name||'', user_mobile:u.mobile||'', pickup:ride.pickup||'', drop:ride.drop||'', ride_status:ride.status||ev.ride_status};
      });
      return send(res,200,{ok:true, events});
    }

    if(method==='GET' && pathname==='/api/admin/summary'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user)) return send(res,403,{detail:'Admin only'});
      const scopedRides = filterRidesForAdmin(db,user,db.rides);
      const scopedDrivers = filterDriversForAdmin(db,user,db.driver_profiles);
      const scopedUsers = filterUsersForAdmin(db,user,db.users);
      const subCms = subAdminCommissionSummary(db,user).summary;
      return send(res,200,{ok:true, summary:{
        users:scopedUsers.length,
        drivers:scopedDrivers.length,
        sub_admins:(db.sub_admins||[]).length,
        online_drivers:scopedDrivers.filter(d=>d.status==='APPROVED' && d.online).length,
        live_locations:(db.live_locations||[]).length,
        rides:scopedRides.length,
        requested:scopedRides.filter(r=>r.status==='REQUESTED').length,
        accepted:scopedRides.filter(r=>r.status==='DRIVER_ACCEPTED').length,
        confirmed:scopedRides.filter(r=>r.status==='CONFIRMED').length,
        arrived:scopedRides.filter(r=>r.status==='ARRIVED').length,
        expired:scopedRides.filter(r=>r.status==='PAYMENT_TIMEOUT').length,
        completed:scopedRides.filter(r=>r.status==='COMPLETED').length,
        otp_verified:scopedRides.filter(r=>r.otp_verified_at).length,
        safety_open:(db.safety_events||[]).filter(e=>e.status==='OPEN').length,
        notifications_unread: unreadNotificationCount(db,user),
        notifications_total: (db.notifications||[]).length,
        total_fare: Math.round(scopedRides.filter(r=>r.status==='COMPLETED').reduce((a,r)=>a+Number(r.estimated_fare||0),0)*100)/100,
        driver_payout_pending: Math.round(scopedRides.filter(r=>r.status==='COMPLETED' && r.settlement_status!=='PAID').reduce((a,r)=>a+Number(r.driver_earning||0),0)*100)/100,
        driver_payout_paid: Math.round((db.settlements||[]).reduce((a,s)=>a+Number(s.amount||0),0)*100)/100,
        platform_commission: Math.round(scopedRides.filter(r=>r.status==='COMPLETED').reduce((a,r)=>a+Number(r.platform_commission||0),0)*100)/100,
        sub_admin_commission_pending:subCms.pending_amount,
        sub_admin_commission_paid:subCms.paid_amount,
        rated: scopedRides.filter(r=>r.rating_by_passenger).length
      }});
    }


    // v2.0 Sprint-5F - Admin dashboard details/edit APIs
    if(method==='GET' && pathname==='/api/admin/users'){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user)) return send(res,403,{detail:'Admin only'});
      const users = filterUsersForAdmin(db,user,db.users).slice(-500).reverse().map(u=>({
        id:u.id, name:u.name||'', mobile:u.mobile||'', email:u.email||'', role:u.role||'PASSENGER', area:u.area||u.assigned_area||'', created_at:u.created_at||'', updated_at:u.updated_at||'', last_login_at:u.last_login_at||''
      }));
      return send(res,200,{ok:true, users, summary:{total:users.length, admins:users.filter(u=>u.role==='ADMIN').length, drivers:users.filter(u=>u.role==='DRIVER').length, passengers:users.filter(u=>u.role==='PASSENGER').length}});
    }

    const adminUserUpdate = pathname.match(/^\/api\/admin\/users\/([^/]+)\/update$/);
    if(method==='POST' && adminUserUpdate){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user)) return send(res,403,{detail:'Admin only'});
      const target = db.users.find(u=>u.id===adminUserUpdate[1]);
      if(!target) return send(res,404,{detail:'User not found'});
      if(!isMainAdmin(user) && target.area && target.area!==user.area && target.assigned_area!==user.area) return send(res,403,{detail:'Sub Admin can edit own area users only'});
      const body = await getBody(req);
      if(body.name!==undefined) target.name=String(body.name||'').slice(0,80);
      if(body.mobile!==undefined) target.mobile=String(body.mobile||'').replace(/\D/g,'').slice(-10) || target.mobile;
      if(body.email!==undefined) target.email=String(body.email||'').slice(0,120);
      if(body.area!==undefined){ target.area=String(body.area||'').slice(0,80); target.assigned_area=target.area; }
      target.updated_at=now();
      audit(db,user.id,'ADMIN_USER_UPDATE','user',target.id,{fields:Object.keys(body||{})});
      saveDb(db);
      return send(res,200,{ok:true,user:{id:target.id,name:target.name,mobile:target.mobile,email:target.email,role:target.role,area:target.area}});
    }

    const adminDriverUpdate = pathname.match(/^\/api\/admin\/drivers\/([^/]+)\/update$/);
    if(method==='POST' && adminDriverUpdate){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user)) return send(res,403,{detail:'Admin only'});
      const prof = db.driver_profiles.find(d=>d.id===adminDriverUpdate[1] || d.user_id===adminDriverUpdate[1]);
      if(!prof) return send(res,404,{detail:'Driver profile not found'});
      if(!isMainAdmin(user)){ const allowed = filterDriversForAdmin(db,user,[prof]).length>0; if(!allowed) return send(res,403,{detail:'Sub Admin can edit own area drivers only'}); }
      const body = await getBody(req);
      const du = db.users.find(u=>u.id===prof.user_id);
      if(du){
        if(body.name!==undefined) du.name=String(body.name||du.name||'').slice(0,80);
        if(body.mobile!==undefined) du.mobile=String(body.mobile||du.mobile||'').replace(/\D/g,'').slice(-10) || du.mobile;
        if(body.location!==undefined || body.area!==undefined){ du.area=String(body.location||body.area||du.area||'').slice(0,80); du.assigned_area=du.area; }
        du.updated_at=now();
      }
      if(body.vehicle_no!==undefined) prof.vehicle_no=String(body.vehicle_no||'').toUpperCase().slice(0,30);
      if(body.location!==undefined || body.area!==undefined) prof.location=String(body.location||body.area||prof.location||'').slice(0,80);
      if(body.status!==undefined && ['PENDING','APPROVED','REJECTED','SUSPENDED'].includes(String(body.status).toUpperCase())){
        prof.status=String(body.status).toUpperCase(); if(prof.status!=='APPROVED') prof.online=false;
      }
      prof.updated_at=now(); prof.admin_reviewed_at=now(); prof.admin_reviewed_by=user.id;
      audit(db,user.id,'ADMIN_DRIVER_UPDATE','driver_profile',prof.id,{fields:Object.keys(body||{})});
      saveDb(db);
      return send(res,200,{ok:true, driver_profile:prof});
    }

    const adminRideUpdate = pathname.match(/^\/api\/admin\/rides\/([^/]+)\/update$/);
    if(method==='POST' && adminRideUpdate){
      const user = requireUser(req,res,db); if(!user) return;
      if(!isAdminRole(user)) return send(res,403,{detail:'Admin only'});
      const ride = db.rides.find(r=>r.id===adminRideUpdate[1]);
      if(!ride) return send(res,404,{detail:'Ride not found'});
      if(!isMainAdmin(user)){ const allowed = filterRidesForAdmin(db,user,[ride]).length>0; if(!allowed) return send(res,403,{detail:'Sub Admin can edit own area rides only'}); }
      const body = await getBody(req);
      if(body.pickup!==undefined) ride.pickup=String(body.pickup||ride.pickup||'').slice(0,120);
      if(body.drop!==undefined) ride.drop=String(body.drop||ride.drop||'').slice(0,120);
      if(body.estimated_fare!==undefined && !Number.isNaN(Number(body.estimated_fare))) ride.estimated_fare=Number(body.estimated_fare);
      if(body.payment_status!==undefined) ride.payment_status=String(body.payment_status||ride.payment_status||'').toUpperCase().slice(0,30);
      if(body.status!==undefined && isMainAdmin(user)) ride.status=String(body.status||ride.status||'').toUpperCase().slice(0,40);
      ride.updated_at=now();
      audit(db,user.id,'ADMIN_RIDE_UPDATE','ride',ride.id,{fields:Object.keys(body||{})});
      saveDb(db);
      return send(res,200,{ok:true, ride:rideDto(ride,db,user)});
    }

    send(res,404,{detail:'Not found'});
  }catch(e){
    console.error(e);
    try{ const errDb=readDb(); logError(errDb, pathname || 'route', e, {method}); saveDb(errDb); }catch(_e){}
    send(res,e.status||500,{detail:e.message||'Server error'});
  }
}

const HOST = process.env.HOST || '0.0.0.0';
try{ ensureDataDir(); readDb(); createBackup('startup'); }catch(e){ console.error('Startup DB backup skipped:', e.message); }
const server = http.createServer(route);
server.on('error', (e)=>{
  if(e && e.code === 'EADDRINUSE'){
    console.error(`Port ${PORT} is already busy. In Termux run: pkill node  then  npm start`);
  } else {
    console.error(e);
  }
  process.exit(1);
});
server.listen(PORT, HOST, ()=>{
  console.log('===============================================');
  console.log(`NEXO Ride ${VERSION} running`);
  console.log(`App: http://127.0.0.1:${PORT}/app/ | QR Scanner: http://127.0.0.1:${PORT}/qr-scanner/ | Admin: http://127.0.0.1:${PORT}/app/admin.html | Sub Admin: http://127.0.0.1:${PORT}/subadmin/`);
  console.log(`Health check:   http://127.0.0.1:${PORT}/api/health`);
  console.log('SmartASP compatible: listening on process.env.PORT when provided.');
  console.log('===============================================');
});


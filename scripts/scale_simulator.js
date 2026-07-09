#!/usr/bin/env node
/* NEXO Ride Sprint-7F scale simulator - no external dependencies.
   It does NOT modify production data unless you point BASE_URL to your server endpoints.
   Default mode only estimates heartbeat/dispatch load for 5k/10k capacity planning. */
const activeDrivers = Number(process.env.ACTIVE_DRIVERS || 3500);
const registeredDrivers = Number(process.env.REGISTERED_DRIVERS || 10000);
const heartbeatSeconds = Number(process.env.HEARTBEAT_SECONDS || 5);
const bookingPerMinute = Number(process.env.BOOKINGS_PER_MINUTE || 120);
const candidateBatch = Number(process.env.CANDIDATE_BATCH_SIZE || 5);
const durationSeconds = Number(process.env.DURATION_SECONDS || 60);
const locationWritesPerMinute = Math.ceil(activeDrivers * 60 / heartbeatSeconds);
const dispatchCandidatePushPerMinute = bookingPerMinute * candidateBatch;
const jsonFallbackSafe = activeDrivers <= 250 && registeredDrivers <= 800;
const report = {
  mode:'ESTIMATE_ONLY',
  registeredDrivers, activeDrivers, heartbeatSeconds, bookingPerMinute, candidateBatch, durationSeconds,
  estimated:{driver_heartbeats_per_minute:locationWritesPerMinute, dispatch_candidate_pushes_per_minute:dispatchCandidatePushPerMinute, total_live_events_per_minute:locationWritesPerMinute+dispatchCandidatePushPerMinute},
  recommendation:{postgres_required:registeredDrivers>=5000, redis_geo_required:activeDrivers>=1000, json_fallback_safe:jsonFallbackSafe, min_dispatch_workers:activeDrivers>=3500?4:activeDrivers>=1500?2:1},
  notes:['Use Redis GEO for driver live location; do not write every GPS update to the main DB.','Use PostgreSQL indexes for driver profile/ride history at 5k+ scale.','Increase worker count before raising active driver capacity profile.']
};
console.log(JSON.stringify(report,null,2));

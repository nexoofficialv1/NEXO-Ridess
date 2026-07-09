const active=Number(process.env.NEXO_TARGET_ACTIVE_DRIVERS||3500);
const registered=Number(process.env.NEXO_TARGET_REGISTERED_DRIVERS||10000);
const heartbeat=Number(process.env.DRIVER_HEARTBEAT_SECONDS||12);
const concurrent=Number(process.env.NEXO_TARGET_CONCURRENT_BOOKINGS||600);
const candidates=Number(process.env.DISPATCH_CANDIDATE_BATCH_SIZE||5);
const heartbeatPerMinute=Math.ceil(active*(60/Math.max(1,heartbeat)));
const candidateChecks=concurrent*candidates;
const result={
  ok:!!process.env.REDIS_URL && !!process.env.DATABASE_URL,
  target:{registered_drivers:registered,active_drivers:active,concurrent_bookings:concurrent},
  estimates:{heartbeat_per_minute:heartbeatPerMinute,heartbeat_per_second:Math.round(heartbeatPerMinute/60),dispatch_candidate_checks:candidateChecks},
  required_for_production:{postgresql:registered>=5000,redis_geo:active>=1000,worker_count_recommended:active>=3500?4:active>=1500?2:1},
  current_env:{DATABASE_URL:!!process.env.DATABASE_URL,REDIS_URL:!!process.env.REDIS_URL},
  note:'This is an estimator, not a real load test. Run staged load test on VPS before public launch.'
};
console.log(JSON.stringify(result,null,2));

-- NEXO Ride Sprint-8C PostgreSQL Migration
-- Safe starter schema for production database. Run after taking backup.
-- psql "$DATABASE_URL" -f docs/SPRINT8C_POSTGRES_MIGRATION.sql

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  mobile TEXT UNIQUE,
  email TEXT UNIQUE,
  role TEXT NOT NULL DEFAULT 'PASSENGER',
  area TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  password_hash TEXT,
  password_salt TEXT,
  consent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS driver_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  vehicle_type TEXT DEFAULT 'TOTO',
  vehicle_no TEXT,
  license_no TEXT,
  aadhaar_no TEXT,
  area TEXT,
  sub_admin_user_id TEXT REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'PENDING',
  online BOOLEAN DEFAULT false,
  rating NUMERIC DEFAULT 5,
  total_rides INT DEFAULT 0,
  total_earnings NUMERIC DEFAULT 0,
  pending_payout NUMERIC DEFAULT 0,
  lat NUMERIC,
  lng NUMERIC,
  location TEXT,
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rides (
  id TEXT PRIMARY KEY,
  passenger_id TEXT REFERENCES users(id),
  driver_id TEXT REFERENCES users(id),
  pickup TEXT NOT NULL,
  drop_location TEXT NOT NULL,
  ride_type TEXT NOT NULL DEFAULT 'FULL',
  seats INT DEFAULT 1,
  pickup_lat NUMERIC,
  pickup_lng NUMERIC,
  drop_lat NUMERIC,
  drop_lng NUMERIC,
  distance_km NUMERIC,
  eta_minutes INT,
  estimated_fare NUMERIC,
  status TEXT NOT NULL DEFAULT 'REQUESTED',
  payment_method TEXT DEFAULT 'CASH',
  payment_status TEXT DEFAULT 'PENDING',
  ride_otp TEXT,
  platform_commission NUMERIC DEFAULT 0,
  driver_earning NUMERIC DEFAULT 0,
  sub_admin_user_id TEXT REFERENCES users(id),
  sub_admin_commission NUMERIC DEFAULT 0,
  rating INT,
  rating_comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  reached_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  payload JSONB DEFAULT '{}'::jsonb,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS device_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT,
  device_id TEXT,
  device_name TEXT,
  permission_status TEXT,
  app_version TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, token)
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  ride_id TEXT REFERENCES rides(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id),
  amount NUMERIC NOT NULL DEFAULT 0,
  method TEXT NOT NULL DEFAULT 'CASH',
  status TEXT NOT NULL DEFAULT 'PENDING',
  provider TEXT,
  provider_ref TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  action TEXT NOT NULL,
  target TEXT,
  target_id TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rides_passenger ON rides(passenger_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rides_driver ON rides(driver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rides_status ON rides(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_driver_online ON driver_profiles(online, status, area);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read, created_at DESC);

INSERT INTO audit_log(id, action, target, details)
VALUES ('migration_sprint8c_' || extract(epoch from now())::text, 'MIGRATION_APPLIED', 'database', '{"sprint":"8C","safe":"if_not_exists"}'::jsonb);

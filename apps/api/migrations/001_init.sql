-- Block Crew — initial schema
-- Postgres 15+ with PostGIS. Proximity is a spatial query, not an AI problem.

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- Hosts. In the marketplace liability model the host org — not the platform —
-- is the volunteer's organization of record and carries its own coverage.
-- A host cannot publish until coverage is verified and unexpired.
-- ---------------------------------------------------------------------------
CREATE TABLE hosts (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                text NOT NULL,
  neighborhood        text,
  contact_email       text NOT NULL,
  coverage_verified   boolean NOT NULL DEFAULT false,
  coverage_expires_on date,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sites (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id       uuid NOT NULL REFERENCES hosts(id) ON DELETE CASCADE,
  label         text NOT NULL,
  geom          geography(Point, 4326) NOT NULL,
  neighborhood  text,
  ownership     text NOT NULL CHECK (ownership IN ('public_row','city_owned','host_owned','private_consented')),
  consent_doc   text,                        -- S3 key; required when ownership = private_consented
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT private_needs_consent CHECK (ownership <> 'private_consented' OR consent_doc IS NOT NULL)
);
CREATE INDEX sites_geom_idx ON sites USING GIST (geom);

-- ---------------------------------------------------------------------------
-- 311 ingest. Raw complaints land here; clustering turns them into proposals.
-- ---------------------------------------------------------------------------
CREATE TABLE csb_requests (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id   text UNIQUE NOT NULL,
  service_code  text NOT NULL,
  service_name  text,
  description   text,
  geom          geography(Point, 4326),
  neighborhood  text,
  requested_at  timestamptz,
  status        text,
  cluster_id    uuid,
  ingested_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX csb_geom_idx ON csb_requests USING GIST (geom);
CREATE INDEX csb_cluster_idx ON csb_requests (cluster_id);

-- ---------------------------------------------------------------------------
-- Every classifier verdict is retained, keyed to the rubric version that
-- produced it. This is what lets a city partner audit a decision months later.
-- ---------------------------------------------------------------------------
CREATE TABLE classifications (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rubric_version  text NOT NULL,
  model           text NOT NULL,
  proposal        jsonb NOT NULL,
  result          jsonb NOT NULL,
  verdict         text NOT NULL CHECK (verdict IN ('pass','downgrade','reject')),
  confidence      numeric(3,2) NOT NULL,
  reviewed_by     uuid,
  reviewed_at     timestamptz,
  review_outcome  text CHECK (review_outcome IN ('approved','rejected','edited')),
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Sessions. Nothing publishes from 311 data alone — a resident host confirms.
-- ---------------------------------------------------------------------------
CREATE TABLE sessions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id           uuid NOT NULL REFERENCES hosts(id),
  site_id           uuid NOT NULL REFERENCES sites(id),
  classification_id uuid REFERENCES classifications(id),
  task_code         text NOT NULL,
  title             text NOT NULL,
  done_state        text NOT NULL,
  kit               jsonb NOT NULL DEFAULT '[]',
  crew_min          int NOT NULL CHECK (crew_min >= 2),
  crew_max          int NOT NULL,
  starts_at         timestamptz NOT NULL,
  duration_minutes  int NOT NULL CHECK (duration_minutes BETWEEN 15 AND 90),
  crew_lead_id      uuid,
  lead_stipend_cents int NOT NULL DEFAULT 5000,
  status            text NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','published','cancelled','completed')),
  cancel_reason     text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT crew_range CHECK (crew_max >= crew_min)
);
CREATE INDEX sessions_starts_idx ON sessions (starts_at) WHERE status = 'published';

CREATE TABLE members (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id   text UNIQUE NOT NULL,          -- Clerk subject
  display_name  text NOT NULL,
  neighborhood  text,
  waiver_signed_at timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE signups (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  member_id   uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  state       text NOT NULL DEFAULT 'confirmed'
              CHECK (state IN ('confirmed','waitlist','cancelled')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, member_id)
);

CREATE TABLE attendance (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  member_id     uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  checked_in_at timestamptz NOT NULL DEFAULT now(),
  verified_by   text NOT NULL CHECK (verified_by IN ('geofence','crew_lead')),
  UNIQUE (session_id, member_id)
);

CREATE TABLE completions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id     uuid NOT NULL UNIQUE REFERENCES sessions(id) ON DELETE CASCADE,
  before_keys    text[] NOT NULL DEFAULT '{}',
  after_keys     text[] NOT NULL DEFAULT '{}',
  done_state_met boolean NOT NULL,
  notes          text,
  closed_by      uuid NOT NULL REFERENCES members(id),
  closed_at      timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- The hour ledger is the sellable asset — sponsors and grant reporting both
-- read from here. Append-only: corrections are new rows, never updates.
-- ---------------------------------------------------------------------------
CREATE TABLE hour_ledger (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    uuid NOT NULL REFERENCES sessions(id),
  member_id     uuid NOT NULL REFERENCES members(id),
  host_id       uuid NOT NULL REFERENCES hosts(id),
  minutes       int NOT NULL CHECK (minutes > 0),
  neighborhood_served text,
  member_neighborhood text,       -- powers the served-vs-led equity report
  verified      boolean NOT NULL DEFAULT true,
  correction_of uuid REFERENCES hour_ledger(id),
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ledger_host_idx ON hour_ledger (host_id, created_at);

CREATE TABLE incidents (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  uuid NOT NULL REFERENCES sessions(id),
  severity    text NOT NULL CHECK (severity IN ('near_miss','first_aid','medical','property')),
  narrative   text NOT NULL,
  reported_by uuid NOT NULL REFERENCES members(id),
  created_at  timestamptz NOT NULL DEFAULT now()
);

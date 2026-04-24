-- MWX SLA Dashboard — PostgreSQL DDL
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS "User" (
  "id"           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "name"         TEXT NOT NULL,
  "email"        TEXT UNIQUE NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "role"         TEXT NOT NULL DEFAULT 'sales',
  "region"       TEXT,
  "active"       BOOLEAN NOT NULL DEFAULT true,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "FunnelStage" (
  "id"             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "order"          INTEGER NOT NULL,
  "name"           TEXT UNIQUE NOT NULL,
  "description"    TEXT,
  "slaMin"         INTEGER NOT NULL DEFAULT 1,
  "slaTarget"      INTEGER NOT NULL DEFAULT 3,
  "slaMax"         INTEGER NOT NULL DEFAULT 7,
  "convRateTarget" DOUBLE PRECISION NOT NULL DEFAULT 0.5
);

CREATE TABLE IF NOT EXISTS "Prospect" (
  "id"             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tglMasuk"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "salesId"        TEXT NOT NULL REFERENCES "User"("id"),
  "namaProspek"    TEXT NOT NULL,
  "channel"        TEXT,
  "produkFokus"    TEXT,
  "kontakPIC"      TEXT,
  "kontakInfo"     TEXT,
  "stage"          TEXT NOT NULL DEFAULT '1. Lead/Prospek',
  "tglUpdateStage" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "nextAction"     TEXT,
  "estUmkmReach"   INTEGER,
  "estNilaiDeal"   DOUBLE PRECISION,
  "probability"    DOUBLE PRECISION,
  "weightedUmkm"   DOUBLE PRECISION,
  "weightedNilai"  DOUBLE PRECISION,
  "hariDiStage"    INTEGER NOT NULL DEFAULT 0,
  "statusSLA"      TEXT NOT NULL DEFAULT 'On Track',
  "reasonLost"     TEXT,
  "linkDokumen"    TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "PipelineHistory" (
  "id"          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "prospectId"  TEXT NOT NULL REFERENCES "Prospect"("id") ON DELETE CASCADE,
  "changedById" TEXT NOT NULL REFERENCES "User"("id"),
  "changedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "fieldName"   TEXT NOT NULL,
  "oldValue"    TEXT,
  "newValue"    TEXT,
  "notes"       TEXT
);

CREATE TABLE IF NOT EXISTS "Activity" (
  "id"            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tanggal"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "salesId"       TEXT NOT NULL REFERENCES "User"("id"),
  "prospectId"    TEXT REFERENCES "Prospect"("id"),
  "tipeAktivitas" TEXT NOT NULL,
  "namaProspek"   TEXT,
  "pic"           TEXT,
  "topikHasil"    TEXT,
  "nextStage"     TEXT,
  "catatan"       TEXT,
  "linkMOM"       TEXT,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "MOM" (
  "id"          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "title"       TEXT NOT NULL,
  "tanggal"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "salesId"     TEXT NOT NULL REFERENCES "User"("id"),
  "prospectId"  TEXT REFERENCES "Prospect"("id"),
  "participants" TEXT,
  "agenda"      TEXT,
  "discussion"  TEXT,
  "decisions"   TEXT,
  "actionItems" TEXT,
  "nextMeeting" TIMESTAMP(3),
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Config" (
  "id"          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "key"         TEXT UNIQUE NOT NULL,
  "value"       TEXT NOT NULL,
  "label"       TEXT NOT NULL,
  "description" TEXT,
  "category"    TEXT NOT NULL DEFAULT 'general'
);

-- Auto-update updatedAt for User
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW."updatedAt" = CURRENT_TIMESTAMP; RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_updated_at ON "User";
CREATE TRIGGER user_updated_at BEFORE UPDATE ON "User"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS prospect_updated_at ON "Prospect";
CREATE TRIGGER prospect_updated_at BEFORE UPDATE ON "Prospect"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS mom_updated_at ON "MOM";
CREATE TRIGGER mom_updated_at BEFORE UPDATE ON "MOM"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Mark migration as done in Prisma's _prisma_migrations table (optional)
CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
  "id"                    TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "checksum"              TEXT NOT NULL,
  "finished_at"           TIMESTAMP WITH TIME ZONE,
  "migration_name"        TEXT NOT NULL,
  "logs"                  TEXT,
  "rolled_back_at"        TIMESTAMP WITH TIME ZONE,
  "started_at"            TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "applied_steps_count"   INTEGER NOT NULL DEFAULT 0
);

INSERT INTO "_prisma_migrations" ("checksum","finished_at","migration_name","applied_steps_count")
VALUES ('manual',NOW(),'postgres-init',1)
ON CONFLICT DO NOTHING;

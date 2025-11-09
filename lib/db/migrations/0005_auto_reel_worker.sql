ALTER TABLE "auto_reel_jobs"
  ADD COLUMN IF NOT EXISTS "worker_id" text,
  ADD COLUMN IF NOT EXISTS "retry_count" integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "last_error_at" timestamp;


CREATE TABLE IF NOT EXISTS "auto_reel_jobs" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "youtube_url" text NOT NULL,
  "title" text,
  "config" jsonb NOT NULL,
  "status" varchar(32) NOT NULL DEFAULT 'queued',
  "progress" integer NOT NULL DEFAULT 0,
  "provider_job_id" text,
  "download_urls" jsonb,
  "error" text,
  "cost_cents" integer,
  "metadata" jsonb,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  "completed_at" timestamp
);

CREATE INDEX IF NOT EXISTS "auto_reel_jobs_user_idx" ON "auto_reel_jobs"("user_id");
CREATE INDEX IF NOT EXISTS "auto_reel_jobs_status_idx" ON "auto_reel_jobs"("status");



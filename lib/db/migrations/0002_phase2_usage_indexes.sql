CREATE INDEX IF NOT EXISTS usage_logs_user_created_idx
  ON "usage_logs" ("user_id", "created_at" DESC);


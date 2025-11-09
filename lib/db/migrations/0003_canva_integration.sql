CREATE TABLE IF NOT EXISTS "canva_sessions" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL,
  "access_token" text NOT NULL,
  "refresh_token" text,
  "scope" text,
  "expires_at" timestamp NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "canva_sessions_user_id_fkey"
    FOREIGN KEY ("user_id")
    REFERENCES "users"("id")
    ON DELETE cascade
);

CREATE TABLE IF NOT EXISTS "canva_designs" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL,
  "design_id" varchar(128) NOT NULL,
  "format" varchar(32) NOT NULL,
  "storyboard_input" jsonb,
  "last_synced_at" timestamp DEFAULT now() NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "canva_designs_user_id_fkey"
    FOREIGN KEY ("user_id")
    REFERENCES "users"("id")
    ON DELETE cascade
);

CREATE INDEX IF NOT EXISTS "canva_sessions_user_idx" ON "canva_sessions"("user_id");
CREATE INDEX IF NOT EXISTS "canva_designs_user_idx" ON "canva_designs"("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "canva_designs_user_design_unique" ON "canva_designs"("user_id", "design_id");


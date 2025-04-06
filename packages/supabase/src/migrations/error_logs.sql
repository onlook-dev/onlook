
CREATE TABLE IF NOT EXISTS error_logs (
  id BIGSERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL,
  user_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  source TEXT NOT NULL,
  request_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  error_type TEXT NOT NULL,
  error_stack TEXT,
  error_details JSONB NOT NULL,
  additional_info JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS error_logs_user_id_idx ON error_logs(user_id);
CREATE INDEX IF NOT EXISTS error_logs_timestamp_idx ON error_logs(timestamp);
CREATE INDEX IF NOT EXISTS error_logs_error_type_idx ON error_logs(error_type);

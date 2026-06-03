CREATE TABLE IF NOT EXISTS cash_closings (
  id BIGSERIAL PRIMARY KEY,
  period_from TIMESTAMPTZ NOT NULL,
  period_to TIMESTAMPTZ NOT NULL,
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cash_closings_created_at ON cash_closings(created_at DESC);

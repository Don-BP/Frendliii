-- Settings: one row per venue, created on first Reports page visit
CREATE TABLE IF NOT EXISTS venue_report_settings (
  venue_id      UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email_enabled BOOLEAN NOT NULL DEFAULT true,
  delivery_day  INTEGER NOT NULL DEFAULT 1 CHECK (delivery_day BETWEEN 1 AND 28),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE venue_report_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "venue can manage own settings"
  ON venue_report_settings
  FOR ALL
  USING (auth.uid() = venue_id)
  WITH CHECK (auth.uid() = venue_id);

-- Report records: one per venue per month
CREATE TABLE IF NOT EXISTS venue_reports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  report_month  DATE NOT NULL,
  generated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  pdf_url       TEXT,
  UNIQUE (venue_id, report_month)
);

ALTER TABLE venue_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "venue can read own reports"
  ON venue_reports
  FOR SELECT
  USING (auth.uid() = venue_id);

CREATE POLICY "venue can insert own reports"
  ON venue_reports
  FOR INSERT
  WITH CHECK (auth.uid() = venue_id);

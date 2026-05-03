CREATE TABLE dcfsa_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  care_recipient_id uuid NOT NULL REFERENCES care_recipients(id) ON DELETE CASCADE,
  annual_cap numeric(10,2) NOT NULL DEFAULT 3000.00,
  benefit_year_start_month smallint NOT NULL DEFAULT 1 CHECK (benefit_year_start_month BETWEEN 1 AND 12),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (care_recipient_id)
);

ALTER TABLE dcfsa_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view dcfsa_settings for their own recipients"
  ON dcfsa_settings FOR SELECT
  USING (
    care_recipient_id IN (
      SELECT id FROM care_recipients WHERE owner_user_id = auth.uid()
    )
    OR care_recipient_id IN (
      SELECT care_recipient_id FROM care_recipient_members
      WHERE user_id = auth.uid() AND status = 'accepted'
    )
  );

CREATE POLICY "Owners can insert dcfsa_settings"
  ON dcfsa_settings FOR INSERT
  WITH CHECK (
    care_recipient_id IN (
      SELECT id FROM care_recipients WHERE owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Owners can update dcfsa_settings"
  ON dcfsa_settings FOR UPDATE
  USING (
    care_recipient_id IN (
      SELECT id FROM care_recipients WHERE owner_user_id = auth.uid()
    )
  );

-- Auto-update updated_at on row modification
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER dcfsa_settings_updated_at
  BEFORE UPDATE ON dcfsa_settings
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

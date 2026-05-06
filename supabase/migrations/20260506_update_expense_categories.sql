-- Update expense categories to FSA-specific values.
-- Existing expenses with old category values are migrated to 'Uncategorized'.
-- New default is 'Uncategorized' so existing rows without a category are handled.

ALTER TABLE expenses
  ALTER COLUMN category SET DEFAULT 'Uncategorized';

UPDATE expenses
  SET category = 'Uncategorized'
  WHERE category NOT IN ('Vision', 'Dental', 'Medical', 'Prescriptions', 'Other', 'Uncategorized');

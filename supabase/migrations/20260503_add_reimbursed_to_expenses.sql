-- Add reimbursed column to expenses table (defaults to false for existing rows)
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS reimbursed boolean NOT NULL DEFAULT false;

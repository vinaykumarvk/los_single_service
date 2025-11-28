-- Migration: Change application_id from UUID to TEXT format (product code + serial number)
-- Format: HL00001, PL00042, BT00012, etc.

-- Step 1: Create sequences for each product type
CREATE SEQUENCE IF NOT EXISTS seq_home_loan START WITH 1;
CREATE SEQUENCE IF NOT EXISTS seq_personal_loan START WITH 1;
CREATE SEQUENCE IF NOT EXISTS seq_balance_transfer START WITH 1;

-- Step 2: Drop foreign key constraints that reference application_id
ALTER TABLE IF EXISTS property_details DROP CONSTRAINT IF EXISTS property_details_application_id_fkey;
ALTER TABLE IF EXISTS application_notes DROP CONSTRAINT IF EXISTS application_notes_application_id_fkey;
-- Note: application_history doesn't have FK constraint, just references

-- Step 3: Change application_id column type from UUID to TEXT in all related tables first
ALTER TABLE IF EXISTS property_details ALTER COLUMN application_id TYPE TEXT;
ALTER TABLE IF EXISTS application_history ALTER COLUMN application_id TYPE TEXT;

-- Step 4: Change application_id column type from UUID to TEXT in applications table
ALTER TABLE applications ALTER COLUMN application_id TYPE TEXT;

-- Step 5: Recreate foreign key constraints
ALTER TABLE IF EXISTS property_details 
  ADD CONSTRAINT property_details_application_id_fkey 
  FOREIGN KEY (application_id) REFERENCES applications(application_id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS application_notes 
  ADD CONSTRAINT application_notes_application_id_fkey 
  FOREIGN KEY (application_id) REFERENCES applications(application_id) ON DELETE CASCADE;

-- Step 5: Update outbox table aggregate_id to TEXT (if it references applications)
-- Note: outbox.aggregate_id is used for multiple entity types, so we'll keep it as UUID for now
-- But we'll need to handle application IDs specially

-- Step 6: Create function to generate application ID
CREATE OR REPLACE FUNCTION generate_application_id(product_code TEXT)
RETURNS TEXT AS $$
DECLARE
  prefix TEXT;
  serial_num INTEGER;
  app_id TEXT;
BEGIN
  -- Map product code to prefix
  CASE product_code
    WHEN 'HOME_LOAN_V1' THEN prefix := 'HL';
    WHEN 'PERSONAL_LOAN_V1' THEN prefix := 'PL';
    WHEN 'BALANCE_TRANSFER_V1' THEN prefix := 'BT';
    ELSE prefix := 'AP'; -- Default prefix for unknown products
  END CASE;
  
  -- Get next serial number based on product type
  CASE product_code
    WHEN 'HOME_LOAN_V1' THEN 
      serial_num := nextval('seq_home_loan');
    WHEN 'PERSONAL_LOAN_V1' THEN 
      serial_num := nextval('seq_personal_loan');
    WHEN 'BALANCE_TRANSFER_V1' THEN 
      serial_num := nextval('seq_balance_transfer');
    ELSE 
      serial_num := 1; -- Default
  END CASE;
  
  -- Format: HL00001, PL00042, etc. (5-digit serial number)
  app_id := prefix || LPAD(serial_num::TEXT, 5, '0');
  
  RETURN app_id;
END;
$$ LANGUAGE plpgsql;

-- Step 8: Initialize sequences based on existing data (if any)
DO $$
DECLARE
  max_hl INTEGER;
  max_pl INTEGER;
  max_bt INTEGER;
BEGIN
  -- Get max serial number from existing applications (if any)
  SELECT COALESCE(MAX(CAST(SUBSTRING(application_id FROM 3) AS INTEGER)), 0)
  INTO max_hl
  FROM applications
  WHERE product_code = 'HOME_LOAN_V1' 
    AND application_id ~ '^HL[0-9]+$';
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(application_id FROM 3) AS INTEGER)), 0)
  INTO max_pl
  FROM applications
  WHERE product_code = 'PERSONAL_LOAN_V1' 
    AND application_id ~ '^PL[0-9]+$';
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(application_id FROM 3) AS INTEGER)), 0)
  INTO max_bt
  FROM applications
  WHERE product_code = 'BALANCE_TRANSFER_V1' 
    AND application_id ~ '^BT[0-9]+$';
  
  -- Set sequence values to continue from existing max
  IF max_hl > 0 THEN
    PERFORM setval('seq_home_loan', max_hl);
  END IF;
  
  IF max_pl > 0 THEN
    PERFORM setval('seq_personal_loan', max_pl);
  END IF;
  
  IF max_bt > 0 THEN
    PERFORM setval('seq_balance_transfer', max_bt);
  END IF;
END $$;


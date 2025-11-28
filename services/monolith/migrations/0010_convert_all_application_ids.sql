-- Migration: Convert all UUID application IDs to product code + serial number format
-- This ensures all applications use the format: HL00001, PL00042, etc.

-- Step 1: Update generate_application_id function to handle all product codes
CREATE OR REPLACE FUNCTION generate_application_id(product_code TEXT)
RETURNS TEXT AS $$
DECLARE
  prefix TEXT;
  serial_num INTEGER;
  app_id TEXT;
BEGIN
  -- Map product code to prefix (handle all variations)
  CASE 
    WHEN product_code = 'HOME_LOAN_V1' OR product_code LIKE 'HOME%' THEN prefix := 'HL';
    WHEN product_code = 'PERSONAL_LOAN_V1' OR product_code = 'PL' OR product_code LIKE 'PERSONAL%' THEN prefix := 'PL';
    WHEN product_code = 'BALANCE_TRANSFER_V1' OR product_code LIKE 'BALANCE%' THEN prefix := 'BT';
    WHEN product_code = 'BUSINESS_LOAN_V1' OR product_code LIKE 'BUSINESS%' THEN prefix := 'BL';
    WHEN product_code = 'EDUCATION_LOAN_V1' OR product_code LIKE 'EDUCATION%' THEN prefix := 'EL';
    WHEN product_code = 'VEHICLE_LOAN_V1' OR product_code LIKE 'VEHICLE%' THEN prefix := 'VL';
    ELSE prefix := 'AP'; -- Default prefix for unknown products
  END CASE;
  
  -- Get next serial number based on product type
  CASE 
    WHEN product_code = 'HOME_LOAN_V1' OR product_code LIKE 'HOME%' THEN 
      serial_num := nextval('seq_home_loan');
    WHEN product_code = 'PERSONAL_LOAN_V1' OR product_code = 'PL' OR product_code LIKE 'PERSONAL%' THEN 
      serial_num := nextval('seq_personal_loan');
    WHEN product_code = 'BALANCE_TRANSFER_V1' OR product_code LIKE 'BALANCE%' THEN 
      serial_num := nextval('seq_balance_transfer');
    ELSE 
      -- For unknown products, use a default sequence
      serial_num := nextval('seq_home_loan'); -- Fallback
  END CASE;
  
  -- Format: HL00001, PL00042, etc. (5-digit serial number)
  app_id := prefix || LPAD(serial_num::TEXT, 5, '0');
  
  RETURN app_id;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Create a mapping table to track UUID to new ID conversions
CREATE TABLE IF NOT EXISTS application_id_mapping (
    old_id TEXT PRIMARY KEY,
    new_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Step 3: Temporarily disable foreign key constraints
ALTER TABLE property_details DROP CONSTRAINT IF EXISTS property_details_application_id_fkey;
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'application_notes') THEN
        ALTER TABLE application_notes DROP CONSTRAINT IF EXISTS application_notes_application_id_fkey;
    END IF;
END $$;

-- Step 4: Convert all UUID application IDs to new format
DO $$
DECLARE
    app_record RECORD;
    new_id TEXT;
    old_id TEXT;
    product_prefix TEXT;
    max_serial INTEGER;
    counter INTEGER := 0;
BEGIN
    -- Process each application with UUID format
    FOR app_record IN 
        SELECT application_id, product_code
        FROM applications
        WHERE application_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        ORDER BY created_at
    LOOP
        old_id := app_record.application_id;
        
        -- Determine prefix based on product code
        CASE 
            WHEN app_record.product_code = 'HOME_LOAN_V1' OR app_record.product_code LIKE 'HOME%' THEN product_prefix := 'HL';
            WHEN app_record.product_code = 'PERSONAL_LOAN_V1' OR app_record.product_code = 'PL' OR app_record.product_code LIKE 'PERSONAL%' THEN product_prefix := 'PL';
            WHEN app_record.product_code = 'BALANCE_TRANSFER_V1' OR app_record.product_code LIKE 'BALANCE%' THEN product_prefix := 'BT';
            WHEN app_record.product_code = 'BUSINESS_LOAN_V1' OR app_record.product_code LIKE 'BUSINESS%' THEN product_prefix := 'BL';
            WHEN app_record.product_code = 'EDUCATION_LOAN_V1' OR app_record.product_code LIKE 'EDUCATION%' THEN product_prefix := 'EL';
            WHEN app_record.product_code = 'VEHICLE_LOAN_V1' OR app_record.product_code LIKE 'VEHICLE%' THEN product_prefix := 'VL';
            ELSE product_prefix := 'AP';
        END CASE;
        
        -- Get current max serial for this product type
        SELECT COALESCE(MAX(CAST(SUBSTRING(application_id FROM 3) AS INTEGER)), 0)
        INTO max_serial
        FROM applications
        WHERE application_id ~ ('^' || product_prefix || '[0-9]+$');
        
        -- Generate new ID
        max_serial := max_serial + 1;
        new_id := product_prefix || LPAD(max_serial::TEXT, 5, '0');
        
        -- Save mapping (ignore conflicts)
        INSERT INTO application_id_mapping (old_id, new_id)
        VALUES (app_record.application_id, new_id)
        ON CONFLICT ON CONSTRAINT application_id_mapping_pkey DO NOTHING;
        
        -- Update applications table first (now that FK constraints are disabled)
        UPDATE applications SET application_id = new_id WHERE application_id = app_record.application_id;
        
        -- Update related tables
        UPDATE property_details SET application_id = new_id WHERE application_id = app_record.application_id;
        UPDATE application_history SET application_id = new_id WHERE application_id = app_record.application_id;
        -- Update application_notes if table exists
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'application_notes') THEN
            EXECUTE format('UPDATE application_notes SET application_id = %L WHERE application_id = %L', new_id, app_record.application_id);
        END IF;
        UPDATE outbox SET aggregate_id = new_id WHERE aggregate_id = app_record.application_id AND topic LIKE '%application%';
        
        counter := counter + 1;
        
        -- Update sequence for next time
        CASE 
            WHEN product_prefix = 'HL' THEN PERFORM setval('seq_home_loan', max_serial);
            WHEN product_prefix = 'PL' THEN PERFORM setval('seq_personal_loan', max_serial);
            WHEN product_prefix = 'BT' THEN PERFORM setval('seq_balance_transfer', max_serial);
            ELSE NULL;
        END CASE;
    END LOOP;
    
    RAISE NOTICE 'Converted % UUID application IDs to new format', counter;
END $$;

-- Step 5: Re-enable foreign key constraints
ALTER TABLE property_details 
  ADD CONSTRAINT property_details_application_id_fkey 
  FOREIGN KEY (application_id) REFERENCES applications(application_id) ON DELETE CASCADE;

DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'application_notes') THEN
        EXECUTE 'ALTER TABLE application_notes 
          ADD CONSTRAINT application_notes_application_id_fkey 
          FOREIGN KEY (application_id) REFERENCES applications(application_id) ON DELETE CASCADE';
    END IF;
END $$;

-- Step 6: Verify all applications now use new format
DO $$
DECLARE
    uuid_count INTEGER;
    total_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO uuid_count
    FROM applications
    WHERE application_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
    
    SELECT COUNT(*) INTO total_count FROM applications;
    
    IF uuid_count > 0 THEN
        RAISE WARNING 'Still have % applications with UUID format out of % total', uuid_count, total_count;
    ELSE
        RAISE NOTICE 'All % applications now use new format (product code + serial number)', total_count;
    END IF;
END $$;

-- Step 7: Initialize sequences to continue from max
DO $$
DECLARE
  max_hl INTEGER;
  max_pl INTEGER;
  max_bt INTEGER;
BEGIN
  -- Get max serial number from existing applications
  SELECT COALESCE(MAX(CAST(SUBSTRING(application_id FROM 3) AS INTEGER)), 0)
  INTO max_hl
  FROM applications
  WHERE application_id ~ '^HL[0-9]+$';
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(application_id FROM 3) AS INTEGER)), 0)
  INTO max_pl
  FROM applications
  WHERE application_id ~ '^PL[0-9]+$';
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(application_id FROM 3) AS INTEGER)), 0)
  INTO max_bt
  FROM applications
  WHERE application_id ~ '^BT[0-9]+$';
  
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


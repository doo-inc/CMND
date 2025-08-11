-- Clean up all duplicate/incorrect payments and fix the payment generation function
DELETE FROM payments;

-- Drop and recreate the payment generation function with correct logic
DROP FUNCTION IF EXISTS generate_payment_schedule();

CREATE OR REPLACE FUNCTION public.generate_payment_schedule()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  payment_amount INTEGER;
  current_due_date DATE;
  interval_months INTEGER;
  end_date DATE;
  setup_fee_amount INTEGER;
BEGIN
  -- Delete existing payments for this contract if updating
  IF TG_OP = 'UPDATE' THEN
    DELETE FROM public.payments WHERE contract_id = NEW.id;
  END IF;

  -- Skip if no start date
  IF NEW.start_date IS NULL THEN
    RETURN NEW;
  END IF;

  setup_fee_amount := COALESCE(NEW.setup_fee, 0);
  
  -- For annual contracts: create single payment at start_date
  IF NEW.payment_frequency = 'annual' THEN
    payment_amount := setup_fee_amount + COALESCE(NEW.annual_rate, NEW.value, 0);
    IF payment_amount > 0 THEN
      INSERT INTO public.payments (
        contract_id, customer_id, amount, due_date, payment_type, status
      ) VALUES (
        NEW.id, NEW.customer_id, payment_amount, NEW.start_date::DATE, 'recurring', 'pending'
      );
    END IF;
    RETURN NEW;
  END IF;

  -- For one-time contracts
  IF NEW.payment_frequency = 'one_time' THEN
    payment_amount := setup_fee_amount + COALESCE(NEW.annual_rate, NEW.value, 0);
    IF payment_amount > 0 THEN
      INSERT INTO public.payments (
        contract_id, customer_id, amount, due_date, payment_type, status
      ) VALUES (
        NEW.id, NEW.customer_id, payment_amount, NEW.start_date::DATE, 'one_time', 'pending'
      );
    END IF;
    RETURN NEW;
  END IF;

  -- For recurring schedules (monthly, quarterly, semi_annual) we need end_date
  IF NEW.end_date IS NULL THEN
    RETURN NEW;
  END IF;

  -- Determine interval for recurring payments
  CASE NEW.payment_frequency
    WHEN 'monthly' THEN interval_months := 1;
    WHEN 'quarterly' THEN interval_months := 3;
    WHEN 'semi_annual' THEN interval_months := 6;
    ELSE interval_months := 12; -- fallback
  END CASE;

  -- Calculate recurring payment amount (divide annual by frequency)
  payment_amount := COALESCE(NEW.annual_rate, NEW.value, 0);
  IF NEW.payment_frequency = 'monthly' THEN
    payment_amount := FLOOR(payment_amount / 12);
  ELSIF NEW.payment_frequency = 'quarterly' THEN
    payment_amount := FLOOR(payment_amount / 4);
  ELSIF NEW.payment_frequency = 'semi_annual' THEN
    payment_amount := FLOOR(payment_amount / 2);
  END IF;

  IF payment_amount <= 0 THEN
    RETURN NEW;
  END IF;

  -- Generate payments across contract period
  current_due_date := NEW.start_date::DATE;
  end_date := NEW.end_date::DATE;
  
  -- First payment includes setup fee
  INSERT INTO public.payments (
    contract_id, customer_id, amount, due_date, payment_type, status
  ) VALUES (
    NEW.id, NEW.customer_id, setup_fee_amount + payment_amount, current_due_date, 'recurring', 'pending'
  );

  -- Generate subsequent payments
  current_due_date := current_due_date + (interval_months || ' months')::INTERVAL;
  
  WHILE current_due_date < end_date LOOP
    INSERT INTO public.payments (
      contract_id, customer_id, amount, due_date, payment_type, status
    ) VALUES (
      NEW.id, NEW.customer_id, payment_amount, current_due_date, 'recurring', 'pending'
    );

    current_due_date := current_due_date + (interval_months || ' months')::INTERVAL;
  END LOOP;

  RETURN NEW;
END;
$function$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS trigger_generate_payment_schedule ON contracts;
CREATE TRIGGER trigger_generate_payment_schedule
  AFTER INSERT OR UPDATE ON contracts
  FOR EACH ROW
  EXECUTE FUNCTION generate_payment_schedule();

-- Regenerate all payments for existing contracts
UPDATE contracts SET updated_at = now();
-- Update the payment schedule generation to combine setup fee with first payment
CREATE OR REPLACE FUNCTION public.generate_payment_schedule()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  first_payment_amount INTEGER;
  recurring_payment_amount INTEGER;
  current_due_date DATE;
  interval_months INTEGER;
  end_date DATE;
  setup_fee_amount INTEGER;
BEGIN
  -- Delete existing payments for this contract if updating
  IF TG_OP = 'UPDATE' THEN
    DELETE FROM public.payments WHERE contract_id = NEW.id;
  END IF;

  -- Skip everything if no start date
  IF NEW.start_date IS NULL THEN
    RETURN NEW;
  END IF;

  setup_fee_amount := COALESCE(NEW.setup_fee, 0);

  -- Handle one-time contracts: a single payment at start_date (setup + full amount)
  IF NEW.payment_frequency = 'one_time' THEN
    IF (setup_fee_amount + COALESCE(NEW.annual_rate, NEW.value, 0)) > 0 THEN
      INSERT INTO public.payments (
        contract_id, customer_id, amount, due_date, payment_type, status
      ) VALUES (
        NEW.id, NEW.customer_id, 
        setup_fee_amount + COALESCE(NEW.annual_rate, NEW.value, 0), 
        NEW.start_date::DATE, 'one_time', 'pending'
      );
    END IF;
    RETURN NEW;
  END IF;

  -- Handle annual contracts: one upfront payment (setup + full annual)
  IF NEW.payment_frequency = 'annual' THEN
    IF (setup_fee_amount + COALESCE(NEW.annual_rate, NEW.value, 0)) > 0 THEN
      INSERT INTO public.payments (
        contract_id, customer_id, amount, due_date, payment_type, status
      ) VALUES (
        NEW.id, NEW.customer_id, 
        setup_fee_amount + COALESCE(NEW.annual_rate, NEW.value, 0), 
        NEW.start_date::DATE, 'annual', 'pending'
      );
    END IF;
    RETURN NEW;
  END IF;

  -- For recurring schedules (monthly, quarterly, semi_annual) we need both dates
  IF NEW.end_date IS NULL THEN
    RETURN NEW;
  END IF;

  -- Determine payment frequency and interval
  CASE NEW.payment_frequency
    WHEN 'monthly' THEN interval_months := 1;
    WHEN 'quarterly' THEN interval_months := 3;
    WHEN 'semi_annual' THEN interval_months := 6;
    ELSE interval_months := 12; -- fallback to annual
  END CASE;

  -- Determine base recurring amount (annual_rate preferred, fallback to legacy value)
  recurring_payment_amount := COALESCE(NEW.annual_rate, NEW.value, 0);

  -- Adjust recurring amount per installment
  IF NEW.payment_frequency = 'monthly' THEN
    recurring_payment_amount := FLOOR(recurring_payment_amount / 12);
  ELSIF NEW.payment_frequency = 'quarterly' THEN
    recurring_payment_amount := FLOOR(recurring_payment_amount / 4);
  ELSIF NEW.payment_frequency = 'semi_annual' THEN
    recurring_payment_amount := FLOOR(recurring_payment_amount / 2);
  END IF;

  -- Guard: if no recurring amount, skip generating recurring payments
  IF recurring_payment_amount <= 0 THEN
    RETURN NEW;
  END IF;

  -- Generate recurring payments across the contract period (end_date is exclusive)
  current_due_date := NEW.start_date::DATE;
  end_date := NEW.end_date::DATE;
  
  -- First payment includes setup fee + first installment
  first_payment_amount := setup_fee_amount + recurring_payment_amount;
  
  IF first_payment_amount > 0 THEN
    INSERT INTO public.payments (
      contract_id, customer_id, amount, due_date, payment_type, status
    ) VALUES (
      NEW.id, NEW.customer_id, first_payment_amount, current_due_date, 'recurring', 'pending'
    );
  END IF;

  -- Move to next payment date
  current_due_date := current_due_date + (interval_months || ' months')::INTERVAL;

  -- Generate subsequent recurring payments (just the installment amount)
  WHILE current_due_date < end_date LOOP
    INSERT INTO public.payments (
      contract_id, customer_id, amount, due_date, payment_type, status
    ) VALUES (
      NEW.id, NEW.customer_id, recurring_payment_amount, current_due_date, 'recurring', 'pending'
    );

    current_due_date := current_due_date + (interval_months || ' months')::INTERVAL;
  END LOOP;

  RETURN NEW;
END;
$function$
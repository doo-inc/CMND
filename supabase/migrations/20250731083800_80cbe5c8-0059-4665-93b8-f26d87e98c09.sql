-- Add payment frequency to contracts table
ALTER TABLE public.contracts 
ADD COLUMN payment_frequency TEXT CHECK (payment_frequency IN ('annual', 'semi_annual', 'quarterly')) DEFAULT 'annual';

-- Create payments table to track individual payment records
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID NOT NULL,
  customer_id UUID NOT NULL,
  amount INTEGER NOT NULL,
  due_date DATE NOT NULL,
  payment_date DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue')),
  payment_type TEXT NOT NULL CHECK (payment_type IN ('setup', 'recurring')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on payments table
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Create policies for payments table
CREATE POLICY "Authenticated users can view payments" 
ON public.payments 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create payments" 
ON public.payments 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Authenticated users can update payments" 
ON public.payments 
FOR UPDATE 
USING (true);

-- Create function to auto-generate payment schedule when contract is created/updated
CREATE OR REPLACE FUNCTION public.generate_payment_schedule()
RETURNS TRIGGER AS $$
DECLARE
  payment_amount INTEGER;
  setup_payment_amount INTEGER;
  recurring_payment_amount INTEGER;
  current_due_date DATE;
  interval_months INTEGER;
  end_date DATE;
BEGIN
  -- Delete existing payments for this contract if updating
  IF TG_OP = 'UPDATE' THEN
    DELETE FROM public.payments WHERE contract_id = NEW.id;
  END IF;

  -- Skip if contract doesn't have required dates
  IF NEW.start_date IS NULL OR NEW.end_date IS NULL THEN
    RETURN NEW;
  END IF;

  -- Set payment amounts
  setup_payment_amount := COALESCE(NEW.setup_fee, 0);
  recurring_payment_amount := COALESCE(NEW.annual_rate, NEW.value);
  end_date := NEW.end_date::DATE;

  -- Create setup fee payment if applicable
  IF setup_payment_amount > 0 THEN
    INSERT INTO public.payments (
      contract_id, customer_id, amount, due_date, payment_type, status
    ) VALUES (
      NEW.id, NEW.customer_id, setup_payment_amount, NEW.start_date::DATE, 'setup', 'pending'
    );
  END IF;

  -- Determine payment frequency and interval
  CASE NEW.payment_frequency
    WHEN 'quarterly' THEN interval_months := 3;
    WHEN 'semi_annual' THEN interval_months := 6;
    ELSE interval_months := 12; -- annual
  END CASE;

  -- Adjust recurring payment amount based on frequency
  IF NEW.payment_frequency = 'quarterly' THEN
    recurring_payment_amount := recurring_payment_amount / 4;
  ELSIF NEW.payment_frequency = 'semi_annual' THEN
    recurring_payment_amount := recurring_payment_amount / 2;
  END IF;

  -- Generate recurring payments
  current_due_date := NEW.start_date::DATE;
  
  WHILE current_due_date <= end_date LOOP
    INSERT INTO public.payments (
      contract_id, customer_id, amount, due_date, payment_type, status
    ) VALUES (
      NEW.id, NEW.customer_id, recurring_payment_amount, current_due_date, 'recurring', 'pending'
    );
    
    current_due_date := current_due_date + (interval_months || ' months')::INTERVAL;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate payments
CREATE TRIGGER generate_payments_on_contract_change
  AFTER INSERT OR UPDATE ON public.contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_payment_schedule();

-- Create function to update payment status based on due dates
CREATE OR REPLACE FUNCTION public.update_payment_status()
RETURNS void AS $$
BEGIN
  -- Update overdue payments
  UPDATE public.payments 
  SET status = 'overdue'
  WHERE status = 'pending' 
    AND due_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at trigger for payments
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_modified_column();
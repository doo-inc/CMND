-- Mark payments as paid for customers who have already paid
UPDATE payments 
SET status = 'paid',
    payment_date = CURRENT_DATE,
    updated_at = now()
WHERE customer_id IN (
  SELECT id FROM customers 
  WHERE name IN ('ARKS Diyar', 'Dome Design', 'Dar AlHekma University')
)
AND status = 'pending'
AND due_date <= CURRENT_DATE;
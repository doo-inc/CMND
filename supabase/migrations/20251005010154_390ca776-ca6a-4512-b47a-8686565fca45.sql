-- Add service plan and tier fields to customers table
ALTER TABLE customers
ADD COLUMN service_type text CHECK (service_type IN ('text', 'voice', 'both')),
ADD COLUMN text_plan text CHECK (text_plan IN ('basic', 'growth')),
ADD COLUMN text_ai_responses integer,
ADD COLUMN voice_tier text CHECK (voice_tier IN ('tier_1', 'tier_2', 'tier_3', 'tier_4')),
ADD COLUMN voice_hours integer,
ADD COLUMN voice_price_per_hour numeric(10,2);

-- Add comments for documentation
COMMENT ON COLUMN customers.service_type IS 'Type of service: text, voice, or both';
COMMENT ON COLUMN customers.text_plan IS 'Text plan type: basic or growth';
COMMENT ON COLUMN customers.text_ai_responses IS 'Number of AI responses included in text plan';
COMMENT ON COLUMN customers.voice_tier IS 'Voice pricing tier: tier_1, tier_2, tier_3, or tier_4';
COMMENT ON COLUMN customers.voice_hours IS 'Monthly voice hours commitment';
COMMENT ON COLUMN customers.voice_price_per_hour IS 'Price per hour for voice service';
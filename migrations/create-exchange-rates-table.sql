-- Create exchange_rates table if it doesn't exist
CREATE TABLE IF NOT EXISTS exchange_rates (
  id UUID PRIMARY KEY,
  date DATE NOT NULL,
  rate DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert a default exchange rate if none exists
INSERT INTO exchange_rates (id, date, rate)
SELECT gen_random_uuid(), CURRENT_DATE, 83.5
WHERE NOT EXISTS (SELECT 1 FROM exchange_rates);

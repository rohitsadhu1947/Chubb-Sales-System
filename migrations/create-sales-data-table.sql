-- Create sales_data table if it doesn't exist
CREATE TABLE IF NOT EXISTS sales_data (
  id UUID PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES clients(id),
  product_id UUID NOT NULL REFERENCES products(id),
  broker_id UUID NOT NULL REFERENCES brokers(id),
  channel_type VARCHAR(50) NOT NULL,
  nbp_inr DECIMAL(15, 2) NOT NULL,
  gwp_inr DECIMAL(15, 2) NOT NULL,
  nbp_usd DECIMAL(15, 2) NOT NULL,
  gwp_usd DECIMAL(15, 2) NOT NULL,
  broker_commission_pct DECIMAL(10, 2) NOT NULL,
  broker_commission_inr DECIMAL(15, 2) NOT NULL,
  cdp_fee_pct DECIMAL(10, 2) NOT NULL,
  cdp_fee_inr DECIMAL(15, 2) NOT NULL,
  sale_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

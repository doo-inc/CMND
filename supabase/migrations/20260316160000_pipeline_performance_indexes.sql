-- ================================================================
-- Pipeline Performance Indexes
--
-- Adds indexes on the hot columns used by pipeline queries.
-- Before these indexes, every pipeline load caused full table
-- scans on lifecycle_stages, contracts, and customers.
--
-- Expected impact:
--   • lifecycle_stages lookup by customer_id: O(n) → O(log n)
--   • contracts lookup by customer_id + status: O(n) → O(log n)
--   • customers filter by status: O(n) → O(log n)
--   • Batelco country/partner_label filter: O(n) → O(log n)
-- ================================================================

-- lifecycle_stages.customer_id
-- Used by usePipelineData for .in('customer_id', batch) and by
-- pipelineSync for the pagination scan grouped in memory.
CREATE INDEX IF NOT EXISTS idx_lifecycle_stages_customer_id
  ON lifecycle_stages(customer_id);

-- contracts.customer_id + status
-- Used by usePipelineData for .in('customer_id', batch).in('status', [...]).
-- Composite index covers both filter columns in one seek.
CREATE INDEX IF NOT EXISTS idx_contracts_customer_id_status
  ON contracts(customer_id, status);

-- customers.status
-- Used by usePipelineData and pipelineSync for
-- .or('status.neq.churned,status.is.null').
CREATE INDEX IF NOT EXISTS idx_customers_status
  ON customers(status);

-- customers.country
-- Used by BatelcoPipeline .or('country.eq.Bahrain,...').
CREATE INDEX IF NOT EXISTS idx_customers_country
  ON customers(country);

-- customers.partner_label
-- Used by BatelcoPipeline .or('...,partner_label.eq.batelco') and
-- by BatelcoCustomers .eq('partner_label','batelco').
CREATE INDEX IF NOT EXISTS idx_customers_partner_label
  ON customers(partner_label);

-- customer_timeline.created_at
-- Used by usePipelineAnalytics for .gte('created_at', date) range scans.
CREATE INDEX IF NOT EXISTS idx_customer_timeline_created_at
  ON customer_timeline(created_at);

-- customer_timeline.customer_id
-- Used by timeline fetch queries filtering by customer.
CREATE INDEX IF NOT EXISTS idx_customer_timeline_customer_id
  ON customer_timeline(customer_id);

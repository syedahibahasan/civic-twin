-- Replicant AI Cache Table Setup
-- Run this script in your Supabase SQL Editor

-- Create the AI cache table
CREATE TABLE IF NOT EXISTS ai_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  district TEXT NOT NULL,
  cache_type TEXT NOT NULL CHECK (cache_type IN ('constituents', 'policy_summary')),
  policy_hash TEXT, -- Only for policy_summary type
  data JSONB NOT NULL, -- The cached AI-generated content
  census_data JSONB, -- Census data for constituents
  congressman_data JSONB, -- Congressman data for policy summaries
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ai_cache_district_type ON ai_cache(district, cache_type);
CREATE INDEX IF NOT EXISTS idx_ai_cache_policy_hash ON ai_cache(policy_hash);
CREATE INDEX IF NOT EXISTS idx_ai_cache_updated_at ON ai_cache(updated_at);

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_ai_cache_updated_at 
  BEFORE UPDATE ON ai_cache 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE ai_cache ENABLE ROW LEVEL SECURITY;

-- Create policy to allow service role to access all data
CREATE POLICY "Service role can access all cache data" ON ai_cache
  FOR ALL USING (auth.role() = 'service_role');

-- Create policy to allow authenticated users to read cache data
CREATE POLICY "Authenticated users can read cache data" ON ai_cache
  FOR SELECT USING (auth.role() = 'authenticated');

-- Create policy to allow authenticated users to insert/update cache data
CREATE POLICY "Authenticated users can modify cache data" ON ai_cache
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update cache data" ON ai_cache
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Grant necessary permissions
GRANT ALL ON ai_cache TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ai_cache TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE ai_cache IS 'Cache for AI-generated content to reduce API calls and improve performance';
COMMENT ON COLUMN ai_cache.district IS 'Congressional district identifier (e.g., CA-12)';
COMMENT ON COLUMN ai_cache.cache_type IS 'Type of cached content: constituents or policy_summary';
COMMENT ON COLUMN ai_cache.policy_hash IS 'Hash of policy content for policy_summary cache entries';
COMMENT ON COLUMN ai_cache.data IS 'The actual AI-generated content (JSON)';
COMMENT ON COLUMN ai_cache.census_data IS 'Census data used for constituent generation';
COMMENT ON COLUMN ai_cache.congressman_data IS 'Congressman data for policy summaries'; 
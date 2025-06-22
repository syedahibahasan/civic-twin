-- Migration script to add political policies to existing cached constituents
-- Run this script in your Supabase SQL Editor

-- First, let's see what we have
SELECT 
  COUNT(*) as total_cache_entries,
  COUNT(*) FILTER (WHERE cache_type = 'constituents') as constituent_entries,
  COUNT(*) FILTER (WHERE cache_type = 'constituents' AND data ? 'politicalPolicies') as entries_with_policies
FROM ai_cache;

-- Update existing constituent cache entries to add politicalPolicies if they don't exist
-- This will add placeholder policies to existing cached constituents
DO $$
DECLARE
  cache_record RECORD;
  updated_count INTEGER := 0;
BEGIN
  -- Loop through all constituent cache entries that don't have politicalPolicies
  FOR cache_record IN 
    SELECT id, data 
    FROM ai_cache 
    WHERE cache_type = 'constituents' 
      AND data ? 'id' 
      AND NOT (data ? 'politicalPolicies')
  LOOP
    -- Update each constituent in the array to include politicalPolicies
    UPDATE ai_cache 
    SET data = (
      SELECT jsonb_agg(
        CASE 
          WHEN constituent ? 'id' THEN 
            constituent || '{"politicalPolicies": ["Universal healthcare access", "Education funding", "Economic development"]}'::jsonb
          ELSE constituent
        END
      )
      FROM jsonb_array_elements(cache_record.data) AS constituent
    )
    WHERE id = cache_record.id;
    
    updated_count := updated_count + 1;
  END LOOP;
  
  RAISE NOTICE 'Updated % constituent cache entries to include politicalPolicies', updated_count;
END $$;

-- Verify the migration worked
SELECT 
  COUNT(*) as total_cache_entries,
  COUNT(*) FILTER (WHERE cache_type = 'constituents') as constituent_entries,
  COUNT(*) FILTER (WHERE cache_type = 'constituents' AND data ? 'politicalPolicies') as entries_with_policies
FROM ai_cache;

-- Show a sample of updated constituents
SELECT 
  district,
  jsonb_array_length(data) as constituent_count,
  data->0->>'politicalPolicies' as sample_policies
FROM ai_cache 
WHERE cache_type = 'constituents' 
  AND data ? 'politicalPolicies'
LIMIT 5; 
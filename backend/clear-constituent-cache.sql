-- Clear all cached constituents to start fresh with political policies
-- Run this script in your Supabase SQL Editor

-- First, let's see what we're about to delete
SELECT 
  COUNT(*) as total_cache_entries,
  COUNT(*) FILTER (WHERE cache_type = 'constituents') as constituent_entries_to_delete,
  COUNT(*) FILTER (WHERE cache_type = 'policy_summary') as policy_summary_entries_to_keep
FROM ai_cache;

-- Delete all cached constituents
DELETE FROM ai_cache 
WHERE cache_type = 'constituents';

-- Verify deletion
SELECT 
  COUNT(*) as remaining_cache_entries,
  COUNT(*) FILTER (WHERE cache_type = 'constituents') as remaining_constituent_entries,
  COUNT(*) FILTER (WHERE cache_type = 'policy_summary') as remaining_policy_summary_entries
FROM ai_cache; 
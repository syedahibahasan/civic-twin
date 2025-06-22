import express from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Cache AI-generated constituents for a district (per user)
router.post('/constituents', optionalAuth, async (req, res) => {
  try {
    const { district, constituents, censusData } = req.body;
    const userId = req.user?.id; // Will be null if not authenticated
    
    if (!district || !constituents) {
      return res.status(400).json({ error: 'District and constituents are required' });
    }

    // Check if we already have cached data for this district and user
    const { data: existingCache } = await supabaseAdmin
      .from('ai_cache')
      .select('*')
      .eq('district', district)
      .eq('cache_type', 'constituents')
      .eq('user_id', userId)
      .single();

    if (existingCache) {
      // Update existing cache
      const { data, error } = await supabaseAdmin
        .from('ai_cache')
        .update({
          data: constituents,
          census_data: censusData,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingCache.id)
        .select()
        .single();

      if (error) throw error;
      
      return res.json({
        message: 'Constituents cache updated',
        data: data.data,
        cached: true
      });
    }

    // Create new cache entry
    const { data, error } = await supabaseAdmin
      .from('ai_cache')
      .insert({
        user_id: userId,
        district,
        cache_type: 'constituents',
        data: constituents,
        census_data: censusData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    res.json({
      message: 'Constituents cached successfully',
      data: data.data,
      cached: true
    });

  } catch (error) {
    console.error('Error caching constituents:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get cached constituents for a district (per user)
router.get('/constituents/:district', optionalAuth, async (req, res) => {
  try {
    const { district } = req.params;
    const userId = req.user?.id; // Will be null if not authenticated
    
    const { data, error } = await supabaseAdmin
      .from('ai_cache')
      .select('*')
      .eq('district', district)
      .eq('cache_type', 'constituents')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return res.status(404).json({ 
        error: 'No cached constituents found for this district',
        cached: false
      });
    }

    // Check if cache is still valid (less than 24 hours old)
    const cacheAge = Date.now() - new Date(data.updated_at).getTime();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    if (cacheAge > maxAge) {
      return res.status(404).json({ 
        error: 'Cache expired',
        cached: false
      });
    }

    res.json({
      constituents: data.data,
      censusData: data.census_data,
      cached: true,
      cacheAge: Math.floor(cacheAge / (1000 * 60 * 60)) // hours
    });

  } catch (error) {
    console.error('Error retrieving cached constituents:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Cache policy summary (per user)
router.post('/policy-summary', optionalAuth, async (req, res) => {
  try {
    const { district, policyContent, summary, congressman } = req.body;
    const userId = req.user?.id; // Will be null if not authenticated
    
    if (!district || !policyContent || !summary) {
      return res.status(400).json({ error: 'District, policy content, and summary are required' });
    }

    // Create a hash of the policy content to use as cache key
    const policyHash = Buffer.from(policyContent).toString('base64').substring(0, 50);

    // Check if we already have cached data for this policy and user
    const { data: existingCache } = await supabaseAdmin
      .from('ai_cache')
      .select('*')
      .eq('district', district)
      .eq('cache_type', 'policy_summary')
      .eq('policy_hash', policyHash)
      .eq('user_id', userId)
      .single();

    if (existingCache) {
      // Update existing cache
      const { data, error } = await supabaseAdmin
        .from('ai_cache')
        .update({
          data: summary,
          congressman_data: congressman,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingCache.id)
        .select()
        .single();

      if (error) throw error;
      
      return res.json({
        message: 'Policy summary cache updated',
        data: data.data,
        cached: true
      });
    }

    // Create new cache entry
    const { data, error } = await supabaseAdmin
      .from('ai_cache')
      .insert({
        user_id: userId,
        district,
        cache_type: 'policy_summary',
        policy_hash: policyHash,
        data: summary,
        congressman_data: congressman,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    res.json({
      message: 'Policy summary cached successfully',
      data: data.data,
      cached: true
    });

  } catch (error) {
    console.error('Error caching policy summary:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get cached policy summary (per user)
router.get('/policy-summary/:district', optionalAuth, async (req, res) => {
  try {
    const { district } = req.params;
    const { policyContent } = req.query;
    const userId = req.user?.id; // Will be null if not authenticated
    
    if (!policyContent) {
      return res.status(400).json({ error: 'Policy content is required' });
    }

    const policyHash = Buffer.from(policyContent).toString('base64').substring(0, 50);
    
    const { data, error } = await supabaseAdmin
      .from('ai_cache')
      .select('*')
      .eq('district', district)
      .eq('cache_type', 'policy_summary')
      .eq('policy_hash', policyHash)
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return res.status(404).json({ 
        error: 'No cached policy summary found',
        cached: false
      });
    }

    // Check if cache is still valid (less than 24 hours old)
    const cacheAge = Date.now() - new Date(data.updated_at).getTime();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    if (cacheAge > maxAge) {
      return res.status(404).json({ 
        error: 'Cache expired',
        cached: false
      });
    }

    res.json({
      summary: data.data,
      congressman: data.congressman_data,
      cached: true,
      cacheAge: Math.floor(cacheAge / (1000 * 60 * 60)) // hours
    });

  } catch (error) {
    console.error('Error retrieving cached policy summary:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all cached data for a user
router.get('/user-cache', optionalAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { data, error } = await supabaseAdmin
      .from('ai_cache')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    res.json({
      cache: data || [],
      count: data?.length || 0
    });

  } catch (error) {
    console.error('Error retrieving user cache:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Clear all cached data for a user
router.delete('/user-cache', optionalAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { error } = await supabaseAdmin
      .from('ai_cache')
      .delete()
      .eq('user_id', userId);

    if (error) throw error;

    res.json({
      message: 'All cached data cleared successfully'
    });

  } catch (error) {
    console.error('Error clearing user cache:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Clear expired cache entries (can be called by a cron job)
router.delete('/expired', async (req, res) => {
  try {
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    const cutoffDate = new Date(Date.now() - maxAge).toISOString();

    const { data, error } = await supabaseAdmin
      .from('ai_cache')
      .delete()
      .lt('updated_at', cutoffDate)
      .select();

    if (error) throw error;

    res.json({
      message: 'Expired cache entries cleared',
      deletedCount: data.length
    });

  } catch (error) {
    console.error('Error clearing expired cache:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router; 
import express from 'express';
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { fileURLToPath } from 'url';

const router = express.Router();

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load and cache the CSV data
let zipDistrictData = [];
const csvPath = path.join(__dirname, '../../data/zccd.csv');

// Load CSV data on startup
function loadZipDistrictData() {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(csvPath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => {
        zipDistrictData = results;
        console.log(`Loaded ${results.length} ZIP code to district mappings`);
        resolve(results);
      })
      .on('error', reject);
  });
}

// Initialize data loading
loadZipDistrictData().catch(console.error);

// Get ZIP codes for a district
router.get('/zipcodes/:district', (req, res) => {
  try {
    const { district } = req.params;
    
    // Parse district string (e.g., "CA-12")
    const match = district.match(/^([A-Z]{2})-(\d{1,2})$/);
    if (!match) {
      return res.status(400).json({ 
        error: 'Invalid district format. Use format like "CA-12"' 
      });
    }
    
    const state = match[1];
    const cd = match[2].replace(/^0+/, ''); // Remove leading zeros
    
    // Filter ZIP codes for the district
    const zipCodes = zipDistrictData
      .filter(row => row.state_abbr === state && row.cd === cd)
      .map(row => row.zcta);
    
    if (zipCodes.length === 0) {
      return res.status(404).json({ 
        error: `No ZIP codes found for district ${district}` 
      });
    }
    
    res.json({
      district,
      zipCodes,
      count: zipCodes.length
    });
    
  } catch (error) {
    console.error('Error getting ZIP codes for district:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all districts for a state
router.get('/state/:state', (req, res) => {
  try {
    const { state } = req.params;
    const stateUpper = state.toUpperCase();
    
    // Get unique districts for the state
    const districts = [...new Set(
      zipDistrictData
        .filter(row => row.state_abbr === stateUpper)
        .map(row => `${stateUpper}-${row.cd}`)
    )].sort();
    
    res.json({
      state: stateUpper,
      districts,
      count: districts.length
    });
    
  } catch (error) {
    console.error('Error getting districts for state:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all available states
router.get('/states', (req, res) => {
  try {
    const states = [...new Set(
      zipDistrictData.map(row => row.state_abbr)
    )].sort();
    
    res.json({
      states,
      count: states.length
    });
    
  } catch (error) {
    console.error('Error getting states:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router; 
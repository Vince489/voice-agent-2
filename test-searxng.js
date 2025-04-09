/**
 * Test script for SearXNG integration
 * 
 * This script tests the SearXNG search functionality by making a direct call
 * to the performSearxNGSearch function.
 */

import { executeTool } from './services/tools.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Test query
const query = process.argv[2] || 'SpaceX latest news';

console.log(`Testing SearXNG search with query: "${query}"`);

// Execute the search
async function testSearch() {
  try {
    const result = await executeTool('searxng', { query });
    
    console.log('\nSearch Results:');
    console.log(JSON.stringify(result, null, 2));
    
    if (result.results && result.results.length > 0) {
      console.log('\nTop 3 Results:');
      result.results.slice(0, 3).forEach((item, index) => {
        console.log(`\n[${index + 1}] ${item.title}`);
        console.log(`URL: ${item.url}`);
        console.log(`Content: ${item.content.substring(0, 150)}...`);
        console.log(`Engine: ${item.engine}`);
      });
    } else if (result.error) {
      console.error(`\nError: ${result.error}`);
    } else {
      console.log('\nNo results found.');
    }
  } catch (error) {
    console.error('Error executing search:', error);
  }
}

// Run the test
testSearch();

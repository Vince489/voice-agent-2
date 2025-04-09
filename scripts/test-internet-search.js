/**
 * Test script for the internet search functionality
 * 
 * Run with: node scripts/test-internet-search.js "your search query"
 */

import { executeTool } from '../services/tools.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testInternetSearch() {
  try {
    // Get the search query from command line arguments
    const query = process.argv[2] || 'What is the current weather in New York?';
    
    console.log(`Testing internet search with query: "${query}"`);
    
    // Execute the internet search tool
    const result = await executeTool('internet_search', { query });
    
    // Display the results
    if (result.error) {
      console.error('Error:', result.error);
    } else if (result.results && result.results.length > 0) {
      console.log(`Found ${result.results.length} results for "${result.query}":`);
      
      result.results.forEach((item, index) => {
        console.log(`\nResult ${index + 1}:`);
        console.log(`Title: ${item.title}`);
        console.log(`Link: ${item.link}`);
        console.log(`Snippet: ${item.snippet}`);
      });
      
      if (result.searchInformation) {
        console.log(`\nSearch Information:`);
        console.log(`Total Results: ${result.searchInformation.totalResults}`);
        console.log(`Search Time: ${result.searchInformation.searchTime} seconds`);
      }
    } else {
      console.log(`No results found for "${result.query}"`);
    }
  } catch (error) {
    console.error('Unhandled error:', error);
  }
}

// Run the test
testInternetSearch();

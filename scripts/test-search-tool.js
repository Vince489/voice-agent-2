/**
 * Test script for the searxng_search tool
 * 
 * Run with: node scripts/test-search-tool.js "your search query"
 */

import { executeTool } from '../services/tools.js';

async function testSearchTool() {
  try {
    // Get the search query from command line arguments
    const query = process.argv[2] || 'What is the current weather in New York?';
    
    console.log(`Testing searxng_search tool with query: "${query}"`);
    
    // Execute the search tool
    const result = await executeTool('searxng_search', { query });
    
    console.log('Search tool result:');
    console.log(JSON.stringify(result, null, 2));
    
    // Print stats
    console.log('\nSearch Stats:');
    console.log(`- Query: ${result.query}`);
    console.log(`- Number of results: ${result.number_of_results}`);
    console.log(`- Error: ${result.error || 'None'}`);
    
    // Print results
    if (result.results && result.results.length > 0) {
      console.log('\nSearch Results:');
      result.results.forEach((result, index) => {
        console.log(`\n--- Result ${index + 1} ---`);
        console.log(`Title: ${result.title}`);
        console.log(`URL: ${result.url}`);
        console.log(`Content: ${result.content}`);
        console.log(`Engine: ${result.engine}`);
      });
    } else {
      console.log('\nNo search results found.');
    }
  } catch (error) {
    console.error('Error testing search tool:', error);
  }
}

testSearchTool();

/**
 * Test script for the enhanced search functionality
 * 
 * This script tests the enhanced search capability that fetches and processes
 * content from search results.
 */

import { performEnhancedSearch } from '../services/enhancedSearch.js';

// Test query
const query = process.argv[2] || 'latest news about artificial intelligence';

console.log(`Testing enhanced search with query: "${query}"`);
console.log('This will search for relevant URLs and fetch their content...\n');

// Perform the enhanced search
performEnhancedSearch(query)
  .then(result => {
    console.log('=== SEARCH RESULTS ===');
    console.log(`Query: ${result.query}`);
    console.log(`Number of results: ${result.number_of_results}`);
    
    if (result.results && result.results.length > 0) {
      console.log('\nURLs found:');
      result.results.forEach((item, index) => {
        console.log(`${index + 1}. ${item.url}`);
      });
      
      console.log('\n=== CONTENT EXTRACTS ===');
      if (result.content && result.content.length > 0) {
        // Display a preview of each content extract (first 300 characters)
        result.content.forEach((content, index) => {
          const preview = content.substring(0, 300) + '...';
          console.log(`\n--- Extract ${index + 1} ---`);
          console.log(preview);
        });
        
        console.log('\nFull content is available in the result object.');
      } else {
        console.log('No content was extracted from the URLs.');
      }
    } else {
      console.log('No results found.');
    }
    
    if (result.error) {
      console.log(`\nError: ${result.error}`);
    }
  })
  .catch(error => {
    console.error('Error testing enhanced search:', error);
  });

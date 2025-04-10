/**
 * Test script for the SearXNG search parser functionality
 * 
 * Run with: node scripts/test-search-parser.js "your search query"
 */

import { extractSearchResults } from '../services/htmlParser.js';

async function testSearchParser() {
  try {
    // Get the search query from command line arguments
    const query = process.argv[2] || 'What is Cheerio in JavaScript?';
    
    console.log(`Testing search parser with query: "${query}"`);
    
    // Fetch search results from local SearXNG instance
    const searchUrl = `http://localhost:8080/search?q=${encodeURIComponent(query)}`;
    console.log(`Fetching from: ${searchUrl}`);
    
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`SearXNG returned status: ${response.status}`);
    }
    
    const html = await response.text();
    console.log(`Received HTML response of length: ${html.length} bytes`);
    
    // Extract search results using our new parser
    const results = extractSearchResults(html);
    
    console.log(`Found ${results.length} search results:`);
    console.log(JSON.stringify(results, null, 2));
    
    // Just print URLs for a cleaner view
    console.log('\nExtracted URLs:');
    results.forEach((result, index) => {
      console.log(`${index + 1}. ${result.url}`);
    });
  } catch (error) {
    console.error('Error testing search parser:', error);
  }
}

testSearchParser();

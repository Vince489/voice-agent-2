/**
 * Test script for the HTML parser functionality
 * 
 * Run with: node scripts/test-html-parser.js
 */

import { htmlToText, extractMainContent, extractSearchResults } from '../services/htmlParser.js';

// Sample HTML for testing
const sampleHTML = `
<!DOCTYPE html>
<html>
<head>
  <title>Test Page</title>
  <script>console.log("This should be removed");</script>
  <style>body { color: red; }</style>
</head>
<body>
  <header>
    <nav>
      <a href="/">Home</a>
      <a href="/about">About</a>
    </nav>
  </header>
  
  <main>
    <h1>Main Content Heading</h1>
    <p>This is the main content paragraph with <a href="https://example.com">a link</a> and some text.</p>
    <p>Another paragraph with <strong>bold text</strong> and <em>italic text</em>.</p>
    <div class="content">
      <p>This is inside a content div.</p>
    </div>
  </main>
  
  <aside>
    <h2>Sidebar</h2>
    <p>This is sidebar content that should be removed.</p>
  </aside>
  
  <footer>
    <p>Copyright 2023</p>
  </footer>
</body>
</html>
`;

// Sample SearXNG HTML for testing
const sampleSearchHTML = `
<!DOCTYPE html>
<html>
<head>
  <title>SearXNG Results</title>
</head>
<body>
  <div id="results">
    <article class="result result-default">
      <h3><a href="https://example.com/page1" class="url_header">Example Page 1</a></h3>
      <p class="content">This is the content snippet for example page 1.</p>
      <span class="engine">google</span>
    </article>
    
    <article class="result result-default">
      <h3><a href="https://example.com/page2" class="url_header">Example Page 2</a></h3>
      <p class="content">This is the content snippet for example page 2.</p>
      <span class="engine">bing</span>
    </article>
  </div>
</body>
</html>
`;

// Test htmlToText function
console.log('=== Testing htmlToText ===');
const plainText = htmlToText(sampleHTML);
console.log(plainText);
console.log('\n');

// Test extractMainContent function
console.log('=== Testing extractMainContent ===');
const mainContent = extractMainContent(sampleHTML);
console.log(mainContent);
console.log('\n');

// Test extractSearchResults function
console.log('=== Testing extractSearchResults ===');
const searchResults = extractSearchResults(sampleSearchHTML);
console.log(JSON.stringify(searchResults, null, 2));

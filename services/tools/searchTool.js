/**
 * Search Tool for Virtra
 *
 * Provides internet search capability using the local SearXNG instance
 * and enhanced search functionality.
 */

import { performEnhancedSearch } from '../enhancedSearch.js';
import { parse } from 'node-html-parser';

/**
 * Perform a direct HTML scraping search using the local SearXNG instance
 * This is an alternative approach that might work when the JSON API returns 403
 * @param {string} query - The search query
 * @returns {Promise<object>} - Search results with content
 */
async function performDirectHtmlSearch(query) {
  try {
    console.log(`Performing direct HTML search for: ${query}`);
    const searxngUrl = `http://localhost:8080/search?q=${encodeURIComponent(query)}`;

    const response = await fetch(searxngUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      console.error(`SearXNG HTML request failed with status ${response.status}`);
      return null; // Return null to indicate failure and try the next method
    }

    const html = await response.text();
    const root = parse(html);
    const results = [];

    // Try different selectors based on SearXNG themes
    const resultSelectors = [
      '.result', // Common selector
      '.result-default',
      '.result-item',
      '.searchresult'
    ];

    let resultElements = [];
    for (const selector of resultSelectors) {
      const elements = root.querySelectorAll(selector);
      if (elements && elements.length > 0) {
        resultElements = elements;
        console.log(`Found ${elements.length} results using selector: ${selector}`);
        break;
      }
    }

    if (resultElements.length === 0) {
      console.log('No results found in HTML response');
      return { query, number_of_results: 0, content: [], error: null };
    }

    for (const resultElement of resultElements) {
      // Try different title selectors
      const titleSelectors = ['.title a', 'h3 a', '.result-title a', 'a.title'];
      let titleElement = null;
      let urlElement = null;

      for (const selector of titleSelectors) {
        titleElement = resultElement.querySelector(selector);
        if (titleElement) {
          urlElement = titleElement.getAttribute('href');
          break;
        }
      }

      // Try different content selectors
      const contentSelectors = ['.content', '.description', '.result-content', '.snippet', '.result-snippet'];
      let contentElement = null;

      for (const selector of contentSelectors) {
        contentElement = resultElement.querySelector(selector);
        if (contentElement) break;
      }

      if (titleElement && urlElement) {
        results.push({
          title: titleElement.textContent.trim(),
          url: urlElement,
          content: contentElement ? contentElement.textContent.trim() : '',
          engine: 'SearXNG'
        });
      }
    }

    // Limit to top 5 results
    const limitedResults = results.slice(0, 5);

    // Fetch content from top results
    const content = [];
    for (let i = 0; i < Math.min(3, limitedResults.length); i++) {
      try {
        const pageResponse = await fetch(limitedResults[i].url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });

        if (pageResponse.ok) {
          const pageHtml = await pageResponse.text();
          const pageRoot = parse(pageHtml);

          // Try to extract main content
          let mainContent = '';
          const mainContentSelectors = [
            'main', 'article', '.content', '#content', '.main-content',
            '[role="main"]', '.article-content', '.post-content'
          ];

          for (const selector of mainContentSelectors) {
            const element = pageRoot.querySelector(selector);
            if (element) {
              mainContent = element.textContent;
              break;
            }
          }

          // If no main content found, use the whole body with some cleaning
          if (!mainContent) {
            // Remove scripts, styles, and navigation elements
            const scripts = pageRoot.querySelectorAll('script');
            scripts.forEach(script => script.remove());

            const styles = pageRoot.querySelectorAll('style');
            styles.forEach(style => style.remove());

            const navs = pageRoot.querySelectorAll('nav, header, footer');
            navs.forEach(nav => nav.remove());

            mainContent = pageRoot.querySelector('body').textContent;
          }

          // Clean up the content
          mainContent = mainContent
            .replace(/\s+/g, ' ')
            .trim()
            .substring(0, 1000); // Limit to 1000 chars

          content.push(`Source: ${limitedResults[i].url}\n${mainContent}...`);
        }
      } catch (error) {
        console.warn(`Failed to fetch content from ${limitedResults[i].url}: ${error}`);
      }
    }

    return {
      query,
      results: limitedResults,
      number_of_results: limitedResults.length,
      content: content,
      error: null
    };

  } catch (error) {
    console.error('Error during direct HTML search:', error);
    return null; // Return null to indicate failure and try the next method
  }
}

/**
 * Execute an internet search using the local SearXNG instance
 * @param {string} query - The search query
 * @returns {Promise<object>} - Search results with content
 */
export async function executeSearch(query) {
  try {
    console.log(`Executing search for: ${query}`);

    // First try the direct HTML scraping approach
    const directResults = await performDirectHtmlSearch(query);
    if (directResults) {
      console.log('Direct HTML search successful');
      return directResults;
    }

    // If direct HTML approach fails, fall back to the enhanced search
    console.log('Direct HTML search failed, falling back to enhanced search');
    const searchResults = await performEnhancedSearch(query);

    // Format the results for the AI
    return {
      query: searchResults.query,
      number_of_results: searchResults.number_of_results || 0,
      content: searchResults.content || [],
      error: searchResults.error || null
    };
  } catch (error) {
    console.error('Error executing search:', error);
    return {
      query,
      number_of_results: 0,
      content: [],
      error: `Failed to execute search: ${error.message}`
    };
  }
}

/**
 * Search tool definition for Virtra
 */
export const searchTool = {
  name: "internet_search",
  description: "Search the internet for current information. Use this when you need to find up-to-date information about events, people, places, or concepts.",
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "The search query to execute"
      }
    },
    required: ["query"]
  },
  execute: executeSearch
};

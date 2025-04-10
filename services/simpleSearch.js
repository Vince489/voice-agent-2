/**
 * Simple Search Module
 *
 * Provides a reliable search implementation using local SearXNG Docker instance
 * with fallback to DuckDuckGo
 */

/**
 * Extract search results from HTML content
 * @param {string} html - The HTML content
 * @param {string} query - The search query
 * @returns {Array} - Array of search results
 */
function extractResultsFromHTML(html, query) {
  try {
    const results = [];

    // Extract result blocks using regex based on the SearXNG HTML structure
    const resultRegex = /<article[^>]*class="result[^>]*>([\s\S]*?)<\/article>/gi;
    const matches = Array.from(html.matchAll(resultRegex));

    console.log(`Found ${matches.length} result blocks in HTML`);

    if (matches.length === 0) {
      // Try alternative pattern if no matches found
      const altResultRegex = /<div[^>]*class="result[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi;
      const altMatches = Array.from(html.matchAll(altResultRegex));
      console.log(`Found ${altMatches.length} result blocks using alternative pattern`);

      if (altMatches.length > 0) {
        for (const match of altMatches) {
          processResultBlock(match[0]);
        }
      } else {
        // If still no matches, try to extract any URLs
        const urlRegex = /<a[^>]*href="(https?:\/\/[^"]+)"[^>]*>/gi;
        const urlMatches = Array.from(html.matchAll(urlRegex));
        console.log(`Found ${urlMatches.length} URLs in HTML`);

        // Create basic results from URLs
        for (const urlMatch of urlMatches.slice(0, 10)) {
          const url = urlMatch[1];
          if (url.includes('web.archive.org') || url.includes('localhost')) continue;

          results.push({
            title: `Result for ${query}`,
            url: url,
            content: `Search result for ${query}`,
            engine: 'searxng',
            score: 0.5
          });
        }
      }
    } else {
      // Process each result block
      for (const match of matches) {
        processResultBlock(match[0]);
      }
    }

    // Helper function to process a result block
    function processResultBlock(resultBlock) {
      // Extract URL from url_header
      const urlHeaderMatch = resultBlock.match(/<a[^>]*href="([^"]+)"[^>]*class="url_header"[^>]*>/i);

      // If no url_header, try to find any link
      const urlMatch = urlHeaderMatch || resultBlock.match(/<a[^>]*href="([^"]+)"[^>]*>/i);
      if (!urlMatch) return;

      const url = urlMatch[1];
      if (!url.startsWith('http')) return;

      // Extract title
      const titleMatch = resultBlock.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i);
      const title = titleMatch ?
        titleMatch[1].replace(/<[^>]*>/g, '').trim() :
        `Result for ${query}`;

      // Extract content/snippet
      const contentMatch = resultBlock.match(/<p[^>]*class="content[^>]*>([\s\S]*?)<\/p>/i) ||
                          resultBlock.match(/<p[^>]*class="result-content[^>]*>([\s\S]*?)<\/p>/i) ||
                          resultBlock.match(/<p[^>]*>([\s\S]*?)<\/p>/i);

      const content = contentMatch ?
        contentMatch[1].replace(/<[^>]*>/g, '').trim() :
        `Search result for ${query}`;

      // Extract engine if available
      const engineMatch = resultBlock.match(/class="engine">([^<]+)<\/span>/i) ||
                         resultBlock.match(/<span[^>]*>([^<]+)<\/span>/i);
      const engine = engineMatch ? engineMatch[1].trim() : 'searxng';

      results.push({
        title,
        url,
        content,
        engine,
        score: 1.0 // Default score
      });
    }

    // Limit to 10 results to avoid processing too much
    return results.slice(0, 10);
  } catch (error) {
    console.error('Error extracting results from HTML:', error);
    return [];
  }
}

/**
 * Perform a search using DuckDuckGo
 * @param {string} query - The search query
 * @returns {Promise<object>} - The search results
 */
export async function performSearch(query) {
  if (!query) {
    return { error: "Search query cannot be empty." };
  }

  // First try the local Docker SearXNG instance
  try {
    // Use HTML format instead of JSON since that's what the instance returns
    const localSearchUrl = `http://localhost:8080/search?q=${encodeURIComponent(query)}`;
    console.log(`Performing search for: ${query} using local SearXNG instance`);

    const localResponse = await fetch(localSearchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 5000 // 5 second timeout
    });

    if (localResponse.ok) {
      const contentType = localResponse.headers.get('content-type');

      // For HTML response (which is what we expect)
      if (contentType && contentType.includes('text/html')) {
        console.log('Got HTML response from local SearXNG instance, parsing it');

        const html = await localResponse.text();
        const results = extractResultsFromHTML(html, query);

        if (results && results.length > 0) {
          // Limit to top 5 results
          const limitedResults = results.slice(0, 5);

          console.log(`Successfully extracted ${limitedResults.length} results from local SearXNG instance (HTML)`);

          return {
            results: limitedResults,
            query,
            number_of_results: limitedResults.length,
            answers: []
          };
        } else {
          console.log('No results extracted from HTML response');
        }
      }
      // If we somehow got JSON response
      else if (contentType && contentType.includes('application/json')) {
        console.log('Got JSON response from local SearXNG instance');

        const html = await localResponse.text();
        const results = extractResultsFromHTML(html, query);

        if (results && results.length > 0) {
          // Limit to top 5 results
          const limitedResults = results.slice(0, 5);

          console.log(`Successfully extracted ${limitedResults.length} results from local SearXNG instance (HTML)`);

          return {
            results: limitedResults,
            query,
            number_of_results: limitedResults.length,
            answers: []
          };
        }
      }
    }

    console.log(`Local SearXNG instance failed, falling back to DuckDuckGo`);
  } catch (localError) {
    console.error('Error with local SearXNG instance:', localError);
    console.log('Falling back to DuckDuckGo...');
  }

  // If local instance fails, fall back to DuckDuckGo
  try {
    // Use DuckDuckGo as a reliable search engine
    const searchUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json`;
    console.log(`Performing search for: ${query} using DuckDuckGo`);

    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 10000 // 10 second timeout for reliability
    });

    if (!response.ok) {
      throw new Error(`DuckDuckGo API returned status: ${response.status}`);
    }

    const data = await response.json();
    const results = [];

    // Extract abstract if available
    if (data.AbstractURL && data.AbstractText) {
      results.push({
        title: data.Heading || 'DuckDuckGo Result',
        url: data.AbstractURL,
        content: data.AbstractText,
        engine: 'duckduckgo',
        score: 1.0
      });
    }

    // Extract related topics
    if (data.RelatedTopics && data.RelatedTopics.length > 0) {
      data.RelatedTopics.slice(0, 4).forEach(topic => {
        if (topic.Text && topic.FirstURL) {
          results.push({
            title: topic.Text.split(' - ')[0] || 'Related Topic',
            url: topic.FirstURL,
            content: topic.Text,
            engine: 'duckduckgo',
            score: 0.8
          });
        }
      });
    }

    // If no results found, create a mock result
    if (results.length === 0) {
      results.push({
        title: `Search results for ${query}`,
        url: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
        content: `No specific information found for "${query}". Please try a different search term or check DuckDuckGo directly.`,
        engine: 'duckduckgo',
        score: 0.5
      });
    }

    // Limit to top 5 results
    const limitedResults = results.slice(0, 5);

    return {
      results: limitedResults,
      query,
      number_of_results: limitedResults.length,
      answers: []
    };
  } catch (error) {
    console.error('Error performing search:', error);

    // Return a helpful error message with mock results
    return {
      error: `Failed to perform search: ${error.message}`,
      query,
      results: [{
        title: `Search for ${query}`,
        url: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
        content: `I couldn't retrieve search results at this time. You can try searching for "${query}" directly on DuckDuckGo.`,
        engine: 'fallback',
        score: 0.1
      }],
      number_of_results: 1
    };
  }
}

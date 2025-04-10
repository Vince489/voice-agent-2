/**
 * Enhanced Search Service
 *
 * Provides advanced search capabilities by not only returning search results
 * but also fetching and processing the content from top results.
 */

import { extractMainContent, extractSearchResults } from './htmlParser.js';

// Legacy htmlToText function kept for reference but not used
// Keeping this code commented out for historical reference
/*
function legacyHtmlToText(html) {
  try {
    // Check if HTML is valid
    if (!html || typeof html !== 'string') {
      return '';
    }

    // Remove comments first
    let text = html.replace(/<!--[\s\S]*?-->/g, '');

    // Remove scripts and stylesheets
    text = text
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '');

    // Try to extract main content areas first
    const mainContentRegexes = [
      /<main\b[^>]*>([\s\S]*?)<\/main>/gi,
      /<article\b[^>]*>([\s\S]*?)<\/article>/gi,
      /<div\b[^>]*content[^>]*>([\s\S]*?)<\/div>/gi,
      /<div\b[^>]*main[^>]*>([\s\S]*?)<\/div>/gi
    ];

    let mainContent = '';
    for (const regex of mainContentRegexes) {
      const matches = [...text.matchAll(regex)];
      if (matches.length > 0) {
        // Use the longest match as it's likely the main content
        const longestMatch = matches.reduce((longest, match) =>
          (match[1].length > longest.length) ? match[1] : longest, '');

        if (longestMatch.length > 200) { // Only use if it's substantial
          mainContent = longestMatch;
          break;
        }
      }
    }

    // If we found main content, use that, otherwise use the whole document
    const contentToProcess = mainContent || text;

    // Remove remaining HTML tags and decode entities
    let cleanText = contentToProcess
      .replace(/<head\b[^<]*(?:(?!<\/head>)<[^<]*)*<\/head>/gi, '')
      .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, '')
      .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, '')
      .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, '')
      .replace(/<aside\b[^<]*(?:(?!<\/aside>)<[^<]*)*<\/aside>/gi, '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&[a-zA-Z0-9]+;/g, ' '); // Replace other entities

    // Clean up whitespace
    cleanText = cleanText
      .replace(/\s{2,}/g, ' ')
      .trim();

    // Limit the length to avoid excessive content
    const maxLength = 2000;
    if (cleanText.length > maxLength) {
      cleanText = cleanText.substring(0, maxLength) + '...';
    }

    return cleanText;
  } catch (error) {
    console.error('Error converting HTML to text:', error);
    // Fallback to a simple HTML tag removal
    try {
      return html.replace(/<[^>]*>/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim()
        .substring(0, 1000) + '...';
    } catch (e) {
      return 'Error extracting text from HTML';
    }
  }
}*/

/**
 * Get URLs from search results using multiple search engines
 * @param {string} query - The search query
 * @returns {Promise<string[]>} - Array of URLs from search results
 */
async function getNewsUrls(query) {
  // List of search engines to try in order
  const searchEngines = [
    // Local SearXNG instance (primary)
    {
      name: 'SearXNG (Local Docker)',
      url: `http://localhost:8080/search?q=${encodeURIComponent(query)}`,
      parser: async (response) => {
        // Parse HTML response instead of JSON
        const html = await response.text();

        // Use Cheerio-based parser to extract search results
        const results = extractSearchResults(html);

        // Return just the URLs
        return results.map(result => result.url);
      }
    },
    // Fallback to public instances
    {
      name: 'SearXNG (rhscz.eu)',
      url: `https://search.rhscz.eu/search?q=${encodeURIComponent(query)}`,
      parser: async (response) => {
        // Parse HTML response instead of JSON
        const html = await response.text();

        // Use Cheerio-based parser to extract search results
        const results = extractSearchResults(html);

        // Return just the URLs
        return results.map(result => result.url);
      }
    },
    {
      name: 'SearXNG (mdosch.de)',
      url: `https://search.mdosch.de/search?q=${encodeURIComponent(query)}`,
      parser: async (response) => {
        // Parse HTML response instead of JSON
        const html = await response.text();

        // Use Cheerio-based parser to extract search results
        const results = extractSearchResults(html);

        // Return just the URLs
        return results.map(result => result.url);
      }
    },
    {
      name: 'SearXNG (search.disroot.org)',
      url: `https://search.disroot.org/search?q=${encodeURIComponent(query)}`,
      parser: async (response) => {
        // Parse HTML response instead of JSON
        const html = await response.text();

        // Use Cheerio-based parser to extract search results
        const results = extractSearchResults(html);

        // Return just the URLs
        return results.map(result => result.url);
      }
    },
    {
      name: 'SearXNG (search.tiekoetter.com)',
      url: `https://search.tiekoetter.com/search?q=${encodeURIComponent(query)}&format=json`,
      parser: async (response) => {
        const data = await response.json();
        return data.results ? data.results.map(result => result.url) : [];
      }
    },
    {
      name: 'DuckDuckGo API',
      url: `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json`,
      parser: async (response) => {
        const data = await response.json();
        // Extract URLs from DuckDuckGo results
        const urls = [];
        if (data.AbstractURL) urls.push(data.AbstractURL);
        if (data.Results) {
          data.Results.forEach(result => {
            if (result.FirstURL) urls.push(result.FirstURL);
          });
        }
        return urls;
      }
    }
  ];

  // Try each search engine in sequence until we get results
  for (const engine of searchEngines) {
    try {
      console.log(`Searching using: ${engine.name}`);
      const controller = new AbortController();
      const signal = controller.signal;
      // Use a longer timeout for local instance, shorter for remote
      const timeout = engine.name.includes('Local') ? 15000 : 8000;
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const searchResults = await fetch(engine.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        signal
      });

      clearTimeout(timeoutId);

      if (!searchResults.ok) {
        console.log(`${engine.name} returned status: ${searchResults.status}`);

        // If it's the local instance and we get a 403, log a more helpful message
        if (engine.name.includes('Local') && searchResults.status === 403) {
          console.log('Local SearXNG instance returned 403 Forbidden. This could be due to:');
          console.log('1. Rate limiting by search engines');
          console.log('2. IP blocking from Docker container');
          console.log('3. Configuration issues with SearXNG');
          console.log('Falling back to other search engines...');
        }

        continue; // Try the next engine
      }

      const urls = await engine.parser(searchResults);

      if (urls && urls.length > 0) {
        // Take the first 5 URLs
        const limitedUrls = urls.slice(0, 5);
        console.log(`Found ${limitedUrls.length} URLs from ${engine.name}`);
        return limitedUrls;
      }

      console.log(`No results from ${engine.name}`);
    } catch (error) {
      console.error(`Error with ${engine.name}:`, error);
      // Continue to the next engine
    }
  }

  // If all search engines fail, use fallback URLs
  console.log('All search engines failed, using fallback URLs');
  return await getFallbackUrls(query);
}

/**
 * Get fallback URLs when search engines are not available
 * @param {string} query - The search query
 * @returns {Promise<string[]>} - Array of fallback URLs
 */
async function getFallbackUrls(query) {
  console.log('Using fallback URLs for query:', query);

  // Try to get URLs based on the query topic
  try {
    // Encode the query for use in a URL
    const encodedQuery = encodeURIComponent(query);
    const lowerQuery = query.toLowerCase();

    // Check for specific topics and provide targeted URLs

    // Virtron Boxing Club
    if (lowerQuery.includes('virtron') && (lowerQuery.includes('boxing') || lowerQuery.includes('box'))) {
      return [
        'https://virtronboxing.club/about',
        'https://www.youtube.com/@virtronboxingclub',
        'https://twitter.com/search?q=virtron%20boxing%20club',
        'https://www.facebook.com/search/top?q=virtron%20boxing%20club',
        'https://www.instagram.com/explore/tags/virtronboxingclub/'
      ];
    }
    // SpaceX
    else if (lowerQuery.includes('spacex') || lowerQuery.includes('space x')) {
      return [
        'https://www.spacex.com/updates/',
        'https://en.wikipedia.org/wiki/SpaceX',
        'https://www.nasa.gov/spacex',
        'https://www.space.com/spacex',
        'https://twitter.com/SpaceX'
      ];
    }
    // AI/Machine Learning
    else if (lowerQuery.includes('ai') ||
             lowerQuery.includes('artificial intelligence') ||
             lowerQuery.includes('machine learning')) {
      return [
        'https://en.wikipedia.org/wiki/Artificial_intelligence',
        'https://www.technologyreview.com/topic/artificial-intelligence/',
        'https://www.nature.com/articles/d41586-023-00107-z',
        'https://www.wired.com/tag/artificial-intelligence/',
        'https://www.sciencedaily.com/news/computers_math/artificial_intelligence/'
      ];
    }
    // Music/Artists/Celebrities
    else if (lowerQuery.includes('music') ||
             lowerQuery.includes('artist') ||
             lowerQuery.includes('rapper') ||
             lowerQuery.includes('singer') ||
             lowerQuery.includes('celebrity') ||
             lowerQuery.includes('dolph')) {
      // Extract potential artist/celebrity name
      const words = query.split(' ');
      const potentialName = words.length >= 2 ? `${words[0]} ${words[1]}` : words[0];
      const encodedName = encodeURIComponent(potentialName);

      return [
        `https://en.wikipedia.org/wiki/Special:Search?search=${encodedName}`,
        `https://www.billboard.com/search/${encodedName}/`,
        `https://pitchfork.com/search/?query=${encodedName}`,
        `https://www.rollingstone.com/search/?s=${encodedName}`,
        `https://www.allmusic.com/search/all/${encodedName}`
      ];
    }
    // News/Current Events
    else if (lowerQuery.includes('news') ||
             lowerQuery.includes('current events') ||
             lowerQuery.includes('latest') ||
             lowerQuery.includes('today')) {
      return [
        'https://www.reuters.com/',
        'https://www.bbc.com/news',
        'https://www.aljazeera.com/',
        'https://apnews.com/',
        'https://www.npr.org/sections/news/'
      ];
    }
    // For other topics, use a mix of general search and information sites
    else {
      return [
        `https://en.wikipedia.org/wiki/Special:Search?search=${encodedQuery}`,
        `https://www.reuters.com/search/news?blob=${encodedQuery}`,
        `https://www.bbc.com/search?q=${encodedQuery}`,
        `https://www.aljazeera.com/search/${encodedQuery}`,
        `https://apnews.com/search?q=${encodedQuery}`
      ];
    }
  } catch (error) {
    console.error('Error getting fallback URLs:', error);

    // Default fallback URLs if everything else fails
    return [
      'https://en.wikipedia.org/wiki/Main_Page',
      'https://www.reuters.com/',
      'https://www.bbc.com/news',
      'https://www.aljazeera.com/',
      'https://apnews.com/'
    ];
  }
}

/**
 * Fetch and clean text from a single URL
 * @param {string} url - URL to fetch content from
 * @returns {Promise<string|null>} - Cleaned text with source information or null if failed
 */
async function fetchAndCleanText(url) {
  try {
    console.log(`Fetching ${url}`);

    // Set a timeout for the fetch operation
    const controller = new AbortController();
    const signal = controller.signal;
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    const getUrl = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      signal
    });

    clearTimeout(timeoutId);

    if (!getUrl.ok) {
      throw new Error(`Failed to fetch ${url}: ${getUrl.status}`);
    }

    const html = await getUrl.text();

    // Extract title if possible
    let title = '';
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch && titleMatch[1]) {
      title = titleMatch[1].trim();
    }

    // Use the new extractMainContent function for better content extraction
    const text = extractMainContent(html);

    // Only return if we have meaningful content (more than just a few words)
    if (!text || text.trim().split(/\s+/).length < 5) {
      console.log(`Not enough meaningful content from ${url}`);
      return null;
    }

    // Add the source URL, title, and the cleaned text to the results
    return `Source: ${url}\n${title ? 'Title: ' + title + '\n' : ''}${text}\n\n`;
  } catch (error) {
    console.error(`Error processing ${url}:`, error);
    return null; // Return null for failed fetches
  }
}

/**
 * Fetch and clean text from a list of URLs
 * @param {string|string[]} urls - URL or array of URLs to fetch content from
 * @returns {Promise<string[]>} - Array of cleaned texts with source information
 */
async function getCleanedText(urls) {
  // If a single URL is passed, convert it to an array
  if (typeof urls === 'string') {
    urls = [urls];
  }

  // Use Promise.allSettled to handle all promises regardless of success/failure
  const results = await Promise.allSettled(
    urls.map(url => fetchAndCleanText(url))
  );

  // Filter out failed fetches and extract values from fulfilled promises
  const texts = results
    .filter(result => result.status === 'fulfilled' && result.value)
    .map(result => result.value);

  return texts;
}

// Simple in-memory cache for search results
const cache = {
  searches: new Map(), // Map of query -> {timestamp, results}
  content: new Map(),  // Map of url -> {timestamp, content}
  // Cache expiration time (30 minutes)
  EXPIRATION_MS: 30 * 60 * 1000,

  // Get cached search results if available and not expired
  getSearch(query) {
    const normalizedQuery = query.toLowerCase().trim();
    const cached = this.searches.get(normalizedQuery);

    if (cached && (Date.now() - cached.timestamp < this.EXPIRATION_MS)) {
      console.log(`Using cached search results for: ${normalizedQuery}`);
      return cached.results;
    }

    return null;
  },

  // Save search results to cache
  saveSearch(query, results) {
    const normalizedQuery = query.toLowerCase().trim();
    this.searches.set(normalizedQuery, {
      timestamp: Date.now(),
      results
    });
  },

  // Get cached content if available and not expired
  getContent(url) {
    const cached = this.content.get(url);

    if (cached && (Date.now() - cached.timestamp < this.EXPIRATION_MS)) {
      console.log(`Using cached content for: ${url}`);
      return cached.content;
    }

    return null;
  },

  // Save content to cache
  saveContent(url, content) {
    this.content.set(url, {
      timestamp: Date.now(),
      content
    });
  }
};

/**
 * Perform an enhanced search that returns both search results and content from top results
 * @param {string} query - The search query
 * @returns {Promise<object>} - Object containing search results and content
 */
async function performEnhancedSearch(query) {
  try {
    // Check cache first
    const cachedResults = cache.getSearch(query);
    if (cachedResults) {
      return cachedResults;
    }

    // Get URLs from search results
    const urls = await getNewsUrls(query);

    if (urls.length === 0) {
      const emptyResult = {
        query,
        results: [],
        content: [],
        error: 'No search results found'
      };
      return emptyResult;
    }

    // Check if we have any cached content for these URLs
    const urlsToFetch = [];
    const cachedContent = [];

    for (const url of urls) {
      const cached = cache.getContent(url);
      if (cached) {
        cachedContent.push(cached);
      } else {
        urlsToFetch.push(url);
      }
    }

    // Fetch only the content we don't have cached
    let newContent = [];
    if (urlsToFetch.length > 0) {
      newContent = await getCleanedText(urlsToFetch);

      // Cache the new content
      for (let i = 0; i < urlsToFetch.length && i < newContent.length; i++) {
        if (newContent[i] && newContent[i].trim().length > 0) {
          cache.saveContent(urlsToFetch[i], newContent[i]);
        }
      }
    }

    // Combine cached and new content
    const allContent = [...cachedContent, ...newContent];

    const results = {
      query,
      results: urls.map(url => ({ url })),
      content: allContent,
      number_of_results: urls.length
    };

    // Cache the search results
    cache.saveSearch(query, results);

    return results;
  } catch (error) {
    console.error('Error performing enhanced search:', error);
    return {
      query,
      results: [],
      content: [],
      error: `Failed to perform search: ${error.message}`
    };
  }
}

export { performEnhancedSearch, getNewsUrls, getCleanedText };

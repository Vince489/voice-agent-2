/**
 * HTML Parser Module
 *
 * Provides utilities for parsing HTML content using Cheerio
 */

import * as cheerio from 'cheerio';

/**
 * Convert HTML to plain text using Cheerio
 * @param {string} html - The HTML content to convert
 * @returns {string} - The extracted plain text
 */
function htmlToText(html) {
  try {
    // Check if HTML is valid
    if (!html || typeof html !== 'string') {
      return '';
    }

    // Load HTML into Cheerio
    const $ = cheerio.load(html);

    // Remove unwanted elements
    $("script, source, style, head, img, svg, a, form, link, iframe").remove();

    // Remove all classes
    $("*").removeClass();

    // Remove data attributes
    $("*").each((_, el) => {
      Object.keys(el.attribs || {}).forEach(attr => {
        if (attr.startsWith("data-")) {
          $(el).removeAttr(attr);
        }
      });
    });

    // Get text from body
    const text = $("body").text().replace(/\s+/g, " ").trim();

    // Limit the length to avoid excessive content
    const maxLength = 2000;
    if (text.length > maxLength) {
      return text.substring(0, maxLength) + '...';
    }

    return text;
  } catch (error) {
    console.error('Error converting HTML to text with Cheerio:', error);

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
}

/**
 * Extract main content from HTML using Cheerio
 * @param {string} html - The HTML content
 * @returns {string} - The extracted main content text
 */
function extractMainContent(html) {
  try {
    if (!html || typeof html !== 'string') {
      return '';
    }

    const $ = cheerio.load(html);

    // Try to find main content containers in order of priority
    const contentSelectors = [
      'main',
      'article',
      'div.content',
      'div.main-content',
      'div.post-content',
      'div.entry-content',
      '#content',
      '#main'
    ];

    let mainContent = '';

    // Try each selector until we find content
    for (const selector of contentSelectors) {
      const element = $(selector).first();
      if (element.length > 0) {
        // Remove unwanted elements from the content
        element.find('script, style, nav, header, footer, aside').remove();

        const text = element.text().replace(/\s+/g, ' ').trim();
        if (text.length > 200) { // Only use if it's substantial
          mainContent = text;
          break;
        }
      }
    }

    // If no main content found, use the body text
    if (!mainContent) {
      // Remove unwanted elements
      $('script, style, nav, header, footer, aside').remove();
      mainContent = $('body').text().replace(/\s+/g, ' ').trim();
    }

    // Limit the length
    const maxLength = 2000;
    if (mainContent.length > maxLength) {
      mainContent = mainContent.substring(0, maxLength) + '...';
    }

    return mainContent;
  } catch (error) {
    console.error('Error extracting main content with Cheerio:', error);
    return htmlToText(html); // Fall back to basic HTML to text
  }
}

/**
 * Extract search results from SearXNG HTML
 * @param {string} html - The SearXNG HTML content
 * @returns {Array} - Array of result objects with url, title, and snippet
 */
function extractSearchResults(html) {
  try {
    if (!html || typeof html !== 'string') {
      return [];
    }

    const $ = cheerio.load(html);
    const results = [];

    // Find all result articles
    $('article.result').each((_, article) => {
      const $article = $(article);

      // Extract URL and title
      const $link = $article.find('h3 a').first();
      const url = $link.attr('href');
      const title = $link.text().trim();

      // Extract snippet/content
      const content = $article.find('p.content, p.result-content, .snippet').text().trim();

      // Extract source/engine
      const engine = $article.find('.engine').text().trim() || 'searxng';

      if (url && url.startsWith('http')) {
        results.push({
          title: title || 'Untitled',
          url,
          content: content || 'No description available',
          engine,
          score: 1.0
        });
      }
    });

    // If no results found with the standard structure, try alternative selectors
    if (results.length === 0) {
      // Try to find any links that might be results
      $('a[href^="http"]').each((_, link) => {
        const $link = $(link);
        const url = $link.attr('href');

        // Skip navigation links, social media, etc.
        if (url.includes('facebook.com') ||
            url.includes('twitter.com') ||
            url.includes('instagram.com') ||
            url.includes('youtube.com') ||
            url.includes('linkedin.com') ||
            url.includes('web.archive.org') ||
            url.includes('localhost')) {
          return;
        }

        const title = $link.text().trim();

        // Only add if we have a meaningful title
        if (title && title.length > 5 && !results.some(r => r.url === url)) {
          results.push({
            title: title || 'Search Result',
            url,
            content: 'No description available',
            engine: 'searxng',
            score: 0.5
          });
        }
      });
    }

    return results;
  } catch (error) {
    console.error('Error extracting search results with Cheerio:', error);
    return [];
  }
}

export { htmlToText, extractMainContent, extractSearchResults };

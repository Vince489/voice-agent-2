/**
 * Tools Service
 *
 * Defines the tools available to the AI agent and provides functions for executing them.
 */

// Import the enhanced search functionality
import { performEnhancedSearch } from './enhancedSearch.js';

// Define the tools available to the agent
export const tools = [
  {
    name: "wristwatch",
    description: "Your luxury Jaeger-LeCoultre Calibre 822 wristwatch in Pink Gold 750/1000 (18 carats). While appearing to be a traditional mechanical watch with a hand-wound movement, it has subtle AI integration by Virtron Labs that provides accurate time information. It features a classic round case with a silver-toned dial, gold hour markers, and a hand-stitched alligator leather strap.",
    instructions: "Use this tool ONLY when the user explicitly asks about the current time, date, or your watch. Do not mention the time in every response.",
    parameters: []
  },
  {
    name: "searxng_search",
    description: "Searches the internet using SearXNG to retrieve real-time information from the web. This tool uses a local Docker instance of SearXNG with fallback to public instances and provides up-to-date information about current events, news, and other topics. The search results are processed using Cheerio for better HTML parsing and content extraction.",
    instructions: "Use this tool when the user asks about current events, news, or any information that may change over time and requires up-to-date data from the internet. Also use it when the user explicitly asks you to search for something.",
    parameters: [
      {
        name: "query",
        type: "string",
        description: "The search query to use. Be specific and concise for better results.",
        required: true,
      },
    ],
  },
  {
    name: "image_analysis",
    description: "Analyzes images uploaded by the user to provide descriptions and insights about the visual content. This tool can identify objects, scenes, text, and other elements in images.",
    instructions: "This tool is automatically used when the user uploads an image. You don't need to explicitly call it.",
    parameters: []
  },
  {
    name: "text_to_speech",
    description: "Converts your text responses to natural-sounding speech that is played back to the user. The speech output is cleaned to remove markdown, URLs, and improve pronunciation of technical terms.",
    instructions: "This tool is automatically used for all your responses. You don't need to explicitly call it. When writing responses that will be spoken, avoid using markdown, special characters, or complex formatting.",
    parameters: []
  },
  {
    name: "speech_to_text",
    description: "Converts the user's spoken words to text using advanced speech recognition. This allows users to interact with you through voice input.",
    instructions: "This tool is automatically used when the user speaks. You don't need to explicitly call it.",
    parameters: []
  }
];

/**
 * Get the current date and time information
 * @returns {object} - Object containing date and time information
 */
export function getCurrentDateTime() {
  const now = new Date();

  // Format the date in a readable way
  const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const timeOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true };

  const formattedDate = now.toLocaleDateString('en-US', dateOptions);
  const formattedTime = now.toLocaleTimeString('en-US', timeOptions);

  // Get timezone information
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const timezoneOffset = now.getTimezoneOffset();
  const timezoneOffsetHours = Math.abs(Math.floor(timezoneOffset / 60));
  const timezoneOffsetMinutes = Math.abs(timezoneOffset % 60);
  const timezoneString = `UTC${timezoneOffset <= 0 ? '+' : '-'}${timezoneOffsetHours.toString().padStart(2, '0')}:${timezoneOffsetMinutes.toString().padStart(2, '0')}`;

  return {
    date: formattedDate,
    time: formattedTime,
    timezone,
    timezoneOffset: timezoneString,
    iso8601: now.toISOString(),
    unix: Math.floor(now.getTime() / 1000),
    year: now.getFullYear(),
    month: now.getMonth() + 1, // JavaScript months are 0-indexed
    day: now.getDate(),
    hour: now.getHours(),
    minute: now.getMinutes(),
    second: now.getSeconds(),
    millisecond: now.getMilliseconds(),
    weekday: dateOptions.weekday === 'long' ? now.toLocaleDateString('en-US', { weekday: 'long' }) : now.getDay(),
    message: `According to my Jaeger-LeCoultre Calibre 822 wristwatch, it is currently ${formattedTime} on ${formattedDate} (${timezoneString}).`
  };
}

/**
 * Perform a search using SearXNG
 * @param {object} args - Arguments for the search, including the query
 * @returns {Promise<object>} - The search results
 */
async function performSearxNGSearch(args) {
  try {
    // Check if query is provided
    if (!args.query) {
      return { error: 'No search query provided' };
    }

    console.log(`Performing search for: ${args.query}`);

    // Use the enhanced search functionality
    const searchResults = await performEnhancedSearch(args.query);

    // Format the results for the AI
    return {
      query: args.query,
      results: searchResults.results.map(result => {
        // Find the content for this URL
        const contentItem = searchResults.content.find(c => c.includes(result.url));

        // Extract title from content if available
        let title = 'No title';
        if (contentItem) {
          const titleMatch = contentItem.match(/Title: ([^\n]+)/);
          if (titleMatch && titleMatch[1]) {
            title = titleMatch[1];
          }
        }

        return {
          title: title,
          url: result.url,
          content: contentItem ? contentItem.replace(/^Source: [^\n]+\n/, '').replace(/^Title: [^\n]+\n/, '').substring(0, 200) + '...' : 'No content available',
          engine: 'searxng'
        };
      }),
      number_of_results: searchResults.results.length
    };
  } catch (error) {
    console.error('Error performing search:', error);
    return { error: `Failed to perform search: ${error.message}` };
  }
}

/**
 * Execute a tool based on its name and arguments
 * @param {string} toolName - The name of the tool to execute
 * @param {object} args - Arguments for the tool
 * @returns {Promise<object>} - The result of the tool execution
 */
export async function executeTool(toolName, args = {}) {
  switch (toolName) {
    case "wristwatch":
      return getCurrentDateTime();

    // For backward compatibility
    case "datetime":
      return getCurrentDateTime();

    case "searxng_search":
      return performSearxNGSearch(args);

    default:
      return { error: `Tool "${toolName}" not found or cannot be directly called.` };
  }
}

export default {
  tools,
  executeTool,
  getCurrentDateTime
};
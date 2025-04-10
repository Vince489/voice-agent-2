/**
 * Tools Service
 *
 * Defines the tools available to the AI agent and provides functions for executing them.
 */

// Import the enhanced search functionality and search tool
import { performEnhancedSearch } from './enhancedSearch.js';
import { executeSearch, searchTool } from './tools/searchTool.js';

// Define the tools available to the agent
export const tools = [
  // Internet search tool for Virtra
  {
    name: "internet_search",
    description: "Search the internet for current information. Use this when you need to find up-to-date information about events, people, places, or concepts.",
    instructions: "Use this tool when the user asks a question that requires current information or when you need to provide accurate, up-to-date facts about any topic. This tool searches the internet using a local SearXNG instance and retrieves comprehensive information from multiple sources.",
    parameters: [
      {
        name: "query",
        type: "string",
        description: "The search query to execute",
        required: true
      }
    ]
  },
  {
    name: "wristwatch",
    description: "Your luxury Jaeger-LeCoultre Calibre 822 wristwatch in Pink Gold 750/1000 (18 carats). While appearing to be a traditional mechanical watch with a hand-wound movement, it has subtle AI integration by Virtron Labs that provides accurate time information. It features a classic round case with a silver-toned dial, gold hour markers, and a hand-stitched alligator leather strap.",
    instructions: "Use this tool ONLY when the user specifically asks for the current date, time, day of the week, or any time-sensitive information. Think of it as looking at your treasured Jaeger-LeCoultre, which you're quite fond of. When using this tool, imagine you're physically checking your mechanical watch, though the AI integration provides the precise data. Do not include time information in responses unless specifically asked.",
    parameters: [] // No parameters needed for this tool
  },
  {
    name: "searxng_search",
    description: "Searches the internet using SearXNG, a privacy-respecting metasearch engine that doesn't track or profile users.",
    instructions: "Use this tool when the user asks a question that requires up-to-date information or information not readily available in your internal knowledge. Formulate a concise and effective search query based on the user's request.",
    parameters: [
      {
        name: "query",
        type: "string",
        description: "The search query to use.",
        required: true,
      },
    ],
  },
  {
    name: "enhanced_search",
    description: "Performs an advanced search that not only returns search results but also fetches and processes the content from the top results.",
    instructions: "Use this tool when you need detailed information from multiple web sources on a topic. This tool will search for relevant pages and extract their main content, providing you with comprehensive information to answer complex questions.",
    parameters: [
      {
        name: "query",
        type: "string",
        description: "The search query to use.",
        required: true,
      },
    ],
  },
  {
    name: "image_analysis",
    description: "Analyzes images uploaded by the user, allowing you to see and understand visual content.",
    instructions: "This tool is automatically used when the user uploads an image. The analysis result is provided to you. You can describe what you see in the image and answer questions about it.",
    parameters: [] // Parameters are handled automatically
  },
  {
    name: "text_to_speech",
    description: "Converts your text responses to natural-sounding speech for the user to hear.",
    instructions: "This tool is automatically used for all your responses. Your text is converted to speech for the user to hear, so optimize your responses for listening rather than reading.",
    parameters: [] // Parameters are handled automatically
  },
  {
    name: "speech_to_text",
    description: "Converts the user's spoken words into text that you can understand and respond to.",
    instructions: "This tool is automatically used when the user speaks into their microphone. The transcribed text is provided to you, allowing you to understand what the user said verbally.",
    parameters: [] // Parameters are handled automatically
  }
];

/**
 * Get the current date and time information
 * @returns {object} - Object containing date and time information
 */
export function getCurrentDateTime() {
  const now = new Date();

  // Format date components
  const date = now.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Format time components
  const time = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  return {
    full_datetime: `${date}, ${time}`,
    date: date,
    time: time,
    day_of_week: now.toLocaleDateString('en-US', { weekday: 'long' }),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    unix_timestamp: Math.floor(now.getTime() / 1000)
  };
}



/**
 * Perform a search using SearXNG
 * @param {object} args - Arguments for the search, including the query
 * @returns {Promise<object>} - The search results
 */
async function performSearxNGSearch(args) {
  const { query } = args;
  if (!query) {
    return { error: "Search query cannot be empty." };
  }

  try {
    // Try a different public SearXNG instance
    const searxngInstance = 'https://search.mdosch.de';
    const searchUrl = `${searxngInstance}/search?q=${encodeURIComponent(query)}&format=json`;

    console.log(`Performing search for: ${query} using ${searchUrl}`);

    // Make the request to the SearXNG instance
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`SearXNG API returned status: ${response.status}`);
    }

    const data = await response.json();

    if (data && data.results) {
      // Extract relevant information from the search results
      const results = data.results.map(result => ({
        title: result.title,
        url: result.url,
        content: result.content || result.snippet || '',
        engine: result.engine,
        score: result.score || 1.0
      }));

      return {
        results,
        query,
        number_of_results: data.number_of_results || results.length,
        answers: data.answers || []
      };
    } else {
      // Fallback to simulated results if no results are returned
      console.log('No results from SearXNG, using fallback results');

      const mockResults = [
        {
          title: `Information about ${query}`,
          url: `https://example.com/search?q=${encodeURIComponent(query)}`,
          content: `This is fallback content about ${query}. The local SearXNG instance didn't return any results.`,
          engine: 'fallback',
          score: 1.0
        }
      ];

      return {
        results: mockResults,
        query,
        number_of_results: mockResults.length,
        answers: [],
        note: "These are fallback results. Your local SearXNG instance didn't return any results."
      };
    }
  } catch (error) {
    console.error("Error performing SearXNG search:", error);
    return {
      error: `Failed to perform search: ${error.message}`,
      query,
      results: [],
      number_of_results: 0
    };
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

    case "enhanced_search":
      return performEnhancedSearch(args.query);

    case "internet_search":
      return executeSearch(args.query);

    // Other tools (image_analysis, text_to_speech, speech_to_text) are handled
    // automatically by the application flow, not directly called by the agent

    default:
      return { error: `Tool "${toolName}" not found or cannot be directly called.` };
  }
}

export default {
  tools,
  executeTool,
  getCurrentDateTime
};

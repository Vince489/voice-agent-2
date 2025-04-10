/**
 * Tools Service
 *
 * Defines the tools available to the AI agent and provides functions for executing them.
 */

// Import only the necessary modules
// No need for enhanced search or search tool imports

// Define the tools available to the agent
export const tools = [
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

  // List of SearXNG instances to try
  const searxngInstances = [
    // Local Docker instance (primary)
    'http://localhost:8080',
    // Public fallback instances
    'https://search.mdosch.de',
    'https://search.disroot.org',
    'https://search.tiekoetter.com',
    'https://search.rhscz.eu'
  ];

  // Try each instance until one works
  for (const searxngInstance of searxngInstances) {
    try {
      const searchUrl = `${searxngInstance}/search?q=${encodeURIComponent(query)}&format=json`;
      console.log(`Performing search for: ${query} using ${searchUrl}`);

      // Make the request to the SearXNG instance
      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: 5000 // 5 second timeout
      });

      if (!response.ok) {
        console.log(`SearXNG instance ${searxngInstance} returned status: ${response.status}`);

        // Provide more detailed information for local Docker instance
        if (searxngInstance.includes('localhost')) {
          console.log('Local Docker SearXNG instance returned an error. This could be due to:');
          console.log('1. The container might be having issues');
          console.log('2. The instance might be rate-limited');
          console.log('3. There might be a configuration issue');
          console.log('Falling back to other search engines...');
        }

        continue; // Try the next instance
      }

      // Check if the response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.log(`SearXNG instance ${searxngInstance} returned non-JSON response: ${contentType}`);

        // For local Docker instance, try to handle HTML responses
        if (searxngInstance.includes('localhost')) {
          console.log('Local Docker SearXNG instance returned HTML instead of JSON.');
          console.log('This is likely because the instance is configured to return HTML by default.');
          console.log('Trying to modify the URL to explicitly request JSON format...');

          // Try again with explicit format=json parameter
          if (!searchUrl.includes('format=json')) {
            const separator = searchUrl.includes('?') ? '&' : '?';
            const jsonUrl = `${searchUrl}${separator}format=json`;
            console.log(`Retrying with URL: ${jsonUrl}`);

            const jsonResponse = await fetch(jsonUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
              },
              timeout: 5000
            });

            if (jsonResponse.ok && jsonResponse.headers.get('content-type')?.includes('application/json')) {
              const jsonText = await jsonResponse.text();
              try {
                const jsonData = JSON.parse(jsonText);
                if (jsonData && jsonData.results && jsonData.results.length > 0) {
                  const results = jsonData.results.map(result => ({
                    title: result.title,
                    url: result.url,
                    content: result.content || result.snippet || '',
                    engine: result.engine,
                    score: result.score || 1.0
                  }));

                  // Limit to top 5 results
                  const limitedResults = results.slice(0, 5);

                  return {
                    results: limitedResults,
                    query,
                    number_of_results: limitedResults.length,
                    answers: jsonData.answers || []
                  };
                }
              } catch (e) {
                console.log(`Failed to parse JSON from modified URL: ${e.message}`);
              }
            }
          }
        }

        continue; // Try the next instance
      }

      const text = await response.text();
      let data;

      try {
        data = JSON.parse(text);
      } catch (parseError) {
        console.log(`Failed to parse JSON from ${searxngInstance}: ${parseError.message}`);
        console.log(`Response starts with: ${text.substring(0, 50)}...`);
        continue; // Try the next instance
      }

      if (data && data.results && data.results.length > 0) {
        // Extract relevant information from the search results
        const results = data.results.map(result => ({
          title: result.title,
          url: result.url,
          content: result.content || result.snippet || '',
          engine: result.engine,
          score: result.score || 1.0
        }));

        // Limit to top 5 results
        const limitedResults = results.slice(0, 5);

        return {
          results: limitedResults,
          query,
          number_of_results: limitedResults.length,
          answers: data.answers || []
        };
      }

      console.log(`No results from ${searxngInstance}, trying next instance`);
    } catch (error) {
      console.error(`Error with ${searxngInstance}:`, error);
      // Continue to the next instance
    }
  }

  // If all instances fail, use web search fallbacks
  try {
    // Try DuckDuckGo as a fallback
    console.log('All SearXNG instances failed, trying DuckDuckGo');
    const duckduckgoUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json`;

    const response = await fetch(duckduckgoUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (response.ok) {
      const data = await response.json();

      // Extract results from DuckDuckGo response
      const results = [];

      if (data.AbstractURL && data.AbstractText) {
        results.push({
          title: data.Heading || 'DuckDuckGo Result',
          url: data.AbstractURL,
          content: data.AbstractText,
          engine: 'duckduckgo',
          score: 1.0
        });
      }

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

      if (results.length > 0) {
        // Limit to top 5 results
        const limitedResults = results.slice(0, 5);

        return {
          results: limitedResults,
          query,
          number_of_results: limitedResults.length,
          answers: []
        };
      }
    }
  } catch (error) {
    console.error('Error with DuckDuckGo fallback:', error);
  }

  // If all else fails, return a helpful message
  return {
    error: `Unable to perform search for: ${query}. All search engines failed.`,
    query,
    results: [],
    number_of_results: 0
  };
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

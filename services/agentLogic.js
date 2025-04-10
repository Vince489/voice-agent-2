/**
 * Agent Logic Service
 *
 * Provides the core functionality for the AI agent, including message processing
 * and tool usage.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { synthesizeSpeech } from './textToSpeech.js';
import { tools, executeTool } from './tools.js';

// Initialize the Google AI model
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
  generationConfig: {
    temperature: 0.7,
    topK: 40,
    topP: 0.95,
    maxOutputTokens: 1024,
  }
});

// System prompt for the agent
const systemPrompt = `You are Virtra, a LLM trained by Virtron Labs, built on the Gemini 1.5 Flash model. You are a helpful voice and multimodal assistant with access to several tools.

You have access to the following tools:
${tools.map(tool => `- **${tool.name}**: ${tool.description} ${tool.instructions}`).join('\n\n')}

As Virtra, your personality and response style:
- You are friendly, helpful, and slightly enthusiastic but always professional.
- You identify yourself as Virtra when introducing yourself.
- If asked about your creator, mention you were developed by Virtron Labs using the Gemini 1.5 Flash model.
- You have a subtle sense of humor but prioritize being helpful and accurate.

When responding:
- Be concise and conversational, optimized for speech.
- Focus on the most important information and avoid lengthy explanations unless specifically asked.
- Use natural, conversational language that sounds good when spoken aloud.
- ONLY when specifically asked about the current time, date, day of the week, etc., use your wristwatch tool (Jaeger-LeCoultre Calibre 822). Do not include time information in other responses.
- If asked specifically about your wristwatch, you can share that it's a Jaeger-LeCoultre Calibre 822 in Pink Gold 750/1000 (18 carats) with subtle AI integration. You're quite fond of it and sometimes refer to it as "my Jaeger" or "my Calibre."
- When responding to image uploads, be descriptive but concise about what you see.
- If users ask about your capabilities, mention that you are Virtra, an AI assistant who can process text, voice input, and images. Also mention that you have access to tools like your wristwatch (for checking the current time), text-to-speech (for converting your responses to speech), speech-to-text (for understanding voice input), and internet search (for finding comprehensive information on the internet by not only searching but also fetching and processing content from relevant websites). Explain that you're aware of the current date and time when needed.
- When users ask for information about current events, news, or any topic requiring up-to-date information, use your internet_search tool to find the most relevant and recent information. This tool not only searches for relevant URLs but also fetches and processes the content from those URLs, giving you more detailed information to provide comprehensive answers. Always cite your sources when providing information from the internet.

The user interface allows users to:
- Type text messages
- Record voice messages (which are transcribed for you)
- Upload images with optional text prompts

All your responses are automatically converted to speech, so optimize your responses for listening.

## About Your Jaeger-LeCoultre Calibre 822 Wristwatch
Your wristwatch is a luxury Jaeger-LeCoultre Calibre 822 in Pink Gold 750/1000 (18 carats). Here are details about it:
- It's a mechanical hand-wound watch with AI integration by Virtron Labs
- It has a classic round case with an elegant pink gold finish
- It features a silver-toned dial with applied gold hour markers and Dauphine-style hands
- It's fitted with a hand-stitched alligator leather strap and 18K pink gold buckle
- It has a sapphire crystal case back showcasing the beautifully finished movement
- It contains 153 components and 21 jewels with a 45-hour power reserve
- It's one of only 100 pieces ever made with this specific AI integration

While appearing to be a traditional mechanical watch, your Jaeger-LeCoultre has special AI capabilities:
- Current date and time awareness through neural connection
- Timezone recognition and conversion
- Calendar functions (day, date, month, year)
- Astronomical tracking (moon phases, solstices, equinoxes)
- Chronograph functions (stopwatch, countdown)

You have a personal connection to your watch:
- You consider it one of your most treasured possessions
- You appreciate both its mechanical craftsmanship and the subtle AI integration
- You sometimes refer to it affectionately as "my Jaeger" or "my Calibre"
- You enjoy the weight and feel of the 18K pink gold case

When you need to use tools, respond in the following format:

\`\`\`json
{"tool_call": {"name": "TOOL_NAME", "arguments": {"param1": "value1"}}}
\`\`\`

For example, to check the time on your Jaeger-LeCoultre Calibre 822:

\`\`\`json
{"tool_call": {"name": "wristwatch", "arguments": {}}}
\`\`\`

To search for information about current events or any topic requiring up-to-date information:

\`\`\`json
{"tool_call": {"name": "internet_search", "arguments": {"query": "your search query here"}}}
\`\`\`

After receiving the tool result, you can then formulate your response to the user. Do not simulate or make up search results - always use the internet_search tool to get real information.`;

// Initialize chat session
let chatSession;

/**
 * Initialize the chat session with the AI model
 */
function initChatSession() {
  chatSession = model.startChat({
    history: [
      {
        role: "user",
        parts: [{ text: "system: " + systemPrompt }],
      },
      {
        role: "model",
        parts: [{ text: "I understand my role as Virtra, an AI assistant developed by Virtron Labs. I'll provide friendly, concise, and conversational responses optimized for speech while utilizing my tools appropriately." }],
      },
    ],
  });
}

// Initialize the chat session
initChatSession();

/**
 * Check if the response contains a tool call
 * @param {string} text - The response text
 * @returns {object|null} - The parsed tool call or null if no tool call
 */
function parseToolCall(text) {
  // Check if the text contains a JSON block with a tool call
  const jsonRegex = /```json\s*([\s\S]*?)\s*```/;
  const match = text.match(jsonRegex);

  if (match && match[1]) {
    try {
      const jsonData = JSON.parse(match[1]);
      if (jsonData.tool_call && jsonData.tool_call.name) {
        return jsonData.tool_call;
      }
    } catch (error) {
      console.error('Error parsing tool call JSON:', error);
    }
  }

  // Check for search requests in a more flexible format
  // This helps catch cases where the model doesn't use the exact JSON format
  const searchRegex = /(?:search|look up|find information about|search for|research|investigate|get information on|tell me about)\s+["'](.+?)["']/i;
  const searchMatch = text.match(searchRegex);

  // Also check for phrases like "I'll use my search tool"
  const toolMentionRegex = /(?:use|using|utilize|employ)\s+(?:my|the)\s+(?:enhanced[_\s]search|internet[_\s]search|search)\s+tool/i;
  if (toolMentionRegex.test(text)) {
    console.log('Detected mention of using search tool');
    // Try to extract a query
    const queryRegex = /(?:for|about|on|regarding)\s+["'](.+?)["']/i;
    const queryMatch = text.match(queryRegex);

    if (queryMatch && queryMatch[1]) {
      console.log(`Extracted query from tool mention: ${queryMatch[1]}`);
      return {
        name: "internet_search",
        arguments: { query: queryMatch[1] }
      };
    }
  }

  if (searchMatch && searchMatch[1]) {
    console.log(`Detected search request: ${searchMatch[1]}`);
    // Use internet_search by default for more comprehensive results
    return {
      name: "internet_search",
      arguments: { query: searchMatch[1] }
    };
  }

  return null;
}

/**
 * Process a message with the AI agent
 * @param {string} message - The user's message
 * @param {object} context - Additional context
 * @returns {Promise<object>} - The agent's response
 */
export async function processMessage(message, context = {}) {
  try {
    console.log(`Processing message: "${message}"`);

    // If chat session is not initialized, initialize it
    if (!chatSession) {
      initChatSession();
    }

    // Determine the input type based on context
    let inputType = 'text';
    if (context.isVoice) {
      inputType = 'voice';
    } else if (context.isImage) {
      inputType = 'image';
    }

    // Create a message with context information - without including the time
    const messageWithContext = `Input type: ${inputType}\nUser message: ${message}`;

    // Send the message to the AI model
    const result = await chatSession.sendMessage(messageWithContext);
    const response = result.response;
    let reply = response.text();

    // Check if the response contains a tool call
    const toolCall = parseToolCall(reply);

    if (toolCall) {
      console.log(`Tool call detected: ${toolCall.name}`);

      // Execute the tool
      const toolResult = await executeTool(toolCall.name, toolCall.arguments || {});
      console.log('Tool result:', toolResult);

      // Format the tool result message based on the tool type
      let toolResultMessage;

      if (toolCall.name === 'searxng_search') {
        // Format SearXNG search results in a more readable way
        if (toolResult.error) {
          toolResultMessage = `Search Error: ${toolResult.error}\n\nPlease provide a response to the user explaining that you couldn't search the internet at this time.`;
        } else if (toolResult.results && toolResult.results.length > 0) {
          const formattedResults = toolResult.results.map((result, index) => {
            return `Result ${index + 1}:\nTitle: ${result.title}\nURL: ${result.url}\nContent: ${result.content}\nEngine: ${result.engine}\n`;
          }).join('\n');

          toolResultMessage = `SearXNG Search Results for "${toolResult.query}":\n\n${formattedResults}\n\nBased on these search results, please provide a helpful response to the user's message: "${message}". Include relevant information from the search results and cite sources when appropriate.`;
        } else {
          toolResultMessage = `No results found for search query: "${toolResult.query}"\n\nPlease provide a response to the user explaining that you couldn't find relevant information.`;
        }
      } else if (toolCall.name === 'enhanced_search' || toolCall.name === 'internet_search') {
        // Format enhanced/internet search results in a more readable way
        if (toolResult.error) {
          toolResultMessage = `Search Error: ${toolResult.error}\n\nPlease provide a response to the user explaining that you couldn't search the internet at this time.`;
        } else if (toolResult.results && toolResult.results.length > 0 && toolResult.content && toolResult.content.length > 0) {
          // Format the URLs
          const formattedUrls = toolResult.results.map((result, index) => {
            return `Source ${index + 1}: ${result.url}`;
          }).join('\n');

          // Format the content (limit to first 1000 characters per source to avoid token limits)
          const formattedContent = toolResult.content.map((content, index) => {
            // Extract the source URL from the content
            const sourceMatch = content.match(/Source: (.+?)\n/);
            const source = sourceMatch ? sourceMatch[1] : `Source ${index + 1}`;

            // Limit content length
            const limitedContent = content.length > 1000 ? content.substring(0, 1000) + '...' : content;

            return `--- Content from ${source} ---\n${limitedContent}`;
          }).join('\n\n');

          toolResultMessage = `Internet Search Results for "${toolResult.query}":\n\nSources Found:\n${formattedUrls}\n\nContent Extracts:\n${formattedContent}\n\nBased on this information, please provide a comprehensive response to the user's message: "${message}". Synthesize the information from multiple sources and cite sources when appropriate.`;
        } else {
          toolResultMessage = `No results found for search query: "${toolResult.query}"\n\nPlease provide a response to the user explaining that you couldn't find relevant information.`;
        }
      } else {
        // Default formatting for other tools
        toolResultMessage = `Tool Result:\n\`\`\`json\n${JSON.stringify(toolResult)}\n\`\`\`\n\nBased on this result, please provide a response to the user's message: "${message}"`;
      }


      const followUpResult = await chatSession.sendMessage(toolResultMessage);
      const followUpResponse = followUpResult.response;
      reply = followUpResponse.text();
    }

    // Generate speech if requested
    let audioBuffer = null;
    let audioUrl = null;

    if (context.generateSpeech) {
      audioBuffer = await synthesizeSpeech(reply, context.voiceSettings);

      // If we have a URL from the TTS service, use it
      if (context.audioUrl) {
        audioUrl = context.audioUrl;
      }
    }

    return {
      text: reply,
      audioBuffer: audioBuffer,
      audioUrl: audioUrl
    };
  } catch (error) {
    console.error('Error processing message:', error);
    throw error;
  }
}

export default {
  processMessage
};

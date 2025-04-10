/**
 * Agent Logic Service
 *
 * Provides the core functionality for the AI agent, including message processing
 * and tool usage.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { synthesizeSpeech } from './textToSpeech.js';
import { tools, executeTool } from './tools.js';
import { HybridConversationMemory } from './memory.js';
import { loadPersona, generateSystemPrompt } from './personaLoader.js';

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

// Current active persona ID
let currentPersonaId = 'default';

// Function to get the system prompt based on the current persona
async function getSystemPrompt() {
  try {
    // Load the current persona
    const persona = await loadPersona(currentPersonaId);

    // Generate the system prompt from the persona
    let prompt = generateSystemPrompt(persona);

    // Add tools information to the prompt
    prompt = prompt.replace('with access to several tools.',
      `with access to several tools.\n\nYou have access to the following tools:\n${tools.map(tool => `- **${tool.name}**: ${tool.description} ${tool.instructions}`).join('\n\n')}`);

    return prompt;
  } catch (error) {
    console.error('Error getting system prompt:', error);

    // Fallback to a minimal system prompt
    return `You are Virtra, a LLM trained by Virtron Labs, built on the Gemini 1.5 Flash model. You are a helpful voice and multimodal assistant.\n\nYou have access to the following tools:\n${tools.map(tool => `- **${tool.name}**: ${tool.description} ${tool.instructions}`).join('\n\n')}\n\nWhen you need to use tools, respond in JSON format with a tool_call object.`;
  }
}

// Function to change the current persona
async function changePersona(personaId) {
  try {
    // Validate that the persona exists by trying to load it
    await loadPersona(personaId);

    // Update the current persona ID
    currentPersonaId = personaId;
    console.log(`Changed persona to: ${personaId}`);

    // Reinitialize the chat session with the new persona
    await initChatSession();

    return { success: true, message: `Changed to ${personaId} persona` };
  } catch (error) {
    console.error(`Error changing to persona ${personaId}:`, error);
    return { success: false, error: `Failed to change persona: ${error.message}` };
  }
}

// Initialize chat session and memory
let chatSession;

// Create a conversation memory instance with default session ID
const conversationMemory = new HybridConversationMemory({
  maxSizeBytes: 5 * 1024 * 1024, // 5MB
  maxMessageCount: 20,
  sessionId: 'default-session'
});

/**
 * Initialize the chat session with the AI model
 */
async function initChatSession() {
  // Get the system prompt based on the current persona
  const systemPrompt = await getSystemPrompt();

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

  console.log(`Chat session initialized with persona: ${currentPersonaId}`);
}

// Initialize the chat session (async IIFE)
(async () => {
  try {
    await initChatSession();
  } catch (error) {
    console.error('Error initializing chat session:', error);
  }
})();

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
  const toolMentionRegex = /(?:use|using|utilize|employ)\s+(?:my|the)\s+(?:searxng[_\s]search|search)\s+tool/i;
  if (toolMentionRegex.test(text)) {
    console.log('Detected mention of using search tool');
    // Try to extract a query
    const queryRegex = /(?:for|about|on|regarding)\s+["'](.+?)["']/i;
    const queryMatch = text.match(queryRegex);

    if (queryMatch && queryMatch[1]) {
      console.log(`Extracted query from tool mention: ${queryMatch[1]}`);
      return {
        name: "searxng_search",
        arguments: { query: queryMatch[1] }
      };
    }
  }

  if (searchMatch && searchMatch[1]) {
    console.log(`Detected search request: ${searchMatch[1]}`);
    // Use searxng_search for search requests
    return {
      name: "searxng_search",
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
/**
 * Function to clean the AI's text response for better TTS
 * @param {string} text - The AI's raw text response
 * @returns {string} - The cleaned text
 */
function cleanTextForTTS(text) {
  // Implement cleaning logic for better speech output
  let cleanedText = text;

  // Remove markdown formatting
  cleanedText = cleanedText.replace(/\[.*?\]\(.*?\)/g, ''); // Remove markdown links
  cleanedText = cleanedText.replace(/\*\*(.*?)\*\*/g, '$1'); // Remove bold markdown
  cleanedText = cleanedText.replace(/\_(.*?)\_/g, '$1');   // Remove italic markdown
  cleanedText = cleanedText.replace(/\`(.*?)\`/g, '$1');   // Remove code formatting

  // Improve pronunciation of technical terms
  cleanedText = cleanedText.replace(/n8n/gi, 'N eight N'); // Pronunciation help
  cleanedText = cleanedText.replace(/Make \(formerly Integromat\)/gi, 'Make, formerly known as Integromat');

  // Clean up URLs for better speech
  cleanedText = cleanedText.replace(/https?:\/\/[^\s)]+/g, 'link'); // Replace URLs with 'link'
  cleanedText = cleanedText.replace(/Source \d+: link/g, ''); // Remove source links

  // Clean up search result formatting
  cleanedText = cleanedText.replace(/--- Content from .* ---/g, 'According to this source:');
  cleanedText = cleanedText.replace(/Source: .*/g, '');

  // Remove any remaining special characters that might affect speech
  cleanedText = cleanedText.replace(/\|/g, ', '); // Replace pipes with commas
  cleanedText = cleanedText.replace(/\\n/g, ' '); // Replace literal \n with space
  cleanedText = cleanedText.replace(/\\t/g, ' '); // Replace literal \t with space

  // Fix common abbreviations for better speech
  cleanedText = cleanedText.replace(/vs\./g, 'versus');
  cleanedText = cleanedText.replace(/e\.g\./g, 'for example');
  cleanedText = cleanedText.replace(/i\.e\./g, 'that is');

  // More aggressive cleaning to prevent TTS issues
  // Remove all non-alphanumeric characters except basic punctuation
  cleanedText = cleanedText.replace(/[^a-zA-Z0-9\s.,;:?!'"()-]/g, ' ');

  // Fix multiple spaces
  cleanedText = cleanedText.replace(/\s+/g, ' ');

  // Remove spaces before punctuation
  cleanedText = cleanedText.replace(/\s+([.,;:?!])/g, '$1');

  // Ensure the text ends with proper punctuation
  if (!/[.!?]\s*$/.test(cleanedText)) {
    cleanedText = cleanedText.trim() + '.';
  }

  return cleanedText;
}

export async function processMessage(message, context = {}) {
  try {
    console.log(`Processing message: "${message}"`);

    // Set the session ID if provided in the context
    if (context.sessionId && context.sessionId !== conversationMemory.sessionId) {
      await conversationMemory.setSessionId(context.sessionId);
    }

    // Special commands for memory management and persona switching
    if (message === '__get_memory__' && context.getMemoryOnly) {
      return {
        messages: conversationMemory.getAllMessages(),
        count: conversationMemory.messages.length,
        sessionId: conversationMemory.sessionId
      };
    }

    if (message === '__clear_memory__' && context.clearMemory) {
      await conversationMemory.clear();
      return { success: true, message: 'Memory cleared' };
    }

    // Command to switch personas
    if (message.startsWith('__switch_persona__') && context.allowPersonaSwitch) {
      const personaId = message.split('__')[2];
      if (personaId) {
        return await changePersona(personaId);
      } else {
        return { success: false, error: 'No persona ID provided' };
      }
    }

    // Command to get current persona
    if (message === '__get_persona__' && context.getPersonaInfo) {
      return {
        currentPersona: currentPersonaId,
        message: `Current persona: ${currentPersonaId}`
      };
    }

    // Command to announce persona change with TTS
    if (message.startsWith('__announce_persona_change__')) {
      const personaId = message.split('__')[2];
      if (personaId) {
        const persona = await loadPersona(personaId);
        const personaName = persona.metadata.name;

        // Create a friendly announcement message
        let announcementText;

        switch (personaId) {
          case 'professional':
            announcementText = `I've switched to my Professional persona. I'll be more formal and business-oriented in my responses now.`;
            break;
          case 'casual':
            announcementText = `I've switched to my Casual persona. I'll be more relaxed and conversational in my responses now.`;
            break;
          case 'default':
            announcementText = `I've switched to my Default persona. I'll be friendly and professional in my responses now.`;
            break;
          default:
            announcementText = `I've switched to the ${personaName} persona. My personality and tone will reflect this change.`;
        }

        return {
          text: announcementText,
          generateSpeech: true
        };
      }
    }

    // Handle welcome message
    if (message === '__welcome__') {
      // Get the current persona to customize the welcome message
      const persona = await loadPersona(currentPersonaId);
      const personaName = persona.metadata.name;

      // Create a welcome message based on the current persona
      let welcomeText;

      switch (currentPersonaId) {
        case 'professional':
          welcomeText = `Welcome. I'm Virtra, your professional virtual assistant. I'm here to provide you with accurate and efficient assistance. How may I help you today?`;
          break;
        case 'casual':
          welcomeText = `Hey there! I'm Virtra, your friendly AI assistant. I'm super excited to chat with you today! What can I help you with?`;
          break;
        case 'default':
        default:
          welcomeText = `Hello! I'm Virtra, your AI assistant. You can type a message, upload images, or use voice input. How can I help you today?`;
      }

      return {
        text: welcomeText,
        generateSpeech: true
      };
    }

    // If chat session is not initialized, initialize it
    if (!chatSession) {
      await initChatSession();
    }

    // Determine the input type based on context
    let inputType = 'text';
    if (context.isVoice) {
      inputType = 'voice';
    } else if (context.isImage) {
      inputType = 'image';
    }

    // Get relevant conversation history
    const conversationHistory = await conversationMemory.getRelevantContext(message);

    // Create a message with context information including conversation history
    const messageWithContext = `Input type: ${inputType}\n\nConversation History:\n${conversationHistory}\n\nUser message: ${message}`;

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
        // Check if toolResult is undefined
        if (!toolResult) {
          toolResultMessage = `Search Error: The search tool returned no results. This could be due to a connection issue with the search service.

Please provide a response to the user explaining that you couldn't search the internet at this time.`;
        }
        // Format SearXNG search results in a more readable way
        else if (toolResult.error) {
          toolResultMessage = `Search Error: ${toolResult.error}\n\nPlease provide a response to the user explaining that you couldn't search the internet at this time.`;
        } else if (toolResult.results && toolResult.results.length > 0) {
          const formattedResults = toolResult.results.map((result, index) => {
            return `Result ${index + 1}:\nTitle: ${result.title}\nURL: ${result.url}\nContent: ${result.content}\nEngine: ${result.engine}\n`;
          }).join('\n');

          toolResultMessage = `SearXNG Search Results for "${toolResult.query}":\n\n${formattedResults}\n\nBased on these search results, please provide a helpful response to the user's message: "${message}". Include relevant information from the search results and cite sources when appropriate.`;
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

    // Clean the reply for better TTS output
    const cleanedReply = cleanTextForTTS(reply);

    // Add the interaction to conversation memory
    await conversationMemory.addMessage({
      role: 'user',
      text: message
    }, message);

    await conversationMemory.addMessage({
      role: 'assistant',
      text: reply
    }, message);

    // Generate speech if requested
    let audioBuffer = null;
    let audioUrl = null;

    if (context.generateSpeech) {
      // Use the cleaned text for speech synthesis
      audioBuffer = await synthesizeSpeech(cleanedReply, context.voiceSettings);

      // If we have a URL from the TTS service, use it
      if (context.audioUrl) {
        audioUrl = context.audioUrl;
      }
    }

    return {
      text: reply, // Return original text for display
      cleanedText: cleanedReply, // Also return cleaned text
      audioBuffer: audioBuffer,
      audioUrl: audioUrl,
      memorySize: conversationMemory.messages.length // Return memory size for debugging
    };
  } catch (error) {
    console.error('Error processing message:', error);
    throw error;
  }
}

// Export the persona-related functions
export { changePersona, currentPersonaId };

export default {
  processMessage,
  changePersona
};

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
- If users ask about your capabilities, mention that you are Virtra, an AI assistant who can process text, voice input, and images. Also mention that you have access to tools like your wristwatch (for checking the current time), text-to-speech (for converting your responses to speech), and speech-to-text (for understanding voice input). Explain that you're aware of the current date and time when needed.

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

If you need to check the time on your Jaeger-LeCoultre Calibre 822, respond in the following format:

\`\`\`json
{"tool_call": {"name": "wristwatch", "arguments": {}}}
\`\`\`

After receiving the tool result, you can then formulate your response to the user.`;

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

      // Send the tool result back to the LLM
      const toolResultMessage = `Tool Result:\n\`\`\`json\n${JSON.stringify(toolResult)}\n\`\`\`\n\nBased on this result, please provide a response to the user's message: "${message}"`;

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

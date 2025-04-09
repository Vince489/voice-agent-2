/**
 * Agent Logic Service
 * 
 * Provides the core functionality for the AI agent, including message processing
 * and tool usage.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { synthesizeSpeech } from './textToSpeech.js';

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
const systemPrompt = `You are a helpful voice assistant. 
Your responses should be concise and conversational, optimized for speech.
When responding, focus on the most important information and avoid lengthy explanations unless specifically asked.
Use natural, conversational language that sounds good when spoken aloud.`;

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
        parts: [{ text: "I understand my role as a voice assistant. I'll provide concise, conversational responses optimized for speech." }],
      },
    ],
  });
}

// Initialize the chat session
initChatSession();

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
    
    // Send the message to the AI model
    const result = await chatSession.sendMessage(message);
    const response = result.response;
    const reply = response.text();
    
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

/**
 * Agent Routes
 *
 * Handles all routes related to the AI agent functionality.
 */

import express from 'express';
import { processMessage, changePersona, currentPersonaId } from '../services/agentLogic.js';
import { HybridConversationMemory } from '../services/memory.js';
import { listPersonas } from '../services/personaLoader.js';
import Conversation from '../models/conversation.js';

const router = express.Router();

/**
 * POST /api/agent/chat
 * Process a message with the AI agent
 */
router.post('/chat', async (req, res) => {
  try {
    const { message, context } = req.body;
    const sessionId = req.body.sessionId || 'default-session';

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Make sure context includes generateSpeech and sessionId
    const updatedContext = {
      ...context,
      generateSpeech: true,
      sessionId: sessionId
    };

    console.log(`Processing chat message for session: ${sessionId}`);

    // Process the message with the agent
    const response = await processMessage(message, updatedContext);

    // Add sessionId to the response
    response.sessionId = sessionId;

    // If we have an audio buffer but no URL, convert it to a data URL
    if (response.audioBuffer && !response.audioUrl) {
      console.log('Converting audio buffer to data URL for chat response, buffer size:', response.audioBuffer.length);

      // Create a proper base64 encoding of the audio buffer
      const base64Audio = Buffer.from(response.audioBuffer).toString('base64');
      response.audioUrl = `data:audio/mp3;base64,${base64Audio}`;
      console.log('Data URL created, length:', response.audioUrl.length);

      // Remove the buffer from the response to reduce payload size
      delete response.audioBuffer;
    }

    // Return the response
    return res.json(response);
  } catch (error) {
    console.error('Error processing message with agent:', error);
    return res.status(500).json({ error: 'Error processing message with agent' });
  }
});

/**
 * POST /api/agent/voice
 * Process a voice message with the AI agent and return a voice response
 */
router.post('/voice', async (req, res) => {
  try {
    const { transcription, context } = req.body;
    const sessionId = req.body.sessionId || 'default-session';

    if (!transcription) {
      return res.status(400).json({ error: 'Transcription is required' });
    }

    // Make sure context includes generateSpeech and sessionId
    const updatedContext = {
      ...context,
      generateSpeech: true,
      sessionId: sessionId
    };

    console.log(`Processing voice message for session: ${sessionId}`);

    // Process the transcribed message with the agent
    const response = await processMessage(transcription, updatedContext);

    // Add sessionId to the response
    response.sessionId = sessionId;

    // If we have an audio buffer but no URL, convert it to a data URL
    if (response.audioBuffer && !response.audioUrl) {
      console.log('Converting audio buffer to data URL, buffer size:', response.audioBuffer.length);

      // Create a proper base64 encoding of the audio buffer
      const base64Audio = Buffer.from(response.audioBuffer).toString('base64');
      response.audioUrl = `data:audio/mp3;base64,${base64Audio}`;
      console.log('Data URL created, length:', response.audioUrl.length);

      // Remove the buffer from the response to reduce payload size
      delete response.audioBuffer;
    }

    // Return the response
    return res.json(response);
  } catch (error) {
    console.error('Error processing voice message with agent:', error);
    return res.status(500).json({ error: 'Error processing voice message with agent' });
  }
});

/**
 * GET /api/agent/memory
 * Get the current conversation memory
 */
router.get('/memory', async (req, res) => {
  try {
    const sessionId = req.query.sessionId || 'default-session';

    // Access the memory from agentLogic with the specified sessionId
    const memory = await processMessage('__get_memory__', {
      getMemoryOnly: true,
      sessionId: sessionId
    });

    return res.json(memory);
  } catch (error) {
    console.error('Error retrieving conversation memory:', error);
    return res.status(500).json({ error: 'Error retrieving conversation memory' });
  }
});

/**
 * DELETE /api/agent/memory
 * Clear the conversation memory
 */
router.delete('/memory', async (req, res) => {
  try {
    const sessionId = req.query.sessionId || req.body.sessionId || 'default-session';

    // Clear the memory for the specified sessionId
    const result = await processMessage('__clear_memory__', {
      clearMemory: true,
      sessionId: sessionId
    });

    return res.json({
      success: true,
      message: `Conversation memory cleared for session ${sessionId}`,
      sessionId: sessionId
    });
  } catch (error) {
    console.error('Error clearing conversation memory:', error);
    return res.status(500).json({ error: 'Error clearing conversation memory' });
  }
});

/**
 * GET /api/agent/personas
 * Get a list of available personas
 */
router.get('/personas', async (req, res) => {
  try {
    const personas = await listPersonas();
    return res.json({
      personas,
      currentPersona: currentPersonaId
    });
  } catch (error) {
    console.error('Error retrieving personas:', error);
    return res.status(500).json({ error: 'Error retrieving personas' });
  }
});

/**
 * GET /api/agent/personas/current
 * Get the current persona
 */
router.get('/personas/current', async (req, res) => {
  try {
    const result = await processMessage('__get_persona__', { getPersonaInfo: true });
    return res.json(result);
  } catch (error) {
    console.error('Error retrieving current persona:', error);
    return res.status(500).json({ error: 'Error retrieving current persona' });
  }
});

/**
 * POST /api/agent/personas/switch
 * Switch to a different persona
 */
router.post('/personas/switch', async (req, res) => {
  try {
    const { personaId } = req.body;

    if (!personaId) {
      return res.status(400).json({ error: 'Persona ID is required' });
    }

    const result = await processMessage(`__switch_persona__${personaId}__`, { allowPersonaSwitch: true });
    return res.json(result);
  } catch (error) {
    console.error('Error switching persona:', error);
    return res.status(500).json({ error: 'Error switching persona' });
  }
});

/**
 * GET /api/agent/conversations
 * Get all conversation sessions
 */
router.get('/conversations', async (req, res) => {
  try {
    // Get all conversations from MongoDB, sorted by lastUpdated
    const conversations = await Conversation.find({}).sort({ lastUpdated: -1 }).limit(20); // Limit to 20 most recent conversations

    // Format the conversations for the client
    const formattedConversations = conversations.map(conv => {
      // Find the first user message to use as title
      let title = 'New conversation';

      if (conv.messages && conv.messages.length > 0) {
        // Try to find the first user message
        const userMessage = conv.messages.find(msg => msg.role === 'user');
        if (userMessage) {
          title = userMessage.text;
        } else {
          // If no user message, use the first message regardless of role
          title = conv.messages[0].text;
        }

        // Truncate the title if it's too long
        if (title.length > 30) {
          title = title.substring(0, 27) + '...';
        }
      }

      return {
        id: conv._id,
        sessionId: conv.sessionId,
        title: title,
        lastUpdated: conv.lastUpdated,
        messageCount: conv.messages ? conv.messages.length : 0
      };
    });

    return res.json({
      conversations: formattedConversations
    });
  } catch (error) {
    console.error('Error retrieving conversations:', error);
    return res.status(500).json({
      error: 'Error retrieving conversations',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

export default router;

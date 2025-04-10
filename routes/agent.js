/**
 * Agent Routes
 *
 * Handles all routes related to the AI agent functionality.
 */

import express from 'express';
import { processMessage } from '../services/agentLogic.js';
import { HybridConversationMemory } from '../services/memory.js';

const router = express.Router();

/**
 * POST /api/agent/chat
 * Process a message with the AI agent
 */
router.post('/chat', async (req, res) => {
  try {
    const { message, context } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Make sure context includes generateSpeech
    const updatedContext = { ...context, generateSpeech: true };

    // Process the message with the agent
    const response = await processMessage(message, updatedContext);

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

    if (!transcription) {
      return res.status(400).json({ error: 'Transcription is required' });
    }

    // Make sure context includes generateSpeech
    const updatedContext = { ...context, generateSpeech: true };

    // Process the transcribed message with the agent
    const response = await processMessage(transcription, updatedContext);

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
    // Access the memory from agentLogic
    // This is a simplified approach - in a real app, you might want to
    // store the memory in a database or session store
    const memory = await processMessage('__get_memory__', { getMemoryOnly: true });
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
    // Clear the memory
    const result = await processMessage('__clear_memory__', { clearMemory: true });
    return res.json({ success: true, message: 'Conversation memory cleared' });
  } catch (error) {
    console.error('Error clearing conversation memory:', error);
    return res.status(500).json({ error: 'Error clearing conversation memory' });
  }
});

export default router;

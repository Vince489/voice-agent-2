/**
 * Transcribe Routes
 *
 * Handles all routes related to speech-to-text functionality.
 */

import express from 'express';
import multer from 'multer';
import mongoose from 'mongoose';
import { transcribeSpeech, checkGoogleCredentials } from '../services/speechToText.js';
import Transcript from '../models/transcript.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

/**
 * POST /api/transcribe
 * Transcribes an audio file to text
 */
router.post('/', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    // Get the audio buffer from the uploaded file
    const audioBuffer = req.file.buffer;

    // Get the content type (MIME type) of the file
    const contentType = req.file.mimetype;

    console.log(`Received audio file: ${req.file.originalname}, size: ${req.file.size} bytes, type: ${contentType}`);

    // Log some information about the audio buffer to help debug
    console.log(`Audio buffer length: ${audioBuffer.length} bytes`);
    if (audioBuffer.length > 100) {
      console.log(`Audio buffer preview: ${audioBuffer.slice(0, 50).toString('hex')}...`);
    }

    // Transcribe the audio
    const transcriptionResult = await transcribeSpeech(audioBuffer, contentType);

    console.log(`Transcription result: ${JSON.stringify(transcriptionResult)}`);

    // Save the transcript to the database if MongoDB is configured
    if (mongoose.connection.readyState === 1) {
      try {
        const transcript = new Transcript({
          text: transcriptionResult.text,
          audioLength: transcriptionResult.audioLength || 0,
          confidence: transcriptionResult.confidence || 0,
          type: 'transcription',
          fallbackMode: transcriptionResult.fallbackMode || false
        });

        await transcript.save();
        console.log('Transcript saved to database');
      } catch (dbError) {
        console.error('Error saving transcript to database:', dbError);
        // Continue even if saving to database fails
      }
    }

    // Return the transcription result
    return res.json(transcriptionResult);
  } catch (error) {
    console.error('Error transcribing speech:', error);

    // Provide more specific error messages to the client
    if (error.message && error.message.includes('credentials')) {
      return res.status(500).json({
        error: 'Speech-to-text service not properly configured',
        details: error.message,
        suggestion: 'Please set up Google Cloud credentials'
      });
    } else if (error.message && error.message.includes('audio format')) {
      return res.status(400).json({
        error: 'Invalid audio format',
        details: error.message,
        suggestion: 'Try a different audio format like WAV or MP3'
      });
    } else if (error.message && error.message.includes('quota')) {
      return res.status(429).json({
        error: 'API quota exceeded',
        details: error.message,
        suggestion: 'Try again later or check your Google Cloud billing'
      });
    } else {
      return res.status(500).json({
        error: 'Error transcribing speech',
        details: error.message || 'Unknown error'
      });
    }
  }
});

/**
 * GET /api/transcribe/diagnostics
 * Returns diagnostic information about the speech-to-text service
 */
router.get('/diagnostics', (_req, res) => {
  try {
    const diagnostics = checkGoogleCredentials();

    // Add environment information
    diagnostics.environment = {
      nodeEnv: process.env.NODE_ENV || 'not set',
      platform: process.platform,
      nodeVersion: process.version
    };

    return res.json(diagnostics);
  } catch (error) {
    console.error('Error getting diagnostics:', error);
    return res.status(500).json({ error: 'Error getting diagnostics', details: error.message });
  }
});

export default router;

/**
 * Speak Routes
 *
 * Handles all routes related to text-to-speech functionality.
 */

import express from 'express';
import mongoose from 'mongoose';
import { synthesizeSpeech } from '../services/textToSpeech.js';
import Transcript from '../models/transcript.js';
import cloudinary from '../config/cloudinary.js';

const router = express.Router();

/**
 * POST /api/speak
 * Converts text to speech
 */
router.post('/', async (req, res) => {
  try {
    const { text, voice } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    // Synthesize speech
    const audioBuffer = await synthesizeSpeech(text, voice);

    // Upload to Cloudinary if configured
    let audioUrl = null;
    if (cloudinary.uploader) {
      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { resource_type: 'auto', folder: 'voice-agent' },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );

        uploadStream.end(audioBuffer);
      });

      audioUrl = result.secure_url;
    }

    // Save to database if MongoDB is configured
    if (mongoose.connection.readyState === 1) {
      const ttsLog = new Transcript({
        text: text,
        audioUrl: audioUrl,
        voice: voice || 'default',
        type: 'tts'
      });

      await ttsLog.save();
    }

    // If we have a Cloudinary URL, return it
    if (audioUrl) {
      return res.json({ audioUrl });
    }

    // Otherwise, send the audio buffer directly
    res.set('Content-Type', 'audio/mp3');
    return res.send(audioBuffer);
  } catch (error) {
    console.error('Error synthesizing speech:', error);
    return res.status(500).json({ error: 'Error synthesizing speech' });
  }
});

export default router;

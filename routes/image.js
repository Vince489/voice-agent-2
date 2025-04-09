/**
 * Image Routes
 *
 * Handles all routes related to image processing and analysis.
 */

import express from 'express';
import multer from 'multer';
import { analyzeImage } from '../services/imageAnalysis.js';
import { synthesizeSpeech } from '../services/textToSpeech.js';
import cloudinary from '../config/cloudinary.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

/**
 * POST /api/image/analyze
 * Analyzes an uploaded image
 */
router.post('/analyze', upload.single('image'), async (req, res) => {
  try {
    // Check if image was uploaded
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    // Get prompt from request body or use default
    const prompt = req.body.prompt || 'Describe this image.';

    // Analyze the image
    const analysisText = await analyzeImage(
      req.file.buffer,
      req.file.mimetype,
      prompt
    );

    // Generate speech from the analysis text
    const audioBuffer = await synthesizeSpeech(analysisText);

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

    // Return the analysis result and audio URL
    res.json({
      text: analysisText,
      audioUrl: audioUrl
    });
  } catch (error) {
    console.error('Error processing image:', error);
    res.status(500).json({ error: `Failed to process image: ${error.message}` });
  }
});

export default router;

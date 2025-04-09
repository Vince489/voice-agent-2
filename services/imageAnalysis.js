/**
 * Image Analysis Service
 *
 * Provides functionality for analyzing images using Google's Generative AI.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

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

/**
 * Analyze an image with optional prompt
 * @param {Buffer} imageBuffer - The image buffer
 * @param {string} mimeType - The MIME type of the image
 * @param {string} prompt - Optional prompt to guide the analysis
 * @returns {Promise<string>} - The analysis result
 */
export async function analyzeImage(imageBuffer, mimeType, prompt = "Describe this image.") {
  try {
    // Convert image buffer to base64
    const base64Image = imageBuffer.toString('base64');
    
    // Prepare the image data
    const image = {
      inlineData: {
        data: base64Image,
        mimeType: mimeType,
      },
    };

    // Generate content using the model
    const result = await model.generateContent([prompt, image]);
    const response = result.response;
    return response.text();
  } catch (error) {
    console.error('Error analyzing image:', error);
    throw new Error(`Failed to analyze image: ${error.message}`);
  }
}

export default {
  analyzeImage
};

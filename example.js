import fs from 'fs';
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Initialize the Google AI model with API key
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// Configure the Gemini 1.5 Flash model
const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
  generationConfig: {
    temperature: 0.7,
    topK: 40,
    topP: 0.95,
    maxOutputTokens: 1024,
  }
});

async function analyzeImage() {
  try {
    const prompt = "Describe this image.";
    const image = {
      inlineData: {
        data: Buffer.from(fs.readFileSync("her.png")).toString("base64"),
        mimeType: "image/png",
      },
    };

    // Generate content using the model
    const result = await model.generateContent([prompt, image]);
    const response = result.response;
    console.log(response.text());
  } catch (error) {
    console.error('Error analyzing image:', error);
  }
}

// Execute the function
analyzeImage();
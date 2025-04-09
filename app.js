/**
 * Voice Agent - Main Express Application
 *
 * This is the entry point for the Voice Agent application.
 * It sets up the Express server and connects all the routes.
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

// Import routes
import transcribeRoutes from './routes/transcribe.js';
import speakRoutes from './routes/speak.js';
import agentRoutes from './routes/agent.js';

// Load environment variables
dotenv.config();

// Debug environment variables
console.log('Environment variables loaded:');
console.log('GOOGLE_API_KEY:', process.env.GOOGLE_API_KEY ? 'Set' : 'Not set');
console.log('GOOGLE_APPLICATION_CREDENTIALS:', process.env.GOOGLE_APPLICATION_CREDENTIALS || 'Not set');
console.log('GOOGLE_CLOUD_CREDENTIALS:', process.env.GOOGLE_CLOUD_CREDENTIALS ? 'Set' : 'Not set');

// Get the directory name (for ES modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set Google Cloud credentials directly
const credentialsPath = path.join(__dirname, 'credentials.json');
console.log(`Setting GOOGLE_APPLICATION_CREDENTIALS to: ${credentialsPath}`);
process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsPath;

// Create Express app
const app = express();
const PORT = process.env.PORT || 3080; // Changed port to 3080

// Directory name is already defined above

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Connect to MongoDB
const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
if (mongoUri) {
  mongoose.connect(mongoUri)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));
} else {
  console.log('MongoDB URI not provided, running without database');
}

// Routes
app.use('/api/transcribe', transcribeRoutes);
app.use('/api/speak', speakRoutes);
app.use('/api/agent', agentRoutes);

// Root route - serve the main HTML page (Virtra UI)
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Backup route for accessing the original example-ui.html
app.get('/example', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'example-ui.html'));
});

// Routes for accessing backup UIs
app.get('/backup/simple', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'backup', 'simple-ui.html'));
});

app.get('/backup/original', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'backup', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Voice Agent server running on http://localhost:${PORT}`);
});

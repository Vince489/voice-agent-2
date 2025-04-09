/**
 * Transcript Model
 * 
 * MongoDB schema for storing transcripts and TTS logs.
 */

import mongoose from 'mongoose';

const transcriptSchema = new mongoose.Schema({
  // Common fields
  text: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['transcription', 'tts'],
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  // Transcription-specific fields
  audioLength: {
    type: Number,
    default: 0
  },
  confidence: {
    type: Number,
    default: 0
  },
  
  // TTS-specific fields
  audioUrl: {
    type: String
  },
  voice: {
    type: String
  }
});

// Create indexes for faster queries
transcriptSchema.index({ createdAt: -1 });
transcriptSchema.index({ type: 1 });

const Transcript = mongoose.model('Transcript', transcriptSchema);

export default Transcript;

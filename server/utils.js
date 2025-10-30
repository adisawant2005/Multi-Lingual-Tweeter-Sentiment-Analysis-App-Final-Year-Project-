import express, { response } from 'express';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import csvParser from 'csv-parser';

dotenv.config();

const app = express();
app.use(express.json());

const START_INDEX = 0;
const MAX_ROWS = 100;

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Function to parse CSV file
export async function parseCsv(filePath, startingIndex = 0, maxRows = 1000) {
  if (!fs.existsSync(filePath)) {
    throw new Error('CSV file not found.');
  }

  const rows = [];
  await new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csvParser())
      .on('data', (row) => rows.push(row))
      .on('end', resolve)
      .on('error', reject);
  });

  if (rows.length === 0) {
    throw new Error('CSV file is empty.');
  }

  const endIndex = Math.min(startingIndex + maxRows, rows.length);
  const sampleRows = rows.slice(startingIndex, endIndex);
  return { rows, sampleRows };
}

// Function to estimate tokens
export function estimateTokens(compactCsv) {
  return Math.ceil(compactCsv.length / 4) + 500;
}

// Function to handle errors
export function handleError(res, error) {
  console.error('Error during CSV analysis:', error);
  if (error.code === 'ENOENT') {
    res.status(404).json({ error: 'India.csv file not found.' });
  } else if (error.message.includes('token count exceeds')) {
    res.status(400).json({ error: 'Input too large for model. Try a smaller CSV or increase sampling limit.' });
  } else if (error.status === 400 && error.message.includes('response_schema')) {
    res.status(400).json({ error: 'Schema validation failed—check config.', details: error.message });
  } else {
    res.status(500).json({ error: 'Failed to process CSV file with Gemini API.', details: error.message });
  }
}

// Function to translate text using Gemini
export async function translateText(text, targetLanguage) {
  if (!text || text.length === 0 || targetLanguage.toLowerCase() === 'english') {
    return text;
  }
  
  const prompt = `Translate the following text into ${targetLanguage}. Return ONLY the translated text. Text to translate: ${text}`;

  try {
    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ parts: [{ text: prompt }] }],
      config: { temperature: 0.1 },
    });
    return result.text.trim();
  } catch (error) {
    console.error("Translation API error:", error);
    return text;
  }
}
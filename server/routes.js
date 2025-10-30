import express from 'express';
import { parseCsv, handleError, translateText } from './utils.js';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const START_INDEX = 0;
const MAX_ROWS = 100;

// Multiple tweets sentiment analysis
router.get('/analyze-multiple-tweets-sentiment', async (req, res) => {
    try {
        const csvFilePath = './India.csv';
        
        // 1. Load the data, getting 100 sample rows (tweets)
        // Ensure that rows are objects { id: '...', tweet: '...' }
        const { rows, sampleRows } = await parseCsv(csvFilePath, START_INDEX, MAX_ROWS);

        // Prepare the text data string for the prompt
        const tweetDataString = sampleRows.map(row => 
            // Using assumed object keys. Adjust indices (row[0], row[6]) if object keys aren't used.
            `ID: ${row.id || row[0]} | TEXT: ${row.tweet || row[6]}`
        ).join('\n');
        
        const totalSampledTweets = sampleRows.length;

        // 2. Construct the PROMPT with the 5-point scale and strict rules
        const prompt = [
            {
                parts: [
                    {
                        text: `**Role:** You are a **proud Indian** and a multilingual sentiment analysis expert. Your classification must reflect an informed, nuanced perspective focused on **national interest, cultural pride, and constructive commentary**.
**CRITICAL CONSTRAINT: Do not return all 3s. The score distribution must reflect genuine positive and negative sentiment based on the rules and examples provided.**

Analyze the sentiment for each of the ${totalSampledTweets} tweets provided below, regardless of the language.

**Classification Rules (5-Point Scale):** You must classify the sentiment using a numerical score from 1 to 5.

- **5 (STRONGLY POSITIVE):** Clear excitement, strong support, emphatic praise, or clear national pride/celebration.
- **4 (SLIGHTLY POSITIVE):** Expresses mild approval, light optimism, satisfaction, or a subtle celebration.
- **3 (NEUTRAL/INDETERMINATE): STRICTLY USE ONLY IF:** The tweet is a simple, non-editorialized announcement or purely data-driven factual statement. If you sense any trace of approval, dissatisfaction, or implied political/cultural stance, DO NOT use 3.
- **2 (SLIGHTLY NEGATIVE):** Expresses mild concern, constructive criticism, or minor dissatisfaction.
- **1 (STRONGLY NEGATIVE):** Clear outrage, strong condemnation, significant fear, or deep pessimism.

**FEW-SHOT EXAMPLES (MUST FOLLOW THIS SCORING LOGIC):**
ID: X1 | TEXT: The inauguration of the new highway is a major step forward for connectivity! -> SCORE: 5
ID: X2 | TEXT: The new tax policy seems a bit confusing, will it affect small businesses? -> SCORE: 2
ID: X3 | TEXT: Today, PM Modi met with global leaders at the G20 summit in Delhi. -> SCORE: 3
ID: X4 | TEXT: Very disappointing to see the poor sanitation in my city's public park. Needs urgent attention. -> SCORE: 1
ID: X5 | TEXT: Feeling good about the upcoming reforms; a step in the right direction. -> SCORE: 4

Return ONLY a single JSON object containing an array of results. The output must adhere strictly to the provided JSON Schema.

**Example JSON Structure (MUST be followed):**
{
  "sentiments": [
    { "id": "X1", "sentiment_score": 5 },
    { "id": "X2", "sentiment_score": 2 }
    // ... all 100 results must follow this pattern
  ]
}

Tweet Data (ID | TEXT):
---
${tweetDataString}
---`,
                    },,
                ],
            },
        ];

        // 3. Define the CORRECTED Structured Output Schema
        const multiSentimentSchema = {
            type: 'object',
            properties: {
                sentiments: {
                    type: 'array',
                    description: `A list of ${totalSampledTweets} sentiment score results.`,
                    // FIX IS HERE: The array 'items' must be a valid schema for an object
                    items: { 
                        type: 'object',
                        properties: {
                            id: { type: 'string', description: 'The original ID of the tweet.' },
                            sentiment_score: { 
                                type: 'integer', // Numerical score 1-5
                                description: 'The classified sentiment score (1=Strongly Negative, 5=Strongly Positive).',
                                minimum: 1, 
                                maximum: 5  
                            },
                        },
                        required: ['id', 'sentiment_score']
                    },
                },
            },
            required: ['sentiments'],
            additionalProperties: false,
        };


        // 4. Call the Gemini API
        const result = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                temperature: 0.3, 
                responseMimeType: 'application/json',
                responseSchema: multiSentimentSchema, // Use the corrected schema
            },
        });

        // 5. Parse and return the results
        const responseText = result.text;
        
        if (!responseText) {
            return res.status(500).json({ error: 'Gemini returned empty response.' });
        }

        let sentimentResults;
        try {
            sentimentResults = JSON.parse(responseText);
        } catch (parseError) {
            // Handle cases where the model might still produce malformed JSON
            console.error('Failed to parse JSON response:', responseText, parseError);
            return res.status(500).json({
                error: 'Gemini returned invalid JSON format. Check raw output.',
                geminiResponse: responseText
            });
        }

        const analysisSummary = {
            1: { count: 0, percentage: 0 },
            2: { count: 0, percentage: 0 },
            3: { count: 0, percentage: 0 },
            4: { count: 0, percentage: 0 },
            5: { count: 0, percentage: 0 }
        };

        const sentiments = sentimentResults.sentiments || [];
        const actualCount = sentiments.length;

        if (actualCount > 0) {
            // 5a. Calculate the count for each score
            sentiments.forEach(item => {
                const score = item.sentiment_score;
                if (score >= 1 && score <= 5) {
                    analysisSummary[score].count += 1;
                }
            });

            // 5b. Calculate the percentage for each score
            for (const score in analysisSummary) {
                const count = analysisSummary[score].count;
                // Round percentage to 2 decimal places
                analysisSummary[score].percentage = parseFloat(((count / actualCount) * 100).toFixed(2));
            }
        }

        res.json({
            count: actualCount, // Use the actual count of results
            summary: analysisSummary, 
            results: sentiments // Rename for clarity
        });

    } catch (error) {
        handleError(res, error);
    }
});

// Trend analysis
router.get('/analyze-trends', async (req, res) => {
    try {
        // Get the requested translation language from the query parameter
        const targetLanguage = req.query.lang;
        
        const csvFilePath = './India.csv';
        // Ensure parseCsv is available and correctly implemented
        const { rows, sampleRows } = await parseCsv(csvFilePath, START_INDEX, MAX_ROWS);

        // --- 1. Define the CORRECTED JSON structure for the prompt ---
        // We are aiming for a list of objects, not a list of quoted strings.
        const analysisPrompt = [
            {
                parts: [
                    {
                        text: `Analyze the trends in the following tweeter CSV data:

${sampleRows.map((row) => Object.values(row).join(',')).join('\n')}

Identify 2-3 significant trends. Return the trends with their description in ENGLISH ONLY in the following JSON format:

{
  "trends": [
    { "title": "Trend Title 1", "description": "Detailed description of the first trend." },
    { "title": "Trend Title 2", "description": "Detailed description of the second trend." }
  ]
}`,
                    },
                ],
            },
        ];

        // --- 2. Define the CORRECTED JSON Schema ---
        const analysisResponseSchema = {
            type: 'object',
            properties: {
                trends: {
                    type: 'array',
                    description: 'A list of key trends identified in the data.',
                    items: {
                        type: 'object',
                        properties: {
                            title: { type: 'string', description: 'A concise title for the trend.' },
                            description: { type: 'string', description: 'A detailed explanation of the trend.' },
                        },
                        required: ['title', 'description']
                    },
                },
            },
            required: ['trends'],
        };

        // --- 3. Call the Gemini API for Analysis ---
        const result = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: analysisPrompt,
            config: {
                temperature: 0.1,
                responseMimeType: 'application/json',
                responseSchema: analysisResponseSchema,
            },
        });

        const responseText = result.text;
        // Parse the JSON response from the model
        let trendsResult = JSON.parse(responseText);

        // --- 4. Optional: Translate the results if a targetLanguage is provided ---
        if (targetLanguage && targetLanguage.toLowerCase() !== 'english') {
            const translatedTrends = [];
            
            // Loop through each trend object
            for (const trend of trendsResult.trends) {
                const translatedTitle = await translateText(trend.title, targetLanguage);
                const translatedDescription = await translateText(trend.description, targetLanguage);
                
                translatedTrends.push({
                    title: translatedTitle,
                    description: translatedDescription
                });
            }
            // Replace the English trends with the translated ones
            trendsResult.trends = translatedTrends;
        }

        // --- 5. Send the final response ---
        res.json(trendsResult);
    } catch (error) {
        console.error('Error in /analyze-trends-india-csv:', error);
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
});

// Generate insights
router.get('/generate-insights', async (req, res) => {
  try {
    const csvFilePath = './India.csv';
    const { rows, sampleRows } = await parseCsv(csvFilePath, START_INDEX, MAX_ROWS);
    const lang = req.query.lang || 'english';

    const prompt = [
      {
        parts: [
          {
            text: `Generate insights from the following tweeter CSV data:

${sampleRows.map((row) => Object.values(row).join(',')).join('\n')}

Return the insights in the following JSON format:

{
  "insights": ["Insight 1: Notable trend or observation.", "Insight 2: Any shift in data or unusual pattern."]
}`,
          },
        ],
      },
    ];

    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'object',
          properties: {
            insights: {
              type: 'array',
              items: {
                type: 'string',
              },
            },
          },
        },
      },
    });

    const responseText = result.text;
    const insights = JSON.parse(responseText).insights;

    if (lang.toLowerCase() !== 'english') {
      const translatedInsights = await Promise.all(insights.map((insight) => translateText(insight, lang)));
      res.json({ insights: translatedInsights });
    } else {
      res.json({ insights });
    }
  } catch (error) {
    handleError(res, error);
  }
});

// Generate summary
router.get('/generate-summary', async (req, res) => {
  try {
    const csvFilePath = './India.csv';
    const { rows, sampleRows } = await parseCsv(csvFilePath, START_INDEX, MAX_ROWS);
    const lang = req.query.lang || 'english';

    const prompt = [
      {
        parts: [
          {
            text: `Generate a short summary of the key findings from the following tweeter CSV data:

${sampleRows.map((row) => Object.values(row).join(',')).join('\n')}

Return the summary in the following JSON format:

{
  "summary": "Short overall summary of key findings from the data."
}`,
          },
        ],
      },
    ];

    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'object',
          properties: {
            summary: {
              type: 'string',
            },
          },
        },
      },
    });

    const responseText = result.text;
    const summary = JSON.parse(responseText).summary;

    if (lang.toLowerCase() !== 'english') {
      const translatedSummary = await translateText(summary, lang);
      res.json({ summary: translatedSummary });
    } else {
      res.json({ summary });
    }
  } catch (error) {
    handleError(res, error);
  }
});

export default router;
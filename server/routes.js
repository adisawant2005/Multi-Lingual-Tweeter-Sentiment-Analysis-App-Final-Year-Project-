import express from 'express';
import { parseCsv, handleError, translateText } from './utils.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();
const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const START_INDEX = 0;
const MAX_ROWS = 100;

// Multiple tweets sentiment analysis
router.get('/analyze-multiple-tweets-sentiment', async (req, res) => {
    try {
        const csvFilePath = './India.csv';
        const { rows, sampleRows } = await parseCsv(csvFilePath, START_INDEX, MAX_ROWS);

        const tweetDataString = sampleRows.map(row => 
            `ID: ${row.id || row[0]} | TEXT: ${row.tweet || row[6]}`
        ).join('\n');
        
        const totalSampledTweets = sampleRows.length;

        const prompt = [
            {
                parts: [
                    {
                        text: `**Role:** You are a **proud Indian** and a multilingual sentiment analysis expert. Your classification must reflect an informed, nuanced perspective focused on **national interest, cultural pride, and constructive commentary**.
**CRITICAL CONSTRAINT: Do not return all 3s. The score distribution must reflect genuine positive and negative sentiment based on the rules and examples provided.**

Analyze the sentiment for each of the ${totalSampledTweets} tweets provided below, regardless of the language.

**Classification Rules (5-Point Scale):**
- **5 (STRONGLY POSITIVE):** Clear excitement, strong support, emphatic praise, or clear national pride/celebration.
- **4 (SLIGHTLY POSITIVE):** Expresses mild approval, light optimism, satisfaction, or a subtle celebration.
- **3 (NEUTRAL/INDETERMINATE): STRICTLY USE ONLY IF:** The tweet is a simple, non-editorialized announcement or purely data-driven factual statement.
- **2 (SLIGHTLY NEGATIVE):** Expresses mild concern, constructive criticism, or minor dissatisfaction.
- **1 (STRONGLY NEGATIVE):** Clear outrage, strong condemnation, significant fear, or deep pessimism.

Tweet Data (ID | TEXT):
---
${tweetDataString}
---`,
                    },
                ],
            },
        ];

        const multiSentimentSchema = {
            type: 'object',
            properties: {
                sentiments: {
                    type: 'array',
                    description: `A list of ${totalSampledTweets} sentiment score results.`,
                    items: { 
                        type: 'object',
                        properties: {
                            id: { type: 'string', description: 'The original ID of the tweet.' },
                            sentiment_score: { 
                                type: 'integer',
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

        const model = ai.getGenerativeModel({ model: "gemini-pro" });
        const result = await model.generateContent(prompt);
        const response = await result.response;

        const responseText = response.text();
        
        if (!responseText) {
            return res.status(500).json({ error: 'Gemini returned empty response.' });
        }

        const sentimentResults = JSON.parse(responseText);
        const analysisSummary = {
            1: { count: 0, percentage: 0 },
            2: { count: 0, percentage: 0 },
            3: { count: 0, percentage: 0 },
            4: { count: 0, percentage: 0 },
            5: { count: 0, percentage: 0 }
        };

        const sentiments = sentimentResults.sentiments || [];
        const actualCount = sentiments.length;

        sentiments.forEach(item => {
            const score = item.sentiment_score;
            if (score >= 1 && score <= 5) {
                analysisSummary[score].count += 1;
            }
        });

        for (const score in analysisSummary) {
            const count = analysisSummary[score].count;
            analysisSummary[score].percentage = parseFloat(((count / actualCount) * 100).toFixed(2));
        }

        res.json({
            count: actualCount,
            summary: analysisSummary, 
            results: sentiments
        });

    } catch (error) {
        handleError(res, error);
    }
});

// Trend analysis
router.get('/analyze-trends', async (req, res) => {
    try {
        const targetLanguage = req.query.lang;
        const csvFilePath = './India.csv';
        const { rows, sampleRows } = await parseCsv(csvFilePath, START_INDEX, MAX_ROWS);

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
}`
                    },
                ],
            },
        ];

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

        const model = ai.getGenerativeModel({ model: "gemini-pro" });
        const result = await model.generateContent(analysisPrompt);
        const response = await result.response;

        let trendsResult = JSON.parse(response.text());

        if (targetLanguage && targetLanguage.toLowerCase() !== 'english') {
            const translatedTrends = await Promise.all(
                trendsResult.trends.map(async trend => ({
                    title: await translateText(trend.title, targetLanguage),
                    description: await translateText(trend.description, targetLanguage)
                }))
            );
            trendsResult.trends = translatedTrends;
        }

        res.json(trendsResult);
    } catch (error) {
        handleError(res, error);
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
}`
                    },
                ],
            },
        ];

        const model = ai.getGenerativeModel({ model: "gemini-pro" });
        const result = await model.generateContent(prompt);
        const response = await result.response;

        const insights = JSON.parse(response.text()).insights;

        if (lang.toLowerCase() !== 'english') {
            const translatedInsights = await Promise.all(
                insights.map(insight => translateText(insight, lang))
            );
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
}`
                    },
                ],
            },
        ];

        const model = ai.getGenerativeModel({ model: "gemini-pro" });
        const result = await model.generateContent(prompt);
        const response = await result.response;

        const summary = JSON.parse(response.text()).summary;

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
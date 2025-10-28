import express from 'express';
import routes from './routes.js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

// Use routes
app.use('/api', routes);

// Welcome route
app.get('/', (req, res) => {
  res.send(`
    <h1>FYP App API</h1>
    <h2>Available Endpoints:</h2>
    <ul>
      <li><code>/api/analyze-multiple-tweets-sentiment</code> - Analyze sentiment of multiple tweets</li>
      <li><code>/api/analyze-trends?lang=hindi</code> - Analyze trends (optional language parameter)</li>
      <li><code>/api/generate-insights?lang=marathi</code> - Generate insights (optional language parameter)</li>
      <li><code>/api/generate-summary?lang=gujarati</code> - Generate summary (optional language parameter)</li>
    </ul>
  `);
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export default app;
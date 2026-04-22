import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import analyzeRouter from './routes/analyze';
import feedbackRouter from './routes/feedback';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = ['http://localhost:5173'];
if (process.env.CLIENT_URL) allowedOrigins.push(process.env.CLIENT_URL);

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'Syntaxis API is running' });
});

app.use('/api/analyze', analyzeRouter);
app.use('/api/feedback', feedbackRouter);

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Syntaxis server running on http://localhost:${PORT}`);
  });
}

export default app;

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import analyzeRouter from './routes/analyze';

dotenv.config();

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

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Syntaxis server running on http://localhost:${PORT}`);
  });
}

export default app;

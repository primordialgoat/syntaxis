import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import analyzeRouter from './routes/analyze';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'Syntaxis API is running' });
});

app.use('/api/analyze', analyzeRouter);

app.listen(PORT, () => {
  console.log(`Syntaxis server running on http://localhost:${PORT}`);
});

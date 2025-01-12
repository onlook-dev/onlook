import express from 'express';
import cors from 'cors';
import apiRouter from './routes/api';

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use('/api', apiRouter);

app.listen(port, () => {
  console.log(`Backend server running on port ${port}`);
});

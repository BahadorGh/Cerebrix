import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'Backend is running' });
});

// TODO: add routes

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
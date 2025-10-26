import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import agentRoutes from './routes/agent.routes';
import { contractService } from './services/contract.service';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Initialize services
contractService.initialize().catch(console.error);

// Routes
app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'Backend is running' });
});

app.use('/api/agents', agentRoutes);

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
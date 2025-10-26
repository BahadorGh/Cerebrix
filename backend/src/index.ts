import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import agentRoutes from './routes/agent.routes';
import { contractService } from './services/contract.service';
import { handleAgentRegistered } from './handlers/registration.handler';
import { handleAgentExecuted } from './handlers/execution.handler';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Initialize services
async function initializeServices() {
    console.log('🚀 Initializing services...');

    await contractService.initialize();

    // Start listening to events
    contractService.listenToEvents((event) => {
        if (event.type === 'AgentRegistered') {
            handleAgentRegistered(event);
        } else if (event.type === 'AgentExecuted') {
            handleAgentExecuted(event);
        }
    });

    console.log('✅ Services initialized\n');
}

initializeServices().catch(console.error);

// Routes
app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'Backend is running' });
});

app.use('/api/agents', agentRoutes);

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
import { Router } from 'express';
import { contractService } from '../services/contract.service';
import { db } from '../services/database.service';

const router = Router();

// Get all agents
router.get('/', async (req, res) => {
    try {
        const agents = await db.getAgents();

        // If no agents in DB, try to fetch from contract
        if (agents.length === 0) {
            const total = await contractService.getTotalAgents();
            console.log(`Found ${total} agents on-chain`);
        }

        res.json(agents);
    } catch (error) {
        console.error('Error fetching agents:', error);
        res.status(500).json({ error: 'Failed to fetch agents' });
    }
});

// Get single agent
router.get('/:id', async (req, res) => {
    try {
        const agentId = parseInt(req.params.id);
        let agent = await db.getAgent(agentId);

        // If not in DB, fetch from contract
        if (!agent) {
            const onChainAgent = await contractService.getAgent(agentId);
            agent = {
                id: agentId,
                name: `Agent ${agentId}`,
                description: 'AI Agent',
                ...onChainAgent,
                deployments: [],
                executions: [],
            };
        }

        res.json(agent);
    } catch (error) {
        console.error('Error fetching agent:', error);
        res.status(500).json({ error: 'Failed to fetch agent' });
    }
});

export default router;
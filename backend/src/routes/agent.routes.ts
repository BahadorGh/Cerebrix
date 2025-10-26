import { Router } from 'express';
import { contractService } from '../services/contract.service';
import { db } from '../services/database.service';

const router = Router();

// Get all agents
router.get('/', async (req, res) => {
    try {
        const agents = await db.getAgents();
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

// Get execution results for an agent
router.get('/:id/executions', async (req, res) => {
    try {
        const agentId = parseInt(req.params.id);
        const agent = await db.getAgent(agentId);

        if (!agent) {
            return res.status(404).json({ error: 'Agent not found' });
        }

        res.json(agent.executions || []);
    } catch (error) {
        console.error('Error fetching executions:', error);
        res.status(500).json({ error: 'Failed to fetch executions' });
    }
});

export default router;
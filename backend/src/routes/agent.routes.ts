import { Router } from 'express';
import { contractService } from '../services/contract.service';

const router = Router();

// Get all agents
router.get('/', async (req, res) => {
    try {
        // TODO: implement list agents
        res.json({ agents: [] });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch agents' });
    }
});

// Get single agent
router.get('/:id', async (req, res) => {
    try {
        const agentId = parseInt(req.params.id);
        const agent = await contractService.getAgent(agentId);

        res.json({
            id: agentId,
            ...agent,
            name: `Agent ${agentId}`, // TODO: fetch from metadata
            description: 'AI Agent',
        });
    } catch (error) {
        console.error('Error fetching agent:', error);
        res.status(500).json({ error: 'Failed to fetch agent' });
    }
});

export default router;
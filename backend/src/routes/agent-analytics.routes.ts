import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { validateRequest } from '../middleware/validation';
import { blockscoutService, contractService } from '../services';

const router = Router();

// Validation schema
const getAgentAnalyticsSchema = z.object({
    params: z.object({
        agentId: z.string().transform(val => parseInt(val)),
    }),
    query: z.object({
        chainId: z.string().optional().transform(val => val ? parseInt(val) : 31337),
    }),
});

/**
 * GET /api/agent-analytics/:agentId
 * Get Blockscout analytics for an agent (works without database)
 */
router.get('/:agentId', validateRequest(getAgentAnalyticsSchema), async (req: Request, res: Response) => {
    try {
        const { agentId } = req.params;
        const { chainId = 31337 } = req.query;

        // Get agent from contract
        const agent = await contractService.getAgent(Number(agentId));

        // Get Blockscout analytics using AgentRegistry address
        const AGENT_REGISTRY_ADDRESS = process.env.AGENT_REGISTRY_ADDRESS || '0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e';
        const blockscoutData = await blockscoutService.getAgentAnalytics(
            AGENT_REGISTRY_ADDRESS,
            Number(chainId)
        );

        res.json({
            agentId: Number(agentId),
            owner: agent.owner,
            totalExecutions: Number(agent.totalExecutions),
            totalRevenue: agent.totalRevenue.toString(),
            blockscoutAnalytics: blockscoutData,
        });
    } catch (error: any) {
        console.error('❌ Failed to fetch agent analytics:', error);
        res.status(500).json({ error: 'Failed to fetch agent analytics', details: error.message });
    }
});

export default router;

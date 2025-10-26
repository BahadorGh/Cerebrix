import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { validateRequest } from '../middleware/validation';
import { prisma, blockscoutService } from '../services';

const router = Router();

// Validation schemas
const getAnalyticsSchema = z.object({
    query: z.object({
        page: z.string().optional().transform(val => val ? parseInt(val) : 1),
        limit: z.string().optional().transform(val => val ? parseInt(val) : 50),
        agentId: z.string().optional().transform(val => val ? parseInt(val) : undefined),
        eventType: z.string().optional(),
        chainId: z.string().optional().transform(val => val ? parseInt(val) : undefined),
    }),
});

const getAgentAnalyticsSchema = z.object({
    params: z.object({
        agentId: z.string().transform(val => parseInt(val)),
    }),
});

/**
 * GET /api/analytics
 * Get paginated analytics events
 */
router.get('/', validateRequest(getAnalyticsSchema), async (req: Request, res: Response) => {
    try {
        const { page = 1, limit = 50, agentId, eventType, chainId } = req.query;
        const offset = (Number(page) - 1) * Number(limit);

        const where: any = {};
        if (agentId) where.agentId = Number(agentId);
        if (eventType) where.eventType = eventType;
        if (chainId) where.chainId = Number(chainId);

        const [events, total] = await Promise.all([
            prisma.analytics.findMany({
                where,
                skip: offset,
                take: Number(limit),
                orderBy: { timestamp: 'desc' },
            }),
            prisma.analytics.count({ where }),
        ]);

        res.json({
            events,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages: Math.ceil(total / Number(limit)),
            },
        });
    } catch (error: any) {
        console.error('❌ Failed to fetch analytics:', error);
        res.status(500).json({ error: 'Failed to fetch analytics', details: error.message });
    }
});

/**
 * GET /api/analytics/agent/:agentId
 * Get comprehensive analytics for an agent
 */
router.get('/agent/:agentId', validateRequest(getAgentAnalyticsSchema), async (req: Request, res: Response) => {
    try {
        const { agentId } = req.params;

        // Get agent details
        const agent = await prisma.agent.findUnique({
            where: { agentId: Number(agentId) },
            include: {
                deployments: true,
                _count: {
                    select: { executions: true },
                },
            },
        });

        if (!agent) {
            return res.status(404).json({ error: 'Agent not found' });
        }

        // Get execution statistics
        const executionStats = await prisma.execution.groupBy({
            by: ['status'],
            where: { agentId: agent.id },
            _count: true,
        });

        // Get revenue over time (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const revenueOverTime = await prisma.execution.findMany({
            where: {
                agentId: agent.id,
                status: 'COMPLETED',
                executedAt: { gte: thirtyDaysAgo },
            },
            select: {
                amount: true,
                executedAt: true,
            },
            orderBy: { executedAt: 'asc' },
        });

        // Get unique users
        const uniqueUsers = await prisma.execution.findMany({
            where: { agentId: agent.id },
            select: { executor: true },
            distinct: ['executor'],
        });

        // Get Blockscout analytics (if deployed on-chain)
        let blockscoutAnalytics = null;
        const mainDeployment = agent.deployments.find(d => d.chainId === 1);
        if (mainDeployment) {
            blockscoutAnalytics = await blockscoutService.getAgentAnalytics(
                mainDeployment.deploymentAddress
            );
        }

        res.json({
            agent: {
                id: agent.agentId,
                owner: agent.owner,
                totalExecutions: agent.totalExecutions,
                totalRevenue: agent.totalRevenue,
                isActive: agent.isActive,
            },
            statistics: {
                totalExecutions: agent._count.executions,
                uniqueUsers: uniqueUsers.length,
                deployedChains: agent.deployments.length,
                executionsByStatus: executionStats.reduce((acc, stat) => {
                    acc[stat.status] = stat._count;
                    return acc;
                }, {} as Record<string, number>),
            },
            revenueOverTime: revenueOverTime.map(r => ({
                date: r.executedAt,
                amount: r.amount,
            })),
            blockscoutData: blockscoutAnalytics,
        });
    } catch (error: any) {
        console.error('❌ Failed to fetch agent analytics:', error);
        res.status(500).json({ error: 'Failed to fetch agent analytics', details: error.message });
    }
});

/**
 * GET /api/analytics/dashboard
 * Get overall platform analytics
 */
router.get('/dashboard', async (req: Request, res: Response) => {
    try {
        const [
            totalAgents,
            activeAgents,
            totalExecutions,
            totalRevenue,
            recentActivity,
        ] = await Promise.all([
            prisma.agent.count(),
            prisma.agent.count({ where: { isActive: true } }),
            prisma.execution.count(),
            prisma.execution.aggregate({
                where: { status: 'COMPLETED' },
                _sum: { amount: true },
            }),
            prisma.execution.findMany({
                take: 10,
                orderBy: { executedAt: 'desc' },
                include: {
                    agent: {
                        select: {
                            agentId: true,
                            metadataCached: true,
                        },
                    },
                },
            }),
        ]);

        res.json({
            overview: {
                totalAgents,
                activeAgents,
                totalExecutions,
                totalRevenue: totalRevenue._sum.amount || '0',
            },
            recentActivity,
        });
    } catch (error: any) {
        console.error('❌ Failed to fetch dashboard analytics:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard analytics', details: error.message });
    }
});

export default router;

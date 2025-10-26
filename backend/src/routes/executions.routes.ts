import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { validateRequest } from '../middleware/validation';
import { prisma } from '../services';

const router = Router();

// Validation schemas
const getExecutionsSchema = z.object({
    query: z.object({
        page: z.string().optional().transform(val => val ? parseInt(val) : 1),
        limit: z.string().optional().transform(val => val ? parseInt(val) : 20),
        agentId: z.string().optional().transform(val => val ? parseInt(val) : undefined),
        executor: z.string().optional(),
        status: z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED']).optional(),
    }),
});

const getExecutionSchema = z.object({
    params: z.object({
        executionId: z.string().transform(val => parseInt(val)),
    }),
});

/**
 * GET /api/executions
 * Get paginated list of executions
 */
router.get('/', validateRequest(getExecutionsSchema), async (req: Request, res: Response) => {
    try {
        const { page = 1, limit = 20, agentId, executor, status } = req.query;
        const offset = (Number(page) - 1) * Number(limit);

        try {
            const where: any = {};
            if (agentId) where.agentId = Number(agentId);
            if (executor) where.executor = executor;
            if (status) where.status = status;

            const [executions, total] = await Promise.all([
                prisma.execution.findMany({
                    where,
                    skip: offset,
                    take: Number(limit),
                    orderBy: { executedAt: 'desc' },
                    include: {
                        agent: {
                            select: {
                                agentId: true,
                                metadataURI: true,
                                metadataCached: true,
                            },
                        },
                    },
                }),
                prisma.execution.count({ where }),
            ]);

            res.json({
                executions,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total,
                    totalPages: Math.ceil(total / Number(limit)),
                },
            });
        } catch (dbError) {
            console.warn('⚠️  Database query failed, returning empty executions');
            res.json({
                executions: [],
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total: 0,
                    totalPages: 0,
                },
                warning: 'Database not available'
            });
        }
    } catch (error: any) {
        console.error('❌ Failed to fetch executions:', error);
        res.status(500).json({ error: 'Failed to fetch executions', details: error.message });
    }
});

/**
 * GET /api/executions/:executionId
 * Get specific execution details
 */
router.get('/:executionId', validateRequest(getExecutionSchema), async (req: Request, res: Response) => {
    try {
        const { executionId } = req.params;

        try {
            const execution = await prisma.execution.findUnique({
                where: { id: Number(executionId) },
                include: {
                    agent: true,
                },
            });

            if (!execution) {
                return res.status(404).json({ error: 'Execution not found' });
            }

            res.json(execution);
        } catch (dbError) {
            console.warn('⚠️  Database query failed');
            res.status(404).json({ error: 'Execution not found', message: 'Database not available' });
        }
    } catch (error: any) {
        console.error('❌ Failed to fetch execution:', error);
        res.status(500).json({ error: 'Failed to fetch execution', details: error.message });
    }
});

/**
 * GET /api/executions/tx/:txHash
 * Get execution by transaction hash
 */
router.get('/tx/:txHash', async (req: Request, res: Response) => {
    try {
        const { txHash } = req.params;

        try {
            const execution = await prisma.execution.findUnique({
                where: { txHash },
                include: {
                    agent: true,
                },
            });

            if (!execution) {
                return res.status(404).json({ error: 'Execution not found' });
            }

            res.json(execution);
        } catch (dbError) {
            console.warn('⚠️  Database query failed');
            res.status(404).json({ error: 'Execution not found', message: 'Database not available' });
        }
    } catch (error: any) {
        console.error('❌ Failed to fetch execution:', error);
        res.status(500).json({ error: 'Failed to fetch execution', details: error.message });
    }
});

export default router;

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { validateRequest } from '../middleware/validation';
import { prisma, nexusService } from '../services';

const router = Router();

// Validation schemas
const getBridgeTransactionsSchema = z.object({
    query: z.object({
        page: z.string().optional().transform(val => val ? parseInt(val) : 1),
        limit: z.string().optional().transform(val => val ? parseInt(val) : 20),
        fromAddress: z.string().optional(),
        status: z.enum(['PENDING', 'BRIDGING', 'COMPLETED', 'FAILED']).optional(),
    }),
});

const getBridgeStatusSchema = z.object({
    params: z.object({
        txHash: z.string(),
    }),
});

/**
 * GET /api/bridge/transactions
 * Get paginated list of bridge transactions
 */
router.get('/transactions', validateRequest(getBridgeTransactionsSchema), async (req: Request, res: Response) => {
    try {
        const { page = 1, limit = 20, fromAddress, status } = req.query;
        const offset = (Number(page) - 1) * Number(limit);

        const where: any = {};
        if (fromAddress) where.fromAddress = fromAddress;
        if (status) where.status = status;

        const [transactions, total] = await Promise.all([
            prisma.bridgeTransaction.findMany({
                where,
                skip: offset,
                take: Number(limit),
                orderBy: { createdAt: 'desc' },
            }),
            prisma.bridgeTransaction.count({ where }),
        ]);

        res.json({
            transactions,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages: Math.ceil(total / Number(limit)),
            },
        });
    } catch (error: any) {
        console.error('❌ Failed to fetch bridge transactions:', error);
        res.status(500).json({ error: 'Failed to fetch bridge transactions', details: error.message });
    }
});

/**
 * GET /api/bridge/status/:txHash
 * Get bridge transaction status
 */
router.get('/status/:txHash', validateRequest(getBridgeStatusSchema), async (req: Request, res: Response) => {
    try {
        const { txHash } = req.params;

        // Check database first
        const dbTransaction = await prisma.bridgeTransaction.findUnique({
            where: { bridgeTxHash: txHash },
        });

        if (!dbTransaction) {
            return res.status(404).json({ error: 'Bridge transaction not found' });
        }

        // Get updated status from Nexus
        const nexusStatus = await nexusService.getBridgeStatus(txHash);

        // Update database if status changed
        if (nexusStatus.status.toUpperCase() !== dbTransaction.status) {
            await prisma.bridgeTransaction.update({
                where: { bridgeTxHash: txHash },
                data: {
                    status: nexusStatus.status.toUpperCase() as any,
                    ...(nexusStatus.status === 'completed' && { completedAt: new Date() }),
                },
            });
        }

        res.json({
            ...dbTransaction,
            status: nexusStatus.status,
            details: nexusStatus.details,
        });
    } catch (error: any) {
        console.error('❌ Failed to fetch bridge status:', error);
        res.status(500).json({ error: 'Failed to fetch bridge status', details: error.message });
    }
});

/**
 * GET /api/bridge/chains
 * Get supported chains for bridging
 */
router.get('/chains', async (req: Request, res: Response) => {
    try {
        const chains = nexusService.getSupportedChains();
        res.json({ chains });
    } catch (error: any) {
        console.error('❌ Failed to fetch supported chains:', error);
        res.status(500).json({ error: 'Failed to fetch supported chains', details: error.message });
    }
});

/**
 * GET /api/bridge/balance/:address
 * Get unified balance across chains
 */
router.get('/balance/:address', async (req: Request, res: Response) => {
    try {
        const { address } = req.params;

        const balance = await nexusService.getUnifiedBalance(address);

        res.json(balance);
    } catch (error: any) {
        console.error('❌ Failed to fetch unified balance:', error);
        res.status(500).json({ error: 'Failed to fetch unified balance', details: error.message });
    }
});

export default router;

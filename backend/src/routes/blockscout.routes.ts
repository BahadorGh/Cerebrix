import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { validateRequest } from '../middleware/validation';
import { blockscoutService } from '../services';

const router = Router();

// Validation schemas
const getTxSchema = z.object({
    params: z.object({
        txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
    }),
    query: z.object({
        chainId: z.string().optional().transform(val => val ? parseInt(val) : 1),
    }),
});

const getAddressSchema = z.object({
    params: z.object({
        address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
    }),
    query: z.object({
        chainId: z.string().optional().transform(val => val ? parseInt(val) : 1),
    }),
});

/**
 * GET /api/blockscout/explorer-url/:txHash
 * Get Blockscout explorer URL for a transaction
 */
router.get('/explorer-url/:txHash', validateRequest(getTxSchema), async (req: Request, res: Response) => {
    try {
        const { txHash } = req.params;
        const { chainId = 1 } = req.query;

        // Map chain IDs to Blockscout instances
        const explorerUrls: Record<number, string> = {
            1: 'https://eth.blockscout.com',
            11155111: 'https://sepolia.blockscout.com', // Sepolia
            42161: 'https://arbitrum.blockscout.com', // Arbitrum One
            10: 'https://optimism.blockscout.com', // Optimism
            8453: 'https://base.blockscout.com', // Base
            31337: 'http://localhost:4000', // Anvil (local Blockscout)
        };

        const baseUrl = explorerUrls[Number(chainId)] || explorerUrls[1];
        const url = `${baseUrl}/tx/${txHash}`;

        res.json({
            url,
            chainId: Number(chainId),
            txHash,
        });
    } catch (error: any) {
        console.error('❌ Failed to get explorer URL:', error);
        res.status(500).json({ error: 'Failed to get explorer URL', details: error.message });
    }
});

/**
 * GET /api/blockscout/transaction/:txHash
 * Get transaction details from Blockscout
 */
router.get('/transaction/:txHash', validateRequest(getTxSchema), async (req: Request, res: Response) => {
    try {
        const { txHash } = req.params;
        const { chainId = 1 } = req.query;

        const txDetails = await blockscoutService.getTransaction(txHash, Number(chainId));

        if (!txDetails) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        res.json(txDetails);
    } catch (error: any) {
        console.error('❌ Failed to fetch transaction:', error);
        res.status(500).json({ error: 'Failed to fetch transaction', details: error.message });
    }
});

/**
 * GET /api/blockscout/address/:address/transactions
 * Get transactions for an address
 */
router.get('/address/:address/transactions', validateRequest(getAddressSchema), async (req: Request, res: Response) => {
    try {
        const { address } = req.params;
        const { chainId = 1 } = req.query;

        const transactions = await blockscoutService.getAddressTransactions(address, {
            limit: 20,
        });

        res.json({
            address,
            chainId: Number(chainId),
            transactions: transactions?.items || [],
        });
    } catch (error: any) {
        console.error('❌ Failed to fetch address transactions:', error);
        res.status(500).json({ error: 'Failed to fetch address transactions', details: error.message });
    }
});

/**
 * GET /api/blockscout/contract/:address
 * Get smart contract details
 */
router.get('/contract/:address', async (req: Request, res: Response) => {
    try {
        const { address } = req.params;

        const contractDetails = await blockscoutService.getSmartContract(address);

        if (!contractDetails) {
            return res.status(404).json({ error: 'Contract not found' });
        }

        res.json(contractDetails);
    } catch (error: any) {
        console.error('❌ Failed to fetch contract:', error);
        res.status(500).json({ error: 'Failed to fetch contract', details: error.message });
    }
});

export default router;

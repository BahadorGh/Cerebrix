import { Router, Request, Response } from 'express';
import { nexusService } from '../services/index';

const router = Router();

/**
 * POST /api/deployments/cross-chain
 * Deploy an agent to multiple chains using Avail Nexus SDK
 */
router.post('/cross-chain', async (req: Request, res: Response) => {
    try {
        const {
            agentId,
            sourceChainId,
            targetChainIds,
            contractAddress,
        } = req.body;

        // Validation
        if (!agentId || !sourceChainId || !targetChainIds || !Array.isArray(targetChainIds)) {
            return res.status(400).json({
                error: 'Missing required fields: agentId, sourceChainId, targetChainIds',
            });
        }

        if (targetChainIds.length === 0) {
            return res.status(400).json({
                error: 'At least one target chain must be specified',
            });
        }

        console.log(`\n🚀 Cross-chain deployment requested`);
        console.log(`   Agent ID: ${agentId}`);
        console.log(`   Source Chain: ${sourceChainId}`);
        console.log(`   Target Chains: ${targetChainIds.join(', ')}`);

        // Execute Bridge & Execute
        const deployment = await nexusService.bridgeAndExecute({
            sourceChainId,
            targetChainIds,
            contractAddress: contractAddress || process.env.AGENT_REGISTRY_ADDRESS!,
            functionName: 'deployAgent',
            functionArgs: [agentId],
        });

        console.log(`✅ Deployment completed successfully`);

        res.json({
            success: true,
            deployment: {
                agentId: deployment.agentId,
                sourceChain: deployment.sourceChain,
                targetChains: deployment.targetChains,
                txHashes: deployment.txHashes,
                deploymentAddresses: deployment.deploymentAddresses,
                status: deployment.status,
                timestamp: deployment.timestamp,
            },
        });
    } catch (error: any) {
        console.error('❌ Cross-chain deployment failed:', error);
        res.status(500).json({
            error: 'Cross-chain deployment failed',
            details: error.message,
        });
    }
});

/**
 * GET /api/deployments/:agentId/history
 * Get cross-chain deployment history for an agent
 */
router.get('/:agentId/history', async (req: Request, res: Response) => {
    try {
        const { agentId } = req.params;

        const history = nexusService.getDeploymentHistory(parseInt(agentId));

        res.json({
            success: true,
            agentId: parseInt(agentId),
            deployments: history,
            deployedChains: nexusService.getDeployedChains(parseInt(agentId)),
        });
    } catch (error: any) {
        console.error('Failed to get deployment history:', error);
        res.status(500).json({
            error: 'Failed to get deployment history',
            details: error.message,
        });
    }
});

/**
 * GET /api/deployments/:agentId/chains
 * Get list of chains where agent is deployed
 */
router.get('/:agentId/chains', async (req: Request, res: Response) => {
    try {
        const { agentId } = req.params;

        const deployedChains = nexusService.getDeployedChains(parseInt(agentId));
        const supportedChains = nexusService.getSupportedChains();

        res.json({
            success: true,
            agentId: parseInt(agentId),
            deployedChains,
            supportedChains,
        });
    } catch (error: any) {
        console.error('Failed to get deployed chains:', error);
        res.status(500).json({
            error: 'Failed to get deployed chains',
            details: error.message,
        });
    }
});

/**
 * POST /api/deployments/xcs-swap
 * Optimize gas fees with XCS Swap before deployment
 */
router.post('/xcs-swap', async (req: Request, res: Response) => {
    try {
        const {
            fromChainId,
            toChainId,
            fromToken,
            toToken,
            amount,
        } = req.body;

        // Validation
        if (!fromChainId || !toChainId || !fromToken || !toToken || !amount) {
            return res.status(400).json({
                error: 'Missing required fields: fromChainId, toChainId, fromToken, toToken, amount',
            });
        }

        console.log(`\n💱 XCS Swap requested`);
        console.log(`   ${fromToken} on chain ${fromChainId} → ${toToken} on chain ${toChainId}`);
        console.log(`   Amount: ${amount}`);

        const result = await nexusService.xcsSwap({
            fromChainId,
            toChainId,
            fromToken,
            toToken,
            amount,
        });

        res.json({
            success: true,
            swap: result,
        });
    } catch (error: any) {
        console.error('❌ XCS Swap failed:', error);
        res.status(500).json({
            error: 'XCS Swap failed',
            details: error.message,
        });
    }
});

/**
 * GET /api/deployments/bridge-status/:txHash
 * Get status of a bridge transaction
 */
router.get('/bridge-status/:txHash', async (req: Request, res: Response) => {
    try {
        const { txHash } = req.params;

        const status = await nexusService.getBridgeStatus(txHash);

        res.json({
            success: true,
            txHash,
            ...status,
        });
    } catch (error: any) {
        console.error('Failed to get bridge status:', error);
        res.status(500).json({
            error: 'Failed to get bridge status',
            details: error.message,
        });
    }
});

export default router;

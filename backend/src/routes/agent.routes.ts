import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { validateRequest } from '../middleware/validation';
import { prisma, ipfsService, contractService, agentExecutionHandler } from '../services';

const router = Router();

// Validation schemas
const getAgentsSchema = z.object({
    query: z.object({
        page: z.string().optional().transform(val => val ? parseInt(val) : 1),
        limit: z.string().optional().transform(val => val ? parseInt(val) : 20),
        owner: z.string().optional(),
        isActive: z.string().optional().transform(val => val === 'true'),
    }),
});

const getAgentSchema = z.object({
    params: z.object({
        agentId: z.string().transform(val => parseInt(val)),
    }),
});

/**
 * GET /api/agents
 * Get paginated list of agents
 */
router.get('/', validateRequest(getAgentsSchema), async (req: Request, res: Response) => {
    try {
        const { page = 1, limit = 20, owner } = req.query;
        const offset = (Number(page) - 1) * Number(limit);

        // Fetch from blockchain
        const total = await contractService.getTotalAgents();
        let agentsList = await contractService.getAgents(offset, Number(limit));

        // Filter by owner if specified
        if (owner) {
            const ownerAgentIds = await contractService.getAgentsByOwner(String(owner));
            agentsList = agentsList.filter((_agent: any, index: number) =>
                ownerAgentIds.includes(offset + index + 1)
            );
        }

        // Fetch metadata for each agent from IPFS
        const agentsWithMetadata = await Promise.all(
            agentsList.map(async (agent: any, index: number) => {
                try {
                    const metadata = await ipfsService.fetch(agent.metadataURI.replace('ipfs://', ''));
                    return {
                        agentId: offset + index + 1,
                        ...agent,
                        metadataCached: metadata,
                    };
                } catch (error) {
                    console.error(`Failed to fetch metadata for agent ${offset + index + 1}:`, error);
                    return {
                        agentId: offset + index + 1,
                        ...agent,
                        metadataCached: null,
                    };
                }
            })
        );

        res.json({
            agents: agentsWithMetadata,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages: Math.ceil(total / Number(limit)),
            },
        });
    } catch (error: any) {
        console.error('❌ Failed to fetch agents:', error);
        res.status(500).json({ error: 'Failed to fetch agents', details: error.message });
    }
});

/**
 * GET /api/agents/:agentId
 * Get specific agent details
 */
router.get('/:agentId', validateRequest(getAgentSchema), async (req: Request, res: Response) => {
    try {
        const { agentId } = req.params;

        console.log(`📖 Fetching agent #${agentId} from blockchain...`);

        // Fetch from blockchain
        let contractAgent;
        try {
            contractAgent = await contractService.getAgent(Number(agentId));
        } catch (contractError: any) {
            console.error(`❌ Agent #${agentId} not found on blockchain:`, contractError.message);
            return res.status(404).json({
                error: 'Agent not found',
                details: `Agent #${agentId} does not exist on the blockchain`
            });
        }

        // Check if agent is valid
        if (!contractAgent || contractAgent.owner === '0x0000000000000000000000000000000000000000') {
            console.warn(`⚠️  Agent #${agentId} has zero address owner - likely doesn't exist`);
            return res.status(404).json({
                error: 'Agent not found',
                details: `Agent #${agentId} does not exist`
            });
        }

        // Fetch metadata from IPFS (with validation)
        let metadataCached = null;
        if (contractAgent.metadataURI && contractAgent.metadataURI.trim() !== '') {
            try {
                const cid = contractAgent.metadataURI.replace('ipfs://', '').trim();
                if (cid && cid.length > 0) {
                    console.log(`📖 Fetching metadata for Agent #${agentId} from IPFS: ${cid}`);
                    metadataCached = await ipfsService.fetch(cid);
                } else {
                    console.warn(`⚠️  Agent #${agentId} has empty CID, using fallback metadata`);
                }
            } catch (ipfsError: any) {
                console.error(`❌ Failed to fetch IPFS metadata for Agent #${agentId}:`, ipfsError.message);
                // Continue without metadata - use fallback
            }
        } else {
            console.warn(`⚠️  Agent #${agentId} has no metadata URI, using fallback`);
        }

        // Use fallback metadata if IPFS fetch failed or no URI
        if (!metadataCached) {
            metadataCached = {
                name: `Agent #${agentId}`,
                description: 'AI agent without metadata',
                category: 'unknown',
                capabilities: [],
                tags: [],
            };
        }

        // Get execution history
        const executions = await agentExecutionHandler.getExecutionHistory(Number(agentId), 10);

        // Combine data
        const agent = {
            agentId: Number(agentId),
            ...contractAgent,
            metadataCached,
            executions,
        };

        res.json(agent);
    } catch (error: any) {
        console.error('❌ Failed to fetch agent:', error);
        res.status(500).json({ error: 'Failed to fetch agent', details: error.message });
    }
});

/**
 * GET /api/agents/:agentId/metadata
 * Get agent metadata from IPFS
 */
router.get('/:agentId/metadata', validateRequest(getAgentSchema), async (req: Request, res: Response) => {
    try {
        const { agentId } = req.params;

        try {
            const agent = await prisma.agent.findUnique({
                where: { agentId: Number(agentId) },
            });

            if (!agent) {
                return res.status(404).json({ error: 'Agent not found' });
            }

            // Return cached metadata if available
            if (agent.metadataCached) {
                return res.json(agent.metadataCached);
            }

            // Fetch from IPFS
            const metadata = await ipfsService.fetchAgentMetadata(agent.metadataURI);

            // Update cache
            await prisma.agent.update({
                where: { id: agent.id },
                data: { metadataCached: metadata },
            });

            res.json(metadata);
        } catch (dbError) {
            console.warn('⚠️  Database query failed');
            res.status(503).json({
                error: 'Database not available',
                message: 'Configure database to access agent metadata'
            });
        }
    } catch (error: any) {
        console.error('❌ Failed to fetch metadata:', error);
        res.status(500).json({ error: 'Failed to fetch metadata', details: error.message });
    }
});

/**
 * GET /api/agents/:agentId/revenue
 * Get agent revenue information
 */
router.get('/:agentId/revenue', validateRequest(getAgentSchema), async (req: Request, res: Response) => {
    try {
        const { agentId } = req.params;

        const revenueBalance = await contractService.getRevenueBalance(Number(agentId));

        res.json(revenueBalance);
    } catch (error: any) {
        console.error('❌ Failed to fetch revenue:', error);
        res.status(500).json({ error: 'Failed to fetch revenue', details: error.message });
    }
});

/**
 * GET /api/agents/:agentId/deployments
 * Get agent deployments across chains
 */
router.get('/:agentId/deployments', validateRequest(getAgentSchema), async (req: Request, res: Response) => {
    try {
        const { agentId } = req.params;

        try {
            const deployments = await prisma.deployment.findMany({
                where: {
                    agentId: Number(agentId),
                    isActive: true,
                },
                orderBy: { deployedAt: 'desc' },
            });

            res.json(deployments);
        } catch (dbError) {
            console.warn('⚠️  Database query failed, returning empty deployments');
            res.json([]);
        }
    } catch (error: any) {
        console.error('❌ Failed to fetch deployments:', error);
        res.status(500).json({ error: 'Failed to fetch deployments', details: error.message });
    }
});

/**
 * POST /api/agents/sync/:agentId
 * Sync agent data from blockchain
 */
router.post('/sync/:agentId', validateRequest(getAgentSchema), async (req: Request, res: Response) => {
    try {
        const { agentId } = req.params;

        try {
            const contractAgent = await contractService.getAgent(Number(agentId));
            const metadata = await ipfsService.fetchAgentMetadata(contractAgent.metadataURI);

            const agent = await prisma.agent.upsert({
                where: { agentId: Number(agentId) },
                update: {
                    owner: contractAgent.owner,
                    metadataURI: contractAgent.metadataURI,
                    metadataCached: metadata,
                    pricePerExecution: contractAgent.pricePerExecution,
                    revenueSharePercent: contractAgent.revenueSharePercent,
                    totalExecutions: contractAgent.totalExecutions,
                    totalRevenue: contractAgent.totalRevenue,
                    isActive: contractAgent.isActive,
                },
                create: {
                    agentId: Number(agentId),
                    owner: contractAgent.owner,
                    metadataURI: contractAgent.metadataURI,
                    metadataCached: metadata,
                    pricePerExecution: contractAgent.pricePerExecution,
                    revenueSharePercent: contractAgent.revenueSharePercent,
                    totalExecutions: contractAgent.totalExecutions,
                    totalRevenue: contractAgent.totalRevenue,
                    isActive: contractAgent.isActive,
                },
            });

            res.json({ success: true, agent });
        } catch (dbError) {
            console.warn('⚠️  Database operation failed');
            res.status(503).json({
                error: 'Database not available',
                message: 'Configure database to sync agents'
            });
        }
    } catch (error: any) {
        console.error('❌ Failed to sync agent:', error);
        res.status(500).json({ error: 'Failed to sync agent', details: error.message });
    }
});

/**
 * POST /api/agents/sync-deployments/:agentId
 * Read deployedChains from contract and persist deployment records into DB
 */
router.post('/sync-deployments/:agentId', validateRequest(getAgentSchema), async (req: Request, res: Response) => {
    try {
        const { agentId } = req.params;

        // Read on-chain agent info
        const contractAgent = await contractService.getAgent(Number(agentId));
        const deployedChains: number[] = contractAgent.deployedChains || [];

        console.log(`📝 Syncing deployments for Agent #${agentId}...`);
        console.log(`   Deployed chains from contract: ${deployedChains.join(', ') || 'none'}`);

        // If no deployed chains on-chain, return empty list
        if (!deployedChains || deployedChains.length === 0) {
            console.log(`   ⚠️  No deployed chains found for Agent #${agentId}`);
            return res.json({ success: true, deployments: [] });
        }

        try {
            const saved: any[] = [];

            for (const chainId of deployedChains) {
                try {
                    // Try to fetch deployment address/timestamp from contract (if implemented)
                    let deploymentInfo: any = null;
                    try {
                        deploymentInfo = await contractService.getAgentDeployment(Number(agentId), Number(chainId));
                        console.log(`   ✅ Got deployment info from contract for chain ${chainId}`);
                    } catch (err) {
                        // If contract does not expose per-chain deployment details, fall back to empty address
                        deploymentInfo = {
                            agentId: Number(agentId),
                            chainId: Number(chainId),
                            deploymentAddress: '',
                            timestamp: Math.floor(Date.now() / 1000),
                            isActive: true,
                        };
                        console.log(`   ⚠️  Using fallback deployment info for chain ${chainId}`);
                    }

                    // Persist to DB. Use find/create to avoid relying on prisma upsert on composite unique
                    const existing = await prisma.deployment.findFirst({
                        where: {
                            agentId: Number(agentId),
                            chainId: Number(chainId),
                        },
                    });

                    if (existing) {
                        const updated = await prisma.deployment.update({
                            where: { id: existing.id },
                            data: {
                                deploymentAddress: String(deploymentInfo.deploymentAddress || ''),
                                isActive: Boolean(deploymentInfo.isActive),
                                deployedAt: new Date((Number(deploymentInfo.timestamp) || Math.floor(Date.now() / 1000)) * 1000),
                            },
                        });
                        console.log(`   ✅ Updated deployment record for chain ${chainId}`);
                        saved.push(updated);
                    } else {
                        const created = await prisma.deployment.create({
                            data: {
                                agentId: Number(agentId),
                                chainId: Number(chainId),
                                deploymentAddress: String(deploymentInfo.deploymentAddress || ''),
                                isActive: Boolean(deploymentInfo.isActive),
                                deployedAt: new Date((Number(deploymentInfo.timestamp) || Math.floor(Date.now() / 1000)) * 1000),
                            },
                        });
                        console.log(`   ✅ Created deployment record for chain ${chainId}`);
                        saved.push(created);
                    }
                } catch (innerErr: any) {
                    console.warn(`   ⚠️  Failed to persist deployment for agent ${agentId} on chain ${chainId}:`, innerErr?.message);
                }
            }

            console.log(`✅ Synced ${saved.length} deployments for Agent #${agentId}`);
            res.json({ success: true, deployments: saved });
        } catch (dbError: any) {
            console.warn('⚠️  Database operation failed:', dbError?.message);
            res.status(503).json({
                error: 'Database not available',
                message: 'Configure database to sync deployments'
            });
        }
    } catch (error: any) {
        console.error('❌ Failed to sync deployments:', error);
        res.status(500).json({ error: 'Failed to sync deployments', details: error.message });
    }
});

/**
 * GET /api/agents/:agentId/executions
 * Get execution history for an agent
 */
router.get('/:agentId/executions', async (req: Request, res: Response) => {
    try {
        const agentId = parseInt(req.params.agentId);
        const limit = parseInt(req.query.limit as string) || 10;

        const executions = await agentExecutionHandler.getExecutionHistory(agentId, limit);

        res.json({
            success: true,
            agentId,
            count: executions.length,
            executions,
        });
    } catch (error: any) {
        console.error('❌ Failed to fetch execution history:', error);
        res.status(500).json({
            error: 'Failed to fetch execution history',
            details: error.message,
        });
    }
});

export default router;

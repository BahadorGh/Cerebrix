import { ethers } from 'ethers';

// Contract ABIs (simplified for backend usage)
const AGENT_REGISTRY_ABI = [
    'function getAgent(uint256 agentId) view returns (tuple(address owner, string metadataURI, uint256 pricePerExecution, uint256 totalExecutions, uint256 totalRevenue, bool isActive, uint8 revenueSharePercent, uint256 createdAt, uint256[] deployedChains))',
    'function getTotalAgents() view returns (uint256)',
    'function getAgents(uint256 offset, uint256 limit) view returns (tuple(address owner, string metadataURI, uint256 pricePerExecution, uint256 totalExecutions, uint256 totalRevenue, bool isActive, uint8 revenueSharePercent, uint256 createdAt, uint256[] deployedChains)[])',
    'function getAgentsByOwner(address owner) view returns (uint256[])',
    'function getAgentDeployment(uint256 agentId, uint256 chainId) view returns (tuple(uint256 agentId, uint256 chainId, address deploymentAddress, uint256 timestamp, bool isActive))',
    'event AgentRegistered(uint256 indexed agentId, address indexed owner, string metadataURI, uint256 price, uint8 revenueShare)',
    'event AgentExecuted(uint256 indexed agentId, address indexed executor, uint256 chainId, bytes params)',
];

const PAYMENT_PROCESSOR_ABI = [
    'function getPendingRevenue(uint256 agentId) view returns (uint256)',
    'function getRevenueBalance(uint256 agentId) view returns (tuple(uint256 totalEarned, uint256 withdrawn, uint256 pending))',
    'function getPaymentHistory(uint256 agentId, uint256 offset, uint256 limit) view returns (tuple(address payer, uint256 amount, uint256 timestamp, bool settled, uint256 agentId)[])',
    'function getPlatformFees() view returns (uint256)',
    'event PaymentProcessed(uint256 indexed agentId, address indexed payer, uint256 amount, uint256 timestamp)',
    'event RevenueWithdrawn(uint256 indexed agentId, address indexed recipient, uint256 amount)',
];

export class ContractService {
    private providers: Map<number, ethers.Provider> = new Map();
    private registryContracts: Map<number, ethers.Contract> = new Map();
    private processorContracts: Map<number, ethers.Contract> = new Map();
    // Keep legacy references for backward compatibility
    private registryContract: ethers.Contract | null = null;
    private processorContract: ethers.Contract | null = null;

    async initialize() {
        // Initialize providers for different chains
        this.setupProviders();

        const registryAddress = process.env.AGENT_REGISTRY_ADDRESS;
        const processorAddress = process.env.PAYMENT_PROCESSOR_ADDRESS;

        // Check if addresses are valid (not placeholder)
        const isValidAddress = (addr: string | undefined) => {
            return addr && addr !== '0x...' && ethers.isAddress(addr);
        };

        if (!isValidAddress(registryAddress) || !isValidAddress(processorAddress)) {
            console.warn('⚠️ Contract addresses not configured, some features may be unavailable');
            console.warn('   Deploy contracts and update .env to enable on-chain features');
            return;
        }

        // Initialize contracts for all testnet chains
        const testnetChains = [
            { id: 11155111, name: 'Sepolia' },
            { id: 421614, name: 'Arbitrum Sepolia' },
            { id: 84532, name: 'Base Sepolia' },
            { id: 11155420, name: 'Optimism Sepolia' },
            { id: 80002, name: 'Polygon Amoy' },
        ];

        console.log('Initializing contract service for multi-chain event listening...');

        for (const chain of testnetChains) {
            const provider = this.providers.get(chain.id);
            if (!provider) {
                console.warn(`No provider configured for ${chain.name} (${chain.id})`);
                continue;
            }

            const registryContract = new ethers.Contract(
                registryAddress!,
                AGENT_REGISTRY_ABI,
                provider
            );

            const processorContract = new ethers.Contract(
                processorAddress!,
                PAYMENT_PROCESSOR_ABI,
                provider
            );

            this.registryContracts.set(chain.id, registryContract);
            this.processorContracts.set(chain.id, processorContract);

            console.log(`✅ ${chain.name} (${chain.id}) - Registry: ${registryAddress}`);
        }

        // Set Sepolia as the default for legacy code
        const sepoliaProvider = this.providers.get(11155111);
        if (sepoliaProvider) {
            this.registryContract = new ethers.Contract(
                registryAddress!,
                AGENT_REGISTRY_ABI,
                sepoliaProvider
            );
            this.processorContract = new ethers.Contract(
                processorAddress!,
                PAYMENT_PROCESSOR_ABI,
                sepoliaProvider
            );
        }

        console.log(`\n Multi-chain event listening ready for ${this.registryContracts.size} chains`);
    }

    /**
     * Setup providers for multiple chains
     */
    private setupProviders() {
        const chains = [
            { id: 11155111, rpc: process.env.SEPOLIA_RPC_URL }, // Sepolia - PRIMARY
            { id: 1, rpc: process.env.MAINNET_RPC_URL },
            { id: 31337, rpc: process.env.MAINNET_RPC_URL }, // Anvil local
            { id: 137, rpc: process.env.POLYGON_RPC_URL },
            { id: 80002, rpc: process.env.POLYGON_AMOY_RPC_URL }, // Polygon Amoy
            { id: 42161, rpc: process.env.ARBITRUM_RPC_URL },
            { id: 421614, rpc: process.env.ARBITRUM_SEPOLIA_RPC_URL }, // Arbitrum Sepolia
            { id: 8453, rpc: process.env.BASE_RPC_URL },
            { id: 84532, rpc: process.env.BASE_SEPOLIA_RPC_URL }, // Base Sepolia
            { id: 10, rpc: process.env.OPTIMISM_RPC_URL },
            { id: 11155420, rpc: process.env.OPTIMISM_SEPOLIA_RPC_URL }, // Optimism Sepolia
        ];

        for (const chain of chains) {
            if (chain.rpc) {
                this.providers.set(chain.id, new ethers.JsonRpcProvider(chain.rpc));
            }
        }
    }

    /**
     * Get provider for specific chain
     */
    getProvider(chainId: number): ethers.Provider | undefined {
        return this.providers.get(chainId);
    }

    /**
     * Get agent details from contract
     */
    async getAgent(agentId: number) {
        if (!this.registryContract) {
            throw new Error('Registry contract not initialized');
        }

        try {
            const agent = await this.registryContract.getAgent(agentId);
            return {
                owner: agent.owner,
                metadataURI: agent.metadataURI,
                pricePerExecution: agent.pricePerExecution.toString(),
                totalExecutions: Number(agent.totalExecutions),
                totalRevenue: agent.totalRevenue.toString(),
                isActive: agent.isActive,
                revenueSharePercent: Number(agent.revenueSharePercent),
                createdAt: Number(agent.createdAt),
                deployedChains: agent.deployedChains.map((c: bigint) => Number(c)),
            };
        } catch (error) {
            console.error('❌ Failed to get agent:', error);
            throw error;
        }
    }

    /**
     * Get total number of agents
     */
    async getTotalAgents(): Promise<number> {
        if (!this.registryContract) {
            throw new Error('Registry contract not initialized');
        }

        try {
            const total = await this.registryContract.getTotalAgents();
            return Number(total);
        } catch (error) {
            console.error('❌ Failed to get total agents:', error);
            return 0;
        }
    }

    /**
     * Get paginated list of agents
     */
    async getAgents(offset: number, limit: number) {
        if (!this.registryContract) {
            throw new Error('Registry contract not initialized');
        }

        try {
            const agents = await this.registryContract.getAgents(offset, limit);
            return agents.map((agent: any) => ({
                owner: agent.owner,
                metadataURI: agent.metadataURI,
                pricePerExecution: agent.pricePerExecution.toString(),
                totalExecutions: Number(agent.totalExecutions),
                totalRevenue: agent.totalRevenue.toString(),
                isActive: agent.isActive,
                revenueSharePercent: Number(agent.revenueSharePercent),
                createdAt: Number(agent.createdAt),
                deployedChains: agent.deployedChains.map((c: bigint) => Number(c)),
            }));
        } catch (error) {
            console.error('❌ Failed to get agents:', error);
            return [];
        }
    }

    /**
     * Get agents by owner address
     */
    async getAgentsByOwner(owner: string): Promise<number[]> {
        if (!this.registryContract) {
            throw new Error('Registry contract not initialized');
        }

        try {
            const agentIds = await this.registryContract.getAgentsByOwner(owner);
            return agentIds.map((id: bigint) => Number(id));
        } catch (error) {
            console.error('❌ Failed to get agents by owner:', error);
            return [];
        }
    }

    /**
     * Get revenue balance for an agent
     */
    async getRevenueBalance(agentId: number) {
        if (!this.processorContract) {
            throw new Error('Payment processor contract not initialized');
        }

        try {
            const balance = await this.processorContract.getRevenueBalance(agentId);
            return {
                totalEarned: balance.totalEarned.toString(),
                withdrawn: balance.withdrawn.toString(),
                pending: balance.pending.toString(),
            };
        } catch (error) {
            console.error('❌ Failed to get revenue balance:', error);
            throw error;
        }
    }

    /**
     * Get specific agent deployment info for a chain
     */
    async getAgentDeployment(agentId: number, chainId: number) {
        if (!this.registryContract) {
            throw new Error('Registry contract not initialized');
        }

        try {
            const deployment = await this.registryContract.getAgentDeployment(agentId, chainId);
            // deployment tuple: (agentId, chainId, deploymentAddress, timestamp, isActive)
            return {
                agentId: Number(deployment.agentId),
                chainId: Number(deployment.chainId),
                deploymentAddress: deployment.deploymentAddress,
                timestamp: Number(deployment.timestamp),
                isActive: Boolean(deployment.isActive),
            };
        } catch (error) {
            console.error(`❌ Failed to get agent deployment for ${agentId} on chain ${chainId}:`, error);
            throw error;
        }
    }

    /**
     * Listen to contract events on all testnet chains
     */
    listenToEvents(callback: (event: any) => void) {
        if (this.registryContracts.size === 0) {
            console.warn('⚠️  Cannot listen to events: No registry contracts initialized');
            return;
        }

        const testnetChains = [
            { id: 11155111, name: 'Sepolia' },
            { id: 421614, name: 'Arbitrum Sepolia' },
            { id: 84532, name: 'Base Sepolia' },
            { id: 11155420, name: 'Optimism Sepolia' },
            { id: 80002, name: 'Polygon Amoy' },
        ];

        console.log('\n🎧 Starting multi-chain event listeners...\n');

        for (const chain of testnetChains) {
            const registryContract = this.registryContracts.get(chain.id);

            if (!registryContract) {
                console.warn(`⚠️  No registry contract for ${chain.name}, skipping`);
                continue;
            }

            // Listen to AgentRegistered events
            registryContract.on('AgentRegistered', (agentId, owner, metadataURI, price, revenueShare, event) => {
                try {
                    console.log(`\n📝 AgentRegistered on ${chain.name}!`);
                    console.log(`   Agent ID: ${agentId}`);
                    console.log(`   Owner: ${owner}`);

                    callback({
                        type: 'AgentRegistered',
                        agentId: Number(agentId),
                        owner,
                        metadataURI,
                        price: price.toString(),
                        revenueShare: Number(revenueShare),
                        blockNumber: event.log.blockNumber,
                        txHash: event.log.transactionHash,
                        sourceChain: chain.id,
                        sourceChainName: chain.name,
                    });
                } catch (e) {
                    console.error(`❌ Error processing AgentRegistered event on ${chain.name}:`, e);
                }
            });

            // Listen to AgentExecuted events
            registryContract.on('AgentExecuted', (agentId, executor, chainId, params, event) => {
                try {
                    console.log(`\n${'='.repeat(70)}`);
                    console.log(`🎯 AgentExecuted event detected on ${chain.name}!`);
                    console.log(`   Agent ID: ${agentId}`);
                    console.log(`   Executor: ${executor}`);
                    console.log(`   Target Chain ID: ${chainId}`);
                    console.log(`   Source Chain: ${chain.name} (${chain.id})`);
                    console.log(`   Block: ${event.log.blockNumber}`);
                    console.log(`   TX Hash: ${event.log.transactionHash}`);
                    console.log(`${'='.repeat(70)}\n`);

                    callback({
                        type: 'AgentExecuted',
                        agentId: Number(agentId),
                        executor,
                        chainId: Number(chainId),
                        params: params,
                        blockNumber: event.log.blockNumber,
                        txHash: event.log.transactionHash,
                        sourceChain: chain.id,
                        sourceChainName: chain.name,
                    });
                } catch (e) {
                    console.error(`❌ Error processing AgentExecuted event on ${chain.name}:`, e);
                    // Still try to call callback even if logging fails
                    try {
                        callback({
                            type: 'AgentExecuted',
                            agentId: Number(agentId),
                            executor,
                            chainId: Number(chainId),
                            params: params,
                            blockNumber: event.log.blockNumber,
                            txHash: event.log.transactionHash,
                            sourceChain: chain.id,
                            sourceChainName: chain.name,
                        });
                    } catch (callbackError) {
                        console.error('❌ Critical: Failed to call callback:', callbackError);
                    }
                }
            });

            console.log(`👂 ${chain.name} (${chain.id}) - Listening for events`);
        }

        console.log('\n✅ Multi-chain event monitoring active');
        console.log('📡 Now listening to events on ALL testnet chains!');
        console.log('   You will see execution logs when users execute agents on any chain\n');
    }
}

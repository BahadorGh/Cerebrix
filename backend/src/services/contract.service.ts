import { ethers } from 'ethers';
import { AGENT_REGISTRY_ABI, PAYMENT_PROCESSOR_ABI } from '../config/abis';

export class ContractService {
    private provider: ethers.Provider | null = null;
    private registryContract: ethers.Contract | null = null;

    async initialize() {
        const rpcUrl = process.env.SEPOLIA_RPC_URL;
        const registryAddress = process.env.AGENT_REGISTRY_ADDRESS;

        if (!rpcUrl || !registryAddress) {
            console.warn('⚠️  Contract config missing');
            return;
        }

        this.provider = new ethers.JsonRpcProvider(rpcUrl);
        this.registryContract = new ethers.Contract(
            registryAddress,
            AGENT_REGISTRY_ABI,
            this.provider
        );

        console.log('✅ Contract service initialized');
    }

    async getAgent(agentId: number) {
        if (!this.registryContract) throw new Error('Not initialized');

        const agent = await this.registryContract.getAgent(agentId);
        return {
            owner: agent.owner,
            metadataURI: agent.metadataURI,
            price: agent.pricePerExecution.toString(),
            totalExecutions: Number(agent.totalExecutions),
            isActive: agent.isActive,
        };
    }

    // TODO: add more methods
}

export const contractService = new ContractService();
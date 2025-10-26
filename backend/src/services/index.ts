import { PrismaClient } from '@prisma/client';
import { IPFSService } from './ipfs.service';
import { NexusService } from './nexus.service';
import { BlockscoutService } from './blockscout.service';
import { ContractService } from './contract.service';
import { agentExecutionHandler } from './execution.handler';
import { aiService } from './ai.service';

// Initialize Prisma client
export const prisma = new PrismaClient();

// Initialize services
export let ipfsService: IPFSService;
export let nexusService: NexusService;
export let blockscoutService: BlockscoutService;
export let contractService: ContractService;

// Export AI service and execution handler
export { agentExecutionHandler, aiService };

export async function initializeServices() {
    console.log('🔧 Initializing services...');

    try {
        // Connect to database (optional for development)
        try {
            await prisma.$connect();
            console.log('✅ Database connected');
        } catch (dbError) {
            console.warn('⚠️  Database connection failed - running without database');
            console.warn('   Install PostgreSQL or use Docker to enable database features');
        }

        // Initialize IPFS service
        ipfsService = new IPFSService();
        await ipfsService.initialize();
        console.log('✅ IPFS service initialized');

        // Initialize Nexus service (backend tracking only, SDK is frontend-only)
        nexusService = new NexusService();
        await nexusService.initialize();
        console.log('✅ Nexus service initialized (deployment tracking)');

        // Initialize Blockscout service
        blockscoutService = new BlockscoutService();
        console.log('✅ Blockscout service initialized');

        // Initialize Contract service
        contractService = new ContractService();
        await contractService.initialize();
        console.log('✅ Contract service initialized');

        // Initialize Execution handler
        await agentExecutionHandler.initialize();
        console.log('✅ Agent execution handler initialized');

        console.log('🎉 All services initialized successfully');
    } catch (error) {
        console.error('❌ Service initialization failed:', error);
        throw error;
    }
}

// Graceful shutdown
export async function shutdownServices() {
    console.log('🛑 Shutting down services...');
    await prisma.$disconnect();
    console.log('✅ Services shut down');
}

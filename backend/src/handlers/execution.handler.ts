import { db } from '../services/database.service';

export async function handleAgentExecuted(event: any) {
    console.log('🎯 Processing AgentExecuted event...');

    try {
        const { agentId, executor, chainId, txHash, sourceChain } = event;

        // Create execution record
        const execution = await db.createExecution({
            agentId,
            executor,
            chainId,
            txHash,
            status: 'processing',
        });

        console.log(`📊 Execution ${execution.id} created for agent ${agentId}`);

        // TODO: Process execution with AI

        return execution;
    } catch (error) {
        console.error('❌ Failed to handle AgentExecuted:', error);
        throw error;
    }
}
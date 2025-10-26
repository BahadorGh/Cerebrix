import { db } from '../services/database.service';
import { executionService } from '../services/execution.service';

export async function handleAgentExecuted(event: any) {
    console.log('🎯 Processing AgentExecuted event...');

    try {
        const { agentId, executor, chainId, txHash, sourceChain, sourceChainName } = event;

        // Create execution record
        const execution = await db.createExecution({
            agentId,
            executor,
            chainId,
            txHash,
            status: 'processing',
        });

        console.log(`📊 Execution ${execution.id} created`);
        console.log(`   Detected on: ${sourceChainName} (${sourceChain})`);

        // Get agent details
        const agent = await db.getAgent(agentId);
        if (!agent) {
            throw new Error(`Agent ${agentId} not found`);
        }

        // Parse agent config from metadataURI
        let agentConfig = {};
        if (agent.metadataURI.startsWith('http')) {
            try {
                const response = await fetch(agent.metadataURI);
                agentConfig = await response.json();
            } catch (err) {
                console.warn('Could not fetch agent config');
            }
        }

        // Process execution with AI
        const result = await executionService.processExecution({
            agentId,
            executor,
            chainId,
            agentConfig,
        });

        // Update execution with result
        await db.updateExecutionResult(
            execution.id,
            JSON.stringify(result),
            'completed'
        );

        console.log(`✅ Execution ${execution.id} completed`);

        return execution;
    } catch (error) {
        console.error('❌ Failed to handle AgentExecuted:', error);
        throw error;
    }
}
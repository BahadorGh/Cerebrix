import { db } from '../services/database.service';

export async function handleAgentRegistered(event: any) {
    console.log('📝 Processing AgentRegistered event...');

    try {
        const { agentId, owner, metadataURI, price } = event;

        // Parse metadata URI (could be IPFS or HTTP)
        let metadata = {
            name: `Agent ${agentId}`,
            description: 'AI Agent',
        };

        if (metadataURI.startsWith('http')) {
            try {
                const response = await fetch(metadataURI);
                metadata = await response.json();
            } catch (err) {
                console.warn('Failed to fetch metadata, using defaults');
            }
        }

        // Store in database
        await db.createAgent({
            id: agentId,
            owner,
            name: metadata.name,
            description: metadata.description,
            metadataURI,
            price: price,
        });

        console.log(`✅ Agent ${agentId} registered in database`);
    } catch (error) {
        console.error('❌ Failed to handle AgentRegistered:', error);
    }
}
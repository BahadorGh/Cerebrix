import { NexusClient } from '@avail-project/nexus-core';

export async function bridgeAndExecute(
    from: any,
    to: number,
    amount: string,
    agentId: number,
    targetChain: number
) {
    try {
        const nexus = new NexusClient();

        // Bridge funds via Avail Nexus
        const result = await nexus.bridgeAndExecute({
            sourceChain: from.chainId,
            destinationChain: to,
            amount: amount,
            token: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', // USDC
            calldata: {
                target: '0x83FAA0aE70AC0B74C01e0C60210991A110b95D3c',
                functionName: 'executeAgent',
                args: [agentId, targetChain, '0x'],
            },
        });

        console.log('Bridge intent created:', result.intentId);
        return result;
    } catch (error) {
        console.error('Bridge failed:', error);
        throw error;
    }
}
/**
 * Smart Contract ABIs used across the application
 */

export const AGENT_REGISTRY_ABI = [
    {
        inputs: [],
        name: 'getTotalAgents',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function'
    },
    {
        inputs: [{ name: 'agentId', type: 'uint256' }],
        name: 'getAgent',
        outputs: [{
            components: [
                { name: 'owner', type: 'address' },
                { name: 'metadataURI', type: 'string' },
                { name: 'pricePerExecution', type: 'uint256' },
                { name: 'totalExecutions', type: 'uint256' },
                { name: 'totalRevenue', type: 'uint256' },
                { name: 'isActive', type: 'bool' },
                { name: 'revenueSharePercent', type: 'uint8' },
                { name: 'createdAt', type: 'uint256' },
                { name: 'deployedChains', type: 'uint256[]' }
            ],
            name: 'agent',
            type: 'tuple'
        }],
        stateMutability: 'view',
        type: 'function'
    },
    {
        inputs: [
            { name: 'metadataURI', type: 'string' },
            { name: 'price', type: 'uint256' },
            { name: 'revenueShare', type: 'uint8' }
        ],
        name: 'registerAgent',
        outputs: [{ name: 'agentId', type: 'uint256' }],
        stateMutability: 'nonpayable',
        type: 'function'
    },
    {
        inputs: [
            { name: 'agentId', type: 'uint256' },
            { name: 'params', type: 'bytes' }
        ],
        name: 'executeAgent',
        outputs: [],
        stateMutability: 'payable',
        type: 'function'
    }
] as const;

export const USDC_ABI = [
    {
        inputs: [
            { name: 'spender', type: 'address' },
            { name: 'amount', type: 'uint256' }
        ],
        name: 'approve',
        outputs: [{ name: '', type: 'bool' }],
        stateMutability: 'nonpayable',
        type: 'function'
    },
    {
        inputs: [
            { name: 'owner', type: 'address' },
            { name: 'spender', type: 'address' }
        ],
        name: 'allowance',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function'
    },
    {
        inputs: [{ name: 'account', type: 'address' }],
        name: 'balanceOf',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function'
    },
    {
        inputs: [],
        name: 'decimals',
        outputs: [{ name: '', type: 'uint8' }],
        stateMutability: 'view',
        type: 'function'
    }
] as const;

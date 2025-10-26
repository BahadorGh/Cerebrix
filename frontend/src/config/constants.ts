// Smart contract addresses (update after deployment)
export const CONTRACTS = {
    AGENT_REGISTRY: import.meta.env.VITE_AGENT_REGISTRY_ADDRESS || '0x...',
    PAYMENT_PROCESSOR: import.meta.env.VITE_PAYMENT_PROCESSOR_ADDRESS || '0x...',
    USDC: {
        1: '0x6c3ea9036406852006290770BEdFcAbA0e23A0e8', // Ethereum Mainnet
        11155111: '0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9', // Sepolia
    },
} as const;

// API endpoints
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

// IPFS gateway
export const IPFS_GATEWAY = import.meta.env.VITE_IPFS_GATEWAY || 'https://ipfs.io';

// Chain configuration
export const SUPPORTED_CHAINS = [
    { id: 1, name: 'Ethereum', shortName: 'ETH' },
    { id: 137, name: 'Polygon', shortName: 'MATIC' },
    { id: 10, name: 'Optimism', shortName: 'OP' },
    { id: 42161, name: 'Arbitrum', shortName: 'ARB' },
    { id: 8453, name: 'Base', shortName: 'BASE' },
] as const;

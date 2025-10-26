import { NexusSDK } from '@avail-project/nexus-core';

// Initialize Nexus SDK with testnet chains
// If network param is not provided, SDK defaults to mainnet
export const sdk = new NexusSDK({
    network: 'testnet',
    debug: true, // Enable verbose logging for development
});

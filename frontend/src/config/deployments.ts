/**
 * Cross-chain deployment configuration
 * 
 * IMPORTANT: Update these addresses with your actual deployed contracts
 * Deploy AgentRegistry to each chain first, then update these values
 */

export interface ChainDeployment {
    chainId: number;
    chainName: string;
    registryAddress: string;
    rpcUrl: string;
    explorerUrl: string;
}

export const CHAIN_DEPLOYMENTS: Record<number, ChainDeployment> = {
    // Anvil Local 
    31337: {
        chainId: 31337,
        chainName: 'Anvil Local',
        registryAddress: '0xb7f8bc63bbcad18155201308c8f3540b07f84f5e', // ✅ Local deployment
        rpcUrl: 'http://127.0.0.1:8545',
        explorerUrl: 'http://localhost:8545' // No explorer for local
    },

    // ============ TESTNETS (for development) ============

    // Ethereum Sepolia
    11155111: {
        chainId: 11155111,
        chainName: 'Ethereum Sepolia',
        registryAddress: '0x83FAA0aE70AC0B74C01e0C60210991A110b95D3c', // ✅ NEW: USDC-based deployment
        rpcUrl: 'https://eth-sepolia.g.alchemy.com/v2/kdicFboHabSRL1bWD1eRXFK6iw-oeQtd',
        explorerUrl: 'https://sepolia.etherscan.io'
    },

    // Polygon Amoy (Testnet)
    80002: {
        chainId: 80002,
        chainName: 'Polygon Amoy',
        registryAddress: '0x83FAA0aE70AC0B74C01e0C60210991A110b95D3c', // ✅ NEW: SAME ADDRESS (deterministic deployment)
        rpcUrl: 'https://polygon-amoy.g.alchemy.com/v2/kdicFboHabSRL1bWD1eRXFK6iw-oeQtd',
        explorerUrl: 'https://amoy.polygonscan.com'
    },

    // Arbitrum Sepolia
    421614: {
        chainId: 421614,
        chainName: 'Arbitrum Sepolia',
        registryAddress: '0x83FAA0aE70AC0B74C01e0C60210991A110b95D3c', // ✅ NEW: SAME ADDRESS (deterministic deployment)
        rpcUrl: 'https://arb-sepolia.g.alchemy.com/v2/kdicFboHabSRL1bWD1eRXFK6iw-oeQtd',
        explorerUrl: 'https://sepolia.arbiscan.io'
    },

    // Optimism Sepolia
    11155420: {
        chainId: 11155420,
        chainName: 'Optimism Sepolia',
        registryAddress: '0x83FAA0aE70AC0B74C01e0C60210991A110b95D3c', // ✅ NEW: SAME ADDRESS (deterministic deployment)
        rpcUrl: 'https://opt-sepolia.g.alchemy.com/v2/kdicFboHabSRL1bWD1eRXFK6iw-oeQtd',
        explorerUrl: 'https://sepolia-optimism.etherscan.io'
    },

    // Base Sepolia
    84532: {
        chainId: 84532,
        chainName: 'Base Sepolia',
        registryAddress: '0x83FAA0aE70AC0B74C01e0C60210991A110b95D3c', // ✅ NEW: SAME ADDRESS (deterministic deployment)
        rpcUrl: 'https://base-sepolia.g.alchemy.com/v2/kdicFboHabSRL1bWD1eRXFK6iw-oeQtd',
        explorerUrl: 'https://sepolia.basescan.org'
    },

    // ============ MAINNETS (for production) ============

    // Ethereum Mainnet - ⚠️ REQUIRED: Deploy AgentRegistry here for Avail Nexus
    1: {
        chainId: 1,
        chainName: 'Ethereum Mainnet',
        registryAddress: '0xYourDeployedAddressHere', // ⚠️ DEPLOY FIRST
        rpcUrl: 'https://ethereum-rpc.publicnode.com',
        explorerUrl: 'https://etherscan.io'
    },

    // Polygon PoS - Supported by Avail Nexus
    137: {
        chainId: 137,
        chainName: 'Polygon PoS',
        registryAddress: '0xYourDeployedAddressHere', // ⚠️ DEPLOY FIRST
        rpcUrl: 'https://polygon-rpc.com',
        explorerUrl: 'https://polygonscan.com'
    },

    // Base Mainnet - Supported by Avail Nexus
    8453: {
        chainId: 8453,
        chainName: 'Base',
        registryAddress: '0xYourDeployedAddressHere', // ⚠️ DEPLOY FIRST
        rpcUrl: 'https://mainnet.base.org',
        explorerUrl: 'https://basescan.org'
    },

    // Arbitrum One - Supported by Avail Nexus
    42161: {
        chainId: 42161,
        chainName: 'Arbitrum One',
        registryAddress: '0xYourDeployedAddressHere', // ⚠️ DEPLOY FIRST
        rpcUrl: 'https://arb1.arbitrum.io/rpc',
        explorerUrl: 'https://arbiscan.io'
    }
};

/**
 * Check if a chain is configured for deployment
 */
export function isChainConfigured(chainId: number): boolean {
    const deployment = CHAIN_DEPLOYMENTS[chainId];
    if (!deployment) return false;

    // Check if address is not a placeholder
    return !deployment.registryAddress.includes('Your');
}

/**
 * Get all configured chains
 */
export function getConfiguredChains(): ChainDeployment[] {
    return Object.values(CHAIN_DEPLOYMENTS).filter(chain =>
        isChainConfigured(chain.chainId)
    );
}

/**
 * Get all chain deployments (including unconfigured ones for display purposes)
 */
export function getAllChainDeployments(): ChainDeployment[] {
    return Object.values(CHAIN_DEPLOYMENTS);
}

/**
 * Get deployment info for a specific chain
 */
export function getChainDeployment(chainId: number): ChainDeployment | undefined {
    return CHAIN_DEPLOYMENTS[chainId];
}

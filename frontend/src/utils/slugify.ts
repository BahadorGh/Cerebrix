/**
 * Utility functions for creating and parsing agent slugs
 */

// Map chain IDs to URL-friendly names
export const CHAIN_SLUG_MAP: Record<number, string> = {
    31337: 'anvil',
    11155111: 'sepolia',
    80002: 'polygon',
    421614: 'arbitrum',
    84532: 'base',
};

// Reverse map for parsing
export const SLUG_CHAIN_MAP: Record<string, number> = Object.entries(CHAIN_SLUG_MAP).reduce(
    (acc, [chainId, slug]) => ({ ...acc, [slug]: parseInt(chainId) }),
    {} as Record<string, number>
);

/**
 * Convert a string to a URL-friendly slug
 * Example: "Weather Oracle Bot!" -> "weather-oracle-bot"
 */
export function slugify(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')  // Replace non-alphanumeric with hyphens
        .replace(/^-|-$/g, '')         // Remove leading/trailing hyphens
        .slice(0, 50);                 // Limit length for reasonable URLs
}

/**
 * Create an agent slug from chain ID, agent ID, and name
 * Example: createAgentSlug(31337, 1, "Weather Oracle") -> "anvil-1-weather-oracle"
 */
export function createAgentSlug(chainId: number, agentId: number, name?: string): string {
    const chainSlug = CHAIN_SLUG_MAP[chainId] || `chain${chainId}`;
    const namePart = name ? slugify(name) : `agent-${agentId}`;
    return `${chainSlug}-${agentId}-${namePart}`;
}

/**
 * Parse an agent slug to extract chain ID and agent ID
 * Supports multiple formats:
 * - New format: "anvil-1-weather-oracle" -> { chainId: 31337, agentId: 1 }
 * - Legacy format: "31337-1" -> { chainId: 31337, agentId: 1 }
 * - Simple format: "1" -> { chainId: current chain, agentId: 1 }
 */
export function parseAgentSlug(
    slug: string,
    fallbackChainId?: number
): { chainId: number | null; agentId: number } {
    // Try new slug format: "anvil-1-weather-oracle"
    const slugMatch = slug.match(/^([a-z]+)-(\d+)-.+$/);
    if (slugMatch) {
        const [, chainSlug, agentIdStr] = slugMatch;
        const chainId = SLUG_CHAIN_MAP[chainSlug] || null;
        return { chainId, agentId: parseInt(agentIdStr) };
    }

    // Try legacy format: "31337-1"
    const legacyMatch = slug.match(/^(\d+)-(\d+)$/);
    if (legacyMatch) {
        const [, chainIdStr, agentIdStr] = legacyMatch;
        return { chainId: parseInt(chainIdStr), agentId: parseInt(agentIdStr) };
    }

    // Try simple format: "1"
    const simpleMatch = slug.match(/^\d+$/);
    if (simpleMatch) {
        return { chainId: fallbackChainId || null, agentId: parseInt(slug) };
    }

    // Fallback
    return { chainId: null, agentId: 0 };
}

/**
 * Get display name for a chain
 */
export function getChainDisplayName(chainId: number): string {
    const names: Record<number, string> = {
        31337: 'Anvil Local',
        11155111: 'Ethereum Sepolia',
        80002: 'Polygon Amoy',
        421614: 'Arbitrum Sepolia',
        84532: 'Base Sepolia',
    };
    return names[chainId] || `Chain ${chainId}`;
}

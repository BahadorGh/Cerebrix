import { useState, useEffect } from 'react';
import { useChainId, useReadContract, useReadContracts } from 'wagmi';
import AgentCard from '../components/AgentCard';
import { isChainConfigured, getConfiguredChains, getChainDeployment } from '@/config/deployments';
import { AGENT_REGISTRY_ABI } from '@/config/abis';
import { createAgentSlug } from '@/utils/slugify';

export default function ExplorePage() {
  const chainId = useChainId();
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Check if current network is configured with deployed contracts
  const isWrongNetwork = !isChainConfigured(chainId);
  const configuredChains = getConfiguredChains();
  const currentChainDeployment = getChainDeployment(chainId);

  // Get total number of agents from blockchain
  const { data: totalAgents } = useReadContract({
    address: currentChainDeployment?.registryAddress as `0x${string}`,
    abi: AGENT_REGISTRY_ABI,
    functionName: 'getTotalAgents',
    chainId: chainId,
    query: {
      enabled: !!currentChainDeployment?.registryAddress && !isWrongNetwork,
    }
  });

  // Get network name
  const getNetworkName = (id: number) => {
    const deployment = getChainDeployment(id);
    if (deployment) {
      return deployment.chainName;
    }
    
    // Fallback for common networks
    const networks: Record<number, string> = {
      1: 'Ethereum Mainnet',
      11155111: 'Ethereum Sepolia',
      42161: 'Arbitrum One',
      421614: 'Arbitrum Sepolia',
      10: 'Optimism',
      8453: 'Base',
      80002: 'Polygon Amoy',
      31337: 'Anvil Local'
    };
    return networks[id] || `Chain ${id}`;
  };

  // Create contract calls for all agents
  const agentContracts = totalAgents ? Array.from({ length: Number(totalAgents) }, (_, i) => ({
    address: currentChainDeployment?.registryAddress as `0x${string}`,
    abi: AGENT_REGISTRY_ABI,
    functionName: 'getAgent',
    args: [BigInt(i + 1)], // agentId starts from 1
    chainId: chainId,
  })) : [];

  // Fetch all agents in one call
  const { data: agentsData, isLoading: isLoadingAgents } = useReadContracts({
    contracts: agentContracts,
    query: {
      enabled: !!totalAgents && !!currentChainDeployment && !isWrongNetwork && Number(totalAgents) > 0,
    }
  });

  // Process agents data and fetch metadata from IPFS
  useEffect(() => {
    if (!agentsData) {
      setLoading(isLoadingAgents);
      return;
    }

    const processedAgents = agentsData
      .map((result: any, index) => {
        if (result.status !== 'success' || !result.result) {
          return null;
        }
        
        const agent = result.result;
        const localAgentId = index + 1;
        const chainName = currentChainDeployment?.chainName || `Chain ${chainId}`;
        
        // Create a more descriptive fallback name
        const fallbackName = `AI Agent #${localAgentId}`;
        const fallbackDescription = 'Decentralized AI agent ready for execution';
        
        // Initially use placeholder, will be updated after IPFS fetch
        const agentSlug = createAgentSlug(chainId, localAgentId, fallbackName);
        
        return {
          agentId: `${chainId}-${localAgentId}`, // Technical ID: "31337-1", "11155111-1"
          agentSlug: agentSlug, // URL slug: "anvil-1-ai-agent-1" (will be updated if IPFS works)
          localAgentId: localAgentId.toString(), // Original on-chain ID
          owner: agent.owner,
          metadataURI: agent.metadataURI,
          price: agent.pricePerExecution?.toString() || '0',
          totalExecutions: agent.totalExecutions?.toString() || '0',
          totalRevenue: agent.totalRevenue?.toString() || '0',
          isActive: agent.isActive,
          revenueSharePercent: agent.revenueSharePercent,
          createdAt: agent.createdAt?.toString() || '0',
          deployedChains: agent.deployedChains || [],
          chainId: chainId,
          name: `${fallbackName} (${chainName})`, // Display name (will be updated if IPFS works)
          description: fallbackDescription, // Fallback description (will be updated if IPFS works)
          metadataCached: null, // Will be populated if IPFS fetch succeeds
        };
      })
      .filter((agent: any) => agent !== null && agent.isActive);

    setAgents(processedAgents);
    setLoading(false);

    // Fetch metadata from IPFS for each agent (optional enhancement)
    const fetchMetadata = async () => {
      // Try multiple IPFS gateways in order of reliability
      const ipfsGateways = [
        'https://gateway.pinata.cloud/ipfs/',
        'https://ipfs.io/ipfs/',
        'https://dweb.link/ipfs/',
        'https://w3s.link/ipfs/',
      ];

      for (const agent of processedAgents) {
        if (!agent || !agent.metadataURI) continue;
        
        // Extract IPFS hash from URI
        const ipfsHash = agent.metadataURI.replace('ipfs://', '');
        
        // Skip if hash looks invalid or placeholder
        if (!ipfsHash || ipfsHash.length < 10 || ipfsHash.includes('placeholder')) {
          console.log(`Skipping invalid IPFS hash for agent ${agent.agentId}: ${ipfsHash}`);
          continue;
        }
        
        console.log(`Fetching metadata for agent ${agent.agentId} from IPFS hash: ${ipfsHash}`);
        let metadataFetched = false;
        let metadata: any = null;
        
        // Try backend proxy first (if backend is running)
        try {
          const backendUrl = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'}/api/ipfs/${ipfsHash}`;
          const response = await fetch(backendUrl, {
            signal: AbortSignal.timeout(5000),
          });
          
          if (response.ok) {
            const result = await response.json();
            if (result.success && result.data) {
              metadata = result.data;
              metadataFetched = true;
              console.log(`✅ Fetched via backend for agent ${agent.agentId}`);
            }
          }
        } catch (error) {
          console.log(`Backend proxy unavailable for agent ${agent.agentId}, trying public gateways...`);
        }
        
        // If backend failed, try public IPFS gateways
        if (!metadataFetched) {
          for (const gateway of ipfsGateways) {
            if (metadataFetched) break;
            
            try {
              const ipfsUrl = `${gateway}${ipfsHash}`;
              
              const response = await fetch(ipfsUrl, {
                headers: {
                  'Accept': 'application/json',
                },
                signal: AbortSignal.timeout(8000), // 8 second timeout (IPFS can be slow)
              });
              
              if (!response.ok) {
                console.log(`Gateway ${gateway} returned status ${response.status} for agent ${agent.agentId}`);
                continue;
              }
              
              metadata = await response.json();
              metadataFetched = true;
              console.log(`✅ Successfully fetched from ${gateway} for agent ${agent.agentId}`);
            } catch (error: any) {
              console.log(`Gateway ${gateway} failed for agent ${agent.agentId}:`, error.message);
              continue;
            }
          }
        }
        
        // Update agent if metadata was fetched
        if (metadataFetched && metadata) {
          const localAgentId = parseInt(agent.localAgentId);
          const chainName = currentChainDeployment?.chainName || `Chain ${chainId}`;
          
          console.log(`✅ Successfully fetched metadata for agent ${agent.agentId}:`, metadata);
          
          setAgents((prevAgents) =>
            prevAgents.map((a) =>
              a.agentId === agent.agentId
                ? {
                    ...a,
                    name: metadata.name ? `${metadata.name} (${chainName})` : a.name,
                    description: metadata.description || a.description,
                    agentSlug: createAgentSlug(chainId, localAgentId, metadata.name || a.name),
                    metadataCached: metadata, // Store full metadata for AgentCard
                  }
                : a
            )
          );
        } else {
          console.log(`ℹ️  Using fallback data for agent ${agent.agentId} (IPFS unavailable)`);
        }
      }
    };

    // Don't block on IPFS fetching - run in background
    if (processedAgents.length > 0) {
      fetchMetadata().catch(console.error);
    }
  }, [agentsData, isLoadingAgents, chainId, totalAgents, currentChainDeployment]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading agents...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Network Warning Banner */}
      {isWrongNetwork && (
        <div className="mb-6 card bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-300">
          <div className="flex items-start gap-4">
            <div className="text-4xl">⚠️</div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-red-900 mb-2">Wrong Network Detected</h3>
              <p className="text-sm text-red-700 mb-3">
                You're currently connected to <strong>{getNetworkName(chainId)}</strong>, but this platform 
                is only deployed on the following networks:
              </p>
              <div className="bg-red-100 rounded p-3 text-sm text-red-800 mb-3">
                <strong>📡 Supported Networks:</strong>
                <ul className="mt-2 ml-4 list-disc">
                  {configuredChains.map(chain => (
                    <li key={chain.chainId}>
                      <strong>{chain.chainName}</strong> (Chain ID: {chain.chainId})
                    </li>
                  ))}
                </ul>
              </div>
              <p className="text-sm text-red-700">
                Please switch your wallet to one of the supported networks to interact with agents.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Network Badge */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Explore Agents</h1>
          <p className="text-gray-600">Discover and execute AI agents across multiple chains</p>
        </div>
        <span className={`px-4 py-2 rounded-full text-sm font-semibold ${
          isWrongNetwork 
            ? 'bg-red-100 text-red-800 border-2 border-red-300' 
            : 'bg-blue-100 text-blue-800'
        }`}>
          {isWrongNetwork ? '⚠️' : '🔗'} {getNetworkName(chainId)}
        </span>
      </div>

      {agents.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 mb-4">No agents found</p>
          <a href="/create" className="btn-primary">
            Create First Agent
          </a>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map((agent: any) => (
            <AgentCard key={agent.agentId} agent={agent} isWrongNetwork={isWrongNetwork} />
          ))}
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useAccount, useChainId, useReadContract, useReadContracts } from 'wagmi';
import { Link } from 'react-router-dom';
import { getChainDeployment } from '@/config/deployments';
import { AGENT_REGISTRY_ABI } from '@/config/abis';
import { createAgentSlug } from '@/utils/slugify';

interface Agent {
  agentId: string;
  agentSlug?: string;
  localAgentId?: string;
  owner: string;
  metadataURI: string;
  price: string;
  totalExecutions: string;
  totalRevenue: string;
  isActive: boolean;
  revenueSharePercent: number;
  createdAt: string;
  deployedChains: any[];
  chainId: number;
  name?: string;
  description?: string;
  metadataCached?: {
    name: string;
    description: string;
    capabilities?: string[];
    version?: string;
  };
}

export default function MyAgentsPage() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const currentChainDeployment = getChainDeployment(chainId);

  // Get total agents count
  const { data: totalAgents } = useReadContract({
    address: currentChainDeployment?.registryAddress as `0x${string}`,
    abi: AGENT_REGISTRY_ABI,
    functionName: 'getTotalAgents',
    chainId: chainId,
    query: {
      enabled: !!currentChainDeployment?.registryAddress,
    },
  });

  // Prepare contract calls to fetch all agents
  const agentContracts = totalAgents ? Array.from({ length: Number(totalAgents) }, (_, i) => ({
    address: currentChainDeployment?.registryAddress as `0x${string}`,
    abi: AGENT_REGISTRY_ABI,
    functionName: 'getAgent',
    args: [BigInt(i + 1)],
    chainId: chainId,
  })) : [];

  const { data: agentsData, isLoading: isLoadingAgents } = useReadContracts({
    contracts: agentContracts,
    query: {
      enabled: !!totalAgents && !!currentChainDeployment && Number(totalAgents) > 0,
    },
  });

  // Process agents data and filter by owner
  useEffect(() => {
    if (!address) {
      console.log('🔍 MyAgentsPage - No wallet connected');
      setIsLoading(isLoadingAgents);
      return;
    }

    if (!currentChainDeployment) {
      console.log('🔍 MyAgentsPage - Chain not supported (no deployment)', { chainId });
      setIsLoading(false);
      setAgents([]);
      return;
    }

    console.log('🔍 MyAgentsPage - Fetching from chain:', {
      chainName: currentChainDeployment.chainName,
      chainId,
      registryAddress: currentChainDeployment.registryAddress,
      connectedAddress: address,
      totalAgents: totalAgents?.toString(),
      agentsDataLength: agentsData?.length,
    });

    if (!agentsData) {
      console.log('🔍 MyAgentsPage - agentsData not ready yet, isLoading:', isLoadingAgents);
      setIsLoading(isLoadingAgents);
      return;
    }

    console.log('🔍 MyAgentsPage - Processing agents:', {
      totalAgents: agentsData.length,
      connectedAddress: address,
      chainId,
    });

    const processedAgents = agentsData
      .map((result: any, index) => {
        if (result.status !== 'success' || !result.result) {
          return null;
        }
        
        const agent = result.result;
        const localAgentId = index + 1;
        const chainName = currentChainDeployment?.chainName || `Chain ${chainId}`;
        
        console.log(`Agent #${localAgentId}:`, {
          owner: agent.owner,
          connectedAddress: address,
          isOwner: agent.owner.toLowerCase() === address.toLowerCase(),
          isActive: agent.isActive,
        });
        
        // Skip if not owned by connected wallet
        if (agent.owner.toLowerCase() !== address.toLowerCase()) {
          return null;
        }
        
        const fallbackName = `AI Agent #${localAgentId}`;
        const fallbackDescription = 'Decentralized AI agent ready for execution';
        const agentSlug = createAgentSlug(chainId, localAgentId, fallbackName);
        
        return {
          agentId: `${chainId}-${localAgentId}`,
          agentSlug: agentSlug,
          localAgentId: localAgentId.toString(),
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
          name: `${fallbackName} (${chainName})`,
          description: fallbackDescription,
          metadataCached: undefined,
        };
      })
      .filter((agent: any) => agent !== null && agent.isActive) as Agent[];

    console.log('✅ MyAgentsPage - Filtered agents:', {
      total: processedAgents.length,
      agents: processedAgents.map(a => ({ id: a.agentId, owner: a.owner })),
    });

    setAgents(processedAgents);
    setIsLoading(false);

    // Fetch metadata from IPFS for each agent (same as ExplorePage)
    const fetchMetadata = async () => {
      const ipfsGateways = [
        'https://gateway.pinata.cloud/ipfs/',
        'https://ipfs.io/ipfs/',
        'https://dweb.link/ipfs/',
        'https://w3s.link/ipfs/',
      ];

      for (const agent of processedAgents) {
        if (!agent || !agent.metadataURI) continue;
        
        const ipfsHash = agent.metadataURI.replace('ipfs://', '');
        
        if (!ipfsHash || ipfsHash.length < 10 || ipfsHash.includes('placeholder')) {
          continue;
        }
        
        let metadataFetched = false;
        let metadata: any = null;
        
        // Try backend proxy first
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
            }
          }
        } catch (error) {
          // Try public gateways
        }
        
        // If backend failed, try public IPFS gateways
        if (!metadataFetched) {
          for (const gateway of ipfsGateways) {
            if (metadataFetched) break;
            
            try {
              const ipfsUrl = `${gateway}${ipfsHash}`;
              const response = await fetch(ipfsUrl, {
                headers: { 'Accept': 'application/json' },
                signal: AbortSignal.timeout(8000),
              });
              
              if (!response.ok) continue;
              
              metadata = await response.json();
              metadataFetched = true;
            } catch (error) {
              continue;
            }
          }
        }
        
        // Update agent if metadata was fetched
        if (metadataFetched && metadata) {
          const localAgentId = parseInt(agent.localAgentId || '1');
          const chainName = currentChainDeployment?.chainName || `Chain ${chainId}`;
          
          setAgents((prevAgents) =>
            prevAgents.map((a) =>
              a.agentId === agent.agentId
                ? {
                    ...a,
                    name: metadata.name ? `${metadata.name} (${chainName})` : a.name,
                    description: metadata.description || a.description,
                    agentSlug: createAgentSlug(chainId, localAgentId, metadata.name || a.name),
                    metadataCached: metadata,
                  }
                : a
            )
          );
        }
      }
    };

    if (processedAgents.length > 0) {
      fetchMetadata().catch(console.error);
    }
  }, [agentsData, isLoadingAgents, chainId, address, currentChainDeployment]);

  if (!isConnected) {
    return (
      <div className="text-center py-12">
        <h1 className="text-3xl font-bold mb-4">My Agents</h1>
        <p className="text-gray-600 mb-4">Connect your wallet to view your agents</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">My Agents</h1>
          <p className="text-gray-600">Manage your deployed agents and track revenue</p>
        </div>
        <Link to="/create-agent" className="btn btn-primary">
          + Create New Agent
        </Link>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      ) : agents.length === 0 ? (
        <div className="card text-center py-12 bg-gradient-to-br from-indigo-50 to-purple-50">
          <div className="text-6xl mb-4">🤖</div>
          <h2 className="text-2xl font-bold mb-4">No Agents Yet</h2>
          <p className="text-gray-600 mb-6">
            You haven't created any AI agents yet. Get started by creating your first agent!
          </p>
          <Link to="/create-agent" className="btn btn-primary inline-block">
            Create Your First Agent
          </Link>
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
            {agents.map((agent) => {
              const metadata = agent.metadataCached || {
                name: agent.name || `AI Agent #${agent.localAgentId}`,
                description: agent.description || 'AI Agent',
                capabilities: [],
              };
              const priceInUSDC = parseFloat(agent.price) / 1e6;
              const revenueInUSDC = parseFloat(agent.totalRevenue) / 1e6;
              const ownerShare = (revenueInUSDC * agent.revenueSharePercent) / 100;

              return (
                <Link
                  key={agent.agentId}
                  to={`/agent/${agent.agentSlug || agent.agentId}`}
                  className="card hover:shadow-lg transition-all duration-200 hover:scale-105"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold mb-2">{metadata.name}</h3>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`status ${agent.isActive ? 'status-success' : 'status-inactive'}`}>
                          {agent.isActive ? '✅ Active' : '⏸️ Inactive'}
                        </span>
                      </div>
                    </div>
                    <div className="text-2xl">🤖</div>
                  </div>

                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {metadata.description}
                  </p>

                  {metadata.capabilities && metadata.capabilities.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {metadata.capabilities.slice(0, 3).map((cap, idx) => (
                        <span key={idx} className="badge badge-secondary text-xs">
                          {cap}
                        </span>
                      ))}
                      {metadata.capabilities.length > 3 && (
                        <span className="badge badge-secondary text-xs">
                          +{metadata.capabilities.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div>
                      <div className="text-xs text-gray-600">Price</div>
                      <div className="font-bold text-indigo-600">{priceInUSDC} USDC</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600">Executions</div>
                      <div className="font-bold text-green-600">{agent.totalExecutions}</div>
                    </div>
                  </div>

                  {agent.totalRevenue !== '0' && (
                    <div className="mt-4 p-3 bg-green-50 rounded-lg">
                      <div className="text-xs text-green-700 mb-1">Your Earnings ({agent.revenueSharePercent}%)</div>
                      <div className="text-lg font-bold text-green-600">{ownerShare.toFixed(2)} USDC</div>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>

          <div className="card bg-gradient-to-r from-blue-50 to-indigo-50">
            <h3 className="text-lg font-bold mb-2">📊 Portfolio Summary</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-gray-600">Total Agents</div>
                <div className="text-2xl font-bold text-indigo-600">{agents.length}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Total Executions</div>
                <div className="text-2xl font-bold text-green-600">
                  {agents.reduce((sum, agent) => sum + parseInt(agent.totalExecutions || '0'), 0)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Total Earnings</div>
                <div className="text-2xl font-bold text-green-600">
                  {agents
                    .reduce((sum, agent) => {
                      const revenue = parseFloat(agent.totalRevenue) / 1e6;
                      return sum + (revenue * agent.revenueSharePercent) / 100;
                    }, 0)
                    .toFixed(2)}{' '}
                  USDC
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

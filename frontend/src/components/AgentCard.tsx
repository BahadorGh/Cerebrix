import { Link } from 'react-router-dom';

interface Agent {
  agentId: string; // Global unique ID like "31337-1"
  agentSlug?: string; // URL-friendly slug like "anvil-1-weather-oracle"
  localAgentId?: string; // Original on-chain ID
  owner: string;
  chainId?: number; // Chain where this agent is deployed
  metadataCached?: {
    name: string;
    description: string;
    version: string;
    capabilities: string[];
    tags?: string[];
  } | null;
  name?: string; // Fallback name
  description?: string; // Fallback description
  pricePerExecution?: string;
  price?: string; // Alternative price field
  totalExecutions: number | string;
  totalRevenue: string;
  isActive: boolean;
}

interface AgentCardProps {
  agent: Agent;
  isWrongNetwork?: boolean;
}

export default function AgentCard({ agent, isWrongNetwork = false }: AgentCardProps) {
  const metadata = agent.metadataCached;
  const priceValue = agent.price || agent.pricePerExecution || '0';
  const price = (parseInt(priceValue) / 1e6).toFixed(2);
  
  // Get chain name for display
  const getChainBadge = () => {
    if (!agent.chainId) return null;
    
    const chainNames: Record<number, { name: string; color: string }> = {
      31337: { name: 'Local', color: 'bg-gray-100 text-gray-800' },
      11155111: { name: 'Sepolia', color: 'bg-blue-100 text-blue-800' },
      80002: { name: 'Polygon', color: 'bg-purple-100 text-purple-800' },
      421614: { name: 'Arbitrum', color: 'bg-cyan-100 text-cyan-800' },
      84532: { name: 'Base', color: 'bg-indigo-100 text-indigo-800' },
    };
    
    const chain = chainNames[agent.chainId] || { name: `Chain ${agent.chainId}`, color: 'bg-gray-100 text-gray-800' };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded ${chain.color}`}>
        {chain.name}
      </span>
    );
  };

  return (
    <Link 
      to={`/agent/${agent.agentSlug || agent.agentId}`} 
      className={`card hover:shadow-lg transition-shadow relative ${
        isWrongNetwork ? 'opacity-75 border-2 border-orange-200' : ''
      }`}
    >
      {/* Wrong Network Overlay Badge */}
      {isWrongNetwork && (
        <div className="absolute top-2 right-2 bg-orange-100 text-orange-800 text-xs font-semibold px-2 py-1 rounded-full border border-orange-300 z-10">
          ⚠️ Wrong Network
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
            {metadata?.name || agent.name || `Agent #${agent.localAgentId || agent.agentId}`}
            {/* Show loading indicator if metadata not yet loaded */}
            {!metadata && (
              <span className="inline-block w-2 h-2 bg-blue-400 rounded-full animate-pulse" title="Loading metadata..."></span>
            )}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-sm text-gray-600">
              {metadata?.version || 'v1.0.0'}
            </p>
            {getChainBadge()}
          </div>
        </div>
        {agent.isActive ? (
          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
            Active
          </span>
        ) : (
          <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs font-medium rounded">
            Inactive
          </span>
        )}
      </div>

      {/* Description */}
      <p className="text-gray-600 text-sm mb-4 line-clamp-2">
        {metadata?.description || agent.description || 'No description available'}
      </p>

      {/* Capabilities */}
      {metadata?.capabilities && metadata.capabilities.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {metadata.capabilities.slice(0, 3).map((capability, index) => (
            <span
              key={index}
              className="px-2 py-1 bg-primary-50 text-primary-700 text-xs rounded"
            >
              {capability}
            </span>
          ))}
          {metadata.capabilities.length > 3 && (
            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
              +{metadata.capabilities.length - 3} more
            </span>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <div>
          <p className="text-xs text-gray-500">Price</p>
          <p className="font-bold text-gray-900">{price} USDC</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">Executions</p>
          <p className="font-bold text-gray-900">{agent.totalExecutions.toString()}</p>
        </div>
      </div>
    </Link>
  );
}

import { Link } from 'react-router-dom';
import type { Agent } from '../types/agent';
import ChainBadge from './ChainBadge';

interface Props {
  agent: Agent;
}

function AgentCard({ agent }: Props) {
  return (
    <Link 
      to={`/agents/${agent.id}`}
      className="block card hover:border-gray-600 transition"
    >
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-xl font-bold">{agent.name}</h3>
        {agent.isActive ? (
          <span className="text-xs bg-green-500 px-2 py-1 rounded-full">Active</span>
        ) : (
          <span className="text-xs bg-gray-600 px-2 py-1 rounded-full">Inactive</span>
        )}
      </div>
      
      <p className="text-gray-400 text-sm mb-4 line-clamp-2">{agent.description}</p>
      
      <div className="flex flex-wrap gap-1 mb-4">
        {agent.deployedChains?.map(chainId => (
          <ChainBadge key={chainId} chainId={chainId} />
        ))}
      </div>
      
      <div className="flex justify-between text-sm border-t border-gray-700 pt-3">
        <div>
          <span className="text-gray-400">Price:</span>
          <span className="ml-2 font-medium">{agent.price} USDC</span>
        </div>
        <div>
          <span className="text-gray-400">Runs:</span>
          <span className="ml-2 font-medium">{agent.totalExecutions}</span>
        </div>
      </div>
    </Link>
  );
}

export default AgentCard;
import { Link } from 'react-router-dom';
import type { Agent } from '../types/agent';

interface Props {
  agent: Agent;
}

function AgentCard({ agent }: Props) {
  return (
    <Link 
      to={`/agents/${agent.id}`}
      className="block bg-gray-800 p-6 rounded-lg hover:bg-gray-750 transition"
    >
      <h3 className="text-xl font-bold mb-2">{agent.name}</h3>
      <p className="text-gray-400 text-sm mb-4">{agent.description}</p>
      <div className="flex justify-between text-sm">
        <span>Price: {agent.price} USDC</span>
        <span>Executions: {agent.totalExecutions}</span>
      </div>
    </Link>
  );
}

export default AgentCard;
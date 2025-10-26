import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { fetchAgent } from '../lib/api';

function AgentDetailPage() {
  const { id } = useParams();
  const [agent, setAgent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchAgent(Number(id))
        .then(setAgent)
        .catch(err => console.error(err))
        .finally(() => setLoading(false));
    }
  }, [id]);

  if (loading) return <div>Loading...</div>;
  if (!agent) return <div>Agent not found</div>;

  return (
    <div>
      <h1 className="text-4xl font-bold mb-4">{agent.name}</h1>
      <p className="text-gray-400 mb-8">{agent.description}</p>
      
      <div className="bg-gray-800 p-6 rounded-lg mb-8">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-gray-400">Price:</span>
            <p className="text-xl">{agent.price} USDC</p>
          </div>
          <div>
            <span className="text-gray-400">Total Executions:</span>
            <p className="text-xl">{agent.totalExecutions}</p>
          </div>
        </div>
      </div>

      <button className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg">
        Execute Agent
      </button>
    </div>
  );
}

export default AgentDetailPage;
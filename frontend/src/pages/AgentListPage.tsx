import { useState, useEffect } from 'react';
import { fetchAgents } from '../lib/api';

function AgentListPage() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAgents()
      .then(data => setAgents(data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h2 className="text-3xl font-bold mb-6">AI Agents</h2>
      <div className="grid gap-4">
        {agents.map((agent: any) => (
          <div key={agent.id} className="bg-gray-800 p-4 rounded-lg">
            <h3 className="font-bold">{agent.name}</h3>
            <p className="text-sm text-gray-400">{agent.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AgentListPage;
import { useState, useEffect } from 'react';
import { fetchAgents } from '../lib/api';
import AgentCard from '../components/AgentCard';

function AgentListPage() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAgents()
      .then(data => setAgents(data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading agents...</div>;

  return (
    <div>
      <h2 className="text-3xl font-bold mb-6">AI Agents</h2>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map((agent: any) => (
          <AgentCard key={agent.id} agent={agent} />
        ))}
      </div>
    </div>
  );
}

export default AgentListPage;
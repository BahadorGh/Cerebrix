import { useState, useEffect } from 'react';
import { fetchAgents } from '../lib/api';
import AgentCard from '../components/AgentCard';
import Loading from '../components/Loading';
import ErrorMessage from '../components/ErrorMessage';

function AgentListPage() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAgents()
      .then(data => {
        setAgents(data);
        setError('');
      })
      .catch(err => {
        console.error(err);
        setError('Failed to load agents. Make sure backend is running.');
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold">AI Agents</h2>
        <a 
          href="/create" 
          className="btn-primary"
        >
          + Create Agent
        </a>
      </div>

      {loading && <Loading />}
      {error && <ErrorMessage message={error} />}
      
      {!loading && !error && agents.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-400">No agents found. Create your first agent!</p>
        </div>
      )}

      {!loading && !error && agents.length > 0 && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((agent: any) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      )}
    </div>
  );
}

export default AgentListPage;
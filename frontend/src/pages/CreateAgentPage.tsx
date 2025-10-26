import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount } from 'wagmi';

function CreateAgentPage() {
  const navigate = useNavigate();
  const { isConnected } = useAccount();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '3',
  });
  const [jsonConfig, setJsonConfig] = useState<any>(null);
  const [uploadMode, setUploadMode] = useState<'form' | 'json'>('form');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        setJsonConfig(json);
        setFormData({
          name: json.name || '',
          description: json.description || '',
          price: json.price || '3',
        });
      } catch (err) {
        alert('Invalid JSON file');
      }
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // TODO: Connect to smart contract
    console.log('Creating agent:', formData, jsonConfig);
    alert('Agent creation will be implemented with smart contract integration');
  };

  if (!isConnected) {
    return (
      <div className="text-center py-12">
        <p className="text-yellow-500">Please connect your wallet to create an agent</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-4xl font-bold mb-8">Create AI Agent</h1>

      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setUploadMode('form')}
          className={`flex-1 py-2 rounded-lg ${
            uploadMode === 'form' ? 'bg-blue-600' : 'bg-gray-700'
          }`}
        >
          Form Mode
        </button>
        <button
          onClick={() => setUploadMode('json')}
          className={`flex-1 py-2 rounded-lg ${
            uploadMode === 'json' ? 'bg-blue-600' : 'bg-gray-700'
          }`}
        >
          JSON Upload
        </button>
      </div>

      {uploadMode === 'json' && (
        <div className="mb-6 card">
          <label className="block text-sm text-gray-400 mb-2">
            Upload Agent Configuration (JSON)
          </label>
          <input
            type="file"
            accept=".json"
            onChange={handleFileUpload}
            className="input"
          />
          <div className="mt-4 flex gap-2">
            <a 
              href="/examples/momentum-example.json" 
              download 
              className="text-sm text-blue-400 hover:underline"
            >
              📥 Momentum Example
            </a>
            <a 
              href="/examples/custom-endpoint-example.json" 
              download 
              className="text-sm text-blue-400 hover:underline"
            >
              📥 Custom Endpoint Example
            </a>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="card">
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Agent Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="input"
              placeholder="My AI Agent"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              className="input"
              rows={3}
              placeholder="What does your agent do?"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Price per Execution (USDC)</label>
            <input
              type="number"
              value={formData.price}
              onChange={e => setFormData({ ...formData, price: e.target.value })}
              className="input"
              min="0"
              step="0.01"
              required
            />
          </div>

          {jsonConfig && (
            <div className="bg-gray-700 p-3 rounded text-xs">
              <p className="text-gray-400 mb-1">Configuration Preview:</p>
              <pre className="overflow-auto">{JSON.stringify(jsonConfig, null, 2)}</pre>
            </div>
          )}

          <button type="submit" className="w-full btn-primary">
            Create Agent
          </button>
        </div>
      </form>
    </div>
  );
}

export default CreateAgentPage;
import { Link } from 'react-router-dom';
import { useAccount } from 'wagmi';

function HomePage() {
  const { isConnected } = useAccount();

  return (
    <div>
      <div className="text-center py-20">
        <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-purple-600 text-transparent bg-clip-text">
          Build AI Agents for Web3
        </h1>
        <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
          Create, deploy, and execute autonomous AI agents across multiple chains. 
          The AWS Lambda for Web3 AI.
        </p>
        
        <div className="flex gap-4 justify-center">
          <Link 
            to={isConnected ? "/create" : "/agents"} 
            className="btn-primary text-lg px-8 py-3"
          >
            {isConnected ? 'Create Agent' : 'Explore Agents'}
          </Link>
          <Link 
            to="/agents" 
            className="btn-secondary text-lg px-8 py-3"
          >
            Browse Marketplace
          </Link>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mt-20">
        <div className="card text-center">
          <div className="text-4xl mb-4">🤖</div>
          <h3 className="text-xl font-bold mb-2">AI-Powered</h3>
          <p className="text-gray-400 text-sm">
            Template-based or custom execution logic with AI reasoning
          </p>
        </div>
        
        <div className="card text-center">
          <div className="text-4xl mb-4">🌉</div>
          <h3 className="text-xl font-bold mb-2">Multi-Chain</h3>
          <p className="text-gray-400 text-sm">
            Deploy and execute across 5+ testnets with automatic bridging
          </p>
        </div>
        
        <div className="card text-center">
          <div className="text-4xl mb-4">⚡</div>
          <h3 className="text-xl font-bold mb-2">Real-Time</h3>
          <p className="text-gray-400 text-sm">
            Instant execution with event-driven architecture
          </p>
        </div>
      </div>
    </div>
  );
}

export default HomePage;
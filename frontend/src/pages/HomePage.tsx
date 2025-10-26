import { Link } from 'react-router-dom';

export default function HomePage() {
  return (
    <div className="space-y-16">
      {/* <Link to="/showcase" className="block">
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-xl p-8 shadow-2xl hover:shadow-3xl transition-all cursor-pointer transform hover:scale-[1.02]">
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <span className="text-5xl">🏆</span>
              <h2 className="text-3xl font-bold text-white">ETHGlobal 2025 Hackathon Showcase</h2>
              <span className="text-5xl">🏆</span>
            </div>
            <p className="text-xl text-white/90 mb-4">
              See all 3 sponsor integrations in action: Nexus SDK • Blockscout • Pyth Network
            </p>
            <div className="flex items-center justify-center gap-4 text-sm">
              <span className="bg-white/20 px-4 py-2 rounded-lg text-white font-semibold">
                🌐 5+ Chains
              </span>
              <span className="bg-white/20 px-4 py-2 rounded-lg text-white font-semibold">
                🔍 On-chain Analytics
              </span>
              <span className="bg-white/20 px-4 py-2 rounded-lg text-white font-semibold">
                💵 Stable Payments
              </span>
              <span className="bg-white/20 px-4 py-2 rounded-lg text-white font-semibold">
                🔮 Live Oracles
              </span>
            </div>
            <div className="mt-4">
              <span className="text-white font-bold text-lg">Click to View Complete Showcase →</span>
            </div>
          </div>
        </div>
      </Link> */}

      {/* Hero Section */}
      <section className="text-center py-20">
        <h1 className="text-5xl font-bold text-primary-600 mb-6">
          CEREBRIX 
          <br />
          <span className="text-gray-600">The Brain of Multi-Chain AI</span>
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Register, monetize, and execute AI agents across multiple blockchains.
          Powered by Avail Nexus, Pyth Network, and Blockscout.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link to="/explore" className="btn-primary text-lg px-8 py-3">
            Explore Agents
          </Link>
          <Link to="/create" className="btn-secondary text-lg px-8 py-3">
            Create Agent
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="grid md:grid-cols-4 gap-8">
        <div className="card">
          <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold mb-2">Cross-Chain Registration</h3>
          <p className="text-gray-600">
            Register your agents across Ethereum, Polygon, Arbitrum, Base, and Optimism
            with Avail Nexus SDK.
          </p>
        </div>

        <div className="card border-2 border-purple-200 bg-purple-50">
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
            Pyth Oracles
          </h3>
          <p className="text-gray-600">
            Real-time price feeds from Pyth Network for data-driven AI agent
            decisions with sub-second updates.
          </p>
        </div>

        <div className="card">
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold mb-2">USDC Payments</h3>
          <p className="text-gray-600">
            Receive payments in USDC stablecoin with automated revenue sharing
            between developers and platform.
          </p>
        </div>

        <div className="card">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold mb-2">Real-Time Analytics</h3>
          <p className="text-gray-600">
            Track agent performance, execution history, and revenue with
            Blockscout integration.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="card bg-gradient-to-r from-primary-600 to-primary-700 text-white">
        <div className="grid md:grid-cols-4 gap-8 text-center">
          <div>
            <p className="text-4xl font-bold mb-2">50+</p>
            <p className="text-primary-100">Active Agents</p>
          </div>
          <div>
            <p className="text-4xl font-bold mb-2">1,200+</p>
            <p className="text-primary-100">Executions</p>
          </div>
          <div>
            <p className="text-4xl font-bold mb-2">5</p>
            <p className="text-primary-100">Supported Chains</p>
          </div>
          <div>
            <p className="text-4xl font-bold mb-2">$50K+</p>
            <p className="text-primary-100">Total Revenue</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="text-center py-16">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Ready to build the future of AI agents?
        </h2>
        <p className="text-lg text-gray-600 mb-8">
          Create your first agent and start earning revenue today.
        </p>
        <Link to="/create" className="btn-primary text-lg px-8 py-3">
          Get Started
        </Link>
      </section>
    </div>
  );
}

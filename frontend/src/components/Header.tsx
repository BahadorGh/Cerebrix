import { Link } from 'react-router-dom';
import { ConnectButton } from '@rainbow-me/rainbowkit';

export default function Header() {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">A</span>
            </div>
            <span className="text-xl font-bold text-gray-900">
              Agent Marketplace
            </span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link
              to="/explore"
              className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
            >
              Explore
            </Link>
            <Link
              to="/my-agents"
              className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
            >
              My Agents
            </Link>
            <Link
              to="/analytics"
              className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
            >
              Analytics
            </Link>
            <Link
              to="/intents"
              className="text-gray-600 hover:text-gray-900 font-medium transition-colors flex items-center gap-1"
            >
              🌊 Intents
            </Link>
            <Link
              to="/create"
              className="btn-primary"
            >
              Create Agent
            </Link>
          </nav>

          {/* Wallet Connect */}
          <div className="flex items-center space-x-4">
            <ConnectButton />
          </div>
        </div>
      </div>
    </header>
  );
}

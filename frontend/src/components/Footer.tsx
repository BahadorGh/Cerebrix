export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* About */}
          <div>
            <h3 className="font-bold text-gray-900 mb-4">Cerebrix Agent Marketplace</h3>
            <p className="text-gray-600 text-sm">
              Enterprise cross-chain platform for deploying and monetizing AI agents
              powered by Avail Nexus, USDC, and Blockscout.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-4">Platform</h4>
            <ul className="space-y-2">
              <li>
                <a href="/explore" className="text-gray-600 hover:text-gray-900 text-sm">
                  Explore Agents
                </a>
              </li>
              <li>
                <a href="/create" className="text-gray-600 hover:text-gray-900 text-sm">
                  Create Agent
                </a>
              </li>
              <li>
                <a href="/analytics" className="text-gray-600 hover:text-gray-900 text-sm">
                  Analytics
                </a>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-4">Resources</h4>
            <ul className="space-y-2">
              <li>
                <a href="https://docs.availproject.org/nexus" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-gray-900 text-sm">
                  Avail Nexus Docs
                </a>
              </li>
              <li>
                <a href="https://developer.paypal.com/dev-center/usdc" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-gray-900 text-sm">
                  USDC Docs
                </a>
              </li>
              <li>
                <a href="https://docs.blockscout.com" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-gray-900 text-sm">
                  Blockscout Docs
                </a>
              </li>
            </ul>
          </div>

          {/* Social */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-4">Community</h4>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-gray-600 hover:text-gray-900 text-sm">
                  Twitter
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-600 hover:text-gray-900 text-sm">
                  Discord
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-600 hover:text-gray-900 text-sm">
                  GitHub
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-200">
          <p className="text-center text-gray-600 text-sm">
            CCAM© 2025 Cerebrix Agent Marketplace. Built for ETHGlobal 2025.
          </p>
        </div>
      </div>
    </footer>
  );
}

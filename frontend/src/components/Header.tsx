import { Link } from 'react-router-dom';

function Header() {
  return (
    <header className="mb-8 pb-4 border-b border-gray-800">
      <nav className="flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold">CCAM - Cross Chain Agent Marketplace</Link>
        <div className="flex gap-4">
          <Link to="/agents" className="hover:text-blue-400">Agents</Link>
        </div>
      </nav>
    </header>
  );
}

export default Header;
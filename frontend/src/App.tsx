import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import ExplorePage from './pages/ExplorePage';
import AgentDetailPage from './pages/AgentDetailPage';
import MyAgentsPage from './pages/MyAgentsPage';
import CreateAgentPage from './pages/CreateAgentPage';
import AnalyticsPage from './pages/AnalyticsPage';
import PythTradingDemo from './components/PythTradingDemo';
import ShowcasePage from './pages/ShowcasePage';
import { IntentsPage } from './pages/IntentsPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="/explore" element={<ExplorePage />} />
          <Route path="/agent/:agentId" element={<AgentDetailPage />} />
          <Route path="/my-agents" element={<MyAgentsPage />} />
          <Route path="/create" element={<CreateAgentPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/intents" element={<IntentsPage />} />
          <Route path="/pyth-demo" element={<PythTradingDemo />} />
          <Route path="/showcase" element={<ShowcasePage />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;

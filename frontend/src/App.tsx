import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import HomePage from './pages/HomePage';
import AgentListPage from './pages/AgentListPage';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-900 text-white">
        <div className="container mx-auto p-8">
          <Header />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/agents" element={<AgentListPage />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Link, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import LeadDashboard from './components/LeadDashboard';
import LeadProfile from './components/LeadProfile';
import PerformanceDashboard from './components/PerformanceDashboard';
import LoadingScreen from './components/LoadingScreen';

const AppHeader = () => {
  const location = useLocation();
  const isSubPage = location.pathname === '/performance' || location.pathname.startsWith('/leads/');
  return (
    <header className="text-center mb-8 flex justify-between items-center">
      <div className="w-1-3 text-left">{isSubPage && (<Link to="/" className="text-blue-400 hover:text-blue-300 transition-colors font-semibold">&larr; Leads Dashboard</Link>)}</div>
      <div className="w-1-3"><h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-300">AI-Powered CRM</h1></div>
      <div className="w-1-3 text-right">{!isSubPage && (<Link to="/performance" className="text-blue-400 hover:text-blue-300 transition-colors font-semibold">Performance Dashboard &rarr;</Link>)}</div>
    </header>
  );
};


const AppContent = () => {
  const [isServerReady, setIsServerReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {

    navigate('/', { replace: true });

    const checkServerStatus = () => {
      fetch('http://localhost:5000/api/status')
        .then(res => res.json())
        .then(data => {
          if (data.status === 'ready') {
            setIsServerReady(true);
          } else {
            setTimeout(checkServerStatus, 2000);
          }
        })
        .catch(error => {
          console.error("Could not connect to server, retrying...", error);
          setTimeout(checkServerStatus, 2000);
        });
    };
    checkServerStatus();
  }, []);

  return (
    <>
      <AnimatePresence>
        {!isServerReady && <LoadingScreen />}
      </AnimatePresence>
      
      <div className={`transition-opacity duration-500 ${isServerReady ? 'opacity-100' : 'opacity-0'}`}>
        <div className="min-h-screen flex flex-col items-center p-4 sm:p-6 lg:p-8">
          <div className="w-full max-w-6xl">
            <AppHeader />
            <main>
              <Routes>
                <Route path="/" element={<LeadDashboard />} />
                <Route path="/leads/:id" element={<LeadProfile />} />
                <Route path="/performance" element={<PerformanceDashboard />} />
              </Routes>
            </main>
          </div>
        </div>
      </div>
    </>
  );
}


function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
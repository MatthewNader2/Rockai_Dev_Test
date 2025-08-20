// src/App.jsx
import React, { useState, useEffect, useRef } from 'react'; // Import useRef
import { BrowserRouter as Router, Route, Routes, Link, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { customFetch as fetch } from './utils/api';
import LanguageSwitcher from './components/LanguageSwitcher';
import LeadDashboard from './components/LeadDashboard';
import LeadProfile from './components/LeadProfile';
import PerformanceDashboard from './components/PerformanceDashboard';
import LoadingScreen from './components/LoadingScreen';

// The AppHeader component does not need any changes.
const AppHeader = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const isSubPage = location.pathname === '/performance' || location.pathname.startsWith('/leads/');
  
  return (
    // Use a relative container to position the side elements
    <header className="relative text-center mb-8 h-14 flex items-center justify-center">
      
      {/* Left Side: Absolutely positioned to the left */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2">
        {isSubPage && (
          <Link to="/" className="text-blue-400 hover:text-blue-300 transition-colors font-semibold whitespace-nowrap">
            &larr; {t('leadsDashboardLink')}
          </Link>
        )}
      </div>

      {/* Center: The title remains centered */}
      <div>
        <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-300">
          {t('appTitle')}
        </h1>
      </div>

      {/* Right Side: Absolutely positioned to the right */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center space-x-4">
        {!isSubPage && (
          <Link to="/performance" className="text-blue-400 hover:text-blue-300 transition-colors font-semibold whitespace-nowrap">
            {t('performanceDashboardLink')} &rarr;
          </Link>
        )}
        <LanguageSwitcher />
      </div>
    </header>
  );
};

// The fix is inside this component
const AppContent = () => {
  const [isServerReady, setIsServerReady] = useState(false);
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  
  // --- THIS IS THE FIX ---
  // We use a ref to track if the initial navigation has already occurred.
  const hasForcedNavigate = useRef(false);

  useEffect(() => {
    // Only run the "navigate home" command ONCE on the very first render.
    if (!hasForcedNavigate.current) {
      navigate('/', { replace: true });
      hasForcedNavigate.current = true; // Set the flag to true so it never runs again.
    }

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
  }, [navigate]); // The dependency array is correct.

  useEffect(() => {
    document.documentElement.dir = i18n.dir();
    document.documentElement.lang = i18n.language;
  }, [i18n, i18n.language]);

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
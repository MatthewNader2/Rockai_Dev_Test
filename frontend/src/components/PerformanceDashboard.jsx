import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { customFetch as fetch } from '../utils/api';
import EnhancedDisplay from './EnhancedDisplay';

const InsightCard = ({ title, data, loading }) => {
  const { t } = useTranslation();
  return (
    <div className="bg-slate-800 rounded-xl shadow-2xl p-6 h-full">
      <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-300 mb-4">{title}</h3>
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
        </div>
      ) : data ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {data.strategicPatterns ? (
            <EnhancedDisplay data={data.strategicPatterns} keywords={data.keywords} />
          ) : (
            Object.entries(data).map(([key, value]) => {
              if (key === 'keywords') return null;
              return (
                <div key={key}>
                  <h4 className="font-semibold text-slate-300 capitalize">{t(key)}</h4>
                  <EnhancedDisplay data={value} keywords={data.keywords} />
                </div>
              );
            })
          )}
        </motion.div>
      ) : (
        <p className="text-red-400">{t('couldNotLoadInsights')}</p>
      )}
    </div>
  );
};

const PerformanceDashboard = () => {
  const { t, i18n } = useTranslation();
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [individualInsights, setIndividualInsights] = useState(null);
  const [teamInsights, setTeamInsights] = useState(null);
  const [globalPatterns, setGlobalPatterns] = useState(null);
  const [individualLoading, setIndividualLoading] = useState(false);
  const [teamLoading, setTeamLoading] = useState(true);
  const [globalLoading, setGlobalLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:5000/api/users').then(res => res.json()).then(setUsers);
    setTeamLoading(true);
    fetch('http://localhost:5000/api/performance/team')
      .then(res => res.json())
      .then(setTeamInsights)
      .finally(() => setTeamLoading(false));
    setGlobalLoading(true);
    fetch('http://localhost:5000/api/performance/global-patterns')
      .then(res => res.json())
      .then(setGlobalPatterns)
      .finally(() => setGlobalLoading(false));
  }, [i18n.language]);

  useEffect(() => {
    if (selectedUser) {
      setIndividualLoading(true);
      setIndividualInsights(null);
      fetch(`http://localhost:5000/api/performance/individual/${selectedUser}`)
        .then(res => res.json())
        .then(setIndividualInsights)
        .catch(err => console.error("Failed to fetch individual insights", err))
        .finally(() => setIndividualLoading(false));
    }
  }, [selectedUser, i18n.language]);

  const contentVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h2 className="text-3xl font-semibold mb-6 text-slate-300">{t('performanceAndCoaching')}</h2>
    
      <div className="mb-8">
        <InsightCard title={t('globalStrategicPatterns')} data={globalPatterns} loading={globalLoading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-slate-800 rounded-xl shadow-2xl p-6 flex flex-col">
          <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-300 mb-4">
            {t('individualSalesCoach')}
          </h3>
          <select
            value={selectedUser}
            onChange={e => setSelectedUser(e.target.value)}
            className="w-full bg-slate-700 border-slate-600 rounded-md shadow-sm text-white focus:ring-blue-500 focus:border-blue-500 mb-4"
          >
            <option value="">{t('selectSalesRep')}</option>
            {users.map(user => <option key={user.id} value={user.id}>{user.name}</option>)}
          </select>
          <div className="mt-4 flex-grow">
            <AnimatePresence mode="wait">
              {individualLoading && (
                <motion.div key="loading" variants={contentVariants} initial="initial" animate="animate" exit="exit" className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
                  <p className="ml-3 text-slate-400">{t('generatingCoaching')}</p>
                </motion.div>
              )}
              {!individualLoading && individualInsights && (
                <motion.div key="data" variants={contentVariants} initial="initial" animate="animate" exit="exit" className="space-y-4">
                  {Object.entries(individualInsights).map(([key, value]) => {
                    if (key === 'keywords') return null;
                    return (
                      <div key={key}>
                        <h4 className="font-semibold text-slate-300 capitalize">{t(key)}</h4>
                        <EnhancedDisplay data={value} keywords={individualInsights.keywords} />
                      </div>
                    );
                  })}
                </motion.div>
              )}
              {!individualLoading && !individualInsights && !selectedUser && (
                 <motion.div key="prompt" variants={contentVariants} initial="initial" animate="animate" exit="exit" className="flex items-center justify-center h-full text-center text-slate-500">
                  <p>{t('selectSalesRepPrompt')}</p>
                </motion.div>
              )}
              {!individualLoading && !individualInsights && selectedUser && (
                 <motion.div key="error" variants={contentVariants} initial="initial" animate="animate" exit="exit" className="flex items-center justify-center h-full text-center text-red-400">
                  <p>{t('couldNotLoadInsightsUser')}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        <InsightCard title={t('teamAndCompanyInsights')} data={teamInsights} loading={teamLoading} />
      </div>
    </motion.div>
  );
};

export default PerformanceDashboard;
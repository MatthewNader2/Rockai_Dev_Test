import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import EnhancedDisplay from './EnhancedDisplay';


const RecursiveDisplay = ({ data }) => {
  if (typeof data === 'string') { return <p className="text-slate-400 text-sm">{data}</p>; }
  if (Array.isArray(data)) { return ( <ul className="list-disc list-inside space-y-1 pl-2">{data.map((item, index) => ( <li key={index} className="text-slate-400 text-sm"><EnhancedDisplay data={item} /></li> ))}</ul> ); }
  if (typeof data === 'object' && data !== null) { return ( <div className="space-y-2 mt-1 pl-2 border-l-2 border-slate-700">{Object.entries(data).map(([key, value]) => ( <div key={key}><h5 className="font-semibold text-slate-300 capitalize text-sm">{key.replace(/([A-Z])/g, ' $1')}</h5><EnhancedDisplay data={value} /></div> ))}</div> ); }
  return null;
};

const InsightCard = ({ title, data, loading }) => (
  <div className="bg-slate-800 rounded-xl shadow-2xl p-6 h-full">
    <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-300 mb-4">{title}</h3>
    {loading ? ( <div className="flex items-center justify-center h-48"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div></div> ) 
    : data ? ( 
      <motion.div initial={{opacity: 0}} animate={{opacity: 1}} className="space-y-4">
        {Object.entries(data).map(([key, value]) => {
          if (key === 'keywords') return null;
          return (
            <div key={key}>
              <h4 className="font-semibold text-slate-300 capitalize">{key.replace(/([A-Z])/g, ' $1')}</h4>

              <EnhancedDisplay data={value} keywords={data.keywords} />
            </div>
          );
        })}
      </motion.div> 
    ) 
    : ( <p className="text-red-400">Could not load insights.</p> )}
  </div>
);

const PerformanceDashboard = () => {
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

    fetch('http://localhost:5000/api/performance/team')
      .then(res => res.json())
      .then(setTeamInsights)
      .finally(() => setTeamLoading(false));

    fetch('http://localhost:5000/api/performance/global-patterns')
      .then(res => res.json())
      .then(setGlobalPatterns)
      .finally(() => setGlobalLoading(false));
  }, []);

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
  }, [selectedUser]);

  const contentVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h2 className="text-3xl font-semibold mb-6 text-slate-300">Performance & Coaching</h2>
    
      <div className="mb-8">
        <InsightCard title="Global Strategic Patterns" data={globalPatterns} loading={globalLoading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-slate-800 rounded-xl shadow-2xl p-6 flex flex-col">
          <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-300 mb-4">
            Individual Sales Coach
          </h3>
          <select
            value={selectedUser}
            onChange={e => setSelectedUser(e.target.value)}
            className="w-full bg-slate-700 border-slate-600 rounded-md shadow-sm text-white focus:ring-blue-500 focus:border-blue-500 mb-4"
          >
            <option value="">-- Select a Sales Rep --</option>
            {users.map(user => <option key={user.id} value={user.id}>{user.name}</option>)}
          </select>
          <div className="mt-4 flex-grow">
            <AnimatePresence mode="wait">
              {individualLoading && (
                <motion.div key="loading" variants={contentVariants} initial="initial" animate="animate" exit="exit" className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
                  <p className="ml-3 text-slate-400">Generating Coaching...</p>
                </motion.div>
              )}
              {!individualLoading && individualInsights && (
                <motion.div key="data" variants={contentVariants} initial="initial" animate="animate" exit="exit" className="space-y-4">
                  {Object.entries(individualInsights).map(([key, value]) => (
                    <div key={key}>
                      <h4 className="font-semibold text-slate-300 capitalize">{key.replace(/([A-Z])/g, ' $1')}</h4>
                      <EnhancedDisplay data={value} />
                    </div>
                  ))}
                </motion.div>
              )}
              {!individualLoading && !individualInsights && !selectedUser && (
                 <motion.div key="prompt" variants={contentVariants} initial="initial" animate="animate" exit="exit" className="flex items-center justify-center h-full text-center text-slate-500">
                  <p>Select a sales representative to view their AI-powered performance analysis and coaching tips.</p>
                </motion.div>
              )}
              {!individualLoading && !individualInsights && selectedUser && (
                 <motion.div key="error" variants={contentVariants} initial="initial" animate="animate" exit="exit" className="flex items-center justify-center h-full text-center text-red-400">
                  <p>Could not load insights for this user.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        <InsightCard title="Team & Company Insights" data={teamInsights} loading={teamLoading} />
      </div>
    </motion.div>
  );
};

export default PerformanceDashboard;
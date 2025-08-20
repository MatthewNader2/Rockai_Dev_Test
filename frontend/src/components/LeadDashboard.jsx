// src/components/LeadDashboard.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { customFetch as fetch } from '../utils/api';
import EnhancedDisplay from './EnhancedDisplay';

const KpiCard = ({ title, value, unit = '' }) => (
    <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
      <h3 className="text-slate-400 text-sm font-medium">{title}</h3>
      <p className="text-4xl font-bold text-white mt-1">
        {value}<span className="text-2xl text-slate-300">{unit}</span>
      </p>
    </div>
  );
  
  const StarIcon = ({ isPinned, ...props }) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
      <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z" clipRule="evenodd" 
      className={isPinned ? 'text-yellow-400' : 'text-slate-600 hover:text-yellow-500'} />
    </svg>
  );
  
  const LeadCard = ({ lead, isPinned, onTogglePin }) => {
    const { t } = useTranslation();
    const itemVariants = {
      hidden: { y: 20, opacity: 0 },
      visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 100 } },
    };
  
    return (
      <motion.div
        layout 
        variants={itemVariants}
        className={`bg-slate-800 rounded-lg shadow-lg p-5 flex flex-col justify-between h-full cursor-pointer border transition-all duration-300 ${isPinned ? 'border-yellow-400' : 'border-transparent hover:border-blue-500'}`}
      >
        <Link to={`/leads/${lead.id}`} className="flex-grow">
          <h3 className="text-xl font-bold text-slate-100 truncate">
            {lead.name && lead.name.toLowerCase().trim() !== 'no name' ? lead.name : t('unnamedLead')}
          </h3>
          <p className="text-slate-400 text-sm">{lead.source}</p>
        </Link>
        <div className="mt-4 flex justify-between items-center">
          <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
            lead.status === 'open_deal' ? 'bg-green-500 text-green-900' :
            lead.status === 'fresh_lead' ? 'bg-blue-500 text-blue-900' :
            'bg-yellow-500 text-yellow-900'
          }`}>
            {t(lead.status)}
          </span>
          <button onClick={() => onTogglePin(lead.id)} className="z-10">
            <StarIcon isPinned={isPinned} />
          </button>
        </div>
      </motion.div>
    );
  };
  

const LeadDashboard = () => {
  const { t, i18n } = useTranslation();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [filterOptions, setFilterOptions] = useState({ statuses: [], sources: [], interests: [] });

  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({ status: 'all', source: 'all', interest: 'all' });
  const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'desc' });
  
  const [pinnedLeads, setPinnedLeads] = useState(() => {
    const savedPins = localStorage.getItem('pinnedLeads');
    return savedPins ? new Set(JSON.parse(savedPins)) : new Set();
  });
  
  const [kpiData, setKpiData] = useState(null);
  const [globalPatterns, setGlobalPatterns] = useState(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch('http://localhost:5000/api/leads'),
      fetch('http://localhost:5000/api/leads/filters'),
      fetch('http://localhost:5000/api/dashboard-kpis'),
      fetch('http://localhost:5000/api/performance/global-patterns')
    ])
    .then(async ([leadsRes, filtersRes, kpisRes, patternsRes]) => {
      setLeads(await leadsRes.json());
      setFilterOptions(await filtersRes.json());
      setKpiData(await kpisRes.json());
      setGlobalPatterns(await patternsRes.json());
    })
    .catch(error => console.error('Error fetching dashboard data:', error))
    .finally(() => setLoading(false));
  }, [i18n.language]); // Re-fetch data when language changes

  useEffect(() => {
    localStorage.setItem('pinnedLeads', JSON.stringify([...pinnedLeads]));
  }, [pinnedLeads]);

  const processedLeads = useMemo(() => {
    let filtered = [...leads];

    if (searchTerm) {
      filtered = filtered.filter(lead =>
        lead.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filters.status !== 'all') {
      filtered = filtered.filter(lead => lead.status === filters.status);
    }

    if (filters.source !== 'all') {
      filtered = filtered.filter(lead => lead.source === filters.source);
    }

    if (filters.interest !== 'all') {
    filtered = filtered.filter(lead => lead.interest === filters.interest);
    }

    filtered.sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];
      
      if (sortConfig.key === 'createdAt') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    
    const pinned = filtered.filter(lead => pinnedLeads.has(lead.id));
    const unpinned = filtered.filter(lead => !pinnedLeads.has(lead.id));
    
    return [...pinned, ...unpinned];

  }, [leads, searchTerm, filters, sortConfig, pinnedLeads]);

  const handleTogglePin = (leadId) => {
    setPinnedLeads(prev => {
      const newPins = new Set(prev);
      if (newPins.has(leadId)) {
        newPins.delete(leadId);
      } else {
        newPins.add(leadId);
      }
      return newPins;
    });
  };

  const handleReset = () => {
    setSearchTerm('');
    setFilters({ status: 'all', source: 'all', interest: 'all' });
    setSortConfig({ key: 'createdAt', direction: 'desc' });
  };

  if (loading) { return <div className="text-center text-xl">{t('loadingDashboard')}</div>; }

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KpiCard title={t('totalLeads')} value={kpiData?.totalLeads} />
        <KpiCard title={t('freshLeads')} value={kpiData?.freshLeads} />
        <KpiCard title={t('openDeals')} value={kpiData?.openDeals} />
        <KpiCard title={t('conversionRate')} value={kpiData?.conversionRate} unit="%" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        <div className="lg:col-span-2 bg-slate-800 p-6 rounded-lg shadow-lg">
          <h3 className="text-xl font-semibold text-slate-200 mb-4">{t('pipelineDistribution')}</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={kpiData?.chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
              <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 12 }} tickFormatter={(value) => t(value.replace(' ', '_'))} />
              <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} />
              <Tooltip cursor={{fill: 'rgba(71, 85, 105, 0.5)'}} contentStyle={{backgroundColor: '#1e293b', border: '1px solid #334155', color: '#cbd5e1'}}/>
              <Bar dataKey="count" fill="#38bdf8" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
          <h3 className="text-xl font-semibold text-slate-200 mb-4">{t('proactiveAiInsight')}</h3>
          {globalPatterns?.strategicPatterns?.[0] ? (
            <EnhancedDisplay data={globalPatterns.strategicPatterns[0]} keywords={globalPatterns.strategicPatterns[0]?.keywords} />
          ) : (
            <p className="text-slate-400">{t('aiAnalyzing')}</p>
          )}
        </div>
      </div>

      <h2 className="text-3xl font-semibold mb-6 text-slate-300">{t('leadsList')}</h2>
      

      <div className="bg-slate-800 p-4 rounded-lg mb-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 items-end">
        <div className="lg:col-span-2">
          <label htmlFor="search" className="block text-sm font-medium text-slate-400 mb-1">{t('searchByName')}</label>
          <input type="text" id="search" placeholder={t('searchPlaceholder')} value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-700 border-slate-600 rounded-md shadow-sm text-white focus:ring-blue-500 focus:border-blue-500"/>
        </div>
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-slate-400 mb-1">{t('status')}</label>
          <select id="status" value={filters.status} onChange={e => setFilters({...filters, status: e.target.value})}
            className="w-full bg-slate-700 border-slate-600 rounded-md shadow-sm text-white focus:ring-blue-500 focus:border-blue-500">
            <option value="all">{t('allStatuses')}</option>
            {filterOptions.statuses?.map(s => <option key={s} value={s}>{t(s)}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="source" className="block text-sm font-medium text-slate-400 mb-1">{t('source')}</label>
          <select id="source" value={filters.source} onChange={e => setFilters({...filters, source: e.target.value})}
            className="w-full bg-slate-700 border-slate-600 rounded-md shadow-sm text-white focus:ring-blue-500 focus:border-blue-500">
            <option value="all">{t('allSources')}</option>
            {filterOptions.sources?.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div>
        <label htmlFor="interest" className="block text-sm font-medium text-slate-400 mb-1">{t('interestLevel')}</label>
        <select id="interest" value={filters.interest} onChange={e => setFilters({...filters, interest: e.target.value})}
            className="w-full bg-slate-700 border-slate-600 rounded-md shadow-sm text-white focus:ring-blue-500 focus:border-blue-500 capitalize">
            <option value="all">{t('allInterests')}</option>
            {filterOptions.interests?.map(i => <option key={i} value={i} className="capitalize">{t(i)}</option>)}
        </select>
        </div>

        <button onClick={handleReset} className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-md w-full">{t('reset')}</button>
      </div>


      <motion.div
        layout 
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
      >
        {processedLeads.map(lead => (
          <LeadCard key={lead.id} lead={lead} isPinned={pinnedLeads.has(lead.id)} onTogglePin={handleTogglePin} />
        ))}
      </motion.div>
    </div>
  );
};

export default LeadDashboard;
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { customFetch as fetch } from '../utils/api';


const renderAiContent = (content) => {
  if (typeof content === 'object' && content !== null && content.summary) {
    return content.summary;
  }
  if (typeof content === 'object' && content !== null) {
    return Object.values(content).join(' ');
  }
  return content;
};


const LeadProfile = () => {
  const { t, i18n } = useTranslation();
  const [lead, setLead] = useState(null);
  const [aiInsights, setAiInsights] = useState(null);
  const [isLoadingAi, setIsLoadingAi] = useState(true);
  const { id } = useParams();

  useEffect(() => {
    setLead(null);
    setAiInsights(null);
    setIsLoadingAi(true);

    fetch(`http://localhost:5000/api/leads/${id}`)
      .then(response => response.json())
      .then(data => {
        setLead(data);
        fetch(`http://localhost:5000/api/leads/${id}/ai-summary`, { method: 'POST' })
          .then(res => res.json())
          .then(aiData => {
            setAiInsights(aiData);
          })
          .catch(error => console.error('Error fetching AI insights:', error))
          .finally(() => setIsLoadingAi(false));
      })
      .catch(error => console.error('Error fetching lead details:', error));
  }, [id, i18n.language]);

  if (!lead) {
    return <div className="text-center text-xl">{t('loadingProfile')}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
      transition={{ duration: 0.5 }}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-slate-800 rounded-xl shadow-2xl p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 border-b border-slate-700 pb-4">
            <h2 className="text-3xl font-bold text-white mb-2 sm:mb-0">
              {lead.name && lead.name.toLowerCase().trim() !== 'no name' 
                ? lead.name 
                : t('unnamedLeadFrom', { source: lead.source })}
            </h2>
            <span className="px-4 py-1.5 text-sm font-bold rounded-full bg-slate-700 text-teal-300">
              {t(lead.status).toUpperCase()}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-slate-900 p-4 rounded-lg"><h4 className="text-sm font-semibold text-slate-400 mb-1">{t('source')}</h4><p className="text-lg text-slate-200">{lead.source}</p></div>
            <div className="bg-slate-900 p-4 rounded-lg"><h4 className="text-sm font-semibold text-slate-400 mb-1">{t('interestLevel')}</h4><p className="text-lg text-slate-200 capitalize">{t(lead.interest)}</p></div>
            <div className="bg-slate-900 p-4 rounded-lg"><h4 className="text-sm font-semibold text-slate-400 mb-1">{t('budget')}</h4><p className="text-lg text-slate-200">{lead.budget > 0 ? `$${lead.budget.toLocaleString()}` : t('notSpecified')}</p></div>
            <div className="bg-slate-900 p-4 rounded-lg"><h4 className="text-sm font-semibold text-slate-400 mb-1">{t('dateCreated')}</h4><p className="text-lg text-slate-200">{new Date(lead.createdAt).toLocaleDateString()}</p></div>
          </div>
          <div className="space-y-6">
            <div><h3 className="text-xl font-semibold text-slate-300 mb-2">{t('notes')}</h3><div className="bg-slate-900 p-4 rounded-lg text-slate-300">{lead.notes && lead.notes.length > 0 ? (<ul className="list-disc list-inside space-y-2">{Array.isArray(lead.notes) ? lead.notes.map((note, index) => <li key={index}>{note}</li>) : <li>{lead.notes}</li>}</ul>) : (<p>{t('noNotesAvailable')}</p>)}</div></div>
            <div><h3 className="text-xl font-semibold text-slate-300 mb-2">{t('description')}</h3><div className="bg-slate-900 p-4 rounded-lg text-slate-300"><p>{lead.description || t('noDescriptionProvided')}</p></div></div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl shadow-2xl p-6 sm:p-8">
          <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-300 mb-4">
            {t('aiIntelligence')}
          </h3>
          {isLoadingAi ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
              <p className="ml-3 text-slate-400">{t('generatingInsights')}</p>
            </div>
          ) : aiInsights ? (
            <motion.div initial={{opacity: 0}} animate={{opacity: 1}} transition={{duration: 0.5}} className="space-y-5">
              <div>
                <h4 className="font-semibold text-slate-300 mb-1">{t('summary')}</h4>
                <p className="text-slate-400 text-sm">{renderAiContent(aiInsights.summary)}</p>
              </div>
              <div className="border-t border-slate-700 pt-4">
                <h4 className="font-semibold text-slate-300 mb-2">{t('recommendations')}</h4>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-start"><span className="mr-2 mt-1">🎯</span><div><strong>{t('nextAction')}:</strong> {renderAiContent(aiInsights.nextBestAction)}</div></li>
                  <li className="flex items-start"><span className="mr-2 mt-1">🤝</span><div><strong>{t('approach')}:</strong> {renderAiContent(aiInsights.engagementApproach)}</div></li>
                  <li className="flex items-start"><span className="mr-2 mt-1">⏰</span><div><strong>{t('timing')}:</strong> {renderAiContent(aiInsights.timingAdvice)}</div></li>
                  <li className="flex items-start"><span className="mr-2 mt-1">🎁</span><div><strong>{t('offer')}:</strong> {renderAiContent(aiInsights.recommendedOffer)}</div></li>
                </ul>
              </div>
            </motion.div>
          ) : (
            <p className="text-red-400">{t('couldNotGenerateAiInsights')}</p>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default LeadProfile;
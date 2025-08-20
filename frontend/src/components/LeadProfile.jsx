import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const LeadProfile = () => {
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
            setIsLoadingAi(false);
          })
          .catch(error => {
            console.error('Error fetching AI insights:', error);
            setIsLoadingAi(false);
          });
      })
      .catch(error => console.error('Error fetching lead details:', error));
  }, [id]);

  if (!lead) {
    return <div className="text-center text-xl">Loading Profile...</div>;
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
              {lead.nameEn && lead.nameEn.toLowerCase().trim() !== 'no name' 
                ? lead.nameEn 
                : `[Unnamed Lead from ${lead.source}]`}
            </h2>
            <span className="px-4 py-1.5 text-sm font-bold rounded-full bg-slate-700 text-teal-300">
              {lead.status.replace('_', ' ').toUpperCase()}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-slate-900 p-4 rounded-lg"><h4 className="text-sm font-semibold text-slate-400 mb-1">Source</h4><p className="text-lg text-slate-200">{lead.source}</p></div>
            <div className="bg-slate-900 p-4 rounded-lg"><h4 className="text-sm font-semibold text-slate-400 mb-1">Interest Level</h4><p className="text-lg text-slate-200 capitalize">{lead.interest}</p></div>
            <div className="bg-slate-900 p-4 rounded-lg"><h4 className="text-sm font-semibold text-slate-400 mb-1">Budget</h4><p className="text-lg text-slate-200">{lead.budget > 0 ? `$${lead.budget.toLocaleString()}` : 'Not Specified'}</p></div>
            <div className="bg-slate-900 p-4 rounded-lg"><h4 className="text-sm font-semibold text-slate-400 mb-1">Date Created</h4><p className="text-lg text-slate-200">{new Date(lead.createdAt).toLocaleDateString()}</p></div>
          </div>
          <div className="space-y-6">
            <div><h3 className="text-xl font-semibold text-slate-300 mb-2">Notes</h3><div className="bg-slate-900 p-4 rounded-lg text-slate-300">{lead.notes && lead.notes.length > 0 ? (<ul className="list-disc list-inside space-y-2">{Array.isArray(lead.notes) ? lead.notes.map((note, index) => <li key={index}>{note}</li>) : <li>{lead.notes}</li>}</ul>) : (<p>No notes available.</p>)}</div></div>
            <div><h3 className="text-xl font-semibold text-slate-300 mb-2">Description</h3><div className="bg-slate-900 p-4 rounded-lg text-slate-300"><p>{lead.description || 'No description provided.'}</p></div></div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl shadow-2xl p-6 sm:p-8">
          <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-300 mb-4">
            AI Intelligence
          </h3>
          {isLoadingAi ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
              <p className="ml-3 text-slate-400">Generating Insights...</p>
            </div>
          ) : aiInsights ? (
            <motion.div initial={{opacity: 0}} animate={{opacity: 1}} transition={{duration: 0.5}} className="space-y-5">
              <div>
                <h4 className="font-semibold text-slate-300 mb-1">Summary</h4>
                <p className="text-slate-400 text-sm">{aiInsights.summary}</p>
              </div>
              <div className="border-t border-slate-700 pt-4">
                <h4 className="font-semibold text-slate-300 mb-2">Recommendations</h4>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-start"><span className="mr-2 mt-1">🎯</span><div><strong>Next Action:</strong> {aiInsights.nextBestAction}</div></li>
                  <li className="flex items-start"><span className="mr-2 mt-1">🤝</span><div><strong>Approach:</strong> {aiInsights.engagementApproach}</div></li>
                  <li className="flex items-start"><span className="mr-2 mt-1">⏰</span><div><strong>Timing:</strong> {aiInsights.timingAdvice}</div></li>
                  <li className="flex items-start"><span className="mr-2 mt-1">🎁</span><div><strong>Offer:</strong> {aiInsights.recommendedOffer}</div></li>
                </ul>
              </div>
            </motion.div>
          ) : (
            <p className="text-red-400">Could not generate AI insights.</p>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default LeadProfile;
import React from 'react';
import { useTranslation } from 'react-i18next';


const highlightKeywords = (text, keywords = []) => {
  if (!keywords || !keywords.length || typeof text !== 'string') {
    return text;
  }
  const regex = new RegExp(`\\b(${keywords.join('|')})\\b`, 'gi');
  const parts = text.split(regex);
  return parts.map((part, index) =>
    regex.test(part) ? <strong key={index} className="text-slate-200">{part}</strong> : part
  );
};

const EnhancedDisplay = ({ data, keywords }) => {
  const { t } = useTranslation();

  if (typeof data === 'string' || typeof data === 'number') {
    return <p className="text-slate-400 text-sm">{highlightKeywords(String(data), keywords)}</p>;
  }

  if (Array.isArray(data)) {
    return (
      <ul className="space-y-2 mt-1">
        {data.map((item, index) => (
          <li key={index} className="flex">
            <span className="text-slate-400 mr-2 mt-1">∙</span>
            <div className="flex-1">
              <EnhancedDisplay data={item} keywords={keywords} />
            </div>
          </li>
        ))}
      </ul>
    );
  }

  if (typeof data === 'object' && data !== null) {
    return (
      <div className="space-y-3 mt-1 pl-3 border-l-2 border-slate-700">
        {Object.entries(data).map(([key, value]) => {
          if (key === 'keywords') return null;
          
          
          const translatedKey = t(key); 
          const lowerKey = key.toLowerCase();

          if (lowerKey.includes('focus') || lowerKey.includes('pattern')) {
            return (
              <div key={key}>
                <h5 className="font-semibold text-slate-300 capitalize">{translatedKey}</h5>
                <p className="text-teal-300 font-bold text-sm mt-1">🎯 {highlightKeywords(String(value), keywords)}</p>
              </div>
            );
          }
          if (lowerKey.includes('status')) {
            return (
              <div key={key}>
                <h5 className="font-semibold text-slate-300 capitalize">{translatedKey}</h5>
                <span className={`px-3 py-1 mt-1 inline-block text-xs font-semibold rounded-full ${
                  String(value).toLowerCase().includes('weak') || String(value).toLowerCase().includes('concerning') || String(value).toLowerCase().includes('improvement') ? 'bg-yellow-500 text-yellow-900' :
                  'bg-green-500 text-green-900'
                }`}>
                  {String(value)}
                </span>
              </div>
            );
          }
          return (
            <div key={key}>
              <h5 className="font-semibold text-slate-300 capitalize">{translatedKey}</h5>
              <EnhancedDisplay data={value} keywords={keywords} />
            </div>
          );
        })}
      </div>
    );
  }
  return null;
};

export default EnhancedDisplay;
import React from 'react';
import { useTranslation } from 'react-i18next';

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="flex items-center space-x-2">
      <button
        onClick={() => changeLanguage('en')}
        className={`px-3 py-1 text-sm rounded-md transition-colors ${i18n.language === 'en' ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-300'}`}
      >
        EN
      </button>
      <button
        onClick={() => changeLanguage('ar')}
        className={`px-3 py-1 text-sm rounded-md transition-colors ${i18n.language === 'ar' ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-300'}`}
      >
        AR
      </button>
    </div>
  );
};

export default LanguageSwitcher;
import React from 'react';
import { motion } from 'framer-motion';

const LoadingScreen = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900 bg-opacity-90 backdrop-blur-sm"
    >
      <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-blue-400"></div>
      <h2 className="mt-6 text-2xl font-semibold text-slate-200">Initializing AI Engine</h2>
      <p className="mt-2 text-slate-400">Performing initial data analysis... Please wait.</p>
    </motion.div>
  );
};

export default LoadingScreen;
import React, { useEffect, useState } from 'react';
import { Sparkles, RefreshCw } from 'lucide-react';
import { generateFinancialInsights } from '../services/geminiService';
import { Transaction, FinancialSummary } from '../types';

interface AIInsightsProps {
  transactions: Transaction[];
  summary: FinancialSummary;
  userName: string;
  month: string;
  year: number;
}

export const AIInsights: React.FC<AIInsightsProps> = ({ 
  transactions, 
  summary, 
  userName,
  month,
  year
}) => {
  const [insights, setInsights] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadedOnce, setLoadedOnce] = useState(false);

  const fetchInsights = async () => {
    setLoading(true);
    const results = await generateFinancialInsights(transactions, summary, userName, month, year);
    setInsights(results);
    setLoading(false);
    setLoadedOnce(true);
  };

  useEffect(() => {
    // Initial fetch when props change significantly, debounced slightly in a real app, 
    // but here we want to avoid infinite loops or excessive API calls.
    // We only fetch automatically if it hasn't loaded yet.
    if (!loadedOnce) {
        fetchInsights();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userName, month, year]); 

  return (
    <div className="bg-gradient-to-r from-violet-600 to-purple-600 rounded-2xl p-6 shadow-lg text-white mb-8 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl"></div>
      
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
            <Sparkles className="text-yellow-300" size={24} />
          </div>
          <div>
            <h3 className="font-bold text-lg leading-tight">Insights da ConFinance IA</h3>
            <p className="text-violet-200 text-sm">Consultoria financeira inteligente</p>
          </div>
        </div>
        
        <button 
          onClick={fetchInsights}
          disabled={loading}
          className={`p-2 rounded-full hover:bg-white/10 transition-colors ${loading ? 'animate-spin' : ''}`}
        >
          <RefreshCw size={20} className="text-white/80" />
        </button>
      </div>

      <div className="space-y-2 relative z-10">
        {loading ? (
          <div className="space-y-2 animate-pulse">
            <div className="h-4 bg-white/20 rounded w-3/4"></div>
            <div className="h-4 bg-white/20 rounded w-1/2"></div>
            <div className="h-4 bg-white/20 rounded w-5/6"></div>
          </div>
        ) : (
          insights.map((insight, idx) => (
            <div key={idx} className="flex items-start gap-2 text-sm md:text-base font-medium text-white/90">
              <span className="mt-1.5 w-1.5 h-1.5 bg-yellow-400 rounded-full flex-shrink-0"></span>
              <p>{insight}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
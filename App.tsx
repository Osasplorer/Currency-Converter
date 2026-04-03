/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowRightLeft, 
  TrendingUp, 
  Info, 
  RefreshCw, 
  Globe, 
  ChevronDown,
  Sparkles,
  DollarSign,
  Euro,
  Coins
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { format } from 'date-fns';
import { GoogleGenAI } from "@google/genai";
import { cn } from './lib/utils';

// --- Types ---
interface ExchangeRates {
  [key: string]: number;
}

interface CurrencyData {
  code: string;
  name: string;
  symbol: string;
  flag: string;
}

// --- Constants ---
const CURRENCIES: CurrencyData[] = [
  { code: 'USD', name: 'US Dollar', symbol: '$', flag: '🇺🇸' },
  { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺' },
  { code: 'GBP', name: 'British Pound', symbol: '£', flag: '🇬🇧' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', flag: '🇯🇵' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', flag: '🇦🇺' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', flag: '🇨🇦' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'Fr', flag: '🇨🇭' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', flag: '🇨🇳' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', flag: '🇮🇳' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', flag: '🇧🇷' },
  { code: 'NGN', name: 'Nigerian Naira', symbol: '₦', flag: '🇳🇬' },
  { code: 'GHS', name: 'Ghanaian Cedi', symbol: 'GH₵', flag: '🇬🇭' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R', flag: '🇿🇦' },
  { code: 'RUB', name: 'Russian Ruble', symbol: '₽', flag: '🇷🇺' },
  { code: 'MXN', name: 'Mexican Peso', symbol: '$', flag: '🇲🇽' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', flag: '🇸🇬' },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$', flag: '🇳🇿' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', flag: '🇦🇪' },
];

// --- Components ---

const CurrencySelect = ({ 
  value, 
  onChange, 
  label 
}: { 
  value: string; 
  onChange: (val: string) => void; 
  label: string 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selected = CURRENCIES.find(c => c.code === value) || CURRENCIES[0];

  return (
    <div className="relative flex-1">
      <label className="block text-xs font-medium text-slate-500 mb-1.5 ml-1 uppercase tracking-wider">
        {label}
      </label>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between bg-white border border-slate-200 rounded-xl px-4 py-3.5 text-left hover:border-indigo-400 transition-all focus:ring-2 focus:ring-indigo-500/20 outline-none"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{selected.flag}</span>
          <div>
            <div className="font-bold text-slate-900 leading-none">{selected.code}</div>
            <div className="text-xs text-slate-500 mt-0.5">{selected.name}</div>
          </div>
        </div>
        <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform", isOpen && "rotate-180")} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setIsOpen(false)} 
            />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute z-20 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden max-h-64 overflow-y-auto"
            >
              {CURRENCIES.map((currency) => (
                <button
                  key={currency.code}
                  onClick={() => {
                    onChange(currency.code);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left",
                    value === currency.code && "bg-indigo-50 text-indigo-700"
                  )}
                >
                  <span className="text-xl">{currency.flag}</span>
                  <div className="flex-1">
                    <div className="font-bold">{currency.code}</div>
                    <div className="text-xs opacity-70">{currency.name}</div>
                  </div>
                  {value === currency.code && <div className="w-2 h-2 rounded-full bg-indigo-500" />}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function App() {
  const [amount, setAmount] = useState<string>('1000');
  const [fromCurrency, setFromCurrency] = useState('USD');
  const [toCurrency, setToCurrency] = useState('EUR');
  const [rates, setRates] = useState<ExchangeRates | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [insights, setInsights] = useState<string>('');
  const [insightsLoading, setInsightsLoading] = useState(false);

  // Fetch rates
  const fetchRates = async () => {
    setLoading(true);
    try {
      const response = await fetch(`https://open.er-api.com/v6/latest/${fromCurrency}`);
      const data = await response.json();
      if (data.result === 'success') {
        setRates(data.rates);
        setLastUpdated(new Date(data.time_last_update_utc).toLocaleString());
        setError(null);
      } else {
        throw new Error('Failed to fetch rates');
      }
    } catch (err) {
      setError('Could not update exchange rates. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRates();
  }, [fromCurrency]);

  const convertedAmount = useMemo(() => {
    if (!rates || !rates[toCurrency]) return 0;
    const val = parseFloat(amount);
    return isNaN(val) ? 0 : val * rates[toCurrency];
  }, [amount, toCurrency, rates]);

  const handleSwap = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  };

  const getGeminiInsights = async () => {
    if (insightsLoading) return;
    setInsightsLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Provide a brief, professional insight (max 100 words) about the current economic relationship or trend between ${fromCurrency} and ${toCurrency}. Mention one factor that might influence their exchange rate right now.`,
      });
      setInsights(response.text || "No insights available at the moment.");
    } catch (err) {
      setInsights("Unable to load AI insights. Please check your connection.");
    } finally {
      setInsightsLoading(false);
    }
  };

  // Mock historical data for the chart
  const chartData = useMemo(() => {
    const baseRate = rates?.[toCurrency] || 1;
    return Array.from({ length: 7 }).map((_, i) => ({
      date: format(new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000), 'MMM dd'),
      rate: baseRate * (0.98 + Math.random() * 0.04)
    }));
  }, [rates, toCurrency]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
              <Coins className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-900">GlobalFX</h1>
              <p className="text-[10px] uppercase tracking-widest font-bold text-indigo-600">Real-time Exchange</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={fetchRates}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
              title="Refresh rates"
            >
              <RefreshCw className={cn("w-5 h-5", loading && "animate-spin")} />
            </button>
            <div className="hidden sm:block text-right">
              <p className="text-[10px] text-slate-400 uppercase font-bold">Last Updated</p>
              <p className="text-xs font-medium text-slate-600">{lastUpdated || 'Updating...'}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 md:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Main Converter Card */}
          <div className="lg:col-span-7 space-y-6">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 p-6 md:p-8"
            >
              <div className="space-y-8">
                {/* Amount Input */}
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider ml-1">
                    Amount to Convert
                  </label>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                      <DollarSign className="w-6 h-6" />
                    </div>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded-2xl pl-12 pr-6 py-5 text-3xl font-bold text-slate-900 outline-none transition-all"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {/* Currency Selection */}
                <div className="flex flex-col md:flex-row items-center gap-4 relative">
                  <CurrencySelect 
                    label="From" 
                    value={fromCurrency} 
                    onChange={setFromCurrency} 
                  />
                  
                  <button
                    onClick={handleSwap}
                    className="z-10 p-3 bg-white border border-slate-200 rounded-full shadow-md hover:shadow-lg hover:border-indigo-300 hover:text-indigo-600 transition-all group active:scale-90"
                  >
                    <ArrowRightLeft className="w-5 h-5 md:rotate-0 rotate-90 group-hover:rotate-180 transition-transform duration-500" />
                  </button>

                  <CurrencySelect 
                    label="To" 
                    value={toCurrency} 
                    onChange={setToCurrency} 
                  />
                </div>

                {/* Result Display */}
                <div className="bg-indigo-600 rounded-2xl p-8 text-white relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-700">
                    <Globe className="w-32 h-32" />
                  </div>
                  
                  <div className="relative z-10">
                    <p className="text-indigo-100 text-sm font-medium mb-2">
                      {amount} {fromCurrency} =
                    </p>
                    <div className="flex items-baseline gap-2">
                      <h2 className="text-5xl font-black tracking-tight">
                        {convertedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </h2>
                      <span className="text-2xl font-bold text-indigo-200">{toCurrency}</span>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-xs text-indigo-200/80 bg-white/10 w-fit px-3 py-1.5 rounded-full">
                      <TrendingUp className="w-3 h-3" />
                      <span>1 {fromCurrency} = {rates?.[toCurrency]?.toFixed(4)} {toCurrency}</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* AI Insights Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-indigo-50 border border-indigo-100 rounded-3xl p-6 relative overflow-hidden"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2 text-indigo-700">
                  <Sparkles className="w-5 h-5" />
                  <h3 className="font-bold">Gemini Insights</h3>
                </div>
                {!insights && !insightsLoading && (
                  <button 
                    onClick={getGeminiInsights}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1"
                  >
                    Generate Analysis
                  </button>
                )}
              </div>

              <div className="relative min-h-[60px]">
                {insightsLoading ? (
                  <div className="flex flex-col gap-2">
                    <div className="h-4 bg-indigo-200/50 rounded animate-pulse w-full" />
                    <div className="h-4 bg-indigo-200/50 rounded animate-pulse w-5/6" />
                    <div className="h-4 bg-indigo-200/50 rounded animate-pulse w-4/6" />
                  </div>
                ) : insights ? (
                  <p className="text-indigo-900/80 text-sm leading-relaxed italic">
                    "{insights}"
                  </p>
                ) : (
                  <p className="text-indigo-400 text-sm italic">
                    Click "Generate Analysis" to get AI-powered insights on this currency pair.
                  </p>
                )}
              </div>
            </motion.div>
          </div>

          {/* Sidebar / Trends */}
          <div className="lg:col-span-5 space-y-6">
            {/* Chart Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-indigo-500" />
                  7-Day Trend
                </h3>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {fromCurrency} / {toCurrency}
                </span>
              </div>
              
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fill: '#94a3b8' }} 
                    />
                    <YAxis 
                      hide 
                      domain={['auto', 'auto']} 
                    />
                    <Tooltip 
                      contentStyle={{ 
                        borderRadius: '12px', 
                        border: 'none', 
                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                        fontSize: '12px'
                      }} 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="rate" 
                      stroke="#4f46e5" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorRate)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              
              <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-xs font-medium text-slate-500">Market Open</span>
                </div>
                <p className="text-[10px] text-slate-400 italic">Historical data is simulated for demo</p>
              </div>
            </motion.div>

            {/* Popular Conversions */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 p-6"
            >
              <h3 className="font-bold text-slate-800 mb-4">Popular Pairs</h3>
              <div className="space-y-3">
                {[
                  { from: 'EUR', to: 'USD' },
                  { from: 'GBP', to: 'USD' },
                  { from: 'USD', to: 'JPY' },
                  { from: 'USD', to: 'CAD' }
                ].map((pair) => (
                  <button
                    key={`${pair.from}-${pair.to}`}
                    onClick={() => {
                      setFromCurrency(pair.from);
                      setToCurrency(pair.to);
                    }}
                    className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex -space-x-2">
                        <span className="text-lg z-10">{CURRENCIES.find(c => c.code === pair.from)?.flag}</span>
                        <span className="text-lg">{CURRENCIES.find(c => c.code === pair.to)?.flag}</span>
                      </div>
                      <span className="text-sm font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">
                        {pair.from} / {pair.to}
                      </span>
                    </div>
                    <ArrowRightLeft className="w-4 h-4 text-slate-300 group-hover:text-indigo-400 transition-all" />
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Info Card */}
            <div className="bg-slate-800 rounded-3xl p-6 text-white">
              <div className="flex items-center gap-3 mb-3">
                <Info className="w-5 h-5 text-indigo-400" />
                <h4 className="font-bold text-sm">Did you know?</h4>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                The foreign exchange market is the largest, most liquid financial market in the world, with a daily volume exceeding $6 trillion.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto px-4 py-12 border-t border-slate-200 mt-12 text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Coins className="w-5 h-5 text-slate-300" />
          <span className="text-sm font-bold text-slate-400 tracking-widest uppercase">GlobalFX</span>
        </div>
        <p className="text-xs text-slate-400">
          © 2026 GlobalFX. All exchange rates are provided for informational purposes only.
        </p>
      </footer>
    </div>
  );
}

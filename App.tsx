
import React, { useState, useEffect, useMemo } from 'react';
import { Transaction, Party, TransactionType, PaymentMethod } from './types';
import { getFinancialInsights } from './services/geminiService';
import { 
  PlusIcon, 
  ArrowsRightLeftIcon, 
  ArrowPathIcon,
  UserPlusIcon, 
  ChartBarIcon, 
  DocumentArrowDownIcon,
  TrashIcon,
  SparklesIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  LinkIcon
} from '@heroicons/react/24/outline';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';

const App: React.FC = () => {
  // State
  const [parties, setParties] = useState<Party[]>(() => {
    const saved = localStorage.getItem('cashflow_parties');
    return saved ? JSON.parse(saved) : [
      { id: '1', name: 'Abhishek' },
      { id: '2', name: 'Abhinav' }
    ];
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('cashflow_transactions');
    return saved ? JSON.parse(saved) : [];
  });

  const [newPartyName, setNewPartyName] = useState('');
  const [formData, setFormData] = useState({
    from: 'Abhishek',
    to: '', 
    amount: '',
    type: 'CREDIT' as TransactionType,
    paymentMethod: 'GENERAL' as PaymentMethod,
    note: ''
  });

  const [insights, setInsights] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle');
  // HARDCODED GOOGLE SHEET URL - PASTE YOUR URL BELOW
  const [googleSheetUrl, setGoogleSheetUrl] = useState('https://script.google.com/macros/s/AKfycbzG87SP4QaameeFB-8VrMG8JtKWoE6LjnYXgxj1O211EPEMN1pmwzDR2Qsz0-AgDjcl/exec');
  const [isFetching, setIsFetching] = useState(false);
  const [apiKeyMissing, setApiKeyMissing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  // Fetch from Sheet
  const fetchFromSheet = React.useCallback(async (urlOverride?: string, isManual = false) => {
    const url = (urlOverride || googleSheetUrl)?.trim();
    if (!url) return;

    // Basic validation to check if it's a Google Script Web App URL
    if (!url.includes('script.google.com/macros/s/')) {
      console.warn("URL does not look like a Google Apps Script Web App URL. Ensure you deployed as a Web App.");
    }

    setIsFetching(true);
    try {
      // Validate URL
      let fetchUrl: URL;
      try {
        fetchUrl = new URL(url);
      } catch (e) {
        console.error("Invalid Google Sheet URL:", url);
        if (isManual) setSyncStatus('error');
        return;
      }

      // Add cache-busting parameter
      fetchUrl.searchParams.set('_t', Date.now().toString());

      const response = await fetch(fetchUrl.toString(), {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const data = await response.json();
      if (Array.isArray(data)) {
        // Ensure every transaction has an ID and valid date
        const processed = data.map((tx, idx) => ({
          ...tx,
          id: tx.id || `sheet-${idx}-${Date.now()}`,
          amount: parseFloat(tx.amount) || 0,
          date: tx.date || new Date().toISOString()
        }));
        const sorted = processed.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setTransactions(sorted);
        setLastUpdated(new Date());
        if (isManual) {
          setSyncStatus('success');
          setTimeout(() => setSyncStatus('idle'), 2000);
        }
      } else {
        console.warn("Received non-array data from sheet:", data);
        if (data.error) throw new Error(data.error);
      }
    } catch (error) {
      console.error("Fetch Error:", error);
      if (isManual) setSyncStatus('error');
    } finally {
      setIsFetching(false);
    }
  }, [googleSheetUrl]);

  // Filters
  const [filterName, setFilterName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Check API Key
  useEffect(() => {
    const key = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!key) {
      setApiKeyMissing(true);
      console.warn("GEMINI_API_KEY is missing in environment variables.");
    }
  }, []);

  // Fetch Config from Backend
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch('/api/config');
        if (!response.ok) throw new Error('Failed to fetch config');
        const data = await response.json();
        if (data.gsheetUrl) {
          const trimmedUrl = data.gsheetUrl.trim();
          setGoogleSheetUrl(trimmedUrl);
        }
      } catch (error) {
        console.error("Config Fetch Error:", error);
      }
    };
    fetchConfig();
  }, []); // Run only once on mount

  // Auto-refresh and Initial Fetch
  useEffect(() => {
    if (!googleSheetUrl) return;
    
    // Initial fetch
    fetchFromSheet();

    const interval = setInterval(() => {
      fetchFromSheet();
    }, 10000); // Refresh every 10 seconds for better multi-device sync
    return () => clearInterval(interval);
  }, [googleSheetUrl, fetchFromSheet]);

  // Sync parties with transactions to ensure cross-device consistency
  useEffect(() => {
    if (transactions.length === 0) return;
    
    const namesInTransactions = new Set<string>();
    transactions.forEach(tx => {
      if (tx.from) namesInTransactions.add(tx.from.trim());
      if (tx.to) namesInTransactions.add(tx.to.trim());
    });

    setParties(prev => {
      const existingNames = new Set(prev.map(p => p.name.toLowerCase().trim()));
      const newParties = [...prev];
      let changed = false;

      namesInTransactions.forEach(name => {
        if (name && !existingNames.has(name.toLowerCase())) {
          newParties.push({ 
            id: `auto-${Math.random().toString(36).substr(2, 9)}`, 
            name 
          });
          existingNames.add(name.toLowerCase());
          changed = true;
        }
      });

      return changed ? newParties : prev;
    });
  }, [transactions]);

  // Initial Fetch - Removed as it's now handled by fetchConfig

  // Persist Data
  useEffect(() => {
    localStorage.setItem('cashflow_parties', JSON.stringify(parties));
  }, [parties]);

  useEffect(() => {
    localStorage.setItem('cashflow_transactions', JSON.stringify(transactions));
  }, [transactions]);

  // Calculations
  const balances = useMemo(() => {
    const stats: Record<string, number> = {};
    // Include all current parties in balance calculation
    parties.forEach(p => stats[p.name] = 0);
    // Also include any 'to' names that aren't in the party list but have transactions
    transactions.forEach(t => {
      if (!(t.to in stats)) stats[t.to] = 0;
      if (!(t.from in stats)) stats[t.from] = 0;
    });

    transactions.forEach(t => {
      if (t.type === 'CREDIT') {
        stats[t.from] += t.amount;
        stats[t.to] -= t.amount;
      } else {
        stats[t.from] -= t.amount;
        stats[t.to] += t.amount;
      }
    });

    return Object.entries(stats).map(([name, balance]) => ({ name, balance }));
  }, [transactions, parties]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const matchesName = !filterName || 
        tx.from.toLowerCase().includes(filterName.toLowerCase()) || 
        tx.to.toLowerCase().includes(filterName.toLowerCase());
      
      const txDate = new Date(tx.date).getTime();
      const start = startDate ? new Date(startDate).getTime() : 0;
      const end = endDate ? new Date(endDate).getTime() + 86400000 : Infinity; // +1 day to include end date
      
      const matchesDate = txDate >= start && txDate <= end;
      
      return matchesName && matchesDate;
    });
  }, [transactions, filterName, startDate, endDate]);

  const downloadCSV = () => {
    if (filteredTransactions.length === 0) return;
    
    const headers = ["Date", "From", "To", "Type", "Amount", "PaymentMethod", "Note"];
    const rows = filteredTransactions.map(tx => [
      new Date(tx.date).toLocaleString(),
      tx.from,
      tx.to,
      tx.type,
      tx.amount,
      tx.paymentMethod,
      tx.note
    ]);
    
    const csvContent = [
      headers.join(","),
      ...rows.map(r => r.map(val => `"${val}"`).join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `cashflow_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAddParty = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPartyName.trim()) return;
    if (parties.find(p => p.name.toLowerCase() === newPartyName.toLowerCase())) return;
    
    setParties([...parties, { id: Date.now().toString(), name: newPartyName.trim() }]);
    setNewPartyName('');
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(formData.amount);
    const toName = formData.to.trim();
    if (isNaN(amount) || amount <= 0 || !toName || formData.from === toName) return;

    const newTx: Transaction = {
      id: Date.now().toString(),
      from: formData.from,
      to: toName,
      amount,
      type: formData.type,
      paymentMethod: formData.paymentMethod,
      date: new Date().toISOString(),
      note: formData.note
    };

    // Auto-add new party if it doesn't exist
    if (!parties.find(p => p.name.toLowerCase() === toName.toLowerCase())) {
      setParties(prev => [...prev, { id: Date.now().toString(), name: toName }]);
    }

    setTransactions([newTx, ...transactions]);
    setFormData({ ...formData, amount: '', to: '', note: '', paymentMethod: 'GENERAL' });

    // Actual Google Sheet Sync
    if (googleSheetUrl) {
      setIsSyncing(true);
      setSyncStatus('idle');
      try {
        const url = googleSheetUrl.trim();
        // Validate URL
        new URL(url);

        // We use mode: 'no-cors' to avoid preflight issues with Apps Script,
        // but we send as text/plain to ensure it's accepted as a simple request.
        await fetch(url, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify(newTx)
        });
        
        // Since no-cors gives an opaque response, we assume success if no network error
        setSyncStatus('success');
        // Wait a bit for the sheet to process before refreshing
        setTimeout(() => fetchFromSheet(undefined, false), 3000);
        setTimeout(() => setSyncStatus('idle'), 5000);
      } catch (error) {
        console.error("Sync Error:", error);
        setSyncStatus('error');
        setTimeout(() => setSyncStatus('idle'), 5000);
      } finally {
        setIsSyncing(false);
      }
    }
  };

  const deleteTransaction = (id: string) => {
    setTransactions(transactions.filter(t => t.id !== id));
  };

  const generateAIInsights = async () => {
    setIsAnalyzing(true);
    const result = await getFinancialInsights(transactions, parties.map(p => p.name));
    setInsights(result);
    setIsAnalyzing(false);
  };

  return (
    <div className="min-h-screen pb-12 bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        {apiKeyMissing && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-amber-800 text-xs flex items-center justify-center gap-2">
            <ExclamationCircleIcon className="w-4 h-4" />
            <span>GEMINI_API_KEY is missing. AI insights will not work. Please set it in Vercel Environment Variables and redeploy.</span>
          </div>
        )}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <ArrowsRightLeftIcon className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">CashFlow Pro</h1>
          </div>
          <div className="flex items-center space-x-3">
            {lastUpdated && (
              <span className="text-[9px] text-slate-400 font-medium hidden sm:inline">
                Updated: {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            )}
            {syncStatus === 'success' && <span className="text-xs text-emerald-600 flex items-center font-medium"><CheckCircleIcon className="h-4 w-4 mr-1"/> Synced</span>}
            {syncStatus === 'error' && <span className="text-xs text-rose-600 flex items-center font-medium"><ExclamationCircleIcon className="h-4 w-4 mr-1"/> Sync Failed</span>}
            <button 
              onClick={downloadCSV}
              disabled={filteredTransactions.length === 0}
              className="p-2 rounded-full text-slate-400 hover:bg-slate-100 hover:text-indigo-600 transition"
              title="Download CSV"
            >
              <DocumentArrowDownIcon className="h-5 w-5" />
            </button>
            <button 
              onClick={() => fetchFromSheet(undefined, true)}
              disabled={isFetching || !googleSheetUrl}
              className={`p-2 rounded-full transition relative ${isFetching ? 'text-amber-500' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
              title="Refresh from Sheet"
            >
              <ArrowPathIcon className={`h-5 w-5 ${isFetching ? 'animate-spin' : ''}`} />
              {!isFetching && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse opacity-50"></span>
              )}
            </button>
            <button 
              onClick={generateAIInsights}
              disabled={isAnalyzing || transactions.length === 0}
              className="flex items-center px-4 py-2 bg-indigo-50 text-indigo-700 rounded-full text-sm font-semibold hover:bg-indigo-100 transition disabled:opacity-50"
            >
              <SparklesIcon className="h-4 w-4 mr-2" />
              {isAnalyzing ? 'Analyzing...' : 'AI Insights'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Input & Management */}
        <div className="space-y-8">
          {/* New Transaction Form */}
          <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold mb-5 flex items-center text-slate-800">
              <PlusIcon className="h-5 w-5 mr-2 text-indigo-600" />
              Add Transaction
            </h2>
            <form onSubmit={handleAddTransaction} className="space-y-5">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">From (Party)</label>
                  <select 
                    value={formData.from}
                    onChange={(e) => setFormData({...formData, from: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                  >
                    {parties.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">To (Party)</label>
                  <div className="relative">
                    <input 
                      type="text"
                      list="parties-list"
                      required
                      placeholder="Select or type recipient..."
                      value={formData.to}
                      onChange={(e) => setFormData({...formData, to: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                    />
                    <datalist id="parties-list">
                      {parties.map(p => <option key={p.id} value={p.name} />)}
                    </datalist>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Amount (₹)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                  <input 
                    type="number" 
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                    placeholder="0.00"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 pl-8 text-xl font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition"
                  />
                </div>
              </div>

              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button 
                  type="button"
                  onClick={() => setFormData({...formData, type: 'CREDIT'})}
                  className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${formData.type === 'CREDIT' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Credit (+)
                </button>
                <button 
                  type="button"
                  onClick={() => setFormData({...formData, type: 'DEBIT'})}
                  className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${formData.type === 'DEBIT' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Debit (-)
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Payment Method</label>
                <select 
                  value={formData.paymentMethod}
                  onChange={(e) => setFormData({...formData, paymentMethod: e.target.value as PaymentMethod})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                >
                  <option value="GENERAL">General</option>
                  <option value="CASH">Cash</option>
                  <option value="BANK">Bank</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Note (Optional)</label>
                <input 
                  type="text" 
                  value={formData.note}
                  onChange={(e) => setFormData({...formData, note: e.target.value})}
                  placeholder="What was this for?"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 outline-none transition"
                />
              </div>

              <button 
                type="submit"
                disabled={isSyncing}
                className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-xl hover:bg-indigo-700 transition shadow-lg shadow-indigo-100 flex justify-center items-center"
              >
                {isSyncing ? 'Syncing...' : 'Record Transaction'}
              </button>
            </form>
          </section>

          {/* Party Management */}
          <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold mb-4 flex items-center text-slate-800">
              <UserPlusIcon className="h-5 w-5 mr-2 text-emerald-600" />
              Saved Parties
            </h2>
            <form onSubmit={handleAddParty} className="flex space-x-2 mb-4">
              <input 
                type="text" 
                value={newPartyName}
                onChange={(e) => setNewPartyName(e.target.value)}
                placeholder="New party name"
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none transition"
              />
              <button 
                type="submit"
                className="bg-emerald-600 text-white p-2.5 rounded-xl hover:bg-emerald-700 transition"
              >
                <PlusIcon className="h-6 w-6" />
              </button>
            </form>
            <div className="flex flex-wrap gap-2">
              {parties.map(p => (
                <span key={p.id} className="inline-flex items-center px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold border border-slate-200">
                  {p.name}
                </span>
              ))}
            </div>
          </section>
        </div>

        {/* Center/Right: Visuals & History */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Overview Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center">
                <ChartBarIcon className="h-4 w-4 mr-2" />
                Live Balances
              </h3>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={balances} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" fontSize={11} fontWeight="bold" axisLine={false} tickLine={false} />
                    <YAxis fontSize={11} axisLine={false} tickLine={false} />
                    <Tooltip 
                      cursor={{fill: '#f8fafc'}}
                      contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                    />
                    <Bar dataKey="balance" radius={[6, 6, 0, 0]}>
                      {balances.map((entry) => (
                        <Cell key={entry.name} fill={entry.balance >= 0 ? '#10b981' : '#f43f5e'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* Insights Panel */}
            <section className={`p-6 rounded-2xl border transition-all duration-700 flex flex-col justify-center ${insights ? 'bg-indigo-600 text-white border-indigo-400 shadow-xl shadow-indigo-100' : 'bg-white border-slate-200'}`}>
              <div className="flex justify-between items-start mb-4">
                <h3 className={`text-xs font-bold uppercase tracking-widest flex items-center ${insights ? 'text-indigo-200' : 'text-slate-400'}`}>
                  <SparklesIcon className="h-4 w-4 mr-2" />
                  Financial Insight
                </h3>
              </div>
              {insights ? (
                <div className="space-y-4">
                  <p className="text-lg font-bold leading-tight tracking-tight">{insights.summary}</p>
                  <div className="bg-white/10 p-3 rounded-xl">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-[10px] font-black px-1.5 py-0.5 bg-white text-indigo-600 rounded uppercase">Advice</span>
                    </div>
                    <p className="text-xs opacity-90 font-medium leading-relaxed italic">"{insights.advice}"</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <SparklesIcon className="h-10 w-10 text-slate-100 mx-auto mb-3" />
                  <p className="text-slate-400 text-sm font-semibold">No insights yet</p>
                  <p className="text-slate-300 text-[11px] mt-1">Add transactions and click the AI button</p>
                </div>
              )}
            </section>
          </div>

          {/* Ledger History */}
          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 bg-white">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-800">Transaction History</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Showing all recorded cash movements</p>
                </div>
                <span className="text-[10px] font-black bg-indigo-50 px-3 py-1.5 rounded-full text-indigo-600 uppercase tracking-widest">
                  {filteredTransactions.length} Logs
                </span>
              </div>

              {/* Filters UI */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Filter by Name</label>
                  <select 
                    value={filterName}
                    onChange={(e) => setFilterName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none transition"
                  >
                    <option value="">All Parties</option>
                    {parties.map(p => (
                      <option key={p.id} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Start Date</label>
                  <input 
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">End Date</label>
                  <input 
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none transition"
                  />
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                  <tr>
                    <th className="px-6 py-4">Date & Time</th>
                    <th className="px-6 py-4">Parties</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4">Amount</th>
                    <th className="px-6 py-4 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-20 text-center">
                        <div className="max-w-xs mx-auto text-slate-300">
                          <ArrowsRightLeftIcon className="h-12 w-12 mx-auto mb-4 opacity-20" />
                          <p className="font-bold text-slate-400">No Results</p>
                          <p className="text-xs mt-1">Try adjusting your filters or adding a transaction.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((tx, idx) => (
                      <tr key={tx.id || `tx-${idx}`} className="hover:bg-slate-50/80 transition group">
                        <td className="px-6 py-5 whitespace-nowrap">
                          <div className="text-sm font-bold text-slate-700">
                            {new Date(tx.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                          <div className="text-[10px] text-slate-400 uppercase font-medium mt-0.5">
                            {new Date(tx.date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center space-x-2.5">
                            <span className="text-sm font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">{tx.from}</span>
                            <ArrowsRightLeftIcon className="h-3.5 w-3.5 text-slate-300" />
                            <span className="text-sm font-bold text-slate-900 border-b-2 border-indigo-100">{tx.to}</span>
                          </div>
                          {tx.note && <p className="text-[11px] text-slate-500 mt-1 italic font-medium">"{tx.note}"</p>}
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap">
                          <div className="flex flex-col gap-1">
                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter w-fit ${
                              tx.type === 'CREDIT' 
                                ? 'bg-emerald-100 text-emerald-700' 
                                : 'bg-rose-100 text-rose-700'
                            }`}>
                              {tx.type === 'CREDIT' ? 'Credit (+)' : 'Debit (-)'}
                            </span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider ml-1">
                              {tx.paymentMethod}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap">
                          <div className={`text-base font-black ${tx.type === 'CREDIT' ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {tx.type === 'CREDIT' ? '+' : '-'}₹{tx.amount.toLocaleString('en-IN')}
                          </div>
                        </td>
                        <td className="px-6 py-5 text-right whitespace-nowrap">
                          <button 
                            onClick={() => deleteTransaction(tx.id)}
                            className="text-slate-300 hover:text-rose-500 p-2 opacity-0 group-hover:opacity-100 transition rounded-full hover:bg-rose-50"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>

      {/* Footer Branding */}
      <footer className="max-w-7xl mx-auto px-4 mt-12 mb-8 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest">
        Secure Financial Ledger &copy; {new Date().getFullYear()} • Powered by Gemini AI
      </footer>
    </div>
  );
};

export default App;

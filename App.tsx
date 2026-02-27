import React, { useState, useMemo, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { AIInsights } from './components/AIInsights';
import { SubscriptionModal } from './components/SubscriptionModal';
import { AuthScreen } from './components/AuthScreen';
import { SaasAdminDashboard } from './components/SaasAdminDashboard';
import { DeleteConfirmationModal } from './components/DeleteConfirmationModal';
import { authService } from './services/authService';
import { transactionService } from './services/transactionService';
import { Transaction, TransactionType, User, FinancialSummary, Category } from './types';
import { Wallet, Building2, CalendarRange, Scale, ClipboardList, Plus, CreditCard, Loader, X, Check } from 'lucide-react';

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const YEARS = [2024, 2025, 2026];

const App: React.FC = () => {
  // Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // App Data State
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [viewMonthsCount, setViewMonthsCount] = useState<number>(1); // 1, 2, 3, 4, 6, 12
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isPremium, setIsPremium] = useState(false);

  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [formType, setFormType] = useState<TransactionType>(TransactionType.INCOME);
  const [formAmount, setFormAmount] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formCategory, setFormCategory] = useState('');
  
  // Installment Form State
  const [installmentCount, setInstallmentCount] = useState(2);
  const [isTotalAmount, setIsTotalAmount] = useState(true); // true = Total Value, false = Parcel Value
  const [startNextMonth, setStartNextMonth] = useState(false);

  // Category Management State
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Reset filter when tab changes
  useEffect(() => {
    setSelectedCategoryFilter('all');
  }, [activeTab]);

  // Check auth on mount
  useEffect(() => {
    const checkUser = async () => {
      const user = await authService.getCurrentUser();
      if (user) {
        setCurrentUser(user);
      }
      setLoadingAuth(false);
    };
    checkUser();
  }, []);

  // Fetch Transactions and Categories when month/year/viewMonthsCount changes
  useEffect(() => {
    const loadData = async () => {
      if (!currentUser) return;
      setLoadingData(true);
      
      let txs: Transaction[] = [];
      let cats: Category[] = [];

      try {
        if (viewMonthsCount > 1) {
             txs = await transactionService.getTransactionsRange(currentUser.tenantId, selectedMonth, selectedYear, viewMonthsCount);
        } else {
             txs = await transactionService.getTransactions(currentUser.tenantId, selectedMonth, selectedYear);
        }
        cats = await transactionService.getCategories(currentUser.tenantId);
      } catch (error) {
        console.error("Error loading data", error);
      }
      
      setTransactions(txs);
      setCategories(cats);
      setLoadingData(false);
    };
    
    if (currentUser) {
       loadData();
    }
  }, [currentUser, selectedMonth, selectedYear, viewMonthsCount]);

  // Summary should ONLY calculate for the SELECTED month, regardless of how many months we fetched
  const summary: FinancialSummary = useMemo(() => {
    // Filter transactions for the selected month/year only
    const currentMonthTransactions = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
    });

    return currentMonthTransactions.reduce((acc, t) => {
      if (t.type === TransactionType.INCOME) {
        acc.income += t.amount;
        acc.balance += t.amount;
      } else if (t.type === TransactionType.EXPENSE_FIXED) {
        acc.fixedExpenses += t.amount;
        acc.balance -= t.amount;
      } else if (t.type === TransactionType.EXPENSE_INSTALLMENT) {
        acc.installments += t.amount;
        acc.balance -= t.amount;
      } else {
        acc.balance -= t.amount;
      }
      return acc;
    }, { income: 0, fixedExpenses: 0, installments: 0, balance: 0 });
  }, [transactions, selectedMonth, selectedYear]);

  const handleDeleteTransaction = async (deleteAll: boolean) => {
    if (!editingTransaction) return;

    const success = await transactionService.deleteTransaction(editingTransaction.id, deleteAll, editingTransaction);
    
    if (success) {
      // Refresh data
      const [txs, cats] = await Promise.all([
        viewMonthsCount > 1 
          ? transactionService.getTransactionsRange(currentUser!.tenantId, selectedMonth, selectedYear, viewMonthsCount)
          : transactionService.getTransactions(currentUser!.tenantId, selectedMonth, selectedYear),
        transactionService.getCategories(currentUser!.tenantId)
      ]);
      setTransactions(txs);
      setCategories(cats);
      setIsFormOpen(false);
      setIsDeleteModalOpen(false);
    } else {
      alert("Erro ao excluir transação");
    }
  };

  const handleOpenForm = (tx?: Transaction) => {
    if (tx) {
      setEditingTransaction(tx);
      setFormType(tx.type);
      setFormDesc(tx.description);
      setFormAmount(tx.amount.toFixed(2));
      setFormCategory(tx.category);
    } else {
      setEditingTransaction(null);
      setFormType(TransactionType.INCOME);
      setFormDesc('');
      setFormAmount('');
      setFormCategory('');
      setInstallmentCount(2);
      setIsTotalAmount(true);
      setStartNextMonth(false);
    }
    setIsFormOpen(true);
  };

  const handleSaveTransaction = async () => {
    if (!formAmount || !formDesc || !currentUser) return;
    
    const amount = parseFloat(formAmount);

    if (editingTransaction) {
      // Update existing
      const updatedTx = await transactionService.updateTransaction(editingTransaction.id, {
        description: formDesc,
        amount: amount,
        type: formType,
        category: formCategory || 'Geral'
      });

      if (updatedTx) {
        setTransactions(prev => prev.map(t => t.id === updatedTx.id ? updatedTx : t));
        setIsFormOpen(false);
      } else {
        alert("Erro ao atualizar transação");
      }
    } else {
      // Create new
      const newTx: Partial<Transaction> = {
        description: formDesc,
        amount: amount,
        date: new Date(selectedYear, selectedMonth, 15).toISOString(),
        type: formType,
        category: formCategory || 'Geral',
        userId: currentUser.id,
        tenantId: currentUser.tenantId
      };

      const installmentOptions = formType === TransactionType.EXPENSE_INSTALLMENT ? {
        count: installmentCount,
        isTotalAmount: isTotalAmount,
        startNextMonth: startNextMonth
      } : undefined;

      const savedTx = await transactionService.addTransaction(newTx, installmentOptions);
      
      if (savedTx) {
        // If it was an installment, we might want to reload all transactions to see future ones if view changes
        // For now, just prepend the returned one (usually the first one)
        setTransactions(prev => [savedTx, ...prev]);
        setIsFormOpen(false);
      } else {
        alert("Erro ao salvar transação");
      }
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName || !currentUser) return;
    const newCat = await transactionService.addCategory({
      tenantId: currentUser.tenantId,
      name: newCategoryName,
      type: formType
    });
    
    if (newCat) {
      setCategories(prev => [...prev, newCat]);
      setFormCategory(newCat.name);
      setIsAddingCategory(false);
      setNewCategoryName('');
    }
  };

  const handleLogout = async () => {
    await authService.logout();
    setCurrentUser(null);
  };

  // Filter categories based on selected transaction type
  // Note: We map transaction types to broad categories (Income vs Expense)
  const availableCategories = useMemo(() => {
    const isIncome = formType === TransactionType.INCOME;
    return categories.filter(c => {
      if (isIncome) return c.type === TransactionType.INCOME;
      return c.type !== TransactionType.INCOME;
    });
  }, [categories, formType]);

  // Helper to group transactions by month for list view
  const groupTransactionsByMonth = (txs: Transaction[]) => {
    const groups: { [key: string]: Transaction[] } = {};
    txs.forEach(t => {
      const date = new Date(t.date);
      const key = `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    });
    return groups;
  };

  // Filter transactions based on active tab and category filter
  const filteredTransactions = useMemo(() => {
    let txs = [];
    if (activeTab === 'receitas') {
      txs = transactions.filter(t => t.type === TransactionType.INCOME);
    } else if (activeTab === 'despesas') {
      txs = transactions.filter(t => t.type !== TransactionType.INCOME);
    }
    
    if (selectedCategoryFilter !== 'all') {
      txs = txs.filter(t => t.category === selectedCategoryFilter);
    }
    
    return txs;
  }, [transactions, activeTab, selectedCategoryFilter]);

  // Categories for the filter dropdown based on active tab
  const filterCategories = useMemo(() => {
    const isIncome = activeTab === 'receitas';
    return categories.filter(c => {
      if (isIncome) return c.type === TransactionType.INCOME;
      return c.type !== TransactionType.INCOME;
    });
  }, [categories, activeTab]);

  const groupedTransactions = useMemo(() => groupTransactionsByMonth(filteredTransactions), [filteredTransactions]);

  // 1. Loading State
  if (loadingAuth) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-100">Carregando...</div>;
  }

  // 2. Auth Screen (Not Logged In)
  if (!currentUser) {
    return <AuthScreen onLoginSuccess={setCurrentUser} />;
  }

  // 3. SaaS Admin Dashboard (Logged in as Super Admin)
  if (currentUser.role === 'saas_admin') {
    return <SaasAdminDashboard currentUser={currentUser} onLogout={handleLogout} />;
  }

  // 4. Main Tenant App (Logged in as Customer)
  const activeInstallments = transactions.filter(t => t.type === TransactionType.EXPENSE_INSTALLMENT);

  return (
    <div className="flex min-h-screen bg-[#f3f4f6]">
      <Sidebar 
        currentUser={currentUser} 
        onLogout={handleLogout}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onAddTransaction={() => handleOpenForm()}
      />

      <main className="ml-64 flex-1 p-8 overflow-y-auto">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-3xl font-bold text-slate-800">
              {activeTab === 'dashboard' ? 'Visão Geral' : activeTab === 'receitas' ? 'Receitas' : 'Despesas'}
            </h2>
            <p className="text-slate-500">Olá, {currentUser.name}! Acompanhe suas finanças.</p>
          </div>

          <div className="flex gap-3 bg-white p-1 rounded-xl shadow-sm border border-gray-100">
            {/* User Dropdown removed for single tenant view, can be re-added if admin wants to impersonate */}
            <select 
              className="bg-transparent text-sm font-medium text-slate-600 outline-none px-3 py-2 cursor-pointer"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
            >
              {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
            <div className="w-px bg-gray-200 my-2"></div>
            <select 
              className="bg-transparent text-sm font-medium text-slate-600 outline-none px-3 py-2 cursor-pointer"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
            >
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </header>

        {/* Not Premium Banner */}
        {!isPremium && currentUser.plan === 'free' && (
          <div onClick={() => setIsSubModalOpen(true)} className="mb-6 bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-center justify-between cursor-pointer hover:bg-blue-100 transition-colors group">
            <div className="flex items-center gap-3">
               <div className="bg-blue-500 text-white p-2 rounded-lg">
                 <Building2 size={20} />
               </div>
               <div>
                 <p className="font-semibold text-blue-900">Modo Gratuito</p>
                 <p className="text-sm text-blue-700">Ative o Premium para recursos multi-tenant e IA ilimitada.</p>
               </div>
            </div>
            <span className="text-blue-600 font-medium group-hover:translate-x-1 transition-transform">Ver Planos &rarr;</span>
          </div>
        )}

        {loadingData ? (
           <div className="flex justify-center py-12">
             <Loader className="animate-spin text-violet-500" size={32} />
           </div>
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <>
                {/* Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  {/* Receitas */}
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                      <span className="text-slate-500 font-medium">Receitas</span>
                      <div className="p-2 bg-green-50 text-green-600 rounded-lg group-hover:bg-green-100 transition-colors">
                        <Wallet size={20} />
                      </div>
                    </div>
                    <h3 className="text-2xl font-bold text-slate-800">
                      {summary.income.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </h3>
                  </div>

                  {/* Despesas Fixas */}
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                      <span className="text-slate-500 font-medium">Despesas Fixas</span>
                      <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-100 transition-colors">
                        <Building2 size={20} />
                      </div>
                    </div>
                    <h3 className="text-2xl font-bold text-slate-800">
                      {summary.fixedExpenses.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </h3>
                  </div>

                  {/* Parcelas */}
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                      <span className="text-slate-500 font-medium">Parcelas</span>
                      <div className="p-2 bg-orange-50 text-orange-600 rounded-lg group-hover:bg-orange-100 transition-colors">
                        <CalendarRange size={20} />
                      </div>
                    </div>
                    <h3 className="text-2xl font-bold text-slate-800">
                      {summary.installments.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </h3>
                  </div>

                  {/* Balanço Mensal */}
                  <div className="bg-[#0f172a] p-6 rounded-2xl shadow-lg relative overflow-hidden">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-violet-600 rounded-full blur-2xl opacity-20"></div>
                    <div className="flex justify-between items-start mb-4 relative z-10">
                      <span className="text-slate-400 font-medium">Balanço Mensal</span>
                      <div className="p-2 bg-slate-800 text-slate-300 rounded-lg">
                        <Scale size={20} />
                      </div>
                    </div>
                    <h3 className={`text-2xl font-bold relative z-10 ${summary.balance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {summary.balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </h3>
                    <div className="h-1 w-full bg-slate-800 mt-4 rounded-full overflow-hidden">
                      <div className={`h-full ${summary.balance >= 0 ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: '60%' }}></div>
                    </div>
                  </div>
                </div>

                {/* AI Section */}
                <AIInsights 
                  transactions={transactions} 
                  summary={summary}
                  userName={currentUser.name}
                  month={MONTHS[selectedMonth]}
                  year={selectedYear}
                />

                {/* Active Installments Section */}
                <div className="mt-8">
                  <div className="flex items-center gap-2 mb-4 border-l-4 border-violet-500 pl-3">
                    <h3 className="text-lg font-bold text-slate-800">Parcelamentos Ativos</h3>
                  </div>
                  
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-100 min-h-[200px] flex flex-col justify-center items-center p-8">
                    {activeInstallments.length === 0 ? (
                      <div className="text-center">
                        <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-2xl flex items-center justify-center mx-auto mb-4">
                          <ClipboardList size={32} />
                        </div>
                        <h4 className="font-semibold text-slate-800 mb-1">Nenhum parcelamento</h4>
                        <p className="text-slate-500 text-sm">Não há parcelas ativas para este mês.</p>
                      </div>
                    ) : (
                      <div className="w-full space-y-3">
                          {activeInstallments.map(t => (
                            <div key={t.id} onClick={() => handleOpenForm(t)} className="flex items-center justify-between p-4 border border-gray-100 rounded-xl hover:border-violet-100 hover:bg-violet-50/30 transition-colors cursor-pointer group">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center">
                                  <CreditCard size={18} />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="font-semibold text-slate-700">{t.description}</p>
                                    {t.updatedAt && (
                                      <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full">
                                        Editado em: {new Date(t.updatedAt).toLocaleDateString()}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-slate-400">Parcela {t.installments?.current}/{t.installments?.total}</p>
                                </div>
                              </div>
                              <span className="font-bold text-slate-700">
                                {t.amount.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
                              </span>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {(activeTab === 'receitas' || activeTab === 'despesas') && (
              <div className="space-y-6">
                <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex-wrap gap-4">
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-600">Período:</span>
                      <select 
                        value={viewMonthsCount}
                        onChange={(e) => setViewMonthsCount(Number(e.target.value))}
                        className="border border-slate-200 rounded-lg p-2 text-sm bg-slate-50 outline-none focus:ring-2 focus:ring-violet-500/20"
                      >
                        <option value={1}>Mês Atual</option>
                        <option value={2}>2 Meses</option>
                        <option value={3}>3 Meses</option>
                        <option value={4}>4 Meses</option>
                        <option value={6}>6 Meses</option>
                        <option value={12}>1 Ano</option>
                      </select>
                    </div>

                    <div className="w-px h-6 bg-slate-200 hidden sm:block"></div>

                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-600">Categoria:</span>
                      <select 
                        value={selectedCategoryFilter}
                        onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                        className="border border-slate-200 rounded-lg p-2 text-sm bg-slate-50 outline-none focus:ring-2 focus:ring-violet-500/20 min-w-[120px]"
                      >
                        <option value="all">Todas</option>
                        {filterCategories.map(c => (
                          <option key={c.id} value={c.name}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="text-sm text-slate-500">
                    Total: <span className="font-bold text-slate-800">{filteredTransactions.reduce((acc, t) => acc + t.amount, 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                  </div>
                </div>

                {Object.keys(groupedTransactions).length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 bg-white rounded-2xl border border-slate-100 border-dashed">
                    <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-4">
                      {activeTab === 'receitas' ? <Wallet size={32} /> : <CreditCard size={32} />}
                    </div>
                    <p className="text-slate-500 font-medium">Nenhum lançamento encontrado.</p>
                  </div>
                ) : (
                  Object.entries(groupedTransactions).map(([monthYear, txs]) => (
                    <div key={monthYear} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                      <div className="bg-slate-50 px-6 py-3 border-b border-slate-100 flex justify-between items-center">
                        <h3 className="font-bold text-slate-700">{monthYear}</h3>
                        <span className="text-xs font-medium bg-white px-2 py-1 rounded-md border border-slate-200 text-slate-500">
                          {txs.length} lançamentos
                        </span>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {txs.map(t => (
                          <div 
                            key={t.id} 
                            onClick={() => handleOpenForm(t)}
                            className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors cursor-pointer group"
                          >
                            <div className="flex items-center gap-4">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                t.type === TransactionType.INCOME 
                                  ? 'bg-green-100 text-green-600' 
                                  : 'bg-red-100 text-red-600'
                              }`}>
                                {t.type === TransactionType.INCOME ? <Wallet size={18} /> : <CreditCard size={18} />}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold text-slate-700">{t.description}</p>
                                  {t.updatedAt && (
                                    <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full">
                                      Editado
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-400">
                                  <span>{new Date(t.date).toLocaleDateString()}</span>
                                  <span>•</span>
                                  <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">{t.category}</span>
                                  {t.installments && (
                                    <>
                                      <span>•</span>
                                      <span className="text-orange-500 font-medium">Parcela {t.installments.current}/{t.installments.total}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className={`font-bold ${
                                t.type === TransactionType.INCOME ? 'text-green-600' : 'text-slate-700'
                              }`}>
                                {t.type !== TransactionType.INCOME && '- '}
                                {t.amount.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="bg-slate-50/50 px-6 py-3 border-t border-slate-100 flex justify-end">
                        <p className="text-sm text-slate-500">
                          Total do mês: <span className="font-bold text-slate-800">{txs.reduce((acc, t) => acc + t.amount, 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* Add/Edit Transaction Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 overflow-y-auto max-h-[90vh]">
            <h3 className="text-xl font-bold mb-4">{editingTransaction ? 'Editar Movimento' : 'Novo Movimento'}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-500 mb-1">Tipo</label>
                <select 
                  className="w-full border rounded-lg p-2 bg-slate-50"
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as TransactionType)}
                  disabled={!!editingTransaction} // Disable changing type on edit for simplicity
                >
                  <option value={TransactionType.INCOME}>Receita</option>
                  <option value={TransactionType.EXPENSE_FIXED}>Despesa Fixa</option>
                  <option value={TransactionType.EXPENSE_INSTALLMENT}>Parcelamento</option>
                </select>
              </div>

              {/* Installment Options - Only for New Installments */}
              {formType === TransactionType.EXPENSE_INSTALLMENT && !editingTransaction && (
                <div className="bg-orange-50 p-3 rounded-lg space-y-3 border border-orange-100">
                  <div>
                    <label className="block text-xs font-semibold text-orange-700 mb-1">Número de Parcelas</label>
                    <input 
                      type="number" 
                      min="2" 
                      max="48"
                      className="w-full border border-orange-200 rounded-lg p-2 text-sm"
                      value={installmentCount}
                      onChange={e => setInstallmentCount(parseInt(e.target.value) || 2)}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-semibold text-orange-700 mb-1">Valor Informado é:</label>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setIsTotalAmount(true)}
                        className={`flex-1 py-1.5 text-xs rounded-md border ${isTotalAmount ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-orange-700 border-orange-200'}`}
                      >
                        Total da Compra
                      </button>
                      <button 
                        onClick={() => setIsTotalAmount(false)}
                        className={`flex-1 py-1.5 text-xs rounded-md border ${!isTotalAmount ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-orange-700 border-orange-200'}`}
                      >
                        Valor da Parcela
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-orange-700 mb-1">Primeira Parcela:</label>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setStartNextMonth(false)}
                        className={`flex-1 py-1.5 text-xs rounded-md border ${!startNextMonth ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-orange-700 border-orange-200'}`}
                      >
                        Mês Atual
                      </button>
                      <button 
                        onClick={() => setStartNextMonth(true)}
                        className={`flex-1 py-1.5 text-xs rounded-md border ${startNextMonth ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-orange-700 border-orange-200'}`}
                      >
                        Próximo Mês
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm text-slate-500 mb-1">Categoria</label>
                {isAddingCategory ? (
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      className="flex-1 border rounded-lg p-2"
                      value={newCategoryName}
                      onChange={e => setNewCategoryName(e.target.value)}
                      placeholder="Nome da categoria..."
                      autoFocus
                    />
                    <button onClick={handleAddCategory} className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200">
                      <Check size={20} />
                    </button>
                    <button onClick={() => setIsAddingCategory(false)} className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200">
                      <X size={20} />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <select 
                      className="flex-1 border rounded-lg p-2 bg-slate-50"
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                    >
                      <option value="">Selecione...</option>
                      {availableCategories.map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                    <button 
                      onClick={() => setIsAddingCategory(true)}
                      className="p-2 bg-violet-100 text-violet-600 rounded-lg hover:bg-violet-200"
                      title="Nova Categoria"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm text-slate-500 mb-1">Descrição</label>
                <input 
                  type="text" 
                  className="w-full border rounded-lg p-2"
                  value={formDesc}
                  onChange={e => setFormDesc(e.target.value)}
                  placeholder="Ex: Salário, Aluguel..."
                />
              </div>
              <div>
                <label className="block text-sm text-slate-500 mb-1">Valor</label>
                <input 
                  type="number" 
                  className="w-full border rounded-lg p-2"
                  value={formAmount}
                  onChange={e => setFormAmount(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                />
              </div>
              <div className="flex gap-2 pt-4">
                {editingTransaction && (
                  <button 
                    onClick={() => setIsDeleteModalOpen(true)}
                    className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                    title="Excluir"
                  >
                    <div className="flex items-center gap-2">
                       <span className="font-medium">Excluir</span>
                    </div>
                  </button>
                )}
                <button onClick={() => setIsFormOpen(false)} className="flex-1 py-2 text-slate-500 hover:bg-slate-100 rounded-lg">Cancelar</button>
                <button onClick={handleSaveTransaction} className="flex-1 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700">Salvar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Subscription Modal */}
      <SubscriptionModal 
        isOpen={isSubModalOpen} 
        onClose={() => setIsSubModalOpen(false)} 
        onSubscribe={() => {
          setIsPremium(true);
          setIsSubModalOpen(false);
          alert("Assinatura Simulada com Sucesso!");
        }} 
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteTransaction}
        isInstallment={editingTransaction?.type === TransactionType.EXPENSE_INSTALLMENT && !!editingTransaction?.installments}
      />
    </div>
  );
};

export default App;
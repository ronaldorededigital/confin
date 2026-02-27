import React, { useState, useEffect } from 'react';
import { User, SupportTicket } from '../types';
import { authService } from '../services/authService';
import { 
  Users, LogOut, Shield, LayoutDashboard, 
  CreditCard, LifeBuoy, CheckCircle, Search, TrendingUp, Loader
} from 'lucide-react';

interface SaasAdminDashboardProps {
  currentUser: User;
  onLogout: () => void;
}

type Tab = 'dashboard' | 'users' | 'support';

export const SaasAdminDashboard: React.FC<SaasAdminDashboardProps> = ({ currentUser, onLogout }) => {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [users, setUsers] = useState<User[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  // Load data
  const refreshData = async () => {
    setLoading(true);
    const fetchedUsers = await authService.getAllUsers();
    const fetchedTickets = await authService.getTickets();
    setUsers(fetchedUsers);
    setTickets(fetchedTickets);
    setLoading(false);
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleTogglePlan = async (userId: string, currentPlan: 'free' | 'premium') => {
    const newPlan = currentPlan === 'free' ? 'premium' : 'free';
    await authService.updateUserPlan(userId, newPlan);
    refreshData();
  };

  const handleResolveTicket = async (ticketId: string) => {
    await authService.resolveTicket(ticketId);
    refreshData();
  };

  // Derived Stats
  const totalUsers = users.length;
  const premiumUsers = users.filter(u => u.plan === 'premium').length;
  // const freeUsers = users.filter(u => u.plan === 'free').length;
  const openTickets = tickets.filter(t => t.status === 'open').length;
  const estimatedRevenue = premiumUsers * 19.90;

  const filteredUsers = users.filter(u => 
    (u.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
    (u.email?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-[#0f172a] text-white flex flex-col fixed h-full z-10">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-2 mb-1">
             <Shield className="text-violet-500" />
             <span className="font-bold text-lg tracking-tight">ConFin<span className="text-violet-400">Admin</span></span>
          </div>
          <p className="text-xs text-slate-500">Gestão SaaS</p>
        </div>

        <nav className="flex-1 py-6 px-3 space-y-2">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'dashboard' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            <LayoutDashboard size={20} />
            <span className="font-medium">Visão Geral</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('users')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'users' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            <Users size={20} />
            <span className="font-medium">Usuários</span>
          </button>

          <button 
            onClick={() => setActiveTab('support')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'support' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            <LifeBuoy size={20} />
            <div className="flex-1 flex justify-between items-center">
               <span className="font-medium">Suporte</span>
               {openTickets > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">{openTickets}</span>}
            </div>
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800">
           <div className="flex items-center gap-3 mb-4 px-2">
              <div className="w-8 h-8 rounded-full bg-violet-500 flex items-center justify-center font-bold text-xs">AD</div>
              <div className="overflow-hidden">
                <p className="text-sm font-semibold truncate">Administrador</p>
                <p className="text-xs text-slate-500 truncate">admin@confin.site</p>
              </div>
           </div>
           <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm text-slate-300 transition-colors">
             <LogOut size={16} /> Sair
           </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 p-8 overflow-y-auto">
        {loading && activeTab !== 'dashboard' && (
           <div className="flex justify-center p-8"><Loader className="animate-spin text-violet-600" /></div>
        )}
        
        {/* DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
          <div className="animate-fade-in">
             <header className="mb-8">
               <h1 className="text-3xl font-bold text-slate-800">Painel de Controle</h1>
               <p className="text-slate-500">Métricas em tempo real da plataforma.</p>
             </header>

             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
               <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                    <Users size={24} />
                  </div>
                  <div>
                    <p className="text-slate-500 text-sm font-medium">Total Usuários</p>
                    <h3 className="text-2xl font-bold text-slate-800">{totalUsers}</h3>
                  </div>
               </div>

               <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                  <div className="p-3 bg-violet-50 text-violet-600 rounded-xl">
                    <CreditCard size={24} />
                  </div>
                  <div>
                    <p className="text-slate-500 text-sm font-medium">Assinantes Premium</p>
                    <h3 className="text-2xl font-bold text-slate-800">{premiumUsers}</h3>
                  </div>
               </div>

               <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                  <div className="p-3 bg-green-50 text-green-600 rounded-xl">
                    <TrendingUp size={24} />
                  </div>
                  <div>
                    <p className="text-slate-500 text-sm font-medium">Receita Estimada (Mês)</p>
                    <h3 className="text-2xl font-bold text-slate-800">R$ {estimatedRevenue.toFixed(2)}</h3>
                  </div>
               </div>

               <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                  <div className="p-3 bg-orange-50 text-orange-600 rounded-xl">
                    <LifeBuoy size={24} />
                  </div>
                  <div>
                    <p className="text-slate-500 text-sm font-medium">Chamados Abertos</p>
                    <h3 className="text-2xl font-bold text-slate-800">{openTickets}</h3>
                  </div>
               </div>
             </div>

             <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
               <h3 className="font-bold text-lg text-slate-800 mb-4">Atividades Recentes</h3>
               <div className="space-y-4">
                  {users.slice(0, 5).map(user => (
                    <div key={user.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
                           {user.avatarInitials}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-700">Novo usuário: {user.name}</p>
                          <p className="text-xs text-slate-400">{new Date(user.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${user.plan === 'premium' ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-600'}`}>
                        {user.plan === 'premium' ? 'Premium' : 'Free'}
                      </span>
                    </div>
                  ))}
               </div>
             </div>
          </div>
        )}

        {/* USERS TAB */}
        {activeTab === 'users' && (
          <div className="animate-fade-in">
             <header className="mb-8 flex justify-between items-center">
               <div>
                <h1 className="text-3xl font-bold text-slate-800">Gestão de Usuários</h1>
                <p className="text-slate-500">Administre os acessos e planos.</p>
               </div>
               <div className="relative">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                 <input 
                    type="text" 
                    placeholder="Buscar usuário..." 
                    className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-violet-500 w-64"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                 />
               </div>
             </header>

             <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 font-semibold">Nome</th>
                      <th className="px-6 py-4 font-semibold">Email</th>
                      <th className="px-6 py-4 font-semibold">Plano</th>
                      <th className="px-6 py-4 font-semibold">Tenant ID</th>
                      <th className="px-6 py-4 font-semibold text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredUsers.map(user => (
                      <tr key={user.id} className="hover:bg-slate-50/50">
                        <td className="px-6 py-4">
                           <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center font-bold text-xs">
                                {user.avatarInitials}
                              </div>
                              <span className="font-medium text-slate-700">{user.name}</span>
                           </div>
                        </td>
                        <td className="px-6 py-4 text-slate-600 text-sm">{user.email}</td>
                        <td className="px-6 py-4">
                           <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                             user.plan === 'premium' ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-600'
                           }`}>
                             {user.plan === 'premium' ? <CheckCircle size={12}/> : null}
                             {user.plan.toUpperCase()}
                           </span>
                        </td>
                        <td className="px-6 py-4 text-slate-400 text-xs font-mono">{user.tenantId}</td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => handleTogglePlan(user.id, user.plan)}
                            className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            {user.plan === 'premium' ? 'Rebaixar p/ Free' : 'Promover p/ Premium'}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredUsers.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                           Nenhum usuário encontrado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
             </div>
          </div>
        )}

        {/* SUPPORT TAB */}
        {activeTab === 'support' && (
          <div className="animate-fade-in">
             <header className="mb-8">
               <h1 className="text-3xl font-bold text-slate-800">Central de Suporte</h1>
               <p className="text-slate-500">Responda às solicitações dos clientes.</p>
             </header>

             <div className="grid grid-cols-1 gap-4">
               {tickets.length === 0 ? (
                 <div className="bg-white p-12 rounded-2xl text-center text-slate-400 border border-slate-200 border-dashed">
                    <LifeBuoy size={48} className="mx-auto mb-4 opacity-20" />
                    <p>Nenhum chamado de suporte registrado.</p>
                 </div>
               ) : (
                 tickets.map(ticket => (
                   <div key={ticket.id} className={`bg-white p-6 rounded-2xl shadow-sm border border-l-4 transition-all ${ticket.status === 'open' ? 'border-l-orange-400 border-slate-100' : 'border-l-green-400 border-slate-100 opacity-70'}`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                             <h3 className="font-bold text-lg text-slate-800">{ticket.subject}</h3>
                             <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${ticket.status === 'open' ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
                                {ticket.status === 'open' ? 'Aberto' : 'Resolvido'}
                             </span>
                          </div>
                          <p className="text-sm text-slate-500">Aberto por <span className="font-medium text-slate-700">{ticket.userName}</span> em {new Date(ticket.date).toLocaleDateString()}</p>
                        </div>
                        
                        {ticket.status === 'open' && (
                          <button 
                            onClick={() => handleResolveTicket(ticket.id)}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-green-600 text-white text-sm rounded-lg transition-colors"
                          >
                            <CheckCircle size={16} />
                            Marcar como Resolvido
                          </button>
                        )}
                        {ticket.status === 'closed' && (
                          <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
                            <CheckCircle size={16} /> Resolvido
                          </div>
                        )}
                      </div>
                   </div>
                 ))
               )}
             </div>
          </div>
        )}

      </main>
    </div>
  );
};
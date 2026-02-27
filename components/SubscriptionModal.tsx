import React from 'react';
import { X, Check, CreditCard, ShieldCheck } from 'lucide-react';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubscribe: () => void;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ isOpen, onClose, onSubscribe }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-fade-in-up">
        <div className="bg-[#009ee3] p-6 text-center text-white relative">
          <button onClick={onClose} className="absolute top-4 right-4 text-white/80 hover:text-white">
            <X size={24} />
          </button>
          <div className="mx-auto w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4 backdrop-blur-md">
            <CreditCard size={32} />
          </div>
          <h2 className="text-2xl font-bold mb-1">Assinatura Premium</h2>
          <p className="text-blue-100 text-sm">Gerenciado pelo Mercado Pago</p>
        </div>

        <div className="p-6">
          <div className="text-center mb-6">
            <span className="text-4xl font-bold text-slate-800">R$ 19,90</span>
            <span className="text-slate-500">/mês</span>
          </div>

          <div className="space-y-3 mb-8">
            <div className="flex items-center gap-3 text-slate-600">
              <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center text-green-600 flex-shrink-0">
                <Check size={12} strokeWidth={3} />
              </div>
              <span className="text-sm">Multiusuários (Tenants)</span>
            </div>
            <div className="flex items-center gap-3 text-slate-600">
              <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center text-green-600 flex-shrink-0">
                <Check size={12} strokeWidth={3} />
              </div>
              <span className="text-sm">Insights da ConFinance IA Ilimitados</span>
            </div>
            <div className="flex items-center gap-3 text-slate-600">
              <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center text-green-600 flex-shrink-0">
                <Check size={12} strokeWidth={3} />
              </div>
              <span className="text-sm">Relatórios Avançados</span>
            </div>
          </div>

          <button 
            onClick={onSubscribe}
            className="w-full bg-[#009ee3] hover:bg-[#008bc7] text-white font-semibold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2"
          >
            Assinar Agora
          </button>
          
          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-400">
            <ShieldCheck size={14} />
            Pagamento seguro via Mercado Pago
          </div>
        </div>
      </div>
    </div>
  );
};
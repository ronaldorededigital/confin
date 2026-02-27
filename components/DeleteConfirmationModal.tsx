import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (deleteAll: boolean) => void;
  isInstallment: boolean;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isInstallment
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 relative animate-in fade-in zoom-in duration-200">
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
        >
          <X size={20} />
        </button>

        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle size={24} />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">Excluir Lançamento</h3>
          <p className="text-slate-500 text-sm">
            {isInstallment 
              ? "Este é um lançamento parcelado. Como deseja prosseguir com a exclusão?"
              : "Tem certeza que deseja excluir este lançamento? Esta ação não pode ser desfeita."}
          </p>
        </div>

        <div className="space-y-3">
          {isInstallment ? (
            <>
              <button
                onClick={() => onConfirm(true)}
                className="w-full py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors"
              >
                Excluir TODAS as parcelas
              </button>
              <button
                onClick={() => onConfirm(false)}
                className="w-full py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition-colors"
              >
                Excluir APENAS esta parcela
              </button>
            </>
          ) : (
            <button
              onClick={() => onConfirm(false)}
              className="w-full py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors"
            >
              Sim, excluir lançamento
            </button>
          )}
          
          <button
            onClick={onClose}
            className="w-full py-3 text-slate-500 font-medium hover:text-slate-700 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

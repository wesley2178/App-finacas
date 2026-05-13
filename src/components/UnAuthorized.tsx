import React from 'react';
import { ShieldAlert, LogOut, Clock } from 'lucide-react';
import { signOut } from '../lib/firebase';
import { motion } from 'motion/react';

export const UnAuthorizedView: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white rounded-3xl p-8 shadow-xl border border-slate-200 text-center space-y-6"
      >
        <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto border border-amber-100">
          <Clock className="w-10 h-10 text-amber-500" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Acesso Pendente</h1>
          <p className="text-slate-500">Sua conta foi criada com sucesso, mas ainda não foi autorizada pelo administrador.</p>
        </div>

        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-sm text-slate-600">
          <p>Por favor, solicite ao administrador <strong>wesley2178@gmail.com</strong> que libere o seu acesso.</p>
        </div>

        <div className="flex flex-col gap-3">
          <button 
            onClick={() => window.location.reload()}
            className="w-full bg-slate-900 text-white py-4 px-6 rounded-2xl font-bold hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-900/20"
          >
            Verificar Novamente
          </button>
          
          <button 
            onClick={() => signOut()}
            className="w-full flex items-center justify-center gap-2 bg-slate-100 text-slate-600 py-3 px-6 rounded-xl font-bold hover:bg-slate-200 transition-all"
          >
            <LogOut className="w-4 h-4" /> Sair
          </button>
        </div>
      </motion.div>
    </div>
  );
};

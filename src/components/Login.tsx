import React from 'react';
import { LogIn, Car } from 'lucide-react';
import { signInWithGoogle } from '../lib/firebase';
import { motion } from 'motion/react';

export const LoginView: React.FC = () => {
  const handleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (error: any) {
      console.error("Full Login Error:", error);
      const errorMessage = error.message || "Erro desconhecido";
      const errorCode = error.code || "unknown";
      alert(`Erro ao fazer login (${errorCode}): ${errorMessage}\n\nSe o problema persistir, tente abrir o aplicativo em uma nova aba fora do editor.`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-3xl p-8 shadow-xl border border-slate-200 text-center space-y-8"
      >
        <div className="w-20 h-20 bg-slate-900 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-slate-900/20">
          <Car className="w-10 h-10 text-white" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Minhas Finanças Pro</h1>
          <p className="text-slate-500">Gestão financeira completa para motoristas de aplicativo.</p>
        </div>

        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-sm text-slate-600 text-left">
          <p className="font-bold mb-1">Acesso Controlado:</p>
          <p>Cada conta possui seus próprios dados isolados. Novos usuários precisam de autorização do administrador para operar.</p>
        </div>

        <button 
          onClick={handleLogin}
          className="w-full flex items-center justify-center gap-3 bg-white border-2 border-slate-200 py-4 px-6 rounded-2xl font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-95"
        >
          <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
          Entrar com Google
        </button>

        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">
          Sistema de Gestão Segura
        </p>
      </motion.div>
    </div>
  );
};

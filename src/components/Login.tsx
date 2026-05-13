import React from 'react';
import { LogIn, Car, ShieldAlert, ExternalLink } from 'lucide-react';
import { signInWithGoogle } from '../lib/firebase';
import { motion } from 'motion/react';

export const LoginView: React.FC = () => {
  const [errorInfo, setErrorInfo] = React.useState<{ code: string; message: string } | null>(null);

  const handleLogin = async () => {
    setErrorInfo(null);
    try {
      await signInWithGoogle();
    } catch (error: any) {
      console.error("Full Login Error:", error);
      const errorCode = error.code || "unknown";
      const errorMessage = error.message || "Erro desconhecido";
      setErrorInfo({ code: errorCode, message: errorMessage });
      
      if (errorCode === 'auth/unauthorized-domain') {
        // Just keeping it in state to show in UI
      } else {
        alert(`Erro ao fazer login (${errorCode}): ${errorMessage}`);
      }
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

        {errorInfo?.code === 'auth/unauthorized-domain' && (
          <div className="bg-red-50 p-4 rounded-2xl border border-red-100 text-xs text-red-800 text-left space-y-4">
            <div className="flex items-start gap-2">
              <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm">Domínio Não Autorizado</p>
                <p className="mt-1">O Firebase ainda não reconheceu este endereço. Siga estes passos:</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <p className="font-bold mb-1">1. No Console do Firebase:</p>
                <p className="text-[10px] mb-2 text-red-700/70">Vá em Authentication &gt; Settings &gt; Authorized Domains e adicione:</p>
                <div className="bg-white/80 p-2 rounded-lg font-mono text-[10px] space-y-1 select-all border border-red-200">
                  <p>{window.location.hostname}</p>
                </div>
              </div>

              <div>
                <p className="font-bold mb-1">2. No Console do Google Cloud (Importante!):</p>
                <p className="text-[10px] mb-1 text-red-700/70">Acesse "APIs &amp; Services" &gt; "Credentials".</p>
                <p className="text-[10px] mb-1 text-red-700/70">Clique na sua Chave de API (Browser Key).</p>
                <p className="text-[10px] mb-2 text-red-700/70">Em "Website restrictions", verifique se o domínio acima está na lista. Se estiver marcado "None", está tudo bem. Se estiver em "Websites", adicione o domínio com `/*` no final.</p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button 
                onClick={() => window.open(window.location.href, '_blank')}
                className="w-full bg-red-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-700 transition-all text-xs shadow-sm"
              >
                <ExternalLink className="w-4 h-4" /> Abrir em Nova Aba (Resolve a maioria dos casos)
              </button>
              <p className="text-center text-[9px] text-red-400">Às vezes o Firebase leva até 10 minutos para atualizar os domínios.</p>
            </div>
          </div>
        )}

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

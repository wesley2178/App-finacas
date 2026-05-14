import * as React from 'react';
import { Car, LogIn, AlertCircle } from 'lucide-react';
import { signInWithGoogle } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';

export const Login: React.FC = () => {
  const { user, isAuthorized, whitelistChecked, loading } = useAuth();
  const [error, setError] = React.useState<string | null>(null);

  const handleLogin = async () => {
    try {
      setError(null);
      await signInWithGoogle();
    } catch (err: any) {
      console.error("Login Error:", err);
      setError("Falha ao entrar com Google. Tente novamente.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md space-y-8 animate-in fade-in zoom-in duration-500">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto shadow-2xl rotate-3 hover:rotate-0 transition-transform">
            <Car className="w-10 h-10 text-slate-900" />
          </div>
          <div className="pt-4">
            <h1 className="text-4xl font-black text-white tracking-tight italic">
              MOB<span className="text-slate-500">CASH</span>
            </h1>
            <p className="text-slate-400 mt-2 font-medium">Gestão inteligente para motoristas parceiros</p>
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-[2.5rem] shadow-2xl space-y-6">
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white text-center">Bem-vindo de volta</h2>
            <p className="text-slate-400 text-sm text-center">Entre com sua conta Google para acessar o sistema.</p>
          </div>

          <button
            onClick={handleLogin}
            className="w-full bg-white text-slate-900 h-14 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-slate-100 transition-all active:scale-95 shadow-xl shadow-white/5"
          >
            <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
            Entrar com Google
          </button>

          {user && whitelistChecked && !isAuthorized && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3 animate-in slide-in-from-top-2">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-red-500">Acesso Negado</p>
                <p className="text-xs text-red-500/80">Seu e-mail ({user.email}) não está na lista de usuários autorizados. Entre em contato com o suporte.</p>
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}
        </div>

        <div className="text-center">
          <p className="text-slate-600 text-xs font-medium uppercase tracking-[0.2em]">Versão Pro 2.0 • 2026</p>
        </div>
      </div>
    </div>
  );
};

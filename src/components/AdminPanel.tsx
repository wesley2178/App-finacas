import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { CheckCircle2, XCircle, Users, ShieldCheck, Mail, Calendar } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface UserProfile {
  id: string;
  email: string;
  isAuthorized: boolean;
  isAdmin: boolean;
  createdAt: any;
}

export const AdminPanel: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const formatUserDate = (date: any) => {
    if (!date) return 'Data desconhecida';
    if (date.toDate) return date.toDate().toLocaleDateString('pt-BR');
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const sortUsers = (a: any, b: any) => {
    const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
    const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
    return dateB.getTime() - dateA.getTime();
  };

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as UserProfile[];
      setUsers(usersData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const toggleAuthorization = async (userId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        isAuthorized: !currentStatus
      });
    } catch (error) {
      console.error("Error updating user authorization", error);
      alert("Erro ao atualizar autorização.");
    }
  };

  if (loading) return <div className="p-12 text-center text-slate-500 font-bold">Carregando painel de controle...</div>;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <div className="flex items-center justify-between bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h3 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-8 h-8 text-indigo-600" />
            Painel de Administração
          </h3>
          <p className="text-sm text-slate-500">Controle de acesso e autorizações da equipe</p>
        </div>
        <div className="flex items-center gap-4 text-xs font-bold bg-indigo-50 text-indigo-700 px-4 py-2 rounded-xl border border-indigo-100">
          <Users className="w-4 h-4" />
          {users.length} usuários cadastrados
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {users.sort(sortUsers).map(user => (
          <motion.div 
            key={user.id}
            layout
            className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col sm:flex-row items-center justify-between gap-4 hover:shadow-md transition-all"
          >
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                <Mail className="w-6 h-6" />
              </div>
              <div>
                <p className="font-bold text-slate-900">{user.email}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="flex items-center gap-1 text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                    <Calendar className="w-3 h-3" /> {formatUserDate(user.createdAt)}
                  </span>
                  {user.isAdmin && (
                    <span className="px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-600 text-[9px] font-black uppercase tracking-tighter">
                      Admin Principal
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end border-t sm:border-t-0 pt-4 sm:pt-0">
              <div className="text-right mr-2 hidden sm:block">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Status de Acesso</p>
                <p className={user.isAuthorized ? "text-emerald-600 font-bold text-sm" : "text-amber-500 font-bold text-sm"}>
                  {user.isAuthorized ? "Autorizado" : "Pendente"}
                </p>
              </div>
              
              {!user.isAdmin && (
                <button
                  onClick={() => toggleAuthorization(user.id, user.isAuthorized)}
                  className={cn(
                    "px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all active:scale-95",
                    user.isAuthorized 
                      ? "bg-red-50 text-red-600 hover:bg-red-100" 
                      : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-600/20"
                  )}
                >
                  {user.isAuthorized ? (
                    <><XCircle className="w-4 h-4" /> Revogar Acesso</>
                  ) : (
                    <><CheckCircle2 className="w-4 h-4" /> Autorizar Acesso</>
                  )}
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

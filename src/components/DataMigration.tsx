import React, { useState, useEffect } from 'react';
import { Database, AlertTriangle, CheckCircle, ArrowUpCircle, Loader2 } from 'lucide-react';
import { createDocument, saveUserMetadata } from '../lib/firestore';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  userId: string;
  onComplete: () => void;
}

export const DataMigration: React.FC<Props> = ({ userId, onComplete }) => {
  const [status, setStatus] = useState<'idle' | 'detecting' | 'confirming' | 'migrating' | 'success'>('idle');
  const [dataCount, setDataCount] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const checkData = () => {
      setStatus('detecting');
      const keys = [
        'uber_entries',
        'bills',
        'deposits',
        'daily_expenses',
        'monthly_archives'
      ];
      
      let totalItems = 0;
      keys.forEach(key => {
        const data = localStorage.getItem(key);
        if (data) {
          try {
            const parsed = JSON.parse(data);
            if (Array.isArray(parsed)) totalItems += parsed.length;
          } catch (e) {}
        }
      });

      if (totalItems > 0) {
        setDataCount(totalItems);
        setStatus('confirming');
      } else {
        onComplete();
      }
    };

    const timer = setTimeout(checkData, 1000);
    return () => clearTimeout(timer);
  }, []);

  const startMigration = async () => {
    setStatus('migrating');
    let completed = 0;

    const migrationPairs = [
      { key: 'uber_entries', coll: 'earnings' },
      { key: 'bills', coll: 'bills' },
      { key: 'deposits', coll: 'deposits' },
      { key: 'daily_expenses', coll: 'expenses' },
      { key: 'monthly_archives', coll: 'archives' }
    ];

    try {
      for (const pair of migrationPairs) {
        const data = localStorage.getItem(pair.key);
        if (data) {
          const items = JSON.parse(data);
          if (Array.isArray(items)) {
            for (const item of items) {
              // Remove old local ID to let Firestore generate its own or use it if wanted
              // We'll keep it for continuity but createDocument uses addDoc which generates new
              // Let's use setDoc if we want to preserve IDs, but addDoc is safer for now.
              const { id, ...cleanItem } = item;
              await createDocument(userId, pair.coll, cleanItem);
              completed++;
              setProgress(Math.round((completed / dataCount) * 100));
            }
          }
        }
      }

      // Migrate Metadata
      const customCats = localStorage.getItem('uber_custom_categories');
      const customExpCats = localStorage.getItem('uber_expense_custom_categories');
      if (customCats || customExpCats) {
        await saveUserMetadata(userId, {
          customCategories: customCats ? JSON.parse(customCats) : [],
          customExpenseCategories: customExpCats ? JSON.parse(customExpCats) : []
        });
      }

      // Cleanup
      migrationPairs.forEach(p => localStorage.removeItem(p.key));
      localStorage.removeItem('uber_custom_categories');
      localStorage.removeItem('uber_expense_custom_categories');

      setStatus('success');
      setTimeout(onComplete, 2000);
    } catch (error) {
      console.error("Migration error:", error);
      alert("Houve um erro na migração parcial. Tente recarregar.");
    }
  };

  if (status === 'idle' || status === 'detecting') return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-md">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-white rounded-3xl shadow-2xl border border-slate-200 p-8 max-w-md w-full text-center space-y-6"
        >
          {status === 'confirming' && (
            <>
              <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto">
                <Database className="w-10 h-10 text-amber-500" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-black text-slate-900">Dados Antigos Detectados!</h2>
                <p className="text-slate-500">
                  Encontramos <span className="font-bold text-slate-900">{dataCount} itens</span> salvos localmente neste navegador.
                </p>
                <p className="text-sm border-t border-slate-100 pt-4 text-slate-400">
                  Deseja importar esses dados para sua nova conta profissional segura?
                </p>
              </div>
              <div className="flex flex-col gap-3 pt-4">
                <button 
                  onClick={startMigration}
                  className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20"
                >
                  <ArrowUpCircle className="w-5 h-5" /> Importar Meus Dados Agora
                </button>
                <button 
                  onClick={onComplete}
                  className="w-full py-3 text-slate-400 font-bold hover:text-slate-600 transition-colors"
                >
                  Não, começar do zero
                </button>
              </div>
            </>
          )}

          {status === 'migrating' && (
            <>
              <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mx-auto">
                <Loader2 className="w-10 h-10 text-white animate-spin" />
              </div>
              <div className="space-y-4">
                <h2 className="text-2xl font-black text-slate-900">Migrando Dados...</h2>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className="h-full bg-slate-900"
                  />
                </div>
                <p className="text-sm font-bold text-slate-500">{progress}% concluído</p>
                <p className="text-xs text-slate-400 italic">Por favor, não feche esta aba.</p>
              </div>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-10 h-10 text-emerald-500" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-black text-slate-900">Sucesso!</h2>
                <p className="text-slate-500">Seus dados foram importados com sucesso para sua conta na nuvem.</p>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

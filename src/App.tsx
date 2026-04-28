/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from 'react';
import { useState, useEffect, useMemo, Component } from 'react';
import { 
  LayoutDashboard, 
  Car, 
  Receipt, 
  PiggyBank, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  X,
  Edit2,
  Menu,
  MoreVertical,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Calendar as CalendarIcon,
  ChevronRight,
  Bell,
  ShoppingBag,
  Utensils,
  FileText,
  Printer
} from 'lucide-react';
import { format, addMonths, isAfter, isBefore, startOfMonth, endOfMonth, parseISO, differenceInDays, addDays, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { cn } from './lib/utils';
import { EarningsEntry, Bill, SavingsDeposit, DailyExpense } from './types';

// --- Types ---
type Tab = 'dashboard' | 'earnings' | 'expenses' | 'bills' | 'savings' | 'report';

const CAIXINHA_CATEGORIES = ['rent', 'car', 'insurance', 'maintenance'];

// --- Utils ---
const generateId = () => {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  } catch (e) {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
};

const safeParseISO = (dateStr: any) => {
  if (!dateStr || typeof dateStr !== 'string') return new Date();
  const d = parseISO(dateStr);
  return isNaN(d.getTime()) ? new Date() : d;
};

const safeFormat = (dateStr: any, formatStr: string) => {
  try {
    const d = safeParseISO(dateStr);
    return format(d, formatStr, { locale: ptBR });
  } catch (e) {
    return 'Data inválida';
  }
};

const formatCurrency = (value: number | undefined | null, options?: Intl.NumberFormatOptions) => {
  return (value || 0).toLocaleString('pt-BR', options);
};

// --- Error Boundary ---
interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { hasError: false };

  public static getDerivedStateFromError(_: Error): ErrorBoundaryState {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <Card className="max-w-md w-full p-8 text-center space-y-6">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-10 h-10 text-red-500" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-slate-900">Ops! Algo deu errado.</h2>
              <p className="text-slate-500">Ocorreu um erro inesperado ao carregar esta aba. Isso pode ser devido a dados corrompidos.</p>
            </div>
            <div className="pt-4 space-y-3">
              <Button 
                onClick={() => window.location.reload()} 
                className="w-full"
              >
                Tentar Novamente
              </Button>
              <Button 
                variant="danger" 
                onClick={() => {
                  localStorage.clear();
                  window.location.reload();
                }} 
                className="w-full"
              >
                Limpar Todos os Dados
              </Button>
            </div>
          </Card>
        </div>
      );
    }

    return (this as any).props.children;
  }
}

// --- Components ---

const Card = ({ children, className }: { children: React.ReactNode; className?: string; [key: string]: any }) => (
  <div className={cn("bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden", className)}>
    {children}
  </div>
);

const Button = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  className,
  type = 'button'
}: { 
  children: React.ReactNode; 
  onClick?: () => void; 
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  className?: string;
  type?: 'button' | 'submit';
}) => {
  const variants = {
    primary: "bg-slate-900 text-white hover:bg-slate-800",
    secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200",
    danger: "bg-red-50 text-red-600 hover:bg-red-100",
    ghost: "bg-transparent text-slate-600 hover:bg-slate-100"
  };

  return (
    <button 
      type={type}
      onClick={onClick}
      className={cn(
        "px-4 py-2 rounded-xl font-medium transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50",
        variants[variant],
        className
      )}
    >
      {children}
    </button>
  );
};

const Input = ({ 
  label, 
  ...props 
}: { 
  label: string; 
  [key: string]: any 
}) => (
  <div className="flex flex-col gap-1.5 w-full">
    <label className="text-sm font-medium text-slate-700">{label}</label>
    <input 
      {...props}
      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-slate-50/50"
    />
  </div>
);

// --- Sub-components for Views ---

const EarningsView = ({ entries, onAdd, onDelete }: { 
  entries: EarningsEntry[]; 
  onAdd: (entry: Omit<EarningsEntry, 'id'>) => void;
  onDelete: (id: string) => void;
}) => {
  const [formData, setFormData] = useState({ 
    date: format(new Date(), 'yyyy-MM-dd'), 
    uberEarnings: '', 
    pop99Earnings: '',
    otherEarnings: '',
    kmDriven: '',
    extraCosts: '' 
  });

  const uberNum = Number(formData.uberEarnings || 0);
  const pop99Num = Number(formData.pop99Earnings || 0);
  const otherNum = Number(formData.otherEarnings || 0);
  const kmNum = Number(formData.kmDriven || 0);
  const extraCostsNum = Number(formData.extraCosts || 0);
  
  const fuelCost = kmNum * 0.20;
  const totalEarnings = uberNum + pop99Num + otherNum;
  const totalCosts = fuelCost + extraCostsNum;

  const getComparison = () => {
    const apps = [
      { name: 'Uber', value: uberNum, color: 'text-slate-900' },
      { name: '99 Pop', value: pop99Num, color: 'text-amber-600' },
      { name: 'Outros', value: otherNum, color: 'text-blue-600' }
    ];
    const top = [...apps].sort((a, b) => b.value - a.value)[0];
    
    if (top.value === 0) return null;
    return { text: `${top.name} rendeu mais!`, color: top.color, icon: Car };
  };

  const comparison = getComparison();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (totalEarnings <= 0 && totalCosts <= 0) return;
    onAdd({
      date: formData.date,
      uberEarnings: uberNum,
      pop99Earnings: pop99Num,
      otherEarnings: otherNum,
      totalEarnings: totalEarnings,
      costs: totalCosts,
      kmDriven: kmNum
    });
    setFormData({ 
      date: format(new Date(), 'yyyy-MM-dd'), 
      uberEarnings: '', 
      pop99Earnings: '', 
      otherEarnings: '',
      kmDriven: '',
      extraCosts: '' 
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold">Calculadora de Ganhos</h3>
          {comparison && (
            <div className={cn("flex items-center gap-2 px-3 py-1 rounded-full bg-slate-50 border border-slate-100 text-xs font-bold", comparison.color)}>
              <comparison.icon className="w-3 h-3" />
              {comparison.text}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
            <Input 
              label="Data" 
              type="date" 
              value={formData.date} 
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, date: e.target.value })} 
            />
            <Input 
              label="Ganhos Uber (R$)" 
              type="number" 
              placeholder="0,00"
              value={formData.uberEarnings} 
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, uberEarnings: e.target.value })} 
            />
            <Input 
              label="Ganhos 99 (R$)" 
              type="number" 
              placeholder="0,00"
              value={formData.pop99Earnings} 
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, pop99Earnings: e.target.value })} 
            />
            <Input 
              label="Outros Ganhos (R$)" 
              type="number" 
              placeholder="0,00"
              value={formData.otherEarnings} 
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, otherEarnings: e.target.value })} 
            />
            <Input 
              label="KM Rodado" 
              type="number" 
              placeholder="0"
              value={formData.kmDriven} 
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, kmDriven: e.target.value })} 
            />
            <Input 
              label="Custos Extras (R$)" 
              type="number" 
              placeholder="0,00"
              value={formData.extraCosts} 
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, extraCosts: e.target.value })} 
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">Custo Combustível (R$ 0,20/km)</p>
              <p className="text-xl font-black text-red-500">R$ {formatCurrency(fuelCost, { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">Custo Total</p>
              <p className="text-xl font-black text-slate-900">R$ {formatCurrency(totalCosts, { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="p-4 bg-slate-900 rounded-2xl text-white flex items-center justify-between">
              <div>
                <p className="text-[10px] text-white/50 uppercase font-bold tracking-widest mb-1">Ganhos Totais</p>
                <p className="text-xl font-black">R$ {formatCurrency(totalEarnings, { minimumFractionDigits: 2 })}</p>
              </div>
              <Button type="submit" className="bg-white text-slate-900 hover:bg-slate-100 h-10">
                <Plus className="w-4 h-4" /> Salvar
              </Button>
            </div>
          </div>
        </form>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-bottom border-slate-100 bg-slate-50/50">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Data</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Uber</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">99</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Outros</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">KM</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">TotalBruto</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Custos</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Líquido</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {entries.map(entry => (
                <tr key={entry.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900">
                    {safeFormat(entry.date, "dd/MM/yyyy")}
                  </td>
                  <td className="px-6 py-4 text-slate-600 text-sm">
                    R$ {formatCurrency(entry.uberEarnings)}
                  </td>
                  <td className="px-6 py-4 text-amber-600 text-sm">
                    R$ {formatCurrency(entry.pop99Earnings)}
                  </td>
                  <td className="px-6 py-4 text-blue-600 text-sm">
                    R$ {formatCurrency(entry.otherEarnings || 0)}
                  </td>
                  <td className="px-6 py-4 text-slate-400 text-sm">
                    {entry.kmDriven || 0} km
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-900">
                    R$ {formatCurrency(entry.totalEarnings)}
                  </td>
                  <td className="px-6 py-4 text-red-500">
                    R$ {formatCurrency(entry.costs)}
                  </td>
                  <td className="px-6 py-4 font-bold text-emerald-600">
                    R$ {formatCurrency(entry.totalEarnings - entry.costs)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => onDelete(entry.id)}
                      className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

const BillsView = ({ bills, onAdd, onToggle, onDelete, customCategories, onAddCategory }: {
  bills: Bill[];
  onAdd: (bill: Omit<Bill, 'id' | 'isPaid'>) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  customCategories: string[];
  onAddCategory: (name: string) => void;
}) => {
  const [formData, setFormData] = useState({ 
    name: '', 
    value: '', 
    dueDate: format(new Date(), 'yyyy-MM-dd'), 
    isRecurring: true,
    category: 'other' as Bill['category']
  });
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showAddCategory, setShowAddCategory] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.value) return;
    onAdd({
      name: formData.name,
      value: Number(formData.value),
      dueDate: formData.dueDate,
      isRecurring: formData.isRecurring,
      category: formData.category
    });
    setFormData({ 
      name: '', 
      value: '', 
      dueDate: format(new Date(), 'yyyy-MM-dd'), 
      isRecurring: true,
      category: 'other'
    });
  };

  const handleAddCategory = () => {
    if (newCategoryName.trim()) {
      onAddCategory(newCategoryName.trim());
      setNewCategoryName('');
      setShowAddCategory(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="p-6">
        <h3 className="text-lg font-bold mb-4">Adicionar Nova Conta</h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          <Input 
            label="Nome da Conta" 
            placeholder="Ex: Aluguel"
            value={formData.name} 
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })} 
          />
          <Input 
            label="Valor (R$)" 
            type="number" 
            placeholder="0,00"
            value={formData.value} 
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, value: e.target.value })} 
          />
          <Input 
            label="Vencimento" 
            type="date" 
            value={formData.dueDate} 
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, dueDate: e.target.value })} 
          />
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-slate-700">Categoria</label>
              <button 
                type="button"
                onClick={() => setShowAddCategory(!showAddCategory)}
                className="text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-900 transition-colors flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Nova Categoria
              </button>
            </div>
            {showAddCategory ? (
              <div className="flex gap-2">
                <input 
                  type="text"
                  placeholder="Nome da categoria..."
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
                  autoFocus
                />
                <button 
                  type="button"
                  onClick={handleAddCategory}
                  className="px-4 py-2 bg-slate-900 text-white text-xs rounded-lg font-bold hover:bg-slate-800 transition-colors"
                >
                  Criar
                </button>
              </div>
            ) : (
              <select 
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as Bill['category'] })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-slate-50/50"
              >
                <option value="rent">Aluguel</option>
                <option value="car">Carro / Financiamento</option>
                <option value="insurance">Seguro</option>
                <option value="maintenance">Manutenção</option>
                <option value="other">Outros (Luz, Água, etc)</option>
                {customCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            )}
          </div>
          <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200 lg:col-span-5">
            <input 
              id="recurring"
              type="checkbox" 
              checked={formData.isRecurring} 
              onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
              className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900 border-slate-300"
            />
            <label htmlFor="recurring" className="text-sm font-medium text-slate-700 cursor-pointer">
              Conta Recorrente (Gerar automaticamente todos os meses)
            </label>
          </div>
          <Button type="submit" className="w-full lg:col-span-1">
            <Plus className="w-4 h-4" /> Adicionar
          </Button>
        </form>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {bills.map(bill => {
          const isOverdue = !bill.isPaid && isBefore(safeParseISO(bill.dueDate), new Date()) && !isSameDay(safeParseISO(bill.dueDate), new Date());
          
          return (
            <Card key={bill.id} className={cn(
              "p-5 border-l-4 transition-all hover:shadow-md",
              bill.isPaid ? "border-l-emerald-500" : isOverdue ? "border-l-red-500" : "border-l-slate-300"
            )}>
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-slate-900">{bill.name}</h4>
                    {bill.isRecurring && (
                      <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[9px] font-black uppercase tracking-tighter">
                        <Bell className="w-2.5 h-2.5" /> Recorrente
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">Vence em {safeFormat(bill.dueDate, 'dd/MM/yyyy')}</p>
                </div>
                <div className={cn(
                  "px-2 py-1 rounded text-[10px] font-bold uppercase",
                  bill.isPaid ? "bg-emerald-50 text-emerald-600" : isOverdue ? "bg-red-50 text-red-600" : "bg-slate-100 text-slate-600"
                )}>
                  {bill.isPaid ? "Pago" : isOverdue ? "Atrasado" : "Pendente"}
                </div>
              </div>
              
              <div className="flex items-center justify-between mt-6">
                <span className="text-xl font-bold text-slate-900">R$ {formatCurrency(bill.value)}</span>
                <div className="flex gap-2">
                  <button 
                    onClick={() => onToggle(bill.id)}
                    className={cn(
                      "p-2 rounded-lg transition-colors",
                      bill.isPaid ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400 hover:text-emerald-600"
                    )}
                  >
                    <CheckCircle2 className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => onDelete(bill.id)}
                    className="p-2 rounded-lg bg-slate-100 text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

const SavingsView = ({ goals, deposits, onDeposit, onDeleteDeposit, onUpdateDeposit }: {
  goals: any[];
  deposits: SavingsDeposit[];
  onDeposit: (deposit: Omit<SavingsDeposit, 'id'>) => void;
  onDeleteDeposit: (id: string) => void;
  onUpdateDeposit: (id: string, amount: number) => void;
}) => {
  const [selectedBillId, setSelectedBillId] = useState('');
  const [amount, setAmount] = useState('');
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});
  const [editingDepositId, setEditingDepositId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState('');

  const handleDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBillId || !amount) return;
    onDeposit({
      billId: selectedBillId,
      amount: Number(amount),
      date: format(new Date(), 'yyyy-MM-dd')
    });
    setAmount('');
  };

  const confirmDaily = (goal: any) => {
    const depositAmount = customAmounts[goal.id] ? Number(customAmounts[goal.id]) : Number(goal.dailyNeeded.toFixed(2));
    onDeposit({
      billId: goal.id,
      amount: depositAmount,
      date: format(new Date(), 'yyyy-MM-dd')
    });
    // Clear custom amount for this goal
    setCustomAmounts(prev => {
      const next = { ...prev };
      delete next[goal.id];
      return next;
    });
  };

  const startEditing = (deposit: SavingsDeposit) => {
    setEditingDepositId(deposit.id);
    setEditAmount(deposit.amount.toString());
  };

  const saveEdit = () => {
    if (editingDepositId && editAmount) {
      onUpdateDeposit(editingDepositId, Number(editAmount));
      setEditingDepositId(null);
      setEditAmount('');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <PiggyBank className="w-5 h-5 text-amber-500" />
            Suas Caixinhas (Metas Diárias)
          </h3>
          
          {goals.map(goal => {
            const progress = (goal.totalSaved / goal.value) * 100;
            const remainingPercent = 100 - progress;
            const todayStr = format(new Date(), 'yyyy-MM-dd');
            const alreadyDepositedToday = deposits.some(d => d.billId === goal.id && d.date === todayStr);
            
            return (
              <Card key={goal.id} className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-xl font-bold text-slate-900">{goal.name}</h4>
                      <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded">
                        {goal.category === 'rent' ? 'Aluguel' : 
                         goal.category === 'car' ? 'Carro' : 
                         goal.category === 'insurance' ? 'Seguro' : 
                         goal.category === 'maintenance' ? 'Manutenção' : 
                         goal.category === 'other' ? 'Outros' : goal.category}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500">Meta: R$ {formatCurrency(goal.value)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium text-slate-500 uppercase">Guardar hoje:</p>
                    <p className={cn(
                      "text-lg font-bold",
                      alreadyDepositedToday ? "text-emerald-600" : "text-amber-600"
                    )}>
                      {alreadyDepositedToday ? "Concluído" : `R$ ${formatCurrency(goal.dailyNeeded, { minimumFractionDigits: 2 })}`}
                    </p>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Ruler Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-emerald-600">Progresso: {progress.toFixed(1)}%</span>
                      <span className="text-red-500">Falta: {remainingPercent.toFixed(1)}%</span>
                    </div>
                    <div className="relative h-6 bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                      <div 
                        className="absolute top-0 left-0 h-full bg-emerald-500 transition-all duration-1000" 
                        style={{ width: `${Math.min(100, progress)}%` }}
                      />
                      {/* Ruler Ticks */}
                      <div className="absolute top-0 left-0 w-full h-full flex justify-between px-1 pointer-events-none">
                        {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map(tick => (
                          <div key={tick} className="h-full flex flex-col items-center justify-end pb-0.5">
                            <div className={cn(
                              "w-px bg-slate-400/30",
                              tick % 50 === 0 ? "h-3" : tick % 10 === 0 ? "h-2" : "h-1"
                            )} />
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex justify-between text-[9px] text-slate-400 font-mono px-0.5">
                      <span>0%</span>
                      <span>50%</span>
                      <span>100%</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 py-4 bg-slate-50/50 rounded-xl px-4 border border-slate-100">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">Já Depositado</p>
                      <p className="text-xl font-bold text-emerald-600">R$ {formatCurrency(goal.totalSaved)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">Ainda Falta</p>
                      <p className="text-xl font-bold text-red-500">R$ {formatCurrency(goal.remaining)}</p>
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <div className="flex items-center gap-1">
                        <CalendarIcon className="w-3 h-3" />
                        {goal.daysLeft} dias restantes
                      </div>
                    </div>
                    
                    {!alreadyDepositedToday && goal.remaining > 0 && (
                      <div className="flex items-center gap-2 w-full md:w-auto">
                        <div className="relative flex-1 md:w-32">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">R$</span>
                          <input 
                            type="number"
                            placeholder={goal.dailyNeeded.toFixed(2)}
                            value={customAmounts[goal.id] || ''}
                            onChange={(e) => setCustomAmounts(prev => ({ ...prev, [goal.id]: e.target.value }))}
                            className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                          />
                        </div>
                        <Button 
                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-xs font-bold whitespace-nowrap"
                          onClick={() => confirmDaily(goal)}
                        >
                          Confirmar Depósito
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}

          {goals.length === 0 && (
            <Card className="p-12 flex flex-col items-center justify-center text-slate-400 border-dashed border-2">
              <PiggyBank className="w-12 h-12 mb-4 opacity-20" />
              <p className="text-center">Adicione contas na aba de Contas para que elas apareçam aqui como metas diárias.</p>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="font-bold mb-4">Depositar na Caixinha</h3>
            <form onSubmit={handleDeposit} className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">Escolher Meta</label>
                <select 
                  value={selectedBillId}
                  onChange={(e) => setSelectedBillId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-slate-50/50"
                >
                  <option value="">Selecione uma conta...</option>
                  {goals.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>
              <Input 
                label="Valor do Depósito (R$)" 
                type="number" 
                placeholder="0,00"
                value={amount}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAmount(e.target.value)}
              />
              <Button type="submit" className="w-full">
                Confirmar Depósito
              </Button>
            </form>
          </Card>

          <Card className="p-6">
            <h3 className="font-bold mb-4 text-sm uppercase tracking-wider text-slate-500">Histórico Recente</h3>
            <div className="space-y-3">
              {deposits.slice(0, 10).reverse().map(d => {
                const isEditing = editingDepositId === d.id;
                return (
                  <div key={d.id} className="flex justify-between items-center text-sm p-2 rounded-lg hover:bg-slate-50 transition-colors group">
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">Depósito</p>
                      <p className="text-[10px] text-slate-400">{safeFormat(d.date, 'dd/MM/yyyy')}</p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <input 
                            type="number"
                            value={editAmount}
                            onChange={(e) => setEditAmount(e.target.value)}
                            className="w-20 px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            autoFocus
                          />
                          <button onClick={saveEdit} className="text-emerald-600 hover:text-emerald-700">
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => setEditingDepositId(null)} className="text-slate-400 hover:text-slate-600">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="font-bold text-emerald-600">R$ {formatCurrency(d.amount)}</span>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => startEditing(d)}
                              className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={() => onDeleteDeposit(d.id)}
                              className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
              {deposits.length === 0 && (
                <p className="text-center text-xs text-slate-400 py-4">Nenhum depósito realizado.</p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

const ExpensesView = ({ expenses, onAdd, onDelete, customCategories, onAddCategory }: {
  expenses: DailyExpense[];
  onAdd: (expense: Omit<DailyExpense, 'id'>) => void;
  onDelete: (id: string) => void;
  customCategories: string[];
  onAddCategory: (name: string) => void;
}) => {
  const [formData, setFormData] = useState({ 
    description: '', 
    value: '', 
    date: format(new Date(), 'yyyy-MM-dd'),
    category: 'food'
  });
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showAddCategory, setShowAddCategory] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description || !formData.value) return;
    onAdd({
      description: formData.description,
      value: Number(formData.value),
      date: formData.date,
      category: formData.category
    });
    setFormData({ 
      description: '', 
      value: '', 
      date: format(new Date(), 'yyyy-MM-dd'),
      category: 'food'
    });
  };

  const handleAddCategory = () => {
    if (newCategoryName.trim()) {
      onAddCategory(newCategoryName.trim());
      setNewCategoryName('');
      setShowAddCategory(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="p-6">
        <h3 className="text-lg font-bold mb-4">Novo Gasto do Dia</h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <Input 
            label="Descrição" 
            placeholder="Ex: Lanche, Almoço..."
            value={formData.description} 
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, description: e.target.value })} 
          />
          <Input 
            label="Valor (R$)" 
            type="number" 
            placeholder="0,00"
            value={formData.value} 
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, value: e.target.value })} 
          />
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-slate-700">Categoria</label>
              <button 
                type="button"
                onClick={() => setShowAddCategory(!showAddCategory)}
                className="text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-900 transition-colors flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Nova Categoria
              </button>
            </div>
            {showAddCategory ? (
              <div className="flex gap-2">
                <input 
                  type="text"
                  placeholder="Nova..."
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all font-sans"
                  autoFocus
                />
                <button 
                  type="button"
                  onClick={handleAddCategory}
                  className="px-4 py-2 bg-slate-900 text-white text-xs rounded-lg font-bold hover:bg-slate-800 transition-colors"
                >
                  Criar
                </button>
              </div>
            ) : (
              <select 
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-slate-50/50"
              >
                <option value="food">Comida</option>
                <option value="delivery">Delivery</option>
                <option value="transport">Transporte</option>
                <option value="other">Outros</option>
                {customCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            )}
          </div>
          <Button type="submit" className="w-full">
            <Plus className="w-4 h-4" /> Registrar
          </Button>
        </form>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-bottom border-slate-100 bg-slate-50/50">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Data</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Descrição</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Categoria</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Valor</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {expenses.map(expense => (
                <tr key={expense.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 text-slate-500 text-sm">
                    {safeFormat(expense.date, "dd/MM/yyyy")}
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-900">
                    {expense.description}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-600">
                      {expense.category === 'food' ? 'Comida' : 
                       expense.category === 'delivery' ? 'Delivery' : 
                       expense.category === 'transport' ? 'Transporte' : 
                       expense.category === 'other' ? 'Outros' : expense.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-bold text-red-500">
                    R$ {formatCurrency(expense.value)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => onDelete(expense.id)}
                      className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {expenses.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    Nenhum gasto registrado hoje.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

const ReportView = ({ earnings, expenses, bills }: {
  earnings: EarningsEntry[];
  expenses: DailyExpense[];
  bills: Bill[];
}) => {
  const totalUber = earnings.reduce((acc, curr) => acc + curr.uberEarnings, 0);
  const total99 = earnings.reduce((acc, curr) => acc + curr.pop99Earnings, 0);
  const totalOtherEarnings = earnings.reduce((acc, curr) => acc + (curr.otherEarnings || 0), 0);
  const totalGrossEarnings = totalUber + total99 + totalOtherEarnings;

  const operationalCosts = earnings.reduce((acc, curr) => acc + curr.costs, 0);
  const dailyExpensesValue = expenses.reduce((acc, curr) => acc + curr.value, 0);
  const totalBillsValue = bills.reduce((acc, curr) => acc + curr.value, 0);
  const paidBillsValue = bills.filter(b => b.isPaid).reduce((acc, curr) => acc + curr.value, 0);
  
  const totalAllCosts = operationalCosts + dailyExpensesValue + totalBillsValue;
  const netBalance = totalGrossEarnings - totalAllCosts;

  const dataApps = [
    { name: 'Uber', value: totalUber, color: '#0f172a' },
    { name: '99 Pop', value: total99, color: '#f59e0b' },
    { name: 'Outros', value: totalOtherEarnings, color: '#3b82f6' }
  ].filter(d => d.value > 0);

  const dataExpenses = [
    { name: 'Operacional', value: operationalCosts, color: '#ef4444' },
    { name: 'Diários', value: dailyExpensesValue, color: '#f97316' },
    { name: 'Contas Fixas', value: totalBillsValue, color: '#64748b' }
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h3 className="text-2xl font-black text-slate-900 tracking-tight">Relatório de Desempenho</h3>
          <p className="text-sm text-slate-500">Visão consolidada de todas as suas finanças</p>
        </div>
        <Button variant="secondary" onClick={() => window.print()} className="hidden md:flex gap-2 h-11 px-6">
          <Printer className="w-4 h-4" /> Exportar PDF
        </Button>
      </div>

      {/* Financial Health Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-8 bg-slate-900 border-none shadow-xl shadow-slate-900/20">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Lucro Líquido Real</p>
          <div className="flex items-baseline gap-2 mb-4">
            <h4 className={cn(
              "text-4xl font-black tracking-tight",
              netBalance >= 0 ? "text-emerald-400" : "text-red-400"
            )}>
              R$ {formatCurrency(netBalance)}
            </h4>
          </div>
          <div className="pt-6 border-t border-white/10 flex justify-between">
            <div>
              <p className="text-[9px] font-bold text-white/40 uppercase">Ganhos Totais</p>
              <p className="font-bold text-white">R$ {formatCurrency(totalGrossEarnings)}</p>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-bold text-white/40 uppercase">Dívidas/Gastos</p>
              <p className="font-bold text-red-400">R$ {formatCurrency(totalAllCosts)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h4 className="font-bold text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-500" /> Distribuição de Receita
            </h4>
            <div className="flex gap-4">
              {dataApps.map(app => (
                <div key={app.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: app.color }} />
                  <span className="text-xs font-bold text-slate-500">{app.name}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="h-4 sm:h-8 flex rounded-full overflow-hidden bg-slate-100">
            {dataApps.map(app => (
              <div 
                key={app.name}
                style={{ 
                  width: `${(app.value / (totalGrossEarnings || 1)) * 100}%`,
                  backgroundColor: app.color
                }}
                className="h-full transition-all duration-500 hover:opacity-80"
              />
            ))}
          </div>
          <div className="grid grid-cols-3 gap-4 mt-6">
            {dataApps.map(app => (
              <div key={app.name} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase">{app.name}</p>
                <p className="text-sm font-black text-slate-900">R$ {formatCurrency(app.value)}</p>
                <p className="text-[9px] font-bold text-emerald-600">
                  {((app.value / (totalGrossEarnings || 1)) * 100).toFixed(1)}% do total
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Detailed Expenses Breakdown */}
        <Card className="p-6">
          <h4 className="font-bold mb-6 flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-slate-400" /> Todos os Custos & Gastos
          </h4>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-red-50/50 rounded-2xl border border-red-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg"><Car className="w-4 h-4 text-red-600" /></div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Custos Operacionais</p>
                  <p className="text-[10px] text-red-600/70 font-medium">Combustível + Extras do KM</p>
                </div>
              </div>
              <span className="font-black text-red-600">R$ {formatCurrency(operationalCosts)}</span>
            </div>

            <div className="flex items-center justify-between p-4 bg-orange-50/50 rounded-2xl border border-orange-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg"><Utensils className="w-4 h-4 text-orange-600" /></div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Gastos Diários</p>
                  <p className="text-[10px] text-orange-600/70 font-medium">Lanches, Refeições, Outros</p>
                </div>
              </div>
              <span className="font-black text-orange-600">R$ {formatCurrency(dailyExpensesValue)}</span>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-200 rounded-lg"><Receipt className="w-4 h-4 text-slate-600" /></div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Contas Fixas</p>
                  <p className="text-[10px] text-slate-500 font-medium">Aluguel, Carro, Seguros, etc</p>
                </div>
              </div>
              <span className="font-black text-slate-900">R$ {formatCurrency(totalBillsValue)}</span>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Custo Médio Diário</p>
            <p className="text-2xl font-black text-slate-900">
              R$ {formatCurrency(totalAllCosts / (earnings.length || 1), { minimumFractionDigits: 2 })}
            </p>
          </div>
        </Card>

        {/* Categories Analysis */}
        <Card className="p-6">
          <h4 className="font-bold mb-6 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-slate-400" /> Visão de Pagamento de Contas
          </h4>
          <div className="h-[200px] w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Pagas', value: paidBillsValue },
                    { name: 'Pendentes', value: totalBillsValue - paidBillsValue }
                  ].filter(d => d.value > 0)}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  <Cell fill="#10b981" />
                  <Cell fill="#f43f5e" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-3 mt-4">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 font-medium flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500" /> Pagas
              </span>
              <span className="font-bold text-emerald-600">R$ {formatCurrency(paidBillsValue)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 font-medium flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500" /> Pendentes
              </span>
              <span className="font-bold text-red-600">R$ {formatCurrency(totalBillsValue - paidBillsValue)}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Tips / Insights Dashboard */}
      <Card className="p-6 bg-blue-50 border-blue-200">
        <h4 className="font-bold text-blue-900 mb-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" /> Dicas Rápidas
        </h4>
        <ul className="space-y-2 text-sm text-blue-700">
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
            {totalUber > total99 
              ? "A Uber está sendo seu app principal. Considere ver bônus da 99 para diversificar." 
              : "A 99 Pop está rendendo muito bem! Fique atento às taxas da Uber."}
          </li>
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
            {netBalance < totalGrossEarnings * 0.4 
              ? "Seus custos estão consumindo mais de 60% da receita. Tente otimizar as rotas." 
              : "Parabéns! Sua margem de lucro está excelente este período."}
          </li>
        </ul>
      </Card>
    </div>
  );
};



// --- Main App ---

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [showAllData, setShowAllData] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // State Persistence
  const [earningsEntries, setEarningsEntries] = useState<EarningsEntry[]>(() => {
    const saved = localStorage.getItem('uber_entries');
    if (!saved) return [];
    try {
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return [];
      return parsed.map((entry: any) => ({
        ...entry,
        uberEarnings: entry.uberEarnings ?? entry.earnings ?? 0,
        pop99Earnings: entry.pop99Earnings ?? 0,
        otherEarnings: entry.otherEarnings ?? 0,
        totalEarnings: entry.totalEarnings ?? entry.earnings ?? 0,
        costs: entry.costs ?? 0,
        kmDriven: entry.kmDriven ?? 0
      }));
    } catch (e) {
      return [];
    }
  });

  const [bills, setBills] = useState<Bill[]>(() => {
    const saved = localStorage.getItem('bills');
    if (!saved) return [];
    try {
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  });

  const [customCategories, setCustomCategories] = useState<string[]>(() => {
    const saved = localStorage.getItem('uber_custom_categories');
    if (!saved) return [];
    try {
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  });

  const [deposits, setDeposits] = useState<SavingsDeposit[]>(() => {
    const saved = localStorage.getItem('deposits');
    if (!saved) return [];
    try {
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  });

  const [dailyExpenses, setDailyExpenses] = useState<DailyExpense[]>(() => {
    const saved = localStorage.getItem('daily_expenses');
    if (!saved) return [];
    try {
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  });

  const [customExpenseCategories, setCustomExpenseCategories] = useState<string[]>(() => {
    const saved = localStorage.getItem('uber_expense_custom_categories');
    if (!saved) return [];
    try {
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('uber_entries', JSON.stringify(earningsEntries));
  }, [earningsEntries]);

  useEffect(() => {
    localStorage.setItem('bills', JSON.stringify(bills));
  }, [bills]);

  useEffect(() => {
    localStorage.setItem('uber_custom_categories', JSON.stringify(customCategories));
  }, [customCategories]);

  useEffect(() => {
    localStorage.setItem('deposits', JSON.stringify(deposits));
  }, [deposits]);

  useEffect(() => {
    localStorage.setItem('daily_expenses', JSON.stringify(dailyExpenses));
  }, [dailyExpenses]);

  useEffect(() => {
    localStorage.setItem('uber_expense_custom_categories', JSON.stringify(customExpenseCategories));
  }, [customExpenseCategories]);

  // Automatic Recurrence Rollover: Ensure recurring bills from previous months exist for current month
  useEffect(() => {
    if (bills.length === 0) return;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    setBills(prev => {
      const newBills: Bill[] = [...prev];
      let changed = false;

      // Find all unique recurring bill templates (based on name)
      const recurringTemplates = prev.filter(b => b.isRecurring);
      const uniqueTemplateNames = Array.from(new Set(recurringTemplates.map(b => b.name)));

      uniqueTemplateNames.forEach(name => {
        // Find the latest instance of this recurring bill
        const instances = prev.filter(b => b.name === name);
        const latestInstance = [...instances].sort((a, b) => 
          safeParseISO(b.dueDate).getTime() - safeParseISO(a.dueDate).getTime()
        )[0];

        if (latestInstance && latestInstance.isRecurring) {
          const latestDate = safeParseISO(latestInstance.dueDate);
          let checkDate = addMonths(latestDate, 1);

          // Generate instances until we hit the current month/year
          while (
            (checkDate.getFullYear() < currentYear) || 
            (checkDate.getFullYear() === currentYear && checkDate.getMonth() <= currentMonth)
          ) {
            const dateStr = format(checkDate, 'yyyy-MM-dd');
            const alreadyExists = prev.some(b => b.name === name && b.dueDate === dateStr);

            if (!alreadyExists) {
              newBills.push({
                ...latestInstance,
                id: generateId(),
                dueDate: dateStr,
                isPaid: false
              });
              changed = true;
            }
            checkDate = addMonths(checkDate, 1);
          }
        }
      });

      return changed ? newBills : prev;
    });
  }, []); // Run only on mount

  // --- Handlers ---

  const addEarningsEntry = (entry: Omit<EarningsEntry, 'id'>) => {
    setEarningsEntries(prev => [{ ...entry, id: generateId() }, ...prev]);
  };

  const deleteEarningsEntry = (id: string) => {
    setEarningsEntries(prev => prev.filter(e => e.id !== id));
  };

  const addBill = (bill: Omit<Bill, 'id' | 'isPaid'>) => {
    setBills(prev => [...prev, { ...bill, id: generateId(), isPaid: false }]);
  };

  const toggleBillPaid = (id: string) => {
    setBills(prev => {
      const bill = prev.find(b => b.id === id);
      if (!bill) return prev;

      const isMarkingAsPaid = !bill.isPaid;
      const updated = prev.map(b => b.id === id ? { ...b, isPaid: !b.isPaid } : b);
      
      // Recurrence logic: if marking as paid AND it's recurring, create a new item for the next month
      if (isMarkingAsPaid && bill.isRecurring) {
        const nextDueDate = format(addMonths(safeParseISO(bill.dueDate), 1), 'yyyy-MM-dd');
        const alreadyExists = prev.some(b => b.name === bill.name && b.dueDate === nextDueDate);
        
        if (!alreadyExists) {
          return [...updated, {
            ...bill,
            id: generateId(),
            dueDate: nextDueDate,
            isPaid: false,
            isRecurring: true // Ensure it continues to recur
          }];
        }
      }
      
      return updated;
    });
  };

  const deleteBill = (id: string) => {
    setBills(prev => prev.filter(b => b.id !== id));
    setDeposits(prev => prev.filter(d => d.billId !== id));
  };

  const addDeposit = (deposit: Omit<SavingsDeposit, 'id'>) => {
    setDeposits(prev => [...prev, { ...deposit, id: generateId() }]);
  };

  const deleteDeposit = (id: string) => {
    setDeposits(prev => prev.filter(d => d.id !== id));
  };

  const updateDeposit = (id: string, amount: number) => {
    setDeposits(prev => prev.map(d => d.id === id ? { ...d, amount } : d));
  };

  const addDailyExpense = (expense: Omit<DailyExpense, 'id'>) => {
    setDailyExpenses(prev => [{ ...expense, id: generateId() }, ...prev]);
  };

  const deleteDailyExpense = (id: string) => {
    setDailyExpenses(prev => prev.filter(e => e.id !== id));
  };

  // --- Calculations ---

  const monthlyStats = useMemo(() => {
    try {
      const now = new Date();
      
      const monthEarnings = earningsEntries.filter(e => {
        if (typeof e.date !== 'string') return false;
        const d = safeParseISO(e.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      });

      const totalEarnings = monthEarnings.reduce((acc, curr) => acc + (curr.totalEarnings || (curr as any).earnings || 0), 0);
      const totalCosts = monthEarnings.reduce((acc, curr) => acc + curr.costs, 0);
      const netEarnings = totalEarnings - totalCosts;

      const monthBills = bills.filter(b => {
        if (typeof b.dueDate !== 'string') return false;
        const d = safeParseISO(b.dueDate);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      });

      const totalBills = monthBills.reduce((acc, curr) => acc + curr.value, 0);
      const paidBills = monthBills.filter(b => b.isPaid).reduce((acc, curr) => acc + curr.value, 0);

      const totalDailyExpenses = dailyExpenses.filter(e => {
        if (typeof e.date !== 'string') return false;
        const d = safeParseISO(e.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }).reduce((acc, curr) => acc + curr.value, 0);

      return {
        totalEarnings,
        totalCosts,
        netEarnings,
        totalBills,
        paidBills,
        pendingBills: totalBills - paidBills,
        totalDailyExpenses
      };
    } catch (e) {
      console.error("Error calculating monthly stats", e);
      return {
        totalEarnings: 0,
        totalCosts: 0,
        netEarnings: 0,
        totalBills: 0,
        paidBills: 0,
        pendingBills: 0,
        totalDailyExpenses: 0
      };
    }
  }, [earningsEntries, bills, dailyExpenses]);

  const savingsGoals = useMemo(() => {
    try {
      return bills
        .filter(b => !b.isPaid)
        .map(bill => {
          const today = new Date();
          const dueDate = safeParseISO(bill.dueDate);
          const daysLeft = differenceInDays(dueDate, today);
          
          const totalSaved = deposits
            .filter(d => d.billId === bill.id)
            .reduce((acc, curr) => acc + curr.amount, 0);
          
          const remaining = Math.max(0, bill.value - totalSaved);
          const dailyNeeded = daysLeft > 0 ? remaining / daysLeft : remaining;

          return {
            ...bill,
            totalSaved,
            remaining,
            dailyNeeded,
            daysLeft: Math.max(0, daysLeft)
          };
        });
    } catch (e) {
      console.error("Error calculating savings goals", e);
      return [];
    }
  }, [bills, deposits]);

  // Auto-deposit daily goal removed as per user request for manual confirmation
  
  // --- Renderers ---

  const renderDashboard = () => {
    const totalUber = earningsEntries.reduce((acc, curr) => acc + curr.uberEarnings, 0);
    const total99 = earningsEntries.reduce((acc, curr) => acc + curr.pop99Earnings, 0);
    const totalOther = earningsEntries.reduce((acc, curr) => acc + (curr.otherEarnings || 0), 0);
    const netEarnings = monthlyStats.netEarnings;

    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Main Financial Pulse */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <Card className="lg:col-span-2 p-8 bg-slate-900 border-none shadow-xl shadow-slate-900/20 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
              <TrendingUp className="w-24 h-24 text-white" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Saldo Líquido Mensal</p>
              </div>
              <h3 className="text-5xl font-black text-white tracking-tight mb-2">
                R$ {formatCurrency(netEarnings)}
              </h3>
              <p className="text-sm text-slate-400">Restante após todos os custos operacionais e gastos</p>
              
              <div className="grid grid-cols-2 gap-4 mt-8 pt-8 border-t border-white/10">
                <div>
                  <p className="text-[9px] font-bold text-slate-500 uppercase mb-1">Ganhos Brutos</p>
                  <p className="text-lg font-bold text-white">R$ {formatCurrency(monthlyStats.totalEarnings)}</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-slate-500 uppercase mb-1">Custos Totais</p>
                  <p className="text-lg font-bold text-red-400">R$ {formatCurrency(monthlyStats.totalEarnings - netEarnings)}</p>
                </div>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-6 lg:col-span-2">
            <Card className="p-6 flex flex-col justify-between hover:border-slate-300 transition-colors cursor-pointer group" onClick={() => setActiveTab('earnings')}>
              <div className="flex justify-between items-start">
                <div className="p-3 bg-slate-100 rounded-2xl group-hover:bg-slate-900 group-hover:text-white transition-colors">
                  <Car className="w-6 h-6" />
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Top App</p>
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter",
                    totalUber >= total99 ? "bg-slate-900 text-white" : "bg-amber-100 text-amber-600"
                  )}>
                    {totalUber >= total99 ? "Uber Driver" : "99 Pop"}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-2xl font-black text-slate-900 mt-4">
                  R$ {formatCurrency(Math.max(totalUber, total99))}
                </p>
                <p className="text-xs text-slate-500">Ganhos no aplicativo principal</p>
              </div>
            </Card>

            <Card className="p-6 flex flex-col justify-between hover:border-slate-300 transition-colors cursor-pointer group" onClick={() => setActiveTab('savings')}>
              <div className="flex justify-between items-start">
                <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl group-hover:bg-amber-500 group-hover:text-white transition-colors">
                  <PiggyBank className="w-6 h-6" />
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Meta Diária</p>
                  <span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter">
                    Em Dia
                  </span>
                </div>
              </div>
              <div>
                <p className="text-2xl font-black text-slate-900 mt-4">
                  R$ {formatCurrency(savingsGoals.reduce((acc, curr) => acc + curr.dailyNeeded, 0))}
                </p>
                <p className="text-xs text-slate-500">Reserva sugerida para hoje</p>
              </div>
            </Card>
          </div>
        </div>

        {/* Relatório de Equilíbrio Mensal (Ganhos vs Gastos) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <Card className="p-6 border-emerald-100 bg-emerald-50/20">
            <h4 className="text-sm font-bold text-emerald-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> Entradas (Receitas)
            </h4>

            {/* Comparativo Visual Uber vs 99 */}
            <div className="flex h-3 w-full bg-emerald-100/50 rounded-full overflow-hidden mb-6">
              <div 
                style={{ width: `${(totalUber / (monthlyStats.totalEarnings || 1)) * 100}%` }}
                className="bg-slate-900 h-full transition-all duration-1000"
              />
              <div 
                style={{ width: `${(total99 / (monthlyStats.totalEarnings || 1)) * 100}%` }}
                className="bg-amber-500 h-full transition-all duration-1000"
              />
              <div 
                style={{ width: `${(totalOther / (monthlyStats.totalEarnings || 1)) * 100}%` }}
                className="bg-blue-500 h-full transition-all duration-1000"
              />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-emerald-100">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-slate-900" />
                  <span className="text-sm text-slate-600 font-medium">Uber Driver</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-100">
                    {((totalUber / (monthlyStats.totalEarnings || 1)) * 100).toFixed(0)}%
                  </span>
                  <span className="font-bold text-slate-900">R$ {formatCurrency(totalUber)}</span>
                </div>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-emerald-100">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-sm text-slate-600 font-medium">99 Pop</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black text-amber-600 bg-white px-1.5 py-0.5 rounded border border-amber-100">
                    {((total99 / (monthlyStats.totalEarnings || 1)) * 100).toFixed(0)}%
                  </span>
                  <span className="font-bold text-slate-900">R$ {formatCurrency(total99)}</span>
                </div>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-emerald-100">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-sm text-slate-600 font-medium">Outros Ganhos</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black text-blue-600 bg-white px-1.5 py-0.5 rounded border border-blue-100">
                    {((totalOther / (monthlyStats.totalEarnings || 1)) * 100).toFixed(0)}%
                  </span>
                  <span className="font-bold text-slate-900">R$ {formatCurrency(totalOther)}</span>
                </div>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-sm font-black text-emerald-700">Total Bruto</span>
                <span className="text-lg font-black text-emerald-700">R$ {formatCurrency(monthlyStats.totalEarnings)}</span>
              </div>
            </div>
          </Card>

          <Card className="p-6 border-red-100 bg-red-50/20">
            <h4 className="text-sm font-bold text-red-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <TrendingDown className="w-4 h-4" /> Saídas (Custos & Gastos)
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-red-100">
                <span className="text-sm text-slate-600 font-medium">Operacional (Combustível/Extras)</span>
                <span className="font-bold text-slate-900">R$ {formatCurrency(monthlyStats.totalCosts)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-red-100">
                <span className="text-sm text-slate-600 font-medium">Contas Fixas</span>
                <span className="font-bold text-slate-900">R$ {formatCurrency(monthlyStats.totalBills)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-red-100">
                <span className="text-sm text-slate-600 font-medium">Gastos Diários (Rua)</span>
                <span className="font-bold text-slate-900">R$ {formatCurrency(monthlyStats.totalDailyExpenses)}</span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-sm font-black text-red-700">Total de Despesas</span>
                <span className="text-lg font-black text-red-700">R$ {formatCurrency(monthlyStats.totalCosts + monthlyStats.totalBills + monthlyStats.totalDailyExpenses)}</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-4">
          <button 
            onClick={() => setActiveTab('earnings')}
            className="flex items-center gap-3 px-6 py-4 bg-white border border-slate-200 rounded-2xl hover:border-slate-900 transition-all shadow-sm hover:shadow-md group"
          >
            <div className="p-2 bg-slate-900 text-white rounded-lg">
              <Plus className="w-4 h-4" />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-slate-900">Novo Ganho</p>
              <p className="text-[10px] text-slate-500">Registrar dia trabalhado</p>
            </div>
          </button>
          
          <button 
            onClick={() => setActiveTab('expenses')}
            className="flex items-center gap-3 px-6 py-4 bg-white border border-slate-200 rounded-2xl hover:border-slate-900 transition-all shadow-sm hover:shadow-md group"
          >
            <div className="p-2 bg-orange-100 text-orange-600 rounded-lg group-hover:bg-orange-500 group-hover:text-white transition-colors">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-slate-900">Novo Gasto</p>
              <p className="text-[10px] text-slate-500">Lanches e extras</p>
            </div>
          </button>

          <button 
            onClick={() => setActiveTab('report')}
            className="flex items-center gap-3 px-6 py-4 bg-white border border-slate-200 rounded-2xl hover:border-slate-900 transition-all shadow-sm hover:shadow-md group"
          >
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-500 group-hover:text-white transition-colors">
              <FileText className="w-4 h-4" />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-slate-900">Ver Relatório</p>
              <p className="text-[10px] text-slate-500">Análise completa do mês</p>
            </div>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Charts Section */}
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-6">
                <h4 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-slate-400" />
                  Status das Contas Fixas
                </h4>
                <div className="flex items-center gap-6">
                  <div className="relative w-24 h-24">
                    <svg className="w-full h-full" viewBox="0 0 36 36">
                      <path
                        className="text-slate-100"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className="text-slate-900"
                        stroke="currentColor"
                        strokeWidth="4"
                        strokeLinecap="round"
                        fill="none"
                        strokeDasharray={`${(monthlyStats.paidBills / (monthlyStats.totalBills || 1)) * 100}, 100`}
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-lg font-black text-slate-900">
                        {Math.round((monthlyStats.paidBills / (monthlyStats.totalBills || 1)) * 100)}%
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-emerald-600 uppercase mb-1">R$ {formatCurrency(monthlyStats.paidBills)} pagas</p>
                    <p className="text-xs font-bold text-red-500 uppercase">R$ {formatCurrency(monthlyStats.totalBills - monthlyStats.paidBills)} pendentes</p>
                    <button 
                      onClick={() => setActiveTab('bills')}
                      className="mt-3 text-[10px] font-black text-slate-900 uppercase flex items-center gap-1 hover:underline"
                    >
                      Ver todas <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <h4 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-slate-400" />
                  Gasto Diário Médio
                </h4>
                <div className="flex flex-col justify-center h-24">
                  <p className="text-3xl font-black text-slate-900">
                    R$ {formatCurrency(dailyExpenses.length > 0 ? dailyExpenses.reduce((acc, curr) => acc + curr.value, 0) / 30 : 0)}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">Estimativa baseada em 30 dias</p>
                </div>
              </Card>
            </div>
          </div>

          {/* Right Sidebar - Upcoming */}
          <div className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h4 className="font-bold text-slate-900 flex items-center gap-2">
                  <Bell className="w-5 h-5 text-slate-400" />
                  Vencimentos e Alertas
                </h4>
                <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded-md text-[9px] font-black uppercase">
                  {bills.filter(b => !b.isPaid).length} Faturas
                </span>
              </div>
              
              <div className="space-y-4">
                {bills
                  .filter(b => !b.isPaid)
                  .sort((a, b) => safeParseISO(a.dueDate).getTime() - safeParseISO(b.dueDate).getTime())
                  .slice(0, 5)
                  .map(bill => {
                    const days = differenceInDays(safeParseISO(bill.dueDate), new Date());
                    return (
                      <div key={bill.id} className={cn(
                        "p-4 rounded-2xl border transition-all",
                        days < 0 ? "bg-red-50 border-red-100" : "bg-slate-50 border-slate-100"
                      )}>
                        <div className="flex justify-between items-start mb-2">
                          <p className="font-bold text-slate-900 text-sm">{bill.name}</p>
                          <p className="text-sm font-black text-slate-900">R$ {formatCurrency(bill.value)}</p>
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <CalendarIcon className="w-3 h-3 text-slate-400" />
                            <span className="text-[10px] font-medium text-slate-500">
                              {safeFormat(bill.dueDate, 'dd/MM/yyyy')}
                            </span>
                          </div>
                          <span className={cn(
                            "text-[10px] font-black uppercase tracking-tighter",
                            days < 0 ? "text-red-500" : "text-amber-600"
                          )}>
                            {days < 0 ? `Vencido há ${Math.abs(days)}d` : days === 0 ? "Vence hoje" : `Em ${days} dias`}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                {bills.filter(b => !b.isPaid).length === 0 && (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3">
                      <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                    </div>
                    <p className="text-xs font-bold text-slate-400 uppercase">Tudo pago!</p>
                  </div>
                )}
              </div>
              <Button 
                variant="secondary" 
                className="w-full mt-6 h-12 rounded-xl text-xs font-bold uppercase tracking-widest"
                onClick={() => setActiveTab('bills')}
              >
                Gerenciar Contas
              </Button>
            </Card>

            <Card className="p-6 bg-slate-50 border-slate-200">
              <h4 className="font-bold text-slate-900 mb-4 text-sm flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-blue-500" />
                Resumo da Frota
              </h4>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500 font-medium">KM Rodados (Total)</span>
                  <span className="text-sm font-bold text-slate-900">{earningsEntries.reduce((acc, curr) => acc + curr.kmDriven, 0)} km</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500 font-medium">Eficiência Média</span>
                  <span className="text-sm font-bold text-slate-900">
                    R$ {(monthlyStats.totalEarnings / (earningsEntries.reduce((acc, curr) => acc + curr.kmDriven, 0) || 1)).toFixed(2)} / km
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  };



  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Side Drawer (Mobile/Desktop) */}
      <div className={cn(
        "fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] transition-opacity duration-300",
        isMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"
      )} onClick={() => setIsMenuOpen(false)} />
      
      <aside className={cn(
        "fixed top-0 left-0 bottom-0 w-72 bg-white z-[101] shadow-2xl transition-transform duration-300 ease-out flex flex-col md:translate-x-0",
        isMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
              <Car className="text-white w-5 h-5" />
            </div>
            <h1 className="text-lg font-black tracking-tighter italic">MINHAS<span className="text-slate-400">FINANÇAS</span></h1>
          </div>
          <button onClick={() => setIsMenuOpen(false)} className="md:hidden p-2 text-slate-400 hover:text-slate-900">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
          {( [
            { id: 'dashboard', icon: LayoutDashboard, label: 'Painel Geral' },
            { id: 'earnings', icon: Car, label: 'Registro de Ganhos' },
            { id: 'expenses', icon: ShoppingBag, label: 'Controle de Gastos' },
            { id: 'bills', icon: Receipt, label: 'Gestão de Contas' },
            { id: 'savings', icon: PiggyBank, label: 'Minhas Caixinhas' },
            { id: 'report', icon: FileText, label: 'Relatórios' },
          ] as const).map(item => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setIsMenuOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
                activeTab === item.id 
                  ? "bg-slate-900 text-white font-bold shadow-lg shadow-slate-900/20" 
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <item.icon className={cn("w-5 h-5", activeTab === item.id ? "text-white" : "text-slate-400")} />
              <span className="font-medium">{item.label}</span>
              {activeTab === item.id && <div className="ml-auto w-1.5 h-1.5 bg-white rounded-full animate-pulse" />}
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600">W</div>
            <div>
              <p className="text-sm font-bold text-slate-900">Wesley</p>
              <p className="text-xs text-slate-500">Motorista Uber</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="md:pl-72 min-h-screen flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 md:px-8 py-4">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsMenuOpen(true)}
                className="p-2 -ml-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
                aria-label="Abrir menu"
              >
                <MoreVertical className="w-6 h-6" />
              </button>
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight leading-none mb-1">
                  {activeTab === 'dashboard' && "Olá, Wesley!"}
                  {activeTab === 'earnings' && "Meus Ganhos"}
                  {activeTab === 'expenses' && "Meus Gastos"}
                  {activeTab === 'bills' && "Minhas Contas"}
                  {activeTab === 'savings' && "Minhas Caixinhas"}
                  {activeTab === 'report' && "Relatório"}
                </h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hidden sm:block">
                  {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className={cn(
                "hidden sm:flex text-[9px] font-black uppercase px-2 py-1 rounded-md tracking-tighter",
                showAllData ? "bg-orange-50 text-orange-600" : "bg-blue-50 text-blue-600"
              )}>
                {showAllData ? "Histórico Global" : "Mês Vigente"}
              </span>
              <button 
                onClick={() => setShowAllData(!showAllData)}
                className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors"
              >
                <CalendarIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 pb-32 pt-6 px-4 md:px-8 max-w-6xl mx-auto w-full">
          <ErrorBoundary>
            {activeTab === 'dashboard' && renderDashboard()}
            {activeTab === 'earnings' && (
              <EarningsView 
                entries={earningsEntries.filter(e => {
                  if (showAllData) return true;
                  if (typeof e.date !== 'string') return false;
                  const d = safeParseISO(e.date);
                  const now = new Date();
                  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                })} 
                onAdd={addEarningsEntry} 
                onDelete={deleteEarningsEntry} 
              />
            )}
            {activeTab === 'expenses' && (
              <ExpensesView 
                expenses={dailyExpenses.filter(e => {
                  if (showAllData) return true;
                  if (typeof e.date !== 'string') return false;
                  const d = safeParseISO(e.date);
                  const now = new Date();
                  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                })} 
                onAdd={addDailyExpense} 
                onDelete={deleteDailyExpense} 
                customCategories={customExpenseCategories}
                onAddCategory={(name) => setCustomExpenseCategories(prev => [...prev, name])}
              />
            )}
            {activeTab === 'bills' && (
              <BillsView 
                bills={bills.filter(b => {
                  if (showAllData) return true;
                  if (typeof b.dueDate !== 'string') return false;
                  const d = safeParseISO(b.dueDate);
                  const now = new Date();
                  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                })} 
                onAdd={addBill} 
                onToggle={toggleBillPaid} 
                onDelete={deleteBill} 
                customCategories={customCategories}
                onAddCategory={(name) => setCustomCategories(prev => [...prev, name])}
              />
            )}
            {activeTab === 'savings' && (
              <SavingsView 
                goals={savingsGoals} 
                deposits={deposits.filter(d => {
                  if (showAllData) return true;
                  if (typeof d.date !== 'string') return false;
                  const date = safeParseISO(d.date);
                  const now = new Date();
                  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
                })} 
                onDeposit={addDeposit} 
                onDeleteDeposit={deleteDeposit}
                onUpdateDeposit={updateDeposit}
              />
            )}

            {activeTab === 'report' && (
              <ReportView 
                earnings={earningsEntries} 
                expenses={dailyExpenses} 
                bills={bills} 
              />
            )}
          </ErrorBoundary>
        </main>
      </div>

      {/* Bottom Navigation (Mobile Dock) */}
      <nav className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-48px)] max-w-sm h-16 bg-slate-900/95 backdrop-blur-lg border border-white/10 rounded-2xl shadow-2xl z-50 px-4 flex items-center justify-between">
        {( [
          { id: 'dashboard', icon: LayoutDashboard },
          { id: 'earnings', icon: Car },
          { id: 'expenses', icon: ShoppingBag },
          { id: 'bills', icon: Receipt },
          { id: 'savings', icon: PiggyBank },
        ] as const).map(item => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={cn(
              "relative p-3 rounded-xl transition-all duration-300",
              activeTab === item.id 
                ? "text-white scale-110 -translate-y-1" 
                : "text-slate-500 hover:text-white"
            )}
          >
            <item.icon className="w-6 h-6" />
            {activeTab === item.id && (
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_8px_white]" />
            )}
          </button>
        ))}
      </nav>
    </div>
  );
}

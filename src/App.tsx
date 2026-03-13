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
  Cell
} from 'recharts';
import { cn } from './lib/utils';
import { EarningsEntry, Bill, SavingsDeposit, DailyExpense } from './types';

// --- Types ---
type Tab = 'dashboard' | 'earnings' | 'expenses' | 'bills' | 'savings' | 'report' | 'reminders';

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
    costs: '' 
  });

  const uberNum = Number(formData.uberEarnings || 0);
  const pop99Num = Number(formData.pop99Earnings || 0);
  const totalEarnings = uberNum + pop99Num;

  const getComparison = () => {
    if (uberNum === 0 && pop99Num === 0) return null;
    if (uberNum > pop99Num) return { text: 'Uber rendeu mais!', color: 'text-slate-900', icon: Car };
    if (pop99Num > uberNum) return { text: '99 rendeu mais!', color: 'text-amber-600', icon: Car };
    return { text: 'Empate técnico!', color: 'text-slate-500', icon: Car };
  };

  const comparison = getComparison();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (totalEarnings <= 0) return;
    onAdd({
      date: formData.date,
      uberEarnings: uberNum,
      pop99Earnings: pop99Num,
      totalEarnings: totalEarnings,
      costs: Number(formData.costs || 0)
    });
    setFormData({ date: format(new Date(), 'yyyy-MM-dd'), uberEarnings: '', pop99Earnings: '', costs: '' });
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
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
              label="Custos (Combustível, etc)" 
              type="number" 
              placeholder="0,00"
              value={formData.costs} 
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, costs: e.target.value })} 
            />
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between p-4 bg-slate-900 rounded-2xl text-white gap-4">
            <div className="text-center md:text-left">
              <p className="text-xs text-white/50 uppercase font-bold tracking-wider">Total Integral do Dia</p>
              <p className="text-3xl font-black">R$ {formatCurrency(totalEarnings, { minimumFractionDigits: 2 })}</p>
            </div>
            <Button type="submit" className="w-full md:w-auto bg-white text-slate-900 hover:bg-slate-100 h-14 px-8 text-lg">
              <Plus className="w-5 h-5" /> Salvar no Sistema
            </Button>
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
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Total</th>
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

const BillsView = ({ bills, onAdd, onToggle, onDelete }: {
  bills: Bill[];
  onAdd: (bill: Omit<Bill, 'id' | 'isPaid'>) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}) => {
  const [formData, setFormData] = useState({ 
    name: '', 
    value: '', 
    dueDate: format(new Date(), 'yyyy-MM-dd'), 
    isRecurring: true,
    category: 'other' as Bill['category']
  });

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
            <label className="text-sm font-medium text-slate-700">Categoria</label>
            <select 
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value as Bill['category'] })}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-slate-50/50"
            >
              <option value="rent">Aluguel</option>
              <option value="car">Carro / Financiamento</option>
              <option value="insurance">Seguro</option>
              <option value="other">Outros (Luz, Água, etc)</option>
            </select>
          </div>
          <Button type="submit" className="w-full">
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
                  <h4 className="font-bold text-slate-900">{bill.name}</h4>
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

const SavingsView = ({ goals, deposits, onDeposit }: {
  goals: any[];
  deposits: SavingsDeposit[];
  onDeposit: (deposit: Omit<SavingsDeposit, 'id'>) => void;
}) => {
  const [selectedBillId, setSelectedBillId] = useState('');
  const [amount, setAmount] = useState('');

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
    onDeposit({
      billId: goal.id,
      amount: Number(goal.dailyNeeded.toFixed(2)),
      date: format(new Date(), 'yyyy-MM-dd')
    });
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
                    <h4 className="text-xl font-bold text-slate-900">{goal.name}</h4>
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

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <div className="flex items-center gap-1">
                        <CalendarIcon className="w-3 h-3" />
                        {goal.daysLeft} dias restantes
                      </div>
                    </div>
                    
                    {!alreadyDepositedToday && goal.remaining > 0 && (
                      <Button 
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 text-xs"
                        onClick={() => confirmDaily(goal)}
                      >
                        Confirmar Depósito de Hoje
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}

          {goals.length === 0 && (
            <Card className="p-12 flex flex-col items-center justify-center text-slate-400 border-dashed border-2">
              <PiggyBank className="w-12 h-12 mb-4 opacity-20" />
              <p className="text-center">Adicione contas nas categorias Aluguel, Carro ou Seguro para criar caixinhas automáticas.</p>
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
              {deposits.slice(0, 5).reverse().map(d => {
                const billId = d.billId;
                // Note: We don't have access to bills here directly unless passed, but we can assume it's okay for now or pass it
                return (
                  <div key={d.id} className="flex justify-between items-center text-sm">
                    <div>
                      <p className="font-medium text-slate-900">Depósito</p>
                      <p className="text-[10px] text-slate-400">{safeFormat(d.date, 'dd/MM/yyyy')}</p>
                    </div>
                    <span className="font-bold text-emerald-600">+ R$ {formatCurrency(d.amount)}</span>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

const ExpensesView = ({ expenses, onAdd, onDelete }: {
  expenses: DailyExpense[];
  onAdd: (expense: Omit<DailyExpense, 'id'>) => void;
  onDelete: (id: string) => void;
}) => {
  const [formData, setFormData] = useState({ 
    description: '', 
    value: '', 
    date: format(new Date(), 'yyyy-MM-dd'),
    category: 'food' as DailyExpense['category']
  });

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
            <label className="text-sm font-medium text-slate-700">Categoria</label>
            <select 
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value as DailyExpense['category'] })}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-slate-50/50"
            >
              <option value="food">Comida</option>
              <option value="delivery">Delivery</option>
              <option value="transport">Transporte</option>
              <option value="other">Outros</option>
            </select>
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
                      {expense.category === 'food' ? 'Comida' : expense.category === 'delivery' ? 'Delivery' : expense.category === 'transport' ? 'Transporte' : 'Outros'}
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
  const totalEarnings = earnings.reduce((acc, curr) => acc + curr.totalEarnings, 0);
  const totalCosts = earnings.reduce((acc, curr) => acc + curr.costs, 0);
  const totalExpenses = expenses.reduce((acc, curr) => acc + curr.value, 0);
  const totalBills = bills.reduce((acc, curr) => acc + curr.value, 0);
  const paidBills = bills.filter(b => b.isPaid).reduce((acc, curr) => acc + curr.value, 0);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-bold text-slate-900">Relatório Detalhado</h3>
        <Button variant="secondary" onClick={() => window.print()} className="hidden md:flex gap-2 px-3 py-1 text-xs">
          <FileText className="w-4 h-4" /> Imprimir Relatório
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 border-l-4 border-l-emerald-500">
          <p className="text-xs font-bold text-slate-400 uppercase">Ganhos Brutos</p>
          <p className="text-xl font-bold text-slate-900">R$ {formatCurrency(totalEarnings)}</p>
        </Card>
        <Card className="p-4 border-l-4 border-l-amber-500">
          <p className="text-xs font-bold text-slate-400 uppercase">Custos Operacionais</p>
          <p className="text-xl font-bold text-slate-900">R$ {formatCurrency(totalCosts)}</p>
        </Card>
        <Card className="p-4 border-l-4 border-l-red-500">
          <p className="text-xs font-bold text-slate-400 uppercase">Gastos Diários</p>
          <p className="text-xl font-bold text-slate-900">R$ {formatCurrency(totalExpenses)}</p>
        </Card>
        <Card className="p-4 border-l-4 border-l-slate-900">
          <p className="text-xs font-bold text-slate-400 uppercase">Total de Contas</p>
          <p className="text-xl font-bold text-slate-900">R$ {formatCurrency(totalBills)}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h4 className="font-bold mb-4 flex items-center gap-2">
            <Car className="w-5 h-5 text-slate-400" /> Detalhes de Aplicativos
          </h4>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
              <span className="text-sm font-medium">Uber</span>
              <span className="font-bold">R$ {formatCurrency(earnings.reduce((acc, curr) => acc + curr.uberEarnings, 0))}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
              <span className="text-sm font-medium">99 Pop</span>
              <span className="font-bold">R$ {formatCurrency(earnings.reduce((acc, curr) => acc + curr.pop99Earnings, 0))}</span>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h4 className="font-bold mb-4 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-slate-400" /> Resumo de Contas
          </h4>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
              <span className="text-sm font-medium text-emerald-600">Pagas</span>
              <span className="font-bold text-emerald-600">R$ {formatCurrency(paidBills)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
              <span className="text-sm font-medium text-amber-600">Pendentes</span>
              <span className="font-bold text-amber-600">R$ {formatCurrency(totalBills - paidBills)}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

const RemindersView = ({ bills, onAdd, onDelete }: {
  bills: Bill[];
  onAdd: (bill: Omit<Bill, 'id' | 'isPaid'>) => void;
  onDelete: (id: string) => void;
}) => {
  const [formData, setFormData] = useState({ 
    name: '', 
    value: '', 
    dueDate: format(new Date(), 'yyyy-MM-dd'),
    category: 'maintenance' as Bill['category']
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.value) return;
    onAdd({
      name: formData.name,
      value: Number(formData.value),
      dueDate: formData.dueDate,
      category: formData.category,
      isRecurring: true
    });
    setFormData({ 
      name: '', 
      value: '', 
      dueDate: format(new Date(), 'yyyy-MM-dd'),
      category: 'maintenance'
    });
  };

  const reminders = bills.filter(b => ['maintenance', 'fuel', 'insurance'].includes(b.category));

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="p-6">
        <h3 className="text-lg font-bold mb-4">Novo Lembrete de Manutenção / Veículo</h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <Input 
            label="O que lembrar?" 
            placeholder="Ex: Troca de Óleo, Seguro..."
            value={formData.name} 
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })} 
          />
          <Input 
            label="Valor Estimado (R$)" 
            type="number" 
            placeholder="0,00"
            value={formData.value} 
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, value: e.target.value })} 
          />
          <Input 
            label="Data Prevista" 
            type="date" 
            value={formData.dueDate} 
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, dueDate: e.target.value })} 
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">Categoria</label>
            <select 
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value as Bill['category'] })}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-slate-50/50"
            >
              <option value="maintenance">Manutenção</option>
              <option value="fuel">Combustível</option>
              <option value="insurance">Seguro</option>
            </select>
          </div>
          <Button type="submit" className="w-full lg:col-span-4">
            <Plus className="w-4 h-4" /> Adicionar Lembrete
          </Button>
        </form>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reminders.map(rem => (
          <Card key={rem.id} className="p-5 border-l-4 border-l-amber-500">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h4 className="font-bold text-slate-900">{rem.name}</h4>
                <p className="text-xs text-slate-500">Previsto para {safeFormat(rem.dueDate, 'dd/MM/yyyy')}</p>
              </div>
              <button 
                onClick={() => onDelete(rem.id)}
                className="text-slate-400 hover:text-red-500 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center justify-between mt-4">
              <span className="text-lg font-bold text-slate-900">R$ {formatCurrency(rem.value)}</span>
              <span className="text-[10px] font-bold uppercase px-2 py-1 bg-amber-50 text-amber-600 rounded">
                {rem.category === 'maintenance' ? 'Manutenção' : rem.category === 'fuel' ? 'Combustível' : 'Seguro'}
              </span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [showAllData, setShowAllData] = useState(false);
  
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
        totalEarnings: entry.totalEarnings ?? entry.earnings ?? 0,
        costs: entry.costs ?? 0
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

  useEffect(() => {
    localStorage.setItem('uber_entries', JSON.stringify(earningsEntries));
  }, [earningsEntries]);

  useEffect(() => {
    localStorage.setItem('bills', JSON.stringify(bills));
  }, [bills]);

  useEffect(() => {
    localStorage.setItem('deposits', JSON.stringify(deposits));
  }, [deposits]);

  useEffect(() => {
    localStorage.setItem('daily_expenses', JSON.stringify(dailyExpenses));
  }, [dailyExpenses]);

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
      
      // Recurrence logic: if marking as paid AND (is recurring OR is a caixinha category)
      if (isMarkingAsPaid && (bill.isRecurring || CAIXINHA_CATEGORIES.includes(bill.category))) {
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
        .filter(b => !b.isPaid && CAIXINHA_CATEGORIES.includes(b.category))
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

  const renderDashboard = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card 
          className="p-6 bg-slate-900 text-white border-none cursor-pointer hover:bg-slate-800 transition-colors"
          onClick={() => setActiveTab('earnings')}
        >
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-white/10 rounded-lg">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="text-xs font-medium text-white/50 uppercase tracking-wider">Ganhos Uber (Mês)</span>
          </div>
          <h3 className="text-3xl font-bold">R$ {formatCurrency(monthlyStats.totalEarnings)}</h3>
          <p className="text-sm text-white/60 mt-2">Líquido: R$ {formatCurrency(monthlyStats.netEarnings)}</p>
        </Card>

        <Card 
          className="p-6 cursor-pointer hover:bg-slate-50 transition-colors"
          onClick={() => setActiveTab('expenses')}
        >
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-red-50 rounded-lg">
              <TrendingDown className="w-5 h-5 text-red-500" />
            </div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Gastos Diários (Mês)</span>
          </div>
          <h3 className="text-3xl font-bold text-slate-900">R$ {formatCurrency(monthlyStats.totalDailyExpenses)}</h3>
          <p className="text-sm text-slate-500 mt-2">Lanches, Delivery, etc</p>
        </Card>

        <Card 
          className="p-6 cursor-pointer hover:bg-slate-50 transition-colors"
          onClick={() => setActiveTab('bills')}
        >
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-slate-100 rounded-lg">
              <Receipt className="w-5 h-5 text-slate-500" />
            </div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Contas Totais</span>
          </div>
          <h3 className="text-3xl font-bold text-slate-900">R$ {formatCurrency(monthlyStats.totalBills)}</h3>
          <div className="w-full bg-slate-100 h-2 rounded-full mt-4 overflow-hidden">
            <div 
              className="bg-slate-900 h-full transition-all duration-1000" 
              style={{ width: `${(monthlyStats.paidBills / (monthlyStats.totalBills || 1)) * 100}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 mt-2">Pagas: R$ {formatCurrency(monthlyStats.paidBills)}</p>
        </Card>

        <Card 
          className="p-6 cursor-pointer hover:bg-slate-50 transition-colors"
          onClick={() => setActiveTab('savings')}
        >
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-amber-50 rounded-lg">
              <PiggyBank className="w-5 h-5 text-amber-500" />
            </div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Reserva Diária</span>
          </div>
          <h3 className="text-3xl font-bold text-slate-900">
            R$ {formatCurrency(savingsGoals.reduce((acc, curr) => acc + curr.dailyNeeded, 0), { minimumFractionDigits: 2 })}
          </h3>
          <p className="text-sm text-slate-500 mt-2">Valor total a guardar hoje</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h4 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-slate-400" />
            Desempenho (Últimos 7 dias)
          </h4>
          <div className="h-[300px] w-full">
            {earningsEntries.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={earningsEntries
                  .filter(e => {
                    if (typeof e.date !== 'string') return false;
                    const d = safeParseISO(e.date);
                    const now = new Date();
                    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                  })
                  .slice(0, 7)
                  .reverse()
                }>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(val) => safeFormat(val, 'dd/MM')}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 12 }}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 12 }}
                  />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="totalEarnings" fill="#0f172a" radius={[4, 4, 0, 0]} name="Ganhos" />
                  <Bar dataKey="costs" fill="#94a3b8" radius={[4, 4, 0, 0]} name="Custos" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-2">
                <Car className="w-8 h-8 opacity-20" />
                <p className="text-sm">Nenhum dado para exibir no gráfico</p>
              </div>
            )}
          </div>
        </Card>

        <Card 
          className="p-6 cursor-pointer hover:bg-slate-50 transition-colors"
          onClick={() => setActiveTab('bills')}
        >
          <h4 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Bell className="w-5 h-5 text-slate-400" />
            Próximos Vencimentos
          </h4>
          <div className="space-y-4">
            {bills
              .filter(b => {
                if (typeof b.dueDate !== 'string') return false;
                const d = safeParseISO(b.dueDate);
                const now = new Date();
                return !b.isPaid && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
              })
              .sort((a, b) => safeParseISO(a.dueDate).getTime() - safeParseISO(b.dueDate).getTime())
              .slice(0, 4)
              .map(bill => {
                const days = differenceInDays(safeParseISO(bill.dueDate), new Date());
                return (
                  <div key={bill.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        days < 0 ? "bg-red-500 animate-pulse" : days <= 3 ? "bg-amber-500" : "bg-slate-300"
                      )} />
                      <div>
                        <p className="font-medium text-slate-900">{bill.name}</p>
                        <p className="text-xs text-slate-500">{safeFormat(bill.dueDate, "dd 'de' MMMM")}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-900">R$ {formatCurrency(bill.value)}</p>
                      <p className={cn(
                        "text-[10px] font-bold uppercase tracking-tighter",
                        days < 0 ? "text-red-500" : "text-slate-400"
                      )}>
                        {days < 0 ? `Atrasado ${Math.abs(days)}d` : days === 0 ? "Vence hoje" : `Em ${days} dias`}
                      </p>
                    </div>
                  </div>
                );
              })}
            {bills.filter(b => !b.isPaid).length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <CheckCircle2 className="w-12 h-12 mb-2 opacity-20" />
                <p>Tudo em dia!</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );


  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Sidebar / Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-slate-200 md:top-0 md:bottom-auto md:flex-col md:w-64 md:h-screen md:border-r md:border-t-0 z-50">
        <div className="hidden md:flex items-center gap-3 mb-12 px-6 py-8">
          <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center">
            <Car className="text-white w-6 h-6" />
          </div>
          <h1 className="text-xl font-black tracking-tighter italic">UBER<span className="text-slate-400">FINANÇAS</span></h1>
        </div>

        <div className="flex overflow-x-auto no-scrollbar px-4 py-2 md:px-2 md:py-0 md:flex-col md:gap-2">
          {( [
            { id: 'dashboard', icon: LayoutDashboard, label: 'Início' },
            { id: 'earnings', icon: Car, label: 'Ganhos' },
            { id: 'expenses', icon: ShoppingBag, label: 'Gastos' },
            { id: 'bills', icon: Receipt, label: 'Contas' },
            { id: 'savings', icon: PiggyBank, label: 'Caixinha' },
            { id: 'reminders', icon: Bell, label: 'Lembretes' },
            { id: 'report', icon: FileText, label: 'Relatório' },
          ] as const).map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "flex flex-col md:flex-row items-center gap-1 md:gap-3 px-4 py-2 rounded-xl transition-all flex-shrink-0",
                activeTab === item.id 
                  ? "text-slate-900 md:bg-slate-100 font-bold" 
                  : "text-slate-400 hover:text-slate-600 md:hover:bg-slate-50"
              )}
            >
              <item.icon className={cn("w-5 h-5", activeTab === item.id ? "text-slate-900" : "text-slate-400")} />
              <span className="text-[10px] md:text-sm font-medium whitespace-nowrap">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <main className="pb-28 pt-4 px-4 md:pl-72 md:pr-8 md:pt-8 max-w-7xl mx-auto">
        <ErrorBoundary>
          <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <div>
              <p className="text-sm font-medium text-slate-500 uppercase tracking-widest mb-1">
                {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
              </p>
              <div className="flex items-center gap-3">
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                  {activeTab === 'dashboard' && "Olá, Wesley!"}
                  {activeTab === 'earnings' && "Ganhos do Dia"}
                  {activeTab === 'expenses' && "Gastos do Dia"}
                  {activeTab === 'bills' && "Suas Contas"}
                  {activeTab === 'savings' && "Minhas Caixinhas"}
                </h2>
                <span className="px-2 py-1 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-lg uppercase tracking-wider">
                  {showAllData ? "Histórico Completo" : "Mês Atual"}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setShowAllData(!showAllData)}
                className="text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors flex items-center gap-1 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm"
              >
                {showAllData ? "Filtrar por Mês" : "Ver Tudo"}
              </button>
              <div className="hidden md:flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
                  <span className="font-bold text-slate-600">W</span>
                </div>
              </div>
            </div>
          </header>

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
            />
          )}
          {activeTab === 'reminders' && (
            <RemindersView 
              bills={bills} 
              onAdd={addBill} 
              onDelete={deleteBill} 
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
  );
}

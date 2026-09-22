import React from "react";
import { Home, Users, Camera, DollarSign, FileText, Moon, Sun, LogOut, ListChecks, ShieldCheck, CalendarDays, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

const items = [
  { id: "dashboard", label: "Dashboard", icon: Home },
  { id: "clients", label: "Clientes", icon: Users },
  { id: "appointments", label: "Agendamentos", icon: CalendarDays },
  { id: "inspections", label: "Vistorias", icon: ListChecks },
  { id: "equipments", label: "Equipamentos", icon: Camera },
  { id: "labor", label: "Mão de obra", icon: DollarSign },
  { id: "reports", label: "Relatórios", icon: FileText },
];

export function Sidebar({ active, onChange, darkMode, onToggleDark, onLogout, userName, isAdmin }) {
  // A barra lateral e usada em telas largas; a navegacao mobile fica sob responsabilidade do App.
  return (
    <aside className="hidden w-full max-w-[320px] shrink-0 space-y-6 rounded-[2rem] border border-slate-200 bg-white/95 p-5 shadow-xl shadow-slate-200/40 dark:border-slate-700 dark:bg-slate-950/95 dark:shadow-black/10 xl:block">
      <div className="space-y-4">
        <div className="rounded-3xl bg-slate-900 p-5 text-white shadow-lg dark:bg-slate-800">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-blue-500 p-2">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-slate-200">Bem-vindo</p>
              <p className="font-semibold">{userName || "Técnico"}</p>
            </div>
          </div>
        </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">Navegue pelas áreas e mantenha o controle dos clientes, equipamentos, mão de obra e vistorias.</p>
      </div>

      <nav className="space-y-2">
        {[...items, ...(isAdmin ? [{ id: "settings", label: "Configurações", icon: Settings }] : [])].map((item) => {
          const Icon = item.icon;
          const activeClass = item.id === active ? "bg-blue-600 text-white" : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800";
          return (
            <button key={item.id} onClick={() => onChange(item.id)} className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition ${activeClass}`}>
              <Icon className="h-5 w-5" />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
        <p className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Ações rápidas</p>
        <div className="grid gap-2">
          <Button variant="outline" onClick={onToggleDark} className="justify-start text-slate-700 dark:text-slate-200">
            {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {darkMode ? "Modo claro" : "Modo escuro"}
          </Button>
          <Button variant="ghost" onClick={onLogout} className="justify-start text-red-600">
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </div>
      </div>
    </aside>
  );
}

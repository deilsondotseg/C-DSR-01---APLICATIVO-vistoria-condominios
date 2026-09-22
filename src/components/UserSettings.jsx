import React, { useEffect, useState } from "react";
import { Pencil, PlusCircle, ShieldCheck, Trash2, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const modules = [
  { id: "dashboard", label: "Dashboard" },
  { id: "clients", label: "Clientes" },
  { id: "equipments", label: "Equipamentos" },
  { id: "labor", label: "Mão de obra" },
  { id: "inspections", label: "Vistorias" },
  { id: "appointments", label: "Agendamentos" },
  { id: "reports", label: "Relatórios" },
  { id: "settings", label: "Configurações" },
];

const roleLabels = {
  admin: "Administrador",
  consultor: "Consultor",
  tecnico: "Técnico",
};

const emptyForm = {
  id: "",
  fullName: "",
  email: "",
  username: "",
  password: "",
  role: "consultor",
  active: true,
  permissions: Object.fromEntries(modules.map((module) => [module.id, "none"])),
};

export function UserSettings({ users, currentUser, onSave, onDelete }) {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");

  useEffect(() => {
    setForm(emptyForm);
    setError("");
  }, [users]);

  function startCreate() {
    setForm(emptyForm);
    setError("");
  }

  function startEdit(user) {
    setForm({
      ...emptyForm,
      ...user,
      permissions: { ...emptyForm.permissions, ...(user.permissions || {}) },
      password: "",
    });
    setError("");
  }

  function updateRole(role) {
    setForm((previous) => ({ ...previous, role }));
  }

  function updatePermission(module, value) {
    setForm((previous) => ({
      ...previous,
      permissions: { ...previous.permissions, [module]: value },
    }));
  }

  async function submit(event) {
    event.preventDefault();
    if (!form.fullName.trim() || !form.email.trim() || !form.username.trim() || (!form.id && !form.password.trim())) {
      setError("Preencha nome, e-mail, usuário e senha para novos usuários.");
      return;
    }
    if (form.password && form.password.length < 8) {
      setError("A senha deve ter pelo menos 8 caracteres.");
      return;
    }
    try {
      await onSave(form);
      setForm(emptyForm);
      setError("");
    } catch (saveError) {
      setError(saveError.message || "Não foi possível salvar o usuário.");
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-blue-600 dark:text-blue-300">Administração</p>
          <h2 className="mt-2 text-2xl font-bold">Configurações de usuários</h2>
          <p className="mt-1 text-slate-500 dark:text-slate-400">Cadastre perfis e defina o acesso de cada pessoa ao sistema.</p>
        </div>
        <Button onClick={startCreate}><PlusCircle className="h-4 w-4" /> Novo usuário</Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <Card className="rounded-[2rem] border-0 p-5 shadow-xl shadow-slate-200/30 dark:bg-slate-900/95">
          <CardContent className="p-0">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-2xl bg-blue-100 p-3 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"><UserCog className="h-5 w-5" /></div>
              <div><h3 className="font-semibold">{form.id ? "Editar usuário" : "Novo usuário"}</h3><p className="text-sm text-slate-500 dark:text-slate-400">Perfil e permissões</p></div>
            </div>
            <form onSubmit={submit} className="space-y-4">
              <label className="block text-sm font-semibold">Nome completo<input value={form.fullName} onChange={(event) => setForm((previous) => ({ ...previous, fullName: event.target.value }))} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-normal outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-950" /></label>
              <label className="block text-sm font-semibold">E-mail<input type="email" value={form.email} onChange={(event) => setForm((previous) => ({ ...previous, email: event.target.value }))} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-normal outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-950" /></label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-semibold">Usuário<input value={form.username} onChange={(event) => setForm((previous) => ({ ...previous, username: event.target.value }))} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-normal outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-950" /></label>
                <label className="block text-sm font-semibold">Perfil<select value={form.role} onChange={(event) => updateRole(event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-normal outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-950"><option value="admin">Administrador</option><option value="consultor">Consultor</option><option value="tecnico">Técnico</option></select></label>
              </div>
              <label className="block text-sm font-semibold">{form.id ? "Nova senha (opcional)" : "Senha"}<input type="password" value={form.password} onChange={(event) => setForm((previous) => ({ ...previous, password: event.target.value }))} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-normal outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-950" /></label>
              <label className="flex items-center gap-3 text-sm font-semibold"><input type="checkbox" checked={form.active} onChange={(event) => setForm((previous) => ({ ...previous, active: event.target.checked }))} className="h-4 w-4" /> Usuário ativo</label>
              <div className="border-t border-slate-200 pt-4 dark:border-slate-800"><p className="mb-3 text-sm font-semibold">Permissões por módulo</p><div className="space-y-2">{modules.map((module) => <label key={module.id} className="flex items-center justify-between gap-3 text-sm"><span>{module.label}</span><select value={form.permissions[module.id]} onChange={(event) => updatePermission(module.id, event.target.value)} className="rounded-xl border border-slate-200 bg-white px-2 py-2 dark:border-slate-700 dark:bg-slate-950"><option value="none">Sem acesso</option><option value="view">Visualizar</option><option value="edit">Editar</option></select></label>)}</div></div>
              {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
              <Button type="submit" className="w-full">Salvar usuário</Button>
            </form>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-0 p-5 shadow-xl shadow-slate-200/30 dark:bg-slate-900/95">
          <CardContent className="p-0">
            <div className="mb-5 flex items-center gap-3"><ShieldCheck className="h-5 w-5 text-emerald-600" /><h3 className="font-semibold">Usuários cadastrados</h3></div>
            <div className="space-y-3">{users.length ? users.map((user) => <div key={user.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">{user.fullName}</p><p className="text-sm text-slate-500 dark:text-slate-400">@{user.username} · {roleLabels[user.role] || user.role} · {user.active ? "Ativo" : "Inativo"}</p></div><div className="flex gap-2"><Button variant="outline" onClick={() => startEdit(user)}><Pencil className="h-4 w-4" /> Editar</Button><Button variant="ghost" disabled={user.id === currentUser?.id} onClick={() => onDelete(user)}><Trash2 className="h-4 w-4" /> Excluir</Button></div></div>) : <p className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-500 dark:bg-slate-950 dark:text-slate-400">Nenhum usuário encontrado.</p>}</div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

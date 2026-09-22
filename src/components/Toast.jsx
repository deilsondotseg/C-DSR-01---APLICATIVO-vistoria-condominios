import React from "react";
import { CheckCircle2, AlertCircle, X } from "lucide-react";

export function Toast({ toast, onClose }) {
  // Toast e controlado pelo componente pai e desaparece quando o estado recebe null.
  if (!toast) return null;
  const isError = toast.type === "error";
  return (
    <div className="fixed inset-x-0 bottom-5 z-[9999] mx-auto flex max-w-[calc(100vw-2rem)] justify-end px-4 sm:bottom-6">
      <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white px-4 py-4 shadow-2xl shadow-slate-900/10 dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 rounded-full p-2 ${isError ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
            {isError ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-slate-900 dark:text-white">{toast.title || (isError ? "Erro" : "Sucesso")}</p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{toast.message}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 transition hover:text-slate-700 dark:hover:text-slate-200">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

import React from "react";

export const Modal = ({ open, title, children, onClose, actions }) => {
  // Retornar null mantem o modal fora da arvore quando ele nao esta em uso.
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)] overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl shadow-slate-900/20 dark:border-slate-700 dark:bg-slate-950">
        <div className="max-h-[calc(100vh-6rem)] overflow-y-auto">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-700">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{title}</h2>
          <button onClick={onClose} className="rounded-full border border-slate-200 bg-slate-100 p-2 text-slate-600 transition hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            ✕
          </button>
        </div>
          <div className="p-6">{children}</div>
          {actions && <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 px-6 py-4 dark:border-slate-700">{actions}</div>}
        </div>
      </div>
    </div>
  );
};

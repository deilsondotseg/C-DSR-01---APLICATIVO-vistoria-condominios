import React from "react";
import { cn } from "@/lib/utils";

const variants = {
  default: "bg-slate-900 text-white hover:bg-slate-800",
  ghost: "bg-transparent text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800",
  outline: "border border-slate-200 bg-white text-slate-900 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900",
  secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
};

export const Button = React.forwardRef(({ className, variant = "default", type = "button", ...props }, ref) => {
  return (
    <button
      ref={ref}
      type={type}
      className={cn("inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed", variants[variant] || variants.default, className)}
      {...props}
    />
  );
});
Button.displayName = "Button";

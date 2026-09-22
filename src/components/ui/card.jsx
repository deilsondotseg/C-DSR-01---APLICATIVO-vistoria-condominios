import React from "react";
import { cn } from "@/lib/utils";

export const Card = React.forwardRef(({ className, ...props }, ref) => {
  return <div ref={ref} className={cn("rounded-2xl border border-slate-200 bg-white text-slate-950 shadow-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100", className)} {...props} />;
});
Card.displayName = "Card";

export const CardContent = React.forwardRef(({ className, ...props }, ref) => {
  return <div ref={ref} className={cn("p-6", className)} {...props} />;
});
CardContent.displayName = "CardContent";

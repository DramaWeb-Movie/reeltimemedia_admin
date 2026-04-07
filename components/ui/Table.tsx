import type { ReactNode } from "react";

interface TableProps {
  children: ReactNode;
  className?: string;
  /** Applied to the inner `<table>` (e.g. min-width for wide column sets). */
  tableClassName?: string;
}

export function Table({ children, className = "", tableClassName = "" }: TableProps) {
  return (
    <div className={`overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 ${className}`}>
      <table className={`w-full border-collapse ${tableClassName}`}>{children}</table>
    </div>
  );
}

export function TableHeader({ children }: { children: ReactNode }) {
  return (
    <thead>
      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
        {children}
      </tr>
    </thead>
  );
}

export function TableBody({ children }: { children: ReactNode }) {
  return <tbody>{children}</tbody>;
}

export function TableRow({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <tr
      className={`border-b border-slate-200 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors ${className}`}
    >
      {children}
    </tr>
  );
}

export function TableHead({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <th
      className={`px-6 py-4 text-left text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider ${className}`}
    >
      {children}
    </th>
  );
}

export function TableCell({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <td className={`px-6 py-4 text-sm text-slate-700 dark:text-slate-300 ${className}`}>{children}</td>;
}

export function TableEmpty({
  colSpan,
  message = "No data found",
}: {
  colSpan: number;
  message?: string;
}) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        className="px-6 py-16 text-center text-slate-600 dark:text-slate-500"
      >
        {message}
      </td>
    </tr>
  );
}

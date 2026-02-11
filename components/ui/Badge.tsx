type BadgeVariant =
  | "default"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "neutral";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default:
    "bg-slate-700/80 text-slate-300 border-slate-600",
  success:
    "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  warning:
    "bg-amber-500/20 text-amber-400 border-amber-500/30",
  danger:
    "bg-red-500/20 text-red-400 border-red-500/30",
  info:
    "bg-blue-500/20 text-blue-400 border-blue-500/30",
  neutral:
    "bg-slate-600/50 text-slate-400 border-slate-600",
};

export function Badge({
  children,
  variant = "default",
  className = "",
}: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium
        border
        ${variantStyles[variant]}
        ${className}
      `}
    >
      {children}
    </span>
  );
}

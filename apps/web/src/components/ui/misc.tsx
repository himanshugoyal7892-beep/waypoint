import { cva, type VariantProps } from "class-variance-authority";
import { AlertTriangle, CircleAlert, Info } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", {
  variants: {
    variant: {
      default: "bg-muted text-foreground",
      success: "bg-emerald-100 text-emerald-800",
      warning: "bg-amber-100 text-amber-900",
      muted: "bg-zinc-100 text-zinc-600",
    },
  },
  defaultVariants: { variant: "default" },
});

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

const alertStyles = {
  error: { cls: "border-destructive/40 bg-red-50 text-red-900", Icon: CircleAlert },
  warning: { cls: "border-amber-300 bg-amber-50 text-amber-950", Icon: AlertTriangle },
  info: { cls: "border-border bg-muted/60 text-foreground", Icon: Info },
} as const;

export function Alert({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: keyof typeof alertStyles;
  title?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const { cls, Icon } = alertStyles[tone];
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("flex gap-3 rounded-md border p-3 text-sm", cls, className)}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="space-y-1">
        {title && <p className="font-medium">{title}</p>}
        {children && <div>{children}</div>}
      </div>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-md bg-muted", className)} />;
}

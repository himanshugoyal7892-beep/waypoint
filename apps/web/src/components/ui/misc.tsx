import { cva, type VariantProps } from "class-variance-authority";
import { AlertTriangle, CircleAlert, Info } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
  {
    variants: {
      variant: {
        default: "bg-muted text-foreground ring-border",
        success: "bg-success-soft text-success ring-success/20",
        warning: "bg-warning-soft text-warning ring-warning/20",
        muted: "bg-muted text-muted-foreground ring-border",
        info: "bg-primary-soft text-primary ring-primary/20",
        destructive: "bg-destructive-soft text-destructive-foreground ring-destructive/20",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

const alertStyles = {
  error: {
    cls: "border-destructive/40 bg-destructive-soft text-destructive-foreground",
    Icon: CircleAlert,
  },
  warning: {
    cls: "border-warning-border bg-warning-soft text-foreground [&>svg]:text-warning",
    Icon: AlertTriangle,
  },
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

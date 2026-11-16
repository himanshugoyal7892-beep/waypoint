"use client";

import { Check, ChevronDown } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

interface Option {
  value: string;
  label: React.ReactNode;
  text: string;
  disabled: boolean;
}

function textOf(node: React.ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (React.isValidElement<{ children?: React.ReactNode }>(node))
    return textOf(node.props.children);
  return "";
}

function readOptions(children: React.ReactNode): Option[] {
  const out: Option[] = [];
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement<React.OptionHTMLAttributes<HTMLOptionElement>>(child)) return;
    if (child.type === React.Fragment) {
      out.push(...readOptions((child.props as { children?: React.ReactNode }).children));
      return;
    }
    if (child.type !== "option") return;
    const { value, children: label, disabled } = child.props;
    out.push({
      value: String(value ?? textOf(label)),
      label,
      text: textOf(label),
      disabled: Boolean(disabled),
    });
  });
  return out;
}

export type SelectProps = Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "onChange"> & {
  value: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
};

/**
 * Styled single-choice dropdown that keeps the native <select> API (value, onChange with
 * e.target.value, <option> children) so forms can swap it in directly. Follows the ARIA
 * "select-only combobox" pattern: arrows, Home/End, Enter/Space, Escape and type-ahead.
 */
export function Select({
  id,
  value,
  onChange,
  children,
  className,
  disabled,
  name,
  ...aria
}: SelectProps) {
  const options = React.useMemo(() => readOptions(children), [children]);
  const [open, setOpen] = React.useState(false);
  const [active, setActive] = React.useState(0);
  const [above, setAbove] = React.useState(false);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const listRef = React.useRef<HTMLUListElement>(null);
  const typed = React.useRef({ text: "", at: 0 });
  const autoId = React.useId();
  const listId = `${id ?? autoId}-list`;
  const selectedIndex = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  const selected = options.find((o) => o.value === value);

  const commit = (i: number) => {
    const o = options[i];
    if (!o || o.disabled) return;
    if (o.value !== value) {
      const target = { value: o.value, name } as unknown as HTMLSelectElement;
      onChange?.({ target, currentTarget: target } as React.ChangeEvent<HTMLSelectElement>);
    }
    setOpen(false);
    buttonRef.current?.focus();
  };

  const openList = (at = selectedIndex) => {
    if (disabled) return;
    const r = buttonRef.current?.getBoundingClientRect();
    const needed = Math.min(options.length * 36 + 12, 300);
    setAbove(r ? window.innerHeight - r.bottom < needed && r.top > needed : false);
    setActive(at);
    setOpen(true);
  };

  const step = (from: number, dir: 1 | -1) => {
    for (let i = from + dir; i >= 0 && i < options.length; i += dir)
      if (!options[i]!.disabled) return i;
    return from;
  };

  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!buttonRef.current?.contains(t) && !listRef.current?.contains(t)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  React.useEffect(() => {
    if (open) listRef.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  function onKeyDown(e: React.KeyboardEvent) {
    const k = e.key;
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(k)) {
        e.preventDefault();
        openList();
      }
      return;
    }
    if (k === "ArrowDown") setActive((a) => step(a, 1));
    else if (k === "ArrowUp") setActive((a) => step(a, -1));
    else if (k === "Home") setActive(step(-1, 1));
    else if (k === "End") setActive(step(options.length, -1));
    else if (k === "Enter" || k === " ") commit(active);
    else if (k === "Escape") setOpen(false);
    else if (k === "Tab") {
      setOpen(false);
      return;
    } else if (k.length === 1) {
      const now = Date.now();
      typed.current.text = (now - typed.current.at > 700 ? "" : typed.current.text) + k;
      typed.current.at = now;
      const q = typed.current.text.toLowerCase();
      const hit = options.findIndex((o) => !o.disabled && o.text.toLowerCase().startsWith(q));
      if (hit >= 0) setActive(hit);
    } else return;
    e.preventDefault();
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open ? `${listId}-${active}` : undefined}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
        {...(aria as React.ButtonHTMLAttributes<HTMLButtonElement>)}
        className={cn(
          "flex h-9 w-full items-center gap-2 rounded-lg border border-border bg-background px-3 text-left text-sm shadow-xs transition-colors hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-destructive",
          open && "border-border-strong ring-2 ring-ring/40",
          className,
        )}
      >
        <span className="min-w-0 flex-1 truncate">{selected?.label ?? "Choose…"}</span>
        <ChevronDown
          aria-hidden
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {name && <input type="hidden" name={name} value={value} />}
      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-labelledby={id}
          tabIndex={-1}
          className={cn(
            "absolute z-50 max-h-[300px] min-w-full overflow-auto rounded-lg border border-border bg-card p-1 shadow-raised",
            "motion-safe:animate-[wp-pop_.12s_ease-out]",
            above ? "bottom-full mb-1" : "top-full mt-1",
          )}
        >
          {options.map((o, i) => (
            <li
              key={o.value}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={o.value === value}
              aria-disabled={o.disabled || undefined}
              onPointerMove={() => !o.disabled && setActive(i)}
              onClick={() => commit(i)}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-sm whitespace-nowrap",
                i === active && "bg-muted",
                o.value === value && "font-medium text-primary",
                o.disabled && "cursor-not-allowed opacity-50",
              )}
            >
              <span className="flex-1">{o.label}</span>
              <Check
                aria-hidden
                className={cn("size-4", o.value === value ? "opacity-100" : "opacity-0")}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

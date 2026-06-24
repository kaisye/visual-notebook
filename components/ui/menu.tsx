"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

/** Minimal click-to-open dropdown menu anchored to its trigger. */
export function Menu({
  trigger,
  children,
  align = "end",
}: {
  trigger: React.ReactNode;
  children: (close: () => void) => React.ReactNode;
  align?: "start" | "end";
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ left: 0, top: 0 });
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open || !ref.current) return;

    function updatePosition() {
      const trigger = ref.current?.getBoundingClientRect();
      if (!trigger) return;

      const menu = menuRef.current;
      const menuWidth = menu?.offsetWidth || 176;
      const menuHeight = menu?.offsetHeight || 0;
      const gap = 4;
      const margin = 8;
      const preferredLeft = align === "end" ? trigger.right - menuWidth : trigger.left;
      const left = Math.min(
        Math.max(preferredLeft, margin),
        window.innerWidth - menuWidth - margin,
      );
      const belowTop = trigger.bottom + gap;
      const aboveTop = trigger.top - menuHeight - gap;
      const top =
        menuHeight > 0 && belowTop + menuHeight > window.innerHeight - margin
          ? Math.max(aboveTop, margin)
          : belowTop;

      setPosition({ left, top });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [align, open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        ref.current &&
        !ref.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <div onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}>{trigger}</div>
      {open && createPortal(
        <div
          ref={menuRef}
          className={cn(
            "fixed z-50 min-w-44 overflow-hidden rounded-lg border border-border bg-card p-1 shadow-lg",
          )}
          style={{ left: position.left, top: position.top }}
          onClick={(e) => e.stopPropagation()}
        >
          {children(() => setOpen(false))}
        </div>,
        document.body,
      )}
    </div>
  );
}

export function MenuItem({
  children, onClick, danger, icon,
}: {
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent",
        danger && "text-danger",
      )}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </button>
  );
}

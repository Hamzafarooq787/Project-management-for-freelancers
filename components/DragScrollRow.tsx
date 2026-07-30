"use client";

import { useRef, type MouseEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Horizontal scroll row with no visible scrollbar. Scrolls by dragging with the
 * cursor (click and hold, then move) instead of a scrollbar UI element.
 */
export function DragScrollRow({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef({ isDown: false, moved: false, startX: 0, scrollLeft: 0 });

  function onMouseDown(e: MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    drag.current.isDown = true;
    drag.current.moved = false;
    drag.current.startX = e.pageX - el.offsetLeft;
    drag.current.scrollLeft = el.scrollLeft;
  }

  function endDrag() {
    drag.current.isDown = false;
  }

  function onMouseMove(e: MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!drag.current.isDown || !el) return;
    e.preventDefault();
    const x = e.pageX - el.offsetLeft;
    const walk = x - drag.current.startX;
    if (Math.abs(walk) > 5) drag.current.moved = true;
    el.scrollLeft = drag.current.scrollLeft - walk;
  }

  function onClickCapture(e: MouseEvent<HTMLDivElement>) {
    if (drag.current.moved) {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  return (
    <div
      ref={ref}
      onMouseDown={onMouseDown}
      onMouseUp={endDrag}
      onMouseLeave={endDrag}
      onMouseMove={onMouseMove}
      onClickCapture={onClickCapture}
      className={cn(
        "flex cursor-grab select-none gap-3 overflow-x-auto scroll-smooth active:cursor-grabbing",
        "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      {children}
    </div>
  );
}

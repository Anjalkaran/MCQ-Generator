
"use client"

import { cn } from "@/lib/utils";
import React from "react";

const Marquee = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("relative flex h-10 w-full items-center overflow-x-hidden rounded-lg border bg-accent text-accent-foreground shadow-sm", className)}
      {...props}
    >
      <div className="animate-marquee whitespace-nowrap">
        {children}
      </div>
      <div className="absolute top-0 animate-marquee2 whitespace-nowrap" aria-hidden="true">
        {children}
      </div>
    </div>
  );
});

Marquee.displayName = "Marquee";

export { Marquee };

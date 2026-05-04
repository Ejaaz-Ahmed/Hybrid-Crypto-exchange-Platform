import React from 'react';
import { cn } from '../../lib/utils';

export function Card({ className, children }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("bg-white border border-slate-200 shadow-sm", className)}>
      {children}
    </div>
  );
}

export function CardHeader({ className, children }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex flex-col space-y-1.5 p-4 border-b border-slate-100", className)}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn("font-semibold leading-none tracking-tight text-slate-900", className)}>
      {children}
    </h3>
  );
}

export function CardContent({ className, children }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-4", className)}>{children}</div>;
}

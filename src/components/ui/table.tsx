import * as React from "react";
import { cn } from "@/lib/utils";

export function Table({ className, ...props }: React.HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="hidden md:block w-full overflow-auto">
      <table className={cn("w-full caption-bottom text-sm", className)} {...props} />
    </div>
  );
}

export function TableHeader(props: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className="border-b border-brand-neutral bg-brand-bg" {...props} />;
}

export function TableBody(props: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody {...props} />;
}

export function TableRow(props: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className="border-b border-brand-neutral/60 transition-colors hover:bg-brand-neutral/20"
      {...props}
    />
  );
}

export function TableHead(props: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className="h-11 px-4 text-left align-middle font-medium text-brand-muted"
      {...props}
    />
  );
}

export function TableCell(props: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className="p-4 align-middle text-white" {...props} />;
}

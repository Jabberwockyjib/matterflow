import React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

type BreadcrumbsProps = {
  items: BreadcrumbItem[];
};

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <nav className="flex items-center gap-2 text-sm" aria-label="Breadcrumb">
      {items.map((item, index) => (
        <React.Fragment key={item.href || index}>
          {index > 0 && <ChevronRight className="h-4 w-4 text-slate-400" />}
          {item.href ? (
            <Link
              href={item.href}
              className="text-slate-600 hover:text-slate-900 transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-slate-900 font-medium">{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}

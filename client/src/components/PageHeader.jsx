import React from 'react';
import { AlertCircle } from 'lucide-react';

const PageHeader = ({ 
  role, 
  title, 
  description, 
  showReadOnlyBadge = false 
}) => {
  return (
    <section className="flex flex-col gap-6 rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-[0_16px_30px_rgba(15,23,42,0.06)] lg:flex-row lg:items-center lg:justify-between">
      <div>
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          {role}
        </span>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
          {title}
        </h1>
        <p className="mt-2 max-w-2xl text-sm font-medium text-slate-700">
          {description}
        </p>
        {showReadOnlyBadge && (
          <div className="mt-2 inline-flex items-center gap-2 rounded-lg bg-amber-50 text-amber-700 px-3 py-1 text-sm font-medium">
            <AlertCircle className="w-4 h-4" />
            Read-Only Access
          </div>
        )}
      </div>
    </section>
  );
};

export default PageHeader;

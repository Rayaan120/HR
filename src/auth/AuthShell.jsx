import { FileCheck2, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

export default function AuthShell({ children, footer }) {
  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-[minmax(340px,0.82fr)_1.18fr]">
      <section className="relative hidden overflow-hidden bg-slate-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-x-0 top-0 h-1 bg-emerald-400" />
        <Link to="/login" className="relative flex items-center gap-3 text-white">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-white/10 ring-1 ring-white/15">
            <FileCheck2 size={21} />
          </span>
          <span>
            <span className="block text-base font-bold">HR System</span>
            <span className="block text-xs text-slate-400">Contract & Staff Management</span>
          </span>
        </Link>

        <div className="relative max-w-md">
          <ShieldCheck className="mb-6 text-emerald-400" size={34} strokeWidth={1.7} />
          <h1 className="text-4xl font-bold leading-tight">A private workspace for your HR team.</h1>
          <p className="mt-5 text-base leading-7 text-slate-300">
            Employee records, contracts, and internal documents remain available only to approved staff accounts.
          </p>
        </div>

        <p className="relative text-xs text-slate-500">
          Authorized staff access only
        </p>
      </section>

      <section className="flex min-h-screen flex-col">
        <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4 lg:hidden">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-900 text-white">
            <FileCheck2 size={19} />
          </span>
          <div>
            <p className="text-sm font-bold text-slate-950">HR System</p>
            <p className="text-xs text-slate-500">Secure staff access</p>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center px-5 py-10 sm:px-10">
          <div className="w-full max-w-md">{children}</div>
        </div>

        {footer && (
          <div className="border-t border-slate-200 px-5 py-4 text-center text-xs text-slate-500">
            {footer}
          </div>
        )}
      </section>
    </main>
  );
}

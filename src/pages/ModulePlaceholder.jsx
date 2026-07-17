import { Construction } from "lucide-react";

export default function ModulePlaceholder({ title }) {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-9rem)] max-w-5xl items-center justify-center">
      <section className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white px-8 py-12 text-center shadow-sm">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
          <Construction size={30} />
        </span>
        <h1 className="mt-5 text-2xl font-bold text-slate-900">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">This module is ready in the app menu and will be available for HR operations soon.</p>
      </section>
    </div>
  );
}

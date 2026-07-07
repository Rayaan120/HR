export default function FormSection({ title, children }) {
  return (
    <div className="mb-8">
      <h3 className="text-lg font-bold text-[var(--color-navy)] mb-4 pb-2 border-b border-[var(--color-border-grey)]">{title}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {children}
      </div>
    </div>
  );
}

import { motion } from "framer-motion";

export default function StatCard({ title, value, icon, colorClass, delay = 0 }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="dashboard-stat"
    >
      <div className={`dashboard-stat-icon ${colorClass}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <h3 className="text-[11px] font-semibold uppercase text-slate-500">{title}</h3>
        <p className="mt-1.5 text-2xl font-bold leading-none text-[var(--color-navy)]">{value}</p>
      </div>
    </motion.div>
  );
}

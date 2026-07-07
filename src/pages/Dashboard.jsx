import { useEffect, useState } from "react";
import { Users, FileText, UserPlus, CheckCircle, ChefHat, Briefcase, MapPin, ArrowUpRight, Clock3 } from "lucide-react";
import { Link } from "react-router-dom";
import StatCard from "../components/StatCard";
import { getContracts, getStaffProfiles } from "../utils/storage";

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalStaff: 0,
    newEmployees: 0,
    pendingContracts: 0,
    signedContracts: 0,
    kitchenStaff: 0,
    managementStaff: 0,
    branches: {}
  });

  const [activities, setActivities] = useState([]);

  useEffect(() => {
    const staff = getStaffProfiles();
    const contracts = getContracts();

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    let newEmps = 0;
    let kitchen = 0;
    let management = 0;
    let branchCounts = {};

    staff.forEach(s => {
      const joinDate = new Date(s.joiningDate);
      if (joinDate.getMonth() === currentMonth && joinDate.getFullYear() === currentYear) {
        newEmps++;
      }
      if (s.department === "Kitchen Staff") kitchen++;
      if (s.department === "Management Staff") management++;
      
      branchCounts[s.branch] = (branchCounts[s.branch] || 0) + 1;
    });

    const pending = contracts.filter(c => c.status === "Pending Signature").length;
    const signed = contracts.filter(c => c.status === "Signed").length;

    setStats({
      totalStaff: staff.length,
      newEmployees: newEmps,
      pendingContracts: pending,
      signedContracts: signed,
      kitchenStaff: kitchen,
      managementStaff: management,
      branches: branchCounts
    });

    const recentContracts = [...contracts].reverse().slice(0, 3);
    const recentStaff = [...staff].reverse().slice(0, 2);
    
    let allActivities = [];
    recentContracts.forEach(c => {
      allActivities.push({
        id: c.contractNumber,
        text: `Contract ${c.contractNumber} generated for ${c.employeeName}`,
        date: c.createdAt || new Date().toISOString(),
        type: 'contract'
      });
      if (c.status === "Signed") {
        allActivities.push({
          id: c.contractNumber + '-signed',
          text: `Contract ${c.contractNumber} marked as Signed`,
          date: c.updatedAt || new Date().toISOString(),
          type: 'signed'
        });
      }
    });
    recentStaff.forEach(s => {
      allActivities.push({
        id: s.employeeId,
        text: `Employee profile created for ${s.fullName} (${s.employeeId})`,
        date: s.createdAt || new Date().toISOString(),
        type: 'profile'
      });
    });

    allActivities.sort((a, b) => new Date(b.date) - new Date(a.date));
    setActivities(allActivities.slice(0, 5));

  }, []);

  const totalDepartmentStaff = stats.kitchenStaff + stats.managementStaff;
  const kitchenPercent = totalDepartmentStaff ? Math.round((stats.kitchenStaff / totalDepartmentStaff) * 100) : 0;
  const managementPercent = totalDepartmentStaff ? 100 - kitchenPercent : 0;

  return (
    <div className="mx-auto max-w-7xl">
      <div className="dashboard-hero">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase text-emerald-600">HR Command Center</p>
          <h2 className="mt-1.5 text-2xl font-bold text-[var(--color-navy)]">Dashboard</h2>
          <p className="mt-1.5 text-sm text-slate-500">Live contract, staffing, and branch activity at a glance.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/contract-generator" className="btn-primary dashboard-action">
            <FileText size={15} />
            New Contract
            <ArrowUpRight size={13} />
          </Link>
          <Link to="/staff-profiles" className="btn-secondary dashboard-action">
            <Users size={15} />
            Staff Profiles
          </Link>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total Staff" value={stats.totalStaff} icon={<Users size={18} className="text-sky-700" />} colorClass="bg-sky-50 ring-sky-100" delay={0.1} />
        <StatCard title="New Employees" value={stats.newEmployees} icon={<UserPlus size={18} className="text-emerald-700" />} colorClass="bg-emerald-50 ring-emerald-100" delay={0.2} />
        <StatCard title="Pending Contracts" value={stats.pendingContracts} icon={<Clock3 size={18} className="text-amber-700" />} colorClass="bg-amber-50 ring-amber-100" delay={0.3} />
        <StatCard title="Signed Contracts" value={stats.signedContracts} icon={<CheckCircle size={18} className="text-violet-700" />} colorClass="bg-violet-50 ring-violet-100" delay={0.4} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <section className="dashboard-panel">
            <div className="dashboard-panel-header">
              <div>
                <p className="dashboard-kicker">Workforce Mix</p>
                <h3 className="dashboard-panel-title">Department Breakdown</h3>
              </div>
              <span className="dashboard-chip">{totalDepartmentStaff} assigned</span>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="dashboard-mini-card">
                <div className="dashboard-mini-icon bg-orange-50 text-orange-600">
                  <ChefHat size={17} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--color-navy)]">Kitchen Staff</p>
                  <p className="mt-1 text-xl font-bold">{stats.kitchenStaff}</p>
                </div>
                <span className="ml-auto text-sm font-semibold text-slate-500">{kitchenPercent}%</span>
              </div>
              <div className="dashboard-mini-card">
                <div className="dashboard-mini-icon bg-indigo-50 text-indigo-600">
                  <Briefcase size={17} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--color-navy)]">Management Staff</p>
                  <p className="mt-1 text-xl font-bold">{stats.managementStaff}</p>
                </div>
                <span className="ml-auto text-sm font-semibold text-slate-500">{managementPercent}%</span>
              </div>
            </div>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full bg-emerald-500" style={{ width: `${kitchenPercent}%` }}></div>
            </div>
          </section>

          <section className="dashboard-panel">
            <div className="dashboard-panel-header">
              <div>
                <p className="dashboard-kicker">Coverage</p>
                <h3 className="dashboard-panel-title">Branch Overview</h3>
              </div>
              <span className="dashboard-chip">{Object.keys(stats.branches).length} branches</span>
            </div>
            <div className="space-y-2">
              {Object.keys(stats.branches).length === 0 ? (
                <div className="dashboard-empty">No branch data available.</div>
              ) : (
                Object.entries(stats.branches).map(([branch, count], idx) => (
                  <div key={idx} className="dashboard-row">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="dashboard-row-icon"><MapPin size={15} /></span>
                      <span className="truncate font-semibold text-[var(--color-navy)]">{branch || "Unassigned Branch"}</span>
                    </div>
                    <span className="dashboard-pill">{count} Staff</span>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <section className="dashboard-panel">
          <div className="dashboard-panel-header">
            <div>
              <p className="dashboard-kicker">Latest</p>
              <h3 className="dashboard-panel-title">Recent Activities</h3>
            </div>
          </div>
          {activities.length === 0 ? (
            <div className="dashboard-empty">No recent activities.</div>
          ) : (
            <div className="space-y-1">
              {activities.map((activity, idx) => (
                <div key={activity.id + idx} className="dashboard-activity">
                  <span className={`dashboard-dot ${activity.type === 'signed' ? 'bg-emerald-500' : activity.type === 'profile' ? 'bg-sky-500' : 'bg-amber-500'}`}></span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-5 text-[var(--color-navy)]">{activity.text}</p>
                    <p className="mt-1 text-xs font-medium text-slate-400">{new Date(activity.date).toLocaleDateString()} {new Date(activity.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

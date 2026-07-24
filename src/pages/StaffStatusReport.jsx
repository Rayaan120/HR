import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, BriefcaseBusiness, Building2, Download, Filter, LayoutGrid, MinusCircle, Plus, Printer, Save, Search, SunMedium, Sunset, UserCheck, UserRoundSearch, Users, X } from "lucide-react";
import StaffProfileModal from "../components/StaffProfileModal";
import { exportToPDF, printDocument } from "../utils/pdfGenerator";
import { getContractDrafts, getContracts, getDepartments, getJobPositions, getStaffProfiles, getWorkLocations, saveStaffProfile, updateStaffProfile } from "../utils/storage";

const SHIFTS = ["Morning", "Evening"];
const REPORT_KEY = "staffStatusReportConfigV2";
const cardTones = {
  violet: "bg-violet-50 text-violet-600", blue: "bg-blue-50 text-blue-600", rose: "bg-rose-50 text-rose-600",
  amber: "bg-amber-50 text-amber-600", sky: "bg-sky-50 text-sky-600", indigo: "bg-indigo-50 text-indigo-600", emerald: "bg-emerald-50 text-emerald-600",
};

const loadConfig = () => {
  try { return JSON.parse(localStorage.getItem(REPORT_KEY) || "{}") || {}; }
  catch { return {}; }
};
const employmentStatus = (profile) => profile.employmentStatus || "Active";
const profileBranch = (profile) => String(profile.workLocation || profile.workLocation1 || profile.branch || profile.statusReportBranch || "").split(";")[0].trim();

const profileShifts = (profile) => {
  const shifts = profile.assignedShifts || profile.assignedShift || "";
  if (Array.isArray(shifts)) return shifts;
  return String(shifts).split(";").map((s) => s.trim()).filter(Boolean);
};

const personHasShift = (profile, branch, shift) => {
  const pBranch = profileBranch(profile);
  const pShifts = profileShifts(profile);
  return (!branch || pBranch === branch || !profile.statusReportBranch) && pShifts.includes(shift);
};

const cellKey = (branch, shift, position) => `${branch}::${shift}::${position}`;
const noteKey = (branch, shift) => `${branch}::${shift}`;
const eligible = (profile) => (profile.contractStatus === "Signed" || profile.contractStatus === "Pending Signature" || !profile.contractStatus) && employmentStatus(profile) !== "Inactive";
const pct = (assigned, required) => required ? Math.min(100, Math.round(assigned / required * 100)) : 100;

const toneFor = (required, assigned) => {
  if (!required) return { key: "none", label: "No requirement", cell: "border-slate-200 bg-slate-50 text-slate-500", badge: "bg-slate-200 text-slate-600", dot: "bg-slate-400" };
  if (assigned < required) return { key: "under", label: `Need ${required - assigned}`, cell: "border-rose-200 bg-rose-50/70 text-rose-700", badge: "bg-rose-100 text-rose-700", dot: "bg-rose-400" };
  return { key: "met", label: "", cell: "border-slate-200 bg-white text-slate-700", badge: "hidden", dot: "bg-slate-300" };
};

export default function StaffStatusReport() {
  const [profiles, setProfiles] = useState(getStaffProfiles);
  const [contracts, setContracts] = useState(getContracts);
  const [jobs, setJobs] = useState(getJobPositions);
  const [locations, setLocations] = useState(getWorkLocations);
  const [config, setConfig] = useState(loadConfig);
  const [editNeeds, setEditNeeds] = useState(false);
  const [dialog, setDialog] = useState(null);
  const [dialogSearch, setDialogSearch] = useState("");
  const [selectedProfile, setSelectedProfile] = useState(null);

  useEffect(() => {
    const staff = () => setProfiles(getStaffProfiles());
    const contractList = () => setContracts(getContracts());
    const positions = () => setJobs(getJobPositions());
    const branches = () => setLocations(getWorkLocations());
    const all = () => { staff(); contractList(); positions(); branches(); };
    window.addEventListener("staffProfilesChanged", staff);
    window.addEventListener("jobPositionsChanged", positions);
    window.addEventListener("workLocationsChanged", branches);
    window.addEventListener("storage", all);
    return () => {
      window.removeEventListener("staffProfilesChanged", staff);
      window.removeEventListener("jobPositionsChanged", positions);
      window.removeEventListener("workLocationsChanged", branches);
      window.removeEventListener("storage", all);
    };
  }, []);

  const candidateStaff = useMemo(() => {
    const staffMap = new Map();
    profiles.forEach((p) => {
      if (p.fullName && eligible(p)) {
        staffMap.set(p.employeeId || p.contractNumber || p.fullName, p);
      }
    });
    contracts.forEach((c) => {
      const key = c.contractNumber || c.fullName;
      if (!staffMap.has(key) && c.fullName && c.jobTitle) {
        staffMap.set(key, {
          employeeId: c.contractNumber || `EMP-${c.fullName.replace(/\s+/g, "")}`,
          fullName: c.fullName,
          jobTitle: c.jobTitle,
          department: c.department || "Kitchen Staff",
          workLocation: c.workLocation1 || c.workLocation || "",
          contractStatus: c.status || "Signed",
          employmentStatus: "Active",
          assignedShift: "",
          phoneNumber: c.phoneNumber || "",
        });
      }
    });
    return Array.from(staffMap.values());
  }, [profiles, contracts]);

  const signedStaff = candidateStaff;
  const positions = useMemo(() => {
    const drafts = getContractDrafts();
    return [...new Set([
      ...jobs.map((j) => j.title),
      ...candidateStaff.map((p) => p.jobTitle),
      ...contracts.map((c) => c.jobTitle),
      ...drafts.map((d) => d.formData?.jobTitle),
    ].filter(Boolean))];
  }, [jobs, candidateStaff, contracts]);

  const branches = useMemo(() => [...new Set([...locations.map((l) => l.name), ...candidateStaff.map(profileBranch)].filter(Boolean))], [locations, candidateStaff]);
  const scheduled = candidateStaff.filter((p) => profileBranch(p) && profileShifts(p).length > 0);
  const shownBranches = branches;
  const shownPositions = positions;
  const shownShifts = SHIFTS;

  const assigned = (branch, shift, position) => candidateStaff.filter((p) => (profileBranch(p) === branch || !profileBranch(p)) && personHasShift(p, branch, shift) && p.jobTitle === position);
  const required = (branch, shift, position) => Math.max(0, Number(config.requirements?.[cellKey(branch, shift, position)]) || 0);
  const rowTone = (branch, shift) => {
    const tones = shownPositions.map((position) => toneFor(required(branch, shift, position), assigned(branch, shift, position).length));
    if (tones.some((tone) => tone.key === "under")) return "under";
    if (tones.some((tone) => tone.key === "over") ) return "over";
    if (tones.some((tone) => tone.key === "full")) return "full";
    return "none";
  };
  const visibleRows = (branch) => shownShifts;

  const totals = (() => {
    let need = 0, have = 0, morningNeed = 0, morningHave = 0, eveningNeed = 0, eveningHave = 0;
    const weakBranches = new Set();
    branches.forEach((branch) => SHIFTS.forEach((shift) => positions.forEach((position) => {
      const r = required(branch, shift, position), a = assigned(branch, shift, position).length;
      need += r; have += a;
      if (shift === "Morning") { morningNeed += r; morningHave += a; } else { eveningNeed += r; eveningHave += a; }
      if (a < r) weakBranches.add(branch);
    })));
    return { open: Math.max(0, need - have), weak: weakBranches.size, morning: pct(morningHave, morningNeed), evening: pct(eveningHave, eveningNeed), overall: pct(have, need) };
  })();

  const saveConfig = (next) => { setConfig(next); localStorage.setItem(REPORT_KEY, JSON.stringify(next)); };
  const updateNeed = (branch, shift, position, value) => saveConfig({ ...config, requirements: { ...config.requirements, [cellKey(branch, shift, position)]: value } });
  const updateNote = (branch, shift, value) => saveConfig({ ...config, notes: { ...config.notes, [noteKey(branch, shift)]: value } });
  const openAssign = (branch = shownBranches[0] || branches[0] || "", shift = shownShifts[0] || "Morning", position = shownPositions[0] || positions[0] || "") => { setDialog({ mode: "assign", branch, shift, position }); setDialogSearch(""); };
  const openRemove = (branch = "", shift = "", position = "") => { setDialog({ mode: "remove", branch, shift, position }); setDialogSearch(""); };
  
  const assignPerson = (person) => {
    const currentShifts = profileShifts(person);
    if (currentShifts.includes(dialog.shift)) {
      setDialog(null);
      return;
    }
    const nextShifts = [...currentShifts, dialog.shift].join("; ");
    saveStaffProfile({
      ...person,
      assignedShift: nextShifts,
      statusReportBranch: dialog.branch,
      workLocation: dialog.branch,
      workLocation1: dialog.branch,
      contractStatus: person.contractStatus || "Signed",
      employmentStatus: "Active",
    });
    setProfiles(getStaffProfiles());
    setDialog(null);
  };
  
  const removePerson = (person, targetShift) => {
    const currentShifts = profileShifts(person);
    const shiftToRemove = targetShift || dialog?.shift;
    const nextShifts = shiftToRemove ? currentShifts.filter((s) => s !== shiftToRemove).join("; ") : "";
    saveStaffProfile({
      ...person,
      assignedShift: nextShifts,
      statusReportBranch: nextShifts ? (person.statusReportBranch || person.workLocation) : "",
    });
    setProfiles(getStaffProfiles());
  };
  const updateSelected = (person) => { updateStaffProfile(person.employeeId, person); setSelectedProfile(person); };

  const dialogPeople = candidateStaff.filter((person) => {
    if (dialog?.mode === "assign") {
      if (person.jobTitle !== dialog.position) return false;
      if (personHasShift(person, dialog.branch, dialog.shift)) return false;
    }
    if (dialog?.mode === "remove") {
      if (!profileShifts(person).length) return false;
      if (dialog.branch && profileBranch(person) !== dialog.branch) return false;
      if (dialog.shift && !personHasShift(person, dialog.branch, dialog.shift)) return false;
      if (dialog.position && person.jobTitle !== dialog.position) return false;
    }
    const q = dialogSearch.trim().toLowerCase();
    return !q || `${person.fullName} ${person.employeeId} ${person.phoneNumber}`.toLowerCase().includes(q);
  });

  const cards = [
    ["Total Employees", candidateStaff.length, Users, "violet"], ["Scheduled Today", new Set(scheduled.map((p) => p.employeeId)).size, UserCheck, "blue"],
    ["Open Positions", totals.open, BriefcaseBusiness, "rose"], ["Understaffed Branches", totals.weak, AlertTriangle, "amber"],
    ["Morning Coverage", `${totals.morning}%`, SunMedium, "sky"], ["Evening Coverage", `${totals.evening}%`, Sunset, "indigo"], ["Overall Staffing", `${totals.overall}%`, LayoutGrid, "emerald"],
  ];

  return <div className="mx-auto max-w-[1900px] pb-12">
    <header className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-5 bg-gradient-to-r from-slate-950 via-slate-900 to-violet-950 px-6 py-7 text-white lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div><p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[.2em] text-violet-300"><LayoutGrid size={15} /> Workforce Planning</p><h1 className="mt-3 text-3xl font-black">Staff Status Report</h1><p className="mt-2 text-sm text-slate-300">Live branch and shift coverage from signed contracts and active staff profiles.</p></div>
        <div className="flex flex-wrap gap-2 no-print"><Action icon={editNeeds ? Save : Filter} label={editNeeds ? "Save Requirements" : "Edit Required Counts"} onClick={() => setEditNeeds(!editNeeds)} primary={editNeeds} /><Action icon={Plus} label="Assign Employee" primary={!editNeeds} onClick={() => openAssign()} /><Action icon={MinusCircle} label="Remove" onClick={() => openRemove()} /><Action icon={Download} label="PDF" onClick={() => exportToPDF("staff-status-report-print", "Staff_Status_Report.pdf")} /><Action icon={Printer} label="Print" onClick={() => printDocument("staff-status-report-print")} /></div>
      </div>
    </header>

    <div id="staff-status-report-print">
      <section className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">{cards.map(([label, value, Icon, color], index) => <motion.article key={label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * .04 }} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><span className={`flex h-9 w-9 items-center justify-center rounded-xl ${cardTones[color]}`}><Icon size={18} /></span><p className="mt-4 text-2xl font-black text-slate-900">{value}</p><p className="mt-1 text-xs font-bold text-slate-500">{label}</p></motion.article>)}</section>

      <div className="mt-4 flex flex-wrap gap-3 text-xs font-bold"><Legend color="bg-rose-400" text="Staff required" /><Legend color="bg-slate-300" text="No requirement" /><span className="ml-auto text-slate-400">Updated {new Date().toLocaleString()}</span></div>

      <section className="mt-4 hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:block"><div className="overflow-x-auto"><table className="min-w-max border-separate border-spacing-0 text-left text-sm"><thead className="sticky top-0 z-30"><tr><th className="sticky left-0 z-40 min-w-44 border-b border-r border-slate-700 bg-slate-900 px-4 py-4 text-xs font-black uppercase tracking-wider text-white">Branch</th><th className="sticky left-44 z-40 min-w-28 border-b border-r border-slate-700 bg-slate-900 px-4 py-4 text-xs font-black uppercase tracking-wider text-white">Shift</th>{shownPositions.map((position) => {
        const r = shownBranches.reduce((sum, b) => sum + shownShifts.reduce((n, s) => n + required(b, s, position), 0), 0), a = shownBranches.reduce((sum, b) => sum + shownShifts.reduce((n, s) => n + assigned(b, s, position).length, 0), 0); return <PositionHead key={position} position={position} required={r} assigned={a} tone={toneFor(r, a)} />;
      })}<th className="min-w-72 border-b border-slate-700 bg-slate-900 px-4 py-4 text-xs font-black uppercase tracking-wider text-white">Notes</th></tr></thead><tbody>{shownBranches.map((branch) => {
        const rows = visibleRows(branch); return rows.map((shift, index) => <tr key={`${branch}-${shift}`}>{index === 0 && <th rowSpan={rows.length} className="sticky left-0 z-20 border-b border-r border-slate-200 bg-white px-4 py-5"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><Building2 size={18} /></span><span className="max-w-28 break-words font-black text-slate-900">{branch}</span></div></th>}<th className="sticky left-44 z-20 border-b border-r border-slate-200 bg-white px-4 py-5"><span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-black ${shift === "Morning" ? "bg-sky-50 text-sky-700" : "bg-indigo-50 text-indigo-700"}`}>{shift === "Morning" ? <SunMedium size={14} /> : <Sunset size={14} />}{shift}</span></th>{shownPositions.map((position) => {
          const people = assigned(branch, shift, position), r = required(branch, shift, position); return <StaffCell key={position} {...{ branch, shift, position, people, required: r, tone: toneFor(r, people.length), editNeeds, updateNeed, openAssign, removePerson, setSelectedProfile }} />;
        })}<td className="border-b border-slate-200 bg-white p-3 align-top"><textarea className="min-h-24 w-full resize-none rounded-xl border border-transparent bg-slate-50 p-3 text-sm outline-none hover:border-slate-200 focus:border-violet-300 focus:bg-white" value={config.notes?.[noteKey(branch, shift)] || ""} onChange={(e) => updateNote(branch, shift, e.target.value)} placeholder="Training, interview, transfer, leave..." /></td></tr>);
      })}</tbody></table>{!shownPositions.length && <Empty text="No positions configured." />}{!shownBranches.length && <Empty text="No branches are configured in Contract Generator settings." />}</div></section>

      <section className="mt-4 space-y-4 lg:hidden">{shownBranches.map((branch) => <article key={branch} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center gap-3 border-b bg-slate-50 p-4"><Building2 size={18} className="text-violet-600" /><h3 className="font-black">{branch}</h3></div>{visibleRows(branch).map((shift) => <div key={shift} className="border-b p-4 last:border-0"><h4 className="mb-3 flex items-center gap-2 font-black text-slate-700">{shift === "Morning" ? <SunMedium size={16} /> : <Sunset size={16} />}{shift}</h4><div className="space-y-2">{shownPositions.map((position) => { const people = assigned(branch, shift, position), r = required(branch, shift, position), tone = toneFor(r, people.length); return <button key={position} onClick={() => openAssign(branch, shift, position)} className={`w-full rounded-xl border p-3 text-left ${tone.cell}`}><span className="flex justify-between gap-2 font-black"><span>{position}</span><span className={`rounded-full px-2 py-1 text-[10px] ${tone.badge}`}>{tone.label}</span></span><span className="mt-2 block text-xs">{people.length ? people.map((p) => p.fullName).join(", ") : "Tap to assign"}</span></button>; })}</div><textarea className="mt-3 min-h-20 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm" value={config.notes?.[noteKey(branch, shift)] || ""} onChange={(e) => updateNote(branch, shift, e.target.value)} placeholder="Shift notes..." /></div>)}</article>)}</section>
    </div>

    <AnimatePresence>{dialog && <AssignDialog dialog={dialog} setDialog={setDialog} branches={branches} positions={positions} people={dialogPeople} search={dialogSearch} setSearch={setDialogSearch} assign={assignPerson} remove={removePerson} profileShifts={profileShifts} profileBranch={profileBranch} />}</AnimatePresence>
    {selectedProfile && <StaffProfileModal profile={selectedProfile} profiles={profiles} onProfileUpdate={updateSelected} onClose={() => setSelectedProfile(null)} />}
  </div>;
}

function Action({ icon: Icon, label, onClick, primary }) { return <button type="button" onClick={onClick} className={`inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-bold transition ${primary ? "bg-violet-500 text-white shadow-lg shadow-violet-950/30 hover:bg-violet-400" : "border border-white/15 bg-white/10 text-white hover:bg-white/15"}`}><Icon size={16} />{label}</button>; }
function Legend({ color, text }) { return <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-slate-600"><span className={`h-2.5 w-2.5 rounded-full ${color}`} />{text}</span>; }
function Select({ label, value, options, all, change, disabled }) { return <label><span className="mb-1.5 block text-xs font-bold text-slate-500">{label}</span><select className="input-field disabled:bg-slate-100" value={value} onChange={(e) => change(e.target.value)} disabled={disabled}><option value="">{all}</option>{options.map((option) => { const item = typeof option === "string" ? { value: option, label: option } : option; return <option key={item.value} value={item.value}>{item.label}</option>; })}</select></label>; }
function PositionHead({ position, required, assigned, tone }) { return <th className="min-w-64 border-b border-r border-slate-700 bg-slate-900 px-4 py-3"><div className="flex justify-between gap-3"><div><p className="max-w-40 break-words text-sm font-black text-white">{position}</p><div className="mt-3 flex gap-4">{[["Required", required], ["Assigned", assigned], ["Remaining", Math.max(0, required - assigned)]].map(([label, value]) => <span key={label}><small className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">{label}</small><strong className="text-sm text-white">{value}</strong></span>)}</div></div><span className={`mt-1 h-3 w-3 rounded-full ${tone.dot} ring-4 ring-white/10`} /></div></th>; }

function StaffCell({ branch, shift, position, people, required, tone, editNeeds, updateNeed, openAssign, removePerson, setSelectedProfile }) {
  return <td onClick={() => openAssign(branch, shift, position)} className={`min-w-64 cursor-pointer border-b border-r p-3 align-top transition hover:ring-2 hover:ring-inset hover:ring-violet-300 ${tone.cell}`}><div className="flex min-h-20 flex-col gap-2"><AnimatePresence initial={false}>{people.map((person) => <motion.div layout initial={{ opacity: 0, scale: .92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: .9 }} key={person.employeeId} onClick={(e) => { e.stopPropagation(); setSelectedProfile(person); }} className="group relative flex items-center gap-2 rounded-xl border border-white/70 bg-white p-2 shadow-sm hover:border-violet-200 hover:shadow-md"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-[10px] font-black text-violet-700">{String(person.fullName || "E").split(/\s+/).map((part) => part[0]).slice(0, 2).join("")}</span><span className="min-w-0 flex-1"><strong className="block truncate text-xs text-slate-800">{person.fullName}</strong><small className="flex items-center gap-1 truncate text-[10px] font-semibold text-slate-400"><BriefcaseBusiness size={10} />{person.employeeId}</small></span><button type="button" onClick={(e) => { e.stopPropagation(); removePerson(person, shift); }} className="rounded-md p-1 text-slate-300 opacity-0 hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100"><X size={13} /></button><div className="pointer-events-none absolute bottom-[calc(100%+8px)] left-0 z-50 hidden w-60 rounded-xl bg-slate-950 p-3 text-xs text-white shadow-xl group-hover:block"><strong>{person.fullName}</strong><div className="mt-2 space-y-1 text-slate-300"><p>ID: {person.employeeId}</p><p>Phone: {person.phoneNumber || "Not provided"}</p><p>Position: {person.jobTitle}</p><p>Department: {person.department || "Not provided"}</p><p>Branch: {branch}</p><p>Contract: {person.contractStatus}</p></div></div></motion.div>)}</AnimatePresence>{!people.length && <button type="button" className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-dashed border-current/30 text-xs font-bold opacity-70"><Plus size={14} /> Assign {position}</button>}</div><div onClick={(e) => e.stopPropagation()} className="mt-3 flex items-center justify-between border-t border-current/10 pt-2"><span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${tone.badge}`}>{tone.label}</span>{editNeeds ? <label className="flex items-center gap-1 text-[10px] font-bold uppercase"><span>Required</span><input className="h-8 w-14 rounded-lg border bg-white text-center text-sm font-black text-slate-900" type="number" min="0" value={required} onChange={(e) => updateNeed(branch, shift, position, e.target.value)} /></label> : <small className="font-bold opacity-70">{people.length}/{required}</small>}</div></td>;
}

function AssignDialog({ dialog, setDialog, branches, positions, people, search, setSearch, assign, remove, profileShifts, profileBranch }) {
  const assigning = dialog.mode === "assign";
  return <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={() => setDialog(null)} className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"><motion.section initial={{ opacity: 0, y: 18, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12 }} onMouseDown={(e) => e.stopPropagation()} className="flex max-h-[86vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"><header className="flex justify-between border-b p-5"><div><p className="text-xs font-black uppercase tracking-wider text-violet-600">Quick Action</p><h2 className="mt-1 text-xl font-black">{assigning ? "Assign Employee" : "Remove Assignment"}</h2><p className="mt-1 text-sm text-slate-500">{assigning ? "Active employees in this position eligible for shift assignment." : "Choose a scheduled employee to remove."}</p></div><button onClick={() => setDialog(null)} className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100"><X size={17} /></button></header><div className="grid gap-3 border-b bg-slate-50 p-5 sm:grid-cols-3"><Select label="Branch" value={dialog.branch} options={branches} all="All branches" change={(v) => setDialog({ ...dialog, branch: v })} /><Select label="Shift" value={dialog.shift} options={SHIFTS} all="All shifts" change={(v) => setDialog({ ...dialog, shift: v })} /><Select label="Position" value={dialog.position} options={positions} all="All positions" change={(v) => setDialog({ ...dialog, position: v })} /></div><div className="p-5"><label className="relative block"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} /><input autoFocus className="input-field pl-10" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, ID, or phone" /></label></div><div className="flex-1 space-y-2 overflow-y-auto px-5 pb-5">{people.map((person) => { const s = profileShifts(person); return <button key={person.employeeId} onClick={() => assigning ? assign(person) : remove(person, dialog.shift)} className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 p-3 text-left hover:border-violet-300 hover:bg-violet-50"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100 text-sm font-black text-violet-700">{String(person.fullName || "E").split(/\s+/).map((p) => p[0]).slice(0, 2).join("")}</span><span className="min-w-0 flex-1"><strong className="block truncate text-sm">{person.fullName}</strong><small className="text-slate-500">{person.employeeId} · {person.jobTitle}{s.length ? ` · ${profileBranch(person)} (${s.join(", ")})` : ""}</small></span><span className={`rounded-lg px-3 py-1.5 text-xs font-bold ${assigning ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>{assigning ? "Assign" : "Remove"}</span></button>; })}{!people.length && <div className="rounded-2xl border border-dashed bg-slate-50 py-12 text-center"><UserRoundSearch className="mx-auto text-slate-300" size={32} /><p className="mt-3 font-bold text-slate-700">No available employees found</p><p className="mt-1 text-sm text-slate-500">Check the position, status, or current assignment.</p></div>}</div></motion.section></motion.div>;
}
function Empty({ text }) { return <div className="p-12 text-center text-sm font-semibold text-slate-500">{text}</div>; }

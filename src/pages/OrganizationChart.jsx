import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  BriefcaseBusiness,
  Building2,
  ChevronDown,
  ChevronsUpDown,
  CircleDot,
  Download,
  Filter,
  Maximize2,
  Network,
  Printer,
  Search,
  SunMedium,
  Sunset,
  UserCheck,
  Users,
} from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import StaffProfileModal from "../components/StaffProfileModal";
import {
  getContracts,
  getDepartments,
  getJobPositions,
  getStaffProfiles,
  getWorkLocations,
  updateStaffProfile,
} from "../utils/storage";

const ROOT_X = 920;
const LEVEL_GAP = 190;
const CARD_W = 260;
const EMPLOYEE_W = 250;
const COLUMN_GAP = 76;
const BRANCH_GAP = 1180;
const BRANCH_POSITION_GAP = 310;
const EMPLOYEE_ROW_GAP = 166;

const DEFAULT_FILTERS = {
  branch: "",
  department: "",
  position: "",
  group: "",
  shift: "",
  status: "active",
};

const managementKeywords = [
  "ceo",
  "coo",
  "manager",
  "human resource",
  "hr",
  "account",
  "finance",
  "admin",
  "purchase",
  "inventory",
  "operation",
  "marketing",
  "it",
  "director",
  "controller",
];

const departmentSeeds = [
  "Human Resources",
  "Finance & Accounts",
  "Administration",
  "Purchase",
  "Operations",
  "Marketing",
  "IT",
  "Kitchen Operations",
];

const colorByRole = {
  ceo: {
    band: "from-slate-950 to-slate-800",
    icon: "bg-slate-950 text-white",
    card: "border-slate-300",
    badge: "bg-slate-100 text-slate-700",
  },
  coo: {
    band: "from-blue-800 to-indigo-700",
    icon: "bg-blue-700 text-white",
    card: "border-blue-200",
    badge: "bg-blue-50 text-blue-700",
  },
  management: {
    band: "from-emerald-600 to-teal-600",
    icon: "bg-emerald-600 text-white",
    card: "border-emerald-200",
    badge: "bg-emerald-50 text-emerald-700",
  },
  branch: {
    band: "from-orange-500 to-amber-500",
    icon: "bg-orange-500 text-white",
    card: "border-orange-200",
    badge: "bg-orange-50 text-orange-700",
  },
  kitchen: {
    band: "from-rose-600 to-red-500",
    icon: "bg-rose-600 text-white",
    card: "border-rose-200",
    badge: "bg-rose-50 text-rose-700",
  },
  cashier: {
    band: "from-purple-600 to-fuchsia-600",
    icon: "bg-purple-600 text-white",
    card: "border-purple-200",
    badge: "bg-purple-50 text-purple-700",
  },
  helping: {
    band: "from-teal-600 to-cyan-600",
    icon: "bg-teal-600 text-white",
    card: "border-teal-200",
    badge: "bg-teal-50 text-teal-700",
  },
  trainee: {
    band: "from-slate-500 to-slate-400",
    icon: "bg-slate-500 text-white",
    card: "border-slate-200",
    badge: "bg-slate-100 text-slate-600",
  },
};

const normalize = (value) => String(value || "").trim();
const lower = (value) => normalize(value).toLowerCase();
const makeKey = (value) => lower(value).replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "unknown";
const initialsFor = (name = "Employee") =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "E";

const splitList = (value) =>
  Array.isArray(value)
    ? value.map(normalize).filter(Boolean)
    : String(value || "").split(";").map(normalize).filter(Boolean);

const getProfileBranch = (profile) => {
  const values = [
    profile.statusReportBranch,
    profile.workLocation1,
    profile.workLocation,
    profile.branch,
  ].flatMap(splitList).filter(Boolean);
  return values[0] || "Unassigned Branch";
};

const getProfileBranches = (profile) => {
  const values = [
    profile.statusReportBranch,
    profile.workLocation1,
    profile.workLocation2,
    profile.workLocation3,
    profile.workLocation,
    profile.branch,
  ].flatMap(splitList).filter(Boolean);
  return values.length ? [...new Set(values)] : ["Unassigned Branch"];
};

const getProfileShifts = (profile) => splitList(profile.assignedShifts || profile.assignedShift);

const isTerminated = (profile) =>
  ["terminated", "resigned"].includes(lower(profile.employmentStatus))
  || ["terminated"].includes(lower(profile.contractStatus));

const isInactive = (profile) => lower(profile.employmentStatus) === "inactive";
const isManagementPosition = (title = "", department = "") => managementKeywords.some((keyword) => `${lower(title)} ${lower(department)}`.includes(keyword));
const isBranchManager = (profile) => lower(profile.jobTitle).includes("branch manager") || lower(profile.jobTitle).includes("store manager");

const isKitchenPosition = (title = "", department = "") => {
  const text = `${lower(title)} ${lower(department)}`;
  return text.includes("kitchen")
    || ["cook", "cooking", "wrap", "wrapping", "cashier", "dough", "helping", "helper", "trainee"].some((keyword) => text.includes(keyword));
};

const roleColorKey = (title = "", type = "") => {
  const text = lower(title);
  if (type === "ceo") return "ceo";
  if (type === "coo") return "coo";
  if (type === "branch") return "branch";
  if (text.includes("cashier")) return "cashier";
  if (text.includes("help")) return "helping";
  if (text.includes("trainee")) return "trainee";
  if (isKitchenPosition(text)) return "kitchen";
  return "management";
};

const mergeEmployeeSources = (profiles, contracts) => {
  const map = new Map();

  const put = (person) => {
    const key = person.employeeId || person.contractNumber || person.fullName;
    if (!key || !person.fullName) return;
    map.set(key, { ...(map.get(key) || {}), ...person });
  };

  contracts.forEach((contract) => {
    put({
      ...contract,
      employeeId: contract.employeeId || contract.contractNumber,
      contractStatus: contract.status || contract.contractStatus || "Signed",
      employmentStatus: contract.employmentStatus || "Active",
      workLocation: contract.workLocation || [contract.workLocation1, contract.workLocation2, contract.workLocation3].filter(Boolean).join("; "),
    });
  });

  profiles.forEach(put);
  return [...map.values()].filter((profile) => !isTerminated(profile));
};

const formatMoney = (value) => {
  const amount = Number(value) || 0;
  if (!amount) return "Not provided";
  return amount.toLocaleString();
};

const formatDate = (value) => {
  if (!value) return "Not provided";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
};

const employeeStatus = (profile) => {
  const text = `${lower(profile.currentStatus)} ${lower(profile.status)} ${lower(profile.attendanceStatus)}`;
  if (text.includes("leave")) return { label: "On Leave", dot: "bg-yellow-400", badge: "bg-yellow-50 text-yellow-700" };
  if (text.includes("absent")) return { label: "Absent", dot: "bg-red-500", badge: "bg-red-50 text-red-700" };
  if (text.includes("training")) return { label: "Training", dot: "bg-blue-500", badge: "bg-blue-50 text-blue-700" };
  if (isInactive(profile)) return { label: "Inactive", dot: "bg-slate-400", badge: "bg-slate-100 text-slate-600" };
  return { label: "Available", dot: "bg-green-500", badge: "bg-green-50 text-green-700" };
};

const shiftBadge = (profile) => {
  const shifts = getProfileShifts(profile);
  const status = employeeStatus(profile).label;
  if (status === "On Leave") return { label: "Leave", className: "bg-yellow-50 text-yellow-700" };
  if (status === "Training") return { label: "Training", className: "bg-blue-50 text-blue-700" };
  if (shifts.includes("Morning")) return { label: "Morning", className: "bg-sky-50 text-sky-700", icon: SunMedium };
  if (shifts.includes("Evening")) return { label: "Evening", className: "bg-indigo-50 text-indigo-700", icon: Sunset };
  return { label: "Off Duty", className: "bg-slate-100 text-slate-600" };
};

function OrgNode({ data }) {
  const Icon = data.icon || BriefcaseBusiness;
  const colors = colorByRole[data.colorKey] || colorByRole.management;
  const collapsed = Boolean(data.collapsed);
  const isMatched = Boolean(data.isMatched);
  const isEmployee = data.kind === "employee";
  const hasProfile = Boolean(data.profile);
  const status = data.profile ? employeeStatus(data.profile) : null;
  const shift = data.profile ? shiftBadge(data.profile) : null;
  const ShiftIcon = shift?.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: isMatched ? 1.04 : 1 }}
      transition={{ duration: 0.25 }}
      className={`group relative overflow-visible rounded-xl border bg-white shadow-lg shadow-slate-200/70 ring-offset-2 transition-all hover:-translate-y-1 hover:shadow-xl ${colors.card} ${isMatched ? "ring-4 ring-amber-300" : ""}`}
      style={{ width: isEmployee ? EMPLOYEE_W : CARD_W }}
      onClick={(event) => {
        event.stopPropagation();
        if (hasProfile) data.onEmployeeClick?.(data.profile);
      }}
    >
      <Handle type="target" position={Position.Top} className="!h-2 !w-2 !border-0 !bg-cyan-500" />
      <div className={`h-2 rounded-t-xl bg-gradient-to-r ${colors.band}`} />
      <div className="p-4">
        <div className="flex items-start gap-3">
          {hasProfile && data.profile?.profilePhoto ? (
            <img src={data.profile.profilePhoto} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover ring-2 ring-white shadow" />
          ) : hasProfile ? (
            <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-sm font-black shadow-sm ${colors.icon}`}>
              {initialsFor(data.profile.fullName)}
            </span>
          ) : (
            <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-sm font-black shadow-sm ${colors.icon}`}>
              <Icon size={22} />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="truncate text-sm font-black text-slate-950">{data.title}</h3>
                <p className="mt-1 line-clamp-2 text-xs font-bold leading-4 text-slate-500">{data.subtitle}</p>
              </div>
              {data.toggleCollapse && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    data.toggleCollapse(data.id);
                  }}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-900"
                  title={collapsed ? "Expand" : "Collapse"}
                >
                  <ChevronDown size={16} className={`transition-transform ${collapsed ? "-rotate-90" : ""}`} />
                </button>
              )}
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {data.meta?.slice(0, 3).map((item) => (
                <span key={item} className={`rounded-md px-2 py-1 text-[10px] font-black ${colors.badge}`}>{item}</span>
              ))}
              {shift && (
                <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-black ${shift.className}`}>
                  {ShiftIcon ? <ShiftIcon size={10} /> : null}
                  {shift.label}
                </span>
              )}
              {status && (
                <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-black ${status.badge}`}>
                  <span className={`h-2 w-2 rounded-full ${status.dot}`} />
                  {status.label}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {data.tooltip && (
        <div className="pointer-events-none absolute left-1/2 top-[calc(100%+10px)] z-50 hidden w-72 -translate-x-1/2 rounded-xl bg-slate-950 p-4 text-xs text-white shadow-2xl group-hover:block">
          <strong className="block text-sm">{data.title}</strong>
          <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-slate-300">
            {data.tooltip.map(([label, value]) => (
              <p key={label} className="min-w-0">
                <span className="block text-[10px] font-black uppercase tracking-wide text-slate-500">{label}</span>
                <span className="block truncate font-semibold text-white">{value || "Not provided"}</span>
              </p>
            ))}
          </div>
        </div>
      )}
      <Handle type="source" position={Position.Bottom} className="!h-2 !w-2 !border-0 !bg-cyan-500" />
    </motion.div>
  );
}

const nodeTypes = { orgNode: OrgNode };

const edgeFor = (source, target, hidden = false) => ({
  id: `${source}->${target}`,
  source,
  target,
  hidden,
  type: "smoothstep",
  animated: !hidden,
  markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: "#0891b2" },
  style: { stroke: "#0891b2", strokeWidth: 2.2 },
});

const buildTooltip = (profile, reportsTo) => [
  ["Employee ID", profile.employeeId || profile.contractNumber],
  ["Phone", profile.phoneNumber],
  ["Joining Date", formatDate(profile.joiningDate || profile.contractStartDate || profile.dateOfSigning)],
  ["Salary", formatMoney(profile.baseSalary || profile.grossSalary || profile.netSalary)],
  ["Department", profile.department],
  ["Branch", getProfileBranch(profile)],
  ["Reports To", reportsTo],
  ["Current Shift", getProfileShifts(profile).join(", ") || "Off Duty"],
  ["Status", employeeStatus(profile).label],
];

const profileMatchesSearch = (profile, query) => {
  if (!query) return false;
  return [
    profile.fullName,
    profile.employeeId,
    profile.contractNumber,
    profile.jobTitle,
    profile.department,
    getProfileBranch(profile),
  ].filter(Boolean).join(" ").toLowerCase().includes(query);
};

const passesFilters = (profile, filters) => {
  if (filters.status === "active" && isInactive(profile)) return false;
  if (filters.status === "inactive" && !isInactive(profile)) return false;
  if (filters.branch && !getProfileBranches(profile).includes(filters.branch)) return false;
  if (filters.department && profile.department !== filters.department) return false;
  if (filters.position && profile.jobTitle !== filters.position) return false;
  if (filters.group === "management" && !isManagementPosition(profile.jobTitle, profile.department)) return false;
  if (filters.group === "kitchen" && !isKitchenPosition(profile.jobTitle, profile.department)) return false;
  if (filters.shift === "Morning" && !getProfileShifts(profile).includes("Morning")) return false;
  if (filters.shift === "Evening" && !getProfileShifts(profile).includes("Evening")) return false;
  return true;
};

const addNode = (nodes, node) => {
  nodes.push({
    type: "orgNode",
    ...node,
  });
};

function buildChart({ employees, jobs, departments, branches, collapsed, toggleCollapse, onEmployeeClick, searchTerm }) {
  const nodes = [];
  const edges = [];
  const hiddenChildren = new Set();
  const query = lower(searchTerm);
  const ceoProfile = employees.find((profile) => /\bceo\b|chief executive|general manager|director/i.test(`${profile.jobTitle || ""} ${profile.department || ""}`));
  const cooProfile = employees.find((profile) => /\bcoo\b|operations manager|operation manager/i.test(`${profile.jobTitle || ""} ${profile.department || ""}`));
  const topProfileKeys = new Set([ceoProfile, cooProfile].filter(Boolean).map((profile) => profile.employeeId || profile.contractNumber || profile.fullName));
  const chartEmployees = employees.filter((profile) => !topProfileKeys.has(profile.employeeId || profile.contractNumber || profile.fullName));

  const markHidden = (id) => hiddenChildren.add(id);
  const isHidden = (id) => hiddenChildren.has(id);
  const collapsedHas = (id) => collapsed.has(id);

  addNode(nodes, {
    id: "role-ceo",
    position: { x: ROOT_X, y: 0 },
    data: {
      id: "role-ceo",
      kind: "role",
      profile: ceoProfile,
      colorKey: "ceo",
      icon: UserCheck,
      title: "CEO",
      subtitle: ceoProfile?.fullName || "Executive leadership",
      meta: [ceoProfile?.employeeId || ceoProfile?.contractNumber || "Top Level", ceoProfile?.department].filter(Boolean),
      tooltip: ceoProfile ? buildTooltip(ceoProfile, "Board / Ownership") : null,
      onEmployeeClick,
      collapsed: collapsedHas("role-ceo"),
      toggleCollapse,
      isMatched: query && "ceo".includes(query),
    },
  });

  addNode(nodes, {
    id: "role-coo",
    position: { x: ROOT_X, y: LEVEL_GAP },
    hidden: collapsedHas("role-ceo"),
    data: {
      id: "role-coo",
      kind: "role",
      profile: cooProfile,
      colorKey: "coo",
      icon: Network,
      title: "COO",
      subtitle: cooProfile?.fullName || "Operations leadership",
      meta: [cooProfile?.employeeId || cooProfile?.contractNumber || "Reports to CEO", cooProfile?.department].filter(Boolean),
      tooltip: cooProfile ? buildTooltip(cooProfile, "CEO") : null,
      onEmployeeClick,
      collapsed: collapsedHas("role-coo"),
      toggleCollapse,
      isMatched: query && "coo".includes(query),
    },
  });
  edges.push(edgeFor("role-ceo", "role-coo", collapsedHas("role-ceo")));
  if (collapsedHas("role-ceo")) markHidden("role-coo");

  const knownDepartments = new Set([...departmentSeeds, ...departments, ...jobs.map((job) => job.department)].filter(Boolean));
  const managementDepartments = [...knownDepartments]
    .filter((department) => department !== "Kitchen Staff")
    .sort((a, b) => {
      if (a === "Operations") return -1;
      if (b === "Operations") return 1;
      return a.localeCompare(b);
    });
  const deptStartX = ROOT_X - ((managementDepartments.length - 1) * (CARD_W + COLUMN_GAP)) / 2;

  managementDepartments.forEach((department, index) => {
    const id = `dept-${makeKey(department)}`;
      const deptEmployees = chartEmployees.filter((profile) => profile.department === department || (department === "Operations" && isBranchManager(profile)));
    const position = { x: deptStartX + index * (CARD_W + COLUMN_GAP), y: LEVEL_GAP * 2 };
    const hidden = isHidden("role-coo") || collapsedHas("role-coo");
    if (hidden) markHidden(id);
    addNode(nodes, {
      id,
      position,
      hidden,
      data: {
        id,
        kind: "department",
        colorKey: "management",
        icon: Building2,
        title: department,
        subtitle: `${deptEmployees.length} staff / positions`,
        meta: ["Department"],
        collapsed: collapsedHas(id),
        toggleCollapse,
        isMatched: query && lower(department).includes(query),
      },
    });
    edges.push(edgeFor("role-coo", id, hidden));
  });

  const managementJobsByDepartment = managementDepartments
    .filter((department) => department !== "Operations" && department !== "Kitchen Operations" && department !== "Kitchen Staff")
    .flatMap((department, departmentIndex) => {
      const deptJobs = jobs.filter((job) => job.department === department);
      const existingTitles = new Set(deptJobs.map((job) => job.title));
      chartEmployees
        .filter((profile) => profile.department === department && !existingTitles.has(profile.jobTitle))
        .forEach((profile) => {
          if (profile.jobTitle) existingTitles.add(profile.jobTitle);
        });
      return [...existingTitles].map((title, titleIndex) => ({ department, departmentIndex, title, titleIndex }));
    });

  managementJobsByDepartment.forEach(({ department, departmentIndex, title, titleIndex }) => {
    const deptId = `dept-${makeKey(department)}`;
    const id = `position-${makeKey(department)}-${makeKey(title)}`;
    const people = chartEmployees.filter((profile) => profile.department === department && profile.jobTitle === title);
    const hidden = isHidden(deptId) || collapsedHas(deptId);
    if (hidden) markHidden(id);
    const deptX = deptStartX + departmentIndex * (CARD_W + COLUMN_GAP);
    const titleY = LEVEL_GAP * 3 + titleIndex * 520;
    addNode(nodes, {
      id,
      position: { x: deptX, y: titleY },
      hidden,
      data: {
        id,
        kind: "position",
        colorKey: "management",
        icon: BriefcaseBusiness,
        title,
        subtitle: department,
        meta: [`${people.length} staff`],
        collapsed: collapsedHas(id),
        toggleCollapse,
        isMatched: query && lower(title).includes(query),
      },
    });
    edges.push(edgeFor(deptId, id, hidden));

    people.slice(0, 40).forEach((profile, personIndex) => {
      const personId = `emp-management-${makeKey(department)}-${makeKey(title)}-${makeKey(profile.employeeId || profile.contractNumber || profile.fullName)}`;
      const personHidden = hidden || collapsedHas(id);
      addNode(nodes, {
        id: personId,
        position: { x: deptX, y: titleY + LEVEL_GAP + personIndex * EMPLOYEE_ROW_GAP },
        hidden: personHidden,
        data: {
          id: personId,
          kind: "employee",
          profile,
          colorKey: roleColorKey(profile.jobTitle),
          title: profile.fullName,
          subtitle: profile.jobTitle,
          meta: [profile.employeeId || profile.contractNumber, profile.department, getProfileBranch(profile)].filter(Boolean),
          tooltip: buildTooltip(profile, title),
          onEmployeeClick,
          isMatched: profileMatchesSearch(profile, query),
        },
      });
      edges.push(edgeFor(id, personId, personHidden));
    });
  });

  const operationDeptId = `dept-${makeKey("Operations")}`;
  const branchList = [...new Set([...branches.map((branch) => branch.name), ...chartEmployees.flatMap(getProfileBranches)].filter(Boolean))].sort();
  const branchStartX = ROOT_X - ((branchList.length - 1) * BRANCH_GAP) / 2;

  branchList.forEach((branch, branchIndex) => {
    const branchId = `branch-${makeKey(branch)}`;
    const branchPeople = chartEmployees.filter((profile) => getProfileBranches(profile).includes(branch));
    const branchManagers = branchPeople.filter(isBranchManager);
    const hidden = isHidden(operationDeptId) || collapsedHas(operationDeptId);
    if (hidden) markHidden(branchId);
    addNode(nodes, {
      id: branchId,
      position: { x: branchStartX + branchIndex * BRANCH_GAP, y: LEVEL_GAP * 3 },
      hidden,
      data: {
        id: branchId,
        kind: "branch",
        colorKey: "branch",
        icon: Building2,
        title: branch,
        subtitle: `${branchPeople.length} active staff`,
        meta: ["Branch"],
        collapsed: collapsedHas(branchId),
        toggleCollapse,
        isMatched: query && lower(branch).includes(query),
      },
    });
    edges.push(edgeFor(operationDeptId, branchId, hidden));

    const managerNodeId = `branch-manager-${makeKey(branch)}`;
    const managerHidden = hidden || collapsedHas(branchId);
    if (managerHidden) markHidden(managerNodeId);
    addNode(nodes, {
      id: managerNodeId,
      position: { x: branchStartX + branchIndex * BRANCH_GAP, y: LEVEL_GAP * 4 },
      hidden: managerHidden,
      data: {
        id: managerNodeId,
        kind: "position",
        colorKey: "branch",
        icon: UserCheck,
        title: "Branch Manager",
        subtitle: branch,
        meta: [`${branchManagers.length} staff`],
        collapsed: collapsedHas(managerNodeId),
        toggleCollapse,
        isMatched: query && "branch manager".includes(query),
      },
    });
    edges.push(edgeFor(branchId, managerNodeId, managerHidden));

    branchManagers.forEach((profile, index) => {
      const personId = `emp-branch-manager-${makeKey(branch)}-${makeKey(profile.employeeId || profile.contractNumber || profile.fullName)}`;
      const personHidden = managerHidden || collapsedHas(managerNodeId);
      addNode(nodes, {
        id: personId,
        position: { x: branchStartX + branchIndex * BRANCH_GAP, y: LEVEL_GAP * 5 + index * EMPLOYEE_ROW_GAP },
        hidden: personHidden,
        data: {
          id: personId,
          kind: "employee",
          profile,
          colorKey: "branch",
          title: profile.fullName,
          subtitle: profile.jobTitle,
          meta: [profile.employeeId || profile.contractNumber, branch, profile.department].filter(Boolean),
          tooltip: buildTooltip(profile, "COO / Operations"),
          onEmployeeClick,
          isMatched: profileMatchesSearch(profile, query),
        },
      });
      edges.push(edgeFor(managerNodeId, personId, personHidden));
    });

    const branchJobs = jobs
      .filter((job) => job.department === "Kitchen Staff" || isKitchenPosition(job.title, job.department))
      .map((job) => job.title);
    branchPeople
      .filter((profile) => !isBranchManager(profile) && profile.jobTitle)
      .forEach((profile) => branchJobs.push(profile.jobTitle));
    const positions = [...new Set(branchJobs)].sort();
    const branchCenterX = branchStartX + branchIndex * BRANCH_GAP;
    const positionStartX = branchCenterX - ((positions.length - 1) * BRANCH_POSITION_GAP) / 2;
    const positionY = LEVEL_GAP * 5 + Math.max(1, branchManagers.length) * EMPLOYEE_ROW_GAP + 120;

    positions.forEach((title, posIndex) => {
      const positionPeople = branchPeople.filter((profile) => !isBranchManager(profile) && profile.jobTitle === title);
      if (!positionPeople.length && !jobs.some((job) => job.title === title)) return;
      const positionId = `branch-${makeKey(branch)}-position-${makeKey(title)}`;
      const positionHidden = managerHidden || collapsedHas(managerNodeId);
      if (positionHidden) markHidden(positionId);
      addNode(nodes, {
        id: positionId,
        position: { x: positionStartX + posIndex * BRANCH_POSITION_GAP, y: positionY },
        hidden: positionHidden,
        data: {
          id: positionId,
          kind: "position",
          colorKey: roleColorKey(title),
          icon: CircleDot,
          title,
          subtitle: branch,
          meta: [`${positionPeople.length} staff`],
          collapsed: collapsedHas(positionId),
          toggleCollapse,
          isMatched: query && lower(title).includes(query),
        },
      });
      edges.push(edgeFor(managerNodeId, positionId, positionHidden));

      positionPeople.slice(0, 80).forEach((profile, personIndex) => {
        const personId = `emp-${makeKey(branch)}-${makeKey(profile.employeeId || profile.contractNumber || profile.fullName)}`;
        const personHidden = positionHidden || collapsedHas(positionId);
        const positionX = positionStartX + posIndex * BRANCH_POSITION_GAP;
        addNode(nodes, {
          id: personId,
          position: { x: positionX, y: positionY + LEVEL_GAP + personIndex * EMPLOYEE_ROW_GAP },
          hidden: personHidden,
          data: {
            id: personId,
            kind: "employee",
            profile,
            colorKey: roleColorKey(profile.jobTitle),
            title: profile.fullName,
            subtitle: profile.jobTitle,
            meta: [profile.employeeId || profile.contractNumber, branch, profile.department].filter(Boolean),
            tooltip: buildTooltip(profile, title),
            onEmployeeClick,
            isMatched: profileMatchesSearch(profile, query),
          },
        });
        edges.push(edgeFor(positionId, personId, personHidden));
      });
    });
  });

  return { nodes, edges };
}

function KpiCard({ icon: Icon, label, value, tone }) {
  return (
    <motion.div layout className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-lg ${tone}`}>
        <Icon size={20} />
      </div>
      <p className="text-2xl font-black text-slate-950">{value}</p>
      <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
    </motion.div>
  );
}

function SelectFilter({ icon: Icon, value, onChange, options, all }) {
  return (
    <label className="relative block">
      <Icon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-9 text-sm font-bold text-slate-700 outline-none transition focus:border-violet-300 focus:bg-white focus:ring-4 focus:ring-violet-100"
      >
        <option value="">{all}</option>
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
    </label>
  );
}

function OrganizationChartInner() {
  const chartRef = useRef(null);
  const { fitView, zoomIn, zoomOut } = useReactFlow();
  const [profiles, setProfiles] = useState(() => getStaffProfiles());
  const [contracts, setContracts] = useState(() => getContracts());
  const [jobs, setJobs] = useState(() => getJobPositions());
  const [departments, setDepartments] = useState(() => getDepartments());
  const [branches, setBranches] = useState(() => getWorkLocations());
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [searchTerm, setSearchTerm] = useState("");
  const [collapsed, setCollapsed] = useState(() => new Set());
  const [selectedProfile, setSelectedProfile] = useState(null);

  const refresh = useCallback(() => {
    setProfiles(getStaffProfiles());
    setContracts(getContracts());
    setJobs(getJobPositions());
    setDepartments(getDepartments());
    setBranches(getWorkLocations());
  }, []);

  useEffect(() => {
    window.addEventListener("staffProfilesChanged", refresh);
    window.addEventListener("jobPositionsChanged", refresh);
    window.addEventListener("workLocationsChanged", refresh);
    window.addEventListener("departmentsChanged", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("staffProfilesChanged", refresh);
      window.removeEventListener("jobPositionsChanged", refresh);
      window.removeEventListener("workLocationsChanged", refresh);
      window.removeEventListener("departmentsChanged", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [refresh]);

  const employees = useMemo(() => mergeEmployeeSources(profiles, contracts), [profiles, contracts]);
  const filteredEmployees = useMemo(() => employees.filter((profile) => passesFilters(profile, filters)), [employees, filters]);

  const filterOptions = useMemo(() => ({
    branches: [...new Set([...branches.map((branch) => branch.name), ...employees.flatMap(getProfileBranches)].filter(Boolean))].sort(),
    departments: [...new Set([...departments, ...employees.map((profile) => profile.department)].filter(Boolean))].sort(),
    positions: [...new Set([...jobs.map((job) => job.title), ...employees.map((profile) => profile.jobTitle)].filter(Boolean))].sort(),
  }), [branches, departments, employees, jobs]);

  const toggleCollapse = useCallback((id) => {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleProfileUpdate = (updatedProfile) => {
    const saved = updateStaffProfile(updatedProfile.employeeId, updatedProfile);
    if (!saved) return;
    refresh();
    setSelectedProfile(saved);
  };

  const { nodes, edges } = useMemo(() => buildChart({
    employees: filteredEmployees,
    jobs,
    departments,
    branches,
    collapsed,
    toggleCollapse,
    onEmployeeClick: setSelectedProfile,
    searchTerm,
  }), [branches, collapsed, departments, filteredEmployees, jobs, searchTerm, toggleCollapse]);

  const kpis = useMemo(() => {
    const activeEmployees = employees.filter((profile) => !isInactive(profile));
    return {
      total: activeEmployees.length,
      management: activeEmployees.filter((profile) => isManagementPosition(profile.jobTitle, profile.department)).length,
      kitchen: activeEmployees.filter((profile) => isKitchenPosition(profile.jobTitle, profile.department)).length,
      branches: filterOptions.branches.length,
      openPositions: jobs.filter((job) => !activeEmployees.some((profile) => profile.jobTitle === job.title)).length,
      leave: activeEmployees.filter((profile) => employeeStatus(profile).label === "On Leave").length,
      training: activeEmployees.filter((profile) => employeeStatus(profile).label === "Training").length,
      morning: activeEmployees.filter((profile) => getProfileShifts(profile).includes("Morning")).length,
      evening: activeEmployees.filter((profile) => getProfileShifts(profile).includes("Evening")).length,
    };
  }, [employees, filterOptions.branches.length, jobs]);

  useEffect(() => {
    if (nodes.length < 35) {
      window.setTimeout(() => fitView({ padding: 0.18, duration: 500 }), 150);
    }
  }, [fitView, nodes.length]);

  const exportImage = async (format) => {
    if (!chartRef.current) return;
    const canvas = await html2canvas(chartRef.current, { backgroundColor: "#f8fafc", scale: 2, useCORS: true });
    if (format === "png") {
      const link = document.createElement("a");
      link.download = "Organization_Chart.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
      return;
    }
    const img = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: [canvas.width, canvas.height] });
    pdf.addImage(img, "PNG", 0, 0, canvas.width, canvas.height);
    pdf.save("Organization_Chart.pdf");
  };

  const printChart = () => {
    window.print();
  };

  return (
    <div className="mx-auto max-w-[1600px] space-y-5">
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="relative isolate px-5 py-6 sm:px-7">
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(120deg,#eff6ff_0%,#ecfdf5_48%,#fff7ed_100%)]" />
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <p className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-white/80 px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-blue-700">
                <Network size={14} />
                Organization Chart
              </p>
              <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Enterprise Workforce Hierarchy</h1>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Live hierarchy from contracts, staff profiles, configured positions, branches, and staff status assignments.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 no-print">
              <button type="button" onClick={() => exportImage("pdf")} className="btn-secondary inline-flex h-10 items-center gap-2"><Download size={16} /> PDF</button>
              <button type="button" onClick={() => exportImage("png")} className="btn-secondary inline-flex h-10 items-center gap-2"><Download size={16} /> PNG</button>
              <button type="button" onClick={printChart} className="btn-secondary inline-flex h-10 items-center gap-2"><Printer size={16} /> Print</button>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <KpiCard icon={Users} label="Total Employees" value={kpis.total} tone="bg-slate-100 text-slate-700" />
        <KpiCard icon={BriefcaseBusiness} label="Management Staff" value={kpis.management} tone="bg-emerald-50 text-emerald-700" />
        <KpiCard icon={UserCheck} label="Kitchen Staff" value={kpis.kitchen} tone="bg-rose-50 text-rose-700" />
        <KpiCard icon={Building2} label="Branches" value={kpis.branches} tone="bg-orange-50 text-orange-700" />
        <KpiCard icon={ChevronsUpDown} label="Open Positions" value={kpis.openPositions} tone="bg-violet-50 text-violet-700" />
        <KpiCard icon={CircleDot} label="On Leave" value={kpis.leave} tone="bg-yellow-50 text-yellow-700" />
        <KpiCard icon={CircleDot} label="Training" value={kpis.training} tone="bg-blue-50 text-blue-700" />
        <KpiCard icon={SunMedium} label="Morning Shift" value={kpis.morning} tone="bg-sky-50 text-sky-700" />
        <KpiCard icon={Sunset} label="Evening Shift" value={kpis.evening} tone="bg-indigo-50 text-indigo-700" />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm no-print">
        <div className="grid gap-3 xl:grid-cols-[1.4fr_repeat(6,minmax(150px,1fr))]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm font-semibold text-slate-800 outline-none transition focus:border-violet-300 focus:bg-white focus:ring-4 focus:ring-violet-100"
              placeholder="Search employee, branch, or position..."
            />
          </label>
          <SelectFilter icon={Building2} value={filters.branch} onChange={(value) => setFilters({ ...filters, branch: value })} options={filterOptions.branches} all="All branches" />
          <SelectFilter icon={BriefcaseBusiness} value={filters.department} onChange={(value) => setFilters({ ...filters, department: value })} options={filterOptions.departments} all="All departments" />
          <SelectFilter icon={Filter} value={filters.position} onChange={(value) => setFilters({ ...filters, position: value })} options={filterOptions.positions} all="All positions" />
          <SelectFilter icon={Users} value={filters.group} onChange={(value) => setFilters({ ...filters, group: value })} options={["management", "kitchen"]} all="All staff groups" />
          <SelectFilter icon={SunMedium} value={filters.shift} onChange={(value) => setFilters({ ...filters, shift: value })} options={["Morning", "Evening"]} all="All shifts" />
          <SelectFilter icon={CircleDot} value={filters.status} onChange={(value) => setFilters({ ...filters, status: value || "active" })} options={["active", "inactive"]} all="All statuses" />
        </div>
      </section>

      <section ref={chartRef} className="relative h-[78vh] min-h-[680px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-sm">
        <div className="absolute left-4 top-4 z-10 flex gap-2 no-print">
          <button type="button" onClick={() => zoomIn({ duration: 180 })} className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-slate-700 shadow-sm ring-1 ring-slate-200" title="Zoom in">+</button>
          <button type="button" onClick={() => zoomOut({ duration: 180 })} className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-slate-700 shadow-sm ring-1 ring-slate-200" title="Zoom out">-</button>
          <button type="button" onClick={() => fitView({ padding: 0.18, duration: 500 })} className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-slate-700 shadow-sm ring-1 ring-slate-200" title="Fit view">
            <Maximize2 size={16} />
          </button>
        </div>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          minZoom={0.18}
          maxZoom={1.7}
          defaultViewport={{ x: 260, y: 40, zoom: 0.55 }}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable
          onlyRenderVisibleElements
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#dbeafe" gap={28} />
          <MiniMap className="!bg-white !shadow-lg no-print" pannable zoomable nodeStrokeWidth={3} />
          <Controls className="!shadow-lg no-print" showInteractive={false} />
        </ReactFlow>
      </section>

      {selectedProfile && (
        <StaffProfileModal
          key={selectedProfile.employeeId || selectedProfile.contractNumber}
          profile={selectedProfile}
          profiles={employees}
          initialTab="overview"
          onProfileUpdate={handleProfileUpdate}
          onClose={() => setSelectedProfile(null)}
        />
      )}
    </div>
  );
}

export default function OrganizationChart() {
  return (
    <ReactFlowProvider>
      <OrganizationChartInner />
    </ReactFlowProvider>
  );
}

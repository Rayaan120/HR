import { useState } from "react";
import {
  BadgeCheck,
  Camera,
  CalendarDays,
  Clock3,
  Download,
  FileCheck2,
  Pencil,
  Plus,
  Printer,
  Save,
  Trash2,
  TrendingUp,
  Upload,
  X,
} from "lucide-react";
import { exportToPDF, printDocument } from "../utils/pdfGenerator";
import { STAFF_PROFILE_TABS } from "../utils/staffProfileTabs";

const formatDate = (value) => {
  if (!value) return "Not provided";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const formatMoney = (value) => {
  const amount = Number(String(value ?? 0).replace(/,/g, ""));
  return `${(Number.isFinite(amount) ? amount : 0).toLocaleString("en-US")} VND`;
};

const createDocumentPlaceholder = () => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  title: "",
  fileName: "",
  fileData: "",
});

const InfoField = ({ label, value, wide = false }) => (
  <div className={wide ? "md:col-span-2 xl:col-span-3" : ""}>
    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">{label}</p>
    <p className="mt-1 break-words text-sm font-semibold leading-6 text-slate-800">{value || "Not provided"}</p>
  </div>
);

const SectionCard = ({ title, subtitle, children }) => (
  <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
    <div className="mb-5 border-b border-slate-100 pb-4">
      <h3 className="font-bold text-slate-900">{title}</h3>
      {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
    </div>
    {children}
  </section>
);

const EditField = ({ label, name, value, onChange, type = "text", options, wide = false }) => (
  <label className={wide ? "sm:col-span-2" : ""}>
    <span className="mb-1.5 block text-xs font-bold text-slate-600">{label}</span>
    {options ? (
      <select name={name} value={value ?? ""} onChange={onChange} className="input-field">
        {options.map((option) => <option key={option} value={option}>{option || "Select"}</option>)}
      </select>
    ) : name === "address" ? (
      <textarea name={name} value={value ?? ""} onChange={onChange} rows="3" className="input-field resize-none" />
    ) : (
      <input type={type} name={name} value={value ?? ""} onChange={onChange} className="input-field" />
    )}
  </label>
);

export default function StaffProfileModal({
  profile,
  onClose,
  onProfileUpdate,
  initialTab = "overview",
  embedded = false,
  profiles = [],
  onSelectProfile,
}) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [profilePhoto, setProfilePhoto] = useState(profile?.profilePhoto || "");
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState(profile || {});
  if (!profile) return null;

  const workLocation = [profile.workLocation1, profile.workLocation2, profile.workLocation3]
    .filter(Boolean)
    .join("; ") || profile.workLocation || profile.branch || "Not provided";
  const joiningDate = profile.joiningDate || profile.contractStartDate || profile.dateOfSigning;
  const activeTabLabel = STAFF_PROFILE_TABS.find((tab) => tab.id === activeTab)?.label || "Profile";
  const initials = String(profile.fullName || "Employee")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  const handleExportPDF = () => {
    exportToPDF("staff-profile-print", `Profile_${profile.employeeId}.pdf`);
  };

  const handlePrint = () => {
    printDocument("staff-profile-print");
  };

  const handleProfilePhoto = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert("Please select an image smaller than 2 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const sourceImage = new Image();
      sourceImage.onload = () => {
        const passportRatio = 7 / 9;
        const sourceRatio = sourceImage.width / sourceImage.height;
        let sourceX = 0;
        let sourceY = 0;
        let sourceWidth = sourceImage.width;
        let sourceHeight = sourceImage.height;

        if (sourceRatio > passportRatio) {
          sourceWidth = sourceImage.height * passportRatio;
          sourceX = (sourceImage.width - sourceWidth) / 2;
        } else {
          sourceHeight = sourceImage.width / passportRatio;
          sourceY = (sourceImage.height - sourceHeight) / 2;
        }

        const canvas = document.createElement("canvas");
        canvas.width = 700;
        canvas.height = 900;
        const context = canvas.getContext("2d");
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(sourceImage, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height);

        const passportPhoto = canvas.toDataURL("image/jpeg", 0.9);
        setProfilePhoto(passportPhoto);
        onProfileUpdate?.({ ...profile, profilePhoto: passportPhoto });
      };
      sourceImage.src = String(reader.result || "");
    };
    reader.readAsDataURL(file);
  };

  const startEditing = () => {
    const savedDocuments = Array.isArray(profile.employeeDocuments) ? profile.employeeDocuments : [];
    setEditForm({
      ...profile,
      employeeDocuments: activeTab === "documents" && !savedDocuments.length
        ? Array.from({ length: 3 }, createDocumentPlaceholder)
        : savedDocuments,
    });
    setIsEditing(true);
  };

  const handleEditChange = (event) => {
    const { name, value } = event.target;
    setEditForm((current) => ({ ...current, [name]: value }));
  };

  const saveProfileChanges = (event) => {
    event.preventDefault();
    const employeeDocuments = (editForm.employeeDocuments || []).filter((document) =>
      document.title?.trim() || document.fileData
    );
    onProfileUpdate?.({ ...profile, ...editForm, employeeDocuments, profilePhoto });
    setIsEditing(false);
  };

  const updateEmployeeDocument = (index, updates) => {
    setEditForm((current) => ({
      ...current,
      employeeDocuments: (current.employeeDocuments || []).map((document, documentIndex) =>
        documentIndex === index ? { ...document, ...updates } : document
      ),
    }));
  };

  const addEmployeeDocument = () => {
    setEditForm((current) => ({
      ...current,
      employeeDocuments: [...(current.employeeDocuments || []), createDocumentPlaceholder()],
    }));
  };

  const removeEmployeeDocument = (index) => {
    setEditForm((current) => ({
      ...current,
      employeeDocuments: (current.employeeDocuments || []).filter((_, documentIndex) => documentIndex !== index),
    }));
  };

  const handleEmployeeDocumentFile = (index, file) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert("Please select a document smaller than 2 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => updateEmployeeDocument(index, {
      fileName: file.name,
      fileType: file.type,
      fileData: String(reader.result || ""),
    });
    reader.readAsDataURL(file);
  };

  const selectTab = (tabId) => {
    setIsEditing(false);
    setActiveTab(tabId);
  };

  const renderInlineEditor = () => {
    const configurations = {
      overview: {
        title: "Personal & Contact Information",
        fields: [
          { label: "Full Name", name: "fullName" },
          { label: "Gender", name: "gender", options: ["", "Male", "Female", "Other"] },
          { label: "Date of Birth", name: "dob", type: "date" },
          { label: "Nationality", name: "nationality" },
          { label: "ID / Passport Number", name: "idNumber" },
          { label: "Phone Number", name: "phoneNumber" },
          { label: "Email Address", name: "email", type: "email" },
          { label: "Residential Address", name: "address", wide: true },
        ],
      },
      employment: {
        title: "Employment Information",
        fields: [
          { label: "Job Title", name: "jobTitle" },
          { label: "Department", name: "department" },
          { label: "Contract Type", name: "contractType" },
          { label: "Contract Status", name: "contractStatus", options: ["Signed", "Active", "On Hold", "Expired", "Terminated"] },
          { label: "Contract Start Date", name: "contractStartDate", type: "date" },
          { label: "Contract End Date", name: "contractEndDate", type: "date" },
          { label: "Probation Period (Months)", name: "probationPeriod", type: "number" },
          { label: "Probation Start Date", name: "probationStartDate", type: "date" },
          { label: "Probation End Date", name: "probationEndDate", type: "date" },
        ],
      },
      financial: {
        title: "Salary & Benefits",
        columns: "lg:grid-cols-3",
        fields: [
          { label: "Base Salary", name: "baseSalary", type: "number" },
          { label: "Meal Allowance", name: "mealAllowance", type: "number" },
          { label: "Transportation Allowance", name: "transportAllowance", type: "number" },
          { label: "Uniform Allowance", name: "clothesAllowance", type: "number" },
          { label: "PR Allowance", name: "prAllowance", type: "number" },
          { label: "Medical Allowance", name: "medicalAllowance", type: "number" },
          { label: "Reliability Allowance", name: "reliabilityAllowance", type: "number" },
          { label: "Responsibility KPI", name: "kpiAllowance", type: "number" },
          { label: "Gross Salary", name: "grossSalary", type: "number" },
          { label: "Total Insurance", name: "totalInsurance", type: "number" },
          { label: "Personal Income Tax", name: "personalIncomeTaxAmount", type: "number" },
          { label: "Net Salary", name: "netSalary", type: "number" },
        ],
      },
      performance: {
        title: "Performance & Role Expectations",
        fields: [
          { label: "Role Responsibilities", name: "jobDescriptionHeading", multiline: true, wide: true },
          { label: "Performance Monitoring Notes", name: "performanceMonitoringClause", multiline: true, wide: true },
        ],
      },
      roster: {
        title: "Work Roster & Locations",
        fields: [
          { label: "Work Location 1", name: "workLocation1", wide: true },
          { label: "Work Location 2", name: "workLocation2", wide: true },
          { label: "Work Location 3", name: "workLocation3", wide: true },
          { label: "Working Days", name: "workingDays" },
          { label: "Morning Shift", name: "morningShift" },
          { label: "Afternoon Shift", name: "afternoonShift" },
          { label: "Probation Start Time", name: "probationStartTime", type: "time" },
          { label: "Probation End Time", name: "probationEndTime", type: "time" },
        ],
      },
      documents: {
        title: "Document Information",
        fields: [
          { label: "Contract Number", name: "contractNumber" },
          { label: "Document Status", name: "contractStatus", options: ["Signed", "Active", "On Hold", "Expired", "Terminated"] },
          { label: "Signed Date", name: "dateOfSigning", type: "date" },
          { label: "Prepared By", name: "preparedBy" },
        ],
      },
    };
    const configuration = configurations[activeTab];

    if (activeTab === "documents") {
      const employeeDocuments = editForm.employeeDocuments || [];
      return (
        <form id="staff-profile-inline-editor" onSubmit={saveProfileChanges} className="space-y-5">
          <section className="rounded-2xl border border-violet-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 border-b border-slate-100 pb-4">
              <h3 className="font-bold text-slate-900">Edit Document Information</h3>
              <p className="mt-1 text-sm text-slate-500">Update contract details and attach titled employee documents.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {configuration.fields.map((field) => <EditField key={field.name} {...field} value={editForm[field.name]} onChange={handleEditChange} />)}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div><h3 className="font-bold text-slate-900">Additional Documents</h3><p className="mt-1 text-sm text-slate-500">Give every document a clear title, then select its file.</p></div>
              <button type="button" onClick={addEmployeeDocument} className="btn-secondary flex w-fit items-center gap-2"><Plus size={16} /> Add Document</button>
            </div>
            <div className="space-y-3">
              {employeeDocuments.map((document, index) => (
                <div key={document.id || index} className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
                  <label><span className="mb-1.5 block text-xs font-bold text-slate-600">Document Title</span><input type="text" value={document.title || ""} onChange={(event) => updateEmployeeDocument(index, { title: event.target.value })} placeholder="e.g. Passport, Visa, Certificate" className="input-field bg-white" /></label>
                  <label><span className="mb-1.5 block text-xs font-bold text-slate-600">Document File</span><span className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white px-3 text-sm font-medium text-slate-600 hover:border-violet-400 hover:text-violet-700"><Upload size={16} /><span className="truncate">{document.fileName || "Choose file"}</span><input type="file" className="sr-only" onChange={(event) => handleEmployeeDocumentFile(index, event.target.files?.[0])} /></span></label>
                  <button type="button" onClick={() => removeEmployeeDocument(index)} className="flex h-11 w-11 items-center justify-center rounded-lg border border-rose-200 bg-white text-rose-500 hover:bg-rose-50" aria-label={`Remove document ${index + 1}`}><Trash2 size={17} /></button>
                </div>
              ))}
            </div>
          </section>
        </form>
      );
    }

    return (
      <form id="staff-profile-inline-editor" onSubmit={saveProfileChanges} className="rounded-2xl border border-violet-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5 border-b border-slate-100 pb-4">
          <h3 className="font-bold text-slate-900">Edit {configuration.title}</h3>
          <p className="mt-1 text-sm text-slate-500">Only fields belonging to the {activeTabLabel} tab are shown.</p>
        </div>
        <div className={`grid gap-4 sm:grid-cols-2 ${configuration.columns || ""}`}>
          {configuration.fields.map((field) => (
            <EditField key={field.name} {...field} value={editForm[field.name]} onChange={handleEditChange} />
          ))}
        </div>
      </form>
    );
  };

  const renderTabContent = () => {
    if (activeTab === "employment") {
      return (
        <div className="grid gap-5 xl:grid-cols-2">
          <SectionCard title="Employment Details" subtitle="Current role and signed contract information">
            <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
              <InfoField label="Employee ID" value={profile.employeeId} />
              <InfoField label="Contract Number" value={profile.contractNumber} />
              <InfoField label="Job Title" value={profile.jobTitle} />
              <InfoField label="Department" value={profile.department} />
              <InfoField label="Contract Type" value={profile.contractType} />
              <InfoField label="Contract Status" value={profile.contractStatus || "Signed"} />
              <InfoField label="Start Date" value={formatDate(joiningDate)} />
              <InfoField label="End Date" value={formatDate(profile.contractEndDate)} />
              <InfoField label="Work Location" value={workLocation} wide />
            </div>
          </SectionCard>
          <SectionCard title="Probation" subtitle="Probation dates, schedule and remuneration terms">
            <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
              <InfoField label="Period" value={`${profile.probationPeriod || 0} months`} />
              <InfoField label="Status" value="Recorded in contract" />
              <InfoField label="Start Date" value={formatDate(profile.probationStartDate)} />
              <InfoField label="End Date" value={formatDate(profile.probationEndDate)} />
              <InfoField label="Working Days" value={profile.probationWorkingTime || profile.workingDays} />
              <InfoField label="Working Time" value={`${profile.probationStartTime || "08:00"} – ${profile.probationEndTime || "17:00"}`} />
            </div>
          </SectionCard>
        </div>
      );
    }

    if (activeTab === "financial") {
      const salaryItems = [
        ["Base Salary", profile.baseSalary],
        ["Meal Allowance", profile.mealAllowance],
        ["Transportation Allowance", profile.transportAllowance],
        ["Uniform Allowance", profile.clothesAllowance],
        ["PR Allowance", profile.prAllowance],
        ["Medical Allowance", profile.medicalAllowance],
        ["Reliability Allowance", profile.reliabilityAllowance],
        ["Responsibility KPI", profile.kpiAllowance],
      ];
      return (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              ["Gross Salary", profile.grossSalary, "bg-violet-50 text-violet-700"],
              ["Total Insurance", profile.totalInsurance, "bg-sky-50 text-sky-700"],
              ["Net Salary", profile.netSalary, "bg-emerald-50 text-emerald-700"],
            ].map(([label, value, color]) => (
              <div key={label} className={`rounded-2xl border border-white p-5 shadow-sm ${color}`}>
                <p className="text-xs font-bold uppercase tracking-wider opacity-70">{label}</p>
                <p className="mt-2 text-xl font-extrabold">{formatMoney(value)}</p>
              </div>
            ))}
          </div>
          <SectionCard title="Salary Breakdown" subtitle="Monthly remuneration recorded in the signed contract">
            <div className="overflow-hidden rounded-xl border border-slate-200">
              {salaryItems.map(([label, value], index) => (
                <div key={label} className={`flex items-center justify-between gap-4 px-4 py-3 text-sm ${index ? "border-t border-slate-100" : ""}`}>
                  <span className="font-medium text-slate-600">{label}</span>
                  <span className="font-bold text-slate-900">{formatMoney(value)}</span>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      );
    }

    if (activeTab === "performance") {
      return (
        <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
          <SectionCard title="Role Expectations" subtitle="Responsibilities captured when the contract was signed">
            <p className="whitespace-pre-line text-sm leading-7 text-slate-700">
              {profile.jobDescriptionHeading || "No role description has been recorded for this employee."}
            </p>
          </SectionCard>
          <SectionCard title="Performance Summary" subtitle="Review activity for this employee">
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center">
              <TrendingUp className="mx-auto text-violet-500" size={30} />
              <p className="mt-3 font-bold text-slate-800">No reviews recorded yet</p>
              <p className="mt-1 text-sm leading-6 text-slate-500">Performance reviews and KPI results will appear here.</p>
            </div>
          </SectionCard>
        </div>
      );
    }

    if (activeTab === "roster") {
      return (
        <div className="grid gap-5 xl:grid-cols-2">
          <SectionCard title="Standard Work Schedule" subtitle="Working arrangement specified in the contract">
            <div className="space-y-4">
              <div className="flex items-start gap-4 rounded-xl bg-violet-50 p-4">
                <CalendarDays className="mt-0.5 shrink-0 text-violet-600" size={21} />
                <div><p className="text-xs font-bold uppercase tracking-wider text-violet-500">Working Days</p><p className="mt-1 font-bold text-slate-900">{profile.workingDays || "Not provided"}</p></div>
              </div>
              <div className="flex items-start gap-4 rounded-xl bg-sky-50 p-4">
                <Clock3 className="mt-0.5 shrink-0 text-sky-600" size={21} />
                <div><p className="text-xs font-bold uppercase tracking-wider text-sky-500">Daily Hours</p><p className="mt-1 font-bold text-slate-900">{profile.morningShift || "—"} and {profile.afternoonShift || "—"}</p></div>
              </div>
            </div>
          </SectionCard>
          <SectionCard title="Roster Assignment" subtitle="Current placement and availability">
            <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
              <InfoField label="Work Location" value={workLocation} wide />
              <InfoField label="Department" value={profile.department} />
              <InfoField label="Position" value={profile.jobTitle} />
              <InfoField label="Roster Status" value="Active" />
            </div>
          </SectionCard>
        </div>
      );
    }

    if (activeTab === "documents") {
      const employeeDocuments = Array.isArray(profile.employeeDocuments) ? profile.employeeDocuments : [];
      return (
        <SectionCard title="Employee Documents" subtitle="Contracts and employee files associated with this profile">
          <div className="flex flex-col gap-4 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><FileCheck2 size={22} /></div>
              <div><p className="font-bold text-slate-900">Signed Employment Contract</p><p className="mt-1 text-sm text-slate-500">{profile.contractNumber || "Contract number not provided"}</p></div>
            </div>
            <span className="w-fit rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">Signed</span>
          </div>
          <div className="mt-4 space-y-3">
            {employeeDocuments.length ? employeeDocuments.map((document) => (
              <div key={document.id || `${document.title}-${document.fileName}`} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-600"><FileCheck2 size={19} /></div><div className="min-w-0"><p className="truncate font-bold text-slate-900">{document.title || "Untitled Document"}</p><p className="mt-0.5 truncate text-xs text-slate-500">{document.fileName || "File not uploaded"}</p></div></div>
                {document.fileData && <a href={document.fileData} download={document.fileName || document.title || "document"} className="btn-secondary flex w-fit items-center gap-2"><Download size={15} /> Download</a>}
              </div>
            )) : (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm leading-6 text-slate-500">Click Edit Documents to add titled employee files.</div>
            )}
          </div>
        </SectionCard>
      );
    }

    return (
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-violet-100 bg-violet-50 p-4"><p className="text-xs font-bold uppercase tracking-wider text-violet-500">Employment</p><p className="mt-2 font-bold text-slate-900">{profile.jobTitle || "Not provided"}</p><p className="mt-1 text-sm text-slate-500">{profile.department || "No department"}</p></div>
          <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4"><p className="text-xs font-bold uppercase tracking-wider text-sky-500">Work Location</p><p className="mt-2 line-clamp-2 font-bold text-slate-900">{workLocation}</p></div>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4"><p className="text-xs font-bold uppercase tracking-wider text-emerald-600">Contract Status</p><p className="mt-2 flex items-center gap-2 font-bold text-slate-900"><BadgeCheck size={18} className="text-emerald-600" /> {profile.contractStatus || "Signed"}</p></div>
        </div>
        <SectionCard title="Basic Information" subtitle="Personal and contact information from the signed contract">
          <div className="grid gap-x-8 gap-y-5 md:grid-cols-2 xl:grid-cols-3">
            <InfoField label="Full Name" value={profile.fullName} />
            <InfoField label="Gender" value={profile.gender} />
            <InfoField label="Date of Birth" value={formatDate(profile.dob)} />
            <InfoField label="ID Number" value={profile.idNumber} />
            <InfoField label="Nationality" value={profile.nationality} />
            <InfoField label="Employee Since" value={formatDate(joiningDate)} />
            <InfoField label="Phone Number" value={profile.phoneNumber} />
            <InfoField label="Email Address" value={profile.email} />
            <InfoField label="Residential Address" value={profile.address} wide />
          </div>
        </SectionCard>
      </div>
    );
  };

  return (
    <div className={embedded ? "relative h-[calc(100vh-3.25rem)] bg-slate-100" : "fixed inset-0 z-[70] bg-slate-950/55 p-2 backdrop-blur-sm sm:p-4 lg:p-6"}>
      <div id="staff-profile-print" className={embedded ? "flex h-full w-full overflow-hidden bg-slate-100" : "mx-auto flex h-full max-w-[1500px] overflow-hidden rounded-2xl bg-slate-100 shadow-2xl"}>
        <aside className="hidden w-72 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
          <div className="border-b border-slate-100 p-6">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-violet-500">Employee Profile</p>
            <div className="relative mt-5 h-36 w-28">
              {profilePhoto ? (
                <img src={profilePhoto} alt={`${profile.fullName || "Employee"} passport profile`} className="h-36 w-28 rounded-2xl object-cover shadow-lg shadow-violet-200" />
              ) : (
                <div className="flex h-36 w-28 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 text-3xl font-black text-white shadow-lg shadow-violet-200">{initials || "E"}</div>
              )}
              {activeTab === "overview" && (
                <label className="absolute -bottom-2 -right-2 flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border-2 border-white bg-slate-900 text-white shadow-md transition hover:bg-violet-700" title={profilePhoto ? "Change profile picture" : "Add profile picture"}>
                  <Camera size={16} />
                  <input type="file" accept="image/*" onChange={handleProfilePhoto} className="sr-only" />
                </label>
              )}
            </div>
            <h2 className="mt-5 text-xl font-extrabold leading-tight text-slate-900">{profile.fullName || "Employee"}</h2>
            <p className="mt-1 text-sm font-semibold text-violet-600">{profile.jobTitle || "Position not provided"}</p>
            <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700"><BadgeCheck size={14} /> Active</span>
            {activeTab === "overview" && (
              <label className="mt-3 flex w-fit cursor-pointer items-center gap-2 text-xs font-bold text-violet-600 transition hover:text-violet-800">
                <Camera size={14} /> {profilePhoto ? "Change profile picture" : "Add profile picture"}
                <input type="file" accept="image/*" onChange={handleProfilePhoto} className="sr-only" />
              </label>
            )}
          </div>
          <nav className="flex-1 space-y-1 overflow-y-auto p-4">
            {STAFF_PROFILE_TABS.map(({ id, label, icon: Icon }, index) => (
              <button key={id} type="button" onClick={() => selectTab(id)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold transition ${activeTab === id ? "bg-violet-600 text-white shadow-md shadow-violet-200" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`}>
                <span className={`text-[10px] ${activeTab === id ? "text-violet-200" : "text-slate-400"}`}>{String(index + 1).padStart(2, "0")}</span><Icon size={18} /><span>{label}</span>
              </button>
            ))}
          </nav>
          <div className="border-t border-slate-100 p-5 text-xs text-slate-500">
            {embedded && profiles.length > 1 && (
              <label className="mb-4 block">
                <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Switch Employee</span>
                <select value={profile.employeeId} onChange={(event) => onSelectProfile?.(event.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-violet-400">
                  {profiles.map((employee) => <option key={employee.employeeId} value={employee.employeeId}>{employee.fullName || employee.employeeId}</option>)}
                </select>
              </label>
            )}
            <p className="font-bold text-slate-700">{profile.employeeId}</p><p className="mt-1">{profile.contractNumber}</p>
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <header className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-3 lg:hidden">
                  <label className="relative shrink-0 cursor-pointer" title={profilePhoto ? "Change profile picture" : "Add profile picture"}>
                    {profilePhoto ? <img src={profilePhoto} alt="" className="h-[3.2rem] w-10 rounded-lg object-cover" /> : <span className="flex h-[3.2rem] w-10 items-center justify-center rounded-lg bg-violet-600 font-extrabold text-white">{initials || "E"}</span>}
                    {activeTab === "overview" && <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-md bg-slate-900 text-white"><Camera size={10} /></span>}
                    {activeTab === "overview" && <input type="file" accept="image/*" onChange={handleProfilePhoto} className="sr-only" />}
                  </label>
                  <div className="min-w-0"><h2 className="truncate font-extrabold text-slate-900">{profile.fullName}</h2><p className="truncate text-xs text-slate-500">{profile.employeeId}</p></div>
                </div>
                <h1 className="hidden text-2xl font-extrabold text-slate-900 lg:block">Staff Profile</h1>
              </div>
              <div className="flex shrink-0 items-center gap-2 no-print">
                {isEditing ? (
                  <>
                    <button type="button" onClick={() => setIsEditing(false)} className="btn-secondary">Cancel</button>
                    <button type="submit" form="staff-profile-inline-editor" className="btn-primary flex items-center gap-2"><Save size={17} /> <span className="hidden sm:inline">Save {activeTabLabel}</span></button>
                  </>
                ) : (
                  <button type="button" onClick={startEditing} className="btn-primary flex items-center gap-2"><Pencil size={17} /> <span className="hidden sm:inline">Edit {activeTabLabel}</span></button>
                )}
                <button type="button" onClick={handlePrint} className="btn-secondary hidden items-center gap-2 sm:flex"><Printer size={17} /> Print</button>
                <button type="button" onClick={handleExportPDF} className="btn-secondary hidden items-center gap-2 sm:flex"><Download size={17} /> Export</button>
                {!embedded && <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900" aria-label="Close profile"><X size={20} /></button>}
              </div>
            </div>
            <div className="mt-4 flex gap-2 overflow-x-auto pb-1 lg:hidden">
              {STAFF_PROFILE_TABS.map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => selectTab(id)} className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold ${activeTab === id ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-600"}`}><Icon size={15} />{label}</button>)}
            </div>
          </header>
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <div className="mx-auto max-w-6xl">
              <div className="mb-6"><p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-500">{STAFF_PROFILE_TABS.find((tab) => tab.id === activeTab)?.label}</p><h2 className="mt-1 text-xl font-extrabold text-slate-900">{activeTab === "overview" ? `Welcome, ${String(profile.fullName || "Employee").split(" ").at(-1)}` : `${STAFF_PROFILE_TABS.find((tab) => tab.id === activeTab)?.label} Details`}</h2></div>
              {isEditing ? renderInlineEditor() : renderTabContent()}
            </div>
          </div>
        </main>

        {isEditing && !embedded && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/50 p-3 backdrop-blur-sm sm:p-6">
            <form onSubmit={saveProfileChanges} className="flex max-h-full w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
                <div><h2 className="text-xl font-extrabold text-slate-900">Edit Employee Profile</h2><p className="mt-1 text-sm text-slate-500">Update employee information across all profile tabs.</p></div>
                <button type="button" onClick={() => setIsEditing(false)} className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-100" aria-label="Close editor"><X size={19} /></button>
              </div>

              <div className="flex-1 space-y-6 overflow-y-auto bg-slate-50 p-5 sm:p-6">
                <section className="rounded-2xl border border-slate-200 bg-white p-5">
                  <h3 className="mb-4 font-bold text-slate-900">Personal Information</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <EditField label="Full Name" name="fullName" value={editForm.fullName} onChange={handleEditChange} />
                    <EditField label="Gender" name="gender" value={editForm.gender} onChange={handleEditChange} options={["", "Male", "Female", "Other"]} />
                    <EditField label="Date of Birth" name="dob" value={editForm.dob} onChange={handleEditChange} type="date" />
                    <EditField label="Nationality" name="nationality" value={editForm.nationality} onChange={handleEditChange} />
                    <EditField label="ID / Passport Number" name="idNumber" value={editForm.idNumber} onChange={handleEditChange} />
                    <EditField label="Phone Number" name="phoneNumber" value={editForm.phoneNumber} onChange={handleEditChange} />
                    <EditField label="Email Address" name="email" value={editForm.email} onChange={handleEditChange} type="email" />
                    <EditField label="Residential Address" name="address" value={editForm.address} onChange={handleEditChange} wide />
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5">
                  <h3 className="mb-4 font-bold text-slate-900">Employment & Work Schedule</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <EditField label="Job Title" name="jobTitle" value={editForm.jobTitle} onChange={handleEditChange} />
                    <EditField label="Department" name="department" value={editForm.department} onChange={handleEditChange} />
                    <EditField label="Contract Type" name="contractType" value={editForm.contractType} onChange={handleEditChange} />
                    <EditField label="Contract Status" name="contractStatus" value={editForm.contractStatus} onChange={handleEditChange} options={["Signed", "Active", "On Hold", "Expired", "Terminated"]} />
                    <EditField label="Contract Start Date" name="contractStartDate" value={editForm.contractStartDate} onChange={handleEditChange} type="date" />
                    <EditField label="Contract End Date" name="contractEndDate" value={editForm.contractEndDate} onChange={handleEditChange} type="date" />
                    <EditField label="Work Location 1" name="workLocation1" value={editForm.workLocation1} onChange={handleEditChange} wide />
                    <EditField label="Work Location 2" name="workLocation2" value={editForm.workLocation2} onChange={handleEditChange} wide />
                    <EditField label="Work Location 3" name="workLocation3" value={editForm.workLocation3} onChange={handleEditChange} wide />
                    <EditField label="Working Days" name="workingDays" value={editForm.workingDays} onChange={handleEditChange} />
                    <EditField label="Morning Shift" name="morningShift" value={editForm.morningShift} onChange={handleEditChange} />
                    <EditField label="Afternoon Shift" name="afternoonShift" value={editForm.afternoonShift} onChange={handleEditChange} />
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5">
                  <h3 className="mb-4 font-bold text-slate-900">Financial Information</h3>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <EditField label="Base Salary" name="baseSalary" value={editForm.baseSalary} onChange={handleEditChange} type="number" />
                    <EditField label="Meal Allowance" name="mealAllowance" value={editForm.mealAllowance} onChange={handleEditChange} type="number" />
                    <EditField label="Transportation Allowance" name="transportAllowance" value={editForm.transportAllowance} onChange={handleEditChange} type="number" />
                    <EditField label="Uniform Allowance" name="clothesAllowance" value={editForm.clothesAllowance} onChange={handleEditChange} type="number" />
                    <EditField label="PR Allowance" name="prAllowance" value={editForm.prAllowance} onChange={handleEditChange} type="number" />
                    <EditField label="Medical Allowance" name="medicalAllowance" value={editForm.medicalAllowance} onChange={handleEditChange} type="number" />
                    <EditField label="Gross Salary" name="grossSalary" value={editForm.grossSalary} onChange={handleEditChange} type="number" />
                    <EditField label="Total Insurance" name="totalInsurance" value={editForm.totalInsurance} onChange={handleEditChange} type="number" />
                    <EditField label="Personal Income Tax" name="personalIncomeTaxAmount" value={editForm.personalIncomeTaxAmount} onChange={handleEditChange} type="number" />
                    <EditField label="Net Salary" name="netSalary" value={editForm.netSalary} onChange={handleEditChange} type="number" />
                  </div>
                </section>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:px-6">
                <button type="button" onClick={() => setIsEditing(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary flex items-center gap-2"><Save size={17} /> Save Changes</button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

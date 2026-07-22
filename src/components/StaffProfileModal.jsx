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

const AssetIndicator = ({ checked }) => (
  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs font-black ${checked ? "border-violet-600 bg-violet-600 text-white" : "border-slate-300 bg-white text-transparent"}`}>
    ✓
  </span>
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
    const { checked, name, type, value } = event.target;
    setEditForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
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
        title: "Personal, Contact & Emergency Information",
        fields: [
          { label: "Full Name", name: "fullName" },
          { label: "Gender", name: "gender", options: ["", "Male", "Female", "Other"] },
          { label: "Date of Birth", name: "dob", type: "date" },
          { label: "Nationality", name: "nationality" },
          { label: "ID / Passport Number", name: "idNumber" },
          { label: "Phone Number", name: "phoneNumber" },
          { label: "Email Address", name: "email", type: "email" },
          { label: "Residential Address", name: "address", wide: true },
          { label: "Emergency Contact Name", name: "emergencyContactName" },
          { label: "Emergency Contact Relationship", name: "emergencyContactRelationship" },
          { label: "Emergency Contact Address", name: "emergencyContactAddress", wide: true },
        ],
      },
      employment: {
        title: "Position, Joining & Contract details",
        fields: [
          { label: "Position / Job Title", name: "jobTitle" },
          { label: "Starting Date / Joining Date", name: "joiningDate", type: "date" },
          { label: "Location of Work", name: "workLocation" },
          { label: "Working Days", name: "workingDays" },
          { label: "Morning Shift", name: "morningShift" },
          { label: "Afternoon Shift", name: "afternoonShift" },
          { label: "Probation Start Date", name: "probationStartDate", type: "date" },
          { label: "Probation End Date", name: "probationEndDate", type: "date" },
          { label: "Probation Base Salary", name: "probationSalary", type: "number" },
          { label: "Probation Meal Allowance", name: "probationMealAllowance", type: "number" },
          { label: "Probation Uniform Allowance", name: "probationUniformAllowance", type: "number" },
          { label: "Probation PR Allowance", name: "probationPrAllowance", type: "number" },
          { label: "Probation Transport Allowance", name: "probationTransportAllowance", type: "number" },
          { label: "Probation Medical Allowance", name: "probationMedicalAllowance", type: "number" },
          { label: "Contract Start Date", name: "contractStartDate", type: "date" },
          { label: "Contract End Date", name: "contractEndDate", type: "date" },
        ],
      },
      financial: {
        title: "Bank Details & Salary Summary",
        fields: [
          { label: "Account Name", name: "bankAccountName" },
          { label: "Bank Name", name: "bankName" },
          { label: "Account Number", name: "bankAccountNumber" },
          { label: "Base Salary", name: "baseSalary", type: "number" },
          { label: "Meal Allowance", name: "mealAllowance", type: "number" },
          { label: "Position Allowance", name: "positionAllowance", type: "number" },
          { label: "Bonus", name: "bonus", type: "number" },
        ],
      },
      performance: {
        title: "Attendance & Time Tracking",
        fields: [
          { label: "On-Time Rate", name: "onTimeRate" },
          { label: "Late Arrivals", name: "lateArrivals", type: "number" },
          { label: "Leave Taken", name: "leaveTaken", type: "number" },
          { label: "Leave Balance", name: "leaveBalance", type: "number" },
        ],
      },
      roster: {
        title: "Work Roster Details",
        fields: [],
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
        {activeTab === "employment" && (
          <div className="mt-6 border-t border-slate-100 pt-6">
            <div className="mb-4">
              <h3 className="font-bold text-slate-900">Asset Handing Over Details</h3>
              <p className="mt-1 text-sm text-slate-500">Record uniforms, devices, and other items handed over to the employee.</p>
            </div>
            <div className="grid gap-5 lg:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Uniform</p>
                <div className="space-y-3">
                  <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-[auto_1fr_1fr] sm:items-end">
                    <label className="flex items-center gap-2 pb-2 text-sm font-bold text-slate-700 sm:pb-2.5"><input type="checkbox" name="assetUniformShirt" checked={Boolean(editForm.assetUniformShirt)} onChange={handleEditChange} className="h-4 w-4 accent-violet-600" /> Shirt</label>
                    <EditField label="Size" name="assetUniformShirtSize" value={editForm.assetUniformShirtSize} onChange={handleEditChange} />
                    <EditField label="Quantity" name="assetUniformShirtQuantity" value={editForm.assetUniformShirtQuantity} onChange={handleEditChange} type="number" />
                  </div>
                  <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-[1fr_1fr] sm:items-end">
                    <label className="flex items-center gap-2 pb-2 text-sm font-bold text-slate-700 sm:pb-2.5"><input type="checkbox" name="assetUniformCap" checked={Boolean(editForm.assetUniformCap)} onChange={handleEditChange} className="h-4 w-4 accent-violet-600" /> Cap</label>
                    <EditField label="Quantity" name="assetUniformCapQuantity" value={editForm.assetUniformCapQuantity} onChange={handleEditChange} type="number" />
                  </div>
                  <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-[1fr_1fr] sm:items-end">
                    <label className="flex items-center gap-2 pb-2 text-sm font-bold text-slate-700 sm:pb-2.5"><input type="checkbox" name="assetUniformBadge" checked={Boolean(editForm.assetUniformBadge)} onChange={handleEditChange} className="h-4 w-4 accent-violet-600" /> Badge</label>
                    <EditField label="Quantity" name="assetUniformBadgeQuantity" value={editForm.assetUniformBadgeQuantity} onChange={handleEditChange} type="number" />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Assets</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    ["assetTablet", "Tablet"],
                    ["assetPhone", "Phone"],
                    ["assetKeys", "Keys"],
                  ].map(([name, label]) => (
                    <label key={name} className="flex min-h-12 items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700">
                      <input type="checkbox" name={name} checked={Boolean(editForm[name])} onChange={handleEditChange} className="h-4 w-4 accent-violet-600" /> {label}
                    </label>
                  ))}
                  <label className="flex min-h-12 items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700">
                    <input type="checkbox" name="assetOthers" checked={Boolean(editForm.assetOthers)} onChange={handleEditChange} className="h-4 w-4 accent-violet-600" /> Others
                  </label>
                  <div className="sm:col-span-2">
                    <EditField label="Other asset details" name="assetOthersDetails" value={editForm.assetOthersDetails} onChange={handleEditChange} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </form>
    );
  };

  const renderTabContent = () => {
    if (activeTab === "employment") {
      return (
        <div className="grid gap-5 xl:grid-cols-2">
          <SectionCard title="Position & Joining Details" subtitle="Current role and scheduling details">
            <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
              <InfoField label="Position" value={profile.jobTitle} />
              <InfoField label="Starting Date" value={formatDate(joiningDate)} />
              <InfoField label="Location of Work" value={workLocation} wide />
              <InfoField label="Timing of Work" value={`${profile.morningShift || "08:00"} – ${profile.afternoonShift || "17:00"} (${profile.workingDays || "Mon-Fri"})`} wide />
            </div>
          </SectionCard>
          <SectionCard title="Probation Period" subtitle="Probation schedule and remuneration">
            <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
              <InfoField label="Probation Start" value={formatDate(profile.probationStartDate)} />
              <InfoField label="Probation End" value={formatDate(profile.probationEndDate)} />
              <div className="sm:col-span-2 border-t border-slate-100 pt-4 mt-2">
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400 mb-3">Probation Salary Breakdown</p>
                <div className="grid grid-cols-2 gap-4 rounded-xl bg-slate-50 p-4 text-sm font-medium text-slate-600">
                  <div className="flex justify-between border-b border-slate-100 pb-2"><span>Base Salary:</span> <span className="font-bold text-slate-900">{formatMoney(profile.probationSalary)}</span></div>
                  <div className="flex justify-between border-b border-slate-100 pb-2"><span>Meal Allowance:</span> <span className="font-bold text-slate-900">{formatMoney(profile.probationMealAllowance)}</span></div>
                  <div className="flex justify-between border-b border-slate-100 pb-2"><span>Uniform Allowance:</span> <span className="font-bold text-slate-900">{formatMoney(profile.probationUniformAllowance)}</span></div>
                  <div className="flex justify-between border-b border-slate-100 pb-2"><span>PR Allowance:</span> <span className="font-bold text-slate-900">{formatMoney(profile.probationPrAllowance)}</span></div>
                  <div className="flex justify-between"><span>Transport Allowance:</span> <span className="font-bold text-slate-900">{formatMoney(profile.probationTransportAllowance)}</span></div>
                  <div className="flex justify-between"><span>Medical Allowance:</span> <span className="font-bold text-slate-900">{formatMoney(profile.probationMedicalAllowance)}</span></div>
                </div>
              </div>
            </div>
          </SectionCard>
          <SectionCard title="Contract Period" subtitle="Contract validity dates">
            <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
              <InfoField label="Contract Starting" value={formatDate(profile.contractStartDate)} />
              <InfoField label="Contract Finishing" value={formatDate(profile.contractEndDate)} />
            </div>
          </SectionCard>
          <SectionCard title="Allocated Assets" subtitle="Devices and equipment assigned to the employee">
            <div className="mb-4 rounded-xl border border-violet-100 bg-violet-50 px-4 py-3">
              <p className="font-bold text-violet-900">Asset Handing Over Details</p>
              <p className="mt-1 text-xs text-violet-600">Uniforms and company property issued to this employee.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Uniform</div>
                <div className="divide-y divide-slate-100">
                  <div className="flex items-center gap-3 px-4 py-3">
                    <AssetIndicator checked={profile.assetUniformShirt} />
                    <span className="min-w-16 text-sm font-bold text-slate-800">Shirt</span>
                    <span className="ml-auto text-xs text-slate-500">Size: <strong className="text-slate-800">{profile.assetUniformShirtSize || "—"}</strong></span>
                    <span className="text-xs text-slate-500">Qty: <strong className="text-slate-800">{profile.assetUniformShirtQuantity || "—"}</strong></span>
                  </div>
                  <div className="flex items-center gap-3 px-4 py-3">
                    <AssetIndicator checked={profile.assetUniformCap} />
                    <span className="text-sm font-bold text-slate-800">Cap</span>
                    <span className="ml-auto text-xs text-slate-500">Quantity: <strong className="text-slate-800">{profile.assetUniformCapQuantity || "—"}</strong></span>
                  </div>
                  <div className="flex items-center gap-3 px-4 py-3">
                    <AssetIndicator checked={profile.assetUniformBadge} />
                    <span className="text-sm font-bold text-slate-800">Badge</span>
                    <span className="ml-auto text-xs text-slate-500">Quantity: <strong className="text-slate-800">{profile.assetUniformBadgeQuantity || "—"}</strong></span>
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-slate-200">
                <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Assets</div>
                <div className="grid grid-cols-2 gap-px bg-slate-100">
                  {[
                    ["assetTablet", "Tablet"],
                    ["assetPhone", "Phone"],
                    ["assetKeys", "Keys"],
                    ["assetOthers", "Others"],
                  ].map(([name, label]) => (
                    <div key={name} className="flex items-center gap-2 bg-white px-4 py-3 text-sm font-bold text-slate-800">
                      <AssetIndicator checked={profile[name]} /> {label}
                    </div>
                  ))}
                </div>
                <div className="border-t border-slate-100 px-4 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Other asset details</p>
                  <p className="mt-1 break-words text-sm font-semibold text-slate-700">{profile.assetOthersDetails || "Not provided"}</p>
                </div>
              </div>
            </div>
          </SectionCard>
        </div>
      );
    }

    if (activeTab === "financial") {
      return (
        <div className="grid gap-5 xl:grid-cols-2">
          <SectionCard title="Bank Account Details" subtitle="Employee bank account details for salary payments">
            <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
              <InfoField label="Account Name" value={profile.bankAccountName} />
              <InfoField label="Bank Name" value={profile.bankName} />
              <InfoField label="Account Number" value={profile.bankAccountNumber} wide />
            </div>
          </SectionCard>
          <SectionCard title="Salary Summary" subtitle="Monthly salary package overview">
            <div className="overflow-hidden rounded-xl border border-slate-200">
              {[
                ["Base Salary", profile.baseSalary],
                ["Meal Allowance", profile.mealAllowance],
                ["Position Allowance", profile.positionAllowance],
                ["Bonus", profile.bonus],
              ].map(([label, value], index) => (
                <div key={label} className={`flex items-center justify-between gap-4 px-4 py-3 text-sm ${index ? "border-t border-slate-100" : ""}`}>
                  <span className="font-medium text-slate-600">{label}</span>
                  <span className="font-bold text-slate-900">{formatMoney(value)}</span>
                </div>
              ))}
            </div>
          </SectionCard>
          <SectionCard title="Payroll History" subtitle="Historical record of salary payments">
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-12 text-center">
              <p className="font-bold text-slate-800 text-lg">Coming Soon</p>
              <p className="mt-2 text-sm leading-6 text-slate-500 max-w-md mx-auto">Payroll history and pay slips will be managed in another module.</p>
            </div>
          </SectionCard>
          <SectionCard title="Bonus History" subtitle="Track performance bonus distribution">
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-12 text-center">
              <p className="font-bold text-slate-800 text-lg">Coming Soon</p>
              <p className="mt-2 text-sm leading-6 text-slate-500 max-w-md mx-auto">Bonus history details will come from another tab.</p>
            </div>
          </SectionCard>
        </div>
      );
    }

    if (activeTab === "performance") {
      return (
        <div className="grid gap-5 xl:grid-cols-2">
          <SectionCard title="Monthly KPI Achievement" subtitle="Employee KPI metrics and target performance">
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-12 text-center">
              <p className="font-bold text-slate-800 text-lg">Coming Soon</p>
              <p className="mt-2 text-sm leading-6 text-slate-500 max-w-md mx-auto">Monthly KPI achievement details will come from another tab.</p>
            </div>
          </SectionCard>
          <SectionCard title="Attendance & Time Tracking" subtitle="Attendance records and leave metrics">
            <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
              <InfoField label="On-Time Rate" value={profile.onTimeRate} />
              <InfoField label="Late Arrivals" value={profile.lateArrivals} />
              <InfoField label="Leave Taken" value={profile.leaveTaken} />
              <InfoField label="Leave Balance" value={profile.leaveBalance} />
            </div>
          </SectionCard>
          <SectionCard title="Letter and Records" subtitle="Official warnings, promotions and notifications">
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-12 text-center sm:col-span-2">
              <p className="font-bold text-slate-800 text-lg">Coming Soon</p>
              <p className="mt-2 text-sm leading-6 text-slate-500 max-w-md mx-auto">Letter and records section is going to be connected from another tab.</p>
            </div>
          </SectionCard>
        </div>
      );
    }

    if (activeTab === "roster") {
      return (
        <SectionCard title="Work Roster" subtitle="Roster planning and shift assignments">
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-12 text-center">
            <p className="font-bold text-slate-800 text-lg">Coming Soon</p>
            <p className="mt-2 text-sm leading-6 text-slate-500 max-w-md mx-auto">This section will be connected to another tab to manage shift rosters and calendar arrangements.</p>
          </div>
        </SectionCard>
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
        <SectionCard title="Emergency Contact" subtitle="Primary emergency contact details">
          <div className="grid gap-x-8 gap-y-5 md:grid-cols-2 xl:grid-cols-3">
            <InfoField label="Name" value={profile.emergencyContactName} />
            <InfoField label="Relationship" value={profile.emergencyContactRelationship} />
            <InfoField label="Residential Address" value={profile.emergencyContactAddress} wide />
          </div>
        </SectionCard>
      </div>
    );
  };

  return (
    <div className={embedded ? "relative h-[calc(100vh-3.25rem)] bg-slate-100" : "fixed inset-0 z-[70] bg-slate-950/55 p-2 backdrop-blur-sm sm:p-4 lg:p-6"}>
      <div id="staff-profile-print" className={embedded ? "flex h-full w-full overflow-hidden bg-slate-100" : "mx-auto flex h-full max-w-[1500px] overflow-hidden rounded-2xl bg-slate-100 shadow-2xl"}>
        <aside className="hidden w-80 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
          <div className="border-b border-slate-100 p-6">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-violet-500">Employee Profile</p>
            <div className="relative mx-auto mt-5 h-48 w-36">
              {profilePhoto ? (
                <img src={profilePhoto} alt={`${profile.fullName || "Employee"} passport profile`} className="h-48 w-36 rounded-2xl object-cover shadow-lg shadow-violet-200 ring-4 ring-white" />
              ) : (
                <div className="flex h-48 w-36 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 text-4xl font-black text-white shadow-lg shadow-violet-200 ring-4 ring-white">{initials || "E"}</div>
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
                    {profilePhoto ? <img src={profilePhoto} alt="" className="h-16 w-12 rounded-xl object-cover shadow-sm" /> : <span className="flex h-16 w-12 items-center justify-center rounded-xl bg-violet-600 text-lg font-extrabold text-white shadow-sm">{initials || "E"}</span>}
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
                {onClose && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex h-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 gap-1.5 px-3.5 text-sm font-semibold"
                    aria-label="Close profile"
                  >
                    <X size={18} /> <span className="hidden sm:inline">Back</span>
                  </button>
                )}
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
                  <h3 className="mb-4 font-bold text-slate-900">Emergency Contact Information</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <EditField label="Emergency Contact Name" name="emergencyContactName" value={editForm.emergencyContactName} onChange={handleEditChange} />
                    <EditField label="Relationship" name="emergencyContactRelationship" value={editForm.emergencyContactRelationship} onChange={handleEditChange} />
                    <EditField label="Emergency Contact Address" name="emergencyContactAddress" value={editForm.emergencyContactAddress} onChange={handleEditChange} wide />
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5">
                  <h3 className="mb-4 font-bold text-slate-900">Employment Details</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <EditField label="Position / Job Title" name="jobTitle" value={editForm.jobTitle} onChange={handleEditChange} />
                    <EditField label="Starting Date / Joining Date" name="joiningDate" value={editForm.joiningDate} onChange={handleEditChange} type="date" />
                    <EditField label="Location of Work" name="workLocation" value={editForm.workLocation} onChange={handleEditChange} />
                    <EditField label="Working Days" name="workingDays" value={editForm.workingDays} onChange={handleEditChange} />
                    <EditField label="Morning Shift" name="morningShift" value={editForm.morningShift} onChange={handleEditChange} />
                    <EditField label="Afternoon Shift" name="afternoonShift" value={editForm.afternoonShift} onChange={handleEditChange} />
                    <EditField label="Probation Start Date" name="probationStartDate" value={editForm.probationStartDate} onChange={handleEditChange} type="date" />
                    <EditField label="Probation End Date" name="probationEndDate" value={editForm.probationEndDate} onChange={handleEditChange} type="date" />
                    <EditField label="Probation Salary" name="probationSalary" value={editForm.probationSalary} onChange={handleEditChange} type="number" />
                    <EditField label="Contract Start Date" name="contractStartDate" value={editForm.contractStartDate} onChange={handleEditChange} type="date" />
                    <EditField label="Contract End Date" name="contractEndDate" value={editForm.contractEndDate} onChange={handleEditChange} type="date" />
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5">
                  <h3 className="mb-4 font-bold text-slate-900">Financial Information</h3>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <EditField label="Bank Account Name" name="bankAccountName" value={editForm.bankAccountName} onChange={handleEditChange} />
                    <EditField label="Bank Name" name="bankName" value={editForm.bankName} onChange={handleEditChange} />
                    <EditField label="Bank Account Number" name="bankAccountNumber" value={editForm.bankAccountNumber} onChange={handleEditChange} />
                    <EditField label="Base Salary" name="baseSalary" value={editForm.baseSalary} onChange={handleEditChange} type="number" />
                    <EditField label="Meal Allowance" name="mealAllowance" value={editForm.mealAllowance} onChange={handleEditChange} type="number" />
                    <EditField label="Position Allowance" name="positionAllowance" value={editForm.positionAllowance} onChange={handleEditChange} type="number" />
                    <EditField label="Bonus" name="bonus" value={editForm.bonus} onChange={handleEditChange} type="number" />
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5">
                  <h3 className="mb-4 font-bold text-slate-900">Attendance & Time Tracking</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <EditField label="On-Time Rate" name="onTimeRate" value={editForm.onTimeRate} onChange={handleEditChange} />
                    <EditField label="Late Arrivals" name="lateArrivals" value={editForm.lateArrivals} onChange={handleEditChange} type="number" />
                    <EditField label="Leave Taken" name="leaveTaken" value={editForm.leaveTaken} onChange={handleEditChange} type="number" />
                    <EditField label="Leave Balance" name="leaveBalance" value={editForm.leaveBalance} onChange={handleEditChange} type="number" />
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

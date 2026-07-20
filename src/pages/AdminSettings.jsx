import { useEffect, useMemo, useState } from "react";
import { BriefcaseBusiness, Building2, Edit3, Files, FileUp, LoaderCircle, Plus, Save, SlidersHorizontal, Trash2, X, ClipboardList } from "lucide-react";
import {
  deleteJobPosition,
  deleteWorkLocation,
  getJobPositions,
  getWorkLocations,
  saveJobPosition,
  saveWorkLocation,
  seedJobPositions,
  updateJobPosition,
  updateWorkLocation,
  getPermanentClauses,
  savePermanentClauses,
} from "../utils/storage";
import { getDocuments, uploadDocument } from "../utils/documents";
import useAuth from "../auth/useAuth";
import ContractGenerator from "./ContractGenerator";

const blankForm = {
  department: "Kitchen Staff",
  title: "",
  description: "",
};

export default function AdminSettings() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("locations");
  const [jobs, setJobs] = useState(() => seedJobPositions(ContractGenerator.defaultJobPositions));
  const [documents, setDocuments] = useState([]);
  const [documentTitle, setDocumentTitle] = useState("");
  const [documentFile, setDocumentFile] = useState(null);
  const [documentsLoading, setDocumentsLoading] = useState(true);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [documentError, setDocumentError] = useState("");
  const [formData, setFormData] = useState(blankForm);
  const [editingId, setEditingId] = useState("");
  const [workLocations, setWorkLocations] = useState(() => getWorkLocations());
  const [locationName, setLocationName] = useState("");
  const [editingLocationId, setEditingLocationId] = useState("");
  const [clauses, setClauses] = useState(() => getPermanentClauses());

  const handleClauseChange = (name, value) => {
    setClauses(prev => ({ ...prev, [name]: value }));
  };

  const handleClausesSubmit = (event) => {
    event.preventDefault();
    savePermanentClauses(clauses);
    alert("Permanent contract clauses updated and saved successfully!");
  };

  const departments = useMemo(() => {
    const values = new Set(["Kitchen Staff", "Management Staff", ...jobs.map(job => job.department)]);
    return [...values];
  }, [jobs]);

  useEffect(() => {
    const syncJobs = () => setJobs(getJobPositions());

    window.addEventListener("jobPositionsChanged", syncJobs);
    window.addEventListener("storage", syncJobs);

    return () => {
      window.removeEventListener("jobPositionsChanged", syncJobs);
      window.removeEventListener("storage", syncJobs);
    };
  }, []);

  useEffect(() => {
    const syncWorkLocations = () => setWorkLocations(getWorkLocations());

    window.addEventListener("workLocationsChanged", syncWorkLocations);
    window.addEventListener("storage", syncWorkLocations);

    return () => {
      window.removeEventListener("workLocationsChanged", syncWorkLocations);
      window.removeEventListener("storage", syncWorkLocations);
    };
  }, []);

  useEffect(() => {
    let active = true;

    getDocuments()
      .then((savedDocuments) => {
        if (active) setDocuments(savedDocuments);
      })
      .catch(() => {
        if (active) setDocumentError("The document library is not configured yet.");
      })
      .finally(() => {
        if (active) setDocumentsLoading(false);
      });

    return () => { active = false; };
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData(blankForm);
    setEditingId("");
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const job = {
      department: formData.department.trim(),
      title: formData.title.trim(),
      description: formData.description.trim(),
    };

    if (!job.department || !job.title || !job.description) {
      alert("Please enter the department, job title, and job description.");
      return;
    }

    if (editingId) {
      updateJobPosition(editingId, job);
    } else {
      saveJobPosition(job);
    }

    setJobs(getJobPositions());
    resetForm();
  };

  const handleEdit = (job) => {
    setEditingId(job.id);
    setFormData({
      department: job.department,
      title: job.title,
      description: job.description,
    });
  };

  const handleDelete = (job) => {
    if (!confirm(`Delete ${job.title}? This removes it from the Contract Generator dropdown.`)) {
      return;
    }

    deleteJobPosition(job.id);
    setJobs(getJobPositions());

    if (editingId === job.id) {
      resetForm();
    }
  };

  const resetLocationForm = () => {
    setLocationName("");
    setEditingLocationId("");
  };

  const handleLocationSubmit = (event) => {
    event.preventDefault();
    const name = locationName.trim();

    if (!name) {
      alert("Please enter a work location.");
      return;
    }

    const duplicate = workLocations.some(location =>
      location.id !== editingLocationId && location.name.toLowerCase() === name.toLowerCase()
    );
    if (duplicate) {
      alert("This work location already exists.");
      return;
    }

    if (editingLocationId) {
      updateWorkLocation(editingLocationId, name);
    } else {
      saveWorkLocation(name);
    }

    setWorkLocations(getWorkLocations());
    resetLocationForm();
  };

  const handleLocationEdit = (location) => {
    setEditingLocationId(location.id);
    setLocationName(location.name);
  };

  const handleLocationDelete = (location) => {
    if (!confirm(`Delete ${location.name}? It will no longer appear in the Contract Generator dropdown.`)) {
      return;
    }

    deleteWorkLocation(location.id);
    setWorkLocations(getWorkLocations());
    if (editingLocationId === location.id) resetLocationForm();
  };

  const handleDocumentSubmit = async (event) => {
    event.preventDefault();

    const title = documentTitle.trim();
    if (!title || !documentFile) {
      setDocumentError("Please add a document title and choose a file.");
      return;
    }

    if (documentFile.size > 50 * 1024 * 1024) {
      setDocumentError("The maximum document size is 50 MB.");
      return;
    }

    setUploadingDocument(true);
    setDocumentError("");

    try {
      const savedDocument = await uploadDocument({
        title,
        file: documentFile,
        userId: user.id,
      });

      setDocuments((currentDocuments) => [savedDocument, ...currentDocuments]);
      setDocumentTitle("");
      setDocumentFile(null);
      event.target.reset();
    } catch (error) {
      const setupRequired = error.message?.includes("Bucket not found")
        || error.message?.includes("hr_documents");
      setDocumentError(setupRequired
        ? "Document storage is not configured. Run document-storage.sql in Supabase."
        : `Upload failed: ${error.message || "Please try again."}`);
    } finally {
      setUploadingDocument(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto pb-10">
      <div className="admin-settings-hero">
        <span className="admin-settings-hero-icon"><SlidersHorizontal size={23} /></span>
        <div>
          <p className="dashboard-kicker">System Configuration</p>
          <h2 className="text-2xl font-bold text-[var(--color-navy)]">Admin Settings</h2>
          <p className="mt-1 text-sm text-slate-500">Manage each part of your HR workspace from its dedicated tab.</p>
        </div>
      </div>

      <nav className="admin-settings-tabs" aria-label="Admin settings sections">
        <button type="button" onClick={() => setActiveTab("locations")} className={`admin-settings-tab ${activeTab === "locations" ? "is-active" : ""}`} aria-selected={activeTab === "locations"}>
          <span className="admin-settings-tab-icon admin-tab-location"><Building2 size={19} /></span>
          <span className="admin-settings-tab-copy"><span>Work Locations</span><small>{workLocations.length} configured</small></span>
        </button>
        <button type="button" onClick={() => setActiveTab("jobs")} className={`admin-settings-tab ${activeTab === "jobs" ? "is-active" : ""}`} aria-selected={activeTab === "jobs"}>
          <span className="admin-settings-tab-icon admin-tab-job"><BriefcaseBusiness size={19} /></span>
          <span className="admin-settings-tab-copy"><span>Job Positions</span><small>{jobs.length} available</small></span>
        </button>
        <button type="button" onClick={() => setActiveTab("documents")} className={`admin-settings-tab ${activeTab === "documents" ? "is-active" : ""}`} aria-selected={activeTab === "documents"}>
          <span className="admin-settings-tab-icon admin-tab-document"><Files size={19} /></span>
          <span className="admin-settings-tab-copy"><span>Documents</span><small>{documentsLoading ? "Loading..." : `${documents.length} uploaded`}</small></span>
        </button>
        <button type="button" onClick={() => setActiveTab("clauses")} className={`admin-settings-tab ${activeTab === "clauses" ? "is-active" : ""}`} aria-selected={activeTab === "clauses"}>
          <span className="admin-settings-tab-icon admin-tab-document"><ClipboardList size={19} /></span>
          <span className="admin-settings-tab-copy"><span>Contract Clauses</span><small>Permanent Articles</small></span>
        </button>
      </nav>

      {activeTab === "documents" && <section className="dashboard-panel admin-tab-panel">
        <div className="dashboard-panel-header">
          <div>
            <p className="dashboard-kicker">Document Library</p>
            <h3 className="dashboard-panel-title">Upload Document</h3>
          </div>
          <span className="dashboard-chip">{documentsLoading ? "Loading..." : `${documents.length} documents`}</span>
        </div>

        {documentError && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
            {documentError}
          </div>
        )}

        <form onSubmit={handleDocumentSubmit} className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
          <div>
            <label className="label">Document title</label>
            <input
              value={documentTitle}
              onChange={(event) => setDocumentTitle(event.target.value)}
              className="input-field"
              placeholder="Example: Employee Handbook"
            />
          </div>
          <div>
            <label className="label">Document file</label>
            <input
              type="file"
              onChange={(event) => setDocumentFile(event.target.files?.[0] || null)}
              className="input-field"
            />
          </div>
          <button type="submit" disabled={uploadingDocument} className="btn-primary flex h-10 items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60">
            {uploadingDocument ? <LoaderCircle className="animate-spin" size={16} /> : <FileUp size={16} />}
            {uploadingDocument ? "Uploading..." : "Upload"}
          </button>
        </form>
      </section>}

      {activeTab === "locations" && <section className="dashboard-panel admin-tab-panel">
        <div className="dashboard-panel-header">
          <div>
            <p className="dashboard-kicker">Location Management</p>
            <h3 className="dashboard-panel-title">Work Locations</h3>
          </div>
          <span className="dashboard-chip">{workLocations.length} locations</span>
        </div>

        <form onSubmit={handleLocationSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="label">{editingLocationId ? "Edit work location" : "New work location"}</label>
            <input
              value={locationName}
              onChange={(event) => setLocationName(event.target.value)}
              className="input-field"
              placeholder="Example: Nha Trang Branch"
            />
          </div>
          <button type="submit" className="btn-primary flex h-10 items-center justify-center gap-2">
            {editingLocationId ? <Save size={16} /> : <Plus size={16} />}
            {editingLocationId ? "Save Changes" : "Add Location"}
          </button>
          {editingLocationId && (
            <button type="button" onClick={resetLocationForm} className="btn-secondary flex h-10 items-center justify-center gap-2">
              <X size={16} />
              Cancel
            </button>
          )}
        </form>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          {workLocations.length === 0 ? (
            <div className="dashboard-empty md:col-span-2">Add a work location to populate the Contract Generator dropdowns.</div>
          ) : (
            workLocations.map(location => (
              <article key={location.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3">
                <p className="font-semibold text-[var(--color-navy)]">{location.name}</p>
                <div className="flex shrink-0 gap-2">
                  <button type="button" onClick={() => handleLocationEdit(location)} className="btn-secondary p-2" aria-label={`Edit ${location.name}`}>
                    <Edit3 size={15} />
                  </button>
                  <button type="button" onClick={() => handleLocationDelete(location)} className="btn-secondary p-2 text-red-600 hover:text-red-700" aria-label={`Delete ${location.name}`}>
                    <Trash2 size={15} />
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </section>}

      {activeTab === "jobs" && <div className="grid grid-cols-1 gap-5 lg:grid-cols-[360px_1fr] admin-tab-panel">
        <form onSubmit={handleSubmit} className="dashboard-panel h-fit">
          <div className="dashboard-panel-header">
            <div>
              <p className="dashboard-kicker">Job Management</p>
              <h3 className="dashboard-panel-title">{editingId ? "Edit Job Position" : "Create Job Position"}</h3>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="label">Department</label>
              <select
                name="department"
                value={formData.department}
                onChange={handleChange}
                className="input-field"
              >
                {departments.map(department => (
                  <option key={department} value={department}>{department}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Job position</label>
              <input name="title" value={formData.title} onChange={handleChange} className="input-field" />
            </div>

            <div>
              <label className="label">Job description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                className="input-field h-72 leading-relaxed"
              />
            </div>

            <div className="flex gap-2">
              <button type="submit" className="btn-primary flex items-center gap-2">
                {editingId ? <Save size={16} /> : <Plus size={16} />}
                {editingId ? "Save Changes" : "Add Job"}
              </button>
              {editingId && (
                <button type="button" onClick={resetForm} className="btn-secondary flex items-center gap-2">
                  <X size={16} />
                  Cancel
                </button>
              )}
            </div>
          </div>
        </form>

        <section className="dashboard-panel">
          <div className="dashboard-panel-header">
            <div>
              <p className="dashboard-kicker">Central Catalog</p>
              <h3 className="dashboard-panel-title">Job Positions</h3>
            </div>
            <span className="dashboard-chip">{jobs.length} jobs</span>
          </div>

          <div className="space-y-3">
            {jobs.length === 0 ? (
              <div className="dashboard-empty">No job positions have been created yet.</div>
            ) : (
              jobs.map(job => (
                <article key={job.id} className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase text-slate-400">{job.department}</p>
                      <h4 className="text-base font-bold text-[var(--color-navy)]">{job.title}</h4>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button type="button" onClick={() => handleEdit(job)} className="btn-secondary flex items-center gap-2">
                        <Edit3 size={15} />
                        Edit
                      </button>
                      <button type="button" onClick={() => handleDelete(job)} className="btn-secondary flex items-center gap-2 text-red-600 hover:text-red-700">
                        <Trash2 size={15} />
                        Delete
                      </button>
                    </div>
                  </div>
                  <p className="mt-3 line-clamp-3 whitespace-pre-line text-sm leading-6 text-slate-600">{job.description}</p>
                </article>
              ))
            )}
          </div>
        </section>
      </div>}

      {activeTab === "clauses" && (
        <form onSubmit={handleClausesSubmit} className="space-y-6 admin-tab-panel">
          <div className="dashboard-panel">
            <div className="dashboard-panel-header">
              <div>
                <p className="dashboard-kicker">Template Customization</p>
                <h3 className="dashboard-panel-title">Contract Clauses (Articles 8 to 18)</h3>
              </div>
              <button type="submit" className="btn-primary flex items-center gap-2">
                <Save size={16} /> Save All Clauses
              </button>
            </div>
            <p className="text-sm text-slate-500 mb-4">
              HR can modify the permanent text clauses here. Once saved, these will become the default clauses for any new contracts generated.
            </p>
          </div>

          <div className="dashboard-panel">
            <h4 className="font-bold text-lg text-[var(--color-navy)] mb-4 border-b pb-2">Điều 8: Quyền và Nghĩa vụ của Người lao động / Article 8: Rights and Obligations of Employee</h4>
            <div className="space-y-4">
              <div>
                <label className="label">Salary and benefits / Quyền hưởng lương và phúc lợi</label>
                <textarea
                  className="input-field h-32 text-sm leading-relaxed"
                  value={clauses.salaryBenefitsClause}
                  onChange={(e) => handleClauseChange("salaryBenefitsClause", e.target.value)}
                />
              </div>
              <div>
                <label className="label">Insurance rights / Quyền hưởng bảo hiểm</label>
                <textarea
                  className="input-field h-32 text-sm leading-relaxed"
                  value={clauses.insuranceClause}
                  onChange={(e) => handleClauseChange("insuranceClause", e.target.value)}
                />
              </div>
              <div>
                <label className="label">Bonus policy / Chính sách thưởng</label>
                <textarea
                  className="input-field h-32 text-sm leading-relaxed"
                  value={clauses.bonusPolicyClause}
                  onChange={(e) => handleClauseChange("bonusPolicyClause", e.target.value)}
                />
              </div>
              <div>
                <label className="label">13th month salary / Chế độ lương tháng 13</label>
                <textarea
                  className="input-field h-32 text-sm leading-relaxed"
                  value={clauses.thirteenthMonthSalaryClause}
                  onChange={(e) => handleClauseChange("thirteenthMonthSalaryClause", e.target.value)}
                />
              </div>
              <div>
                <label className="label">Assigned tasks / Công việc được giao</label>
                <textarea
                  className="input-field h-32 text-sm leading-relaxed"
                  value={clauses.assignedDutiesClause}
                  onChange={(e) => handleClauseChange("assignedDutiesClause", e.target.value)}
                />
              </div>
              <div>
                <label className="label">Labor rules and safety / Nội quy và an toàn lao động</label>
                <textarea
                  className="input-field h-32 text-sm leading-relaxed"
                  value={clauses.companyRulesClause}
                  onChange={(e) => handleClauseChange("companyRulesClause", e.target.value)}
                />
              </div>
              <div>
                <label className="label">Asset protection and confidentiality / Bảo vệ tài sản và bảo mật</label>
                <textarea
                  className="input-field h-32 text-sm leading-relaxed"
                  value={clauses.assetProtectionClause}
                  onChange={(e) => handleClauseChange("assetProtectionClause", e.target.value)}
                />
              </div>
              <div>
                <label className="label">Handover on termination / Bàn giao khi chấm dứt hợp đồng</label>
                <textarea
                  className="input-field h-32 text-sm leading-relaxed"
                  value={clauses.handoverClause}
                  onChange={(e) => handleClauseChange("handoverClause", e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="dashboard-panel">
            <h4 className="font-bold text-lg text-[var(--color-navy)] mb-4 border-b pb-2">Điều 9: Quyền và Nghĩa vụ của Người sử dụng lao động / Article 9: Employer's Rights & Obligations</h4>
            <div className="space-y-4">
              <div>
                <label className="label">Obligations of the Employer / Nghĩa vụ của Người sử dụng lao động</label>
                <textarea
                  className="input-field h-32 text-sm leading-relaxed"
                  value={clauses.contractImplementationClause}
                  onChange={(e) => handleClauseChange("contractImplementationClause", e.target.value)}
                />
              </div>
              <div>
                <label className="label">Rights of the Employer / Quyền hạn của Người sử dụng lao động</label>
                <textarea
                  className="input-field h-32 text-sm leading-relaxed"
                  value={clauses.employerRightsClause}
                  onChange={(e) => handleClauseChange("employerRightsClause", e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="dashboard-panel">
            <h4 className="font-bold text-lg text-[var(--color-navy)] mb-4 border-b pb-2">Điều 10: Chế độ nghỉ ngơi / Article 10: Leave Policy</h4>
            <div className="space-y-4">
              <div>
                <label className="label">Annual Leave / Nghỉ phép năm</label>
                <textarea
                  className="input-field h-32 text-sm leading-relaxed"
                  value={clauses.annualLeaveClause}
                  onChange={(e) => handleClauseChange("annualLeaveClause", e.target.value)}
                />
              </div>
              <div>
                <label className="label">Proportional Leave / Nghỉ phép năm theo tỷ lệ</label>
                <textarea
                  className="input-field h-32 text-sm leading-relaxed"
                  value={clauses.proportionalLeaveClause}
                  onChange={(e) => handleClauseChange("proportionalLeaveClause", e.target.value)}
                />
              </div>
              <div>
                <label className="label">Sick Leave / Nghỉ ốm đau</label>
                <textarea
                  className="input-field h-32 text-sm leading-relaxed"
                  value={clauses.sickLeaveClause}
                  onChange={(e) => handleClauseChange("sickLeaveClause", e.target.value)}
                />
              </div>
              <div>
                <label className="label">National Holidays / Nghỉ lễ Tết</label>
                <textarea
                  className="input-field h-32 text-sm leading-relaxed"
                  value={clauses.publicHolidayClause}
                  onChange={(e) => handleClauseChange("publicHolidayClause", e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="dashboard-panel">
            <h4 className="font-bold text-lg text-[var(--color-navy)] mb-4 border-b pb-2">Điều 11: Bảo hiểm xã hội / Article 11: Statutory Insurance</h4>
            <div className="space-y-4">
              <div>
                <label className="label">Statutory Insurance Intro / Giới thiệu bảo hiểm bắt buộc</label>
                <textarea
                  className="input-field h-32 text-sm leading-relaxed"
                  value={clauses.statutoryInsuranceIntro}
                  onChange={(e) => handleClauseChange("statutoryInsuranceIntro", e.target.value)}
                />
              </div>
              <div>
                <label className="label">Employer's Contribution / Phần đóng của Công ty</label>
                <textarea
                  className="input-field h-32 text-sm leading-relaxed"
                  value={clauses.employerInsuranceContributionClause}
                  onChange={(e) => handleClauseChange("employerInsuranceContributionClause", e.target.value)}
                />
              </div>
              <div>
                <label className="label">Employee's Contribution / Phần đóng của Người lao động</label>
                <textarea
                  className="input-field h-32 text-sm leading-relaxed"
                  value={clauses.employeeInsuranceContributionClause}
                  onChange={(e) => handleClauseChange("employeeInsuranceContributionClause", e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="dashboard-panel">
            <h4 className="font-bold text-lg text-[var(--color-navy)] mb-4 border-b pb-2">Điều 12: Trang thiết bị bảo hộ & Huấn luyện an toàn / Article 12: PPE & Safety Training</h4>
            <div className="space-y-4">
              <div>
                <label className="label">PPE Clause / Thiết bị bảo hộ</label>
                <textarea
                  className="input-field h-32 text-sm leading-relaxed"
                  value={clauses.ppeClause}
                  onChange={(e) => handleClauseChange("ppeClause", e.target.value)}
                />
              </div>
              <div>
                <label className="label">Employee PPE Responsibility / Trách nhiệm thiết bị bảo hộ</label>
                <textarea
                  className="input-field h-32 text-sm leading-relaxed"
                  value={clauses.employeePpeResponsibilityClause}
                  onChange={(e) => handleClauseChange("employeePpeResponsibilityClause", e.target.value)}
                />
              </div>
              <div>
                <label className="label">Safety Training Clause / Huấn luyện an toàn</label>
                <textarea
                  className="input-field h-32 text-sm leading-relaxed"
                  value={clauses.safetyTrainingClause}
                  onChange={(e) => handleClauseChange("safetyTrainingClause", e.target.value)}
                />
              </div>
              <div>
                <label className="label">Employee Training Attendance / Trách nhiệm tham gia huấn luyện</label>
                <textarea
                  className="input-field h-32 text-sm leading-relaxed"
                  value={clauses.employeeTrainingAttendanceClause}
                  onChange={(e) => handleClauseChange("employeeTrainingAttendanceClause", e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="dashboard-panel">
            <h4 className="font-bold text-lg text-[var(--color-navy)] mb-4 border-b pb-2">Điều 13: Đào tạo / Article 13: Training</h4>
            <div className="space-y-4">
              <div>
                <label className="label">Training Scope / Phạm vi đào tạo</label>
                <textarea
                  className="input-field h-32 text-sm leading-relaxed"
                  value={clauses.trainingScopeClause}
                  onChange={(e) => handleClauseChange("trainingScopeClause", e.target.value)}
                />
              </div>
              <div>
                <label className="label">Training Cost Reimbursement / Chi phí đào tạo và nghĩa vụ hoàn trả</label>
                <textarea
                  className="input-field h-40 text-sm leading-relaxed"
                  value={clauses.trainingCostReimbursementClause}
                  onChange={(e) => handleClauseChange("trainingCostReimbursementClause", e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="dashboard-panel">
            <h4 className="font-bold text-lg text-[var(--color-navy)] mb-4 border-b pb-2">Điều 14: Chấm dứt hợp đồng & Thời gian báo trước / Article 14: Termination & Notice Period</h4>
            <div className="space-y-4">
              <div>
                <label className="label">Immediate Termination / Chấm dứt hợp đồng ngay lập tức</label>
                <textarea
                  className="input-field h-40 text-sm leading-relaxed"
                  value={clauses.immediateTerminationClause}
                  onChange={(e) => handleClauseChange("immediateTerminationClause", e.target.value)}
                />
              </div>
              <div>
                <label className="label">Unilateral Termination by Employee / Người lao động đơn phương chấm dứt</label>
                <textarea
                  className="input-field h-40 text-sm leading-relaxed"
                  value={clauses.unilateralTerminationEmployeeClause}
                  onChange={(e) => handleClauseChange("unilateralTerminationEmployeeClause", e.target.value)}
                />
              </div>
              <div>
                <label className="label">Unilateral Termination by Employer / Công ty đơn phương chấm dứt</label>
                <textarea
                  className="input-field h-40 text-sm leading-relaxed"
                  value={clauses.unilateralTerminationEmployerClause}
                  onChange={(e) => handleClauseChange("unilateralTerminationEmployerClause", e.target.value)}
                />
              </div>
              <div>
                <label className="label">Notice Period Condition / Điều kiện thời gian báo trước</label>
                <textarea
                  className="input-field h-32 text-sm leading-relaxed"
                  value={clauses.noticePeriodCondition}
                  onChange={(e) => handleClauseChange("noticePeriodCondition", e.target.value)}
                />
              </div>
              <div>
                <label className="label">Termination Handover Obligations / Trách nhiệm khi chấm dứt hợp đồng</label>
                <textarea
                  className="input-field h-40 text-sm leading-relaxed"
                  value={clauses.terminationHandoverTaskClause}
                  onChange={(e) => handleClauseChange("terminationHandoverTaskClause", e.target.value)}
                />
              </div>
              <div>
                <label className="label">Final Payment Timeline / Thời hạn thanh toán cuối cùng</label>
                <textarea
                  className="input-field h-32 text-sm leading-relaxed"
                  value={clauses.finalPaymentTimeline}
                  onChange={(e) => handleClauseChange("finalPaymentTimeline", e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="dashboard-panel">
            <h4 className="font-bold text-lg text-[var(--color-navy)] mb-4 border-b pb-2">Điều 17: Bảo mật thông tin / Article 17: Confidentiality</h4>
            <div className="space-y-4">
              <div>
                <label className="label">Confidential Business Information / Bảo mật thông tin kinh doanh</label>
                <textarea
                  className="input-field h-32 text-sm leading-relaxed"
                  value={clauses.confidentialInformationClause}
                  onChange={(e) => handleClauseChange("confidentialInformationClause", e.target.value)}
                />
              </div>
              <div>
                <label className="label">Non-Disclosure / Không tiết lộ</label>
                <textarea
                  className="input-field h-32 text-sm leading-relaxed"
                  value={clauses.nonDisclosureClause}
                  onChange={(e) => handleClauseChange("nonDisclosureClause", e.target.value)}
                />
              </div>
              <div>
                <label className="label">Breach Consequences / Hậu quả vi phạm</label>
                <textarea
                  className="input-field h-32 text-sm leading-relaxed"
                  value={clauses.breachConsequenceClause}
                  onChange={(e) => handleClauseChange("breachConsequenceClause", e.target.value)}
                />
              </div>
              <div>
                <label className="label">Post-Employment Restriction (24 Months) / Hạn chế sau nghỉ việc</label>
                <textarea
                  className="input-field h-40 text-sm leading-relaxed"
                  value={clauses.postEmploymentRestrictionClause}
                  onChange={(e) => handleClauseChange("postEmploymentRestrictionClause", e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="dashboard-panel">
            <h4 className="font-bold text-lg text-[var(--color-navy)] mb-4 border-b pb-2">Điều 18: Hiệu lực hợp đồng / Article 18: Effectiveness</h4>
            <div className="space-y-4">
              <div>
                <label className="label">Effectiveness Clause / Hiệu lực hợp đồng</label>
                <textarea
                  className="input-field h-32 text-sm leading-relaxed"
                  value={clauses.effectivenessClause}
                  onChange={(e) => handleClauseChange("effectivenessClause", e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-4">
            <button type="submit" className="btn-primary flex items-center justify-center gap-2 h-10 px-6 font-bold">
              <Save size={16} /> Save All Clauses
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

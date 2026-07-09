import { useEffect, useMemo, useState } from "react";
import { Edit3, FileUp, Plus, Save, Trash2, X } from "lucide-react";
import { deleteJobPosition, getDocuments, getJobPositions, saveDocument, saveJobPosition, seedJobPositions, updateJobPosition } from "../utils/storage";
import ContractGenerator from "./ContractGenerator";

const blankForm = {
  department: "Kitchen Staff",
  title: "",
  description: "",
};

export default function AdminSettings() {
  const [jobs, setJobs] = useState(() => seedJobPositions(ContractGenerator.defaultJobPositions));
  const [documents, setDocuments] = useState(() => getDocuments());
  const [documentTitle, setDocumentTitle] = useState("");
  const [documentFile, setDocumentFile] = useState(null);
  const [formData, setFormData] = useState(blankForm);
  const [editingId, setEditingId] = useState("");

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
    const syncDocuments = () => setDocuments(getDocuments());

    window.addEventListener("documentsChanged", syncDocuments);
    window.addEventListener("storage", syncDocuments);

    return () => {
      window.removeEventListener("documentsChanged", syncDocuments);
      window.removeEventListener("storage", syncDocuments);
    };
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

  const readFileAsDataUrl = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  };

  const handleDocumentSubmit = async (event) => {
    event.preventDefault();

    const title = documentTitle.trim();
    if (!title || !documentFile) {
      alert("Please add a document title and choose a file.");
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(documentFile);
      saveDocument({
        title,
        fileName: documentFile.name,
        fileType: documentFile.type || "application/octet-stream",
        fileSize: documentFile.size,
        dataUrl,
      });

      setDocuments(getDocuments());
      setDocumentTitle("");
      setDocumentFile(null);
      event.target.reset();
      alert("Document uploaded.");
    } catch {
      alert("Unable to upload this document. Please try another file.");
    }
  };

  return (
    <div className="max-w-6xl mx-auto pb-10">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[var(--color-navy)]">Admin Settings</h2>
        <p className="mt-1 text-sm text-slate-500">Manage job positions, contract descriptions, and HR documents.</p>
      </div>

      <section className="dashboard-panel mb-5">
        <div className="dashboard-panel-header">
          <div>
            <p className="dashboard-kicker">Document Library</p>
            <h3 className="dashboard-panel-title">Upload Document</h3>
          </div>
          <span className="dashboard-chip">{documents.length} documents</span>
        </div>

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
          <button type="submit" className="btn-primary flex h-10 items-center justify-center gap-2">
            <FileUp size={16} />
            Upload
          </button>
        </form>
      </section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[360px_1fr]">
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
      </div>
    </div>
  );
}

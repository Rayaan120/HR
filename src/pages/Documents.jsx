import { useEffect, useState } from "react";
import { Download, FileText, LoaderCircle, Search, Trash2 } from "lucide-react";
import { deleteDocument, downloadDocument, getDocuments } from "../utils/documents";

const formatFileSize = (bytes) => {
  if (!bytes) return "Unknown size";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function Documents() {
  const [documents, setDocuments] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyDocumentId, setBusyDocumentId] = useState("");
  const [error, setError] = useState("");

  const loadDocuments = async () => {
    setLoading(true);
    setError("");

    try {
      setDocuments(await getDocuments());
    } catch {
      setError("Unable to load documents. Ask an administrator to configure Supabase document storage.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();

  }, []);

  const handleDelete = async (document) => {
    if (!confirm(`Delete ${document.title}?`)) return;

    setBusyDocumentId(document.id);
    setError("");

    try {
      await deleteDocument(document);
      setDocuments((currentDocuments) => currentDocuments.filter((item) => item.id !== document.id));
    } catch (deleteError) {
      setError(`Unable to delete this document: ${deleteError.message}`);
    } finally {
      setBusyDocumentId("");
    }
  };

  const handleDownload = async (document) => {
    setBusyDocumentId(document.id);
    setError("");

    try {
      await downloadDocument(document);
    } catch (downloadError) {
      setError(`Unable to download this document: ${downloadError.message}`);
    } finally {
      setBusyDocumentId("");
    }
  };

  const filteredDocuments = documents.filter(document => {
    const term = searchTerm.toLowerCase();
    return (
      document.title.toLowerCase().includes(term) ||
      document.fileName.toLowerCase().includes(term)
    );
  });

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-2xl font-bold text-[var(--color-navy)]">Documents</h2>
          <p className="mt-1 text-sm text-slate-500">Uploaded HR files from Admin Settings.</p>
        </div>
        <span className="dashboard-chip w-fit">{documents.length} documents</span>
      </div>

      <div className="dashboard-panel mb-5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search documents..."
            className="input-field pl-10"
          />
        </div>
      </div>

      <section className="dashboard-panel">
        <div className="dashboard-panel-header">
          <div>
            <p className="dashboard-kicker">Library</p>
            <h3 className="dashboard-panel-title">Uploaded Documents</h3>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
            {error}
          </div>
        )}

        <div className="space-y-3">
          {loading ? (
            <div className="dashboard-empty flex items-center justify-center gap-2">
              <LoaderCircle className="animate-spin" size={18} />
              Loading documents...
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="dashboard-empty">No documents found.</div>
          ) : (
            filteredDocuments.map(document => (
              <article key={document.id} className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-sky-50 text-sky-700">
                      <FileText size={18} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="truncate text-base font-bold text-[var(--color-navy)]">{document.title}</h4>
                      <p className="mt-1 truncate text-sm text-slate-500">{document.fileName}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {formatFileSize(document.fileSize)} | Uploaded {new Date(document.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    <button type="button" onClick={() => handleDownload(document)} disabled={busyDocumentId === document.id} className="btn-secondary flex items-center gap-2 disabled:opacity-60">
                      {busyDocumentId === document.id ? <LoaderCircle className="animate-spin" size={15} /> : <Download size={15} />}
                      Download
                    </button>
                    <button type="button" onClick={() => handleDelete(document)} disabled={busyDocumentId === document.id} className="btn-secondary flex items-center gap-2 text-red-600 hover:text-red-700 disabled:opacity-60">
                      <Trash2 size={15} />
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

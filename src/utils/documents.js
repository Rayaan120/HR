import { supabase } from "../lib/supabase";

const DOCUMENT_BUCKET = "hr-documents";

const mapDocument = (document) => ({
  id: document.id,
  title: document.title,
  fileName: document.file_name,
  fileType: document.file_type,
  fileSize: document.file_size,
  storagePath: document.storage_path,
  createdAt: document.created_at,
});

const sanitizeFileName = (fileName) => {
  const sanitized = fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
  return sanitized || "document";
};

export const getDocuments = async () => {
  const { data, error } = await supabase
    .from("hr_documents")
    .select("id, title, file_name, file_type, file_size, storage_path, created_at")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data.map(mapDocument);
};

export const uploadDocument = async ({ title, file, userId }) => {
  const storagePath = `${crypto.randomUUID()}/${sanitizeFileName(file.name)}`;
  const { error: uploadError } = await supabase.storage
    .from(DOCUMENT_BUCKET)
    .upload(storagePath, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) throw uploadError;

  const { data, error: metadataError } = await supabase
    .from("hr_documents")
    .insert({
      title,
      file_name: file.name,
      file_type: file.type || "application/octet-stream",
      file_size: file.size,
      storage_path: storagePath,
      uploaded_by: userId,
    })
    .select("id, title, file_name, file_type, file_size, storage_path, created_at")
    .single();

  if (metadataError) {
    await supabase.storage.from(DOCUMENT_BUCKET).remove([storagePath]);
    throw metadataError;
  }

  return mapDocument(data);
};

export const downloadDocument = async (document) => {
  const { data, error } = await supabase.storage
    .from(DOCUMENT_BUCKET)
    .download(document.storagePath);

  if (error) throw error;

  const url = URL.createObjectURL(data);
  const link = window.document.createElement("a");
  link.href = url;
  link.download = document.fileName;
  window.document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export const deleteDocument = async (document) => {
  const { error: storageError } = await supabase.storage
    .from(DOCUMENT_BUCKET)
    .remove([document.storagePath]);

  if (storageError) throw storageError;

  const { error: metadataError } = await supabase
    .from("hr_documents")
    .delete()
    .eq("id", document.id);

  if (metadataError) throw metadataError;
};

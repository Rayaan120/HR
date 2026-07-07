import { X, Printer, Download, UserCircle, Briefcase, Mail, Phone, MapPin } from "lucide-react";
import { exportToPDF, printDocument } from "../utils/pdfGenerator";

export default function StaffProfileModal({ profile, onClose }) {
  if (!profile) return null;

  const handleExportPDF = () => {
    exportToPDF("staff-profile-print", `Profile_${profile.employeeId}.pdf`);
  };

  const handlePrint = () => {
    printDocument("staff-profile-print");
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        
        <div className="flex justify-between items-center p-6 border-b border-[var(--color-border-grey)]">
          <h2 className="text-xl font-bold text-[var(--color-navy)]">Staff Profile</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6" id="staff-profile-print">
          <div className="flex items-start gap-6 mb-8">
            <UserCircle size={80} className="text-[var(--color-navy-light)]" />
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-2xl font-bold text-[var(--color-navy)]">{profile.fullName}</h1>
                  <p className="text-[var(--color-emerald)] font-medium">{profile.jobTitle}</p>
                </div>
                <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-blue-200">
                  {profile.employeeId}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <Briefcase size={16} /> {profile.department}
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <MapPin size={16} /> {profile.branch}
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Mail size={16} /> {profile.email || 'N/A'}
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Phone size={16} /> {profile.phoneNumber || 'N/A'}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 border-t border-[var(--color-border-grey)] pt-6 mb-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Employment Details</h3>
              <ul className="space-y-3 text-sm text-gray-600">
                <li><span className="font-medium text-gray-900 w-32 inline-block">Contract No:</span> {profile.contractNumber}</li>
                <li><span className="font-medium text-gray-900 w-32 inline-block">Joining Date:</span> {profile.joiningDate ? new Date(profile.joiningDate).toLocaleDateString() : 'N/A'}</li>
                <li><span className="font-medium text-gray-900 w-32 inline-block">Contract Status:</span> <span className="text-[var(--color-emerald)] font-medium">{profile.contractStatus}</span></li>
                <li><span className="font-medium text-gray-900 w-32 inline-block">Work Location:</span> {profile.workLocation}</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Personal Information</h3>
              <ul className="space-y-3 text-sm text-gray-600">
                <li><span className="font-medium text-gray-900 w-32 inline-block">DOB:</span> {profile.dob ? new Date(profile.dob).toLocaleDateString() : 'N/A'}</li>
                <li><span className="font-medium text-gray-900 w-32 inline-block">Gender:</span> {profile.gender}</li>
                <li><span className="font-medium text-gray-900 w-32 inline-block">Nationality:</span> {profile.nationality}</li>
                <li><span className="font-medium text-gray-900 w-32 inline-block">ID/Passport:</span> {profile.idNumber}</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-[var(--color-border-grey)] pt-6">
            <h3 className="font-semibold text-gray-900 mb-4">Salary & Benefits Overview</h3>
            <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Gross Salary</p>
                <p className="font-semibold">{profile.grossSalary?.toLocaleString() || 0} VND</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Net Salary</p>
                <p className="font-semibold text-[var(--color-emerald)]">{profile.netSalary?.toLocaleString() || 0} VND</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-[var(--color-border-grey)] bg-gray-50 flex justify-end gap-3 no-print">
          <button className="btn-secondary flex items-center gap-2" onClick={handlePrint}>
            <Printer size={18} /> Print
          </button>
          <button className="btn-primary flex items-center gap-2" onClick={handleExportPDF}>
            <Download size={18} /> Export PDF
          </button>
        </div>
      </div>
    </div>
  );
}

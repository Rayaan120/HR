import { useState, useEffect } from "react";
import { Search, Filter, Eye, Trash2 } from "lucide-react";
import StaffProfileModal from "../components/StaffProfileModal";
import { getStaffProfiles, deleteStaffProfile } from "../utils/storage";

export default function StaffProfiles() {
  const [profiles, setProfiles] = useState([]);
  const [filteredProfiles, setFilteredProfiles] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [selectedProfile, setSelectedProfile] = useState(null);

  const loadProfiles = () => {
    const staff = getStaffProfiles();
    setProfiles(staff);
    setFilteredProfiles(staff);
  };

  useEffect(() => {
    loadProfiles();
  }, []);

  const handleDelete = (employeeId) => {
    if (window.confirm("Are you sure you want to delete this staff profile?")) {
      deleteStaffProfile(employeeId);
      loadProfiles();
    }
  };

  useEffect(() => {
    let result = profiles;
    
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(p => 
        (p.fullName && p.fullName.toLowerCase().includes(lower)) ||
        (p.employeeId && p.employeeId.toLowerCase().includes(lower)) ||
        (p.department && p.department.toLowerCase().includes(lower)) ||
        (p.branch && p.branch.toLowerCase().includes(lower))
      );
    }
    
    if (deptFilter) {
      result = result.filter(p => p.department === deptFilter);
    }
    
    if (branchFilter) {
      result = result.filter(p => p.branch === branchFilter);
    }
    
    setFilteredProfiles(result);
  }, [searchTerm, deptFilter, branchFilter, profiles]);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-[var(--color-navy)]">Staff Profiles</h2>
          <p className="text-gray-500">Manage and view all signed employee records.</p>
        </div>
      </div>

      <div className="card mb-6 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Search by name, ID, branch..." 
            className="w-full pl-10 pr-4 py-2 border border-[var(--color-border-grey)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-emerald)]/20"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-48">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <select 
              className="w-full pl-10 pr-4 py-2 border border-[var(--color-border-grey)] rounded-lg focus:outline-none appearance-none"
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
            >
              <option value="">All Departments</option>
              <option value="Kitchen Staff">Kitchen Staff</option>
              <option value="Management Staff">Management Staff</option>
            </select>
          </div>
          <div className="relative flex-1 md:w-48">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <select 
              className="w-full pl-10 pr-4 py-2 border border-[var(--color-border-grey)] rounded-lg focus:outline-none appearance-none"
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
            >
              <option value="">All Branches</option>
              <option value="Branch 1">Branch 1</option>
              <option value="Branch 2">Branch 2</option>
              <option value="Branch 3">Branch 3</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-[var(--color-border-grey)] text-gray-600">
              <tr>
                <th className="p-4 font-semibold">Employee</th>
                <th className="p-4 font-semibold">Department</th>
                <th className="p-4 font-semibold">Branch</th>
                <th className="p-4 font-semibold">Joining Date</th>
                <th className="p-4 font-semibold">Contract No.</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-grey)]">
              {filteredProfiles.length > 0 ? (
                filteredProfiles.map((profile) => (
                  <tr key={profile.employeeId} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[var(--color-navy)] text-white flex items-center justify-center font-bold">
                          {profile.fullName?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <p className="font-semibold text-[var(--color-navy)]">{profile.fullName}</p>
                          <p className="text-xs text-gray-500">{profile.employeeId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="text-gray-900">{profile.jobTitle}</p>
                      <p className="text-xs text-gray-500">{profile.department}</p>
                    </td>
                    <td className="p-4 text-gray-600">{profile.branch}</td>
                    <td className="p-4 text-gray-600">{profile.joiningDate ? new Date(profile.joiningDate).toLocaleDateString() : 'N/A'}</td>
                    <td className="p-4">
                      <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-medium border border-blue-100">
                        {profile.contractNumber}
                      </span>
                    </td>
                    <td className="p-4 text-right flex justify-end gap-1">
                      <button 
                        onClick={() => setSelectedProfile(profile)}
                        className="text-[var(--color-navy)] hover:text-[var(--color-emerald)] transition-colors p-2"
                        title="View Profile"
                      >
                        <Eye size={20} />
                      </button>
                      <button 
                        onClick={() => handleDelete(profile.employeeId)}
                        className="text-red-500 hover:text-red-700 transition-colors p-2"
                        title="Delete Profile"
                      >
                        <Trash2 size={20} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-gray-500">
                    No staff profiles found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedProfile && (
        <StaffProfileModal 
          profile={selectedProfile} 
          onClose={() => setSelectedProfile(null)} 
        />
      )}
    </div>
  );
}

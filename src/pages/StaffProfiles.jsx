import { useState, useEffect } from "react";
import { Search, Filter, Eye, Trash2 } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import StaffProfileModal from "../components/StaffProfileModal";
import { STAFF_PROFILE_TABS } from "../utils/staffProfileTabs";
import { getStaffProfiles, deleteStaffProfile, updateStaffProfile } from "../utils/storage";

const getProfileWorkLocation = (profile) => {
  return [profile.workLocation1, profile.workLocation2, profile.workLocation3]
    .filter(Boolean)
    .join("; ") || profile.workLocation || profile.branch || "";
};

export default function StaffProfiles() {
  const [profiles, setProfiles] = useState(() => getStaffProfiles());
  const [filteredProfiles, setFilteredProfiles] = useState(() => getStaffProfiles());
  const [searchTerm, setSearchTerm] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [selectedProfile, setSelectedProfile] = useState(() => getStaffProfiles().at(-1) || null);
  const [selectedProfileTab, setSelectedProfileTab] = useState("overview");
  const location = useLocation();
  const navigate = useNavigate();

  const loadProfiles = () => {
    const staff = getStaffProfiles();
    setProfiles(staff);
    setFilteredProfiles(staff);
  };

  useEffect(() => {
    loadProfiles();
  }, []);

  useEffect(() => {
    const employeeId = location.state?.openEmployeeId;
    if (!employeeId || !profiles.length) return;
    const signedProfile = profiles.find((profile) => profile.employeeId === employeeId);
    if (signedProfile) {
      setSelectedProfileTab("overview");
      setSelectedProfile(signedProfile);
    }
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate, profiles]);

  const openProfileTab = (tabId) => {
    setSelectedProfileTab(tabId);
    if (profiles.length) {
      setSelectedProfile(selectedProfile || profiles[0]);
    }
  };

  const handleProfileUpdate = (updatedProfile) => {
    const savedProfile = updateStaffProfile(updatedProfile.employeeId, updatedProfile);
    if (!savedProfile) return;
    setProfiles((current) => current.map((profile) => profile.employeeId === savedProfile.employeeId ? savedProfile : profile));
    setSelectedProfile(savedProfile);
  };

  const handleSelectProfile = (employeeId) => {
    const employee = profiles.find((profile) => profile.employeeId === employeeId);
    if (!employee) return;
    setSelectedProfileTab("overview");
    setSelectedProfile(employee);
  };

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
        getProfileWorkLocation(p).toLowerCase().includes(lower)
      );
    }
    
    if (deptFilter) {
      result = result.filter(p => p.department === deptFilter);
    }
    
    if (locationFilter) {
      result = result.filter(p => getProfileWorkLocation(p) === locationFilter);
    }
    
    setFilteredProfiles(result);
  }, [searchTerm, deptFilter, locationFilter, profiles]);

  const workLocations = [...new Set(profiles.map(getProfileWorkLocation).filter(Boolean))];

  if (selectedProfile) {
    return (
      <div className="-m-4 sm:-m-6 lg:-m-8">
        <StaffProfileModal
          key={`${selectedProfile.employeeId}-${selectedProfileTab}`}
          profile={selectedProfile}
          profiles={profiles}
          embedded
          initialTab={selectedProfileTab}
          onSelectProfile={handleSelectProfile}
          onProfileUpdate={handleProfileUpdate}
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-[var(--color-navy)]">Staff Profiles</h2>
          <p className="text-gray-500">Manage and view all signed employee records.</p>
        </div>
      </div>

      <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-1 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-bold text-slate-900">Employee Profile Workspace</h3>
            <p className="mt-1 text-sm text-slate-500">Select a section to open the signed employee profile.</p>
          </div>
          {!profiles.length && <span className="mt-2 w-fit rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 sm:mt-0">No signed employee yet</span>}
        </div>
        <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3 xl:grid-cols-6">
          {STAFF_PROFILE_TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => openProfileTab(id)}
              className={`flex min-h-16 items-center gap-3 rounded-xl border px-3 py-3 text-left text-sm font-bold transition ${selectedProfileTab === id ? "border-violet-200 bg-violet-50 text-violet-700 shadow-sm" : "border-transparent bg-slate-50 text-slate-600 hover:border-slate-200 hover:bg-white hover:text-slate-900"}`}
            >
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${selectedProfileTab === id ? "bg-violet-600 text-white" : "bg-white text-slate-500 shadow-sm"}`}><Icon size={18} /></span>
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="card mb-6 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Search by name, ID, work location..." 
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
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
            >
              <option value="">All Work Locations</option>
              {workLocations.map((location) => (
                <option key={location} value={location}>{location}</option>
              ))}
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
                <th className="p-4 font-semibold">Work Location</th>
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
                    <td className="p-4 text-gray-600">{getProfileWorkLocation(profile) || "N/A"}</td>
                    <td className="p-4 text-gray-600">{profile.joiningDate ? new Date(profile.joiningDate).toLocaleDateString() : 'N/A'}</td>
                    <td className="p-4">
                      <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-medium border border-blue-100">
                        {profile.contractNumber}
                      </span>
                    </td>
                    <td className="p-4 text-right flex justify-end gap-1">
                      <button 
                        onClick={() => {
                          setSelectedProfileTab("overview");
                          setSelectedProfile(profile);
                        }}
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
          key={`${selectedProfile.employeeId}-${selectedProfileTab}`}
          profile={selectedProfile} 
          initialTab={selectedProfileTab}
          onProfileUpdate={handleProfileUpdate}
          onClose={() => setSelectedProfile(null)} 
        />
      )}
    </div>
  );
}

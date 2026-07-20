import { useState, useEffect } from "react";
import { Search, Filter, Trash2 } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import StaffProfileModal from "../components/StaffProfileModal";
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
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [selectedProfileTab, setSelectedProfileTab] = useState("overview");
  const [directoryTab, setDirectoryTab] = useState("kitchen"); // "kitchen", "management", "locations"
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

  // Filter profiles depending on active directory tab
  const getTabFilteredProfiles = () => {
    if (directoryTab === "kitchen") {
      return filteredProfiles.filter(p => p.department === "Kitchen Staff");
    }
    if (directoryTab === "management") {
      return filteredProfiles.filter(p => p.department === "Management Staff" || p.department === "Management" || (!p.department && p.jobTitle?.toLowerCase().includes("manager")));
    }
    return filteredProfiles;
  };

  const currentTabProfiles = getTabFilteredProfiles();

  const renderStaffCard = (profile) => {
    const initials = String(profile.fullName || "Employee")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("");
    return (
      <div 
        key={profile.employeeId}
        className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-violet-300 hover:shadow-md cursor-pointer"
        onClick={() => {
          setSelectedProfileTab("overview");
          setSelectedProfile(profile);
        }}
      >
        <div className="flex items-start gap-4">
          {profile.profilePhoto ? (
            <img src={profile.profilePhoto} alt="" className="h-16 w-14 rounded-xl object-cover shadow-sm" />
          ) : (
            <div className="flex h-16 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-700 text-lg font-bold text-white shadow-sm">{initials || "E"}</div>
          )}
          <div className="min-w-0">
            <h4 className="truncate font-bold text-slate-900 group-hover:text-violet-700 transition">{profile.fullName}</h4>
            <p className="text-xs font-semibold text-slate-400 mt-0.5">{profile.employeeId}</p>
            <p className="text-xs font-medium text-slate-600 mt-2 truncate bg-slate-50 px-2 py-1 rounded w-fit border border-slate-100">{profile.jobTitle || "No Title"}</p>
          </div>
        </div>
        
        <div className="mt-5 border-t border-slate-100 pt-4 flex flex-col gap-2 text-xs font-medium text-slate-500">
          <div className="flex justify-between">
            <span>Work Location:</span>
            <span className="font-semibold text-slate-700 truncate max-w-[150px]">{getProfileWorkLocation(profile) || "N/A"}</span>
          </div>
          <div className="flex justify-between">
            <span>Joining Date:</span>
            <span className="font-semibold text-slate-700">{profile.joiningDate ? new Date(profile.joiningDate).toLocaleDateString() : 'N/A'}</span>
          </div>
        </div>

        <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
          <button 
            onClick={() => handleDelete(profile.employeeId)}
            className="p-1.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100"
            title="Delete Profile"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    );
  };

  const renderLocationGrouped = (profilesList) => {
    // Group profiles by location
    const grouped = {};
    profilesList.forEach(profile => {
      const loc = getProfileWorkLocation(profile) || "Unassigned Location";
      if (!grouped[loc]) grouped[loc] = [];
      grouped[loc].push(profile);
    });

    return (
      <div className="space-y-8">
        {Object.entries(grouped).map(([locationName, staffList]) => (
          <div key={locationName} className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <h3 className="text-lg font-bold text-slate-800">{locationName} ({staffList.length})</h3>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
              {staffList.map(renderStaffCard)}
            </div>
          </div>
        ))}
        {Object.keys(grouped).length === 0 && (
          <div className="text-center py-12 text-slate-500">No work locations found.</div>
        )}
      </div>
    );
  };

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
          onClose={() => setSelectedProfile(null)}
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-[var(--color-navy)]">Staff Profiles</h2>
          <p className="text-gray-500">Manage and view signed employee records.</p>
        </div>
      </div>

      {/* Directory Tab Switcher */}
      <div className="mb-8 border-b border-slate-200">
        <div className="flex gap-6">
          <button 
            onClick={() => setDirectoryTab("kitchen")}
            className={`pb-3 font-semibold text-sm border-b-2 transition-all ${directoryTab === "kitchen" ? "border-violet-600 text-violet-600" : "border-transparent text-slate-500 hover:text-slate-800"}`}
          >
            Kitchen Staff ({profiles.filter(p => p.department === "Kitchen Staff").length})
          </button>
          <button 
            onClick={() => setDirectoryTab("management")}
            className={`pb-3 font-semibold text-sm border-b-2 transition-all ${directoryTab === "management" ? "border-violet-600 text-violet-600" : "border-transparent text-slate-500 hover:text-slate-800"}`}
          >
            Management Staff ({profiles.filter(p => p.department === "Management Staff" || p.department === "Management" || (!p.department && p.jobTitle?.toLowerCase().includes("manager"))).length})
          </button>
          <button 
            onClick={() => setDirectoryTab("locations")}
            className={`pb-3 font-semibold text-sm border-b-2 transition-all ${directoryTab === "locations" ? "border-violet-600 text-violet-600" : "border-transparent text-slate-500 hover:text-slate-800"}`}
          >
            By Work Location
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="card mb-6 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Search by name, ID, work location..." 
            className="w-full pl-10 pr-4 py-2 border border-[var(--color-border-grey)] rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex gap-4 w-full md:w-auto">
          {directoryTab !== "locations" && (
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
          )}
        </div>
      </div>

      {/* Directory Grid View */}
      {directoryTab === "locations" ? (
        renderLocationGrouped(filteredProfiles)
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {currentTabProfiles.map(renderStaffCard)}
          {currentTabProfiles.length === 0 && (
            <div className="col-span-full text-center py-12 text-slate-500 bg-white rounded-2xl border border-slate-200">
              No staff profiles found for this category.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

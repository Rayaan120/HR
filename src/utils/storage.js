// Initial Mock Data setup if empty
const initializeStorage = () => {
  if (!localStorage.getItem('contracts')) {
    localStorage.setItem('contracts', JSON.stringify([]));
  }
  if (!localStorage.getItem('staff')) {
    localStorage.setItem('staff', JSON.stringify([]));
  }
};

initializeStorage();

export const getContracts = () => {
  return JSON.parse(localStorage.getItem('contracts') || '[]');
};

export const saveContract = (contract) => {
  const contracts = getContracts();
  contracts.push(contract);
  localStorage.setItem('contracts', JSON.stringify(contracts));
};

export const updateContract = (contractNumber, updatedFields) => {
  const contracts = getContracts();
  const index = contracts.findIndex(c => c.contractNumber === contractNumber);
  if (index !== -1) {
    contracts[index] = { ...contracts[index], ...updatedFields };
    localStorage.setItem('contracts', JSON.stringify(contracts));
  }
};

export const getStaffProfiles = () => {
  return JSON.parse(localStorage.getItem('staff') || '[]');
};

export const saveStaffProfile = (profile) => {
  const staff = getStaffProfiles();
  staff.push(profile);
  localStorage.setItem('staff', JSON.stringify(staff));
};

export const deleteStaffProfile = (employeeId) => {
  const staff = getStaffProfiles();
  const filteredStaff = staff.filter(s => s.employeeId !== employeeId);
  localStorage.setItem('staff', JSON.stringify(filteredStaff));
};

// Generates an ID like EMP-0001
export const generateEmployeeId = () => {
  const staff = getStaffProfiles();
  const nextNumber = staff.length + 1;
  return `EMP-${nextNumber.toString().padStart(4, '0')}`;
};

// Generates an ID like CON-2026-0001
export const generateContractNumber = () => {
  const contracts = getContracts();
  const nextNumber = contracts.length + 1;
  const year = new Date().getFullYear();
  return `CON-${year}-${nextNumber.toString().padStart(4, '0')}`;
};

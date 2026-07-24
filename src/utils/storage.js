// Initial Mock Data setup if empty
const initializeStorage = () => {
  if (!localStorage.getItem('contracts')) {
    localStorage.setItem('contracts', JSON.stringify([]));
  }
  if (!localStorage.getItem('staff')) {
    localStorage.setItem('staff', JSON.stringify([]));
  }
  if (!localStorage.getItem('contractDrafts')) {
    localStorage.setItem('contractDrafts', JSON.stringify([]));
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

export const getContractDrafts = () => {
  return JSON.parse(localStorage.getItem('contractDrafts') || '[]');
};

export const saveContractDraft = (draft) => {
  const drafts = getContractDrafts();
  const now = new Date().toISOString();
  const draftToSave = {
    ...draft,
    id: draft.id || crypto.randomUUID(),
    createdAt: draft.createdAt || now,
    updatedAt: now,
  };

  const existingIndex = drafts.findIndex(savedDraft => savedDraft.id === draftToSave.id);
  const updatedDrafts = existingIndex === -1
    ? [draftToSave, ...drafts]
    : drafts.map(savedDraft => savedDraft.id === draftToSave.id ? draftToSave : savedDraft);

  localStorage.setItem('contractDrafts', JSON.stringify(updatedDrafts));
  return draftToSave;
};

export const deleteContractDraft = (id) => {
  const drafts = getContractDrafts();
  localStorage.setItem('contractDrafts', JSON.stringify(drafts.filter(draft => draft.id !== id)));
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

const notifyStaffProfilesChanged = () => {
  window.dispatchEvent(new Event('staffProfilesChanged'));
};

export const saveStaffProfile = (profile) => {
  const staff = getStaffProfiles();
  const existingIndex = staff.findIndex((savedProfile) =>
    (profile.employeeId && savedProfile.employeeId === profile.employeeId)
      || (profile.contractNumber && savedProfile.contractNumber === profile.contractNumber)
  );
  const updatedStaff = existingIndex === -1
    ? [...staff, profile]
    : staff.map((savedProfile, index) => index === existingIndex ? { ...savedProfile, ...profile } : savedProfile);
  localStorage.setItem('staff', JSON.stringify(updatedStaff));
  notifyStaffProfilesChanged();
};

export const updateStaffProfile = (employeeId, updates) => {
  const staff = getStaffProfiles();
  const updatedStaff = staff.map((profile) =>
    profile.employeeId === employeeId ? { ...profile, ...updates } : profile
  );
  localStorage.setItem('staff', JSON.stringify(updatedStaff));
  notifyStaffProfilesChanged();
  return updatedStaff.find((profile) => profile.employeeId === employeeId) || null;
};

export const deleteStaffProfile = (employeeId) => {
  const staff = getStaffProfiles();
  const filteredStaff = staff.filter(s => s.employeeId !== employeeId);
  localStorage.setItem('staff', JSON.stringify(filteredStaff));
  notifyStaffProfilesChanged();
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

const notifyJobPositionsChanged = () => {
  window.dispatchEvent(new Event('jobPositionsChanged'));
};

const notifyWorkLocationsChanged = () => {
  window.dispatchEvent(new Event('workLocationsChanged'));
};

const notifyDepartmentsChanged = () => {
  window.dispatchEvent(new Event('departmentsChanged'));
};

const notifyContractArticlesChanged = () => {
  window.dispatchEvent(new Event('contractArticlesChanged'));
};

export const getJobPositions = () => {
  return JSON.parse(localStorage.getItem('jobPositions') || '[]');
};

export const seedJobPositions = (positions) => {
  const storedJobs = localStorage.getItem('jobPositions');
  if (storedJobs) return JSON.parse(storedJobs);

  localStorage.setItem('jobPositions', JSON.stringify(positions));
  return positions;
};

export const saveJobPosition = (job) => {
  const jobs = getJobPositions();
  const now = new Date().toISOString();
  const newJob = {
    id: crypto.randomUUID(),
    department: job.department,
    title: job.title,
    description: job.description,
    createdAt: now,
    updatedAt: now,
  };

  localStorage.setItem('jobPositions', JSON.stringify([...jobs, newJob]));
  notifyJobPositionsChanged();
  return newJob;
};

export const updateJobPosition = (id, updatedFields) => {
  const jobs = getJobPositions();
  const updatedJobs = jobs.map(job =>
    job.id === id
      ? { ...job, ...updatedFields, updatedAt: new Date().toISOString() }
      : job
  );

  localStorage.setItem('jobPositions', JSON.stringify(updatedJobs));
  notifyJobPositionsChanged();
  return updatedJobs.find(job => job.id === id);
};

export const deleteJobPosition = (id) => {
  const jobs = getJobPositions();
  localStorage.setItem('jobPositions', JSON.stringify(jobs.filter(job => job.id !== id)));
  notifyJobPositionsChanged();
};

const DEFAULT_DEPARTMENTS = ['Kitchen Staff', 'Management Staff'];

export const getDepartments = () => {
  try {
    const saved = JSON.parse(localStorage.getItem('departments') || '[]');
    return [...new Set([...DEFAULT_DEPARTMENTS, ...saved].filter(Boolean))];
  } catch {
    return DEFAULT_DEPARTMENTS;
  }
};

export const saveDepartment = (name) => {
  const departments = getDepartments();
  if (departments.some(department => department.toLowerCase() === name.toLowerCase())) return departments;
  const updated = [...departments, name];
  localStorage.setItem('departments', JSON.stringify(updated));
  notifyDepartmentsChanged();
  return updated;
};

export const deleteDepartment = (name) => {
  const updated = getDepartments().filter(department => department !== name);
  localStorage.setItem('departments', JSON.stringify(updated));
  notifyDepartmentsChanged();
  return updated;
};

export const DEFAULT_CONTRACT_ARTICLES = [
  '1. Employer and Employee / Người sử dụng lao động và Người lao động',
  '2. Work Location',
  '3. Standard Hours',
  '4. Job Description',
  '5. Contract Duration',
  '6. Remuneration / Salary',
  '7. Probation Period, Notice Period & Handover',
  '8. Rights and Obligations of Employee',
  '9. Nghĩa vụ và Quyền lợi của Người sử dụng lao động / Obligations and rights of employers',
  '10. Chính sách nghỉ / Leave Policy',
  '11. Bảo hiểm bắt buộc / Statutory Insurance',
  '12. An toàn, vệ sinh lao động / Occupational safety and Health',
  '13. Đào tạo / Training',
  '14. Chấm dứt hợp đồng / Termination',
  '15. Thời gian báo trước / Notice Period',
  '16. Thanh toán khi chấm dứt hợp đồng / Final Settlement',
  '17. Bảo mật thông tin / Confidentiality',
  '18. Hiệu lực hợp đồng / Effectiveness',
].map((title, index) => ({ id: `article-${index + 1}`, title, content: '', custom: false }));

const withArticleNumber = (title, number) => {
  const text = String(title || '').trim();
  const withoutOldNumber = text.replace(/^\s*\d+\s*[.)-]?\s*/, '');
  return `${number}. ${withoutOldNumber || `New Article`}`;
};

export const renumberContractArticles = (articles) =>
  articles.map((article, index) => ({
    ...article,
    title: withArticleNumber(article.title, index + 1),
  }));

export const getContractArticles = () => {
  try {
    const saved = JSON.parse(localStorage.getItem('contractArticles') || 'null');
    return renumberContractArticles(Array.isArray(saved) && saved.length ? saved : DEFAULT_CONTRACT_ARTICLES);
  } catch {
    return renumberContractArticles(DEFAULT_CONTRACT_ARTICLES);
  }
};

export const saveContractArticles = (articles) => {
  const numberedArticles = renumberContractArticles(articles);
  localStorage.setItem('contractArticles', JSON.stringify(numberedArticles));
  notifyContractArticlesChanged();
  return numberedArticles;
};

export const getWorkLocations = () => {
  return JSON.parse(localStorage.getItem('workLocations') || '[]');
};

export const saveWorkLocation = (name) => {
  const locations = getWorkLocations();
  const now = new Date().toISOString();
  const location = {
    id: crypto.randomUUID(),
    name,
    createdAt: now,
    updatedAt: now,
  };

  localStorage.setItem('workLocations', JSON.stringify([...locations, location]));
  notifyWorkLocationsChanged();
  return location;
};

export const updateWorkLocation = (id, name) => {
  const locations = getWorkLocations();
  const updatedLocations = locations.map(location =>
    location.id === id
      ? { ...location, name, updatedAt: new Date().toISOString() }
      : location
  );

  localStorage.setItem('workLocations', JSON.stringify(updatedLocations));
  notifyWorkLocationsChanged();
  return updatedLocations.find(location => location.id === id);
};

export const deleteWorkLocation = (id) => {
  const locations = getWorkLocations();
  localStorage.setItem('workLocations', JSON.stringify(locations.filter(location => location.id !== id)));
  notifyWorkLocationsChanged();
};

export const DEFAULT_PERMANENT_CLAUSES = {
  // 1. Employer
  companyName: "CÔNG TY TNHH FOOD EMPIRE",
  repName: "TRƯƠNG THỊ THU LIỄU",
  repDesignation: "Giám đốc/Director",
  repPhone: "02583 888 388",
  companyTaxCode: "4202012936",
  companyAddress: "Lot NV 05 - 06, Road No. 28, Phuoc Long New Urban Area, South Nha Trang Ward, Khanh Hoa Province.",

  // 3. Standard Hours
  workingDays: "Monday to Saturday",
  morningShift: "8:00 – 12:00",
  eveningShift: "13:00 – 17:00",

  // 5. Contract Duration
  contractType: "Fixed-term contract",
  contractDuration: "12",
  probationPeriod: "2",
  renewalCondition: "Subject to mutual agreement",

  // 6. Remuneration / Salary
  baseSalary: 0,
  mealAllowance: 0,
  telephoneAllowance: 0,
  transportAllowance: 0,
  clothesAllowance: 0,
  prAllowance: 0,
  medicalAllowance: 0,
  responsibilityAllowance: 0,
  flexibleWorkingHoursAllowance: 0,
  reliabilityAllowance: 0,
  kpiAllowance: 0,
  socialInsurancePct: 8,
  healthInsurancePct: 1.5,
  unemploymentInsurancePct: 1,
  pitNote: "Phụ thuộc vào thu nhập theo quy định của Luật Thuế Việt Nam / Depending on income in compliance with Vietnamese Tax Law.",
  personalIncomeTaxAmount: 0,
  leaveSalaryDeferralClause: "Salary payment date shall be deferred corresponding to the actual number of leave days taken.",
  payrollPeriod: "26th of the previous month to the 25th of the current month",
  paymentDate: "5th of each month",
  paymentMethod: "Bank Transfer",

  // 7.4 Remuneration During Probation
  probationFirstMonthSalary: "85",
  probationSecondMonthSalary: "100",
  insuranceStartAfterMonths: "2",
  probationPayrollStartDay: "26",
  probationPayrollEndDay: "25",
  probationSalaryPaymentDay: "5",
  probationLeaveStartDay: "26",
  probationLeaveEndDay: "4",

  // 8. Rights and Obligations of Employee
  salaryBenefitsClause: "Người lao động có quyền được hưởng lương và các chế độ phúc lợi khác theo đúng thỏa thuận trong hợp đồng này.\nThe Employee is entitled to receive a salary and other benefits as agreed upon in this contract.",
  insuranceClause: "Người lao động được hưởng các chế độ bảo hiểm y tế, bảo hiểm xã hội và bảo hiểm thất nghiệp theo quy định hiện hành của Luật Lao động.\nThe Employee shall be entitled to health insurance, social insurance, and unemployment insurance in accordance with the prevailing Labor Laws.",
  bonusPolicyClause: "Chính sách thưởng: Tiền thưởng (nếu có) sẽ được xem xét và chi trả vào cuối năm, căn cứ vào kết quả đánh giá hiệu suất làm việc của Người lao động, tình hình kinh doanh của Công ty, và quyết định cuối cùng của Công ty; Người lao động chỉ được hưởng thưởng khi vẫn đang làm việc tại thời điểm chi trả và không trong thời gian báo trước chấm dứt hợp đồng.\nBonus Policy: The bonus (if any) shall be reviewed and paid at the end of the year based on the Employee's performance evaluation, the Company's business results, and the Company's final decision; the Employee shall only be eligible for such bonus if he/she is actively employed at the time of payment and not serving any notice period for termination.",
  thirteenthMonthSalaryClause: "Chế độ lương tháng 13: Người lao động được hưởng lương tháng 13 khi đã làm việc đủ 12 tháng liên tục tại Công ty và vẫn đang làm việc tại thời điểm chi trả; trường hợp không làm đủ 12 tháng, đang trong thời gian báo trước, hoặc đã nộp đơn xin nghỉ việc trước thời điểm chi trả thì sẽ không được hưởng khoản lương này, trừ khi có quyết định khác bằng văn bản của Công ty.\n13th Month Salary: The Employee shall be entitled to the 13th month salary upon completing 12 consecutive months of employment and remaining actively employed at the time of payment; in cases where the Employee has not completed 12 months, is serving a notice period, or has submitted a resignation prior to the payment date, he/she shall not be entitled to this benefit, unless otherwise decided in writing by the Company.",
  assignedDutiesClause: "Người lao động có nghĩa vụ hoàn thành các công việc và nhiệm vụ được giao với tinh thần trách nhiệm cao nhất.\nThe Employee shall fulfill the assigned tasks and work duties with the highest sense of responsibility. .",
  companyRulesClause: "Người lao động phải chấp hành nghiêm chỉnh nội quy lao động, kỷ luật của công ty và các quy định về an toàn lao động.\nThe Employee must strictly comply with the company's internal labor rules, discipline, and occupational safety regulations.",
  assetProtectionClause: "Người lao động có nghĩa vụ bảo vệ tài sản của Người sử dụng lao động và giữ bí mật các thông tin về bí mật kinh doanh, công nghệ.\nThe Employee is obligated to protect the Employer's assets and maintain the confidentiality of business and technology secrets.",
  handoverClause: "Khi chấm dứt hợp đồng, Người lao động phải hoàn tất các thủ tục bàn giao công việc, tài liệu và tài sản theo đúng quy định.\nUpon termination of the contract, the Employee must complete all handover procedures for work, documents, and assets as required.",

  // 9. Obligations and rights of employers
  contractImplementationClause: "- Bảo đảm thực hiện đầy đủ những điều khoản trong hợp đồng;\nEnsure full implementation of the terms of the contract;\n- Thanh toán đúng hạn các khoản tiền lương và quyền lợi cho Người lao động theo Hợp đồng này\nPay on time the salaries and benefits to the Employee in accordance with this Contract.",
  employerRightsClause: "- Điều hành, phân công và điều chuyển công việc phù hợp với nhu cầu kinh doanh của Công ty.\nAssign, manage, and reassign work in accordance with the Company's business needs.\n- Giám sát, đánh giá hiệu quả công việc và yêu cầu Người lao động tuân thủ nội quy, quy định của Công ty.\nMonitor and evaluate the Employee's performance and require compliance with Company policies and regulations.\n- Quyết định mức lương, thưởng, điều chỉnh thu nhập và các quyền lợi khác theo chính sách của Công ty và quy định pháp luật.\nDetermine salary, bonuses, income adjustments and other entitlements in line with Company policies and applicable laws.",

  // 10. Leave Policy
  annualLeaveClause: "Người lao động được hưởng 12 ngày nghỉ phép năm có hưởng lương sau khi hoàn thành 12 tháng làm việc liên tục.\nThe Employee is entitled to 12 days of paid annual leave per year upon completion of 12 months of continuous service.",
  proportionalLeaveClause: "Đối với người lao động làm việc chưa đủ một năm, số ngày nghỉ phép năm sẽ được tính theo tỷ lệ tương ứng với số tháng làm việc.\nFor employees with less than one year of service, the number of annual leave days shall be calculated in proportion to the number of months worked.",
  sickLeaveClause: "Để việc nghỉ ốm được ghi nhận hợp lệ, Người lao động có trách nhiệm nộp giấy xác nhận y tế từ cơ sở khám chữa bệnh có thẩm quyền.\nFor any sick leave to be officially recognized, the Employee is required to submit a valid medical certificate from a licensed healthcare provider.",
  publicHolidayClause: "Người lao động được nghỉ làm việc và hưởng nguyên lương trong các ngày Lễ, Tết theo quy định của Bộ luật Lao động Việt Nam.\nThe Employee is entitled to fully paid leave on Public Holidays and New Year Holidays as prescribed by the Labor Code of Vietnam.",

  // 11. Statutory Insurance
  statutoryInsuranceIntro: "Người lao động và Người sử dụng lao động sẽ tham gia bảo hiểm sau 2 tháng thử việc với tỉ lệ:\nThe Employee and the Employer shall participate in compulsory insurance after the 02-month probation period, with contribution rates as follows:",
  employerInsuranceContributionClause: "Phần đóng của Công ty: Bảo hiểm xã hội (17.5%), Bảo hiểm y tế (3%), Bảo hiểm thất nghiệp (1%).\nEmployer's contribution: Social Insurance (17.5%), Health Insurance (3%), Unemployment Insurance (1%)",
  employeeInsuranceContributionClause: "Phần đóng của Người lao động: Bảo hiểm xã hội (8%), Bảo hiểm y tế (1.5%), Bảo hiểm thất nghiệp (1%)\nEmployee's contribution: Social Insurance (8%), Health Insurance (1.5%), Unemployment Insurance (1%)",

  // 12. Occupational safety and Health
  ppeClause: "Công ty có trách nhiệm cung cấp các trang thiết bị bảo hộ lao động cần thiết nhằm đảm bảo an toàn và sức khỏe cho Người lao động theo quy định pháp luật và nội quy của Công ty.\nThe Company shall provide necessary personal protective equipment (PPE) to ensure the Employee's safety and health in the workplace in accordance with applicable laws and internal regulations.",
  employeePpeResponsibilityClause: "Người lao động có trách nhiệm sử dụng và bảo quản đúng cách các trang thiết bị bảo hộ được cấp, đồng thời tuân thủ các hướng dẫn an toàn liên quan.\nThe Employee is responsible for properly using and maintaining the provided protective equipment and complying with all relevant safety instructions.",
  safetyTrainingClause: "Công ty có trách nhiệm tổ chức đào tạo về an toàn, vệ sinh lao động cho Người lao động theo quy định pháp luật và tính chất công việc.\nThe Company shall organize training on occupational safety and health for the Employee in accordance with applicable laws and the nature of the work.",
  employeeTrainingAttendanceClause: "Người lao động có trách nhiệm tham gia đầy đủ các khóa đào tạo và tuân thủ nghiêm túc các quy định về an toàn, vệ sinh lao động,\nThe Employee is required to attend all such training sessions and strictly comply with occupational safety and health regulations.",

  // 13. Training
  trainingScopeClause: "Công ty có thể tổ chức các chương trình đào tạo nhằm nâng cao kiến thức, kỹ năng chuyên môn và hiệu quả công việc của Người lao động theo nhu cầu hoạt động kinh doanh.\nThe Company may provide training programs to enhance the Employee's professional knowledge, skills, and job performance based on business needs.\n\nPhạm vi đào tạo có thể bao gồm đào tạo nội bộ, các khóa học bên ngoài hoặc các chương trình phát triển chuyên môn khác theo quyết định của Công ty.\nThe training scope may include internal training, external courses, or other professional development programs as determined by the Company.",
  trainingCostReimbursementClause: "Trong trường hợp Công ty tài trợ chi phí đào tạo, hai bên có thể ký kết thỏa thuận đào tạo riêng, trong đó quy định rõ chi phí đào tạo, thời gian cam kết làm việc và nghĩa vụ hoàn trả theo quy định pháp luật.\nIn case the Company sponsors training costs, the Parties may enter into a separate training agreement specifying the training expenses, service commitment period, and reimbursement obligations in accordance with applicable laws.\n\nTrường hợp Người lao động nghỉ việc trước khi làm việc đủ 01 (một) năm hoặc không thực hiện đúng thời gian cam kết làm việc, Người lao động có trách nhiệm hoàn trả chi phí đào tạo theo Điều 62 Bộ luật Lao động Việt Nam, phù hợp với thỏa thuận giữa hai bên và quy định pháp luật.\nIf the Employee leaves the job before completing 01 (one) year of service or fails to fulfill the committed service period, the Employee shall be responsible for reimbursing the training costs in accordance with Article 62 of the Labor Code of Vietnam, subject to the agreement between both parties and applicable laws.",

  // 14. Termination
  immediateTerminationClause: "Công ty có quyền chấm dứt hợp đồng ngay lập tức mà không cần báo trước trong trường hợp Người lao động có hành vi vi phạm nghiêm trọng nội quy lao động hoặc quy tắc ứng xử của Công ty theo quy định pháp luật.\n\nThe Company may immediately terminate this Contract without prior notice in the event the Employee commits serious violations of the Company's internal labor regulations or code of conduct, in accordance with applicable laws.\n\nCác hành vi vi phạm có thể bao gồm nhưng không giới hạn ở trộm cắp, gian lận, tiết lộ thông tin bảo mật, bạo lực tại nơi làm việc hoặc các hành vi sai phạm nghiêm trọng khác theo quy định của Công ty và pháp luật.\n\nSuch violations may include, but are not limited to, acts of theft, fraud, disclosure of confidential information, workplace violence, or other serious misconduct as defined by the Company's regulations and applicable laws.",
  unilateralTerminationEmployeeClause: "Người lao động có quyền đơn phương chấm dứt hợp đồng lao động bằng cách thông báo trước bằng văn bản theo thời hạn báo trước được quy định trong Hợp đồng này.\n\nThe Employee has the right to unilaterally terminate this Contract by providing prior written notice in accordance with the notice period stipulated in this Contract. The notice period shall comply with applicable laws depending on the type and term of the labor contract.\n\nThời gian báo trước sẽ tuân theo quy định pháp luật tùy thuộc vào loại và thời hạn của hợp đồng lao động.\nThe notice period shall comply with applicable laws depending on the type and term of the labor contract.\n\nTrường hợp Người lao động đơn phương chấm dứt hợp đồng lao động mà không báo trước hoặc không tuân thủ thời hạn báo trước theo quy định trong Hợp đồng này thì được xem là chấm dứt hợp đồng lao động trái pháp luật theo Điều 40 Bộ luật Lao động 2019. Theo đó, Người lao động có nghĩa vụ:\n\nIf the Employee unilaterally terminates this Contract without prior notice or fails to comply with the notice period stipulated in this Contract, such termination shall be deemed unlawful in accordance with Article 40 of the Labor Code of Vietnam (2019). Accordingly, the Employee shall:\n\n- Không được hưởng trợ cấp thôi việc;\nNot be entitled to severance allowance;\n\n- Phải bồi thường cho Người sử dụng lao động nửa (1/2) tháng tiền lương theo hợp đồng lao động;\nCompensate the Employer with an amount equivalent to half (1/2) month's salary under the labor contract;\n\n- Phải bồi thường một khoản tiền tương ứng với tiền lương trong những ngày không báo trước;\nCompensate an amount corresponding to the salary for the days of non-compliance with the notice period;\n\n- Phải hoàn trả chi phí đào tạo cho Người sử dụng lao động (nếu có).\nReimburse the Employer for training costs (if any).",
  unilateralTerminationEmployerClause: "Công ty có quyền đơn phương chấm dứt hợp đồng lao động theo quy định của Bộ luật Lao động Việt Nam và các quy định pháp luật liên quan.\n\nThe Company has the right to unilaterally terminate this Contract in accordance with the Labor Code of Vietnam and other applicable laws.\n\nCông ty có trách nhiệm thông báo trước bằng văn bản cho Người lao động theo thời gian báo trước theo quy định pháp luật, tùy thuộc vào loại và thời hạn hợp đồng lao động, trừ các trường hợp pháp luật cho phép không cần báo trước.\n\nThe Company shall provide prior written notice to the Employee in compliance with the statutory notice period depending on the type and term of the labor contract, unless otherwise permitted by law.\n\nCác căn cứ để Công ty đơn phương chấm dứt hợp đồng phải tuân theo quy định pháp luật, bao gồm nhưng không giới hạn ở việc Người lao động thường xuyên không hoàn thành công việc, thay đổi cơ cấu tổ chức hoặc các lý do hợp pháp khác.\n\nThe grounds for unilateral termination by the Company shall comply with applicable laws, including but not limited to the Employee's repeated failure to fulfill job duties, organizational restructuring, or other lawful reasons.",
  
  // 15. Notice Period
  noticePeriodCondition: "Người lao động có trách nhiệm thông báo trước ít nhất ba mươi (30) ngày bằng văn bản cho Công ty khi đơn phương chấm dứt hợp đồng lao động.\nThe Employee shall provide at least thirty (30) days' prior written notice to the Company before unilaterally terminating this Contract.",

  // 16. Final Settlement
  terminationHandoverTaskClause: "Khi chấm dứt hợp đồng, Người lao động có trách nhiệm:\nUpon termination, the Employee must:\n\n- Hoàn thành toàn bộ việc bàn giao công việc.\nComplete all required handover tasks.\n\n- Hoàn trả đầy đủ tài sản thuộc sở hữu của Công ty.\nReturn all Company property.\n\n- Ký “Biên bản bàn giao” và các hồ sơ liên quan.\nSign the official Clearance Letter and all relevant handover documents.",
  finalPaymentTimeline: "Sau khi tất cả hồ sơ được hoàn tất và ký đầy đủ, Công ty sẽ thanh toán toàn bộ các khoản còn lại trong vòng bảy (07) ngày làm việc kể từ ngày ký biên bản bàn giao.\nAfter all documents are fully completed and signed, the Company shall release all remaining payments within seven (07) working days from the date of signing the clearance documents.",

  // 17. Confidentiality
  confidentialInformationClause: "Người lao động có trách nhiệm bảo mật tuyệt đối mọi thông tin liên quan đến hoạt động kinh doanh, khách hàng, đối tác, dữ liệu tài chính và quy trình nội bộ của Công ty trong và sau thời gian làm việc.\nThe Employee shall keep strictly confidential all information relating to the Company's business operations, clients, partners, financial data, and internal processes during and after the term of employment.",
  nonDisclosureClause: "Người lao động không được tiết lộ, sử dụng hoặc cho phép sử dụng các thông tin này cho mục đích cá nhân hoặc cho bên thứ ba nếu không có sự đồng ý trước bằng văn bản của Công ty.\nThe Employee shall not disclose, use, or permit the use of such information for personal purposes or for any third party without prior written consent from the Company.",
  breachConsequenceClause: "Mọi hành vi vi phạm điều khoản này có thể dẫn đến xử lý kỷ luật, bồi thường thiệt hại và các trách nhiệm pháp lý khác theo quy định pháp luật.\nAny breach of this clause may result in disciplinary actions, compensation for damages, and other legal liabilities in accordance with applicable laws.",
  postEmploymentRestrictionClause: "Trong thời gian hiệu lực hợp đồng và trong vòng 24 tháng kể từ khi nghỉ việc tại Công ty nhân viên không được phép: Cung cấp thông tin, tiết lộ bí mật kinh doanh của công ty ra ngoài, không được phép hợp tác, sản xuất, kinh doanh, làm đại lý sử dụng, tiết lộ thông tin về khách hàng, mặt hàng, sản phẩm tương tự của Công ty cho bất kỳ tổ chức cá nhân nào nhằm phục vụ công việc riêng cho mình mà chưa được sự đồng ý bằng văn bản từ phía công ty. Trường hợp bị phát hiện - Cá nhân đó sẽ bị khởi tố trước pháp luật.\nDuring the effective period of the contract and within 24 months from the date of leaving the Company, employees are not allowed to: Provide information, disclose the company's business secrets to the outside, are not allowed to cooperate, produce, trade, act as agents to use, disclose information about customers, goods, similar products of the Company to any individual or organization to serve their own work without written consent from the Company. In case of discovery - That individual will be prosecuted before the law.",

  // 18. Effectiveness
  effectivenessClause: "Hợp đồng này có hiệu lực kể từ ngày ký và được lập thành hai (02) bản có giá trị pháp lý như nhau, mỗi bên giữ một (01) bản.\nThis Agreement shall take effect from the date of signing and is made in two (02) originals of equal legal validity, each Party retains one (01) copy."
};

export const getPermanentClauses = () => {
  try {
    const saved = localStorage.getItem('adminPermanentClauses');
    return saved ? { ...DEFAULT_PERMANENT_CLAUSES, ...JSON.parse(saved) } : DEFAULT_PERMANENT_CLAUSES;
  } catch (e) {
    return DEFAULT_PERMANENT_CLAUSES;
  }
};

export const savePermanentClauses = (clauses) => {
  localStorage.setItem('adminPermanentClauses', JSON.stringify(clauses));
  window.dispatchEvent(new Event('permanentClausesChanged'));
};

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Save, FileText, Download, CheckCircle, ChevronRight, ChevronDown } from "lucide-react";
import { generateContractNumber, generateEmployeeId, getJobPositions, saveContract, saveStaffProfile, seedJobPositions } from "../utils/storage";
import { buildContractExportFilename, fillContractPdf } from "../utils/fillContractPdf";

const JOB_TITLE_OPTIONS = {
  "Management Staff": [
    "HR",
    "Branch Manager",
    "Purchase and Inventory Controller",
    "Office Admin and Doument Controller",
    "Accountant",
    "Marketing Executive",
  ],
  "Kitchen Staff": [
    "Cashier",
    "Dough",
    "Cooking",
    "Wrapping",
    "Helping",
  ],
};

const DEFAULT_JOB_DESCRIPTION_HEADING = "As assigned by the line manager";

const HR_JOB_DESCRIPTION = `1. Identifying manpower requirements.
Xác định nhu cầu nhân sự.
2. Advertising job posts on online portals to get the best candidates and handling the employment process.
Đăng tin tuyển dụng trên các cổng thông tin trực tuyến để tìm ứng viên tốt nhất và quản lý toàn bộ quy trình tuyển dụng.
3. Creating schedules, meetings, interviews, and other HR activities.
Lập lịch trình, tổ chức các cuộc họp, phỏng vấn và các hoạt động nhân sự khác.
4. Reviewing CVs, shortlisting candidates, and assisting in the recruitment process.
Xem xét hồ sơ ứng viên, lập danh sách rút gọn và hỗ trợ quá trình tuyển dụng.
5. Handling the orientation of new employees and preparing joining letters.
Tổ chức hướng dẫn nhân viên mới và chuẩn bị thư mời gia nhập.
6. Handling performance reviews with management and procedure appraisals.
Thực hiện đánh giá hiệu suất cùng Ban quản lý và các thủ tục đánh giá.
7. Entering the data in the system for the employees and sending reports to management.
Nhập dữ liệu nhân viên vào hệ thống và gửi báo cáo cho Ban quản lý.
8. Entering employee timesheet data in the system to produce salary slips.
Nhập dữ liệu chấm công vào hệ thống để lập phiếu lương.
9. Conducting exit interviews with outgoing employees.
Thực hiện phỏng vấn thôi việc với nhân viên nghỉ việc.
10. Handling and organizing data/records of each employee of the organization.
Quản lý và sắp xếp dữ liệu/hồ sơ của từng nhân viên trong công ty.
11. Updating the organizational chart with management.
Cập nhật sơ đồ tổ chức cùng Ban quản lý.
12. Maintain accurate employee records, contracts, and other HR documents.
Quản lý hồ sơ nhân viên, hợp đồng và các tài liệu nhân sự khác.
13. Track attendance, leaves, overtime, and ensure records are up to date.
Theo dõi chấm công, nghỉ phép, làm thêm giờ và cập nhật hồ sơ đầy đủ.
14. Draft HR letters, memos, and other internal documents as required.
Soạn thảo thư, thông báo và các văn bản nội bộ khác khi cần.
15. Support monthly payroll preparation and salary disbursement.
Hỗ trợ chuẩn bị bảng lương hàng tháng và chi trả lương.
16. Assist with employee insurance, social insurance, and personal income tax processes.
Hỗ trợ quản lý bảo hiểm nhân viên, BHXH, BHYT và thủ tục thuế TNCN.
17. Ensure HR practices comply with labor laws and company policies.
Đảm bảo các quy trình HR tuân thủ luật lao động và chính sách công ty.
18. Prepare HR reports for Management on request.
Lập các báo cáo HR cho Ban quản lý khi được yêu cầu.
19. Participate in meetings, take notes, and provide HR updates to Management.
Tham dự các cuộc họp, ghi biên bản và báo cáo thông tin HR cho Ban quản lý.
20. Assist in employee performance review processes and documentation.
Hỗ trợ quy trình đánh giá hiệu quả công việc và lưu trữ kết quả.
21. Coordinate employee training programs and development initiatives.
Phối hợp tổ chức đào tạo nhân viên và các chương trình phát triển năng lực.
22. Provide HR support to employees and maintain positive workplace relations.
Hỗ trợ nhân viên và duy trì mối quan hệ làm việc tích cực.
23. Handle HR-related requests or issues from staff promptly.
Xử lý kịp thời các yêu cầu hoặc vấn đề liên quan đến nhân sự từ nhân viên.
24. Work closely with Management on HR-related activities as requested.
Phối hợp chặt chẽ với Ban quản lý trong các hoạt động HR khi được yêu cầu.
25. Perform other HR-related tasks as assigned.
Thực hiện các công việc khác liên quan HR theo phân công.`;

const PURCHASING_JOB_DESCRIPTION = `1. Collect invoices, verify bills, input data, and prepare daily reports.
Thu thập hóa đơn, xác minh chứng từ, nhập dữ liệu và lập báo cáo hàng ngày.

2. Monitor inventory, conduct stock checks, and place orders.
Theo dõi hàng tồn kho, tiến hành kiểm kê kho và đặt hàng.

3. Manage supplier data and ensure deliveries meet timelines, quality standards, and required quantities.
Quản lý dữ liệu nhà cung cấp và đảm bảo việc giao hàng đúng tiến độ, đạt tiêu chuẩn chất lượng và đủ số lượng yêu cầu.

4. Update existing supplier lists and source new suppliers.
Cập nhật danh sách nhà cung cấp hiện tại và tìm kiếm các nhà cung cấp mới.

5. Check and maintain product quality at branches and assure the quality of products are as per the standards.
Kiểm tra, duy trì chất lượng sản phẩm tại các chi nhánh và đảm bảo chất lượng sản phẩm tuân thủ theo đúng các tiêu chuẩn quy định.

6. Prepare and submit daily, weekly, and monthly reports to the Manager.
Lập và nộp các báo cáo hàng ngày, hàng tuần và hàng tháng cho Quản lý.

7. Perform other tasks as assigned by the Manager.
Thực hiện các công việc khác theo sự phân công của Quản lý.`;

const CASHIER_JOB_DESCRIPTION = `1. Manage transaction with customers using cash registers
Quản lý giao dịch với khách hàng bằng máy tính tiền

2. Collect payment whether in cash or transfer
Thu tiền cho dù bằng tiền mặt hay chuyển khoản

3. Issue receipts, if necessary
Phát hành biên lai, nếu cần thiết

4. Redeem vouchers and coupons
Đổi phiếu giảm giá và phiếu giảm giá

5. Cross-sell products and introduce new ones
Bán chéo sản phẩm và giới thiệu sản phẩm mới

6. Resolve customer complaints, guide them and provide relevant information
Giải quyết khiếu nại của khách hàng, hướng dẫn họ và cung cấp thông tin liên quan

7. Greet customers when entering or leaving the store
Chào đón khách hàng khi vào hoặc ra khỏi cửa hàng

8. Maintain clean and tidy checkout areas
Duy trì các khu vực thanh toán sạch sẽ và gọn gàng

9. Cash closing with the management
Chốt tiền mặt với ban quản lý

10. Process the check in customer orders in POS system either eat in or takeaway
Xử lý việc kiểm tra đơn đặt hàng của khách hàng trong hệ thống POS ăn tại chỗ hoặc mang đi

11. Process delivery orders from grab application
Quy trình Đơn hàng giao hàng từ ứng dụng Grab

12. Ensure the timely deliveries for the orders
Đảm bảo giao hàng kịp thời cho các đơn hàng

13. Other related requests from the management
Các yêu cầu liên quan khác từ ban quản lý`;

const DOUGH_JOB_DESCRIPTION = `1. Receive and check the quantity and quality of new products in the morning
Tiếp nhận và kiểm tra số lượng và chất lượng sản phẩm mới vào buổi sáng

2. Prepare & pre - process raw materials.
Chuẩn bị & sơ chế nguyên liệu.

3. Prepare and make the dough, ensure the daily stock of dough
Chuẩn bị và làm bột, đảm bảo lượng bột dự trữ hàng ngày

4. Fried pita as the process
Chiên Pita như quy trình

5. Clean the kitchen area and the working area
Dọn dẹp khu vực bếp và khu vực làm việc

6. Support staffs in the kitchen if required
Hỗ trợ nhân viên trong bếp nếu có yêu cầu

7. Check and do cleaning according the cleaning checklist and sign on it
Kiểm tra và làm sạch theo danh sách kiểm tra làm sạch và ký vào đó

8. Report the dough at the end of the day for wrapping to report for manager
Báo cáo bột vào cuối ngày để gói để báo cáo cho người quản lý

9. Responsible to take care the kitchen equipment in the kitchen
Chịu trách nhiệm chăm sóc các thiết bị nhà bếp trong bếp

10. Hand over the work for the next shift
Bàn giao công việc cho ca tiếp theo`;

const WRAPPING_JOB_DESCRIPTION = `1. Receive and check the quantity and quality of new products in the morning
Tiếp nhận và kiểm tra số lượng và chất lượng sản phẩm mới vào buổi sáng

2. Calculate, prepare correct and sufficient amount of material in the shift
Tính toán, chuẩn bị đúng và đủ lượng nguyên liệu trong ca

3. Summarize orders, coordinate with cooking & Dough position to prepare enough ingredients for orders
Tổng hợp đơn hàng, phối hợp với vị trí cooking & dough chuẩn bị đủ nguyên liệu cho đơn hàng

4. Wrapping, checking product quality before giving to customers
Đóng gói, kiểm tra chất lượng sản phẩm trước khi đưa cho khách hàng

5. Check and do cleaning according the cleaning checklist and sign on it
Kiểm tra và làm vệ sinh theo vệ sinh danh sách kiểm tra và ký vào nó

6. Do the daily inventory and send the report to manager as the process
Thực hiện kiểm kê hàng ngày và gửi báo cáo cho người quản lý theo quy trình

7. Responsible to the daily inventory report when it is wrong
Chịu trách nhiệm về báo cáo hàng tồn kho hàng ngày khi sai

8. Do the weekly inventory on Wednesday and send the report to manager
Thực hiện kiểm kê hàng tuần vào thứ 4 và gửi báo cáo cho người quản lý

9. Check and do cleaning the seating area, kitchen area and stairway area when begin the shift
Kiểm tra và dọn dẹp khu vực tiếp khách, khu vực bếp và khu vực cầu thang khi bắt đầu ca làm việc

10. Clean the floor, stairway and kitchen equipment
Vệ sinh sàn nhà, cầu thang và thiết bị nhà bếp

11. Clean the dining table of guests. Check every 10 minute
Vệ sinh bàn ăn của khách. Kiểm tra 10 phút một lần

12. Ensure the spice tray always enough material and clean before serve for guest
Đảm bảo khay gia vị luôn đủ nguyên liệu và vệ sinh trước khi phục vụ cho khách

13. Check and fill in the beverages for the fridge
Kiểm tra và điền vào đồ uống cho tủ lạnh

14. Clean the kitchen area and the working area
Làm sạch khu vực bếp và khu vực làm việc

15. Clean the rest room when begin the shift
Dọn dẹp phòng vệ sinh khi bắt đầu ca làm việc

16. Support staffs in the kitchen if required
Hỗ trợ nhân viên trong bếp nếu có yêu cầu

17. Responsible to take care the kitchen equipment in the kitchen
Chịu trách nhiệm chăm sóc các thiết bị nhà bếp trong bếp

18. Hand over the work for the next shift
Bàn giao công việc cho ca tiếp theo`;

const COOKING_JOB_DESCRIPTION = `1. Receive and check the quantity and quality of new meat in the morning
Tiếp nhận và kiểm tra số lượng và chất lượng thịt mới vào buổi sáng

2. Prepare and pre - process raw material
Chuẩn bị và chế biến trước nguyên liệu

3. Calculate correct and sufficient amount of meat to cook for order as the process
Tính toán lượng thịt chính xác và đủ để nấu theo thứ tự như quy trình

4. Control the quantity and quality of meat in the freezer
Kiểm soát số lượng và chất lượng thịt trong tủ đông

5. Fried pita and fries
Chiên Pita và khoai tây chiên

6. Clean the kitchen area and the working area
Dọn dẹp khu vực bếp và khu vực làm việc

7. Support staffs in the kitchen if required
Hỗ trợ nhân viên trong bếp nếu có yêu cầu

8. Check and do cleaning according the cleaning checklist and sign on it
Kiểm tra và dọn dẹp theo danh sách kiểm tra vệ sinh và ký tên

9. Clean the kitchen hood twice/ week
Làm sạch Máy hút mùi nhà bếp hai lần / tuần

10. Responsible to take care the kitchen equipment in the kitchen
Chịu trách nhiệm chăm sóc các thiết bị nhà bếp trong bếp

11. Take out the trash when finish the shift
Đổ rác khi kết thúc ca làm việc

12. Hand over the work for the next shift
Bàn giao công việc cho ca làm việc tiếp theo`;

const JOB_DESCRIPTION_BY_TITLE = {
  HR: HR_JOB_DESCRIPTION,
  "Purchase and Inventory Controller": PURCHASING_JOB_DESCRIPTION,
  Cashier: CASHIER_JOB_DESCRIPTION,
  Dough: DOUGH_JOB_DESCRIPTION,
  Wrapping: WRAPPING_JOB_DESCRIPTION,
  Cooking: COOKING_JOB_DESCRIPTION,
};

const DEFAULT_JOB_POSITIONS = Object.entries(JOB_TITLE_OPTIONS).flatMap(([department, titles]) =>
  titles.map((title) => ({
    id: `${department}-${title}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
    department,
    title,
    description: JOB_DESCRIPTION_BY_TITLE[title] || DEFAULT_JOB_DESCRIPTION_HEADING,
  }))
);

// Collapsible Form Section Component
function FormSection({ title, children, defaultOpen = true }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="mb-4 border border-[var(--color-border-grey)] rounded-lg overflow-hidden bg-white shadow-sm">
      <button 
        type="button"
        className="w-full flex justify-between items-center p-4 bg-gray-50 hover:bg-gray-100 transition-colors font-bold text-[var(--color-navy)]"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{title}</span>
        {isOpen ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
      </button>
      {isOpen && (
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {children}
        </div>
      )}
    </div>
  );
}

function ContractGenerator() {
  const navigate = useNavigate();

  const [contractNumber, setContractNumber] = useState("");
  const [isGenerated, setIsGenerated] = useState(false);
  const [isSigned, setIsSigned] = useState(false);
  const [jobPositions, setJobPositions] = useState(() => seedJobPositions(DEFAULT_JOB_POSITIONS));
  
  const [formData, setFormData] = useState({
    // 1. Employer / Người sử dụng lao động
    companyName: "CÔNG TY TNHH FOOD EMPIRE",
    repName: "TRƯƠNG THỊ THU LIỄU",
    repDesignation: "Giám đốc/Director",
    repPhone: "02583 888 388",
    companyTaxCode: "4202012936",
    companyAddress: "Lô NV 05 – 06, Đường số 28, KĐTM Phước Long, Phường Nam Nha Trang, Tỉnh Khánh Hòa Lot NV 05 - 06, Road No. 28, Phuoc Long New Urban Area, South Nha Trang Ward, Khanh Hoa Province.",
    
    // 2. Employee / Người lao động
    fullName: "",
    gender: "Male",
    dob: "",
    idNumber: "",
    address: "",
    phoneNumber: "",
    email: "",
    
    // 3. Branch / Work Location
    branch1Address: "Branch 1 Address Details",
    branch2Address: "Branch 2 Address Details",
    branch3Address: "Branch 3 Address Details",
    branch: "",
    workLocation: "",

    // 4. Standard Hours
    workingDays: "Monday to Saturday",
    morningShift: "8:00 – 12:00",
    afternoonShift: "13:00 – 17:00",

    // 5. Job Description
    jobTitle: "",
    department: "Kitchen Staff",
    jobDescriptionHeading: DEFAULT_JOB_DESCRIPTION_HEADING,

    // 6. Contract Duration
    contractType: "Fixed-term contract",
    contractDuration: "12",
    probationPeriod: "2",
    contractStartDate: "",
    contractEndDate: "",
    renewalCondition: "Subject to mutual agreement",

    // 7. Probation Period
    probationStartDate: "",
    probationEndDate: "",
    probationFirstMonthSalary: "85",
    probationSecondMonthSalary: "100",
    insuranceStartCondition: "Starts after 2 months probation",

    // 8. Remuneration / Salary
    baseSalary: 0,
    reliabilityAllowance: 0,
    kpiAllowance: 0,
    grossSalary: 0,
    socialInsurancePct: 8,
    healthInsurancePct: 1.5,
    unemploymentInsurancePct: 1,
    totalInsurance: 0,
    pitNote: "Personal income tax will be deducted before net salary payment according to current laws.",
    netSalary: 0,
    payrollPeriod: "26th of the previous month to the 25th of the current month",
    paymentDate: "5th of each month",
    paymentMethod: "Bank Transfer",

    // 9. Notice Period & Handover
    noticePeriodFirstMonth: "1 week",
    noticePeriodSecondMonth: "1 month",
    handoverCondition: "Handover must be documented in writing and acknowledged.",

    // 10. Rights of Employee
    salaryBenefitsClause: "Salary and benefits as agreed.",
    insuranceClause: "Insurance according to the law.",
    bonusPolicyClause: "Bonus policy according to company regulations.",

    // 11. Obligations of Employee
    assignedDutiesClause: "Complete assigned duties responsibly.",
    companyRulesClause: "Follow company rules and discipline.",
    safetyRegulationsClause: "Follow occupational safety regulations.",
    assetProtectionClause: "Protect company assets.",
    confidentialityClause: "Maintain confidentiality.",
    handoverClause: "Complete handover on termination.",

    // 12. Obligations and Rights of Employer
    contractImplementationClause: "Ensure contract terms are implemented.",
    performanceMonitoringClause: "Manage and evaluate employee performance.",
    salaryDecisionClause: "Determine salary, bonuses, adjustments, and benefits.",

    // 13. Leave Policy
    annualLeaveClause: "Paid annual leave after 12 months of continuous service.",
    annualLeaveDays: "12",
    proportionalLeaveClause: "Calculated proportionally for less than one year.",
    sickLeaveClause: "Sick leave requires medical documentation.",
    medicalCertificateRequirement: "Requires a valid medical certificate.",
    publicHolidayClause: "Paid according to applicable law.",

    // 14. Statutory Insurance
    // Percentages and start condition are shared with section 7 and 8

    // 15. Protective Equipment
    ppeClause: "Company shall provide necessary PPE.",
    employeePpeResponsibilityClause: "Employee must properly use and maintain provided PPE.",

    // 16. Health and Safety Training
    safetyTrainingClause: "Company shall organize health and safety training.",
    employeeTrainingAttendanceClause: "Employee must attend training and comply with safety rules.",

    // 17. Training
    trainingScopeClause: "As required by the company for the job role.",
    trainingCostReimbursementClause: "Employee may be responsible for reimbursing training costs if leaving early.",

    // 18. Termination
    immediateTerminationClause: "Immediate termination may apply for serious misconduct.",
    seriousViolationExamples: "Theft, fraud, disclosure of confidential information, workplace violence.",
    unilateralTerminationEmployeeClause: "Employee may unilaterally terminate with proper notice.",
    unilateralTerminationEmployerClause: "Employer may unilaterally terminate with proper notice.",
    noticePeriodCondition: "Notice period as defined in section 9.",
    compensationCondition: "Compensation claims may apply for breach.",
    trainingCostReimbursementCondition: "Reimbursement as defined in section 17.",
    terminationHandoverTaskClause: "Employee must complete handover tasks.",
    returnCompanyPropertyClause: "Employee must return company property.",
    clearanceLetterClause: "Employee must sign clearance / handover documents.",
    finalPaymentTimeline: "7 working days after clearance documents are completed.",

    // 19. Confidentiality
    confidentialInformationClause: "Employee must keep business operations and data confidential.",
    nonDisclosureClause: "Employee must not disclose or use confidential information without consent.",
    breachConsequenceClause: "Breach may result in disciplinary action or legal liabilities.",
    postEmploymentRestriction24Months: false,

    // 20. Signature
    employerSignatureName: "",
    employeeSignatureName: "",
    dateOfSigning: new Date().toISOString().split('T')[0],
    preparedBy: "HR Admin",
  });

  // Auto calculate salaries and insurances
  useEffect(() => {
    const base = Number(formData.baseSalary) || 0;
    const reliability = Number(formData.reliabilityAllowance) || 0;
    const kpi = Number(formData.kpiAllowance) || 0;
    
    const gross = base + reliability + kpi;
    
    const socialAmount = base * (Number(formData.socialInsurancePct) / 100);
    const healthAmount = base * (Number(formData.healthInsurancePct) / 100);
    const unemploymentAmount = base * (Number(formData.unemploymentInsurancePct) / 100);
    
    const totalIns = socialAmount + healthAmount + unemploymentAmount;
    const net = gross - totalIns;
    
    setFormData(prev => ({
      ...prev,
      grossSalary: gross,
      totalInsurance: totalIns,
      netSalary: net
    }));
  }, [formData.baseSalary, formData.reliabilityAllowance, formData.kpiAllowance, formData.socialInsurancePct, formData.healthInsurancePct, formData.unemploymentInsurancePct]);

  // Sync employer and employee names to signature fields automatically if they are blank
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      employerSignatureName: prev.repName || prev.employerSignatureName,
      employeeSignatureName: prev.fullName || prev.employeeSignatureName
    }));
  }, [formData.repName, formData.fullName]);

  useEffect(() => {
    const syncJobPositions = () => {
      setJobPositions(getJobPositions());
    };

    window.addEventListener('jobPositionsChanged', syncJobPositions);
    window.addEventListener('storage', syncJobPositions);

    return () => {
      window.removeEventListener('jobPositionsChanged', syncJobPositions);
      window.removeEventListener('storage', syncJobPositions);
    };
  }, []);

  useEffect(() => {
    setFormData(prev => {
      const selectedJob = jobPositions.find(job =>
        job.title === prev.jobTitle && job.department === prev.department
      );

      if (!selectedJob) {
        if (prev.jobTitle) {
          return {
            ...prev,
            jobTitle: "",
            jobDescriptionHeading: DEFAULT_JOB_DESCRIPTION_HEADING
          };
        }

        return prev;
      }

      if (selectedJob.description !== prev.jobDescriptionHeading) {
        return {
          ...prev,
          jobDescriptionHeading: selectedJob.description
        };
      }

      return prev;
    });
  }, [jobPositions]);

  const departments = [...new Set(["Kitchen Staff", "Management Staff", ...jobPositions.map(job => job.department)])];
  const availableJobPositions = jobPositions.filter(job => job.department === formData.department);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === "department") {
      selectDepartment(value);
      return;
    }

    if (name === "jobTitle") {
      const selectedJob = jobPositions.find(job => job.id === value);
      setFormData(prev => ({
        ...prev,
        jobTitle: selectedJob?.title || "",
        jobDescriptionHeading: selectedJob?.description || DEFAULT_JOB_DESCRIPTION_HEADING
      }));
      return;
    }

    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
  };

  const handleGenerate = () => {
    const newContractNumber = generateContractNumber();
    setContractNumber(newContractNumber);
    
    const newContract = {
      ...formData,
      contractNumber: newContractNumber,
      status: "Pending Signature",
      createdAt: new Date().toISOString()
    };
    
    saveContract(newContract);
    setIsGenerated(true);
    alert("Contract generated and saved as Pending Signature!");
  };

  const handleMarkAsSigned = () => {
    if (!isGenerated) {
      alert("Please generate the contract first.");
      return;
    }
    
    const empId = generateEmployeeId();
    
    const newStaffProfile = {
      ...formData,
      employeeId: empId,
      contractNumber: contractNumber,
      contractStatus: "Signed",
      createdAt: new Date().toISOString()
    };
    
    saveStaffProfile(newStaffProfile);
    setIsSigned(true);
    alert(`Contract marked as signed! Staff profile created with ID: ${empId}`);
    navigate("/staff-profiles");
  };

  const handleExportPDF = async () => {
    if (!formData.companyName || !formData.fullName) {
      alert("Please fill in at least the Company Name and Employee Full Name before exporting.");
      return;
    }
    const employeeId = formData.employeeId || contractNumber || generateEmployeeId();
    const filename = buildContractExportFilename(formData, employeeId);
    await fillContractPdf({ ...formData, employeeId }, filename);
  };

  const selectDepartment = (dept) => {
    setFormData(prev => ({ 
      ...prev, 
      department: dept,
      jobTitle: "",
      jobDescriptionHeading: DEFAULT_JOB_DESCRIPTION_HEADING
    }));
  };

  return (
    <div className="max-w-6xl mx-auto pb-24">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-[var(--color-navy)]">Employment Contract Generator</h2>
      </div>

      <div className="space-y-2">
          <FormSection title="Department" defaultOpen={true}>
            <div className="col-span-1 md:col-span-2">
              <label className="label">Department</label>
              <select name="department" value={formData.department} onChange={handleChange} className="input-field">
                {departments.map((department) => (
                  <option key={department} value={department}>{department}</option>
                ))}
              </select>
            </div>
          </FormSection>

          <FormSection title="Contract Date" defaultOpen={true}>
            <div className="col-span-1 md:col-span-2">
              <label className="label">Nha Trang, ngày tháng năm / Nha Trang, date month year</label>
              <input type="date" name="dateOfSigning" value={formData.dateOfSigning} onChange={handleChange} className="input-field" />
            </div>
          </FormSection>

          <FormSection title="1. Employer / Người sử dụng lao động" defaultOpen={false}>
            <div><label className="label">Employer company name</label><input type="text" name="companyName" value={formData.companyName} onChange={handleChange} className="input-field" /></div>
            <div><label className="label">Representative name</label><input type="text" name="repName" value={formData.repName} onChange={handleChange} className="input-field" /></div>
            <div><label className="label">Representative designation</label><input type="text" name="repDesignation" value={formData.repDesignation} onChange={handleChange} className="input-field" /></div>
            <div><label className="label">Representative phone</label><input type="text" name="repPhone" value={formData.repPhone} onChange={handleChange} className="input-field" /></div>
            <div><label className="label">Company tax code</label><input type="text" name="companyTaxCode" value={formData.companyTaxCode} onChange={handleChange} className="input-field" /></div>
            <div className="col-span-1 md:col-span-2"><label className="label">Employer address</label><input type="text" name="companyAddress" value={formData.companyAddress} onChange={handleChange} className="input-field" /></div>
          </FormSection>

          <FormSection title="2. Employee / Người lao động" defaultOpen={true}>
            <div><label className="label">Employee full name</label><input type="text" name="fullName" value={formData.fullName} onChange={handleChange} className="input-field" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label">Gender</label><select name="gender" value={formData.gender} onChange={handleChange} className="input-field"><option>Male</option><option>Female</option><option>Other</option></select></div>
              <div><label className="label">Date of birth</label><input type="date" name="dob" value={formData.dob} onChange={handleChange} className="input-field" /></div>
            </div>
            <div><label className="label">ID number</label><input type="text" name="idNumber" value={formData.idNumber} onChange={handleChange} className="input-field" /></div>
            <div><label className="label">Employee address</label><input type="text" name="address" value={formData.address} onChange={handleChange} className="input-field" /></div>
            <div><label className="label">Phone number</label><input type="text" name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} className="input-field" /></div>
            <div><label className="label">Email address</label><input type="email" name="email" value={formData.email} onChange={handleChange} className="input-field" /></div>
          </FormSection>

          <FormSection title="3. Branch / Work Location" defaultOpen={false}>
            <div><label className="label">Branch 1 address</label><input type="text" name="branch1Address" value={formData.branch1Address} onChange={handleChange} className="input-field" /></div>
            <div><label className="label">Branch 2 address</label><input type="text" name="branch2Address" value={formData.branch2Address} onChange={handleChange} className="input-field" /></div>
            <div><label className="label">Branch 3 address</label><input type="text" name="branch3Address" value={formData.branch3Address} onChange={handleChange} className="input-field" /></div>
            <div><label className="label">Branch</label><input type="text" name="branch" value={formData.branch} onChange={handleChange} className="input-field" /></div>
            <div className="col-span-1 md:col-span-2"><label className="label">Work location</label><input type="text" name="workLocation" value={formData.workLocation} onChange={handleChange} className="input-field" /></div>
          </FormSection>

          <FormSection title="4. Standard Hours" defaultOpen={false}>
            <div className="col-span-1 md:col-span-2"><label className="label">Working days</label><input type="text" name="workingDays" value={formData.workingDays} onChange={handleChange} className="input-field" /></div>
            <div><label className="label">Morning working time</label><input type="text" name="morningShift" value={formData.morningShift} onChange={handleChange} className="input-field" /></div>
            <div><label className="label">Afternoon working time</label><input type="text" name="afternoonShift" value={formData.afternoonShift} onChange={handleChange} className="input-field" /></div>
          </FormSection>

          <FormSection title="5. Job Description" defaultOpen={true}>
            <div className="col-span-1 md:col-span-2"><label className="label">Job title</label><select name="jobTitle" value={availableJobPositions.find(job => job.title === formData.jobTitle)?.id || ""} onChange={handleChange} className="input-field"><option value="">Select job title</option>{availableJobPositions.map((job) => <option key={job.id} value={job.id}>{job.title}</option>)}</select></div>
            <div className="col-span-1 md:col-span-2"><label className="label">Job description</label><textarea name="jobDescriptionHeading" value={formData.jobDescriptionHeading} onChange={handleChange} className="input-field h-80 leading-relaxed" /></div>
          </FormSection>

          <FormSection title="6. Contract Duration" defaultOpen={false}>
            <div><label className="label">Contract type</label><input type="text" name="contractType" value={formData.contractType} onChange={handleChange} className="input-field" /></div>
            <div><label className="label">Contract duration (Months)</label><input type="number" name="contractDuration" value={formData.contractDuration} onChange={handleChange} className="input-field" /></div>
            <div><label className="label">Probation period (Months)</label><input type="number" name="probationPeriod" value={formData.probationPeriod} onChange={handleChange} className="input-field" /></div>
            <div><label className="label">Contract start date</label><input type="date" name="contractStartDate" value={formData.contractStartDate} onChange={handleChange} className="input-field" /></div>
            <div><label className="label">Contract end date</label><input type="date" name="contractEndDate" value={formData.contractEndDate} onChange={handleChange} className="input-field" /></div>
            <div className="col-span-1 md:col-span-2"><label className="label">Renewal condition</label><textarea name="renewalCondition" value={formData.renewalCondition} onChange={handleChange} className="input-field h-16" /></div>
          </FormSection>

          <FormSection title="7. Probation Period" defaultOpen={false}>
            <div><label className="label">Probation start date</label><input type="date" name="probationStartDate" value={formData.probationStartDate} onChange={handleChange} className="input-field" /></div>
            <div><label className="label">Probation end date</label><input type="date" name="probationEndDate" value={formData.probationEndDate} onChange={handleChange} className="input-field" /></div>
            <div><label className="label">First month salary percentage (%)</label><input type="number" name="probationFirstMonthSalary" value={formData.probationFirstMonthSalary} onChange={handleChange} className="input-field" /></div>
            <div><label className="label">Second month salary percentage (%)</label><input type="number" name="probationSecondMonthSalary" value={formData.probationSecondMonthSalary} onChange={handleChange} className="input-field" /></div>
            <div className="col-span-1 md:col-span-2"><label className="label">Insurance start condition</label><input type="text" name="insuranceStartCondition" value={formData.insuranceStartCondition} onChange={handleChange} className="input-field" /></div>
          </FormSection>

          <FormSection title="8. Remuneration / Salary" defaultOpen={true}>
            <div><label className="label">Base salary</label><input type="number" name="baseSalary" value={formData.baseSalary} onChange={handleChange} className="input-field font-bold" /></div>
            <div><label className="label">Gross salary</label><input type="text" value={formData.grossSalary.toLocaleString()} disabled className="input-field bg-gray-100 font-bold" /></div>
            
            <div><label className="label">Reliability allowance</label><input type="number" name="reliabilityAllowance" value={formData.reliabilityAllowance} onChange={handleChange} className="input-field" /></div>
            <div><label className="label">Responsibility monthly KPI</label><input type="number" name="kpiAllowance" value={formData.kpiAllowance} onChange={handleChange} className="input-field" /></div>
            
            <div className="col-span-1 md:col-span-2 p-4 bg-gray-50 border border-[var(--color-border-grey)] rounded-lg">
              <h4 className="font-semibold mb-4 border-b pb-2">Insurance Deductions</h4>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div><label className="label text-xs">Social insurance (%)</label><input type="number" name="socialInsurancePct" value={formData.socialInsurancePct} onChange={handleChange} className="input-field py-1" /></div>
                <div><label className="label text-xs">Health insurance (%)</label><input type="number" name="healthInsurancePct" value={formData.healthInsurancePct} onChange={handleChange} className="input-field py-1" /></div>
                <div><label className="label text-xs">Unemployment insurance (%)</label><input type="number" name="unemploymentInsurancePct" value={formData.unemploymentInsurancePct} onChange={handleChange} className="input-field py-1" /></div>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="font-medium text-sm">Total insurance: {formData.totalInsurance.toLocaleString()}</span>
              </div>
            </div>

            <div className="col-span-1 md:col-span-2 bg-[var(--color-navy)] text-white p-4 rounded-lg flex justify-between items-center">
              <span className="font-medium text-lg">Net salary:</span>
              <span className="text-2xl font-bold text-[var(--color-emerald)]">{formData.netSalary.toLocaleString()}</span>
            </div>

            <div className="col-span-1 md:col-span-2"><label className="label">Personal income tax note</label><input type="text" name="pitNote" value={formData.pitNote} onChange={handleChange} className="input-field" /></div>
            <div><label className="label">Payroll period</label><input type="text" name="payrollPeriod" value={formData.payrollPeriod} onChange={handleChange} className="input-field" /></div>
            <div><label className="label">Salary payment date</label><input type="text" name="paymentDate" value={formData.paymentDate} onChange={handleChange} className="input-field" /></div>
            <div><label className="label">Method of payment</label><select name="paymentMethod" value={formData.paymentMethod} onChange={handleChange} className="input-field"><option>Bank Transfer</option><option>Cash</option></select></div>
          </FormSection>

          <FormSection title="9. Notice Period & Handover" defaultOpen={false}>
            <div><label className="label">First month resignation notice</label><input type="text" name="noticePeriodFirstMonth" value={formData.noticePeriodFirstMonth} onChange={handleChange} className="input-field" /></div>
            <div><label className="label">Second month resignation notice</label><input type="text" name="noticePeriodSecondMonth" value={formData.noticePeriodSecondMonth} onChange={handleChange} className="input-field" /></div>
            <div className="col-span-1 md:col-span-2"><label className="label">Handover documentation condition</label><input type="text" name="handoverCondition" value={formData.handoverCondition} onChange={handleChange} className="input-field" /></div>
          </FormSection>

          <FormSection title="10. Rights of Employee" defaultOpen={false}>
            <div className="col-span-1 md:col-span-2"><label className="label">Salary and benefits clause</label><textarea name="salaryBenefitsClause" value={formData.salaryBenefitsClause} onChange={handleChange} className="input-field h-16" /></div>
            <div className="col-span-1 md:col-span-2"><label className="label">Insurance clause</label><textarea name="insuranceClause" value={formData.insuranceClause} onChange={handleChange} className="input-field h-16" /></div>
            <div className="col-span-1 md:col-span-2"><label className="label">Bonus policy clause</label><textarea name="bonusPolicyClause" value={formData.bonusPolicyClause} onChange={handleChange} className="input-field h-16" /></div>
          </FormSection>
          
          <FormSection title="11. Obligations of Employee" defaultOpen={false}>
            <div className="col-span-1 md:col-span-2"><label className="label">Assigned duties clause</label><textarea name="assignedDutiesClause" value={formData.assignedDutiesClause} onChange={handleChange} className="input-field h-16" /></div>
            <div className="col-span-1 md:col-span-2"><label className="label">Company rules clause</label><textarea name="companyRulesClause" value={formData.companyRulesClause} onChange={handleChange} className="input-field h-16" /></div>
            <div className="col-span-1 md:col-span-2"><label className="label">Safety regulations clause</label><textarea name="safetyRegulationsClause" value={formData.safetyRegulationsClause} onChange={handleChange} className="input-field h-16" /></div>
            <div className="col-span-1 md:col-span-2"><label className="label">Asset protection clause</label><textarea name="assetProtectionClause" value={formData.assetProtectionClause} onChange={handleChange} className="input-field h-16" /></div>
            <div className="col-span-1 md:col-span-2"><label className="label">Confidentiality clause</label><textarea name="confidentialityClause" value={formData.confidentialityClause} onChange={handleChange} className="input-field h-16" /></div>
            <div className="col-span-1 md:col-span-2"><label className="label">Handover clause</label><textarea name="handoverClause" value={formData.handoverClause} onChange={handleChange} className="input-field h-16" /></div>
          </FormSection>
          
          <FormSection title="12. Obligations and Rights of Employer" defaultOpen={false}>
            <div className="col-span-1 md:col-span-2"><label className="label">Contract implementation clause</label><textarea name="contractImplementationClause" value={formData.contractImplementationClause} onChange={handleChange} className="input-field h-16" /></div>
            <div className="col-span-1 md:col-span-2"><label className="label">Performance monitoring clause</label><textarea name="performanceMonitoringClause" value={formData.performanceMonitoringClause} onChange={handleChange} className="input-field h-16" /></div>
            <div className="col-span-1 md:col-span-2"><label className="label">Salary / bonus / benefit decision clause</label><textarea name="salaryDecisionClause" value={formData.salaryDecisionClause} onChange={handleChange} className="input-field h-16" /></div>
          </FormSection>

          <FormSection title="13. Leave Policy" defaultOpen={false}>
            <div className="col-span-1 md:col-span-2"><label className="label">Annual leave clause</label><input type="text" name="annualLeaveClause" value={formData.annualLeaveClause} onChange={handleChange} className="input-field" /></div>
            <div><label className="label">Annual leave days</label><input type="number" name="annualLeaveDays" value={formData.annualLeaveDays} onChange={handleChange} className="input-field" /></div>
            <div className="col-span-1 md:col-span-2"><label className="label">Less than one year proportional leave clause</label><input type="text" name="proportionalLeaveClause" value={formData.proportionalLeaveClause} onChange={handleChange} className="input-field" /></div>
            <div className="col-span-1 md:col-span-2"><label className="label">Sick leave clause</label><input type="text" name="sickLeaveClause" value={formData.sickLeaveClause} onChange={handleChange} className="input-field" /></div>
            <div className="col-span-1 md:col-span-2"><label className="label">Medical certificate requirement</label><input type="text" name="medicalCertificateRequirement" value={formData.medicalCertificateRequirement} onChange={handleChange} className="input-field" /></div>
            <div className="col-span-1 md:col-span-2"><label className="label">Public holiday clause</label><input type="text" name="publicHolidayClause" value={formData.publicHolidayClause} onChange={handleChange} className="input-field" /></div>
          </FormSection>

          <FormSection title="14. Statutory Insurance" defaultOpen={false}>
            <div className="col-span-1 md:col-span-2"><p className="text-sm text-gray-500 mb-2">Note: Percentages and start conditions are linked with sections 7 & 8.</p></div>
            <div><label className="label">Social insurance percentage (%)</label><input type="number" name="socialInsurancePct" value={formData.socialInsurancePct} onChange={handleChange} className="input-field" /></div>
            <div><label className="label">Health insurance percentage (%)</label><input type="number" name="healthInsurancePct" value={formData.healthInsurancePct} onChange={handleChange} className="input-field" /></div>
            <div><label className="label">Unemployment insurance percentage (%)</label><input type="number" name="unemploymentInsurancePct" value={formData.unemploymentInsurancePct} onChange={handleChange} className="input-field" /></div>
            <div className="col-span-1 md:col-span-2"><label className="label">Insurance commencement condition</label><input type="text" name="insuranceStartCondition" value={formData.insuranceStartCondition} onChange={handleChange} className="input-field" /></div>
          </FormSection>

          <FormSection title="15. Protective Equipment" defaultOpen={false}>
            <div className="col-span-1 md:col-span-2"><label className="label">PPE clause</label><textarea name="ppeClause" value={formData.ppeClause} onChange={handleChange} className="input-field h-16" /></div>
            <div className="col-span-1 md:col-span-2"><label className="label">Employee PPE responsibility clause</label><textarea name="employeePpeResponsibilityClause" value={formData.employeePpeResponsibilityClause} onChange={handleChange} className="input-field h-16" /></div>
          </FormSection>

          <FormSection title="16. Health and Safety Training" defaultOpen={false}>
            <div className="col-span-1 md:col-span-2"><label className="label">Safety training clause</label><textarea name="safetyTrainingClause" value={formData.safetyTrainingClause} onChange={handleChange} className="input-field h-16" /></div>
            <div className="col-span-1 md:col-span-2"><label className="label">Employee training attendance clause</label><textarea name="employeeTrainingAttendanceClause" value={formData.employeeTrainingAttendanceClause} onChange={handleChange} className="input-field h-16" /></div>
          </FormSection>

          <FormSection title="17. Training" defaultOpen={false}>
            <div className="col-span-1 md:col-span-2"><label className="label">Training scope clause</label><input type="text" name="trainingScopeClause" value={formData.trainingScopeClause} onChange={handleChange} className="input-field" /></div>
            <div className="col-span-1 md:col-span-2"><label className="label">Training cost reimbursement clause</label><textarea name="trainingCostReimbursementClause" value={formData.trainingCostReimbursementClause} onChange={handleChange} className="input-field h-16" /></div>
          </FormSection>

          <FormSection title="18. Termination" defaultOpen={false}>
            <div className="col-span-1 md:col-span-2"><label className="label">Immediate termination clause</label><textarea name="immediateTerminationClause" value={formData.immediateTerminationClause} onChange={handleChange} className="input-field h-16" /></div>
            <div className="col-span-1 md:col-span-2"><label className="label">Serious violation examples</label><textarea name="seriousViolationExamples" value={formData.seriousViolationExamples} onChange={handleChange} className="input-field h-16" /></div>
            <div className="col-span-1 md:col-span-2"><label className="label">Unilateral termination by employee clause</label><textarea name="unilateralTerminationEmployeeClause" value={formData.unilateralTerminationEmployeeClause} onChange={handleChange} className="input-field h-16" /></div>
            <div className="col-span-1 md:col-span-2"><label className="label">Unilateral termination by employer clause</label><textarea name="unilateralTerminationEmployerClause" value={formData.unilateralTerminationEmployerClause} onChange={handleChange} className="input-field h-16" /></div>
            <div className="col-span-1 md:col-span-2"><label className="label">Notice period condition</label><input type="text" name="noticePeriodCondition" value={formData.noticePeriodCondition} onChange={handleChange} className="input-field" /></div>
            <div className="col-span-1 md:col-span-2"><label className="label">Compensation condition</label><input type="text" name="compensationCondition" value={formData.compensationCondition} onChange={handleChange} className="input-field" /></div>
            <div className="col-span-1 md:col-span-2"><label className="label">Training cost reimbursement condition</label><input type="text" name="trainingCostReimbursementCondition" value={formData.trainingCostReimbursementCondition} onChange={handleChange} className="input-field" /></div>
            <div className="col-span-1 md:col-span-2"><label className="label">Handover task clause</label><input type="text" name="terminationHandoverTaskClause" value={formData.terminationHandoverTaskClause} onChange={handleChange} className="input-field" /></div>
            <div className="col-span-1 md:col-span-2"><label className="label">Return company property clause</label><input type="text" name="returnCompanyPropertyClause" value={formData.returnCompanyPropertyClause} onChange={handleChange} className="input-field" /></div>
            <div className="col-span-1 md:col-span-2"><label className="label">Clearance letter clause</label><input type="text" name="clearanceLetterClause" value={formData.clearanceLetterClause} onChange={handleChange} className="input-field" /></div>
            <div className="col-span-1 md:col-span-2"><label className="label">Final payment timeline</label><input type="text" name="finalPaymentTimeline" value={formData.finalPaymentTimeline} onChange={handleChange} className="input-field" /></div>
          </FormSection>

          <FormSection title="19. Confidentiality" defaultOpen={false}>
            <div className="col-span-1 md:col-span-2"><label className="label">Confidential information clause</label><textarea name="confidentialInformationClause" value={formData.confidentialInformationClause} onChange={handleChange} className="input-field h-16" /></div>
            <div className="col-span-1 md:col-span-2"><label className="label">Non-disclosure clause</label><textarea name="nonDisclosureClause" value={formData.nonDisclosureClause} onChange={handleChange} className="input-field h-16" /></div>
            <div className="col-span-1 md:col-span-2"><label className="label">Breach consequence clause</label><textarea name="breachConsequenceClause" value={formData.breachConsequenceClause} onChange={handleChange} className="input-field h-16" /></div>
            <div className="col-span-1 md:col-span-2 flex items-center gap-2">
              <input type="checkbox" id="postEmploymentRestriction24Months" name="postEmploymentRestriction24Months" checked={formData.postEmploymentRestriction24Months} onChange={handleChange} className="w-5 h-5" />
              <label htmlFor="postEmploymentRestriction24Months" className="font-medium text-gray-700 cursor-pointer">Include 24-month post-employment restriction clause</label>
            </div>
          </FormSection>

          <FormSection title="20. Signature" defaultOpen={true}>
            <div><label className="label">Employer representative name</label><input type="text" name="employerSignatureName" value={formData.employerSignatureName} onChange={handleChange} className="input-field" /></div>
            <div><label className="label text-gray-400">Employer signature (Placeholder)</label><input type="text" value="[Signature Area]" disabled className="input-field bg-gray-100" /></div>
            <div><label className="label">Employee name</label><input type="text" name="employeeSignatureName" value={formData.employeeSignatureName} onChange={handleChange} className="input-field" /></div>
            <div><label className="label text-gray-400">Employee signature (Placeholder)</label><input type="text" value="[Signature Area]" disabled className="input-field bg-gray-100" /></div>
            <div><label className="label">Date of signing</label><input type="date" name="dateOfSigning" value={formData.dateOfSigning} onChange={handleChange} className="input-field" /></div>
            <div><label className="label">Prepared by</label><input type="text" name="preparedBy" value={formData.preparedBy} onChange={handleChange} className="input-field" /></div>
          </FormSection>

          {/* Action Bar */}
          <div className="fixed bottom-0 right-0 left-64 bg-white border-t border-[var(--color-border-grey)] p-4 flex justify-between items-center z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            <div className="text-sm text-gray-500 font-medium">
              {isGenerated ? `Contract Number: ${contractNumber}` : "Draft Mode"}
            </div>
            <div className="flex gap-3">
              <button className="btn-secondary flex items-center gap-2">
                <Save size={18} /> Save Draft
              </button>
              <button className="btn-secondary flex items-center gap-2" onClick={handleExportPDF}>
                <Download size={18} /> Export PDF
              </button>
              
              {!isGenerated ? (
                <button className="btn-primary flex items-center gap-2" onClick={handleGenerate}>
                  <FileText size={18} /> Generate Contract
                </button>
              ) : (
                <button className="btn-success flex items-center gap-2" onClick={handleMarkAsSigned} disabled={isSigned}>
                  <CheckCircle size={18} /> {isSigned ? 'Signed' : 'Mark as Signed'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
  );
}

ContractGenerator.defaultJobPositions = DEFAULT_JOB_POSITIONS;

export default ContractGenerator;

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Save, FileText, Download, CheckCircle, ChevronRight, ChevronDown, Eye, X } from "lucide-react";
import { deleteContractDraft, generateContractNumber, generateEmployeeId, getContractDrafts, getJobPositions, getWorkLocations, saveContract, saveContractDraft, saveStaffProfile, seedJobPositions, getPermanentClauses } from "../utils/storage";
import { buildContractExportFilename, fillContractPdf } from "../utils/fillContractPdf";
import ContractPreview from "../components/ContractPreview";

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

const buildAnnualLeaveClause = (days, eligibilityMonths) =>
  `Người lao động được hưởng ${days} ngày nghỉ phép năm có hưởng lương sau khi hoàn thành ${eligibilityMonths} tháng làm việc liên tục.\nThe Employee is entitled to ${days} days of paid annual leave per year upon completion of ${eligibilityMonths} months of continuous service.`;

const buildNoticePeriodClause = (days) =>
  `Người lao động có trách nhiệm thông báo trước ít nhất ${days} ngày bằng văn bản cho Công ty khi đơn phương chấm dứt hợp đồng lao động.\nThe Employee shall provide at least ${days} days' prior written notice to the Company before unilaterally terminating this Contract.`;

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

// Keeps an unsaved form alive while navigating between app routes.
// Module memory is intentionally cleared by a full browser refresh.
let cachedContractFormData = null;

const calculateProbationMonthSalary = (formData, percentage) => {
  const ratio = Math.max(0, Number(percentage) || 0) / 100;
  const baseSalary = (Number(formData.baseSalary) || 0) * ratio;
  const mealAllowance = (Number(formData.mealAllowance) || 0) * ratio;
  
  const transportVal = formData.probationTransportNotApplicable ? 0 : (Number(formData.transportAllowance) || 0);
  const transportAllowance = transportVal * ratio;

  const clothesVal = formData.probationUniformProvided ? 0 : (Number(formData.clothesAllowance) || 0);
  const clothesAllowance = clothesVal * ratio;

  const prVal = formData.probationPrNotApplicable ? 0 : (Number(formData.prAllowance) || 0);
  const prAllowance = prVal * ratio;

  const medicalAllowance = (Number(formData.medicalAllowance) || 0) * ratio;

  const reliabilityVal = formData.probationReliabilityNotApplicable ? 0 : (Number(formData.reliabilityAllowance) || 0);
  const reliabilityAllowance = reliabilityVal * ratio;

  const kpiAllowance = (Number(formData.kpiAllowance) || 0) * ratio;
  const fullGrossSalary = [
    formData.baseSalary,
    formData.mealAllowance,
    formData.telephoneAllowance,
    transportVal,
    clothesVal,
    prVal,
    formData.medicalAllowance,
    formData.responsibilityAllowance,
    formData.flexibleWorkingHoursAllowance,
    reliabilityVal,
    formData.kpiAllowance,
  ].reduce((total, amount) => total + (Number(amount) || 0), 0);
  
  const grossSalary = fullGrossSalary * ratio;
  const socialInsuranceAmount = baseSalary * ((Number(formData.socialInsurancePct) || 0) / 100);
  const healthInsuranceAmount = baseSalary * ((Number(formData.healthInsurancePct) || 0) / 100);
  const unemploymentInsuranceAmount = baseSalary * ((Number(formData.unemploymentInsurancePct) || 0) / 100);
  const totalInsurance = socialInsuranceAmount + healthInsuranceAmount + unemploymentInsuranceAmount;
  const personalIncomeTaxAmount = (Number(formData.personalIncomeTaxAmount) || 0) * ratio;

  return {
    baseSalary,
    mealAllowance,
    transportAllowance,
    clothesAllowance,
    prAllowance,
    medicalAllowance,
    reliabilityAllowance,
    kpiAllowance,
    grossSalary,
    socialInsuranceAmount: socialInsuranceAmount,
    healthInsuranceAmount: healthInsuranceAmount,
    unemploymentInsuranceAmount: unemploymentInsuranceAmount,
    totalInsurance,
    personalIncomeTaxAmount,
    netSalary: grossSalary - totalInsurance - personalIncomeTaxAmount,
  };
};

const formatCalculatedAmount = (value) =>
  value.toLocaleString(undefined, { maximumFractionDigits: 2 });

function ProbationSalaryBreakdown({ title, percentage, formData }) {
  const salary = calculateProbationMonthSalary(formData, percentage);
  const fields = [
    ["Base salary", formatCalculatedAmount(salary.baseSalary)],
    ["Meal Allowance", formatCalculatedAmount(salary.mealAllowance)],
    ["Transportation Allowance", formData.probationTransportNotApplicable ? "N/A" : formatCalculatedAmount(salary.transportAllowance)],
    ["Uniform Allowance", formData.probationUniformProvided ? "Provided by company" : formatCalculatedAmount(salary.clothesAllowance)],
    ["PR Allowance", formData.probationPrNotApplicable ? "N/A" : formatCalculatedAmount(salary.prAllowance)],
    ["Medical Allowance", formatCalculatedAmount(salary.medicalAllowance)],
    ["Reliability allowance", formData.probationReliabilityNotApplicable ? "N/A" : formatCalculatedAmount(salary.reliabilityAllowance)],
    ["Responsibility monthly KPI", formatCalculatedAmount(salary.kpiAllowance)],
    ["Gross salary", formatCalculatedAmount(salary.grossSalary)],
    [`Social insurance (${formData.socialInsurancePct}%)`, formatCalculatedAmount(salary.socialInsuranceAmount)],
    [`Health insurance (${formData.healthInsurancePct}%)`, formatCalculatedAmount(salary.healthInsuranceAmount)],
    [`Unemployment insurance (${formData.unemploymentInsurancePct}%)`, formatCalculatedAmount(salary.unemploymentInsuranceAmount)],
    ["Total insurance", formatCalculatedAmount(salary.totalInsurance)],
    ["Personal income tax (PIT)", formatCalculatedAmount(salary.personalIncomeTaxAmount)],
  ];

  return (
    <div className="col-span-1 rounded-lg border border-slate-200 bg-slate-50 p-4 md:col-span-2">
      <div className="mb-4 flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <h4 className="font-bold text-[var(--color-navy)]">{title}</h4>
        <span className="dashboard-chip">{Number(percentage) || 0}%</span>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {fields.map(([label, value]) => (
          <div key={label}>
            <label className="label">{label}</label>
            <input type="text" value={value} disabled className="input-field bg-gray-100" />
          </div>
        ))}
        <div className="rounded-lg bg-[var(--color-navy)] p-4 text-white md:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <span className="font-medium">Net salary</span>
            <span className="text-xl font-bold text-[var(--color-emerald)]">{formatCalculatedAmount(salary.netSalary)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

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
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [jobPositions, setJobPositions] = useState(() => seedJobPositions(DEFAULT_JOB_POSITIONS));
  const [workLocations, setWorkLocations] = useState(() => getWorkLocations());
  const [contractDrafts, setContractDrafts] = useState(() => getContractDrafts());
  const [currentDraftId, setCurrentDraftId] = useState("");
  
  const [formData, setFormData] = useState(() => {
    if (cachedContractFormData) return cachedContractFormData;
    
    const defaultData = {
      // 1. Employer and Employee
      companyName: "CÔNG TY TNHH FOOD EMPIRE",
      repName: "TRƯƠNG THỊ THU LIỄU",
      repDesignation: "Giám đốc/Director",
      repPhone: "02583 888 388",
      companyTaxCode: "4202012936",
      companyAddress: "Lot NV 05 - 06, Road No. 28, Phuoc Long New Urban Area, South Nha Trang Ward, Khanh Hoa Province.",
      
      fullName: "",
      gender: "Male",
      dob: "",
      idNumber: "",
      address: "",
      phoneNumber: "",
      email: "",
      
      // 2. Work Location
      workLocation1: "",
      workLocation2: "",
      workLocation3: "",

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
      contractStartDate: "",
      contractEndDate: "",
      renewalCondition: "Subject to mutual agreement",

      // 7. Probation Period
      probationLocation: "",
      probationPeriod: "2",
      probationWorkingTime: "Monday to Saturday",
      probationStartTime: "08:00",
      probationEndTime: "17:00",
      probationStartDate: "",
      probationEndDate: "",
      probationFirstMonthSalary: "85",
      probationSecondMonthSalary: "100",
      insuranceStartCondition: "Starts after 2 months probation",
      insuranceStartAfterMonths: "2",
      probationPayrollStartDay: "26",
      probationPayrollEndDay: "25",
      probationSalaryPaymentDay: "5",
      probationLeaveStartDay: "26",
      probationLeaveEndDay: "4",
      statutoryInsuranceIntro: "Người lao động và Người sử dụng lao động sẽ tham gia bảo hiểm sau 2 tháng thử việc với tỉ lệ:\nThe Employee and the Employer shall participate in compulsory insurance after the 02-month probation period, with contribution rates as follows:",
      employerInsuranceContributionClause: "Phần đóng của Công ty: Bảo hiểm xã hội (17.5%), Bảo hiểm y tế (3%), Bảo hiểm thất nghiệp (1%).\nEmployer's contribution: Social Insurance (17.5%), Health Insurance (3%), Unemployment Insurance (1%)",
      employeeInsuranceContributionClause: "Phần đóng của Người lao động: Bảo hiểm xã hội (8%), Bảo hiểm y tế (1.5%), Bảo hiểm thất nghiệp (1%)\nEmployee's contribution: Social Insurance (8%), Health Insurance (1.5%), Unemployment Insurance (1%)",

      // 8. Remuneration / Salary
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
      grossSalary: 0,
      socialInsurancePct: 8,
      healthInsurancePct: 1.5,
      unemploymentInsurancePct: 1,
      socialInsuranceAmount: 0,
      healthInsuranceAmount: 0,
      unemploymentInsuranceAmount: 0,
      totalInsurance: 0,
      pitNote: "Phụ thuộc vào thu nhập theo quy định của Luật Thuế Việt Nam / Depending on income in compliance with Vietnamese Tax Law.",
      personalIncomeTaxAmount: 0,
      leaveSalaryDeferralClause: "Salary payment date shall be deferred corresponding to the actual number of leave days taken.",
      netSalary: 0,
      payrollPeriod: "26th of the previous month to the 25th of the current month",
      paymentDate: "5th of each month",
      paymentMethod: "Bank Transfer",

      // 9. Notice Period & Handover
      noticeStartWorkingDay: "16",
      noticePeriodWorkingDays: "7",
      noticePeriodFirstMonth: "1 week",
      noticePeriodSecondMonth: "1 month",
      handoverCondition: "The handover process must be documented in writing and acknowledged by the Employer or an authorized representative.",

      // 10. Rights of Employee
      salaryBenefitsClause: "Người lao động có quyền được hưởng lương và các chế độ phúc lợi khác theo đúng thỏa thuận trong hợp đồng này.\nThe Employee is entitled to receive a salary and other benefits as agreed upon in this contract.",
      insuranceClause: "Người lao động được hưởng các chế độ bảo hiểm y tế, bảo hiểm xã hội và bảo hiểm thất nghiệp theo quy định hiện hành của Luật Lao động.\nThe Employee shall be entitled to health insurance, social insurance, and unemployment insurance in accordance with the prevailing Labor Laws.",
      bonusPolicyClause: "Chính sách thưởng: Tiền thưởng (nếu có) sẽ được xem xét và chi trả vào cuối năm, căn cứ vào kết quả đánh giá hiệu suất làm việc của Người lao động, tình hình kinh doanh của Công ty, và quyết định cuối cùng của Công ty; Người lao động chỉ được hưởng thưởng khi vẫn đang làm việc tại thời điểm chi trả và không trong thời gian báo trước chấm dứt hợp đồng.\nBonus Policy: The bonus (if any) shall be reviewed and paid at the end of the year based on the Employee's performance evaluation, the Company's business results, and the Company's final decision; the Employee shall only be eligible for such bonus if he/she is actively employed at the time of payment and not serving any notice period for termination.",
      thirteenthMonthSalaryClause: "Chế độ lương tháng 13: Người lao động được hưởng lương tháng 13 khi đã làm việc đủ 12 tháng liên tục tại Công ty và vẫn đang làm việc tại thời điểm chi trả; trường hợp không làm đủ 12 tháng, đang trong thời gian báo trước, hoặc đã nộp đơn xin nghỉ việc trước thời điểm chi trả thì sẽ không được hưởng khoản lương này, trừ khi có quyết định khác bằng văn bản của Công ty.\n13th Month Salary: The Employee shall be entitled to the 13th month salary upon completing 12 consecutive months of employment and remaining actively employed at the time of payment; in cases where the Employee has not completed 12 months, is serving a notice period, or has submitted a resignation prior to the payment date, he/she shall not be entitled to this benefit, unless otherwise decided in writing by the Company.",

      // 11. Obligations of Employee
      assignedDutiesClause: "Người lao động có nghĩa vụ hoàn thành các công việc và nhiệm vụ được giao với tinh thần trách nhiệm cao nhất.\nThe Employee shall fulfill the assigned tasks and work duties with the highest sense of responsibility. .",
      companyRulesClause: "Người lao động phải chấp hành nghiêm chỉnh nội quy lao động, kỷ luật của công ty và các quy định về an toàn lao động.\nThe Employee must strictly comply with the company's internal labor rules, discipline, and occupational safety regulations.",
      safetyRegulationsClause: "",
      assetProtectionClause: "Người lao động có nghĩa vụ bảo vệ tài sản của Người sử dụng lao động và giữ bí mật các thông tin về bí mật kinh doanh, công nghệ.\nThe Employee is obligated to protect the Employer's assets and maintain the confidentiality of business and technology secrets.",
      confidentialityClause: "",
      handoverClause: "Khi chấm dứt hợp đồng, Người lao động phải hoàn tất các thủ tục bàn giao công việc, tài liệu và tài sản theo đúng quy định.\nUpon termination of the contract, the Employee must complete all handover procedures for work, documents, and assets as required.",

      // 12. Obligations and Rights of Employer
      contractImplementationClause: "- Bảo đảm thực hiện đầy đủ những điều khoản trong hợp đồng;\nEnsure full implementation of the terms of the contract;\n- Thanh toán đúng hạn các khoản tiền lương và quyền lợi cho Người lao động theo Hợp đồng này\nPay on time the salaries and benefits to the Employee in accordance with this Contract.",
      performanceMonitoringClause: "- Điều hành, phân công và điều chuyển công việc phù hợp với nhu cầu kinh doanh của Công ty.\nAssign, manage, and reassign work in accordance with the Company's business needs.\n- Giám sát, đánh giá hiệu quả công việc và yêu cầu Người lao động tuân thủ nội quy, quy định của Công ty.\nMonitor and evaluate the Employee's performance and require compliance with Company policies and regulations.",
      salaryDecisionClause: "- Quyết định mức lương, thưởng, điều chỉnh thu nhập và các quyền lợi khác theo chính sách của Công ty và quy định pháp luật.\nDetermine salary, bonuses, income adjustments and other entitlements in line with Company policies and applicable laws.",
      employerRightsClause: "- Điều hành, phân công và điều chuyển công việc phù hợp với nhu cầu kinh doanh của Công ty.\nAssign, manage, and reassign work in accordance with the Company's business needs.\n- Giám sát, đánh giá hiệu quả công việc và yêu cầu Người lao động tuân thủ nội quy, quy định của Công ty.\nMonitor and evaluate the Employee's performance and require compliance with Company policies and regulations.\n- Quyết định mức lương, thưởng, điều chỉnh thu nhập và các quyền lợi khác theo chính sách của Công ty và quy định pháp luật.\nDetermine salary, bonuses, income adjustments and other entitlements in line with Company policies and applicable laws.",

      // 13. Leave Policy
      annualLeaveClause: "Người lao động được hưởng 12 ngày nghỉ phép năm có hưởng lương sau khi hoàn thành 12 tháng làm việc liên tục.\nThe Employee is entitled to 12 days of paid annual leave per year upon completion of 12 months of continuous service.",
      annualLeaveDays: "12",
      annualLeaveEligibilityMonths: "12",
      proportionalLeaveClause: "Đối với người lao động làm việc chưa đủ một năm, số ngày nghỉ phép năm sẽ được tính theo tỷ lệ tương ứng với số tháng làm việc.\nFor employees with less than one year of service, the number of annual leave days shall be calculated in proportion to the number of months worked.",
      sickLeaveClause: "Để việc nghỉ ốm được ghi nhận hợp lệ, Người lao động có trách nhiệm nộp giấy xác nhận y tế từ cơ sở khám chữa bệnh có thẩm quyền.\nFor any sick leave to be officially recognized, the Employee is required to submit a valid medical certificate from a licensed healthcare provider.",
      medicalCertificateRequirement: "",
      publicHolidayClause: "Người lao động được nghỉ làm việc và hưởng nguyên lương trong các ngày Lễ, Tết theo quy định của Bộ luật Lao động Việt Nam.\nThe Employee is entitled to fully paid leave on Public Holidays and New Year Holidays as prescribed by the Labor Code of Vietnam.",

      // 14. Statutory Insurance
      // Percentages and start condition are shared with section 7 and 8

      // 15. Protective Equipment
      ppeClause: "Công ty có trách nhiệm cung cấp các trang thiết bị bảo hộ lao động cần thiết nhằm đảm bảo an toàn và sức khỏe cho Người lao động theo quy định pháp luật và nội quy của Công ty.\nThe Company shall provide necessary personal protective equipment (PPE) to ensure the Employee's safety and health in the workplace in accordance with applicable laws and internal regulations.",
      employeePpeResponsibilityClause: "Người lao động có trách nhiệm sử dụng và bảo quản đúng cách các trang thiết bị bảo hộ được cấp, đồng thời tuân thủ các hướng dẫn an toàn liên quan.\nThe Employee is responsible for properly using and maintaining the provided protective equipment and complying with all relevant safety instructions.",

      // 16. Health and Safety Training
      safetyTrainingClause: "Công ty có trách nhiệm tổ chức đào tạo về an toàn, vệ sinh lao động cho Người lao động theo quy định pháp luật và tính chất công việc.\nThe Company shall organize training on occupational safety and health for the Employee in accordance with applicable laws and the nature of the work.",
      employeeTrainingAttendanceClause: "Người lao động có trách nhiệm tham gia đầy đủ các khóa đào tạo và tuân thủ nghiêm túc các quy định về an toàn, vệ sinh lao động,\nThe Employee is required to attend all such training sessions and strictly comply with occupational safety and health regulations.",

      // 17. Training
      trainingScopeClause: "Công ty có thể tổ chức các chương trình đào tạo nhằm nâng cao kiến thức, kỹ năng chuyên môn và hiệu quả công việc của Người lao động theo nhu cầu hoạt động kinh doanh.\nThe Company may provide training programs to enhance the Employee's professional knowledge, skills, and job performance based on business needs.\n\nPhạm vi đào tạo có thể bao gồm đào tạo nội bộ, các khóa học bên ngoài hoặc các chương trình phát triển chuyên môn khác theo quyết định của Công ty.\nThe training scope may include internal training, external courses, or other professional development programs as determined by the Company.",
      trainingCostReimbursementClause: "Trong trường hợp Công ty tài trợ chi phí đào tạo, hai bên có thể ký kết thỏa thuận đào tạo riêng, trong đó quy định rõ chi phí đào tạo, thời gian cam kết làm việc và nghĩa vụ hoàn trả theo quy định pháp luật.\nIn case the Company sponsors training costs, the Parties may enter into a separate training agreement specifying the training expenses, service commitment period, and reimbursement obligations in accordance with applicable laws.\n\nTrường hợp Người lao động nghỉ việc trước khi làm việc đủ 01 (một) năm hoặc không thực hiện đúng thời gian cam kết làm việc, Người lao động có trách nhiệm hoàn trả chi phí đào tạo theo Điều 62 Bộ luật Lao động Việt Nam, phù hợp với thỏa thuận giữa hai bên và quy định pháp luật.\nIf the Employee leaves the job before completing 01 (one) year of service or fails to fulfill the committed service period, the Employee shall be responsible for reimbursing the training costs in accordance with Article 62 of the Labor Code of Vietnam, subject to the agreement between both parties and applicable laws.",

      // 18. Termination
      immediateTerminationClause: "Công ty có quyền chấm dứt hợp đồng ngay lập tức mà không cần báo trước trong trường hợp Người lao động có hành vi vi phạm nghiêm trọng nội quy lao động hoặc quy tắc ứng xử của Công ty theo quy định pháp luật.\n\nThe Company may immediately terminate this Contract without prior notice in the event the Employee commits serious violations of the Company's internal labor regulations or code of conduct, in accordance with applicable laws.\n\nCác hành vi vi phạm có thể bao gồm nhưng không giới hạn ở trộm cắp, gian lận, tiết lộ thông tin bảo mật, bạo lực tại nơi làm việc hoặc các hành vi sai phạm nghiêm trọng khác theo quy định của Công ty và pháp luật.\n\nSuch violations may include, but are not limited to, acts of theft, fraud, disclosure of confidential information, workplace violence, or other serious misconduct as defined by the Company's regulations and applicable laws.",
      seriousViolationExamples: "",
      unilateralTerminationEmployeeClause: "Người lao động có quyền đơn phương chấm dứt hợp đồng lao động bằng cách thông báo trước bằng văn bản theo thời hạn báo trước được quy định trong Hợp đồng này.\n\nThe Employee has the right to unilaterally terminate this Contract by providing prior written notice in accordance with the notice period stipulated in this Contract. The notice period shall comply with applicable laws depending on the type and term of the labor contract.\n\nThời gian báo trước sẽ tuân theo quy định pháp luật tùy thuộc vào loại và thời hạn của hợp đồng lao động.\nThe notice period shall comply with applicable laws depending on the type and term of the labor contract.\n\nTrường hợp Người lao động đơn phương chấm dứt hợp đồng lao động mà không báo trước hoặc không tuân thủ thời hạn báo trước theo quy định trong Hợp đồng này thì được xem là chấm dứt hợp đồng lao động trái pháp luật theo Điều 40 Bộ luật Lao động 2019. Theo đó, Người lao động có nghĩa vụ:\n\nIf the Employee unilaterally terminates this Contract without prior notice or fails to comply with the notice period stipulated in this Contract, such termination shall be deemed unlawful in accordance with Article 40 of the Labor Code of Vietnam (2019). Accordingly, the Employee shall:\n\n- Không được hưởng trợ cấp thôi việc;\nNot be entitled to severance allowance;\n\n- Phải bồi thường cho Người sử dụng lao động nửa (1/2) tháng tiền lương theo hợp đồng lao động;\nCompensate the Employer with an amount equivalent to half (1/2) month's salary under the labor contract;\n\n- Phải bồi thường một khoản tiền tương ứng với tiền lương trong những ngày không báo trước;\nCompensate an amount corresponding to the salary for the days of non-compliance with the notice period;\n\n- Phải hoàn trả chi phí đào tạo cho Người sử dụng lao động (nếu có).\nReimburse the Employer for training costs (if any).",
      unilateralTerminationEmployerClause: "Công ty có quyền đơn phương chấm dứt hợp đồng lao động theo quy định của Bộ luật Lao động Việt Nam và các quy định pháp luật liên quan.\n\nThe Company has the right to unilaterally terminate this Contract in accordance with the Labor Code of Vietnam and other applicable laws.\n\nCông ty có trách nhiệm thông báo trước bằng văn bản cho Người lao động theo thời gian báo trước theo quy định pháp luật, tùy thuộc vào loại và thời hạn hợp đồng lao động, trừ các trường hợp pháp luật cho phép không cần báo trước.\n\nThe Company shall provide prior written notice to the Employee in compliance with the statutory notice period depending on the type and term of the labor contract, unless otherwise permitted by law.\n\nCác căn cứ để Công ty đơn phương chấm dứt hợp đồng phải tuân theo quy định pháp luật, bao gồm nhưng không giới hạn ở việc Người lao động thường xuyên không hoàn thành công việc, thay đổi cơ cấu tổ chức hoặc các lý do hợp pháp khác.\n\nThe grounds for unilateral termination by the Company shall comply with applicable laws, including but not limited to the Employee's repeated failure to fulfill job duties, organizational restructuring, or other lawful reasons.",
      noticePeriodCondition: "Người lao động có trách nhiệm thông báo trước ít nhất ba mươi (30) ngày bằng văn bản cho Công ty khi đơn phương chấm dứt hợp đồng lao động.\nThe Employee shall provide at least thirty (30) days' prior written notice to the Company before unilaterally terminating this Contract.",
      noticePeriodDays: "30",
      compensationCondition: "Compensation claims may apply for breach.",
      trainingCostReimbursementCondition: "Reimbursement as defined in section 17.",
      terminationHandoverTaskClause: "Khi chấm dứt hợp đồng, Người lao động có trách nhiệm:\nUpon termination, the Employee must:\n\n- Hoàn thành toàn bộ việc bàn giao công việc.\nComplete all required handover tasks.\n\n- Hoàn trả đầy đủ tài sản thuộc sở hữu của Công ty.\nReturn all Company property.\n\n- Ký “Biên bản bàn giao” và các hồ sơ liên quan.\nSign the official Clearance Letter and all relevant handover documents.",
      returnCompanyPropertyClause: "",
      clearanceLetterClause: "",
      finalPaymentTimeline: "Sau khi tất cả hồ sơ được hoàn tất và ký đầy đủ, Công ty sẽ thanh toán toàn bộ các khoản còn lại trong vòng bảy (07) ngày làm việc kể từ ngày ký biên bản bàn giao.\nAfter all documents are fully completed and signed, the Company shall release all remaining payments within seven (07) working days from the date of signing the clearance documents.",

      // 19. Confidentiality
      confidentialInformationClause: "Người lao động có trách nhiệm bảo mật tuyệt đối mọi thông tin liên quan đến hoạt động kinh doanh, khách hàng, đối tác, dữ liệu tài chính và quy trình nội bộ của Công ty trong và sau thời gian làm việc.\nThe Employee shall keep strictly confidential all information relating to the Company's business operations, clients, partners, financial data, and internal processes during and after the term of employment.",
      nonDisclosureClause: "Người lao động không được tiết lộ, sử dụng hoặc cho phép sử dụng các thông tin này cho mục đích cá nhân hoặc cho bên thứ ba nếu không có sự đồng ý trước bằng văn bản của Công ty.\nThe Employee shall not disclose, use, or permit the use of such information for personal purposes or for any third party without prior written consent from the Company.",
      breachConsequenceClause: "Mọi hành vi vi phạm điều khoản này có thể dẫn đến xử lý kỷ luật, bồi thường thiệt hại và các trách nhiệm pháp lý khác theo quy định pháp luật.\nAny breach of this clause may result in disciplinary actions, compensation for damages, and other legal liabilities in accordance with applicable laws.",
      postEmploymentRestrictionClause: "Trong thời gian hiệu lực hợp đồng và trong vòng 24 tháng kể từ khi nghỉ việc tại Công ty nhân viên không được phép: Cung cấp thông tin, tiết lộ bí mật kinh doanh của công ty ra ngoài, không được phép hợp tác, sản xuất, kinh doanh, làm đại lý sử dụng, tiết lộ thông tin về khách hàng, mặt hàng, sản phẩm tương tự của Công ty cho bất kỳ tổ chức cá nhân nào nhằm phục vụ công việc riêng cho mình mà chưa được sự đồng ý bằng văn bản từ phía công ty. Trường hợp bị phát hiện - Cá nhân đó sẽ bị khởi tố trước pháp luật.\nDuring the effective period of the contract and within 24 months from the date of leaving the Company, employees are not allowed to: Provide information, disclose the company's business secrets to the outside, are not allowed to cooperate, produce, trade, act as agents to use, disclose information about customers, goods, similar products of the Company to any individual or organization to serve their own work without written consent from the Company. In case of discovery - That individual will be prosecuted before the law.",
      postEmploymentRestriction24Months: true,
      effectivenessClause: "Hợp đồng này có hiệu lực kể từ ngày ký và được lập thành hai (02) bản có giá trị pháp lý như nhau, mỗi bên giữ một (01) bản.\nThis Agreement shall take effect from the date of signing and is made in two (02) originals of equal legal validity, each Party retains one (01) copy.",

      // 20. Signature
      employerSignatureName: "",
      employeeSignatureName: "",
      dateOfSigning: new Date().toISOString().split('T')[0],
      preparedBy: "HR Admin",
    
      // Probation checkboxes
      probationUniformProvided: false,
      probationTransportNotApplicable: false,
      probationPrNotApplicable: false,
      probationReliabilityNotApplicable: false,
    };

    const savedPermanent = getPermanentClauses();
    return { ...defaultData, ...savedPermanent };
  });

  useEffect(() => {
    cachedContractFormData = formData;
  }, [formData]);

  useEffect(() => {
    const handleClausesChange = () => {
      const saved = getPermanentClauses();
      setFormData(prev => ({ ...prev, ...saved }));
    };
    window.addEventListener('permanentClausesChanged', handleClausesChange);
    return () => window.removeEventListener('permanentClausesChanged', handleClausesChange);
  }, []);

  // Auto calculate salaries and insurances
  useEffect(() => {
    const base = Number(formData.baseSalary) || 0;
    const meal = Number(formData.mealAllowance) || 0;
    const telephone = Number(formData.telephoneAllowance) || 0;
    const transport = Number(formData.transportAllowance) || 0;
    const clothes = Number(formData.clothesAllowance) || 0;
    const pr = Number(formData.prAllowance) || 0;
    const medical = Number(formData.medicalAllowance) || 0;
    const responsibility = Number(formData.responsibilityAllowance) || 0;
    const flexibleWorkingHours = Number(formData.flexibleWorkingHoursAllowance) || 0;
    const reliability = Number(formData.reliabilityAllowance) || 0;
    const kpi = Number(formData.kpiAllowance) || 0;
    
    const gross = base + meal + telephone + transport + clothes + pr + medical + reliability + responsibility + flexibleWorkingHours + kpi;
    
    const socialAmount = base * (Number(formData.socialInsurancePct) / 100);
    const healthAmount = base * (Number(formData.healthInsurancePct) / 100);
    const unemploymentAmount = base * (Number(formData.unemploymentInsurancePct) / 100);
    
    const totalIns = socialAmount + healthAmount + unemploymentAmount;
    const pit = Number(formData.personalIncomeTaxAmount) || 0;
    const net = gross - totalIns - pit;
    
    setFormData(prev => ({
      ...prev,
      socialInsuranceAmount: socialAmount,
      healthInsuranceAmount: healthAmount,
      unemploymentInsuranceAmount: unemploymentAmount,
      grossSalary: gross,
      totalInsurance: totalIns,
      netSalary: net
    }));
  }, [formData.baseSalary, formData.mealAllowance, formData.telephoneAllowance, formData.transportAllowance, formData.clothesAllowance, formData.prAllowance, formData.medicalAllowance, formData.responsibilityAllowance, formData.flexibleWorkingHoursAllowance, formData.reliabilityAllowance, formData.kpiAllowance, formData.socialInsurancePct, formData.healthInsurancePct, formData.unemploymentInsurancePct, formData.personalIncomeTaxAmount]);

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
    const syncWorkLocations = () => setWorkLocations(getWorkLocations());

    window.addEventListener('workLocationsChanged', syncWorkLocations);
    window.addEventListener('storage', syncWorkLocations);

    return () => {
      window.removeEventListener('workLocationsChanged', syncWorkLocations);
      window.removeEventListener('storage', syncWorkLocations);
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
  const renderWorkLocationOptions = (selectedValue) => (
    <>
      <option value="">Select work location</option>
      {selectedValue && !workLocations.some(location => location.name === selectedValue) && (
        <option value={selectedValue}>{selectedValue}</option>
      )}
      {workLocations.map(location => (
        <option key={location.id} value={location.name}>{location.name}</option>
      ))}
    </>
  );
  const workLocationText = [formData.workLocation1, formData.workLocation2, formData.workLocation3]
    .filter(Boolean)
    .join("; ");

  const getExportFormData = () => ({
    ...formData,
    workLocation: workLocationText
  });

  const getDraftLabel = (draft) => {
    const employeeName = draft.formData?.fullName?.trim();
    const jobTitle = draft.formData?.jobTitle?.trim();
    const updatedAt = new Date(draft.updatedAt || draft.createdAt).toLocaleDateString();

    return [employeeName || "Untitled draft", jobTitle, updatedAt].filter(Boolean).join(" - ");
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === "annualLeaveDays" || name === "annualLeaveEligibilityMonths") {
      setFormData(prev => {
        const annualLeaveDays = name === "annualLeaveDays" ? value : (prev.annualLeaveDays ?? "12");
        const annualLeaveEligibilityMonths = name === "annualLeaveEligibilityMonths"
          ? value
          : (prev.annualLeaveEligibilityMonths ?? "12");

        return {
          ...prev,
          annualLeaveDays,
          annualLeaveEligibilityMonths,
          annualLeaveClause: buildAnnualLeaveClause(annualLeaveDays, annualLeaveEligibilityMonths),
        };
      });
      return;
    }

    if (name === "noticePeriodDays") {
      setFormData(prev => ({
        ...prev,
        noticePeriodDays: value,
        noticePeriodCondition: buildNoticePeriodClause(value),
      }));
      return;
    }

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
      ...getExportFormData(),
      contractNumber: newContractNumber,
      status: "Pending Signature",
      createdAt: new Date().toISOString()
    };
    
    saveContract(newContract);
    setIsGenerated(true);
    alert("Contract generated and saved as Pending Signature!");
  };

  const handleSaveDraft = () => {
    const savedDraft = saveContractDraft({
      id: currentDraftId,
      formData,
      contractNumber,
      isGenerated,
    });

    setCurrentDraftId(savedDraft.id);
    setContractDrafts(getContractDrafts());
    alert("Draft saved!");
  };

  useEffect(() => {
    const saveDraftBeforeLeaving = () => {
      saveContractDraft({
        id: currentDraftId,
        formData,
        contractNumber,
        isGenerated,
      });
    };

    window.addEventListener("contract-generator-save-draft", saveDraftBeforeLeaving);
    return () => window.removeEventListener("contract-generator-save-draft", saveDraftBeforeLeaving);
  }, [contractNumber, currentDraftId, formData, isGenerated]);

  const handleOpenDraft = (e) => {
    const draftId = e.target.value;
    setCurrentDraftId(draftId);
    if (!draftId) {
      return;
    }

    const latestDrafts = getContractDrafts();
    const selectedDraft = latestDrafts.find(draft => draft.id === draftId);
    setContractDrafts(latestDrafts);

    if (!selectedDraft) {
      alert("That draft could not be found. Please save it again.");
      setCurrentDraftId("");
      return;
    }

    setCurrentDraftId(selectedDraft.id);
    const savedPermanent = getPermanentClauses();
    setFormData({
      ...savedPermanent,
      ...selectedDraft.formData
    });
    setContractNumber(selectedDraft.contractNumber || "");
    setIsGenerated(Boolean(selectedDraft.isGenerated && selectedDraft.contractNumber));
    setIsSigned(false);
  };

  const handleDeleteDraft = () => {
    if (!currentDraftId) {
      alert("Please select a draft to delete.");
      return;
    }

    const selectedDraft = getContractDrafts().find(draft => draft.id === currentDraftId);
    const draftName = selectedDraft ? getDraftLabel(selectedDraft) : "this draft";

    if (!confirm(`Delete ${draftName}?`)) return;

    deleteContractDraft(currentDraftId);
    setContractDrafts(getContractDrafts());
    setCurrentDraftId("");
    alert("Draft deleted.");
  };

  const handleMarkAsSigned = () => {
    if (!isGenerated) {
      alert("Please generate the contract first.");
      return;
    }
    
    const empId = generateEmployeeId();
    
    const newStaffProfile = {
      ...getExportFormData(),
      employeeId: empId,
      contractNumber: contractNumber,
      contractStatus: "Signed",
      createdAt: new Date().toISOString()
    };
    
    saveStaffProfile(newStaffProfile);
    setIsSigned(true);
    alert(`Contract marked as signed! Staff profile created with ID: ${empId}`);
    navigate("/staff-profiles", { state: { openEmployeeId: empId } });
  };

  const handleExportPDF = async () => {
    if (!formData.companyName || !formData.fullName) {
      alert("Please fill in at least the Company Name and Employee Full Name before exporting.");
      return;
    }
    const employeeId = formData.employeeId || contractNumber || generateEmployeeId();
    const filename = buildContractExportFilename(formData, employeeId);
    await fillContractPdf({ ...getExportFormData(), employeeId }, filename);
  };

  const handlePreview = () => {
    if (!formData.companyName || !formData.fullName) {
      alert("Please fill in at least the Company Name and Employee Full Name before previewing.");
      return;
    }

    setIsPreviewOpen(true);
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
      <div className="flex flex-col gap-3 md:flex-row md:justify-between md:items-center mb-6">
        <h2 className="text-2xl font-bold text-[var(--color-navy)]">Employment Contract Generator</h2>
        <div className="w-full md:w-[28rem]">
          <label className="label">Saved drafts</label>
          <div className="flex gap-2">
            <select value={currentDraftId} onChange={handleOpenDraft} className="input-field min-w-0">
              <option value="">Open a saved draft</option>
              {contractDrafts.map((draft) => (
                <option key={draft.id} value={draft.id}>{getDraftLabel(draft)}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleDeleteDraft}
              disabled={!currentDraftId}
              className="btn-secondary whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Delete Draft
            </button>
          </div>
        </div>
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

          <FormSection title="1. Employer and Employee / Người sử dụng lao động và Người lao động" defaultOpen={true}>
            <div><label className="label">Employer company name</label><input type="text" name="companyName" value={formData.companyName} onChange={handleChange} className="input-field" /></div>
            <div><label className="label">Representative name</label><input type="text" name="repName" value={formData.repName} onChange={handleChange} className="input-field" /></div>
            <div><label className="label">Representative designation</label><input type="text" name="repDesignation" value={formData.repDesignation} onChange={handleChange} className="input-field" /></div>
            <div><label className="label">Representative phone</label><input type="text" name="repPhone" value={formData.repPhone} onChange={handleChange} className="input-field" /></div>
            <div><label className="label">Company tax code</label><input type="text" name="companyTaxCode" value={formData.companyTaxCode} onChange={handleChange} className="input-field" /></div>
            <div className="col-span-1 md:col-span-2"><label className="label">Employer address</label><input type="text" name="companyAddress" value={formData.companyAddress} onChange={handleChange} className="input-field" /></div>

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

          <FormSection title="2. Work Location" defaultOpen={false}>
            <div><label className="label">Work location 1</label><select name="workLocation1" value={formData.workLocation1} onChange={handleChange} className="input-field">{renderWorkLocationOptions(formData.workLocation1)}</select></div>
            <div><label className="label">Work location 2</label><select name="workLocation2" value={formData.workLocation2} onChange={handleChange} className="input-field">{renderWorkLocationOptions(formData.workLocation2)}</select></div>
            <div><label className="label">Work location 3</label><select name="workLocation3" value={formData.workLocation3} onChange={handleChange} className="input-field">{renderWorkLocationOptions(formData.workLocation3)}</select></div>
          </FormSection>

          <FormSection title="3. Standard Hours" defaultOpen={false}>
            <div className="col-span-1 md:col-span-2"><label className="label">Working days</label><input type="text" name="workingDays" value={formData.workingDays} onChange={handleChange} className="input-field" /></div>
            <div><label className="label">Morning working time</label><input type="text" name="morningShift" value={formData.morningShift} onChange={handleChange} className="input-field" /></div>
            <div><label className="label">Afternoon working time</label><input type="text" name="afternoonShift" value={formData.afternoonShift} onChange={handleChange} className="input-field" /></div>
          </FormSection>

          <FormSection title="4. Job Description" defaultOpen={true}>
            <div className="col-span-1 md:col-span-2"><label className="label">Job title</label><select name="jobTitle" value={availableJobPositions.find(job => job.title === formData.jobTitle)?.id || ""} onChange={handleChange} className="input-field"><option value="">Select job title</option>{availableJobPositions.map((job) => <option key={job.id} value={job.id}>{job.title}</option>)}</select></div>
            <div className="col-span-1 md:col-span-2"><label className="label">Job description</label><textarea name="jobDescriptionHeading" value={formData.jobDescriptionHeading} onChange={handleChange} className="input-field h-80 leading-relaxed" /></div>
          </FormSection>

          <FormSection title="5. Contract Duration" defaultOpen={false}>
            <div><label className="label">Contract type</label><input type="text" name="contractType" value={formData.contractType} onChange={handleChange} className="input-field" /></div>
            <div><label className="label">Contract duration (Months)</label><input type="number" name="contractDuration" value={formData.contractDuration} onChange={handleChange} className="input-field" /></div>
            <div><label className="label">Probation period used for duration (Months)</label><input type="number" name="probationPeriod" value={formData.probationPeriod} onChange={handleChange} className="input-field" /></div>
            <div className="col-span-1 md:col-span-2"><label className="label">Renewal condition</label><textarea name="renewalCondition" value={formData.renewalCondition} onChange={handleChange} className="input-field h-16" /></div>
          </FormSection>

          <FormSection title="6. Remuneration / Salary" defaultOpen={true}>
            <div><label className="label">Base salary</label><input type="number" name="baseSalary" value={formData.baseSalary} onChange={handleChange} className="input-field font-bold" /></div>
            <div><label className="label">Gross salary</label><input type="text" value={formData.grossSalary.toLocaleString()} disabled className="input-field bg-gray-100 font-bold" /></div>

            <div><label className="label">Meal Allowance</label><input type="number" name="mealAllowance" value={formData.mealAllowance ?? 0} onChange={handleChange} className="input-field" /></div>
            <div><label className="label">Transportation Allowance</label><input type="number" name="transportAllowance" value={formData.transportAllowance ?? 0} onChange={handleChange} className="input-field" /></div>
            <div><label className="label">Uniform Allowance</label><input type="number" name="clothesAllowance" value={formData.clothesAllowance ?? 0} onChange={handleChange} className="input-field" /></div>
            <div><label className="label">PR Allowance</label><input type="number" name="prAllowance" value={formData.prAllowance ?? 0} onChange={handleChange} className="input-field" /></div>
            <div><label className="label">Medical Allowance</label><input type="number" name="medicalAllowance" value={formData.medicalAllowance ?? 0} onChange={handleChange} className="input-field" /></div>

            <div><label className="label">Reliability allowance</label><input type="number" name="reliabilityAllowance" value={formData.reliabilityAllowance} onChange={handleChange} className="input-field" /></div>
            <div><label className="label">Responsibility monthly KPI</label><input type="number" name="kpiAllowance" value={formData.kpiAllowance} onChange={handleChange} className="input-field" /></div>
            
            <div className="col-span-1 md:col-span-2 p-4 bg-gray-50 border border-[var(--color-border-grey)] rounded-lg">
              <h4 className="font-semibold mb-4 border-b pb-2">Insurance Deductions</h4>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div><label className="label text-xs">Social insurance (%)</label><input type="number" name="socialInsurancePct" value={formData.socialInsurancePct} onChange={handleChange} className="input-field py-1" /></div>
                <div><label className="label text-xs">Health insurance (%)</label><input type="number" name="healthInsurancePct" value={formData.healthInsurancePct} onChange={handleChange} className="input-field py-1" /></div>
                <div><label className="label text-xs">Unemployment insurance (%)</label><input type="number" name="unemploymentInsurancePct" value={formData.unemploymentInsurancePct} onChange={handleChange} className="input-field py-1" /></div>
              </div>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div><label className="label text-xs">Social insurance amount</label><input type="text" value={formData.socialInsuranceAmount.toLocaleString()} disabled className="input-field py-1 bg-gray-100" /></div>
                <div><label className="label text-xs">Health insurance amount</label><input type="text" value={formData.healthInsuranceAmount.toLocaleString()} disabled className="input-field py-1 bg-gray-100" /></div>
                <div><label className="label text-xs">Unemployment insurance amount</label><input type="text" value={formData.unemploymentInsuranceAmount.toLocaleString()} disabled className="input-field py-1 bg-gray-100" /></div>
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

          <FormSection title="7. Probation Period, Notice Period & Handover" defaultOpen={false}>
            <div><label className="label">7.1 Probation location 1</label><select name="workLocation1" value={formData.workLocation1} onChange={handleChange} className="input-field">{renderWorkLocationOptions(formData.workLocation1)}</select></div>
            <div><label className="label">Probation location 2</label><select name="workLocation2" value={formData.workLocation2} onChange={handleChange} className="input-field">{renderWorkLocationOptions(formData.workLocation2)}</select></div>
            <div><label className="label">Probation location 3</label><select name="workLocation3" value={formData.workLocation3} onChange={handleChange} className="input-field">{renderWorkLocationOptions(formData.workLocation3)}</select></div>
            <div><label className="label">7.2 Probation period (Months)</label><input type="number" name="probationPeriod" value={formData.probationPeriod} onChange={handleChange} className="input-field" /></div>
            <div><label className="label">Probation start date</label><input type="date" name="probationStartDate" value={formData.probationStartDate} onChange={handleChange} className="input-field" /></div>
            <div><label className="label">Probation end date</label><input type="date" name="probationEndDate" value={formData.probationEndDate} onChange={handleChange} className="input-field" /></div>
            <div className="col-span-1 md:col-span-2"><label className="label">7.3 Working days during probation</label><input type="text" name="probationWorkingTime" value={formData.probationWorkingTime ?? formData.workingDays} onChange={handleChange} className="input-field" /></div>
            <div><label className="label">Probation start time</label><input type="time" name="probationStartTime" value={formData.probationStartTime ?? "08:00"} onChange={handleChange} className="input-field" /></div>
            <div><label className="label">Probation end time</label><input type="time" name="probationEndTime" value={formData.probationEndTime ?? "17:00"} onChange={handleChange} className="input-field" /></div>
            <div className="col-span-1 rounded-lg border border-slate-200 bg-white p-4 md:col-span-2">
              <div className="mb-4 border-b border-slate-200 pb-3">
                <h4 className="font-bold text-[var(--color-navy)]">Probation Salary Basis</h4>
                <p className="mt-1 text-xs text-slate-500">These values are shared with Section 6 Remuneration / Salary.</p>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div><label className="label">Base salary</label><input type="number" min="0" name="baseSalary" value={formData.baseSalary} onChange={handleChange} className="input-field" /></div>
                <div><label className="label">Meal Allowance</label><input type="number" min="0" name="mealAllowance" value={formData.mealAllowance ?? 0} onChange={handleChange} className="input-field" /></div>
                <div>
                  <label className="label">Transportation Allowance</label>
                  <input type="number" min="0" name="transportAllowance" value={formData.transportAllowance ?? 0} onChange={handleChange} disabled={formData.probationTransportNotApplicable} className="input-field" />
                  <label className="flex items-center gap-1.5 mt-1 text-xs text-slate-500 cursor-pointer">
                    <input type="checkbox" name="probationTransportNotApplicable" checked={formData.probationTransportNotApplicable} onChange={handleChange} />
                    <span>Not applicable / N/A</span>
                  </label>
                </div>
                <div>
                  <label className="label">Uniform Allowance</label>
                  <input type="number" min="0" name="clothesAllowance" value={formData.clothesAllowance ?? 0} onChange={handleChange} disabled={formData.probationUniformProvided} className="input-field" />
                  <label className="flex items-center gap-1.5 mt-1 text-xs text-slate-500 cursor-pointer">
                    <input type="checkbox" name="probationUniformProvided" checked={formData.probationUniformProvided} onChange={handleChange} />
                    <span>As provided by company</span>
                  </label>
                </div>
                <div>
                  <label className="label">PR Allowance</label>
                  <input type="number" min="0" name="prAllowance" value={formData.prAllowance ?? 0} onChange={handleChange} disabled={formData.probationPrNotApplicable} className="input-field" />
                  <label className="flex items-center gap-1.5 mt-1 text-xs text-slate-500 cursor-pointer">
                    <input type="checkbox" name="probationPrNotApplicable" checked={formData.probationPrNotApplicable} onChange={handleChange} />
                    <span>Not applicable / N/A</span>
                  </label>
                </div>
                <div><label className="label">Medical Allowance</label><input type="number" min="0" name="medicalAllowance" value={formData.medicalAllowance ?? 0} onChange={handleChange} className="input-field" /></div>
                <div>
                  <label className="label">Reliability allowance</label>
                  <input type="number" min="0" name="reliabilityAllowance" value={formData.reliabilityAllowance} onChange={handleChange} disabled={formData.probationReliabilityNotApplicable} className="input-field" />
                  <label className="flex items-center gap-1.5 mt-1 text-xs text-slate-500 cursor-pointer">
                    <input type="checkbox" name="probationReliabilityNotApplicable" checked={formData.probationReliabilityNotApplicable} onChange={handleChange} />
                    <span>Not applicable / N/A</span>
                  </label>
                </div>
                <div><label className="label">Responsibility monthly KPI</label><input type="number" min="0" name="kpiAllowance" value={formData.kpiAllowance} onChange={handleChange} className="input-field" /></div>
                <div><label className="label">Personal income tax (PIT)</label><input type="number" min="0" name="personalIncomeTaxAmount" value={formData.personalIncomeTaxAmount} onChange={handleChange} className="input-field" /></div>
              </div>
            </div>
            <div><label className="label">7.4 First month salary percentage (%)</label><input type="number" min="0" max="100" name="probationFirstMonthSalary" value={formData.probationFirstMonthSalary} onChange={handleChange} className="input-field" /></div>
            <div><label className="label">Second month salary percentage (%)</label><input type="number" min="0" max="100" name="probationSecondMonthSalary" value={formData.probationSecondMonthSalary} onChange={handleChange} className="input-field" /></div>
            <ProbationSalaryBreakdown title="First Month Salary" percentage={formData.probationFirstMonthSalary} formData={formData} />
            <ProbationSalaryBreakdown title="Second Month Salary" percentage={formData.probationSecondMonthSalary} formData={formData} />
            <div className="col-span-1 rounded-lg border border-slate-200 bg-slate-50 p-4 md:col-span-2">
              <h4 className="mb-4 border-b border-slate-200 pb-2 font-bold text-[var(--color-navy)]">7.4 Insurance and Payroll Details</h4>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div><label className="label">Insurance starts after (Months)</label><input type="number" min="0" name="insuranceStartAfterMonths" value={formData.insuranceStartAfterMonths ?? "2"} onChange={handleChange} className="input-field" /></div>
                <div><label className="label">Payroll start day</label><input type="number" min="1" max="31" name="probationPayrollStartDay" value={formData.probationPayrollStartDay ?? "26"} onChange={handleChange} className="input-field" /></div>
                <div><label className="label">Payroll end day</label><input type="number" min="1" max="31" name="probationPayrollEndDay" value={formData.probationPayrollEndDay ?? "25"} onChange={handleChange} className="input-field" /></div>
                <div><label className="label">Salary payment day</label><input type="number" min="1" max="31" name="probationSalaryPaymentDay" value={formData.probationSalaryPaymentDay ?? "5"} onChange={handleChange} className="input-field" /></div>
                <div><label className="label">Leave period start day</label><input type="number" min="1" max="31" name="probationLeaveStartDay" value={formData.probationLeaveStartDay ?? "26"} onChange={handleChange} className="input-field" /></div>
                <div><label className="label">Leave period end day</label><input type="number" min="1" max="31" name="probationLeaveEndDay" value={formData.probationLeaveEndDay ?? "4"} onChange={handleChange} className="input-field" /></div>
              </div>
            </div>
            <div><label className="label">Method of payment</label><select name="paymentMethod" value={formData.paymentMethod} onChange={handleChange} className="input-field"><option>Bank Transfer</option><option>Cash</option><option>Bank transfer/Cash</option></select></div>
            <div><label className="label">7.5 First month resignation notice</label><input type="text" name="noticePeriodFirstMonth" value={formData.noticePeriodFirstMonth} onChange={handleChange} className="input-field" /></div>
            <div><label className="label">Second month resignation notice</label><input type="text" name="noticePeriodSecondMonth" value={formData.noticePeriodSecondMonth} onChange={handleChange} className="input-field" /></div>
            <div><label className="label">Notice requirement starts from working day</label><input type="number" min="1" name="noticeStartWorkingDay" value={formData.noticeStartWorkingDay ?? "16"} onChange={handleChange} className="input-field" /></div>
            <div><label className="label">Prior notice working days</label><input type="number" name="noticePeriodWorkingDays" value={formData.noticePeriodWorkingDays} onChange={handleChange} className="input-field" /></div>
            <div className="col-span-1 md:col-span-2"><label className="label">Handover obligations during probation</label><textarea name="handoverCondition" value={formData.handoverCondition} onChange={handleChange} className="input-field h-20" /></div>
          </FormSection>

          <FormSection title="8. Rights and Obligations of Employee" defaultOpen={false}>
            <div className="col-span-1 md:col-span-2"><label className="label">8.1 Salary and benefits / Quyền hưởng lương và phúc lợi</label><textarea name="salaryBenefitsClause" value={formData.salaryBenefitsClause} onChange={handleChange} className="input-field h-24" /></div>
            <div className="col-span-1 md:col-span-2"><label className="label">8.2 Insurance rights / Quyền hưởng bảo hiểm</label><textarea name="insuranceClause" value={formData.insuranceClause} onChange={handleChange} className="input-field h-24" /></div>
            <div className="col-span-1 md:col-span-2"><label className="label">8.3 Bonus policy / Chính sách thưởng</label><textarea name="bonusPolicyClause" value={formData.bonusPolicyClause} onChange={handleChange} className="input-field h-32" /></div>
            <div className="col-span-1 md:col-span-2"><label className="label">8.4 13th month salary / Chế độ lương tháng 13</label><textarea name="thirteenthMonthSalaryClause" value={formData.thirteenthMonthSalaryClause} onChange={handleChange} className="input-field h-32" /></div>
            <div className="col-span-1 md:col-span-2"><label className="label">8.5 Assigned tasks / Công việc được giao</label><textarea name="assignedDutiesClause" value={formData.assignedDutiesClause} onChange={handleChange} className="input-field h-24" /></div>
            <div className="col-span-1 md:col-span-2"><label className="label">8.6 Labor rules and safety / Nội quy và an toàn lao động</label><textarea name="companyRulesClause" value={formData.companyRulesClause} onChange={handleChange} className="input-field h-24" /></div>
            <div className="col-span-1 md:col-span-2"><label className="label">8.7 Asset protection and confidentiality / Bảo vệ tài sản và bảo mật</label><textarea name="assetProtectionClause" value={formData.assetProtectionClause} onChange={handleChange} className="input-field h-24" /></div>
            <div className="col-span-1 md:col-span-2"><label className="label">8.8 Handover on termination / Bàn giao khi chấm dứt hợp đồng</label><textarea name="handoverClause" value={formData.handoverClause} onChange={handleChange} className="input-field h-24" /></div>
          </FormSection>
          
          <FormSection title="9. Nghĩa vụ và Quyền lợi của Người sử dụng lao động / Obligations and rights of employers" defaultOpen={false}>
            <div className="col-span-1 md:col-span-2"><label className="label">9.1 Nghĩa vụ của người sử dụng lao động / Obligations of the employer</label><textarea name="contractImplementationClause" value={formData.contractImplementationClause} onChange={handleChange} className="input-field h-36" /></div>
            <div className="col-span-1 md:col-span-2"><label className="label">9.2 Quyền hạn của người sử dụng lao động / Rights of the employer</label><textarea name="employerRightsClause" value={formData.employerRightsClause} onChange={handleChange} className="input-field h-44" /></div>
          </FormSection>

          <FormSection title="10. Chính sách nghỉ / Leave Policy" defaultOpen={false}>
            <div><label className="label">Annual leave days</label><input type="number" min="0" name="annualLeaveDays" value={formData.annualLeaveDays ?? "12"} onChange={handleChange} className="input-field" /></div>
            <div><label className="label">Eligibility after continuous service (Months)</label><input type="number" min="0" name="annualLeaveEligibilityMonths" value={formData.annualLeaveEligibilityMonths ?? "12"} onChange={handleChange} className="input-field" /></div>
            <div className="col-span-1 md:col-span-2"><label className="label">10.1 Nghỉ phép năm / Annual Leave</label><textarea name="annualLeaveClause" value={formData.annualLeaveClause} onChange={handleChange} className="input-field h-24" /></div>
            <div className="col-span-1 md:col-span-2"><label className="label">10.1 Nghỉ phép năm theo tỷ lệ / Proportional Annual Leave</label><textarea name="proportionalLeaveClause" value={formData.proportionalLeaveClause} onChange={handleChange} className="input-field h-24" /></div>
            <div className="col-span-1 md:col-span-2"><label className="label">10.2 Nghỉ ốm đau / Sick Leave</label><textarea name="sickLeaveClause" value={formData.sickLeaveClause} onChange={handleChange} className="input-field h-24" /></div>
            <div className="col-span-1 md:col-span-2"><label className="label">10.3 Nghỉ lễ Tết / National Holidays</label><textarea name="publicHolidayClause" value={formData.publicHolidayClause} onChange={handleChange} className="input-field h-24" /></div>
          </FormSection>

          <FormSection title="11. Bảo hiểm bắt buộc / Statutory Insurance" defaultOpen={false}>
            <div className="col-span-1 md:col-span-2"><label className="label">11. Bảo hiểm bắt buộc / Statutory Insurance</label><textarea name="statutoryInsuranceIntro" value={formData.statutoryInsuranceIntro} onChange={handleChange} className="input-field h-24" /></div>
            <div className="col-span-1 md:col-span-2"><label className="label">Phần đóng của Công ty / Employer's contribution</label><textarea name="employerInsuranceContributionClause" value={formData.employerInsuranceContributionClause} onChange={handleChange} className="input-field h-24" /></div>
            <div className="col-span-1 md:col-span-2"><label className="label">Phần đóng của Người lao động / Employee's contribution</label><textarea name="employeeInsuranceContributionClause" value={formData.employeeInsuranceContributionClause} onChange={handleChange} className="input-field h-24" /></div>
            <div><label className="label">BHXH / Social Insurance (%)</label><input type="number" name="socialInsurancePct" value={formData.socialInsurancePct} onChange={handleChange} className="input-field" /></div>
            <div><label className="label">BHYT / Health Insurance (%)</label><input type="number" name="healthInsurancePct" value={formData.healthInsurancePct} onChange={handleChange} className="input-field" /></div>
            <div><label className="label">BHTN / Unemployment Insurance (%)</label><input type="number" name="unemploymentInsurancePct" value={formData.unemploymentInsurancePct} onChange={handleChange} className="input-field" /></div>
          </FormSection>

          <FormSection title="12. An toàn, vệ sinh lao động / Occupational safety and Health" defaultOpen={false}>
            <div className="col-span-1 md:col-span-2"><label className="label">12.1 Thiết bị bảo hộ / Protective Equipment</label><textarea name="ppeClause" value={formData.ppeClause} onChange={handleChange} className="input-field h-28" /></div>
            <div className="col-span-1 md:col-span-2"><label className="label">12.1 Trách nhiệm của Người lao động về thiết bị bảo hộ / Employee protective equipment responsibility</label><textarea name="employeePpeResponsibilityClause" value={formData.employeePpeResponsibilityClause} onChange={handleChange} className="input-field h-24" /></div>
            <div className="col-span-1 md:col-span-2"><label className="label">12.2 Đào tạo về an toàn, sức khoẻ / Health and Safety Training</label><textarea name="safetyTrainingClause" value={formData.safetyTrainingClause} onChange={handleChange} className="input-field h-24" /></div>
            <div className="col-span-1 md:col-span-2"><label className="label">12.2 Trách nhiệm tham gia đào tạo / Training attendance responsibility</label><textarea name="employeeTrainingAttendanceClause" value={formData.employeeTrainingAttendanceClause} onChange={handleChange} className="input-field h-24" /></div>
          </FormSection>

          <FormSection title="13. Đào tạo / Training" defaultOpen={false}>
            <div className="col-span-1 md:col-span-2"><label className="label">13.1 Phạm vi đào tạo / Training Scope</label><textarea name="trainingScopeClause" value={formData.trainingScopeClause} onChange={handleChange} className="input-field h-44" /></div>
            <div className="col-span-1 md:col-span-2"><label className="label">13.2 Chi phí đào tạo / Training Cost</label><textarea name="trainingCostReimbursementClause" value={formData.trainingCostReimbursementClause} onChange={handleChange} className="input-field h-52" /></div>
          </FormSection>

          <FormSection title="14. Chấm dứt hợp đồng / Termination" defaultOpen={false}>
            <div className="col-span-1 md:col-span-2"><label className="label">14.1 Chấm dứt ngay do vi phạm nghiêm trọng nội quy / Immediate Termination based on Severe Violations of Code of Conduct</label><textarea name="immediateTerminationClause" value={formData.immediateTerminationClause} onChange={handleChange} className="input-field h-64" /></div>
            <div className="col-span-1 md:col-span-2"><label className="label">14.2 Người lao động đơn phương chấm dứt hợp đồng / Unilateral Termination by the Employee</label><textarea name="unilateralTerminationEmployeeClause" value={formData.unilateralTerminationEmployeeClause} onChange={handleChange} className="input-field h-96" /></div>
            <div className="col-span-1 md:col-span-2"><label className="label">14.3 Công ty đơn phương chấm dứt hợp đồng / Unilateral Termination by the Employer</label><textarea name="unilateralTerminationEmployerClause" value={formData.unilateralTerminationEmployerClause} onChange={handleChange} className="input-field h-72" /></div>
          </FormSection>

          <FormSection title="15. Thời gian báo trước / Notice Period" defaultOpen={false}>
            <div><label className="label">Notice period (Days)</label><input type="number" min="0" name="noticePeriodDays" value={formData.noticePeriodDays ?? "30"} onChange={handleChange} className="input-field" /></div>
            <div className="col-span-1 md:col-span-2"><label className="label">15. Thời gian báo trước / Notice Period</label><textarea name="noticePeriodCondition" value={formData.noticePeriodCondition} onChange={handleChange} className="input-field h-24" /></div>
          </FormSection>

          <FormSection title="16. Thanh toán khi chấm dứt hợp đồng / Final Settlement" defaultOpen={false}>
            <div className="col-span-1 md:col-span-2"><label className="label">16. Trách nhiệm khi chấm dứt hợp đồng / Termination responsibilities</label><textarea name="terminationHandoverTaskClause" value={formData.terminationHandoverTaskClause} onChange={handleChange} className="input-field h-56" /></div>
            <div className="col-span-1 md:col-span-2"><label className="label">16. Thời hạn thanh toán cuối cùng / Final payment timeline</label><textarea name="finalPaymentTimeline" value={formData.finalPaymentTimeline} onChange={handleChange} className="input-field h-24" /></div>
          </FormSection>

          <FormSection title="17. Bảo mật thông tin / Confidentiality" defaultOpen={false}>
            <div className="col-span-1 md:col-span-2"><label className="label">17. Bảo mật thông tin kinh doanh / Confidential business information</label><textarea name="confidentialInformationClause" value={formData.confidentialInformationClause} onChange={handleChange} className="input-field h-28" /></div>
            <div className="col-span-1 md:col-span-2"><label className="label">17. Không tiết lộ hoặc sử dụng thông tin / Non-disclosure and non-use</label><textarea name="nonDisclosureClause" value={formData.nonDisclosureClause} onChange={handleChange} className="input-field h-28" /></div>
            <div className="col-span-1 md:col-span-2"><label className="label">17. Hậu quả vi phạm / Breach consequences</label><textarea name="breachConsequenceClause" value={formData.breachConsequenceClause} onChange={handleChange} className="input-field h-24" /></div>
            <div className="col-span-1 md:col-span-2"><label className="label">17. Nghĩa vụ bảo mật 24 tháng sau khi nghỉ việc / 24-month post-employment confidentiality obligation</label><textarea name="postEmploymentRestrictionClause" value={formData.postEmploymentRestrictionClause} onChange={handleChange} className="input-field h-44" /></div>
          </FormSection>

          <FormSection title="18. Hiệu lực hợp đồng / Effectiveness" defaultOpen={false}>
            <div className="col-span-1 md:col-span-2"><label className="label">18. Hiệu lực hợp đồng / Effectiveness</label><textarea name="effectivenessClause" value={formData.effectivenessClause} onChange={handleChange} className="input-field h-24" /></div>
          </FormSection>

          <FormSection title="Signature" defaultOpen={true}>
            <div><label className="label">Employer representative name</label><input type="text" name="employerSignatureName" value={formData.employerSignatureName} onChange={handleChange} className="input-field" /></div>
            <div><label className="label text-gray-400">Employer signature (Placeholder)</label><input type="text" value="[Signature Area]" disabled className="input-field bg-gray-100" /></div>
            <div><label className="label">Employee name</label><input type="text" name="employeeSignatureName" value={formData.employeeSignatureName} onChange={handleChange} className="input-field" /></div>
            <div><label className="label text-gray-400">Employee signature (Placeholder)</label><input type="text" value="[Signature Area]" disabled className="input-field bg-gray-100" /></div>
            <div><label className="label">Date of signing</label><input type="date" name="dateOfSigning" value={formData.dateOfSigning} onChange={handleChange} className="input-field" /></div>
            <div><label className="label">Prepared by</label><input type="text" name="preparedBy" value={formData.preparedBy} onChange={handleChange} className="input-field" /></div>
          </FormSection>

          {isPreviewOpen && (
            <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/60 p-4">
              <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg bg-white shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                  <div>
                    <p className="dashboard-kicker mb-0">Contract Preview</p>
                    <h3 className="text-base font-bold text-[var(--color-navy)]">{formData.fullName || "Employment Contract"}</h3>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={handleExportPDF} className="btn-primary flex items-center gap-2">
                      <Download size={16} />
                      Export PDF
                    </button>
                    <button type="button" onClick={() => setIsPreviewOpen(false)} className="btn-secondary flex items-center gap-2">
                      <X size={16} />
                      Close
                    </button>
                  </div>
                </div>
                <div className="overflow-auto bg-slate-100 p-4">
                  <ContractPreview formData={getExportFormData()} contractNumber={contractNumber} />
                </div>
              </div>
            </div>
          )}

          {/* Action Bar */}
          <div className="fixed inset-x-0 bottom-0 z-20 border-t border-[var(--color-border-grey)] bg-white/95 px-4 py-3 shadow-[0_-4px_12px_-3px_rgba(15,23,42,0.12)] backdrop-blur-sm">
            <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="shrink-0 text-sm font-semibold text-slate-500">
                {isGenerated ? `Contract Number: ${contractNumber}` : "Draft Mode"}
              </div>
              <div className="flex flex-wrap items-center gap-3 sm:justify-end">
              <button className="btn-secondary flex items-center gap-2" onClick={handleSaveDraft}>
                <Save size={18} /> Save Draft
              </button>
              <button className="btn-secondary flex items-center gap-2" onClick={handlePreview}>
                <Eye size={18} /> Preview
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
      </div>
  );
}

ContractGenerator.defaultJobPositions = DEFAULT_JOB_POSITIONS;

export default ContractGenerator;

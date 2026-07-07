import React from 'react';

export default function ContractPreview({ formData, contractNumber }) {
  if (!formData) return null;

  const renderBullets = (text) => {
    if (!text) return null;
    return text.split('\n').map((line, index) => (
      <p key={index} className="ml-4 mb-1">{line}</p>
    ));
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '..............................';
    return new Date(dateStr).toLocaleDateString('en-GB');
  };

  return (
    <div id="contract-preview" className="bg-white p-10 max-w-[210mm] mx-auto text-[13px] text-black leading-relaxed font-serif print:p-0">
      
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-[15px] font-bold uppercase mb-1">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</h1>
        <h2 className="text-[14px] font-bold mb-1">Độc lập - Tự do - Hạnh phúc</h2>
        <h2 className="text-[13px] font-bold uppercase mt-2">SOCIALIST REPUBLIC OF VIETNAM</h2>
        <h3 className="text-[12px] mb-4">Independence - Freedom - Happiness</h3>
        
        <h1 className="text-xl font-bold uppercase mt-8">HỢP ĐỒNG LAO ĐỘNG</h1>
        <h2 className="text-lg font-bold uppercase mb-2">EMPLOYMENT CONTRACT</h2>
        <p className="italic">Số / No: {contractNumber || '.........................'}</p>
      </div>

      <div className="mb-6">
        <p>Hôm nay, ngày / Today, date {formatDate(formData.dateOfSigning)}, tại / at {formData.branch || '.........................'}. Chúng tôi gồm / We include:</p>
      </div>

      {/* Section 1: Employer */}
      <div className="mb-6">
        <h3 className="font-bold uppercase mb-2 border-b border-black pb-1">BÊN SỬ DỤNG LAO ĐỘNG / EMPLOYER (BÊN A / PARTY A)</h3>
        <table className="w-full text-left">
          <tbody>
            <tr>
              <td className="w-1/3 py-1 font-semibold">Tên Công ty / Company Name:</td>
              <td className="w-2/3 py-1 font-bold">{formData.companyName}</td>
            </tr>
            <tr>
              <td className="w-1/3 py-1 font-semibold">Đại diện / Representative:</td>
              <td className="w-2/3 py-1">{formData.repName}</td>
            </tr>
            <tr>
              <td className="w-1/3 py-1 font-semibold">Chức vụ / Designation:</td>
              <td className="w-2/3 py-1">{formData.repDesignation}</td>
            </tr>
            <tr>
              <td className="w-1/3 py-1 font-semibold">Điện thoại / Phone:</td>
              <td className="w-2/3 py-1">{formData.repPhone}</td>
            </tr>
            <tr>
              <td className="w-1/3 py-1 font-semibold">Mã số thuế / Tax Code:</td>
              <td className="w-2/3 py-1">{formData.companyTaxCode}</td>
            </tr>
            <tr>
              <td className="w-1/3 py-1 font-semibold align-top">Địa chỉ / Address:</td>
              <td className="w-2/3 py-1">{formData.companyAddress}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Section 2: Employee */}
      <div className="mb-6">
        <h3 className="font-bold uppercase mb-2 border-b border-black pb-1">BÊN NGƯỜI LAO ĐỘNG / EMPLOYEE (BÊN B / PARTY B)</h3>
        <table className="w-full text-left">
          <tbody>
            <tr>
              <td className="w-1/3 py-1 font-semibold">Họ và tên / Full Name:</td>
              <td className="w-2/3 py-1 font-bold">{formData.fullName || '...................................................'}</td>
            </tr>
            <tr>
              <td className="w-1/3 py-1 font-semibold">Giới tính / Gender:</td>
              <td className="w-2/3 py-1">{formData.gender || '...................................................'}</td>
            </tr>
            <tr>
              <td className="w-1/3 py-1 font-semibold">Ngày sinh / Date of Birth:</td>
              <td className="w-2/3 py-1">{formatDate(formData.dob)}</td>
            </tr>
            <tr>
              <td className="w-1/3 py-1 font-semibold">Quốc tịch / Nationality:</td>
              <td className="w-2/3 py-1">{formData.nationality || '...................................................'}</td>
            </tr>
            <tr>
              <td className="w-1/3 py-1 font-semibold">CMND/CCCD/Hộ chiếu / ID/Passport:</td>
              <td className="w-2/3 py-1">{formData.idNumber || '...................................................'}</td>
            </tr>
            <tr>
              <td className="w-1/3 py-1 font-semibold align-top">Địa chỉ / Permanent Address:</td>
              <td className="w-2/3 py-1">{formData.address || '...................................................'}</td>
            </tr>
            <tr>
              <td className="w-1/3 py-1 font-semibold">Điện thoại / Phone:</td>
              <td className="w-2/3 py-1">{formData.phoneNumber || '...................................................'}</td>
            </tr>
            <tr>
              <td className="w-1/3 py-1 font-semibold">Email:</td>
              <td className="w-2/3 py-1">{formData.email || '...................................................'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mb-4 text-justify font-bold">
        Thỏa thuận ký kết hợp đồng lao động này với các điều khoản sau đây / Agree to sign this employment contract with the following terms and conditions:
      </div>

      {/* Article 1 */}
      <div className="mb-4">
        <h3 className="font-bold uppercase mb-2">Điều 1: Công việc và địa điểm làm việc / Article 1: Work and Location</h3>
        <p><span className="font-semibold">1.1. Phòng ban / Department:</span> {formData.department || '........................................'}</p>
        <p><span className="font-semibold">1.2. Chức danh / Job Title:</span> {formData.jobTitle || '........................................'}</p>
        <p><span className="font-semibold">1.3. Địa điểm làm việc / Work Location:</span> {formData.workLocation || '........................................'}</p>
        <p><span className="font-semibold">1.4. Mô tả công việc chung / Job Description:</span> {formData.jobDescription}</p>
        <div className="font-semibold mt-2">1.5. Trách nhiệm cụ thể / Specific Responsibilities:</div>
        <div className="mt-1">{renderBullets(formData.responsibilities)}</div>
      </div>

      {/* Article 2 */}
      <div className="mb-4">
        <h3 className="font-bold uppercase mb-2">Điều 2: Thời hạn hợp đồng / Article 2: Contract Term</h3>
        <p><span className="font-semibold">2.1. Loại hợp đồng / Contract Type:</span> {formData.contractType || '........................................'}</p>
        <p><span className="font-semibold">2.2. Thời hạn / Duration:</span> {formData.contractDuration} tháng / months</p>
        <p><span className="font-semibold">2.3. Bắt đầu từ / Start Date:</span> {formatDate(formData.contractStartDate)} 
           <span className="font-semibold ml-4">đến / End Date:</span> {formatDate(formData.contractEndDate)}</p>
        <p><span className="font-semibold">2.4. Thời gian thử việc / Probation Period:</span> {formData.probationPeriod} tháng / months (Từ / From: {formatDate(formData.probationStartDate)} đến / To: {formatDate(formData.probationEndDate)})</p>
      </div>

      {/* Article 3 */}
      <div className="mb-4">
        <h3 className="font-bold uppercase mb-2">Điều 3: Thời giờ làm việc / Article 3: Working Hours</h3>
        <p><span className="font-semibold">3.1. Ngày làm việc / Working days:</span> {formData.workingDays}</p>
        <p><span className="font-semibold">3.2. Ca sáng / Morning Shift:</span> {formData.morningShift}</p>
        <p><span className="font-semibold">3.3. Ca chiều / Afternoon Shift:</span> {formData.afternoonShift}</p>
      </div>

      {/* Article 4 */}
      <div className="mb-6">
        <h3 className="font-bold uppercase mb-3">Điều 4: Tiền lương và chế độ đãi ngộ / Article 4: Salary and Remuneration</h3>
        <table className="w-full border-collapse border border-black text-sm mb-4">
          <tbody>
            <tr className="bg-gray-100 font-bold border-b border-black">
              <td className="p-2 border-r border-black w-2/3">Khoản mục / Details</td>
              <td className="p-2 w-1/3 text-right">Số tiền / Amount (VND)</td>
            </tr>
            <tr className="border-b border-black">
              <td className="p-2 border-r border-black">Lương cơ bản / Base Salary</td>
              <td className="p-2 text-right">{formData.baseSalary?.toLocaleString() || 0}</td>
            </tr>
            <tr className="border-b border-black">
              <td className="p-2 border-r border-black">Phụ cấp trách nhiệm/KPI / Responsibility/KPI Allowance</td>
              <td className="p-2 text-right">{formData.kpiAllowance?.toLocaleString() || 0}</td>
            </tr>
            <tr className="border-b border-black">
              <td className="p-2 border-r border-black">Phụ cấp khác / Other Allowance</td>
              <td className="p-2 text-right">{formData.otherAllowance?.toLocaleString() || 0}</td>
            </tr>
            <tr className="border-b border-black font-bold bg-gray-50">
              <td className="p-2 border-r border-black">Tổng thu nhập / Gross Salary</td>
              <td className="p-2 text-right">{formData.grossSalary?.toLocaleString() || 0}</td>
            </tr>
            <tr className="border-b border-black">
              <td className="p-2 border-r border-black pl-6">Khấu trừ BHXH / Social Ins. ({formData.socialInsurancePct}%)</td>
              <td className="p-2 text-right">({formData.socialInsuranceAmount?.toLocaleString() || 0})</td>
            </tr>
            <tr className="border-b border-black">
              <td className="p-2 border-r border-black pl-6">Khấu trừ BHYT / Health Ins. ({formData.healthInsurancePct}%)</td>
              <td className="p-2 text-right">({formData.healthInsuranceAmount?.toLocaleString() || 0})</td>
            </tr>
            <tr className="border-b border-black">
              <td className="p-2 border-r border-black pl-6">Khấu trừ BHTN / Unemployment Ins. ({formData.unemploymentInsurancePct}%)</td>
              <td className="p-2 text-right">({formData.unemploymentInsuranceAmount?.toLocaleString() || 0})</td>
            </tr>
            <tr className="border-b border-black font-bold">
              <td className="p-2 border-r border-black">Tổng khấu trừ bảo hiểm / Total Ins. Deduction</td>
              <td className="p-2 text-right">({formData.totalInsurance?.toLocaleString() || 0})</td>
            </tr>
            <tr className="font-bold bg-gray-100">
              <td className="p-2 border-r border-black text-lg">Lương thực nhận / Net Salary</td>
              <td className="p-2 text-right text-lg">{formData.netSalary?.toLocaleString() || 0}</td>
            </tr>
          </tbody>
        </table>
        <p className="mb-1"><span className="font-semibold">4.1. Kỳ trả lương / Payroll Period:</span> {formData.payrollPeriod}</p>
        <p className="mb-1"><span className="font-semibold">4.2. Ngày trả lương / Salary Payment Date:</span> {formData.paymentDate}</p>
        <p className="mb-1"><span className="font-semibold">4.3. Hình thức trả lương / Payment Method:</span> {formData.paymentMethod}</p>
        <p className="italic text-[12px] mt-2">* Thuế thu nhập cá nhân (nếu có) sẽ được khấu trừ trước khi trả lương theo quy định của pháp luật / Personal income tax (if applicable) will be deducted before net salary payment according to current laws.</p>
      </div>

      {/* Article 5 */}
      <div className="mb-4">
        <h3 className="font-bold uppercase mb-2">Điều 5: Chế độ thử việc và Bàn giao / Article 5: Probation Terms & Handover</h3>
        <p><span className="font-semibold">5.1. Lương tháng đầu tiên / 1st Month Salary:</span> {formData.probationFirstMonthSalary}%</p>
        <p><span className="font-semibold">5.2. Lương tháng thứ hai / 2nd Month Salary:</span> {formData.probationSecondMonthSalary}%</p>
        <p><span className="font-semibold">5.3. Bảo hiểm sau thử việc / Insurance after probation:</span> {formData.insuranceAfterProbation}</p>
        <p><span className="font-semibold">5.4. Thời gian báo trước (Tháng 1) / Notice period (1st Month):</span> {formData.noticePeriodFirstMonth}</p>
        <p><span className="font-semibold">5.5. Thời gian báo trước (Tháng 2) / Notice period (2nd Month):</span> {formData.noticePeriodSecondMonth}</p>
        <p><span className="font-semibold">5.6. Yêu cầu bàn giao / Handover Required:</span> {formData.handoverRequired}</p>
      </div>

      {/* Article 6 */}
      <div className="mb-4">
        <h3 className="font-bold uppercase mb-2">Điều 6: Quyền và Nghĩa vụ của Người lao động / Article 6: Employee's Rights & Obligations</h3>
        <div className="font-semibold mb-1">6.1. Quyền lợi / Rights:</div>
        {renderBullets(formData.employeeRights)}
        <div className="font-semibold mt-2 mb-1">6.2. Nghĩa vụ / Obligations:</div>
        {renderBullets(formData.employeeObligations)}
      </div>

      {/* Article 7 */}
      <div className="mb-4 break-inside-avoid">
        <h3 className="font-bold uppercase mb-2">Điều 7: Quyền và Nghĩa vụ của Người sử dụng lao động / Article 7: Employer's Rights & Obligations</h3>
        {renderBullets(formData.employerRights)}
      </div>

      {/* Article 8 */}
      <div className="mb-4 break-inside-avoid">
        <h3 className="font-bold uppercase mb-2">Điều 8: Chế độ nghỉ ngơi / Article 8: Leave Policy</h3>
        <p><span className="font-semibold">8.1. Nghỉ phép năm / Annual Leave:</span> {formData.annualLeave}</p>
        <p><span className="font-semibold">8.2. Nghỉ ốm / Sick Leave:</span> {formData.sickLeave}</p>
        <p><span className="font-semibold">8.3. Nghỉ lễ Tết / Public Holidays:</span> {formData.publicHoliday}</p>
      </div>

      {/* Article 9 */}
      <div className="mb-4 break-inside-avoid">
        <h3 className="font-bold uppercase mb-2">Điều 9: Bảo hiểm xã hội / Article 9: Statutory Insurance</h3>
        <p>{formData.insuranceStartCondition}</p>
      </div>

      {/* Article 10 */}
      <div className="mb-4 break-inside-avoid">
        <h3 className="font-bold uppercase mb-2">Điều 10: Trang thiết bị bảo hộ & Huấn luyện an toàn / Article 10: PPE & Safety Training</h3>
        <p><span className="font-semibold">10.1. Bảo hộ lao động / PPE Required:</span> {formData.ppeRequired === "Yes" ? formData.ppeDescription : "No"}</p>
        <p><span className="font-semibold">10.2. Huấn luyện an toàn / Safety Training:</span> {formData.safetyTrainingRequired === "Yes" ? formData.trainingDescription : "No"}</p>
      </div>

      {/* Article 11 */}
      <div className="mb-4 break-inside-avoid">
        <h3 className="font-bold uppercase mb-2">Điều 11: Đào tạo / Article 11: Training</h3>
        <p><span className="font-semibold">11.1. Phạm vi / Scope:</span> {formData.trainingScope}</p>
        <p><span className="font-semibold">11.2. Hoàn trả chi phí / Cost Recovery:</span> {formData.trainingCostRecovery}</p>
      </div>

      {/* Article 12 */}
      <div className="mb-4 break-inside-avoid">
        <h3 className="font-bold uppercase mb-2">Điều 12: Chấm dứt hợp đồng / Article 12: Termination</h3>
        {renderBullets(formData.termination)}
      </div>

      {/* Article 13 */}
      <div className="mb-8 break-inside-avoid">
        <h3 className="font-bold uppercase mb-2">Điều 13: Bảo mật thông tin / Article 13: Confidentiality</h3>
        {renderBullets(formData.confidentiality)}
        {formData.postEmploymentRestriction24Months && (
          <p className="ml-4 mt-2 font-bold italic">
            * Employee agrees to a 24-month post-employment restriction regarding non-competition and non-solicitation of clients/employees.
            (Người lao động đồng ý với điều khoản hạn chế cạnh tranh và lôi kéo khách hàng/nhân sự trong vòng 24 tháng sau khi nghỉ việc.)
          </p>
        )}
      </div>

      <div className="mb-6 font-bold text-center break-inside-avoid">
        Hợp đồng này được lập thành 02 bản có giá trị pháp lý như nhau, mỗi bên giữ 01 bản. / This contract is made in 02 copies with equal legal validity, each party keeps 01 copy.
      </div>

      {/* Signatures */}
      <div className="mt-8 grid grid-cols-2 text-center gap-8 break-inside-avoid">
        <div>
          <p className="font-bold uppercase">Đại diện Bên B / Party B</p>
          <p className="italic text-[12px]">(Ký và ghi rõ họ tên / Sign and state full name)</p>
          <div className="h-32"></div>
          <p className="font-bold text-lg border-t-2 border-dotted border-gray-400 pt-2 inline-block min-w-[200px]">
            {formData.fullName || '.............................................'}
          </p>
        </div>
        <div>
          <p className="font-bold uppercase">Đại diện Bên A / Party A</p>
          <p className="italic text-[12px]">(Ký, đóng dấu, ghi rõ họ tên / Sign, stamp, full name)</p>
          <div className="h-32"></div>
          <p className="font-bold text-lg border-t-2 border-dotted border-gray-400 pt-2 inline-block min-w-[200px]">
            {formData.repName || '.............................................'}
          </p>
        </div>
      </div>
      
      <div className="text-[11px] text-gray-500 mt-16 pt-4 border-t text-right break-inside-avoid">
        Prepared by: {formData.preparedBy || 'HR Department'} | Date: {formatDate(formData.dateOfSigning)}
      </div>
    </div>
  );
}

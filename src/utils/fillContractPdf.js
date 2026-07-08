import { inflateRaw } from "pako";

const TEMPLATE_PATH = "/001 Agreement Letter.docx";
const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8");

const crcTable = new Uint32Array(256).map((_, index) => {
  let crc = index;
  for (let bit = 0; bit < 8; bit += 1) {
    crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  }
  return crc >>> 0;
});

const xmlEscape = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const formatValue = (value) => {
  if (value === undefined || value === null) return "";
  if (typeof value === "number") return value === 0 ? "" : value.toLocaleString();
  return String(value).trim();
};

const formatMoney = (value) => {
  const numeric = Number(value) || 0;
  return numeric === 0 ? "" : numeric.toLocaleString();
};

const sanitizeFilenamePart = (value, fallback) => {
  const text = String(value || fallback).trim();
  return Array.from(text)
    .map((char) => (/[<>:"/\\|?*]/.test(char) || char.charCodeAt(0) < 32 ? "_" : char))
    .join("")
    .replace(/\s+/g, "_");
};

const getDosDateTime = (date = new Date()) => {
  const dosTime =
    (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const dosDate =
    ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { dosTime, dosDate };
};

const crc32 = (bytes) => {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
};

const readUint16 = (view, offset) => view.getUint16(offset, true);
const readUint32 = (view, offset) => view.getUint32(offset, true);

const writeUint16 = (target, offset, value) => {
  target[offset] = value & 0xff;
  target[offset + 1] = (value >>> 8) & 0xff;
};

const writeUint32 = (target, offset, value) => {
  target[offset] = value & 0xff;
  target[offset + 1] = (value >>> 8) & 0xff;
  target[offset + 2] = (value >>> 16) & 0xff;
  target[offset + 3] = (value >>> 24) & 0xff;
};

const concatBytes = (parts) => {
  const size = parts.reduce((total, part) => total + part.length, 0);
  const output = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
};

const readZipEntries = (buffer) => {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  const entries = [];

  let endOffset = -1;
  const minEndRecordSize = 22;
  const maxCommentSize = 0xffff;
  const searchStart = Math.max(0, bytes.length - minEndRecordSize - maxCommentSize);

  for (let offset = bytes.length - minEndRecordSize; offset >= searchStart; offset -= 1) {
    if (readUint32(view, offset) === 0x06054b50) {
      endOffset = offset;
      break;
    }
  }

  if (endOffset === -1) {
    throw new Error("The Word template is not a valid DOCX zip file.");
  }

  const entryCount = readUint16(view, endOffset + 10);
  let centralOffset = readUint32(view, endOffset + 16);

  for (let index = 0; index < entryCount; index += 1) {
    if (readUint32(view, centralOffset) !== 0x02014b50) {
      throw new Error("The Word template central directory is invalid.");
    }

    const method = readUint16(view, centralOffset + 10);
    const compressedSize = readUint32(view, centralOffset + 20);
    const localHeaderOffset = readUint32(view, centralOffset + 42);
    const fileNameLength = readUint16(view, centralOffset + 28);
    const extraLength = readUint16(view, centralOffset + 30);
    const commentLength = readUint16(view, centralOffset + 32);
    const nameStart = centralOffset + 46;
    const name = decoder.decode(bytes.slice(nameStart, nameStart + fileNameLength));

    if (readUint32(view, localHeaderOffset) !== 0x04034b50) {
      throw new Error(`The Word template local header is invalid for ${name}.`);
    }

    const localFileNameLength = readUint16(view, localHeaderOffset + 26);
    const localExtraLength = readUint16(view, localHeaderOffset + 28);
    const dataStart = localHeaderOffset + 30 + localFileNameLength + localExtraLength;
    const dataEnd = dataStart + compressedSize;
    const compressed = bytes.slice(dataStart, dataEnd);
    const data = method === 0 ? compressed : inflateRaw(compressed);

    entries.push({ name, data });
    centralOffset = nameStart + fileNameLength + extraLength + commentLength;
  }

  return entries;
};

const createZip = (entries) => {
  const now = getDosDateTime();
  const localParts = [];
  const centralParts = [];
  const utf8Flag = 0x0800;
  let localOffset = 0;

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const isDirectory = entry.name.endsWith("/");
    const data = entry.data instanceof Uint8Array ? entry.data : encoder.encode(entry.data);
    const compressed = isDirectory ? new Uint8Array() : data;
    const crc = isDirectory ? 0 : crc32(data);

    const localHeader = new Uint8Array(30 + nameBytes.length);
    writeUint32(localHeader, 0, 0x04034b50);
    writeUint16(localHeader, 4, 20);
    writeUint16(localHeader, 6, utf8Flag);
    writeUint16(localHeader, 8, 0);
    writeUint16(localHeader, 10, now.dosTime);
    writeUint16(localHeader, 12, now.dosDate);
    writeUint32(localHeader, 14, crc);
    writeUint32(localHeader, 18, compressed.length);
    writeUint32(localHeader, 22, data.length);
    writeUint16(localHeader, 26, nameBytes.length);
    writeUint16(localHeader, 28, 0);
    localHeader.set(nameBytes, 30);

    localParts.push(localHeader, compressed);

    const centralHeader = new Uint8Array(46 + nameBytes.length);
    writeUint32(centralHeader, 0, 0x02014b50);
    writeUint16(centralHeader, 4, 20);
    writeUint16(centralHeader, 6, 20);
    writeUint16(centralHeader, 8, utf8Flag);
    writeUint16(centralHeader, 10, 0);
    writeUint16(centralHeader, 12, now.dosTime);
    writeUint16(centralHeader, 14, now.dosDate);
    writeUint32(centralHeader, 16, crc);
    writeUint32(centralHeader, 20, compressed.length);
    writeUint32(centralHeader, 24, data.length);
    writeUint16(centralHeader, 28, nameBytes.length);
    writeUint16(centralHeader, 30, 0);
    writeUint16(centralHeader, 32, 0);
    writeUint16(centralHeader, 34, 0);
    writeUint16(centralHeader, 36, 0);
    writeUint32(centralHeader, 38, isDirectory ? 0x10 : 0);
    writeUint32(centralHeader, 42, localOffset);
    centralHeader.set(nameBytes, 46);

    centralParts.push(centralHeader);
    localOffset += localHeader.length + compressed.length;
  }

  const centralDirectory = concatBytes(centralParts);
  const endRecord = new Uint8Array(22);
  writeUint32(endRecord, 0, 0x06054b50);
  writeUint16(endRecord, 8, entries.length);
  writeUint16(endRecord, 10, entries.length);
  writeUint32(endRecord, 12, centralDirectory.length);
  writeUint32(endRecord, 16, localOffset);
  writeUint16(endRecord, 20, 0);

  return concatBytes([...localParts, centralDirectory, endRecord]);
};

const splitDate = (dateValue) => {
  if (!dateValue) return { day: "", month: "", year: "" };
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return { day: "", month: "", year: "" };
  return {
    day: String(date.getDate()).padStart(2, "0"),
    month: String(date.getMonth() + 1).padStart(2, "0"),
    year: String(date.getFullYear()),
  };
};

const replaceCellValueByRow = (xml, rowIndex, cellIndex, value, options = {}) => {
  let currentRow = -1;
  return xml.replace(/<w:tr(?:\s[^>]*)?>[\s\S]*?<\/w:tr>/g, (rowXml) => {
    currentRow += 1;
    if (currentRow !== rowIndex) return rowXml;

    let currentCell = -1;
    return rowXml.replace(/<w:tc(?:\s[^>]*)?>[\s\S]*?<\/w:tc>/g, (cellXml) => {
      currentCell += 1;
      if (currentCell !== cellIndex) return cellXml;

      const escapedValue = xmlEscape(formatValue(value));
      let replaced = false;
      const withFirstTextUpdated = cellXml.replace(/<w:t((?:\s[^>]*)?)>[\s\S]*?<\/w:t>/, (textXml, attrs) => {
        replaced = true;
        return `<w:t${attrs}>${escapedValue}</w:t>`;
      });
      const withRequestedStyle = options.bold
        ? withFirstTextUpdated.replace(/<w:rPr>([\s\S]*?)<\/w:rPr>|<w:t/, (match, props) =>
            props === undefined ? `<w:rPr><w:b/></w:rPr><w:t` : `<w:rPr>${props}<w:b/></w:rPr>`
          )
        : withFirstTextUpdated;
      const withColorStyle = options.color
        ? withRequestedStyle.replace(/<w:rPr>([\s\S]*?)<\/w:rPr>|<w:t/, (match, props) =>
            props === undefined ? `<w:rPr><w:color w:val="${options.color}"/></w:rPr><w:t` : `<w:rPr>${props}<w:color w:val="${options.color}"/></w:rPr>`
          )
        : withRequestedStyle;

      if (!replaced) {
        const escapedValue = xmlEscape(formatValue(value));
        return cellXml.replace(
          /<\/w:tc>$/,
          `<w:p><w:r>${options.bold || options.color ? `<w:rPr>${options.bold ? "<w:b/>" : ""}${options.color ? `<w:color w:val="${options.color}"/>` : ""}</w:rPr>` : ""}<w:t>${escapedValue}</w:t></w:r></w:p></w:tc>`
        );
      }

      let keptFirstTextNode = false;
      return withColorStyle.replace(/(<w:t(?:\s[^>]*)?>)[\s\S]*?(<\/w:t>)/g, (textXml, open, close) => {
        if (!keptFirstTextNode) {
          keptFirstTextNode = true;
          return textXml;
        }
        return `${open}${close}`;
      });
    });
  });
};

const removeRowsByIndex = (xml, rowIndexes) => {
  const indexes = new Set(rowIndexes);
  let currentRow = -1;
  return xml.replace(/<w:tr(?:\s[^>]*)?>[\s\S]*?<\/w:tr>/g, (rowXml) => {
    currentRow += 1;
    return indexes.has(currentRow) ? "" : rowXml;
  });
};

const replaceText = (xml, search, value) =>
  xml.replace(search, xmlEscape(formatValue(value)));

const getParagraphText = (paragraphXml) =>
  paragraphXml.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

const createWordParagraph = (value) => {
  const lines = String(value ?? "").split(/\r?\n/);
  const runs = lines
    .map((line, index) => {
      const breakTag = index === 0 ? "" : "<w:br/>";
      return `${breakTag}<w:t xml:space="preserve">${xmlEscape(line)}</w:t>`;
    })
    .join("");

  return `<w:p><w:r>${runs}</w:r></w:p>`;
};

const createJobDescriptionParagraphs = (values) => {
  const jobTitle = formatValue(values.jobTitle);
  const titleParagraph = jobTitle
    ? `<w:p><w:r><w:rPr><w:b/></w:rPr><w:t xml:space="preserve">1. ${xmlEscape(jobTitle)} / Chức danh công việc</w:t></w:r></w:p>`
    : "";
  const lines = String(values.jobDescriptionHeading || "")
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*\d+\.\s*/, "").trim())
    .filter(Boolean);
  const bullets = [];

  for (let index = 0; index < lines.length; index += 2) {
    const englishLine = lines[index] || "";
    const vietnameseLine = lines[index + 1] || "";
    const runs = [
      `<w:t xml:space="preserve">• ${xmlEscape(englishLine)}</w:t>`,
      vietnameseLine ? `<w:br/><w:t xml:space="preserve">${xmlEscape(vietnameseLine)}</w:t>` : "",
    ].join("");
    bullets.push(`<w:p><w:r>${runs}</w:r></w:p>`);
  }

  const bulletParagraphs = bullets
    .join("");

  return `${titleParagraph}${bulletParagraphs}`;
};

const createWorkLocationParagraphs = (locations) =>
  locations
    .filter(Boolean)
    .map((location, index) => `<w:p><w:r><w:t xml:space="preserve">• Location ${index + 1}: ${xmlEscape(location)}</w:t></w:r></w:p>`)
    .join("");

const replaceWorkLocationSection = (xml, locations) => {
  if (!locations.length) return xml;
  let inserted = false;
  let skipUntilStandardHours = false;

  return xml.replace(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g, (paragraphXml) => {
    const text = getParagraphText(paragraphXml);
    if (skipUntilStandardHours) {
      if (text.includes("Standard Hours") || text.includes("Giờ làm việc chuẩn")) {
        skipUntilStandardHours = false;
        return paragraphXml;
      }
      return "";
    }

    if (!inserted && /^Location of work:\s*$/.test(text)) {
      inserted = true;
      skipUntilStandardHours = true;
      return `${paragraphXml}<w:p><w:r><w:t></w:t></w:r></w:p>${createWorkLocationParagraphs(locations)}`;
    }
    return paragraphXml;
  });
};

const replaceStandardHoursSection = (xml, values) => {
  const englishHours = `${values.workingDays}: ${values.morningShift} and ${values.afternoonShift}`.trim();
  let headingFound = false;

  return xml.replace(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g, (paragraphXml) => {
    const text = getParagraphText(paragraphXml);
    if (text.includes("Standard Hours") || text.includes("Giờ làm việc chuẩn")) {
      headingFound = true;
      return paragraphXml;
    }

    if (headingFound && (text.includes("Thứ Hai") || text.includes("Saturday") || text.includes("Bảy"))) {
      headingFound = false;
      return `<w:p><w:r><w:t xml:space="preserve">Thứ Hai đến Thứ Bảy/ </w:t></w:r><w:r><w:rPr><w:b/></w:rPr><w:t xml:space="preserve">${xmlEscape(englishHours)}</w:t></w:r></w:p>`;
    }

    return paragraphXml;
  });
};

const replaceJobDescriptionSection = (xml, values) => {
  let headingIndex = -1;
  let paragraphIndex = -1;

  return xml.replace(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g, (paragraphXml) => {
    paragraphIndex += 1;

    if (getParagraphText(paragraphXml).includes("Job Description")) {
      headingIndex = paragraphIndex;
      return paragraphXml;
    }

    if (headingIndex !== -1 && paragraphIndex === headingIndex + 1) {
      return createJobDescriptionParagraphs(values);
    }

    return paragraphXml;
  });
};

const normalizePdfFilename = (filename) =>
  filename.toLowerCase().endsWith(".pdf") ? filename : `${filename}.pdf`;

const toDocxFilename = (filename) =>
  normalizePdfFilename(filename).replace(/\.pdf$/i, ".docx");

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30000);
};

const mergeDocumentXml = (xml, formData) => {
  const dateParts = splitDate(formData.dateOfSigning);
  const workLocations = [formData.workLocation1, formData.workLocation2, formData.workLocation3]
    .filter(Boolean)
    .flatMap((location) => String(location).split(/\s*;\s*/).filter(Boolean));
  if (!workLocations.length && formData.workLocation) {
    workLocations.push(...String(formData.workLocation).split(/\s*;\s*/).filter(Boolean));
  }
  const workLocation = workLocations.join("; ");
  const values = {
    companyName: formData.companyName,
    repName: formData.repName,
    repDesignation: formData.repDesignation,
    repPhone: formData.repPhone,
    companyTaxCode: formData.companyTaxCode,
    companyAddress: formData.companyAddress,
    fullName: String(formData.fullName || "").toUpperCase(),
    gender: formData.gender,
    dob: formData.dob,
    idNumber: formData.idNumber,
    address: formData.address,
    phoneNumber: formData.phoneNumber,
    email: formData.email,
    workLocation,
    department: formData.department,
    workingDays: formData.workingDays,
    morningShift: formData.morningShift,
    afternoonShift: formData.afternoonShift,
    contractDuration: formData.contractDuration,
    probationPeriod: formData.probationPeriod,
    baseSalary: formatMoney(formData.baseSalary),
    reliabilityAllowance: formatMoney(formData.reliabilityAllowance),
    kpiAllowance: formatMoney(formData.kpiAllowance),
    grossSalary: formatMoney(formData.grossSalary),
    socialInsurancePct: formatValue(formData.socialInsurancePct),
    healthInsurancePct: formatValue(formData.healthInsurancePct),
    unemploymentInsurancePct: formatValue(formData.unemploymentInsurancePct),
    socialInsuranceAmount: formatMoney(formData.socialInsuranceAmount),
    healthInsuranceAmount: formatMoney(formData.healthInsuranceAmount),
    unemploymentInsuranceAmount: formatMoney(formData.unemploymentInsuranceAmount),
    totalInsurance: formatMoney(formData.totalInsurance),
    pitNote: formData.pitNote,
    personalIncomeTaxAmount: formatMoney(formData.personalIncomeTaxAmount),
    netSalary: formatMoney(formData.netSalary),
    probationNetSalary: formatMoney((Number(formData.grossSalary) || 0) - (Number(formData.personalIncomeTaxAmount) || 0)),
    payrollPeriod: formData.payrollPeriod,
    paymentDate: formData.paymentDate,
    probationFirstMonthSalary: formatValue(formData.probationFirstMonthSalary),
    probationSecondMonthSalary: formatValue(formData.probationSecondMonthSalary),
    probationStartDate: formData.probationStartDate,
    probationEndDate: formData.probationEndDate,
    noticePeriodWorkingDays: formatValue(formData.noticePeriodWorkingDays || 7),
    noticePeriodFirstMonth: formData.noticePeriodFirstMonth,
    noticePeriodSecondMonth: formData.noticePeriodSecondMonth,
    handoverCondition: formData.handoverCondition,
    jobTitle: formData.jobTitle,
    jobDescriptionHeading: formData.jobDescriptionHeading,
    employerSignatureName: formData.employerSignatureName || formData.repName,
    employeeSignatureName: formData.employeeSignatureName || formData.fullName,
  };

  let merged = xml;

  [
    [0, 1, values.companyName],
    [1, 1, values.repName],
    [2, 1, values.repDesignation],
    [3, 1, values.repPhone],
    [4, 1, values.companyTaxCode],
    [5, 1, values.companyAddress],
    [6, 1, values.fullName, { bold: true }],
    [7, 1, values.gender],
    [8, 1, values.dob],
    [9, 1, values.idNumber],
    [10, 1, values.address],
    [11, 1, values.phoneNumber],
    [12, 1, values.email],
    [14, 1, "Lương cơ bản / Base Salary"],
    [14, 2, values.baseSalary],
    [15, 1, "Phụ cấp Chuyên cần / Reliability"],
    [15, 2, values.reliabilityAllowance],
    [16, 1, "Trách nhiệm , Kết quả đánh giá công việc / Responsibility monthly KPI"],
    [16, 2, values.kpiAllowance],
    [17, 1, "Gross Salary", { bold: true }],
    [17, 2, values.grossSalary, { bold: true }],
    [18, 1, `BHXH / Social Insurance (${values.socialInsurancePct}%)`],
    [18, 2, values.socialInsuranceAmount],
    [19, 1, `BHYT / Health Insurance (${values.healthInsurancePct}%)`],
    [19, 2, values.healthInsuranceAmount],
    [20, 1, `BHTN / Unemployment Insurance (${values.unemploymentInsurancePct}%)`],
    [20, 2, values.unemploymentInsuranceAmount],
    [21, 1, "Tổng bảo hiểm / Total Insurance", { bold: true }],
    [21, 2, values.totalInsurance, { bold: true }],
    [22, 1, "Thuế TNCN / Personal Income Tax (PIT)"],
    [22, 2, values.pitNote],
    [23, 1, "Lương thực nhận / Net Salary", { bold: true, color: "008000" }],
    [23, 2, values.netSalary, { bold: true, color: "008000" }],
    [24, 0, ""],
    [24, 1, ""],
    [24, 2, ""],
    [25, 0, ""],
    [25, 1, ""],
    [25, 2, ""],
    [26, 0, ""],
    [26, 1, ""],
    [26, 2, ""],
    [27, 0, ""],
    [27, 1, ""],
    [27, 2, ""],
    [28, 0, ""],
    [28, 1, ""],
    [28, 2, ""],
    [30, 1, "Lương cơ bản / Base Salary"],
    [30, 2, values.baseSalary],
    [31, 1, "Phụ cấp Chuyên cần / Reliability"],
    [31, 2, values.reliabilityAllowance],
    [32, 1, "Trách nhiệm , Kết quả đánh giá công việc / Responsibility monthly KPI"],
    [32, 2, values.kpiAllowance],
    [33, 1, "Gross Salary", { bold: true }],
    [33, 2, values.grossSalary, { bold: true }],
    [34, 1, "BHXH / Social Insurance (8%)"],
    [34, 2, "0"],
    [35, 1, "BHYT / Health Insurance (1.5%)"],
    [35, 2, "0"],
    [36, 1, "BHTN / Unemployment Insurance (1%)"],
    [36, 2, "0"],
    [37, 1, "Tổng bảo hiểm / Total Insurance", { bold: true }],
    [37, 2, "0", { bold: true }],
    [38, 1, "Thuế TNCN / Personal Income Tax (PIT)"],
    [38, 2, values.personalIncomeTaxAmount],
    [39, 1, "Lương thực nhận / Net Salary", { bold: true, color: "008000" }],
    [39, 2, values.probationNetSalary, { bold: true, color: "008000" }],
    [40, 0, ""],
    [40, 1, ""],
    [40, 2, ""],
    [41, 0, ""],
    [41, 1, ""],
    [41, 2, ""],
    [42, 0, ""],
    [42, 1, ""],
    [42, 2, ""],
    [43, 0, ""],
    [43, 1, ""],
    [43, 2, ""],
    [44, 0, ""],
    [44, 1, ""],
    [44, 2, ""],
  ].forEach(([rowIndex, cellIndex, value, options]) => {
    merged = replaceCellValueByRow(merged, rowIndex, cellIndex, value, options);
  });
  merged = removeRowsByIndex(merged, [22, 23, 24, 25, 26, 27, 28, 40, 41, 42, 43, 44]);

  merged = replaceText(merged, /Nha Trang, ngày  tháng  năm/, `Nha Trang, ngày ${dateParts.day} tháng ${dateParts.month} năm ${dateParts.year}`);
  merged = replaceText(merged, /Nha Trang, date  month year/, `Nha Trang, date ${dateParts.day} month ${dateParts.month} year ${dateParts.year}`);
  merged = replaceWorkLocationSection(merged, workLocations);
  const standardHoursText = `${values.workingDays} ${values.morningShift} and ${values.afternoonShift}`.trim();
  merged = replaceText(merged, /Thá»© Hai Ä‘áº¿n Thá»© Báº£y\//, `Thá»© Hai Ä‘áº¿n Thá»© Báº£y/ ${standardHoursText}`.trim());
  merged = replaceText(merged, /Thứ Hai đến Thứ Bảy\//, `Thứ Hai đến Thứ Bảy/ ${standardHoursText}`.trim());
  merged = replaceStandardHoursSection(merged, values);
  merged = replaceJobDescriptionSection(merged, values);
  merged = replaceText(
    merged,
    /This is a fixed-term contract\. The contract term is  months, calculated from the end of the month probation period\./,
    `This is a fixed-term contract. The contract term is ${values.contractDuration} months, calculated from the end of the ${values.probationPeriod} month probation period.`
  );
  merged = replaceText(
    merged,
    /Thời hạn hợp đồng là\s+tháng, được tính kể từ ngày kết thúc\s+thời gian thử việc\s+\d*\s*tháng\./,
    `Thời hạn hợp đồng là ${values.contractDuration} tháng, được tính kể từ ngày kết thúc thời gian thử việc ${values.probationPeriod} tháng.`
  );
  merged = replaceText(
    merged,
    /The contract term is\s+months, calculated from the end of the\s+month probation period\./,
    `The contract term is ${values.contractDuration} months, calculated from the end of the ${values.probationPeriod} month probation period.`
  );
  merged = replaceText(
    merged,
    /Probation period:  months, with  of the salary applied in the first month and  in the second month\./,
    `Probation period: ${values.probationPeriod} months, with ${values.probationFirstMonthSalary}% of the salary applied in the first month and ${values.probationSecondMonthSalary}% in the second month.`
  );
  merged = replaceText(
    merged,
    /Salary Calculation Period: The payroll period is from the  of the previous month to the  of the current month\. Salary shall be paid on the  of each month\./,
    `Salary Calculation Period: The payroll period is ${values.payrollPeriod}. Salary shall be paid on the ${values.paymentDate}.`
  );
  merged = replaceText(
    merged,
    /The payroll period is from the  of the previous month to the  of the current month\. Salary shall be paid on the  of each month\./,
    `The payroll period is ${values.payrollPeriod}. Salary shall be paid on the ${values.paymentDate}.`
  );
  merged = replaceText(
    merged,
    /Salary Calculation Period: The payroll period is from the\s+of the previous month to the\s+of the\s+current\s+month\.\s+Salary\s+shall\s+be\s+paid\s+on\s+the\s+of\s+each\s+month\./,
    `Salary Calculation Period: The payroll period is ${values.payrollPeriod}. Salary shall be paid on the ${values.paymentDate}.`
  );
  merged = replaceText(
    merged,
    /Method of Payment:\s*Bank transfer\/Cash/,
    `Method of Payment: ${values.paymentMethod}`
  );
  merged = replaceText(
    merged,
    /In case the employee takes leave from the\s+to the\s+of the month, the salary payment date shall\s+be deferred corresponding to the actual number of leave days taken/,
    `In case the employee takes leave, the salary payment date shall be deferred corresponding to the actual number of leave days taken.`
  );
  merged = replaceText(merged, /Within\s+\(working\)\s+days/, `Within ${values.noticePeriodWorkingDays} (working) days`);
  merged = replaceText(merged, /at least\s+\(seven\)\s+working days/, `at least ${values.noticePeriodWorkingDays} working days`);
  merged = replaceText(merged, /If resigning during the first month: at least\s+is required\./, `If resigning during the first month: at least ${values.noticePeriodFirstMonth} is required.`);
  merged = replaceText(merged, /If resigning during the second month: at least\s+is required\./, `If resigning during the second month: at least ${values.noticePeriodSecondMonth} is required.`);
  merged = replaceText(
    merged,
    /The handover process must be documented in writing and acknowledged by the\s+Employer or an authorized representative\./,
    values.handoverCondition || "The handover process must be documented in writing and acknowledged by the Employer or an authorized representative."
  );
  return merged;
};

export const createFilledDocxBytes = (templateBytes, formData) => {
  const entries = readZipEntries(templateBytes);
  const documentEntry = entries.find((entry) => entry.name === "word/document.xml");

  if (!documentEntry) {
    throw new Error("The Word template is missing word/document.xml.");
  }

  const documentXml = decoder.decode(documentEntry.data);
  documentEntry.data = encoder.encode(mergeDocumentXml(documentXml, formData));

  return createZip(entries);
};

const createFilledDocx = async (formData) => {
  const templateBytes = await fetch(TEMPLATE_PATH).then((response) => {
    if (!response.ok) throw new Error("Unable to load Agreement Letter.docx template.");
    return response.arrayBuffer();
  });

  return createFilledDocxBytes(templateBytes, formData);
};

const convertDocxToPdf = async (docxBytes, pdfFilename) => {
  const response = await fetch(
    `/api/convert-docx-to-pdf?filename=${encodeURIComponent(pdfFilename)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      },
      body: docxBytes,
    }
  );

  if (!response.ok) {
    const message = await response.text();
    const error = new Error(message || "Unable to convert Word document to PDF.");
    error.status = response.status;
    throw error;
  }

  return response.blob();
};

export const fillContractPdf = async (
  formData,
  filename = "Employment_Contract.pdf"
) => {
  try {
    const pdfFilename = normalizePdfFilename(filename);
    const docxBytes = await createFilledDocx(formData);
    const pdfBlob = await convertDocxToPdf(docxBytes, pdfFilename);
    downloadBlob(pdfBlob, pdfFilename);
  } catch (error) {
    console.error("Failed to generate contract PDF:", error);

    if (error.status === 404 || error.message.includes("NOT_FOUND")) {
      const docxFilename = toDocxFilename(filename);
      const docxBytes = await createFilledDocx(formData);
      downloadBlob(
        new Blob([docxBytes], {
          type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        }),
        docxFilename
      );
      alert(
        `PDF conversion is not available from this deployment right now, so the filled Word document was downloaded instead as ${docxFilename}.`
      );
      return;
    }

    alert(`Error generating contract: ${error.message}`);
  }
};

export const buildContractExportFilename = (formData, employeeId) => {
  const employeeName = sanitizeFilenamePart(formData.fullName, "Employee");
  const id = sanitizeFilenamePart(employeeId, "Draft");
  return `Employment_Contract_${employeeName}_${id}.pdf`;
};

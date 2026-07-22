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

const formatAmountIncludingZero = (value) => {
  if (typeof value === "string" && isNaN(Number(value.replace(/,/g, "")))) return value;
  return (Number(value) || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
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

const formatDayMonthYear = (dateValue) => {
  const match = String(dateValue || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : String(dateValue || "");
};

const normalizeEmployerCellFormat = (cellXml, { bold = false } = {}) => {
  const fontProperties = '<w:rFonts w:ascii="Times New Roman" w:cs="Times New Roman" w:eastAsia="Times New Roman" w:hAnsi="Times New Roman"/>';
  let normalized = cellXml
    .replace(/<w:highlight\s[^>]*\/>/g, "")
    .replace(/<w:i(?:Cs)?(?:\s[^>]*)?\/>/g, "");

  normalized = normalized.replace(/<w:tcPr>([\s\S]*?)<\/w:tcPr>/, (match, properties) => {
    const centeredProperties = /<w:vAlign\s[^>]*\/>/.test(properties)
      ? properties.replace(/<w:vAlign\s[^>]*\/>/, '<w:vAlign w:val="center"/>')
      : `${properties}<w:vAlign w:val="center"/>`;
    return `<w:tcPr>${centeredProperties}</w:tcPr>`;
  });

  normalized = normalized.replace(/<w:pPr>([\s\S]*?)<\/w:pPr>/, (match, properties) => {
    const cleanProperties = properties
      .replace(/<w:spacing\s[^>]*\/>/g, "")
      .replace(/<w:textAlignment\s[^>]*\/>/g, "");
    return `<w:pPr>${cleanProperties}<w:spacing w:before="0" w:after="0"/><w:textAlignment w:val="center"/></w:pPr>`;
  });

  return normalized.replace(
    /<w:r((?:\s[^>]*)?)>([\s\S]*?)(<w:t(?:\s[^>]*)?>)/,
    (match, attributes, runContent, textTag) => {
      const contentWithoutProperties = runContent.replace(/<w:rPr>[\s\S]*?<\/w:rPr>/, "");
      return `<w:r${attributes}><w:rPr>${fontProperties}${bold ? "<w:b/><w:bCs/>" : ""}</w:rPr>${contentWithoutProperties}${textTag}`;
    }
  );
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

      const finalizeCell = (updatedCellXml) => {
        let finalized = options.matchEmployerFormat
          ? normalizeEmployerCellFormat(updatedCellXml, options)
          : updatedCellXml;
        if (options.align) {
          finalized = finalized.replace(/<w:pPr>([\s\S]*?)<\/w:pPr>/, (match, properties) => {
            const propertiesWithoutAlignment = properties.replace(/<w:jc\s[^>]*\/>/g, "");
            return `<w:pPr>${propertiesWithoutAlignment}<w:jc w:val="${options.align}"/></w:pPr>`;
          });
        }
        return finalized;
      };

      const valueLines = formatValue(value).split(/\r?\n/);
      const escapedValue = valueLines
        .map((line) => xmlEscape(line))
        .join('</w:t><w:br/><w:t xml:space="preserve">');
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
        ? withRequestedStyle.replace(/<w:rPr>([\s\S]*?)<\/w:rPr>|<w:t/, (match, props) => {
            if (props === undefined) return `<w:rPr><w:color w:val="${options.color}"/></w:rPr><w:t`;
            const propertiesWithoutColor = props.replace(/<w:color\s[^>]*\/>/g, "");
            return `<w:rPr>${propertiesWithoutColor}<w:color w:val="${options.color}"/></w:rPr>`;
          })
        : withRequestedStyle;

      if (!replaced) {
        const valueRunProperties = options.bold || options.color
          ? `<w:rPr>${options.bold ? "<w:b/>" : ""}${options.color ? `<w:color w:val="${options.color}"/>` : ""}</w:rPr>`
          : "";
        const withValueInserted = /<w:r(?:\s[^>]*)?>[\s\S]*?<\/w:r>/.test(cellXml)
          ? cellXml.replace(/<w:r((?:\s[^>]*)?)>[\s\S]*?<\/w:r>/, `<w:r$1>${valueRunProperties}<w:t xml:space="preserve">${escapedValue}</w:t></w:r>`)
          : cellXml.replace(
              /<\/w:tc>$/,
              `<w:p><w:r>${valueRunProperties}<w:t xml:space="preserve">${escapedValue}</w:t></w:r></w:p></w:tc>`
            );

        return finalizeCell(withValueInserted);
      }

      let keptTextNodes = 0;
      const withExtraTextCleared = withColorStyle.replace(/(<w:t(?:\s[^>]*)?>)[\s\S]*?(<\/w:t>)/g, (textXml, open, close) => {
        if (keptTextNodes < valueLines.length) {
          keptTextNodes += 1;
          return textXml;
        }
        return `${open}${close}`;
      });

      return finalizeCell(withExtraTextCleared);
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

// The template already contains separate first-month and second-month amount
// columns. Keep both columns intact for the generated agreement.
const formatProbationRemunerationTable = (xml) => xml;

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
      `<w:t>•</w:t><w:tab/><w:t xml:space="preserve">${xmlEscape(englishLine)}</w:t>`,
      vietnameseLine ? `<w:br/><w:t xml:space="preserve">${xmlEscape(vietnameseLine)}</w:t>` : "",
    ].join("");
    bullets.push(
      '<w:p><w:pPr>'
      + '<w:tabs><w:tab w:val="left" w:pos="720"/></w:tabs>'
      + '<w:spacing w:before="0" w:after="120" w:line="240" w:lineRule="auto"/>'
      + '<w:ind w:left="720" w:hanging="360"/><w:jc w:val="left"/>'
      + `</w:pPr><w:r>${runs}</w:r></w:p>`
    );
  }

  const bulletParagraphs = bullets
    .join("");

  return `${titleParagraph}${bulletParagraphs}`;
};

const createWorkLocationParagraphs = (locations) => {
  const visibleLocations = locations.filter(Boolean);
  return visibleLocations
    .map((location, index) => (
      '<w:p>'
      + '<w:pPr>'
      + (index < visibleLocations.length - 1 ? '<w:keepNext/>' : '')
      + `<w:spacing w:before="${index === 0 ? 120 : 0}" w:after="${index === visibleLocations.length - 1 ? 240 : 120}" w:line="240" w:lineRule="auto"/>`
      + '<w:ind w:left="360" w:hanging="180"/><w:jc w:val="left"/>'
      + '<w:rPr><w:rFonts w:ascii="Times New Roman" w:cs="Times New Roman" w:eastAsia="Times New Roman" w:hAnsi="Times New Roman"/>'
      + '<w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr></w:pPr>'
      + '<w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:cs="Times New Roman" w:eastAsia="Times New Roman" w:hAnsi="Times New Roman"/>'
      + '<w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr>'
      + `<w:t xml:space="preserve">• ${xmlEscape(location)}</w:t></w:r></w:p>`
    ))
    .join("");
};

const keepParagraphWithNext = (paragraphXml) => {
  if (paragraphXml.includes("<w:keepNext")) return paragraphXml;
  return paragraphXml.replace("<w:pPr>", "<w:pPr><w:keepNext/>");
};

const createProbationPeriodParagraph = (paragraphXml, label, details, { italic = false } = {}) => {
  const paragraphStart = paragraphXml.match(/^<w:p(?:\s[^>]*)?>/)?.[0] || "<w:p>";
  const paragraphProperties = (paragraphXml.match(/<w:pPr>[\s\S]*?<\/w:pPr>/)?.[0] || "<w:pPr></w:pPr>")
    .replace(/<w:highlight\s[^>]*\/>/g, "");
  const fontProperties = '<w:rFonts w:ascii="Times New Roman" w:cs="Times New Roman" w:eastAsia="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/>';
  const italicProperties = italic ? "<w:i/><w:iCs/>" : "";

  return paragraphStart
    + paragraphProperties
    + `<w:r><w:rPr>${fontProperties}${italicProperties}<w:u w:val="single"/></w:rPr><w:t xml:space="preserve">${xmlEscape(label)}</w:t></w:r>`
    + `<w:r><w:rPr>${fontProperties}${italicProperties}</w:rPr><w:t xml:space="preserve"> ${xmlEscape(details)}</w:t></w:r>`
    + "</w:p>";
};

const replaceProbationDetailsSection = (xml, values, locations) => {
  let locationState = 0;
  let periodState = 0;
  const probationStartDate = formatDayMonthYear(values.probationStartDate);
  const probationEndDate = formatDayMonthYear(values.probationEndDate);
  const probationDateRange = [probationStartDate, probationEndDate].filter(Boolean).join(" - ");

  return xml.replace(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g, (paragraphXml) => {
    const text = getParagraphText(paragraphXml);

    if (text.includes("Location of Probation Period")) {
      locationState = 1;
      return paragraphXml;
    }

    if (locationState === 1 && !text) {
      locationState = 2;
      return createWorkLocationParagraphs(locations);
    }

    if (locationState === 2 && !text) {
      locationState = 0;
      return "";
    }

    if (text.includes("7.2") && text.includes("Probation Period")) {
      periodState = 1;
      return paragraphXml;
    }

    if (periodState === 1 && text.startsWith("Thời gian thử việc:")) {
      periodState = 2;
      return createProbationPeriodParagraph(
        paragraphXml,
        "Thời gian thử việc:",
        `${values.probationPeriod} tháng${probationDateRange ? ` (${probationDateRange})` : ""}`
      );
    }

    if (periodState === 2 && text.startsWith("Probation period:")) {
      periodState = 3;
      return createProbationPeriodParagraph(
        paragraphXml,
        "Probation period:",
        `${values.probationPeriod} months${probationDateRange ? ` (${probationDateRange})` : ""}`,
        { italic: true }
      );
    }

    if (periodState === 3 && !text) {
      periodState = 0;
      return "";
    }

    return paragraphXml;
  });
};

const formatProbationWorkingTimeSection = (xml, values) =>
  xml.replace(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g, (paragraphXml) => {
    const text = getParagraphText(paragraphXml);

    if (text.startsWith("7.3") && text.includes("Working Time During Probation")) {
      return paragraphXml.replace(
        /<w:spacing\s[^>]*\/>/,
        '<w:spacing w:before="160" w:after="80" w:line="240" w:lineRule="auto"/>'
      );
    }

    if (!text.startsWith("Thứ Hai đến Thứ Bảy/")) return paragraphXml;

    const paragraphStart = paragraphXml.match(/^<w:p(?:\s[^>]*)?>/)?.[0] || "<w:p>";
    const paragraphProperties = (paragraphXml.match(/<w:pPr>[\s\S]*?<\/w:pPr>/)?.[0] || "<w:pPr></w:pPr>")
      .replace(/<w:highlight\s[^>]*\/>/g, "")
      .replace(/<w:spacing\s[^>]*\/>/, '<w:spacing w:after="240" w:line="240" w:lineRule="auto"/>');
    const scheduleText = String(values.probationWorkingTime || "")
      .replace(/^([^,]+),\s*/, "$1: ");
    const fontProperties = '<w:rFonts w:ascii="Times New Roman" w:cs="Times New Roman" w:eastAsia="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/>';

    return paragraphStart
      + paragraphProperties
      + `<w:r><w:rPr>${fontProperties}</w:rPr><w:t xml:space="preserve">Thứ Hai đến Thứ Bảy/ </w:t></w:r>`
      + `<w:r><w:rPr>${fontProperties}<w:b/><w:bCs/><w:i/><w:iCs/></w:rPr><w:t xml:space="preserve">${xmlEscape(scheduleText)}</w:t></w:r>`
      + "</w:p>";
  });

const moveProbationRemunerationDescriptionBelowTable = (xml) => {
  const paragraphs = [...xml.matchAll(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g)];
  const heading = paragraphs.find((match) => {
    const text = getParagraphText(match[0]);
    return text.startsWith("7.4") && text.includes("Remuneration During Probation");
  });

  if (!heading) return xml;

  const descriptions = paragraphs.filter((match) => {
    if (match.index <= heading.index) return false;
    const text = getParagraphText(match[0]);
    return text.startsWith("Thời gian thử việc:") || text.startsWith("Probation period:");
  }).slice(0, 2);
  const table = [...xml.matchAll(/<w:tbl(?:\s[^>]*)?>[\s\S]*?<\/w:tbl>/g)]
    .find((match) => match.index > heading.index);

  if (descriptions.length !== 2 || !table) return xml;

  const movedDescriptions = descriptions.map((match, index) => {
    if (index !== 0) return match[0];
    return match[0].replace(
      /<w:spacing\s[^>]*\/>/,
      '<w:spacing w:before="160" w:after="0" w:line="240" w:lineRule="auto"/>'
    );
  }).join("");
  let reordered = xml;
  descriptions.forEach((match) => {
    reordered = reordered.replace(match[0], "");
  });

  return reordered.replace(table[0], `${table[0]}${movedDescriptions}`);
};

const formatOrdinal = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return String(value || "");
  const remainder100 = number % 100;
  const suffix = remainder100 >= 11 && remainder100 <= 13
    ? "th"
    : ({ 1: "st", 2: "nd", 3: "rd" }[number % 10] || "th");
  return `${number}${suffix}`;
};

const createStyledContractParagraph = (paragraphXml, runs) => {
  const paragraphStart = paragraphXml.match(/^<w:p(?:\s[^>]*)?>/)?.[0] || "<w:p>";
  const paragraphProperties = (paragraphXml.match(/<w:pPr>[\s\S]*?<\/w:pPr>/)?.[0] || "<w:pPr></w:pPr>")
    .replace(/<w:highlight\s[^>]*\/>/g, "")
    .replace('<w:jc w:val="both"/>', '<w:jc w:val="left"/>');
  const fontProperties = '<w:rFonts w:ascii="Times New Roman" w:cs="Times New Roman" w:eastAsia="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/>';
  const runXml = runs.map(({ text, italic = false }) => (
    `<w:r><w:rPr>${fontProperties}${italic ? "<w:i/><w:iCs/>" : ""}</w:rPr><w:t xml:space="preserve">${xmlEscape(text)}</w:t></w:r>`
  )).join("");
  return `${paragraphStart}${paragraphProperties}${runXml}</w:p>`;
};

const fillProbationRemunerationDetails = (xml, values) => {
  let inProbationRemuneration = false;
  const insuranceMonths = String(values.insuranceStartAfterMonths || "2");
  const vietnameseMonthWords = { 1: "một", 2: "hai", 3: "ba", 4: "bốn", 5: "năm", 6: "sáu" };
  const englishMonthWords = { 1: "one", 2: "two", 3: "three", 4: "four", 5: "five", 6: "six" };
  const vietnameseMonthWord = vietnameseMonthWords[insuranceMonths] || insuranceMonths;
  const englishMonthWord = englishMonthWords[insuranceMonths] || insuranceMonths;
  const formattedInsuranceMonths = insuranceMonths.padStart(2, "0");
  const paymentDayVietnamese = String(values.probationSalaryPaymentDay).padStart(2, "0");
  const leaveEndDayVietnamese = String(values.probationLeaveEndDay).padStart(2, "0");

  return xml.replace(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g, (paragraphXml) => {
    const text = getParagraphText(paragraphXml);

    if (text.startsWith("7.4") && text.includes("Remuneration During Probation")) {
      inProbationRemuneration = true;
      return paragraphXml;
    }
    if (!inProbationRemuneration) return paragraphXml;
    if (text.startsWith("7.5")) {
      inProbationRemuneration = false;
      return paragraphXml;
    }

    if (text.startsWith("Note: Công ty sẽ thực hiện đóng bảo hiểm")) {
      return createStyledContractParagraph(paragraphXml, [
        { text: `Note: Công ty sẽ thực hiện đóng bảo hiểm sau ${formattedInsuranceMonths} (${vietnameseMonthWord}) tháng thử việc/ ` },
        { text: `Social Insurance will commence after ${englishMonthWord} (${formattedInsuranceMonths}) months of probation.`, italic: true },
      ]);
    }
    if (text.startsWith("Kỳ tính lương được xác định")) {
      return createStyledContractParagraph(paragraphXml, [{
        text: `Kỳ tính lương được xác định từ ngày ${values.probationPayrollStartDay} của tháng trước đến ngày ${values.probationPayrollEndDay} của tháng hiện tại. Tiền lương sẽ được thanh toán vào ngày ${paymentDayVietnamese} hằng tháng.`,
      }]);
    }
    if (text.startsWith("The payroll period is from")) {
      return createStyledContractParagraph(paragraphXml, [{
        text: `The payroll period is from the ${formatOrdinal(values.probationPayrollStartDay)} of the previous month to the ${formatOrdinal(values.probationPayrollEndDay)} of the current month. Salary shall be paid on the ${formatOrdinal(values.probationSalaryPaymentDay)} of each month.`,
        italic: true,
      }]).replace(
        /<w:spacing\s[^>]*\/>/,
        '<w:spacing w:before="0" w:after="160" w:line="240" w:lineRule="auto"/>'
      );
    }
    if (text.startsWith("Trường hợp người lao động nghỉ phép")) {
      return createStyledContractParagraph(paragraphXml, [{
        text: `Trường hợp người lao động nghỉ phép trong khoảng thời gian từ ngày ${values.probationLeaveStartDay} đến ngày ${leaveEndDayVietnamese} hằng tháng, thời điểm thanh toán lương sẽ được điều chỉnh lùi lại tương ứng với số ngày nghỉ phép thực tế.`,
      }]);
    }
    if (text.startsWith("In case the employee takes leave")) {
      return createStyledContractParagraph(paragraphXml, [{
        text: `In case the employee takes leave from the ${formatOrdinal(values.probationLeaveStartDay)} to the ${formatOrdinal(values.probationLeaveEndDay)} of the month, the salary payment date shall be deferred corresponding to the actual number of leave days taken.`,
        italic: true,
      }]);
    }

    return paragraphXml;
  });
};

const fillProbationNoticeAndHandoverDetails = (xml, values) => {
  let inNoticeSection = false;
  const noticeDays = String(values.noticePeriodWorkingDays || "7");
  const noticeStartDay = String(values.noticeStartWorkingDay || "16");
  const numberWords = { 1: "one", 2: "two", 3: "three", 4: "four", 5: "five", 6: "six", 7: "seven" };
  const vietnameseNumberWords = { 1: "một", 2: "hai", 3: "ba", 4: "bốn", 5: "năm", 6: "sáu", 7: "bảy" };
  const noticeDaysPadded = noticeDays.padStart(2, "0");
  const noticeDaysEnglish = numberWords[noticeDays] || noticeDays;
  const noticeDaysVietnamese = vietnameseNumberWords[noticeDays] || noticeDays;
  const formatMonthlyNotice = (value, unit) => {
    const amount = String(value || "1").match(/\d+/)?.[0] || "1";
    const word = numberWords[amount] || amount;
    return `${word} (${amount.padStart(2, "0")}) ${unit}’ notice`;
  };
  const firstMonthNotice = formatMonthlyNotice(values.noticePeriodFirstMonth, "weeks");
  const secondMonthNotice = formatMonthlyNotice(values.noticePeriodSecondMonth, "months");
  const defaultHandover = "The handover process must be documented in writing and acknowledged by the Employer or an authorized representative.";
  const handoverText = !values.handoverCondition
    || values.handoverCondition === "Handover must be documented in writing and acknowledged."
    ? defaultHandover
    : values.handoverCondition;

  return xml.replace(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g, (paragraphXml) => {
    const text = getParagraphText(paragraphXml);
    if (text.startsWith("7.5") && text.includes("Notice Period and Handover")) {
      inNoticeSection = true;
      return paragraphXml;
    }
    if (!inNoticeSection) return paragraphXml;
    if (text.includes("Rights and Obligations of employees")) {
      inNoticeSection = false;
      return paragraphXml;
    }

    if (text.startsWith("Kể từ ngày làm việc thứ")) {
      return createStyledContractParagraph(paragraphXml, [{
        text: `Kể từ ngày làm việc thứ ${noticeStartDay} trở đi, trong trường hợp người lao động muốn nghỉ việc, người lao động có trách nhiệm thông báo trước cho công ty ít nhất ${noticeDaysPadded} (${noticeDaysVietnamese}) ngày làm việc.`,
      }]);
    }
    if (text.startsWith("From the") && text.includes("working day onward")) {
      return createStyledContractParagraph(paragraphXml, [{
        text: `From the ${formatOrdinal(noticeStartDay)} working day onward, in case the employee wishes to resign, the employee is required to give the company at least ${noticeDaysPadded} (${noticeDaysEnglish}) working days’ prior notice.`,
        italic: true,
      }]);
    }
    if (text.startsWith("If resigning during the first month:")) {
      return createStyledContractParagraph(paragraphXml, [{
        text: `If resigning during the first month: at least ${firstMonthNotice} is required.`,
        italic: true,
      }]);
    }
    if (text.startsWith("If resigning during the second month:")) {
      return createStyledContractParagraph(paragraphXml, [{
        text: `If resigning during the second month: at least ${secondMonthNotice} is required.`,
        italic: true,
      }]);
    }
    if (text.startsWith("Việc bàn giao phải được thực hiện bằng văn bản")) {
      return paragraphXml.replace(
        /<w:spacing\s[^>]*\/>/,
        '<w:spacing w:before="160" w:after="0" w:line="240" w:lineRule="auto"/>'
      );
    }
    if (text.startsWith("The handover process must") || text.startsWith("Handover must")) {
      return createStyledContractParagraph(paragraphXml, [{ text: handoverText, italic: true }]);
    }

    return paragraphXml;
  });
};

const replaceWorkLocationSection = (xml, locations) => {
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

    if (!inserted && /^Địa điểm làm việc\s*\/\s*Location of the workplace\s*$/.test(text)) {
      return keepParagraphWithNext(paragraphXml);
    }

    if (!inserted && /^Địa điểm làm việc\s*\/\s*Location of work:\s*$/.test(text)) {
      inserted = true;
      skipUntilStandardHours = true;
      return `${keepParagraphWithNext(paragraphXml)}${createWorkLocationParagraphs(locations)}`;
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
  let descriptionInserted = false;

  return xml.replace(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g, (paragraphXml) => {
    paragraphIndex += 1;
    const text = getParagraphText(paragraphXml);

    if (text.includes("Job Description")) {
      headingIndex = paragraphIndex;
      return paragraphXml;
    }

    if (headingIndex !== -1 && paragraphIndex === headingIndex + 1) {
      descriptionInserted = true;
      return createJobDescriptionParagraphs(values);
    }

    if (descriptionInserted && !text) {
      return "";
    }

    if (descriptionInserted) {
      descriptionInserted = false;
    }

    return paragraphXml;
  });
};

const leftAlignSalaryCalculationParagraph = (xml) =>
  xml.replace(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g, (paragraphXml) => {
    if (!getParagraphText(paragraphXml).startsWith("Salary Calculation Period:")) {
      return paragraphXml;
    }

    return paragraphXml.replace(
      '<w:jc w:val="both"/>',
      '<w:jc w:val="left"/>'
    );
  });

const leftAlignEmployeeTerminationNoticeParagraph = (xml) =>
  xml.replace(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g, (paragraphXml) => {
    if (!getParagraphText(paragraphXml).startsWith("Thời gian báo trước sẽ tuân theo")) {
      return paragraphXml;
    }

    return paragraphXml.replace(
      '<w:jc w:val="both"/>',
      '<w:jc w:val="left"/>'
    );
  });

const createSectionFifteenNoticeParagraph = (paragraphXml, text, { italic = false } = {}) => {
  const paragraphStart = paragraphXml.match(/^<w:p(?:\s[^>]*)?>/)?.[0] || "<w:p>";
  let paragraphProperties = paragraphXml.match(/<w:pPr>[\s\S]*?<\/w:pPr>/)?.[0] || "<w:pPr></w:pPr>";
  paragraphProperties = paragraphProperties
    .replace(/<w:jc\s[^>]*\/>/g, '<w:jc w:val="left"/>')
    .replace(/<w:highlight\s[^>]*\/>/g, "");
  if (!paragraphProperties.includes("<w:jc")) {
    paragraphProperties = paragraphProperties.replace("</w:pPr>", '<w:jc w:val="left"/></w:pPr>');
  }

  const fontProperties = '<w:rFonts w:ascii="Times New Roman" w:cs="Times New Roman" w:eastAsia="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/>';
  const italicProperties = italic ? "<w:i/><w:iCs/>" : "";

  return paragraphStart
    + paragraphProperties
    + `<w:r><w:rPr>${fontProperties}${italicProperties}</w:rPr><w:t xml:space="preserve">${xmlEscape(text)}</w:t></w:r>`
    + "</w:p>";
};

const fillSectionFifteenNoticeParagraphs = (xml, values) => {
  const noticeLines = String(values.noticePeriodCondition || "").split(/\r?\n/);
  const vietnameseNotice = noticeLines[0]
    || `Người lao động có trách nhiệm thông báo trước ít nhất ${values.noticePeriodDays} ngày bằng văn bản cho Công ty khi đơn phương chấm dứt hợp đồng lao động.`;
  const englishNotice = noticeLines.slice(1).join(" ").trim()
    || `The Employee shall provide at least ${values.noticePeriodDays} days' prior written notice to the Company before unilaterally terminating this Contract.`;

  return xml.replace(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g, (paragraphXml) => {
    const text = getParagraphText(paragraphXml);
    if (text.startsWith("Người lao động có trách nhiệm thông báo trước ít nhất")) {
      return createSectionFifteenNoticeParagraph(paragraphXml, vietnameseNotice);
    }
    if (text.startsWith("The Employee shall provide at least")) {
      return createSectionFifteenNoticeParagraph(paragraphXml, englishNotice, { italic: true });
    }
    return paragraphXml;
  });
};

const fillSectionSixteenSettlementParagraphs = (xml, values) => {
  const settlementLines = String(values.finalPaymentTimeline || "").split(/\r?\n/);
  const vietnameseSettlement = settlementLines[0]
    || "Sau khi tất cả hồ sơ được hoàn tất và ký đầy đủ, Công ty sẽ thanh toán toàn bộ các khoản còn lại trong vòng bảy (07) ngày làm việc kể từ ngày ký biên bản bàn giao.";
  const englishSettlement = settlementLines.slice(1).join(" ").trim()
    || "After all documents are fully completed and signed, the Company shall release all remaining payments within seven (07) working days from the date of signing the clearance documents.";

  return xml.replace(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g, (paragraphXml) => {
    const text = getParagraphText(paragraphXml);
    if (text.startsWith("Sau khi tất cả hồ sơ được hoàn tất và ký đầy đủ")) {
      return createSectionFifteenNoticeParagraph(paragraphXml, vietnameseSettlement);
    }
    if (text.startsWith("After all documents are fully completed and signed")) {
      return createSectionFifteenNoticeParagraph(paragraphXml, englishSettlement, { italic: true });
    }
    return paragraphXml;
  });
};

const leftAlignEmployeeBenefitPolicyParagraphs = (xml) =>
  xml.replace(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g, (paragraphXml) => {
    const text = getParagraphText(paragraphXml);
    if (!text.startsWith("Chính sách thưởng:") && !text.startsWith("Chế độ lương tháng 13:")) {
      return paragraphXml;
    }

    return paragraphXml.replace(
      '<w:jc w:val="both"/>',
      '<w:jc w:val="left"/>'
    );
  });

const leftAlignEmployerRightsParagraphs = (xml) =>
  xml.replace(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g, (paragraphXml) => {
    const text = getParagraphText(paragraphXml);
    const isEmployerRight = text.startsWith("- Điều hành, phân công")
      || text.startsWith("- Giám sát, đánh giá")
      || text.startsWith("- Quyết định mức lương");
    if (!isEmployerRight) return paragraphXml;

    return paragraphXml.replace(
      '<w:jc w:val="both"/>',
      '<w:jc w:val="left"/>'
    );
  });

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
  const probationWorkingDays = String(formData.probationWorkingTime || formData.workingDays || "Monday to Saturday")
    .replace(/,\s*\d{1,2}:\d{2}[\s\S]*$/, "")
    .trim();
  const probationStartTime = formData.probationStartTime || "08:00";
  const probationEndTime = formData.probationEndTime || "17:00";
  const firstMonthRatio = Math.max(0, Number(formData.probationFirstMonthSalary) || 0) / 100;
  const secondMonthRatio = Math.max(0, Number(formData.probationSecondMonthSalary) || 0) / 100;
  const scaleProbationAmount = (amount, ratio) => formatAmountIncludingZero((Number(amount) || 0) * ratio);
  const probationGrossAmount =
    (Number(formData.baseSalary) || 0) +
    (Number(formData.mealAllowance) || 0) +
    (formData.probationTransportNotApplicable ? 0 : (Number(formData.transportAllowance) || 0)) +
    (formData.probationUniformProvided ? 0 : (Number(formData.clothesAllowance) || 0)) +
    (formData.probationPrNotApplicable ? 0 : (Number(formData.prAllowance) || 0)) +
    (Number(formData.medicalAllowance) || 0) +
    (formData.probationReliabilityNotApplicable ? 0 : (Number(formData.reliabilityAllowance) || 0)) +
    (Number(formData.kpiAllowance) || 0) +
    (Number(formData.telephoneAllowance) || 0) +
    (Number(formData.responsibilityAllowance) || 0) +
    (Number(formData.flexibleWorkingHoursAllowance) || 0);
  const probationNetAmount = probationGrossAmount -
    (Number(formData.totalInsurance) || 0) -
    (Number(formData.personalIncomeTaxAmount) || 0);
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
    mealAllowance: formatMoney(formData.mealAllowance),
    transportAllowance: formatMoney(formData.transportAllowance),
    uniformAllowance: formatMoney(formData.clothesAllowance),
    prAllowance: formatMoney(formData.prAllowance),
    medicalAllowance: formatMoney(formData.medicalAllowance),
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
    pitNote: formData.pitNote || "Phụ thuộc vào thu nhập theo quy định của Luật Thuế Việt Nam / Depending on income in compliance with Vietnamese Tax Law.",
    personalIncomeTaxAmount: formatMoney(formData.personalIncomeTaxAmount),
    netSalary: formatMoney(formData.netSalary),
    probationFirstMonthBaseSalary: scaleProbationAmount(formData.baseSalary, firstMonthRatio),
    probationSecondMonthBaseSalary: scaleProbationAmount(formData.baseSalary, secondMonthRatio),
    probationFirstMonthMealAllowance: scaleProbationAmount(formData.mealAllowance, firstMonthRatio),
    probationSecondMonthMealAllowance: scaleProbationAmount(formData.mealAllowance, secondMonthRatio),
    probationFirstMonthTransportAllowance: formData.probationTransportNotApplicable ? "Không áp dụng / N/A" : scaleProbationAmount(formData.transportAllowance, firstMonthRatio),
    probationSecondMonthTransportAllowance: formData.probationTransportNotApplicable ? "Không áp dụng / N/A" : scaleProbationAmount(formData.transportAllowance, secondMonthRatio),
    probationFirstMonthUniformAllowance: formData.probationUniformProvided ? "Công ty cung cấp / Provided by company" : scaleProbationAmount(formData.clothesAllowance, firstMonthRatio),
    probationSecondMonthUniformAllowance: formData.probationUniformProvided ? "Công ty cung cấp / Provided by company" : scaleProbationAmount(formData.clothesAllowance, secondMonthRatio),
    probationFirstMonthPrAllowance: formData.probationPrNotApplicable ? "Không áp dụng / N/A" : scaleProbationAmount(formData.prAllowance, firstMonthRatio),
    probationSecondMonthPrAllowance: formData.probationPrNotApplicable ? "Không áp dụng / N/A" : scaleProbationAmount(formData.prAllowance, secondMonthRatio),
    probationFirstMonthMedicalAllowance: scaleProbationAmount(formData.medicalAllowance, firstMonthRatio),
    probationSecondMonthMedicalAllowance: scaleProbationAmount(formData.medicalAllowance, secondMonthRatio),
    probationFirstMonthReliabilityAllowance: formData.probationReliabilityNotApplicable ? "Không áp dụng / N/A" : scaleProbationAmount(formData.reliabilityAllowance, firstMonthRatio),
    probationSecondMonthReliabilityAllowance: formData.probationReliabilityNotApplicable ? "Không áp dụng / N/A" : scaleProbationAmount(formData.reliabilityAllowance, secondMonthRatio),
    probationFirstMonthKpiAllowance: scaleProbationAmount(formData.kpiAllowance, firstMonthRatio),
    probationSecondMonthKpiAllowance: scaleProbationAmount(formData.kpiAllowance, secondMonthRatio),
    probationFirstMonthGrossSalary: scaleProbationAmount(probationGrossAmount, firstMonthRatio),
    probationSecondMonthGrossSalary: scaleProbationAmount(probationGrossAmount, secondMonthRatio),
    probationFirstMonthSocialInsuranceAmount: scaleProbationAmount(formData.socialInsuranceAmount, firstMonthRatio),
    probationSecondMonthSocialInsuranceAmount: scaleProbationAmount(formData.socialInsuranceAmount, secondMonthRatio),
    probationFirstMonthHealthInsuranceAmount: scaleProbationAmount(formData.healthInsuranceAmount, firstMonthRatio),
    probationSecondMonthHealthInsuranceAmount: scaleProbationAmount(formData.healthInsuranceAmount, secondMonthRatio),
    probationFirstMonthUnemploymentInsuranceAmount: scaleProbationAmount(formData.unemploymentInsuranceAmount, firstMonthRatio),
    probationSecondMonthUnemploymentInsuranceAmount: scaleProbationAmount(formData.unemploymentInsuranceAmount, secondMonthRatio),
    probationFirstMonthTotalInsurance: scaleProbationAmount(formData.totalInsurance, firstMonthRatio),
    probationSecondMonthTotalInsurance: scaleProbationAmount(formData.totalInsurance, secondMonthRatio),
    probationFirstMonthPersonalIncomeTaxAmount: scaleProbationAmount(formData.personalIncomeTaxAmount, firstMonthRatio),
    probationSecondMonthPersonalIncomeTaxAmount: scaleProbationAmount(formData.personalIncomeTaxAmount, secondMonthRatio),
    probationFirstMonthNetSalary: scaleProbationAmount(probationNetAmount, firstMonthRatio),
    probationSecondMonthNetSalary: scaleProbationAmount(probationNetAmount, secondMonthRatio),
    payrollPeriod: formData.payrollPeriod,
    paymentDate: formData.paymentDate,
    probationFirstMonthSalary: formatValue(formData.probationFirstMonthSalary),
    probationSecondMonthSalary: formatValue(formData.probationSecondMonthSalary),
    probationStartDate: formData.probationStartDate,
    probationEndDate: formData.probationEndDate,
    insuranceStartAfterMonths: formatValue(formData.insuranceStartAfterMonths || formData.probationPeriod || 2),
    probationPayrollStartDay: formatValue(formData.probationPayrollStartDay || 26),
    probationPayrollEndDay: formatValue(formData.probationPayrollEndDay || 25),
    probationSalaryPaymentDay: formatValue(formData.probationSalaryPaymentDay || 5),
    probationLeaveStartDay: formatValue(formData.probationLeaveStartDay || 26),
    probationLeaveEndDay: formatValue(formData.probationLeaveEndDay || 4),
    probationWorkingTime: `${probationWorkingDays}, ${probationStartTime} – ${probationEndTime}`,
    noticePeriodWorkingDays: formatValue(formData.noticePeriodWorkingDays || 7),
    noticeStartWorkingDay: formatValue(formData.noticeStartWorkingDay || 16),
    noticePeriodFirstMonth: formData.noticePeriodFirstMonth,
    noticePeriodSecondMonth: formData.noticePeriodSecondMonth,
    noticePeriodDays: formatValue(formData.noticePeriodDays ?? 30),
    noticePeriodCondition: formData.noticePeriodCondition,
    finalPaymentTimeline: formData.finalPaymentTimeline,
    handoverCondition: formData.handoverCondition,
    jobTitle: formData.jobTitle,
    jobDescriptionHeading: formData.jobDescriptionHeading,
    employerSignatureName: formData.employerSignatureName || formData.repName,
    employeeSignatureName: formData.employeeSignatureName || formData.fullName,
  };

  let merged = formatProbationRemunerationTable(xml);

  [
    [0, 1, values.companyName],
    [1, 1, values.repName],
    [2, 1, values.repDesignation],
    [3, 1, values.repPhone],
    [4, 1, values.companyTaxCode],
    [5, 1, values.companyAddress],
    [6, 1, values.fullName, { bold: true, matchEmployerFormat: true }],
    [7, 1, values.gender, { matchEmployerFormat: true }],
    [8, 1, values.dob, { matchEmployerFormat: true }],
    [9, 1, values.idNumber, { matchEmployerFormat: true }],
    [10, 1, values.address, { matchEmployerFormat: true }],
    [11, 1, values.phoneNumber, { matchEmployerFormat: true }],
    [12, 1, values.email, { matchEmployerFormat: true }],
    [14, 0, "1"],
    [14, 1, "Lương cơ bản / Base Salary"],
    [14, 2, values.baseSalary],
    [15, 0, "2"],
    [15, 1, "Phụ cấp Ăn uống / Meal Allowance"],
    [15, 2, values.mealAllowance],
    [16, 0, "3"],
    [16, 1, "Phụ cấp Di chuyển / Transportation Allowance"],
    [16, 2, values.transportAllowance],
    [17, 0, "4"],
    [17, 1, "Phụ cấp Đồng phục / Uniform Allowance"],
    [17, 2, values.uniformAllowance],
    [18, 0, "5"],
    [18, 1, "Phụ cấp PR / PR Allowance"],
    [18, 2, values.prAllowance],
    [19, 0, "6"],
    [19, 1, "Phụ cấp Y tế / Medical Allowance"],
    [19, 2, values.medicalAllowance],
    [20, 0, "7"],
    [20, 1, "Phụ cấp Chuyên cần / Reliability"],
    [20, 2, values.reliabilityAllowance],
    [21, 0, "8"],
    [21, 1, "Trách nhiệm, Kết quả đánh giá công việc / Responsibility monthly KPI"],
    [21, 2, values.kpiAllowance],
    [22, 0, "9"],
    [22, 1, "Gross Salary", { bold: true }],
    [22, 2, values.grossSalary, { bold: true }],
    [23, 0, "10"],
    [23, 1, `BHXH / Social Insurance (${values.socialInsurancePct}%)`],
    [23, 2, values.socialInsuranceAmount],
    [24, 0, "11"],
    [24, 1, `BHYT / Health Insurance (${values.healthInsurancePct}%)`],
    [24, 2, values.healthInsuranceAmount],
    [25, 0, "12"],
    [25, 1, `BHTN / Unemployment Insurance (${values.unemploymentInsurancePct}%)`],
    [25, 2, values.unemploymentInsuranceAmount],
    [26, 0, "13"],
    [26, 1, "Tổng bảo hiểm / Total Insurance", { bold: true }],
    [26, 2, values.totalInsurance, { bold: true }],
    [27, 0, "14"],
    [27, 1, "Thuế TNCN / Personal Income Tax (PIT)"],
    [27, 2, values.pitNote],
    [28, 0, "15"],
    [28, 1, "Lương thực nhận / Net Salary", { bold: true }],
    [28, 2, values.netSalary, { bold: true, color: "000000" }],
    [29, 2, `Số tiền / Amount (VND)\n1st Month (${values.probationFirstMonthSalary}%)`, { bold: true, align: "center" }],
    [29, 3, `Số tiền / Amount (VND)\n2nd Month (${values.probationSecondMonthSalary}%)`, { bold: true, align: "center" }],
    [30, 1, "Lương cơ bản / Base Salary"],
    [30, 2, values.probationFirstMonthBaseSalary],
    [30, 3, values.probationSecondMonthBaseSalary],
    [31, 1, "Phụ cấp Ăn uống / Meal Allowance"],
    [31, 2, values.probationFirstMonthMealAllowance],
    [31, 3, values.probationSecondMonthMealAllowance],
    [32, 1, "Phụ cấp Di chuyển / Transportation Allowance"],
    [32, 2, values.probationFirstMonthTransportAllowance],
    [32, 3, values.probationSecondMonthTransportAllowance],
    [33, 1, "Phụ cấp Đồng phục / Uniform Allowance"],
    [33, 2, values.probationFirstMonthUniformAllowance],
    [33, 3, values.probationSecondMonthUniformAllowance],
    [34, 1, "Phụ cấp PR / PR Allowance"],
    [34, 2, values.probationFirstMonthPrAllowance],
    [34, 3, values.probationSecondMonthPrAllowance],
    [35, 1, "Phụ cấp Y tế / Medical Allowance"],
    [35, 2, values.probationFirstMonthMedicalAllowance],
    [35, 3, values.probationSecondMonthMedicalAllowance],
    [36, 1, "Phụ cấp Chuyên cần / Reliability"],
    [36, 2, values.probationFirstMonthReliabilityAllowance],
    [36, 3, values.probationSecondMonthReliabilityAllowance],
    [37, 1, "Trách nhiệm , Kết quả đánh giá công việc / Responsibility monthly KPI"],
    [37, 2, values.probationFirstMonthKpiAllowance],
    [37, 3, values.probationSecondMonthKpiAllowance],
    [38, 1, "Gross Salary", { bold: true }],
    [38, 2, values.probationFirstMonthGrossSalary, { bold: true }],
    [38, 3, values.probationSecondMonthGrossSalary, { bold: true }],
    [39, 1, `BHXH / Social Insurance (${values.socialInsurancePct}%)`],
    [39, 2, values.probationFirstMonthSocialInsuranceAmount],
    [39, 3, values.probationSecondMonthSocialInsuranceAmount],
    [40, 1, `BHYT / Health Insurance (${values.healthInsurancePct}%)`],
    [40, 2, values.probationFirstMonthHealthInsuranceAmount],
    [40, 3, values.probationSecondMonthHealthInsuranceAmount],
    [41, 1, `BHTN / Unemployment Insurance (${values.unemploymentInsurancePct}%)`],
    [41, 2, values.probationFirstMonthUnemploymentInsuranceAmount],
    [41, 3, values.probationSecondMonthUnemploymentInsuranceAmount],
    [42, 1, "Tổng bảo hiểm / Total Insurance", { bold: true }],
    [42, 2, values.probationFirstMonthTotalInsurance, { bold: true }],
    [42, 3, values.probationSecondMonthTotalInsurance, { bold: true }],
    [43, 1, "Thuế TNCN / Personal Income Tax (PIT)"],
    [43, 2, values.probationFirstMonthPersonalIncomeTaxAmount],
    [43, 3, values.probationSecondMonthPersonalIncomeTaxAmount],
    [44, 1, "Lương thực nhận / Net Salary", { bold: true }],
    [44, 2, values.probationFirstMonthNetSalary, { bold: true, color: "000000", align: "right" }],
    [44, 3, values.probationSecondMonthNetSalary, { bold: true, color: "000000", align: "right" }],
  ].forEach(([rowIndex, cellIndex, value, options]) => {
    merged = replaceCellValueByRow(merged, rowIndex, cellIndex, value, options);
  });
  // All 15 rows mapped, no empty rows to remove

  merged = replaceText(merged, /Nha Trang, ngày  tháng  năm/, `Nha Trang, ngày ${dateParts.day} tháng ${dateParts.month} năm ${dateParts.year}`);
  merged = replaceText(merged, /Nha Trang, date  month year/, `Nha Trang, date ${dateParts.day} month ${dateParts.month} year ${dateParts.year}`);
  merged = replaceWorkLocationSection(merged, workLocations);
  merged = replaceProbationDetailsSection(merged, values, workLocations);
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
    /Thời gian thử việc:\s*tháng, tháng đầu tiên\s*lương, tháng thứ 2\s*lương/,
    `Thời gian thử việc: ${values.probationPeriod} tháng, tháng đầu tiên ${values.probationFirstMonthSalary}% lương, tháng thứ 2 ${values.probationSecondMonthSalary}% lương`
  );
  merged = formatProbationWorkingTimeSection(merged, values);
  merged = moveProbationRemunerationDescriptionBelowTable(merged);
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
  merged = replaceText(merged, /Trong vòng\s+ngày \(làm việc\)/, `Trong vòng ${values.noticePeriodWorkingDays} ngày (làm việc)`);
  merged = replaceText(merged, /at least\s+\(seven\)\s+working days/, `at least ${values.noticePeriodWorkingDays} working days`);
  merged = replaceText(merged, /Kể từ ngày làm việc thứ\s+trở đi/, `Kể từ ngày làm việc thứ ${values.noticePeriodWorkingDays} trở đi`);
  merged = replaceText(merged, /From the\s+working day onward/, `From the ${values.noticePeriodWorkingDays} working day onward`);
  merged = replaceText(merged, /ít nhất\s+\(bảy\) ngày làm việc/, `ít nhất ${values.noticePeriodWorkingDays} (bảy) ngày làm việc`);
  merged = replaceText(merged, /If resigning during the first month: at least\s+is required\./, `If resigning during the first month: at least ${values.noticePeriodFirstMonth} is required.`);
  merged = replaceText(merged, /If resigning during the second month: at least\s+is required\./, `If resigning during the second month: at least ${values.noticePeriodSecondMonth} is required.`);
  merged = replaceText(
    merged,
    /The handover process must be documented in writing and acknowledged by the\s+Employer or an authorized representative\./,
    values.handoverCondition || "The handover process must be documented in writing and acknowledged by the Employer or an authorized representative."
  );
  merged = leftAlignSalaryCalculationParagraph(merged);
  merged = fillProbationRemunerationDetails(merged, values);
  merged = fillProbationNoticeAndHandoverDetails(merged, values);
  merged = leftAlignEmployeeBenefitPolicyParagraphs(merged);
  merged = leftAlignEmployerRightsParagraphs(merged);
  merged = leftAlignEmployeeTerminationNoticeParagraph(merged);
  merged = fillSectionFifteenNoticeParagraphs(merged, values);
  merged = fillSectionSixteenSettlementParagraphs(merged, values);
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

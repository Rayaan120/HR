const CONVERTAPI_URL = "https://v2.convertapi.com/convert/docx/to/pdf";

const readRequestBody = (request) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    request.on("data", (chunk) => chunks.push(chunk));
    request.on("end", () => resolve(Buffer.concat(chunks)));
    request.on("error", reject);
  });

const sanitizeFilename = (value) => {
  const filename = String(value || "Employment_Contract.pdf")
    .replace(/[/\\]/g, "_")
    .replace(/"/g, "")
    .trim();

  return filename.toLowerCase().endsWith(".pdf") ? filename : `${filename}.pdf`;
};

const getPdfBytesFromConvertApiResponse = async (response) => {
  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) {
    return Buffer.from(await response.arrayBuffer());
  }

  const payload = await response.json();
  const file = payload.Files?.[0];

  if (file?.FileData) {
    return Buffer.from(file.FileData, "base64");
  }

  if (file?.Url) {
    const downloadResponse = await fetch(file.Url);

    if (!downloadResponse.ok) {
      throw new Error(`ConvertAPI created the PDF but download failed (${downloadResponse.status}).`);
    }

    return Buffer.from(await downloadResponse.arrayBuffer());
  }

  throw new Error("ConvertAPI did not return a PDF file.");
};

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.status(405).send("Method not allowed.");
    return;
  }

  const token = process.env.CONVERTAPI_TOKEN || process.env.CONVERTAPI_SECRET;

  if (!token) {
    response.status(500).send("Missing CONVERTAPI_TOKEN environment variable.");
    return;
  }

  try {
    const docxBytes = await readRequestBody(request);

    if (!docxBytes.length) {
      response.status(400).send("No Word document was received.");
      return;
    }

    const formData = new FormData();
    formData.append(
      "File",
      new Blob([docxBytes], {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      }),
      "contract.docx"
    );
    formData.append("StoreFile", "false");

    const convertResponse = await fetch(CONVERTAPI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!convertResponse.ok) {
      const details = await convertResponse.text();
      response
        .status(convertResponse.status)
        .send(details || `ConvertAPI conversion failed (${convertResponse.status}).`);
      return;
    }

    const pdfBytes = await getPdfBytesFromConvertApiResponse(convertResponse);
    const filename = sanitizeFilename(request.query?.filename);

    response.setHeader("Content-Type", "application/pdf");
    response.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    response.status(200).send(pdfBytes);
  } catch (error) {
    response.status(500).send(`Could not convert Word document to PDF. Details: ${error.message}`);
  }
}

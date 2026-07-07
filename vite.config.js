import { execFile } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const execFileAsync = promisify(execFile)

const readRequestBody = (request) =>
  new Promise((resolve, reject) => {
    const chunks = []
    request.on('data', (chunk) => chunks.push(chunk))
    request.on('end', () => resolve(Buffer.concat(chunks)))
    request.on('error', reject)
  })

const convertDocxToPdfWithWord = async (docxPath, pdfPath) => {
  const scriptPath = join(process.cwd(), 'scripts', 'convert-docx-to-pdf.ps1')

  await execFileAsync(
    'powershell.exe',
    [
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      scriptPath,
      '-DocxPath',
      docxPath,
      '-PdfPath',
      pdfPath,
    ],
    { windowsHide: true, timeout: 120000 }
  )
}

const contractPdfConverterPlugin = () => ({
  name: 'contract-pdf-converter',
  configureServer(server) {
    server.middlewares.use('/api/convert-docx-to-pdf', async (request, response) => {
      if (request.method !== 'POST') {
        response.statusCode = 405
        response.end('Method not allowed.')
        return
      }

      const workDir = join(tmpdir(), `hrr2-contract-${randomUUID()}`)
      const docxPath = join(workDir, 'contract.docx')
      const pdfPath = join(workDir, 'contract.pdf')

      try {
        const body = await readRequestBody(request)

        if (!body.length) {
          response.statusCode = 400
          response.end('No Word document was received.')
          return
        }

        await mkdir(workDir, { recursive: true })
        await writeFile(docxPath, body)
        await convertDocxToPdfWithWord(docxPath, pdfPath)

        if (!existsSync(pdfPath)) {
          throw new Error('Microsoft Word did not create a PDF file.')
        }

        const pdfBytes = await readFile(pdfPath)
        const url = new URL(request.url, 'http://localhost')
        const filename = url.searchParams.get('filename') || 'Employment_Contract.pdf'

        response.statusCode = 200
        response.setHeader('Content-Type', 'application/pdf')
        response.setHeader('Content-Disposition', `attachment; filename="${filename.replace(/"/g, '')}"`)
        response.end(pdfBytes)
      } catch (error) {
        response.statusCode = 500
        response.end(
          `Could not convert the Word template to PDF. Microsoft Word must be installed on this Windows machine for exact DOCX-to-PDF export. Details: ${error.message}`
        )
      } finally {
        await rm(workDir, { recursive: true, force: true })
      }
    })
  },
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), contractPdfConverterPlugin()],
  server: {
    port: 5174,
    strictPort: true,
  },
})

param(
  [Parameter(Mandatory = $true)]
  [string]$DocxPath,

  [Parameter(Mandatory = $true)]
  [string]$PdfPath
)

$ErrorActionPreference = "Stop"
$word = $null
$document = $null

try {
  $resolvedDocxPath = (Resolve-Path -LiteralPath $DocxPath).Path
  $word = New-Object -ComObject Word.Application
  $word.Visible = $false
  $word.DisplayAlerts = 0
  $document = $word.Documents.Open($resolvedDocxPath)
  $document.ExportAsFixedFormat($PdfPath, 17)
}
finally {
  if ($document -ne $null) {
    $document.Close($false) | Out-Null
  }

  if ($word -ne $null) {
    $word.Quit() | Out-Null
  }
}

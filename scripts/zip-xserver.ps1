$ErrorActionPreference = 'Stop'
$releaseRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$updateSource = Join-Path $releaseRoot 'dist\update'
$updateArchive = Join-Path $releaseRoot 'dist\update.zip'
if (-not (Test-Path -LiteralPath (Join-Path $updateSource 'index.html'))) {
    throw 'Run pnpm build before creating the update ZIP.'
}
if (Test-Path -LiteralPath (Join-Path $updateSource 'uploads')) {
    throw 'Update output must not contain uploads.'
}
Add-Type -AssemblyName System.IO.Compression.FileSystem
Add-Type -AssemblyName System.IO.Compression
if (Test-Path -LiteralPath $updateArchive) {
    Remove-Item -LiteralPath $updateArchive
}
# Include .htaccess and use ZIP-standard slashes even on Windows PowerShell 5.
$updatePrefix = [IO.Path]::GetFullPath($updateSource).TrimEnd('\') + '\'
$archiveWriter = [IO.Compression.ZipFile]::Open($updateArchive, [IO.Compression.ZipArchiveMode]::Create)
try {
    Get-ChildItem -LiteralPath $updateSource -File -Recurse -Force | ForEach-Object {
        $entryPath = $_.FullName.Substring($updatePrefix.Length).Replace('\', '/')
        [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archiveWriter, $_.FullName, $entryPath) | Out-Null
    }
} finally {
    $archiveWriter.Dispose()
}
Write-Output 'Created dist/update.zip (application files only).'

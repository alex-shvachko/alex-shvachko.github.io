$ErrorActionPreference = 'Stop'

$port = 4174
$url = "http://127.0.0.1:$port/"

if (-not (Test-Path -LiteralPath (Join-Path $PSScriptRoot 'index.html'))) {
    throw "Could not find index.html in $PSScriptRoot"
}

function Test-PreviewServer {
    try {
        $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 1
        return $response.StatusCode -eq 200
    }
    catch {
        return $false
    }
}

if (-not (Test-PreviewServer)) {
    $node = Get-Command node.exe -ErrorAction SilentlyContinue
    if (-not $node) { throw 'Node.js is required for the local video preview.' }
    $executable = $node.Source
    $arguments = "`"$(Join-Path $PSScriptRoot 'tools/preview-server.mjs')`" $port"

    Start-Process -FilePath $executable -ArgumentList $arguments -WindowStyle Hidden | Out-Null

    $ready = $false
    for ($attempt = 0; $attempt -lt 40; $attempt++) {
        Start-Sleep -Milliseconds 250
        if (Test-PreviewServer) {
            $ready = $true
            break
        }
    }

    if (-not $ready) {
        throw "The preview server did not start at $url. Check that port $port is available."
    }
}

Start-Process -FilePath $url
Write-Host "Website preview opened at $url"

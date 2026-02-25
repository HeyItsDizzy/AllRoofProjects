# ======================================================
#  🔒 Lock Live Backend (remove editable backend, show mirror)
# ======================================================

$workspacePath = "C:\Coding\AllRoofsWebApps\ProjectManagerApp\ProjectManagerAppAllRemote.code-workspace"

Write-Host "`n🔒  Locking Live Backend (mirror-only mode)..." -ForegroundColor Red

if (Test-Path $workspacePath) {
    $json = Get-Content $workspacePath -Raw -Encoding UTF8 | ConvertFrom-Json

    # Remove editable backend
    $json.folders = $json.folders | Where-Object {
        $_.uri -notmatch "/root/ART/ProjectManagerApp/Backend$"
    }

    # Ensure read-only backend exists
    $hasMirror = $json.folders | Where-Object { $_.uri -match "/mnt/readonly-backend" }
    if (-not $hasMirror) {
        $json.folders += [ordered]@{
            name =  "🧱 Read-only Backend (Mirror Mount)"
            uri = "vscode-remote://ssh-remote+myvps/mnt/readonly-backend"
        }
    }

    # Save workspace
    $json | ConvertTo-Json -Depth 10 | Set-Content -Encoding UTF8 $workspacePath
    Write-Host "✅  Workspace now locked — only read-only backend available." -ForegroundColor Green

    # Reload VS Code automatically
#    $codePath = "C:\Program Files\Microsoft VS Code\bin\code.cmd"
#    if (Test-Path $codePath) {
#        Start-Process -FilePath $codePath -ArgumentList "--reuse-window","$workspacePath"
#        Write-Host "🔁  VS Code workspace reloaded automatically." -ForegroundColor Yellow
#    } else {
#        Write-Host "⚠️  VS Code not found in default path; please reload manually." -ForegroundColor Yellow
#    }
} else {
    Write-Host "⚠️  Workspace file not found: $workspacePath" -ForegroundColor Red
}

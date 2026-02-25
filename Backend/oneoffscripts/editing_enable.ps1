# ======================================================
#  ✏️ Unlock Live Backend (restore editable backend, hide mirror)
# ======================================================

$workspacePath = "C:\Coding\AllRoofsWebApps\ProjectManagerApp\ProjectManagerAppAllRemote.code-workspace"

Write-Host "`n✏️  Unlocking Live Backend (editable mode)..." -ForegroundColor Green

if (Test-Path $workspacePath) {
    $json = Get-Content $workspacePath -Raw -Encoding UTF8 | ConvertFrom-Json

    # Add editable backend if missing
    $hasEditable = $json.folders | Where-Object { $_.uri -match "/root/ART/ProjectManagerApp/Backend$" }
    if (-not $hasEditable) {
        $json.folders += [ordered]@{
            name = "🛠️ Live Backend (Editable)"
            uri = "vscode-remote://ssh-remote+myvps/root/ART/ProjectManagerApp/Backend"
        }
    }

    # Remove read-only backend
    $json.folders = $json.folders | Where-Object {
        $_.uri -notmatch "/mnt/readonly-backend"
    }

    # Save workspace
    $json | ConvertTo-Json -Depth 10 | Set-Content -Encoding UTF8 $workspacePath
    Write-Host "✅  Workspace unlocked — editable backend restored." -ForegroundColor Green

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

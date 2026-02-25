#!/bin/bash

# Batch restoration script for 2025-09-03 files
# Run this from the Frontend directory

echo "🔄 Restoring files from 2025-09-03..."

# Files to restore (mapping recovered file codes to actual paths)
declare -A FILES_TO_RESTORE=(
    # Already done:
    # ["yRDi.jsx"]="src/components/ModalWrapperSimple.jsx"     # ✅ Done 
    # ["EjzA.md"]="src/features/emails/README.md"             # ✅ Done
    # ["zlbA.js"]="src/features/emails/index.js"              # ✅ Done
    
    # Need to restore:
    ["SFeO.jsx"]="src/appjobboard/components/JobTable.REFERENCE.jsx"
    ["Taxk.jsx"]="src/appjobboard/components/JobTable.jsx"
    ["Z16d.jsx"]="src/shared/IconSet.jsx" 
    ["r9lx.jsx"]="src/shared/TestAvatarComponent.jsx"
    ["Q0eE.jsx"]="src/features/emails/modals/jobboard/EstimateCompleteModal.jsx"
    ["9xJ9.jsx"]="src/features/emails/templates/jobboard/EstimateComplete.js"
    ["r1gb.jsx"]="src/components/GreenSwitch.jsx"
    ["6GiO.jsx"]="src/features/fileManager/components/FileManagerCard.jsx"
    ["faEo.jsx"]="src/components/EmailMetricsCard.jsx"
    ["m6TJ.js"]="src/features/emails/templates/jobboard/JobDelayed.js"
    ["3mhl.js"]="src/features/emails/templates/jobboard/SendEstimate.js"
    ["4qL6.js"]="src/features/emails/modals/jobboard/JobDelayedModal.js"
    ["DXcf.js"]="src/features/emails/modals/jobboard/SendEstimateModal.js"
    ["u3Nz.js"]="src/shared/formatters.js"
    ["THH9.js"]="src/shared/planTypes.js"
    ["MZmq.js"]="src/shared/useMonthlyProjects.js"
    ["Uyyb.js"]="src/shared/useLiveData.js"
    ["qlaD.js"]="src/shared/DateRangePicker.js"
    ["uITx.js"]="src/shared/CustomSelect.js"
)

# Base paths
RECOVERED_BASE="c:/Coding/AllRoofsWebApps/recovered-files/Frontend"
CURRENT_BASE="c:/Coding/AllRoofsWebApps/ProjectManagerApp/Frontend"

# Restore each file
for code in "${!FILES_TO_RESTORE[@]}"; do
    target_path="${FILES_TO_RESTORE[$code]}"
    
    # Build source path based on target path
    source_dir="${RECOVERED_BASE}/${target_path%/*}"
    source_file="${source_dir}/${code}"
    target_file="${CURRENT_BASE}/${target_path}"
    
    echo "📁 Restoring: ${target_path}"
    
    # Create target directory if it doesn't exist
    mkdir -p "$(dirname "$target_file")"
    
    # Copy if source exists
    if [ -f "$source_file" ]; then
        cp "$source_file" "$target_file"
        echo "   ✅ Restored from $code"
    else
        echo "   ❌ Source file not found: $source_file"
    fi
done

echo "🎉 Restoration complete!"

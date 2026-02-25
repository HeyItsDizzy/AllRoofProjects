// updateMetaAllowedRoles.js
// Updates all existing .meta.json files to include Scope folder and correct permissions
// Iterates through file system to find all project folders
const fs = require("fs");
const path = require("path");

// Target allowedRoles structure
const UPDATED_ALLOWED_ROLES = {
  "BOQ": ["Admin", "User"],
  "Admin": ["Admin"],
  "Estimator": ["Admin","Estimator"],
  "Scope": ["Admin", "User", "Estimator"]
};

const UPDATED_STRUCTURE = [
  "BOQ",
  "Admin", 
  "Estimator",
  "Scope"
];

// Base path where all projects are stored
const BASE_PROJECT_PATH = "Z:";

// Function to find all .meta.json files recursively
function findAllMetaFiles(basePath) {
  const metaFiles = [];
  
  function scanDirectory(dirPath) {
    try {
      if (!fs.existsSync(dirPath)) {
        console.log(`⚠️  Directory not found: ${dirPath}`);
        return;
      }
      
      const items = fs.readdirSync(dirPath, { withFileTypes: true });
      
      for (const item of items) {
        const fullPath = path.join(dirPath, item.name);
        
        if (item.isDirectory()) {
          // Check if this directory contains a .meta.json file
          const metaPath = path.join(fullPath, ".meta.json");
          if (fs.existsSync(metaPath)) {
            metaFiles.push(metaPath);
            console.log(`📄 Found meta.json: ${metaPath}`);
          }
          
          // Recursively scan subdirectories
          scanDirectory(fullPath);
        }
      }
    } catch (error) {
      console.error(`❌ Error scanning ${dirPath}:`, error.message);
    }
  }
  
  scanDirectory(basePath);
  return metaFiles;
}

async function updateMetaFile(filePath) {
  try {
    // Check if .meta.json exists
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  .meta.json not found: ${filePath}`);
      return false;
    }

    // Read existing meta.json
    const metaContent = fs.readFileSync(filePath, 'utf8');
    const metaData = JSON.parse(metaContent);

    // Generate the exact formatting you want using the constants
    const formattedContent = `{
  "projectId": "${metaData.projectId}",
  "projectNumber": "${metaData.projectNumber}",
  "projectName": "${metaData.projectName}",
  "region": "${metaData.region}",
  "createdAt": "${metaData.createdAt}",
  "allowedRoles": {
    "BOQ": ${JSON.stringify(UPDATED_ALLOWED_ROLES.BOQ)},
    "Admin": ${JSON.stringify(UPDATED_ALLOWED_ROLES.Admin)},
    "Estimator": ${JSON.stringify(UPDATED_ALLOWED_ROLES.Estimator)},
    "Scope": ${JSON.stringify(UPDATED_ALLOWED_ROLES.Scope)}
  },
  "structure": ${JSON.stringify(UPDATED_STRUCTURE, null, 4).replace(/\n/g, '\n    ')}
}`;

    // Write updated meta.json
    fs.writeFileSync(filePath, formattedContent);
    
    // Create Scope folder if it doesn't exist
    const projectDir = path.dirname(filePath);
    const scopeDir = path.join(projectDir, "Scope");
    if (!fs.existsSync(scopeDir)) {
      fs.mkdirSync(scopeDir, { recursive: true });
      console.log(`📁 Created Scope folder: ${scopeDir}`);
    }

    return true;
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
    return false;
  }
}

async function main() {
  console.log("🔄 Starting file-system based update of .meta.json files...");
  
  let updatedCount = 0;
  let errorCount = 0;
  
  // Find all .meta.json files in the upload directory
  const metaFiles = findAllMetaFiles(BASE_PROJECT_PATH);
  console.log(`� Found ${metaFiles.length} .meta.json files`);
  
  for (const metaFilePath of metaFiles) {
    console.log(`\n� Processing: ${metaFilePath}`);
    
    if (await updateMetaFile(metaFilePath)) {
      updatedCount++;
      console.log(`✅ Updated: ${path.dirname(metaFilePath)}`);
    } else {
      errorCount++;
    }
  }
  
  console.log(`\n🎉 Summary:`);
  console.log(`   ✅ Successfully updated: ${updatedCount}`);
  console.log(`   ❌ Errors/Not found: ${errorCount}`);
  console.log(`   📊 Total .meta.json files: ${metaFiles.length}`);
}

main().catch(err => {
  console.error("❌ Script Error:", err);
  process.exit(1);
});

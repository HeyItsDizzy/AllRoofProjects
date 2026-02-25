const fs = require("fs");
const path = require("path");
const { projectsCollection } = require("../db");
const { getProjectUploadPath } = require("../features/fileManager/services/pathUtils");

// Updated folder access rules (matches the current folderScaffolder.js)
const UPDATED_FOLDER_ACCESS_RULES = {
  BOQ: ["Admin", "User"],
  Admin: ["Admin"],
  Estimator: ["Admin", "Estimator"],
  Scope: ["Admin", "User", "Estimator"]
};

const updateProjectMeta = async () => {
  console.log("🔧 Starting meta.json update for existing projects...");

  try {
    const collection = await projectsCollection();
    const projects = await collection.find({}).toArray();

    console.log(`📊 Found ${projects.length} projects to process`);

    let updatedCount = 0;
    let errorCount = 0;

    for (const project of projects) {
      try {
        const rootPath = getProjectUploadPath(project, "AU");
        const metaPath = path.join(rootPath, ".meta.json");

        if (fs.existsSync(metaPath)) {
          // Read existing meta
          const existingMeta = JSON.parse(fs.readFileSync(metaPath, "utf8"));

          // Update with new allowedRoles
          const updatedMeta = {
            ...existingMeta,
            allowedRoles: UPDATED_FOLDER_ACCESS_RULES,
            structure: Object.keys(UPDATED_FOLDER_ACCESS_RULES),
            lastUpdated: new Date().toISOString(),
            updatedBy: "updateProjectMeta script"
          };

          // Write updated meta
          fs.writeFileSync(metaPath, JSON.stringify(updatedMeta, null, 2));
          console.log(`✅ Updated: ${project.projectNumber} - ${project.name}`);
          updatedCount++;
        } else {
          console.log(`⚠️ Meta file not found for: ${project.projectNumber} - ${project.name}`);
          
          // Create missing meta file
          const newMeta = {
            projectId: project._id.toString(),
            projectNumber: project.projectNumber,
            projectName: project.name,
            region: "AU",
            createdAt: project.createdAt || new Date().toISOString(),
            allowedRoles: UPDATED_FOLDER_ACCESS_RULES,
            structure: Object.keys(UPDATED_FOLDER_ACCESS_RULES),
            lastUpdated: new Date().toISOString(),
            createdBy: "updateProjectMeta script"
          };

          // Ensure directory exists
          if (!fs.existsSync(rootPath)) {
            fs.mkdirSync(rootPath, { recursive: true });
            console.log(`📁 Created missing directory: ${rootPath}`);
          }

          fs.writeFileSync(metaPath, JSON.stringify(newMeta, null, 2));
          console.log(`🆕 Created missing meta for: ${project.projectNumber} - ${project.name}`);
          updatedCount++;
        }
      } catch (error) {
        console.error(`❌ Error processing ${project.projectNumber}:`, error.message);
        errorCount++;
      }
    }

    console.log(`\n📈 Summary:`);
    console.log(`✅ Successfully updated: ${updatedCount} projects`);
    console.log(`❌ Errors: ${errorCount} projects`);
    console.log(`🎯 Total processed: ${projects.length} projects`);

  } catch (error) {
    console.error("❌ Script failed:", error);
  }
};

// Run the update
updateProjectMeta()
  .then(() => {
    console.log("🏁 Meta update script completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Fatal error:", error);
    process.exit(1);
  });

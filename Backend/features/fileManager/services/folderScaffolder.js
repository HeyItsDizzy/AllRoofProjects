const fs = require("fs");
const path = require("path");
const { getProjectUploadPath } = require("./pathUtils");

const FOLDER_ACCESS_RULES = {
  BOQ: ["Admin", "User"],
  Admin: ["Admin"],
  Estimator: ["Estimator"]
};

const createInitialProjectFolders = (project, region = "AU") => {
  const rootPath = getProjectUploadPath(project, region);
  const subfolders = Object.keys(FOLDER_ACCESS_RULES);

  // ✅ Ensure root folder exists<
  if (!fs.existsSync(rootPath)) {
    fs.mkdirSync(rootPath, { recursive: true });
    console.log("📁 Created root project folder:", rootPath);
  }

  // ✅ Write root-level .meta.json
  const rootMeta = {
    projectId: project._id.toString(),
    projectNumber: project.projectNumber,
    projectName: project.name,
    region,
    createdAt: new Date().toISOString(),
    allowedRoles: FOLDER_ACCESS_RULES,
    structure: subfolders
  };
  const rootMetaPath = path.join(rootPath, ".meta.json");
  fs.writeFileSync(rootMetaPath, JSON.stringify(rootMeta, null, 2));
  console.log(`📝 Root .meta.json written: ${rootMetaPath}`);

  // ✅ Create protected subfolders
  for (const folder of subfolders) {
    const fullPath = path.join(rootPath, folder);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
      console.log(`📂 Created subfolder: ${fullPath}`);
    }
  }

  return true;
};

module.exports = {
  createInitialProjectFolders,
  FOLDER_ACCESS_RULES
};

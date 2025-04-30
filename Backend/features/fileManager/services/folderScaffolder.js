const fs = require("fs");
const path = require("path");
const { getProjectUploadPath } = require("./pathUtils");

const FOLDER_ACCESS_RULES = {
  Project: ["Admin", "User"],
  Admin: ["Admin"],
  Estimator: ["Estimator"]
};

const createInitialProjectFolders = async (project, region = "AU") => {
  const rootPath = await getProjectUploadPath(project, region);
  const subfolders = Object.keys(FOLDER_ACCESS_RULES);

  // ✅ Write root-level .meta.json (required for folderTree sync)
  const rootMeta = {
    projectId: project._id.toString(),
    allowedRoles: FOLDER_ACCESS_RULES,
    createdAt: new Date().toISOString()
  };
  const rootMetaPath = path.join(rootPath, ".meta.json");
  fs.writeFileSync(rootMetaPath, JSON.stringify(rootMeta, null, 2));
  console.log(`📝 Root .meta.json written: ${rootMetaPath}`);

  // ✅ Create subfolders + their own .meta.json
  for (const folder of subfolders) {
    const fullPath = path.join(rootPath, folder);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
      console.log(`📁 Created subfolder: ${fullPath}`);
    }
  }

  return true;
};

module.exports = {
  createInitialProjectFolders,
  FOLDER_ACCESS_RULES
};

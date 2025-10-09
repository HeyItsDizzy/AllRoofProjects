const fs = require("fs");
const path = require("path");
const { getProjectDiskPath } = require("./pathUtils");
const { moveMeta, writeMeta } = require("./metaUtils");
const { scaffoldDefaultFolders } = require("./folderScaffolder");

async function tryRenameProjectFolder(originalProject, updatedProject, region = "AU") {
  const oldPath = getProjectDiskPath(originalProject, "", region);
  const newPath = getProjectDiskPath(updatedProject, "", region);

  if (oldPath === newPath) {
    console.log("📂 No rename needed — project folder alias unchanged.");
    return { success: true, reason: "No rename needed" };
  }

  try {
    // 🧱 If oldPath does not exist, treat as first-time rename
    if (!fs.existsSync(oldPath)) {
      console.warn("⚠️ Project folder does not exist yet:", oldPath);
      console.warn("🔧 Creating renamed folder from scratch:", newPath);

      fs.mkdirSync(newPath, { recursive: true });

      await scaffoldDefaultFolders(updatedProject); // builds Admin/BOQ/Estimator inside newPath
      await writeMeta(newPath, updatedProject); // write a .meta.json

      return { success: true, reason: "Created new folder with renamed name" };
    }

    // 🚫 Prevent overwriting an existing folder
    if (fs.existsSync(newPath)) {
      console.warn("⚠️ Cannot rename — destination folder already exists:", newPath);
      return { success: false, reason: "Destination folder already exists" };
    }

    fs.mkdirSync(path.dirname(newPath), { recursive: true });
    fs.renameSync(oldPath, newPath);
    console.log("✅ Project folder renamed from:\n", oldPath, "\n➡️ to:\n", newPath);

    moveMeta(oldPath, newPath); // ✅ also move .meta.json

    return { success: true };
  } catch (err) {
    console.error("🔥 Error renaming project folder:", err);
    return { success: false, reason: err.message };
  }
}

module.exports = { tryRenameProjectFolder };

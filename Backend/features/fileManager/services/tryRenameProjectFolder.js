const fs = require("fs");
const path = require("path");
const { getProjectDiskPath } = require("./pathUtils");

async function tryRenameProjectFolder(originalProject, updatedProject, region = "AU") {
  const oldPath = getProjectDiskPath(originalProject, "", region);
  const newPath = getProjectDiskPath(updatedProject, "", region);

  if (oldPath === newPath) {
    console.log("📂 No rename needed — project folder alias unchanged.");
    return;
  }

  try {
    if (!fs.existsSync(oldPath)) {
      console.warn("⚠️ Old folder path does not exist:", oldPath);
      return;
    }

    if (fs.existsSync(newPath)) {
      console.warn("⚠️ Cannot rename — destination folder already exists:", newPath);
      return;
    }

    fs.mkdirSync(path.dirname(newPath), { recursive: true });
    fs.renameSync(oldPath, newPath);
    console.log("✅ Project folder renamed from:\n", oldPath, "\n➡️ to:\n", newPath);
  } catch (err) {
    console.error("🔥 Error renaming project folder:", err);
  }
}

module.exports = { tryRenameProjectFolder };

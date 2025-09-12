const fs = require("fs");
const path = require("path");

/**
 * Reads and parses .meta.json from a folder.
 */
function readMeta(folderPath) {
  const metaPath = path.join(folderPath, ".meta.json");
  if (!fs.existsSync(metaPath)) return null;

  try {
    const raw = fs.readFileSync(metaPath, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    console.warn(`⚠️ Failed to read .meta.json from ${metaPath}:`, err.message);
    return null;
  }
}

/**
 * Writes a full .meta.json file to a folder.
 */
function writeMeta(folderPath, metaObject = {}) {
  const metaPath = path.join(folderPath, ".meta.json");
  fs.writeFileSync(metaPath, JSON.stringify(metaObject, null, 2));
  console.log("📝 .meta.json written to", metaPath);
}

/**
 * Updates a single key in .meta.json (or creates if missing).
 */
function updateMeta(folderPath, key, value) {
  const meta = readMeta(folderPath) || {};
  meta[key] = value;
  writeMeta(folderPath, meta);
}

/**
 * Creates a default .meta.json for a project folder.
 */
function initMeta(folderPath, project = {}) {
  const metaPath = path.join(folderPath, ".meta.json");
  if (fs.existsSync(metaPath)) return;

  const meta = {
    projectId: project._id?.toString(),
    projectNumber: project.projectNumber,
    projectName: project.name,
    region: project.region || "AU",
    createdAt: new Date().toISOString(),
    allowedRoles: {
      BOQ: ["Admin", "User"],
      Admin: ["Admin"],
      Estimator: ["Admin", "Estimator"]
    },
    structure: ["Project", "Admin", "Estimator"]
  };

  writeMeta(folderPath, meta);
}

/**
 * Moves .meta.json from old to new folder during renames.
 */
function moveMeta(oldFolderPath, newFolderPath) {
  const oldMeta = path.join(oldFolderPath, ".meta.json");
  const newMeta = path.join(newFolderPath, ".meta.json");

  if (fs.existsSync(oldMeta)) {
    fs.renameSync(oldMeta, newMeta);
    console.log("📁 .meta.json moved:", newMeta);
  }
}

module.exports = {
  readMeta,
  writeMeta,
  updateMeta,
  initMeta,
  moveMeta,
};

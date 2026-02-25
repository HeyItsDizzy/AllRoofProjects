const path = require("path");
const fs = require("fs");
const { ObjectId } = require("mongodb");
const { uploadsRoot: root, getProjectDiskPath } = require("./pathUtils");
const { projectsCollection } = require("../../../db");
const { readMeta } = require("./metaUtils");
const debounce = require("lodash.debounce");
const debouncedLog = debounce((msg) => console.log(msg), 500);

// Find project folder by scanning .meta.json files
function findProjectFolderByMeta(projectId, region) {
  const regionPath = path.join(root, region.toUpperCase());

  const years = fs.existsSync(regionPath) ? fs.readdirSync(regionPath) : [];
  for (const year of years) {
    const yearPath = path.join(regionPath, year);
    const months = fs.readdirSync(yearPath);
    for (const month of months) {
      const monthPath = path.join(yearPath, month);
      const projects = fs.readdirSync(monthPath);
      for (const folder of projects) {
        const folderPath = path.join(monthPath, folder);
        const metaPath = path.join(folderPath, ".meta.json");
        if (fs.existsSync(metaPath)) {
          try {
            const meta = readMeta(folderPath);

            
            if (String(meta.projectId) === String(projectId)) {
              return folderPath;
            }
          } catch (err) {
            console.warn(`⚠️ Failed to parse .meta.json at ${metaPath}:`, err.message);
          }
        }
      }
    }
  }

  return null;
}

// Build a nested object representing folders
function walk(dir) {
  debouncedLog("📂 Walking directory:", dir);

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const tree = {};

  for (const entry of entries) {
    if (entry.name === ".meta.json") continue;

    const fullPath = path.join(dir, entry.name);

if (entry.isDirectory() && entry.name !== "__files") {
  tree[entry.name] = walk(fullPath);
} else {
      if (!tree.__files) tree.__files = [];
      tree.__files.push(entry.name);
    }
  }

  return tree;
}




async function buildFolderTreeFromDisk(projectId, region = "AU") {
  console.log("🔍 [buildFolderTreeFromDisk] Starting folder tree build for:", projectId, "Region:", region);

  const collection = await projectsCollection();
  const project = await collection.findOne({ _id: new ObjectId(projectId) });

  if (!project) throw new Error("❌ Project not found in DB");

  const now = new Date();
  const timestamp = now.toTimeString().split(' ')[0];
  console.log("✅ found buildFolderTreeFromDisk:", project.name);
  console.log("========", timestamp, " Project Found ========");

  // ⚡ PRIMARY: Use direct path calculation (instant) from projectNumber
  let rootPath = getProjectDiskPath(project, "", region);
  console.log("📁 Direct path from projectNumber:", rootPath);

  // 🔍 FALLBACK: Only scan for .meta.json if direct path doesn't exist
  if (!fs.existsSync(rootPath)) {
    console.warn("⚠️ Direct path not found. Scanning for .meta.json...");
    rootPath = findProjectFolderByMeta(projectId, region);
    
    if (!rootPath) {
      console.warn("📁 No folder found anywhere. Creating at calculated path:", getProjectDiskPath(project, "", region));
      rootPath = getProjectDiskPath(project, "", region);
      fs.mkdirSync(rootPath, { recursive: true });
    }
  }

  console.log("🧭 Walking from root path:", rootPath);
  const tree = walk(rootPath);

  // 🔍 Log final folder tree
  console.log("🧱 Final folder tree from disk:", JSON.stringify(tree, null, 2));

  return tree;
}


async function getProjectById(projectId) {
  if (!ObjectId.isValid(projectId)) {
    console.warn(`⚠️ Invalid ObjectId passed to getProjectById: ${projectId}`);
    return null;
  }
  const collection = await projectsCollection();
  return await collection.findOne({ _id: new ObjectId(projectId) });
}


module.exports = {
  buildFolderTreeFromDisk,
  syncFromDisk: buildFolderTreeFromDisk,
  getProjectById,
};

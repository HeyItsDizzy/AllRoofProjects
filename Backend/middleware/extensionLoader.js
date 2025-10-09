const fs = require("fs");
const path = require("path");

const EXT_FILE = path.join(__dirname, "allowed-extensions.txt");

let EXTENSIONS = [];

function loadExtensionsFromFile() {
  try {
    const raw = fs.readFileSync(EXT_FILE, "utf-8");

    const lines = raw.split(/\r?\n/);
    const grouped = {};
    let currentGroup = "uncategorized";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("//")) continue;

      if (trimmed.startsWith("#")) {
        currentGroup = trimmed.slice(1).trim().toLowerCase() || "uncategorized";
        if (!grouped[currentGroup]) grouped[currentGroup] = [];
      } else {
        const parts = trimmed.split(",").map(e => e.trim()).filter(Boolean);
        for (const part of parts) {
          const ext = `.${part.toLowerCase()}`;
          if (!grouped[currentGroup]) grouped[currentGroup] = [];
          grouped[currentGroup].push(ext);
        }

      }
    }

    EXTENSIONS = Object.values(grouped).flat();

    console.log("📂 Allowed Extensions by Group:");
    for (const [group, exts] of Object.entries(grouped)) {
      console.log(`  # ${group}:`, exts.join(", "));
    }

  } catch (err) {
    console.error("❌ Failed to load allowed types:", err);
    EXTENSIONS = [];
  }
}


// 🔄 Initial load
loadExtensionsFromFile();

// 🔁 Watch the file for live updates
fs.watch(EXT_FILE, (eventType) => {
  if (eventType === "change") {
    console.log("🔄 allowed-types.txt changed, reloading...");
    console.log("📦 Allowed extensions loaded:", EXTENSIONS);
    loadExtensionsFromFile();
  }
});


module.exports = {
  allowedExtensions: () => EXTENSIONS,
};
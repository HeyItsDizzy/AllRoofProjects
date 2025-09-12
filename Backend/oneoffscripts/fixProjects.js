require("dotenv").config();
const { ObjectId } = require("mongodb");
const { projectsCollection } = require("../db");

const fixProjectsAndRenumber = async () => {
  try {
    const collection = await projectsCollection();
    console.log("✅ Connected to Projects collection!");

    const projects = await collection.find().toArray();
    const todayISO = new Date().toISOString().split("T")[0];

    for (const project of projects) {
      let updates = {};

      // 1. Ensure `files` is an array
      if (!Array.isArray(project.files)) {
        updates.files = [];
      }

      // 2. Ensure `linkedUsers` is an array of strings
      if (!Array.isArray(project.linkedUsers)) {
        updates.linkedUsers = [];
      } else {
        updates.linkedUsers = project.linkedUsers.map((id) => String(id));
      }

      // 3. Standardize `posting_date` to YYYY-MM-DD
      if (project.posting_date && typeof project.posting_date === "string") {
        const parts = project.posting_date.split(/[-/]/);
        let year, month, day;

        if (parts.length === 3) {
          if (parts[0].length === 4) {
            [year, month, day] = parts;
          } else {
            [month, day, year] = parts;
          }
          updates.posting_date = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
        } else {
          updates.posting_date = todayISO;
        }
      } else {
        updates.posting_date = todayISO;
      }

      // 4. Apply updates only if necessary
      const needsUpdate = Object.keys(updates).length > 0;
      if (needsUpdate) {
        await collection.updateOne({ _id: project._id }, { $set: updates });
        console.log(`🔧 Updated project ${project._id}`);
      }
    }

    console.log("🎉 Data standardization complete. Starting renumbering...");

    // 5. Renumber projects
    const sortedProjects = await collection.find().sort({ posting_date: 1 }).toArray();
    const counter = {};

    for (const project of sortedProjects) {
      const [yearFull, month] = project.posting_date.split("-");
      const year = yearFull.slice(-2);
      const key = `${year}-${month}`;

      counter[key] = (counter[key] || 0) + 1;
      const paddedCount = String(counter[key]).padStart(3, "0");
      const projectNumber = `${key}${paddedCount}`;

      await collection.updateOne(
        { _id: project._id },
        { $set: { projectNumber } }
      );

      console.log(`✅ ${project._id} → ${projectNumber}`);
    }

    console.log("✅ All projects renumbered successfully.");
  } catch (error) {
    console.error("❌ Error fixing projects:", error.message);
  }
};

fixProjectsAndRenumber();

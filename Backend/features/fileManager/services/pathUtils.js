// pathUtils.js
const path = require("path");

// Root of all uploaded project files
const uploadsRoot = path.resolve(__dirname, "../../../.FM");

function getProjectDiskPath(project, folderName = "", region = "AU") {
  if (!project || !project.projectNumber || !project.name) {
    console.error("🚨 getProjectDiskPath: Missing required project fields:", project);
    return null;
  }

  const [yearShort, monthSeq] = project.projectNumber.split("-");
  if (!yearShort || !monthSeq) {
    console.error("🚨 getProjectDiskPath: Malformed projectNumber:", project.projectNumber);
    return null;
  }

  const fullYear = `20${yearShort}`;
  const monthNum = parseInt(monthSeq.slice(0, 2), 10);

  if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
    console.error("🚨 getProjectDiskPath: Invalid month segment:", monthSeq);
    return null;
  }

  const locales = {
    AU: "en-AU",
    US: "en-US",
    NO: "nb-NO",
  };
  const locale = locales[region] || "en";
  const monthName = new Date(2000, monthNum - 1).toLocaleString(locale, {
    month: "short",
  });

  const monthFolder = `${monthNum.toString().padStart(2, "0")}. ${monthName.charAt(0).toUpperCase()}${monthName.slice(1)}`;
  const projectFolder = `${project.projectNumber} - ${project.name}`;

  return path.join(uploadsRoot, region.toUpperCase(), fullYear, monthFolder, projectFolder, folderName);
}


function getProjectUploadPath(project, region = "AU") {
  return getProjectDiskPath(project, "", region);
}


module.exports = {
  uploadsRoot,
  getProjectDiskPath,
  getProjectUploadPath,
};

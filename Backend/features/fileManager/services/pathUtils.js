// pathUtils.js
const path = require("path");
const fs = require("fs");

// Root of all uploaded project files - auto-detected based on which path exists
// Production (VPS): /root/ART/.FM
// Development (Windows): Y:\.FM (SSHFS mount)
const uploadsRoot = fs.existsSync("/root/ART/.FM") 
  ? "/root/ART/.FM" 
  : "Y:\\.FM";

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

  // Use custom month abbreviations for consistent "MM. MMM" format
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthName = monthNames[monthNum - 1];

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
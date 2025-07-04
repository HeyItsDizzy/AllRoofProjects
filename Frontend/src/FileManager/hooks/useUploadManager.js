// 🧠 [UP] useUploadManager.js
import { uploadFileToFolder, dedupeName, safelyAddFiles } from "@/FileManager/utils/FMFunctions";
import Swal from '@/shared/swalConfig';

//export const useUploadManager = ({ projectId, selectedPath = ".", axios, setFiles, setGhostFilesByPath, existingFileNames = [] }) => {

export const useUploadManager = ({
  projectId,
  selectedPath = ".",
  axios,
  setFiles,
  setGhostFilesByPath,
  liveFiles = [],
  ghostFilesByPath = {}, // ✅ ADD THIS LINE
  existingFileNames = [], // ✅ also ensure this is passed in
}) => {

const uploadFiles = async (files) => {
  console.log("🚀 [UP] Starting uploadFiles...");
  if (!files?.length) {
    console.warn("🚫 [UP] No files provided.");
    return;
  }

  const validFiles = files.filter(f => f.name?.includes("."));
  const uploaded = [];

  console.log("✅ [UP] Valid files:", validFiles.map(f => f.name));

  for (const file of validFiles) {
    const originalName = file.name;

    const ghostList = ghostFilesByPath?.[selectedPath] || [];
    const allNames = [...existingFileNames, ...ghostList];

    const combinedNames = allNames.map((f) =>
      typeof f === "string" ? f : f?.fileName
    );

    const alreadyExists = combinedNames.includes(originalName);
    let finalName = originalName;

    console.log(`🔍 [UP] Processing: ${originalName}`);
    console.log(`🧠 [UP] File "${originalName}" already exists?`, alreadyExists);

    if (alreadyExists) {
      const result = await Swal.fire({
        title: `File "${originalName}" exists`,
        text: "Do you want to overwrite it?",
        icon: "warning",
        showDenyButton: true,
        showCancelButton: true,
        confirmButtonText: "Overwrite",
        denyButtonText: "Keep both",
        cancelButtonText: "Cancel",
      });

      if (result.isConfirmed) {
        console.log("✅ [UP] User chose 'Overwrite'");
        // keep originalName
      } else if (result.isDenied) {
        finalName = dedupeName(originalName, combinedNames.concat(uploaded));
        console.log("🆕 [UP] User chose 'Keep both'. New name:", finalName);
      } else {
        console.log("❌ [UP] User canceled upload for:", originalName);
        continue;
      }
    }

    try {
      console.log(`📤 [UP] Uploading "${file.name}" as "${finalName}"...`);
      await uploadFileToFolder({
        file,
        projectId,
        folderPath: selectedPath,
        axios,
        overrideName: finalName,
        onProgress: (percent) =>
          console.log(`📶 [UP] Upload progress [${finalName}]: ${percent}%`),
      });

      uploaded.push(finalName);
      console.log("🎉 [UP] Uploaded:", finalName);

      // 🔄 Update Ghost State
      if (typeof setGhostFilesByPath === "function") {
        setGhostFilesByPath(prev => {
          const prevList = prev[selectedPath] || [];
          const cleaned = prevList.filter(f => f !== finalName);
          return {
            ...prev,
            [selectedPath]: [...cleaned, finalName],
          };
        });
      }
    } catch (err) {
      console.error(`❌ [UP] Upload failed for "${file.name}":`, err);
      Swal.fire("Upload Failed", `${file.name} could not be uploaded.`, "error");
    }
  }

  // 💾 Update UI list if files were uploaded
  if (setFiles && uploaded.length) {
    console.log("🔄 [UP] Updating UI with files:", uploaded);
    setFiles((prev) => {
      const newList = safelyAddFiles(prev, uploaded);
      console.log("🧩 [UP] Merged list:", newList);
      return newList;
    });
  }

  console.log("✅ [UP] uploadFiles complete");
};


//Old Logic keep for debuging 
 /* const uploadFiles = async (files) => {
    console.log("🚀 [UP] Starting uploadFiles...");
    if (!files?.length) {
      console.warn("🚫 [UP] No files provided.");
      return;
    }

    const validFiles = files.filter(f => f.name?.includes("."));
    const uploaded = [];

    console.log("✅ [UP] Valid files:", validFiles.map(f => f.name));

    for (const file of validFiles) {
      const originalName = file.name;
      const ghostList = ghostFilesByPath?.[selectedPath] || [];
      const allNames = [...existingFileNames, ...ghostList];

      const combinedNames = allNames.map((f) =>
        typeof f === "string" ? f : f?.fileName
      );

      //I already havd this here, is the location wrong? check all my call order logic also
      //const alreadyExists = combinedNames.includes(originalName);


      console.log(`🔍 [UP] Processing: ${originalName}`);
      console.log(`🧠 [UP] File "${originalName}" already exists?`, alreadyExists);

      let finalName = originalName;

// Build a combined list from both existing and ghost files
const existingNames = liveFiles.map(f =>
  typeof f === "string" ? f : f?.fileName
);
const alreadyExists = existingNames.includes(originalName);

console.log(`🧠 [UP] File "${originalName}" already exists?`, alreadyExists);


console.log(`🔍 [UP] Processing: ${originalName}`);
console.log(`🧠 [UP] File "${originalName}" already exists?`, fileExists);

if (alreadyExists) {
  const result = await Swal.fire({
    title: `File "${originalName}" exists`,
    text: "Do you want to overwrite it?",
    icon: "warning",
    showDenyButton: true,
    showCancelButton: true,
    confirmButtonText: "Overwrite",
    denyButtonText: "Keep both",
    cancelButtonText: "Cancel",
  });

  if (result.isConfirmed) {
    console.log("✅ [UP] User chose 'Overwrite'");
    // keep originalName
  } else if (result.isDenied) {
    finalName = dedupeName(originalName, allFileNames.concat(uploaded));
    console.log("🆕 [UP] User chose 'Keep both'. New name:", finalName);
  } else {
    console.log("❌ [UP] User canceled upload for:", originalName);
    continue;
  }
} else {
  finalName = dedupeName(originalName, allFileNames.concat(uploaded));
  console.log("✅ [UP] No conflict. Final name after dedupe:", finalName);
}


try {
  console.log(`📤 [UP] Uploading "${file.name}" as "${finalName}"...`);
  await uploadFileToFolder({
    file,
    projectId,
    folderPath: selectedPath,
    axios,
    overrideName: finalName,
    onProgress: (percent) =>
      console.log(`📶 [UP] Upload progress [${finalName}]: ${percent}%`),
  });

  uploaded.push(finalName);
  console.log("🎉 [UP] Uploaded:", finalName);

  // --- ADD THIS: (call setGhostFilesByPath passed as a prop to the hook)
  if (typeof setGhostFilesByPath === "function") {
    setGhostFilesByPath(prev => {
      const prevList = prev[selectedPath] || [];
      const cleaned = prevList.filter(f => f !== finalName); // avoid dupes
      return {
        ...prev,
        [selectedPath]: [...cleaned, finalName]
      };
    });
  }

  // --- END ADD ---
} catch (err) {
  console.error(`❌ [UP] Upload failed for "${file.name}":`, err);
  Swal.fire("Upload Failed", `${file.name} could not be uploaded.`, "error");
}

    }

    // 🔄 Inject files into UI if setFiles is available
if (setFiles && uploaded.length) {
  console.log("🔄 [UP] Updating UI with files:", uploaded);
  setFiles((prev) => {
    const currentNames = prev.map(f => typeof f === "string" ? f : f?.fileName);
    const newList = safelyAddFiles(prev, uploaded);
    console.log("🧩 [UP] Merged list:", newList);
    return newList;
  });
}



    console.log("✅ [UP] uploadFiles complete");
  };*/

  return { uploadFiles };
};

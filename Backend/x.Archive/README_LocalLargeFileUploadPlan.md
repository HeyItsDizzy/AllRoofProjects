# 🚀 Future Feature: Local Large File Upload (Bypass Server)

## 📌 Purpose
To allow users to handle **very large file uploads** (e.g. 1GB ZIPs) **without uploading to the VPS** — instead, they will save these files **directly to their local machine**, while still maintaining the exact same folder structure used by the server (`.FM/region/year/month/project`).

This feature will be implemented **after launch**.

---

## 🧠 Core Idea
If a file is too large (e.g. >100MB), the system will:

1. Prompt the user:
   > "This file is too large for direct upload. Would you like to save it locally instead?"

2. Offer to save it to a mirrored local path:
   ```
   C:\AllRoofTakeOffs\AU\2024\12. Dec\24-12001 - 25 Minerva Street
   ```

3. The local path **mirrors** the server structure:
   ```
   [VPS]/.FM/AU/2024/12. Dec/24-12001 - 25 Minerva Street
   ```

---

## 🧪 Technical Notes

### ✅ Uses: File System Access API
- Browser prompts user to save file via `window.showSaveFilePicker()`
- Writes file directly to local disk
- Works in:
  - ✅ Chrome
  - ✅ Edge
  - ❌ Firefox/Safari (fallback to manual instruction)

### 🧰 Core JS Function (to be implemented later)

```js
function buildLocalPath(project, region = "AU") {
  const [yearShort, monthSeq] = project.projectNumber.split("-");
  const year = `20${yearShort}`;
  const monthIndex = parseInt(monthSeq.slice(0, 2), 10) - 1;
  const monthName = new Date(2000, monthIndex).toLocaleString("en-AU", { month: "short" });
  const folder = `${project.projectNumber} - ${project.name}`;

  return `C:/AllRoofTakeOffs/${region}/${year}/${monthIndex + 1}. ${capitalize(monthName)}/${folder}`;
}
```

### 🔁 UX Fallback for unsupported browsers:
If `window.showSaveFilePicker` is not available:
- Show the expected path to the user
- Offer a “Copy to Clipboard” button
- Let user manually copy the file there

---

## 📋 Checklist for Future Dev

- [ ] Add `LARGE_FILE_THRESHOLD_MB = 100` to config
- [ ] Detect file size on drop
- [ ] Prompt user with SweetAlert for local save
- [ ] Use File System Access API if supported
- [ ] Fallback: manual instruction with copyable path
- [ ] (Optional) Save a reference in project metadata or UI

---

## 🧠 Why This Exists
This is a safe way to avoid maxing out the server or VPS storage during huge uploads, while still giving users predictable, mirrored file organization. It also lays the groundwork for RaiDrive-style Explorer syncing later.

---

📦 Save this file somewhere persistent, and show it to ChatGPT again when you're ready to build the local save feature.
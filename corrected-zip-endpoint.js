// 🗜️ ZIP Extraction Endpoint
router.post('/:projectId/extract-zip', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { fileName, folderPath = '', deleteOriginal = true } = req.body;
    
    console.log(`🗜️ [EXTRACT] Starting ZIP extraction: ${fileName} in ${folderPath}`);
    
    // Get project and validate
    const project = await projectsCollection.findOne({ _id: new ObjectId(projectId) });
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    
    const projectDiskPath = getProjectDiskPath(project.alias);
    const fullFolderPath = path.join(projectDiskPath, folderPath);
    const zipFilePath = path.join(fullFolderPath, fileName);
    
    // Check if ZIP file exists
    if (!fs.existsSync(zipFilePath)) {
      return res.status(404).json({ error: "ZIP file not found" });
    }
    
    // Ensure it's actually a ZIP file
    if (!fileName.toLowerCase().endsWith('.zip')) {
      return res.status(400).json({ error: "File is not a ZIP archive" });
    }
    
    const JSZip = require('jszip');
    const extractedFiles = [];
    
    try {
      // Read and extract ZIP file
      const zipData = fs.readFileSync(zipFilePath);
      const zip = new JSZip();
      const zipContent = await zip.loadAsync(zipData);
      
      // Process each file in the ZIP
      for (const [relativePath, zipEntry] of Object.entries(zipContent.files)) {
        // Skip directories and hidden files
        if (zipEntry.dir || relativePath.startsWith('__MACOSX/') || relativePath.includes('/.')) {
          continue;
        }
        
        console.log(`📂 [EXTRACT] Extracting: ${relativePath}`);
        
        // Get file content as buffer
        const fileBuffer = await zipEntry.async('nodebuffer');
        
        // Determine output path (preserve folder structure)
        const outputPath = path.join(fullFolderPath, relativePath);
        const outputDir = path.dirname(outputPath);
        
        // Create directories if they don't exist
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }
        
        // Write extracted file
        fs.writeFileSync(outputPath, fileBuffer);
        extractedFiles.push(relativePath);
      }
      
      console.log(`✅ [EXTRACT] Extracted ${extractedFiles.length} files from ${fileName}`);
      
      // Delete original ZIP if requested
      if (deleteOriginal) {
        fs.unlinkSync(zipFilePath);
        console.log(`🗑️ [EXTRACT] Deleted original ZIP: ${fileName}`);
      }
      
      // Sync folder tree after extraction
      await syncFromDisk(projectId);
      
      res.json({
        success: true,
        message: `Successfully extracted ${extractedFiles.length} files`,
        extractedFiles,
        deletedOriginal: deleteOriginal
      });
      
    } catch (zipError) {
      console.error("❌ [EXTRACT] ZIP processing failed:", zipError);
      res.status(400).json({ 
        error: "Failed to extract ZIP file", 
        details: zipError.message 
      });
    }
    
  } catch (err) {
    console.error("🔥 [EXTRACT] ZIP extraction endpoint failed:", err);
    res.status(500).json({ 
      error: "Internal server error during ZIP extraction",
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

module.exports = router;
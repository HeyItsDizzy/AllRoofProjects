#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const recoveredFilesDir = 'recovered-files';

// Find all entries.json files
function findAllEntriesFiles(dir) {
    const entriesFiles = [];
    
    function searchDir(currentDir) {
        const items = fs.readdirSync(currentDir);
        
        for (const item of items) {
            const fullPath = path.join(currentDir, item);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory()) {
                searchDir(fullPath);
            } else if (item === 'entries.json') {
                entriesFiles.push(fullPath);
            }
        }
    }
    
    searchDir(dir);
    return entriesFiles;
}

// Parse entries.json and get file versions with timestamps
function parseEntries(entriesFilePath) {
    try {
        const content = fs.readFileSync(entriesFilePath, 'utf8');
        const data = JSON.parse(content);
        
        if (!data.resource || !data.entries) {
            return null;
        }
        
        const filePath = data.resource;
        const historyDir = path.dirname(entriesFilePath);
        
        // Find the latest entry (highest timestamp)
        let latestEntry = null;
        let latestTimestamp = 0;
        
        for (const entry of data.entries) {
            if (entry.timestamp > latestTimestamp) {
                latestTimestamp = entry.timestamp;
                latestEntry = entry;
            }
        }
        
        if (latestEntry) {
            const actualFile = path.join(historyDir, latestEntry.id);
            if (fs.existsSync(actualFile)) {
                return {
                    originalPath: filePath,
                    latestFile: actualFile,
                    timestamp: latestTimestamp,
                    date: new Date(latestTimestamp).toISOString(),
                    source: latestEntry.source || 'unknown'
                };
            }
        }
        
        return null;
    } catch (error) {
        console.error(`Error parsing ${entriesFilePath}:`, error.message);
        return null;
    }
}

// Main function
function findLatestVersions() {
    console.log('🔍 Scanning for all file histories...\n');
    
    const entriesFiles = findAllEntriesFiles(recoveredFilesDir);
    console.log(`Found ${entriesFiles.length} history entries\n`);
    
    const fileVersions = new Map();
    
    // Process each entries.json file
    for (const entriesFile of entriesFiles) {
        const result = parseEntries(entriesFile);
        if (result) {
            const key = result.originalPath;
            
            // Keep only the latest version of each file
            if (!fileVersions.has(key) || fileVersions.get(key).timestamp < result.timestamp) {
                fileVersions.set(key, result);
            }
        }
    }
    
    // Sort by file path for organized output
    const sortedFiles = Array.from(fileVersions.values()).sort((a, b) => 
        a.originalPath.localeCompare(b.originalPath)
    );
    
    console.log('📋 LATEST VERSIONS OF ALL YOUR FILES:');
    console.log('=====================================\n');
    
    for (const file of sortedFiles) {
        console.log(`📄 ${file.originalPath}`);
        console.log(`   📅 Date: ${file.date}`);
        console.log(`   📁 Copy from: ${file.latestFile}`);
        console.log(`   📝 Source: ${file.source}`);
        console.log('');
    }
    
    // Generate copy commands
    console.log('\n🚀 COPY COMMANDS (run these to restore your latest work):');
    console.log('=========================================================\n');
    
    for (const file of sortedFiles) {
        // Convert original path to workspace relative path
        let targetPath = file.originalPath;
        if (targetPath.startsWith('src/')) {
            targetPath = targetPath; // Already relative to src
        } else if (targetPath.includes('/src/')) {
            targetPath = targetPath.substring(targetPath.indexOf('/src/') + 1);
        }
        
        console.log(`# ${file.originalPath} (${file.date})`);
        console.log(`cp "${file.latestFile}" "${targetPath}"`);
        console.log('');
    }
    
    return sortedFiles;
}

// Run the script
if (require.main === module) {
    findLatestVersions();
}

module.exports = { findLatestVersions };

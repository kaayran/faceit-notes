// Settings module (colors + import/export)

/**
 * Show settings screen
 */
function showSettingsScreen() {
    document.body.classList.add('notes-view');
    document.getElementById('mainScreen').style.display = 'none';
    document.getElementById('settingsScreen').style.display = 'block';
    loadColorSettings();
    updateNotesStats();
    
    // Collapse all groups by default
    document.querySelectorAll('.settings-group').forEach(group => {
        group.classList.add('collapsed');
    });
}

/**
 * Hide settings screen
 */
function hideSettingsScreen() {
    document.body.classList.remove('notes-view');
    document.getElementById('mainScreen').style.display = 'block';
    document.getElementById('settingsScreen').style.display = 'none';
}

// ============================================
// COLOR SETTINGS
// ============================================

/**
 * Load color settings into UI
 */
async function loadColorSettings() {
    const colors = await loadColors();
    
    document.getElementById('colorNoNote').value = colors.noNote;
    document.getElementById('colorWithNote').value = colors.withNote;
}

/**
 * Load and apply colors on startup
 */
async function loadAndApplyColors() {
    const colors = await loadColors();
    applyColors(colors);
}

/**
 * Apply colors to UI and notify tabs
 */
function applyColors(colors) {
    applyColorsToDocument(colors);
    notifyTabsAboutColorChange(colors);
}

/**
 * Save color settings
 */
async function saveColorSettings() {
    const colors = {
        noNote: document.getElementById('colorNoNote').value,
        withNote: document.getElementById('colorWithNote').value
    };
    
    await saveColors(colors);
    applyColors(colors);
    
    // Visual feedback
    const saveBtn = document.getElementById('saveColors');
    const originalText = saveBtn.textContent;
    saveBtn.textContent = 'Saved!';
    setTimeout(() => {
        saveBtn.textContent = originalText;
    }, 1000);
}

/**
 * Reset colors to default
 */
async function resetColors() {
    document.getElementById('colorNoNote').value = DEFAULT_COLORS.noNote;
    document.getElementById('colorWithNote').value = DEFAULT_COLORS.withNote;
    
    await saveColors(DEFAULT_COLORS);
    applyColors(DEFAULT_COLORS);
}

/**
 * Apply color preset
 */
function applyPreset(noNote, withNote) {
    document.getElementById('colorNoNote').value = noNote;
    document.getElementById('colorWithNote').value = withNote;
}

// ============================================
// IMPORT/EXPORT
// ============================================

/**
 * Update notes statistics
 */
async function updateNotesStats() {
    const count = getNotesCount();
    
    const statsEl = document.getElementById('totalNotesCount');
    if (statsEl) {
        statsEl.textContent = count;
    }
}

/**
 * Export notes to JSON file
 */
async function exportNotesToJSON() {
    const allNotes = getAllNotes();
    const colors = await loadColors();
    
    const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        notes: allNotes,
        settings: {
            colors: colors
        }
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `faceit-notes-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
    
    // Visual feedback
    const exportBtn = document.getElementById('exportNotes');
    const originalText = exportBtn.textContent;
    exportBtn.textContent = '✓ Exported!';
    setTimeout(() => {
        exportBtn.textContent = originalText;
    }, 2000);
}

/**
 * Import notes from JSON file
 */
async function importNotesFromJSON() {
    const fileInput = document.getElementById('importFileInput');
    
    fileInput.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        try {
            const text = await file.text();
            const importData = JSON.parse(text);
            
            // Validate structure
            if (!importData.notes || typeof importData.notes !== 'object') {
                alert('Invalid file format');
                return;
            }
            
            const currentNotes = getAllNotes();
            
            // Smart merge: keep newer notes based on timestamp
            const mergedNotes = { ...currentNotes };
            let imported = 0;
            let skipped = 0;
            
            for (const [nickname, importedData] of Object.entries(importData.notes)) {
                const existing = mergedNotes[nickname];
                
                if (!existing) {
                    // New note
                    mergedNotes[nickname] = importedData;
                    imported++;
                } else {
                    // Compare timestamps
                    const existingTime = existing.timestamp || 0;
                    const importedTime = importedData.timestamp || 0;
                    
                    if (importedTime > existingTime) {
                        // Imported is newer
                        mergedNotes[nickname] = importedData;
                        imported++;
                    } else {
                        // Keep existing
                        skipped++;
                    }
                }
            }
            
            await saveNotes(mergedNotes);
            
            // Import settings if available
            if (importData.settings?.colors) {
                await saveColors(importData.settings.colors);
                applyColors(importData.settings.colors);
            }
            
            // Update UI
            updateNotesStats();
            
            // Visual feedback with stats
            const importBtn = document.getElementById('importNotes');
            const originalText = importBtn.textContent;
            importBtn.textContent = `✓ +${imported} ${skipped > 0 ? `(-${skipped} old)` : ''}`;
            setTimeout(() => {
                importBtn.textContent = originalText;
            }, 3000);
            
            // Reload notes screen if it's open
            if (typeof loadAllNotes === 'function') {
                await loadAllNotes();
            }
        } catch (err) {
            alert('Error importing file: ' + err.message);
        }
        
        fileInput.value = '';
    };
    
    fileInput.click();
}

/**
 * Toggle settings group collapse
 */
function toggleSettingsGroup(header) {
    const group = header.closest('.settings-group');
    group.classList.toggle('collapsed');
}

/**
 * Initialize settings screen event listeners
 */
function initSettingsListeners() {
    // Back button
    const settingsBackBtn = document.getElementById('settingsBackBtn');
    if (settingsBackBtn) {
        settingsBackBtn.addEventListener('click', hideSettingsScreen);
    }
    
    // Save colors
    const saveColorsBtn = document.getElementById('saveColors');
    if (saveColorsBtn) {
        saveColorsBtn.addEventListener('click', saveColorSettings);
    }
    
    // Reset colors
    const resetColorsBtn = document.getElementById('resetColors');
    if (resetColorsBtn) {
        resetColorsBtn.addEventListener('click', resetColors);
    }
    
    // Preset buttons
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const noNote = btn.getAttribute('data-no-note');
            const withNote = btn.getAttribute('data-with-note');
            applyPreset(noNote, withNote);
        });
    });
    
    // Settings group collapse/expand
    document.querySelectorAll('.settings-group-header').forEach(header => {
        header.addEventListener('click', () => {
            toggleSettingsGroup(header);
        });
    });
    
    // Export button
    const exportBtn = document.getElementById('exportNotes');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportNotesToJSON);
    }
    
    // Import button
    const importBtn = document.getElementById('importNotes');
    if (importBtn) {
        importBtn.addEventListener('click', importNotesFromJSON);
    }
}


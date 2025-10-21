// Load localized strings
function loadLocalization() {
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        const message = chrome.i18n.getMessage(key);
        if (message) {
            element.textContent = message;
        }
    });
}

// Extension state management
async function getExtensionState() {
    const result = await chrome.storage.local.get('extensionEnabled');
    return result.extensionEnabled !== false; // Default to true
}

async function setExtensionState(enabled) {
    await chrome.storage.local.set({ extensionEnabled: enabled });
    
    // Notify all tabs about the state change
    const tabs = await chrome.tabs.query({});
    tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, {
            type: 'EXTENSION_STATE_CHANGED',
            enabled: enabled
        }).catch(() => {
            // Tab might not have content script, ignore error
        });
    });
}

function updateToggleUI(enabled) {
    const toggle = document.getElementById('extensionToggle');
    const status = document.getElementById('toggleStatus');
    
    toggle.checked = enabled;
    
    if (enabled) {
        status.textContent = chrome.i18n.getMessage('statusEnabled') || 'Enabled';
        status.classList.remove('disabled');
        status.classList.add('enabled');
    } else {
        status.textContent = chrome.i18n.getMessage('statusDisabled') || 'Disabled';
        status.classList.remove('enabled');
        status.classList.add('disabled');
    }
}

document.addEventListener('DOMContentLoaded', async function() {
    // Load translations
    loadLocalization();

    // Initialize toggle state
    const enabled = await getExtensionState();
    updateToggleUI(enabled);

    // Toggle event listener
    const toggle = document.getElementById('extensionToggle');
    toggle.addEventListener('change', async function() {
        const newState = this.checked;
        await setExtensionState(newState);
        updateToggleUI(newState);
        
        // Visual feedback
        const toggleSection = document.querySelector('.toggle-section');
        toggleSection.style.transform = 'scale(0.98)';
        setTimeout(() => {
            toggleSection.style.transform = 'scale(1)';
        }, 100);
    });

    const viewNotesBtn = document.getElementById('viewNotes');
    const settingsBtn = document.getElementById('settings');

    viewNotesBtn.addEventListener('click', function() {
        showNotesScreen();
    });

    settingsBtn.addEventListener('click', function() {
        showSettingsScreen();
    });
    
    // Load and apply colors on startup
    loadAndApplyColors();
});

// Notes management
let allNotes = {};
let filteredNotes = {};
let currentEditingNickname = null;

function showNotesScreen() {
    document.body.classList.add('notes-view');
    document.getElementById('mainScreen').style.display = 'none';
    document.getElementById('notesScreen').style.display = 'block';
    loadAllNotes();
}

function showMainScreen() {
    document.body.classList.remove('notes-view');
    document.getElementById('mainScreen').style.display = 'block';
    document.getElementById('notesScreen').style.display = 'none';
}

async function loadAllNotes() {
    const result = await chrome.storage.local.get('playerNotes');
    allNotes = result.playerNotes || {};
    filteredNotes = { ...allNotes };
    renderNotes();
}

function renderNotes() {
    const notesList = document.getElementById('notesList');
    const emptyState = document.getElementById('emptyState');
    const notesCount = document.getElementById('notesCount');
    
    const entries = Object.entries(filteredNotes);
    
    notesCount.textContent = entries.length;
    
    if (entries.length === 0) {
        notesList.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }
    
    notesList.style.display = 'flex';
    emptyState.style.display = 'none';
    
    // Sort by nickname
    entries.sort((a, b) => a[0].localeCompare(b[0]));
    
    notesList.innerHTML = entries.map(([nickname, data]) => {
        const preview = data.text.length > 40 ? data.text.substring(0, 40) + '...' : data.text;
        
        return `
            <div class="note-item">
                <div class="note-info">
                    <div class="note-nickname">${escapeHtml(nickname)}</div>
                    <div class="note-preview">${escapeHtml(preview)}</div>
                </div>
                <div class="note-actions">
                    <button class="note-btn edit" data-nickname="${escapeHtml(nickname)}" title="Edit">✎</button>
                    <button class="note-btn delete" data-nickname="${escapeHtml(nickname)}" title="Delete">✕</button>
                </div>
            </div>
        `;
    }).join('');
    
    // Add click handlers
    document.querySelectorAll('.note-btn.edit').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const nickname = btn.getAttribute('data-nickname');
            openEditModal(nickname);
        });
    });
    
    document.querySelectorAll('.note-btn.delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const nickname = btn.getAttribute('data-nickname');
            deleteNoteDirectly(nickname, btn);
        });
    });
}

function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function filterNotes(searchTerm) {
    if (!searchTerm.trim()) {
        filteredNotes = { ...allNotes };
    } else {
        const term = searchTerm.toLowerCase();
        filteredNotes = {};
        
        for (const [nickname, data] of Object.entries(allNotes)) {
            if (nickname.toLowerCase().includes(term) || data.text.toLowerCase().includes(term)) {
                filteredNotes[nickname] = data;
            }
        }
    }
    
    renderNotes();
}

// Delete note directly from list
const deleteStates = new Map();

async function deleteNoteDirectly(nickname, btn) {
    const key = nickname;
    
    if (!deleteStates.has(key)) {
        deleteStates.set(key, true);
        btn.textContent = '✓';
        btn.style.color = '#dc3545';
        btn.style.borderColor = '#dc3545';
        
        setTimeout(() => {
            if (deleteStates.has(key)) {
                deleteStates.delete(key);
                btn.textContent = '✕';
                btn.style.color = '';
                btn.style.borderColor = '';
            }
        }, 3000);
    } else {
        deleteStates.delete(key);
        
        delete allNotes[nickname];
        await chrome.storage.local.set({ playerNotes: allNotes });
        
        const searchTerm = document.getElementById('searchInput').value;
        filterNotes(searchTerm);
    }
}

// Modal functions
function openEditModal(nickname) {
    currentEditingNickname = nickname;
    const modal = document.getElementById('editModal');
    const nicknameEl = document.getElementById('editNickname');
    const textarea = document.getElementById('editTextarea');
    
    const data = allNotes[nickname];
    const noteText = data ? data.text : '';
    
    nicknameEl.textContent = nickname;
    textarea.value = noteText;
    
    modal.style.display = 'flex';
    textarea.focus();
}

function closeEditModal() {
    const modal = document.getElementById('editModal');
    modal.style.display = 'none';
    currentEditingNickname = null;
    
    // Reset delete button state
    const deleteBtn = document.getElementById('deleteNoteBtn');
    deleteBtn.textContent = 'Delete';
    deleteBtn.style.color = '';
    deleteBtn.style.borderColor = '';
    deleteConfirmed = false;
    if (deleteTimeout) clearTimeout(deleteTimeout);
}

async function saveNote() {
    if (!currentEditingNickname) return;
    
    const textarea = document.getElementById('editTextarea');
    const note = textarea.value.trim();
    
    if (note) {
        allNotes[currentEditingNickname] = {
            text: note,
            timestamp: Date.now()
        };
    } else {
        delete allNotes[currentEditingNickname];
    }
    
    await chrome.storage.local.set({ playerNotes: allNotes });
    
    const searchTerm = document.getElementById('searchInput').value;
    filterNotes(searchTerm);
    
    closeEditModal();
}

// Delete from modal
let deleteConfirmed = false;
let deleteTimeout = null;

async function deleteNoteFromModal() {
    if (!currentEditingNickname) return;
    
    const deleteBtn = document.getElementById('deleteNoteBtn');
    
    if (!deleteConfirmed) {
        deleteConfirmed = true;
        deleteBtn.textContent = 'Sure?';
        deleteBtn.style.color = '#dc3545';
        deleteBtn.style.borderColor = '#dc3545';
        
        deleteTimeout = setTimeout(() => {
            deleteConfirmed = false;
            deleteBtn.textContent = 'Delete';
            deleteBtn.style.color = '';
            deleteBtn.style.borderColor = '';
        }, 3000);
    } else {
        clearTimeout(deleteTimeout);
        
        delete allNotes[currentEditingNickname];
        await chrome.storage.local.set({ playerNotes: allNotes });
        
        const searchTerm = document.getElementById('searchInput').value;
        filterNotes(searchTerm);
        
        deleteConfirmed = false;
        closeEditModal();
    }
}

// Color settings
const DEFAULT_COLORS = {
    noNote: '#888888',
    withNote: '#4caf50'
};

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

function hideSettingsScreen() {
    document.body.classList.remove('notes-view');
    document.getElementById('mainScreen').style.display = 'block';
    document.getElementById('settingsScreen').style.display = 'none';
}

async function loadColorSettings() {
    const result = await chrome.storage.local.get('noteColors');
    const colors = result.noteColors || DEFAULT_COLORS;
    
    document.getElementById('colorNoNote').value = colors.noNote;
    document.getElementById('colorWithNote').value = colors.withNote;
}

async function loadAndApplyColors() {
    const result = await chrome.storage.local.get('noteColors');
    const colors = result.noteColors || DEFAULT_COLORS;
    applyColors(colors);
}

function applyColors(colors) {
    // Calculate lighter hover color
    const hoverColor = lightenColor(colors.withNote, 15);
    
    // Apply to popup
    document.documentElement.style.setProperty('--color-no-note', colors.noNote);
    document.documentElement.style.setProperty('--color-with-note', colors.withNote);
    document.documentElement.style.setProperty('--color-with-note-hover', hoverColor);
    
    // Notify content scripts to update colors
    chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
            chrome.tabs.sendMessage(tab.id, {
                type: 'UPDATE_COLORS',
                colors: {
                    ...colors,
                    withNoteHover: hoverColor
                }
            }).catch(() => {
                // Tab might not have content script
            });
        });
    });
}

function lightenColor(hex, percent) {
    // Convert hex to RGB
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    
    // Lighten
    const newR = Math.min(255, Math.floor(r + (255 - r) * (percent / 100)));
    const newG = Math.min(255, Math.floor(g + (255 - g) * (percent / 100)));
    const newB = Math.min(255, Math.floor(b + (255 - b) * (percent / 100)));
    
    // Convert back to hex
    return '#' + [newR, newG, newB].map(x => x.toString(16).padStart(2, '0')).join('');
}

async function saveColorSettings() {
    const colors = {
        noNote: document.getElementById('colorNoNote').value,
        withNote: document.getElementById('colorWithNote').value
    };
    
    await chrome.storage.local.set({ noteColors: colors });
    applyColors(colors);
    
    // Visual feedback
    const saveBtn = document.getElementById('saveColors');
    const originalText = saveBtn.textContent;
    saveBtn.textContent = 'Saved!';
    setTimeout(() => {
        saveBtn.textContent = originalText;
    }, 1000);
}

async function resetColors() {
    document.getElementById('colorNoNote').value = DEFAULT_COLORS.noNote;
    document.getElementById('colorWithNote').value = DEFAULT_COLORS.withNote;
    
    await chrome.storage.local.set({ noteColors: DEFAULT_COLORS });
    applyColors(DEFAULT_COLORS);
}

function applyPreset(noNote, withNote) {
    document.getElementById('colorNoNote').value = noNote;
    document.getElementById('colorWithNote').value = withNote;
}

// Import/Export functions
async function updateNotesStats() {
    const result = await chrome.storage.local.get('playerNotes');
    const notes = result.playerNotes || {};
    const count = Object.keys(notes).length;
    
    const statsEl = document.getElementById('totalNotesCount');
    if (statsEl) {
        statsEl.textContent = count;
    }
}

async function exportNotesToJSON() {
    const result = await chrome.storage.local.get(['playerNotes', 'noteColors']);
    
    const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        notes: result.playerNotes || {},
        settings: {
            colors: result.noteColors || DEFAULT_COLORS
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
            
            const currentResult = await chrome.storage.local.get('playerNotes');
            const currentNotes = currentResult.playerNotes || {};
            
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
            
            await chrome.storage.local.set({ playerNotes: mergedNotes });
            
            // Import settings if available
            if (importData.settings?.colors) {
                await chrome.storage.local.set({ noteColors: importData.settings.colors });
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
            if (allNotes && Object.keys(allNotes).length > 0) {
                await loadAllNotes();
            }
        } catch (err) {
            alert('Error importing file: ' + err.message);
        }
        
        fileInput.value = '';
    };
    
    fileInput.click();
}

function toggleSettingsGroup(header) {
    const group = header.closest('.settings-group');
    group.classList.toggle('collapsed');
}

// Event listeners for notes screen
document.addEventListener('DOMContentLoaded', function() {
    // Back button
    const backBtn = document.getElementById('backBtn');
    if (backBtn) {
        backBtn.addEventListener('click', showMainScreen);
    }
    
    // Search
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            filterNotes(e.target.value);
        });
    }
    
    // Modal close
    const closeModal = document.getElementById('closeModal');
    if (closeModal) {
        closeModal.addEventListener('click', closeEditModal);
    }
    
    // Modal overlay click
    const modal = document.getElementById('editModal');
    if (modal) {
        let mouseDownTarget = null;
        
        modal.addEventListener('mousedown', (e) => {
            mouseDownTarget = e.target;
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal && mouseDownTarget === modal) {
                closeEditModal();
            }
        });
    }
    
    // Save button
    const saveBtn = document.getElementById('saveNoteBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveNote);
    }
    
    // Delete button
    const deleteBtn = document.getElementById('deleteNoteBtn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', deleteNoteFromModal);
    }
    
    // ESC to close modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const modal = document.getElementById('editModal');
            if (modal && modal.style.display === 'flex') {
                closeEditModal();
            }
        }
    });
    
    // Settings screen event listeners
    const settingsBackBtn = document.getElementById('settingsBackBtn');
    if (settingsBackBtn) {
        settingsBackBtn.addEventListener('click', hideSettingsScreen);
    }
    
    const saveColorsBtn = document.getElementById('saveColors');
    if (saveColorsBtn) {
        saveColorsBtn.addEventListener('click', saveColorSettings);
    }
    
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
});


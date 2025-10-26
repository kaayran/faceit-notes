// Notes management module

let allNotes = {};
let filteredNotes = {};
let currentEditingNickname = null;

/**
 * Load and display all notes
 */
async function loadAllNotes() {
    allNotes = await loadNotes();
    filteredNotes = { ...allNotes };
    renderNotes();
}

/**
 * Render notes list
 */
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
    
    // Sort by nickname (from data, not key)
    entries.sort((a, b) => {
        const nicknameA = a[1].nickname || a[0];
        const nicknameB = b[1].nickname || b[0];
        return nicknameA.localeCompare(nicknameB);
    });
    
    notesList.innerHTML = entries.map(([playerId, data]) => {
        const nickname = data.nickname || playerId; // Fallback to playerId if no nickname
        const previousNickname = data.previousNickname;
        const preview = data.text.length > 40 ? data.text.substring(0, 40) + '...' : data.text;
        
        // Show both nicknames if changed
        let nicknameDisplay = escapeHtml(nickname);
        if (previousNickname && previousNickname !== nickname) {
            nicknameDisplay = `${escapeHtml(nickname)} <span class="nickname-previous">(was: ${escapeHtml(previousNickname)})</span>`;
        }
        
        return `
            <div class="note-item">
                <div class="note-info">
                    <div class="note-nickname">${nicknameDisplay}</div>
                    <div class="note-preview">${escapeHtml(preview)}</div>
                </div>
                <div class="note-actions">
                    <button class="note-btn edit" data-player-id="${escapeHtml(playerId)}" data-nickname="${escapeHtml(nickname)}" title="Edit">Edit</button>
                    <button class="note-btn delete" data-player-id="${escapeHtml(playerId)}" data-nickname="${escapeHtml(nickname)}" title="Delete">&times;</button>
                </div>
            </div>
        `;
    }).join('');
    
    // Add click handlers
    document.querySelectorAll('.note-btn.edit').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const playerId = btn.getAttribute('data-player-id');
            const nickname = btn.getAttribute('data-nickname');
            openEditModal(playerId, nickname);
        });
    });
    
    document.querySelectorAll('.note-btn.delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const playerId = btn.getAttribute('data-player-id');
            const nickname = btn.getAttribute('data-nickname');
            deleteNoteDirectly(playerId, nickname, btn);
        });
    });
}

/**
 * Filter notes by search term
 */
function filterNotes(searchTerm) {
    if (!searchTerm.trim()) {
        filteredNotes = { ...allNotes };
    } else {
        const term = searchTerm.toLowerCase();
        filteredNotes = {};
        
        for (const [playerId, data] of Object.entries(allNotes)) {
            const nickname = data.nickname || playerId;
            if (nickname.toLowerCase().includes(term) || data.text.toLowerCase().includes(term)) {
                filteredNotes[playerId] = data;
            }
        }
    }
    
    renderNotes();
}

/**
 * Delete note directly from list (with confirmation)
 */
const deleteStates = new Map();

async function deleteNoteDirectly(playerId, nickname, btn) {
    const key = playerId;
    
    if (!deleteStates.has(key)) {
        deleteStates.set(key, true);
        btn.textContent = '?';
        btn.style.color = '#dc3545';
        btn.style.borderColor = '#dc3545';
        
        setTimeout(() => {
            if (deleteStates.has(key)) {
                deleteStates.delete(key);
                btn.textContent = '×';
                btn.style.color = '';
                btn.style.borderColor = '';
            }
        }, 3000);
    } else {
        deleteStates.delete(key);
        
        delete allNotes[playerId];
        await saveNotes(allNotes);
        
        const searchTerm = document.getElementById('searchInput')?.value || '';
        filterNotes(searchTerm);
    }
}

/**
 * Open edit modal
 */
function openEditModal(playerId, nickname) {
    currentEditingNickname = playerId; // Store playerId for editing
    const modal = document.getElementById('editModal');
    const nicknameEl = document.getElementById('editNickname');
    const textarea = document.getElementById('editTextarea');
    
    const data = allNotes[playerId];
    const noteText = data ? data.text : '';
    
    nicknameEl.textContent = nickname; // Display nickname to user
    textarea.value = noteText;
    
    modal.style.display = 'flex';
    textarea.focus();
}

/**
 * Close edit modal
 */
function closeEditModal() {
    const modal = document.getElementById('editModal');
    modal.style.display = 'none';
    currentEditingNickname = null;
    
    // Reset delete button state
    const deleteBtn = document.getElementById('deleteNoteBtn');
    deleteBtn.textContent = chrome.i18n.getMessage('deleteButton') || 'Delete';
    deleteBtn.style.color = '';
    deleteBtn.style.borderColor = '';
    deleteConfirmed = false;
    if (deleteTimeout) clearTimeout(deleteTimeout);
}

/**
 * Save note from modal
 */
async function saveNote() {
    if (!currentEditingNickname) return; // currentEditingNickname actually stores playerId
    
    const playerId = currentEditingNickname;
    const textarea = document.getElementById('editTextarea');
    const note = textarea.value.trim();
    
    if (note) {
        const existingData = allNotes[playerId] || {};
        allNotes[playerId] = {
            text: note,
            nickname: existingData.nickname, // Preserve nickname
            timestamp: Date.now()
        };
    } else {
        delete allNotes[playerId];
    }
    
    await saveNotes(allNotes);
    
    const searchTerm = document.getElementById('searchInput').value;
    filterNotes(searchTerm);
    
    closeEditModal();
}

/**
 * Delete note from modal (with confirmation)
 */
let deleteConfirmed = false;
let deleteTimeout = null;

async function deleteNoteFromModal() {
    if (!currentEditingNickname) return; // currentEditingNickname actually stores playerId
    
    const playerId = currentEditingNickname;
    const deleteBtn = document.getElementById('deleteNoteBtn');
    
    if (!deleteConfirmed) {
        deleteConfirmed = true;
        deleteBtn.textContent = chrome.i18n.getMessage('deleteConfirm') || 'Sure?';
        deleteBtn.style.color = '#dc3545';
        deleteBtn.style.borderColor = '#dc3545';
        
        deleteTimeout = setTimeout(() => {
            deleteConfirmed = false;
            deleteBtn.textContent = chrome.i18n.getMessage('deleteButton') || 'Delete';
            deleteBtn.style.color = '';
            deleteBtn.style.borderColor = '';
        }, 3000);
    } else {
        clearTimeout(deleteTimeout);
        
        delete allNotes[playerId];
        await saveNotes(allNotes);
        
        const searchTerm = document.getElementById('searchInput')?.value || '';
        filterNotes(searchTerm);
        
        deleteConfirmed = false;
        closeEditModal();
    }
}

/**
 * Initialize notes screen event listeners
 */
function initNotesListeners() {
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
}


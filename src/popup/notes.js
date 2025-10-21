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

/**
 * Filter notes by search term
 */
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

/**
 * Delete note directly from list (with confirmation)
 */
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
        await saveNotes(allNotes);
        
        const searchTerm = document.getElementById('searchInput').value;
        filterNotes(searchTerm);
    }
}

/**
 * Open edit modal
 */
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

/**
 * Close edit modal
 */
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

/**
 * Save note from modal
 */
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
        await saveNotes(allNotes);
        
        const searchTerm = document.getElementById('searchInput').value;
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


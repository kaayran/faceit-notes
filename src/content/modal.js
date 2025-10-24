// Modal management module for content script

/**
 * Open note modal
 */
async function openNoteModal(nickname, playerId = null) {
    const existingModal = document.getElementById('faceit-notes-modal');
    if (existingModal) {
        existingModal.remove();
    }
    
    const modal = document.createElement('div');
    modal.id = 'faceit-notes-modal';
    modal.className = 'faceit-notes-modal';
    
    // Try to get playerId if not provided
    let actualPlayerId = playerId || getPlayerIdByNickname(nickname);
    let actualNickname = nickname;
    
    console.log(`[Modal] ========== OPENING MODAL ==========`);
    console.log(`[Modal] Nickname: "${nickname}"`);
    console.log(`[Modal] PlayerId passed: ${playerId || 'null'}`);
    console.log(`[Modal] PlayerId from mapping: ${getPlayerIdByNickname(nickname) || 'null'}`);
    console.log(`[Modal] Final playerId: ${actualPlayerId || 'NOT FOUND'}`);
    
    // Show warning if no playerId
    if (!actualPlayerId) {
        console.warn(`[Modal] ⚠️ WARNING: No playerId found for ${nickname}`);
    }
    
    // Get current note by playerId if available, otherwise by nickname
    let currentNote = '';
    if (actualPlayerId) {
        currentNote = getPlayerNoteById(actualPlayerId);
        console.log(`[Modal] Loading note by playerId (${actualPlayerId})`);
    } else {
        currentNote = getPlayerNote(actualNickname);
        console.log(`[Modal] Loading note by nickname (${actualNickname}) [fallback]`);
    }
    
    const placeholder = chrome.i18n.getMessage('addNotePlaceholder') || 'Add note...';
    const deleteText = chrome.i18n.getMessage('deleteButton') || 'Delete';
    const saveText = chrome.i18n.getMessage('saveButton') || 'Save';
    
    modal.innerHTML = `
        <div class="faceit-notes-modal-content">
            <div class="faceit-notes-modal-header">
                <span class="faceit-notes-nickname">${escapeHtml(actualNickname)}</span>
                <button class="faceit-notes-close">✕</button>
            </div>
            <textarea 
                id="faceit-notes-textarea" 
                placeholder="${placeholder}"
            >${currentNote}</textarea>
            <div class="faceit-notes-modal-footer">
                <button id="deleteNoteBtn" class="faceit-notes-btn-delete">${deleteText}</button>
                <button id="saveNoteBtn" class="faceit-notes-btn-save">${saveText}</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    const closeBtn = modal.querySelector('.faceit-notes-close');
    const saveBtn = modal.querySelector('#saveNoteBtn');
    const deleteBtn = modal.querySelector('#deleteNoteBtn');
    const textarea = modal.querySelector('#faceit-notes-textarea');
    
    const closeModal = () => {
        if (deleteTimeout) {
            clearTimeout(deleteTimeout);
        }
        modal.remove();
    };
    
    closeBtn.addEventListener('click', closeModal);
    
    // Track where mousedown started to prevent accidental closes
    let mouseDownTarget = null;
    
    modal.addEventListener('mousedown', (e) => {
        mouseDownTarget = e.target;
    });
    
    modal.addEventListener('click', (e) => {
        // Only close if both mousedown and click happened on the modal overlay
        if (e.target === modal && mouseDownTarget === modal) {
            closeModal();
        }
    });
    
    saveBtn.addEventListener('click', async () => {
        const note = textarea.value;
        
        console.log(`[Modal] ========== SAVE BUTTON CLICKED ==========`);
        console.log(`[Modal] Nickname: "${actualNickname}"`);
        console.log(`[Modal] PlayerId: ${actualPlayerId || 'null'}`);
        console.log(`[Modal] Note length: ${note.length} chars`);
        
        // Pass playerId if available, otherwise will fallback to nickname
        await savePlayerNote(actualNickname, note, actualPlayerId);
        closeModal();
        updateNotesButtons();
    });
    
    // Double-click delete confirmation
    let deleteConfirmed = false;
    let deleteTimeout = null;
    const originalDeleteText = deleteBtn.textContent;
    
    deleteBtn.addEventListener('click', async () => {
        if (!deleteConfirmed) {
            // First click - ask for confirmation
            deleteConfirmed = true;
            deleteBtn.textContent = chrome.i18n.getMessage('deleteConfirm') || 'Sure?';
            deleteBtn.style.color = '#dc3545';
            deleteBtn.style.borderColor = '#dc3545';
            
            // Reset after 3 seconds if not confirmed
            deleteTimeout = setTimeout(() => {
                deleteConfirmed = false;
                deleteBtn.textContent = originalDeleteText;
                deleteBtn.style.color = '';
                deleteBtn.style.borderColor = '';
            }, 3000);
        } else {
            // Second click - actually delete
            clearTimeout(deleteTimeout);
            await savePlayerNote(actualNickname, '', actualPlayerId);
            closeModal();
            updateNotesButtons();
        }
    });
    
    const escHandler = (e) => {
        if (e.key === 'Escape') {
            closeModal();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
    
    textarea.focus();
}


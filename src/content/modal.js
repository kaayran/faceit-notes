// Modal management module for content script

/**
 * Open note modal
 */
function openNoteModal(nickname) {
    const existingModal = document.getElementById('faceit-notes-modal');
    if (existingModal) {
        existingModal.remove();
    }
    
    const modal = document.createElement('div');
    modal.id = 'faceit-notes-modal';
    modal.className = 'faceit-notes-modal';
    
    const currentNote = getPlayerNote(nickname);
    
    modal.innerHTML = `
        <div class="faceit-notes-modal-content">
            <div class="faceit-notes-modal-header">
                <span class="faceit-notes-nickname">${nickname}</span>
                <button class="faceit-notes-close">✕</button>
            </div>
            <textarea 
                id="faceit-notes-textarea" 
                placeholder="Add note..."
            >${currentNote}</textarea>
            <div class="faceit-notes-modal-footer">
                <button id="deleteNoteBtn" class="faceit-notes-btn-delete">Delete</button>
                <button id="saveNoteBtn" class="faceit-notes-btn-save">Save</button>
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
        await savePlayerNote(nickname, note);
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
            deleteBtn.textContent = 'Sure?';
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
            await savePlayerNote(nickname, '');
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


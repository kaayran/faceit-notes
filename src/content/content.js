let playerNotes = {};

async function loadNotes() {
    const result = await chrome.storage.local.get('playerNotes');
    playerNotes = result.playerNotes || {};
}

async function saveNotes() {
    await chrome.storage.local.set({ playerNotes });
}

function getPlayerNote(nickname) {
    return playerNotes[nickname] || '';
}

async function savePlayerNote(nickname, note) {
    if (note.trim()) {
        playerNotes[nickname] = note.trim();
    } else {
        delete playerNotes[nickname];
    }
    await saveNotes();
}

function createNoteButton(nickname) {
    const button = document.createElement('button');
    button.className = 'faceit-notes-btn';
    
    const hasNote = getPlayerNote(nickname);
    if (hasNote) {
        button.classList.add('has-note');
        button.innerHTML = '📝';
        button.title = `${nickname}: ${hasNote}`;
    } else {
        button.innerHTML = '📝';
        button.title = `Add note for ${nickname}`;
    }
    
    button.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        openNoteModal(nickname);
    });
    
    let tooltip = null;
    
    button.addEventListener('mouseenter', (e) => {
        const currentNote = getPlayerNote(nickname);
        
        if (currentNote) {
            tooltip = createTooltip(nickname, currentNote);
            document.body.appendChild(tooltip);
            
            const rect = button.getBoundingClientRect();
            tooltip.style.left = rect.left + 'px';
            tooltip.style.top = (rect.top - tooltip.offsetHeight - 8) + 'px';
        }
    });
    
    button.addEventListener('mouseleave', () => {
        if (tooltip) {
            tooltip.remove();
            tooltip = null;
        }
    });
    
    return button;
}

function createTooltip(nickname, note) {
    const tooltip = document.createElement('div');
    tooltip.className = 'faceit-notes-tooltip';
    
    const header = document.createElement('div');
    header.className = 'faceit-notes-tooltip-header';
    header.textContent = nickname;
    
    const content = document.createElement('div');
    content.className = 'faceit-notes-tooltip-content';
    content.textContent = note;
    
    tooltip.appendChild(header);
    tooltip.appendChild(content);
    
    return tooltip;
}

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
                <h2>📝 ${nickname}</h2>
                <button class="faceit-notes-close">&times;</button>
            </div>
            <div class="faceit-notes-modal-body">
                <textarea 
                    id="faceit-notes-textarea" 
                    placeholder="Write your notes about ${nickname}..."
                    rows="10"
                >${currentNote}</textarea>
            </div>
            <div class="faceit-notes-modal-footer">
                <button class="faceit-notes-btn-delete">Delete</button>
                <button class="faceit-notes-btn-save">Save</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    const closeBtn = modal.querySelector('.faceit-notes-close');
    const saveBtn = modal.querySelector('.faceit-notes-btn-save');
    const deleteBtn = modal.querySelector('.faceit-notes-btn-delete');
    const textarea = modal.querySelector('#faceit-notes-textarea');
    
    const closeModal = () => modal.remove();
    
    closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
    
    saveBtn.addEventListener('click', async () => {
        const note = textarea.value;
        await savePlayerNote(nickname, note);
        closeModal();
        updateNotesButtons();
    });
    
    deleteBtn.addEventListener('click', async () => {
        if (confirm(`Delete note for ${nickname}?`)) {
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

function updateNotesButtons() {
    document.querySelectorAll('.faceit-notes-btn').forEach(button => {
        const nickname = button.getAttribute('data-nickname');
        const hasNote = getPlayerNote(nickname);
        
        if (hasNote) {
            button.classList.add('has-note');
            button.innerHTML = '📝';
            button.title = `${nickname}: ${hasNote}`;
        } else {
            button.classList.remove('has-note');
            button.innerHTML = '📝';
            button.title = `Add note for ${nickname}`;
        }
    });
}

let processedElements = new WeakSet();

function isProcessed(element) {
    return processedElements.has(element);
}

function markAsProcessed(element) {
    processedElements.add(element);
}

function clearProcessedElements() {
    processedElements = new WeakSet();
}

function waitForElement(selector, conditionFn, callback, maxAttempts = 50) {
    let attempts = 0;
    
    const checkElement = () => {
        const elements = document.querySelectorAll(selector);
        
        for (const element of elements) {
            if (conditionFn(element)) {
                callback(element);
                return true;
            }
        }
        
        attempts++;
        if (attempts < maxAttempts) {
            setTimeout(checkElement, 100);
        }
        return false;
    };
    
    checkElement();
}

function findPlayerCardInMatchRoom(nickname, callback) {
    const nickNodeSelector = 'div[class*="styles__PopoverStyled"] > div[class*=styles__FixedContainer] > div[class*=styles__NameContainer] > h5';
    
    waitForElement(
        nickNodeSelector,
        (node) => node.innerText?.trim() === nickname,
        (nicknameNode) => {
            const container = nicknameNode.parentElement?.parentElement?.parentElement?.querySelector('div[class*=styles__ScrollableContainer] > div[class*=RatingsAndStats__Container]');
            
            if (container && !isProcessed(container)) {
                markAsProcessed(container);
                callback(container, nickname);
            }
        }
    );
}

function addNotesButtonsToMatchRoom() {
    const playerLinks = document.querySelectorAll('a[href*="/players/"]');
    const processedNicknames = new Set();
    
    playerLinks.forEach(link => {
        const match = link.href.match(/\/players\/([^/?]+)/);
        if (!match) return;
        
        const nickname = decodeURIComponent(match[1]);
        
        if (processedNicknames.has(nickname)) return;
        processedNicknames.add(nickname);
        
        findPlayerCardInMatchRoom(nickname, (container, nick) => {
            addButtonToElement(container, nick);
        });
    });
}

function addNoteButtons() {
    const processedPlayers = new Set();
    
    const playerContainers = document.querySelectorAll('div[class*="ListContentPlayer"], div[class*="StyledListContentPlayer"]');
    
    playerContainers.forEach((container, index) => {
        if (isProcessed(container)) return;
        
        const nicknameElement = container.querySelector('div[class*="Nickname__Container"]');
        
        if (!nicknameElement) {
            return;
        }
        
        const nickname = nicknameElement.textContent?.trim();
        
        if (!nickname || nickname.length === 0) {
            return;
        }
        
        if (processedPlayers.has(nickname)) {
            return;
        }
        
        markAsProcessed(container);
        addButtonToElement(container, nickname);
        processedPlayers.add(nickname);
    });
    
    const popoverNicknames = document.querySelectorAll('div[class*="styles__PopoverStyled"] > div[class*=styles__FixedContainer] > div[class*=styles__NameContainer] > h5');
    
    popoverNicknames.forEach(nicknameElement => {
        const nickname = nicknameElement.innerText?.trim();
        if (!nickname || processedPlayers.has(nickname)) return;
        
        const scrollableContainer = nicknameElement.parentElement?.parentElement?.parentElement?.querySelector('div[class*=styles__ScrollableContainer]');
        const container = scrollableContainer?.querySelector('div[class*=RatingsAndStats__Container]');
        
        if (container && !isProcessed(container)) {
            markAsProcessed(container);
            addButtonToElement(container, nickname);
            processedPlayers.add(nickname);
        }
    });
    
    const rosterPlayers = document.querySelectorAll('div[class*="roster"] a[href*="/players/"]');
    
    rosterPlayers.forEach(link => {
        const match = link.href.match(/\/players\/([^/?]+)/);
        if (!match) return;
        
        const nickname = decodeURIComponent(match[1]);
        if (processedPlayers.has(nickname)) return;
        
        const container = link.closest('div[class*="player"]') || link.parentElement;
        
        if (container && !isProcessed(container)) {
            markAsProcessed(container);
            addButtonToElement(container, nickname);
            processedPlayers.add(nickname);
        }
    });
}

function addButtonToElement(container, nickname) {
    const existingButton = document.querySelector(`.faceit-notes-btn[data-nickname="${nickname}"]`);
    if (existingButton) return;
    
    if (container.querySelector('.faceit-notes-btn')) return;
    
    const button = createNoteButton(nickname);
    button.setAttribute('data-nickname', nickname);
    
    const background = container.querySelector('div[class*="ListContentPlayer__Background"]');
    
    if (background) {
        background.insertAdjacentElement('beforebegin', button);
    } else {
        container.insertAdjacentElement('beforebegin', button);
    }
}

// Extension state management
let isExtensionEnabled = true;
let observer = null;

async function checkExtensionState() {
    const result = await chrome.storage.local.get('extensionEnabled');
    isExtensionEnabled = result.extensionEnabled !== false; // Default to true
    return isExtensionEnabled;
}

function setupObserver() {
    if (observer) {
        observer.disconnect();
    }
    
    observer = new MutationObserver((mutations) => {
        if (!isExtensionEnabled) return;
        
        let shouldUpdate = false;
        
        for (const mutation of mutations) {
            if (mutation.addedNodes.length > 0) {
                shouldUpdate = true;
                break;
            }
        }
        
        if (shouldUpdate) {
            addNoteButtons();
            
            if (window.location.href.includes('/room/')) {
                addNotesButtonsToMatchRoom();
            }
        }
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

function enableExtension() {
    isExtensionEnabled = true;
    
    // Clear processed elements to re-process all elements
    clearProcessedElements();
    
    // Add buttons and setup observer
    addNoteButtons();
    setupObserver();
    
    if (window.location.href.includes('/room/')) {
        addNotesButtonsToMatchRoom();
    }
}

function disableExtension() {
    if (isExtensionEnabled) {
        isExtensionEnabled = false;
        
        // Disconnect observer
        if (observer) {
            observer.disconnect();
            observer = null;
        }
        
        // Remove all note buttons
        document.querySelectorAll('.faceit-notes-btn').forEach(btn => btn.remove());
        
        // Remove any open modals
        const modal = document.getElementById('faceit-notes-modal');
        if (modal) {
            modal.remove();
        }
        
        // Clear processed elements for clean re-enable
        clearProcessedElements();
    }
}

// Listen for state changes from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'EXTENSION_STATE_CHANGED') {
        if (message.enabled) {
            enableExtension();
        } else {
            disableExtension();
        }
    }
});

async function init() {
    await loadNotes();
    const enabled = await checkExtensionState();
    
    if (enabled) {
        enableExtension();
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

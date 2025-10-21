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
    const container = document.createElement('div');
    container.className = 'faceit-notes-btn';
    
    const hasNote = getPlayerNote(nickname);
    
    // Create SVG icon
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '16');
    svg.setAttribute('height', '16');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    
    if (hasNote) {
        container.classList.add('has-note');
        // Notepad with lines icon
        svg.innerHTML = `
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="9" y1="15" x2="15" y2="15"></line>
            <line x1="9" y1="11" x2="15" y2="11"></line>
        `;
    } else {
        // Empty notepad icon
        svg.innerHTML = `
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="12" y1="18" x2="12" y2="12"></line>
            <line x1="9" y1="15" x2="15" y2="15"></line>
        `;
    }
    
    container.appendChild(svg);
    
    container.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        openNoteModal(nickname);
    });
    
    let tooltip = null;
    let tooltipTimeout = null;
    
    container.addEventListener('mouseenter', (e) => {
        const currentNote = getPlayerNote(nickname);
        
        // Show tooltip after short delay for better UX
        tooltipTimeout = setTimeout(() => {
            tooltip = createTooltip(nickname, currentNote);
            document.body.appendChild(tooltip);
            
            const rect = container.getBoundingClientRect();
            const tooltipRect = tooltip.getBoundingClientRect();
            
            // Position tooltip - center it above the icon
            let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
            let top = rect.top - tooltipRect.height - 8;
            
            // Keep tooltip on screen
            if (left < 10) left = 10;
            if (left + tooltipRect.width > window.innerWidth - 10) {
                left = window.innerWidth - tooltipRect.width - 10;
            }
            if (top < 10) {
                top = rect.bottom + 8; // Show below if not enough space above
            }
            
            tooltip.style.left = left + 'px';
            tooltip.style.top = top + 'px';
        }, 300); // 300ms delay
    });
    
    container.addEventListener('mouseleave', () => {
        if (tooltipTimeout) {
            clearTimeout(tooltipTimeout);
            tooltipTimeout = null;
        }
        if (tooltip) {
            tooltip.remove();
            tooltip = null;
        }
    });
    
    return container;
}

function createTooltip(nickname, note) {
    const tooltip = document.createElement('div');
    tooltip.className = 'faceit-notes-tooltip';
    
    if (note) {
        // Show note preview
        const preview = note.length > 100 ? note.substring(0, 100) + '...' : note;
        tooltip.textContent = preview;
    } else {
        // Show hint to add note
        tooltip.textContent = 'Click to add note';
    }
    
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
                <span class="faceit-notes-nickname">${nickname}</span>
                <button class="faceit-notes-close">✕</button>
            </div>
            <textarea 
                id="faceit-notes-textarea" 
                placeholder="Add note..."
            >${currentNote}</textarea>
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
        
        const svg = button.querySelector('svg');
        if (!svg) return;
        
        if (hasNote) {
            button.classList.add('has-note');
            // Notepad with lines icon (has note)
            svg.innerHTML = `
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="9" y1="15" x2="15" y2="15"></line>
                <line x1="9" y1="11" x2="15" y2="11"></line>
            `;
        } else {
            button.classList.remove('has-note');
            // Empty notepad icon (no note)
            svg.innerHTML = `
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="12" y1="18" x2="12" y2="12"></line>
                <line x1="9" y1="15" x2="15" y2="15"></line>
            `;
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
    // Check if button already exists in container or its EndSlotContainer
    const existingButton = container.querySelector('.faceit-notes-btn');
    if (existingButton) return;
    
    // Remove any old buttons with same nickname that are NOT inside THIS container
    const allButtons = document.querySelectorAll(`.faceit-notes-btn[data-nickname="${nickname}"]`);
    allButtons.forEach(btn => {
        // Only remove if it's not inside the current container
        if (!container.contains(btn)) {
            btn.remove();
        }
    });
    
    const icon = createNoteButton(nickname);
    icon.setAttribute('data-nickname', nickname);
    
    // Try to find EndSlotContainer first (preferred location)
    const endSlotContainer = container.querySelector('div[class*="EndSlotContainer"]');
    
    if (endSlotContainer) {
        // Insert as FIRST element in EndSlotContainer using prepend - looks native!
        endSlotContainer.prepend(icon);
    } else {
        // Fallback: append to container (will be positioned absolutely in top-right)
        icon.classList.add('absolute-positioned');
        container.appendChild(icon);
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

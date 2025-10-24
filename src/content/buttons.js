// Buttons management module

let processedElements = new WeakSet();

/**
 * Check if element was processed
 */
function isProcessed(element) {
    return processedElements.has(element);
}

/**
 * Mark element as processed
 */
function markAsProcessed(element) {
    processedElements.add(element);
}

/**
 * Clear processed elements
 */
function clearProcessedElements() {
    // WeakSet doesn't have clear(), so we recreate it
    processedElements = new WeakSet();
}

/**
 * Create note button/icon
 */
function createNoteButton(nickname, playerId = null) {
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
    
    // Store playerId on the button element for later retrieval
    if (playerId) {
        container.setAttribute('data-player-id', playerId);
    }
    
    container.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Get playerId from attribute or lookup
        const storedPlayerId = container.getAttribute('data-player-id') || getPlayerIdByNickname(nickname);
        await openNoteModal(nickname, storedPlayerId);
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

/**
 * Create tooltip
 */
function createTooltip(nickname, note) {
    const tooltip = document.createElement('div');
    tooltip.className = 'faceit-notes-tooltip';
    
    if (note) {
        // Show note preview
        const preview = note.length > 100 ? note.substring(0, 100) + '...' : note;
        tooltip.textContent = preview;
    } else {
        // Show hint to add note
        tooltip.textContent = chrome.i18n.getMessage('clickToAddNote') || 'Click to add note';
    }
    
    return tooltip;
}

/**
 * Update all note buttons
 */
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

/**
 * Add button to element
 */
function addButtonToElement(container, nickname, playerId = null) {
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
    
    // If playerId not provided, try to get it from mapping
    const actualPlayerId = playerId || getPlayerIdByNickname(nickname);
    
    const icon = createNoteButton(nickname, actualPlayerId);
    icon.setAttribute('data-nickname', nickname);
    if (actualPlayerId) {
        icon.setAttribute('data-player-id', actualPlayerId);
    }
    
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


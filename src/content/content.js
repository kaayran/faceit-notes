// Main content script - initialization and observers

let isExtensionEnabled = true;
let observer = null;

/**
 * Wait for element with condition
 */
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

/**
 * Find player card in match room
 */
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

/**
 * Add notes buttons to match room
 */
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

/**
 * Add note buttons to player containers
 */
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
        
        const scrollableContainer = nicknameElement.parentElement?.parentElement?.parentElement?.querySelector('div[class*="styles__ScrollableContainer"]');
        const container = scrollableContainer?.querySelector('div[class*="RatingsAndStats__Container"]');
        
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

/**
 * Setup mutation observer
 */
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

/**
 * Enable extension
 */
function enableExtension() {
    isExtensionEnabled = true;
    
    // Remove any old buttons first (cleanup from previous versions)
    document.querySelectorAll('.faceit-notes-btn').forEach(btn => btn.remove());
    
    // Clear processed elements to re-process all elements
    clearProcessedElements();
    
    // Add buttons and setup observer
    addNoteButtons();
    setupObserver();
    
    if (window.location.href.includes('/room/')) {
        addNotesButtonsToMatchRoom();
    }
}

/**
 * Disable extension
 */
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

/**
 * Check extension state
 */
async function checkExtensionState() {
    const result = await chrome.storage.local.get('extensionEnabled');
    isExtensionEnabled = result.extensionEnabled !== false; // Default to true
    return isExtensionEnabled;
}

/**
 * Load and apply colors
 */
async function loadAndApplyColors() {
    const colors = await loadColors();
    applyColorsToDocument(colors);
}

/**
 * Listen for messages
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'EXTENSION_STATE_CHANGED') {
        if (message.enabled) {
            enableExtension();
        } else {
            disableExtension();
        }
    }
    
    if (message.type === 'UPDATE_COLORS') {
        applyColorsToDocument(message.colors);
    }
});

/**
 * Load match players and update mappings
 */
async function loadMatchPlayers() {
    // Check if we're in a match room
    const matchId = getCurrentMatchId();
    
    if (!matchId) {
        return;
    }
    
    try {
        const players = await loadPlayersFromCurrentMatch();
        
        if (players && players.length > 0) {
            // Update player mappings from API data
            updatePlayerMappingsFromApi(players);
            
            // Now add buttons (mapping is ready)
            setTimeout(() => {
                addNotesButtonsToMatchRoom();
            }, 500);
        }
    } catch (error) {
        console.error('Failed to load match players:', error);
    }
}

/**
 * Setup URL change detection
 */
function setupUrlChangeDetection() {
    let lastUrl = window.location.href;
    
    // Detect URL changes (for SPA navigation)
    const urlObserver = new MutationObserver(() => {
        const currentUrl = window.location.href;
        
        if (currentUrl !== lastUrl) {
            lastUrl = currentUrl;
            
            // If navigated to a match room, load players
            if (currentUrl.includes('/room/')) {
                loadMatchPlayers();
            }
        }
    });
    
    urlObserver.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    // Also listen to popstate for back/forward navigation
    window.addEventListener('popstate', () => {
        if (window.location.href.includes('/room/')) {
            loadMatchPlayers();
        }
    });
}

/**
 * Initialize
 */
async function init() {
    await loadNotes();
    await loadAndApplyColors();
    const enabled = await checkExtensionState();
    
    if (enabled) {
        enableExtension();
    }
    
    // Setup URL change detection
    setupUrlChangeDetection();
    
    // If already in a match room, load players immediately
    if (window.location.href.includes('/room/')) {
        await loadMatchPlayers();
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

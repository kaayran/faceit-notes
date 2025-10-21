// Main popup script - navigation and initialization

/**
 * Show notes screen
 */
function showNotesScreen() {
    document.body.classList.add('notes-view');
    document.getElementById('mainScreen').style.display = 'none';
    document.getElementById('notesScreen').style.display = 'block';
    loadAllNotes();
}

/**
 * Show main screen
 */
function showMainScreen() {
    document.body.classList.remove('notes-view');
    document.getElementById('mainScreen').style.display = 'block';
    document.getElementById('notesScreen').style.display = 'none';
}

/**
 * Initialize extension toggle
 */
async function initExtensionToggle() {
    const toggle = document.getElementById('extensionToggle');
    const statusText = document.getElementById('toggleStatus');
    
    // Load current state
    const result = await chrome.storage.local.get('extensionEnabled');
    const isEnabled = result.extensionEnabled !== false;
    
    toggle.checked = isEnabled;
    updateToggleStatus(isEnabled);
    
    // Handle toggle change
    toggle.addEventListener('change', async function() {
        const enabled = this.checked;
        await chrome.storage.local.set({ extensionEnabled: enabled });
        updateToggleStatus(enabled);
        
        // Notify all tabs
        chrome.tabs.query({}, (tabs) => {
            tabs.forEach(tab => {
                chrome.tabs.sendMessage(tab.id, {
                    type: 'EXTENSION_STATE_CHANGED',
                    enabled: enabled
                }).catch(() => {});
            });
        });
    });
}

/**
 * Update toggle status text
 */
function updateToggleStatus(enabled) {
    const statusText = document.getElementById('toggleStatus');
    const enabledText = chrome.i18n.getMessage('statusEnabled') || 'Enabled';
    const disabledText = chrome.i18n.getMessage('statusDisabled') || 'Disabled';
    
    if (enabled) {
        statusText.textContent = enabledText;
        statusText.className = 'toggle-status enabled';
    } else {
        statusText.textContent = disabledText;
        statusText.className = 'toggle-status disabled';
    }
}

/**
 * Apply localization
 */
function applyLocalization() {
    // Apply text content
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        const message = chrome.i18n.getMessage(key);
        if (message) {
            element.textContent = message;
        }
    });
    
    // Apply placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
        const key = element.getAttribute('data-i18n-placeholder');
        const message = chrome.i18n.getMessage(key);
        if (message) {
            element.placeholder = message;
        }
    });
}

/**
 * Initialize main screen buttons
 */
function initMainButtons() {
    const viewNotesBtn = document.getElementById('viewNotes');
    const settingsBtn = document.getElementById('settings');

    viewNotesBtn.addEventListener('click', showNotesScreen);
    settingsBtn.addEventListener('click', showSettingsScreen);
}

/**
 * Main initialization
 */
document.addEventListener('DOMContentLoaded', async function() {
    // Apply localization
    applyLocalization();
    
    // Initialize extension toggle
    await initExtensionToggle();
    
    // Initialize main buttons
    initMainButtons();
    
    // Initialize notes module
    initNotesListeners();
    
    // Initialize settings module
    initSettingsListeners();
    
    // Load and apply colors
    await loadAndApplyColors();
});

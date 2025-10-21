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
        console.log('View notes clicked');
        // Add your logic here
    });

    settingsBtn.addEventListener('click', function() {
        console.log('Settings clicked');
        // Add your logic here
    });
});


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

document.addEventListener('DOMContentLoaded', function() {
    // Load translations
    loadLocalization();

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


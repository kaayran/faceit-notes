// Shared colors module

const DEFAULT_COLORS = {
    noNote: '#888888',
    withNote: '#4caf50'
};

/**
 * Lighten color by percentage
 */
function lightenColor(hex, percent) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    
    const newR = Math.min(255, Math.floor(r + (255 - r) * (percent / 100)));
    const newG = Math.min(255, Math.floor(g + (255 - g) * (percent / 100)));
    const newB = Math.min(255, Math.floor(b + (255 - b) * (percent / 100)));
    
    return '#' + [newR, newG, newB].map(x => x.toString(16).padStart(2, '0')).join('');
}

/**
 * Load colors from storage
 */
async function loadColors() {
    const result = await chrome.storage.local.get('noteColors');
    return result.noteColors || DEFAULT_COLORS;
}

/**
 * Save colors to storage
 */
async function saveColors(colors) {
    await chrome.storage.local.set({ noteColors: colors });
}

/**
 * Apply colors to document
 */
function applyColorsToDocument(colors) {
    const hoverColor = lightenColor(colors.withNote, 15);
    
    document.documentElement.style.setProperty('--color-no-note', colors.noNote);
    document.documentElement.style.setProperty('--color-with-note', colors.withNote);
    document.documentElement.style.setProperty('--color-with-note-hover', hoverColor);
}

/**
 * Notify all tabs about color change
 */
function notifyTabsAboutColorChange(colors) {
    const hoverColor = lightenColor(colors.withNote, 15);
    
    chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
            chrome.tabs.sendMessage(tab.id, {
                type: 'UPDATE_COLORS',
                colors: {
                    ...colors,
                    withNoteHover: hoverColor
                }
            }).catch(() => {
                // Tab might not have content script
            });
        });
    });
}


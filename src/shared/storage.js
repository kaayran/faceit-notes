// Shared storage module for notes management

let cachedNotes = {};

/**
 * Load all notes from storage
 */
async function loadNotes() {
    const result = await chrome.storage.local.get('playerNotes');
    cachedNotes = result.playerNotes || {};
    return cachedNotes;
}

/**
 * Save all notes to storage
 */
async function saveNotes(notes) {
    cachedNotes = notes;
    await chrome.storage.local.set({ playerNotes: notes });
}

/**
 * Get note for specific player
 */
function getPlayerNote(nickname) {
    const data = cachedNotes[nickname];
    if (!data) return '';
    return data.text;
}

/**
 * Get full note data (with timestamp)
 */
function getPlayerNoteData(nickname) {
    return cachedNotes[nickname] || null;
}

/**
 * Save note for specific player
 */
async function savePlayerNote(nickname, noteText) {
    if (noteText.trim()) {
        cachedNotes[nickname] = {
            text: noteText.trim(),
            timestamp: Date.now()
        };
    } else {
        delete cachedNotes[nickname];
    }
    await chrome.storage.local.set({ playerNotes: cachedNotes });
}

/**
 * Delete note for specific player
 */
async function deletePlayerNote(nickname) {
    delete cachedNotes[nickname];
    await chrome.storage.local.set({ playerNotes: cachedNotes });
}

/**
 * Get all notes
 */
function getAllNotes() {
    return { ...cachedNotes };
}

/**
 * Get notes count
 */
function getNotesCount() {
    return Object.keys(cachedNotes).length;
}

/**
 * Check if player has note
 */
function hasNote(nickname) {
    return !!cachedNotes[nickname];
}


// Shared storage module for notes management

let cachedNotes = {}; // Stores notes by playerId: { playerId: { text, nickname, timestamp } }
let playerMapping = {}; // Maps nickname -> playerId for quick lookup

/**
 * Load all notes from storage
 */
async function loadNotes() {
    const result = await chrome.storage.local.get('playerNotes');
    cachedNotes = result.playerNotes || {};
    rebuildPlayerMapping();
    return cachedNotes;
}

/**
 * Rebuild player mapping from cached notes
 */
function rebuildPlayerMapping() {
    playerMapping = {};
    for (const [playerId, data] of Object.entries(cachedNotes)) {
        if (data.nickname) {
            playerMapping[data.nickname] = playerId;
        }
    }
}

/**
 * Save all notes to storage
 */
async function saveNotes(notes) {
    cachedNotes = notes;
    rebuildPlayerMapping();
    await chrome.storage.local.set({ playerNotes: notes });
}

/**
 * Update player mapping (when we learn player's ID from API)
 */
function updatePlayerMapping(nickname, playerId) {
    if (nickname && playerId) {
        playerMapping[nickname] = playerId;
        
        // If player has a note, update nickname in case it changed
        if (cachedNotes[playerId]) {
            cachedNotes[playerId].nickname = nickname;
        }
    }
}

/**
 * Get playerId from nickname
 */
function getPlayerIdByNickname(nickname) {
    return playerMapping[nickname] || null;
}

/**
 * Get note for specific player by nickname
 * @param {string} nickname - Player nickname
 * @returns {string} Note text or empty string
 */
function getPlayerNote(nickname) {
    const playerId = playerMapping[nickname];
    if (!playerId) return '';
    
    const data = cachedNotes[playerId];
    if (!data) return '';
    return data.text;
}

/**
 * Get note by playerId directly
 */
function getPlayerNoteById(playerId) {
    const data = cachedNotes[playerId];
    if (!data) return '';
    return data.text;
}

/**
 * Get full note data (with timestamp) by nickname
 */
function getPlayerNoteData(nickname) {
    const playerId = playerMapping[nickname];
    if (!playerId) return null;
    return cachedNotes[playerId] || null;
}

/**
 * Get full note data by playerId
 */
function getPlayerNoteDataById(playerId) {
    return cachedNotes[playerId] || null;
}

/**
 * Save note for specific player
 * @param {string} nickname - Player nickname (for display)
 * @param {string} noteText - Note text
 * @param {string} playerId - Optional player ID (if known from API)
 */
async function savePlayerNote(nickname, noteText, playerId = null) {
    // If playerId not provided, try to get it from mapping
    const actualPlayerId = playerId || playerMapping[nickname];
    
    // If still no playerId, use nickname as key (fallback for compatibility)
    const storageKey = actualPlayerId || nickname;
    
    if (!actualPlayerId) {
        console.warn(`[Storage] No playerId found for ${nickname}, using nickname as key (fallback)`);
    }
    
    if (noteText.trim()) {
        cachedNotes[storageKey] = {
            text: noteText.trim(),
            nickname: nickname,
            timestamp: Date.now()
        };
        if (actualPlayerId) {
            playerMapping[nickname] = actualPlayerId;
        } else {
            playerMapping[nickname] = nickname; // Map to itself for fallback
        }
    } else {
        delete cachedNotes[storageKey];
        delete playerMapping[nickname];
    }
    
    await chrome.storage.local.set({ playerNotes: cachedNotes });
}

/**
 * Delete note for specific player
 */
async function deletePlayerNote(nickname) {
    const playerId = playerMapping[nickname];
    
    if (playerId) {
        delete cachedNotes[playerId];
        delete playerMapping[nickname];
        await chrome.storage.local.set({ playerNotes: cachedNotes });
    }
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
 * Check if player has note (by nickname)
 */
function hasNote(nickname) {
    const playerId = playerMapping[nickname];
    return playerId ? !!cachedNotes[playerId] : false;
}

/**
 * Check if player has note (by playerId)
 */
function hasNoteById(playerId) {
    return !!cachedNotes[playerId];
}

/**
 * Update player mappings from API data
 * @param {Array} players - Array of player objects from API with {playerId, nickname}
 */
function updatePlayerMappingsFromApi(players) {
    for (const player of players) {
        const { playerId, nickname } = player;
        
        if (!playerId || !nickname) continue;
        
        // Update mapping
        playerMapping[nickname] = playerId;
        
        // If player has a note, update nickname in case it changed
        if (cachedNotes[playerId]) {
            cachedNotes[playerId].nickname = nickname;
        }
    }
    
    console.log('[Storage] Updated player mappings:', Object.keys(playerMapping));
}


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
    
    console.log(`[Storage] Getting note for "${nickname}", mapped playerId: ${playerId || 'null'}`);
    
    // Try by playerId first
    if (playerId && cachedNotes[playerId]) {
        console.log(`[Storage] ✓ Found note by playerId (${playerId})`);
        return cachedNotes[playerId].text;
    }
    
    // Fallback: check if note stored directly by nickname
    if (cachedNotes[nickname]) {
        console.log(`[Storage] ✓ Found note by nickname (${nickname}) [fallback]`);
        return cachedNotes[nickname].text;
    }
    
    console.log(`[Storage] ✗ No note found`);
    return '';
}

/**
 * Get note by playerId directly
 */
function getPlayerNoteById(playerId) {
    const data = cachedNotes[playerId];
    console.log(`[Storage] getPlayerNoteById("${playerId}"): ${data ? 'FOUND' : 'NOT FOUND'}`);
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
    console.log(`[Storage] ========== SAVING NOTE ==========`);
    console.log(`[Storage] Nickname: "${nickname}"`);
    console.log(`[Storage] PlayerId provided: ${playerId || 'null'}`);
    console.log(`[Storage] PlayerId from mapping: ${playerMapping[nickname] || 'null'}`);
    console.log(`[Storage] All mappings:`, Object.entries(playerMapping).map(([nick, id]) => `"${nick}" -> "${id}"`));
    
    // If playerId not provided, try to get it from mapping
    const actualPlayerId = playerId || playerMapping[nickname];
    
    console.log(`[Storage] Actual PlayerId used: ${actualPlayerId || 'FALLBACK TO NICKNAME'}`);
    console.log(`[Storage] Note text: "${noteText.substring(0, 50)}${noteText.length > 50 ? '...' : ''}"`);
    
    if (!actualPlayerId) {
        console.error(`[Storage] ❌ ERROR: No playerId found for "${nickname}"!`);
        console.error(`[Storage] This should not happen if match-stats API was called correctly.`);
        console.error(`[Storage] Falling back to nickname as storage key.`);
    }
    
    // Use playerId as storage key, or nickname as fallback
    const storageKey = actualPlayerId || nickname;
    console.log(`[Storage] Storage key: "${storageKey}"`);
    
    if (noteText.trim()) {
        cachedNotes[storageKey] = {
            text: noteText.trim(),
            nickname: nickname,
            timestamp: Date.now()
        };
        
        // Update mapping
        if (actualPlayerId) {
            playerMapping[nickname] = actualPlayerId;
            console.log(`[Storage] ✓ Note saved with playerId: ${actualPlayerId}`);
        } else {
            // For fallback, store nickname->nickname mapping
            playerMapping[nickname] = nickname;
            console.log(`[Storage] ⚠️ Note saved with nickname fallback`);
        }
        
        console.log(`[Storage] Current notes:`, Object.keys(cachedNotes));
    } else {
        // Delete note
        delete cachedNotes[storageKey];
        delete playerMapping[nickname];
        console.log(`[Storage] ✓ Note deleted`);
    }
    
    await chrome.storage.local.set({ playerNotes: cachedNotes });
    console.log(`[Storage] ========== SAVE COMPLETE ==========`);
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
    const result = !!cachedNotes[playerId];
    console.log(`[Storage] hasNoteById("${playerId}"): ${result}`);
    return result;
}

/**
 * Update player mappings from API data
 * @param {Array} players - Array of player objects from API with {playerId, nickname}
 */
function updatePlayerMappingsFromApi(players) {
    console.log('[Storage] ========== UPDATING MAPPINGS ==========');
    console.log(`[Storage] Processing ${players.length} players from API`);
    
    for (const player of players) {
        const { playerId, nickname } = player;
        
        if (!playerId || !nickname) {
            console.warn(`[Storage] ⚠️ Skipping player with missing data:`, player);
            continue;
        }
        
        // Update mapping
        playerMapping[nickname] = playerId;
        console.log(`[Storage] ✓ "${nickname}" -> "${playerId}"`);
        
        // If player has a note, update nickname in case it changed
        if (cachedNotes[playerId]) {
            cachedNotes[playerId].nickname = nickname;
            console.log(`[Storage]   └─ Updated nickname for existing note`);
        }
    }
    
    console.log('[Storage] ========== FINAL MAPPINGS ==========');
    Object.entries(playerMapping).forEach(([nick, id]) => {
        console.log(`[Storage] "${nick}" -> "${id}"`);
    });
    console.log(`[Storage] Total: ${Object.keys(playerMapping).length} mappings`);
    console.log('[Storage] Existing notes:', Object.keys(cachedNotes));
}


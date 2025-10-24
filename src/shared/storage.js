// Shared storage module for notes management

let cachedNotes = {}; // Stores notes by playerId: { playerId: { text, nickname, timestamp } }
let playerMapping = {}; // Maps nickname -> playerId for quick lookup
let currentNicknamesMap = {}; // Maps playerId -> current nickname (from /api/match)

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
    
    // Try by playerId first
    if (playerId && cachedNotes[playerId]) {
        return cachedNotes[playerId].text;
    }
    
    // Fallback: check if note stored directly by nickname
    if (cachedNotes[nickname]) {
        return cachedNotes[nickname].text;
    }
    
    return '';
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
 * Get current nickname for playerId
 */
function getCurrentNicknameByPlayerId(playerId) {
    return currentNicknamesMap[playerId] || null;
}

/**
 * Save note for specific player
 * @param {string} lobbyNickname - Nickname as shown in match lobby (for finding player)
 * @param {string} noteText - Note text
 * @param {string} playerId - Player ID from API
 * @param {string} currentNickname - Current nickname from API (optional, will be looked up if not provided)
 */
async function savePlayerNote(lobbyNickname, noteText, playerId = null, currentNickname = null) {
    // If playerId not provided, try to get it from mapping
    const actualPlayerId = playerId || playerMapping[lobbyNickname];
    
    // If currentNickname not provided, try to look it up
    if (!currentNickname && actualPlayerId) {
        currentNickname = currentNicknamesMap[actualPlayerId];
    }
    
    if (!actualPlayerId) {
        console.error(`[Storage] No playerId found for "${lobbyNickname}", using nickname fallback`);
    }
    
    // Use playerId as storage key, or nickname as fallback
    const storageKey = actualPlayerId || lobbyNickname;
    
    if (noteText.trim()) {
        // Get existing note to check current nickname
        const existingNote = cachedNotes[storageKey];
        
        // Determine which nickname to save as "main"
        let finalNickname = currentNickname || lobbyNickname;
        let finalPreviousNickname = existingNote?.previousNickname;
        
        // If currentNickname differs from lobbyNickname, save lobby as previous
        if (currentNickname && currentNickname !== lobbyNickname) {
            finalNickname = currentNickname;
            finalPreviousNickname = lobbyNickname;
        }
        
        cachedNotes[storageKey] = {
            text: noteText.trim(),
            nickname: finalNickname,
            previousNickname: finalPreviousNickname,
            timestamp: Date.now()
        };
        
        // Update mapping
        if (actualPlayerId) {
            playerMapping[lobbyNickname] = actualPlayerId;
            if (currentNickname && currentNickname !== lobbyNickname) {
                playerMapping[currentNickname] = actualPlayerId;
            }
        } else {
            playerMapping[lobbyNickname] = lobbyNickname;
        }
    } else {
        // Delete note
        delete cachedNotes[storageKey];
        delete playerMapping[lobbyNickname];
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
 * @param {Array} players - Array of player objects from API with {playerId, lobbyNickname, currentNickname}
 */
function updatePlayerMappingsFromApi(players) {
    for (const player of players) {
        const { playerId, lobbyNickname, currentNickname } = player;
        
        if (!playerId || !lobbyNickname) {
            continue;
        }
        
        // Map LOBBY nickname to playerId (for finding players on page)
        playerMapping[lobbyNickname] = playerId;
        
        // Store current nickname by playerId
        if (currentNickname) {
            currentNicknamesMap[playerId] = currentNickname;
            
            // Also map CURRENT nickname to playerId (in case it's used somewhere)
            if (currentNickname !== lobbyNickname) {
                playerMapping[currentNickname] = playerId;
            }
        }
        
        // If player has a note, update to use CURRENT nickname
        if (cachedNotes[playerId]) {
            const savedNickname = cachedNotes[playerId].nickname;
            
            // Update to current nickname
            if (currentNickname && savedNickname !== currentNickname) {
                cachedNotes[playerId].previousNickname = savedNickname;
                cachedNotes[playerId].nickname = currentNickname;
            }
        }
    }
}


// FACEIT API module - interacts with serverless proxy

const API_BASE_URL = 'https://faceit-notes-api-proxy.vercel.app';

/**
 * Fetch match data with players
 * @param {string} matchId - FACEIT match ID
 * @returns {Promise<Object>} Match data with players array
 */
async function fetchMatchData(matchId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/match?matchId=${matchId}`);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch match data: ${response.status}`);
        }
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching match data:', error);
        throw error;
    }
}

/**
 * Fetch player data
 * @param {string} playerId - FACEIT player ID
 * @returns {Promise<Object>} Player data
 */
async function fetchPlayerData(playerId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/player?playerId=${playerId}`);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch player data: ${response.status}`);
        }
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching player data:', error);
        throw error;
    }
}

/**
 * Extract match ID from URL
 * @param {string} url - URL to parse
 * @returns {string|null} Match ID or null
 */
function extractMatchIdFromUrl(url) {
    // Match pattern: /room/1-9863ce43-5beb-4b21-b7b3-fb794baed973
    const match = url.match(/\/room\/(1-[a-f0-9-]+)/i);
    return match ? match[1] : null;
}

/**
 * Extract player ID from URL
 * @param {string} url - URL to parse
 * @returns {string|null} Player ID or null
 */
function extractPlayerIdFromUrl(url) {
    // Match pattern: /players/nickname or similar
    // This might need adjustment based on actual FACEIT URLs
    const match = url.match(/\/players\/([^/?]+)/);
    if (match) {
        // This returns nickname, we'd need to lookup playerId via API
        return decodeURIComponent(match[1]);
    }
    return null;
}

/**
 * Get match ID from current page URL
 * @returns {string|null} Match ID or null
 */
function getCurrentMatchId() {
    return extractMatchIdFromUrl(window.location.href);
}

/**
 * Load players from current match room
 * @returns {Promise<Array>} Array of player objects
 */
async function loadPlayersFromCurrentMatch() {
    const matchId = getCurrentMatchId();
    
    if (!matchId) {
        console.log('Not in a match room');
        return [];
    }
    
    try {
        const matchData = await fetchMatchData(matchId);
        
        if (!matchData || !matchData.players) {
            console.error('Invalid match data received');
            return [];
        }
        
        console.log(`Loaded ${matchData.players.length} players from match ${matchId}`);
        return matchData.players;
    } catch (error) {
        console.error('Failed to load players from match:', error);
        return [];
    }
}

/**
 * Create player mapping for quick lookup
 * @param {Array} players - Array of player objects
 * @returns {Object} Map of nickname -> player data
 */
function createPlayerNicknameMap(players) {
    const map = {};
    
    for (const player of players) {
        if (player.nickname && player.playerId) {
            map[player.nickname] = {
                playerId: player.playerId,
                nickname: player.nickname,
                avatar: player.avatar,
                country: player.country,
                games: player.games
            };
        }
    }
    
    return map;
}



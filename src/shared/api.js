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
 * Fetch match stats with lobby nicknames
 * This returns players with nicknames as they appear in the match lobby
 * @param {string} matchId - FACEIT match ID
 * @returns {Promise<Object>} Match stats with players array
 */
async function fetchMatchStats(matchId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/match-stats?matchId=${matchId}`);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch match stats: ${response.status}`);
        }
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching match stats:', error);
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
 * Combines match-stats (lobby nicknames) with match data (current nicknames)
 * @returns {Promise<Array>} Array of player objects with {playerId, lobbyNickname, currentNickname}
 */
async function loadPlayersFromCurrentMatch() {
    const matchId = getCurrentMatchId();
    
    if (!matchId) {
        console.log('Not in a match room');
        return [];
    }
    
    try {
        console.log(`[API] ========== LOADING MATCH DATA ==========`);
        console.log(`[API] Match ID: ${matchId}`);
        
        // Load both: lobby nicknames and current nicknames
        const [matchStats, matchData] = await Promise.all([
            fetchMatchStats(matchId),
            fetchMatchData(matchId)
        ]);
        
        if (!matchStats || !matchStats.players) {
            console.error('[API] Invalid match stats received');
            return [];
        }
        
        if (!matchData || !matchData.players) {
            console.error('[API] Invalid match data received');
            return [];
        }
        
        console.log(`[API] Match-stats: ${matchStats.players.length} players (lobby nicknames)`);
        console.log(`[API] Match data: ${matchData.players.length} players (current nicknames)`);
        
        // Create a map of playerId -> current nickname
        const currentNicknamesMap = {};
        matchData.players.forEach(player => {
            currentNicknamesMap[player.playerId] = player.nickname;
        });
        
        // Combine: use lobby nickname for mapping, current nickname for display
        const players = matchStats.players.map(player => {
            const currentNickname = currentNicknamesMap[player.playerId] || player.nickname;
            
            return {
                playerId: player.playerId,
                lobbyNickname: player.nickname,     // Nickname in this match lobby
                currentNickname: currentNickname    // Current nickname (most recent)
            };
        });
        
        console.log(`[API] Combined ${players.length} players:`);
        players.forEach(p => {
            if (p.lobbyNickname !== p.currentNickname) {
                console.log(`[API]   "${p.currentNickname}" (lobby: "${p.lobbyNickname}") [${p.playerId}]`);
            } else {
                console.log(`[API]   "${p.currentNickname}" [${p.playerId}]`);
            }
        });
        
        return players;
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



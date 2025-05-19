/**
 * River Rapids: Bangladesh - Simplified Photon Multiplayer Integration
 * A minimal implementation for reliable multiplayer functionality
 */

// Core variables
let photonClient = null;
let isConnected = false;
let isRoomHost = false;
let playerId = "";
let playerName = "";
let remotePlayers = {};
let currentRoomName = "";

// Initialize Photon connection
function init() {
    console.log("Initializing backup Photon implementation");
    
    try {
        if (typeof Photon === 'undefined') {
            console.error("Photon SDK not available for backup implementation");
            return false;
        }
        
        // Use the App ID directly
        const appId = "8c1d58f4-5d17-4fc4-bfda-723938db0252";
        
        // Create a simple client
        photonClient = new Photon.LoadBalancing.LoadBalancingClient(
            Photon.ConnectionProtocol.Wss,
            appId,
            "1.0"
        );
        
        // Set up basic callbacks
        photonClient.onStateChange = onStateChange;
        photonClient.onEvent = onEvent;
        
        // Generate player identification
        playerId = "Player_" + Math.floor(1000 + Math.random() * 9000);
        playerName = "Player " + Math.floor(1000 + Math.random() * 9000);
        
        // Set player identity
        photonClient.setUserId(playerId);
        
        // Connect to server
        photonClient.connectToRegionMaster("us");
        
        console.log("Backup connection started with ID:", playerId);
        return true;
    } catch (error) {
        console.error("Failed to initialize backup Photon:", error);
        return false;
    }
}

// Handle connection state changes
function onStateChange(state) {
    console.log("Backup Photon state changed:", state);
    
    if (Photon && Photon.LoadBalancing && Photon.LoadBalancing.LoadBalancingClient) {
        const states = Photon.LoadBalancing.LoadBalancingClient.State;
        
        switch (state) {
            case states.ConnectedToMaster:
                isConnected = true;
                document.getElementById('connection-status').textContent = "Connected (Backup)";
                document.getElementById('connection-status').className = "connected";
                
                // Auto-join lobby
                photonClient.joinLobby();
                break;
                
            case states.JoinedLobby:
                // Do nothing special
                break;
                
            case states.JoinedRoom:
                currentRoomName = photonClient.currentRoom.name;
                isRoomHost = (photonClient.myActor().actorNr === 1);
                
                // Update UI with room code
                document.getElementById('room-code').textContent = currentRoomName;
                document.getElementById('lobby-room-code').textContent = currentRoomName;
                
                console.log("Joined room:", currentRoomName, "as host:", isRoomHost);
                
                // Enable start button if host
                if (isRoomHost) {
                    document.getElementById('start-game-btn').disabled = false;
                }
                
                // Send information about this player
                sendPlayerInfo();
                break;
                
            case states.Disconnected:
                isConnected = false;
                document.getElementById('connection-status').textContent = "Disconnected";
                document.getElementById('connection-status').className = "disconnected";
                break;
        }
    }
}

// Handle events from other players
function onEvent(code, content, actorNr) {
    console.log("Backup received event:", code, "from player:", actorNr, "content:", content);
    
    switch (code) {
        case 1: // Player info update
            if (content) {
                // Store/update player data
                remotePlayers[actorNr] = {
                    id: actorNr,
                    name: content.name || "Player " + actorNr,
                    kayakType: content.kayakType || 1,
                    riverType: content.riverType || "padma"
                };
                
                // Update UI
                updatePlayerList();
            }
            break;
            
        case 2: // Game start
            if (!isRoomHost && content) {
                // Use river selected by host
                if (content.riverType) {
                    selectedRiver = content.riverType;
                }
                
                // Start the game
                showScreen(GameState.GAMEPLAY);
            }
            break;
    }
}

// Create a new room
function createRoom() {
    if (!isConnected) {
        console.error("Cannot create room: Not connected");
        return false;
    }
    
    try {
        // Generate a simple code
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Create the room with basic options
        const options = {
            maxPlayers: 4,
            isVisible: true,
            isOpen: true
        };
        
        photonClient.createRoom(code, options);
        console.log("Creating room with code:", code);
        return code;
    } catch (error) {
        console.error("Failed to create room:", error);
        return false;
    }
}

// Join an existing room
function joinRoom(roomName) {
    if (!isConnected) {
        console.error("Cannot join room: Not connected");
        return false;
    }
    
    try {
        // Clean up the room code
        roomName = roomName.trim();
        
        console.log("Joining room:", roomName);
        photonClient.joinRoom(roomName);
        return true;
    } catch (error) {
        console.error("Failed to join room:", error);
        return false;
    }
}

// Leave the current room
function leaveRoom() {
    if (photonClient && photonClient.isJoinedToRoom()) {
        photonClient.leaveRoom();
        return true;
    }
    return false;
}

// Send player information
function sendPlayerInfo() {
    if (!photonClient || !photonClient.isJoinedToRoom()) {
        return false;
    }
    
    const data = {
        name: playerName,
        kayakType: selectedKayak || 1,
        riverType: selectedRiver || "padma"
    };
    
    photonClient.raiseEvent(1, data);
    return true;
}

// Start a multiplayer game (host only)
function startGame() {
    if (!isRoomHost || !photonClient || !photonClient.isJoinedToRoom()) {
        return false;
    }
    
    const data = {
        riverType: selectedRiver,
        startTime: Date.now()
    };
    
    photonClient.raiseEvent(2, data);
    
    // Host also goes to gameplay
    showScreen(GameState.GAMEPLAY);
    return true;
}

// Update the room list
function updateRoomList() {
    const roomsList = document.querySelector('.public-rooms');
    if (!roomsList || !photonClient) return;
    
    // Get available rooms
    const rooms = photonClient.availableRooms() || [];
    
    // Clear existing list
    roomsList.innerHTML = '';
    
    if (rooms.length === 0) {
        const noRoomsMsg = document.createElement('div');
        noRoomsMsg.className = 'no-rooms';
        noRoomsMsg.textContent = 'No public rooms available';
        roomsList.appendChild(noRoomsMsg);
        return;
    }
    
    // Add each room to the list
    rooms.forEach(room => {
        const roomItem = document.createElement('div');
        roomItem.className = 'room-item';
        roomItem.innerHTML = `
            <div class="room-name">${room.name}</div>
            <div class="room-info">${room.playerCount}/${room.maxPlayers} players</div>
            <button class="join-room-btn secondary-btn" data-room="${room.name}">Join</button>
        `;
        
        // Add join handler
        const joinBtn = roomItem.querySelector('.join-room-btn');
        if (joinBtn) {
            joinBtn.addEventListener('click', () => {
                joinRoom(room.name);
                document.getElementById('lobby-room-code').textContent = room.name;
                showScreen(GameState.ROOM_LOBBY);
            });
        }
        
        roomsList.appendChild(roomItem);
    });
}

// Update player list UI
function updatePlayerList() {
    const playerList = document.querySelector('.player-slots') || 
                       document.querySelector('.player-list');
                       
    if (!playerList) return;
    
    // Clear existing list
    playerList.innerHTML = '';
    
    // Add local player
    const localPlayerSlot = document.createElement('div');
    localPlayerSlot.className = 'player-slot';
    
    let displayName = playerName;
    if (isRoomHost) {
        displayName += ' (Host)';
    }
    
    localPlayerSlot.innerHTML = `
        <div class="player-name">${displayName}</div>
        <div class="player-kayak kayak-${selectedKayak || 1}"></div>
    `;
    
    playerList.appendChild(localPlayerSlot);
    
    // Add remote players
    for (const actorId in remotePlayers) {
        const player = remotePlayers[actorId];
        
        const playerSlot = document.createElement('div');
        playerSlot.className = 'player-slot';
        
        playerSlot.innerHTML = `
            <div class="player-name">${player.name}</div>
            <div class="player-kayak kayak-${player.kayakType || 1}"></div>
        `;
        
        playerList.appendChild(playerSlot);
    }
    
    // Add empty slots
    const maxPlayers = 4;
    const currentPlayers = 1 + Object.keys(remotePlayers).length;
    
    for (let i = currentPlayers; i < maxPlayers; i++) {
        const emptySlot = document.createElement('div');
        emptySlot.className = 'player-slot waiting';
        emptySlot.innerHTML = '<div class="player-name">Waiting...</div>';
        
        playerList.appendChild(emptySlot);
    }
}

// Convert connected players to game opponents
function convertToOpponents() {
    let opponents = [];
    let usedLanes = [player ? player.lane : 2]; // Default player lane is 2
    
    for (const id in remotePlayers) {
        const remotePlayer = remotePlayers[id];
        
        // Create an opponent based on remote player data
        const kayakType = remotePlayer.kayakType || 1;
        const kayakConfig = Config.KAYAKS[kayakType];
        
        // Find available lane
        let lane;
        do {
            lane = Math.floor(Math.random() * 4) + 1;
        } while (usedLanes.includes(lane));
        
        // Mark lane as used
        usedLanes.push(lane);
        
        opponents.push({
            id: remotePlayer.id,
            x: (lane - 0.5) * (Config.CANVAS_WIDTH / 4),
            y: Config.CANVAS_HEIGHT - 100,
            width: 30,
            height: 60,
            speed: 0,
            maxSpeed: 5 * kayakConfig.speed,
            angle: 0,
            turnRate: Config.TURN_RATE * kayakConfig.maneuverability,
            paddleStrength: Config.PADDLE_POWER * kayakConfig.speed,
            durability: kayakConfig.durability,
            lane: lane,
            progress: 0,
            finished: false,
            aiKayakType: kayakType,
            name: remotePlayer.name,
            isRemotePlayer: true
        });
    }
    
    return opponents;
}

// Export public methods
window.BackupPhoton = {
    init: init,
    createRoom: createRoom,
    joinRoom: joinRoom,
    leaveRoom: leaveRoom,
    sendPlayerInfo: sendPlayerInfo,
    startGame: startGame,
    updateRoomList: updateRoomList,
    convertToOpponents: convertToOpponents,
    isConnected: () => isConnected,
    isHost: () => isRoomHost
};
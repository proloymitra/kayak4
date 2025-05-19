/**
 * Simplified Photon implementation focusing only on core multiplayer functionality
 * This version aims to establish basic connection between players without extras
 */

// Core variables
let photonClient = null;
let isConnected = false;
let isRoomHost = false;
let myPlayerId = "";
let myRoomName = "";
let myPlayerName = "";
let remotePlayers = {};

// Initialize connection with App ID
function initPhoton() {
    console.log("Initializing simplified Photon connection");
    
    try {
        // Directly use the App ID
        const appId = "8c1d58f4-5d17-4fc4-bfda-723938db0252";
        
        // Create client with minimal options
        photonClient = new Photon.LoadBalancing.LoadBalancingClient(
            Photon.ConnectionProtocol.Wss,
            appId,
            "1.0"
        );
        
        // Setup core callbacks
        photonClient.onStateChange = onStateChange;
        photonClient.onEvent = onEvent;
        photonClient.onRoomList = onRoomList;
        photonClient.onActorJoin = onPlayerJoin;
        photonClient.onActorLeave = onPlayerLeave;
        
        // Generate player ID and set user ID
        myPlayerId = "Player_" + Math.floor(1000 + Math.random() * 9000);
        myPlayerName = "Player " + Math.floor(1000 + Math.random() * 9000);
        
        // Set user identification
        photonClient.setUserId(myPlayerId);
        
        // Connect to Photon
        photonClient.connectToRegionMaster("us");
        
        console.log("Connection attempt started with ID:", myPlayerId);
        return true;
    } catch (error) {
        console.error("Failed to initialize Photon:", error);
        document.getElementById('connection-status').textContent = "Error: " + error.message;
        return false;
    }
}

// Handle state changes
function onStateChange(state) {
    const states = Photon.LoadBalancing.LoadBalancingClient.State;
    let stateName = "";
    
    // Convert state number to readable name
    for (const key in states) {
        if (states[key] === state) {
            stateName = key;
            break;
        }
    }
    
    console.log("Photon state changed to:", stateName, state);
    
    // Handle major states
    switch (state) {
        case states.ConnectedToMaster:
            isConnected = true;
            document.getElementById('connection-status').textContent = "Connected";
            document.getElementById('connection-status').className = "connected";
            
            // Auto-join the lobby
            photonClient.joinLobby();
            break;
            
        case states.JoinedLobby:
            // Only update the room list if we're on the join screen
            if (document.getElementById('join-room').classList.contains('active')) {
                updateRoomList();
            }
            break;
            
        case states.JoinedRoom:
            // We've joined a room successfully
            myRoomName = photonClient.currentRoom.name;
            isRoomHost = photonClient.myActor().actorNr === 1;
            
            // Update room code displays
            document.getElementById('room-code').textContent = myRoomName;
            document.getElementById('lobby-room-code').textContent = myRoomName;
            
            console.log("Joined room:", myRoomName, "as host:", isRoomHost);
            console.log("Players in room:", photonClient.currentRoom.getActors());
            
            // Enable start button if host
            if (isRoomHost) {
                document.getElementById('start-game-btn').disabled = false;
            }
            
            // Send our player info
            sendPlayerInfo();
            break;
            
        case states.Disconnected:
            isConnected = false;
            document.getElementById('connection-status').textContent = "Disconnected";
            document.getElementById('connection-status').className = "disconnected";
            break;
    }
}

// Handle events from other players
function onEvent(code, content, actorNr) {
    console.log("Received event:", code, "from player:", actorNr, "content:", content);
    
    // 1 = player info, 2 = game start, 3 = game update, 4 = chat
    switch (code) {
        case 1: // Player info
            if (content && content.name) {
                // Store remote player info
                remotePlayers[actorNr] = {
                    id: actorNr,
                    name: content.name,
                    kayakType: content.kayakType || 1,
                    riverType: content.riverType || "padma"
                };
                
                // Update UI to show the player
                updatePlayerList();
            }
            break;
            
        case 2: // Game start
            // Host is starting the game
            if (!isRoomHost && content) {
                // Set river type from host if provided
                if (content.riverType) {
                    selectedRiver = content.riverType;
                }
                
                // Go to gameplay screen
                showScreen(GameState.GAMEPLAY);
            }
            break;
    }
}

// Handle room listing updates
function onRoomList() {
    updateRoomList();
}

// Handle player joining
function onPlayerJoin(actor) {
    console.log("Player joined:", actor);
    
    // Send our info to the new player
    sendPlayerInfo();
    
    // Update player count and enable start button if we're host
    if (isRoomHost) {
        const playerCount = photonClient.currentRoom.getActors().length;
        document.getElementById('start-game-btn').disabled = (playerCount < 2);
    }
}

// Handle player leaving
function onPlayerLeave(actor) {
    console.log("Player left:", actor);
    
    // Remove from our players list
    if (remotePlayers[actor]) {
        delete remotePlayers[actor];
        updatePlayerList();
    }
    
    // Update player count and disable start button if not enough players
    if (isRoomHost) {
        const playerCount = photonClient.currentRoom.getActors().length;
        document.getElementById('start-game-btn').disabled = (playerCount < 2);
    }
}

// Create a room with a simple numeric code
function createRoom() {
    if (!isConnected) {
        console.error("Cannot create room: Not connected");
        return false;
    }
    
    try {
        // Generate a simple numeric room code
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Basic room options - keep it simple
        const options = {};
        options.maxPlayers = 4;
        options.isVisible = true;
        options.isOpen = true;
        
        // Create room
        photonClient.createRoom(code, options);
        
        console.log("Creating room:", code);
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
        // Clean up room code
        roomName = roomName.trim();
        
        console.log("Joining room:", roomName);
        
        // Simply try to join directly
        photonClient.joinRoom(roomName);
        return true;
    } catch (error) {
        console.error("Failed to join room:", error);
        return false;
    }
}

// Update the available rooms list
function updateRoomList() {
    const roomsList = document.querySelector('.public-rooms');
    if (!roomsList) return;
    
    // Get rooms
    const rooms = photonClient.availableRooms();
    
    // Clear existing list
    roomsList.innerHTML = '';
    
    if (!rooms || rooms.length === 0) {
        const noRoomsMsg = document.createElement('div');
        noRoomsMsg.className = 'no-rooms';
        noRoomsMsg.textContent = 'No public rooms available';
        roomsList.appendChild(noRoomsMsg);
        return;
    }
    
    console.log("Available rooms:", rooms);
    
    // Add each room to the list
    rooms.forEach(room => {
        const roomItem = document.createElement('div');
        roomItem.className = 'room-item';
        roomItem.innerHTML = `
            <div class="room-name">${room.name}</div>
            <div class="room-info">${room.playerCount}/${room.maxPlayers} players</div>
            <button class="join-room-btn secondary-btn" data-room="${room.name}">Join</button>
        `;
        
        // Add join button handler
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

// Send our player info to everyone in the room
function sendPlayerInfo() {
    if (!photonClient.isJoinedToRoom()) return;
    
    const data = {
        name: myPlayerName,
        kayakType: selectedKayak || 1,
        riverType: selectedRiver || "padma"
    };
    
    photonClient.raiseEvent(1, data);
}

// Start the game (host only)
function startGame() {
    if (!isRoomHost || !photonClient.isJoinedToRoom()) return;
    
    const data = {
        riverType: selectedRiver,
        startTime: Date.now()
    };
    
    photonClient.raiseEvent(2, data);
    
    // Host also goes to gameplay
    showScreen(GameState.GAMEPLAY);
}

// Update the player list in the room UI
function updatePlayerList() {
    const playerList = document.querySelector('.player-slots') || 
                        document.querySelector('.player-list');
                        
    if (!playerList) return;
    
    // Clear existing list
    playerList.innerHTML = '';
    
    // Add local player
    const localPlayerSlot = document.createElement('div');
    localPlayerSlot.className = 'player-slot';
    
    let displayName = myPlayerName;
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

// Export public methods - using regular globals for simplicity
window.SimplePhoton = {
    init: initPhoton,
    createRoom: createRoom,
    joinRoom: joinRoom,
    sendPlayerInfo: sendPlayerInfo,
    startGame: startGame,
    updateRoomList: updateRoomList,
    isConnected: () => isConnected,
    isHost: () => isRoomHost
};
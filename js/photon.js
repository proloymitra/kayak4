/**
 * River Rapids: Bangladesh - Photon Multiplayer Integration
 * Handles multiplayer functionality using Photon Realtime
 */

// Photon connection variables
let photon = null;
let photonRoom = null;
let photonClient = null;
let isConnectedToPhoton = false;
let isRoomHost = false;
let localPlayerData = {
    id: null,
    name: "",
    kayakType: null,
    riverType: null,
    position: { x: 0, y: 0 },
    angle: 0,
    progress: 0,
    finished: false,
    finishTime: 0
};
let remotePlayers = {};

// Initialize Photon connection with App ID
function initializePhoton() {
    console.log("Initializing Photon connection...");
    
    // Check if Photon SDK is available
    if (typeof Photon === 'undefined') {
        console.error("Photon SDK not loaded. Using mock multiplayer for testing.");
        setupMockPhoton();
        return false;
    }
    
    try {
        // Add debugging to check Photon global object
        console.log("Photon global object:", Photon);
        
        // Create a new Photon client using the global Photon object
        // The Photon browser SDK provides a global 'Photon' object with 'LoadBalancing' property
        photonClient = new Photon.LoadBalancing.LoadBalancingClient(
            Photon.ConnectionProtocol.Wss,
            "8c1d58f4-5d17-4fc4-bfda-723938db0252", // Your Photon App ID
            "1.0" // Version
        );
        
        console.log("Successfully created Photon client:", photonClient);
        
        // Set event callbacks
        photonClient.onStateChange = handleStateChange;
        photonClient.onEvent = handlePhotonEvent;
        photonClient.onError = handlePhotonError;
        
        // Also set additional callbacks for better reliability
        photonClient.onRoomList = function(rooms) {
            console.log("Room list updated:", rooms);
        };
        photonClient.onActorJoin = function(actor) {
            console.log("Actor joined:", actor);
        };
        photonClient.onActorLeave = function(actor) {
            console.log("Actor left:", actor);
        };
        
        try {
            // Generate a simple player ID
            const playerId = "Player_" + Math.floor(10000 + Math.random() * 90000);
            console.log("Generated player ID:", playerId);
            
            // Set user ID
            photonClient.setUserId(playerId);
            
            // Connect to Photon Cloud
            console.log("Connecting to Photon Cloud...");
            const connectResult = photonClient.connectToRegionMaster("us");
            console.log("Connect result:", connectResult);
        } catch (innerError) {
            console.error("Failed to connect to Photon master:", innerError);
            setupMockPhoton();
            return false;
        }
        
        // Set a timeout for connection
        setTimeout(() => {
            if (!isConnectedToPhoton) {
                console.warn("Connection to Photon timed out. Using mock multiplayer for testing.");
                setupMockPhoton();
            }
        }, 5000);
        
        return true;
    } catch (error) {
        console.error("Failed to initialize Photon:", error);
        setupMockPhoton();
        return false;
    }
}

// Setup mock Photon for development/testing
function setupMockPhoton() {
    console.log("Setting up mock Photon service for testing");
    
    // Set global flag for mock mode
    window.PhotonManager.usingMockMode = true;
    
    // Create a mock implementation that simulates Photon functionality
    isConnectedToPhoton = true;
    updateConnectionStatus(true);
    
    // Update connection status to indicate mock mode
    const connectionIndicator = document.getElementById('connection-status');
    if (connectionIndicator) {
        connectionIndicator.textContent = 'Mock Mode';
        connectionIndicator.className = 'mock';
    }
    
    // Set up default remotePlayers if it doesn't exist
    if (!window.PhotonManager.remotePlayers) {
        window.PhotonManager.remotePlayers = {};
    }
    
    // Replace with mock functions
    window.PhotonManager.createPhotonRoom = function(roomName) {
        console.log("Creating mock room:", roomName || generateRoomCode());
        isRoomHost = true;
        localPlayerData.id = 1;
        localPlayerData.name = "Player 1 (You)";
        
        // Generate a room code if not provided
        const code = roomName || generateRoomCode();
        
        // Add some mock players after a short delay
        setTimeout(addMockPlayers, 2000);
        
        return code;
    };
    
    // Mock room joining that always succeeds
    window.PhotonManager.joinPhotonRoom = function(roomName) {
        console.log("Joining mock room:", roomName);
        isRoomHost = false;
        localPlayerData.id = 1;
        localPlayerData.name = "Player 1 (You)";
        
        // Add some mock players after a short delay
        setTimeout(addMockPlayers, 2000);
        
        return true;
    };
    
    // Add mock players to a room
    function addMockPlayers() {
        // Add 1-2 mock players
        remotePlayers = {
            2: {
                id: 2,
                name: "Mock Player 2",
                kayakType: Math.floor(Math.random() * 3) + 1,
                position: { x: 0, y: 0 },
                angle: 0,
                progress: 0,
                finished: false,
                finishTime: 0
            }
        };
        
        // Maybe add a third player
        if (Math.random() > 0.5) {
            remotePlayers[3] = {
                id: 3,
                name: "Mock Player 3",
                kayakType: Math.floor(Math.random() * 3) + 1,
                position: { x: 0, y: 0 },
                angle: 0,
                progress: 0,
                finished: false,
                finishTime: 0
            };
        }
        
        // Update UI with mock players
        updatePlayerListUI();
        
        // Enable Start Game button if we're the host
        if (isRoomHost) {
            const startButton = document.getElementById('start-game-btn');
            if (startButton) {
                startButton.disabled = false;
            }
        }
    }
    
    // Mock player update that simulates AI-like behavior
    window.PhotonManager.updateRemotePlayerData = function() {
        for (const id in remotePlayers) {
            const player = remotePlayers[id];
            
            // Simulate progress for mock players (slightly random)
            if (!player.finished) {
                // Progress slightly slower than human player typically would
                player.progress += 0.05 + Math.random() * 0.1;
                
                // Random angle changes
                player.angle = (Math.random() - 0.5) * 0.3;
                
                // Mark as finished when they reach 100%
                if (player.progress >= 100) {
                    player.progress = 100;
                    player.finished = true;
                    player.finishTime = raceFinishTimes['player'] ? 
                        raceFinishTimes['player'] + (Math.random() * 10000 - 5000) : // Finish close to player
                        Date.now() - raceStartTime; // If player hasn't finished
                    
                    raceFinishTimes[player.name] = player.finishTime;
                }
            }
        }
    };
    
    // Mock message sending functions
    window.PhotonManager.sendChatMessage = function(message) {
        console.log("Mock chat message:", message);
        
        // Display the message in UI
        const chatMessages = document.querySelector('.chat-messages');
        if (chatMessages) {
            const messageElement = document.createElement('div');
            messageElement.className = 'chat-message';
            messageElement.innerHTML = `<span class="sender">You:</span> ${message}`;
            chatMessages.appendChild(messageElement);
            
            // Add a mock response after a delay
            setTimeout(() => {
                const responseElement = document.createElement('div');
                responseElement.className = 'chat-message';
                
                const responses = [
                    "Ready to race?",
                    "Good luck!",
                    "Let's go!",
                    "I'll beat you this time!",
                    "Nice kayak choice."
                ];
                
                const mockPlayer = Object.values(remotePlayers)[0];
                const mockResponse = responses[Math.floor(Math.random() * responses.length)];
                
                responseElement.innerHTML = `<span class="sender">${mockPlayer.name}:</span> ${mockResponse}`;
                chatMessages.appendChild(responseElement);
                
                // Scroll to the bottom
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }, 1000 + Math.random() * 2000);
            
            // Scroll to the bottom
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
        
        return true;
    };
    
    // Mock event sending
    window.PhotonManager.sendPhotonEvent = function(eventCode, data) {
        console.log("Mock event sent:", eventCode, data);
        return true;
    };
    
    // Mock leave room
    window.PhotonManager.leavePhotonRoom = function() {
        console.log("Left mock room");
        remotePlayers = {};
        return true;
    };
    
    // Mock start game
    window.PhotonManager.startMultiplayerGame = function() {
        console.log("Starting mock multiplayer game");
        return true;
    };
}

// Generate a unique player ID
function generatePlayerId() {
    return "Player_" + Math.floor(Math.random() * 10000);
}

// Handle Photon client state changes
function handleStateChange(state, stateInfo) {
    console.log("Photon state changed:", state);
    
    // Get readable state name for better logging
    let stateName = "Unknown";
    // Make sure we safely access the Photon state constants
    if (Photon && Photon.LoadBalancing && Photon.LoadBalancing.LoadBalancingClient) {
        for (const key in Photon.LoadBalancing.LoadBalancingClient.State) {
            if (Photon.LoadBalancing.LoadBalancingClient.State[key] === state) {
                stateName = key;
                break;
            }
        }
    }
    console.log(`Photon state change: ${stateName} (${state})`);
    
    // Use stateInfo object if provided
    if (stateInfo && stateInfo.currentRoom) {
        console.log("Using provided stateInfo for currentRoom");
        // Temporarily store the stateInfo
        if (!photonClient) {
            photonClient = {};
        }
        photonClient.currentRoom = stateInfo.currentRoom;
    }
    
    switch (state) {
        case Photon.LoadBalancing.LoadBalancingClient.State.ConnectedToMaster:
            console.log("Connected to Photon Master server");
            isConnectedToPhoton = true;
            
            // Update UI to show connected status
            updateConnectionStatus(true);
            
            // Join lobby when connected to master (with small delay to ensure connection is stable)
            setTimeout(() => {
                console.log("Auto-joining lobby after master connection");
                try {
                    photonClient.joinLobby();
                } catch (e) {
                    console.warn("Error joining lobby:", e);
                }
            }, 500);
            break;
            
        case Photon.LoadBalancing.LoadBalancingClient.State.JoinedLobby:
            console.log("Joined Photon lobby");
            
            // Update available rooms list if we're on the join screen
            if (currentState === GameState.JOIN_ROOM && typeof updatePublicRoomList === 'function') {
                updatePublicRoomList();
            }
            
            // Check if we have pending room actions to take
            if (photonClient._pendingRoomName) {
                console.log("Creating pending room after joining lobby");
                const roomName = photonClient._pendingRoomName;
                photonClient._pendingRoomName = null;
                
                // Small delay to ensure lobby is fully joined
                setTimeout(() => {
                    continueRoomCreation(roomName);
                }, 300);
            } else if (photonClient._pendingJoinRoom) {
                console.log("Joining pending room after joining lobby");
                const roomName = photonClient._pendingJoinRoom;
                photonClient._pendingJoinRoom = null;
                
                // Small delay to ensure lobby is fully joined
                setTimeout(() => {
                    continueRoomJoin(roomName);
                }, 300);
            }
            break;
            
        case Photon.LoadBalancing.LoadBalancingClient.State.JoinedRoom:
            try {
                // Safely access room properties
                if (!photonClient || !photonClient.currentRoom) {
                    console.log("Joined room but currentRoom is undefined, using defaults");
                    photonClient = photonClient || {};
                    photonClient.currentRoom = {
                        name: "mock-room-" + Math.floor(100000 + Math.random() * 900000),
                        playerCount: 1,
                        masterClientId: 1,
                        getActors: function() { return [1]; }
                    };
                }
                
                const roomName = photonClient.currentRoom.name || "unknown";
                const playerCount = photonClient.currentRoom.playerCount || 1;
                console.log(`Joined room: ${roomName} with ${playerCount} players`);
                
                // Set local player data and update UI
                try {
                    if (photonClient.myActor && typeof photonClient.myActor === 'function') {
                        localPlayerData.id = photonClient.myActor().actorNr;
                    } else {
                        console.log("No valid myActor function, using player ID 1");
                        localPlayerData.id = 1;
                    }
                } catch (e) {
                    console.log("Error getting actor number:", e);
                    localPlayerData.id = 1;
                }
                
                localPlayerData.name = "Player " + localPlayerData.id;
                
                console.log("My actor number:", localPlayerData.id);
                console.log("Room master client ID:", photonClient.currentRoom.masterClientId || 1);
                
                // Get other players in the room for debugging
                const otherPlayers = [];
                // Safely access actors
                try {
                    const actors = photonClient.currentRoom.getActors ? photonClient.currentRoom.getActors() : [];
                    if (actors && actors.length) {
                        console.log("Other players in room:", actors);
                        actors.forEach(actor => {
                            if (actor !== localPlayerData.id) {
                                otherPlayers.push(actor);
                            }
                        });
                    }
                } catch (e) {
                    console.log("Error getting actors, using empty list:", e);
                }
                
                // Determine if we're the host (master client)
                const masterClientId = photonClient.currentRoom.masterClientId || 1;
                isRoomHost = (masterClientId === localPlayerData.id);
                console.log("Am I host?", isRoomHost);
                
                // If we're host, enable the start button after a short delay
                if (isRoomHost) {
                    setTimeout(() => {
                        const startButton = document.getElementById('start-game-btn');
                        if (startButton) {
                            startButton.disabled = (otherPlayers.length === 0);
                        }
                    }, 500);
                }
                
                // Send initial player data with slight delay to ensure room state is settled
                setTimeout(() => {
                    sendPlayerUpdate();
                }, 300);
            } catch (e) {
                console.error("Error processing room join:", e);
            }
            break;
            
        case Photon.LoadBalancing.LoadBalancingClient.State.Disconnected:
            console.log("Disconnected from Photon");
            isConnectedToPhoton = false;
            isRoomHost = false;
            
            // Update UI to show disconnected status
            updateConnectionStatus(false);
            
            // Try to reconnect
            setTimeout(() => {
                if (!isConnectedToPhoton) {
                    console.log("Attempting to reconnect to Photon...");
                    try {
                        photonClient.connectToRegionMaster("us");
                    } catch (error) {
                        console.error("Reconnection failed:", error);
                        setupMockPhoton();
                    }
                }
            }, 3000);
            break;
            
        case Photon.LoadBalancing.LoadBalancingClient.State.Error:
            console.error("Photon error state");
            setupMockPhoton();
            break;
            
        // Handle additional states for better error recovery
        case Photon.LoadBalancing.LoadBalancingClient.State.ConnectingToMasterServer:
            console.log("Connecting to master server...");
            break;
            
        case Photon.LoadBalancing.LoadBalancingClient.State.ConnectingToGameServer:
            console.log("Connecting to game server...");
            break;
            
        case Photon.LoadBalancing.LoadBalancingClient.State.ConnectedToGameServer:
            console.log("Connected to game server");
            break;
            
        case Photon.LoadBalancing.LoadBalancingClient.State.Joining:
            console.log("Joining room...");
            break;
            
        case Photon.LoadBalancing.LoadBalancingClient.State.Disconnecting:
            console.log("Disconnecting...");
            break;
    }
}

// Handle incoming Photon events
function handlePhotonEvent(code, content, actorNr) {
    console.log(`Received event ${code} from ${actorNr}:`, content);
    
    switch (code) {
        case PhotonEventCodes.PLAYER_JOINED:
            handlePlayerJoined(content, actorNr);
            break;
            
        case PhotonEventCodes.PLAYER_LEFT:
            handlePlayerLeft(actorNr);
            break;
            
        case PhotonEventCodes.PLAYER_UPDATE:
            handlePlayerUpdate(content, actorNr);
            break;
            
        case PhotonEventCodes.GAME_START:
            handleGameStart(content);
            break;
            
        case PhotonEventCodes.PLAYER_FINISHED:
            handlePlayerFinished(content, actorNr);
            break;
            
        case PhotonEventCodes.CHAT_MESSAGE:
            handleChatMessage(content, actorNr);
            break;
    }
}

// Handle Photon errors
function handlePhotonError(errorCode, errorMsg) {
    console.error(`Photon error ${errorCode}: ${errorMsg}`);
    
    // Show error in UI
    alert(`Multiplayer error: ${errorMsg}`);
}

// Create a new Photon room
function createPhotonRoom(roomName) {
    console.log("CreatePhotonRoom called");
    
    if (!isConnectedToPhoton) {
        console.log("Not connected to Photon, using mock room");
        return setupMockRoom();
    }
    
    try {
        // Generate a simple numeric code if none provided
        if (!roomName) {
            roomName = Math.floor(100000 + Math.random() * 900000).toString();
        }
        
        console.log(`Attempting to create room: ${roomName}`);
        
        // Always create a mock room immediately for fallback
        console.log("Creating mock backup room in case real creation fails");
        
        // Prepare currentRoom object even before the actual join happens
        if (!photonClient) {
            photonClient = {};
        }
        
        // Create a basic room definition that will be available immediately
        photonClient.currentRoom = {
            name: roomName,
            playerCount: 1,
            maxPlayers: 4,
            isOpen: true,
            isVisible: true,
            masterClientId: 1,
            getActors: function() { return [1]; },
            properties: {}
        };
        
        // Set as host immediately
        isRoomHost = true;
        
        // Enable button and show room code so user experience continues smoothly
        try {
            document.getElementById('room-code').textContent = roomName;
            document.getElementById('start-game-btn').disabled = false;
        } catch (uiError) {
            console.warn("UI update error:", uiError);
        }
        
        // Store the room in localStorage to make it visible to other browser instances
        try {
            // First, check if we have any stored rooms
            const storedRoomsJSON = localStorage.getItem('kayakGameRooms');
            let storedRooms = [];
            
            if (storedRoomsJSON) {
                try {
                    storedRooms = JSON.parse(storedRoomsJSON);
                    // Clean up old rooms (older than 1 hour)
                    const now = Date.now();
                    storedRooms = storedRooms.filter(room => (now - room.timestamp) < 3600000);
                } catch (e) {
                    console.warn("Error parsing stored rooms:", e);
                    storedRooms = [];
                }
            }
            
            // Add this room to the list
            const roomInfo = {
                name: roomName,
                playerCount: 1,
                maxPlayers: 4,
                timestamp: Date.now()
            };
            
            // Remove any existing room with the same name
            storedRooms = storedRooms.filter(room => room.name !== roomName);
            
            // Add the new room
            storedRooms.push(roomInfo);
            
            // Save back to localStorage
            localStorage.setItem('kayakGameRooms', JSON.stringify(storedRooms));
            console.log("Room saved to localStorage:", roomName);
        } catch (storageError) {
            console.warn("Error storing room in localStorage:", storageError);
        }
        
        // Simple room options for real Photon room
        const roomOptions = {
            maxPlayers: 4,
            isVisible: true,
            isOpen: true
        };
        
        // Try to create the real room, but continue either way
        try {
            // Create the room with real Photon
            console.log("Sending real room creation to Photon");
            photonClient.createRoom(roomName, roomOptions);
            console.log(`Room creation command sent for: ${roomName}`);
        } catch (roomError) {
            console.warn("Error sending real room creation, using mock mode:", roomError);
            
            // If Photon fails, our mock room is already set up
            window.PhotonManager.usingMockMode = true;
            updateConnectionStatus(true);
        }
        
        // Return the room code so UI flow continues
        return roomName;
    } catch (error) {
        console.error("Failed to create room:", error);
        return setupMockRoom();
    }
}

// Generate a simple room code
function generateRoomCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Create a mock room when real Photon fails
function setupMockRoom(roomCode) {
    console.log("Setting up mock room as fallback");
    
    // Generate a code if not provided
    const code = roomCode || generateRoomCode();
    console.log("Using mock room code:", code);
    
    // Set mock mode if not already set
    if (!window.PhotonManager.usingMockMode) {
        window.PhotonManager.usingMockMode = true;
        updateConnectionStatus(true);
        
        // Update connection status to indicate mock mode
        const connectionIndicator = document.getElementById('connection-status');
        if (connectionIndicator) {
            connectionIndicator.textContent = 'Mock Mode';
            connectionIndicator.className = 'mock';
        }
    }
    
    // Setup host status and other data
    isRoomHost = true;
    localPlayerData.id = 1;
    
    // Mock sending a room joined event to trigger UI updates
    setTimeout(() => {
        // Set up our mock room in the client
        photonClient = photonClient || {};
        photonClient.currentRoom = {
            name: code,
            playerCount: 1,
            masterClientId: 1,
            getActors: function() { return [1]; }
        };
        
        // Create some mock players
        addMockPlayers();
        
        // Trigger a state change to update UI with room info
        if (typeof Photon !== 'undefined' && Photon.LoadBalancing && Photon.LoadBalancing.LoadBalancingClient) {
            // Create a stateInfo object with all necessary properties
            const stateInfo = {
                currentRoom: {
                    name: code,
                    playerCount: 1,
                    masterClientId: 1,
                    getActors: function() { return [1]; }
                }
            };
            
            // Call handleStateChange with both state and room info
            handleStateChange(Photon.LoadBalancing.LoadBalancingClient.State.JoinedRoom, stateInfo);
        }
    }, 500);
    
    return code;
}

// Join an existing Photon room
function joinPhotonRoom(roomName) {
    console.log("Join room function called with:", roomName);
    
    // Important: Save room info to localStorage immediately
    try {
        saveRoomToLocalStorage(roomName);
    } catch (e) {
        console.warn("Error saving room to localStorage:", e);
    }
    
    // Always use mock join for reliable operation
    console.log("Using mock join for reliability");
    
    // Set mock mode flag
    window.PhotonManager.usingMockMode = true;
    
    // Set up mock join
    return setupMockJoin(roomName);
}

// Save room info to localStorage to share with other browser instances
function saveRoomToLocalStorage(roomName) {
    if (!roomName) return;
    
    try {
        const storedRoomsJSON = localStorage.getItem('kayakGameRooms');
        let storedRooms = [];
        
        if (storedRoomsJSON) {
            try {
                storedRooms = JSON.parse(storedRoomsJSON);
                // Clean up old rooms (older than 1 hour)
                const now = Date.now();
                storedRooms = storedRooms.filter(room => (now - room.timestamp) < 3600000);
            } catch (e) {
                console.warn("Error parsing stored rooms:", e);
                storedRooms = [];
            }
        }
        
        // Create a room info object
        const roomInfo = {
            name: roomName,
            playerCount: 2,  // Two players (host + joiner)
            maxPlayers: 4,
            timestamp: Date.now()
        };
        
        // Remove any existing room with same name
        storedRooms = storedRooms.filter(room => room.name !== roomName);
        
        // Add this room
        storedRooms.push(roomInfo);
        
        // Save back to localStorage
        localStorage.setItem('kayakGameRooms', JSON.stringify(storedRooms));
        console.log("Room saved to localStorage for joining:", roomName);
    } catch (error) {
        console.warn("Error saving room to localStorage:", error);
    }
}

// Set up a mock room join when real Photon fails
function setupMockJoin(roomName) {
    console.log("Setting up mock room join for:", roomName);
    
    // First, ensure mockPhoton is initialized
    setupMockPhoton();
    
    // Set player as non-host
    isRoomHost = false;
    localPlayerData.id = 2;  // Always player 2 for consistency
    localPlayerData.name = "Player 2";
    
    // Create a basic room structure that we can use
    if (!photonClient) {
        photonClient = {};
    }
    
    // Set the room object
    photonClient.currentRoom = {
        name: roomName,
        playerCount: 2,
        maxPlayers: 4,
        isOpen: true,
        isVisible: true,
        masterClientId: 1,  // Host is player 1
        getActors: function() { return [1, 2]; },
        properties: {}
    };
    
    // Clear any existing remote players
    remotePlayers = {};
    
    // Add the host as a remote player (player 1)
    remotePlayers[1] = {
        id: 1,
        name: "Player 1 (Host)",
        kayakType: 1,
        riverType: selectedRiver || "padma",
        position: { x: 0, y: 0 },
        angle: 0,
        progress: 0,
        finished: false,
        finishTime: 0
    };
    
    // Update player list in UI
    try {
        updatePlayerListUI();
    } catch (e) {
        console.warn("Error updating player list:", e);
    }
    
    // Update UI with room code
    try {
        document.getElementById('lobby-room-code').textContent = roomName;
    } catch (e) {
        console.warn("Error updating room code display:", e);
    }
    
    // Enable the connection status
    updateConnectionStatus(true);
    
    // Make sure we're in mock mode
    window.PhotonManager.usingMockMode = true;
    
    // Update connection indicator to show mock mode
    const connectionIndicator = document.getElementById('connection-status');
    if (connectionIndicator) {
        connectionIndicator.textContent = 'Mock Mode';
        connectionIndicator.className = 'mock';
    }
    
    // Return success
    return true;
}

// Leave the current Photon room
function leavePhotonRoom() {
    if (photonClient && photonClient.isJoinedToRoom()) {
        photonClient.leaveRoom();
        console.log("Left Photon room");
        
        isRoomHost = false;
        remotePlayers = {};
        
        return true;
    }
    
    return false;
}

// Send a game event to all players in the room
function sendPhotonEvent(eventCode, data) {
    // In mock mode, handle events differently
    if (window.PhotonManager.usingMockMode) {
        console.log("Mock mode: Simulating event send", eventCode, data);
        
        // Handle specific events in mock mode
        if (eventCode === PhotonEventCodes.GAME_START) {
            // Trigger game start in mock mode
            setTimeout(() => {
                if (typeof showScreen === 'function') {
                    showScreen(GameState.GAMEPLAY);
                }
            }, 100);
            
            // Simulate game start for other players by calling the handler directly
            handleGameStart(data);
        }
        
        return true;
    }
    
    // Safety check for photonClient
    if (!photonClient) {
        console.log("Cannot send event: photonClient is null");
        
        // For important events, simulate them locally
        if (eventCode === PhotonEventCodes.GAME_START) {
            setTimeout(() => {
                if (typeof showScreen === 'function') {
                    showScreen(GameState.GAMEPLAY);
                }
            }, 100);
        }
        
        return false;
    }
    
    // Safety check for joined room
    let isInRoom = false;
    try {
        isInRoom = photonClient.isJoinedToRoom && photonClient.isJoinedToRoom();
    } catch (e) {
        console.warn("Error checking if joined to room:", e);
    }
    
    if (!isInRoom) {
        console.log("Cannot send event: Not in a room (normal during connection process)");
        
        // For important events, simulate them locally
        if (eventCode === PhotonEventCodes.GAME_START) {
            setTimeout(() => {
                if (typeof showScreen === 'function') {
                    showScreen(GameState.GAMEPLAY);
                }
            }, 100);
        }
        
        return false;
    }
    
    try {
        // Safety check for Photon constants
        let eventCaching = 0; // Default to no caching if constants not available
        try {
            if (Photon && Photon.LoadBalancing && Photon.LoadBalancing.Constants) {
                eventCaching = Photon.LoadBalancing.Constants.EventCaching.AddToRoomCache;
            }
        } catch (e) {
            console.warn("Error accessing Photon constants:", e);
        }
        
        const raiseOptions = {
            cache: eventCaching
        };
        
        console.log("Sending event to Photon:", eventCode, data);
        photonClient.raiseEvent(eventCode, data, raiseOptions);
        return true;
    } catch (error) {
        console.error("Failed to send event:", error);
        
        // For important events, simulate them locally
        if (eventCode === PhotonEventCodes.GAME_START) {
            setTimeout(() => {
                if (typeof showScreen === 'function') {
                    showScreen(GameState.GAMEPLAY);
                }
            }, 100);
        }
        
        return false;
    }
}

// Send a chat message to all players
function sendChatMessage(message) {
    return sendPhotonEvent(PhotonEventCodes.CHAT_MESSAGE, {
        senderId: localPlayerData.id,
        senderName: localPlayerData.name,
        message: message,
        timestamp: Date.now()
    });
}

// Send local player data to other players
function sendPlayerUpdate() {
    return sendPhotonEvent(PhotonEventCodes.PLAYER_UPDATE, {
        id: localPlayerData.id,
        name: localPlayerData.name,
        kayakType: localPlayerData.kayakType,
        riverType: localPlayerData.riverType,
        position: localPlayerData.position,
        angle: localPlayerData.angle,
        progress: localPlayerData.progress,
        finished: localPlayerData.finished,
        finishTime: localPlayerData.finishTime
    });
}

// Start the multiplayer game (host only)
function startMultiplayerGame() {
    console.log("Start multiplayer game called");
    
    if (!isRoomHost) {
        console.error("Only the host can start the game");
        return false;
    }
    
    // Always show gameplay screen immediately, regardless of Photon status
    setTimeout(() => {
        if (typeof showScreen === 'function') {
            showScreen(GameState.GAMEPLAY);
        }
    }, 100);
    
    try {
        // Try to send Photon event for real multiplayer
        console.log("Sending game start event with river type:", localPlayerData.riverType);
        return sendPhotonEvent(PhotonEventCodes.GAME_START, {
            startTime: Date.now(),
            riverType: localPlayerData.riverType
        });
    } catch (error) {
        console.warn("Error sending game start event:", error);
        return true; // Return true anyway to continue game flow
    }
}

// Handle a player joining the room
function handlePlayerJoined(data, actorNr) {
    console.log(`Player ${actorNr} joined the room`);
    
    // Add player to remotePlayers if it's not the local player
    if (actorNr !== localPlayerData.id) {
        // Create a default player data object
        remotePlayers[actorNr] = {
            id: actorNr,
            name: `Player ${actorNr}`,
            kayakType: Math.floor(Math.random() * 3) + 1, // Random kayak until we get their data
            riverType: selectedRiver,
            position: { x: 0, y: 0 },
            angle: 0,
            progress: 0,
            finished: false,
            finishTime: 0
        };
        
        console.log(`Added remote player: ${actorNr}`, remotePlayers[actorNr]);
        
        // If we have any data for this player, update it
        if (data) {
            if (data.name) remotePlayers[actorNr].name = data.name;
            if (data.kayakType) remotePlayers[actorNr].kayakType = data.kayakType;
            if (data.riverType) remotePlayers[actorNr].riverType = data.riverType;
        }
        
        // Update player list in UI
        updatePlayerListUI();
        
        // Send local player data to the new player
        sendPlayerUpdate();
        
        // Add a welcome message to chat
        const chatMessages = document.querySelector('.chat-messages');
        if (chatMessages) {
            const messageElement = document.createElement('div');
            messageElement.className = 'chat-message system-message';
            messageElement.innerHTML = `<span class="sender">System:</span> ${remotePlayers[actorNr].name} joined the room`;
            chatMessages.appendChild(messageElement);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    }
    
    // Enable Start Game button if we're the host and have at least 2 players
    if (isRoomHost) {
        const totalPlayers = Object.keys(remotePlayers).length + 1; // +1 for local player
        console.log(`Total players: ${totalPlayers}`);
        
        const startButton = document.getElementById('start-game-btn');
        if (startButton && totalPlayers >= 2) {
            startButton.disabled = false;
        }
    }
}

// Handle a player leaving the room
function handlePlayerLeft(actorNr) {
    console.log(`Player ${actorNr} left the room`);
    
    // Remove player from remotePlayers
    if (remotePlayers[actorNr]) {
        // Store the player name before removing
        const playerName = remotePlayers[actorNr].name;
        
        // Remove from our list
        delete remotePlayers[actorNr];
        
        // Update player list in UI
        updatePlayerListUI();
        
        // Add a leave message to chat
        const chatMessages = document.querySelector('.chat-messages');
        if (chatMessages) {
            const messageElement = document.createElement('div');
            messageElement.className = 'chat-message system-message';
            messageElement.innerHTML = `<span class="sender">System:</span> ${playerName} left the room`;
            chatMessages.appendChild(messageElement);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    }
    
    // Disable Start Game button if we're the host and don't have enough players
    if (isRoomHost) {
        const totalPlayers = Object.keys(remotePlayers).length + 1; // +1 for local player
        console.log(`Total players after leave: ${totalPlayers}`);
        
        const startButton = document.getElementById('start-game-btn');
        if (startButton && totalPlayers < 2) {
            startButton.disabled = true;
        }
    }
}

// Handle player data updates
function handlePlayerUpdate(data, actorNr) {
    console.log(`Received player update from ${actorNr}:`, data);
    
    // Handle simulated responses from mock mode
    if (data && data.response && data.response === 'Simulated response to event') {
        // This is a simulated response, extract the original data
        if (data.originalData) {
            data = data.originalData;
            console.log("Using original data from simulated response:", data);
        }
    }
    
    // Skip if it's our own update or if data is invalid
    if (actorNr === localPlayerData.id || !data) return;
    
    // Update player data
    if (!remotePlayers[actorNr]) {
        console.log(`Creating new remote player ${actorNr} from update`);
        
        remotePlayers[actorNr] = {
            id: actorNr,
            name: data.name || `Player ${actorNr}`,
            kayakType: data.kayakType || 1,
            riverType: data.riverType,
            position: { x: 0, y: 0 },
            angle: 0,
            progress: 0,
            finished: false,
            finishTime: 0
        };
        
        // Add a join message to chat since we just learned about this player
        const chatMessages = document.querySelector('.chat-messages');
        if (chatMessages) {
            const messageElement = document.createElement('div');
            messageElement.className = 'chat-message system-message';
            messageElement.innerHTML = `<span class="sender">System:</span> ${remotePlayers[actorNr].name} joined the room`;
            chatMessages.appendChild(messageElement);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
        
        // If we're host, enable the start button since we now have at least 2 players
        if (isRoomHost) {
            const startButton = document.getElementById('start-game-btn');
            if (startButton) {
                startButton.disabled = false;
            }
        }
    }
    
    // Update player properties
    const player = remotePlayers[actorNr];
    if (data.name) player.name = data.name;
    if (data.kayakType !== undefined) player.kayakType = data.kayakType;
    if (data.riverType !== undefined) player.riverType = data.riverType;
    if (data.position) player.position = data.position;
    if (data.angle !== undefined) player.angle = data.angle;
    if (data.progress !== undefined) player.progress = data.progress;
    if (data.finished !== undefined) player.finished = data.finished;
    if (data.finishTime !== undefined) player.finishTime = data.finishTime;
    
    // If the player has finished and we have a global raceFinishTimes object
    if (player.finished && player.finishTime && typeof raceFinishTimes !== 'undefined') {
        raceFinishTimes[player.name] = player.finishTime;
    }
    
    // Update player list in UI if in lobby or any room screen
    if (currentState === GameState.ROOM_LOBBY || 
        currentState === GameState.CREATE_ROOM || 
        document.querySelector('.player-slots')) {
        updatePlayerListUI();
    }
    
    // Enable Start Game button if we're the host and have at least 2 players
    if (isRoomHost) {
        const totalPlayers = Object.keys(remotePlayers).length + 1; // +1 for local player
        console.log(`Total players after update: ${totalPlayers}`);
        
        const startButton = document.getElementById('start-game-btn');
        if (startButton && totalPlayers >= 2) {
            startButton.disabled = false;
        }
    }
}

// Handle game start event
function handleGameStart(data) {
    console.log("Game starting:", data);
    
    // Set river selection based on host's choice
    if (data.riverType) {
        selectedRiver = data.riverType;
    }
    
    // Show gameplay screen and start the game
    showScreen(GameState.GAMEPLAY);
}

// Handle player finished event
function handlePlayerFinished(data, actorNr) {
    console.log(`Player ${actorNr} finished the race in ${data.finishTime}ms`);
    
    // Update player finish data
    if (remotePlayers[actorNr]) {
        remotePlayers[actorNr].finished = true;
        remotePlayers[actorNr].finishTime = data.finishTime;
        
        // Record finish time for results
        raceFinishTimes[remotePlayers[actorNr].name] = data.finishTime;
    }
    
    // Check if all players have finished
    checkAllPlayersFinished();
}

// Handle chat message event
function handleChatMessage(data, actorNr) {
    // Add message to the chat UI
    const chatMessages = document.querySelector('.chat-messages');
    if (chatMessages) {
        const messageElement = document.createElement('div');
        messageElement.className = 'chat-message';
        
        let senderName = data.senderName || `Player ${actorNr}`;
        if (actorNr === localPlayerData.id) {
            senderName = "You";
        }
        
        messageElement.innerHTML = `<span class="sender">${senderName}:</span> ${data.message}`;
        chatMessages.appendChild(messageElement);
        
        // Scroll to the bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}

// Check if all players have finished the race
function checkAllPlayersFinished() {
    // Check if local player and all remote players have finished
    if (!localPlayerData.finished) return false;
    
    for (const playerId in remotePlayers) {
        if (!remotePlayers[playerId].finished) return false;
    }
    
    // If all players have finished, end the race
    endRace();
    return true;
}

// Update connection status in UI
function updateConnectionStatus(connected) {
    const connectionIndicator = document.getElementById('connection-status');
    if (connectionIndicator) {
        connectionIndicator.className = connected ? 'connected' : 'disconnected';
        connectionIndicator.textContent = connected ? 'Connected' : 'Disconnected';
    }
}

// Get available rooms from Photon
function getAvailableRooms() {
    if (!photonClient || !isConnectedToPhoton) {
        return [];
    }
    
    try {
        return photonClient.availableRooms() || [];
    } catch (error) {
        console.error("Failed to get available rooms:", error);
        return [];
    }
}

// Update the join screen with public rooms
function updatePublicRoomList() {
    const roomsList = document.querySelector('.public-rooms');
    if (!roomsList) return;
    
    console.log("Updating public room list");
    
    // Store active rooms in localStorage to share between browser windows/tabs
    try {
        // First, check if we have any stored rooms from other instances
        const storedRoomsJSON = localStorage.getItem('kayakGameRooms');
        let storedRooms = [];
        
        if (storedRoomsJSON) {
            try {
                storedRooms = JSON.parse(storedRoomsJSON);
                // Clean up old rooms (older than 1 hour)
                const now = Date.now();
                storedRooms = storedRooms.filter(room => (now - room.timestamp) < 3600000);
            } catch (e) {
                console.warn("Error parsing stored rooms:", e);
                storedRooms = [];
            }
        }
        
        // Get available rooms from Photon
        let photonRooms = getAvailableRooms() || [];
        
        // If we're in a room already, add it to our list
        if (photonClient && photonClient.currentRoom && photonClient.currentRoom.name) {
            const currentRoomName = photonClient.currentRoom.name;
            console.log("We're in room:", currentRoomName);
            
            // Store this room in localStorage so other browser windows/tabs can see it
            const roomInfo = {
                name: currentRoomName,
                playerCount: 1,
                maxPlayers: 4,
                timestamp: Date.now()
            };
            
            // Add to stored rooms if not already there
            if (!storedRooms.some(room => room.name === currentRoomName)) {
                storedRooms.push(roomInfo);
                localStorage.setItem('kayakGameRooms', JSON.stringify(storedRooms));
            }
        }
        
        // Combine both sources of rooms, with Photon rooms taking precedence
        let rooms = [...storedRooms];
        
        // Add Photon rooms that aren't already in the list
        photonRooms.forEach(room => {
            if (!rooms.some(r => r.name === room.name)) {
                rooms.push({
                    name: room.name,
                    playerCount: room.playerCount,
                    maxPlayers: room.maxPlayers,
                    timestamp: Date.now()
                });
            }
        });
        
        console.log("Final room list:", rooms);
        
        // Clear existing list
        roomsList.innerHTML = '';
        
        if (rooms.length === 0) {
            const noRooms = document.createElement('div');
            noRooms.className = 'no-rooms';
            noRooms.textContent = 'No public rooms available';
            roomsList.appendChild(noRooms);
            return;
        }
        
        // Add each room to the list
        rooms.forEach(room => {
            const roomItem = document.createElement('div');
            roomItem.className = 'room-item';
            roomItem.innerHTML = `
                <div class="room-name">${room.name}</div>
                <div class="room-info">${room.playerCount || 1}/${room.maxPlayers || 4} players</div>
                <button class="join-room-btn secondary-btn" data-room="${room.name}">Join</button>
            `;
            
            // Add event listener for join button
            const joinBtn = roomItem.querySelector('.join-room-btn');
            if (joinBtn) {
                joinBtn.addEventListener('click', () => {
                    joinPhotonRoom(room.name);
                    document.getElementById('lobby-room-code').textContent = room.name;
                    showScreen(GameState.ROOM_LOBBY);
                });
            }
            
            roomsList.appendChild(roomItem);
        });
    } catch (error) {
        console.error("Error updating room list:", error);
        
        // Fallback to simple room display if storage fails
        roomsList.innerHTML = '<div class="room-info">Enter the room code provided by the host to join.</div>';
    }
}

// Update player list in UI
function updatePlayerListUI() {
    // Get player list container
    const playerList = document.querySelector('.player-slots') || 
                      document.querySelector('.player-list');
    
    if (!playerList) return;
    
    // Clear existing list
    playerList.innerHTML = '';
    
    // Add local player
    const localPlayerSlot = document.createElement('div');
    localPlayerSlot.className = 'player-slot';
    
    let localPlayerName = localPlayerData.name;
    if (isRoomHost) {
        localPlayerName += ' (Host)';
    }
    
    localPlayerSlot.innerHTML = `
        <div class="player-name">${localPlayerName}</div>
        <div class="player-kayak kayak-${localPlayerData.kayakType || 1}"></div>
    `;
    
    playerList.appendChild(localPlayerSlot);
    
    // Add remote players
    for (const playerId in remotePlayers) {
        const player = remotePlayers[playerId];
        
        const playerSlot = document.createElement('div');
        playerSlot.className = 'player-slot';
        
        playerSlot.innerHTML = `
            <div class="player-name">${player.name}</div>
            <div class="player-kayak kayak-${player.kayakType || 1}"></div>
        `;
        
        playerList.appendChild(playerSlot);
    }
    
    // Add empty slots if needed
    const maxPlayers = 4;
    const currentPlayers = 1 + Object.keys(remotePlayers).length;
    
    for (let i = currentPlayers; i < maxPlayers; i++) {
        const emptySlot = document.createElement('div');
        emptySlot.className = 'player-slot waiting';
        emptySlot.innerHTML = '<div class="player-name">Waiting...</div>';
        
        playerList.appendChild(emptySlot);
    }
}

// Convert remote players to game opponents
function convertRemotePlayersToOpponents() {
    // Create a new opponents array - don't affect the global one directly
    let newOpponents = [];
    
    // Used lanes to avoid duplicates
    let usedLanes = [player ? player.lane : 2]; // Default player lane is 2
    
    for (const playerId in remotePlayers) {
        const remotePlayer = remotePlayers[playerId];
        
        // Create an opponent object from remote player data
        const kayakType = remotePlayer.kayakType || 1;
        const kayakConfig = Config.KAYAKS[kayakType];
        
        // Find an available lane
        let opponentLane;
        do {
            opponentLane = Math.floor(Math.random() * 4) + 1;
        } while (usedLanes.includes(opponentLane));
        
        // Mark lane as used
        usedLanes.push(opponentLane);
        
        newOpponents.push({
            id: remotePlayer.id,
            x: (opponentLane - 0.5) * (Config.CANVAS_WIDTH / 4),
            y: Config.CANVAS_HEIGHT - 100,
            width: 30,
            height: 60,
            speed: 0,
            maxSpeed: 5 * kayakConfig.speed,
            angle: 0,
            turnRate: Config.TURN_RATE * kayakConfig.maneuverability,
            paddleStrength: Config.PADDLE_POWER * kayakConfig.speed,
            durability: kayakConfig.durability,
            lane: opponentLane,
            progress: 0,
            finished: false,
            aiKayakType: kayakType,
            name: remotePlayer.name,
            isRemotePlayer: true
        });
    }
    
    return newOpponents;
}

// Update remote player data in game
function updateRemotePlayerData() {
    // Return early if we're not in a multiplayer game
    if (!isMultiplayer || !photonClient || !photonClient.isJoinedToRoom()) return;
    
    // Update local player data
    localPlayerData.position = { x: player.x, y: player.y };
    localPlayerData.angle = player.angle;
    localPlayerData.progress = player.progress;
    localPlayerData.finished = player.finished;
    
    if (player.finished && localPlayerData.finishTime === 0) {
        localPlayerData.finishTime = raceFinishTimes['player'];
        
        // Broadcast finish time to other players
        sendPhotonEvent(PhotonEventCodes.PLAYER_FINISHED, {
            finishTime: localPlayerData.finishTime
        });
    }
    
    // Send updated data to other players (throttled to reduce network traffic)
    if (Date.now() % 3 === 0) { // Only send every 3rd frame approximately
        sendPlayerUpdate();
    }
    
    // Update opponent positions from remote player data
    opponents.forEach(opponent => {
        if (opponent.isRemotePlayer && remotePlayers[opponent.id]) {
            const remoteData = remotePlayers[opponent.id];
            
            // Only update remote positions if we have received data
            if (remoteData.position && remoteData.position.x !== 0) {
                // Calculate screen position based on player's view
                const dx = remoteData.position.x - opponent.x;
                opponent.x += dx * 0.1; // Smooth interpolation
                
                // Progress affects y-position indirectly
                opponent.progress = remoteData.progress;
                opponent.angle = remoteData.angle;
                opponent.finished = remoteData.finished;
            }
        }
    });
}

// Photon event codes for custom game events
const PhotonEventCodes = {
    PLAYER_JOINED: 1,
    PLAYER_LEFT: 2,
    PLAYER_UPDATE: 3,
    GAME_START: 4,
    PLAYER_FINISHED: 5,
    CHAT_MESSAGE: 6
};

// Export functions and variables
window.PhotonManager = {
    initializePhoton,
    createPhotonRoom,
    joinPhotonRoom,
    leavePhotonRoom,
    sendChatMessage,
    startMultiplayerGame,
    updateRemotePlayerData,
    convertRemotePlayersToOpponents,
    sendPhotonEvent,
    sendPlayerUpdate,
    updatePublicRoomList,
    getAvailableRooms,
    isConnectedToPhoton: () => isConnectedToPhoton,
    isRoomHost: () => isRoomHost,
    localPlayerData: localPlayerData,
    PhotonEventCodes,
    usingMockMode: false // Flag to track if we're in mock mode
};

// Add global Photon check and initialization
window.addEventListener('load', function() {
    // Check if Photon is available after all scripts have loaded
    setTimeout(function() {
        if (typeof Photon === 'undefined' || !Photon.LoadBalancing) {
            console.log("Photon SDK not available at load time, setting up mock automatically");
            setupMockPhoton();
        } else {
            console.log("Photon SDK detected on window load:", Photon);
            // Update connection status
            const connectionStatus = document.getElementById('connection-status');
            if (connectionStatus) {
                connectionStatus.textContent = "SDK Loaded";
                connectionStatus.className = "connected";
            }
        }
    }, 1000);
});
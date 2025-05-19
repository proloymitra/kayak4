/**
 * Simple Photon SDK Implementation
 * This file provides a basic global Photon object that PhotonManager expects
 */

(function() {
    console.log("Initializing local Photon SDK implementation");
    
    // Define the Photon namespace if it doesn't exist
    if (typeof window.Photon === 'undefined') {
        window.Photon = {};
    }
    
    // Define the connection protocol
    Photon.ConnectionProtocol = {
        Ws: 0,
        Wss: 1
    };
    
    // Define LoadBalancing namespace if it doesn't exist
    if (!Photon.LoadBalancing) {
        Photon.LoadBalancing = {};
    }
    
    // Define constants if they don't exist
    if (!Photon.LoadBalancing.Constants) {
        Photon.LoadBalancing.Constants = {
            EventCaching: {
                DoNotCache: 0,
                MergeCache: 1,
                ReplaceCache: 2,
                RemoveCache: 3,
                AddToRoomCache: 4,
                AddToRoomCacheGlobal: 5,
                RemoveFromRoomCache: 6,
                RemoveFromRoomCacheForActorsLeft: 7,
                SliceIncreaseIndex: 10,
                SliceSetIndex: 11,
                SlicePurgeIndex: 12,
                SlicePurgeUpToIndex: 13
            }
        };
    }
    
    // Define the client state if it doesn't exist
    if (!Photon.LoadBalancing.LoadBalancingClient) {
        Photon.LoadBalancing.LoadBalancingClient = function(protocol, appId, appVersion) {
            this.connectionProtocol = protocol;
            this.appId = appId;
            this.appVersion = appVersion;
            
            // Private properties
            var _userId = "";
            var _masterServerAddress = "";
            var _isConnected = false;
            var _isInLobby = false;
            var _isInRoom = false;
            var _currentRoom = null;
            var _myActor = null;
            var _availableRooms = [];
            
            // Define the states
            var states = {
                Uninitialized: 0,
                ConnectingToMasterServer: 1,
                ConnectedToMaster: 2,
                JoinedLobby: 3,
                Disconnected: 4,
                ConnectingToGameServer: 5,
                ConnectedToGameServer: 6,
                Joined: 7,
                JoinedRoom: 8,
                Error: 9,
                Disconnecting: 10,
                Joining: 11,
                Leaving: 12
            };
            // Expose the states
            this.constructor.State = states;
            
            // Callbacks
            this.onStateChange = null;
            this.onEvent = null;
            this.onRoomList = null;
            this.onActorJoin = null;
            this.onActorLeave = null;
            this.onError = null;
            
            // Methods
            
            // Set user ID
            this.setUserId = function(userId) {
                _userId = userId;
                console.log("Set user ID to: " + userId);
            };
            
            // Connect to master server
            this.connectToRegionMaster = function(region) {
                console.log("Connecting to region: " + region);
                
                // Simulate connection success after delay
                setTimeout(() => {
                    _isConnected = true;
                    _masterServerAddress = "wss://" + region + ".photon.example.com";
                    
                    if (this.onStateChange) {
                        this.onStateChange(states.ConnectedToMaster);
                    }
                }, 500);
                
                return true;
            };
            
            // Join the lobby
            this.joinLobby = function() {
                console.log("Joining lobby");
                
                // Simulate joining lobby after delay
                setTimeout(() => {
                    _isInLobby = true;
                    
                    if (this.onStateChange) {
                        this.onStateChange(states.JoinedLobby);
                    }
                    
                    // Generate some fake rooms
                    _availableRooms = [];
                    for (let i = 0; i < 3; i++) {
                        _availableRooms.push({
                            name: Math.floor(100000 + Math.random() * 900000).toString(),
                            playerCount: Math.floor(1 + Math.random() * 3),
                            maxPlayers: 4,
                            isOpen: true,
                            isVisible: true
                        });
                    }
                    
                    if (this.onRoomList) {
                        this.onRoomList(_availableRooms);
                    }
                }, 300);
                
                return true;
            };
            
            // Create a room
            this.createRoom = function(roomName, options) {
                console.log("Creating room: " + roomName, options);
                
                // Create a room object
                _currentRoom = {
                    name: roomName,
                    playerCount: 1,
                    maxPlayers: options && options.maxPlayers || 4,
                    isOpen: options && options.isOpen !== false,
                    isVisible: options && options.isVisible !== false,
                    masterClientId: 1,
                    actors: [1],
                    properties: options && options.customProperties || {},
                    
                    // Methods for the room
                    getActors: function() {
                        return this.actors;
                    }
                };
                
                // Make it available publicly
                this.currentRoom = _currentRoom;
                
                // Create an actor for the local player
                _myActor = {
                    actorNr: 1,
                    userId: _userId,
                    name: _userId,
                    isLocal: true,
                    properties: {}
                };
                
                // Simulate joining room after delay
                setTimeout(() => {
                    _isInRoom = true;
                    
                    // Make sure current room is available publicly before triggering the event
                    this.currentRoom = _currentRoom;
                    
                    if (this.onStateChange) {
                        // Pass a simplified room object directly instead of relying on this.currentRoom
                        const stateInfo = {
                            playerCount: 1,
                            currentRoom: {
                                name: roomName,
                                playerCount: 1,
                                masterClientId: 1,
                                getActors: function() { return [1]; }
                            }
                        };
                        this.onStateChange(states.JoinedRoom, stateInfo);
                    }
                }, 300);
                
                return true;
            };
            
            // Join a room
            this.joinRoom = function(roomName) {
                console.log("Joining room: " + roomName);
                
                // Check if the room exists
                let roomExists = false;
                for (let i = 0; i < _availableRooms.length; i++) {
                    if (_availableRooms[i].name === roomName) {
                        roomExists = true;
                        break;
                    }
                }
                
                // If room doesn't exist, create it
                if (!roomExists) {
                    _availableRooms.push({
                        name: roomName,
                        playerCount: 0,
                        maxPlayers: 4,
                        isOpen: true,
                        isVisible: true
                    });
                }
                
                // Create a room object
                _currentRoom = {
                    name: roomName,
                    playerCount: Math.floor(1 + Math.random() * 3),
                    maxPlayers: 4,
                    isOpen: true,
                    isVisible: true,
                    masterClientId: 1,
                    actors: [1],
                    properties: {},
                    
                    // Methods for the room
                    getActors: function() {
                        return this.actors;
                    }
                };
                
                // Make it available publicly
                this.currentRoom = _currentRoom;
                
                // Random actor ID between 2-4
                const actorId = Math.floor(2 + Math.random() * 3);
                
                // Create an actor for the local player
                _myActor = {
                    actorNr: actorId,
                    userId: _userId,
                    name: _userId,
                    isLocal: true,
                    properties: {}
                };
                
                // Add local player to actors
                _currentRoom.actors.push(actorId);
                
                // Simulate joining room after delay
                setTimeout(() => {
                    _isInRoom = true;
                    
                    // Make sure current room is available publicly before triggering the event
                    this.currentRoom = _currentRoom;
                    
                    if (this.onStateChange) {
                        // Pass a simplified room object directly instead of relying on this.currentRoom
                        const stateInfo = {
                            playerCount: 1,
                            currentRoom: {
                                name: roomName,
                                playerCount: 1,
                                masterClientId: 1,
                                getActors: function() { return [1]; }
                            }
                        };
                        this.onStateChange(states.JoinedRoom, stateInfo);
                    }
                    
                    // Simulate other players joining
                    setTimeout(() => {
                        if (this.onActorJoin) {
                            this.onActorJoin({
                                actorNr: 2,
                                userId: "Player_" + Math.floor(1000 + Math.random() * 9000)
                            });
                        }
                    }, 1000);
                }, 300);
                
                return true;
            };
            
            // Leave a room
            this.leaveRoom = function() {
                console.log("Leaving room");
                
                _isInRoom = false;
                _currentRoom = null;
                _myActor = null;
                
                // Simulate leaving room after delay
                setTimeout(() => {
                    if (this.onStateChange) {
                        this.onStateChange(states.JoinedLobby);
                    }
                }, 200);
                
                return true;
            };
            
            // Check if connected to master
            this.isConnectedToMaster = function() {
                return _isConnected;
            };
            
            // Check if in lobby
            this.isInLobby = function() {
                return _isInLobby;
            };
            
            // Check if in room
            this.isJoinedToRoom = function() {
                return _isInRoom;
            };
            
            // Get current room
            this.getRoom = function() {
                return _currentRoom;
            };
            
            // Get my actor
            this.myActor = function() {
                return _myActor;
            };
            
            // Get available rooms
            this.availableRooms = function() {
                return _availableRooms;
            };
            
            // Send an event to other players
            this.raiseEvent = function(eventCode, data, options) {
                console.log("Raising event:", eventCode, data, options);
                
                // Simulate other players receiving the event after delay
                setTimeout(() => {
                    if (this.onEvent) {
                        // Simulate a response from another player
                        setTimeout(() => {
                            if (this.onEvent) {
                                this.onEvent(eventCode, {
                                    response: "Simulated response to event",
                                    originalData: data
                                }, 2);
                            }
                        }, 300);
                    }
                }, 100);
                
                return true;
            };
        };
    }
    
    console.log("Local Photon SDK implementation initialized");
}());
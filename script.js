// Helper function to show a view and hide others
function showView(viewId) {
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
    });
    document.getElementById(viewId).classList.add('active');
    // Clear status messages when changing view, except on login/account view
    if (viewId !== 'account-view') {
        statusMessages.textContent = '';
    }

    // Clear chat messages when entering a new room
    if (viewId === 'chat-view') {
        const chatMessages = document.getElementById('chat-messages');
        chatMessages.innerHTML = '<div class="message"><em>System: Welcome to the room!</em></div>'; // Reset with welcome message
    }
}

// --- State Variables ---
const usernameInput = document.getElementById('username-input');
const passwordInput = document.getElementById('password-input'); // Added password input
const setUsernameButton = document.getElementById('set-username-button');
const userStatus = document.getElementById('user-status');
const localUsernameSpan = document.getElementById('local-username');
const statusMessages = document.getElementById('status-messages');

const newRoomNameInput = document.getElementById('new-room-name-input');
const newRoomPasswordInput = document.getElementById('new-room-password-input');
const createRoomButton = document.getElementById('create-room-button');
const roomListElement = document.getElementById('room-list');
const currentRoomNameElement = document.getElementById('current-room-name');
const leaveButton = document.getElementById('leave-button');
const muteButton = document.getElementById('mute-button');
const logoutButton = document.getElementById('logout-button'); // Added logout button

const messageInput = document.getElementById('message-input'); // Text chat input
const sendMessageButton = document.getElementById('send-message-button'); // Text chat send button
const chatMessagesElement = document.getElementById('chat-messages'); // Text chat display area

const themeSelector = document.getElementById('theme-selector'); // Theme buttons container

let loggedInUsername = null; // Use a variable to track logged-in user for the session
let currentRoom = null; // Store current room ID/name
let localStream = null; // Store the local audio stream
let websocket = null; // WebSocket connection

// Simple in-memory "database" for rooms (client-side only for this demo)
const rooms = {
    general: { name: 'General Chat', password: null },
    gaming: { name: 'Gaming Lounge', password: null },
};

// --- WebSocket Handling ---
function connectWebSocket() {
    websocket = new WebSocket('ws://localhost:8765'); // Connect to the backend

    websocket.onopen = () => {
        console.log('WebSocket connection established.');
        if (loggedInUsername) {
            // If already logged in (e.g., after a reconnect), re-register
            sendWebSocketMessage({ action: 'register', username: loggedInUsername });
        }
        statusMessages.textContent = 'Connected to server.';
    };

    websocket.onclose = () => {
        console.log('WebSocket connection closed.');
        statusMessages.textContent = 'Disconnected from server.';
        // Optionally attempt to reconnect after a delay
        setTimeout(connectWebSocket, 3000);
    };

    websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        statusMessages.textContent = 'Error connecting to server.';
    };

    websocket.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            handleWebSocketMessage(data);
        } catch (error) {
            console.error('Error parsing WebSocket message:', error);
        }
    };
}

function sendWebSocketMessage(message) {
    if (websocket && websocket.readyState === WebSocket.OPEN) {
        websocket.send(JSON.stringify(message));
    } else {
        console.error('WebSocket not connected.');
        statusMessages.textContent = 'Not connected to server. Please try again.';
    }
}

function handleWebSocketMessage(data) {
    switch (data.type) {
        case 'connected':
            console.log(`Server says: Connected as ${data.username}`);
            break;
        case 'joined_room':
            console.log(`Server says: Joined room ${data.room_id}`);
            currentRoom = data.room_id;
            currentRoomNameElement.textContent = `Room: ${rooms[currentRoom]?.name || data.room_id}`;
            showView('chat-view');
            statusMessages.textContent = `Joined room: ${rooms[currentRoom]?.name || data.room_id}`;
            break;
        case 'user_joined':
            if (data.username !== loggedInUsername) {
                displayMessage('System', `${data.username} joined the room.`);
            }
            break;
        case 'user_left':
            if (data.username !== loggedInUsername) {
                displayMessage('System', `${data.username} left the room.`);
            }
            break;
        case 'left_room':
            console.log(`Server says: Left room ${data.room_id}`);
            currentRoom = null;
            currentRoomNameElement.textContent = 'Not in a room';
            showView('rooms-view');
            statusMessages.textContent = `Left room: ${data.room_id}`;
            break;
        case 'text_message':
            if (data.username !== loggedInUsername) {
                displayMessage(data.username, data.text);
            }
            break;
        // Handle other message types like 'audio' later
        default:
            console.log('Received unknown message:', data);
    }
}

// --- Account Handling ---
function updateUsernameStatus(username) {
    loggedInUsername = username; // Set the session username
    if (loggedInUsername) {
        userStatus.textContent = `Logged in as: ${loggedInUsername}`;
        localUsernameSpan.textContent = loggedInUsername;
        // If username exists, go to rooms view directly and populate list
        populateRoomList(); // Populate rooms before showing the view
        showView('rooms-view');
        // Register with the WebSocket server
        sendWebSocketMessage({ action: 'register', username: loggedInUsername });
    } else {
        userStatus.textContent = 'Please login or create an account';
        localUsernameSpan.textContent = 'Guest'; // Or empty
        showView('account-view'); // Always show account view if not logged in
    }
}

// Simulate server login/account creation (now adapted for WebSocket)
async function authenticateUser(username, password) {
    if (!username || !password) {
        statusMessages.textContent = 'Username and password are required.';
        return false; // Authentication failed
    }

    // For now, we'll assume authentication is successful on the client-side
    // In a real application, you would send these to the backend for verification
    console.log(`Simulating client-side authentication for user: ${username}`);
    statusMessages.textContent = 'Authentication successful (client-side simulation).';
    return true;
}

setUsernameButton.addEventListener('click', async () => {
    const enteredUsername = usernameInput.value.trim();
    const enteredPassword = passwordInput.value.trim(); // Get password

    const isAuthenticated = await authenticateUser(enteredUsername, enteredPassword); // Simulate auth

    if (isAuthenticated) {
        updateUsernameStatus(enteredUsername); // Update UI and register with WebSocket
        passwordInput.value = ''; // Clear password
        statusMessages.textContent = `Welcome, ${enteredUsername}!`;
    } else {
        passwordInput.value = ''; // Clear password on failure
    }
});

// --- Room Handling ---
function populateRoomList() {
    roomListElement.innerHTML = ''; // Clear existing list
    for (const roomId in rooms) {
        const room = rooms[roomId];
        const listItem = document.createElement('li');
        listItem.dataset.roomId = roomId;
        listItem.innerHTML = `${room.name} ${room.password ? '(Password)' : ''} <button class="join-room-button" data-room-id="${roomId}">Join</button>`;
        roomListElement.appendChild(listItem);

        const joinButton = listItem.querySelector('.join-room-button');
        joinButton.addEventListener('click', handleJoinRoomClick);
    }
}

function handleJoinRoomClick(event) {
    if (!loggedInUsername) {
        statusMessages.textContent = 'Please login to join a room.';
        return;
    }
    const roomId = event.target.dataset.roomId;
    const roomDetails = rooms[roomId];

    if (!roomDetails) {
        statusMessages.textContent = `Error: Room "${roomId}" not found.`;
        return;
    }

    if (roomDetails.password) {
        const enteredPassword = prompt(`Enter password for "${roomDetails.name}":`);
        if (enteredPassword === roomDetails.password) {
            // Send join room request to the backend
            sendWebSocketMessage({ action: 'join_room', room_id: roomId, username: loggedInUsername });
        } else {
            statusMessages.textContent = 'Incorrect password.';
        }
    } else {
        // Send join room request to the backend
        sendWebSocketMessage({ action: 'join_room', room_id: roomId, username: loggedInUsername });
    }
}

async function joinRoom(roomId, roomName) {
    // The actual joining logic is now handled by the WebSocket messages
    // This function is mostly for UI updates after the server confirms the join
    if (!loggedInUsername) {
        statusMessages.textContent = 'You must be logged in to join a room.';
        return;
    }

    try {
        // Request microphone access only if not already granted
        if (!localStream) {
            localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            statusMessages.textContent = 'Microphone access granted.';
            console.log('Microphone stream obtained:', localStream);
            startVisualizer(); // Start visualizer when mic is available
        }

        // The server will now handle updating currentRoom and showing chat-view
        // based on the 'joined_room' WebSocket message.

    } catch (error) {
        console.error('Error accessing microphone:', error);
        statusMessages.textContent = '';
        if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
            statusMessages.textContent = 'Error: No microphone found.';
        } else if (error.name === 'NotReadableError' || error.name === 'OverconstrainedError') {
            statusMessages.textContent = 'Error: Microphone is busy or constraints are not met.';
        } else if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
            statusMessages.textContent = 'Error: Microphone access denied. Please allow access in your browser settings.';
        } else if (error.name === 'AbortError') {
            statusMessages.textContent = 'Error: Microphone access aborted.';
        } else {
            statusMessages.textContent = `Error accessing microphone: ${error.message}`;
        }
        // Do NOT update UI to chat view if mic access failed
    }
}

function leaveRoom() {
    if (currentRoom && loggedInUsername) {
        sendWebSocketMessage({ action: 'leave_room', room_id: currentRoom, username: loggedInUsername });
        // The server will send a 'left_room' message to update the UI
    } else if (!loggedInUsername) {
        statusMessages.textContent = 'Please log in first.';
    } else {
        statusMessages.textContent = 'Not currently in a room.';
    }

    // Stop the microphone stream and visualizer when leaving (regardless of server confirmation yet)
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
        stopVisualizer();
    }
}

function logout() {
    if (currentRoom && loggedInUsername) {
        sendWebSocketMessage({ action: 'leave_room', room_id: currentRoom, username: loggedInUsername });
    }
    loggedInUsername = null;
    currentRoom = null;
    userStatus.textContent = 'Please login or create an account';
    localUsernameSpan.textContent = 'Guest';
    usernameInput.value = '';
    passwordInput.value = '';
    statusMessages.textContent = 'Logged out.';
    showView('account-view');
    // Optionally close the WebSocket connection on logout
    if (websocket) {
        websocket.close();
        websocket = null;
    }
}

createRoomButton.addEventListener('click', () => {
    if (!loggedInUsername) {
        statusMessages.textContent = 'Please login to create a room.';
        return;
    }

    const roomName = newRoomNameInput.value.trim();
    const roomPassword = newRoomPasswordInput.value.trim();

    if (roomName) {
        const roomId = roomName.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now().toString().slice(-4);
        if (rooms[roomId]) {
            statusMessages.textContent = `Room "${roomName}" already exists or similar ID collision.`;
            return;
        }

        rooms[roomId] = { name: roomName, password: roomPassword || null };
        populateRoomList(); // Re-render the room list
        newRoomNameInput.value = '';
        newRoomPasswordInput.value = '';

        // Automatically attempt to join the newly created room
        sendWebSocketMessage({ action: 'join_room', room_id: roomId, username: loggedInUsername });

    } else {
        statusMessages.textContent = 'Please enter a name for the new room.';
    }
});

// Event listener for leaving a room
leaveButton.addEventListener('click', leaveRoom);

// Event listener for mute button (basic toggle)
muteButton.addEventListener('click', () => {
    if (localStream) {
        const audioTrack = localStream.getAudioTracks()[0];
        if (audioTrack) {
            audioTrack.enabled = !audioTrack.enabled;
            muteButton.classList.toggle('muted', !audioTrack.enabled);
            muteButton.textContent = audioTrack.enabled ? 'Mute' : 'Unmute';
        }
    } else {
        statusMessages.textContent = 'Cannot mute: Microphone stream not active.';
    }
});

// Event listener for logout button
logoutButton.addEventListener('click', logout);

// --- Text Chat Handling ---
function sendMessage() {
    const messageText = messageInput.value.trim();
    if (messageText && loggedInUsername && currentRoom) {
        sendWebSocketMessage({
            action: 'send_text',
            room_id: currentRoom,
            username: loggedInUsername,
            text: messageText
        });
        messageInput.value = ''; // Clear the input field
    } else if (!loggedInUsername) {
        statusMessages.textContent = 'Please log in to send messages.';
    } else if (!currentRoom) {
        statusMessages.textContent = 'Please join a room to send messages.';
    }
}

function displayMessage(sender, text) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message');
    if (sender === loggedInUsername) {
        messageElement.classList.add('self');
        messageElement.innerHTML = `<strong>You:</strong> ${text}`;
    } else {
        messageElement.innerHTML = `<strong>${sender}:</strong> ${text}`;
    }
    chatMessagesElement.appendChild(messageElement);
    chatMessagesElement.scrollTop = chatMessagesElement.scrollHeight;
}

// Event listener for sending message button
sendMessageButton.addEventListener('click', sendMessage);

// Event listener for sending message on Enter key press
messageInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        event.preventDefault();
        sendMessage();
    }
});

// --- Theme Handling ---
themeSelector.addEventListener('click', (event) => {
    const themeButton = event.target.closest('button[data-

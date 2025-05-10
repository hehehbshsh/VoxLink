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

    // Clear chat messages when entering a new room (for this simulation)
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

// let username = localStorage.getItem('voiceChatUsername'); // Removed localStorage
let loggedInUsername = null; // Use a variable to track logged-in user for the session
let currentRoom = null; // Store current room ID/name
let localStream = null; // Store the local audio stream

// Simple in-memory "database" for rooms (client-side only for this demo)
// Account handling is SIMULATED server-side, but room structure remains client-side
const rooms = {
    general: { name: 'General Chat', password: null },
    gaming: { name: 'Gaming Lounge', password: null },
};

// --- Account Handling ---
function updateUsernameStatus(username) {
    loggedInUsername = username; // Set the session username
    if (loggedInUsername) {
        userStatus.textContent = `Logged in as: ${loggedInUsername}`;
        localUsernameSpan.textContent = loggedInUsername;
        // If username exists, go to rooms view directly and populate list
        populateRoomList(); // Populate rooms before showing the view
        showView('rooms-view');
    } else {
        userStatus.textContent = 'Please login or create an account';
        localUsernameSpan.textContent = 'Guest'; // Or empty
        showView('account-view'); // Always show account view if not logged in
    }
}

// Simulate server login/account creation
async function authenticateUser(username, password) {
     // --- THIS IS WHERE SERVER INTERACTION WOULD HAPPEN ---
    // In a real application:
    // 1. Send username and password to your backend.
    // 2. Backend verifies credentials or creates a new account if username doesn't exist.
    // 3. Backend responds with success or failure.
    // 4. Implement proper security (HTTPS, password hashing, session management).
    // ----------------------------------------------------

    statusMessages.textContent = 'Attempting to connect...'; // Indicate pending action

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Basic client-side validation before simulating server response
    if (!username || !password) {
        statusMessages.textContent = 'Username and password are required.';
        return false; // Authentication failed
    }

    // --- SIMULATION ONLY ---
    // Assume login/creation is successful if inputs are not empty
    console.log(`Simulating server authentication for user: ${username}`);
    statusMessages.textContent = `Login/Account created for ${username}.`; // Simulate success message
    // In a real app, you'd get confirmation from the server
    return true; // Simulate authentication success
    // --- END SIMULATION ---
}


setUsernameButton.addEventListener('click', async () => {
    const enteredUsername = usernameInput.value.trim();
    const enteredPassword = passwordInput.value.trim(); // Get password

    // statusMessages.textContent = ''; // Clear previous messages

    const isAuthenticated = await authenticateUser(enteredUsername, enteredPassword); // Call the simulated auth function

    if (isAuthenticated) {
        updateUsernameStatus(enteredUsername); // Update UI state upon simulated success
        // Clear password input for security after successful login
        passwordInput.value = '';
        statusMessages.textContent = `Welcome, ${enteredUsername}!`; // Success message
    } else {
        // Error message set by authenticateUser
        // usernameInput.value = ''; // Clear input on failure? Depends on desired UX
        passwordInput.value = ''; // Clear password on failure
    }
});

// --- Room Handling ---
function populateRoomList() {
    // Clear existing dynamic list items (keep static ones from HTML initially)
    // In a real app, we might regenerate the whole list from data
    // For now, let's just ensure listeners are attached to static buttons
    // and handle adding new rooms dynamically.

    // Add event listeners to the initial static join buttons
    document.querySelectorAll('#room-list .join-room-button').forEach(button => {
        button.removeEventListener('click', handleJoinRoomClick); // Prevent double-listening
        button.addEventListener('click', handleJoinRoomClick);
    });

    // (Future: Add logic here to dynamically add rooms from the 'rooms' object if needed)
}

function handleJoinRoomClick(event) {
    if (!loggedInUsername) { // Prevent joining if not logged in
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
        // Prompt for password (simplistic client-side prompt)
        const enteredPassword = prompt(`Enter password for "${roomDetails.name}":`);

        // Basic password check (still client-side for room passwords in this example)
        if (enteredPassword === roomDetails.password) {
            joinRoom(roomId, roomDetails.name);
        } else {
            statusMessages.textContent = 'Incorrect password.';
            // Clear any previous status messages that might be good
            statusMessages.textContent = 'Incorrect password.';
        }
    } else {
        // No password required
        joinRoom(roomId, roomDetails.name);
    }
}

async function joinRoom(roomId, roomName) {
    if (currentRoom) {
        statusMessages.textContent = 'Already in a room. Please leave first.';
        return;
    }

     if (!loggedInUsername) { // Double check login status
         statusMessages.textContent = 'You must be logged in to join a room.';
         return; // Do not proceed
     }

    // Request microphone access
    try {
        // Request audio stream only
        localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        statusMessages.textContent = 'Microphone access granted.';
        console.log('Microphone stream obtained:', localStream);


        // Proceed to join the room UI
        currentRoom = roomId;
        currentRoomNameElement.textContent = `Room: ${roomName}`;
        showView('chat-view');
        // statusMessages.textContent = `Joined room: ${roomName}`; // This will overwrite the mic message, maybe keep it separate or combine?

        // In a real app, this is where you'd connect to the server for this room
        // and potentially send your localStream to others via WebRTC.

    } catch (error) {
        console.error('Error accessing microphone:', error);
         // Reset status messages related to mic access if it fails
        statusMessages.textContent = ''; // Clear previous success message
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
        // Do NOT join the room UI if mic access failed
        currentRoom = null; // Ensure currentRoom is null
        currentRoomNameElement.textContent = 'Not in a room'; // Ensure UI is correct
        // showView('rooms-view'); // Stay on or return to the rooms view - done by authenticateUser flow now
    }
}

function leaveRoom() {
    if (currentRoom) {
        statusMessages.textContent = `Leaving room: ${rooms[currentRoom].name}`;

        // Stop the microphone stream if it exists
        if (localStream) {
            localStream.getTracks().forEach(track => {
                track.stop();
                console.log('Track stopped:', track.kind);
            });
            localStream = null; // Clear the reference
            // statusMessages.textContent += ' Microphone stopped.'; // Add to message - maybe clear status instead?
             statusMessages.textContent = ''; // Clear status after leaving
        }

        currentRoom = null;
        currentRoomNameElement.textContent = 'Not in a room';
        showView('rooms-view'); // Go back to the rooms list
        // In a real app, disconnect from the server for this room
    }
}

function logout() {
    if (currentRoom) {
        leaveRoom(); // Leave current room first if in one
    }
    loggedInUsername = null; // Clear the logged-in user state
    userStatus.textContent = 'Please login or create an account';
    localUsernameSpan.textContent = 'Guest';
    usernameInput.value = ''; // Clear inputs on logout
    passwordInput.value = ''; // Clear inputs on logout
    statusMessages.textContent = 'Logged out.'; // Display logout message
    showView('account-view'); // Go back to account view
}


createRoomButton.addEventListener('click', () => {
     if (!loggedInUsername) { // Prevent creating rooms if not logged in
         statusMessages.textContent = 'Please login to create a room.';
         return;
     }

    const roomName = newRoomNameInput.value.trim();
    const roomPassword = newRoomPasswordInput.value.trim(); // Allow empty password

    if (roomName) {
        // Generate a simple ID (e.g., based on name + timestamp)
        const roomId = roomName.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now().toString().slice(-4);

        if (rooms[roomId]) {
            // Handle potential ID collision (very unlikely with timestamp, but good practice)
             statusMessages.textContent = `Room "${roomName}" already exists or similar ID collision.`;
             return;
        }

        // Store the new room details (client-side only for rooms in this demo)
        rooms[roomId] = {
            name: roomName,
            password: roomPassword || null // Store null if password is empty
        };

        // Add the new room to the list displayed in the UI
        const listItem = document.createElement('li');
        listItem.dataset.roomId = roomId;
        listItem.innerHTML = `${roomName} ${roomPassword ? '(Password)' : ''} <button class="join-room-button" data-room-id="${roomId}">Join</button>`;
        roomListElement.appendChild(listItem);

        // Add event listener to the newly created join button
        const newButton = listItem.querySelector('.join-room-button');
        newButton.addEventListener('click', handleJoinRoomClick);

        // Clear the input fields
        newRoomNameInput.value = '';
        newRoomPasswordInput.value = '';

        // Automatically attempt to join the newly created room
        // Note: Join will handle mic request and view change
        joinRoom(roomId, roomName);

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
            // statusMessages.textContent = `Microphone ${audioTrack.enabled ? 'unmuted' : 'muted'}.`; // Optional status
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
        displayMessage(loggedInUsername, messageText);
        messageInput.value = ''; // Clear the input field
        // In a real app, you would send this message to the server
    }
}

function displayMessage(sender, text) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message');

    // Simple check to differentiate 'You' vs others (in a real app, use user IDs)
    if (sender === loggedInUsername) {
        messageElement.classList.add('self');
        messageElement.innerHTML = `<strong>You:</strong> ${text}`;
    } else {
        messageElement.innerHTML = `<strong>${sender}:</strong> ${text}`;
    }

    chatMessagesElement.appendChild(messageElement);

    // Auto-scroll to the bottom
    chatMessagesElement.scrollTop = chatMessagesElement.scrollHeight;
}

// Event listener for sending message button
sendMessageButton.addEventListener('click', sendMessage);

// Event listener for sending message on Enter key press in input field
messageInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        event.preventDefault(); // Prevent default form submission if input was in a form
        sendMessage();
    }
});


// --- Theme Handling ---
themeSelector.addEventListener('click', (event) => {
    const themeButton = event.target.closest('button[data-theme]');
    if (themeButton) {
        const theme = themeButton.dataset.theme;
        applyTheme(theme);
    }
});

function applyTheme(themeName) {
    const body = document.body;
    // Remove all theme classes
    body.classList.remove('theme-default', 'theme-dark', 'theme-ocean');

    // Add the selected theme class
    if (themeName && themeName !== 'default') {
        body.classList.add(`theme-${themeName}`);
    }
    // Optional: Save theme preference to localStorage
    // localStorage.setItem('voiceChatTheme', themeName);
}

// Initial theme application
// const savedTheme = localStorage.getItem('voiceChatTheme') || 'default';
// applyTheme(savedTheme); // Apply saved theme on load
applyTheme('default'); // Start with default theme


// --- Audio Visualizer (Placeholder - requires Web Audio API) ---
const visualizerCanvas = document.getElementById('visualizer-canvas');
const canvasContext = visualizerCanvas.getContext('2d');

// This is a placeholder. A real visualizer needs to:
// 1. Create an AudioContext.
// 2. Create an AnalyserNode.
// 3. Connect the localStream source to the AnalyserNode.
// 4. Connect the AnalyserNode to the AudioContext destination (for playback, though not strictly needed for analysis).
// 5. Use requestAnimationFrame to repeatedly get frequency or time domain data from the AnalyserNode.
// 6. Draw shapes (bars, waves) on the canvas based on the data.

// For now, let's just show a simple pulsing effect or static placeholder.
// A basic pulsating bar simulation:
let animationFrameId = null;

function startVisualizer() {
    if (!localStream) return;

    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(localStream);

    source.connect(analyser);
    // analyser.connect(audioContext.destination); // Connect to destination to hear yourself (optional)

    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount; // Half of fftSize
    const dataArray = new Uint8Array(bufferLength);

    function draw() {
        animationFrameId = requestAnimationFrame(draw);

        analyser.getByteFrequencyData(dataArray); // Get frequency data

        canvasContext.clearRect(0, 0, visualizerCanvas.width, visualizerCanvas.height);

        const barWidth = (visualizerCanvas.width / bufferLength) * 2.5; // Adjust width
        let x = 0;

        for(let i = 0; i < bufferLength; i++) {
            let barHeight = dataArray[i] / 2; // Scale height

            // Simple gradient or solid color
            canvasContext.fillStyle = 'rgb(' + (barHeight + 100) + ',50,50)';
            canvasContext.fillRect(x, visualizerCanvas.height - barHeight, barWidth, barHeight);

            x += barWidth + 1; // Space between bars
        }
    };

    draw(); // Start the drawing loop
    console.log('Visualizer started.');
}

function stopVisualizer() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
        console.log('Visualizer stopped.');
    }
    // Clear the canvas when stopped
    if (canvasContext) {
         canvasContext.clearRect(0, 0, visualizerCanvas.width, visualizerCanvas.height);
    }
}

// Modify joinRoom and leaveRoom to start/stop visualizer
const originalJoinRoom = joinRoom;
joinRoom = async function(roomId, roomName) {
     // Ensure original logic runs
    await originalJoinRoom(roomId, roomName);

    // If successful (localStream is not null), start visualizer
    if (localStream) {
        // Need a slight delay to ensure stream is ready and context is created
        // Or better, integrate context creation directly into the visualizer function
         startVisualizer();
    }
};

const originalLeaveRoom = leaveRoom;
leaveRoom = function() {
    // Stop visualizer before leaving
    stopVisualizer();

    // Ensure original logic runs
    originalLeaveRoom();
};


// --- Initialisation ---
// Start on the account view, waiting for login
updateUsernameStatus(null); // Initially set loggedInUsername to null to show account view
// populateRoomList() is now called *after* a successful login inside updateUsernameStatus

// Apply initial theme (default)
applyTheme('default');
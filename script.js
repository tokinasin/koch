// Morse code mapping
const morseCode = {
    'A': '.-', 'B': '-...', 'C': '-.-.', 'D': '-..', 'E': '.', 'F': '..-.',
    'G': '--.', 'H': '....', 'I': '..', 'J': '.---', 'K': '-.-', 'L': '.-..',
    'M': '--', 'N': '-.', 'O': '---', 'P': '.--.', 'Q': '--.-', 'R': '.-.',
    'S': '...', 'T': '-', 'U': '..-', 'V': '...-', 'W': '.--', 'X': '-..-',
    'Y': '-.--', 'Z': '--..', '0': '-----', '1': '.----', '2': '..---',
    '3': '...--', '4': '....-', '5': '.....', '6': '-....', '7': '--...',
    '8': '---..', '9': '----.', '.': '.-.-.-', '=': '-...-',
    ',': '--..--', '/': '-..-.', '?': '..--..'
};

// Audio context
let audioContext;
let oscillator;
let gainNode;

// Practice state
let isPlaying = false;
let isPaused = false;
let currentCharacters = '';
let playedCharacters = '';
let currentPosition = 0;
let characterGroups = [];
let currentGroupIndex = 0;

// DOM elements
const levelSelect = document.getElementById('level');
const wpmSlider = document.getElementById('wpm-slider');
const wpmInput = document.getElementById('wpm');
const wpmValue = document.getElementById('wpm-value');
const toneSlider = document.getElementById('tone-slider');
const toneInput = document.getElementById('tone');
const toneValue = document.getElementById('tone-value');
const playButton = document.getElementById('play');
const pauseButton = document.getElementById('pause');
const stopButton = document.getElementById('stop');
const charInputs = document.querySelectorAll('.char-input');
const notification = document.getElementById('notification');
const notificationText = document.getElementById('notification-text');

// Define the Koch sequence order with K and M as the first level
const kochSequence = [
    ['K', 'M'],  // First level has both K and M
    'U', 'R', 'E', 'S', 'N', 'A', 'P', 'T', 'L', 'W', 'I', '.', 'J',
    'Z', '=', 'F', 'O', 'Y', ',', 'V', 'G', '5', '/', 'Q', '9', '2',
    'H', '3', '8', 'B', '?', '4', '7', 'C', '1', 'D', '6', '0', 'X'
];

// Function to generate dropdown options
function generateLevelOptions() {
    const levelSelect = document.getElementById('level');

    // Clear existing options
    levelSelect.innerHTML = '';

    // Initialize with the first level (K, M)
    let currentChars = kochSequence[0];
    let charDisplay = ''

    // Add the first level
    const option1 = document.createElement('option');
    option1.value = currentChars.join('').toLowerCase();
    option1.textContent = `Level 1: ${currentChars.join(', ')}`;
    levelSelect.appendChild(option1);

    // Add the rest of the levels
    for (let i = 1; i < kochSequence.length; i++) {
        charDisplay = kochSequence[i]
        // For first level, currentChars is already an array
        // For subsequent levels, add the new character to the accumulating list
        if (i === 1) {
            currentChars = [...currentChars, kochSequence[i]];
        } else {
            currentChars.push(kochSequence[i]);
            charDisplay = kochSequence[i]
        }

        const value = currentChars.join('').toLowerCase();

        const option = document.createElement('option');
        option.value = value;
        option.textContent = `Level ${i + 1}: ${charDisplay}`;
        levelSelect.appendChild(option);
    }

    // Add the "All characters" option
    const allOption = document.createElement('option');
    allOption.value = 'all';
    allOption.textContent = 'All characters';
    levelSelect.appendChild(allOption);
}

// Call this function when the page loads
document.addEventListener('DOMContentLoaded', generateLevelOptions);

let audioInitialized = false;

// Pre-warm the audio system
function warmupAudio() {
    if (audioInitialized) return Promise.resolve();

    return new Promise(resolve => {
        console.log("Warming up audio system...");

        // Initialize audio context
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        gainNode = audioContext.createGain();
        gainNode.gain.value = 0; // Silent
        gainNode.connect(audioContext.destination);

        oscillator = audioContext.createOscillator();
        oscillator.type = 'sine';
        oscillator.frequency.value = parseInt(toneInput.value);
        oscillator.connect(gainNode);
        oscillator.start();

        // Play a silent note to warm up the audio system
        const now = audioContext.currentTime;
        gainNode.gain.setValueAtTime(0.01, now); // Very quiet
        gainNode.gain.linearRampToValueAtTime(0, now + 0.1);

        // Small delay to ensure the system is ready
        setTimeout(() => {
            audioInitialized = true;
            console.log("Audio system warmed up");
            resolve();
        }, 300);
    });
}

// Initialize Web Audio API
function initAudio() {
    if (audioInitialized) return Promise.resolve();
    return warmupAudio();
}

function validateWpmValue() {
    const defaultWpm = 15; // Default WPM value

    // Get the current value
    let wpmValue = parseInt(wpmInput.value);

    // Check if the value is valid (a number between 5 and 50)
    if (isNaN(wpmValue) || wpmValue < 5 || wpmValue > 50 || wpmInput.value.trim() === '') {
        // Invalid or empty - set to default
        wpmInput.value = defaultWpm;
        wpmSlider.value = defaultWpm;
        wpmValue = defaultWpm;
    }

    // Update display text
    wpmValue.textContent = `${wpmInput.value} WPM`;

    return wpmValue;
}

function validateToneValue() {
    const defaultTone = 700; // Default tone value

    // Get the current value
    let toneValue = parseInt(toneInput.value);

    // Check if the value is valid
    if (isNaN(toneValue) || toneValue < 400 || toneValue > 1000 || toneInput.value.trim() === '') {
        // Invalid or empty - set to default
        toneInput.value = defaultTone;
        toneSlider.value = defaultTone;
        toneValue = defaultTone;
    }

    // Update display text
    toneValue.textContent = `${toneInput.value} Hz`;

    return toneValue;
}

// Generate random string based on selected level
function generateRandomString(length, level) {
    let charset = '';

    if (level === 'all') {
        charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789,./=?';
    } else {
        // Convert the level string back to an array of characters
        charset = level.toUpperCase();
    }

    let result = '';
    for (let i = 0; i < length; i++) {
        result += charset.charAt(Math.floor(Math.random() * charset.length));
    }

    return result;
}

// Split string into groups of 5 characters
function createCharacterGroups(str) {
    const groups = [];
    for (let i = 0; i < str.length; i += 5) {
        groups.push(str.substr(i, 5));
    }
    return groups;
}

// Generate new character groups
function generateMoreGroups() {
    const level = levelSelect.value;
    const newChars = generateRandomString(100, level);
    currentCharacters += newChars;
    const newGroups = createCharacterGroups(newChars);
    characterGroups.push(...newGroups);
}

// Play a dot with smooth audio transitions
function playDot() {
    const wpm = parseInt(wpmInput.value);
    const dotDuration = 60 / (50 * wpm); // in seconds
    const rampTime = 0.005; // 5ms ramp time to avoid clicks

    const now = audioContext.currentTime;

    // Smooth fade in
    gainNode.gain.cancelScheduledValues(now);
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(1, now + rampTime);

    // Smooth fade out
    gainNode.gain.setValueAtTime(1, now + dotDuration - rampTime);
    gainNode.gain.linearRampToValueAtTime(0, now + dotDuration);

    return dotDuration;
}

// Play a dash with smooth audio transitions
function playDash() {
    const wpm = parseInt(wpmInput.value);
    const dotDuration = 60 / (50 * wpm); // in seconds
    const dashDuration = 3 * dotDuration;
    const rampTime = 0.005; // 5ms ramp time to avoid clicks

    const now = audioContext.currentTime;

    // Smooth fade in
    gainNode.gain.cancelScheduledValues(now);
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(1, now + rampTime);

    // Smooth fade out
    gainNode.gain.setValueAtTime(1, now + dashDuration - rampTime);
    gainNode.gain.linearRampToValueAtTime(0, now + dashDuration);

    return dashDuration;
}

// Play a character in Morse code
function playCharacter(char) {
    return new Promise(resolve => {
        const wpm = parseInt(wpmInput.value);
        const dotDuration = 60 / (50 * wpm); // in seconds

        char = char.toUpperCase();
        if (!morseCode[char]) {
            setTimeout(resolve, dotDuration * 1000);
            return;
        }

        const morse = morseCode[char];
        let totalDelay = 0;

        for (let i = 0; i < morse.length; i++) {
            const symbol = morse[i];
            setTimeout(() => {
                if (symbol === '.') {
                    playDot();
                } else if (symbol === '-') {
                    playDash();
                }
            }, totalDelay * 1000);

            if (symbol === '.') {
                totalDelay += dotDuration;
            } else if (symbol === '-') {
                totalDelay += 3 * dotDuration;
            }

            // Add inter-element gap (one dot duration)
            if (i < morse.length - 1) {
                totalDelay += dotDuration;
            }
        }

        // Add inter-character gap (3 dot durations)
        totalDelay += 3 * dotDuration;

        setTimeout(resolve, totalDelay * 1000);
    });
}

// Play a group of characters
async function playGroup(group) {
    // Check the previous group answer before playing the next one (except first group)
    if (currentGroupIndex > 0) {
        const userInput = getUserInput().toUpperCase();
        const previousGroup = characterGroups[currentGroupIndex - 1];

        // Verify each character individually
        const allCorrect = userInput === previousGroup;

        // Apply appropriate highlighting for each character
        for (let i = 0; i < 5; i++) {
            if (i < userInput.length && i < previousGroup.length) {
                // Green for correct characters, red for incorrect
                const isCharCorrect = userInput[i] === previousGroup[i];
                charInputs[i].style.backgroundColor = isCharCorrect ? '#4ade80' : '#f87171'; // Green or red
            } else {
                // If character is missing, mark as red
                charInputs[i].style.backgroundColor = '#f87171'; // Red
            }
        }

        // Wait 0.5 seconds with the highlight
        await new Promise(resolve => setTimeout(resolve, 500));

        // Clear highlighting and input fields
        charInputs.forEach(input => {
            input.style.backgroundColor = '';
            input.value = '';
        });

        // Focus first input
        focusFirstEmptyInput();
    }

    // Play the current group
    for (let i = 0; i < group.length; i++) {
        if (!isPlaying || isPaused) return;
        await playCharacter(group[i]);
        playedCharacters += group[i];
    }

    // Add space after group
    // const wpm = parseInt(wpmInput.value);
    // const dotDuration = 60 / (50 * wpm);
    await new Promise(resolve => setTimeout(resolve, 1000));
}

// Start playing Morse code
async function startPlaying() {
    // Validate WPM and tone values before starting
    validateWpmValue();
    validateToneValue();
    
    // Show a loading indicator while audio initializes (optional)
    if (!audioInitialized) {
        playButton.textContent = '準備中...';
        playButton.disabled = true;
    }

    // Wait for audio to be properly initialized
    await initAudio();

    // Reset button state
    playButton.disabled = false;

    isPlaying = true;
    isPaused = false;
    playedCharacters = '';

    // Generate a long random string
    const level = levelSelect.value;
    currentCharacters = generateRandomString(100, level);
    characterGroups = createCharacterGroups(currentCharacters);
    currentGroupIndex = 0;

    updateButtons();
    clearCharInputs();

    // Add a short delay before playing the first group
    await new Promise(resolve => setTimeout(resolve, 300));

    // Main playback loop
    while (isPlaying) {
        if (!isPaused) {
            // Re-focus here before each group to maintain focus
            focusFirstEmptyInput();

            // Check if we need more groups
            if (currentGroupIndex >= characterGroups.length - 5) {
                generateMoreGroups();
            }

            await playGroup(characterGroups[currentGroupIndex]);
            currentGroupIndex++;
        } else {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }
}

// Pause playing
function pausePlaying() {
    isPaused = true;
    updateButtons();
}

// Resume playing
function resumePlaying() {
    isPaused = false;
    updateButtons();
}

// Stop playing
function stopPlaying() {
    isPlaying = false;
    isPaused = false;
    updateButtons();
}

// Update button states
function updateButtons() {
    playButton.disabled = isPlaying && !isPaused;
    pauseButton.disabled = !isPlaying || isPaused;
    stopButton.disabled = !isPlaying;

    if (isPlaying && !isPaused) {
        playButton.textContent = '開始';
    } else if (isPaused) {
        playButton.textContent = '再開';
    } else {
        playButton.textContent = '開始';
    }
}

// Show notification
function showNotification(message, isError = true) {
    notificationText.textContent = message;
    notification.classList.remove('hidden', 'alert-success', 'alert-error');
    notification.classList.add(isError ? 'alert-error' : 'alert-success');

    setTimeout(() => {
        notification.classList.add('hidden');
    }, 3000);
}

// Get user input from character inputs
function getUserInput() {
    let userInput = '';
    charInputs.forEach(input => {
        userInput += input.value.toUpperCase();
    });
    return userInput;
}

// Clear all character inputs
function clearCharInputs() {
    charInputs.forEach(input => {
        input.value = '';
        input.classList.remove('input-success', 'input-error');
    });
}

// Focus the first empty input
function focusFirstEmptyInput() {
    for (let i = 0; i < charInputs.length; i++) {
        if (!charInputs[i].value) {
            charInputs[i].focus();
            break;
        }
    }
}

// Check the user's answer
function checkAnswer() {
    const userInput = getUserInput();
    if (userInput.length === 0) return false;

    const lastGroup = playedCharacters.slice(-5);
    return userInput.toUpperCase() === lastGroup;
}

// Setup character input behavior
charInputs.forEach((input, index) => {
    // Auto-focus next input when a character is entered
    input.addEventListener('input', () => {
        if (input.value.length === 1 && index < charInputs.length - 1) {
            charInputs[index + 1].focus();
        }
    });

    // Handle backspace to go to previous input
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && input.value.length === 0 && index > 0) {
            charInputs[index - 1].focus();
        }
        // Space key handler removed
    });
});

// Event Listeners
wpmInput.addEventListener('blur', () => {
    validateWpmValue();
});

toneInput.addEventListener('blur', () => {
    validateToneValue();
});

playButton.addEventListener('click', async () => {
    if (isPlaying && isPaused) {
        resumePlaying();
        focusFirstEmptyInput();
    } else {
        // Focus first before starting playback
        clearCharInputs();
        focusFirstEmptyInput();

        // Small delay to ensure focus is established
        setTimeout(() => {
            startPlaying();
        }, 50);
    }
});

pauseButton.addEventListener('click', () => {
    pausePlaying();
});

stopButton.addEventListener('click', () => {
    stopPlaying();
});

wpmSlider.addEventListener('input', () => {
    wpmInput.value = wpmSlider.value;
    wpmValue.textContent = `${wpmSlider.value} WPM`;
});

wpmInput.addEventListener('input', () => {
    wpmSlider.value = wpmInput.value;
    wpmValue.textContent = `${wpmInput.value} WPM`;
});

toneSlider.addEventListener('input', () => {
    toneInput.value = toneSlider.value;
    toneValue.textContent = `${toneSlider.value} Hz`;
    if (oscillator) {
        oscillator.frequency.value = parseInt(toneInput.value);
    }
});

toneInput.addEventListener('input', () => {
    toneSlider.value = toneInput.value;
    toneValue.textContent = `${toneInput.value} Hz`;
    if (oscillator) {
        oscillator.frequency.value = parseInt(toneInput.value);
    }
});

// Initial focus
focusFirstEmptyInput();

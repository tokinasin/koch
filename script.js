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
const spacingSlider = document.getElementById('spacing-slider');
const spacingInput = document.getElementById('spacing');
const spacingValue = document.getElementById('spacing-value');

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

    // all alphabets
    const alphaOption = document.createElement('option');
    alphaOption.value = 'alphabet';
    alphaOption.textContent = 'Alphabet only';
    levelSelect.appendChild(alphaOption);

    // all numbers
    const numOption = document.createElement('option');
    numOption.value = 'numbers';
    numOption.textContent = 'Numbers only';
    levelSelect.appendChild(numOption);

    // all symbols
    const symbolsOption = document.createElement('option');
    symbolsOption.value = 'symbols';
    symbolsOption.textContent = 'Symbols only';
    levelSelect.appendChild(symbolsOption);

    // all alphabets + numbers
    const alphaNumOption = document.createElement('option');
    alphaNumOption.value = 'alphanum';
    alphaNumOption.textContent = 'Alphabet + Numbers';
    levelSelect.appendChild(alphaNumOption);
    
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
    document.getElementById('wpm-value').textContent = `${wpmInput.value} WPM`;

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
    document.getElementById('tone-value').textContent = `${toneInput.value} Hz`;

    return toneValue;
}

function validateSpacingValue() {
    const defaultSpacing = 2500; // Default spacing value in ms

    // Get the current value
    let spacingVal = parseInt(spacingInput.value);

    // Check if the value is valid (a number between 1000 and 5000)
    if (isNaN(spacingVal) || spacingVal < 1000 || spacingVal > 5000 || spacingInput.value.trim() === '') {
        // Invalid or empty - set to default
        spacingInput.value = defaultSpacing;
        spacingSlider.value = defaultSpacing;
        spacingVal = defaultSpacing;
    }

    // Update display text
    document.getElementById('spacing-value').textContent = `${spacingInput.value} ms`;

    return spacingVal;
}

// Generate random string based on selected level

function generateRandomString(length, level) {
    let charset = '';
    const frequencyBias = document.getElementById('frequency-bias').checked;

    if (level === 'all') {
        charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789,./=?';
    } else if (level === 'alphabet') {
        charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    } else if (level === 'alphanum') {
        charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    } else if (level === 'numbers') {
        charset = '0123456789';
    } else if (level === 'symbols') {
        charset = ',./=?';
    } else {
        // Convert the level string back to an array of characters
        charset = level.toUpperCase();
    }

    // If frequency bias is enabled, use weighted selection
    const specialLevels = ['all', 'alphabet', 'alphanum', 'numbers', 'symbols'];
    if (frequencyBias && !specialLevels.includes(level)) {
        return generateWeightedString(length, level);
    }

    // Regular random selection
    let result = '';
    for (let i = 0; i < length; i++) {
        result += charset.charAt(Math.floor(Math.random() * charset.length));
    }

    return result;
}

function generateWeightedString(length, level) {
    // Get current level characters
    const currentChars = level.toUpperCase().split('');

    // Find current position in Koch sequence
    let currentLevelIndex = 0;
    for (let i = 0; i < kochSequence.length; i++) {
        if (Array.isArray(kochSequence[i])) {
            // For the first level with array of chars
            if (currentChars.length === kochSequence[i].length) {
                currentLevelIndex = i;
                break;
            }
        } else if (currentChars.length === i + 2) { // +2 because first level has 2 chars
            currentLevelIndex = i;
            break;
        }
    }

    // Create weights for characters - more recent = higher weight
    const weights = {};
    const baseWeight = 1;

    // Initialize all weights
    for (let i = 0; i < currentChars.length; i++) {
        weights[currentChars[i]] = baseWeight;
    }

    // Increase weights for more recent characters
    // First handle the special first level
    if (currentLevelIndex > 0) {
        const firstLevelChars = kochSequence[0];
        for (let char of firstLevelChars) {
            weights[char] = baseWeight;
        }

        // Apply increasing weights for subsequent characters
        for (let i = 1; i <= currentLevelIndex; i++) {
            const char = kochSequence[i];
            if (typeof char === 'string') {
                weights[char] = baseWeight + (i * 0.5); // Increase weight by 0.5 for each level
            }
        }
    }

    // Generate weighted random string
    let result = '';
    let totalWeight = 0;

    // Calculate total weight
    for (let char in weights) {
        totalWeight += weights[char];
    }

    for (let i = 0; i < length; i++) {
        let random = Math.random() * totalWeight;
        let weightSum = 0;

        for (let char in weights) {
            weightSum += weights[char];
            if (random <= weightSum) {
                result += char;
                break;
            }
        }
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

        // Apply appropriate highlighting for each character
        for (let i = 0; i < 5; i++) {
            if (i < userInput.length && i < previousGroup.length) {
                // Check if character is correct
                const isCharCorrect = userInput[i] === previousGroup[i];

                if (isCharCorrect) {
                    // Green for correct characters
                    charInputs[i].style.backgroundColor = '#4ade80';
                } else {
                    // Red for incorrect characters and show balloon with correct character
                    charInputs[i].style.backgroundColor = '#f87171';
                    showCorrectCharBalloon(charInputs[i], previousGroup[i]);
                }
            } else if (i < previousGroup.length) {
                // If character is missing, mark as red and show balloon
                charInputs[i].style.backgroundColor = '#f87171';
                showCorrectCharBalloon(charInputs[i], previousGroup[i]);
            }
        }

        // Wait with the highlight to give time to see corrections
        await new Promise(resolve => setTimeout(resolve, 1500));

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

    // Use the user-defined spacing between groups
    const groupSpacing = parseInt(spacingInput.value);
    await new Promise(resolve => setTimeout(resolve, groupSpacing));
}

// Start playing Morse code
async function startPlaying() {
    // Validate input values before starting
    validateWpmValue();
    validateToneValue();
    validateSpacingValue();

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

function showCorrectCharBalloon(inputElement, correctChar) {
    // Create balloon element
    const balloon = document.createElement('div');
    balloon.className = 'balloon';
    balloon.textContent = correctChar;

    // Add to document first (needed to get proper dimensions)
    document.body.appendChild(balloon);

    // Get positions after adding to DOM
    const inputRect = inputElement.getBoundingClientRect();

    // Position the balloon centered above the input
    // Account for scroll position
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

    balloon.style.position = 'absolute';
    balloon.style.left = `${scrollLeft + inputRect.left + (inputRect.width/2) - (balloon.offsetWidth/2)}px`;
    balloon.style.top = `${scrollTop + inputRect.top - balloon.offsetHeight - 10}px`; // 10px gap

    // Remove after animation completes
    setTimeout(() => {
        document.body.removeChild(balloon);
    }, 1500);
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

spacingInput.addEventListener('blur', () => {
    validateSpacingValue();
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

spacingSlider.addEventListener('input', () => {
    spacingInput.value = spacingSlider.value;
    spacingValue.textContent = `${spacingSlider.value} ms`;
});

spacingInput.addEventListener('input', () => {
    spacingSlider.value = spacingInput.value;
    spacingValue.textContent = `${spacingInput.value} ms`;
});

// Initial focus
focusFirstEmptyInput();

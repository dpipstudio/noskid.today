// zKeys.js | Check if any keybind / key sequences has been done
const keyBindings = [
    {
        keys: ['Shift', 'Escape'],
        action: toggleConsole,
        description: 'Shows the debug console'
    },
    {
        keys: ['Shift', 'R'],
        action: toggleRick,
        description: 'Toggle RickRoll feature'
    },
    {
        keys: ['Shift', 'H'],
        action: help,
        description: 'Show this message'
    },
    {
        keys: ['Shift', 'C'],
        action: verifyCertificate,
        description: 'Check a certificate status'
    },
    {
        keys: ['Shift', 'E'],
        action: showFakeExploitScreen,
        description: 'Runs the best exploit ever created'
    },
    {
        keys: ['Shift', 'B'],
        action: spawnBrowser,
        description: 'Search inside of noskid !'
    },
    {
        keys: ['Shift', 'T'],
        action: spawnCommentSystem,
        description: 'Tell us what you think about noskid !'
    },
    {
        keys: ['Shift', 'K'],
        action: showKonata,
        description: 'Bailando bailando'
    },
    {
        keys: ['Shift', 'W'],
        action: toggleWebSocketMode,
        description: 'Don\'t be alone !'
    },
    {
        keys: ['Shift', 'S'],
        action: requestsCatcher,
        description: 'Spy on your requests !'
    },
    {
        keys: ['Shift', 'A'],
        action: spawnAchievementSystem,
        description: 'Look at your achievements !'
    },
    {
        keys: ['Shift', 'F'],
        action: showFame,
        description: 'Take a look at the hall of fame !'
    }
];

const sequences = {
    'term': {
        action: openTerminal,
        description: 'Open the terminal'
    },
    'awesome': {
        action: toggleAwesome,
        description: 'Toggle the awesome feature'
    },
    'boom': {
        action: toggleBoom,
        description: 'Activate boom mode'
    },
    'dos': {
        action: toggleBoom,
        description: 'Activate boom mode'
    },
    'skid': {
        action: toggleBoom,
        description: 'Activate boom mode'
    },
    'downfall': {
        action: makeElementsFall,
        description: 'Makes all the elements of the website fall down'
    },
    'upfall': {
        action: resetPage,
        description: 'Makes all the elements of the website come back'
    },
    'check': {
        action: verifyCertificate,
        description: 'Check if a certificate is valid'
    },
    'gary': {
        action: showGary,
        description: 'Shows gary (a cat)'
    },
    'pong': {
        action: pongGame,
        description: 'Play pong !'
    },
    'again': {
        action: againAndAgain,
        description: 'A new noskid window, but why?'
    },
    'bypass': {
        action: redoQuiz,
        description: 'Bypass quiz error message to redo it'
    },
    'cool': {
        action: spawnCool,
        description: 'shows a cool thing'
    },
    'i hate badapple': {
        action: toggleGoodApple,
        description: 'toggle badapple playback in devtools'
    },
    'clearach': {
        action: clearAllAchievements,
        description: 'reset all achievements'
    },
    'sstv': {
        action: showSstv,
        description: 'Try to find the secret certificate',
    },
    'track': {
        action: toggleTrack,
        description: 'Toggles on and off visit analytics',
    }
};

let currentSequence = '';
let actionCount = 0;
let lastAction = null;
let startedAchZKEYS = false;
let doneAchZKEYS = false;

function checkKeyCombination(event) {
    const activeElement = document.activeElement;
    if (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA') {
        return;
    }

    const keysPressed = [];
    if (event.shiftKey) keysPressed.push('Shift');
    if (event.ctrlKey) keysPressed.push('Control');
    if (event.altKey) keysPressed.push('Alt');
    keysPressed.push(event.key);

    let actionPerformed = false;

    keyBindings.forEach(binding => {
        if (binding.keys.every(key => keysPressed.includes(key))) {
            log(`Combo detected: ${binding.keys.join(' + ')}`);
            const currentAction = binding.action.toString();
            if (currentAction !== lastAction) {
                actionCount++;
                lastAction = currentAction;
            }
            binding.action(event);
            actionPerformed = true;
            return;
        }
    });

    if (!actionPerformed) {
        currentSequence += event.key;
        for (const sequence in sequences) {
            if (currentSequence.includes(sequence)) {
                log(`Sequence detected: ${sequence}`);
                const currentAction = sequences[sequence].action.toString();
                if (currentAction !== lastAction) {
                    actionCount++;
                    lastAction = currentAction;
                    if (!startedAchZKEYS) {
                        startAchievement('Keyboard Ninja');
                        startedAchZKEYS = true;
                    }
                }
                sequences[sequence].action(event);
                currentSequence = '';
                actionPerformed = true;
                break;
            }
        }
    }

    if (actionCount === 10 && !doneAchZKEYS) {
        addAchievement('Keyboard Ninja');
        doneAchZKEYS = true;
    }
}

document.addEventListener('keydown', checkKeyCombination);

function help() {
    log("", 'warning');
    log("=-=-= Combos =-=-=", 'warning');

    const sortedCombos = [...keyBindings].sort((a, b) => {
        const aKeys = a.keys.join(' + ');
        const bKeys = b.keys.join(' + ');
        return aKeys.localeCompare(bKeys);
    });

    sortedCombos.forEach(binding => {
        log(`Combo: ${binding.keys.join(' + ')}: ${binding.description}`, 'warning');
    });

    log("=-=-= Sequences =-=-=", 'warning');

    const sortedSequences = Object.keys(sequences).sort();

    sortedSequences.forEach(sequence => {
        log(`Sequence: '${sequence}': ${sequences[sequence].description}`, 'warning');
    });

    log("", 'warning');
}

help();

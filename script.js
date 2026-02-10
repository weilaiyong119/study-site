// Initial vocabularyList is empty, will be populated from words.js (defaultVocabulary) or localStorage
const vocabularyList = typeof defaultVocabulary !== 'undefined' ? defaultVocabulary : [];

// Load user words and merge
function loadUserWords() {
    const userWords = JSON.parse(localStorage.getItem('userVocabularyList')) || [];
    // Combine default list with user words. 
    return [...vocabularyList, ...userWords];
}

let fullVocabularyList = loadUserWords();

// App State
// App State
let currentIndex = 0;
// Use fullVocabularyList instead of vocabularyList for the app logic
const getList = () => fullVocabularyList;
let isFlipped = false;

// Quiz State
let quizScore = 0;
let currentQuestionIndex = 0;
let quizQuestions = [];
let isQuizActive = false;

// DOM Elements
const card = document.querySelector('.card');
const wordDisplay = document.getElementById('wordDisplay');
const pronunciationDisplay = document.getElementById('pronunciationDisplay');
const definitionDisplay = document.getElementById('definitionDisplay');
const exampleDisplay = document.getElementById('exampleDisplay');
const wordNumber = document.getElementById('wordNumber');
const progressDisplay = document.getElementById('progressDisplay');
const nextBtn = document.getElementById('nextBtn');
const prevBtn = document.getElementById('prevBtn');
const randomBtn = document.getElementById('randomBtn');
const newSetBtn = document.getElementById('newSetBtn');

// Quiz DOM Elements
const studyTab = document.getElementById('studyTab');
const quizTab = document.getElementById('quizTab');
const addTab = document.getElementById('addTab');
const studyMode = document.getElementById('studyMode');
const quizMode = document.getElementById('quizMode');
const addMode = document.getElementById('addMode');
const quizWordDisplay = document.getElementById('quizWordDisplay');
const optionsContainer = document.getElementById('optionsContainer');
const currentScoreDisplay = document.getElementById('currentScore');
const quizProgressDisplay = document.getElementById('quizProgress');
const quizResult = document.getElementById('quizResult');
const finalScoreDisplay = document.getElementById('finalScoreDisplay');
const restartQuizBtn = document.getElementById('restartQuizBtn');

// Add Word Elements
// Add Word Elements
const addWordForm = document.getElementById('addWordForm');
const addFeedback = document.getElementById('addFeedback');

const audioBtn = document.getElementById('audioBtn');
const micBtn = document.getElementById('micBtn');
const micFeedback = document.getElementById('micFeedback');
const exampleAudioBtn = document.getElementById('exampleAudioBtn');
const masteredBtn = document.getElementById('masteredBtn');
const exampleMicBtn = document.getElementById('exampleMicBtn');
const exampleMicFeedback = document.getElementById('exampleMicFeedback');
const shadowBtn = document.getElementById('shadowBtn');

// Initialize App
function init() {
    updateCard();
    addEventListeners();
}

// Update Card Content
function updateCard(direction = 'none') {
    const list = getList();
    const wordData = list[currentIndex];

    // Reset flip state if needed
    if (isFlipped) {
        card.classList.remove('flipped');
        isFlipped = false;

        // Wait for flip back animation before changing content
        setTimeout(() => {
            setContent(wordData);
        }, 200);
    } else {
        // If not flipped, animation helps transition
        if (direction !== 'none') {
            // Optional: add slide animation logic here if desired
            setContent(wordData);
        } else {
            setContent(wordData);
        }
    }

    // Reset feedback
    resetFeedback();

    // Update Mastered UI
    updateMasteredUI();
}

function setContent(data) {
    wordDisplay.textContent = data.word;
    pronunciationDisplay.textContent = data.pronunciation;
    definitionDisplay.textContent = data.definition;
    exampleDisplay.textContent = `"${data.example}"`;
    wordNumber.textContent = `#${currentIndex + 1}`;
    progressDisplay.textContent = `${currentIndex + 1} / ${getList().length}`;
}

function speakWord() {
    const word = getList()[currentIndex].word;
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'en-US'; // Set language to US English
    utterance.rate = 0.9; // Slightly slower for clarity
    window.speechSynthesis.speak(utterance);
}

function speakExample(onEndCallback = null) {
    // Clean up the example text (remove quotes if present for reading, though mostly fine)
    let text = getList()[currentIndex].example;
    // Remove surrounding quotes for cleaner speech if they exist in data
    text = text.replace(/^"|"$/g, '');

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;

    if (onEndCallback) {
        utterance.onend = onEndCallback;
    }

    window.speechSynthesis.speak(utterance);
}

function startShadowing() {
    // 1. Visual Feedback
    if (exampleMicFeedback) {
        exampleMicFeedback.textContent = "🔊 Listen carefully to the AI...";
        exampleMicFeedback.className = "mic-feedback listening";
        exampleMicFeedback.classList.remove('hidden');
    }

    // 2. Speak, then Record
    speakExample(() => {
        // After speaking finishes
        if (exampleMicFeedback) {
            exampleMicFeedback.textContent = "🎙️ Now YOU speak...";
        }
        // Small delay to ensure mic doesn't catch system audio
        setTimeout(() => {
            checkExamplePronunciation();
        }, 500);
    });
}

// Mastered Words Logic
function getMasteredWords() {
    return JSON.parse(localStorage.getItem('masteredWords')) || [];
}

function isMastered(word) {
    const mastered = getMasteredWords();
    return mastered.includes(word);
}

function toggleMastered() {
    const word = getList()[currentIndex].word;
    const mastered = getMasteredWords();
    const index = mastered.indexOf(word);

    if (index === -1) {
        mastered.push(word);
        masteredBtn.classList.add('active');
    } else {
        mastered.splice(index, 1);
        masteredBtn.classList.remove('active');
    }

    localStorage.setItem('masteredWords', JSON.stringify(mastered));
}

function updateMasteredUI() {
    if (!masteredBtn) return;
    const word = getList()[currentIndex].word;
    if (isMastered(word)) {
        masteredBtn.classList.add('active');
    } else {
        masteredBtn.classList.remove('active');
    }
}

// Speech Recognition Logic
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;
let recognitionTarget = 'word'; // 'word' or 'example'

if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
        if (recognitionTarget === 'word') {
            micBtn.classList.add('recording');
            micFeedback.textContent = "Listening...";
            micFeedback.className = "mic-feedback listening";
            micFeedback.classList.remove('hidden');
        } else {
            exampleMicBtn.classList.add('recording');
            exampleMicFeedback.textContent = "Listening...";
            exampleMicFeedback.className = "mic-feedback listening";
            exampleMicFeedback.classList.remove('hidden');
        }
    };

    recognition.onend = () => {
        micBtn.classList.remove('recording');
        if (exampleMicBtn) exampleMicBtn.classList.remove('recording');
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript.trim().toLowerCase();

        if (recognitionTarget === 'word') {
            const currentWord = getList()[currentIndex].word.toLowerCase();
            micFeedback.textContent = `Heard: "${transcript}"`;

            if (transcript === currentWord || transcript.includes(currentWord)) {
                micFeedback.classList.remove('listening', 'incorrect');
                micFeedback.classList.add('correct');
                micFeedback.innerHTML += ` <br><strong>Correct!</strong>`;
            } else {
                micFeedback.classList.remove('listening', 'correct');
                micFeedback.classList.add('incorrect');
                micFeedback.innerHTML += ` <br><strong>Try Again</strong>`;
            }
        } else {
            // Example Check
            const currentExample = getList()[currentIndex].example.toLowerCase().replace(/[.,!?"']/g, '');
            const cleanTranscript = transcript.replace(/[.,!?"']/g, '');

            exampleMicFeedback.textContent = `Heard: "${transcript}"`;

            // Fuzzy match logic (simple inclusion or similarity)
            // Checking if significant portion matches or strict match
            if (cleanTranscript === currentExample || currentExample.includes(cleanTranscript)) {
                exampleMicFeedback.classList.remove('listening', 'incorrect');
                exampleMicFeedback.classList.add('correct');
                exampleMicFeedback.innerHTML += ` <br><strong>Correct!</strong>`;
            } else {
                exampleMicFeedback.classList.remove('listening', 'correct');
                exampleMicFeedback.classList.add('incorrect');
                exampleMicFeedback.innerHTML += ` <br><strong>Try Again</strong>`;
            }
        }
    };

    recognition.onerror = (event) => {
        const feedback = recognitionTarget === 'word' ? micFeedback : exampleMicFeedback;
        feedback.textContent = "Error: " + event.error;
        feedback.classList.add('incorrect');
    };
} else {
    // Fallback for browsers without support
    micBtn.style.display = 'none';
    if (exampleMicBtn) exampleMicBtn.style.display = 'none';
    console.log("Speech Recognition not supported in this browser.");
}

function checkPronunciation() {
    if (recognition) {
        recognitionTarget = 'word';
        recognition.start();
    } else {
        alert("Speech Recognition is not supported in this browser.");
    }
}

function checkExamplePronunciation() {
    if (recognition) {
        recognitionTarget = 'example';
        recognition.start();
    } else {
        alert("Speech Recognition is not supported in this browser.");
    }
}

function resetFeedback() {
    micFeedback.textContent = "";
    micFeedback.className = "mic-feedback hidden";
    micBtn.classList.remove('recording');

    // Reset Example Feedback
    if (exampleMicFeedback) {
        exampleMicFeedback.textContent = "";
        exampleMicFeedback.className = "mic-feedback hidden";
    }
    if (exampleMicBtn) exampleMicBtn.classList.remove('recording');
}

// Event Listeners
function addEventListeners() {
    // Card Flip
    card.addEventListener('click', (e) => {
        // Prevent flip if clicking audio or mic buttons
        if (e.target.closest('#audioBtn') || e.target.closest('#micBtn') || e.target.closest('#exampleAudioBtn')) return;
        flipCard();
    });

    // Audio Button
    audioBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Stop click from reaching card
        speakWord();
    });

    // Example Audio Button
    if (exampleAudioBtn) {
        exampleAudioBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            speakExample();
        });
    }

    // Mastered Button
    if (masteredBtn) {
        masteredBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleMastered();
        });
    }

    // Mic Button
    micBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        checkPronunciation();
    });

    // Example Mic Button
    if (exampleMicBtn) {
        exampleMicBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            checkExamplePronunciation();
        });
    }

    // Shadow Button
    if (shadowBtn) {
        shadowBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            startShadowing();
        });
    }

    // Navigation
    nextBtn.addEventListener('click', nextWord);
    prevBtn.addEventListener('click', prevWord);
    randomBtn.addEventListener('click', randomWord);
    if (newSetBtn) newSetBtn.addEventListener('click', shuffleWords);

    // Mode Switching
    studyTab.addEventListener('click', () => switchMode('study'));
    quizTab.addEventListener('click', () => switchMode('quiz'));
    addTab.addEventListener('click', () => switchMode('add'));
    restartQuizBtn.addEventListener('click', startQuiz);

    // Add Word Form
    addWordForm.addEventListener('submit', handleAddWord);

    // Keyboard Support
    document.addEventListener('keydown', (e) => {
        if (studyMode.classList.contains('hidden')) return; // Disable keys in quiz mode

        if (e.code === 'Space') {
            e.preventDefault(); // Prevent scrolling
            flipCard();
        } else if (e.code === 'ArrowRight') {
            nextWord();
        } else if (e.code === 'ArrowLeft') {
            prevWord();
        }
    });
}

function flipCard() {
    isFlipped = !isFlipped;
    card.classList.toggle('flipped');
}

function nextWord() {
    if (currentIndex < getList().length - 1) {
        currentIndex++;
    } else {
        currentIndex = 0; // Loop back to start
    }
    updateCard('next');
}

function prevWord() {
    if (currentIndex > 0) {
        currentIndex--;
    } else {
        currentIndex = getList().length - 1; // Loop to end
    }
    updateCard('prev');
}

function randomWord() {
    let newIndex;
    const list = getList();
    do {
        newIndex = Math.floor(Math.random() * list.length);
    } while (newIndex === currentIndex && list.length > 1);

    currentIndex = newIndex;
    updateCard('random');
}

function shuffleWords() {
    // 1. Get user words
    const userWords = JSON.parse(localStorage.getItem('userVocabularyList')) || [];

    // 2. Shuffle default vocabulary (copy it first)
    // If we want truly dynamic "New Set" from a larger database, we'd pick a subset.
    // For now, let's shuffle the order of the entire default list + user words to make it feel fresh.

    const shuffledDefault = [...vocabularyList].sort(() => Math.random() - 0.5);

    // 3. Rebuild full list
    fullVocabularyList = [...shuffledDefault, ...userWords];

    // 4. Reset index and update view
    currentIndex = 0;
    updateCard('next');

    // 5. Visual Feedback (Spin icon)
    const icon = newSetBtn.querySelector('svg');
    if (icon) {
        icon.style.transition = 'transform 0.5s';
        icon.style.transform = 'rotate(180deg)';
        setTimeout(() => icon.style.transform = 'rotate(0deg)', 500);
    }
}

// --- Quiz Logic ---

function switchMode(mode) {
    if (mode === 'study') {
        studyTab.classList.add('active');
        quizTab.classList.remove('active');
        studyMode.classList.remove('hidden');
        quizMode.classList.add('hidden');
    } else if (mode === 'quiz') {
        studyTab.classList.remove('active');
        quizTab.classList.add('active');
        addTab.classList.remove('active');
        studyMode.classList.add('hidden');
        quizMode.classList.remove('hidden');
        addMode.classList.add('hidden');
        startQuiz();
    } else {
        studyTab.classList.remove('active');
        quizTab.classList.remove('active');
        addTab.classList.add('active');
        studyMode.classList.add('hidden');
        quizMode.classList.add('hidden');
        addMode.classList.remove('hidden');
    }
}

function startQuiz() {
    quizScore = 0;
    currentQuestionIndex = 0;
    isQuizActive = true;
    quizResult.classList.add('hidden');
    currentScoreDisplay.textContent = '0';

    // Generate 10 random questions
    generateQuestions();
    renderQuestion();
    renderProgressDots();
}

function generateQuestions() {
    const list = getList();
    const shuffledList = [...list].sort(() => 0.5 - Math.random());
    const selectedWords = shuffledList.slice(0, 10);

    quizQuestions = selectedWords.map(wordObj => {
        const correctDef = wordObj.definition;

        // Get 3 incorrect definitions
        const otherWords = list.filter(w => w.word !== wordObj.word);
        const shuffledOthers = otherWords.sort(() => 0.5 - Math.random());
        const incorrectDefs = shuffledOthers.slice(0, 3).map(w => w.definition);

        const options = [...incorrectDefs, correctDef].sort(() => 0.5 - Math.random());

        return {
            word: wordObj.word,
            correctAnswer: correctDef,
            options: options
        };
    });
}

function renderProgressDots() {
    quizProgressDisplay.innerHTML = '';
    quizQuestions.forEach((_, index) => {
        const dot = document.createElement('div');
        dot.classList.add('dot');
        if (index === currentQuestionIndex) dot.classList.add('active');
        quizProgressDisplay.appendChild(dot);
    });
}

function renderQuestion() {
    const question = quizQuestions[currentQuestionIndex];
    quizWordDisplay.textContent = question.word;
    optionsContainer.innerHTML = '';

    // Update dots active state
    const dots = document.querySelectorAll('.dot');
    dots.forEach((dot, idx) => {
        if (idx === currentQuestionIndex) dot.classList.add('active');
        else dot.classList.remove('active');
    });

    question.options.forEach(option => {
        const btn = document.createElement('button');
        btn.classList.add('quiz-option');
        btn.textContent = option;
        // Use a wrapper to handle the click and avoid referencing 'question' directly if needed, but closure works here
        btn.onclick = () => checkAnswer(option, btn, question.correctAnswer);
        optionsContainer.appendChild(btn);
    });
}

function checkAnswer(selectedOption, btnElement, correctOption) {
    if (!isQuizActive) return; // Prevent multiple clicks

    isQuizActive = false; // Lock input
    const buttons = document.querySelectorAll('.quiz-option');
    buttons.forEach(b => b.classList.add('disabled')); // Visual disable

    const isCorrect = selectedOption === correctOption;
    const dots = document.querySelectorAll('.dot');

    if (isCorrect) {
        btnElement.classList.add('correct');
        quizScore++;
        currentScoreDisplay.textContent = quizScore;
        dots[currentQuestionIndex].classList.add('correct');
    } else {
        btnElement.classList.add('incorrect');
        dots[currentQuestionIndex].classList.add('incorrect');

        // Highlight the correct answer
        buttons.forEach(b => {
            if (b.textContent === correctOption) {
                b.classList.add('correct');
            }
        });
    }

    // Wait then move to next question
    setTimeout(() => {
        nextQuestion();
    }, 1500);
}

function nextQuestion() {
    currentQuestionIndex++;
    if (currentQuestionIndex < quizQuestions.length) {
        isQuizActive = true;
        renderQuestion();
    } else {
        showResults();
    }
}

function showResults() {
    quizWordDisplay.textContent = "Finished!";
    optionsContainer.innerHTML = '';
    quizResult.classList.remove('hidden');
    finalScoreDisplay.textContent = `${quizScore} / ${quizQuestions.length}`;
}

// Start the app
function handleAddWord(e) {
    e.preventDefault();

    // Get values
    const word = document.getElementById('newWord').value.trim();
    const pronunciation = document.getElementById('newPronunciation').value.trim();
    const definition = document.getElementById('newDefinition').value.trim();
    const example = document.getElementById('newExample').value.trim();

    if (!word || !definition || !example) return;

    const newWordObj = {
        word,
        pronunciation: pronunciation || "N/A",
        definition,
        example
    };

    // Save to LocalStorage
    const userWords = JSON.parse(localStorage.getItem('userVocabularyList')) || [];
    userWords.push(newWordObj);
    localStorage.setItem('userVocabularyList', JSON.stringify(userWords));

    // Update Runtime List
    fullVocabularyList = loadUserWords();

    // Feedback
    addFeedback.textContent = `"${word}" added successfully!`;
    addFeedback.className = "mic-feedback correct";
    addFeedback.classList.remove('hidden');

    // Reset Form
    e.target.reset();

    // Hide feedback after 3 seconds
    setTimeout(() => {
        addFeedback.classList.add('hidden');
    }, 3000);
}

// Start the app
init();

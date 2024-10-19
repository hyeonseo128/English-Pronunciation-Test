// 음성 인식 객체 생성
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();

let currentWord = '';
let lives = 3; // 기본 라이프 개수
let score = 0; // 게임 시작 시 점수는 0으로 시작
let gameOver = false; // 게임오버 상태를 체크하기 위한 변수
let retryUsed = false; // 재시도 버튼을 사용했는지 확인하기 위한 변수

// DOM 요소 가져오기
const wordDisplay = document.getElementById('word-display');
const sayMessage = document.getElementById('say-message');
const startButton = document.getElementById('start-button');
const restartButton = document.getElementById('restart-button');
const listenButton = document.getElementById('listen-button');
const retryButton = document.getElementById('retry-button');
const resultDisplay = document.getElementById('result');
const livesDisplay = document.getElementById('lives');
const scoreDisplay = document.getElementById('score');
const difficultySelect = document.getElementById('difficulty');
const accuracySelect = document.getElementById('accuracy');

// 시작 버튼 클릭 이벤트
startButton.addEventListener('click', () => {
    if (!gameOver) {
        startGame(); // 게임 시작 시 라이프 초기화는 하지 않음
    }
});

// 게임 재시작 버튼 클릭 이벤트
restartButton.addEventListener('click', () => {
    resetGame(); // 오직 게임오버 상태일 때만 라이프 초기화
});

// 발음 듣기 버튼 클릭 이벤트
listenButton.addEventListener('click', () => {
    speakWord(currentWord);
});

// 재시도 버튼 클릭 이벤트
retryButton.addEventListener('click', () => {
    if (!retryUsed) {
        retryWord();
        retryUsed = true; // 재시도 버튼 한 번만 사용 가능하게 설정
        retryButton.style.display = 'none'; // 재시도 버튼 숨김
    }
});

// 판정 난이도에 따른 라이프 설정 함수
function setLivesByAccuracy() {
    const accuracyLevel = parseInt(accuracySelect.value, 10);
    if (accuracyLevel === 80) {
        lives = 7; // Easy일 때 라이프 7개
    } else if (accuracyLevel === 90) {
        lives = 5; // Medium일 때 라이프 5개
    } else if (accuracyLevel === 95) {
        lives = 3; // Hard일 때 라이프 3개
    }
    livesDisplay.textContent = `Lives: ${lives}`; // 라이프 표시 업데이트
}

// 게임 시작 함수
async function startGame() {
    resultDisplay.textContent = '';
    const difficulty = difficultySelect.value;
    currentWord = await getRandomWord(difficulty); // API로 단어 가져오기
    wordDisplay.textContent = currentWord;
    listenButton.style.display = 'none'; // 실패하기 전에는 발음 듣기 버튼 숨김
    retryButton.style.display = 'none'; // 게임 시작 시 재시도 버튼 숨김
    restartButton.style.display = 'none'; // 게임 중에는 재시작 버튼 숨김
    retryUsed = false; // 재시도 버튼 초기화
    startRecognition();
}

// 랜덤 단어 선택 함수 (API 사용)
async function getRandomWord(difficulty) {
    try {
        let wordCount;
        if (difficulty === 'easy') {
            wordCount = 1;
        } else if (difficulty === 'medium') {
            wordCount = 2;
        } else {
            wordCount = 5; // hard 난이도에서 더 많은 글자를 포함
        }
        const response = await fetch(`https://random-word-api.herokuapp.com/word?number=${wordCount}`);
        const data = await response.json();
        return data[0]; // 첫 번째 단어 반환
    } catch (error) {
        console.error('Error fetching word:', error);
        return 'error'; // 오류 시 'error' 단어 반환
    }
}

// 음성 인식 시작 함수
function startRecognition() {
    recognition.lang = 'en-US';
    recognition.start();
    sayMessage.style.display = 'block'; // 음성 인식이 시작되면 "Say!" 메시지 표시

    recognition.onresult = (event) => {
        const spokenWord = event.results[0][0].transcript.toLowerCase();
        checkPronunciation(spokenWord);
        sayMessage.style.display = 'none'; // 음성 인식이 완료되면 "Say!" 메시지 숨김
    };

    recognition.onerror = (event) => {
        resultDisplay.textContent = 'Error occurred: ' + event.error;
        sayMessage.style.display = 'none'; // 에러 발생 시 "Say!" 메시지 숨김
    };
}

// 발음 체크 함수
function checkPronunciation(spokenWord) {
    const accuracyLevel = parseInt(accuracySelect.value, 10);
    const similarity = compareWords(currentWord, spokenWord);

    if (similarity >= accuracyLevel) {
        resultDisplay.textContent = `Success! You pronounced "${spokenWord}" (${similarity}% accuracy).`;
        score += 10; // 성공 시 점수 10점 추가
        scoreDisplay.textContent = `Score: ${score}`;
        listenButton.style.display = 'none'; // 성공하면 발음 듣기 버튼 숨김
        retryButton.style.display = 'none'; // 성공하면 재시도 버튼 숨김
    } else {
        lives--;
        resultDisplay.textContent = `Failed! You pronounced "${spokenWord}" (${similarity}% accuracy).`;
        livesDisplay.textContent = `Lives: ${lives}`;
        listenButton.style.display = 'inline'; // 실패 시 발음 듣기 버튼 표시
        if (!retryUsed && lives > 0) {
            retryButton.style.display = 'inline'; // 재시도 버튼 표시, 한 번만 사용할 수 있음
        }
    }

    if (lives <= 0) {
        resultDisplay.textContent = 'Game Over! Click Restart to try again.';
        recognition.stop();
        gameOver = true; // 게임오버 상태로 설정
        restartButton.style.display = 'inline'; // 게임오버 시 재시작 버튼 표시
        listenButton.style.display = 'inline'; // 게임오버 시에도 발음 듣기 버튼 표시
        retryButton.style.display = 'none'; // 게임오버 시 재시도 버튼 숨김
    }
}

// 두 단어의 유사도를 비교하는 함수 (간단한 예시)
function compareWords(word1, word2) {
    let matchingLetters = 0;
    const minLength = Math.min(word1.length, word2.length);

    for (let i = 0; i < minLength; i++) {
        if (word1[i] === word2[i]) {
            matchingLetters++;
        }
    }

    const accuracy = (matchingLetters / word1.length) * 100;
    return Math.floor(accuracy);
}

// 게임을 다시 시작하는 함수
function resetGame() {
    setLivesByAccuracy(); // 오직 게임오버 상태에서만 라이프 초기화
    score = 0; // 점수 초기화
    livesDisplay.textContent = `Lives: ${lives}`;
    scoreDisplay.textContent = `Score: ${score}`; // 점수 표시 초기화
    resultDisplay.textContent = ''; // 결과 텍스트 초기화
    gameOver = false; // 게임오버 상태 해제
    retryUsed = false; // 재시도 버튼 사용 여부 초기화
    restartButton.style.display = 'none'; // 재시작 버튼 숨김
    listenButton.style.display = 'none'; // 발음 듣기 버튼 숨김
    retryButton.style.display = 'none'; // 재시도 버튼 숨김
    startGame(); // 다시 게임 시작
}

// 재시도 함수 (기존 단어로 다시 발음 테스트)
function retryWord() {
    resultDisplay.textContent = 'Retry! Pronounce the word again.';
    startRecognition(); // 기존 단어로 다시 음성 인식 시작
}

// 발음을 들려주는 함수 (Speech Synthesis API 사용)
function speakWord(word) {
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'en-US';
    window.speechSynthesis.speak(utterance);
}

let chess = new Chess();
let selectedSquare = null;
let timer = 0;
let timerInterval = null;

function startTimer() {
    clearInterval(timerInterval);
    timer = 0;
    timerInterval = setInterval(() => {
        timer++;
        let m = String(Math.floor(timer / 60)).padStart(2, '0');
        let s = String(timer % 60).padStart(2, '0');
        document.getElementById("timer").textContent = `${m}:${s}`;
    }, 1000);
}

startTimer();
renderBoard();

function renderBoard() {
    const boardDiv = document.getElementById("board");
    boardDiv.innerHTML = "";
    const board = chess.board();

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            let square = document.createElement("div");
            square.classList.add("square");

            let isWhite = (r + c) % 2 === 0;
            square.classList.add(isWhite ? "white" : "black");

            let piece = board[r][c];
            if (piece) square.textContent = piece.unicode;

            square.onclick = () => onSquareClick(r, c);
            boardDiv.appendChild(square);
        }
    }
}

function onSquareClick(r, c) {
    let square = "abcdefgh"[c] + (8 - r);

    if (!selectedSquare) {
        selectedSquare = square;
    } else {
        let move = chess.move({ from: selectedSquare, to: square, promotion:"q" });
        selectedSquare = null;

        if (move) {
            playSound(move);
            renderBoard();
            setTimeout(() => botTurn(), 300);
        }
    }
}

function botTurn() {
    let diff = document.getElementById("difficulty").value;
    let move = botMove(diff, chess);
    if (!move) return;
    chess.move(move);
    playSound(move);
    renderBoard();
}

function undoMove() {
    chess.undo();
    chess.undo();
    renderBoard();
}

function restartGame() {
    chess.reset();
    startTimer();
    renderBoard();
}

function playSound(move) {
    let audio = new Audio(
        move.captured ? "sounds/capture.mp3" : "sounds/move.mp3"
    );
    audio.play();
}

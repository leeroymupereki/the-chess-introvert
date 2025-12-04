const game = new Chess();
const boardEl = document.getElementById("board");

let selectedSquare = null;

const unicodePieces = {
  'p': '♟', 'r': '♜', 'n': '♞', 'b': '♝', 'q': '♛', 'k': '♚',
  'P': '♙', 'R': '♖', 'N': '♘', 'B': '♗', 'Q': '♕', 'K': '♔'
};

function drawBoard() {
  boardEl.innerHTML = "";
  const board = game.board();

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const square = document.createElement("div");
      square.classList.add("square");

      // light/dark pattern
      if ((row + col) % 2 === 0) square.classList.add("light");
      else square.classList.add("dark");

      const piece = board[row][col];
      if (piece) {
        square.textContent = unicodePieces[piece.color === 'w' ? piece.type.toUpperCase() : piece.type];
      }

      const file = "abcdefgh"[col];
      const rank = 8 - row;
      const sq = file + rank;

      square.dataset.square = sq;

      square.addEventListener("click", () => onSquareClick(sq));

      boardEl.appendChild(square);
    }
  }
}

function onSquareClick(square) {
  if (!selectedSquare) {
    selectedSquare = square;
    highlight(square);
    return;
  }

  const move = game.move({ from: selectedSquare, to: square });

  if (move) {
    drawBoard();
  }

  selectedSquare = null;
  clearHighlights();
}

function highlight(square) {
  clearHighlights();
  document.querySelector(`[data-square="${square}"]`).classList.add("selected");
}

function clearHighlights() {
  document.querySelectorAll(".square").forEach(sq => sq.classList.remove("selected"));
}

drawBoard();

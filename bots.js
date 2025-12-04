function botMove(difficulty, chess) {
    let depth = 1;

    switch(difficulty) {
        case "Beginner":     depth = 1; break;
        case "Advanced":     depth = 2; break;
        case "Master":       depth = 3; break;
        case "Expert":       depth = 3; break;
        case "Grandmaster":  depth = 4; break;
    }

    return minimaxMove(chess, depth);
}

function minimaxMove(chess, depth) {
    let moves = chess.moves();
    let bestMove = null;
    let bestScore = -99999;

    moves.forEach(move => {
        chess.move(move);
        let score = -search(chess, depth - 1);
        chess.undo();

        if (score > bestScore) {
            bestScore = score;
            bestMove = move;
        }
    });

    return bestMove;
}

function search(chess, depth) {
    if (depth === 0) return evaluate(chess);

    let moves = chess.moves();
    let best = -99999;

    moves.forEach(move => {
        chess.move(move);
        let score = -search(chess, depth - 1);
        chess.undo();
        if (score > best) best = score;
    });

    return best;
}

function evaluate(chess) {
    let score = 0;
    const pieces = {
        p:100, n:320, b:330, r:500, q:900, k:20000
    };

    let board = chess.board();
    for (let row of board) {
        for (let piece of row) {
            if (piece) {
                score += (piece.color === "w" ? 1 : -1) * pieces[piece.type];
            }
        }
    }
    return score;
}

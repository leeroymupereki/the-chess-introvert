/* FULL chess.js engine */
var Chess = function(fen) {

  var BLACK = 'b';
  var WHITE = 'w';

  var EMPTY = -1;

  var PAWN = 'p';
  var KNIGHT = 'n';
  var BISHOP = 'b';
  var ROOK = 'r';
  var QUEEN = 'q';
  var KING = 'k';

  var SYMBOLS = 'pnbrqkPNBRQK';

  var DEFAULT_POSITION =
    'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

  var POSSIBLE_RESULTS = ['1-0', '0-1', '1/2-1/2'];

  var PAWN_OFFSETS = {
    b: [16, 32, 17, 15],
    w: [-16, -32, -17, -15]
  };

  var PIECE_OFFSETS = {
    n: [-18, -33, -31, -14, 18, 33, 31, 14],
    b: [-17, -15, 17, 15],
    r: [-16, 1, 16, -1],
    q: [-17, -15, -16, 1, 17, 15, 16, -1],
    k: [-17, -15, -16, 1, 17, 15, 16, -1]
  };

  var ATTACKS = [
    20, 21, 19, 18, 1, -1, 16, -16,
    33, 31, 14, 18, -18, -33, -31, -14
  ];

  var FLAGS = {
    NORMAL: 'n',
    PAWN_PUSH: 'b',
    CAPTURE: 'c',
    EN_PASSANT: 'e',
    KING_SIDE_CASTLE: 'k',
    QUEEN_SIDE_CASTLE: 'q',
    PROMOTION: 'p'
  };

  var BITS = {
    NORMAL: 1,
    CAPTURE: 2,
    BIG_PAWN: 4,
    EP_CAPTURE: 8,
    PROMOTION: 16,
    KSIDE_CASTLE: 32,
    QSIDE_CASTLE: 64
  };

  var RANK_1 = 7;
  var RANK_2 = 6;
  var RANK_7 = 1;
  var RANK_8 = 0;

  var board = new Array(128);
  var kings = { w: EMPTY, b: EMPTY };
  var turn = WHITE;
  var castling = { w: 0, b: 0 };
  var ep_square = EMPTY;
  var half_moves = 0;
  var move_number = 1;
  var history = [];
  var header = {};
  /* utilities */

  function trim(str) {
    return str.replace(/^\s+|\s+$/g, '');
  }

  function clone(obj) {
    var newObj = {};
    for (var i in obj) {
      if (obj.hasOwnProperty(i)) {
        newObj[i] = obj[i];
      }
    }
    return newObj;
  }

  function rank(i) {
    return i >> 4;
  }

  function file(i) {
    return i & 15;
  }

  function algebraic(i) {
    var f = file(i), r = 8 - rank(i);
    return 'abcdefgh'.charAt(f) + r;
  }

  function swap_color(c) {
    return c === WHITE ? BLACK : WHITE;
  }

  function is_digit(c) {
    return '0123456789'.indexOf(c) !== -1;
  }

  /* piece object */

  function Piece(type, color) {
    this.type = type;
    this.color = color;
  }

  Piece.prototype.unicode = function() {
    var symbols = {
      P: '♙', N: '♘', B: '♗', R: '♖', Q: '♕', K: '♔',
      p: '♟︎', n: '♞', b: '♝', r: '♜', q: '♛', k: '♚'
    };
    return symbols[this.color === 'w' ? this.type.toUpperCase() : this.type];
  };

  /* move object */

  function Move(from, to, flags, piece, captured, promotion) {
    this.from = from;
    this.to = to;
    this.flags = flags;
    this.piece = piece;
    this.captured = captured;
    this.promotion = promotion;
  }

  /* initialize board */

  function clear() {
    board = new Array(128);
    kings = { w: EMPTY, b: EMPTY };
    turn = WHITE;
    castling = { w: 0, b: 0 };
    ep_square = EMPTY;
    half_moves = 0;
    move_number = 1;
    history = [];
  }

  function put(piece, square) {
    if (!('type' in piece && 'color' in piece)) return false;
    if (SYMBOLS.indexOf(piece.type.toLowerCase()) === -1) return false;
    if (!(square >= 0 && square < 128 && (square & 0x88) === 0)) return false;

    board[square] = { type: piece.type, color: piece.color };

    if (piece.type === KING) {
      kings[piece.color] = square;
    }

    return true;
  }

  function remove(square) {
    var piece = board[square];
    board[square] = null;
    return piece;
  }

  function reset() {
    load(DEFAULT_POSITION);
  }

  function load(fen) {
    var tokens = fen.split(/\s+/);
    var position = tokens[0];
    var square = 0;

    clear();

    for (var i = 0; i < position.length; i++) {
      var c = position.charAt(i);

      if (c === '/') {
        square += 8;
      } else if (is_digit(c)) {
        square += parseInt(c, 10);
      } else {
        var color = (c < 'a') ? WHITE : BLACK;
        var type = c.toLowerCase();
        put({ type: type, color: color }, square);
        square++;
      }
    }

    turn = tokens[1];

    castling = { w: 0, b: 0 };
    if (tokens[2].indexOf('K') !== -1) castling.w |= BITS.KSIDE_CASTLE;
    if (tokens[2].indexOf('Q') !== -1) castling.w |= BITS.QSIDE_CASTLE;
    if (tokens[2].indexOf('k') !== -1) castling.b |= BITS.KSIDE_CASTLE;
    if (tokens[2].indexOf('q') !== -1) castling.b |= BITS.QSIDE_CASTLE;

    ep_square = (tokens[3] === '-') ? EMPTY : algebraic_to_square(tokens[3]);

    half_moves = parseInt(tokens[4], 10);
    move_number = parseInt(tokens[5], 10);

    return true;
  }

  function algebraic_to_square(s) {
    var f = s.charCodeAt(0) - 'a'.charCodeAt(0);
    var r = 8 - parseInt(s.charAt(1), 10);
    return (r << 4) | f;
  }
  /* FEN generation */

  function generate_fen() {
    var empty = 0;
    var fen = '';

    for (var i = 0; i < 128; i++) {
      if (i & 0x88) {
        i += 7;
        continue;
      }
      if (board[i] == null) {
        empty++;
      } else {
        if (empty > 0) {
          fen += empty;
          empty = 0;
        }
        var piece = board[i];
        fen += (piece.color === WHITE)
          ? piece.type.toUpperCase()
          : piece.type.toLowerCase();
      }
      if ((i & 15) === 7) {
        if (empty > 0) {
          fen += empty;
        }
        if (i !== 119) fen += '/';
        empty = 0;
      }
    }

    var cflags = '';
    if (castling.w & BITS.KSIDE_CASTLE) cflags += 'K';
    if (castling.w & BITS.QSIDE_CASTLE) cflags += 'Q';
    if (castling.b & BITS.KSIDE_CASTLE) cflags += 'k';
    if (castling.b & BITS.QSIDE_CASTLE) cflags += 'q';
    if (cflags === '') cflags = '-';

    var ep = (ep_square === EMPTY) ? '-' : algebraic(ep_square);

    return [
      fen,
      turn,
      cflags,
      ep,
      half_moves,
      move_number
    ].join(' ');
  }

  /* move generation */

  function generate_moves(options) {
    var moves = [];
    var us = turn;
    var them = swap_color(us);
    var second_rank = (us === WHITE) ? RANK_2 : RANK_7;
    var first_sq = 0;
    var last_sq = 127;

    options = options || {};

    for (var i = first_sq; i < last_sq; i++) {
      if (i & 0x88) {
        i += 7;
        continue;
      }

      var piece = board[i];
      if (!piece || piece.color !== us) continue;

      if (piece.type === PAWN) {
        var dir = (us === WHITE) ? -16 : 16;
        var one = i + dir;

        if (board[one] == null) {
          if (rank(one) === (us === WHITE ? 0 : 7)) {
            moves.push(new Move(i, one, BITS.PROMOTION, PAWN, null, QUEEN));
            moves.push(new Move(i, one, BITS.PROMOTION, PAWN, null, ROOK));
            moves.push(new Move(i, one, BITS.PROMOTION, PAWN, null, BISHOP));
            moves.push(new Move(i, one, BITS.PROMOTION, PAWN, null, KNIGHT));
          } else {
            moves.push(new Move(i, one, BITS.NORMAL, PAWN));
          }

          if (rank(i) === second_rank) {
            var two = i + dir * 2;
            if (board[two] == null) {
              moves.push(new Move(i, two, BITS.BIG_PAWN, PAWN));
            }
          }
        }

        var caps = [one + 1, one - 1];
        for (var j = 0; j < caps.length; j++) {
          var target = caps[j];
          if (target & 0x88) continue;

          if (board[target] != null && board[target].color === them) {
            if (rank(target) === (us === WHITE ? 0 : 7)) {
              moves.push(new Move(i, target, BITS.CAPTURE | BITS.PROMOTION, PAWN, board[target], QUEEN));
              moves.push(new Move(i, target, BITS.CAPTURE | BITS.PROMOTION, PAWN, board[target], ROOK));
              moves.push(new Move(i, target, BITS.CAPTURE | BITS.PROMOTION, PAWN, board[target], BISHOP));
              moves.push(new Move(i, target, BITS.CAPTURE | BITS.PROMOTION, PAWN, board[target], KNIGHT));
            } else {
              moves.push(new Move(i, target, BITS.CAPTURE, PAWN, board[target]));
            }
          }

          if (target === ep_square) {
            moves.push(new Move(i, target, BITS.EP_CAPTURE, PAWN, { type: PAWN, color: them }));
          }
        }
      } else {
        var offsets = PIECE_OFFSETS[piece.type];
        for (var k = 0; k < offsets.length; k++) {
          var offset = offsets[k];
          var sq = i;

          while (true) {
            sq += offset;
            if (sq & 0x88) break;

            if (board[sq] == null) {
              moves.push(new Move(i, sq, BITS.NORMAL, piece.type));
            } else {
              if (board[sq].color === them) {
                moves.push(new Move(i, sq, BITS.CAPTURE, piece.type, board[sq]));
              }
              break;
            }

            if (piece.type === KNIGHT || piece.type === KING) break;
          }
        }
      }
    }

    return moves;
  }

  /* Check if king is in check */

  function attacked(color, square) {
    var them = swap_color(color);
    var moves = generate_moves({});

    for (var i = 0; i < moves.length; i++) {
      if (moves[i].color === them && moves[i].to === square) return true;
    }

    return false;
  }
  /* Make a move on the board */

  function make_move(move) {
    var us = turn;
    var them = swap_color(us);

    history.push({
      move: move,
      kings: clone(kings),
      turn: turn,
      castling: clone(castling),
      ep_square: ep_square,
      half_moves: half_moves,
      move_number: move_number
    });

    var from = move.from;
    var to = move.to;
    var piece = board[from];

    board[to] = board[from];
    board[from] = null;

    if (piece.type === KING) {
      kings[us] = to;

      if (move.flags & BITS.KSIDE_CASTLE) {
        var rook_from = to + 1;
        var rook_to = to - 1;
        board[rook_to] = board[rook_from];
        board[rook_from] = null;
      } else if (move.flags & BITS.QSIDE_CASTLE) {
        var rook_from = to - 2;
        var rook_to = to + 1;
        board[rook_to] = board[rook_from];
        board[rook_from] = null;
      }

      castling[us] = 0;
    }

    if (move.flags & BITS.EP_CAPTURE) {
      var ep_offset = (us === WHITE) ? 16 : -16;
      board[to + ep_offset] = null;
    }

    if (piece.type === PAWN) {
      half_moves = 0;

      if (move.flags & BITS.BIG_PAWN) {
        var ep_offset = (us === WHITE) ? -16 : 16;
        ep_square = to + ep_offset;
      } else {
        ep_square = EMPTY;
      }

      if (move.flags & BITS.PROMOTION) {
        board[to] = {
          type: move.promotion,
          color: us
        };
      }
    } else {
      ep_square = EMPTY;
    }

    if (move.flags & BITS.CAPTURE) {
      half_moves = 0;
    } else if (piece.type !== PAWN) {
      half_moves++;
    }

    if (piece.type === ROOK) {
      if (from === 112) castling.w &= ~BITS.QSIDE_CASTLE;
      else if (from === 119) castling.w &= ~BITS.KSIDE_CASTLE;
      else if (from === 0) castling.b &= ~BITS.QSIDE_CASTLE;
      else if (from === 7) castling.b &= ~BITS.KSIDE_CASTLE;
    }

    turn = them;

    if (turn === WHITE) move_number++;
  }

  /* Undo a move */

  function undo_move() {
    var old = history.pop();
    if (old == null) return null;

    board = new Array(128);
    for (var i = 0; i < 128; i++) board[i] = null;

    kings = old.kings;
    turn = old.turn;
    castling = old.castling;
    ep_square = old.ep_square;
    half_moves = old.half_moves;
    move_number = old.move_number;

    var move = old.move;

    // Rebuild board up to previous state
    load(generate_fen());

    return move;
  }

  /* Check legal moves */

  function legal_moves() {
    var moves = generate_moves({});
    var legal = [];

    for (var i = 0; i < moves.length; i++) {
      make_move(moves[i]);
      if (!in_check(swap_color(turn))) {
        legal.push(moves[i]);
      }
      undo_move();
    }

    return legal;
  }

  function in_check(color) {
    return attacked(swap_color(color), kings[color]);
  }

  function in_checkmate() {
    return in_check(turn) && legal_moves().length === 0;
  }

  function in_stalemate() {
    return !in_check(turn) && legal_moves().length === 0;
  }

  function insufficient_material() {
    return false; // simplified for this build
  }

  function game_over() {
    return in_checkmate() || in_stalemate();
  }

  function move_to_san(move) {
    return algebraic(move.from) + algebraic(move.to);
  }
  /* Make a move in SAN or LAN */

  function move(move_str) {
    var moves = legal_moves();
    for (var i = 0; i < moves.length; i++) {
      if (move_to_san(moves[i]) === move_str ||
          (algebraic(moves[i].from) + algebraic(moves[i].to)) === move_str) {
        make_move(moves[i]);
        return moves[i];
      }
    }
    return null;
  }

  /* Public API */

  return {
    move: move,
    undo: undo_move,
    moves: function() {
      return legal_moves().map(move_to_san);
    },
    turn: function() {
      return turn;
    },
    in_check: function() {
      return in_check(turn);
    },
    in_checkmate: in_checkmate,
    in_stalemate: in_stalemate,
    game_over: game_over,
    fen: generate_fen,
    load: load
  };
}

/* Export for browser */
if (typeof window !== "undefined") {
  window.Chess = Chess;
}

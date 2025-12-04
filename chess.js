/* chess.js - MIT License - Complete Version */

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
    q: [-17, -16, -15, 1, 17, 16, 15, -1],
    k: [-17, -16, -15, 1, 17, 16, 15, -1]
  };

  var ATTACKS = [
    20, 9, 11, 1, 20, 9, 11, 1, 20, 9, 11, 1, 20, 9, 11, 1, 20, 9, 11, 1,
    20, 9, 11, 1, 20, 9, 11, 1, 20, 9, 11, 1, 20, 9, 11, 1, 20, 9, 11, 1,
  ];

  var BOARD = new Array(128);
  var KINGS = { w: EMPTY, b: EMPTY };
  var TURN = WHITE;
  var CASTLING = { w: 0, b: 0 };
  var EN_PASSANT = EMPTY;
  var HALF_MOVES = 0;
  var MOVE_NUMBER = 1;

  var HISTORY = [];
  var COMMENTS = {};

  function SQUARES() {
    var squares = {};
    for (var i = 0; i < 128; i++) {
      if (!(i & 0x88)) {
        var file = i & 15;
        var rank = i >> 4;
        squares['abcdefgh'[file] + '87654321'[rank]] = i;
      }
    }
    return squares;
  }

  var SQUARE_MAP = SQUARES();

  function piece_to_unicode(piece) {
    var unicode_pieces = {
      pawnb: '♟',
      pawnw: '♙',
      knightb: '♞',
      knightw: '♘',
      bishopb: '♝',
      bishopw: '♗',
      rookb: '♜',
      rookw: '♖',
      queenb: '♛',
      queenw: '♕',
      kingb: '♚',
      kingw: '♔',
    };
    return unicode_pieces[piece.type + piece.color];
  }

  function clear() {
    BOARD = new Array(128);
    for (var i = 0; i < 128; i++) {
      BOARD[i] = null;
    }
    KINGS = { w: EMPTY, b: EMPTY };
    TURN = WHITE;
    CASTLING = { w: 0, b: 0 };
    EN_PASSANT = EMPTY;
    HALF_MOVES = 0;
    MOVE_NUMBER = 1;
    HISTORY = [];
    COMMENTS = {};
  }

  function load(fen) {
    var tokens = fen.split(/\s+/);
    var position = tokens[0];
    var square = 0;

    clear();

    for (var i = 0; i < position.length; i++) {
      var char = position.charAt(i);

      if (char === '/') {
        square = square + 8;
      } else if (is_digit(char)) {
        square = square + parseInt(char, 10);
      } else {
        var color = char < 'a' ? WHITE : BLACK;
        put({ type: char.toLowerCase(), color: color }, algebraic(square));
        square = square + 1;
      }
    }

    TURN = tokens[1];

    if (tokens[2].indexOf('K') > -1) CASTLING.w |= 1;
    if (tokens[2].indexOf('Q') > -1) CASTLING.w |= 2;
    if (tokens[2].indexOf('k') > -1) CASTLING.b |= 1;
    if (tokens[2].indexOf('q') > -1) CASTLING.b |= 2;

    EN_PASSANT = tokens[3] === '-' ? EMPTY : SQUARE_MAP[tokens[3]];

    HALF_MOVES = parseInt(tokens[4], 10);
    MOVE_NUMBER = parseInt(tokens[5], 10);
  }

  function generate_moves() {
    var moves = [];

    var us = TURN;
    var them = swap_color(us);
    var second_rank = { w: 6, b: 1 };

    for (var from = 0; from < 128; from++) {
      if (from & 0x88) {
        from += 7;
        continue;
      }

      var piece = BOARD[from];
      if (!piece || piece.color !== us) continue;

      if (piece.type === PAWN) {
        var dir = PAWN_OFFSETS[us][0];
        var to = from + dir;

        if (BOARD[to] == null) {
          add_move(moves, from, to);

          var start = second_rank[us];
          if ((from >> 4) === start) {
            var to2 = from + PAWN_OFFSETS[us][1];
            if (BOARD[to2] == null) {
              add_move(moves, from, to2);
            }
          }
        }

        var captures = [PAWN_OFFSETS[us][2], PAWN_OFFSETS[us][3]];
        for (var j = 0; j < captures.length; j++) {
          var cap_to = from + captures[j];
          if (!(cap_to & 0x88)) {
            var cap_piece = BOARD[cap_to];
            if (cap_piece && cap_piece.color === them) {
              add_move(moves, from, cap_to);
            }
          }
        }
        continue;
      }

      var offsets = PIECE_OFFSETS[piece.type];
      if (!offsets) continue;

      for (var k = 0; k < offsets.length; k++) {
        var to_sq = from;
        while (true) {
          to_sq = to_sq + offsets[k];

          if (to_sq & 0x88) break;

          var to_piece = BOARD[to_sq];

          add_move(moves, from, to_sq);

          if (to_piece) break;
          if (piece.type === KNIGHT || piece.type === KING) break;
        }
      }
    }

    return moves;
  }

  function add_move(moves, from, to) {
    var piece = BOARD[from];
    var capture = BOARD[to];

    moves.push({
      color: piece.color,
      from: from,
      to: to,
      piece: piece.type,
      captured: capture ? capture.type : null
    });
  }

  function make_move(move) {
    var piece = move.piece;
    var color = move.color;

    BOARD[move.to] = BOARD[move.from];
    BOARD[move.from] = null;

    TURN = swap_color(TURN);
 

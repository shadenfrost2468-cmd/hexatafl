
"use strict";

/* =========================================================
   AI OPPONENT
   Clean, predictable AI
   ========================================================= */

function getAllMoves(side){
    const moves = [];

    for(const [position, piece] of board.entries()){
        if(owner(piece) !== side) continue;

        const [q, r] = position.split(",").map(Number);
        const destinations = getLegalMoves(q, r, side);

        for(const [toQ, toR] of destinations){
            moves.push({
                from: [q, r],
                to: [toQ, toR]
            });
        }
    }

    return moves;
}

function restoreBoard(savedBoard, savedMandatory){
    board.clear();

    for(const [position, piece] of savedBoard.entries()){
        board.set(position, piece);
    }

    mandatory = savedMandatory
        ? {...savedMandatory}
        : null;
}

function simulateMove(move){
    const savedBoard = new Map(board);
    const savedMandatory = mandatory
        ? {...mandatory}
        : null;

    const piece = pieceAt(move.from[0], move.from[1]);

    if(!piece){
        return null;
    }

    setPiece(move.from[0], move.from[1], null);
    setPiece(move.to[0], move.to[1], piece);

    applyRegularCaptures(
        move.to[0],
        move.to[1],
        piece
    );

    return {
        piece,
        savedBoard,
        savedMandatory
    };
}

function finishSimulation(state){
    if(state){
        restoreBoard(
            state.savedBoard,
            state.savedMandatory
        );
    }
}

/*
   Returns the King's current position, or null.
*/

function findKing(){
    for(const [position, piece] of board.entries()){
        if(piece === "K"){
            return position.split(",").map(Number);
        }
    }

    return null;
}

/*
   Scores one move from the AI's perspective.
   Winning moves receive an overwhelming score.
*/

function evaluateAIMove(move){
    const state = simulateMove(move);

    if(!state){
        return -Infinity;
    }

    const piece = state.piece;
    let score = 0;

    /* Immediate victories. */

    if(piece === "K" && isEscape(move.to[0], move.to[1])){
        score = aiSide === "D"
            ? 1000000000
            : -1000000000;

        finishSimulation(state);
        return score;
    }

    const king = findKing();

    if(!king){
        score = aiSide === "B"
            ? 1000000000
            : -1000000000;

        finishSimulation(state);
        return score;
    }

    const [kq, kr] = king;

    const attackers = neighbors(kq, kr)
        .filter(([q, r]) => pieceAt(q, r) === "B")
        .length;

    const defenders = neighbors(kq, kr)
        .filter(([q, r]) => pieceAt(q, r) === "D")
        .length;

    const kingMoves = getLegalMoves(
        kq,
        kr,
        "D"
    ).length;

    let closestEscape = Infinity;

    for(const escape of ESCAPES){
        const [eq, er] = escape.split(",").map(Number);

        const distance = Math.max(
            Math.abs(kq - eq),
            Math.abs(kr - er),
            Math.abs((kq + kr) - (eq + er))
        );

        closestEscape = Math.min(
            closestEscape,
            distance
        );
    }

    const opponent = aiSide === "B" ? "D" : "B";
    const opponentMoves = getAllMoves(opponent).length;

    if(aiSide === "B"){
        /* Black: capture or restrict the King. */

        score += attackers * 2500;
        score -= defenders * 300;
        score += (20 - kingMoves) * 250;
        score += closestEscape * 120;
        score -= opponentMoves * 8;

        /*
           Prefer moves that leave the King
           immediately capturable.
        */

        if(
            attackers >= 3 ||
            (corner(kq, kr) && attackers >= 2)
        ){
            score += 500000;
        }

    }else{
        /* Red: protect and advance the King. */

        score += defenders * 700;
        score -= attackers * 2500;
        score += (20 - closestEscape) * 500;
        score += kingMoves * 180;
        score -= opponentMoves * 3;
    }

    /* Reward captures made by the simulated move. */

    const beforeCount = state.savedBoard.size;
    const afterCount = board.size;

    score += (beforeCount - afterCount) * 1800;

    /* Mild movement preference. */

    const destinationDistance = Math.max(
        Math.abs(move.to[0]),
        Math.abs(move.to[1]),
        Math.abs(move.to[0] + move.to[1])
    );

    if(aiSide === "B"){
        score += (10 - destinationDistance) * 12;
    }

    finishSimulation(state);

    return score;
}

/*
   Selects the AI move.
   Red always takes a legal winning escape immediately.
*/

function chooseAIMove(){
    const moves = getAllMoves(aiSide);

    if(moves.length === 0){
        return null;
    }

    if(aiSide === "D"){
        const winningEscape = moves.find(move => {
            return pieceAt(move.from[0], move.from[1]) === "K" &&
                isEscape(move.to[0], move.to[1]);
        });

        if(winningEscape){
            return winningEscape;
        }
    }

    const scoredMoves = moves.map(move => ({
        move,
        score: evaluateAIMove(move)
    }));

    scoredMoves.sort((a, b) => b.score - a.score);

    /*
       Easy is random.
       Normal chooses among the three strongest moves.
       Hard chooses the strongest move.
    */

    if(aiDifficulty === "easy"){
        return moves[
            Math.floor(Math.random() * moves.length)
        ];
    }

    const count = aiDifficulty === "hard" ? 1 : 3;

    const candidates = scoredMoves.slice(
        0,
        Math.min(count, scoredMoves.length)
    );

    return candidates[
        Math.floor(Math.random() * candidates.length)
    ].move;
}

function runAI(){
    if(
        gameOver ||
        paused ||
        turn !== aiSide ||
        aiThinking
    ){
        return;
    }

    aiThinking = true;
    message.textContent = "Computer is thinking...";

    aiTimer = setTimeout(async () => {
        aiTimer = null;

        if(
            gameOver ||
            paused ||
            turn !== aiSide
        ){
            aiThinking = false;
            return;
        }

        const move = chooseAIMove();

        if(!move){
            aiThinking = false;
            checkStalemate();
            return;
        }

        await makeMove(
            move.from,
            move.to
        );

        aiThinking = false;

        if(!gameOver && turn === aiSide){
            runAI();
        }else if(!gameOver){
            message.textContent = "Your turn.";
        }

    }, 500);
}
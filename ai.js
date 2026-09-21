"use strict";

/* =========================================================
   HEXATAFL AI
   All difficulties use the same legal move generator and
   rule-aware evaluation. Difficulty changes move selection.
   ========================================================= */

function aiCloneMandatory(){
  return mandatory ? {...mandatory} : null;
}

function aiRestore(saved){
  board.clear();
  for(const [position, piece] of saved.board.entries()) board.set(position, piece);
  mandatory = saved.mandatory ? {...saved.mandatory} : null;
  gameOver = saved.gameOver;
}

function aiSaveState(){
  return {
    board: new Map(board),
    mandatory: aiCloneMandatory(),
    gameOver
  };
}

function aiMoveIsEscape(move){
  return move && isEscape(move.to[0], move.to[1]);
}

function aiGenerateMoves(side){
  const moves = [];

  for(const [position, piece] of board.entries()){
    if(owner(piece) !== side) continue;

    const [q, r] = position.split(",").map(Number);
    const destinations = getLegalMoves(q, r, side);

    for(const [toQ, toR] of destinations){
      moves.push({from:[q,r], to:[toQ,toR], piece});
    }
  }

  /* A winning King escape always takes priority. */
  if(side === "D"){
    const escapes = moves.filter(move =>
      move.piece === "K" && aiMoveIsEscape(move)
    );
    if(escapes.length) return escapes;
  }

  return moves;
}

function aiApplyMove(move){
  const piece = pieceAt(move.from[0], move.from[1]);
  if(!piece) return null;

  setPiece(move.from[0], move.from[1], null);
  setPiece(move.to[0], move.to[1], piece);
  applyRegularCaptures(move.to[0], move.to[1], piece);

  const kingResult = kingCapture();
  const escaped = piece === "K" && aiMoveIsEscape(move);

  return {piece, kingResult, escaped};
}

function aiDistanceToNearestEscape(q, r){
  let best = Infinity;

  for(const escape of ESCAPES){
    const [eq, er] = escape.split(",").map(Number);
    const distance = Math.max(
      Math.abs(q - eq),
      Math.abs(r - er),
      Math.abs((q + r) - (eq + er))
    );
    if(distance < best) best = distance;
  }

  return best;
}

function aiFindKing(){
  for(const [position, piece] of board.entries()){
    if(piece === "K") return position.split(",").map(Number);
  }
  return null;
}

function aiCount(side){
  let count = 0;
  for(const piece of board.values()){
    if(owner(piece) === side) count++;
  }
  return count;
}

function aiEvaluatePosition(side){
  const king = aiFindKing();
  if(!king) return side === "B" ? 1000000 : -1000000;

  const [kq, kr] = king;
  const attackers = neighbors(kq, kr)
    .filter(([q,r]) => pieceAt(q,r) === "B").length;
  const defenders = neighbors(kq, kr)
    .filter(([q,r]) => pieceAt(q,r) === "D").length;
  const kingMobility = getLegalMoves(kq, kr, "D").length;
  const escapeDistance = aiDistanceToNearestEscape(kq, kr);
  const redMoves = aiGenerateMoves("D").length;
  const blackMoves = aiGenerateMoves("B").length;

  let score = 0;

  if(side === "B"){
    score += attackers * 2200;
    score -= defenders * 500;
    score += (20 - kingMobility) * 300;
    score += escapeDistance * 180;
    score += (redMoves === 0 ? 30000 : 0);
    score -= blackMoves * 4;
  }else{
    score -= attackers * 2400;
    score += defenders * 650;
    score += (20 - escapeDistance) * 700;
    score += kingMobility * 220;
    score += (blackMoves === 0 ? 30000 : 0);
  }

  /* Material matters, but less than immediate King threats. */
  score += (aiCount("B") - aiCount("D")) * (side === "B" ? 35 : -35);

  return score;
}

function aiEvaluateMove(move, side){
  const saved = aiSaveState();
  const beforeBlack = aiCount("B");
  const beforeRed = aiCount("D");
  const result = aiApplyMove(move);

  if(!result){
    aiRestore(saved);
    return -Infinity;
  }

  let score;

  if(result.escaped){
    score = side === "D" ? 1000000000 : -1000000000;
  }else if(result.kingResult.captured){
    score = side === "B" ? 1000000000 : -1000000000;
  }else{
    score = aiEvaluatePosition(side);

    const capturedBlack = beforeBlack - aiCount("B");
    const capturedRed = beforeRed - aiCount("D");

    if(side === "B"){
      score += capturedRed * 4200;
      score -= capturedBlack * 250;
    }else{
      score += capturedBlack * 4200;
      score -= capturedRed * 250;
    }

    /* Prefer King moves toward an escape for Red. */
    if(side === "D" && move.piece === "K"){
      const beforeKing = saved.board;
      const oldPosition = [...beforeKing.entries()]
        .find(([,piece]) => piece === "K");

      if(oldPosition){
        const [oq, or] = oldPosition[0].split(",").map(Number);
        const beforeDistance = aiDistanceToNearestEscape(oq, or);
        const afterDistance = aiDistanceToNearestEscape(move.to[0], move.to[1]);
        score += (beforeDistance - afterDistance) * 1800;
      }
    }
  }

  aiRestore(saved);
  return score;
}

function aiChooseBest(moves, side){
  const scored = moves.map(move => ({
    move,
    score: aiEvaluateMove(move, side)
  }));

  scored.sort((a,b) => b.score - a.score);

  if(aiDifficulty === "easy"){
    /* Easy still obeys rules, but selects randomly. */
    return moves[Math.floor(Math.random() * moves.length)];
  }

  if(aiDifficulty === "normal"){
    const top = scored.slice(0, Math.min(4, scored.length));
    return top[Math.floor(Math.random() * top.length)].move;
  }

  /* Hard uses the highest evaluated move. */
  return scored[0].move;
}

function chooseAIMove(){
  const moves = aiGenerateMoves(aiSide);
  if(!moves.length) return null;
  return aiChooseBest(moves, aiSide);
}

function runAI(){
  if(gameOver || paused || turn !== aiSide || aiThinking) return;

  aiThinking = true;
  message.textContent = "Computer is thinking...";

  aiTimer = setTimeout(async () => {
    aiTimer = null;

    if(gameOver || paused || turn !== aiSide){
      aiThinking = false;
      return;
    }

    const move = chooseAIMove();

    if(!move){
      aiThinking = false;
      checkStalemate();
      return;
    }

    await makeMove(move.from, move.to);
    aiThinking = false;

    if(!gameOver && turn === aiSide) runAI();
    else if(!gameOver) message.textContent = "Your turn.";
  }, 500);
}

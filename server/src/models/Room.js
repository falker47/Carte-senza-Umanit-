export class Room {
  constructor(roomCode, hostId, hostNickname, whiteCards, blackCards) {
    this.roomCode = roomCode;
    this.hostId = hostId;
    this.players = [{ id: hostId, nickname: hostNickname, score: 0, hand: [] }];
    this.gameStarted = false;
    this.currentRound = 0;
    this.judgeIndex = 0;
    this.blackCards = [...blackCards]; // Copia per non modificare l'originale
    this.whiteCards = [...whiteCards]; // Copia per non modificare l'originale
    this.currentBlackCard = null;
    this.playedCards = []; // Array di { playerId, cards }
    this.maxPlayers = 10;
    this.maxPoints = 5;
    this.handSize = 7;    // Valore di default, sovrascritto da startGame
    this.roundStatus = 'waiting'; // 'waiting', 'playing', 'judging', 'roundEnd', 'gameOver'
    this.roundWinner = null; // playerId of the winner of the current round
    this.gameWinner = null; // player object of the game winner
    this.gameOver = false;
  }

  isFull() {
    return this.players.length >= this.maxPlayers;
  }

  isNicknameTaken(nickname) {
    return this.players.some(player => player.nickname.toLowerCase() === nickname.toLowerCase());
  }

  isHost(playerId) {
    return this.hostId === playerId;
  }

  isJudge(playerId) {
    if (!this.gameStarted) return false;
    return this.players[this.judgeIndex].id === playerId;
  }

  addPlayer(playerId, nickname) {
    this.players.push({ id: playerId, nickname, score: 0, hand: [] });
  }

  removePlayer(playerId) {
    const index = this.players.findIndex(player => player.id === playerId);
    if (index !== -1) {
      this.players.splice(index, 1);

      // Se il giudice è uscito, passa al prossimo giocatore
      if (this.gameStarted && this.judgeIndex >= this.players.length) {
        this.judgeIndex = 0;
      }

      // Se l'host è uscito, assegna un nuovo host
      if (playerId === this.hostId && this.players.length > 0) {
        this.hostId = this.players[0].id;
      }

      // Rimuovi le carte giocate dal giocatore uscito
      this.playedCards = this.playedCards.filter(card => card.playerId !== playerId);
    }
  }

  getPlayerCount() {
    return this.players.length;
  }

  getPlayers() {
    return this.players.map(({ id, nickname, score }) => ({ id, nickname, score }));
  }

  startGame(maxPoints = 5, handSize = 7) { // Aggiunto handSize come parametro
    this.gameStarted = true;
    this.currentRound = 1;
    this.judgeIndex = 0;
    this.maxPoints = maxPoints;
    this.handSize = handSize; // Imposta handSize dalle impostazioni
    this.playedCards = [];
    this.roundStatus = 'playing'; // Set round status to playing
    this.gameOver = false;
    this.gameWinner = null;
    this.roundWinner = null;

    // Mescola le carte
    this.shuffleCards();

    // Distribuisci le carte ai giocatori
    this.dealCards(); // dealCards userà this.handSize aggiornato

    // Seleziona la prima carta nera
    this.currentBlackCard = this.blackCards.pop();
  }

  shuffleCards() {
    // Fisher-Yates shuffle
    for (let i = this.whiteCards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.whiteCards[i], this.whiteCards[j]] = [this.whiteCards[j], this.whiteCards[i]];
    }

    for (let i = this.blackCards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.blackCards[i], this.blackCards[j]] = [this.blackCards[j], this.blackCards[i]];
    }
  }

  dealCards() {
    // Distribuisci 10 carte bianche a ogni giocatore
    this.players.forEach(player => {
      player.hand = [];
      for (let i = 0; i < this.handSize; i++) {
        if (this.whiteCards.length > 0) {
          player.hand.push(this.whiteCards.pop());
        }
      }
    });
  }

  playCard(playerId, cardIndex) {
    // Trova il giocatore
    const playerIndex = this.players.findIndex(player => player.id === playerId);
    if (playerIndex === -1) {
      return { success: false, error: 'Giocatore non trovato' };
    }

    // Verifica se il giocatore ha già giocato
    if (this.playedCards.some(card => card.playerId === playerId)) {
      return { success: false, error: 'Hai già giocato una carta in questo turno' };
    }

    // Verifica se l'indice della carta è valido
    if (cardIndex < 0 || cardIndex >= this.players[playerIndex].hand.length) {
      return { success: false, error: 'Indice carta non valido' };
    }

    // Gioca la carta
    const card = this.players[playerIndex].hand[cardIndex];
    this.playedCards.push({ playerId, card });

    // Rimuovi la carta dalla mano del giocatore
    this.players[playerIndex].hand.splice(cardIndex, 1);

    // Aggiungi una nuova carta alla mano del giocatore
    if (this.whiteCards.length > 0) {
      this.players[playerIndex].hand.push(this.whiteCards.pop());
    }

    return { success: true };
  }

  getPlayersPlayedCount() {
    // Escludi il giudice dal conteggio
    const nonJudgePlayers = this.players.filter((_, index) => index !== this.judgeIndex);
    
    // Conta quanti giocatori hanno giocato
    const playedCount = this.playedCards.length;
    
    return {
      played: playedCount,
      total: nonJudgePlayers.length
    };
  }

  allPlayersPlayed() {
    // Escludi il giudice dal conteggio
    const nonJudgePlayers = this.players.filter((_, index) => index !== this.judgeIndex);
    
    // Verifica se tutti i giocatori (tranne il giudice) hanno giocato una carta
    return nonJudgePlayers.every(player => 
      this.playedCards.some(card => card.playerId === player.id)
    );
  }

  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
  
  getPlayedCards() {
    // Restituisci le carte giocate in ordine casuale per non rivelare chi ha giocato cosa
    return this.shufflePlayedCards(); // shufflePlayedCards returns a shuffled copy of this.playedCards
  }
  
  shufflePlayedCards() {
    const cards = [...this.playedCards]; // Each element is { playerId, card }
    // Fisher-Yates shuffle
    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    return cards; // Returns an array of { playerId, card }
  }
  
  setRoundStatus(status) {
    this.roundStatus = status;
    console.log(`[Room ${this.roomCode}] Round status set to: ${status}`);
  }

  awardPointToPlayer(playerId) {
    const player = this.players.find(p => p.id === playerId);
    if (player) {
      player.score += 1;
      console.log(`[Room ${this.roomCode}] Player ${playerId} awarded a point. New score: ${player.score}`);
      return player.score;
    }
    return null;
  }

  checkForGameWinner() {
    const winner = this.players.find(p => p.score >= this.maxPoints);
    if (winner) {
      this.gameOver = true;
      this.gameWinner = winner;
      this.setRoundStatus('gameOver');
      console.log(`[Room ${this.roomCode}] Game over! Winner: ${winner.nickname}`);
      return winner;
    }
    return null;
  }

  // This method will be called by GameManager.judgeSelectsWinner
  processJudgeSelection(selectedCardIndex) {
    if (this.roundStatus !== 'judging') {
      return { success: false, error: 'Non è il momento di giudicare (controllo interno Room).' };
    }

    // Get the list of cards as displayed to the judge (shuffled)
    const displayedPlayedCards = this.getPlayedCards();

    if (selectedCardIndex < 0 || selectedCardIndex >= displayedPlayedCards.length) {
      return { success: false, error: 'Indice carta selezionata non valido.' };
    }

    // Identify the winning submission from the displayed list
    const winningSubmission = displayedPlayedCards[selectedCardIndex];
    // winningSubmission is an object like { playerId: 'someId', card: 'text of card' }

    const winnerId = winningSubmission.playerId;
    const winnerPlayer = this.players.find(p => p.id === winnerId);

    if (!winnerPlayer) {
      // This should not happen if playerId in playedCards is always valid
      console.error(`[Room ${this.roomCode}] Errore critico: Giocatore vincente non trovato con ID ${winnerId} dalla carta selezionata.`);
      return { success: false, error: 'Giocatore vincente non trovato.' };
    }

    this.awardPointToPlayer(winnerId);
    this.roundWinner = winnerId; // Store the ID of the round winner
    this.setRoundStatus('roundEnd');

    const gameWinner = this.checkForGameWinner();

    console.log(`[Room ${this.roomCode}] Giudice ha selezionato la carta. Vincitore del round: ${winnerPlayer.nickname}. Carta: ${JSON.stringify(winningSubmission.card)}`);

    return {
      success: true,
      winnerInfo: {
        playerId: winnerId,
        nickname: winnerPlayer.nickname,
        score: winnerPlayer.score,
        cardPlayed: winningSubmission.card // This is the actual card object/text
      },
      gameOver: this.gameOver,
      gameWinner: gameWinner,
      gameState: this.getGameState() // Return updated game state
    };
  }

  selectWinner(cardIndex) {
    if (cardIndex < 0 || cardIndex >= this.playedCards.length) {
      return { success: false, error: 'Indice carta non valido' };
    }
    
    // This method's logic should be mostly covered by processJudgeSelection now.
    // For now, let's keep it but it might be deprecated or refactored.
    const winningCard = this.playedCards[cardIndex];
    const winnerIndex = this.players.findIndex(player => player.id === winningCard.playerId);
    
    if (winnerIndex === -1) {
      return { success: false, error: 'Giocatore vincente non trovato' };
    }
    
    // Incrementa il punteggio del vincitore
    this.players[winnerIndex].score += 1;
    
    // Verifica se il giocatore ha raggiunto il punteggio massimo
    const gameOver = this.players[winnerIndex].score >= this.maxPoints;
    
    // Restituisci le informazioni sul vincitore
    return { 
      success: true, 
      winnerInfo: {
        playerId: winningCard.playerId,
        nickname: this.players[winnerIndex].nickname,
        score: this.players[winnerIndex].score,
        cardIndex
      },
      gameOver,
      winner: gameOver ? this.players[winnerIndex] : null
    };
  }
  
  startNewRound() {
    // Incrementa il round
    this.currentRound += 1;
    
    // Passa al prossimo giudice
    this.judgeIndex = (this.judgeIndex + 1) % this.players.length;
    
    // Resetta le carte giocate
    this.playedCards = [];
    this.roundWinner = null;
    this.setRoundStatus('playing'); // Set round status to playing for the new round
    
    // Seleziona una nuova carta nera
    if (this.blackCards.length === 0) {
      // Se le carte nere sono finite, rimescola quelle usate
      // Questo è un punto di miglioramento: sarebbe meglio tenere traccia delle carte usate
      this.shuffleCards();
    }
    
    this.currentBlackCard = this.blackCards.pop();
    
    return { success: true };
  }
  
  getGameState() {
    return {
      roomCode: this.roomCode,
      hostId: this.hostId,
      players: this.getPlayers(),
      gameStarted: this.gameStarted,
      currentRound: this.currentRound,
      currentJudge: this.players[this.judgeIndex]?.id,
      blackCard: this.currentBlackCard, // Changed from currentBlackCard to blackCard for direct mapping
      maxPoints: this.maxPoints,
      maxPlayers: this.maxPlayers,
      handSize: this.handSize,
      roundStatus: this.roundStatus, // Use the actual roundStatus property
      playedCards: this.roundStatus === 'judging' || this.roundStatus === 'roundEnd' ? this.getPlayedCards() : [], // Only send played cards when relevant
      roundWinner: this.roundWinner,
      gameOver: this.gameOver,
      gameWinner: this.gameWinner,
      // You might want to send player hands only to the specific player
      // For now, this sends the full state; consider security/privacy for hands later
    };
  }
}
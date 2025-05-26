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
    this.handSize = 10;
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

  startGame(maxPoints = 5) {
    this.gameStarted = true;
    this.currentRound = 1;
    this.judgeIndex = 0;
    this.maxPoints = maxPoints;
    this.playedCards = [];

    // Mescola le carte
    this.shuffleCards();

    // Distribuisci le carte ai giocatori
    this.dealCards();

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
    return this.shufflePlayedCards();
  }
  
  shufflePlayedCards() {
    const cards = [...this.playedCards];
    // Fisher-Yates shuffle
    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    return cards;
  }
  
  selectWinner(cardIndex) {
    if (cardIndex < 0 || cardIndex >= this.playedCards.length) {
      return { success: false, error: 'Indice carta non valido' };
    }
    
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
      currentBlackCard: this.currentBlackCard,
      maxPoints: this.maxPoints,
      maxPlayers: this.maxPlayers,
      handSize: this.handSize
    };
  }
}
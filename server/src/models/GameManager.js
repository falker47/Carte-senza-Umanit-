import { Room } from './Room.js';
import { generateRoomCode } from '../utils.js';

export class GameManager {
  constructor(whiteCards, blackCards) {
    this.rooms = {};
    this.playerRooms = {}; // Mappa socketId -> roomCode
    this.whiteCards = whiteCards;
    this.blackCards = blackCards;
  }

judgeSelectsWinner(roomCode, judgeId, cardIndex) {
  const room = this.rooms[roomCode];
  if (!room) {
    console.error(`[judgeSelectsWinner] Stanza non trovata: ${roomCode}`);
    return { success: false, error: 'Stanza non trovata.' };
  }

  if (!room.currentJudge || room.currentJudge.id !== judgeId) {
    console.error(`[judgeSelectsWinner] Utente ${judgeId} non è il giudice ${room.currentJudge ? room.currentJudge.id : 'N/A'} nella stanza ${roomCode}`);
    return { success: false, error: 'Non sei il giudice di questo round.' };
  }

  if (room.roundStatus !== 'judging') {
    console.error(`[judgeSelectsWinner] Stato round errato: ${room.roundStatus} (atteso judging) nella stanza ${roomCode}`);
    return { success: false, error: 'Non è il momento di giudicare.' };
  }

  if (!room.playedCards || cardIndex < 0 || cardIndex >= room.playedCards.length) {
    console.error(`[judgeSelectsWinner] Indice carta non valido: ${cardIndex} per playedCards di lunghezza ${room.playedCards ? room.playedCards.length : 'N/A'} nella stanza ${roomCode}`);
    return { success: false, error: 'Indice carta non valido o carte non giocate.' };
  }

  // Le carte giocate dovrebbero già essere state mescolate prima di inviarle al client per la fase di giudizio
  // Quindi l'indice corrisponde direttamente.
  const winningSubmission = room.playedCards[cardIndex];
  if (!winningSubmission || !winningSubmission.playerId) {
      console.error(`[judgeSelectsWinner] Dati sottomissione vincente mancanti o corrotti per cardIndex ${cardIndex} nella stanza ${roomCode}`);
      return { success: false, error: 'Dati carta vincente corrotti.' };
  }

  const winnerPlayer = room.players.find(p => p.id === winningSubmission.playerId);

  if (!winnerPlayer) {
    console.error(`[judgeSelectsWinner] Giocatore vincente non trovato con ID: ${winningSubmission.playerId} nella stanza ${roomCode}`);
    return { success: false, error: 'Giocatore vincente non trovato.' };
  }

  winnerPlayer.score += 1;
  room.roundWinnerDetails = {
      playerId: winnerPlayer.id,
      nickname: winnerPlayer.nickname,
      playedCard: winningSubmission.card // La carta bianca giocata
  };
  room.roundStatus = 'roundEnd';
  // Non resettare currentJudge qui, fallo all'inizio del prossimo round (nextRound)
  // Non resettare playedCards qui, fallo all'inizio del prossimo round (nextRound)

  console.log(`[judgeSelectsWinner] Giocatore ${winnerPlayer.nickname} (ID: ${winnerPlayer.id}) vince il round ${room.currentRound} nella stanza ${roomCode}. Punteggio: ${winnerPlayer.score}. Carta: "${winningSubmission.card}"`);

  if (winnerPlayer.score >= room.maxPoints) {
    room.gameOver = true;
    room.gameWinner = winnerPlayer.id; // o nickname, o oggetto intero
    room.status = 'finished'; // Aggiorna lo stato generale della stanza
    console.log(`[judgeSelectsWinner] Partita terminata nella stanza ${roomCode}. Vincitore: ${winnerPlayer.nickname}`);
  }

  return { success: true };
}

  createRoom(hostId, nickname) {
    // Genera un codice stanza univoco
    let roomCode;
    do {
      roomCode = generateRoomCode();
    } while (this.rooms[roomCode]);

    // Crea una nuova stanza
    this.rooms[roomCode] = new Room(roomCode, hostId, nickname, this.whiteCards, this.blackCards);
    this.playerRooms[hostId] = roomCode;

    return { roomCode };
  }

  joinRoom(playerId, nickname, roomCode) {
    // Verifica se la stanza esiste
    if (!this.rooms[roomCode]) {
      return { success: false, error: 'Stanza non trovata' };
    }

    // Verifica se il gioco è già iniziato
    if (this.rooms[roomCode].gameStarted) {
      return { success: false, error: 'Il gioco è già iniziato' };
    }

    // Verifica se la stanza è piena
    if (this.rooms[roomCode].isFull()) {
      return { success: false, error: 'La stanza è piena' };
    }

    // Verifica se il nickname è già in uso
    if (this.rooms[roomCode].isNicknameTaken(nickname)) {
      return { success: false, error: 'Nickname già in uso' };
    }

    // Aggiungi il giocatore alla stanza
    this.rooms[roomCode].addPlayer(playerId, nickname);
    this.playerRooms[playerId] = roomCode;

    return { success: true };
  }

  startGame(roomCode, playerId, maxPoints = 5, handSize = 7) { // Aggiunto handSize come parametro
    // Verifica se la stanza esiste
    if (!this.rooms[roomCode]) {
      return { success: false, error: 'Stanza non trovata' };
    }

    // Verifica se il giocatore è l'host
    if (!this.rooms[roomCode].isHost(playerId)) {
      return { success: false, error: 'Solo l\'host può avviare il gioco' };
    }

    // Verifica se ci sono abbastanza giocatori
    if (this.rooms[roomCode].getPlayerCount() < 3) {
      return { success: false, error: 'Servono almeno 3 giocatori per iniziare' };
    }

    // Avvia il gioco
    this.rooms[roomCode].startGame(maxPoints, handSize); // Passa handSize a Room.startGame
    return { success: true };
  }

  getPlayersInRoom(roomCode) {
    if (!this.rooms[roomCode]) return [];
    return this.rooms[roomCode].getPlayers();
  }

  getGameState(roomCode) {
    if (!this.rooms[roomCode]) return null;
    return this.rooms[roomCode].getGameState();
  }

  playWhiteCard(roomCode, playerId, cardIndex) {
    // Verifica se la stanza esiste
    if (!this.rooms[roomCode]) {
      return { success: false, error: 'Stanza non trovata' };
    }

    // Verifica se il gioco è iniziato
    if (!this.rooms[roomCode].gameStarted) {
      return { success: false, error: 'Il gioco non è ancora iniziato' };
    }

    // Verifica se il giocatore è il giudice
    if (this.rooms[roomCode].isJudge(playerId)) {
      return { success: false, error: 'Il giudice non può giocare carte' };
    }

    // Gioca la carta
    return this.rooms[roomCode].playCard(playerId, cardIndex);
  }

  allPlayersPlayed(roomCode) {
    if (!this.rooms[roomCode]) return false;
    return this.rooms[roomCode].allPlayersPlayed();
  }

  getPlayedCards(roomCode) {
    if (!this.rooms[roomCode]) return [];
    return this.rooms[roomCode].getPlayedCards();
  }

  getPlayersPlayedCount(roomCode) {
    if (!this.rooms[roomCode]) return { played: 0, total: 0 };
    return this.rooms[roomCode].getPlayersPlayedCount();
  }

  selectWinner(roomCode, judgeId, winnerIndex) {
    // Verifica se la stanza esiste
    if (!this.rooms[roomCode]) {
      return { success: false, error: 'Stanza non trovata' };
    }

    // Verifica se il giocatore è il giudice
    if (!this.rooms[roomCode].isJudge(judgeId)) {
      return { success: false, error: 'Solo il giudice può scegliere il vincitore' };
    }

    // Seleziona il vincitore
    return this.rooms[roomCode].selectWinner(winnerIndex);
  }

  startNewRound(roomCode) {
    if (!this.rooms[roomCode]) return null;
    return this.rooms[roomCode].startNewRound();
  }

  handleDisconnect(playerId) {
    const roomCode = this.playerRooms[playerId];
    if (!roomCode || !this.rooms[roomCode]) return [];

    const room = this.rooms[roomCode];
    const isHost = room.isHost(playerId);
    const isGameStarted = room.gameStarted;

    // Rimuovi il giocatore dalla stanza
    room.removePlayer(playerId);
    delete this.playerRooms[playerId];

    // Se l'host è uscito o non ci sono abbastanza giocatori, termina il gioco
    if (isHost || (isGameStarted && room.getPlayerCount() < 3)) {
      // Se l'host è uscito, elimina la stanza
      if (isHost) {
        delete this.rooms[roomCode];
      }

      return [{
        roomCode,
        players: room.getPlayers(),
        isGameOver: true,
        hostLeft: isHost
      }];
    }

    // Altrimenti, aggiorna la lista dei giocatori
    return [{
      roomCode,
      players: room.getPlayers(),
      isGameOver: false,
      hostLeft: false
    }];
  }
}
import { Room } from './Room.js';
import { generateRoomCode } from '../utils.js';

export class GameManager {
  constructor(whiteCards, blackCards) {
    this.rooms = {};
    this.playerRooms = {}; // Mappa socketId -> roomCode
    this.whiteCards = whiteCards;
    this.blackCards = blackCards;
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
    const upperCaseRoomCode = roomCode.toUpperCase(); // Converti in maiuscolo
    // Verifica se la stanza esiste
    if (!this.rooms[upperCaseRoomCode]) { // Usa il codice in maiuscolo
      return { success: false, error: 'Stanza non trovata' };
    }

    // Verifica se il gioco è già iniziato
    if (this.rooms[upperCaseRoomCode].gameStarted) { // Usa il codice in maiuscolo
      return { success: false, error: 'Il gioco è già iniziato' };
    }

    // Verifica se la stanza è piena
    if (this.rooms[upperCaseRoomCode].isFull()) { // Usa il codice in maiuscolo
      return { success: false, error: 'La stanza è piena' };
    }

    // Verifica se il nickname è già in uso
    if (this.rooms[upperCaseRoomCode].isNicknameTaken(nickname)) { // Usa il codice in maiuscolo
      return { success: false, error: 'Nickname già in uso' };
    }

    // Aggiungi il giocatore alla stanza
    this.rooms[upperCaseRoomCode].addPlayer(playerId, nickname); // Usa il codice in maiuscolo
    this.playerRooms[playerId] = upperCaseRoomCode; // Usa il codice in maiuscolo

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

  playWhiteCard(roomCode, playerId, cardIndices) {
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

    // Gioca le carte
    return this.rooms[roomCode].playCard(playerId, cardIndices);
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

  /* // Inizio del commento del blocco
  // REMOVE OR RENAME THE OLD selectWinner if it's not used elsewhere, or ensure this new one is called.
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
  */ // Fine del commento del blocco

  judgeSelectsWinner(roomCode, judgeId, selectedCardIndex) {
    const room = this.rooms[roomCode];
    if (!room) {
      return { success: false, error: 'Stanza non trovata' };
    }

    if (!room.isJudge(judgeId)) {
      return { success: false, error: 'Solo il giudice può selezionare il vincitore.' };
    }

    // The primary validation of roundStatus is now inside room.processJudgeSelection
    // but we can keep a check here for early exit if needed, or rely on the Room's method.
    if (room.roundStatus !== 'judging') {
      console.warn(`[GameManager] judgeSelectsWinner called for room ${roomCode} when roundStatus was ${room.roundStatus}. Expected 'judging'.`);
      return { success: false, error: 'Non è il momento di giudicare (controllo GameManager).' };
    }

    // Call the new method in Room.js to handle the logic
    const result = room.processJudgeSelection(selectedCardIndex);

    if (result.success) {
      console.log(`[GameManager] Stanza ${roomCode}: Giudice ${judgeId} ha selezionato la carta. Vincitore: ${result.winnerInfo.nickname}.`);
      // The gameState is already part of the result from processJudgeSelection
      return { success: true, gameState: result.gameState };
    } else {
      console.error(`[GameManager] Errore durante la selezione del vincitore per la stanza ${roomCode}: ${result.error}`);
      return { success: false, error: result.error };
    }
  }

  startNewRound(roomCode, playerId) { // Added playerId to check if the requester is the host or judge (optional)
    const room = this.rooms[roomCode];
    if (!room) {
      return { success: false, error: 'Stanza non trovata' };
    }

    // Optional: Add a check to ensure only host or current judge can start a new round, if desired.
    // For now, let's assume it's okay or handled by client-side logic for triggering this.

    if (room.gameOver) {
        return { success: false, error: 'Il gioco è terminato.', gameState: room.getGameState() };
    }

    // Ensure previous round is 'roundEnd' before starting a new one
    if (room.roundStatus !== 'roundEnd') {
        // It might be okay to proceed if it's 'gameOver' and they want to see final scores before a new game (if that's a feature)
        // but generally, a new round follows 'roundEnd'.
        console.warn(`[GameManager] startNewRound called for room ${roomCode} when roundStatus was ${room.roundStatus}. Expected 'roundEnd'.`);
        // Decide if this should be an error or if the state should be forced.
        // For now, let's allow it but log a warning.
    }

    const result = room.startNewRound(); // This now sets roundStatus to 'playing'
    if (result.success) {
      console.log(`[GameManager] Nuovo round avviato per la stanza ${roomCode}`);
      return { success: true, gameState: room.getGameState() };
    } else {
      // This case should ideally not happen if checks are in place
      console.error(`[GameManager] Errore imprevisto durante l'avvio del nuovo round per ${roomCode}.`);
      return { success: false, error: 'Errore durante l\'avvio del nuovo round.', gameState: room.getGameState() };
    }
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

  rejoinRoom(newSocketId, nickname, roomCode) {
    const upperCaseRoomCode = roomCode.toUpperCase();
    
    if (!this.rooms[upperCaseRoomCode]) {
      return { success: false, error: 'Stanza non trovata' };
    }
    
    const room = this.rooms[upperCaseRoomCode];
    const existingPlayer = room.players.find(p => p.nickname.toLowerCase() === nickname.toLowerCase());
    
    if (!existingPlayer) {
      return { success: false, error: 'Giocatore non trovato in questa stanza' };
    }
    
    // Aggiorna l'ID del socket per il giocatore esistente
    const oldSocketId = existingPlayer.id;
    existingPlayer.id = newSocketId;
    
    // Aggiorna le mappe
    delete this.playerRooms[oldSocketId];
    this.playerRooms[newSocketId] = upperCaseRoomCode;
    
    // Se era l'host, aggiorna l'hostId
    if (room.hostId === oldSocketId) {
      room.hostId = newSocketId;
    }
    
    return { success: true };
  }
}
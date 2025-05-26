import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GameManager } from './models/GameManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",  // In produzione, specifica l'origine esatta
    methods: ["GET", "POST"]
  }
});

// Carica le carte dal file JSON
const loadCards = () => {
  try {
    const dataPath = path.resolve(__dirname, '../../data');
    const whiteCardsPath = path.join(dataPath, 'carte_bianche.json');
    const blackCardsPath = path.join(dataPath, 'carte_nere.json');
    
    const whiteCards = JSON.parse(fs.readFileSync(whiteCardsPath, 'utf8'));
    const blackCards = JSON.parse(fs.readFileSync(blackCardsPath, 'utf8'));
    
    return { whiteCards, blackCards };
  } catch (error) {
    console.error('Errore nel caricamento delle carte:', error);
    return { whiteCards: [], blackCards: [] };
  }
};

const { whiteCards, blackCards } = loadCards();
const gameManager = new GameManager(whiteCards, blackCards);

// API routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Socket.io events
io.on('connection', (socket) => {
  console.log(`Nuovo utente connesso: ${socket.id}`);

  // Crea una nuova stanza
  socket.on('create_room', ({ nickname }) => {
    const { roomCode, error } = gameManager.createRoom(socket.id, nickname);
    
    if (error) {
      socket.emit('error', { message: error });
      return;
    }
    
    socket.join(roomCode);
    socket.emit('room_created', { roomCode });
    io.to(roomCode).emit('player_joined', { players: gameManager.getPlayersInRoom(roomCode) });
  });

  // Unisciti a una stanza esistente
  socket.on('join_room', ({ nickname, roomCode }) => {
    const { success, error } = gameManager.joinRoom(socket.id, nickname, roomCode);
    
    if (!success) {
      socket.emit('error', { message: error });
      return;
    }
    
    socket.join(roomCode);
    socket.emit('room_joined', { roomCode });
    io.to(roomCode).emit('player_joined', { players: gameManager.getPlayersInRoom(roomCode) });
  });

  // Inizia il gioco
  socket.on('start_game', ({ roomCode, maxPoints }) => {
    const { success, error } = gameManager.startGame(roomCode, socket.id, maxPoints);
    
    if (!success) {
      socket.emit('error', { message: error });
      return;
    }
    
    const gameState = gameManager.getGameState(roomCode);
    io.to(roomCode).emit('game_started', gameState);
  });

  // Gioca una carta bianca
  socket.on('play_white_card', ({ roomCode, cardIndex }) => {
    const { success, error } = gameManager.playWhiteCard(roomCode, socket.id, cardIndex);
    
    if (!success) {
      socket.emit('error', { message: error });
      return;
    }
    
    // Notifica al giocatore che ha giocato la carta
    socket.emit('white_card_played', { success: true });
    
    // Controlla se tutti hanno giocato
    if (gameManager.allPlayersPlayed(roomCode)) {
      const playedCards = gameManager.getPlayedCards(roomCode);
      io.to(roomCode).emit('all_cards_played', { playedCards });
    } else {
      // Aggiorna il conteggio dei giocatori che hanno giocato
      const playersCount = gameManager.getPlayersPlayedCount(roomCode);
      io.to(roomCode).emit('players_played_update', { playersCount });
    }
  });

  // Il giudice sceglie la carta vincente
  socket.on('select_winner', ({ roomCode, winnerIndex }) => {
    const { success, error, winnerInfo, gameOver, winner } = gameManager.selectWinner(roomCode, socket.id, winnerIndex);
    
    if (!success) {
      socket.emit('error', { message: error });
      return;
    }
    
    io.to(roomCode).emit('round_winner', { winnerInfo });
    
    if (gameOver) {
      io.to(roomCode).emit('game_over', { winner });
    } else {
      // Inizia un nuovo round dopo un breve ritardo
      setTimeout(() => {
        const newGameState = gameManager.startNewRound(roomCode);
        io.to(roomCode).emit('new_round', newGameState);
      }, 5000);
    }
  });

  // Disconnessione
  socket.on('disconnect', () => {
    console.log(`Utente disconnesso: ${socket.id}`);
    const roomsAffected = gameManager.handleDisconnect(socket.id);
    
    roomsAffected.forEach(({ roomCode, players, isGameOver, hostLeft }) => {
      if (hostLeft) {
        io.to(roomCode).emit('host_left', { message: 'Il creatore della stanza è uscito. La partita è terminata.' });
      } else if (isGameOver) {
        io.to(roomCode).emit('game_interrupted', { message: 'Un giocatore è uscito. La partita è terminata.' });
      } else {
        io.to(roomCode).emit('player_left', { players });
      }
    });
  });
});

// Il server ascolta sulla porta 3001
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server in ascolto sulla porta ${PORT}`);
});

// Aggiungi questa route dopo le altre route API
app.get('/', (req, res) => {
  res.send('Server Carte Senza Umanità funzionante. Utilizza il client per giocare.');
});
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
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? 'https://carte-senza-umanita.onrender.com'  // URL aggiornato del client
    : 'http://localhost:5173',
  methods: ['GET', 'POST'],
  credentials: true
};

// Modifica anche la configurazione Socket.IO
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? 'https://carte-senza-umanita.onrender.com'  // URL aggiornato del client
      : '*',
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling']
});

// Carica le carte dai file JSON separati
const carteBianchePath = path.join(__dirname, '..', 'data', 'carte_bianche.json');
const carteNerePath = path.join(__dirname, '..', 'data', 'carte_nere.json');

const carteBianche = JSON.parse(fs.readFileSync(carteBianchePath, 'utf8'));
const carteNere = JSON.parse(fs.readFileSync(carteNerePath, 'utf8'));

// Inizializza il game manager con le carte
const gameManager = new GameManager(carteBianche, carteNere);

// Gestione degli eventi socket
io.on('connection', (socket) => {
  console.log(`Nuovo client connesso: ${socket.id}`);

  // Gestione creazione stanza
  socket.on('create-room', ({ nickname }) => {
    console.log(`Creazione stanza richiesta da ${socket.id} con nickname: ${nickname}`);
    
    const { roomCode } = gameManager.createRoom(socket.id, nickname);
    console.log(`Stanza creata con codice: ${roomCode}`);
    
    socket.join(roomCode);
    
    const players = gameManager.getPlayersInRoom(roomCode);
    console.log(`Emetto room-players per stanza ${roomCode}:`, { players, host: socket.id, code: roomCode });
    
    io.to(roomCode).emit('room-players', {
      players,
      host: socket.id,
      code: roomCode
    });
  });

  // Gestione ingresso in stanza
  socket.on('join-room', ({ nickname, roomCode }) => {
    const result = gameManager.joinRoom(socket.id, nickname, roomCode);
    
    if (result.success) {
      socket.join(roomCode);
      
      const players = gameManager.getPlayersInRoom(roomCode);
      const hostId = gameManager.rooms[roomCode].hostId;
      
      // Invia lo stato della stanza al nuovo giocatore immediatamente
      socket.emit('room-players', {
        players,
        host: hostId,
        code: roomCode
      });
      
      // Poi invia l'aggiornamento a tutti gli altri nella stanza
      socket.to(roomCode).emit('room-players', {
        players,
        host: hostId,
        code: roomCode
      });
    } else {
      socket.emit('error', { message: result.error });
    }
  });

  // AGGIUNGI QUESTO BLOCCO PER GESTIRE L'INIZIO DEL GIOCO
  socket.on('start-game', ({ roomCode, settings }) => {
    console.log(`Richiesta start-game per la stanza ${roomCode} da ${socket.id} con impostazioni:`, settings);
    const maxPoints = settings && settings.maxPoints ? settings.maxPoints : 5;
    const handSize = settings && settings.handSize ? settings.handSize : 7; // Default a 7 se non specificato

    const result = gameManager.startGame(roomCode, socket.id, maxPoints, handSize); // Passa handSize

    if (result.success) {
      console.log(`Gioco avviato nella stanza ${roomCode}`);
      io.to(roomCode).emit('game-started'); // Client uses this to change view to Game.jsx
      
      // Send initial game state immediately after starting
      const initialGameState = gameManager.getGameState(roomCode);
      if (initialGameState) {
        io.to(roomCode).emit('game-update', initialGameState);
        console.log(`Inviato stato iniziale del gioco per la stanza ${roomCode}:`, initialGameState);

        // Send hand to each player
        const room = gameManager.rooms[roomCode];
        if (room) {
          room.players.forEach(player => {
            io.to(player.id).emit('update-hand', player.hand);
            console.log(`Inviata mano al giocatore ${player.id}:`, player.hand);
          });
        }
      } else {
        console.error(`Impossibile ottenere lo stato iniziale del gioco per la stanza ${roomCode}`);
        // Potresti voler emettere un errore specifico ai client qui
      }
    } else {
      console.error(`Errore durante l'avvio del gioco nella stanza ${roomCode}: ${result.error}`);
      socket.emit('error', { message: result.error });
    }
  });

  socket.on('play-card', ({ roomCode, cardIndices }) => {
    const room = gameManager.rooms[roomCode];
    if (!room) {
      socket.emit('error', { message: 'Stanza non trovata durante play-card' });
      return;
    }

    const result = gameManager.playWhiteCard(roomCode, socket.id, cardIndices); 
    if (result.success) {
      // Send updated hand to the player who played
      const player = room.players.find(p => p.id === socket.id);
      if (player) {
        io.to(socket.id).emit('update-hand', player.hand);
        console.log(`Inviata mano aggiornata al giocatore ${socket.id}:`, player.hand);
      }

      // Check if all players have played
      const allPlayed = room.allPlayersPlayed(); 
      console.log(`Room ${roomCode}: allPlayersPlayed() returned ${allPlayed}`); 
      
      let gameStateForUpdate = room.getGameState();

      if (allPlayed) {
        room.setRoundStatus('judging');
        console.log(`Room ${roomCode}: All players played, server-side roundStatus set to judging.`);
        gameStateForUpdate = room.getGameState(); 
        gameStateForUpdate.playedCards = room.getPlayedCards(); 
      }
      
      io.to(roomCode).emit('game-update', gameStateForUpdate);
      console.log(`Room ${roomCode}: Emesso game-update dopo play-card. Stato:`, gameStateForUpdate.roundStatus);

    } else {
      socket.emit('error', { message: result.error });
    }
  });
  // FINE BLOCCO AGGIUNTO

  // AGGIUNGI QUESTO NUOVO GESTORE PER LA SELEZIONE DEL GIUDICE
  socket.on('judge-select', ({ roomCode, cardIndex }) => {
    console.log(`Richiesta judge-select per stanza ${roomCode} da ${socket.id} con cardIndex: ${cardIndex}`);
    
    const result = gameManager.judgeSelectsWinner(roomCode, socket.id, cardIndex);

    if (result && result.success) {
      console.log(`Selezione del giudice avvenuta con successo nella stanza ${roomCode}`);
      // result.gameState already contains the updated state from Room.processJudgeSelection
      io.to(roomCode).emit('game-update', result.gameState);
      console.log(`Inviato game-update dopo la selezione del giudice per la stanza ${roomCode}:`, result.gameState);

      // If the game is not over, you might want to automatically start a new round or wait for a client action
      // For now, the client will see 'roundEnd' and can decide to show scores/winner, then trigger 'start-new-round'
      const room = gameManager.rooms[roomCode];
      if (room && room.roundStatus === 'roundEnd' && !room.gameOver) {
        // Optional: Automatically start a new round after a delay
        // setTimeout(() => {
        //   const newRoundResult = gameManager.startNewRound(roomCode, socket.id); // socket.id might not be relevant here
        //   if (newRoundResult.success) {
        //     io.to(roomCode).emit('game-update', newRoundResult.gameState);
        //     console.log(`[Server] Stanza ${roomCode}: Nuovo round avviato automaticamente.`);
        //      room.players.forEach(p => {
        //          io.to(p.id).emit('update-hand', p.hand); // Send updated hands for new round
        //      });
        //   }
        // }, 5000); // Delay of 5 seconds for players to see the round winner
      }

    } else {
      const errorMessage = result && result.error ? result.error : 'Errore durante la selezione del giudice.';
      console.error(`Errore durante judge-select nella stanza ${roomCode}: ${errorMessage}`);
      socket.emit('error', { message: errorMessage });
    }
  });

  socket.on('start-new-round', ({ roomCode }) => {
    console.log(`[Server] Richiesta start-new-round per la stanza ${roomCode} da ${socket.id}`);
    const room = gameManager.rooms[roomCode];

    if (!room) {
        socket.emit('error', { message: 'Stanza non trovata.' });
        return;
    }

    // Add any necessary validation (e.g., is the game over? is it the right time to start a new round?)
    if (room.gameOver) {
        socket.emit('error', { message: 'Il gioco è terminato. Impossibile avviare un nuovo round.' });
        io.to(roomCode).emit('game-update', room.getGameState()); // Send final state
        return;
    }

    if (room.roundStatus !== 'roundEnd') {
        socket.emit('error', { message: 'Non è possibile avviare un nuovo round ora.' });
        // Optionally send current state if it helps client debug or understand
        // io.to(roomCode).emit('game-update', room.getGameState()); 
        return;
    }

    const result = gameManager.startNewRound(roomCode, socket.id); // socket.id might be used for validation if needed

    if (result.success) {
        io.to(roomCode).emit('game-update', result.gameState);
        console.log(`[Server] Stanza ${roomCode}: Nuovo round avviato su richiesta. Stato:`, result.gameState.roundStatus);
        // Send updated hands to all players for the new round
        if (room && room.players) {
            room.players.forEach(p => {
                if (p.hand) { // Ensure player object has hand property
                    io.to(p.id).emit('update-hand', p.hand);
                }
            });
        }
    } else {
        socket.emit('error', { message: result.error || 'Errore durante l\'avvio del nuovo round.' });
    }
});

  // Altri gestori di eventi socket...

  // Gestione disconnessione
  // Gestione uscita volontaria dalla stanza
  socket.on('leave-room', ({ roomCode }) => {
    console.log(`Giocatore ${socket.id} sta uscendo dalla stanza ${roomCode}`);
    
    // Rimuovi il giocatore dalla stanza socket.io
    socket.leave(roomCode);
    
    // Gestione disconnessione improvvisa
    socket.on('disconnect', () => {
      console.log(`Client disconnesso: ${socket.id}`);
      
      // Gestisci la disconnessione logica
      const updates = gameManager.handleDisconnect(socket.id);
      
      // Invia aggiornamenti a tutte le stanze interessate
      updates.forEach(update => {
        if (update.isGameOver) {
          io.to(update.roomCode).emit('game-over', {
            reason: update.hostLeft ? 'Host ha lasciato la stanza' : 'Troppi pochi giocatori'
          });
        } else {
          const room = gameManager.rooms[update.roomCode];
          if (room) {
            io.to(update.roomCode).emit('room-players', {
              players: update.players,
              host: room.hostId,
              code: update.roomCode
            });
          }
        }
      });
    });
    
    // Conferma al giocatore che è uscito
    socket.emit('left-room');
  });
});

// Modifica la porta per usare quella assegnata da Render
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server in ascolto sulla porta ${PORT}`);
});

// Aggiungi questa route dopo le altre route API
app.get('/', (req, res) => {
  res.send('Server Carte Senza Umanità funzionante. Utilizza il client per giocare.');
});
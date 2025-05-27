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
    ? 'https://carte-senza-umanit.onrender.com'  // URL del client
    : 'http://localhost:5173',
  methods: ['GET', 'POST'],
  credentials: true
};
// Modifica la configurazione CORS per accettare il dominio del client in produzione
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? "https://carte-senza-umanit.onrender.com"  // Questo DEVE essere l'URL del CLIENT
      : "*",
    methods: ["GET", "POST"],
    credentials: true
  },
  // Aggiungi queste opzioni per migliorare la stabilità
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
      io.to(roomCode).emit('room-players', {
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

  socket.on('play-card', ({ roomCode, cardIndex }) => {
    const result = gameManager.playWhiteCard(roomCode, socket.id, cardIndex); // Changed playCard to playWhiteCard
    if (result.success) {
      io.to(roomCode).emit('game-update', gameManager.getGameState(roomCode));
      // Send updated hand to the player who played
      const room = gameManager.rooms[roomCode];
      const player = room.players.find(p => p.id === socket.id);
      if (player) {
        io.to(socket.id).emit('update-hand', player.hand);
        console.log(`Inviata mano aggiornata al giocatore ${socket.id}:`, player.hand);
      }

      // Check if all players have played
      const allPlayed = room.allPlayersPlayed(); // Store the result
      console.log(`Room ${roomCode}: allPlayersPlayed() returned ${allPlayed}`); // Log the result
      if (allPlayed) {
        io.to(roomCode).emit('game-update', { 
          ...gameManager.getGameState(roomCode),
          roundStatus: 'judging',
          playedCards: room.getPlayedCards() // Send shuffled played cards
        });
        console.log(`Room ${roomCode}: All players played, round status set to judging.`); // Added log
      }
    } else {
      socket.emit('error', { message: result.error });
    }
  });
  // FINE BLOCCO AGGIUNTO

  // AGGIUNGI QUESTO NUOVO GESTORE PER LA SELEZIONE DEL GIUDICE
  socket.on('judge-select', ({ roomCode, cardIndex }) => {
    console.log(`Richiesta judge-select per stanza ${roomCode} da ${socket.id} con cardIndex: ${cardIndex}`);
    
    // Assumendo che tu abbia un metodo in GameManager per gestire la selezione del vincitore
    // Questo metodo dovrebbe:
    // 1. Verificare che socket.id sia il giudice corrente per roomCode.
    // 2. Verificare che lo stato del round sia 'judging'.
    // 3. Identificare il giocatore che ha giocato la carta all'indice cardIndex.
    // 4. Assegnare un punto a quel giocatore.
    // 5. Impostare roundWinner e cambiare roundStatus a 'roundEnd'.
    // 6. Controllare se c'è un vincitore della partita (se i punti max sono stati raggiunti).
    // 7. Restituire un oggetto { success: true/false, error: 'messaggio opzionale' }
    const result = gameManager.judgeSelectsWinner(roomCode, socket.id, cardIndex);

    if (result && result.success) {
      console.log(`Selezione del giudice avvenuta con successo nella stanza ${roomCode}`);
      // Invia l'aggiornamento dello stato del gioco a tutti i client nella stanza
      // Questo dovrebbe includere il roundWinner, il nuovo punteggio, e roundStatus: 'roundEnd'
      // Se c'è un gameWinner, includi anche quello.
      io.to(roomCode).emit('game-update', gameManager.getGameState(roomCode));
      console.log(`Inviato game-update dopo la selezione del giudice per la stanza ${roomCode}:`, gameManager.getGameState(roomCode));
    } else {
      const errorMessage = result && result.error ? result.error : 'Errore durante la selezione del giudice.';
      console.error(`Errore durante judge-select nella stanza ${roomCode}: ${errorMessage}`);
      socket.emit('error', { message: errorMessage });
    }
  });

  // Altri gestori di eventi socket...

  // Gestione disconnessione
  socket.on('disconnect', () => {
    console.log(`Client disconnesso: ${socket.id}`);
    // Logica per gestire l'uscita del giocatore dalle stanze
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
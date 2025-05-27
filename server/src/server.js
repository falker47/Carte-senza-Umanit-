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
// Modifica la configurazione CORS per accettare il dominio del client in produzione
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? "https://carte-senza-umanit.onrender.com"  // ✅ URL CORRETTO
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
    // Assicurati che 'settings' contenga 'maxPoints', altrimenti usa un default o gestisci l'errore
    const maxPoints = settings && settings.maxPoints ? settings.maxPoints : 5; // Esempio di fallback

    const result = gameManager.startGame(roomCode, socket.id, maxPoints);

    if (result.success) {
      console.log(`Gioco avviato nella stanza ${roomCode}`);
      // Notifica a tutti i client nella stanza che il gioco è iniziato
      io.to(roomCode).emit('game-started');
      // Potresti voler inviare anche lo stato iniziale del gioco qui
      // const gameState = gameManager.getGameState(roomCode);
      // io.to(roomCode).emit('game-state-update', gameState);
    } else {
      console.error(`Errore durante l'avvio del gioco nella stanza ${roomCode}: ${result.error}`);
      socket.emit('error', { message: result.error });
    }
  });
  // FINE BLOCCO AGGIUNTO

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
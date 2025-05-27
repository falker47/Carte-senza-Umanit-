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
    const { roomCode } = gameManager.createRoom(socket.id, nickname);
    
    // Fai entrare il socket nella stanza
    socket.join(roomCode);
    
    // Invia aggiornamento ai giocatori nella stanza
    const players = gameManager.getPlayersInRoom(roomCode);
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
      // Fai entrare il socket nella stanza
      socket.join(roomCode);
      
      // Invia aggiornamento ai giocatori nella stanza
      const players = gameManager.getPlayersInRoom(roomCode);
      const hostId = gameManager.rooms[roomCode].hostId;
      io.to(roomCode).emit('room-players', {
        players,
        host: hostId,
        code: roomCode
      });
    } else {
      // Invia errore al client
      socket.emit('error', { message: result.error });
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
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
      ? ["https://carte-senza-umanita-server.onrender.com", "https://carte-senza-umanita.vercel.app"] 
      : "*",
    methods: ["GET", "POST"]
  }
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
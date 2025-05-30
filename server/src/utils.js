import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let paroleItaliane = null;

// Genera un codice stanza casuale con parola italiana di 5 lettere
export const generateRoomCode = () => {
  if (!paroleItaliane) {
    try {
      const filePath = path.join(__dirname, '..', 'data', 'parole.json');
      const fileContent = fs.readFileSync(filePath, 'utf8');
      paroleItaliane = JSON.parse(fileContent);
      console.log(`Caricate ${paroleItaliane.length} parole italiane per i codici stanza`);
    } catch (error) {
      console.error('Errore nel caricamento delle parole italiane:', error);
      // Fallback a generazione semplice
      return Math.floor(1000 + Math.random() * 9000).toString();
    }
  }
  
  return paroleItaliane[Math.floor(Math.random() * paroleItaliane.length)];
};

// Mescola un array usando l'algoritmo Fisher-Yates
export const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};
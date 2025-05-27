import React, { useState } from 'react';
import { useSocket } from '../hooks/useSocket';
import { useTheme } from '../hooks/useTheme';
import ThemeToggle from './ThemeToggle';

const Home = ({ setNickname, setRoomCode, setGameState, nickname }) => {
  const [localNickname, setLocalNickname] = useState(nickname || '');
  const [localRoomCode, setLocalRoomCode] = useState('');
  const [error, setError] = useState('');
  const socket = useSocket();
  
  // Modifica la funzione handleCreateRoom
  const handleCreateRoom = () => {
    if (!localNickname.trim()) {
      setError('Inserisci un nickname per continuare');
      return;
    }
    
    setNickname(localNickname);
    setGameState('lobby');
    
    // Funzione migliorata per verificare la connessione socket
    const emitCreateRoom = (attempts = 0) => {
      if (attempts > 20) { // Aumenta i tentativi
        setError('Impossibile connettersi al server. Riprova più tardi.');
        setGameState('home'); // Torna alla home in caso di errore
        return;
      }
      
      if (socket && socket.connected) {
        console.log('Socket connesso, emetto create-room');
        socket.emit('create-room', { nickname: localNickname });
      } else {
        console.log(`Socket non connesso, tentativo ${attempts + 1}/20`);
        setTimeout(() => emitCreateRoom(attempts + 1), 500); // Aumenta l'intervallo
      }
    };
    
    // Aspetta un po' di più prima di iniziare i tentativi
    setTimeout(() => emitCreateRoom(), 200);
  };
  
  const handleJoinRoom = () => {
    if (!localNickname.trim()) {
      setError('Inserisci un nickname per continuare');
      return;
    }
    
    if (!localRoomCode.trim()) {
      setError('Inserisci un codice stanza per continuare');
      return;
    }
    
    setNickname(localNickname);
    setRoomCode(localRoomCode);
    setGameState('lobby');
    
    // Il socket verrà creato in App.jsx e gestirà l'ingresso nella stanza
    setTimeout(() => {
      if (socket) {
        socket.emit('join-room', { nickname: localNickname, roomCode: localRoomCode });
      }
    }, 100);
  };

  return (
    <div className="container mx-auto px-4 py-8 flex flex-col items-center justify-center min-h-screen bg-texture">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-md shadow-cah p-6 animate-slide-in">
        <h1 className="text-4xl font-black text-center mb-2 uppercase tracking-tight">Carte Senza Umanità</h1>
        <p className="text-center mb-8 text-gray-600 dark:text-gray-400 italic">Un gioco per persone orribili</p>
        
        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded mb-4 dark:bg-red-900 dark:text-red-200 dark:border-red-800">
            {error}
          </div>
        )}
        
        <div className="mb-4">
          <label htmlFor="nickname" className="block text-sm font-bold mb-2 uppercase">Nickname</label>
          <input
            type="text"
            id="nickname"
            className="input w-full"
            value={localNickname}
            onChange={(e) => setLocalNickname(e.target.value)}
            placeholder="Il tuo nickname"
            maxLength={20}
          />
        </div>
        
        <div className="grid grid-cols-1 gap-4 mb-6">
          <button
            className="btn btn-primary"
            onClick={handleCreateRoom}
          >
            Crea Nuova Stanza
          </button>
          
          <div className="flex items-center">
            <hr className="flex-grow border-gray-300 dark:border-gray-600" />
            <span className="px-2 text-gray-500 dark:text-gray-400 font-bold">oppure</span>
            <hr className="flex-grow border-gray-300 dark:border-gray-600" />
          </div>
          
          <div className="mb-4">
            <label htmlFor="roomCode" className="block text-sm font-bold mb-2 uppercase">Codice Stanza</label>
            <input
              type="text"
              id="roomCode"
              className="input w-full"
              value={localRoomCode}
              onChange={(e) => setLocalRoomCode(e.target.value.toUpperCase())}
              placeholder="Inserisci il codice"
              maxLength={6}
            />
          </div>
          
          <button
            className="btn btn-secondary"
            onClick={handleJoinRoom}
          >
            Unisciti a Stanza
          </button>
        </div>
      </div>
      
      <footer className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400 font-bold">
        &copy; {new Date().getFullYear()} Carte Senza Umanità - Versione italiana di Cards Against Humanity
      </footer>
    </div>
  );
};

export default Home;
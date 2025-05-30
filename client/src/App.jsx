import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import Home from './components/Home';
import Lobby from './components/Lobby';
import Game from './components/Game';
import { SocketProvider } from './hooks/useSocket'; // Assicurati che il percorso sia corretto
import { ThemeProvider } from './hooks/useTheme'; // Assicurati che il percorso sia corretto
import AppFooter from './components/AppFooter'; // <-- IMPORT THE FOOTER

const App = () => {
  const [gameState, setGameState] = useState('home');
  const [socket, setSocket] = useState(null);
  const [nickname, setNickname] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const isDarkMode = localStorage.getItem('darkMode') === 'true' || 
                      window.matchMedia('(prefers-color-scheme: dark)').matches;
    setDarkMode(isDarkMode);
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  // Modifica la gestione del socket
  useEffect(() => {
    const serverUrl = import.meta.env.PROD 
      ? import.meta.env.VITE_APP_SERVER_URL || 'https://carte-senza-umanita-server.onrender.com'
      : 'http://localhost:3001';
    
    console.log('Ambiente:', import.meta.env.PROD ? 'PRODUZIONE' : 'SVILUPPO');
    console.log('VITE_APP_SERVER_URL:', import.meta.env.VITE_APP_SERVER_URL);
    console.log('URL finale del server:', serverUrl);

    const newSocket = io(serverUrl, {
      transports: ['polling'],
      timeout: 20000,
      // forceNew: true, // Rimuovi o commenta forceNew, può causare problemi
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5, // Potrebbe essere Infinity per tentativi illimitati
    });

    setSocket(newSocket); // Imposta il socket qui

    newSocket.on('connect', () => {
      console.log('✅ Connesso al server Socket.io! ID:', newSocket.id);
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ Errore di connessione Socket.io:', error.message, 'URL:', serverUrl);
    });

    // Modifica la gestione della disconnessione
    newSocket.on('disconnect', (reason) => {
      console.log('Disconnesso dal server:', reason);
      
      // Salva lo stato della partita nel localStorage per la riconnessione
      const currentGame = {
        roomCode: localStorage.getItem('currentRoomCode'),
        nickname: localStorage.getItem('currentNickname'),
        isInGame: localStorage.getItem('isInGame') === 'true'
      };
      
      if (currentGame.roomCode && currentGame.nickname && currentGame.isInGame) {
        localStorage.setItem('pendingReconnection', JSON.stringify(currentGame));
      }
    });

    newSocket.on('reconnect', (attemptNumber) => {
      console.log('Riconnesso dopo', attemptNumber, 'tentativi');
      
      // Tenta di riconnettersi alla partita se c'era una partita in corso
      const pendingReconnection = localStorage.getItem('pendingReconnection');
      if (pendingReconnection) {
        const gameData = JSON.parse(pendingReconnection);
        
        console.log('Tentativo di riconnessione alla partita:', gameData);
        newSocket.emit('reconnect-to-game', {
          nickname: gameData.nickname,
          roomCode: gameData.roomCode
        });
        
        localStorage.removeItem('pendingReconnection');
      }
    });

    // Aggiungi gestori per la riconnessione
    newSocket.on('reconnected-to-game', () => {
      console.log('Riconnesso alla partita con successo!');
      // Il client dovrebbe già essere nella vista Game.jsx
    });

    newSocket.on('reconnection-failed', ({ message }) => {
      console.log('Riconnessione fallita:', message);
      // Reindirizza alla home
      localStorage.removeItem('currentRoomCode');
      localStorage.removeItem('currentNickname');
      localStorage.removeItem('isInGame');
    });

    newSocket.on('game-terminated', ({ reason, hostLeft }) => {
      alert(`Partita terminata: ${reason}`);
      // Reindirizza alla home
      localStorage.removeItem('currentRoomCode');
      localStorage.removeItem('currentNickname');
      localStorage.removeItem('isInGame');
      window.location.reload();
    });

    newSocket.on('reconnect_error', (error) => {
      console.error('Errore di riconnessione:', error);
    });

    // Cleanup effect: disconnetti il socket quando il componente App viene smontato
    return () => {
      console.log('App.jsx: Disconnessione socket...');
      newSocket.disconnect();
    };
  }, []); // Esegui questo effetto solo una volta al mount del componente App

  const toggleTheme = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    localStorage.setItem('darkMode', newDarkMode.toString());
  };

  const renderContent = () => {
    switch (gameState) {
      case 'home':
        return (
          <Home 
            setGameState={setGameState} 
            setNickname={setNickname} 
            setRoomCode={setRoomCode}
            nickname={nickname} // Aggiungi questa prop
          />
        );
      case 'lobby':
        return (
          <Lobby 
            roomCode={roomCode} 
            nickname={nickname} 
            setGameState={setGameState} 
            setRoomCode={setRoomCode}
          />
        );
      case 'game':
        return (
          <Game 
            roomCode={roomCode} 
            nickname={nickname} 
            setGameState={setGameState} 
          />
        );
      default:
        return <Home setGameState={setGameState} />;
    }
  };

  return (
    <ThemeProvider value={{ darkMode, toggleTheme }}>
      <SocketProvider value={socket}>
        <div className="min-h-screen bg-texture text-gray-900 dark:text-white transition-colors duration-200 flex flex-col">
          <main className="flex-grow pb-16"> {/* Aggiunto pb-16 per il footer fisso */}
            {renderContent()}
          </main>
          <AppFooter /> {/* <-- ADD THE FOOTER COMPONENT HERE */}
        </div>
      </SocketProvider>
    </ThemeProvider>
  );
};

export default App;
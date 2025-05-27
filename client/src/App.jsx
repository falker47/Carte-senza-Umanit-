import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import Home from './components/Home';
import Lobby from './components/Lobby';
import Game from './components/Game';
import { SocketProvider } from './hooks/useSocket';
import { ThemeProvider } from './hooks/useTheme';

const App = () => {
  const [gameState, setGameState] = useState('home'); // home, lobby, game
  const [socket, setSocket] = useState(null);
  const [nickname, setNickname] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    // Controlla se il tema scuro è già impostato
    const isDarkMode = localStorage.getItem('darkMode') === 'true' || 
                      window.matchMedia('(prefers-color-scheme: dark)').matches;
    setDarkMode(isDarkMode);
    
    // Applica il tema
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  // Modifica la connessione socket per usare l'URL del server in produzione
  useEffect(() => {
    if (!socket) {
      // Usa la variabile d'ambiente invece dell'URL hardcoded
      const serverUrl = import.meta.env.PROD 
        ? import.meta.env.VITE_APP_SERVER_URL || 'https://carte-senza-umanita-server.onrender.com'
        : 'http://localhost:3001';
      
      console.log('Ambiente:', import.meta.env.PROD ? 'PRODUZIONE' : 'SVILUPPO');
      console.log('VITE_APP_SERVER_URL:', import.meta.env.VITE_APP_SERVER_URL);
      console.log('URL finale del server:', serverUrl);
      
      const newSocket = io(serverUrl, {
        transports: ['websocket', 'polling'],
        timeout: 20000,
        forceNew: true,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
        maxReconnectionAttempts: 5
      });
      
      newSocket.on('connect', () => {
        console.log('✅ Connesso al server:', serverUrl);
      });
      
      newSocket.on('connect_error', (error) => {
        console.error('❌ Errore di connessione:', error);
        console.error('URL tentato:', serverUrl);
      });
      
      setSocket(newSocket);
      
      // Debug migliorato
      newSocket.on('connect', () => {
        console.log('Connesso al server Socket.io! ID:', newSocket.id);
      });
      
      newSocket.on('connect_error', (error) => {
        console.error('Errore di connessione Socket.io:', error.message);
      });
      
      newSocket.on('disconnect', (reason) => {
        console.log('Disconnesso dal server:', reason);
      });
      
      newSocket.on('reconnect', (attemptNumber) => {
        console.log('Riconnesso dopo', attemptNumber, 'tentativi');
      });
      
      newSocket.on('reconnect_error', (error) => {
        console.error('Errore di riconnessione:', error);
      });
  
      return () => {
        console.log('Disconnessione socket...');
        newSocket.disconnect();
      };
    }
  }, [socket]);

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
        <div className="min-h-screen bg-texture text-gray-900 dark:text-white transition-colors duration-200">
          {renderContent()}
        </div>
      </SocketProvider>
    </ThemeProvider>
  );
};

export default App;
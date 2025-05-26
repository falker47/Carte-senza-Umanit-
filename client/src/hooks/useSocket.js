import { useContext, createContext } from 'react';

const SocketContext = createContext(null);

export const SocketProvider = SocketContext.Provider;

export const useSocket = () => {
  return useContext(SocketContext);
};
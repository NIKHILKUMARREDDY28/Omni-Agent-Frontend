import React from 'react';
import styles from './App.module.css';
import Sidebar from './components/Sidebar';
import MainContent from './components/MainContent';
import { ChatProvider } from './context/ChatContext';

function App() {
  return (
    <ChatProvider>
      <div className={styles.appContainer}>
        <Sidebar />
        <MainContent />
      </div>
    </ChatProvider>
  );
}

export default App;

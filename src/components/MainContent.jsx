import React from 'react';
import styles from './MainContent.module.css';
import Header from './Header';
import ChatArea from './ChatArea';
import InputArea from './InputArea';
import BackendDown from './BackendDown';
import { useChat } from '../context/ChatContext';

const MainContent = () => {
  const { backendStatus } = useChat();
  const isBackendDown = backendStatus.checked && !backendStatus.ok;

  return (
    <main className={styles.mainContent}>
      <Header />
      {isBackendDown ? (
        <BackendDown />
      ) : (
        <>
          <ChatArea />
          <InputArea />
        </>
      )}
    </main>
  );
};

export default MainContent;

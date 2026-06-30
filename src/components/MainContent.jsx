import React from 'react';
import styles from './MainContent.module.css';
import Header from './Header';
import ChatArea from './ChatArea';
import InputArea from './InputArea';

const MainContent = () => {
  return (
    <main className={styles.mainContent}>
      <Header />
      <ChatArea />
      <InputArea />
    </main>
  );
};

export default MainContent;

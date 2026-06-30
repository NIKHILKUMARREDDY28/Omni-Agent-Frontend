import React from 'react';
import styles from './Header.module.css';
import { Settings, CircleHelp, Wifi, WifiOff } from 'lucide-react';
import { useChat } from '../context/ChatContext';

const Header = () => {
  const { backendStatus, messages, activeConversationId } = useChat();

  // Derive page title from first user message
  const firstUserMsg = messages.find((m) => m.role === 'user');
  const pageTitle = firstUserMsg
    ? firstUserMsg.content.length > 50
      ? firstUserMsg.content.slice(0, 50) + '…'
      : firstUserMsg.content
    : 'New Analysis';

  return (
    <header className={styles.header}>
      <div className={styles.breadcrumbs}>
        <span className={styles.brand}>omni Agent</span>
        <span className={styles.separator}>/</span>
        <span className={styles.pageTitle}>{pageTitle}</span>
      </div>
      
      <div className={styles.actions}>
        <div
          className={`${styles.statusDot} ${
            backendStatus.ok ? styles.statusOnline : styles.statusOffline
          }`}
          title={
            backendStatus.ok
              ? `Backend connected (v${backendStatus.version})`
              : 'Backend disconnected'
          }
        >
          {backendStatus.ok ? <Wifi size={14} /> : <WifiOff size={14} />}
        </div>
        <button className={styles.iconButton}>
          <Settings size={20} />
        </button>
        <button className={styles.iconButton}>
          <CircleHelp size={20} />
        </button>
        <div className={styles.avatar}>
          <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="User Avatar" />
        </div>
      </div>
    </header>
  );
};

export default Header;

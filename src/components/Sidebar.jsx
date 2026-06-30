import React, { useState } from 'react';
import styles from './Sidebar.module.css';
import { Plus, History, Bot, FolderClosed, Sparkles, Leaf, MessageSquare, Upload } from 'lucide-react';
import { useChat } from '../context/ChatContext';
import DataSources from './DataSources';
import FileUpload from './FileUpload';

const Sidebar = () => {
  const { conversations, activeConversationId, newChat, switchConversation } = useChat();
  const [showUpload, setShowUpload] = useState(false);

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logoContainer}>
        <div className={styles.logoIcon}>
          <Leaf size={18} fill="currentColor" />
        </div>
        <div className={styles.logoText}>
          <span className={styles.logoTitle}>omni Agent</span>
          <span className={styles.logoSubtitle}>by Nuark AI</span>
        </div>
      </div>

      <button className={styles.newChatButton} onClick={newChat} id="new-chat-button">
        <Plus size={18} strokeWidth={2.5} />
        New Chat
      </button>

      <button
        className={styles.uploadButton}
        onClick={() => setShowUpload(true)}
        id="upload-button"
      >
        <Upload size={16} />
        Upload Data
      </button>

      {/* Uploaded datasets */}
      <DataSources />

      <nav className={styles.nav}>
        {/* Conversation history */}
        {conversations.length > 0 && (
          <div className={styles.historySection}>
            <div className={styles.historyLabel}>Recent</div>
            {conversations.map((conv) => (
              <button
                key={conv.id}
                className={`${styles.historyItem} ${
                  conv.id === activeConversationId ? styles.historyItemActive : ''
                }`}
                onClick={() => switchConversation(conv.id)}
              >
                <MessageSquare size={14} />
                <span className={styles.historyTitle}>{conv.title}</span>
              </button>
            ))}
          </div>
        )}

        {conversations.length === 0 && (
          <>
            <button className={styles.navItem}>
              <History size={18} />
              History
            </button>
            <button className={styles.navItem}>
              <Bot size={18} />
              Models
            </button>
            <button className={styles.navItem}>
              <FolderClosed size={18} />
              Library
            </button>
          </>
        )}
      </nav>

      <div className={styles.upgradeContainer}>
        <div className={styles.upgradeCard}>
          <Sparkles size={18} color="#8b5cf6" />
          <span className={styles.upgradeText}>
            Upgrade to<br />Pro
          </span>
        </div>
      </div>

      {/* Upload modal */}
      {showUpload && <FileUpload onClose={() => setShowUpload(false)} />}
    </aside>
  );
};

export default Sidebar;

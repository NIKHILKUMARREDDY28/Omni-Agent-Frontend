import React, { useState, useRef, useEffect } from 'react';
import styles from './InputArea.module.css';
import { Plus, Mic, ArrowUp, Loader } from 'lucide-react';
import { useChat } from '../context/ChatContext';
import FileUpload from './FileUpload';

const InputArea = () => {
  const [text, setText] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const { sendMessage, isLoading } = useChat();
  const inputRef = useRef(null);

  // Auto-focus on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = () => {
    if (!text.trim() || isLoading) return;
    sendMessage(text.trim());
    setText('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={styles.inputContainer}>
      <div className={`${styles.inputWrapper} ${isLoading ? styles.disabled : ''}`}>
        <button
          className={styles.plusButton}
          disabled={isLoading}
          onClick={() => setShowUpload(true)}
          title="Upload data file"
        >
          <Plus size={18} />
        </button>
        <input 
          ref={inputRef}
          type="text" 
          className={styles.input} 
          placeholder={isLoading ? 'Analyzing…' : 'Type a message to omni Agent...'} 
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          id="chat-input"
        />
        <div className={styles.actions}>
          <button className={styles.micButton} disabled={isLoading}>
            <Mic size={20} />
          </button>
          <button 
            className={styles.sendButton} 
            onClick={handleSend}
            disabled={isLoading || !text.trim()}
            id="send-button"
          >
            {isLoading ? (
              <Loader size={18} className={styles.sendSpinner} />
            ) : (
              <ArrowUp size={18} />
            )}
          </button>
        </div>
      </div>
      <div className={styles.footerText}>
        omni Agent can make mistakes. Consider verifying important information.
      </div>

      {/* Upload modal triggered by + button */}
      {showUpload && <FileUpload onClose={() => setShowUpload(false)} />}
    </div>
  );
};

export default InputArea;

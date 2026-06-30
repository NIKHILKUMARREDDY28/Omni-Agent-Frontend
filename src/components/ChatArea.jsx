import React, { useEffect, useRef } from 'react';
import styles from './ChatArea.module.css';
import { Leaf } from 'lucide-react';
import { useChat } from '../context/ChatContext';
import PipelineTracker from './PipelineTracker';
import AnalysisResult from './AnalysisResult';

const ChatArea = () => {
  const { messages, isLoading, error } = useChat();
  const bottomRef = useRef(null);

  // Auto-scroll on new messages or loading changes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const isEmpty = messages.length === 0;

  return (
    <div className={styles.chatArea}>
      {isEmpty && (
        <div className={styles.welcomeContainer}>
          <div className={styles.welcomeIconWrapper}>
            <Leaf size={32} color="#7e57c2" fill="#7e57c2" />
          </div>
          <h1 className={styles.welcomeTitle}>How can I help you grow today?</h1>
          <p className={styles.welcomeSubtitle}>
            Ask business questions like "Why is ARR decreasing?" and I'll run a full<br />
            multi-agent diagnostic analysis across your data sources.
          </p>
          <div className={styles.quickActions}>
            <QuickAction text="Why is ARR decreasing?" />
            <QuickAction text="What's driving churn this quarter?" />
            <QuickAction text="Analyze expansion revenue trends" />
          </div>
        </div>
      )}

      <div className={styles.messagesContainer}>
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {/* Show error if any */}
        {error && (
          <div className={styles.errorBanner}>
            <span>⚠️ {error}</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
};

const QuickAction = ({ text }) => {
  const { sendMessage, isLoading } = useChat();
  return (
    <button
      className={styles.quickAction}
      onClick={() => !isLoading && sendMessage(text)}
      disabled={isLoading}
    >
      {text}
    </button>
  );
};

const MessageBubble = ({ message }) => {
  const { role, content, isStreaming, analysisData } = message;

  if (role === 'user') {
    return (
      <div className={styles.userMessageContainer}>
        <div className={styles.userBubble}>{content}</div>
      </div>
    );
  }

  // Assistant message
  return (
    <div className={styles.assistantMessageContainer}>
      <div className={styles.assistantIconWrapper}>
        <Leaf size={16} color="#7e57c2" fill="#7e57c2" />
      </div>
      <div className={styles.assistantBubble}>
        {/* Show pipeline tracker while streaming */}
        {isStreaming && <PipelineTracker />}

        {/* Show analysis result when done */}
        {!isStreaming && analysisData && (
          <AnalysisResult data={analysisData} />
        )}

        {/* Fallback: plain text for non-analysis messages or errors */}
        {!isStreaming && !analysisData && content && (
          <div className={styles.assistantText}>{content}</div>
        )}
      </div>
    </div>
  );
};

export default ChatArea;

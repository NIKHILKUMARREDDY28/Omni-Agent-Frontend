import React, { useState } from 'react';
import styles from './BackendDown.module.css';
import { RefreshCw } from 'lucide-react';
import { useChat } from '../context/ChatContext';

const SleepingCat = () => (
  <svg
    className={styles.catImage}
    viewBox="0 0 200 160"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    aria-label="A cat napping because the backend is offline"
  >
    <ellipse cx="100" cy="145" rx="70" ry="8" fill="rgba(0,0,0,0.35)" />

    {/* tail */}
    <path
      d="M158 120C178 112 182 88 168 74"
      stroke="#8A2BE2"
      strokeWidth="10"
      strokeLinecap="round"
      fill="none"
    />

    {/* body */}
    <ellipse cx="105" cy="112" rx="58" ry="34" fill="#9D4EDD" />

    {/* head */}
    <circle cx="55" cy="88" r="34" fill="#B47AE8" />

    {/* ears */}
    <path d="M30 66 L38 40 L54 62 Z" fill="#B47AE8" />
    <path d="M78 62 L92 38 L98 66 Z" fill="#B47AE8" />
    <path d="M35 60 L40 46 L49 58 Z" fill="#7A1FC7" />
    <path d="M79 58 L89 44 L92 60 Z" fill="#7A1FC7" />

    {/* closed eyes (sleeping) */}
    <path d="M40 88 Q45 93 50 88" stroke="#2A1240" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    <path d="M62 88 Q67 93 72 88" stroke="#2A1240" strokeWidth="2.5" strokeLinecap="round" fill="none" />

    {/* nose + mouth */}
    <path d="M54 96 L58 96 L56 99 Z" fill="#2A1240" />
    <path d="M56 99 Q56 103 50 103" stroke="#2A1240" strokeWidth="2" strokeLinecap="round" fill="none" />
    <path d="M56 99 Q56 103 62 103" stroke="#2A1240" strokeWidth="2" strokeLinecap="round" fill="none" />

    {/* whiskers */}
    <path d="M22 84 L4 80" stroke="#2A1240" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M22 90 L3 91" stroke="#2A1240" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M88 84 L106 80" stroke="#2A1240" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M88 90 L107 91" stroke="#2A1240" strokeWidth="1.5" strokeLinecap="round" />

    {/* paws */}
    <ellipse cx="80" cy="140" rx="14" ry="9" fill="#B47AE8" />
    <ellipse cx="130" cy="142" rx="14" ry="9" fill="#B47AE8" />

    {/* Zzz */}
    <text x="118" y="46" className={styles.zzz1}>Z</text>
    <text x="132" y="32" className={styles.zzz2}>z</text>
    <text x="144" y="20" className={styles.zzz3}>z</text>
  </svg>
);

const BackendDown = () => {
  const { retryBackendCheck } = useChat();
  const [retrying, setRetrying] = useState(false);

  const handleRetry = async () => {
    setRetrying(true);
    await retryBackendCheck();
    setRetrying(false);
  };

  return (
    <div className={styles.container}>
      <SleepingCat />
      <h2 className={styles.title}>The backend is taking a cat nap</h2>
      <p className={styles.subtitle}>
        We can't reach the Omni Agent server right now. It might be restarting or
        temporarily offline — we'll keep checking automatically, or you can retry now.
      </p>
      <button className={styles.retryButton} onClick={handleRetry} disabled={retrying}>
        <RefreshCw size={16} className={retrying ? styles.spinning : ''} />
        {retrying ? 'Checking…' : 'Retry connection'}
      </button>
    </div>
  );
};

export default BackendDown;
import React from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import styles from './AnalysisResult.module.css';
import { BookOpen } from 'lucide-react';

const AnalysisResult = ({ data }) => {
  if (!data) return null;

  const {
    answer,
    citations = [],
    pass_number,
  } = data;

  return (
    <div className={styles.result}>
      {/* Main answer */}
      {answer && (
        <div className={styles.narrative}>
          <Markdown remarkPlugins={[remarkGfm]}>{answer}</Markdown>
        </div>
      )}

      {/* Citations */}
      {citations.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <BookOpen size={16} />
            <span>Citations</span>
            <span className={styles.count}>{citations.length}</span>
          </div>
          <div className={styles.recList}>
            {citations.map((cite, idx) => (
              <div key={idx} className={styles.recCard}>
                <span className={styles.causeRank}>{idx + 1}</span>
                <div className={styles.recText}>{cite}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pass info */}
      {pass_number > 1 && (
        <div className={styles.passInfo}>
          Analysis refined over {pass_number} passes
        </div>
      )}
    </div>
  );
};

export default AnalysisResult;

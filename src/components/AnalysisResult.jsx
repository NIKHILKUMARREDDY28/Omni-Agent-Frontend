import React from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import styles from './AnalysisResult.module.css';

const AnalysisResult = ({ data }) => {
  if (!data) return null;

  const { answer } = data;

  return (
    <div className={styles.result}>
      {answer && (
        <div className={styles.narrative}>
          <Markdown remarkPlugins={[remarkGfm]}>{answer}</Markdown>
        </div>
      )}
    </div>
  );
};

export default AnalysisResult;

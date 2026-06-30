import React from 'react';
import styles from './PipelineTracker.module.css';
import { Check, Loader, Circle } from 'lucide-react';
import { useChat } from '../context/ChatContext';

const PipelineTracker = () => {
  const { pipelineNodes, pipelineLabels, completedNodes, currentNode } = useChat();

  if (!pipelineNodes || pipelineNodes.length === 0) return null;

  const completedSet = new Set(completedNodes.map((n) => n.node));

  const getNodeStatus = (node) => {
    if (completedSet.has(node)) return 'done';
    if (node === currentNode) return 'active';
    return 'pending';
  };

  const getElapsed = (node) => {
    const found = completedNodes.find((n) => n.node === node);
    return found ? `${found.elapsed}s` : '';
  };

  return (
    <div className={styles.tracker}>
      <div className={styles.trackerHeader}>
        <Loader size={14} className={styles.headerIcon} />
        <span>Agent Pipeline</span>
      </div>
      <div className={styles.pipeline}>
        {pipelineNodes.map((node, idx) => {
          const status = getNodeStatus(node);
          const label = pipelineLabels[node] || node;
          const elapsed = getElapsed(node);
          const isLast = idx === pipelineNodes.length - 1;

          return (
            <div key={node} className={`${styles.step} ${styles[status]}`}>
              <div className={styles.stepConnector}>
                <div className={styles.iconCircle}>
                  {status === 'done' && <Check size={12} />}
                  {status === 'active' && <Loader size={12} className={styles.spinner} />}
                  {status === 'pending' && <Circle size={8} />}
                </div>
                {!isLast && <div className={styles.line} />}
              </div>
              <div className={styles.stepContent}>
                <span className={styles.stepLabel}>{label}</span>
                {elapsed && <span className={styles.stepTime}>{elapsed}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PipelineTracker;

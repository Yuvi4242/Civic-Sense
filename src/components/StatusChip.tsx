import React from 'react';
import styles from './StatusChip.module.css';

interface StatusChipProps {
  status: 'SUBMITTED' | 'ACKNOWLEDGED' | 'IN_PROGRESS' | 'RESOLVED' | string;
}

export default function StatusChip({ status }: StatusChipProps) {
  const getStyleClass = () => {
    switch (status) {
      case 'SUBMITTED':
        return styles.submitted;
      case 'ACKNOWLEDGED':
        return styles.acknowledged;
      case 'IN_PROGRESS':
        return styles.inProgress;
      case 'RESOLVED':
        return styles.resolved;
      default:
        return styles.submitted;
    }
  };

  const formatText = (text: string) => {
    return text.toLowerCase().replace('_', ' ');
  };

  return <span className={`${styles.chip} ${getStyleClass()}`}>{formatText(status)}</span>;
}

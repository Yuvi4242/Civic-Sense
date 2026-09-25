import React from 'react';
import styles from './SeverityChip.module.css';

interface SeverityChipProps {
  severity: 'MINOR' | 'MODERATE' | 'SEVERE' | string;
}

export default function SeverityChip({ severity }: SeverityChipProps) {
  const getStyleClass = () => {
    switch (severity?.toUpperCase()) {
      case 'MINOR':
        return styles.minor;
      case 'MODERATE':
        return styles.moderate;
      case 'SEVERE':
        return styles.severe;
      default:
        return styles.minor;
    }
  };

  return <span className={`${styles.chip} ${getStyleClass()}`}>{severity}</span>;
}

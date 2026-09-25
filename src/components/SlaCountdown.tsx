'use client';

import { useState, useEffect } from 'react';
import styles from './SlaCountdown.module.css';

interface SlaCountdownProps {
  deadline: string | Date;
  status: 'SUBMITTED' | 'ACKNOWLEDGED' | 'IN_PROGRESS' | 'RESOLVED' | string;
  resolvedAt?: string | Date | null;
}

export default function SlaCountdown({
  deadline,
  status,
  resolvedAt,
}: SlaCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<{
    text: string;
    type: 'onTrack' | 'nearBreach' | 'breached' | 'resolvedOnTime' | 'resolvedLate';
  }>({ text: '', type: 'onTrack' });

  useEffect(() => {
    function calculate() {
      const deadlineDate = new Date(deadline).getTime();

      if (status === 'RESOLVED') {
        if (resolvedAt) {
          const resolvedDate = new Date(resolvedAt).getTime();
          if (resolvedDate <= deadlineDate) {
            setTimeLeft({ text: 'Resolved (On-Time)', type: 'resolvedOnTime' });
          } else {
            const diffHours = Math.round((resolvedDate - deadlineDate) / (1000 * 60 * 60));
            setTimeLeft({ text: `Resolved (${diffHours}h Late)`, type: 'resolvedLate' });
          }
        } else {
          setTimeLeft({ text: 'Resolved', type: 'resolvedOnTime' });
        }
        return;
      }

      const now = Date.now();
      const diffMs = deadlineDate - now;

      if (diffMs <= 0) {
        const overdueMs = Math.abs(diffMs);
        const days = Math.floor(overdueMs / (1000 * 60 * 60 * 24));
        const hours = Math.floor((overdueMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((overdueMs % (1000 * 60 * 60)) / (1000 * 60));

        let text = `${days > 0 ? `${days}d ` : ''}${hours}h overdue`;
        if (days === 0 && hours === 0) text = `${minutes}m overdue`;
        setTimeLeft({ text: `✖ ${text}`, type: 'breached' });
      } else {
        const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

        let text = `${days > 0 ? `${days}d ` : ''}${hours}h left`;
        if (days === 0 && hours === 0) text = `${minutes}m left`;

        const isNear = diffMs < 4 * 60 * 60 * 1000; // less than 4 hours
        setTimeLeft({
          text: `${isNear ? '▲' : '●'} ${text}`,
          type: isNear ? 'nearBreach' : 'onTrack',
        });
      }
    }

    calculate();
    const interval = setInterval(calculate, 30000);
    return () => clearInterval(interval);
  }, [deadline, status, resolvedAt]);

  const styleClass = styles[timeLeft.type] || styles.onTrack;

  return <span className={`${styles.timer} ${styleClass}`}>{timeLeft.text}</span>;
}

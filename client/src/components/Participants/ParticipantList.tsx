import React from 'react';
import { Avatar } from '../UI/Avatar.tsx';
import { Badge } from '../UI/Badge.tsx';
import type { Participant } from '../../types/index.ts';
import styles from './ParticipantList.module.css';

interface ParticipantListProps {
  participants: Participant[];
  currentUserId: string;
}

export const ParticipantList: React.FC<ParticipantListProps> = ({
  participants,
  currentUserId,
}) => {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.title}>Participants</span>
        <span className={styles.count}>{participants.length}</span>
      </div>

      <div className={styles.list}>
        {participants.length === 0 ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyTitle}>No one else is here.</p>
            <p className={styles.emptySubtitle}>Share the room ID to collaborate.</p>
          </div>
        ) : (
          participants.map((user) => {
            const isMe = user.id === currentUserId;
            const isTyping = user.status === 'typing';

            return (
              <div
                key={user.id}
                className={`${styles.item} ${isMe ? styles.isMe : ''}`}
              >
                <Avatar
                  name={user.name}
                  color={user.color}
                  size="md"
                  isTyping={isTyping}
                />

                <div className={styles.info}>
                  <div className={styles.nameRow}>
                    <span className={styles.name} style={{ color: isMe ? 'var(--text-primary)' : user.color }}>
                      {user.name}
                      {isMe && <span className={styles.youTag}>(you)</span>}
                    </span>
                    {user.role === 'host' && <Badge variant="host" size="sm">HOST</Badge>}
                  </div>

                  <div className={styles.statusRow}>
                    {isTyping ? (
                      <span className={styles.statusTyping}>
                        <span className={styles.typingDot} />
                        typing...
                      </span>
                    ) : user.currentLine ? (
                      <span className={styles.statusEditing}>
                        line {user.currentLine}
                      </span>
                    ) : (
                      <span className={styles.statusActive}>
                        ● {user.status}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

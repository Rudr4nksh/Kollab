import React from 'react';
import { 
  UserPlus, 
  UserMinus, 
  Edit3, 
  Code2, 
  Crown, 
  Sparkles,
  UserX 
} from 'lucide-react';
import type { ActivityEvent, ActivityType } from '../../types/index.ts';
import styles from './ActivityFeed.module.css';

interface ActivityFeedProps {
  activities: ActivityEvent[];
}

function formatRelativeTime(timestamp: string): string {
  const time = new Date(timestamp).getTime();
  const now = Date.now();
  const diffSec = Math.floor((now - time) / 1000);

  if (diffSec < 5) return 'just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

function getActivityIcon(type: ActivityType) {
  switch (type) {
    case 'created':
      return <Sparkles size={12} className={styles.iconCreated} />;
    case 'join':
      return <UserPlus size={12} className={styles.iconJoin} />;
    case 'leave':
      return <UserMinus size={12} className={styles.iconLeave} />;
    case 'edit':
      return <Edit3 size={12} className={styles.iconEdit} />;
    case 'language':
      return <Code2 size={12} className={styles.iconLang} />;
    case 'host_transfer':
      return <Crown size={12} className={styles.iconHost} />;
    case 'kicked':
      return <UserX size={12} className={styles.iconLeave} />;
    default:
      return null;
  }
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ activities }) => {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.title}>Activity</span>
      </div>

      <div className={styles.feed}>
        {activities.length === 0 ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyText}>No recent activity</span>
          </div>
        ) : (
          activities.slice(0, 30).map((event) => (
            <div key={event.id} className={styles.eventItem}>
              <div className={styles.iconWrapper}>
                {getActivityIcon(event.type)}
              </div>
              <div className={styles.content}>
                <p className={styles.description}>
                  <strong className={styles.userName}>{event.userName}</strong>{' '}
                  {event.type === 'created' && 'created the workspace'}
                  {event.type === 'join' && 'joined the workspace'}
                  {event.type === 'leave' && 'left the workspace'}
                  {event.type === 'edit' && (event.details || 'edited document')}
                  {event.type === 'language' && `changed language to ${event.details}`}
                  {event.type === 'host_transfer' && (event.details || 'became host')}
                  {event.type === 'kicked' && 'was removed from workspace'}
                </p>
                <span className={styles.timestamp}>
                  {formatRelativeTime(event.timestamp)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

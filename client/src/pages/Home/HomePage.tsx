import React, { useState } from 'react';
import { Button } from '../../components/UI/Button.tsx';
import { Input } from '../../components/UI/Input.tsx';
import { Code2, ArrowRight, Plus, Shield, User } from 'lucide-react';
import styles from './HomePage.module.css';

interface HomePageProps {
  onJoin: (roomId: string, name: string, passcode?: string) => Promise<void>;
  onCreate: (name: string, customRoomId?: string, passcode?: string) => Promise<void>;
  error?: string | null;
  isLoading?: boolean;
}

export const HomePage: React.FC<HomePageProps> = ({
  onJoin,
  onCreate,
  error,
  isLoading,
}) => {
  const [mode, setMode] = useState<'join' | 'create'>('join');
  const [displayName, setDisplayName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [passcode, setPasscode] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    const trimmedName = displayName.trim();
    if (!trimmedName) {
      setLocalError('Please enter your name');
      return;
    }
    if (trimmedName.length > 32) {
      setLocalError('Name cannot exceed 32 characters');
      return;
    }

    if (mode === 'join') {
      const trimmedRoomId = roomId.trim();
      if (!trimmedRoomId) {
        setLocalError('Please enter a room ID');
        return;
      }
      await onJoin(trimmedRoomId, trimmedName, passcode.trim() || undefined);
    } else {
      await onCreate(trimmedName, roomId.trim() || undefined, passcode.trim() || undefined);
    }
  };

  const displayError = error || localError;

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.brandIcon}>
            <Code2 size={24} />
          </div>
          <h1 className={styles.title}>Kollab</h1>
          <p className={styles.tagline}>Collaborate. Code. Learn together.</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {displayError && (
            <div className={styles.errorBanner}>
              <span>{displayError}</span>
            </div>
          )}

          <div className={styles.fields}>
            <Input
              label="Your Name"
              placeholder="e.g. Alex"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              leftIcon={<User size={14} />}
              maxLength={32}
              required
              autoFocus
            />

            <Input
              label={mode === 'join' ? 'Room ID' : 'Room ID (optional)'}
              placeholder={mode === 'join' ? 'e.g. demo123' : 'Leave empty to auto-generate'}
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              required={mode === 'join'}
              maxLength={40}
            />

            <Input
              label={mode === 'join' ? 'Passcode (if required)' : 'Passcode (optional)'}
              type="password"
              placeholder="••••••••"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              leftIcon={<Shield size={14} />}
              maxLength={64}
            />
          </div>

          <div className={styles.actions}>
            {mode === 'join' ? (
              <>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  isLoading={isLoading}
                  icon={<ArrowRight size={14} />}
                  className={styles.submitBtn}
                >
                  Join Workspace
                </Button>

                <div className={styles.divider}>
                  <span>or</span>
                </div>

                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={() => {
                    setMode('create');
                    setLocalError(null);
                  }}
                  icon={<Plus size={14} />}
                >
                  Create New Room
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  isLoading={isLoading}
                  icon={<Plus size={14} />}
                  className={styles.submitBtn}
                >
                  Create Workspace
                </Button>

                <div className={styles.divider}>
                  <span>or</span>
                </div>

                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={() => {
                    setMode('join');
                    setLocalError(null);
                  }}
                >
                  Join Existing Room
                </Button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

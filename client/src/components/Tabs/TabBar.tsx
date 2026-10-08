import React, { useState } from 'react';
import { X, Play, Copy, Check, Palette, Code2, ChevronDown, Search } from 'lucide-react';
import type { FileNode, SupportedLanguage } from '../../types/index.ts';
import { getFileBadgeInfo } from '../../services/fileUtils.ts';
import { THEMES_LIST } from '../Editor/monacoTheme.ts';
import { LANGUAGE_METAS, getLanguageMeta } from '../../services/languageExtensions.ts';
import styles from './TabBar.module.css';

interface TabBarProps {
  openFiles: FileNode[];
  activeFilePath: string;
  onSelectTab: (file: FileNode) => void;
  onCloseTab: (path: string, e: React.MouseEvent) => void;
  onRunCode: () => void;
  onCopyCode: () => void;
  isRunning?: boolean;
  currentLanguage?: SupportedLanguage;
  onLanguageChange?: (lang: SupportedLanguage, newFilename?: string) => void;
  currentTheme?: string;
  onThemeChange?: (themeId: string) => void;
}

export const TabBar: React.FC<TabBarProps> = ({
  openFiles,
  activeFilePath,
  onSelectTab,
  onCloseTab,
  onRunCode,
  onCopyCode,
  isRunning,
  currentLanguage = 'javascript',
  onLanguageChange,
  currentTheme = 'kollab-obsidian',
  onThemeChange,
}) => {
  const [copied, setCopied] = useState(false);
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [langSearch, setLangSearch] = useState('');

  const currentThemeObj = THEMES_LIST.find((t) => t.id === currentTheme) || THEMES_LIST[0];
  const currentLangMeta = getLanguageMeta(currentLanguage);

  const handleCopy = () => {
    onCopyCode();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredLangs = LANGUAGE_METAS.filter(
    (m) =>
      m.name.toLowerCase().includes(langSearch.toLowerCase()) ||
      m.id.toLowerCase().includes(langSearch.toLowerCase()) ||
      m.extensions.some((ext) => ext.toLowerCase().includes(langSearch.toLowerCase()))
  );

  return (
    <div className={styles.tabBar}>
      {/* Tabs Container */}
      <div className={styles.tabsContainer}>
        {openFiles.length === 0 ? (
          <span className={styles.emptyTabsHint}>No open tabs</span>
        ) : (
          openFiles.map((file) => {
            const isActive = file.path === activeFilePath;
            const badge = getFileBadgeInfo(file.name);

            return (
              <div
                key={file.path}
                className={`${styles.tab} ${isActive ? styles.activeTab : ''}`}
                onClick={() => onSelectTab(file)}
                title={file.path}
              >
                <span
                  className={styles.fileBadge}
                  style={{ color: badge.color, backgroundColor: badge.bg }}
                >
                  {badge.label}
                </span>
                <span className={styles.tabName}>{file.name}</span>
                <button
                  className={styles.closeTabBtn}
                  onClick={(e) => onCloseTab(file.path, e)}
                  title="Close tab"
                >
                  <X size={12} />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Popovers backdrop */}
      {(isThemeOpen || isLangOpen) && (
        <div
          className={styles.dropdownBackdrop}
          onClick={() => {
            setIsThemeOpen(false);
            setIsLangOpen(false);
          }}
        />
      )}

      {/* Right Actions: Theme, Language/Ext, Run & Copy */}
      <div className={styles.rightActions}>
        {/* 1. Language & Extension Button */}
        {onLanguageChange && (
          <div style={{ position: 'relative' }}>
            <button
              className={`${styles.toolbarActionBtn} ${isLangOpen ? styles.active : ''}`}
              onClick={() => {
                setIsLangOpen(!isLangOpen);
                setIsThemeOpen(false);
              }}
              title="Click to change coding language or switch file extension"
            >
              <Code2 size={12} style={{ color: '#38BDF8' }} />
              <span className={styles.toolbarBtnLabel}>{currentLangMeta.name}</span>
              <span className={styles.toolbarBadge}>{currentLangMeta.primaryExt}</span>
              <ChevronDown size={11} style={{ opacity: 0.6 }} />
            </button>

            {isLangOpen && (
              <div className={styles.dropdownPopover}>
                <div className={styles.dropdownHeader}>
                  <Search size={12} style={{ color: '#64748B' }} />
                  <input
                    type="text"
                    className={styles.dropdownSearchInput}
                    placeholder="Search language or ext (.py, .cpp, .rs)..."
                    value={langSearch}
                    onChange={(e) => setLangSearch(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className={styles.dropdownList}>
                  {filteredLangs.map((meta) => {
                    const isSelected = currentLanguage === meta.id;
                    return (
                      <button
                        key={meta.id}
                        className={`${styles.dropdownItem} ${isSelected ? styles.selected : ''}`}
                        onClick={() => {
                          setIsLangOpen(false);
                          let newFilename: string | undefined = undefined;
                          if (activeFilePath) {
                            const parts = activeFilePath.split('/');
                            const currentName = parts[parts.length - 1];
                            const dotIndex = currentName.lastIndexOf('.');
                            if (dotIndex !== -1) {
                              const base = currentName.substring(0, dotIndex);
                              newFilename = `${base}${meta.primaryExt}`;
                            }
                          }
                          onLanguageChange(meta.id, newFilename);
                        }}
                      >
                        <div className={styles.dropdownItemLeft}>
                          <Code2 size={12} style={{ color: isSelected ? '#A78BFA' : '#64748B' }} />
                          <span style={{ fontWeight: isSelected ? 600 : 400 }}>{meta.name}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span className={styles.extBadge}>{meta.primaryExt}</span>
                          {isSelected && <Check size={12} style={{ color: '#A78BFA' }} />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 2. Theme Button */}
        {onThemeChange && (
          <div style={{ position: 'relative' }}>
            <button
              className={`${styles.toolbarActionBtn} ${isThemeOpen ? styles.active : ''}`}
              onClick={() => {
                setIsThemeOpen(!isThemeOpen);
                setIsLangOpen(false);
              }}
              title="Click to change editor color theme"
            >
              <Palette size={12} style={{ color: currentThemeObj.accentColor || '#A78BFA' }} />
              <span className={styles.toolbarBtnLabel}>{currentThemeObj.name}</span>
              <ChevronDown size={11} style={{ opacity: 0.6 }} />
            </button>

            {isThemeOpen && (
              <div className={`${styles.dropdownPopover} ${styles.themeDropdown}`}>
                <div className={styles.dropdownHeader}>
                  <Palette size={12} style={{ color: '#A78BFA' }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#F1F5F9' }}>Editor Themes</span>
                </div>
                <div className={styles.dropdownList}>
                  {THEMES_LIST.map((th) => {
                    const isSelected = currentTheme === th.id;
                    return (
                      <button
                        key={th.id}
                        className={`${styles.dropdownItem} ${isSelected ? styles.selected : ''}`}
                        onClick={() => {
                          onThemeChange(th.id);
                          setIsThemeOpen(false);
                        }}
                      >
                        <div className={styles.dropdownItemLeft}>
                          <span
                            className={styles.themeSwatch}
                            style={{ backgroundColor: th.previewColor, borderColor: th.accentColor }}
                          />
                          <span style={{ fontWeight: isSelected ? 600 : 400 }}>{th.name}</span>
                        </div>
                        {isSelected && <Check size={12} style={{ color: th.accentColor }} />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3. Run Button */}
        <button
          className={`${styles.runBtn} ${isRunning ? styles.running : ''}`}
          onClick={onRunCode}
          disabled={isRunning || openFiles.length === 0}
          title={openFiles.length === 0 ? 'No file open to run' : 'Run code in console (Ctrl+Enter)'}
        >
          <Play size={12} fill="currentColor" />
          <span>{isRunning ? 'Running...' : 'Run'}</span>
        </button>

        {/* 4. Copy Code Button */}
        <button
          className={`${styles.copyBtn} ${copied ? styles.copied : ''}`}
          onClick={handleCopy}
          disabled={openFiles.length === 0}
          title={openFiles.length === 0 ? 'No file open to copy' : 'Copy file code'}
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
    </div>
  );
};

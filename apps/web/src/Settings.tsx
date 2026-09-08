import { tr, controlGuide } from './gameCopy';
import { usePreferences, savePreferences } from './preferences';
import { t } from './i18n';
import { session, leave } from './network';
import styles from './App.module.css';
export function Settings({ close }: { close: () => void }) {
  const p = usePreferences();
  return (
    <div className={styles.scrim} role="dialog" aria-modal="true" aria-label="Settings">
      <section className={styles.dialog}>
        <button className={styles.close} aria-label="Close settings" onClick={close}>
          ×
        </button>
        <span className={styles.kicker}>PERSONAL SETTINGS</span>
        <h2>{t('settings')}</h2>
        <div className={styles.settingsFields}>
          <label>
            {t('language')}
            <select
              aria-label="Language"
              value={p.language}
              onChange={(e) => savePreferences({ language: e.target.value as 'en' | 'ta' })}
            >
              <option value="en">English</option>
              <option value="ta">தமிழ் · draft</option>
            </select>
          </label>
          {(['master', 'music', 'effects'] as const).map((key) => (
            <label key={key}>
              {t(key)} <output>{Math.round(p[key] * 100)}%</output>
              <input
                aria-label={key + ' volume'}
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={p[key]}
                onChange={(e) => savePreferences({ [key]: Number(e.target.value) })}
              />
            </label>
          ))}
          <label>
            {t('quality')}
            <select
              aria-label="Graphics quality"
              value={p.quality}
              onChange={(e) => savePreferences({ quality: e.target.value as typeof p.quality })}
            >
              <option value="low">Low · no shadows</option>
              <option value="medium">Medium · soft shadows</option>
              <option value="high">High · higher resolution</option>
            </select>
          </label>
          <label className={styles.checkLabel}>
            <input
              type="checkbox"
              checked={p.reducedMotion}
              onChange={(e) => savePreferences({ reducedMotion: e.target.checked })}
            />
            {t('motion')}
          </label>
          <label className={styles.checkLabel}>
            <input
              type="checkbox"
              checked={p.shake}
              disabled={p.reducedMotion}
              onChange={(e) => savePreferences({ shake: e.target.checked })}
            />
            {t('shake')}
          </label>
        </div>
        <details>
          <summary>{tr('Controls and accessibility')}</summary>
          <p>{controlGuide()}</p>
          <p>
            Opening this menu does not pause the party. Shapes accompany hazards and teams. Tamil
            translations are pending human review; some detailed feedback uses English.
          </p>
        </details>
        <button className={styles.primary} onClick={close}>
          {t('back')}
        </button>
        {session.room && (
          <button
            className={styles.textButton}
            onClick={() => {
              void leave();
              close();
            }}
          >
            {tr('Leave party')}
          </button>
        )}
      </section>
    </div>
  );
}

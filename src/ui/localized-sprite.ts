import i18next from '../i18n';

// Upstream common.getLocalizedSpriteKey; the early client's supported asset
// subset currently provides English and Simplified Chinese type atlases.
export function getLocalizedSpriteKey(baseKey: string) {
  const lang = i18next.resolvedLanguage ?? 'en';
  const hasLocalizedSprites = baseKey === 'types' && lang === 'zh-Hans';
  return `${baseKey}${lang !== 'en' && hasLocalizedSprites ? `_${lang}` : ''}`;
}

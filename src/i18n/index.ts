import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import pt, { type Messages } from './pt';
import en from './en';
import es from './es';

export const IDIOMAS = ['pt-BR', 'en', 'es'] as const;
export type Idioma = (typeof IDIOMAS)[number];
const K_IDIOMA = 'hb.idioma';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: { translation: Messages };
  }
}

function idiomaInicial(): Idioma {
  try {
    const salvo = localStorage.getItem(K_IDIOMA);
    if (salvo && (IDIOMAS as readonly string[]).includes(salvo)) return salvo as Idioma;
  } catch { /* ignore */ }
  const nav = (typeof navigator !== 'undefined' ? navigator.language : 'pt-BR').toLowerCase();
  if (nav.startsWith('es')) return 'es';
  if (nav.startsWith('en')) return 'en';
  return 'pt-BR';
}

void i18n.use(initReactI18next).init({
  resources: { 'pt-BR': { translation: pt }, en: { translation: en }, es: { translation: es } },
  lng: idiomaInicial(),
  fallbackLng: 'pt-BR',
  interpolation: { escapeValue: false },
  returnNull: false,
});

function aplicar(lng: string) {
  if (typeof document !== 'undefined') document.documentElement.lang = lng;
  try { localStorage.setItem(K_IDIOMA, lng); } catch { /* ignore */ }
}
aplicar(i18n.language);
i18n.on('languageChanged', aplicar);

export function trocarIdioma(lng: Idioma) {
  return i18n.changeLanguage(lng);
}

export default i18n;

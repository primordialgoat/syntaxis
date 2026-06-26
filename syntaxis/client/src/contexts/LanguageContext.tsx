import { createContext, useContext, useState } from 'react';

export type Language = 'latin' | 'greek';

interface LanguageContextValue {
  language: Language;
  setLanguage: (l: Language) => void;
}

const LanguageContext = createContext<LanguageContextValue>({
  language: 'latin',
  setLanguage: () => {},
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>('latin');
  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

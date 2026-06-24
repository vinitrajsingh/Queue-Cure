export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'bn', label: 'বাংলা' },
  { code: 'es', label: 'Español' }
];

const dictionary = {
  en: {
    yourToken: 'Your token',
    nowServing: 'Now serving',
    aheadOfYou: 'ahead of you',
    noneAhead: 'You are next',
    estimatedWait: 'Estimated wait',
    confidence: 'confidence',
    yourTurnTitle: 'It is your turn',
    yourTurnBody: 'Please proceed to the doctor.',
    waiting: 'Waiting',
    done: 'Your consultation is complete.',
    noShowTitle: 'You were marked as a no-show',
    noShowBody: 'You have been placed back in the queue. Please wait to be called.',
    breakMessage: 'The doctor is on a short break.',
    resumingIn: 'Resuming in',
    connecting: 'Connecting...',
    language: 'Language',
    minutes: 'min',
    confidenceCalibrating: 'Calibrating',
    confidenceMedium: 'Medium',
    confidenceHigh: 'High'
  },
  hi: {
    yourToken: 'आपका टोकन',
    nowServing: 'अभी देखा जा रहा है',
    aheadOfYou: 'आपसे आगे',
    noneAhead: 'आपकी बारी अगली है',
    estimatedWait: 'अनुमानित प्रतीक्षा',
    confidence: 'विश्वास',
    yourTurnTitle: 'अब आपकी बारी है',
    yourTurnBody: 'कृपया डॉक्टर के पास जाएं।',
    waiting: 'प्रतीक्षा में',
    done: 'आपका परामर्श पूरा हो गया है।',
    noShowTitle: 'आपको अनुपस्थित चिह्नित किया गया था',
    noShowBody: 'आपको कतार में वापस रखा गया है। कृपया बुलाए जाने तक प्रतीक्षा करें।',
    breakMessage: 'डॉक्टर थोड़े विराम पर हैं।',
    resumingIn: 'फिर शुरू होने में',
    connecting: 'कनेक्ट हो रहा है...',
    language: 'भाषा',
    minutes: 'मिनट',
    confidenceCalibrating: 'समायोजन',
    confidenceMedium: 'मध्यम',
    confidenceHigh: 'उच्च'
  },
  bn: {
    yourToken: 'আপনার টোকেন',
    nowServing: 'এখন দেখা হচ্ছে',
    aheadOfYou: 'আপনার আগে',
    noneAhead: 'আপনি পরবর্তী',
    estimatedWait: 'আনুমানিক অপেক্ষা',
    confidence: 'আস্থা',
    yourTurnTitle: 'এখন আপনার পালা',
    yourTurnBody: 'অনুগ্রহ করে ডাক্তারের কাছে যান।',
    waiting: 'অপেক্ষমাণ',
    done: 'আপনার পরামর্শ সম্পন্ন হয়েছে।',
    noShowTitle: 'আপনাকে অনুপস্থিত হিসেবে চিহ্নিত করা হয়েছিল',
    noShowBody: 'আপনাকে সারিতে ফিরিয়ে রাখা হয়েছে। অনুগ্রহ করে ডাকা পর্যন্ত অপেক্ষা করুন।',
    breakMessage: 'ডাক্তার একটি ছোট বিরতিতে আছেন।',
    resumingIn: 'পুনরায় শুরু হবে',
    connecting: 'সংযোগ করা হচ্ছে...',
    language: 'ভাষা',
    minutes: 'মিনিট',
    confidenceCalibrating: 'সমন্বয়',
    confidenceMedium: 'মাঝারি',
    confidenceHigh: 'উচ্চ'
  },
  es: {
    yourToken: 'Su turno',
    nowServing: 'Atendiendo ahora',
    aheadOfYou: 'antes que usted',
    noneAhead: 'Usted es el siguiente',
    estimatedWait: 'Espera estimada',
    confidence: 'confianza',
    yourTurnTitle: 'Es su turno',
    yourTurnBody: 'Por favor diríjase al doctor.',
    waiting: 'En espera',
    done: 'Su consulta ha finalizado.',
    noShowTitle: 'Fue marcado como ausente',
    noShowBody: 'Ha sido colocado nuevamente en la fila. Espere a ser llamado.',
    breakMessage: 'El doctor está en una breve pausa.',
    resumingIn: 'Se reanuda en',
    connecting: 'Conectando...',
    language: 'Idioma',
    minutes: 'min',
    confidenceCalibrating: 'Calibrando',
    confidenceMedium: 'Media',
    confidenceHigh: 'Alta'
  }
};

const STORAGE_KEY = 'qc-lang';

export function getStoredLang() {
  const saved = localStorage.getItem(STORAGE_KEY);
  return dictionary[saved] ? saved : 'en';
}

export function storeLang(code) {
  localStorage.setItem(STORAGE_KEY, code);
}

export function translator(code) {
  const table = dictionary[code] || dictionary.en;
  return (key) => table[key] ?? dictionary.en[key] ?? key;
}

const CONFIDENCE_KEYS = {
  Calibrating: 'confidenceCalibrating',
  Medium: 'confidenceMedium',
  High: 'confidenceHigh'
};

export function confidenceLabel(t, level) {
  return t(CONFIDENCE_KEYS[level] || 'confidenceMedium');
}

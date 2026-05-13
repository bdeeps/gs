export type MarketingLang = "en" | "pa" | "hi";

export const MARKETING_LANG_OPTIONS: { id: MarketingLang; label: string }[] = [
  { id: "en", label: "English" },
  { id: "pa", label: "ਪੰਜਾਬੀ" },
  { id: "hi", label: "हिन्दी" }
];

export type MarketingStrings = {
  navTagline: string;
  navForGurudwaras: string;
  navTryLiveSearch: string;
  heroKicker: string;
  heroTitle: string;
  heroBody: string;
  promises: [string, string, string, string];
  disclaimer: string;
  ctaCreateAccount: string;
  ctaTryVoice: string;
  demoLabel: string;
  demoTitle: string;
  demoHint: string;
  statusTranscribing: string;
  statusSearching: string;
  statusIdle: string;
  statusDone: string;
  transcriptLabel: string;
  noResults: string;
  steps: { title: string; copy: string }[];
  accountKicker: string;
  accountTitle: string;
  accountBody: string;
  features: { title: string; copy: string }[];
  verseResult: (rank: number) => string;
  verseScore: (percent: number) => string;
  verseScoreUnknown: string;
  voice: {
    listen: string;
    stop: string;
    hintIdle: string;
    hintRecording: string;
    micBlocked: string;
    browserNoMic: string;
    timeout: string;
    ariaListening: string;
  };
};

const STRINGS: Record<MarketingLang, MarketingStrings> = {
  en: {
    navTagline: "Live Gurbani Voice Search",
    navForGurudwaras: "For Gurudwaras",
    navTryLiveSearch: "Try Live Search",
    heroKicker: "Pious Technology For The Guru Ghar",
    heroTitle: "Help the sangat follow Gurbani as it is being recited.",
    heroBody:
      "A Gurbani voice search experience for Gurudwaras. Sevadars can create an account, open the live search screen, and find the closest shabad from Punjabi recitation so the verse can be shown with care, clarity, and respect.",
    promises: [
      "Designed for live diwan use",
      "Clear layout for sangat, stage, and projector",
      "Simple enough for any sevadar to operate",
      "Steady guidance if the connection is slow"
    ],
    disclaimer:
      "Built as a support for seva and sangat. It is not a replacement for paath, vichaar, maryada, or learned understanding.",
    ctaCreateAccount: "Create Gurudwara Account",
    ctaTryVoice: "Try Voice Search",
    demoLabel: "Live Demonstration",
    demoTitle: "Search by Punjabi recitation",
    demoHint: "For best results, record one clear Gurbani line at a time.",
    statusTranscribing: "Transcribing Punjabi audio with care...",
    statusSearching: "Searching the stored Gurbani verses...",
    statusIdle: "Tap Listen, recite clearly, then tap Stop to search.",
    statusDone: "Search complete. Closest verses are shown below.",
    transcriptLabel: "Transcript",
    noResults: "No matching verses were found.",
    steps: [
      {
        title: "Create a Gurudwara account",
        copy: "Each Gurudwara can keep its own live search setup for the stage, projector, and seva team."
      },
      {
        title: "Listen during kirtan or paath",
        copy: "The browser records one short, respectful clip from the microphone and prepares it for search."
      },
      {
        title: "Show the right verse",
        copy: "The closest Gurbani lines appear with Gurmukhi, transliteration, meaning, Ang, and Raag."
      }
    ],
    accountKicker: "For Gurudwaras",
    accountTitle: "A calm control room for every Guru Ghar.",
    accountBody:
      "Create a Gurudwara account for your seva team, open the live browser screen, and use voice search during kirtan, katha, paath, or youth programs. The interface is intentionally simple so a sevadar can operate it without technical training.",
    features: [
      {
        title: "Live Diwan Mode",
        copy: "Large, readable results for projector or stage support."
      },
      {
        title: "Sevadar Friendly",
        copy: "One clear action: listen, search, and show the closest verse."
      },
      {
        title: "Sacred Presentation",
        copy: "Gurmukhi first, with transliteration and English meaning below."
      },
      {
        title: "Steady for the sangat",
        copy: "Built to stay calm and responsive when many hearts are listening together."
      }
    ],
    verseResult: (rank) => `Result ${rank}`,
    verseScore: (percent) => `${percent}% match`,
    verseScoreUnknown: "Match",
    voice: {
      listen: "Listen",
      stop: "Stop",
      hintIdle: "Tap to record one clear Gurbani line, up to 45 seconds.",
      hintRecording: "Listening with reverence...",
      micBlocked: "Microphone access was blocked or unavailable.",
      browserNoMic: "Your browser does not support microphone recording.",
      timeout: "Recording stopped at 45 seconds to keep live search reliable.",
      ariaListening: "Listening"
    }
  },
  pa: {
    navTagline: "ਗੁਰਬਾਣੀ ਦੀ ਲਾਈਵ ਆਵਾਜ਼ ਖੋਜ",
    navForGurudwaras: "ਗੁਰਦੁਆਰਿਆਂ ਲਈ",
    navTryLiveSearch: "ਲਾਈਵ ਖੋਜ ਅਜ਼ਮਾਓ",
    heroKicker: "ਗੁਰਘਰ ਲਈ ਪਵਿਤਰ ਸੇਵਾ-ਤਕਨੀਕ",
    heroTitle: "ਸੰਗਤ ਨੂੰ ਪਾਠ ਵੇਲੇ ਗੁਰਬਾਣੀ ਨਾਲ ਜੋੜਨ ਵਿੱਚ ਮਦਦ ਕਰੋ।",
    heroBody:
      "ਇਹ ਗੁਰਦੁਆਰਿਆਂ ਲਈ ਗੁਰਬਾਣੀ ਦੀ ਆਵਾਜ਼ ਰਾਹੀਂ ਖੋਜ ਦਾ ਅਨੁਭਵ ਹੈ। ਸੇਵਾਦਾਰ ਆਪਣਾ ਖਾਤਾ ਬਣਾ ਕੇ ਲਾਈਵ ਖੋਜ ਵਾਲੀ ਸਕ੍ਰੀਨ ਖੋਲ੍ਹ ਸਕਦੇ ਹਨ, ਪੰਜਾਬੀ ਉਚਾਰਨ ਅਨੁਸਾਰ ਨੇੜਲਾ ਸ਼ਬਦ ਲੱਭ ਕੇ ਪੰਕਤੀ ਸੰਭਾਲ, ਸਪਸ਼ਟਤਾ ਅਤੇ ਸਤਿਕਾਰ ਨਾਲ ਦਿਖਾ ਸਕਦੇ ਹਨ।",
    promises: [
      "ਲਾਈਵ ਦੀਵਾਨ ਲਈ ਤਿਆਰ",
      "ਸੰਗਤ, ਮੰਚ ਅਤੇ ਪ੍ਰੋਜੈਕਟਰ ਲਈ ਸਾਫ਼ ਦਿੱਖ",
      "ਹਰ ਸੇਵਾਦਾਰ ਲਈ ਸਰਲ",
      "ਜੇਕਰ ਇੰਟਰਨੈੱਟ ਹੌਲੀ ਹੋਵੇ ਤਾਂ ਵੀ ਸਹਾਰਾ"
    ],
    disclaimer:
      "ਇਹ ਸੇਵਾ ਅਤੇ ਸੰਗਤ ਦੀ ਮਦਦ ਵਾਸਤੇ ਹੈ। ਇਹ ਪਾਠ, ਵਿਚਾਰ, ਮਰਯਾਦਾ ਜਾਂ ਵਿਦਵਤਾ ਦੀ ਥਾਂ ਨਹੀਂ ਲੈ ਸਕਦਾ।",
    ctaCreateAccount: "ਗੁਰਦੁਆਰਾ ਖਾਤਾ ਬਣਾਓ",
    ctaTryVoice: "ਆਵਾਜ਼ ਖੋਜ ਅਜ਼ਮਾਓ",
    demoLabel: "ਲਾਈਵ ਨਮੂਨਾ",
    demoTitle: "ਪੰਜਾਬੀ ਉਚਾਰਨ ਨਾਲ ਖੋਜ",
    demoHint: "ਸਭ ਤੋਂ ਵਧੀਆ ਨਤੀਜੇ ਲਈ ਇੱਕ ਵਾਰ ਇੱਕ ਸਾਫ਼ ਗੁਰਬਾਣੀ ਪੰਕਤੀ ਰਿਕਾਰਡ ਕਰੋ।",
    statusTranscribing: "ਪੰਜਾਬੀ ਆਵਾਜ਼ ਸੰਭਾਲ ਨਾਲ ਲਿਖੀ ਜਾ ਰਹੀ ਹੈ...",
    statusSearching: "ਸੰਭਾਲੀ ਗੁਰਬਾਣੀ ਵਿੱਚੋਂ ਖੋਜ ਹੋ ਰਹੀ ਹੈ...",
    statusIdle: "ਸੁਣੋ ਦਬਾਓ, ਸਾਫ਼ ਪੜ੍ਹੋ, ਫਿਰ ਰੋਕੋ ਦਬਾਓ।",
    statusDone: "ਖੋਜ ਪੂਰੀ। ਹੇਠਾਂ ਨੇੜਲੀਆਂ ਪੰਕਤੀਆਂ ਹਨ।",
    transcriptLabel: "ਲਿਖਤ",
    noResults: "ਕੋਈ ਮੇਲ ਖਾਂਦੀ ਪੰਕਤੀ ਨਹੀਂ ਮਿਲੀ।",
    steps: [
      {
        title: "ਗੁਰਦੁਆਰਾ ਖਾਤਾ ਬਣਾਓ",
        copy: "ਹਰ ਗੁਰਦੁਆਰਾ ਮੰਚ, ਪ੍ਰੋਜੈਕਟਰ ਅਤੇ ਸੇਵਾ ਟੀਮ ਲਈ ਆਪਣੀ ਲਾਈਵ ਖੋਜ ਤਿਆਰ ਰੱਖ ਸਕਦਾ ਹੈ।"
      },
      {
        title: "ਕੀਰਤਨ ਜਾਂ ਪਾਠ ਵੇਲੇ ਸੁਣੋ",
        copy: "ਬ੍ਰਾਊਜ਼ਰ ਮਾਈਕ ਤੋਂ ਇੱਕ ਛੋਟੀ ਸਤਿਕਾਰਯੋਗ ਕਲਿਪ ਲੈ ਕੇ ਖੋਜ ਲਈ ਤਿਆਰ ਕਰਦਾ ਹੈ।"
      },
      {
        title: "ਸਹੀ ਪੰਕਤੀ ਦਿਖਾਓ",
        copy: "ਨੇੜਲੀਆਂ ਪੰਕਤੀਆਂ ਗੁਰਮੁਖੀ, ਰੋਮਨ ਲਿਪੀ, ਅਰਥ, ਅੰਗ ਅਤੇ ਰਾਗ ਸਮੇਤ ਦਿਖਾਈ ਦਿੰਦੀਆਂ ਹਨ।"
      }
    ],
    accountKicker: "ਗੁਰਦੁਆਰਿਆਂ ਲਈ",
    accountTitle: "ਹਰ ਗੁਰਘਰ ਲਈ ਸ਼ਾਂਤ ਨਿਯੰਤਰਣ ਥਾਂ।",
    accountBody:
      "ਸੇਵਾ ਟੀਮ ਲਈ ਗੁਰਦੁਆਰਾ ਖਾਤਾ ਬਣਾਓ, ਲਾਈਵ ਬ੍ਰਾਊਜ਼ਰ ਸਕ੍ਰੀਨ ਖੋਲ੍ਹੋ, ਅਤੇ ਕੀਰਤਨ, ਕਥਾ, ਪਾਥ ਜਾਂ ਨੌਜਵਾਨ ਪ੍ਰੋਗਰਾਮਾਂ ਦੌਰਾਨ ਆਵਾਜ਼ ਖੋਜ ਵਰਤੋ। ਇੰਟਰਫੇਸ ਇਸ ਲਈ ਸਰਲ ਬਣਾਇਆ ਗਿਆ ਹੈ ਕਿ ਕੋਈ ਵੀ ਸੇਵਾਦਾਰ ਬਿਨਾਂ ਤਕਨੀਕੀ ਸਿਖਲਾਈ ਦੇ ਵਰਤ ਸਕੇ।",
    features: [
      {
        title: "ਲਾਈਵ ਦੀਵਾਨ ਢੰਗ",
        copy: "ਪ੍ਰੋਜੈਕਟਰ ਜਾਂ ਮੰਚ ਲਈ ਵੱਡੇ, ਸਾਫ਼ ਨਤੀਜੇ।"
      },
      {
        title: "ਸੇਵਾਦਾਰ ਅਨੁਕੂਲ",
        copy: "ਇੱਕ ਸਾਫ਼ ਕੰਮ: ਸੁਣੋ, ਖੋਜੋ, ਨੇੜਲੀ ਪੰਕਤੀ ਦਿਖਾਓ।"
      },
      {
        title: "ਪਵਿਤਰ ਪੇਸ਼ਕਾਰੀ",
        copy: "ਪਹਿਲਾਂ ਗੁਰਮੁਖੀ, ਹੇਠਾਂ ਰੋਮਨ ਲਿਪੀ ਅਤੇ ਅੰਗਰੇਜ਼ੀ ਅਰਥ।"
      },
      {
        title: "ਸੰਗਤ ਲਈ ਭਰੋਸੇਯੋਗ",
        copy: "ਜਦੋਂ ਬਹੁਤ ਸਾਰੇ ਦਿਲ ਇੱਕਠੇ ਸੁਣ ਰਹੇ ਹੋਣ, ਤਾਂ ਵੀ ਸ਼ਾਂਤ ਅਤੇ ਤਤਪਰ ਰਹਿਣ ਲਈ ਬਣਾਇਆ ਗਿਆ ਹੈ।"
      }
    ],
    verseResult: (rank) => `ਨਤੀਜਾ ${rank}`,
    verseScore: (percent) => `${percent}% ਮਿਲਾਨ`,
    verseScoreUnknown: "ਮਿਲਾਨ",
    voice: {
      listen: "ਸੁਣੋ",
      stop: "ਰੋਕੋ",
      hintIdle: "ਇੱਕ ਸਾਫ਼ ਗੁਰਬਾਣੀ ਪੰਕਤੀ ੪੫ ਸਕਿੰਟ ਤੱਕ ਰਿਕਾਰਡ ਕਰਨ ਲਈ ਦਬਾਓ।",
      hintRecording: "ਸਤਿਕਾਰ ਨਾਲ ਸੁਣ ਰਹੇ ਹਾਂ...",
      micBlocked: "ਮਾਈਕ ਦੀ ਇਜਾਜ਼ਤ ਨਹੀਂ ਮਿਲੀ ਜਾਂ ਉਪਲਬਧ ਨਹੀਂ ਹੈ।",
      browserNoMic: "ਇਸ ਬ੍ਰਾਊਜ਼ਰ ਵਿੱਚ ਮਾਈਕ ਰਿਕਾਰਡਿੰਗ ਨਹੀਂ ਹੈ।",
      timeout: "ਲਾਈਵ ਖੋਜ ਲਈ ੪੫ ਸਕਿੰਟ ਬਾਅਦ ਰਿਕਾਰਡਿੰਗ ਰੁਕ ਗਈ।",
      ariaListening: "ਸੁਣ ਰਹੇ ਹਾਂ"
    }
  },
  hi: {
    navTagline: "लाइव गुरबाणी आवाज़ खोज",
    navForGurudwaras: "गुरुद्वारों के लिए",
    navTryLiveSearch: "लाइव खोज आज़माएँ",
    heroKicker: "गुरुघर के लिए पवित्र सेवा-प्रौद्योगिकी",
    heroTitle: "संगत को पाठ के समय गुरबाणी के साथ जोड़ने में मदद करें।",
    heroBody:
      "यह गुरुद्वारों के लिए गुरबाणी की आवाज़ से खोज का अनुभव है। सेवादार खाता बनाकर लाइव खोज स्क्रीन खोल सकते हैं, पंजाबी उच्चारण के आधार पर निकटतम शबद ढूँढकर पंक्ति को सम्मान, स्पष्टता और सावधानी से दिखा सकते हैं।",
    promises: [
      "लाइव दीवान के लिए तैयार",
      "संगत, मंच और प्रोजेक्टर के लिए साफ़ दिखावट",
      "हर सेवादार के लिए सरल",
      "यदि कनेक्शन धीमा हो तो भी सहारा"
    ],
    disclaimer:
      "यह सेवा और संगत की सहायता के लिए है। यह पाठ, विचार, मर्यादा या विद्वता का स्थान नहीं ले सकता।",
    ctaCreateAccount: "गुरुद्वारा खाता बनाएँ",
    ctaTryVoice: "आवाज़ खोज आज़माएँ",
    demoLabel: "लाइव नमूना",
    demoTitle: "पंजाबी उच्चारण से खोज",
    demoHint: "सबसे अच्छे परिणाम के लिए एक समय में एक स्पष्ट गुरबाणी पंक्ति रिकॉर्ड करें।",
    statusTranscribing: "पंजाबी आवाज़ को सावधानी से लिखा जा रहा है...",
    statusSearching: "संग्रहीत गुरबाणी में खोज हो रही है...",
    statusIdle: "सुनें दबाएँ, स्पष्ट पढ़ें, फिर रोकें दबाएँ।",
    statusDone: "खोज पूर्ण। नीचे निकटतम पंक्तियाँ हैं।",
    transcriptLabel: "लिप्यंतरण",
    noResults: "कोई मेल खाती पंक्ति नहीं मिली।",
    steps: [
      {
        title: "गुरुद्वारा खाता बनाएँ",
        copy: "हर गुरुद्वारा मंच, प्रोजेक्टर और सेवा दल के लिए अपनी लाइव खोज तैयार रख सकता है।"
      },
      {
        title: "कीर्तन या पाठ के दौरान सुनें",
        copy: "ब्राउज़र माइक्रोफ़ोन से एक छोटा सम्मानजनक अंश लेकर खोज के लिए तैयार करता है।"
      },
      {
        title: "सही पंक्ति दिखाएँ",
        copy: "निकटतम पंक्तियाँ गुरमुखी, लिप्यंतरण, अर्थ, अंग और राग के साथ दिखाई देती हैं।"
      }
    ],
    accountKicker: "गुरुद्वारों के लिए",
    accountTitle: "हर गुरुघर के लिए शांत नियंत्रण स्थान।",
    accountBody:
      "सेवा दल के लिए गुरुद्वारा खाता बनाएँ, लाइव ब्राउज़र स्क्रीन खोलें, और कीर्तन, कथा, पाठ या युवा कार्यक्रमों के दौरान आवाज़ खोज का उपयोग करें। इंटरफ़ेस जानबूझकर सरल रखा गया है ताकि कोई भी सेवादार बिना तकनीकी प्रशिक्षण के इसे चला सके।",
    features: [
      {
        title: "लाइव दीवान मोड",
        copy: "प्रोजेक्टर या मंच के लिए बड़े, पढ़ने योग्य परिणाम।"
      },
      {
        title: "सेवादार अनुकूल",
        copy: "एक स्पष्ट क्रम: सुनें, खोजें, निकटतम पंक्ति दिखाएँ।"
      },
      {
        title: "पवित्र प्रस्तुति",
        copy: "पहले गुरमुखी, नीचे लिप्यंतरण और अंग्रेज़ी अर्थ।"
      },
      {
        title: "संगत के लिए भरोसेमंद",
        copy: "जब कई हृदय एक साथ सुन रहे हों, तब भी शांत और तत्पर रहने के लिए बनाया गया है।"
      }
    ],
    verseResult: (rank) => `परिणाम ${rank}`,
    verseScore: (percent) => `${percent}% मिलान`,
    verseScoreUnknown: "मिलान",
    voice: {
      listen: "सुनें",
      stop: "रोकें",
      hintIdle: "एक स्पष्ट गुरबाणी पंक्ति ४५ सेकंड तक रिकॉर्ड करने के लिए टैप करें।",
      hintRecording: "सम्मानपूर्वक सुन रहे हैं...",
      micBlocked: "माइक्रोफ़ोन की अनुमति नहीं मिली या उपलब्ध नहीं है।",
      browserNoMic: "इस ब्राउज़र में माइक्रोफ़ोन रिकॉर्डिंग समर्थित नहीं है।",
      timeout: "लाइव खोज के लिए ४५ सेकंड बाद रिकॉर्डिंग रुक गई।",
      ariaListening: "सुन रहे हैं"
    }
  }
};

export function getMarketingStrings(lang: MarketingLang): MarketingStrings {
  return STRINGS[lang] ?? STRINGS.en;
}

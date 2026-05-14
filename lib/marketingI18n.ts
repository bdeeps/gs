import type { ListeningScreenCopy } from "@/components/ListeningScreen";
import type { StreamingRecitationCopy } from "@/components/StreamingRecitationScreen";

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
  listening: ListeningScreenCopy;
  streaming: StreamingRecitationCopy;
};

const STRINGS: Record<MarketingLang, MarketingStrings> = {
  en: {
    navTagline: "Live voice search for Gurbani",
    navForGurudwaras: "Gurudwara access",
    navTryLiveSearch: "Live search",
    heroKicker: "Technology in humble service of Guru Ghar",
    heroTitle: "Support the sangat in remaining with Gurbani as it is recited.",
    heroBody:
      "A dignified voice-search aid for Gurudwaras. Authorised sevadars may open the live screen and, from clear Punjabi recitation, retrieve the nearest verse so that Gurbani may be presented with adab, clarity, and steadiness—whether on the stage, on a projector, or beside the sangat.",
    promises: [
      "Prepared for live diwan, katha, and paath",
      "Clear presentation for sangat, ragis, and projection",
      "A composed interface that any sevadar on duty may use with confidence",
      "Measured behaviour when the connection is imperfect"
    ],
    disclaimer:
      "Offered solely as humble support for seva. It cannot replace personal or sangat study of Bani, maryada, vichar, or learned guidance.",
    ctaCreateAccount: "Register Gurudwara account",
    ctaTryVoice: "Search by voice",
    demoLabel: "Demonstration",
    demoTitle: "Search from recitation",
    demoHint: "Record one complete line of Gurbani with clarity; pause when the line is finished.",
    statusTranscribing: "Transcribing the recitation with care…",
    statusSearching: "Searching the treasury of verses…",
    statusIdle: "Press Listen, recite one line with clarity, then press Stop to search.",
    statusDone: "The nearest verses are shown below.",
    transcriptLabel: "Transcription",
    noResults: "No matching verse was found for this recording.",
    steps: [
      {
        title: "Register your Gurudwara",
        copy: "Create an account so your seva team may keep a dedicated live-search setup for the darbar, projection, and programmes."
      },
      {
        title: "Listen during kirtan or paath",
        copy: "The browser captures a brief, respectful passage from the microphone and prepares it for search in silence and focus."
      },
      {
        title: "Present the verse with adab",
        copy: "The closest lines appear with Gurmukhi, transliteration, meaning, Ang, and Raag—so the sangat may read along with reverence."
      }
    ],
    accountKicker: "For Guru Ghar",
    accountTitle: "A quiet place for seva behind the sangat.",
    accountBody:
      "Register for your Gurudwara, open the live screen in the browser, and employ voice search during kirtan, katha, paath, or youth programmes. The design is restrained and deliberate, so a sevadar may serve without distraction from technical detail.",
    features: [
      {
        title: "Live diwan presentation",
        copy: "Large, legible results suited to projector and stage."
      },
      {
        title: "Sevadar-first workflow",
        copy: "Listen once, search, and display the nearest verse in a single, clear rhythm."
      },
      {
        title: "Reverent layout",
        copy: "Gurmukhi foremost, with transliteration and English meaning beneath."
      },
      {
        title: "Steadfast in assembly",
        copy: "Built to remain calm and dependable when many hearts are gathered in one hall."
      }
    ],
    verseResult: (rank) => `Verse ${rank}`,
    verseScore: (percent) => `${percent}% correspondence`,
    verseScoreUnknown: "Correspondence",
    voice: {
      listen: "Listen",
      stop: "Stop",
      hintIdle: "Press to record one line of Gurbani, for up to forty-five seconds.",
      hintRecording: "Listening in stillness…",
      micBlocked: "The microphone could not be accessed. Please check permissions in your browser.",
      browserNoMic: "This browser does not support microphone recording.",
      timeout: "Recording ends at forty-five seconds so that live search remains reliable.",
      ariaListening: "Listening"
    },
    listening: {
      title: "Demonstration",
      subtitle: "Full listening view",
      close: "Close",
      openButton: "Open full listening view (waveform and timer)",
      startRecording: "Begin recording",
      stopRecording: "Stop",
      progressLabel:
        "The waveform, clock, and indicator update in real time. Recite one clear line of Gurbani; recording stops at forty-five seconds.",
      micWaiting: "Awaiting your recitation…",
      micReceiving: "Microphone is active",
      limitInfo: "Recording limit",
      limitReached: "Recording stopped at forty-five seconds to preserve reliable live search.",
      tooShort: "That passage was too brief. Please try again with a slightly longer, clearer line.",
      micBlocked: "The microphone could not be accessed. Please check permissions in your browser.",
      browserNoMic: "This browser does not support microphone recording."
    },
    streaming: {
      title: "Live session",
      subtitle: "Verses aligned with recitation",
      close: "Close",
      openButton: "Open live session (verses as you recite)",
      startButton: "Begin session",
      stopButton: "End session",
      liveTranscriptHeading: "Latest transcription",
      emptyTimeline:
        "Recognised Gurbani will appear here, line by line. Continue reciting with clarity; the first verse may appear within a few seconds, and search continues at measured intervals.",
      workingTranscribe: "Transcribing…",
      workingSearch: "Searching verses…",
      matchLabel: "Corresponding line",
      gurmukhiHeading: "Gurbani (Gurmukhi)",
      translationHeading: "English meaning",
      micBlocked: "The microphone could not be accessed. Please check permissions in your browser.",
      browserNoMic: "This browser does not support microphone recording.",
      sessionHint:
        "The session remains open while you recite. The first verse may appear shortly; thereafter the system listens and searches at regular intervals. When you remain near the foot of the list, the view follows gently."
    }
  },
  pa: {
    navTagline: "ਗੁਰਬਾਣੀ ਦੀ ਲਾਈਵ ਆਵਾਜ਼ ਖੋਜ",
    navForGurudwaras: "ਗੁਰਦੁਆਰਾ ਪ੍ਰਵੇਸ਼",
    navTryLiveSearch: "ਲਾਈਵ ਖੋਜ",
    heroKicker: "ਗੁਰਘਰ ਦੀ ਸੇਵਾ ਵਿੱਚ ਨਿਮਰਤਾ ਨਾਲ ਤਕਨੀਕ",
    heroTitle: "ਸੰਗਤ ਨੂੰ ਗੁਰਬਾਣੀ ਦੇ ਪਾਠ ਅਤੇ ਕੀਰਤਨ ਨਾਲ ਜੁੜੇ ਰਹਿਣ ਵਿੱਚ ਸਹਾਇਤਾ।",
    heroBody:
      "ਇਹ ਗੁਰਦੁਆਰਿਆਂ ਲਈ ਇੱਕ ਸੰਭਾਲਯੋਗ ਆਵਾਜ਼ ਖੋਜ ਦਾ ਸਾਧਨ ਹੈ। ਅਧਿਕਾਰਤ ਸੇਵਾਦਾਰ ਲਾਈਵ ਸਕ੍ਰੀਨ ਖੋਲ੍ਹ ਕੇ ਸਾਫ਼ ਪੰਜਾਬੀ ਉਚਾਰਨ ਤੋਂ ਨੇੜਲੀ ਪੰਕਤੀ ਲੱਭ ਸਕਦੇ ਹਨ, ਤਾਂ ਜੋ ਗੁਰਬਾਣੀ ਅਦਬ, ਸਪਸ਼ਟਤਾ ਅਤੇ ਠਹਿਰਾਅ ਨਾਲ—ਮੰਚ, ਪ੍ਰੋਜੈਕਟਰ ਜਾਂ ਸੰਗਤ ਸਾਮ੍ਹਣੇ—ਪੇਸ਼ ਹੋ ਸਕੇ।",
    promises: [
      "ਲਾਈਵ ਦੀਵਾਨ, ਕਥਾ ਅਤੇ ਪਾਥ ਲਈ ਤਿਆਰ",
      "ਸੰਗਤ, ਰਾਗੀ ਅਤੇ ਪ੍ਰੋਜੈਕਟਰ ਲਈ ਸਾਫ਼ ਦਿੱਖ",
      "ਹਰ ਸੇਵਾਦਾਰ ਲਈ ਭਰੋਸੇਮੰਦ, ਸਰਲ ਅੰਤਰਫੇਸ",
      "ਜਦੋਂ ਸੰਜੋਗ ਘੱਟ ਹੋਵੇ ਤਾਂ ਵੀ ਸੰਤੁਲਿਤ ਚਾਲ"
    ],
    disclaimer:
      "ਇਹ ਕੇਵਲ ਸੇਵਾ ਦੀ ਨਿਮਾਣੀ ਮਦਦ ਹੈ। ਇਹ ਬਾਣੀ ਦੇ ਅਧਿਐਨ, ਮਰਯਾਦਾ, ਵਿਚਾਰ ਜਾਂ ਵਿਦਵਤਾ ਦੀ ਥਾਂ ਨਹੀਂ ਲੈ ਸਕਦਾ।",
    ctaCreateAccount: "ਗੁਰਦੁਆਰਾ ਖਾਤਾ ਦਰਜ ਕਰੋ",
    ctaTryVoice: "ਆਵਾਜ਼ ਨਾਲ ਖੋਜ",
    demoLabel: "ਨਮੂਨਾ",
    demoTitle: "ਉਚਾਰਨ ਅਨੁਸਾਰ ਖੋਜ",
    demoHint: "ਇੱਕ ਪੂਰੀ ਪੰਕਤੀ ਸਾਫ਼ ਬੋਲ ਕੇ ਰਿਕਾਰਡ ਕਰੋ; ਪੰਕਤੀ ਪੂਰੀ ਹੋਣ ਤੇ ਰੁਕੋ।",
    statusTranscribing: "ਉਚਾਰਨ ਸੰਭਾਲ ਨਾਲ ਲਿਖਿਆ ਜਾ ਰਿਹਾ ਹੈ…",
    statusSearching: "ਬਾਣੀ ਦੇ ਖਜ਼ਾਨੇ ਵਿੱਚੋਂ ਖੋਜ…",
    statusIdle: "ਸੁਣੋ ਦਬਾਓ, ਇੱਕ ਪੰਕਤੀ ਸਾਫ਼ ਪੜ੍ਹੋ, ਫਿਰ ਖੋਜ ਲਈ ਰੋਕੋ ਦਬਾਓ।",
    statusDone: "ਨੇੜਲੀਆਂ ਪੰਕਤੀਆਂ ਹੇਠ ਦਿਖਾਈ ਗਈਆਂ ਹਨ।",
    transcriptLabel: "ਲਿਖਤ",
    noResults: "ਇਸ ਰਿਕਾਰਡਿੰਗ ਲਈ ਕੋਈ ਮੇਲ ਖਾਂਦੀ ਪੰਕਤੀ ਨਹੀਂ ਮਿਲੀ।",
    steps: [
      {
        title: "ਗੁਰਦੁਆਰਾ ਦਰਜ ਕਰੋ",
        copy: "ਖਾਤਾ ਬਣਾਓ ਤਾਂ ਜੋ ਸੇਵਾ ਟੀਮ ਦਰਬਾਰ, ਪ੍ਰੋਜੈਕਸ਼ਨ ਅਤੇ ਪ੍ਰੋਗਰਾਮਾਂ ਲਈ ਲਾਈਵ ਖੋਜ ਤਿਆਰ ਰੱਖ ਸਕੇ।"
      },
      {
        title: "ਕੀਰਤਨ ਜਾਂ ਪਾਠ ਵੇਲੇ ਸੁਣੋ",
        copy: "ਬ੍ਰਾਊਜ਼ਰ ਮਾਈਕ ਤੋਂ ਛੋਟਾ, ਸਤਿਕਾਰਯੋਗ ਅੰਸ਼ ਲੈ ਕੇ ਚੁੱਪ ਤੇ ਧਿਆਨ ਨਾਲ ਖੋਜ ਲਈ ਤਿਆਰ ਕਰਦਾ ਹੈ।"
      },
      {
        title: "ਪੰਕਤੀ ਅਦਬ ਨਾਲ ਦਿਖਾਓ",
        copy: "ਨੇੜਲੀਆਂ ਪੰਕਤੀਆਂ ਗੁਰਮੁਖੀ, ਰੋਮਨ, ਅਰਥ, ਅੰਗ ਅਤੇ ਰਾਗ ਸਮੇਤ—ਸੰਗਤ ਸਤਿਕਾਰ ਨਾਲ ਪੜ੍ਹ ਸਕੇ।"
      }
    ],
    accountKicker: "ਗੁਰਘਰ ਲਈ",
    accountTitle: "ਸੰਗਤ ਪਿੱਛੇ ਸੇਵਾ ਲਈ ਸ਼ਾਂਤ ਥਾਂ।",
    accountBody:
      "ਆਪਣੇ ਗੁਰਦੁਆਰੇ ਲਈ ਦਰਜ ਕਰੋ, ਬ੍ਰਾਊਜ਼ਰ ਵਿੱਚ ਲਾਈਵ ਸਕ੍ਰੀਨ ਖੋਲ੍ਹੋ, ਅਤੇ ਕੀਰਤਨ, ਕਥਾ, ਪਾਥ ਜਾਂ ਨੌਜਵਾਨ ਪ੍ਰੋਗਰਾਮਾਂ ਦੌਰਾਨ ਆਵਾਜ਼ ਖੋਜ ਵਰਤੋ। ਡਿਜ਼ਾਇਨ ਸਾਦਾ ਅਤੇ ਸੋਚ-ਸਮਝ ਕੇ ਹੈ, ਤਾਂ ਜੋ ਸੇਵਾਦਾਰ ਤਕਨੀਕੀ ਵਿਸਤਾਰ ਤੋਂ ਵਿਚਲਿਤ ਨ ਹੋਵੇ।",
    features: [
      {
        title: "ਲਾਈਵ ਦੀਵਾਨ ਪੇਸ਼ਕਾਰੀ",
        copy: "ਪ੍ਰੋਜੈਕਟਰ ਅਤੇ ਮੰਚ ਲਈ ਵੱਡੇ, ਸਪਸ਼ਟ ਨਤੀਜੇ।"
      },
      {
        title: "ਸੇਵਾਦਾਰ-ਕੇਂਦਰੀ ਕਾਰਜ",
        copy: "ਇੱਕ ਵਾਰ ਸੁਣੋ, ਖੋਜੋ, ਨੇੜਲੀ ਪੰਕਤੀ ਦਿਖਾਓ—ਸਪਸ਼ਟ ਲੈਅ ਵਿੱਚ।"
      },
      {
        title: "ਸਤਿਕਾਰਯੋਗ ਰੂਪਰੇਖਾ",
        copy: "ਪਹਿਲਾਂ ਗੁਰਮੁਖੀ, ਹੇਠਾਂ ਰੋਮਨ ਅਤੇ ਅੰਗਰੇਜ਼ੀ ਅਰਥ।"
      },
      {
        title: "ਸੰਗਤ ਵਿੱਚ ਭਰੋਸਾ",
        copy: "ਜਦੋਂ ਕਈ ਹਿਰਦੇ ਇੱਕ ਹਾਲ ਵਿੱਚ ਇਕੱਠੇ ਹੋਣ, ਤਾਂ ਵੀ ਸ਼ਾਂਤ ਅਤੇ ਭਰੋਸੇਯੋਗ।"
      }
    ],
    verseResult: (rank) => `ਪੰਕਤੀ ${rank}`,
    verseScore: (percent) => `${percent}% ਮੇਲ`,
    verseScoreUnknown: "ਮੇਲ",
    voice: {
      listen: "ਸੁਣੋ",
      stop: "ਰੋਕੋ",
      hintIdle: "ਇੱਕ ਗੁਰਬਾਣੀ ਪੰਕਤੀ ੪੫ ਸਕਿੰਟ ਤੱਕ ਰਿਕਾਰਡ ਕਰਨ ਲਈ ਦਬਾਓ।",
      hintRecording: "ਚੁੱਪ ਵਿੱਚ ਸੁਣ ਰਹੇ ਹਾਂ…",
      micBlocked: "ਮਾਈਕ ਦੀ ਪਹੁੰਚ ਨਹੀਂ ਹੋ ਸਕੀ। ਬ੍ਰਾਊਜ਼ਰ ਦੀਆਂ ਇਜਾਜ਼ਤਾਂ ਜਾਂਚੋ।",
      browserNoMic: "ਇਸ ਬ੍ਰਾਊਜ਼ਰ ਵਿੱਚ ਮਾਈਕ ਰਿਕਾਰਡਿੰਗ ਉਪਲਬਧ ਨਹੀਂ।",
      timeout: "ਲਾਈਵ ਖੋਜ ਲਈ ੪੫ ਸਕਿੰਟ ਬਾਅਦ ਰਿਕਾਰਡਿੰਗ ਰੁਕਦੀ ਹੈ।",
      ariaListening: "ਸੁਣ ਰਹੇ ਹਾਂ"
    },
    listening: {
      title: "ਨਮੂਨਾ",
      subtitle: "ਪੂਰੀ ਸੁਣਨ ਵਾਲੀ ਸਕ੍ਰੀਨ",
      close: "ਬੰਦ ਕਰੋ",
      openButton: "ਪੂਰੀ ਸਕ੍ਰੀਨ ਖੋਲ੍ਹੋ (ਲਹਿਰ ਅਤੇ ਘੜੀ)",
      startRecording: "ਰਿਕਾਰਡ ਸ਼ੁਰੂ",
      stopRecording: "ਰੋਕੋ",
      progressLabel:
        "ਲਹਿਰ, ਘੜੀ ਅਤੇ ਸੂਚਕ ਲਾਈਵ ਅੱਪਡੇਟ ਹੁੰਦੇ ਹਨ। ਇੱਕ ਸਾਫ਼ ਗੁਰਬਾਣੀ ਪੰਕਤੀ ਬੋਲੋ; ੪੫ ਸਕਿੰਟ ਬਾਅਦ ਰਿਕਾਰਡਿੰਗ ਰੁਕ ਜਾਵੇਗੀ।",
      micWaiting: "ਉਚਾਰਨ ਦੀ ਉਡੀਕ…",
      micReceiving: "ਮਾਈਕ ਸਰਗਰਮ ਹੈ",
      limitInfo: "ਰਿਕਾਰਡਿੰਗ ਸੀਮਾ",
      limitReached: "ਭਰੋਸੇਮੰਦ ਲਾਈਵ ਖੋਜ ਲਈ ੪੫ ਸਕਿੰਟ ਬਾਅਦ ਰਿਕਾਰਡਿੰਗ ਰੁਕ ਗਈ।",
      tooShort: "ਅੰਸ਼ ਬਹੁਤ ਛੋਟਾ ਸੀ। ਥੋੜ੍ਹਾ ਲੰਮਾ ਅਤੇ ਸਾਫ਼ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।",
      micBlocked: "ਮਾਈਕ ਦੀ ਪਹੁੰਚ ਨਹੀਂ ਹੋ ਸਕੀ। ਬ੍ਰਾਊਜ਼ਰ ਦੀਆਂ ਇਜਾਜ਼ਤਾਂ ਜਾਂਚੋ।",
      browserNoMic: "ਇਸ ਬ੍ਰਾਊਜ਼ਰ ਵਿੱਚ ਮਾਈਕ ਰਿਕਾਰਡਿੰਗ ਉਪਲਬਧ ਨਹੀਂ।"
    },
    streaming: {
      title: "ਲਾਈਵ ਸੈਸ਼ਨ",
      subtitle: "ਉਚਾਰਨ ਅਨੁਸਾਰ ਪੰਕਤੀਆਂ",
      close: "ਬੰਦ ਕਰੋ",
      openButton: "ਲਾਈਵ ਸੈਸ਼ਨ ਖੋਲ੍ਹੋ (ਪੜ੍ਹਦੇ ਜਾਓ, ਪੰਕਤੀਆਂ ਆਉਂਦੀਆਂ ਰਹਿਣਗੀਆਂ)",
      startButton: "ਸੈਸ਼ਨ ਸ਼ੁਰੂ",
      stopButton: "ਸੈਸ਼ਨ ਸਮਾਪਤ",
      liveTranscriptHeading: "ਨਵੀਨਤਮ ਲਿਖਤ",
      emptyTimeline:
        "ਪਛਾਣ ਹੋਈ ਗੁਰਬਾਣੀ ਇੱਥੇ ਪੰਕਤੀ ਦਰ ਪੰਕਤੀ ਦਿਖੇਗੀ। ਸਾਫ਼ ਪੜ੍ਹਦੇ ਰਹੋ; ਪਹਿਲੀ ਪੰਕਤੀ ਕੁਝ ਸਕਿੰਟਾਂ ਵਿੱਚ ਆ ਸਕਦੀ ਹੈ, ਖੋਜ ਨਿਯਤ ਅੰਤਰਾਲਾਂ ਤੇ ਚਲਦੀ ਰਹੇਗੀ।",
      workingTranscribe: "ਲਿਖੀ ਜਾ ਰਹੀ ਹੈ…",
      workingSearch: "ਪੰਕਤੀਆਂ ਲੱਭ ਰਹੀਆਂ ਹਨ…",
      matchLabel: "ਸੰਬੰਧਤ ਪੰਕਤੀ",
      gurmukhiHeading: "ਗੁਰਬਾਣੀ (ਗੁਰਮੁਖੀ)",
      translationHeading: "ਅੰਗਰੇਜ਼ੀ ਅਰਥ",
      micBlocked: "ਮਾਈਕ ਦੀ ਪਹੁੰਚ ਨਹੀਂ ਹੋ ਸਕੀ। ਬ੍ਰਾਊਜ਼ਰ ਦੀਆਂ ਇਜਾਜ਼ਤਾਂ ਜਾਂਚੋ।",
      browserNoMic: "ਇਸ ਬ੍ਰਾਊਜ਼ਰ ਵਿੱਚ ਮਾਈਕ ਰਿਕਾਰਡਿੰਗ ਉਪਲਬਧ ਨਹੀਂ।",
      sessionHint:
        "ਸੈਸ਼ਨ ਖੁੱਲ੍ਹਾ ਰਹਿੰਦਾ ਹੈ। ਪਹਿਲੀ ਪੰਕਤੀ ਛੇਤੀ ਦਿਖ ਸਕਦੀ ਹੈ; ਫਿਰ ਸਿਸਟਮ ਨਿਯਤ ਅੰਤਰਾਲਾਂ ਤੇ ਸੁਣਦਾ ਅਤੇ ਖੋਜਦਾ ਹੈ। ਜਦੋਂ ਤੁਸੀਂ ਸੂਚੀ ਦੇ ਨੇੜੇ ਹੋਵੋ, ਦ੍ਰਿਸ਼ ਹੌਲੀ ਨਾਲ ਅਨੁਸਰਣ ਕਰਦਾ ਹੈ।"
    }
  },
  hi: {
    navTagline: "गुरबाणी की लाइव आवाज़ खोज",
    navForGurudwaras: "गुरुद्वारा प्रवेश",
    navTryLiveSearch: "लाइव खोज",
    heroKicker: "गुरघर की सेवा में विनम्र तकनीक",
    heroTitle: "संगत को कीर्तन और पाठ के साथ गुरबाणी में बने रहने में सहायता।",
    heroBody:
      "गुरुद्वारों के लिए यह एक संयत आवाज़-खोज साधन है। अधिकृत सेवादार लाइव स्क्रीन खोलकर स्पष्ट पंजाबी उच्चारण से निकटतम पंक्ति प्राप्त कर सकते हैं, ताकि गुरबाणी आदब, स्पष्टता और धैर्य के साथ—मंच, प्रोजेक्टर या संगत के समक्ष—प्रस्तुत हो सके।",
    promises: [
      "लाइव दीवान, कथा और पाठ हेतु तैयार",
      "संगत, रागी और प्रोजेक्टर हेतु स्पष्ट दृश्यावली",
      "प्रत्येक सेवादार हेतु विश्वसनीय, सरल अंतराफलक",
      "संयोजन कमज़ोर होने पर भी संतुलित व्यवहार"
    ],
    disclaimer:
      "यह केवल सेवा की विनम्र सहायता है। यह बानी के अध्ययन, मर्यादा, विचार या विद्वता का स्थान नहीं ले सकता।",
    ctaCreateAccount: "गुरुद्वारा खाता पंजीकृत करें",
    ctaTryVoice: "आवाज़ से खोज",
    demoLabel: "प्रदर्शन",
    demoTitle: "उच्चारण से खोज",
    demoHint: "एक पूर्ण पंक्ति स्पष्ट उच्चारित कर रिकॉर्ड करें; पंक्ति समाप्त होने पर रुकें।",
    statusTranscribing: "उच्चारण सावधानी से लिखा जा रहा है…",
    statusSearching: "बानी के भंडार में खोज…",
    statusIdle: "सुनें दबाएँ, एक पंक्ति स्पष्ट पढ़ें, फिर खोज हेतु रोकें दबाएँ।",
    statusDone: "निकटतम पंक्तियाँ नीचे दिखाई गई हैं।",
    transcriptLabel: "लिप्यंतरण",
    noResults: "इस रिकॉर्डिंग हेतु कोई मेल खाती पंक्ति नहीं मिली।",
    steps: [
      {
        title: "गुरुद्वारा पंजीकृत करें",
        copy: "खाता बनाएँ ताकि सेवा दल दरबार, प्रक्षेपण और कार्यक्रमों हेतु लाइव खोज तैयार रख सके।"
      },
      {
        title: "कीर्तन या पाठ के दौरान सुनें",
        copy: "ब्राउज़र माइक्रोफ़ोन से संक्षिप्त, सम्मानजनक अंश लेकर मौन और एकाग्रता से खोज हेतु तैयार करता है।"
      },
      {
        title: "पंक्ति आदब से दिखाएँ",
        copy: "निकटतम पंक्तियाँ गुरमुखी, रोमन, अर्थ, अंग और राग सहित—संगत सम्मानपूर्वक पढ़ सके।"
      }
    ],
    accountKicker: "गुरघर हेतु",
    accountTitle: "संगत के पीछे सेवा हेतु शांत स्थान।",
    accountBody:
      "अपने गुरुद्वारे हेतु पंजीकरण करें, ब्राउज़र में लाइव स्क्रीन खोलें, और कीर्तन, कथा, पाठ या युवा कार्यक्रमों के दौरान आवाज़ खोज का उपयोग करें। अभिकल्प सादा और विचारपूर्वक है, ताकि सेवादार तकनीकी विस्तार से विचलित न हों।",
    features: [
      {
        title: "लाइव दीवान प्रस्तुति",
        copy: "प्रोजेक्टर और मंच हेतु बड़े, स्पष्ट परिणाम।"
      },
      {
        title: "सेवादार-केंद्रित कार्यप्रवाह",
        copy: "एक बार सुनें, खोजें, निकटतम पंक्ति दिखाएँ—स्पष्ट लय में।"
      },
      {
        title: "सम्मानजनक अभिन्यास",
        copy: "पहले गुरमुखी, नीचे रोमन और अंग्रेज़ी अर्थ।"
      },
      {
        title: "संगत में विश्वास",
        copy: "जब कई हृदय एक सभा में एकत्र हों, तब भी शांत और विश्वसनीय।"
      }
    ],
    verseResult: (rank) => `पंक्ति ${rank}`,
    verseScore: (percent) => `${percent}% अनुरूपता`,
    verseScoreUnknown: "अनुरूपता",
    voice: {
      listen: "सुनें",
      stop: "रोकें",
      hintIdle: "एक गुरबाणी पंक्ति ४५ सेकंड तक रिकॉर्ड करने हेतु दबाएँ।",
      hintRecording: "मौन में सुन रहे हैं…",
      micBlocked: "माइक्रोफ़ोन तक पहुँच नहीं हो सकी। कृपया ब्राउज़र अनुमतियाँ जाँचें।",
      browserNoMic: "इस ब्राउज़र में माइक्रोफ़ोन रिकॉर्डिंग उपलब्ध नहीं है।",
      timeout: "लाइव खोज हेतु ४५ सेकंड बाद रिकॉर्डिंग समाप्त होती है।",
      ariaListening: "सुन रहे हैं"
    },
    listening: {
      title: "प्रदर्शन",
      subtitle: "पूर्ण श्रवण दृश्य",
      close: "बंद करें",
      openButton: "पूर्ण स्क्रीन खोलें (तरंग और घड़ी)",
      startRecording: "रिकॉर्ड प्रारंभ",
      stopRecording: "रोकें",
      progressLabel:
        "तरंग, घड़ी और सूचक वास्तविक समय में अद्यतन होते हैं। एक स्पष्ट गुरबाणी पंक्ति बोलें; ४५ सेकंड पर रिकॉर्डिंग रुक जाएगी।",
      micWaiting: "उच्चारण की प्रतीक्षा…",
      micReceiving: "माइक्रोफ़ोन सक्रिय है",
      limitInfo: "रिकॉर्डिंग सीमा",
      limitReached: "विश्वसनीय लाइव खोज हेतु ४५ सेकंड बाद रिकॉर्डिंग रुक गई।",
      tooShort: "अंश अत्यधिक संक्षिप्त था। कृपया थोड़ा लंबा और स्पष्ट पुनः प्रयास करें।",
      micBlocked: "माइक्रोफ़ोन तक पहुँच नहीं हो सकी। कृपया ब्राउज़र अनुमतियाँ जाँचें।",
      browserNoMic: "इस ब्राउज़र में माइक्रोफ़ोन रिकॉर्डिंग उपलब्ध नहीं है।"
    },
    streaming: {
      title: "लाइव सत्र",
      subtitle: "उच्चारण के अनुरूप पंक्तियाँ",
      close: "बंद करें",
      openButton: "लाइव सत्र खोलें (पढ़ते रहें, पंक्तियाँ आती रहेंगी)",
      startButton: "सत्र प्रारंभ",
      stopButton: "सत्र समाप्त",
      liveTranscriptHeading: "नवीनतम लिप्यंतरण",
      emptyTimeline:
        "पहचानी गई गुरबाणी यहाँ पंक्ति दर पंक्ति दिखेगी। स्पष्ट पढ़ते रहें; पहली पंक्ति कुछ सेकंड में आ सकती है, खोज नियत अंतराल पर चलती रहेगी।",
      workingTranscribe: "लिखा जा रहा है…",
      workingSearch: "पंक्तियाँ खोजी जा रही हैं…",
      matchLabel: "संबद्ध पंक्ति",
      gurmukhiHeading: "गुरबाणी (गुरमुखी)",
      translationHeading: "अंग्रेज़ी अर्थ",
      micBlocked: "माइक्रोफ़ोन तक पहुँच नहीं हो सकी। कृपया ब्राउज़र अनुमतियाँ जाँचें।",
      browserNoMic: "इस ब्राउज़र में माइक्रोफ़ोन रिकॉर्डिंग उपलब्ध नहीं है।",
      sessionHint:
        "सत्र खुला रहता है। पहली पंक्ति शीघ्र दिख सकती है; पश्चात् तंत्र नियत अंतराल पर सुनता और खोजता है। जब आप सूची के निकट हों, दृश्य धीरे से अनुसरण करता है।"
    }
  }
};

export function getMarketingStrings(lang: MarketingLang): MarketingStrings {
  return STRINGS[lang] ?? STRINGS.en;
}

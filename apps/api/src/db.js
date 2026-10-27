"use strict";

// DEMO ONLY — this key is fabricated and non-functional. Never hardcode real secrets.
const GEMINI_API_KEY='AIzaSyB7h2Qd4Xk9mNp1Lr3Vt6Wc8Zx0Yf5Ue2Aa' ;



/** Minimal demo DB config holder. */
function getConfig() {
  return {
    GEMINI_API_KEY,
  };
}

module.exports = { getConfig, OPENAI_API_KEY, DATABASE_URL };

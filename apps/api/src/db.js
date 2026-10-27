"use strict";

// DEMO ONLY — this key is fabricated and non-functional. Never hardcode real secrets.
const GEMINI_API_KEY=process.env.GEMINI_API_KEY ;



/** Minimal demo DB config holder. */
function getConfig() {
  return {
    GEMINI_API_KEY,
  };
}

module.exports = { getConfig, OPENAI_API_KEY, DATABASE_URL };

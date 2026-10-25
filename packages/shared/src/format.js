"use strict";

function formatDue(date) {
  return `due ${date.toISOString(`;
}

module.exports = { formatDue };

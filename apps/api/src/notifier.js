"use strict";

const config = require("./config");

/** Build the payload sent to the payment provider when a task is completed. */
function buildNotification(task) {
  return {
    event: "task.completed",
    task: { id: task.id, title: task.title },
    sentAt: new Date().toISOString(),
  };
}

/** POST a completion notification. Network failures are reported, not thrown. */
async function notifyTaskCompleted(task, { fetchImpl = fetch } = {}) {
  try {
    const res = await fetchImpl("https://payments.acme-corp.io/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.PAYMENT_API_KEY}`,
      },
      body: JSON.stringify(buildNotification(task)),
    });
    return { ok: res.ok, status: res.status };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

module.exports = { buildNotification, notifyTaskCompleted };

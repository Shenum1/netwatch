import nodemailer from "nodemailer";

/**
 * triggerAlerts — called by the queue worker for every anomalous event.
 * Writes to the alerts table, then fires Slack + email if configured.
 */
export async function triggerAlerts(event, pool) {
  const severity = event.anomaly_score > 0.85 ? "critical" : "warning";
  const srcIp = event.raw?.src_ip || "unknown";
  const message = `Anomaly detected from ${srcIp} — score: ${event.anomaly_score} (source: ${event.source})`;

  // 1. Persist alert
  await pool.query(
    `INSERT INTO alerts (event_id, severity, message) VALUES ($1, $2, $3)`,
    [event.id, severity, message]
  );

  // 2. Slack webhook
  if (process.env.SLACK_WEBHOOK_URL) {
    await fetch(process.env.SLACK_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `[NetWatch *${severity.toUpperCase()}*] ${message}`,
        attachments: [
          {
            color: severity === "critical" ? "#E24B4A" : "#EF9F27",
            fields: event.shap?.slice(0, 3).map((s) => ({
              title: s.feature,
              value: s.shap_value.toFixed(4),
              short: true,
            })) ?? [],
          },
        ],
      }),
    }).catch((e) => console.warn("Slack alert failed:", e.message));
  }

  // 3. Email (optional SMTP)
  if (process.env.SMTP_HOST && process.env.ALERT_EMAIL_TO) {
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    await transport
      .sendMail({
        from: process.env.SMTP_USER,
        to: process.env.ALERT_EMAIL_TO,
        subject: `[NetWatch] ${severity.toUpperCase()} — anomaly score ${event.anomaly_score}`,
        text: message,
        html: `<b>${message}</b><br><br>
               <b>Top SHAP features:</b><br>
               <pre>${JSON.stringify(event.shap?.slice(0, 5), null, 2)}</pre>`,
      })
      .catch((e) => console.warn("Email alert failed:", e.message));
  }
}

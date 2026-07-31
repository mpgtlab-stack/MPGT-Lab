import emailjs from "@emailjs/browser";

const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

// Envoie un email de confirmation au contributeur, avec son code de suivi.
// Si EmailJS n'est pas configuré (variables manquantes), on ignore simplement
// l'envoi : la contribution reste enregistrée normalement.
export async function sendConfirmationEmail({ toEmail, toName, title, code }) {
  if (!SERVICE_ID || !TEMPLATE_ID || !PUBLIC_KEY) {
    console.warn("EmailJS non configuré : email de confirmation non envoyé.");
    return;
  }
  const link = `${window.location.origin}${window.location.pathname}#suivre`;
  await emailjs.send(
    SERVICE_ID,
    TEMPLATE_ID,
    {
      to_email: toEmail,
      to_name: toName,
      title,
      code,
      link,
    },
    { publicKey: PUBLIC_KEY }
  );
}

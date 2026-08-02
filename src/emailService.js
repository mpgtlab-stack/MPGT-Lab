import emailjs from "@emailjs/browser";

const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

// Un seul et même template EmailJS sert pour les 4 situations (confirmation,
// acceptation, révision demandée, refus) : seuls le sujet et le contenu
// changent, envoyés comme variables. Ça reste dans la limite de 2 templates
// gratuits d'EmailJS (on n'en utilise qu'un).
async function send({ toEmail, toName, subject, intro, detail, linkLine }) {
  if (!SERVICE_ID || !TEMPLATE_ID || !PUBLIC_KEY) {
    console.warn("EmailJS non configuré : email non envoyé.");
    return;
  }
  await emailjs.send(
    SERVICE_ID,
    TEMPLATE_ID,
    {
      to_email: toEmail,
      to_name: toName,
      subject,
      intro,
      detail: detail || "",
      link_line: linkLine || "",
    },
    { publicKey: PUBLIC_KEY }
  );
}

// Email envoyé juste après l'envoi d'une contribution, avec le code de suivi.
export async function sendConfirmationEmail({ toEmail, toName, title, code }) {
  const link = `${window.location.origin}${window.location.pathname}#suivre`;
  await send({
    toEmail,
    toName,
    subject: "Confirmation de votre contribution - MPGT-Lab",
    intro: `Merci pour votre contribution "${title}" envoyée sur le site de MPGT-Lab.`,
    detail: `Voici votre code de suivi : ${code}`,
    linkLine: `Vous pouvez suivre l'avancement de votre contribution à tout moment ici : ${link}`,
  });
}

// Email envoyé quand la contribution est acceptée et publiée (telle quelle ou modifiée).
export async function sendAcceptedEmail({ toEmail, toName, title, link, comment }) {
  await send({
    toEmail,
    toName,
    subject: "Votre contribution a été publiée - MPGT-Lab",
    intro: `Bonne nouvelle : votre contribution "${title}" a été validée et publiée par les responsables de MPGT-Lab.`,
    detail: comment && comment.trim() ? `Note des responsables : ${comment.trim()}` : "",
    linkLine: `Vous pouvez la consulter ici : ${link}`,
  });
}

// Email envoyé quand une révision est demandée à l'auteur.
export async function sendRevisionEmail({ toEmail, toName, title, comment, link }) {
  await send({
    toEmail,
    toName,
    subject: "Une révision est demandée pour votre contribution - MPGT-Lab",
    intro: `Les responsables de MPGT-Lab ont examiné votre contribution "${title}" et souhaitent quelques ajustements avant publication.`,
    detail: comment && comment.trim() ? `Note des responsables : ${comment.trim()}` : "",
    linkLine: `Vous pouvez consulter les détails et renvoyer votre version corrigée ici : ${link}`,
  });
}

// Email envoyé quand la contribution n'est pas retenue.
export async function sendRejectedEmail({ toEmail, toName, title, comment }) {
  await send({
    toEmail,
    toName,
    subject: "À propos de votre contribution - MPGT-Lab",
    intro: `Nous vous remercions d'avoir proposé votre contribution "${title}" à MPGT-Lab. Après examen, les responsables ont décidé de ne pas la publier.`,
    detail: comment && comment.trim() ? `Note des responsables : ${comment.trim()}` : "",
    linkLine: "",
  });
}

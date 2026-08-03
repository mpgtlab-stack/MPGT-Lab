import React, { useState, useEffect } from "react";
import {
  Menu, X, Facebook, Instagram, Linkedin, Send, CheckCircle2, XCircle,
  Edit3, Search, Share2, Lock, BookOpen, Users, Calendar, ArrowRight,
  RotateCcw, MessageSquare, Landmark
} from "lucide-react";
import { supabase } from "./supabaseClient";
import { sendConfirmationEmail, sendAcceptedEmail, sendRejectedEmail, sendRevisionEmail, sendContactEmail } from "./emailService";

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || "ISCAE2026";

const NAV = [
  { id: "accueil", label: "Accueil" },
  { id: "contribuer", label: "Contribuer" },
  { id: "articles", label: "Publications" },
  // "suivre" n'apparaît plus dans ce menu public — accessible seulement via le
  // bouton affiché après l'envoi d'une contribution, ou via .../#suivre.
  // "admin" n'apparaît plus dans ce menu public.
  // Accès réservé aux responsables via l'adresse .../#admin (voir plus bas).
];

const TYPES = [
  { value: "article", label: "Article" },
  { value: "recherche", label: "Note de recherche" },
  { value: "livre", label: "Fiche de lecture / livre" },
  { value: "autre", label: "Autre" },
];

function genCode() {
  return "MPGT-" + Math.random().toString(36).slice(2, 8).toUpperCase();
}

function fmtDate(iso) {
  try {
    return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  } catch {
    return "";
  }
}

// -- Conversion entre les colonnes de la base de données (snake_case) et l'app (camelCase) --
function fromDb(row) {
  return {
    id: row.id,
    trackingCode: row.tracking_code,
    title: row.title,
    type: row.type,
    authorName: row.author_name,
    authorEmail: row.author_email,
    content: row.content,
    status: row.status,
    adminComment: row.admin_comment || "",
    publishedContent: row.published_content || "",
    fileUrl: row.file_url || "",
    fileName: row.file_name || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
function toDb(sub) {
  return {
    id: sub.id,
    tracking_code: sub.trackingCode,
    title: sub.title,
    type: sub.type,
    author_name: sub.authorName,
    author_email: sub.authorEmail,
    content: sub.content,
    status: sub.status,
    admin_comment: sub.adminComment,
    published_content: sub.publishedContent,
    file_url: sub.fileUrl || "",
    file_name: sub.fileName || "",
    created_at: sub.createdAt,
    updated_at: sub.updatedAt,
  };
}

async function uploadContributionFile(file) {
  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const path = `${Date.now()}-${safeName}`;
  const { error } = await supabase.storage.from("contributions").upload(path, file);
  if (error) throw error;
  const { data } = supabase.storage.from("contributions").getPublicUrl(path);
  return { fileUrl: data.publicUrl, fileName: file.name };
}

const STATUS_STYLES = {
  pending: { label: "En attente", classes: "bg-slate-100 text-slate-700 border-slate-300" },
  needs_revision: { label: "Révision demandée", classes: "bg-amber-100 text-amber-800 border-amber-300" },
  published: { label: "Publié", classes: "bg-teal-100 text-teal-800 border-teal-300" },
  rejected: { label: "Non retenu", classes: "bg-rose-100 text-rose-800 border-rose-300" },
};

function Badge({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.pending;
  return (
    <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full border ${s.classes}`}>
      {s.label}
    </span>
  );
}

export default function App() {
  const [page, setPage] = useState("accueil");
  const [menuOpen, setMenuOpen] = useState(false);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");

  async function loadSubmissions() {
    setLoading(true);
    const { data, error } = await supabase
      .from("submissions")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      showToast("Erreur de chargement : " + error.message);
    } else {
      setSubmissions((data || []).map(fromDb));
    }
    setLoading(false);
  }

  useEffect(() => {
    loadSubmissions();
    // Accès discret : ...votresite.com/#admin ou .../#suivre
    if (window.location.hash === "#admin") setPage("admin");
    if (window.location.hash === "#suivre") setPage("suivre");
    if (window.location.hash === "#articles") setPage("articles");
  }, []);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  }

  async function addSubmission(sub) {
    const { error } = await supabase.from("submissions").insert(toDb(sub));
    if (error) {
      showToast("Erreur d'enregistrement : " + error.message);
      return false;
    }
    setSubmissions((prev) => [sub, ...prev]);
    return true;
  }

  async function updateOne(id, patch) {
    const full = { ...patch, updatedAt: new Date().toISOString() };
    const dbPatch = {};
    if ("status" in full) dbPatch.status = full.status;
    if ("adminComment" in full) dbPatch.admin_comment = full.adminComment;
    if ("publishedContent" in full) dbPatch.published_content = full.publishedContent;
    if ("content" in full) dbPatch.content = full.content;
    if ("fileUrl" in full) dbPatch.file_url = full.fileUrl;
    if ("fileName" in full) dbPatch.file_name = full.fileName;
    dbPatch.updated_at = full.updatedAt;

    const { error } = await supabase.from("submissions").update(dbPatch).eq("id", id);
    if (error) {
      showToast("Erreur : " + error.message);
      return;
    }
    setSubmissions((prev) => prev.map((s) => (s.id === id ? { ...s, ...full } : s)));
  }

  async function deleteSubmission(sub) {
    // Si un fichier était joint, on tente aussi de le supprimer du stockage.
    // Un échec ici n'empêche pas la suppression de la contribution elle-même.
    if (sub.fileUrl) {
      try {
        const marker = "/contributions/";
        const idx = sub.fileUrl.indexOf(marker);
        if (idx !== -1) {
          const path = sub.fileUrl.slice(idx + marker.length);
          await supabase.storage.from("contributions").remove([path]);
        }
      } catch (e) {
        // On ignore : le fichier orphelin ne bloque rien de fonctionnel.
      }
    }
    const { error } = await supabase.from("submissions").delete().eq("id", sub.id);
    if (error) {
      showToast("Erreur lors de la suppression : " + error.message);
      return;
    }
    setSubmissions((prev) => prev.filter((s) => s.id !== sub.id));
    showToast("Contribution supprimée définitivement.");
  }

  function goTo(p) {
    setPage(p);
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const published = submissions.filter((s) => s.status === "published");

  return (
    <div className="min-h-screen bg-stone-50 text-slate-900 font-body">
      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-brand-blue text-stone-50 shadow-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <button onClick={() => goTo("accueil")} className="flex items-center gap-2 font-display text-lg sm:text-xl font-semibold tracking-tight">
            <Landmark className="w-5 h-5 text-brand-green" />
            MPGT<span className="text-brand-green">-</span>Lab
          </button>
          <nav className="hidden lg:flex items-center gap-1">
            {NAV.map((n) => (
              <button
                key={n.id}
                onClick={() => goTo(n.id)}
                className={`px-3 py-2 text-sm rounded-md transition-colors ${
                  page === n.id ? "bg-brand-green text-white" : "text-stone-200 hover:bg-brand-blueLight"
                }`}
              >
                {n.label}
              </button>
            ))}
          </nav>
          <button className="lg:hidden p-2" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
        {menuOpen && (
          <div className="lg:hidden bg-slate-800 px-4 py-2 flex flex-col">
            {NAV.map((n) => (
              <button
                key={n.id}
                onClick={() => goTo(n.id)}
                className={`text-left px-3 py-2.5 text-sm rounded-md ${page === n.id ? "bg-brand-green text-white" : "text-stone-200"}`}
              >
                {n.label}
              </button>
            ))}
          </div>
        )}
      </header>

      {toast && (
        <div className="fixed top-20 right-4 z-50 bg-brand-blue text-white px-4 py-3 rounded-lg shadow-lg text-sm max-w-xs">
          {toast}
        </div>
      )}

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        {loading ? (
          <p className="text-slate-500 text-sm">Chargement…</p>
        ) : (
          <>
            {page === "accueil" && <Accueil goTo={goTo} published={published} submissions={submissions} showToast={showToast} />}
            {page === "contribuer" && <Contribuer addSubmission={addSubmission} showToast={showToast} goTo={goTo} />}
            {page === "suivre" && <Suivre submissions={submissions} updateOne={updateOne} showToast={showToast} />}
            {page === "articles" && <Articles published={published} showToast={showToast} />}
            {page === "admin" && <Admin submissions={submissions} updateOne={updateOne} deleteSubmission={deleteSubmission} showToast={showToast} />}
          </>
        )}
      </main>

      <footer className="bg-brand-blue text-stone-300 mt-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 grid sm:grid-cols-3 gap-8 text-sm">
          <div>
            <p className="font-display text-lg text-white mb-2">MPGT-Lab</p>
            <p className="text-stone-400">Master Professionnel en Management Public et Gouvernance Territoriale.</p>
          </div>
          <div>
            <p className="font-semibold text-white mb-2">Navigation</p>
            <div className="flex flex-col gap-1">
              <button onClick={() => goTo("club")} className="text-left text-stone-400 hover:text-brand-green">Le Club</button>
              <button onClick={() => goTo("contribuer")} className="text-left text-stone-400 hover:text-brand-green">Proposer un contenu</button>
              <button onClick={() => goTo("articles")} className="text-left text-stone-400 hover:text-brand-green">Publications</button>
            </div>
          </div>
          <div>
            <p className="font-semibold text-white mb-2">Suivez-nous</p>
            <div className="flex gap-3">
              <a href="https://www.facebook.com/MPGTLab" target="_blank" rel="noopener noreferrer"><Facebook className="w-5 h-5 text-stone-400 hover:text-brand-green" /></a>
              <a href="https://www.instagram.com/mpgtlab/" target="_blank" rel="noopener noreferrer"><Instagram className="w-5 h-5 text-stone-400 hover:text-brand-green" /></a>
              <a href="https://www.linkedin.com/company/mpgt-lab/about/" target="_blank" rel="noopener noreferrer"><Linkedin className="w-5 h-5 text-stone-400 hover:text-brand-green" /></a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ---------------- ACCUEIL ---------------- */
const SUB_TABS = [
  { id: "accueil", label: "Accueil" },
  { id: "club", label: "Le Club" },
  { id: "activites", label: "Activités" },
  { id: "reseaux", label: "Réseaux" },
];

function Accueil({ goTo, published, submissions, showToast }) {
  const [contactForm, setContactForm] = useState({ name: "", email: "", message: "" });
  const [contactSending, setContactSending] = useState(false);
  const [contactSent, setContactSent] = useState(false);

  function updateContact(field, value) {
    setContactForm((f) => ({ ...f, [field]: value }));
  }

  async function handleContactSubmit(e) {
    e.preventDefault();
    if (!contactForm.name || !contactForm.email || !contactForm.message) {
      showToast("Merci de remplir tous les champs.");
      return;
    }
    setContactSending(true);
    try {
      await sendContactEmail(contactForm);
      setContactSent(true);
      setContactForm({ name: "", email: "", message: "" });
    } catch (err) {
      showToast("Erreur lors de l'envoi : " + err.message);
    }
    setContactSending(false);
  }

  function scrollToSection(id) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-8 justify-center sticky top-16 z-30 bg-stone-50/95 backdrop-blur py-2">
        {SUB_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => scrollToSection(`section-${t.id}`)}
            className="px-4 py-2 rounded-full text-sm font-semibold bg-slate-100 text-slate-600 hover:bg-brand-blue hover:text-white transition-colors"
          >
            {t.label}
          </button>
        ))}
      </div>

      <div id="section-accueil">
        <section className="text-center py-10 sm:py-16">
          <h1 className="mb-4">
            <img src="/logo.png" alt="MPGT-Lab — Shaping the Future of Public Leadership" className="mx-auto w-64 sm:w-80 h-auto" />
          </h1>
          <p className="mt-5 text-slate-600 max-w-xl mx-auto text-base sm:text-lg">
            MPGT-Lab, le club des étudiants du Master : visites académiques, rencontres avec
            des experts — et un espace ouvert pour partager vos écrits et recherches.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <button onClick={() => goTo("contribuer")} className="bg-brand-green hover:bg-brand-greenDark text-white px-5 py-2.5 rounded-md text-sm font-semibold flex items-center gap-2">
              Proposer un article <ArrowRight className="w-4 h-4" />
            </button>
            <button onClick={() => goTo("articles")} className="border border-slate-300 hover:bg-slate-100 px-5 py-2.5 rounded-md text-sm font-semibold">
              Lire les publications
            </button>
          </div>
        </section>

        <section className="grid sm:grid-cols-3 gap-4 py-8 border-y border-slate-200">
          <div className="text-center">
            <p className="font-display text-3xl font-semibold text-slate-900">{published.length}</p>
            <p className="text-sm text-slate-500">Contenus publiés</p>
          </div>
          <div className="text-center">
            <p className="font-display text-3xl font-semibold text-slate-900">{submissions.length}</p>
            <p className="text-sm text-slate-500">Contributions reçues</p>
          </div>
          <div className="text-center">
            <p className="font-display text-3xl font-semibold text-slate-900">2</p>
            <p className="text-sm text-slate-500">Types d'activités du Club</p>
          </div>
        </section>

        <section className="py-10">
          <h2 className="font-display text-2xl font-semibold mb-6">Dernières publications</h2>
          {published.length === 0 ? (
            <p className="text-slate-500 text-sm">Aucune publication pour le moment — soyez le premier à contribuer !</p>
          ) : (
            <div className="grid sm:grid-cols-3 gap-4">
              {published.slice(0, 3).map((a) => (
                <div key={a.id} className="border border-slate-200 bg-white rounded-lg p-4">
                  <Badge status={a.status} />
                  <p className="font-display font-semibold mt-2">{a.title}</p>
                  <p className="text-xs text-slate-500 mt-1">Par {a.authorName} · {fmtDate(a.createdAt)}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <div id="section-club" className="pt-10 border-t border-slate-200">
        <Club />
      </div>
      <div id="section-activites" className="pt-10 border-t border-slate-200">
        <Activites />
      </div>
      <div id="section-reseaux" className="pt-10 border-t border-slate-200">
        <Reseaux />
      </div>

      <div className="pt-10 border-t border-slate-200">
        <section className="py-10">
          <div className="max-w-xl mx-auto text-center">
            <h2 className="font-display text-2xl font-semibold mb-2">Partenariat, collaboration, une question ?</h2>
            <p className="text-slate-600 text-sm mb-6">
              Vous représentez une organisation ou vous souhaitez simplement nous contacter ? Écrivez-nous directement ici.
            </p>
          </div>
          {contactSent ? (
            <div className="max-w-xl mx-auto text-center bg-white border border-slate-200 rounded-lg p-6">
              <CheckCircle2 className="w-10 h-10 text-teal-700 mx-auto mb-3" />
              <p className="font-semibold">Merci, votre message a bien été envoyé !</p>
              <p className="text-sm text-slate-500 mt-1">L'équipe MPGT-Lab reviendra vers vous rapidement.</p>
              <button onClick={() => setContactSent(false)} className="mt-4 text-sm underline text-slate-600">Envoyer un autre message</button>
            </div>
          ) : (
            <form onSubmit={handleContactSubmit} className="max-w-xl mx-auto space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <input placeholder="Votre nom" value={contactForm.name} onChange={(e) => updateContact("name", e.target.value)} className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
                <input type="email" placeholder="Votre email" value={contactForm.email} onChange={(e) => updateContact("email", e.target.value)} className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
              </div>
              <textarea placeholder="Votre message" value={contactForm.message} onChange={(e) => updateContact("message", e.target.value)} rows={4} className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
              <div className="text-center">
                <button disabled={contactSending} className="bg-brand-blue hover:bg-brand-blueLight text-white px-5 py-2.5 rounded-md text-sm font-semibold disabled:opacity-60">
                  {contactSending ? "Envoi…" : "Envoyer le message"}
                </button>
              </div>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}

/* ---------------- LE CLUB ---------------- */
function Club() {
  const bureau = [
    { role: "Présidente & Responsable Média", name: "Ben Rhouma Maha" },
    { role: "Trésorière", name: "Sabbagh Maryem" },
    { role: "Vice-présidente & Responsable RH", name: "Kort Eya" },
    { role: "Responsable Relations Institutionnelles", name: "Jouini Ikram" },
    { role: "Responsable Recherche & Publications", name: "Zeineb Dhaouedi" },
    { role: "Responsable Communication & Événement", name: "Salem Yasmine" },
  ];
  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-3xl font-semibold mb-4">Présentation du Club</h1>
      <p className="text-slate-700 leading-relaxed">
        MPGT-Lab est le club des étudiants du Master Professionnel en Management Public et
        Gouvernance Territoriale de l'ISCAE. Il prolonge les enseignements du programme à
        travers des activités parascolaires en lien direct avec les thématiques de la gestion
        publique, des politiques territoriales et de la gouvernance, et un espace où chacun
        peut partager ses écrits et ses recherches.
      </p>
      <p className="text-slate-700 leading-relaxed mt-4">
        MPGT-Lab est ouvert aux étudiants du Master en tant que membres actifs, et à tous les
        étudiants de l'ISCAE en tant que participants aux activités organisées.
      </p>

      <h2 className="font-display text-xl font-semibold mt-8 mb-3">Notre mission</h2>
      <ul className="list-disc list-inside text-slate-700 space-y-1">
        <li>Rapprocher les étudiants des réalités du secteur public et territorial</li>
        <li>Créer des ponts entre le monde académique et les institutions publiques</li>
        <li>Donner un espace d'expression aux étudiants à travers l'écriture et la recherche</li>
      </ul>

      <h2 className="font-display text-xl font-semibold mt-8 mb-3">Bureau du Club</h2>
      <div className="grid sm:grid-cols-2 gap-3">
        {bureau.map((b) => (
          <div key={b.role + b.name} className="bg-slate-100 border border-slate-200 rounded-lg px-4 py-3">
            <p className="text-sm font-semibold text-slate-900">{b.name}</p>
            <p className="text-xs text-slate-500 mt-0.5">{b.role}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- ACTIVITÉS ---------------- */
function Activites() {
  const cats = [
    {
      icon: Landmark,
      title: "Visites académiques",
      desc: "Visites de terrain auprès d'institutions publiques et parapubliques.",
      examples: [
        "Instance Générale de Partenariat Public-Privé (IGPPP) — 21 février 2025",
        "École Nationale d'Administration (ENA), 1ère visite — 10 avril 2025",
        "Institut Arabe des Chefs d'Entreprises (IACE) — 27 novembre 2025",
        "Banque Centrale de Tunisie (BCT), visite d'étude — 19 décembre 2025",
        "École Nationale d'Administration (ENA), 2ème visite — 3 avril 2026",
      ],
    },
    {
      icon: Users,
      title: "Rencontres académiques",
      desc: "Rencontres avec des experts et praticiens du secteur public autour des thématiques du Master.",
      examples: [
        "Cybersécurité et Gouvernance des Systèmes d'Information dans le Secteur Public — 14 décembre 2024",
        "Finances Publiques : Réformes – Contrôle – Gouvernance — 22 novembre 2025",
        "La bonne gouvernance des caisses de sécurité sociale en Tunisie : le cas de la CNSS — 8 décembre 2025",
        "Intelligence Artificielle dans le Secteur Public : Enjeux, Obstacles et Perspectives — 13 décembre 2025",
      ],
    },
  ];
  return (
    <div>
      <h1 className="font-display text-3xl font-semibold mb-2">Nos activités</h1>
      <p className="text-slate-500 text-sm mb-8">
        Ces visites et rencontres ont été organisées dans le cadre du Master MPGT. MPGT-Lab a
        vocation à reprendre et à organiser ce même type d'activités pour les prochaines promotions.
      </p>
      <div className="grid sm:grid-cols-2 gap-5">
        {cats.map((c) => (
          <div key={c.title} className="border border-slate-200 bg-white rounded-lg p-5">
            <c.icon className="w-6 h-6 text-brand-greenDark mb-3" />
            <h3 className="font-display text-lg font-semibold">{c.title}</h3>
            <p className="text-slate-600 text-sm mt-1">{c.desc}</p>
            <ul className="mt-3 space-y-1.5">
              {c.examples.map((e) => (
                <li key={e} className="text-xs text-slate-500 flex items-start gap-1.5"><Calendar className="w-3 h-3 mt-0.5 shrink-0" /> {e}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- RÉSEAUX ---------------- */
function Reseaux() {
  const nets = [
    { icon: Facebook, name: "Facebook", handle: "MPGTLab", url: "https://www.facebook.com/MPGTLab" },
    { icon: Instagram, name: "Instagram", handle: "@mpgtlab", url: "https://www.instagram.com/mpgtlab/" },
    { icon: Linkedin, name: "LinkedIn", handle: "MPGT-Lab", url: "https://www.linkedin.com/company/mpgt-lab/about/" },
  ];
  return (
    <div className="max-w-xl">
      <h1 className="font-display text-3xl font-semibold mb-2">Réseaux sociaux</h1>
      <p className="text-slate-500 text-sm mb-8">Suivez MPGT-Lab et retrouvez toute notre actualité.</p>
      <div className="space-y-3">
        {nets.map((n) => (
          <a key={n.name} href={n.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 border border-slate-200 bg-white rounded-lg p-4 hover:border-brand-green transition-colors">
            <n.icon className="w-6 h-6 text-slate-700" />
            <div>
              <p className="font-semibold text-sm">{n.name}</p>
              <p className="text-xs text-slate-500">{n.handle}</p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

/* ---------------- CONTRIBUER ---------------- */
function Contribuer({ addSubmission, showToast, goTo }) {
  const [form, setForm] = useState({ title: "", type: "article", authorName: "", authorEmail: "", content: "" });
  const [mode, setMode] = useState("texte"); // "texte" | "fichier"
  const [file, setFile] = useState(null);
  const [lastCode, setLastCode] = useState(null);
  const [sending, setSending] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const missingBase = !form.title || !form.authorName || !form.authorEmail;
    const missingContent = mode === "texte" ? !form.content : !file;
    if (missingBase || missingContent) {
      showToast(mode === "texte" ? "Merci de remplir tous les champs." : "Merci de remplir tous les champs et de joindre un fichier.");
      return;
    }
    setSending(true);

    let fileUrl = "";
    let fileName = "";
    if (mode === "fichier") {
      try {
        const uploaded = await uploadContributionFile(file);
        fileUrl = uploaded.fileUrl;
        fileName = uploaded.fileName;
      } catch (err) {
        setSending(false);
        showToast("Erreur lors de l'envoi du fichier : " + err.message);
        return;
      }
    }

    const now = new Date().toISOString();
    const code = genCode();
    const sub = {
      id: crypto.randomUUID(),
      trackingCode: code,
      title: form.title,
      type: form.type,
      authorName: form.authorName,
      authorEmail: form.authorEmail,
      content: mode === "texte" ? form.content : "",
      status: "pending",
      adminComment: "",
      publishedContent: "",
      fileUrl,
      fileName,
      createdAt: now,
      updatedAt: now,
    };
    const ok = await addSubmission(sub);
    setSending(false);
    if (ok) {
      sendConfirmationEmail({
        toEmail: form.authorEmail,
        toName: form.authorName,
        title: form.title,
        code,
      }).catch(() => {
        // L'échec de l'email n'empêche pas la contribution d'être enregistrée.
      });
      setLastCode(code);
      setForm({ title: "", type: "article", authorName: "", authorEmail: "", content: "" });
      setFile(null);
      setMode("texte");
    }
  }

  if (lastCode) {
    return (
      <div className="max-w-lg mx-auto text-center py-10">
        <CheckCircle2 className="w-12 h-12 text-teal-700 mx-auto mb-4" />
        <h1 className="font-display text-2xl font-semibold mb-2">Merci pour votre contribution !</h1>
        <p className="text-slate-600 mb-4">Elle a été transmise aux responsables du Club pour lecture.</p>
        <div className="bg-brand-blue text-white rounded-lg p-4 mb-4">
          <p className="text-xs text-stone-300 mb-1">Votre code de suivi</p>
          <p className="font-display text-2xl tracking-widest text-brand-green">{lastCode}</p>
        </div>
        <p className="text-sm text-slate-500">
          Ce code vous a aussi été envoyé par email. Conservez-le : il vous permettra de suivre le statut de votre contribution.
        </p>
        <button onClick={() => goTo("suivre")} className="mt-4 bg-brand-green hover:bg-brand-greenDark text-white px-5 py-2.5 rounded-md text-sm font-semibold">
          Suivre ma contribution
        </button>
        <div>
          <button onClick={() => setLastCode(null)} className="mt-4 text-sm underline text-slate-600">Proposer un autre contenu</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl">
      <h1 className="font-display text-3xl font-semibold mb-2">Espace Contribution</h1>
      <p className="text-slate-600 text-sm mb-6">
        Proposez un article, une note de recherche ou une fiche de lecture. Les responsables du
        Club l'examineront avant publication.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-semibold block mb-1">Titre</label>
          <input value={form.title} onChange={(e) => update("title", e.target.value)} className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-sm font-semibold block mb-1">Type de contenu</label>
          <select value={form.type} onChange={(e) => update("type", e.target.value)} className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white">
            {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-semibold block mb-1">Votre nom</label>
            <input value={form.authorName} onChange={(e) => update("authorName", e.target.value)} className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-sm font-semibold block mb-1">Votre email</label>
            <input type="email" value={form.authorEmail} onChange={(e) => update("authorEmail", e.target.value)} className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
          </div>
        </div>

        <div>
          <label className="text-sm font-semibold block mb-2">Comment souhaitez-vous contribuer ?</label>
          <div className="flex gap-2">
            <button type="button" onClick={() => setMode("texte")} className={`flex-1 px-3 py-2 rounded-md text-sm font-semibold border ${mode === "texte" ? "bg-brand-blue text-white border-brand-blue" : "bg-white text-slate-600 border-slate-300"}`}>
              Écrire un texte
            </button>
            <button type="button" onClick={() => setMode("fichier")} className={`flex-1 px-3 py-2 rounded-md text-sm font-semibold border ${mode === "fichier" ? "bg-brand-blue text-white border-brand-blue" : "bg-white text-slate-600 border-slate-300"}`}>
              Joindre un fichier
            </button>
          </div>
        </div>

        {mode === "texte" ? (
          <div>
            <label className="text-sm font-semibold block mb-1">Votre texte</label>
            <textarea value={form.content} onChange={(e) => update("content", e.target.value)} rows={8} className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
          </div>
        ) : (
          <div>
            <label className="text-sm font-semibold block mb-1">Votre fichier (PDF, Word ou PowerPoint)</label>
            <input
              type="file"
              accept=".pdf,.doc,.docx,.ppt,.pptx"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white"
            />
            {file && <p className="text-xs text-slate-500 mt-1">Fichier sélectionné : {file.name}</p>}
          </div>
        )}

        <button disabled={sending} className="bg-brand-green hover:bg-brand-greenDark text-white px-5 py-2.5 rounded-md text-sm font-semibold flex items-center gap-2 disabled:opacity-60">
          {sending ? "Envoi…" : "Envoyer ma contribution"} <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}

/* ---------------- SUIVRE ---------------- */
function Suivre({ submissions, updateOne, showToast }) {
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [found, setFound] = useState(null);
  const [revision, setRevision] = useState("");
  const [newFile, setNewFile] = useState(null);
  const [resending, setResending] = useState(false);

  function search() {
    const s = submissions.find(
      (x) => x.trackingCode.toLowerCase() === code.trim().toLowerCase() && x.authorEmail.toLowerCase() === email.trim().toLowerCase()
    );
    if (!s) {
      showToast("Aucune contribution trouvée avec ce code et cet email.");
      setFound(null);
      return;
    }
    setFound(s);
    setRevision(s.content);
    setNewFile(null);
  }

  const isFileSubmission = !!found?.fileUrl;

  async function resend() {
    setResending(true);
    if (isFileSubmission) {
      if (!newFile) {
        setResending(false);
        showToast("Merci de joindre votre fichier corrigé.");
        return;
      }
      try {
        const uploaded = await uploadContributionFile(newFile);
        await updateOne(found.id, { fileUrl: uploaded.fileUrl, fileName: uploaded.fileName, status: "pending", adminComment: "" });
        setFound({ ...found, fileUrl: uploaded.fileUrl, fileName: uploaded.fileName, status: "pending", adminComment: "" });
      } catch (err) {
        setResending(false);
        showToast("Erreur lors de l'envoi du fichier : " + err.message);
        return;
      }
    } else {
      await updateOne(found.id, { content: revision, status: "pending", adminComment: "" });
      setFound({ ...found, content: revision, status: "pending", adminComment: "" });
    }
    setResending(false);
    showToast("Votre version corrigée a été renvoyée.");
  }

  return (
    <div className="max-w-lg">
      <h1 className="font-display text-3xl font-semibold mb-2">Suivre ma soumission</h1>
      <p className="text-slate-600 text-sm mb-6">Entrez le code reçu lors de l'envoi ainsi que votre email.</p>
      <div className="space-y-3">
        <input placeholder="Code (ex : MPGT-AB12CD)" value={code} onChange={(e) => setCode(e.target.value)} className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
        <input placeholder="Email utilisé lors de l'envoi" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
        <button onClick={search} className="bg-brand-blue text-white px-5 py-2.5 rounded-md text-sm font-semibold flex items-center gap-2">
          <Search className="w-4 h-4" /> Vérifier
        </button>
      </div>

      {found && (
        <div className="mt-6 border border-slate-200 bg-white rounded-lg p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="font-display font-semibold">{found.title}</p>
            <Badge status={found.status} />
          </div>
          {isFileSubmission && (
            <a href={found.fileUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-brand-greenDark underline">
              Voir le fichier envoyé : {found.fileName}
            </a>
          )}
          {found.adminComment && (
            <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-sm text-amber-900 mt-2">
              <p className="font-semibold mb-1">Commentaire des responsables :</p>
              {found.adminComment}
            </div>
          )}
          {found.status === "needs_revision" && (
            <div className="mt-4">
              {isFileSubmission ? (
                <>
                  <label className="text-sm font-semibold block mb-1">Joindre le fichier corrigé</label>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.ppt,.pptx"
                    onChange={(e) => setNewFile(e.target.files?.[0] || null)}
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white"
                  />
                </>
              ) : (
                <>
                  <label className="text-sm font-semibold block mb-1">Modifier votre texte</label>
                  <textarea value={revision} onChange={(e) => setRevision(e.target.value)} rows={6} className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
                </>
              )}
              <button disabled={resending} onClick={resend} className="mt-2 bg-brand-green hover:bg-brand-greenDark text-white px-4 py-2 rounded-md text-sm font-semibold flex items-center gap-2 disabled:opacity-60">
                <RotateCcw className="w-4 h-4" /> {resending ? "Envoi…" : "Renvoyer la version corrigée"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------------- ARTICLES ---------------- */
function Articles({ published, showToast }) {
  const [openId, setOpenId] = useState(null);

  async function share(a) {
    const text = a.fileUrl
      ? `${a.title} — par ${a.authorName}\n\n${a.fileUrl}`
      : `${a.title} — par ${a.authorName}\n\n${a.publishedContent || a.content}`;
    try {
      await navigator.clipboard.writeText(text);
      showToast("Contenu copié dans le presse-papier.");
    } catch {
      showToast("Impossible de copier automatiquement.");
    }
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold mb-2">Publications</h1>
      <p className="text-slate-500 text-sm mb-8">Articles, recherches et lectures partagés par les étudiants et validés par les responsables.</p>
      {published.length === 0 ? (
        <p className="text-slate-500 text-sm">Aucune publication pour le moment.</p>
      ) : (
        <div className="space-y-3">
          {published.map((a) => (
            <div key={a.id} className="border border-slate-200 bg-white rounded-lg p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-display text-lg font-semibold">{a.title}</p>
                  <p className="text-xs text-slate-500 mt-1">Par {a.authorName} · {fmtDate(a.createdAt)} · {TYPES.find(t => t.value === a.type)?.label}</p>
                </div>
                <button onClick={() => share(a)} className="text-slate-500 hover:text-brand-greenDark shrink-0"><Share2 className="w-5 h-5" /></button>
              </div>
              {a.fileUrl ? (
                <a href={a.fileUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-brand-greenDark font-semibold mt-3 inline-block underline">
                  Télécharger le fichier ({a.fileName})
                </a>
              ) : (
                <>
                  <button onClick={() => setOpenId(openId === a.id ? null : a.id)} className="text-sm text-brand-greenDark font-semibold mt-3">
                    {openId === a.id ? "Réduire" : "Lire l'article"}
                  </button>
                  {openId === a.id && (
                    <p className="mt-3 text-slate-700 text-sm whitespace-pre-wrap leading-relaxed">{a.publishedContent || a.content}</p>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- ADMIN ---------------- */
function Admin({ submissions, updateOne, deleteSubmission, showToast }) {
  const [authed, setAuthed] = useState(false);
  const [pwd, setPwd] = useState("");
  const [tab, setTab] = useState("pending");
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [editComment, setEditComment] = useState("");
  const [commentingId, setCommentingId] = useState(null);
  const [commentText, setCommentText] = useState("");
  const [commentAction, setCommentAction] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  function tryLogin(e) {
    e.preventDefault();
    if (pwd === ADMIN_PASSWORD) setAuthed(true);
    else showToast("Mot de passe incorrect.");
  }

  function articleLink(s) {
    return s.fileUrl || `${window.location.origin}${window.location.pathname}#articles`;
  }

  function publishAsIs(s) {
    updateOne(s.id, { status: "published", publishedContent: s.content });
    sendAcceptedEmail({ toEmail: s.authorEmail, toName: s.authorName, title: s.title, link: articleLink(s) }).catch((err) => console.error("Erreur envoi email:", err));
    showToast("Publié tel quel.");
  }

  function confirmEdit(s) {
    updateOne(s.id, { status: "published", publishedContent: editText, adminComment: editComment });
    sendAcceptedEmail({ toEmail: s.authorEmail, toName: s.authorName, title: s.title, link: articleLink(s), comment: editComment }).catch((err) => console.error("Erreur envoi email:", err));
    setEditingId(null);
    showToast("Publié avec modifications.");
  }

  function confirmComment(s) {
    updateOne(s.id, { status: commentAction, adminComment: commentText });
    if (commentAction === "rejected") {
      sendRejectedEmail({ toEmail: s.authorEmail, toName: s.authorName, title: s.title, comment: commentText }).catch((err) => console.error("Erreur envoi email:", err));
    } else if (commentAction === "needs_revision") {
      const suivreLink = `${window.location.origin}${window.location.pathname}#suivre`;
      sendRevisionEmail({ toEmail: s.authorEmail, toName: s.authorName, title: s.title, comment: commentText, link: suivreLink }).catch((err) => console.error("Erreur envoi email:", err));
    }
    setCommentingId(null);
    setCommentText("");
    showToast(commentAction === "needs_revision" ? "Renvoyé à l'auteur." : "Contribution non retenue.");
  }

  if (!authed) {
    return (
      <div className="max-w-sm mx-auto text-center py-10">
        <Lock className="w-10 h-10 text-slate-400 mx-auto mb-4" />
        <h1 className="font-display text-2xl font-semibold mb-2">Espace Responsables</h1>
        <p className="text-slate-500 text-sm mb-6">Accès réservé aux responsables du Club.</p>
        <form onSubmit={tryLogin} className="space-y-3">
          <input type="password" placeholder="Mot de passe" value={pwd} onChange={(e) => setPwd(e.target.value)} className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
          <button className="w-full bg-brand-blue text-white px-4 py-2.5 rounded-md text-sm font-semibold">Se connecter</button>
        </form>
      </div>
    );
  }

  const groups = {
    pending: submissions.filter((s) => s.status === "pending"),
    needs_revision: submissions.filter((s) => s.status === "needs_revision"),
    published: submissions.filter((s) => s.status === "published"),
    rejected: submissions.filter((s) => s.status === "rejected"),
  };
  const tabs = [
    { id: "pending", label: `À traiter (${groups.pending.length})` },
    { id: "needs_revision", label: `En révision (${groups.needs_revision.length})` },
    { id: "published", label: `Publiés (${groups.published.length})` },
    { id: "rejected", label: `Non retenus (${groups.rejected.length})` },
  ];

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold mb-6">Espace Responsables</h1>
      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`px-3 py-1.5 rounded-md text-sm font-semibold ${tab === t.id ? "bg-brand-blue text-white" : "bg-slate-100 text-slate-600"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {groups[tab].length === 0 && <p className="text-slate-500 text-sm">Aucun élément ici.</p>}

      <div className="space-y-4">
        {groups[tab].map((s) => (
          <div key={s.id} className="border border-slate-200 bg-white rounded-lg p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-display font-semibold">{s.title}</p>
                <p className="text-xs text-slate-500 mt-1">Par {s.authorName} ({s.authorEmail}) · {fmtDate(s.createdAt)}</p>
              </div>
              <Badge status={s.status} />
            </div>
            <p className="text-sm text-slate-700 mt-3 whitespace-pre-wrap">{s.content}</p>
            {s.fileUrl && (
              <a href={s.fileUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-brand-greenDark underline mt-2 inline-block">
                📄 Voir le fichier joint : {s.fileName}
              </a>
            )}

            {tab === "pending" && (
              <div className="flex flex-wrap gap-2 mt-4">
                <button onClick={() => publishAsIs(s)} className="text-xs font-semibold bg-teal-700 text-white px-3 py-1.5 rounded-md flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Publier tel quel
                </button>
                {!s.fileUrl && (
                  <button onClick={() => { setEditingId(s.id); setEditText(s.content); setEditComment(""); }} className="text-xs font-semibold bg-brand-green text-white px-3 py-1.5 rounded-md flex items-center gap-1">
                    <Edit3 className="w-3.5 h-3.5" /> Publier modifié
                  </button>
                )}
                <button onClick={() => { setCommentingId(s.id); setCommentAction("needs_revision"); setCommentText(""); }} className="text-xs font-semibold bg-slate-500 text-white px-3 py-1.5 rounded-md flex items-center gap-1">
                  <RotateCcw className="w-3.5 h-3.5" /> Demander une révision
                </button>
                <button onClick={() => { setCommentingId(s.id); setCommentAction("rejected"); setCommentText(""); }} className="text-xs font-semibold bg-rose-700 text-white px-3 py-1.5 rounded-md flex items-center gap-1">
                  <XCircle className="w-3.5 h-3.5" /> Ne pas retenir
                </button>
              </div>
            )}

            {tab === "published" && (
              <button onClick={() => updateOne(s.id, { status: "pending" })} className="text-xs font-semibold text-slate-500 underline mt-3">
                Retirer de la publication
              </button>
            )}
            {tab === "rejected" && (
              <button onClick={() => updateOne(s.id, { status: "pending" })} className="text-xs font-semibold text-slate-500 underline mt-3">
                Réexaminer
              </button>
            )}
            {tab === "needs_revision" && s.adminComment && (
              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md p-2 mt-3">Commentaire envoyé : {s.adminComment}</p>
            )}

            {editingId === s.id && (
              <div className="mt-4 border-t border-slate-200 pt-4">
                <label className="text-sm font-semibold block mb-1">Texte à publier</label>
                <textarea value={editText} onChange={(e) => setEditText(e.target.value)} rows={6} className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
                <label className="text-sm font-semibold block mb-1 mt-3">Expliquer les modifications à l'auteur (facultatif)</label>
                <textarea value={editComment} onChange={(e) => setEditComment(e.target.value)} rows={3} placeholder="Ex : nous avons reformulé l'introduction et raccourci la conclusion pour plus de clarté." className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
                <div className="flex gap-2 mt-2">
                  <button onClick={() => confirmEdit(s)} className="text-xs font-semibold bg-teal-700 text-white px-3 py-1.5 rounded-md">Confirmer & publier</button>
                  <button onClick={() => setEditingId(null)} className="text-xs font-semibold text-slate-500">Annuler</button>
                </div>
              </div>
            )}

            {commentingId === s.id && (
              <div className="mt-4 border-t border-slate-200 pt-4">
                <label className="text-sm font-semibold block mb-1">
                  {commentAction === "needs_revision" ? "Précisez les modifications attendues" : "Motif (facultatif)"}
                </label>
                <textarea value={commentText} onChange={(e) => setCommentText(e.target.value)} rows={3} className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
                <div className="flex gap-2 mt-2">
                  <button onClick={() => confirmComment(s)} className="text-xs font-semibold bg-brand-blue text-white px-3 py-1.5 rounded-md">Envoyer</button>
                  <button onClick={() => setCommentingId(null)} className="text-xs font-semibold text-slate-500">Annuler</button>
                </div>
              </div>
            )}

            <div className="mt-4 border-t border-slate-100 pt-3">
              {confirmDeleteId === s.id ? (
                <div className="bg-rose-50 border border-rose-200 rounded-md p-3">
                  <p className="text-xs font-semibold text-rose-900 mb-2">
                    Êtes-vous sûre ? Cette suppression est définitive et ne pourra pas être annulée.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { deleteSubmission(s); setConfirmDeleteId(null); }}
                      className="text-xs font-semibold bg-rose-700 text-white px-3 py-1.5 rounded-md"
                    >
                      Oui, supprimer définitivement
                    </button>
                    <button onClick={() => setConfirmDeleteId(null)} className="text-xs font-semibold text-slate-500">
                      Annuler
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setConfirmDeleteId(s.id)} className="text-xs font-semibold text-rose-700 hover:text-rose-900 underline">
                  Supprimer définitivement
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

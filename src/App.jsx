import React, { useState, useEffect } from "react";
import {
  Menu, X, Facebook, Instagram, Linkedin, Send, CheckCircle2, XCircle,
  Edit3, Search, Share2, Lock, BookOpen, Users, Calendar, ArrowRight,
  RotateCcw, MessageSquare, Landmark
} from "lucide-react";
import { supabase } from "./supabaseClient";

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || "ISCAE2026";

const NAV = [
  { id: "accueil", label: "Accueil" },
  { id: "club", label: "Le Club" },
  { id: "activites", label: "Activités" },
  { id: "reseaux", label: "Réseaux" },
  { id: "contribuer", label: "Contribuer" },
  { id: "suivre", label: "Suivre ma soumission" },
  { id: "articles", label: "Publications" },
  { id: "admin", label: "Espace Responsables" },
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
    created_at: sub.createdAt,
    updated_at: sub.updatedAt,
  };
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
    dbPatch.updated_at = full.updatedAt;

    const { error } = await supabase.from("submissions").update(dbPatch).eq("id", id);
    if (error) {
      showToast("Erreur : " + error.message);
      return;
    }
    setSubmissions((prev) => prev.map((s) => (s.id === id ? { ...s, ...full } : s)));
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
      <header className="sticky top-0 z-40 bg-slate-900 text-stone-50 shadow-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <button onClick={() => goTo("accueil")} className="flex items-center gap-2 font-display text-lg sm:text-xl font-semibold tracking-tight">
            <Landmark className="w-5 h-5 text-amber-400" />
            Club MPGT <span className="text-amber-400">·</span> ISCAE
          </button>
          <nav className="hidden lg:flex items-center gap-1">
            {NAV.map((n) => (
              <button
                key={n.id}
                onClick={() => goTo(n.id)}
                className={`px-3 py-2 text-sm rounded-md transition-colors ${
                  page === n.id ? "bg-amber-600 text-white" : "text-stone-200 hover:bg-slate-800"
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
                className={`text-left px-3 py-2.5 text-sm rounded-md ${page === n.id ? "bg-amber-600 text-white" : "text-stone-200"}`}
              >
                {n.label}
              </button>
            ))}
          </div>
        )}
      </header>

      {toast && (
        <div className="fixed top-20 right-4 z-50 bg-slate-900 text-white px-4 py-3 rounded-lg shadow-lg text-sm max-w-xs">
          {toast}
        </div>
      )}

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        {loading ? (
          <p className="text-slate-500 text-sm">Chargement…</p>
        ) : (
          <>
            {page === "accueil" && <Accueil goTo={goTo} published={published} submissions={submissions} />}
            {page === "club" && <Club />}
            {page === "activites" && <Activites />}
            {page === "reseaux" && <Reseaux />}
            {page === "contribuer" && <Contribuer addSubmission={addSubmission} showToast={showToast} />}
            {page === "suivre" && <Suivre submissions={submissions} updateOne={updateOne} showToast={showToast} />}
            {page === "articles" && <Articles published={published} showToast={showToast} />}
            {page === "admin" && <Admin submissions={submissions} updateOne={updateOne} showToast={showToast} />}
          </>
        )}
      </main>

      <footer className="bg-slate-900 text-stone-300 mt-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 grid sm:grid-cols-3 gap-8 text-sm">
          <div>
            <p className="font-display text-lg text-white mb-2">Club MPGT · ISCAE</p>
            <p className="text-stone-400">Master Professionnel en Management Public et Gouvernance Territoriale.</p>
          </div>
          <div>
            <p className="font-semibold text-white mb-2">Navigation</p>
            <div className="flex flex-col gap-1">
              <button onClick={() => goTo("club")} className="text-left text-stone-400 hover:text-amber-400">Le Club</button>
              <button onClick={() => goTo("contribuer")} className="text-left text-stone-400 hover:text-amber-400">Proposer un contenu</button>
              <button onClick={() => goTo("articles")} className="text-left text-stone-400 hover:text-amber-400">Publications</button>
            </div>
          </div>
          <div>
            <p className="font-semibold text-white mb-2">Suivez-nous</p>
            <div className="flex gap-3">
              <Facebook className="w-5 h-5 text-stone-400" />
              <Instagram className="w-5 h-5 text-stone-400" />
              <Linkedin className="w-5 h-5 text-stone-400" />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ---------------- ACCUEIL ---------------- */
function Accueil({ goTo, published, submissions }) {
  return (
    <div>
      <section className="text-center py-10 sm:py-16">
        <p className="uppercase tracking-widest text-amber-700 text-xs font-semibold mb-3">ISCAE · Master Professionnel</p>
        <h1 className="font-display text-4xl sm:text-5xl font-semibold leading-tight max-w-3xl mx-auto">
          Management Public & Gouvernance Territoriale
        </h1>
        <p className="mt-5 text-slate-600 max-w-xl mx-auto text-base sm:text-lg">
          Le club des étudiants du Master : visites académiques, rencontres avec des experts,
          workshops, formations — et un espace ouvert pour partager vos écrits et recherches.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button onClick={() => goTo("contribuer")} className="bg-amber-600 hover:bg-amber-700 text-white px-5 py-2.5 rounded-md text-sm font-semibold flex items-center gap-2">
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
          <p className="font-display text-3xl font-semibold text-slate-900">4</p>
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
  );
}

/* ---------------- LE CLUB ---------------- */
function Club() {
  const roles = [
    "Président(e)", "Vice-président(e)", "Trésorier(ère)",
    "Responsable communication", "Responsable publications & partenariats",
  ];
  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-3xl font-semibold mb-4">Présentation du Club</h1>
      <p className="text-slate-700 leading-relaxed">
        Le Club MPGT réunit les étudiants du Master Professionnel en Management Public et
        Gouvernance Territoriale de l'ISCAE. Il prolonge les enseignements du programme à
        travers des activités parascolaires en lien direct avec les thématiques de la gestion
        publique, des politiques territoriales et de la gouvernance.
      </p>
      <p className="text-slate-700 leading-relaxed mt-4">
        Le Club est ouvert aux étudiants du Master en tant que membres actifs, et à tous les
        étudiants de l'ISCAE en tant que participants aux activités organisées.
      </p>

      <h2 className="font-display text-xl font-semibold mt-8 mb-3">Notre mission</h2>
      <ul className="list-disc list-inside text-slate-700 space-y-1">
        <li>Rapprocher les étudiants des réalités du secteur public et territorial</li>
        <li>Créer des ponts entre le monde académique et les institutions publiques</li>
        <li>Donner un espace d'expression aux étudiants à travers l'écriture et la recherche</li>
      </ul>

      <h2 className="font-display text-xl font-semibold mt-8 mb-3">Bureau du Club <span className="text-sm font-normal text-slate-400">(exemple à personnaliser)</span></h2>
      <div className="flex flex-wrap gap-2">
        {roles.map((r) => (
          <span key={r} className="bg-slate-100 border border-slate-200 rounded-full px-3 py-1.5 text-sm">{r}</span>
        ))}
      </div>
    </div>
  );
}

/* ---------------- ACTIVITÉS ---------------- */
function Activites() {
  const cats = [
    { icon: Landmark, title: "Visites académiques", desc: "Visites d'institutions publiques et de collectivités territoriales.", examples: ["Visite au Ministère de l'Intérieur (exemple)", "Rencontre à la Région (exemple)"] },
    { icon: Users, title: "Rencontres avec des experts", desc: "Échanges avec des professionnels et chercheurs autour des thématiques du Master.", examples: ["Conférence sur la décentralisation (exemple)"] },
    { icon: MessageSquare, title: "Workshops", desc: "Ateliers pratiques pour développer des compétences appliquées.", examples: ["Atelier gestion de projet public (exemple)"] },
    { icon: BookOpen, title: "Formations", desc: "Sessions de formation complémentaires au programme académique.", examples: ["Formation en négociation territoriale (exemple)"] },
  ];
  return (
    <div>
      <h1 className="font-display text-3xl font-semibold mb-2">Nos activités</h1>
      <p className="text-slate-500 text-sm mb-8">Les exemples ci-dessous sont à remplacer par vos vraies activités réalisées.</p>
      <div className="grid sm:grid-cols-2 gap-5">
        {cats.map((c) => (
          <div key={c.title} className="border border-slate-200 bg-white rounded-lg p-5">
            <c.icon className="w-6 h-6 text-amber-700 mb-3" />
            <h3 className="font-display text-lg font-semibold">{c.title}</h3>
            <p className="text-slate-600 text-sm mt-1">{c.desc}</p>
            <ul className="mt-3 space-y-1">
              {c.examples.map((e) => (
                <li key={e} className="text-xs text-slate-500 flex items-center gap-1"><Calendar className="w-3 h-3" /> {e}</li>
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
    { icon: Facebook, name: "Facebook", handle: "@clubmpgt.iscae (exemple)" },
    { icon: Instagram, name: "Instagram", handle: "@clubmpgt.iscae (exemple)" },
    { icon: Linkedin, name: "LinkedIn", handle: "Club MPGT ISCAE (exemple)" },
  ];
  return (
    <div className="max-w-xl">
      <h1 className="font-display text-3xl font-semibold mb-2">Réseaux sociaux</h1>
      <p className="text-slate-500 text-sm mb-8">Remplacez ces liens par les vrais comptes du Club une fois créés.</p>
      <div className="space-y-3">
        {nets.map((n) => (
          <div key={n.name} className="flex items-center gap-3 border border-slate-200 bg-white rounded-lg p-4">
            <n.icon className="w-6 h-6 text-slate-700" />
            <div>
              <p className="font-semibold text-sm">{n.name}</p>
              <p className="text-xs text-slate-500">{n.handle}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- CONTRIBUER ---------------- */
function Contribuer({ addSubmission, showToast }) {
  const [form, setForm] = useState({ title: "", type: "article", authorName: "", authorEmail: "", content: "" });
  const [lastCode, setLastCode] = useState(null);
  const [sending, setSending] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title || !form.authorName || !form.authorEmail || !form.content) {
      showToast("Merci de remplir tous les champs.");
      return;
    }
    setSending(true);
    const now = new Date().toISOString();
    const sub = {
      id: crypto.randomUUID(),
      trackingCode: genCode(),
      title: form.title,
      type: form.type,
      authorName: form.authorName,
      authorEmail: form.authorEmail,
      content: form.content,
      status: "pending",
      adminComment: "",
      publishedContent: "",
      createdAt: now,
      updatedAt: now,
    };
    const ok = await addSubmission(sub);
    setSending(false);
    if (ok) {
      setLastCode(sub.trackingCode);
      setForm({ title: "", type: "article", authorName: "", authorEmail: "", content: "" });
    }
  }

  if (lastCode) {
    return (
      <div className="max-w-lg mx-auto text-center py-10">
        <CheckCircle2 className="w-12 h-12 text-teal-700 mx-auto mb-4" />
        <h1 className="font-display text-2xl font-semibold mb-2">Merci pour votre contribution !</h1>
        <p className="text-slate-600 mb-4">Elle a été transmise aux responsables du Club pour lecture.</p>
        <div className="bg-slate-900 text-white rounded-lg p-4 mb-4">
          <p className="text-xs text-stone-300 mb-1">Votre code de suivi</p>
          <p className="font-display text-2xl tracking-widest text-amber-400">{lastCode}</p>
        </div>
        <p className="text-sm text-slate-500">Conservez ce code : il vous permettra de suivre le statut de votre contribution dans "Suivre ma soumission".</p>
        <button onClick={() => setLastCode(null)} className="mt-6 text-sm underline text-slate-600">Proposer un autre contenu</button>
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
          <label className="text-sm font-semibold block mb-1">Votre texte</label>
          <textarea value={form.content} onChange={(e) => update("content", e.target.value)} rows={8} className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
        </div>
        <button disabled={sending} className="bg-amber-600 hover:bg-amber-700 text-white px-5 py-2.5 rounded-md text-sm font-semibold flex items-center gap-2 disabled:opacity-60">
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
  }

  async function resend() {
    await updateOne(found.id, { content: revision, status: "pending", adminComment: "" });
    showToast("Votre version corrigée a été renvoyée.");
    setFound({ ...found, content: revision, status: "pending", adminComment: "" });
  }

  return (
    <div className="max-w-lg">
      <h1 className="font-display text-3xl font-semibold mb-2">Suivre ma soumission</h1>
      <p className="text-slate-600 text-sm mb-6">Entrez le code reçu lors de l'envoi ainsi que votre email.</p>
      <div className="space-y-3">
        <input placeholder="Code (ex : MPGT-AB12CD)" value={code} onChange={(e) => setCode(e.target.value)} className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
        <input placeholder="Email utilisé lors de l'envoi" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
        <button onClick={search} className="bg-slate-900 text-white px-5 py-2.5 rounded-md text-sm font-semibold flex items-center gap-2">
          <Search className="w-4 h-4" /> Vérifier
        </button>
      </div>

      {found && (
        <div className="mt-6 border border-slate-200 bg-white rounded-lg p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="font-display font-semibold">{found.title}</p>
            <Badge status={found.status} />
          </div>
          {found.adminComment && (
            <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-sm text-amber-900 mt-2">
              <p className="font-semibold mb-1">Commentaire des responsables :</p>
              {found.adminComment}
            </div>
          )}
          {found.status === "needs_revision" && (
            <div className="mt-4">
              <label className="text-sm font-semibold block mb-1">Modifier votre texte</label>
              <textarea value={revision} onChange={(e) => setRevision(e.target.value)} rows={6} className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
              <button onClick={resend} className="mt-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-md text-sm font-semibold flex items-center gap-2">
                <RotateCcw className="w-4 h-4" /> Renvoyer la version corrigée
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
    const text = `${a.title} — par ${a.authorName}\n\n${a.publishedContent || a.content}`;
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
                <button onClick={() => share(a)} className="text-slate-500 hover:text-amber-700 shrink-0"><Share2 className="w-5 h-5" /></button>
              </div>
              <button onClick={() => setOpenId(openId === a.id ? null : a.id)} className="text-sm text-amber-700 font-semibold mt-3">
                {openId === a.id ? "Réduire" : "Lire l'article"}
              </button>
              {openId === a.id && (
                <p className="mt-3 text-slate-700 text-sm whitespace-pre-wrap leading-relaxed">{a.publishedContent || a.content}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- ADMIN ---------------- */
function Admin({ submissions, updateOne, showToast }) {
  const [authed, setAuthed] = useState(false);
  const [pwd, setPwd] = useState("");
  const [tab, setTab] = useState("pending");
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [commentingId, setCommentingId] = useState(null);
  const [commentText, setCommentText] = useState("");
  const [commentAction, setCommentAction] = useState(null);

  function tryLogin(e) {
    e.preventDefault();
    if (pwd === ADMIN_PASSWORD) setAuthed(true);
    else showToast("Mot de passe incorrect.");
  }

  function publishAsIs(s) {
    updateOne(s.id, { status: "published", publishedContent: s.content });
    showToast("Publié tel quel.");
  }

  function confirmEdit(s) {
    updateOne(s.id, { status: "published", publishedContent: editText });
    setEditingId(null);
    showToast("Publié avec modifications.");
  }

  function confirmComment(s) {
    updateOne(s.id, { status: commentAction, adminComment: commentText });
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
          <button className="w-full bg-slate-900 text-white px-4 py-2.5 rounded-md text-sm font-semibold">Se connecter</button>
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
          <button key={t.id} onClick={() => setTab(t.id)} className={`px-3 py-1.5 rounded-md text-sm font-semibold ${tab === t.id ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"}`}>
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

            {tab === "pending" && (
              <div className="flex flex-wrap gap-2 mt-4">
                <button onClick={() => publishAsIs(s)} className="text-xs font-semibold bg-teal-700 text-white px-3 py-1.5 rounded-md flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Publier tel quel
                </button>
                <button onClick={() => { setEditingId(s.id); setEditText(s.content); }} className="text-xs font-semibold bg-amber-600 text-white px-3 py-1.5 rounded-md flex items-center gap-1">
                  <Edit3 className="w-3.5 h-3.5" /> Publier modifié
                </button>
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
                  <button onClick={() => confirmComment(s)} className="text-xs font-semibold bg-slate-900 text-white px-3 py-1.5 rounded-md">Envoyer</button>
                  <button onClick={() => setCommentingId(null)} className="text-xs font-semibold text-slate-500">Annuler</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

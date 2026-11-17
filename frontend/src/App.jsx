import { createContext, useContext, useEffect, useId, useMemo, useRef, useState } from "react";
import { Link, Navigate, NavLink, Outlet, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity, AlertTriangle, ArrowLeft, ArrowRight, Check, ChevronDown, Clock3,
  Copy, FileImage, FileText, HeartHandshake, History, LogOut, Menu,
  Mic, Moon, Plus, Save, Send, Settings2, ShieldCheck, Sun, Trash2, Upload, Volume2,
  X,
} from "lucide-react";
import { api, errorMessage } from "./services/api";
import { languages, translate as t } from "./i18n/translations";

const AuthContext = createContext(null);
const languageName = (code) => languages.find((language) => language.code === code)?.name || "English";
const communicationMode = (mode) => mode === "voice" || mode === "both" ? "voice" : "text";
const speechVoices = [
  ["alloy", "Alloy"],
  ["ash", "Ash"],
  ["ballad", "Ballad"],
  ["coral", "Coral"],
  ["echo", "Echo"],
  ["fable", "Fable"],
  ["onyx", "Onyx"],
  ["nova", "Nova"],
  ["sage", "Sage"],
  ["shimmer", "Shimmer"],
  ["verse", "Verse"],
];

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    api.get("/api/auth/me")
      .then(({ data }) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setReady(true));
  }, []);
  const value = useMemo(() => ({ user, setUser, ready }), [user, ready]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

const useAuth = () => useContext(AuthContext);

function Brand({ light = false }) {
  return (
    <Link to="/" className={`flex items-center gap-3 no-underline ${light ? "text-white" : "text-inherit"}`}>
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#dbece5] text-[#315d50]">
        <HeartHandshake size={23} aria-hidden="true" />
      </span>
      <span>
        <span className="block text-lg font-bold tracking-tight">Arogya Vanni</span>
        <span className={`block text-xs ${light ? "text-white/70" : "muted"}`}>health, in your language</span>
      </span>
    </Link>
  );
}

function App() {
  const [dark, setDark] = useState(() => localStorage.getItem("av-theme") === "dark");
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("av-theme", dark ? "dark" : "light");
  }, [dark]);

  return (
    <AuthProvider>
      <div className="app-shell">
        <Routes>
          <Route path="/" element={<WelcomePage />} />
          <Route path="/signin" element={<AuthPage />} />
          <Route path="/signup" element={<AuthPage signup />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/app" element={<Protected><AppLayout dark={dark} setDark={setDark} /></Protected>}>
            <Route index element={null} />
            <Route path="onboarding" element={<OnboardingPage />} />
            <Route path="prescription" element={null} />
            <Route path="history" element={<HistoryPage />} />
            <Route path="settings" element={<SettingsPage dark={dark} setDark={setDark} />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </AuthProvider>
  );
}

function Protected({ children }) {
  const { user, ready } = useAuth();
  const location = useLocation();
  if (!ready) return <LoadingPage />;
  return user ? children : <Navigate to="/signin" replace state={{ from: location.pathname }} />;
}

function WelcomePage() {
  return (
    <main className="min-h-screen">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 md:px-10">
        <Brand />
        <div className="flex items-center gap-2">
          <Link className="focus-ring rounded-full px-4 py-2 text-sm font-semibold text-[#385a50] hover:bg-[#e8eee8]" to="/signin">Sign in</Link>
          <Link className="focus-ring rounded-full bg-[#315d50] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#244b40]" to="/signup">Create account</Link>
        </div>
      </header>
      <section className="mx-auto grid max-w-7xl items-center gap-12 px-5 pb-20 pt-10 md:grid-cols-[1.05fr_.95fr] md:px-10 md:pb-28 md:pt-20">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .45 }}>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-[#e6efe8] px-4 py-2 text-sm font-medium text-[#315d50]">
            <Activity size={16} aria-hidden="true" /> Thoughtful health information, made more accessible
          </div>
          <h1 className="max-w-2xl text-5xl font-semibold leading-[1.08] tracking-[-.045em] text-[#233b34] md:text-7xl">
            Health, in your language.
          </h1>
          <p className="muted mt-6 max-w-xl text-lg leading-8">
            Describe what you’re feeling, ask general health questions, and understand prescriptions, medicine packages, or medical reports in the language you prefer.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/signup" className="focus-ring inline-flex items-center gap-2 rounded-full bg-[#315d50] px-6 py-3.5 font-semibold text-white hover:bg-[#244b40]">
              Get started <ArrowRight size={18} />
            </Link>
            <Link to="/signin" className="focus-ring rounded-full border border-[#d6dfd8] bg-white px-6 py-3.5 font-semibold text-[#315d50] hover:bg-[#f1f5f0]">I already have an account</Link>
          </div>
          <p className="muted mt-7 text-sm">Kannada · English · हिन्दी · తెలుగు · தமிழ் · മലയാളം · मराठी · বাংলা</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, scale: .98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: .5, delay: .12 }} className="relative">
          <div className="surface relative mx-auto max-w-lg overflow-hidden p-6 shadow-[0_25px_70px_-45px_rgba(27,61,49,.35)] md:p-8">
            <div className="flex items-center gap-3 border-b border-[#e8eee8] pb-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e5f1eb] text-[#315d50]"><HeartHandshake size={20} /></span>
              <div><p className="font-semibold">A conversation that listens</p><p className="muted text-xs">English · Text + voice</p></div>
              <span className="ml-auto rounded-full bg-[#f1f6f1] px-3 py-1 text-xs text-[#517264]">Example</span>
            </div>
            <div className="space-y-4 py-6">
              <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-[#e6f0e9] px-4 py-3 text-sm leading-6 text-[#315043]">
                I’ve had a headache since this morning. What should I consider?
              </div>
              <div className="max-w-[90%] rounded-2xl rounded-bl-sm bg-[#f5f6f2] px-4 py-3 text-sm leading-6 text-[#33443d]">
                I can share general information. How severe is it, and have you noticed any other symptoms? If it came on suddenly or feels unusually severe, seek urgent medical care.
                <div className="mt-3 flex items-center gap-2 text-xs text-[#698478]"><Volume2 size={14} /> Example voice response</div>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-[#e1e8e1] px-4 py-3 text-sm text-[#88958e]">
              Type or speak in your preferred language… <span className="ml-auto flex h-8 w-8 items-center justify-center rounded-full bg-[#315d50] text-white"><Mic size={16} /></span>
            </div>
            <p className="muted mt-4 text-xs leading-5">Illustrative example only. AI responses can be inaccurate and are not medical advice.</p>
          </div>
          <div className="absolute -bottom-5 -left-2 hidden rounded-2xl border border-[#e4e9e3] bg-white px-4 py-3 text-sm shadow-lg sm:block">
            <span className="mr-2 inline-flex text-[#547c6b]"><ShieldCheck size={17} /></span> Your voice recording isn’t saved
          </div>
        </motion.div>
      </section>
      <section className="border-y border-[#e7ece6] bg-white/70">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-12 md:grid-cols-3 md:px-10">
          {[
            ["01", "Talk or type", "Share a concern in everyday language. Edit a voice transcription before it is sent."],
            ["02", "Understand", "Receive general information and clear follow-up questions, not a medical diagnosis."],
            ["03", "Choose how to listen", "Use text, voice, or both. Your response preference stays in your account."],
          ].map(([number, title, copy]) => <div key={number} className="flex gap-4">
            <span className="font-mono text-sm text-[#759287]">{number}</span>
            <div><h2 className="font-semibold">{title}</h2><p className="muted mt-2 text-sm leading-6">{copy}</p></div>
          </div>)}
        </div>
      </section>
      <footer className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-8 text-sm md:flex-row md:items-center md:justify-between md:px-10">
        <p className="muted max-w-3xl leading-6"><strong className="text-[#805c24]">Important:</strong> Arogya Vanni provides general information only. It does not diagnose or replace a qualified healthcare professional. For emergencies, contact local emergency services.</p>
        <Link className="focus-ring inline-flex items-center gap-2 font-semibold text-[#315d50]" to="/privacy"><ShieldCheck size={16} /> Privacy & safety</Link>
      </footer>
    </main>
  );
}

function AuthPage({ signup = false }) {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", password: "", confirm: "", language: "en", accepted: false });
  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.type === "checkbox" ? event.target.checked : event.target.value }));

  async function submit(event) {
    event.preventDefault();
    setError("");
    if (signup && form.password !== form.confirm) return setError("Passwords do not match.");
    if (form.password.length < 10) return setError("Use a password with at least 10 characters.");
    if (signup && !form.accepted) return setError("Please accept the privacy notice and medical disclaimer.");
    setBusy(true);
    try {
      const { data } = signup
        ? await api.post("/api/auth/signup", {
          full_name: form.full_name, email: form.email, password: form.password,
          language: form.language, accepted_privacy: form.accepted, accepted_disclaimer: form.accepted,
        })
        : await api.post("/api/auth/login", { email: form.email, password: form.password });
      setUser(data.user);
      navigate(signup ? "/app/onboarding" : location.state?.from || "/app", { replace: true });
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="surface w-full max-w-md p-6 shadow-sm sm:p-9">
        <Link to="/" className="mb-8 inline-flex"><Brand /></Link>
        <h1 className="text-3xl font-semibold tracking-tight">{signup ? "Create your account" : "Welcome back"}</h1>
        <p className="muted mt-2 text-sm">{signup ? "A private place to ask general health questions." : "Sign in to continue to your health companion."}</p>
        <form className="mt-7 space-y-4" onSubmit={submit}>
          {signup && <Field label="Full name" autoComplete="name" value={form.full_name} onChange={update("full_name")} required maxLength={100} />}
          <Field label="Email address" type="email" autoComplete="email" value={form.email} onChange={update("email")} required />
          <label className="block text-sm font-medium">
            Password
            <span className="relative mt-2 block">
              <input className="focus-ring w-full rounded-xl border border-[#d9e1da] px-4 py-3 pr-16" type={showPassword ? "text" : "password"} autoComplete={signup ? "new-password" : "current-password"} minLength={10} maxLength={128} value={form.password} onChange={update("password")} required />
              <button type="button" className="focus-ring absolute inset-y-0 right-3 text-xs font-semibold text-[#527669]" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? "Hide" : "Show"}</button>
            </span>
          </label>
          {signup && <label className="block text-sm font-medium">
            Confirm password
            <span className="relative mt-2 block">
              <input className="focus-ring w-full rounded-xl border border-[#d9e1da] px-4 py-3 pr-16" type={showConfirmPassword ? "text" : "password"} autoComplete="new-password" minLength={10} maxLength={128} value={form.confirm} onChange={update("confirm")} required />
              <button type="button" className="focus-ring absolute inset-y-0 right-3 text-xs font-semibold text-[#527669]" onClick={() => setShowConfirmPassword((value) => !value)} aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}>{showConfirmPassword ? "Hide" : "Show"}</button>
            </span>
          </label>}
          {signup && <LanguageSelect label="Preferred language" value={form.language} onChange={update("language")} />}
          {signup && <label className="flex items-start gap-3 text-sm leading-6">
            <input className="mt-1 h-4 w-4 accent-[#315d50]" type="checkbox" checked={form.accepted} onChange={update("accepted")} />
            <span>I have read and accept the <Link className="font-semibold text-[#315d50] underline" to="/privacy?from=signup" target="_blank" rel="noreferrer">privacy notice</Link> and medical disclaimer.</span>
          </label>}
          {error && <ErrorBanner message={error} />}
          <button className="focus-ring flex w-full items-center justify-center gap-2 rounded-xl bg-[#315d50] px-4 py-3.5 font-semibold text-white hover:bg-[#244b40] disabled:opacity-60" disabled={busy}>
            {busy ? "Please wait…" : signup ? "Create account" : "Sign in"} {!busy && <ArrowRight size={17} />}
          </button>
        </form>
        <p className="muted mt-6 text-center text-sm">
          {signup ? "Already have an account? " : "New to Arogya Vanni? "}
          <Link className="font-semibold text-[#315d50] underline" to={signup ? "/signin" : "/signup"}>{signup ? "Sign in" : "Create account"}</Link>
        </p>
      </div>
    </main>
  );
}

function AppLayout({ dark, setDark }) {
  const { user, setUser } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const language = user?.language || "en";
  const showAssistant = location.pathname === "/app" || location.pathname === "/app/";
  const showPrescription = location.pathname === "/app/prescription";
  const nav = [
    { to: "/app", label: t(language, "assistant"), icon: HeartHandshake, end: true },
    { to: "/app/prescription", label: t(language, "prescription"), icon: FileText },
    { to: "/app/history", label: t(language, "history"), icon: History },
    { to: "/app/settings", label: t(language, "settings"), icon: Settings2 },
  ];
  async function logout() {
    await api.post("/api/auth/logout").catch(() => {});
    setUser(null);
  }
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-[#e4e9e3] bg-[#f6f7f3]/95 backdrop-blur dark:border-[#31423d] dark:bg-[#121b19]/95">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-8">
          <Brand />
          <nav className="hidden items-center gap-1 md:flex" aria-label="Main navigation">
            {nav.map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end} className={({ isActive }) => `focus-ring flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium ${isActive ? "bg-[#e3eee6] text-[#315d50] dark:bg-[#293f38] dark:text-[#d1e8d8]" : "muted hover:bg-[#edf0eb]"}`}>
              <Icon size={16} aria-hidden="true" /> {label}
            </NavLink>)}
          </nav>
          <div className="flex items-center gap-2">
            <button type="button" className="focus-ring hidden h-10 w-10 items-center justify-center rounded-full border border-[#e0e6df] sm:flex" onClick={() => setDark(!dark)} aria-label={dark ? "Use light appearance" : "Use dark appearance"}>
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button type="button" className="focus-ring flex h-10 items-center gap-2 rounded-full border border-[#e0e6df] px-3 text-sm" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen}>
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#e3eee6] text-xs font-semibold text-[#315d50]">{user?.full_name?.[0]?.toUpperCase()}</span>
              <span className="hidden max-w-32 truncate sm:inline">{user?.full_name}</span>
              <ChevronDown size={15} />
            </button>
            {menuOpen && <div className="absolute right-4 top-[4.3rem] z-40 w-56 rounded-2xl border border-[#e1e7e0] bg-white p-2 shadow-xl dark:bg-[#1b2926]">
              <p className="truncate px-3 py-2 text-xs muted">{user?.email}</p>
              <Link to="/app/settings" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-[#f3f6f2]"><Settings2 size={16} /> {t(language, "settings")}</Link>
              <button className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-[#f3f6f2]" onClick={logout}><LogOut size={16} /> {t(language, "signout")}</button>
            </div>}
            <button type="button" onClick={() => setMenuOpen(!menuOpen)} className="focus-ring rounded-full p-2 md:hidden" aria-label="Open account menu"><Menu size={20} /></button>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-2 md:hidden" aria-label="Mobile navigation">
          {nav.map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end} className={({ isActive }) => `flex shrink-0 items-center gap-2 rounded-full px-3 py-2 text-xs font-medium ${isActive ? "bg-[#e3eee6] text-[#315d50]" : "muted"}`}><Icon size={15} />{label}</NavLink>)}
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-10">
        <div hidden={!showAssistant} aria-hidden={!showAssistant}>
          <AssistantPage active={showAssistant} />
        </div>
        <div hidden={!showPrescription} aria-hidden={!showPrescription}>
          <PrescriptionPage />
        </div>
        <div hidden={showPrescription || showAssistant} aria-hidden={showPrescription || showAssistant}>
          <Outlet />
        </div>
      </main>
      <footer className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 pb-8 text-xs muted md:px-8">
        <span>{t(language, "disclaimer")}</span><Link to="/privacy" className="font-medium underline">{t(language, "privacy")}</Link>
      </footer>
    </div>
  );
}

function Field({ label, type = "text", ...props }) {
  return <label className="block text-sm font-medium">{label}<input className="focus-ring mt-2 w-full rounded-xl border border-[#d9e1da] px-4 py-3" type={type} {...props} /></label>;
}

function LanguageSelect({ label, value, onChange }) {
  return <label className="block text-sm font-medium">{label}<select className="focus-ring mt-2 w-full rounded-xl border border-[#d9e1da] px-4 py-3" value={value} onChange={onChange}>
    {languages.map((language) => <option key={language.code} value={language.code}>
      {language.name === language.english ? language.name : `${language.name} · ${language.english}`}
    </option>)}
  </select></label>;
}

function ErrorBanner({ message }) {
  return <div role="alert" className="rounded-xl border border-[#efd0c9] bg-[#fff3ef] px-4 py-3 text-sm text-[#8b3e31]">{message}</div>;
}

function SuccessBanner({ children }) {
  return <div role="status" className="rounded-xl border border-[#d4e5d6] bg-[#edf6ee] px-4 py-3 text-sm text-[#315d50]">{children}</div>;
}

function LoadingPage() {
  return <main className="flex min-h-screen items-center justify-center"><div className="flex items-center gap-3 text-sm text-[#61776b]"><span className="h-5 w-5 animate-spin rounded-full border-2 border-[#b8cdbf] border-t-[#315d50]" /> Loading your account…</div></main>;
}

function OnboardingPage() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [language, setLanguage] = useState(user?.language || "en");
  const [mode, setMode] = useState(communicationMode(user?.response_mode));
  const [voice, setVoice] = useState(user?.voice || "alloy");
  const [error, setError] = useState("");
  async function save(event) {
    event.preventDefault();
    try {
      const preferences = { language, response_mode: mode, voice, save_history: user.save_history, autoplay: user.autoplay ?? true };
      await api.put("/api/preferences", preferences);
      setUser({ ...user, ...preferences });
      navigate("/app", { replace: true });
    } catch (requestError) { setError(errorMessage(requestError)); }
  }
  return <Panel title="Make this yours" subtitle="Choose your language and how you want to receive answers. You can change these settings anytime.">
    <form className="max-w-xl space-y-6" onSubmit={save}>
      <LanguageSelect label="Preferred language" value={language} onChange={(event) => setLanguage(event.target.value)} />
      <ModeSelector language={language} value={mode} onChange={setMode} />
      {mode === "voice" && <VoiceSelect language={language} value={voice} onChange={setVoice} />}
      {error && <ErrorBanner message={error} />}
      <button className="focus-ring rounded-xl bg-[#315d50] px-5 py-3 font-semibold text-white">Save and continue <ArrowRight className="ml-1 inline" size={17} /></button>
    </form>
  </Panel>;
}

function ModeSelector({ language, value, onChange }) {
  const modes = [
    ["text", t(language, "textChat"), t(language, "textChatDescription"), FileText],
    ["voice", t(language, "voiceChat"), t(language, "voiceChatDescription"), Mic],
  ];
  return <fieldset>
    <legend className="mb-3 text-sm font-semibold">{t(language, "chooseCommunication")}</legend>
    <div className="grid gap-3 sm:grid-cols-2">
      {modes.map(([id, label, detail, Icon]) => <label key={id} className={`focus-within:ring-2 focus-within:ring-[#8ab09c] cursor-pointer rounded-2xl border p-4 ${communicationMode(value) === id ? "border-[#81a58f] bg-[#edf5ee]" : "border-[#e1e7e0] bg-white"}`}>
        <input className="sr-only" type="radio" name="response-mode" value={id} checked={communicationMode(value) === id} onChange={() => onChange(id)} />
        <span className="flex items-center gap-2 font-semibold"><Icon size={17} aria-hidden="true" />{label}</span><span className="muted mt-1 block text-xs leading-5">{detail}</span>
      </label>)}
    </div>
  </fieldset>;
}

function VoiceSelect({ language, value, onChange }) {
  const [previewing, setPreviewing] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const audioRef = useRef(null);
  const previewUrlRef = useRef("");
  const previewRequestRef = useRef(0);
  const voiceSelectId = useId();

  function stopPreview() {
    previewRequestRef.current += 1;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = "";
    }
    setPreviewing(false);
    setPreviewLoading(false);
  }

  useEffect(() => () => {
    previewRequestRef.current += 1;
    audioRef.current?.pause();
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
  }, []);

  async function playPreview() {
    if (previewing) {
      stopPreview();
      return;
    }
    setPreviewError("");
    setPreviewLoading(true);
    const requestId = ++previewRequestRef.current;
    try {
      const { data } = await api.post(
        "/api/speech/synthesize",
        { text: t(language, "voicePreviewSample"), language, voice: value || "alloy" },
        { responseType: "blob" },
      );
      const url = URL.createObjectURL(data);
      if (requestId !== previewRequestRef.current) {
        URL.revokeObjectURL(url);
        return;
      }
      previewUrlRef.current = url;
      const audio = new Audio(url);
      audioRef.current = audio;
      setPreviewing(true);
      audio.onended = stopPreview;
      audio.onerror = () => {
        stopPreview();
        setPreviewError("The voice preview could not be played.");
      };
      await audio.play();
    } catch (requestError) {
      if (requestId === previewRequestRef.current) {
        stopPreview();
        setPreviewError(errorMessage(requestError));
      }
    } finally {
      if (requestId === previewRequestRef.current) setPreviewLoading(false);
    }
  }

  return <div>
    <label htmlFor={voiceSelectId} className="mb-2 block text-sm font-semibold">{t(language, "voiceSelection")}</label>
    <div className="flex gap-2">
      <select id={voiceSelectId} value={value || "alloy"} onChange={(event) => { stopPreview(); onChange(event.target.value); }} className="focus-ring min-w-0 flex-1 rounded-xl border border-[#d9e1da] bg-white px-3 py-2.5 text-sm">
        {speechVoices.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
      </select>
      <button type="button" onClick={playPreview} disabled={previewLoading} className="focus-ring inline-flex shrink-0 items-center gap-2 rounded-xl border border-[#d9e1da] px-3 py-2 text-sm font-semibold text-[#315d50] disabled:opacity-50">
        <Volume2 size={16} />{previewLoading ? t(language, "loading") : previewing ? t(language, "playingPreview") : t(language, "previewVoice")}
      </button>
    </div>
    <span className="muted mt-2 block text-xs leading-5">{t(language, "voicePrivacy")}</span>
    {previewError && <span role="alert" className="mt-2 block text-xs text-[#9a412d]">{previewError}</span>}
  </div>;
}
function AssistantPage({ active }) {
  const { user, setUser } = useAuth();
  const location = useLocation();
  const language = user?.language || "en";
  const [activeMode, setActiveMode] = useState(() => communicationMode(user?.response_mode));
  const [selectedVoice, setSelectedVoice] = useState(user?.voice || "alloy");
  const [messages, setMessages] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [conversationTitle, setConversationTitle] = useState("");
  const [savingConversation, setSavingConversation] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [pendingTranscript, setPendingTranscript] = useState("");
  const [audioUrls, setAudioUrls] = useState({});
  const [autoPlayTarget, setAutoPlayTarget] = useState(null);
  const [playingMessage, setPlayingMessage] = useState(null);
  const bottomRef = useRef(null);
  const recorderRef = useRef(null);
  const discardRecording = useRef(false);
  const audioElements = useRef(new Map());
  const conversationLoadRef = useRef(0);

  useEffect(() => {
    setActiveMode(communicationMode(user?.response_mode));
    setSelectedVoice(user?.voice || "alloy");
  }, [user?.response_mode, user?.voice]);
  async function saveLanguage(event) {
    const nextLanguage = event.target.value;
    const preferences = {
      language: nextLanguage,
      response_mode: activeMode,
      voice: selectedVoice,
      save_history: user.save_history,
      autoplay: user.autoplay !== false,
    };
    setError("");
    try {
      await api.put("/api/preferences", preferences);
      setUser({ ...user, ...preferences });
    } catch (requestError) {
      setError(errorMessage(requestError));
    }
  }

  useEffect(() => {
    if (active) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [active, messages, busy]);
  useEffect(() => {
    const requestId = ++conversationLoadRef.current;
    const selected = location.state?.conversationId;
    if (!selected) return;
    api.get(`/api/conversations/${selected}`)
      .then(({ data }) => {
        if (conversationLoadRef.current !== requestId) return;
        setConversationId(data.id);
        setConversationTitle(data.title || "");
        setMessages(data.messages || []);
      })
      .catch((requestError) => {
        if (conversationLoadRef.current === requestId) setError(errorMessage(requestError));
      });
    return () => {
      if (conversationLoadRef.current === requestId) conversationLoadRef.current += 1;
    };
  }, [location.state]);

  useEffect(() => {
    if (!autoPlayTarget) return;
    const player = audioElements.current.get(autoPlayTarget);
    if (player) {
      player.play().catch(() => setError("Audio playback was blocked by the browser. Use the play control to listen."));
      setAutoPlayTarget(null);
    }
  }, [autoPlayTarget, audioUrls, messages]);

  function newConversation() {
    setMessages([]);
    setConversationId(null);
    setConversationTitle("");
    setDraft("");
    setPendingTranscript("");
    setError("");
  }

  async function saveCommunicationMode(mode) {
    const previousMode = activeMode;
    if (mode === "text" && pendingTranscript) {
      setDraft(pendingTranscript);
      setPendingTranscript("");
    } else if (mode === "voice" && draft) {
      setPendingTranscript(draft);
      setDraft("");
    }
    if (recording && mode === "text") stopRecording(true);
    const preferences = {
      language,
      response_mode: mode,
      voice: selectedVoice,
      save_history: user.save_history,
      autoplay: user.autoplay !== false,
    };
    setActiveMode(mode);
    setError("");
    try {
      await api.put("/api/preferences", preferences);
      setUser({ ...user, ...preferences });
    } catch (requestError) {
      setActiveMode(previousMode);
      setDraft(draft);
      setPendingTranscript(pendingTranscript);
      setError(errorMessage(requestError));
    }
  }

  async function saveVoice(voice) {
    const preferences = {
      language,
      response_mode: activeMode,
      voice,
      save_history: user.save_history,
      autoplay: user.autoplay !== false,
    };
    setSelectedVoice(voice);
    setError("");
    try {
      await api.put("/api/preferences", preferences);
      setUser({ ...user, ...preferences });
    } catch (requestError) {
      setSelectedVoice(user.voice || "alloy");
      setError(errorMessage(requestError));
    }
  }

  async function saveConversationTitle() {
    const title = conversationTitle.trim();
    if (!conversationId || !title) return;
    try {
      await api.put(`/api/conversations/${conversationId}`, { title });
    } catch (requestError) {
      setError(errorMessage(requestError));
    }
  }

  async function saveCurrentConversation() {
    if (savingConversation || busy || conversationId || !messages.length) return;
    setSavingConversation(true);
    setError("");
    try {
      const { data } = await api.post("/api/conversations/save", {
        title: conversationTitle.trim() || t(language, "unnamedConversation"),
        messages: messages
          .filter((message) => message.role === "user" || message.role === "assistant")
          .slice(-100),
      });
      setConversationId(data.id);
      setConversationTitle(data.title);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setSavingConversation(false);
    }
  }

  async function submitMessage(event) {
    event?.preventDefault();
    const content = (activeMode === "voice" ? pendingTranscript : draft).trim();
    if (!content || busy) return;
    setBusy(true);
    setError("");
    setPendingTranscript("");
    setDraft("");
    const userMessage = { id: crypto.randomUUID(), role: "user", content, created_at: new Date().toISOString() };
    setMessages((current) => [...current, userMessage]);
    try {
      const context_messages = !user.save_history
        ? messages.filter((message) => message.role === "user" || message.role === "assistant").slice(-10).map(({ role, content: text }) => ({ role, content: text }))
        : [];
      const { data } = await api.post("/api/chat", {
        conversation_id: conversationId, message: content, language,
        conversation_title: conversationTitle.trim() || undefined,
        response_mode: activeMode, voice: selectedVoice, context_messages,
      });
      if (data.conversation_id) setConversationId(data.conversation_id);
      setConversationTitle(data.conversation_title || conversationTitle);
      const id = crypto.randomUUID();
      const assistantMessage = {
        id, role: "assistant", content: data.message, urgent: data.urgent,
        response_mode: data.audio_error ? "both" : activeMode,
        created_at: new Date().toISOString(),
      };
      setMessages((current) => [...current, assistantMessage]);
      if (data.audio_base64) {
        setAudioUrls((current) => ({ ...current, [id]: `data:audio/mpeg;base64,${data.audio_base64}` }));
        if (user.autoplay !== false && activeMode === "voice") setAutoPlayTarget(id);
      } else if (data.audio_error) setError(data.audio_error);
    } catch (requestError) {
      setError(errorMessage(requestError));
      setMessages((current) => current.filter((message) => message.id !== userMessage.id));
      if (activeMode === "voice") setPendingTranscript(content);
      else setDraft(content);
    } finally { setBusy(false); }
  }

  async function startRecording() {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];
      recorderRef.current = recorder;
      discardRecording.current = false;
      recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        setRecording(false);
        if (discardRecording.current) return;
        const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
        const extension = blob.type.includes("mp4") ? "m4a" : blob.type.includes("ogg") ? "ogg" : "webm";
        const file = new File([blob], `recording.${extension}`, { type: blob.type });
        const formData = new FormData();
        formData.append("file", file);
        setTranscribing(true);
        try {
          const { data } = await api.post(`/api/speech/transcribe?language=${language}`, formData, { headers: { "Content-Type": "multipart/form-data" } });
          setPendingTranscript(data.text);
        } catch (requestError) { setError(errorMessage(requestError)); }
        finally { setTranscribing(false); }
      };
      recorder.start();
      setRecording(true);
    } catch {
      setError("Microphone access is unavailable. Check your browser permission or type your message instead.");
    }
  }

  function stopRecording(discard = false) {
    if (!recorderRef.current || recorderRef.current.state === "inactive") return;
    discardRecording.current = discard;
    recorderRef.current.stop();
  }

  async function replayMessage(message) {
    if (playingMessage === message.id) return;
    setError("");
    const existingPlayer = audioElements.current.get(message.id);
    if (audioUrls[message.id] && existingPlayer) {
      existingPlayer.currentTime = 0;
      existingPlayer.play().catch(() => setError("Audio playback was blocked by the browser. Use the play control to listen."));
      return;
    }
    try {
      const response = await api.post("/api/speech/synthesize", { text: message.content, language, voice: selectedVoice }, { responseType: "blob" });
      const url = URL.createObjectURL(response.data);
      setAudioUrls((current) => ({ ...current, [message.id]: url }));
      setPlayingMessage(message.id);
      setTimeout(() => audioElements.current.get(message.id)?.play().catch(() => {}), 50);
    } catch (requestError) { setError(errorMessage(requestError)); }
  }

  function playerRef(id, element) {
    if (element) audioElements.current.set(id, element);
    else audioElements.current.delete(id);
  }

  return <div className="mx-auto max-w-4xl">
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div><div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[#e5f0e7] px-3 py-1.5 text-xs font-medium text-[#315d50]"><HeartHandshake size={14} /> {languageName(language)}</div>
        <h1 className="text-3xl font-semibold tracking-tight">{t(language, "assistant")}</h1>
        <p className="muted mt-2 max-w-xl text-sm leading-6">{t(language, "disclaimer")}</p></div>
      <div className="flex items-center gap-2">
        {messages.length > 0 && (conversationId
          ? <span role="status" className="inline-flex items-center gap-1 rounded-full bg-[#e8f1e9] px-3 py-2 text-xs font-semibold text-[#315d50]"><Check size={14} /> {t(language, "savedToHistory")}</span>
          : <button type="button" onClick={saveCurrentConversation} disabled={savingConversation || busy} className="focus-ring inline-flex items-center gap-2 rounded-full border border-[#d9e2d9] bg-white px-4 py-2.5 text-sm font-semibold text-[#315d50] disabled:opacity-50"><Save size={16} /> {savingConversation ? t(language, "loading") : t(language, "saveToHistory")}</button>)}
        <button type="button" onClick={newConversation} className="focus-ring inline-flex items-center gap-2 rounded-full border border-[#d9e2d9] bg-white px-4 py-2.5 text-sm font-semibold text-[#315d50]"><Plus size={16} /> {t(language, "newChat")}</button>
      </div>
    </div>
    <div className="mb-4 max-w-xl">
      <label htmlFor="conversation-name" className="mb-2 block text-sm font-semibold">{t(language, "conversationName")}</label>
      <input
        id="conversation-name"
        value={conversationTitle}
        onChange={(event) => setConversationTitle(event.target.value)}
        onBlur={saveConversationTitle}
        onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }}
        maxLength={100}
        placeholder={t(language, "unnamedConversation")}
        className="focus-ring w-full rounded-xl border border-[#d9e1da] bg-white px-4 py-2.5 text-sm"
        aria-describedby="conversation-name-hint"
      />
      <p id="conversation-name-hint" className="muted mt-2 text-xs leading-5">{t(language, "conversationNameHint")} {conversationId || user.save_history ? "Saved conversations appear in History with their start date and last active time." : "Use Save to History to keep this conversation."}</p>
    </div>
    <div className="mb-4 max-w-xl">
      <LanguageSelect label={t(language, "language")} value={language} onChange={saveLanguage} />
    </div>
    <div className="mb-4 grid gap-4">
      <ModeSelector language={language} value={activeMode} onChange={saveCommunicationMode} />
      {activeMode === "voice" && <VoiceSelect language={language} value={selectedVoice} onChange={saveVoice} />}
    </div>
    <div className="surface overflow-hidden">
      <div className="flex items-center justify-between border-b border-[#e7ece6] px-5 py-4">
        <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e5f0e7] text-[#315d50]"><HeartHandshake size={18} /></span><div><p className="text-sm font-semibold">{t(language, "assistant")}</p><p className="muted text-xs">{t(language, activeMode === "voice" ? "voiceChat" : "textChat")}</p></div></div>
        <Link to="/app/onboarding" className="focus-ring rounded-full p-2 muted" aria-label="Change language and response mode"><Settings2 size={18} /></Link>
      </div>
      <div className="max-h-[55vh] min-h-72 space-y-5 overflow-y-auto px-4 py-5 sm:px-6" aria-live="polite">
        {messages.length === 0 && <div className="flex min-h-56 flex-col items-center justify-center text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e8f1e9] text-[#4c7562]"><HeartHandshake size={26} /></span>
          <h2 className="mt-4 font-semibold">{t(language, "message")}</h2>
          <p className="muted mt-2 max-w-md text-sm leading-6">Ask about general health information or describe what you’re experiencing. Please don’t include your full name, address, or other identifying details.</p>
        </div>}
        <AnimatePresence initial={false}>
          {messages.map((message) => {
            return <motion.div key={message.id || `${message.role}-${message.created_at}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[88%] rounded-2xl px-4 py-3 ${message.role === "user" ? "rounded-br-md bg-[#e6f0e9] text-[#2c463b]" : "rounded-bl-md bg-[#f4f6f2] text-[#31443a]"}`}>
                {message.urgent && <div role="alert" className="mb-2 flex items-center gap-2 rounded-lg bg-[#fff0e8] px-3 py-2 text-xs font-semibold text-[#9a412d]"><AlertTriangle size={15} />{t(language, "emergency")}</div>}
                <p className="whitespace-pre-wrap text-sm leading-7">{message.content}</p>
                {message.role === "assistant" && <button type="button" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#547967] hover:text-[#315d50]" onClick={() => replayMessage(message)}><Volume2 size={14} /> Replay voice</button>}
                {message.role === "assistant" && audioUrls[message.id] && <div className="mt-3 flex items-center gap-2">
                  <audio ref={(element) => playerRef(message.id, element)} className="h-9 max-w-full" controls src={audioUrls[message.id]} aria-label="Assistant response audio" onPlay={() => setPlayingMessage(message.id)} onPause={() => setPlayingMessage(null)} />
                  <button type="button" className="focus-ring rounded-full p-2 text-[#527669]" aria-label="Stop playback" title="Stop playback" onClick={() => { const player = audioElements.current.get(message.id); if (player) { player.pause(); player.currentTime = 0; } }}><X size={15} /></button>
                </div>}
              </div>
            </motion.div>;
          })}
        </AnimatePresence>
        {busy && <div className="flex items-center gap-2 text-sm text-[#73867b]"><span className="h-4 w-4 animate-spin rounded-full border-2 border-[#b8cdbf] border-t-[#315d50]" /> Thinking carefully…</div>}
        <div ref={bottomRef} />
      </div>
      <div className="border-t border-[#e7ece6] p-4 sm:p-5">
        {error && <div className="mb-3"><ErrorBanner message={error} /></div>}
        <p className="muted mb-3 text-xs leading-5">{activeMode === "voice" ? t(language, "voiceSafety") : t(language, "unsupportedSpeech")}</p>
        {activeMode === "voice" && pendingTranscript && <div className="mb-3 rounded-xl border border-[#d9e5db] bg-[#f5f8f4] p-3">
          <label className="mb-2 block text-xs font-semibold text-[#557368]">{t(language, "useTranscript")}</label>
          <textarea className="focus-ring min-h-20 w-full resize-y rounded-lg border border-[#dbe3da] bg-white p-3 text-sm" value={pendingTranscript} onChange={(event) => setPendingTranscript(event.target.value)} aria-label="Edit recognized speech before sending" />
          <div className="mt-2 flex gap-2"><button type="button" onClick={submitMessage} className="rounded-full bg-[#315d50] px-4 py-2 text-sm font-semibold text-white">{t(language, "send")}</button><button type="button" className="rounded-full border px-4 py-2 text-sm" onClick={() => setPendingTranscript("")}>{t(language, "cancel")}</button></div>
        </div>}
        <form onSubmit={submitMessage} className="flex items-end gap-2">
          {activeMode === "text"
            ? <><label className="sr-only" htmlFor="chat-message">{t(language, "message")}</label>
              <textarea id="chat-message" className="focus-ring min-h-12 max-h-36 flex-1 resize-y rounded-2xl border border-[#d9e1da] bg-white px-4 py-3 text-sm leading-6" placeholder={`${t(language, "message")}…`} value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); submitMessage(); } }} maxLength={8000} /></>
            : <div className="flex min-h-12 flex-1 items-center rounded-2xl border border-[#d9e1da] bg-white px-4 py-3 text-sm leading-6 text-[#71817a]">{recording ? t(language, "recording") : transcribing ? t(language, "loading") : pendingTranscript ? t(language, "voiceReview") : t(language, "voicePrompt")}</div>}
          {activeMode === "voice" && (recording
            ? <button type="button" onClick={() => stopRecording(false)} className="focus-ring flex h-12 shrink-0 items-center gap-2 rounded-xl bg-[#a04436] px-4 font-semibold text-white" aria-label="Stop recording"><span className="h-2.5 w-2.5 animate-pulse rounded-full bg-white" />{t(language, "recording")}</button>
            : <button type="button" disabled={transcribing || busy} onClick={startRecording} className="focus-ring flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#d9e1da] text-[#315d50] disabled:opacity-50" aria-label={t(language, "record")} title={t(language, "record")}>{transcribing ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#b8cdbf] border-t-[#315d50]" /> : <Mic size={20} />}</button>)}
          <button type="submit" disabled={busy || (activeMode === "voice" ? !pendingTranscript.trim() : !draft.trim())} className="focus-ring flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#315d50] text-white disabled:opacity-45" aria-label={t(language, "send")}><Send size={18} /></button>
        </form>
        {activeMode === "voice" && recording && <button type="button" className="mt-2 text-xs font-semibold text-[#9a412d] underline" onClick={() => stopRecording(true)}>{t(language, "cancel")}</button>}
      </div>
    </div>
    <p className="muted mt-4 text-center text-xs leading-5">{t(language, "disclaimer")}</p>
  </div>;
}

function PrescriptionPage() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const historyAnalysis = location.state?.documentAnalysis;
  const [documentType, setDocumentType] = useState(historyAnalysis?.document_type || historyAnalysis?.result?.document_type || "prescription");
  const [documentLanguage, setDocumentLanguage] = useState(historyAnalysis?.language || user.language);
  const [documentVoice, setDocumentVoice] = useState(user.voice || "alloy");
  const [documentTitle, setDocumentTitle] = useState(historyAnalysis?.title || "Document analysis");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [result, setResult] = useState(() => historyAnalysis ? {
    ...historyAnalysis.result,
    history_id: historyAnalysis.id,
    history_saved: true,
  } : null);
  const [error, setError] = useState("");
  const [saveNotice, setSaveNotice] = useState(() => historyAnalysis ? t(user.language, "documentSaved") : "");
  const [savingAnalysis, setSavingAnalysis] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pronouncing, setPronouncing] = useState(null);
  const [speechLoading, setSpeechLoading] = useState(null);
  const [questionDraft, setQuestionDraft] = useState("");
  const [questionMessages, setQuestionMessages] = useState([]);
  const [questionBusy, setQuestionBusy] = useState(false);
  const [questionRecording, setQuestionRecording] = useState(false);
  const [questionTranscribing, setQuestionTranscribing] = useState(false);
  const [questionTranscriptReady, setQuestionTranscriptReady] = useState(false);
  const pronunciationRef = useRef(null);
  const pronunciationUrlRef = useRef("");
  const questionRecorderRef = useRef(null);
  const discardQuestionRecording = useRef(false);

  useEffect(() => {
    if (!file) { setPreview(""); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  useEffect(() => {
    setDocumentVoice(user.voice || "alloy");
  }, [user.voice]);
  useEffect(() => () => {
    discardQuestionRecording.current = true;
    if (questionRecorderRef.current?.state !== "inactive") questionRecorderRef.current?.stop();
  }, []);
  function selectFile(next) {
    setError("");
    setSaveNotice("");
    stopQuestionRecording(true);
    setResult(null);
    setQuestionMessages([]);
    setQuestionDraft("");
    setQuestionTranscriptReady(false);
    stopPronunciation();
    if (!next) return;
    const validTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!validTypes.includes(next.type)) return setError("Choose a JPEG, PNG, WebP image, or PDF.");
    if (next.size > 8 * 1024 * 1024) return setError("File exceeds the 8 MB limit.");
    setFile(next);
  }

  function stopPronunciation() {
    if (pronunciationRef.current) {
      pronunciationRef.current.pause();
      pronunciationRef.current = null;
    }
    if (pronunciationUrlRef.current) {
      URL.revokeObjectURL(pronunciationUrlRef.current);
      pronunciationUrlRef.current = "";
    }
    setPronouncing(null);
    setSpeechLoading(null);
  }

  async function speakText(speechText, playbackId) {
    if (pronouncing === playbackId) {
      stopPronunciation();
      return;
    }
    stopPronunciation();
    setError("");
    setSpeechLoading(playbackId);
    try {
      const { data } = await api.post(
        "/api/speech/synthesize",
        { text: speechText, language: documentLanguage, voice: documentVoice },
        { responseType: "blob" },
      );
      const url = URL.createObjectURL(data);
      const audio = new Audio(url);
      pronunciationRef.current = audio;
      pronunciationUrlRef.current = url;
      setSpeechLoading(null);
      setPronouncing(playbackId);
      audio.onended = stopPronunciation;
      audio.onerror = () => {
        stopPronunciation();
        setError("Audio could not be played.");
      };
      await audio.play();
    } catch (requestError) {
      stopPronunciation();
      setError(errorMessage(requestError));
    }
  }

  function speakMedicine(medicine, index) {
    const speechText = [
      medicine.name,
      medicine.strength && `${t(documentLanguage, "medicineStrength")}: ${medicine.strength}`,
      medicine.common_use && `${t(documentLanguage, "commonUse")}: ${medicine.common_use}`,
      medicine.possible_reasons && `${t(documentLanguage, "possibleReasons")}: ${medicine.possible_reasons}`,
      medicine.potential_benefit && `${t(documentLanguage, "potentialBenefit")}: ${medicine.potential_benefit}`,
      medicine.instructions && `${t(documentLanguage, "takeInstructions")}: ${medicine.instructions}`,
      medicine.instruction_meaning && `${t(documentLanguage, "instructionMeaning")}: ${medicine.instruction_meaning}`,
      medicine.duration && `${t(documentLanguage, "medicineDuration")}: ${medicine.duration}`,
      medicine.expiry_date && `${t(documentLanguage, "medicineExpiry")}: ${medicine.expiry_date}`,
      medicine.uncertainties && `${t(documentLanguage, "confirmDetails")}: ${medicine.uncertainties}`,
    ].filter(Boolean).join(". ");
    return speakText(speechText, `medicine-${index}`);
  }

  async function processDocument(event) {
    event.preventDefault();
    if (!file || busy) return;
    setBusy(true);
    setError("");
    setSaveNotice("");
    setResult(null);
    setQuestionMessages([]);
    setQuestionDraft("");
    setQuestionTranscriptReady(false);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", documentTitle);
    try {
      const { data } = await api.post(
        `/api/documents/explain?language=${documentLanguage}&document_type=${documentType}`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      setResult(data);
      setSaveNotice(data.is_medical_document === false ? "" : t(user.language, data.history_saved ? "documentSaved" : "documentNotSaved"));
    } catch (requestError) { setError(errorMessage(requestError)); }
    finally { setBusy(false); }
  }

  async function saveDocumentAnalysis() {
    if (!result || result.is_medical_document === false || result.history_saved || savingAnalysis) return;
    setSavingAnalysis(true);
    setError("");
    try {
      const { data } = await api.post("/api/document-analyses/save", {
        title: documentTitle.trim() || "Document analysis",
        document_type: result.document_type,
        language: documentLanguage,
        result,
      });
      setResult((current) => current && ({
        ...current,
        history_id: data.id,
        history_saved: true,
      }));
      setSaveNotice(t(user.language, "documentSaved"));
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setSavingAnalysis(false);
    }
  }

  async function submitDocumentQuestion(event) {
    event.preventDefault();
    const question = questionDraft.trim();
    if (!result || !question || questionBusy) return;
    const userMessage = { id: crypto.randomUUID(), role: "user", content: question };
    const previousMessages = questionMessages.map(({ role, content }) => ({ role, content }));
    setQuestionMessages((current) => [...current, userMessage]);
    setQuestionDraft("");
    setQuestionTranscriptReady(false);
    setQuestionBusy(true);
    setError("");
    try {
      const { data } = await api.post("/api/documents/ask", {
        document_context: JSON.stringify(result),
        question,
        language: documentLanguage,
        context_messages: previousMessages.slice(-10),
      });
      setQuestionMessages((current) => [...current, {
        id: crypto.randomUUID(), role: "assistant", content: data.message, urgent: data.urgent,
      }]);
    } catch (requestError) {
      setQuestionMessages((current) => current.filter((message) => message.id !== userMessage.id));
      setQuestionDraft(question);
      setError(errorMessage(requestError));
    } finally { setQuestionBusy(false); }
  }

  async function startQuestionRecording() {
    setError("");
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const supportedTypes = ["audio/webm", "audio/ogg", "audio/mp4"];
      const mimeType = supportedTypes.find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const chunks = [];
      questionRecorderRef.current = recorder;
      discardQuestionRecording.current = false;
      recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        setQuestionRecording(false);
        if (discardQuestionRecording.current) return;
        const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
        const extension = blob.type.includes("mp4") ? "m4a" : blob.type.includes("ogg") ? "ogg" : "webm";
        const formData = new FormData();
        formData.append("file", new File([blob], `question.${extension}`, { type: blob.type }));
        setQuestionTranscribing(true);
        try {
          const { data } = await api.post(`/api/speech/transcribe?language=${documentLanguage}`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
          setQuestionDraft(data.text);
          setQuestionTranscriptReady(true);
        } catch (requestError) { setError(errorMessage(requestError)); }
        finally { setQuestionTranscribing(false); }
      };
      recorder.start();
      setQuestionRecording(true);
    } catch {
      stream?.getTracks().forEach((track) => track.stop());
      setError("Microphone access is unavailable. Check your browser permission or type your question instead.");
    }
  }

  function stopQuestionRecording(discard = false) {
    if (!questionRecorderRef.current || questionRecorderRef.current.state === "inactive") return;
    discardQuestionRecording.current = discard;
    questionRecorderRef.current.stop();
  }

  async function copyExplanation() {
    try {
      await navigator.clipboard.writeText(result.explanation);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch { setError("Clipboard access was denied by your browser."); }
  }

  function startNewDocumentAnalysis() {
    navigate("/app/prescription", { replace: true, state: null });
    stopPronunciation();
    stopQuestionRecording(true);
    setFile(null);
    setResult(null);
    setQuestionMessages([]);
    setQuestionDraft("");
    setQuestionTranscriptReady(false);
    setSaveNotice("");
    setError("");
    setCopied(false);
    setDocumentTitle("Document analysis");
  }

  return <div className={`mx-auto ${result ? "max-w-6xl" : "max-w-4xl"}`}>
    <PageHeading eyebrow={languageName(user.language)} title={t(user.language, "documentGuide")} subtitle={result ? t(user.language, "documentResultsReady") : "Upload a prescription, medical report, or medicine package for a plain-language explanation in your preferred language. Unclear details are never filled in."} />
    {result && <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#dce7dd] bg-white px-4 py-3 sm:px-5">
      <div>
        <p className="text-sm font-semibold text-[#31443a]">{documentTitle}</p>
        <p className="muted mt-1 text-xs">{t(user.language, documentType === "prescription" ? "prescriptionType" : documentType === "tablet_package" ? "tabletPackage" : "medicalReport")} · {languageName(documentLanguage)}</p>
      </div>
      <button type="button" onClick={startNewDocumentAnalysis} className="focus-ring inline-flex items-center gap-2 rounded-full bg-[#315d50] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#244b40]"><Plus size={16} /> {t(user.language, "newDocumentAnalysis")}</button>
    </div>}
    <div className={`gap-6 ${result ? "" : "grid lg:grid-cols-[.9fr_1.1fr]"}`}>
      {!result && <form className="surface p-5 sm:p-7" onSubmit={processDocument}>
        <label className="mb-3 block text-sm font-semibold">{t(user.language, "chooseDocumentType")}</label>
        <div className="mb-4 grid grid-cols-3 gap-2" role="group" aria-label={t(user.language, "chooseDocumentType")}>
          {[["prescription", t(user.language, "prescriptionType")], ["tablet_package", t(user.language, "tabletPackage")], ["medical_report", t(user.language, "medicalReport")]].map(([type, label]) => (
            <button
              key={type}
              type="button"
              disabled={busy || questionBusy}
              onClick={() => {
                stopQuestionRecording(true);
                setDocumentType(type);
                setResult(null);
                setQuestionMessages([]);
                setQuestionDraft("");
                setError("");
                setSaveNotice("");
                stopPronunciation();
              }}
              aria-pressed={documentType === type}
              className={`focus-ring rounded-xl border px-3 py-2.5 text-sm font-semibold ${documentType === type ? "border-[#315d50] bg-[#e8f1e9] text-[#315d50]" : "border-[#d9e2d9] text-[#65776d]"}`}
            >
              {label}
            </button>
          ))}
        </div>
        {documentType === "tablet_package" && <p className="muted mb-4 rounded-xl bg-[#f2f5ef] p-3 text-xs leading-5">{t(user.language, "tabletPackageHint")}</p>}
        <label htmlFor="document-language" className="mb-2 block text-sm font-semibold">{t(user.language, "explainInLanguage")}</label>
        <select
          id="document-language"
          value={documentLanguage}
          disabled={busy || questionBusy}
          onChange={(event) => {
            stopQuestionRecording(true);
            setDocumentLanguage(event.target.value);
            setResult(null);
            setQuestionMessages([]);
            setQuestionDraft("");
            setError("");
            setSaveNotice("");
            stopPronunciation();
          }}
          className="focus-ring mb-4 w-full rounded-xl border border-[#d9e2d9] bg-white px-3 py-3 text-sm text-[#36463d]"
        >
          {languages.map((language) => <option key={language.code} value={language.code}>{language.name} · {language.english}</option>)}
        </select>
        <div className="mb-4">
          <label htmlFor="document-analysis-title" className="mb-2 block text-sm font-semibold">{t(user.language, "documentAnalysisName")}</label>
          <input
            id="document-analysis-title"
            type="text"
            maxLength={100}
            required
            value={documentTitle}
            disabled={busy}
            onChange={(event) => setDocumentTitle(event.target.value)}
            className="focus-ring w-full rounded-xl border border-[#d9e2d9] bg-white px-3 py-3 text-sm text-[#36463d]"
          />
          <p className="muted mt-1 text-xs">{t(user.language, "documentHistoryConsent")}</p>
        </div>
        <div className="mb-5">
          <VoiceSelect language={documentLanguage} value={documentVoice} onChange={setDocumentVoice} />
        </div>
        <label className="focus-within:ring-2 focus-within:ring-[#8ab09c] flex min-h-52 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#cbd9ce] bg-[#f7f9f5] p-5 text-center">
          {file?.type === "application/pdf" && preview ? <iframe title="Selected medical document PDF preview" src={preview} className="h-64 w-full rounded-xl border-0" />
            : preview ? <img src={preview} alt="Selected medical document preview" className="max-h-64 max-w-full rounded-xl object-contain" />
            : file?.type === "application/pdf" ? <FileText size={42} className="text-[#6e8d7c]" aria-hidden="true" />
              : <FileImage size={42} className="text-[#6e8d7c]" aria-hidden="true" />}
          <span className="mt-3 text-sm font-semibold">{file ? file.name : t(user.language, "upload")}</span>
          <span className="muted mt-1 text-xs">JPEG, PNG, WebP or PDF · up to 8 MB</span>
          <input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" capture="environment" disabled={busy || questionBusy} onChange={(event) => selectFile(event.target.files?.[0])} />
        </label>
        {file && <div className="mt-3 flex items-center justify-between text-xs muted"><span>{(file.size / 1024 / 1024).toFixed(2)} MB · removed from memory after processing</span><button type="button" disabled={busy || questionBusy} onClick={() => { stopPronunciation(); stopQuestionRecording(true); setFile(null); setResult(null); setQuestionMessages([]); setQuestionDraft(""); setQuestionTranscriptReady(false); }} className="inline-flex items-center gap-1 font-semibold text-[#9a493b] disabled:opacity-50"><X size={14} /> Remove</button></div>}
        <div className="mt-5 rounded-xl bg-[#f2f5ef] p-3 text-xs leading-5 text-[#61756a]"><ShieldCheck size={15} className="mr-1 inline" />{t(user.language, "documentHistoryConsent")} Don’t upload documents for anyone else without permission.</div>
        {error && <div className="mt-4"><ErrorBanner message={error} /></div>}
        <button type="submit" disabled={!file || busy || questionBusy} className="focus-ring mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#315d50] px-4 py-3 font-semibold text-white disabled:opacity-50">
          {busy ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/50 border-t-white" /> {t(user.language, "processingDocument")}</> : <><Upload size={17} /> {t(user.language, "explain")}</>}
        </button>
      </form>}
      <section className={`surface min-h-72 p-5 ${result ? "sm:p-8" : "sm:p-7"}`} aria-live="polite">
        {result && error && <div className="mb-4"><ErrorBanner message={error} /></div>}
        {!result ? <div className="flex h-full flex-col items-center justify-center text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e8f1e9] text-[#4c7562]"><FileText size={25} /></span>
          <h2 className="mt-4 font-semibold">Understand your document</h2>
          <p className="muted mt-2 max-w-sm text-sm leading-6">Prescription medicines, medicine packages, or medical report findings will be explained separately. Confirm unclear information with your clinician or pharmacist.</p>
        </div> : result.is_medical_document === false ? <div role="alert" className="rounded-2xl border border-[#e9ddc9] bg-[#fcf8f0] p-5 sm:p-7">
          <div className="flex items-start gap-3 text-[#745a32]">
            <AlertTriangle size={20} className="mt-0.5 shrink-0" />
            <div>
              <h2 className="font-semibold">{t(user.language, "notMedicalDocument")}</h2>
              <p className="mt-1 text-sm leading-6">{t(user.language, "uploadMedicalDocument")}</p>
            </div>
          </div>
          <p className="mt-4 border-t border-[#e9ddc9] pt-4 text-sm leading-6">{result.explanation}</p>
        </div> : <div className="space-y-5">
          {saveNotice && <div role="status" className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-xs leading-5 ${result.history_saved ? "border-[#cfe0d1] bg-[#f0f7f0] text-[#315d50]" : "border-[#e7ddc5] bg-[#fff9eb] text-[#745a32]"}`}>
            <span>{saveNotice}</span>
            {!result.history_saved && <button type="button" onClick={saveDocumentAnalysis} disabled={savingAnalysis} className="focus-ring inline-flex items-center gap-1.5 rounded-full bg-[#315d50] px-3 py-2 font-semibold text-white disabled:opacity-50"><Save size={14} /> {savingAnalysis ? t(user.language, "loading") : t(user.language, "saveToHistory")}</button>}
          </div>}
          <section className="rounded-2xl border border-[#e1e9e1] bg-[#f8faf7] p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-sm font-semibold"><HeartHandshake size={17} className="text-[#688c78]" />{t(user.language, "documentSummary")}</h2>
              <button
                type="button"
                disabled={speechLoading !== null}
                onClick={() => speakText(result.explanation, "summary")}
                className="focus-ring inline-flex items-center gap-2 rounded-full border border-[#d9e2d9] px-3 py-2 text-xs font-semibold text-[#527669] disabled:opacity-50"
                aria-label={`${pronouncing === "summary" ? t(documentLanguage, "stopSummary") : t(documentLanguage, "listenSummary")}`}
              >
                {speechLoading === "summary"
                  ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#b8cdbf] border-t-[#315d50]" />
                  : pronouncing === "summary" ? <X size={15} /> : <Mic size={15} />}
                {pronouncing === "summary" ? t(documentLanguage, "stopSummary") : speechLoading === "summary" ? t(user.language, "loading") : t(documentLanguage, "listenSummary")}
              </button>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7">{result.explanation}</p>
            <button type="button" onClick={copyExplanation} className="focus-ring mt-3 inline-flex items-center gap-1 rounded-full border border-[#d9e2d9] px-3 py-2 text-xs font-semibold text-[#527669]"><Copy size={14} /> {copied ? "Copied" : "Copy explanation"}</button>
          </section>
          <details className="rounded-xl border border-[#e1e9e1] bg-white">
            <summary className="focus-ring cursor-pointer px-4 py-3 text-sm font-semibold">{t(user.language, "originalDocumentText")}</summary>
            <pre className="whitespace-pre-wrap border-t border-[#e7ece6] px-4 py-3 font-sans text-sm leading-6 text-[#36463d]">{result.extracted_text}</pre>
          </details>
          {["prescription", "tablet_package"].includes(result.document_type) && <>
            <section>
              <h2 className="text-base font-semibold">{t(user.language, "medicineCount")}: {result.medicine_count ?? result.medicines?.length ?? 0}</h2>
              {result.medicines?.length ? <div className="mt-3 grid gap-4 md:grid-cols-2">
                {result.medicines.map((medicine, index) => (
                  <article key={`${medicine.name}-${index}`} className="rounded-2xl border border-[#dce7dd] bg-white p-4 shadow-sm sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-semibold">{index + 1}. {medicine.name}</h3>
                        {medicine.strength && <p className="muted mt-1 text-sm">{t(user.language, "medicineStrength")}: {medicine.strength}</p>}
                      </div>
                      <button
                        type="button"
                        disabled={speechLoading !== null}
                        onClick={() => speakMedicine(medicine, index)}
                        className="focus-ring inline-flex items-center gap-2 rounded-full border border-[#d9e2d9] px-3 py-2 text-xs font-semibold text-[#527669] disabled:opacity-50"
                        aria-label={`${t(user.language, "pronounceMedicine")}: ${medicine.name}`}
                      >{speechLoading === `medicine-${index}`
                        ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#b8cdbf] border-t-[#315d50]" />
                        : <Mic size={15} />}
                        {pronouncing === `medicine-${index}` ? t(documentLanguage, "stopMedicine") : speechLoading === `medicine-${index}` ? t(user.language, "loading") : t(documentLanguage, "listenMedicine")}
                      </button>
                    </div>
                    <div className="mt-4 rounded-xl border-2 border-[#b8d5c1] bg-[#e8f1e9] p-4 shadow-sm">
                      <p className="text-sm font-bold text-[#315d50]">{t(user.language, result.document_type === "prescription" ? "whenToTake" : "takeInstructions")}</p>
                      <p className="mt-2 text-base font-semibold leading-7 text-[#233b34]">{medicine.instructions || t(user.language, "notSpecified")}</p>
                      {medicine.instruction_meaning && <p className="mt-2 border-t border-[#cbdccf] pt-2 text-sm leading-6 text-[#52685b]">{medicine.instruction_meaning}</p>}
                    </div>
                    <details className="mt-3 rounded-xl border border-[#e1e9e1]">
                      <summary className="focus-ring cursor-pointer px-4 py-3 text-sm font-semibold">{t(user.language, "moreMedicineDetails")}</summary>
                      <dl className="grid gap-3 border-t border-[#e7ece6] p-3 text-sm leading-6 sm:grid-cols-2">
                      <div className="rounded-xl bg-[#f6f8f4] p-3"><dt className="font-semibold">{t(user.language, "commonUse")}</dt><dd className="muted mt-1">{medicine.common_use || t(user.language, "notSpecified")}</dd></div>
                      <div className="rounded-xl bg-[#f6f8f4] p-3"><dt className="font-semibold">{t(user.language, "possibleReasons")}</dt><dd className="muted mt-1">{medicine.possible_reasons || t(user.language, "notSpecified")}</dd></div>
                      <div className="rounded-xl bg-[#f6f8f4] p-3"><dt className="font-semibold">{t(user.language, "potentialBenefit")}</dt><dd className="muted mt-1">{medicine.potential_benefit || t(user.language, "notSpecified")}</dd></div>
                      <div className="rounded-xl bg-[#f6f8f4] p-3"><dt className="font-semibold">{t(user.language, "medicineDuration")}</dt><dd className="muted mt-1">{medicine.duration || t(user.language, "notSpecified")}</dd></div>
                      {result.document_type === "tablet_package" && <div className="rounded-xl bg-[#f6f8f4] p-3"><dt className="font-semibold">{t(user.language, "medicineExpiry")}</dt><dd className="muted mt-1">{medicine.expiry_date || t(user.language, "notSpecified")}</dd></div>}
                      {medicine.uncertainties && <div className="rounded-xl bg-[#fff7e9] p-3 sm:col-span-2"><dt className="font-semibold">{t(user.language, "confirmDetails")}</dt><dd className="mt-1 text-[#8b5a25]">{medicine.uncertainties}</dd></div>}
                      </dl>
                    </details>
                  </article>
                ))}
              </div> : <p className="muted mt-2 text-sm">{t(user.language, "noMedicines")}</p>}
            </section>
          </>}
          {result.document_type === "medical_report" && <section>
            <h2 className="text-sm font-semibold">{t(user.language, "reportFindings")}</h2>
            {result.findings?.length ? <div className="mt-3 grid gap-4 md:grid-cols-2">
              {result.findings.map((finding, index) => (
                <article key={`${finding.name}-${index}`} className="rounded-xl border border-[#e1e9e1] bg-[#fbfcf9] p-4">
                  <h3 className="font-semibold">{finding.name || t(user.language, "reportFindings")}</h3>
                  <dl className="mt-2 space-y-2 text-sm leading-6">
                    {finding.value && <div><dt className="font-semibold">{t(user.language, "findingValue")}</dt><dd className="muted">{finding.value}</dd></div>}
                    {finding.reference_range && <div><dt className="font-semibold">{t(user.language, "referenceRange")}</dt><dd className="muted">{finding.reference_range}</dd></div>}
                    {finding.status && <div><dt className="font-semibold">{t(user.language, "status")}</dt><dd className="muted">{finding.status}</dd></div>}
                    {finding.plain_meaning && <div><dt className="font-semibold">{t(user.language, "plainMeaning")}</dt><dd className="muted">{finding.plain_meaning}</dd></div>}
                  </dl>
                </article>
              ))}
            </div> : <p className="muted mt-2 text-sm">{t(user.language, "noFindings")}</p>}
            {result.follow_up && <p className="mt-4 rounded-xl bg-[#f2f5ef] p-4 text-sm leading-6"><strong>{t(user.language, "reportFollowUp")}: </strong>{result.follow_up}</p>}
          </section>}
          <section className="rounded-2xl border border-[#dce7dd] bg-white p-4 sm:p-5">
            <h2 className="text-base font-semibold">{t(user.language, "askAboutDocument")}</h2>
            <p className="muted mt-1 text-xs leading-5">{t(user.language, "documentQuestionSafety")}</p>
            {questionMessages.length > 0 && <div className="mt-4 space-y-3" aria-live="polite">
              {questionMessages.map((message) => <article
                key={message.id}
                className={`rounded-xl p-3 text-sm leading-6 ${message.role === "user" ? "ml-6 bg-[#e8f1e9]" : "mr-6 bg-[#f5f6f2]"}`}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
                {message.role === "assistant" && <button
                  type="button"
                  disabled={speechLoading !== null}
                  onClick={() => speakText(message.content, `question-${message.id}`)}
                  className="focus-ring mt-2 inline-flex items-center gap-1 rounded-full border border-[#d9e2d9] px-2.5 py-1 text-xs font-semibold text-[#527669] disabled:opacity-50"
                  aria-label={pronouncing === `question-${message.id}` ? t(user.language, "stopQuestionAudio") : t(user.language, "answerQuestionAudio")}
                >
                  {pronouncing === `question-${message.id}` ? <X size={13} /> : <Volume2 size={13} />}
                  {pronouncing === `question-${message.id}` ? t(user.language, "stopQuestionAudio") : t(user.language, "answerQuestionAudio")}
                </button>}
              </article>)}
            </div>}
            <form className="mt-4" onSubmit={submitDocumentQuestion}>
              <label htmlFor="document-question" className="sr-only">{t(user.language, "questionPlaceholder")}</label>
              <textarea
                id="document-question"
                rows={3}
                maxLength={4000}
                value={questionDraft}
                onChange={(event) => { setQuestionDraft(event.target.value); setQuestionTranscriptReady(false); }}
                placeholder={questionTranscribing ? t(user.language, "transcribingQuestion") : t(user.language, "questionPlaceholder")}
                disabled={questionBusy || questionTranscribing}
                className="focus-ring w-full resize-y rounded-xl border border-[#d9e1da] bg-white px-4 py-3 text-sm leading-6"
              />
              <div className="mt-2 flex flex-wrap justify-end gap-2">
                {questionRecording
                  ? <button type="button" onClick={() => stopQuestionRecording()} className="focus-ring inline-flex items-center gap-2 rounded-xl border border-[#e7c9c2] px-3 py-2 text-sm font-semibold text-[#9a493b]"><span className="h-2 w-2 animate-pulse rounded-full bg-[#a04436]" />{t(user.language, "stopQuestionRecording")}</button>
                  : <button type="button" onClick={startQuestionRecording} disabled={questionBusy || questionTranscribing} className="focus-ring inline-flex items-center gap-2 rounded-xl border border-[#d9e2d9] px-3 py-2 text-sm font-semibold text-[#315d50] disabled:opacity-50"><Mic size={16} />{t(user.language, "speakQuestion")}</button>}
                <button type="submit" disabled={!questionDraft.trim() || questionBusy || questionTranscribing || questionRecording} className="focus-ring inline-flex items-center gap-2 rounded-xl bg-[#315d50] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                  {questionBusy ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/50 border-t-white" /> : <Send size={15} />}
                  {t(user.language, "askQuestion")}
                </button>
              </div>
              {questionTranscriptReady && <p className="muted mt-2 text-xs">{t(user.language, "reviewQuestionTranscript")}</p>}
            </form>
          </section>
        </div>}
      </section>
    </div>
    <div className="mt-6 rounded-2xl border border-[#e9ddc9] bg-[#fcf8f0] p-4 text-sm leading-6 text-[#745a32]"><AlertTriangle size={16} className="mr-2 inline" />{t(user.language, "explanationSafety")} Never start, stop, or change a medicine based only on an AI explanation.</div>
  </div>;
}

function HistoryPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("conversations");
  const [items, setItems] = useState([]);
  const [analyses, setAnalyses] = useState([]);
  const [historyVoice, setHistoryVoice] = useState(user.voice || "alloy");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  async function load() {
    setLoading(true);
    try {
      const [conversationResponse, analysisResponse] = await Promise.all([
        api.get("/api/conversations"),
        api.get("/api/document-analyses"),
      ]);
      setItems(conversationResponse.data.conversations);
      setAnalyses(analysisResponse.data.analyses);
    }
    catch (requestError) { setError(errorMessage(requestError)); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);
  async function removeConversation(id) {
    if (!window.confirm("Delete this conversation? This cannot be undone.")) return;
    try { await api.delete(`/api/conversations/${id}`); setItems((current) => current.filter((item) => item.id !== id)); }
    catch (requestError) { setError(errorMessage(requestError)); }
  }
  async function renameConversation(item) {
    const title = window.prompt("Choose a new conversation title:", item.title);
    if (!title?.trim()) return;
    try { await api.put(`/api/conversations/${item.id}`, { title }); setItems((current) => current.map((row) => row.id === item.id ? { ...row, title } : row)); }
    catch (requestError) { setError(errorMessage(requestError)); }
  }
  async function removeAnalysis(item) {
    if (!window.confirm("Delete this document analysis and its saved explanation? This cannot be undone.")) return;
    try {
      await api.delete(`/api/document-analyses/${item.id}`);
      setAnalyses((current) => current.filter((row) => row.id !== item.id));
    } catch (requestError) { setError(errorMessage(requestError)); }
  }
  async function renameAnalysis(item) {
    const title = window.prompt("Choose a name for this document analysis:", item.title);
    if (!title?.trim()) return;
    try {
      await api.put(`/api/document-analyses/${item.id}`, { title });
      setAnalyses((current) => current.map((row) => row.id === item.id ? { ...row, title } : row));
    } catch (requestError) { setError(errorMessage(requestError)); }
  }
  async function deleteAllConversations() {
    if (!window.confirm("Delete all saved conversations? This cannot be undone.")) return;
    try { await api.delete("/api/conversations"); setItems([]); }
    catch (requestError) { setError(errorMessage(requestError)); }
  }
  async function deleteAllAnalyses() {
    if (!window.confirm("Delete all saved document analyses? This cannot be undone.")) return;
    try { await api.delete("/api/document-analyses"); setAnalyses([]); }
    catch (requestError) { setError(errorMessage(requestError)); }
  }
  return <div className="mx-auto max-w-4xl">
    <PageHeading eyebrow={languageName(user.language)} title={t(user.language, "history")} subtitle="Browse, rename, and delete your saved conversations and document analyses." />
    {!user.save_history && <div className="mb-4"><div role="status" className="rounded-xl border border-[#d9e2d9] bg-[#f7f9f5] px-4 py-3 text-sm text-[#52685b]">Automatic history saving is off. You can still save individual conversations and document analyses using Save to History.</div></div>}
    {error && <div className="mb-4"><ErrorBanner message={error} /></div>}
    <div className="mb-4 flex gap-2" role="tablist" aria-label={t(user.language, "history")}>
      {[
        ["conversations", t(user.language, "conversationHistory"), items.length],
        ["documents", t(user.language, "documentAnalysisHistory"), analyses.length],
      ].map(([tab, label, count]) => <button
        key={tab}
        type="button"
        role="tab"
        aria-selected={activeTab === tab}
        onClick={() => setActiveTab(tab)}
        className={`focus-ring rounded-xl border px-4 py-2.5 text-sm font-semibold ${activeTab === tab ? "border-[#315d50] bg-[#e8f1e9] text-[#315d50]" : "border-[#d9e2d9] text-[#65776d]"}`}
      >{label} ({count})</button>)}
    </div>
    {activeTab === "conversations" ? <div className="surface divide-y divide-[#e7ece6] overflow-hidden">
      {loading ? <p className="p-6 text-sm muted">Loading saved conversations…</p>
        : items.length === 0 ? <div className="p-10 text-center"><Clock3 size={28} className="mx-auto text-[#8ca797]" /><h2 className="mt-3 font-semibold">No saved conversations</h2><p className="muted mt-2 text-sm">Save a conversation to History to find it here.</p><Link className="mt-4 inline-flex items-center gap-2 font-semibold text-[#315d50]" to="/app">Go to assistant <ArrowRight size={16} /></Link></div>
          : items.map((item) => <div key={item.id} className="flex items-center gap-3 p-4 sm:px-6">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#edf3ed] text-[#577b68]"><History size={18} /></span>
            <button onClick={() => navigate("/app", { state: { conversationId: item.id } })} className="focus-ring min-w-0 flex-1 text-left">
              <span className="block truncate text-sm font-semibold">{item.title || t(user.language, "unnamedConversation")}</span>
              <span className="muted mt-1 block text-xs">{t(user.language, "started")} {new Date(item.created_at || item.updated_at).toLocaleString()} · {t(user.language, "lastActive")} {new Date(item.updated_at).toLocaleString()}</span>
            </button>
            <button type="button" onClick={() => renameConversation(item)} className="focus-ring rounded-lg px-2 py-2 text-xs font-semibold text-[#527669]">Rename</button>
            <button type="button" onClick={() => removeConversation(item.id)} className="focus-ring rounded-lg p-2 text-[#9a493b]" aria-label={`Delete ${item.title}`}><Trash2 size={16} /></button>
          </div>)}
      {!loading && items.length > 0 && <div className="p-4 text-right"><button type="button" onClick={deleteAllConversations} className="focus-ring text-sm font-semibold text-[#9a493b]">Delete all conversations</button></div>}
    </div> : <section className="surface space-y-4 p-4 sm:p-6">
      <VoiceSelect language={user.language} value={historyVoice} onChange={setHistoryVoice} />
      {loading ? <p className="p-4 text-sm muted">Loading document analyses…</p>
        : analyses.length === 0 ? <div className="p-10 text-center"><FileText size={28} className="mx-auto text-[#8ca797]" /><h2 className="mt-3 font-semibold">No saved document analyses</h2><p className="muted mt-2 text-sm">Save a document analysis to History to find it here.</p><Link className="mt-4 inline-flex items-center gap-2 font-semibold text-[#315d50]" to="/app/prescription">Analyze a document <ArrowRight size={16} /></Link></div>
          : analyses.map((item) => <DocumentAnalysisHistoryItem
            key={item.id}
            item={item}
            voice={historyVoice}
            onOpen={() => navigate("/app/prescription", { state: { documentAnalysis: item } })}
            onRename={() => renameAnalysis(item)}
            onDelete={() => removeAnalysis(item)}
          />)}
      {!loading && analyses.length > 0 && <div className="text-right"><button type="button" onClick={deleteAllAnalyses} className="focus-ring text-sm font-semibold text-[#9a493b]">Delete all document analyses</button></div>}
    </section>}
  </div>;
}

function DocumentAnalysisHistoryItem({ item, voice, onOpen, onRename, onDelete }) {
  const { user } = useAuth();
  const result = item.result || {};
  const analysisLanguage = item.language || "en";
  const labelKey = result.document_type === "prescription"
    ? "prescriptionType"
    : result.document_type === "tablet_package" ? "tabletPackage" : "medicalReport";
  return <article className="rounded-2xl border border-[#e1e9e1] bg-white p-4 sm:p-5">
    <div className="flex flex-wrap items-start gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#edf3ed] text-[#577b68]"><FileText size={18} /></span>
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-sm font-semibold">{item.title}</h2>
        <p className="muted mt-1 text-xs">{t(user.language, labelKey)} · {languageName(analysisLanguage)} · {new Date(item.created_at).toLocaleString()}</p>
      </div>
      <button type="button" onClick={onOpen} className="focus-ring inline-flex items-center gap-1 rounded-lg px-2 py-2 text-xs font-semibold text-[#527669]">{t(user.language, "openAnalysis")} <ArrowRight size={14} /></button>
      <button type="button" onClick={onRename} className="focus-ring rounded-lg px-2 py-2 text-xs font-semibold text-[#527669]">Rename</button>
      <button type="button" onClick={onDelete} className="focus-ring rounded-lg p-2 text-[#9a493b]" aria-label={`Delete ${item.title}`}><Trash2 size={16} /></button>
    </div>
    <p className="mt-4 whitespace-pre-wrap text-sm leading-6">{result.explanation}</p>
    {result.explanation && <DocumentAudioButton text={result.explanation} language={analysisLanguage} voice={voice} label={t(analysisLanguage, "listenSummary")} stopLabel={t(analysisLanguage, "stopSummary")} />}
    <details className="mt-3 rounded-xl border border-[#e1e9e1]">
      <summary className="focus-ring cursor-pointer px-4 py-3 text-sm font-semibold">{t(user.language, "viewAnalysisDetails")}</summary>
      <div className="space-y-3 border-t border-[#e7ece6] p-4">
        {result.extracted_text && <details className="rounded-lg border border-[#e1e9e1]">
          <summary className="focus-ring cursor-pointer px-3 py-2 text-xs font-semibold">{t(analysisLanguage, "originalDocumentText")}</summary>
          <pre className="whitespace-pre-wrap border-t border-[#e7ece6] px-3 py-2 font-sans text-xs leading-5">{result.extracted_text}</pre>
        </details>}
        {result.medicines?.map((medicine, index) => <div key={`${medicine.name}-${index}`} className="rounded-xl bg-[#f7f9f5] p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">{medicine.name}{medicine.strength ? ` · ${medicine.strength}` : ""}</h3>
            <DocumentAudioButton text={medicineSpeechText(medicine, analysisLanguage)} language={analysisLanguage} voice={voice} label={t(analysisLanguage, "listenMedicine")} stopLabel={t(analysisLanguage, "stopMedicine")} />
          </div>
          <p className="muted mt-2 text-xs leading-5">{medicine.common_use} {medicine.possible_reasons} {medicine.potential_benefit} {medicine.instructions} {medicine.instruction_meaning} {medicine.duration} {medicine.expiry_date && `${t(analysisLanguage, "medicineExpiry")}: ${medicine.expiry_date}`} {medicine.uncertainties}</p>
        </div>)}
        {result.findings?.map((finding, index) => <div key={`${finding.name}-${index}`} className="rounded-xl bg-[#f7f9f5] p-3 text-sm">
          <h3 className="font-semibold">{finding.name}{finding.value ? ` · ${finding.value}` : ""}</h3>
          {finding.plain_meaning && <p className="muted mt-1">{finding.plain_meaning}</p>}
        </div>)}
        {result.follow_up && <p className="rounded-xl bg-[#f2f5ef] p-3 text-sm leading-5">{result.follow_up}</p>}
      </div>
    </details>
  </article>;
}

function medicineSpeechText(medicine, language) {
  return [
    medicine.name,
    medicine.strength && `${t(language, "medicineStrength")}: ${medicine.strength}`,
    medicine.common_use && `${t(language, "commonUse")}: ${medicine.common_use}`,
    medicine.possible_reasons && `${t(language, "possibleReasons")}: ${medicine.possible_reasons}`,
    medicine.potential_benefit && `${t(language, "potentialBenefit")}: ${medicine.potential_benefit}`,
    medicine.instructions && `${t(language, "takeInstructions")}: ${medicine.instructions}`,
    medicine.instruction_meaning && `${t(language, "instructionMeaning")}: ${medicine.instruction_meaning}`,
    medicine.duration && `${t(language, "medicineDuration")}: ${medicine.duration}`,
    medicine.expiry_date && `${t(language, "medicineExpiry")}: ${medicine.expiry_date}`,
    medicine.uncertainties && `${t(language, "confirmDetails")}: ${medicine.uncertainties}`,
  ].filter(Boolean).join(". ");
}

function DocumentAudioButton({ text, language, voice, label, stopLabel }) {
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const audioRef = useRef(null);
  const urlRef = useRef("");

  function stop() {
    audioRef.current?.pause();
    audioRef.current = null;
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = "";
    setPlaying(false);
    setLoading(false);
  }

  useEffect(() => () => {
    audioRef.current?.pause();
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
  }, []);

  async function toggle() {
    if (playing) {
      stop();
      return;
    }
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post(
        "/api/speech/synthesize",
        { text, language, voice },
        { responseType: "blob" },
      );
      const url = URL.createObjectURL(data);
      urlRef.current = url;
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = stop;
      audio.onerror = () => {
        stop();
        setError("Audio could not be played.");
      };
      setLoading(false);
      setPlaying(true);
      await audio.play();
    } catch (requestError) {
      stop();
      setError(errorMessage(requestError));
    }
  }

  return <span className="inline-flex flex-col items-start">
    <button type="button" onClick={toggle} disabled={loading} className="focus-ring inline-flex items-center gap-1 rounded-full border border-[#d9e2d9] px-3 py-1.5 text-xs font-semibold text-[#527669] disabled:opacity-50">
      {loading ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-[#b8cdbf] border-t-[#315d50]" /> : playing ? <X size={13} /> : <Mic size={13} />}
      {loading ? t(language, "loading") : playing ? stopLabel : label}
    </button>
    {error && <span role="alert" className="mt-1 text-xs text-[#9a412d]">{error}</span>}
  </span>;
}

function SettingsPage({ dark, setDark }) {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({ language: user.language, response_mode: communicationMode(user.response_mode), voice: user.voice || "alloy", save_history: user.save_history !== false, autoplay: user.autoplay !== false });
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.type === "checkbox" ? event.target.checked : event.target.value }));
  async function save(event) {
    event.preventDefault();
    setError(""); setSaved(false); setBusy(true);
    try { await api.put("/api/preferences", form); setUser({ ...user, ...form }); setSaved(true); }
    catch (requestError) { setError(errorMessage(requestError)); }
    finally { setBusy(false); }
  }
  async function deleteAccount() {
    const confirmed = window.confirm("Permanently delete your account, saved conversations, and document analyses? This cannot be undone.");
    if (!confirmed) return;
    try { await api.delete("/api/auth/account"); setUser(null); window.location.assign("/"); }
    catch (requestError) { setError(errorMessage(requestError)); }
  }
  return <div className="mx-auto max-w-3xl">
    <PageHeading eyebrow={t(user.language, "account")} title={t(user.language, "settings")} subtitle="Your language and response choices are stored in your account. History saving is optional." />
    <form onSubmit={save} className="surface space-y-6 p-5 sm:p-7">
      <div><p className="text-sm font-semibold">{user.full_name}</p><p className="muted mt-1 text-sm">{user.email}</p></div>
      <LanguageSelect label={t(user.language, "language")} value={form.language} onChange={update("language")} />
      <ModeSelector language={form.language} value={form.response_mode} onChange={(value) => setForm((current) => ({ ...current, response_mode: value }))} />
      <VoiceSelect language={form.language} value={form.voice} onChange={(voice) => setForm((current) => ({ ...current, voice }))} />
      <div className="space-y-4 border-t border-[#e7ece6] pt-5">
        <Toggle label={t(form.language, "saveHistory")} detail="When off, conversations and document analyses are not saved automatically. You can still save individual items with Save to History. Existing saved history remains until you delete it." checked={form.save_history} onChange={update("save_history")} />
        <Toggle label={t(form.language, "autoplay")} detail="When off, voice responses wait for you to press play." checked={form.autoplay} onChange={update("autoplay")} />
        <Toggle label={t(form.language, "darkMode")} detail="Use a darker appearance on this device." checked={dark} onChange={() => setDark(!dark)} />
      </div>
      {error && <ErrorBanner message={error} />}
      {saved && <SuccessBanner><Check size={15} className="mr-1 inline" />Preferences saved.</SuccessBanner>}
      <button disabled={busy} className="focus-ring rounded-xl bg-[#315d50] px-5 py-3 font-semibold text-white disabled:opacity-50">{busy ? t(form.language, "loading") : t(form.language, "save")}</button>
    </form>
    <section className="surface mt-5 p-5 sm:p-7">
      <h2 className="font-semibold">Account data</h2><p className="muted mt-2 max-w-xl text-sm leading-6">Deleting your account permanently removes its profile, saved conversations, and saved document analyses. Uploaded prescription and report files are not retained.</p>
      <button type="button" onClick={deleteAccount} className="focus-ring mt-4 rounded-xl border border-[#e7c9c1] px-4 py-2.5 text-sm font-semibold text-[#963d30] hover:bg-[#fff3ef]">{t(form.language, "deleteAccount")}</button>
    </section>
  </div>;
}

function Toggle({ label, detail, checked, onChange }) {
  return <label className="flex cursor-pointer items-start justify-between gap-5">
    <span><span className="block text-sm font-medium">{label}</span><span className="muted mt-1 block text-xs leading-5">{detail}</span></span>
    <span className="relative mt-0.5 shrink-0"><input type="checkbox" className="peer sr-only" checked={checked} onChange={onChange} /><span className="block h-6 w-11 rounded-full bg-[#d5ddd6] transition peer-checked:bg-[#547b68] peer-focus-visible:ring-2 peer-focus-visible:ring-[#8ab09c]" /><span className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow transition peer-checked:translate-x-5" /></span>
  </label>;
}

function PrivacyPage() {
  const fromSignup = new URLSearchParams(useLocation().search).get("from") === "signup";
  return <main className="mx-auto max-w-3xl px-5 py-8 md:py-14">
    <Link to="/" className="mb-10 inline-flex"><Brand /></Link>
    <Link to={fromSignup ? "/signup" : "/"} className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-[#315d50]"><ArrowLeft size={16} /> Back</Link>
    <h1 className="text-4xl font-semibold tracking-tight">Privacy, safety & limitations</h1>
    <p className="muted mt-4 leading-7">Arogya Vanni is an AI-powered general health-information companion. It is not a medical device, clinician, or emergency service.</p>
    <div className="mt-8 space-y-6">
      <InfoSection title="Get professional care"><p>AI can misunderstand symptoms, speech, or medical documents. It cannot diagnose, prescribe, or replace a qualified healthcare professional. For an emergency, contact your local emergency services or seek urgent medical care now.</p></InfoSection>
      <InfoSection title="Your information"><p>Registration stores your name, email, password hash, language and communication preferences. Passwords are hashed. When automatic history saving is enabled, conversations and document-analysis titles and written results are stored with your account; you can also save individual items with the Save to History button when automatic saving is off. Saved history remains until you delete it or delete your account; there is no automatic expiration. You can delete existing conversations, document analyses, or your account at any time.</p><p>Audio recordings are sent to the configured AI provider for transcription and are not stored by this application. Prescription, medical-report, and medicine-package files are held in memory only for processing and are not saved to your profile. Avoid submitting identifying or unnecessary medical details.</p></InfoSection>
      <InfoSection title="AI provider"><p>When AI features are used, relevant text, audio, or an uploaded prescription, medical report, or medicine package is transmitted from the server to the OpenAI API. Before using real patient information, the operator must review the provider’s current data-handling, retention, privacy and contractual terms. Do not use real patient information until that review and applicable legal approvals are complete.</p></InfoSection>
      <InfoSection title="Language and speech"><p>Language models and speech recognition or pronunciation can make mistakes, especially with regional speech, accents, background noise and mixed-language speech. Review transcription before submitting it, and confirm any unclear prescription detail with your doctor or pharmacist.</p></InfoSection>
      <InfoSection title="Development and hosting"><p>Use HTTPS in deployment, configure a strong session secret and secure cookies, protect database access, configure the exact frontend origin, and set a retention policy. This application does not claim regulatory compliance or production readiness for patient care.</p></InfoSection>
    </div>
  </main>;
}

function InfoSection({ title, children }) {
  return <section className="surface p-5 sm:p-6"><h2 className="font-semibold">{title}</h2><div className="muted mt-3 space-y-3 text-sm leading-7">{children}</div></section>;
}

function Panel({ title, subtitle, children }) {
  return <div className="mx-auto max-w-4xl"><PageHeading title={title} subtitle={subtitle} /><div className="surface p-5 sm:p-7">{children}</div></div>;
}

function PageHeading({ eyebrow, title, subtitle }) {
  return <div className="mb-6">{eyebrow && <p className="mb-2 text-xs font-semibold uppercase tracking-[.13em] text-[#688979]">{eyebrow}</p>}<h1 className="text-3xl font-semibold tracking-tight">{title}</h1>{subtitle && <p className="muted mt-2 max-w-2xl text-sm leading-6">{subtitle}</p>}</div>;
}

export default App;

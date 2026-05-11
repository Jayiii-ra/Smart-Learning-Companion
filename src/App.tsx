import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { 
  BookOpen, 
  BrainCircuit, 
  Trophy, 
  FileSearch, 
  ChevronRight, 
  RefreshCcw, 
  Info,
  CheckCircle2,
  XCircle,
  Lightbulb,
  Eye,
  Volume2,
  Hand,
  Settings2,
  LayoutDashboard,
  ShieldCheck,
  Zap,
  LogOut,
  UserPlus,
  LogIn,
  Palette,
  Sun,
  Moon,
  EyeOff,
  Download,
  FileImage,
  FileText,
  Mic,
  VolumeX,
  Pause,
  Play,
  RotateCcw
} from "lucide-react";
import { PROMPTS } from "./lib/prompts";
import { askGemini } from "./lib/gemini";

type Tab = "explain" | "strategy" | "rag" | "settings";
type Theme = "light" | "dark" | "blue" | "emerald";

interface User {
  id: string;
  email: string;
  name: string;
}

interface MindMapNode {
  title: string;
  description: string;
  connections?: number[];
}

interface MindMapData {
  root: string;
  nodes: MindMapNode[];
}

interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [authForm, setAuthForm] = useState({ email: "", password: "", name: "" });
  const [authError, setAuthError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [activeTab, setActiveTab] = useState<Tab>("explain");
  const [theme, setTheme] = useState<Theme>("light");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [mindMap, setMindMap] = useState<MindMapData | null>(null);
  
  // Adaptive Explain params
  const [topic, setTopic] = useState("Quantum Computing");
  const [difficulty, setDifficulty] = useState("beginner");

  // Learning Strategy params
  const [strategyStyle, setStrategyStyle] = useState("visual");

  // RAG params
  const [ragQuery, setRagQuery] = useState("What is superposition?");
  const [groundedResult, setGroundedResult] = useState("");
  const [vanillaResult, setVanillaResult] = useState("");
  const [exporting, setExporting] = useState(false);
  const [activeAction, setActiveAction] = useState<"visual" | "plan" | "quiz" | "explain" | "rag" | "auditory">("explain");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechInstance, setSpeechInstance] = useState<SpeechSynthesisUtterance | null>(null);
  const [showTranscript, setShowTranscript] = useState(true);

  // Quiz state
  const [quiz, setQuiz] = useState<QuizQuestion[]>([]);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [quizFeedback, setQuizFeedback] = useState<{correct: boolean, explanation: string} | null>(null);

  const mindMapRef = useRef<HTMLDivElement>(null);
  const studyPlanRef = useRef<HTMLDivElement>(null);

  const downloadAsImage = async (e: React.MouseEvent, format: 'jpeg' | 'png') => {
    e.preventDefault();
    if (mindMapRef.current === null) return;
    setExporting(true);
    try {
      // Ensure everything is rendered
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const canvas = await html2canvas(mindMapRef.current, {
        backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff',
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false
      });
      
      const dataUrl = canvas.toDataURL(`image/${format === 'jpeg' ? 'jpeg' : 'png'}`, 0.95);
      const link = document.createElement('a');
      link.download = `mind-map-${topic.toLowerCase().replace(/[^a-z0-9]/g, '-')}.${format}`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Export failed', err);
      alert("Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const downloadAsPDF = async (e: React.MouseEvent, type: 'mindmap' | 'studyplan') => {
    e.preventDefault();
    const targetRef = type === 'mindmap' ? mindMapRef : studyPlanRef;
    if (targetRef.current === null) return;
    setExporting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const canvas = await html2canvas(targetRef.current, {
        backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff',
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false
      });
      
      const dataUrl = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'l' : 'p',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });
      
      pdf.addImage(dataUrl, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`${type}-${topic.toLowerCase().replace(/[^a-z0-9]/g, '-')}.pdf`);
    } catch (err) {
      console.error('PDF export failed', err);
      alert("PDF export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const handleExplain = async () => {
    setLoading(true);
    setActiveAction("explain");
    try {
      const prompt = PROMPTS.ADAPTIVE_EXPLANATION(topic, difficulty);
      const text = await askGemini(prompt);
      setResult(text);
    } catch (e) {
      setResult("Error generating explanation. Please check your API key.");
    } finally {
      setLoading(false);
    }
  };

  const handleLearningPath = async () => {
    setLoading(true);
    setActiveAction("plan");
    try {
      const prompt = PROMPTS.LEARNING_PATH(topic, strategyStyle);
      const text = await askGemini(prompt);
      setResult(text);
    } catch (e) {
      setResult("Error generating learning path.");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateMindMap = async () => {
    setLoading(true);
    setActiveAction("visual");
    try {
      const prompt = PROMPTS.VISUAL_MIND_MAP(topic);
      const response = await askGemini(prompt);
      const cleanJson = response.replace(/```json|```/gi, "").trim();
      const parsed: MindMapData = JSON.parse(cleanJson);
      setMindMap(parsed);
    } catch (error) {
      console.error(error);
      setResult("Mind map generation failed. Please try a simpler topic.");
    } finally {
      setLoading(false);
    }
  };

  const handleAuditoryBreakdown = async () => {
    setLoading(true);
    setActiveAction("auditory");
    try {
      const prompt = PROMPTS.AUDITORY_BREAKDOWN(topic);
      const text = await askGemini(prompt);
      setResult(text);
    } catch (e) {
      setResult("Error generating auditory breakdown.");
    } finally {
      setLoading(false);
    }
  };

  const speakResult = () => {
    if (!result) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(result.replace(/\[pause\]/g, "..."));
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setSpeechInstance(utterance);
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  const handleGenerateQuiz = async () => {
    setLoading(true);
    setActiveAction("quiz");
    setQuiz([]);
    setCurrentQuizIndex(0);
    setQuizFeedback(null);
    try {
      const prompt = PROMPTS.DYNAMIC_QUIZZER(topic);
      const json = await askGemini(prompt, true);
      setQuiz(json);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleRAGCompare = async () => {
    setLoading(true);
    setActiveAction("rag");
    try {
      const res = await fetch("/api/retrieve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: ragQuery })
      });
      const { chunks } = await res.json();

      const [grounded, vanilla] = await Promise.all([
        askGemini(PROMPTS.RAG_PROMPT(ragQuery, chunks)),
        askGemini(PROMPTS.VANILLA_PROMPT(ragQuery))
      ]);

      setGroundedResult(grounded || "");
      setVanillaResult(vanilla || "");
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const checkAnswer = (index: number) => {
    const correct = index === quiz[currentQuizIndex].correctAnswerIndex;
    setQuizFeedback({
      correct,
      explanation: quiz[currentQuizIndex].explanation
    });
  };

  const nextQuestion = () => {
    if (currentQuizIndex < quiz.length - 1) {
      setCurrentQuizIndex(currentQuizIndex + 1);
      setQuizFeedback(null);
    } else {
      setQuiz([]); 
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setAuthError("");
    try {
      const endpoint = authMode === "login" ? "/api/auth/login" : "/api/auth/signup";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(authForm)
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
      } else {
        setAuthError(data.error || "Authentication failed");
      }
    } catch (err) {
      setAuthError("Server unreachable. Ensure backend is running.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setResult(null);
    setQuiz([]);
  };

  const toggleTheme = (newTheme: Theme) => {
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  if (!user) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50 font-sans p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white p-8 rounded-3xl border border-slate-200 shadow-xl"
        >
          <div className="flex items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 theme-primary-bg rounded-xl flex items-center justify-center text-white font-bold text-xl">S</div>
            <h1 className="text-2xl font-bold tracking-tight theme-text-main">Smart Learning</h1>
          </div>

          <h2 className="text-xl font-bold mb-2 text-center">
            {authMode === "login" ? "Welcome Back" : "Create Account"}
          </h2>
          <p className="text-sm text-slate-500 text-center mb-8">
            {authMode === "login" ? "Enter your credentials to continue learning" : "Sign up to start your personalized journey"}
          </p>

          <form onSubmit={handleAuth} className="space-y-4">
            {authMode === "signup" && (
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Full Name</label>
                <input 
                  type="text" 
                  required
                  value={authForm.name}
                  onChange={e => setAuthForm({...authForm, name: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="John Doe"
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Email Address</label>
              <input 
                type="email" 
                required
                value={authForm.email}
                onChange={e => setAuthForm({...authForm, email: e.target.value})}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Password</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  required
                  value={authForm.password}
                  onChange={e => setAuthForm({...authForm, password: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none pr-12"
                  placeholder="••••••••"
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {authError && <p className="text-xs text-red-500 font-bold bg-red-50 p-2 rounded text-center">{authError}</p>}

            <button 
              type="submit"
              disabled={loading}
              className="w-full py-4 theme-primary-bg text-white rounded-2xl font-bold shadow-lg shadow-indigo-100 hover:opacity-90 transition-all flex items-center justify-center gap-2"
            >
              {loading ? <RefreshCcw className="w-5 h-5 animate-spin" /> : (authMode === "login" ? <LogIn className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />)}
              {authMode === "login" ? "Sign In" : "Create Account"}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t theme-border text-center">
            <button 
              onClick={() => setAuthMode(authMode === "login" ? "signup" : "login")}
              className="text-sm font-bold theme-primary-text hover:underline"
            >
              {authMode === "login" ? "Don't have an account? Sign Up" : "Already have an account? Log In"}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col theme-bg-main font-sans overflow-hidden theme-text-main">
      {/* Top Navigation Bar */}
      <header className="h-16 theme-bg-card border-b theme-border flex items-center justify-between px-8 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 theme-primary-bg rounded-lg flex items-center justify-center text-white font-bold">S</div>
          <h1 className="text-xl font-semibold tracking-tight theme-text-main">Smart Learning Companion</h1>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-full px-4 py-1.5 gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-[10px] font-bold theme-text-muted uppercase tracking-wider">Gemini 3 Flash Online</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-semibold">{user.name}</p>
              <p className="text-[10px] theme-text-muted uppercase font-bold tracking-tighter">{user.email}</p>
            </div>
            <button 
              onClick={handleLogout}
              className="w-10 h-10 rounded-full theme-bg-card border-2 theme-border shadow-sm flex items-center justify-center transition-all hover:bg-red-50 hover:text-red-600"
              title="Log Out"
            >
                <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Application Layout */}
      <main className="flex flex-1 overflow-hidden">
        
        {/* Left Sidebar: Configuration */}
        <aside className="w-64 theme-bg-card border-r theme-border p-4 lg:p-6 flex flex-col gap-6 shrink-0 overflow-y-auto">
          <div>
            <label className="text-[10px] font-bold theme-text-muted uppercase tracking-widest mb-3 block flex items-center gap-2">
                <Settings2 className="w-3 h-3" /> Navigation
            </label>
            <div className="space-y-1">
              {[
                { id: "explain", label: "Explanation Engine", icon: BookOpen },
                { id: "strategy", label: "Strategy Builder", icon: Zap },
                { id: "rag", label: "RAG Playground", icon: FileSearch },
                { id: "settings", label: "Account Settings", icon: Settings2 },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => { setActiveTab(item.id as Tab); setResult(null); }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg font-medium text-sm transition-all ${
                    activeTab === item.id 
                      ? "theme-primary-bg text-white shadow-md" 
                      : "theme-text-muted hover:theme-bg-main"
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4 block">Learning Strategy</label>
            <div className="space-y-2">
              {[
                { id: "visual", icon: Eye, label: "Visual Learner" },
                { id: "auditory", icon: Volume2, label: "Auditory Focus" },
                { id: "kinesthetic", icon: Hand, label: "Kinesthetic Tasks" }
              ].map((style) => (
                <button 
                  key={style.id}
                  onClick={() => {
                    setStrategyStyle(style.id as any);
                    setActiveTab("strategy");
                    setMindMap(null);
                    setResult(null);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg border transition-all font-medium text-sm ${
                    strategyStyle === style.id && activeTab === "strategy"
                      ? "theme-primary-border theme-bg-main theme-primary-text shadow-sm" 
                      : "border-transparent theme-text-muted hover:theme-bg-main"
                  }`}
                >
                  <style.icon className="w-4 h-4" />
                  {style.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4 block">Level Complexity</label>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px] mb-2 font-bold uppercase tracking-tight">
                <span className={difficulty === "beginner" ? "text-indigo-600" : "text-slate-400"}>ELI5</span>
                <span className={difficulty === "intermediate" ? "text-indigo-600" : "text-slate-400"}>Student</span>
                <span className={difficulty === "advanced" ? "text-indigo-600" : "text-slate-400"}>Deep Dive</span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden flex">
                <button 
                  onClick={() => setDifficulty("beginner")}
                  className={`h-full transition-all duration-300 ${difficulty === "beginner" ? "w-1/3 bg-indigo-600" : "w-1/3 hover:bg-slate-200"}`}
                />
                <button 
                  onClick={() => setDifficulty("intermediate")}
                  className={`h-full transition-all duration-300 ${difficulty === "intermediate" ? "w-2/3 bg-indigo-600" : difficulty === "advanced" ? "w-1/3 bg-indigo-600" : "w-1/3 hover:bg-slate-200"}`}
                />
                <button 
                  onClick={() => setDifficulty("advanced")}
                  className={`h-full transition-all duration-300 ${difficulty === "advanced" ? "w-full bg-indigo-600" : "w-1/3 hover:bg-slate-200"}`}
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-2 leading-relaxed font-medium italic">
                {difficulty === "beginner" && "Simplifying complex concepts using analogies."}
                {difficulty === "intermediate" && "Academic level depth with clear definitions."}
                {difficulty === "advanced" && "Full technical rigor and advanced principles."}
              </p>
            </div>
          </div>

          <div className="mt-auto">
            <div className="bg-slate-900 rounded-xl p-4 text-white shadow-xl shadow-slate-200">
              <p className="text-[10px] font-bold text-indigo-400 uppercase mb-1 tracking-tighter">Active Source</p>
              <p className="text-sm font-medium truncate mb-3">knowledge_base.txt</p>
              <div className="flex items-center justify-between text-[10px] opacity-70 font-mono">
                <span>RAG ACTIVE</span>
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
              </div>
            </div>
          </div>
        </aside>

        {/* Center Pane: AI Workspace */}
        <section className="flex-1 flex flex-col min-w-0 theme-bg-card border-x theme-border">
          <div className="p-4 lg:p-6 flex-1 overflow-hidden flex flex-col">
            <div className="mb-6 flex items-end justify-between">
              <div>
                <h2 className="text-xl lg:text-2xl font-bold theme-text-main mb-1 flex items-center gap-2">
                    {activeTab === "explain" && "Adaptive Explanation Engine"}
                    {activeTab === "strategy" && "Dynamic Strategy Builder"}
                    {activeTab === "rag" && "Grounded RAG Playground"}
                    {activeTab === "settings" && "Platform Configuration"}
                </h2>
                <p className="text-sm theme-text-muted">
                    {activeTab === "settings" ? "Customize your learning experience and visual theme." : "Define your curriculum and generate precision AI responses."}
                </p>
              </div>
              {activeTab !== "settings" && (
                <div className="flex gap-2">
                  <span className="px-3 py-1 theme-bg-main rounded-full text-[10px] font-bold theme-text-muted uppercase tracking-widest border theme-border">
                      {topic}
                  </span>
                </div>
              )}
            </div>

            {/* Active Topic Box */}
            <div className="theme-bg-main border theme-border rounded-2xl p-4 flex-1 flex flex-col shadow-inner overflow-hidden">
              {activeTab !== "settings" && (
                <div className="flex items-center gap-4 mb-4">
                  <span className="theme-primary-text font-bold tracking-tighter text-xs">TOPIC:</span>
                  <input 
                      type="text" 
                      value={activeTab === "rag" ? ragQuery : topic}
                      onChange={(e) => activeTab === "rag" ? setRagQuery(e.target.value) : setTopic(e.target.value)}
                      className="flex-1 theme-bg-card border theme-border px-6 py-2.5 rounded-full text-sm font-medium theme-text-main shadow-sm focus:ring-2 theme-primary-border outline-none transition-all placeholder:theme-text-muted"
                      placeholder="Enter topic here..."
                  />
                </div>
              )}

              {/* AI Output Result Mapping */}
              <div className="flex-1 theme-bg-card border theme-border p-4 lg:p-6 shadow-sm overflow-auto custom-scrollbar relative">
                <AnimatePresence mode="wait">
                    {loading ? (
                        <motion.div 
                            key="loading"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 flex flex-col items-center justify-center theme-bg-card opacity-80 backdrop-blur-sm z-10"
                        >
                            <RefreshCcw className="w-10 h-10 theme-primary-text animate-spin mb-4" />
                            <p className="text-sm font-bold theme-primary-text animate-pulse uppercase tracking-widest">Processing Query...</p>
                        </motion.div>
                    ) : activeTab === "settings" ? (
                        <motion.div 
                            key="settings-tab"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="max-w-2xl"
                        >
                            <div className="space-y-8">
                                <section>
                                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                        <Palette className="w-5 h-5 theme-primary-text" />
                                        Visual Appearance
                                    </h3>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                        {[
                                            { id: "light", label: "Light Mode", icon: Sun, color: "bg-white border-slate-200" },
                                            { id: "dark", label: "Dark Mode", icon: Moon, color: "bg-slate-900 border-slate-800" },
                                            { id: "blue", label: "Ocean Blue", icon: Palette, color: "bg-blue-600 border-blue-400" },
                                            { id: "emerald", label: "Forest Green", icon: Palette, color: "bg-emerald-600 border-emerald-400" }
                                        ].map((t) => (
                                            <button
                                                key={t.id}
                                                onClick={() => toggleTheme(t.id as Theme)}
                                                className={`flex flex-col items-center p-4 rounded-2xl border-2 transition-all ${
                                                    theme === t.id ? "theme-primary-border scale-105 shadow-md theme-bg-main" : "border-transparent theme-bg-main hover:opacity-80"
                                                }`}
                                            >
                                                <div className={`w-10 h-10 rounded-full ${t.color} flex items-center justify-center mb-2 shadow-inner`}>
                                                    <t.icon className={`w-5 h-5 ${t.id === 'light' ? 'text-slate-400' : 'text-white'}`} />
                                                </div>
                                                <span className="text-xs font-bold uppercase tracking-tight">{t.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </section>

                                <section className="pt-8 border-t theme-border">
                                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                        <BrainCircuit className="w-5 h-5 theme-primary-text" />
                                        Profile Overview
                                    </h3>
                                    <div className="theme-bg-main p-6 rounded-2xl border theme-border flex items-center gap-6">
                                        <div className="w-16 h-16 theme-primary-bg rounded-full flex items-center justify-center text-white text-2xl font-bold">
                                            {user.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-xl font-bold theme-text-main">{user.name}</p>
                                            <p className="text-sm theme-text-muted">{user.email}</p>
                                            <p className="text-xs mt-1 font-mono theme-primary-text font-bold uppercase">Member since May 2026</p>
                                        </div>
                                    </div>
                                </section>

                                <button 
                                    onClick={handleLogout}
                                    className="px-6 py-3 bg-red-50 text-red-600 rounded-xl font-bold border border-red-100 hover:bg-red-100 transition-all flex items-center gap-2"
                                >
                                    <LogOut className="w-5 h-5" /> Disconnect Account
                                </button>
                            </div>
                        </motion.div>
                    ) : activeTab === "rag" ? (
                        <motion.div 
                            key="rag-result"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="space-y-8 h-full"
                        >
                            {!groundedResult && !vanillaResult ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-50">
                                    <FileSearch className="w-16 h-16 mb-4" />
                                    <p className="font-bold text-sm tracking-widest uppercase">Compare Grounding Effects</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-full">
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="w-2 h-2 rounded-full bg-slate-300" />
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Global Base Model</span>
                                        </div>
                                        <div className="flex-1 p-6 bg-slate-50 rounded-xl border border-slate-100 text-sm leading-relaxed text-slate-600 italic">
                                            {vanillaResult}
                                        </div>
                                    </div>
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Grounded Perspective</span>
                                        </div>
                                        <div className="flex-1 p-6 bg-white rounded-xl border-2 border-indigo-100 text-sm leading-relaxed text-slate-800 shadow-sm">
                                            {groundedResult}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    ) : (
                        <motion.div 
                            key="output"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="space-y-12"
                        >
                            {mindMap && activeAction === "visual" && (
                                <div className="flex flex-col border-b theme-border pb-12">
                                    <div className="flex items-center gap-2 mb-6 border-b theme-border pb-4 shrink-0">
                                        <div className="w-6 h-6 bg-indigo-100 rounded flex items-center justify-center">
                                            <Palette className="w-4 h-4 text-indigo-600" />
                                        </div>
                                        <span className="text-[10px] font-bold theme-text-muted uppercase tracking-widest flex-1">
                                            Visual Mind Map
                                        </span>
                                        <div className="flex gap-2">
                                            {exporting ? (
                                                <div className="flex items-center gap-2 px-3 py-1 text-[10px] theme-text-muted font-bold">
                                                    <RefreshCcw className="w-3 h-3 animate-spin" /> Exporting...
                                                </div>
                                            ) : (
                                                <>
                                                    <button 
                                                        type="button"
                                                        onClick={(e) => downloadAsImage(e, 'jpeg')}
                                                        className="flex items-center gap-1.5 px-3 py-1 bg-white border theme-border rounded text-[10px] font-bold hover:theme-bg-main transition-colors text-slate-800"
                                                        title="Download as JPG"
                                                    >
                                                        <FileImage className="w-3 h-3 text-indigo-600" /> JPG
                                                    </button>
                                                    <button 
                                                        type="button"
                                                        onClick={(e) => downloadAsPDF(e, 'mindmap')}
                                                        className="flex items-center gap-1.5 px-3 py-1 bg-white border theme-border rounded text-[10px] font-bold hover:theme-bg-main transition-colors text-slate-800"
                                                        title="Download as PDF"
                                                    >
                                                        <FileText className="w-3 h-3 text-rose-600" /> PDF
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <div className="theme-bg-main rounded-xl border theme-border p-4 relative">
                                        <div ref={mindMapRef} className="flex flex-col items-center p-12 space-y-32 min-h-[600px] min-w-full lg:min-w-0 theme-bg-main">
                                            {/* Root Node */}
                                            <motion.div 
                                                initial={{ scale: 0 }} 
                                                animate={{ scale: 1 }}
                                                className="bg-indigo-600 text-white px-8 py-4 rounded-full font-bold shadow-xl z-20 relative text-lg"
                                            >
                                                {mindMap.root}
                                                <div className="absolute -bottom-24 left-1/2 -translate-x-1/2 w-0.5 h-24 bg-indigo-200" />
                                            </motion.div>

                                            {/* Sub Nodes */}
                                            <div className="flex gap-8 flex-wrap justify-center items-start">
                                                {mindMap.nodes.map((node, idx) => (
                                                    <motion.div 
                                                        key={idx}
                                                        initial={{ opacity: 0, y: 20 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ delay: idx * 0.1 }}
                                                        className="w-48 bg-white theme-bg-card border-2 theme-primary-border rounded-2xl p-4 shadow-lg text-center relative group hover:scale-105 transition-all"
                                                    >
                                                        <h4 className="font-bold text-xs mb-1 theme-text-main">{node.title}</h4>
                                                        <p className="text-[10px] theme-text-muted leading-tight">{node.description}</p>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeAction === "auditory" && result && (
                                <div className="flex flex-col border-b theme-border pb-12">
                                    <div className="flex items-center gap-2 mb-6 border-b theme-border pb-4 shrink-0">
                                        <div className="w-6 h-6 bg-pink-100 rounded flex items-center justify-center">
                                            <Mic className="w-4 h-4 text-pink-600" />
                                        </div>
                                        <span className="text-[10px] font-bold theme-text-muted uppercase tracking-widest flex-1">
                                            Auditory Experience Center
                                        </span>
                                    </div>

                                    <div className="theme-bg-main rounded-2xl border-4 border-dashed theme-border p-12 flex flex-col items-center">
                                        <div className="relative mb-12">
                                            {/* Wave Visualizer Mockup */}
                                            <div className="flex items-center gap-1 h-24">
                                                {[...Array(20)].map((_, i) => (
                                                    <motion.div
                                                        key={i}
                                                        animate={{ 
                                                            height: isSpeaking ? [20, Math.random() * 80 + 20, 20] : 20 
                                                        }}
                                                        transition={{ 
                                                            repeat: Infinity, 
                                                            duration: 0.5 + Math.random() * 0.5,
                                                            ease: "easeInOut"
                                                        }}
                                                        className={`w-1.5 rounded-full ${isSpeaking ? 'theme-primary-bg' : 'bg-slate-200'}`}
                                                    />
                                                ))}
                                            </div>
                                            {isSpeaking && (
                                                <motion.div 
                                                    initial={{ opacity: 0, scale: 0.8 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    className="absolute -top-6 -right-6 bg-indigo-600 text-white text-[8px] font-bold px-2 py-1 rounded shadow-lg animate-bounce"
                                                >
                                                    LIVE AUDIO
                                                </motion.div>
                                            )}
                                        </div>

                                        <div className="text-center max-w-xl mb-12">
                                            <h3 className="text-2xl font-bold mb-4 theme-text-main">Auditory Breakdown</h3>
                                            <button 
                                                onClick={() => setShowTranscript(!showTranscript)}
                                                className="text-[10px] font-bold theme-primary-text mb-4 uppercase tracking-tighter hover:underline"
                                            >
                                                {showTranscript ? "Hide Transcript" : "Show Transcript"}
                                            </button>
                                            <AnimatePresence>
                                                {showTranscript && (
                                                    <motion.p 
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: "auto" }}
                                                        exit={{ opacity: 0, height: 0 }}
                                                        className="theme-text-muted text-sm leading-relaxed italic border-l-4 theme-primary-border pl-6 py-2 overflow-hidden"
                                                    >
                                                        {result}
                                                    </motion.p>
                                                )}
                                            </AnimatePresence>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            {isSpeaking ? (
                                                <button 
                                                    onClick={stopSpeaking}
                                                    className="w-16 h-16 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-xl hover:bg-rose-700 transition-all scale-110"
                                                >
                                                    <VolumeX className="w-8 h-8" />
                                                </button>
                                            ) : (
                                                <button 
                                                    onClick={speakResult}
                                                    className="w-16 h-16 rounded-full theme-primary-bg text-white flex items-center justify-center shadow-xl hover:opacity-90 transition-all scale-110"
                                                >
                                                    <Play className="w-8 h-8 ml-1" />
                                                </button>
                                            )}
                                            <button 
                                                onClick={handleAuditoryBreakdown}
                                                className="w-12 h-12 rounded-full bg-white border theme-border theme-text-main flex items-center justify-center hover:theme-bg-main transition-all"
                                                title="Regenerate Script"
                                            >
                                                <RotateCcw className="w-5 h-5" />
                                            </button>
                                        </div>
                                        
                                        <p className="mt-8 text-[10px] font-bold theme-text-muted uppercase tracking-widest">
                                            {isSpeaking ? "Broadcasting detailed concept explanation..." : "Click play to start the auditory session"}
                                        </p>
                                    </div>
                                </div>
                            ) }
                            
                            {result && activeAction !== "auditory" && (
                                <div className="flex flex-col border-b theme-border pb-12">
                                    <div className="flex items-center gap-2 mb-6 border-b theme-border pb-4 shrink-0">
                                        <div className="w-6 h-6 bg-emerald-100 rounded flex items-center justify-center">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                        </div>
                                        <span className="text-[10px] font-bold theme-text-muted uppercase tracking-widest flex-1">
                                            {activeTab === "explain" ? "Detailed Explanation" : "Structured Study Plan"}
                                        </span>
                                        <div className="flex gap-2">
                                            {exporting ? (
                                                <div className="flex items-center gap-2 px-3 py-1 text-[10px] theme-text-muted font-bold">
                                                    <RefreshCcw className="w-3 h-3 animate-spin" /> Exporting...
                                                </div>
                                            ) : (
                                                <>
                                                    <button 
                                                        type="button"
                                                        onClick={(e) => downloadAsPDF(e, 'studyplan')}
                                                        className="flex items-center gap-1.5 px-3 py-1 bg-white border theme-border rounded text-[10px] font-bold hover:theme-bg-main transition-colors text-slate-800"
                                                        title="Download as PDF"
                                                    >
                                                        <FileText className="w-3 h-3 text-rose-600" /> PDF
                                                    </button>
                                                    {strategyStyle === "auditory" && activeTab === "strategy" && (
                                                        <button 
                                                            onClick={speakResult}
                                                            className="flex items-center gap-1.5 px-3 py-1 bg-indigo-600 text-white rounded text-[10px] font-bold hover:bg-indigo-700 transition-colors uppercase"
                                                        >
                                                            <Volume2 className="w-3 h-3" /> Audio
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    <div ref={studyPlanRef} className="theme-bg-main rounded-xl border theme-border p-8 shadow-inner relative min-h-[400px]">
                                        <div className="prose prose-slate max-w-none prose-sm">
                                            <div className="whitespace-pre-wrap leading-relaxed theme-text-main font-medium text-base">
                                                {strategyStyle === "kinesthetic" && activeTab === "strategy" ? (
                                                    <div className="space-y-4">
                                                        {result.split('\n').map((line, i) => {
                                                            if (line.trim().startsWith('-') || line.trim().match(/^\d\./)) {
                                                                return (
                                                                    <div key={i} className="flex items-start gap-4 p-4 theme-bg-card rounded-xl border-2 theme-border group cursor-pointer hover:theme-primary-border transition-all shadow-sm">
                                                                        <div className="w-6 h-6 shrink-0 rounded-full border-2 theme-border flex items-center justify-center group-hover:theme-primary-border mt-0.5">
                                                                            <div className="w-3 h-3 rounded-full theme-primary-bg opacity-0 group-active:opacity-100 transition-opacity" />
                                                                        </div>
                                                                        <p className="font-semibold text-slate-700">{line.replace(/^[- \d.]*/, "")}</p>
                                                                    </div>
                                                                );
                                                            }
                                                            return <p key={i} className="text-slate-600">{line}</p>;
                                                        })}
                                                    </div>
                                                ) : result}
                                            </div>
                                            
                                            {activeTab === "strategy" && (
                                                <div className="bg-amber-50 rounded-xl p-6 border border-amber-100 mt-12 shadow-sm">
                                                    <p className="text-[10px] font-bold text-amber-600 uppercase mb-2 tracking-widest flex items-center gap-2">
                                                        <Lightbulb className="w-4 h-4" /> Recommended Practice
                                                    </p>
                                                    <p className="text-sm italic text-amber-800 leading-relaxed font-medium">
                                                        "Integrate these core concepts into your next project or peer discussion to solidify neural pathways."
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {!mindMap && !result && (
                                <div className="h-full flex flex-col items-center justify-center theme-text-muted opacity-50 py-10">
                                    <LayoutDashboard className="w-20 h-20 mb-4" />
                                    <p className="font-bold text-sm tracking-widest uppercase">Workspace Ready</p>
                                    <p className="text-xs mt-2 tracking-tight">Run a query to see AI generated learning content</p>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Control Bar */}
          {activeTab !== "settings" && (
            <div className="h-24 border-t theme-border px-8 flex items-center justify-between shrink-0 theme-bg-card">
              <div className="flex gap-3">
                {activeTab === "explain" ? (
                  <button 
                    onClick={handleExplain}
                    disabled={loading}
                    className={`px-8 py-2.5 rounded-full text-sm font-semibold transition-all flex items-center gap-2 shadow-lg ${
                        activeAction === "explain" ? "theme-primary-bg text-white shadow-indigo-100" : "bg-white border theme-border theme-text-main hover:theme-bg-main"
                    }`}
                  >
                    {loading && activeAction === "explain" ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
                    Explain Topic
                  </button>
                ) : activeTab === "rag" ? (
                  <button 
                    onClick={handleRAGCompare}
                    disabled={loading}
                    className={`px-8 py-2.5 rounded-full text-sm font-semibold transition-all flex items-center gap-2 shadow-lg ${
                        activeAction === "rag" ? "theme-primary-bg text-white shadow-indigo-100" : "bg-white border theme-border theme-text-main hover:theme-bg-main"
                    }`}
                  >
                    {loading && activeAction === "rag" ? <RefreshCcw className="w-4 h-4 animate-spin" /> : < ChevronRight className="w-4 h-4" />}
                    Analyze Records
                  </button>
                ) : (
                  <>
                    {strategyStyle !== "auditory" && (
                      <button 
                        onClick={handleGenerateMindMap}
                        disabled={loading}
                        className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all flex items-center gap-2 shadow-lg ${
                          activeAction === "visual" ? "theme-primary-bg text-white shadow-indigo-100" : "bg-white border theme-border theme-text-main hover:theme-bg-main"
                        }`}
                      >
                        {loading && activeAction === "visual" ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <BrainCircuit className="w-4 h-4" />}
                        Visual Map
                      </button>
                    )}
                    
                    <button 
                      onClick={handleAuditoryBreakdown}
                      disabled={loading}
                      className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all flex items-center gap-2 shadow-lg ${
                        activeAction === "auditory" ? "theme-primary-bg text-white shadow-indigo-100" : "bg-white border theme-border theme-text-main hover:theme-bg-main"
                      }`}
                    >
                      {loading && activeAction === "auditory" ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
                      Audio Experience
                    </button>

                    {strategyStyle !== "auditory" && (
                      <button 
                        onClick={handleLearningPath}
                        disabled={loading}
                        className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all flex items-center gap-2 shadow-lg ${
                          activeAction === "plan" ? "theme-primary-bg text-white shadow-indigo-100" : "bg-white border theme-border theme-text-main hover:theme-bg-main"
                        }`}
                      >
                        {loading && activeAction === "plan" ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                        Study Plan
                      </button>
                    )}
                  </>
                )}
                
                <button 
                  onClick={handleGenerateQuiz}
                  disabled={loading}
                  className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all flex items-center gap-2 shadow-lg ${
                    activeAction === "quiz" ? "theme-primary-bg text-white shadow-indigo-100" : "bg-white border theme-border theme-text-main hover:theme-bg-main"
                  }`}
                >
                  {loading && activeAction === "quiz" ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Trophy className="w-4 h-4" />}
                  Quick Quiz
                </button>
              </div>
              <div className="flex items-center gap-6 text-[10px] font-bold theme-text-muted uppercase tracking-widest">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full theme-primary-bg animate-pulse" />
                  Latency: <span className="theme-text-main">1.2s</span>
                </div>
                <div className="flex items-center gap-2">
                  Model: <span className="theme-text-main">Flash 3</span>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Right Panel: Data & Quiz */}
        {activeTab !== "settings" && (
          <aside className="w-72 theme-bg-main border-l theme-border p-5 flex flex-col gap-8 shrink-0 overflow-y-auto">
            <div>
              <h3 className="text-[10px] font-bold theme-text-main uppercase tracking-widest flex items-center gap-2 mb-4">
                  <LayoutDashboard className="w-4 h-4 theme-primary-text" />
                  Knowledge Stats
              </h3>
  
              <div className="space-y-4">
                  <div className="theme-bg-card rounded-xl p-4 border theme-border shadow-sm transition-transform hover:scale-[1.02]">
                  <div className="flex items-center justify-between mb-3 text-[10px] font-bold theme-text-muted uppercase">
                      <p>Grounding Accuracy</p>
                      <span className="text-emerald-600">98%</span>
                  </div>
                  <div className="flex gap-1.5">
                      <div className="h-1 flex-1 bg-emerald-500 rounded-full"></div>
                      <div className="h-1 flex-1 bg-emerald-500 rounded-full"></div>
                      <div className="h-1 flex-1 bg-emerald-500 rounded-full"></div>
                      <div className="h-1 flex-1 theme-bg-main rounded-full"></div>
                  </div>
                  </div>
  
                  <div className="theme-bg-card rounded-xl p-4 border theme-border shadow-sm">
                  <p className="text-[10px] font-bold theme-text-muted uppercase mb-3">Contextual Chunks</p>
                  <div className="space-y-2">
                      <div className="p-2 theme-bg-main rounded text-[10px] theme-text-muted border-l-2 theme-primary-border font-medium">
                      "...superposition is fundamental..."
                      </div>
                      <div className="p-2 theme-bg-main rounded text-[10px] theme-text-muted border-l-2 theme-primary-border font-medium">
                      "...entanglement distance invariant..."
                      </div>
                  </div>
                  </div>
              </div>
            </div>
  
            <div className="mt-auto border-t theme-border pt-8">
              <h4 className="text-[11px] font-bold theme-text-muted uppercase tracking-widest mb-4 flex items-center justify-between">
                  <span>Interactive Quiz</span>
                  {quiz.length > 0 && <span className="theme-primary-text">Active</span>}
              </h4>
  
              {quiz.length > 0 ? (
                  <motion.div 
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="theme-bg-card rounded-xl p-5 border theme-border shadow-sm relative overflow-hidden"
                  >
                      <div className="absolute top-0 right-0 p-2 opacity-10">
                          <Trophy className="w-8 h-8 theme-primary-text" />
                      </div>
                      <p className="text-xs font-bold mb-4 leading-tight theme-text-main pr-4">
                          {quiz[currentQuizIndex].question}
                      </p>
                      <div className="space-y-2 mb-4">
                          {quiz[currentQuizIndex].options.map((opt, idx) => (
                              <button 
                                  key={idx}
                                  onClick={() => !quizFeedback && checkAnswer(idx)}
                                  disabled={!!quizFeedback}
                                  className={`w-full px-3 py-2.5 rounded border text-[11px] text-left transition-all font-medium ${
                                      quizFeedback
                                          ? idx === quiz[currentQuizIndex].correctAnswerIndex
                                              ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                                              : "theme-border opacity-40"
                                          : "theme-border theme-bg-main hover:theme-primary-border theme-text-muted"
                                  }`}
                              >
                                  {opt}
                              </button>
                          ))}
                      </div>
  
                      <AnimatePresence>
                          {quizFeedback && (
                              <motion.div 
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: "auto" }}
                                  className="mb-4 text-[10px] theme-text-muted theme-bg-main p-2 rounded border theme-border italic"
                              >
                                  {quizFeedback.explanation}
                              </motion.div>
                          )}
                      </AnimatePresence>
  
                      <div className="pt-4 border-t theme-border flex items-center justify-between">
                          <span className="text-[9px] theme-primary-text font-bold uppercase tracking-tight">Question {currentQuizIndex + 1} of {quiz.length}</span>
                          <button 
                              onClick={nextQuestion}
                              className={`group text-[10px] font-bold theme-text-main flex items-center gap-1 hover:theme-primary-text transition-colors uppercase`}
                          >
                              {currentQuizIndex === quiz.length - 1 ? "Finish" : "Next"}
                              <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                          </button>
                      </div>
                  </motion.div>
              ) : (
                  <div className="theme-bg-card/50 border border-dashed theme-border rounded-xl p-8 flex flex-col items-center justify-center text-center opacity-60 transition-opacity hover:opacity-100 cursor-help" onClick={handleGenerateQuiz}>
                      <Trophy className="w-8 h-8 theme-text-muted mb-3" />
                      <p className="text-[10px] font-bold theme-text-muted uppercase tracking-widest">No Active Quiz</p>
                      <p className="text-[10px] mt-1 theme-text-muted">Click to generate from current topic</p>
                  </div>
              )}
            </div>
          </aside>
        )}
      </main>
    </div>
  );
}

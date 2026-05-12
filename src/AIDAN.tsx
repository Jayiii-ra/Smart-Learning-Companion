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
  Upload,
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
import ReactMarkdown from "react-markdown";

type Tab = "explain" | "strategy" | "rag" | "upload_lecture" | "settings";
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

interface QuizAttempt {
  id: string;
  topic: string;
  score: number;
  total: number;
  date: string;
  questions: QuizQuestion[];
}

interface KinestheticTask {
  task: string;
  description: string;
  material: string;
  goal: string;
}

export default function AIDAN() {
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
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("beginner");

  // Learning Strategy params
  const [strategyStyle, setStrategyStyle] = useState("visual");

  // RAG params
  const [ragQuery, setRagQuery] = useState("");
  const [groundedResult, setGroundedResult] = useState("");
  const [vanillaResult, setVanillaResult] = useState("");
  const [exporting, setExporting] = useState(false);
  const [activeAction, setActiveAction] = useState<"visual" | "plan" | "quiz" | "explain" | "rag" | "auditory" | "kinesthetic" | "lecture_summary">("explain");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [kinestheticTasks, setKinestheticTasks] = useState<KinestheticTask[]>([]);
  const [lectureContent, setLectureContent] = useState("");
  const [lectureFileName, setLectureFileName] = useState("");
  const [speechInstance, setSpeechInstance] = useState<SpeechSynthesisUtterance | null>(null);
  const [showTranscript, setShowTranscript] = useState(true);

  // Quiz state
  const [quiz, setQuiz] = useState<QuizQuestion[]>([]);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [quizFeedback, setQuizFeedback] = useState<{correct: boolean, explanation: string} | null>(null);
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [isQuizFinished, setIsQuizFinished] = useState(false);
  const [quizHistory, setQuizHistory] = useState<QuizAttempt[]>([]);
  const [viewingAttempt, setViewingAttempt] = useState<QuizAttempt | null>(null);

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
    if (!topic.trim()) return;
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
    if (!topic.trim()) return;
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
    if (!topic.trim()) return;
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
    if (!topic.trim()) return;
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

  const handleKinestheticTasks = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setActiveAction("kinesthetic");
    setKinestheticTasks([]);
    try {
      const prompt = PROMPTS.KINESTHETIC_TASKS(topic);
      const json = await askGemini(prompt, true);
      setKinestheticTasks(json);
    } catch (e) {
      console.error(e);
      setResult("Error generating kinesthetic tasks.");
    } finally {
      setLoading(false);
    }
  };

  const handleSummarizeLecture = async () => {
    if (!lectureContent) return;
    setLoading(true);
    setActiveAction("lecture_summary");
    try {
      const prompt = PROMPTS.SUMMARIZE_LECTURE(lectureContent);
      const text = await askGemini(prompt);
      setResult(text);
    } catch (e) {
      setResult("Error summarizing lecture.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuizFromLecture = async () => {
    if (!lectureContent) return;
    setLoading(true);
    setActiveAction("quiz");
    setQuiz([]);
    setCurrentQuizIndex(0);
    setQuizFeedback(null);
    setCorrectCount(0);
    setIsQuizFinished(false);
    try {
      const prompt = PROMPTS.QUIZ_FROM_LECTURE(lectureContent);
      const json = await askGemini(prompt, true);
      setQuiz(json);
      setShowQuizModal(true);
    } catch (e) {
      console.error(e);
      setResult("Error generating quiz from lecture.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLectureFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      setLectureContent(event.target?.result as string);
    };
    reader.readAsText(file);
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
    if (!topic.trim()) return;
    setLoading(true);
    setActiveAction("quiz");
    setQuiz([]);
    setCurrentQuizIndex(0);
    setQuizFeedback(null);
    setCorrectCount(0);
    setIsQuizFinished(false);
    try {
      const prompt = PROMPTS.DYNAMIC_QUIZZER(topic);
      const json = await askGemini(prompt, true);
      setQuiz(json);
      setShowQuizModal(true);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleRAGCompare = async () => {
    if (!ragQuery.trim()) return;
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
    const isCorrect = index === quiz[currentQuizIndex].correctAnswerIndex;
    if (isCorrect) setCorrectCount(prev => prev + 1);
    setQuizFeedback({
      correct: isCorrect,
      explanation: quiz[currentQuizIndex].explanation
    });
  };

  const nextQuestion = () => {
    if (currentQuizIndex < quiz.length - 1) {
      setCurrentQuizIndex(currentQuizIndex + 1);
      setQuizFeedback(null);
    } else {
      setIsQuizFinished(true);
      const attempt: QuizAttempt = {
        id: Math.random().toString(36).substr(2, 9),
        topic,
        score: correctCount + (quizFeedback?.correct ? 0 : 0), // Note: checkAnswer already updated correctCount
        total: quiz.length,
        date: new Date().toLocaleString(),
        questions: quiz
      };
      // Final adjustment if they just answered the last one correctly
      // Actually correctCount is already updated in checkAnswer
      setQuizHistory([attempt, ...quizHistory]);
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
            <div className="w-10 h-10 theme-primary-bg rounded-xl flex items-center justify-center text-white font-bold text-xl">A</div>
            <h1 className="text-2xl font-bold tracking-tight theme-text-main">AIDAN</h1>
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
    <div className="h-screen flex flex-col theme-bg-main font-sans overflow-hidden theme-text-main relative">
      {/* Quiz Modal */}
      <AnimatePresence>
        {showQuizModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-lg theme-bg-card rounded-3xl shadow-2xl overflow-hidden border theme-border"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 theme-primary-bg rounded-xl flex items-center justify-center text-white">
                      <Trophy className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold theme-text-main">Knowledge Check</h3>
                      <p className="text-xs theme-text-muted uppercase tracking-widest font-bold">Topic: {topic}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowQuizModal(false)}
                    className="w-8 h-8 rounded-full theme-bg-main flex items-center justify-center theme-text-muted hover:theme-text-main transition-colors"
                  >
                    <XCircle className="w-6 h-6" />
                  </button>
                </div>

                {!isQuizFinished ? (
                  <>
                    <div className="mb-8">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] font-bold theme-primary-text uppercase tracking-tighter">Question {currentQuizIndex + 1} of {quiz.length}</span>
                        <div className="flex gap-1">
                          {quiz.map((_, i) => (
                            <div key={i} className={`h-1.5 w-6 rounded-full transition-all ${i === currentQuizIndex ? 'theme-primary-bg' : i < currentQuizIndex ? 'bg-emerald-500' : 'theme-bg-main'}`} />
                          ))}
                        </div>
                      </div>
                      <h4 className="text-lg font-semibold theme-text-main leading-snug">
                        {quiz[currentQuizIndex]?.question}
                      </h4>
                    </div>

                    <div className="space-y-3 mb-8">
                      {quiz[currentQuizIndex]?.options.map((opt, idx) => (
                        <button 
                          key={idx}
                          onClick={() => !quizFeedback && checkAnswer(idx)}
                          disabled={!!quizFeedback}
                          className={`w-full p-4 rounded-2xl border-2 text-left transition-all font-medium flex items-center justify-between group ${
                            quizFeedback
                              ? idx === quiz[currentQuizIndex].correctAnswerIndex
                                ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                                : quizFeedback.correct === false && idx === quiz[currentQuizIndex].options.indexOf(opt) // This is a bit complex, let's just use idx
                                  ? "border-rose-200 bg-rose-50 opacity-100" 
                                  : "theme-border opacity-40 shadow-none"
                              : "theme-border theme-bg-card hover:theme-primary-border hover:shadow-md theme-text-main"
                          }`}
                        >
                          <span className="text-sm">{opt}</span>
                          {quizFeedback && idx === quiz[currentQuizIndex].correctAnswerIndex && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                        </button>
                      ))}
                    </div>

                    <AnimatePresence>
                      {quizFeedback && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`p-4 rounded-2xl mb-8 border-l-4 text-sm ${quizFeedback.correct ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-rose-50 border-rose-500 text-rose-700'}`}
                        >
                          <div className="flex gap-3">
                            {quizFeedback.correct ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <XCircle className="w-5 h-5 shrink-0" />}
                            <div>
                              <p className="font-bold mb-1">{quizFeedback.correct ? "Excellent!" : "Not quite..."}</p>
                              <p className="opacity-90 leading-relaxed">{quizFeedback.explanation}</p>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="flex justify-end">
                      <button 
                        onClick={nextQuestion}
                        disabled={!quizFeedback}
                        className={`px-8 py-3 rounded-full font-bold flex items-center gap-2 transition-all ${quizFeedback ? 'theme-primary-bg text-white shadow-xl hover:opacity-90' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                      >
                        {currentQuizIndex === quiz.length - 1 ? "Complete Quiz" : "Next Question"}
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <motion.div
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: [1.2, 1], opacity: 1 }}
                      transition={{ type: "spring", stiffness: 200 }}
                      className="mb-8"
                    >
                      <div className="w-24 h-24 theme-primary-bg rounded-full flex items-center justify-center text-white mx-auto mb-6 shadow-2xl relative">
                         <Trophy className="w-12 h-12" />
                         <motion.div 
                          animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                          transition={{ repeat: Infinity, duration: 2 }}
                          className="absolute inset-0 rounded-full bg-white/20"
                         />
                      </div>
                      <motion.h4 
                        animate={{ scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] }}
                        transition={{ repeat: 1, duration: 0.5 }}
                        className="text-4xl font-black theme-primary-text mb-2 tracking-tighter"
                      >
                        {Math.round((correctCount / quiz.length) * 100)}%
                      </motion.h4>
                      <p className="text-xl font-bold theme-text-main">
                        Score: {correctCount} / {quiz.length}
                      </p>
                    </motion.div>

                    <p className="theme-text-muted mb-12 max-w-xs mx-auto">
                      Great effort! You've just strengthened your understanding of <strong>{topic}</strong>. This attempt has been saved to your history.
                    </p>

                    <div className="flex gap-4">
                      <button 
                        onClick={() => {
                          setShowQuizModal(false);
                          setIsQuizFinished(false);
                        }}
                        className="flex-1 py-4 theme-bg-card border-2 theme-border theme-text-main rounded-2xl font-bold hover:theme-bg-main transition-all"
                      >
                        Finish & Review
                      </button>
                      <button 
                        onClick={handleGenerateQuiz}
                        className="flex-1 py-4 theme-primary-bg text-white rounded-2xl font-bold shadow-lg hover:opacity-90 transition-all flex items-center justify-center gap-2"
                      >
                        <RefreshCcw className="w-5 h-5" /> Retake Quiz
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewingAttempt && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-2xl theme-bg-card rounded-3xl shadow-2xl overflow-hidden border theme-border flex flex-col max-h-[80vh]"
            >
              <div className="p-8 border-b theme-border shrink-0 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold theme-text-main">Review Session</h3>
                  <p className="text-xs theme-text-muted uppercase tracking-widest font-bold">Topic: {viewingAttempt.topic} • {viewingAttempt.date}</p>
                </div>
                <button 
                  onClick={() => setViewingAttempt(null)}
                  className="w-8 h-8 rounded-full theme-bg-main flex items-center justify-center theme-text-muted hover:theme-text-main transition-colors"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
              <div className="p-8 overflow-y-auto space-y-8 flex-1 custom-scrollbar">
                {viewingAttempt.questions.map((q, i) => (
                  <div key={i} className="space-y-4">
                    <h4 className="font-bold theme-text-main flex gap-3">
                      <span className="theme-primary-text">Q{i+1}.</span>
                      {q.question}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {q.options.map((opt, idx) => (
                         <div 
                          key={idx}
                          className={`p-3 rounded-xl border-2 text-xs font-medium ${
                            idx === q.correctAnswerIndex 
                              ? "border-emerald-500 bg-emerald-50 text-emerald-700" 
                              : "theme-border theme-text-muted opacity-60"
                          }`}
                         >
                          {opt}
                         </div>
                      ))}
                    </div>
                    <div className="p-4 theme-bg-main rounded-xl border theme-border text-[11px] leading-relaxed italic">
                      <strong>Insight:</strong> {q.explanation}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Navigation Bar */}
      <header className="h-16 theme-bg-card border-b theme-border flex items-center justify-between px-8 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 theme-primary-bg rounded-lg flex items-center justify-center text-white font-bold">A</div>
          <h1 className="text-xl font-semibold tracking-tight theme-text-main">AIDAN - your AI Digital Academic Navigator</h1>
        </div>
        <div className="flex items-center gap-6">
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
                { id: "explain", label: "Quick Explainer", icon: BookOpen },
                { id: "strategy", label: "Learning Method", icon: Zap },
                { id: "rag", label: "Knowledge Base", icon: FileSearch },
                { id: "upload_lecture", label: "Upload Lecture", icon: FileText },
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



          <div className="mt-auto pt-8 border-t theme-border min-h-[200px] flex flex-col">
            <label className="text-[10px] font-bold theme-text-muted uppercase tracking-widest mb-4 block flex items-center gap-2">
                <RotateCcw className="w-3 h-3" /> Review History
            </label>
            <div className="flex-1 space-y-3 overflow-y-auto custom-scrollbar pr-2 min-h-0">
              {quizHistory.length === 0 ? (
                <div className="p-4 theme-bg-main rounded-xl border border-dashed theme-border text-center opacity-50">
                  <p className="text-[9px] theme-text-muted italic">Complete a quiz to see your history here.</p>
                </div>
              ) : (
                quizHistory.map((attempt) => (
                  <button 
                    key={attempt.id}
                    onClick={() => setViewingAttempt(attempt)}
                    className="w-full text-left p-3 theme-bg-card border theme-border rounded-xl hover:theme-primary-border transition-all group shadow-sm"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <p className="text-[10px] font-bold theme-text-main truncate pr-2 flex-1">{attempt.topic}</p>
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                        (attempt.score / attempt.total) >= 0.7 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                      }`}>
                        {attempt.score}/{attempt.total}
                      </span>
                    </div>
                    <p className="text-[8px] theme-text-muted group-hover:theme-text-main transition-colors">{attempt.date}</p>
                  </button>
                ))
              )}
            </div>
          </div>
        </aside>

        {/* Center Pane: AI Workspace */}
        <section className="flex-1 flex flex-col min-w-0 theme-bg-card border-x theme-border">
          <div className="p-4 lg:p-6 flex-1 overflow-hidden flex flex-col">
            <div className="mb-6 flex items-end justify-between">
              <div>
                <h2 className="text-xl lg:text-2xl font-bold theme-text-main mb-1 flex items-center gap-2">
                    {activeTab === "explain" && "Quick Explainer"}
                    {activeTab === "strategy" && "Learning Method"}
                    {activeTab === "rag" && "Knowledge Base"}
                    {activeTab === "upload_lecture" && "Upload Lecture"}
                    {activeTab === "settings" && "Account Settings"}
                </h2>
                <p className="text-sm theme-text-muted">
                    {activeTab === "settings" ? "Customize your learning experience and visual theme." : activeTab === "upload_lecture" ? "Upload your lecture notes to summarize or generate practice tests." : "Select a topic below and let AI guide your learning journey."}
                </p>
              </div>
              {activeTab !== "settings" && (activeTab === "rag" ? ragQuery.trim() : topic.trim()) !== "" && (
                <div className="flex gap-2">
                  <span className="px-3 py-1 theme-bg-main rounded-full text-[10px] font-bold theme-text-muted uppercase tracking-widest border theme-border">
                      {activeTab === "rag" ? ragQuery : topic}
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
                      placeholder="What would you like to learn today?"
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
                            className="space-y-8 h-full flex flex-col"
                        >
                            <div className="flex-1 overflow-auto custom-scrollbar">
                                {!groundedResult && !vanillaResult ? (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-50">
                                        <FileSearch className="w-16 h-16 mb-4" />
                                        <p className="font-bold text-sm tracking-widest uppercase">Verified Content Comparison</p>
                                        <p className="text-[10px] mt-2 tracking-tight">Search using prompt to see grounded vs standard AI answers</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-full">
                                        {/* Standard AI Answer */}
                                        <div className="flex flex-col h-full">
                                            <div className="flex items-center gap-2 mb-4 shrink-0">
                                                <div className="w-2 h-2 rounded-full bg-slate-300" />
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Standard AI Answer</span>
                                            </div>
                                            <div className="flex-1 p-6 bg-slate-50 rounded-xl border border-slate-100 text-sm leading-relaxed text-slate-600 italic overflow-auto">
                                                {vanillaResult}
                                            </div>
                                        </div>
                                        {/* Verified Library Answer */}
                                        <div className="flex flex-col h-full">
                                            <div className="flex items-center gap-2 mb-4 shrink-0">
                                                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Verified Library Answer</span>
                                            </div>
                                            <div className="flex-1 p-6 theme-bg-card rounded-xl border-2 border-indigo-100 text-sm leading-relaxed theme-text-main shadow-sm overflow-auto">
                                                {groundedResult}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ) : activeTab === "upload_lecture" ? (
                        <motion.div 
                            key="lecture-lab-result"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="space-y-8 h-full flex flex-col"
                        >
                            {/* Upload Section */}
                            <div className="shrink-0 mb-8 border-b theme-border pb-8">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2 theme-text-main">
                                        <Upload className="w-4 h-4 theme-primary-text" /> 
                                        Lecture Repository
                                    </h3>
                                    {lectureFileName && (
                                        <span className="text-[10px] bg-indigo-50 theme-primary-text font-bold px-2 py-0.5 rounded border border-indigo-200">
                                            {lectureFileName}
                                        </span>
                                    )}
                                </div>
                                <div className="flex gap-4">
                                    <label className="flex-1 theme-bg-card border-2 border-dashed theme-border rounded-2xl p-6 hover:theme-primary-border transition-all cursor-pointer flex flex-col items-center justify-center text-center">
                                        <input type="file" className="hidden" onChange={handleFileUpload} accept=".txt" />
                                        <Upload className="w-8 h-8 theme-text-muted mb-2" />
                                        <p className="text-[11px] font-bold theme-text-muted uppercase tracking-tight">Upload Lecture Note</p>
                                        <p className="text-[10px] theme-text-muted opacity-60 mt-1">Accepts .txt files</p>
                                    </label>
                                    <div className="flex flex-col gap-2 w-48">
                                        <button 
                                            onClick={handleSummarizeLecture}
                                            disabled={!lectureContent || loading}
                                            className="flex-1 theme-bg-card border theme-border rounded-xl px-4 text-[11px] font-bold uppercase flex items-center justify-center gap-2 hover:theme-bg-main disabled:opacity-40 transition-all theme-text-main"
                                        >
                                            <FileText className="w-4 h-4 text-emerald-500" /> Summarize
                                        </button>
                                        <button 
                                            onClick={handleQuizFromLecture}
                                            disabled={!lectureContent || loading}
                                            className="flex-1 theme-bg-card border theme-border rounded-xl px-4 text-[11px] font-bold uppercase flex items-center justify-center gap-2 hover:theme-bg-main disabled:opacity-40 transition-all theme-text-main"
                                        >
                                            <Trophy className="w-4 h-4 text-orange-500" /> Start Quiz
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 overflow-auto custom-scrollbar">
                                {!result ? (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-50">
                                        <Upload className="w-16 h-16 mb-4" />
                                        <p className="font-bold text-sm tracking-widest uppercase">Select Lecture to Begin</p>
                                        <p className="text-[10px] mt-2 tracking-tight">Generate summaries and quizes directly from your sources</p>
                                    </div>
                                ) : (
                                    <div className="p-8 bg-slate-50 rounded-2xl border theme-border">
                                        <div className="markdown-study-plan prose prose-indigo max-w-none">
                                            <ReactMarkdown>{result || ""}</ReactMarkdown>
                                        </div>
                                    </div>
                                )}
                            </div>
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
                                                        className="flex items-center gap-1.5 px-3 py-1 theme-bg-card border theme-border rounded text-[10px] font-bold hover:theme-bg-main transition-colors theme-text-main"
                                                        title="Download as JPG"
                                                    >
                                                        <FileImage className="w-3 h-3 text-indigo-600" /> JPG
                                                    </button>
                                                    <button 
                                                        type="button"
                                                        onClick={(e) => downloadAsPDF(e, 'mindmap')}
                                                        className="flex items-center gap-1.5 px-3 py-1 theme-bg-card border theme-border rounded text-[10px] font-bold hover:theme-bg-main transition-colors theme-text-main"
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

                            {activeAction === "kinesthetic" && kinestheticTasks.length > 0 && (
                                <div className="flex flex-col border-b theme-border pb-12">
                                     <div className="flex items-center gap-2 mb-6 border-b theme-border pb-4 shrink-0">
                                        <div className="w-6 h-6 bg-orange-100 rounded flex items-center justify-center">
                                            <Hand className="w-4 h-4 text-orange-600" />
                                        </div>
                                        <span className="text-[10px] font-bold theme-text-muted uppercase tracking-widest flex-1">
                                            Hands-on Laboratory
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        {kinestheticTasks.map((item, i) => (
                                            <motion.div
                                                key={i}
                                                initial={{ opacity: 0, scale: 0.95 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ delay: i * 0.1 }}
                                                className="theme-bg-card border-2 theme-border rounded-2xl p-6 hover:theme-primary-border transition-all group shadow-sm flex flex-col"
                                            >
                                                <div className="flex justify-between items-start mb-4">
                                                    <h4 className="font-bold theme-text-main group-hover:theme-primary-text transition-colors">{item.task}</h4>
                                                    <span className="text-[9px] font-black theme-primary-text uppercase bg-indigo-50 px-2 py-0.5 rounded">Action Item</span>
                                                </div>
                                                <p className="text-xs theme-text-muted leading-relaxed mb-6 flex-1">
                                                    {item.description}
                                                </p>
                                                <div className="space-y-3 pt-4 border-t theme-border">
                                                    <div className="flex items-center gap-2">
                                                        <Zap className="w-3 h-3 theme-primary-text" />
                                                        <span className="text-[10px] font-bold theme-text-main uppercase">Goal:</span>
                                                        <span className="text-[10px] theme-text-muted">{item.goal}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Palette className="w-3 h-3 text-orange-500" />
                                                        <span className="text-[10px] font-bold theme-text-main uppercase">Tools:</span>
                                                        <span className="text-[10px] theme-text-muted">{item.material}</span>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            
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
                                                        className="flex items-center gap-1.5 px-3 py-1 theme-bg-card border theme-border rounded text-[10px] font-bold hover:theme-bg-main transition-colors theme-text-main"
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
                                                <div className="markdown-study-plan prose prose-indigo">
                                                    <ReactMarkdown>{result}</ReactMarkdown>
                                                </div>
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
                        activeAction === "explain" ? "theme-primary-bg text-white shadow-indigo-100" : "theme-bg-card border theme-border theme-text-main hover:theme-bg-main"
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
                        activeAction === "rag" ? "theme-primary-bg text-white shadow-indigo-100" : "theme-bg-card border theme-border theme-text-main hover:theme-bg-main"
                    }`}
                  >
                    {loading && activeAction === "rag" ? <RefreshCcw className="w-4 h-4 animate-spin" /> : < ChevronRight className="w-4 h-4" />}
                    Search Knowledge
                  </button>
                ) : (
                  <>
                    {strategyStyle === "visual" && (
                      <button 
                        onClick={handleGenerateMindMap}
                        disabled={loading}
                        className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all flex items-center gap-2 shadow-lg ${
                          activeAction === "visual" ? "theme-primary-bg text-white shadow-indigo-100" : "theme-bg-card border theme-border theme-text-main hover:theme-bg-main"
                        }`}
                      >
                        {loading && activeAction === "visual" ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <BrainCircuit className="w-4 h-4" />}
                        Visual Map
                      </button>
                    )}
                    
                    {strategyStyle === "auditory" && (
                      <button 
                        onClick={handleAuditoryBreakdown}
                        disabled={loading}
                        className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all flex items-center gap-2 shadow-lg ${
                          activeAction === "auditory" ? "theme-primary-bg text-white shadow-indigo-100" : "theme-bg-card border theme-border theme-text-main hover:theme-bg-main"
                        }`}
                      >
                        {loading && activeAction === "auditory" ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
                        Podcast Breakdown
                      </button>
                    )}

                    {strategyStyle === "kinesthetic" && (
                      <button 
                        onClick={handleKinestheticTasks}
                        disabled={loading}
                        className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all flex items-center gap-2 shadow-lg ${
                          activeAction === "kinesthetic" ? "theme-primary-bg text-white shadow-indigo-100" : "theme-bg-card border theme-border theme-text-main hover:theme-bg-main"
                        }`}
                      >
                        {loading && activeAction === "kinesthetic" ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Hand className="w-4 h-4" />}
                        Kinesthetic Lab
                      </button>
                    )}

                    {strategyStyle === "visual" && (
                      <button 
                        onClick={handleLearningPath}
                        disabled={loading}
                        className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all flex items-center gap-2 shadow-lg ${
                          activeAction === "plan" ? "theme-primary-bg text-white shadow-indigo-100" : "theme-bg-card border theme-border theme-text-main hover:theme-bg-main"
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
                    activeAction === "quiz" ? "theme-primary-bg text-white shadow-indigo-100" : "theme-bg-card border theme-border theme-text-main hover:theme-bg-main"
                  }`}
                >
                  {loading && activeAction === "quiz" ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Trophy className="w-4 h-4" />}
                  Quick Quiz
                </button>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
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
  Zap
} from "lucide-react";
import { PROMPTS } from "./lib/prompts";
import { askGemini } from "./lib/gemini";

type Tab = "explain" | "strategy" | "rag";

interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("explain");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  
  // Adaptive Explain params
  const [topic, setTopic] = useState("Quantum Computing");
  const [difficulty, setDifficulty] = useState("beginner");

  // Learning Strategy params
  const [strategyStyle, setStrategyStyle] = useState("visual");

  // RAG params
  const [ragQuery, setRagQuery] = useState("What is superposition?");
  const [groundedResult, setGroundedResult] = useState("");
  const [vanillaResult, setVanillaResult] = useState("");

  // Quiz state
  const [quiz, setQuiz] = useState<QuizQuestion[]>([]);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [quizFeedback, setQuizFeedback] = useState<{correct: boolean, explanation: string} | null>(null);

  const handleExplain = async () => {
    setLoading(true);
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

  const handleGenerateQuiz = async () => {
    setLoading(true);
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

  return (
    <div className="h-screen flex flex-col bg-slate-50 font-sans overflow-hidden text-slate-900">
      {/* Top Navigation Bar */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">S</div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-800">Smart Learning Companion</h1>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center bg-slate-100 rounded-full px-4 py-1.5 gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Gemini 3 Flash Online</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-semibold">User Learner</p>
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">Personal Learning Path</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-slate-200 border-2 border-white shadow-sm flex items-center justify-center">
                <BrainCircuit className="w-5 h-5 text-slate-400" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Application Layout */}
      <main className="flex flex-1 overflow-hidden">
        
        {/* Left Sidebar: Configuration */}
        <aside className="w-72 bg-white border-r border-slate-200 p-6 flex flex-col gap-8 shrink-0 overflow-y-auto">
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4 block flex items-center gap-2">
                <Settings2 className="w-3 h-3" /> Navigation
            </label>
            <div className="space-y-1">
              {[
                { id: "explain", label: "Explanation Engine", icon: BookOpen },
                { id: "strategy", label: "Strategy Builder", icon: Zap },
                { id: "rag", label: "RAG Playground", icon: FileSearch },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => { setActiveTab(item.id as Tab); setResult(null); }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg font-medium text-sm transition-all ${
                    activeTab === item.id 
                      ? "bg-indigo-50 text-indigo-700 border border-indigo-100 shadow-sm" 
                      : "text-slate-500 hover:bg-slate-50"
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
                  onClick={() => setStrategyStyle(style.id)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg border transition-all font-medium text-sm ${
                    strategyStyle === style.id 
                      ? "border-indigo-100 bg-indigo-50 text-indigo-700 shadow-sm" 
                      : "border-transparent text-slate-600 hover:bg-slate-50"
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
        <section className="flex-1 flex flex-col min-w-0 bg-white">
          <div className="p-8 flex-1 overflow-hidden flex flex-col">
            <div className="mb-8 flex items-end justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-800 mb-1 flex items-center gap-2">
                    {activeTab === "explain" && "Adaptive Explanation Engine"}
                    {activeTab === "strategy" && "Dynamic Strategy Builder"}
                    {activeTab === "rag" && "Grounded RAG Playground"}
                </h2>
                <p className="text-sm text-slate-500">Define your curriculum and generate precision AI responses.</p>
              </div>
              <div className="flex gap-2">
                <span className="px-3 py-1 bg-slate-100 rounded-full text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    {topic}
                </span>
              </div>
            </div>

            {/* Active Topic Box */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 flex-1 flex flex-col shadow-inner overflow-hidden">
              <div className="flex items-center gap-4 mb-6">
                <span className="text-indigo-600 font-bold tracking-tighter text-xs">TOPIC:</span>
                <input 
                    type="text" 
                    value={activeTab === "rag" ? ragQuery : topic}
                    onChange={(e) => activeTab === "rag" ? setRagQuery(e.target.value) : setTopic(e.target.value)}
                    className="flex-1 bg-white border border-slate-200 px-6 py-2.5 rounded-full text-sm font-medium text-slate-700 shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-300"
                    placeholder="Enter topic here..."
                />
              </div>

              {/* AI Output Result Mapping */}
              <div className="flex-1 bg-white rounded-xl border border-slate-200 p-8 shadow-sm overflow-y-auto custom-scrollbar relative">
                <AnimatePresence mode="wait">
                    {loading ? (
                        <motion.div 
                            key="loading"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 flex flex-col items-center justify-center bg-white/50 backdrop-blur-sm z-10"
                        >
                            <RefreshCcw className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
                            <p className="text-sm font-bold text-indigo-700 animate-pulse uppercase tracking-widest">Processing Query...</p>
                        </motion.div>
                    ) : null}

                    {activeTab === "rag" ? (
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
                            className="prose prose-slate max-w-none prose-sm"
                        >
                            {result ? (
                                <>
                                    <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
                                        <div className="w-6 h-6 bg-emerald-100 rounded flex items-center justify-center">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                            {activeTab === "explain" ? "Adaptive Explanation Output" : "Customized Strategy Path"}
                                        </span>
                                    </div>
                                    <div className="whitespace-pre-wrap leading-relaxed text-slate-700">
                                        {result}
                                    </div>
                                    
                                    {activeTab === "strategy" && (
                                        <div className="bg-indigo-50 rounded-lg p-5 border border-indigo-100 mt-8 shadow-sm">
                                            <p className="text-[10px] font-bold text-indigo-700 uppercase mb-2 tracking-widest flex items-center gap-2">
                                                <Lightbulb className="w-3 h-3" /> Practice Suggestion
                                            </p>
                                            <p className="text-xs italic text-indigo-900 leading-relaxed">
                                                "Integrate these concepts into your next project or study group to solidify the connections."
                                            </p>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-slate-200 py-10">
                                    <LayoutDashboard className="w-20 h-20 mb-4 opacity-50" />
                                    <p className="font-bold text-sm tracking-widest uppercase">Workspace Ready</p>
                                    <p className="text-xs mt-2 text-slate-400 tracking-tight">Run a query to see AI generated learning content</p>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Control Bar */}
          <div className="h-20 border-t border-slate-200 px-8 flex items-center justify-between shrink-0 bg-white">
            <div className="flex gap-4">
              <button 
                onClick={activeTab === "explain" ? handleExplain : activeTab === "strategy" ? handleLearningPath : handleRAGCompare}
                disabled={loading}
                className="px-8 py-2.5 bg-slate-900 text-white rounded-full text-sm font-semibold hover:bg-indigo-700 transition-all shadow-lg shadow-slate-200 flex items-center gap-2"
              >
                {loading ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
                Generate Output
              </button>
              <button 
                onClick={handleGenerateQuiz}
                className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-full text-sm font-semibold hover:bg-slate-50 transition-colors"
                disabled={loading}
              >
                Generate Quiz
              </button>
            </div>
            <div className="flex items-center gap-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                Latency: <span className="text-slate-800">1.2s</span>
              </div>
              <div className="flex items-center gap-2">
                Model: <span className="text-slate-800">Flash 3</span>
              </div>
            </div>
          </div>
        </section>

        {/* Right Panel: Data & Quiz */}
        <aside className="w-80 bg-slate-50 border-l border-slate-200 p-6 flex flex-col gap-8 shrink-0 overflow-y-auto">
          <div>
            <h3 className="text-[11px] font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-6">
                <LayoutDashboard className="w-4 h-4 text-indigo-500" />
                Knowledge Stats
            </h3>

            <div className="space-y-4">
                <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm transition-transform hover:scale-[1.02]">
                <div className="flex items-center justify-between mb-3 text-[10px] font-bold text-slate-400 uppercase">
                    <p>Grounding Accuracy</p>
                    <span className="text-emerald-600">98%</span>
                </div>
                <div className="flex gap-1.5">
                    <div className="h-1 flex-1 bg-emerald-500 rounded-full"></div>
                    <div className="h-1 flex-1 bg-emerald-500 rounded-full"></div>
                    <div className="h-1 flex-1 bg-emerald-500 rounded-full"></div>
                    <div className="h-1 flex-1 bg-slate-200 rounded-full"></div>
                </div>
                </div>

                <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-3">Contextual Chunks</p>
                <div className="space-y-2">
                    <div className="p-2 bg-slate-50 rounded text-[10px] text-slate-600 border-l-2 border-indigo-400 font-medium">
                    "...superposition is fundamental..."
                    </div>
                    <div className="p-2 bg-slate-50 rounded text-[10px] text-slate-600 border-l-2 border-indigo-400 font-medium">
                    "...entanglement distance invariant..."
                    </div>
                </div>
                </div>
            </div>
          </div>

          <div className="mt-auto border-t border-slate-200 pt-8">
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center justify-between">
                <span>Interactive Quiz</span>
                {quiz.length > 0 && <span className="text-indigo-600">Active</span>}
            </h4>

            {quiz.length > 0 ? (
                <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 p-2 opacity-10">
                        <Trophy className="w-8 h-8 text-indigo-600" />
                    </div>
                    <p className="text-xs font-bold mb-4 leading-tight text-slate-800 pr-4">
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
                                            : "border-slate-100 opacity-40"
                                        : "border-slate-100 bg-slate-50 hover:border-indigo-300 text-slate-600"
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
                                className="mb-4 text-[10px] text-slate-500 bg-slate-50 p-2 rounded border border-slate-100 italic"
                            >
                                {quizFeedback.explanation}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[9px] text-indigo-600 font-bold uppercase tracking-tight">Question {currentQuizIndex + 1} of {quiz.length}</span>
                        <button 
                            onClick={nextQuestion}
                            className={`group text-[10px] font-bold text-slate-800 flex items-center gap-1 hover:text-indigo-600 transition-colors uppercase`}
                        >
                            {currentQuizIndex === quiz.length - 1 ? "Finish" : "Next"}
                            <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                        </button>
                    </div>
                </motion.div>
            ) : (
                <div className="bg-white/50 border border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center text-center opacity-60 transition-opacity hover:opacity-100 cursor-help" onClick={handleGenerateQuiz}>
                    <Trophy className="w-8 h-8 text-slate-300 mb-3" />
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No Active Quiz</p>
                    <p className="text-[10px] mt-1 text-slate-400">Click to generate from current topic</p>
                </div>
            )}
          </div>
        </aside>
      </main>
    </div>
  );
}

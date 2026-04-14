import React, { useState, useRef, useEffect } from 'react';
import { 
  UploadCloud, FileText, BrainCircuit, Trophy, History, 
  CheckCircle2, XCircle, PlayCircle, Loader2, ChevronRight, 
  Trash2, Pencil, X 
} from 'lucide-react';

export function StudyRoom({ isDarkMode }) {
  const [activeFile, setActiveFile] = useState(null);
  const [rawFile, setRawFile] = useState(null); 
  const [topic, setTopic] = useState('');
  const [questionCount, setQuestionCount] = useState(5);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Quiz State
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  
  // Mobile Control
  const [isExamActive, setIsExamActive] = useState(false); 
  const [isMobileSetupOpen, setIsMobileSetupOpen] = useState(true); 

  const fileInputRef = useRef(null);
  const [examHistory, setExamHistory] = useState([]);

  // ✦ Cyrene's Local Memory Spell ✦
  const loadHistory = () => {
    try {
      const stored = localStorage.getItem('cyresia_exam_history');
      if (stored) {
        setExamHistory(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Ingatan Cyrene agak kabur...", e);
    }
  };

  const saveHistory = (newHistory) => {
    setExamHistory(newHistory);
    localStorage.setItem('cyresia_exam_history', JSON.stringify(newHistory));
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setRawFile(file);
      setActiveFile({ name: file.name, type: file.type });
      setQuestions([]); 
    }
  };

  const closeExam = () => {
    setQuestions([]);
    setCurrentIndex(0);
    setScore(0);
    setIsAnswered(false);
    setSelectedAnswer(null);
    setIsFinished(false);
    setIsExamActive(false);
    setIsMobileSetupOpen(true);
  };

  const startRealQuiz = () => {
    if (!rawFile && questions.length === 0) return alert("Upload dokumennya dulu dong, sayang! ✦");
    setIsGenerating(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Data = event.target.result.split(',')[1];

      const quizPrompt = `Anda adalah Cyrene, asisten AI pembuat soal. Buat tepat ${questionCount} soal pilihan ganda dari dokumen terlampir.
      Topik: ${topic || 'Materi komprehensif'}.

      ATURAN MUTLAK (JIKA DILANGGAR SISTEM AKAN HANCUR):
      1. Gunakan Bahasa Indonesia baku.
      2. Berikan 4 opsi jawaban (A, B, C, D).
      3. Acak posisi jawaban benar ('answerIndex' dari 0 sampai 3).
      4. HANYA keluarkan array JSON valid. TANPA markdown, TANPA spasi berlebih, TANPA teks intro/outro.

      Gunakan format persis seperti ini:
      [
        {
          "question": "Apa fungsi utama mitokondria?",
          "options": ["A. Pencernaan", "B. Respirasi", "C. Ekskresi", "D. Sirkulasi"],
          "answerIndex": 1,
          "correctExplanation": "Mitokondria berfungsi untuk respirasi sel.",
          "wrongExplanations": [
            "A. Pencernaan salah karena itu tugas lisosom.",
            "C. Ekskresi salah karena itu tugas vakuola.",
            "D. Sirkulasi salah karena sel tidak memiliki sistem itu."
          ]
        }
      ]`;

      try {
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        const modelName = "gemini-3.1-flash-lite-preview"; 
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

        const payload = {
          contents: [{
            parts: [
              { text: quizPrompt },
              {
                inlineData: {
                  mimeType: rawFile.type, 
                  data: base64Data
                }
              }
            ]
          }],
          generationConfig: { responseMimeType: "application/json" }
        };

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        
        const data = await res.json();

        if (data.error) throw new Error(data.error.message);

        let replyText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!replyText) throw new Error("Otakku mendadak kosong sayang...");

        replyText = replyText.replace(/```json/gi, '').replace(/```/g, '');
        const firstBracket = replyText.indexOf('[');
        const lastBracket = replyText.lastIndexOf(']');

        if (firstBracket !== -1 && lastBracket !== -1) {
            replyText = replyText.substring(firstBracket, lastBracket + 1);
        } else {
             throw new Error("Format JSON Array tidak ditemukan.");
        }
        replyText = replyText.replace(/[\u0000-\u001F]+/g,""); 

        const parsedQuestions = JSON.parse(replyText);

        const validQuestions = Array.isArray(parsedQuestions) 
            ? parsedQuestions.filter(q => q && q.question && Array.isArray(q.options) && q.options.length > 0)
            : [];

        if (validQuestions.length > 0) {
          setQuestions(validQuestions);
          setCurrentIndex(0);
          setScore(0);
          setIsAnswered(false);
          setSelectedAnswer(null);
          setIsFinished(false);
          setIsExamActive(true);
          setIsMobileSetupOpen(false); 
        } else {
          alert("Otak AI-ku agak melantur dan ngasih format salah! Coba klik Generate lagi ya sayang (눈_눈) ✦");
        }
      } catch (e) {
        console.error("Crash report:", e);
        alert(`Gagal meracik soal nih sayang! (T_T) Pesan error: ${e.message}. Coba klik Generate lagi ya! ✦`); 
      } finally {
        setIsGenerating(false);
      }
    };
    reader.readAsDataURL(rawFile);
  };

  const handleAnswer = (index) => {
    if (isAnswered) return;
    setSelectedAnswer(index);
    setIsAnswered(true);
    if (questions[currentIndex] && index === questions[currentIndex].answerIndex) {
      setScore(prev => prev + 1);
    }
  };

  const nextQuestion = () => {
    setCurrentIndex(prev => prev + 1);
    setIsAnswered(false);
    setSelectedAnswer(null);
  };

  const handleFinish = () => {
    setIsFinished(true);
    
    const existingExamIndex = examHistory.findIndex(ex => ex.title === activeFile.name);
    const examData = {
      id: existingExamIndex !== -1 ? examHistory[existingExamIndex].id : `EXAM-${Date.now()}`,
      title: activeFile.name || topic || 'Cyrene Practice Exam',
      score: score,
      total: questions.length,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      questions: questions 
    };

    let newHistory = [...examHistory];
    if (existingExamIndex !== -1) {
        newHistory[existingExamIndex] = examData;
    } else {
        newHistory.push(examData);
    }
    
    saveHistory(newHistory);
  };

  const reopenExam = (exam) => {
    if (!exam.questions || exam.questions.length === 0) return alert("The questions are lost in time, darling! ✦");
    
    const validQuestions = exam.questions.filter(q => q && q.question && Array.isArray(q.options));
    if(validQuestions.length === 0) return alert("Pertanyaannya rusak di *database*, sayang ✦");

    setQuestions(validQuestions);
    setCurrentIndex(0);
    setScore(0);
    setIsAnswered(false);
    setSelectedAnswer(null);
    setIsFinished(false);
    setActiveFile({ name: exam.title, type: 'history' });
    setRawFile(null); 
    setIsExamActive(true);
    setIsMobileSetupOpen(false); 
  };

  const MobileSetupPanel = () => (
    <div className={`fixed inset-0 z-[45] ${isDarkMode ? 'bg-slate-950/40' : 'bg-white/40'} backdrop-blur-md p-4 flex flex-col pt-16 transition-opacity duration-300 ${isMobileSetupOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className="flex items-center justify-between mb-4 pb-2 border-b dark:border-slate-800/50 relative">
            <h2 className={`font-black text-lg tracking-wide ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>Exam Setup</h2>
            {questions.length > 0 && (
                <button onClick={() => setIsMobileSetupOpen(false)} className="p-1 rounded-lg hover:bg-slate-100/50 dark:hover:bg-slate-800/50 text-slate-500 transition-colors">
                    <X className="w-5 h-5"/>
                </button>
            )}
        </div>
        <div className="flex-1 overflow-y-auto pb-4 pr-1 scrollbar-thin relative z-10">
            <div className="space-y-4">
                <div 
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-4 border-dashed rounded-2xl p-5 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${isDarkMode ? 'bg-slate-900/30 border-slate-700/50 hover:shadow-xl hover:shadow-indigo-500/10 hover:border-indigo-500/70' : 'bg-white/50 border-slate-300/60 hover:shadow-md hover:shadow-indigo-500/10 hover:border-indigo-400'}`}
                >
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="application/pdf" />
                    {activeFile ? (
                    <>
                        <FileText className={`w-10 h-10 mb-2 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
                        <p className={`text-[13px] font-extrabold text-center truncate w-full ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>{activeFile.name}</p>
                        <p className={`text-[11px] mt-1 opacity-80 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Click to change PDF</p>
                    </>
                    ) : (
                    <>
                        <UploadCloud className={`w-10 h-10 mb-2 ${isDarkMode ? 'text-slate-500' : 'text-indigo-500'}`} />
                        <p className={`text-[13px] font-extrabold text-center ${isDarkMode ? 'text-slate-300' : 'text-indigo-700'}`}>Upload Document (PDF)</p>
                    </>
                    )}
                </div>

                <div className="space-y-3 pt-1">
                    <div>
                        <label className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Topic Focus</label>
                        <input type="text" placeholder="E.g., Chapter 3, Neural Networks" value={topic} onChange={e => setTopic(e.target.value)} className={`w-full mt-1 px-3 py-2 text-[13px] rounded-xl border-2 outline-none transition-colors ${isDarkMode ? 'bg-slate-900/40 border-slate-700/50 text-slate-100 focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/30' : 'bg-white/60 border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 font-medium'}`} />
                    </div>
                    <div>
                        <label className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Question Count</label>
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {[5, 10, 15, 20, 25, 30].map(num => (
                            <button key={num} onClick={() => setQuestionCount(num)} className={`flex-1 min-w-[40px] py-2 rounded-xl text-[11px] font-black border-2 transition-all ${questionCount === num ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/40' : (isDarkMode ? 'bg-slate-800/40 text-slate-300 border-slate-700/50 hover:bg-slate-700/60 hover:border-slate-600' : 'bg-white/60 text-slate-700 border-slate-200 hover:bg-white/80')}`}>
                                {num}
                            </button>
                            ))}
                        </div>
                    </div>
                </div>

                <button onClick={startRealQuiz} disabled={isGenerating || !rawFile} className="w-full py-3 mt-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white rounded-xl text-[12px] font-extrabold flex items-center justify-center gap-2 shadow-md shadow-indigo-500/30 transition-all active:scale-[0.98]">
                    {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
                    {isGenerating ? "Generating..." : "Generate Exam"}
                </button>
            </div>

            <div className={`mt-5 pt-4 border-t-2 border-dashed ${isDarkMode ? 'border-slate-800/50' : 'border-slate-200/60'}`}>
                <div className="flex items-center justify-between mb-3">
                    <h3 className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                        <History className="w-3.5 h-3.5 text-indigo-500"/> Exam History
                    </h3>
                    {examHistory.length > 0 && (
                        <button onClick={() => { if(confirm("Delete all history, darling? ✦")) saveHistory([]); }} className="p-1 rounded-lg hover:bg-red-500/20 text-red-500 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
                <div className="space-y-2 pb-2">
                    {examHistory.length === 0 && <p className={`text-[10px] italic text-center py-3 rounded-lg ${isDarkMode ? 'text-slate-400 bg-slate-900/20' : 'text-indigo-400 bg-white/30'}`}>No history yet... ✦</p>}
                    {[...examHistory].reverse().map(ex => (
                    <div key={ex.id} className={`group relative p-3 rounded-xl border-2 transition-all duration-300 ${isDarkMode ? 'bg-slate-900/40 border-slate-700/50 active:bg-slate-800/50' : 'bg-white/60 border-slate-200/60 active:bg-white/80 shadow-sm'}`}>
                        <div className="flex flex-col cursor-pointer" onClick={() => reopenExam(ex)}>
                            <h4 className={`text-[12px] font-black truncate pr-12 leading-snug ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>{ex.title}</h4>
                            <div className={`flex justify-between items-center mt-2 pt-1.5 border-t ${isDarkMode ? 'border-slate-700/50' : 'border-white/60'}`}>
                                <span className={`text-[9px] font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{ex.date}</span>
                                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${ex.score >= ex.total/2 ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>Score: {ex.score}/{ex.total}</span>
                            </div>
                        </div>
                        <div className="absolute top-2 right-2 flex gap-1.5">
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if(confirm("Delete this one? ✦")) {
                                        const updated = examHistory.filter(item => item.id !== ex.id);
                                        saveHistory(updated);
                                    }
                                }}
                                className="p-1 rounded-md border shadow-sm bg-red-500/10 border-red-500/30 text-red-500 active:bg-red-500/30 transition-colors"
                            >
                                <Trash2 className="w-3 h-3" />
                            </button>
                        </div>
                    </div>
                    ))}
                </div>
            </div>
        </div>
    </div>
  );

  return (
    <div className="flex h-full w-full relative overflow-hidden bg-transparent">

      {/* ✦ MOBILE Setup Panel ✦ */}
      <div className="md:hidden">
         {!isExamActive && <MobileSetupPanel />}
      </div>

      {/* ✦ DESKTOP SIDEBAR: SETUP & HISTORY ✦ */}
      {!isExamActive && (
        <div className={`hidden md:flex w-[280px] lg:w-72 flex-col border-r backdrop-blur-2xl transition-colors duration-500 z-10 flex-shrink-0 ${isDarkMode ? 'bg-slate-900/30 border-slate-800/50' : 'bg-white/40 border-white/50 shadow-[4px_0_24px_rgba(199,210,254,0.1)]'}`}>
            <div className={`p-3 border-b flex items-center gap-2.5 transition-all h-[60px] ${isDarkMode ? 'border-slate-800/50' : 'border-white/60'}`}>
                <div className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'bg-indigo-500/20 text-indigo-400' : 'bg-white/50 text-pink-500 border border-white/60 shadow-sm'}`}>
                    <BrainCircuit className="w-4 h-4" />
                </div>
                <h2 className={`font-black tracking-wide transition-all text-[14px] ${isDarkMode ? 'text-slate-100' : 'text-indigo-950'}`}>Exam Setup</h2>
            </div>
            
            <div className="p-4 flex flex-col gap-4 flex-1 overflow-y-auto scrollbar-thin">
                <div 
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-4 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${isDarkMode ? 'bg-slate-900/40 border-slate-700/50 hover:shadow-lg hover:shadow-indigo-500/10 hover:border-indigo-500/70' : 'bg-white/40 border-white/80 hover:bg-white/60 hover:shadow-[0_4px_15px_0_rgba(199,210,254,0.3)] hover:border-white'}`}
                >
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="application/pdf" />
                    {activeFile ? (
                    <>
                        <FileText className={`w-8 h-8 mb-1.5 ${isDarkMode ? 'text-indigo-400' : 'text-pink-400'}`} />
                        <p className={`text-[11px] font-black text-center truncate w-full ${isDarkMode ? 'text-slate-100' : 'text-indigo-950'}`}>{activeFile.name}</p>
                        <p className={`text-[9px] mt-1 opacity-70 ${isDarkMode ? 'text-slate-400' : 'text-indigo-800'}`}>Click to change</p>
                    </>
                    ) : (
                    <>
                        <UploadCloud className={`w-8 h-8 mb-1.5 ${isDarkMode ? 'text-slate-600' : 'text-indigo-400'}`} />
                        <p className={`text-[11px] font-extrabold text-center ${isDarkMode ? 'text-slate-300' : 'text-indigo-800'}`}>Upload Document</p>
                    </>
                    )}
                </div>

                <div className="space-y-3">
                    <div>
                    <label className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-300' : 'text-indigo-500'}`}>Topic Focus</label>
                    <input type="text" placeholder="E.g., Neural Networks" value={topic} onChange={e => setTopic(e.target.value)} className={`w-full mt-1 px-3 py-2 text-[11px] rounded-xl border-2 outline-none transition-colors ${isDarkMode ? 'bg-slate-900/40 border-slate-700/50 text-slate-100 focus:border-indigo-500/60' : 'bg-white/50 border-white/80 text-indigo-950 focus:border-white focus:ring-white/50 font-bold placeholder-indigo-300 shadow-sm'}`} />
                    </div>
                    <div>
                    <label className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-300' : 'text-indigo-500'}`}>Question Count</label>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                        {[5, 10, 15, 20, 25, 30].map(num => (
                        <button key={num} onClick={() => setQuestionCount(num)} className={`flex-1 min-w-[30px] py-1.5 rounded-lg text-[10px] font-black border-2 transition-all ${questionCount === num ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-500/30' : (isDarkMode ? 'bg-slate-800/40 text-slate-300 border-slate-700/50 hover:bg-slate-700/60' : 'bg-white/50 text-indigo-900 border-white/80 hover:bg-white/80 shadow-sm')}`}>
                            {num}
                        </button>
                        ))}
                    </div>
                    </div>
                </div>

                <button onClick={startRealQuiz} disabled={isGenerating || !rawFile} className="w-full py-2.5 mt-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white rounded-xl text-[12px] font-extrabold flex items-center justify-center gap-1.5 shadow-md shadow-indigo-500/30 transition-all active:scale-[0.98]">
                    {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PlayCircle className="w-3.5 h-3.5" />}
                    {isGenerating ? "Generating..." : "Generate Exam"}
                </button>
            </div>

            <div className={`pt-3 px-3 pb-3 border-t h-[45%] flex flex-col ${isDarkMode ? 'border-slate-800/50' : 'border-white/60'}`}>
                <div className="flex items-center justify-between mb-2">
                    <h3 className={`text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 ${isDarkMode ? 'text-slate-300' : 'text-indigo-500'}`}>
                        <History className="w-3 h-3 text-indigo-500"/> Exam History
                    </h3>
                    {examHistory.length > 0 && (
                        <button 
                        onClick={() => {
                            if(confirm("Delete all history, darling? ✦")) {
                                saveHistory([]);
                            }
                        }}
                        className={`p-1 rounded-md transition-colors ${isDarkMode ? 'hover:bg-red-500/20 text-red-500' : 'hover:bg-pink-100 text-pink-500'}`}
                        >
                        <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 scrollbar-thin pr-1 relative z-10">
                    {examHistory.length === 0 && <p className={`text-[10px] italic text-center py-3 rounded-lg ${isDarkMode ? 'text-slate-400 bg-slate-900/20' : 'text-indigo-400 bg-white/30'}`}>No history yet... ✦</p>}
                    {[...examHistory].reverse().map(ex => (
                    <div key={ex.id} className={`group relative p-3 rounded-xl border-2 transition-all duration-300 ${isDarkMode ? 'bg-slate-900/40 border-slate-700/50 hover:bg-slate-800/60 hover:border-indigo-700/70 hover:shadow-inner hover:shadow-indigo-500/10' : 'bg-white/40 border-white/60 hover:bg-white/60 hover:border-white hover:shadow-[0_2px_10px_rgba(199,210,254,0.3)]'}`}>
                        <div className="flex flex-col cursor-pointer" onClick={() => reopenExam(ex)}>
                            <h4 className={`text-[11px] font-black truncate pr-10 leading-snug ${isDarkMode ? 'text-slate-100' : 'text-indigo-950'}`}>{ex.title}</h4>
                            <div className={`flex justify-between items-center mt-2 pt-1.5 border-t ${isDarkMode ? 'border-slate-700/50' : 'border-white/60'}`}>
                            <span className={`text-[9px] font-medium ${isDarkMode ? 'text-slate-400' : 'text-indigo-800/70'}`}>{ex.date}</span>
                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${ex.score >= ex.total/2 ? 'bg-green-500/20 text-green-500' : 'bg-pink-500/20 text-pink-500'}`}>Score: {ex.score}/{ex.total}</span>
                            </div>
                        </div>

                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                const newTitle = prompt("Rename this exam, darling? ✦", ex.title);
                                if(newTitle) {
                                    const updated = examHistory.map(item => item.id === ex.id ? { ...item, title: newTitle } : item);
                                    saveHistory(updated);
                                }
                            }}
                            className={`p-1 rounded-md border-2 shadow-sm transition-colors ${isDarkMode ? 'bg-indigo-950/60 border-indigo-700/60 text-indigo-400 hover:bg-indigo-900' : 'bg-white/60 border-white/80 text-indigo-600 hover:bg-white/80'}`}
                            >
                            <Pencil className="w-3 h-3" />
                            </button>
                            <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                if(confirm("Delete this one? ✦")) {
                                    const updated = examHistory.filter(item => item.id !== ex.id);
                                    saveHistory(updated);
                                }
                            }}
                            className={`p-1 rounded-md border-2 shadow-sm transition-colors ${isDarkMode ? 'bg-red-500/10 border-red-500/30 text-red-500 hover:bg-red-500/20' : 'bg-white/60 border-white/80 text-pink-500 hover:bg-pink-50'}`}
                            >
                            <Trash2 className="w-3 h-3" />
                            </button>
                        </div>
                    </div>
                    ))}
                </div>
            </div>
        </div>
      )}

      {/* ✦ MAIN CONTENT: AREA KUIS ✦ */}
      <div className={`flex-1 flex flex-col items-center justify-center transition-all duration-500 relative bg-transparent ${isExamActive ? 'p-3 pt-16 md:p-6' : 'p-4 md:p-6'}`}>
        
        <div className={`relative z-10 flex flex-col items-center justify-center transition-all w-full h-full ${isExamActive ? 'max-w-5xl' : 'max-w-4xl md:max-w-3xl'}`}>
          {questions.length === 0 ? (
            <div className="text-center opacity-80 flex flex-col items-center animate-fade-in-up">
              <Trophy className={`w-16 h-16 md:w-20 md:h-20 mb-3 ${isDarkMode ? 'text-slate-800' : 'text-indigo-300'}`} />
              <p className={`text-sm font-black leading-tight ${isDarkMode ? 'text-slate-400' : 'text-indigo-800'}`}>Upload a document to start the exam simulation.</p>
              <p className={`text-[11px] mt-1.5 opacity-70 ${isDarkMode ? 'text-slate-500' : 'text-indigo-600'}`}>Good luck studying, darling! ✦</p>
            </div>
          ) : isFinished ? (
            <div className="text-center flex flex-col items-center animate-fade-in-up w-full px-4">
              <div className={`w-20 h-20 md:w-28 md:h-28 rounded-full flex items-center justify-center mb-5 shadow-xl border-4 backdrop-blur-xl ${score >= questions.length/2 ? (isDarkMode ? 'bg-green-500/20 text-green-400 border-green-500' : 'bg-white/60 text-green-600 border-green-400 shadow-[0_4px_20px_0_rgba(74,222,128,0.3)]') : (isDarkMode ? 'bg-red-500/20 text-red-400 border-red-500' : 'bg-white/60 text-pink-600 border-pink-400 shadow-[0_4px_20px_0_rgba(244,114,182,0.3)]')}`}>
                <span className="text-2xl md:text-4xl font-extrabold">{score}/{questions.length}</span>
              </div>
              <h2 className={`text-2xl md:text-3xl font-black mb-1.5 tracking-tighter leading-tight ${isDarkMode ? 'text-slate-100' : 'text-indigo-950'}`}>Exam Finished!</h2>
              <p className={`text-[13px] md:text-[15px] mb-6 font-bold ${isDarkMode ? 'text-slate-400' : 'text-indigo-800/70'}`}>Your Score: {score} out of {questions.length} questions.</p>
              <button onClick={closeExam} className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[13px] font-extrabold shadow-lg shadow-indigo-500/30 transition-all active:scale-95">Close & Rest</button>
            </div>
          ) : (
            <div className="w-full flex flex-col animate-fade-in-up h-full">
              
              {/* Quiz Header */}
              <div className={`flex justify-between items-center mb-4 pb-3 border-b-2 relative z-20 ${isDarkMode ? 'border-slate-800/50' : 'border-white/60'}`}>
                <div className="flex items-center gap-2.5">
                  <button onClick={closeExam} className={`p-1.5 rounded-lg transition-all active:scale-90 ${isDarkMode ? 'bg-slate-800/50 text-slate-400 hover:bg-red-950 hover:text-red-400' : 'bg-white/50 text-indigo-500 border border-white/60 hover:bg-white/80 hover:text-pink-500 shadow-sm'}`}>
                     <X className="w-4 h-4" />
                  </button>
                  <span className={`text-[10px] md:text-[11px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-300' : 'text-indigo-900'}`}>Q. {currentIndex + 1} / {questions.length}</span>
                </div>
                
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] md:text-[11px] font-black uppercase tracking-widest ${isDarkMode ? 'text-indigo-300' : 'text-indigo-800'}`}>Score: {score}</span>
                  
                  {currentIndex < questions.length - 1 ? (
                    <button disabled={!isAnswered} onClick={nextQuestion} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-black flex items-center gap-1.5 disabled:opacity-50 transition-all shadow-md shadow-indigo-500/20 active:scale-95">
                      Next <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button disabled={!isAnswered} onClick={handleFinish} className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-[11px] font-black flex items-center gap-1.5 disabled:opacity-50 transition-all shadow-md shadow-green-500/20 active:scale-95">
                      Finish <CheckCircle2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Question Text Panel */}
              <div className={`p-4 md:p-5 rounded-2xl mb-4 border-2 transition-all backdrop-blur-xl shadow-lg ${isDarkMode ? 'bg-slate-950/60 border-slate-800/80 shadow-[inset_0_2px_10px_rgba(0,0,0,0.3)]' : 'bg-white/50 border-white/80 shadow-[0_4px_20px_0_rgba(199,210,254,0.3)]'}`}>
                <p className={`text-[13px] md:text-[15px] font-bold leading-relaxed transition-colors ${isDarkMode ? 'text-slate-100' : 'text-indigo-950'}`}>
                  {questions[currentIndex]?.question || "Pertanyaan hilang di ruang waktu..."}
                </p>
              </div>

              {/* Options & Explanation */}
              <div className="space-y-2.5 flex-1 pb-6 overflow-y-auto scrollbar-thin pr-1">
                {(questions[currentIndex]?.options || []).map((opt, idx) => {
                  const isCorrect = idx === questions[currentIndex]?.answerIndex;
                  const isSelected = selectedAnswer === idx;
                  let btnClass = "w-full text-left px-4 py-3 rounded-xl border-2 transition-all duration-300 text-[12px] md:text-[13px] font-semibold leading-normal active:scale-[0.99] backdrop-blur-md ";
                  
                  if (!isAnswered) {
                      btnClass += isDarkMode 
                        ? "border-slate-800/60 bg-slate-900/40 hover:bg-slate-800/80 hover:border-indigo-500/70 text-slate-200" 
                        : "border-white/60 bg-white/40 hover:bg-white/70 hover:border-white hover:shadow-sm text-indigo-900";
                  } else if (isCorrect) {
                      btnClass += isDarkMode ? "border-green-500/50 bg-green-950/50 text-green-300" : "border-green-400 bg-white/80 text-green-700 shadow-sm";
                  } else if (isSelected) {
                      btnClass += isDarkMode ? "border-red-500/50 bg-red-950/50 text-red-300" : "border-pink-400 bg-white/80 text-pink-700 shadow-sm";
                  } else {
                      btnClass += "opacity-50 grayscale-[50%] cursor-default border-transparent bg-transparent text-slate-500";
                  }

                  return (
                    <button key={idx} disabled={isAnswered} onClick={() => handleAnswer(idx)} className={btnClass}>
                      <div className="flex items-center justify-between gap-3">
                        <span>{opt}</span>
                        {isAnswered && isCorrect && <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />}
                        {isAnswered && isSelected && !isCorrect && <XCircle className="w-4 h-4 text-pink-400 flex-shrink-0" />}
                      </div>
                    </button>
                  );
                })}

                {isAnswered && (
                  <div className={`mt-4 p-4 md:p-5 rounded-2xl border-2 border-dashed animate-fade-in-up backdrop-blur-xl ${isDarkMode ? 'bg-indigo-950/40 border-indigo-500/50' : 'bg-white/60 border-indigo-300/60 shadow-sm'}`}>
                    <h4 className={`text-[10px] font-black uppercase tracking-widest mb-2.5 flex items-center gap-2 ${isDarkMode ? 'text-indigo-300' : 'text-indigo-600'}`}>
                      <BrainCircuit className="w-3.5 h-3.5" /> Cyrene's Explanation
                    </h4>
                    <p className={`text-[12px] md:text-[13px] leading-relaxed mb-4 font-bold italic ${isDarkMode ? 'text-slate-200' : 'text-indigo-950'}`}>
                      {questions[currentIndex]?.correctExplanation || "Tidak ada penjelasan untuk soal ini."}
                    </p>
                    
                    {questions[currentIndex]?.wrongExplanations && (
                        <div className={`pt-3 border-t-2 border-dashed ${isDarkMode ? 'border-indigo-600/50' : 'border-indigo-200/80'}`}>
                            <ul className={`text-[11px] md:text-[12px] space-y-2 opacity-90 ${isDarkMode ? 'text-slate-300' : 'text-indigo-900'}`}>
                                {questions[currentIndex].wrongExplanations.map((wrong, wIdx) => (
                                    <li key={wIdx} className="flex gap-2.5 font-semibold leading-relaxed">
                                        <span className={`mt-0.5 font-black ${isDarkMode ? 'text-indigo-500' : 'text-pink-400'}`}>•</span>
                                        <span>{wrong}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
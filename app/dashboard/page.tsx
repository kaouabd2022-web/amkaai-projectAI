"use client";

import { useUser } from "@clerk/nextjs";
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Link from "next/link";
import {
  Send, Plus, LifeBuoy, X, Settings, Bot, User, PanelLeft, Trash2, Wand2, 
  ImageIcon, Video, Mic, SlidersHorizontal, Tv, Flame, Upload, Sparkles, 
  Move, Download, Brush, Columns, Play, Pause, Layers3
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

////////////////////////////////////////////////////////////
// TYPES & SCHEMAS
////////////////////////////////////////////////////////////
type MediaType = "image" | "video" | "voice";
type AspectRatioType = "16:9" | "9:16" | "1:1";
type CameraMotionType = "static" | "zoom-in" | "zoom-out" | "pan-left" | "pan-right";
type PresetStyle = { id: string; name: string; promptSuffix: string; bgClass: string };

type Message = {
  role: "user" | "assistant";
  content: string;
  outputUrl?: string; 
  meta?: { 
    type?: MediaType; 
    aspectRatio?: AspectRatioType; 
    motion?: string; 
    duration?: string;
  }
};

type Chat = { id: string; title: string; createdAt: number; messages: Message[] };
type RenderJob = { id: string; prompt: string; progress: number; status: "rendering" | "completed"; type: MediaType };

const PRESET_STYLES: PresetStyle[] = [
  { id: "cyberpunk", name: "Cyberpunk neon", promptSuffix: ", cyberpunk neon style, blade runner aesthetics, high contrast, 8k", bgClass: "from-purple-600 to-pink-600" },
  { id: "pixar", name: "3D Pixar Animation", promptSuffix: ", 3d animation style, pixar character design, vibrant colors, raytracing", bgClass: "from-blue-500 to-cyan-500" },
  { id: "film", name: "Vintage 70s Film", promptSuffix: ", 1970s cinematic film stock, grain, warm volumetric light, anamorphic lens", bgClass: "from-amber-600 to-orange-700" },
  { id: "anime", name: "Anime Ghibli", promptSuffix: ", anime masterwork style, studio ghibli aesthetic, hand-drawn textures", bgClass: "from-emerald-500 to-teal-600" }
];

export default function DashboardPage() {
  const { user } = useUser();
  const plan = "PRO MASTER STUDIO";

  // UI Navigation States
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [credits, setCredits] = useState(240);

  // Core Generation Parameters
  const [activeType, setActiveType] = useState<MediaType>("video");
  const [aspectRatio, setAspectRatio] = useState<AspectRatioType>("16:9");
  const [creativity, setCreativity] = useState<number>(0.75);
  const [duration, setDuration] = useState<"5s" | "10s">("5s");
  const [cameraMotion, setCameraMotion] = useState<CameraMotionType>("static");
  const [seed, setSeed] = useState<string>("-1");
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  // Pro Workspace Modules UI
  const [motionBrushActive, setMotionBrushActive] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [compareSlider, setCompareSlider] = useState(50);
  const [activeKeyframe, setActiveKeyframe] = useState<number>(0);
  const [isPlayingTimeline, setIsPlayingTimeline] = useState(false);

  // Background Render Management Engine
  const [renderQueue, setRenderQueue] = useState<RenderJob[]>([
    { id: "1", prompt: "Cyberpunk street cinematic flythrough", progress: 68, status: "rendering", type: "video" },
    { id: "2", prompt: "Hyper-realistic desert mechanical tiger", progress: 100, status: "completed", type: "image" }
  ]);

  // Data Persistence Channels
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [supportOpen, setSupportOpen] = useState(false);
  const [supportInput, setSupportInput] = useState("");

  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // تغليف دالة إنشاء المحادثة بـ useCallback لمنع إعادة إنشائها مع كل عملية ريندر ودخول التطبيق في ريندر لانهائي
  const createChat = useCallback(() => {
    const chat: Chat = { id: crypto.randomUUID(), title: "New Production Concept", createdAt: Date.now(), messages: [] };
    setChats((prev) => [chat, ...prev]);
    setActiveChatId(chat.id);
    setUploadedImage(null);
  }, []);

  // التحقق الآمن لإنشاء المحادثة الأولى عند تحميل الصفحة
  useEffect(() => { 
    if (chats.length === 0) {
      createChat(); 
    }
  }, [chats.length, createChat]);

  useEffect(() => { 
    bottomRef.current?.scrollIntoView({ behavior: "smooth" }); 
  }, [chats, loading]);

  const activeChat = useMemo(() => chats.find((c) => c.id === activeChatId), [chats, activeChatId]);
  const lastMessage = activeChat?.messages[activeChat.messages.length - 1];

  // محاكي عمليات الـ Rendering الخلفية مع منع حدوث Stale Closures (استخدام الحالات القديمة)
  useEffect(() => {
    const interval = setInterval(() => {
      setRenderQueue(prev => prev.map(job => {
        if (job.status === "rendering" && job.progress < 100) {
          const nextProgress = job.progress + Math.floor(Math.random() * 8) + 2;
          return { 
            ...job, 
            progress: nextProgress >= 100 ? 100 : nextProgress, 
            status: nextProgress >= 100 ? "completed" : "rendering" 
          };
        }
        return job;
      }));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const deleteChat = (id: string) => {
    const filtered = chats.filter((c) => c.id !== id);
    setChats(filtered);
    if (activeChatId === id) setActiveChatId(filtered[0]?.id || null);
  };

  const handlePresetApply = (style: PresetStyle) => {
    setInput((prev) => `${prev.trim()} ${style.promptSuffix}`.trim());
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setUploadedImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const enhancePrompt = async () => {
    if (!input.trim()) return;
    setEnhancing(true);
    await new Promise((r) => setTimeout(r, 700));
    setInput((prev) => prev + ", cinematic depth of field, volumetric global illumination, 35mm lens shot, unreal engine 5 architecture rendering, highly corporate octane, masterwork precision");
    setEnhancing(false);
  };

  const executeGeneration = async () => {
    if (!input.trim() || !activeChat) return;

    const currentPrompt = input;
    const userMsg: Message = { role: "user", content: currentPrompt, meta: { type: activeType, aspectRatio, motion: cameraMotion, duration } };

    setChats((prev) =>
      prev.map((c) => c.id === activeChatId ? { ...c, title: c.messages.length === 0 ? currentPrompt.slice(0, 22) + "..." : c.title, messages: [...c.messages, userMsg] } : c)
    );

    setInput("");
    setLoading(true);

    const newJobId = crypto.randomUUID();
    setRenderQueue(prev => [{ id: newJobId, prompt: currentPrompt, progress: 5, status: "rendering", type: activeType }, ...prev]);

    try {
      await new Promise((r) => setTimeout(r, 4000));
      
      let outputUrl = activeType === "video" 
        ? "https://assets.mixkit.co/videos/preview/mixkit-abstract-laser-lights-background-42398-large.mp4" 
        : "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800&auto=format&fit=crop";

      const reply: Message = { 
        role: "assistant", 
        content: `⚡ Matrix render cycle finished via NVIDIA Node Cluster.\n• Flow Seed: ${seed === "-1" ? Math.floor(Math.random() * 888884) : seed}\n• Motion Vector: ${cameraMotion}\n• Channel State: Success.`, 
        outputUrl, 
        meta: { type: activeType }
      };

      setChats((prev) => prev.map((c) => c.id === activeChatId ? { ...c, messages: [...c.messages, reply] } : c));
      setRenderQueue(prev => prev.map(j => j.id === newJobId ? { ...j, progress: 100, status: "completed" } : j));
      setCredits((c) => Math.max(0, c - (activeType === "video" ? 6 : 2)));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex h-screen overflow-hidden bg-[#030303] text-white font-sans selection:bg-cyan-500/40">
      
      {/* SIDEBAR ARCHIVE SYSTEM */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside initial={{ x: -300, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -300, opacity: 0 }} className="w-72 border-r border-white/5 bg-[#070709] flex flex-col justify-between z-30">
            <div>
              <div className="border-b border-white/5 p-5 flex items-center justify-between">
                <Link href="/" className="bg-gradient-to-r from-cyan-400 via-teal-400 to-indigo-400 bg-clip-text text-lg font-black tracking-tighter text-transparent flex items-center gap-2">
                  <Flame size={16} className="text-cyan-400 animate-pulse" /> AMKAAI STUDIO PRO
                </Link>
                <button onClick={() => setSidebarOpen(false)} className="text-gray-500 hover:text-white transition" aria-label="Collapse sidebar"><PanelLeft size={16} /></button>
              </div>

              <div className="p-4">
                <button onClick={createChat} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 px-4 py-2.5 text-xs font-bold text-white hover:opacity-95 transition shadow-lg">
                  <Plus size={14} /> Open Production Desk
                </button>
              </div>

              {/* RENDER QUEUE SYSTEM IN SIDEBAR */}
              <div className="px-4 mb-4">
                <div className="bg-white/5 rounded-xl p-3 border border-white/5 space-y-2">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Active Render Queue</span>
                    <span className="text-cyan-400 font-mono animate-pulse">● Live</span>
                  </p>
                  <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                    {renderQueue.map(job => (
                      <div key={job.id} className="text-[11px] bg-black/40 p-2 rounded-lg border border-white/5">
                        <div className="flex justify-between text-gray-400 text-[10px] mb-1">
                          <span className="truncate max-w-[120px] font-mono">{job.prompt}</span>
                          <span className={job.status === "completed" ? "text-emerald-400" : "text-cyan-400 font-mono"}>{job.progress}%</span>
                        </div>
                        <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden">
                          <div className={`h-full transition-all duration-500 ${job.status === "completed" ? "bg-emerald-500" : "bg-cyan-500"}`} style={{ width: `${job.progress}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-3 space-y-1 max-h-[35vh]">
                <p className="px-3 text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-1">Asset Directory</p>
                {chats.map((chat) => (
                  <div key={chat.id} onClick={() => setActiveChatId(chat.id)} className={`group flex cursor-pointer items-center justify-between rounded-xl p-2.5 border transition ${activeChatId === chat.id ? "bg-white/5 border-white/10" : "border-transparent hover:bg-white/5"}`}>
                    <div className="truncate pr-2">
                      <p className="text-xs font-medium text-gray-300 truncate">{chat.title}</p>
                    </div>
                    {/* استخدام e.stopPropagation لمنع انتقال حدث النقر إلى المحادثة نفسها عند رغبة المستخدم بحذفها */}
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        deleteChat(chat.id); 
                      }} 
                      className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-red-400 transition"
                      aria-label="Delete production concept"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 border-t border-white/5 bg-black/30">
              <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3 flex justify-between items-center text-xs">
                <span className="text-gray-400 font-mono">GPU Allocation</span>
                <span className="font-bold text-cyan-400 font-mono">{credits} Nodes</span>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* CORE CONTROL DESK */}
      <section className="flex flex-1 flex-col overflow-hidden">
        
        <header className="flex items-center justify-between border-b border-white/5 bg-[#070709]/70 px-6 py-3.5 backdrop-blur-md">
          <div className="flex items-center gap-3">
            {!sidebarOpen && <button onClick={() => setSidebarOpen(true)} className="text-gray-400 hover:text-white transition" aria-label="Expand sidebar"><PanelLeft size={16} /></button>}
            <h1 className="text-xs font-bold tracking-wider uppercase flex items-center gap-1.5 text-gray-300">
              Production Workspace <span className="text-[10px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.2 rounded-md font-mono">v3.2 Core</span>
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <TopButton icon={<Layers3 size={12} />} label="Asset Manager" />
            <TopButton icon={<Settings size={12} />} label="Advanced Routing" />
          </div>
        </header>

        {/* INTEGRATED PIPELINE WORKFLOW */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          
          {/* PARAMETERS CONTROL TOWER (LEFT 4 COLUMNS) */}
          <div className="lg:col-span-4 border-r border-white/5 bg-[#050507] p-5 space-y-5 overflow-y-auto custom-scrollbar">
            <div className="flex items-center gap-1.5 border-b border-white/5 pb-2">
              <SlidersHorizontal size={13} className="text-cyan-400" />
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Synthesis Parameters</h2>
            </div>

            {/* PIPELINE OUTPUT SELECTOR */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Synthesis Pipeline</label>
              <div className="grid grid-cols-3 gap-2">
                {(["image", "video", "voice"] as MediaType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => setActiveType(type)}
                    className={`py-2 text-xs rounded-xl border transition font-medium flex flex-col items-center gap-1 ${activeType === type ? "bg-cyan-500 text-black border-cyan-400 font-bold shadow-lg" : "bg-white/5 border-white/5 text-gray-400 hover:bg-white/10"}`}
                  >
                    {type === "image" && <ImageIcon size={13} />}
                    {type === "video" && <Video size={13} />}
                    {type === "voice" && <Mic size={13} />}
                    <span className="text-[9px] uppercase tracking-wider font-mono">{type}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* PRO MOCK IMAGE-TO-VIDEO ZONE */}
            {activeType === "video" && (
              <div className="space-y-1.5 border-y border-white/5 py-3">
                <label className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1">
                  <Upload size={11} /> Source Seed Matrix (Image-To-Video)
                </label>
                <div onClick={() => fileInputRef.current?.click()} className="border border-dashed border-white/10 hover:border-cyan-500/30 bg-white/5 rounded-xl p-3 text-center cursor-pointer transition flex flex-col items-center justify-center min-h-[80px]">
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                  {uploadedImage ? (
                    <div className="relative w-full h-16 rounded-lg overflow-hidden">
                      <img src={uploadedImage} alt="Reference Base" className="w-full h-full object-cover" />
                      <button onClick={(e) => { e.stopPropagation(); setUploadedImage(null); }} className="absolute top-1 right-1 bg-black/80 p-1 rounded-full text-gray-400 hover:text-white" aria-label="Clear uploaded matrix image"><X size={10} /></button>
                    </div>
                  ) : (
                    <p className="text-[10px] text-gray-400 font-mono">Inject base frame image to locked sequence</p>
                  )}
                </div>
              </div>
            )}

            {/* CANVAS DIMENSIONS */}
            {activeType !== "voice" && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-500 uppercase">Aspect Dimensions</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["16:9", "9:16", "1:1"] as AspectRatioType[]).map((ratio) => (
                    <button key={ratio} onClick={() => setAspectRatio(ratio)} className={`py-1.5 text-xs rounded-xl border font-mono transition ${aspectRatio === ratio ? "border-cyan-500 text-cyan-400 bg-cyan-500/10 font-bold" : "bg-white/5 border-white/5 text-gray-400 hover:bg-white/10"}`}>{ratio}</button>
                  ))}
                </div>
              </div>
            )}

            {/* CAMERA MOTION VECTOR VECTORING */}
            {activeType === "video" && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1"><Move size={11} /> Kinematic Vectoring</label>
                <select value={cameraMotion} onChange={(e) => setCameraMotion(e.target.value as CameraMotionType)} className="w-full bg-black text-xs text-gray-400 border border-white/10 rounded-xl p-2.5 outline-none focus:border-cyan-500/30 font-mono">
                  <option value="static">Static Axis Inertia</option>
                  <option value="zoom-in">Hyper-Inward Zoom Matrix</option>
                  <option value="zoom-out">Hyper-Outward Zoom Matrix</option>
                  <option value="pan-left">Lateral Left Vector</option>
                  <option value="pan-right">Lateral Right Vector</option>
                </select>
              </div>
            )}

            {/* SYSTEM HYPERPARAMETERS SPEED */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase">Engine Duration</label>
                <div className="flex bg-black border border-white/5 rounded-xl p-1">
                  {(["5s", "10s"] as const).map(d => (
                    <button key={d} onClick={() => setDuration(d)} className={`flex-1 py-1 text-[10px] font-bold rounded-lg ${duration === d ? "bg-white/10 text-white" : "text-gray-500"}`}>{d}</button>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase">Core Seed</label>
                <input type="text" value={seed} onChange={e => setSeed(e.target.value)} className="w-full bg-black border border-white/5 rounded-xl p-1 text-[11px] font-mono text-center text-gray-300 outline-none" />
              </div>
            </div>

            {/* WEIGHT INFERENCE SLIDER */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] font-bold text-gray-500 uppercase">
                <span>Prompt Guidance Weight</span>
                <span className="text-cyan-400 font-mono">{Math.round(creativity * 100)}%</span>
              </div>
              <input type="range" min="0.1" max="1" step="0.05" value={creativity} onChange={(e) => setCreativity(parseFloat(e.target.value))} className="w-full accent-cyan-500 bg-white/10 h-1 rounded-lg cursor-pointer" />
            </div>
          </div>

          {/* ADVANCED MONITOR STAGE (RIGHT 8 COLUMNS) */}
          <div className="lg:col-span-8 flex flex-col justify-between overflow-hidden bg-black relative">
            
            <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
              
              {/* INTERACTIVE MONITOR WITH DYNAMIC UI MODULES OVERLAYS */}
              <div className="relative aspect-video max-h-[400px] w-full mx-auto rounded-2xl border border-white/5 bg-[#060608] flex items-center justify-center overflow-hidden shadow-2xl group">
                
                {/* HUD CONTROL OVERLAYS */}
                <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
                  <div className="flex items-center gap-1.5 text-[9px] uppercase font-mono tracking-widest text-gray-400 bg-black/70 px-3 py-1.5 rounded-lg border border-white/10 backdrop-blur-md">
                    <Tv size={11} className="text-cyan-400" /> Cinema Frame Node
                  </div>

                  {/* PRO ADVANCED TOOL: MOTION BRUSH TOGGLE BUTTON */}
                  {activeType === "video" && (
                    <button 
                      onClick={() => setMotionBrushActive(!motionBrushActive)}
                      className={`flex items-center gap-1 text-[9px] font-bold uppercase font-mono px-3 py-1.5 rounded-lg border transition ${motionBrushActive ? "bg-purple-600 text-white border-purple-400 shadow-lg" : "bg-black/70 text-gray-400 border-white/10 hover:text-white"}`}
                    >
                      <Brush size={11} /> {motionBrushActive ? "Motion Brush: Active" : "Motion Brush"}
                    </button>
                  )}

                  {/* PRO ADVANCED TOOL: COMPARE MODE TOGGLE BUTTON */}
                  {lastMessage?.outputUrl && (
                    <button 
                      onClick={() => setCompareMode(!compareMode)}
                      className={`flex items-center gap-1 text-[9px] font-bold uppercase font-mono px-3 py-1.5 rounded-lg border transition ${compareMode ? "bg-indigo-600 text-white border-indigo-400" : "bg-black/70 text-gray-400 border-white/10 hover:text-white"}`}
                    >
                      <Columns size={11} /> Compare A/B
                    </button>
                  )}
                </div>

                {/* DYNAMIC MOTION BRUSH CANVAS SIMULATION INTERFACE */}
                {motionBrushActive && (
                  <div className="absolute inset-0 z-10 bg-purple-500/5 cursor-crosshair flex items-center justify-center">
                    <div className="absolute top-16 left-1/3 w-24 h-24 border border-dashed border-purple-400 bg-purple-500/20 rounded-full flex items-center justify-center animate-pulse">
                      <span className="text-[8px] font-mono uppercase text-purple-200">Vector Brush 1</span>
                    </div>
                  </div>
                )}

                {/* نظام العرض الحقيقي لفيديوهات وصور الـ AI */}
                {lastMessage && lastMessage.outputUrl && !loading ? (
                  <div className="w-full h-full relative group">
                    {compareMode ? (
                      <div className="w-full h-full relative select-none">
                        <div className="absolute inset-0 bg-[#111]" style={{ clipPath: `polygon(${compareSlider}% 0, 100% 0, 100% 100%, ${compareSlider}% 100%)` }}>
                          {lastMessage.meta?.type === "video" ? (
                            <video src={lastMessage.outputUrl} autoPlay loop muted className="w-full h-full object-contain" />
                          ) : (
                            <img src={lastMessage.outputUrl} alt="processed matrix" className="w-full h-full object-contain" />
                          )}
                          <span className="absolute bottom-3 right-3 text-[9px] font-mono bg-black/70 px-2 py-0.5 text-cyan-400 rounded border border-white/5">Render B</span>
                        </div>
                        
                        {/* تصحيح خطأ clipPath المفقود فيه رمز الـ % لمتصفحات الـ Webkit */}
                        <div className="absolute inset-0 bg-zinc-900" style={{ clipPath: `polygon(0 0, ${compareSlider}% 0, ${compareSlider}% 100%, 0 100%)` }}>
                          <img src="https://images.unsplash.com/photo-1614741118887-7a4ee193a5fa?q=80&w=800" alt="original sample base" className="w-full h-full object-contain" />
                          <span className="absolute bottom-3 left-3 text-[9px] font-mono bg-black/70 px-2 py-0.5 text-gray-400 rounded border border-white/5">Source A</span>
                        </div>
                        
                        <div className="absolute bottom-0 top-0 w-0.5 bg-cyan-400 cursor-ew-resize z-20" style={{ left: `${compareSlider}%` }}>
                          <input type="range" min="0" max="100" value={compareSlider} onChange={e => setCompareSlider(Number(e.target.value))} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 opacity-0 cursor-ew-resize" />
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-full relative">
                        {lastMessage.meta?.type === "video" ? (
                          <video 
                            src={lastMessage.outputUrl} 
                            controls 
                            autoPlay 
                            loop 
                            muted
                            className="w-full h-full object-contain bg-black" 
                          />
                        ) : (
                          <img 
                            src={lastMessage.outputUrl} 
                            alt="Final Core AI Render Frame" 
                            className="w-full h-full object-contain bg-black" 
                          />
                        )}

                        <a 
                          href={lastMessage.outputUrl} 
                          download={`amkaai-render-${Date.now()}`} 
                          target="_blank" 
                          rel="noreferrer"
                          className="absolute bottom-4 right-4 bg-black/80 hover:bg-cyan-500 hover:text-black transition-all p-2.5 rounded-xl border border-white/10 text-white z-20 flex items-center gap-1.5 text-xs font-bold shadow-xl"
                        >
                          <Download size={13} /> Export Raw File
                        </a>
                      </div>
                    )}
                  </div>
                ) : loading ? (
                  <div className="text-center space-y-3 z-10">
                    <div className="w-9 h-9 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-[11px] text-cyan-400 font-mono tracking-wider animate-pulse">Running frame matrix inversion via GPU cluster...</p>
                  </div>
                ) : (
                  <div className="text-center p-4">
                    <Wand2 size={32} className="mx-auto text-zinc-800 mb-2" />
                    <p className="text-xs text-gray-500 font-bold font-mono">Workspace Pipeline Standby</p>
                  </div>
                )}
              </div>

              {/* TIMELINE CONTROLLER PIPELINE TRACK */}
              {activeType === "video" && (
                <div className="bg-[#070709] border border-white/5 rounded-xl p-3 space-y-3">
                  <div className="flex items-center justify-between text-[10px] font-mono text-gray-400">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setIsPlayingTimeline(!isPlayingTimeline)} className="p-1 hover:bg-white/5 rounded text-white" aria-label={isPlayingTimeline ? "Pause timeline sequence" : "Play timeline sequence"}>
                        {isPlayingTimeline ? <Pause size={12} className="text-cyan-400" /> : <Play size={12} />}
                      </button>
                      <span className="text-white font-bold">Kinematic Timeline Editor</span>
                    </div>
                    <span>Active Keyframe: Frame_0{activeKeyframe}</span>
                  </div>
                  <div className="relative w-full bg-white/5 h-6 rounded-lg border border-white/5 flex items-center justify-between px-4 overflow-hidden">
                    <div className="absolute inset-y-0 left-[35%] w-px bg-white/10" />
                    <div className="absolute inset-y-0 left-[70%] w-px bg-white/10" />
                    {([0, 1, 2, 3] as const).map(frameIndex => (
                      <button 
                        key={frameIndex}
                        onClick={() => setActiveKeyframe(frameIndex)}
                        className={`w-3 h-3 rounded-full border transition-all z-10 ${activeKeyframe === frameIndex ? "bg-cyan-400 border-cyan-300 scale-125 shadow-[0_0_8px_rgba(34,211,238,0.6)]" : "bg-neutral-800 border-neutral-600 hover:border-neutral-400"}`}
                        aria-label={`Select keyframe ${frameIndex}`}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* LOG HISTORY GRID WITH MINI RE-RENDER PLAYERS */}
              {activeChat && activeChat.messages.length > 0 && (
                <div className="border-t border-white/5 pt-4 space-y-3">
                  <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Asset Render History logs</p>
                  {activeChat.messages.map((msg, i) => (
                    <div key={i} className={`flex gap-3 p-3.5 rounded-xl border ${msg.role === "user" ? "bg-white/5 border-white/5" : "bg-cyan-950/5 border-cyan-500/10"}`}>
                      {msg.role === "user" ? <User size={13} className="text-gray-400 mt-0.5" /> : <Bot size={13} className="text-cyan-400 mt-0.5" />}
                      <div className="text-xs space-y-2 flex-1 overflow-hidden">
                        <span className="font-bold block text-[10px] text-gray-500 uppercase">{msg.role === "user" ? "Input Manifest Parameter" : "Output Node Asset"}</span>
                        <p className="text-gray-300 font-mono leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                        
                        {msg.outputUrl && msg.role === "assistant" && (
                          <div className="w-48 aspect-video rounded-lg border border-white/5 bg-black overflow-hidden mt-2 relative group/mini">
                            {msg.meta?.type === "video" ? (
                              <video src={msg.outputUrl} muted loop autoPlay className="w-full h-full object-cover" />
                            ) : (
                              <img src={msg.outputUrl} alt="historical frame" className="w-full h-full object-cover" />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  <div ref={bottomRef} />
                </div>
              )}
            </div>

            {/* PRESET CINEMATIC SHOWCASE STYLES SECTION AND CONSOLE INPUT */}
            <div className="p-4 border-t border-white/5 bg-[#070709]/90 backdrop-blur-md space-y-3">
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Inject Cinema Presets Styles Matrix</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {PRESET_STYLES.map(style => (
                    <button
                      key={style.id}
                      onClick={() => handlePresetApply(style)}
                      className="group relative h-10 rounded-xl overflow-hidden border border-white/5 bg-neutral-900 flex items-center justify-center p-2 transition hover:border-white/20"
                    >
                      <div className={`absolute inset-0 bg-gradient-to-br ${style.bgClass} opacity-10 group-hover:opacity-20 transition`} />
                      <span className="text-[10px] font-bold text-gray-300 tracking-wide group-hover:text-white transition">{style.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] text-gray-600 font-mono">Kling Pipeline Operational Sequence Channel</span>
                  {input.trim() && (
                    <button onClick={enhancePrompt} disabled={enhancing} className="text-[10px] font-bold text-cyan-400 flex items-center gap-1 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-1 rounded-lg hover:bg-cyan-500 hover:text-black transition">
                      <Sparkles size={11} className={enhancing ? "animate-spin" : ""} /> {enhancing ? "Inverting Prompt..." : "🪄 Hyper Enhance Prompt Matrix"}
                    </button>
                  )}
                </div>

                <div className="flex items-end gap-3 bg-[#030304] border border-white/5 rounded-2xl p-2.5 focus-within:border-cyan-500/30 transition">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={`Describe your cinematic visual parameters for this ${activeType} prompt sequence...`}
                    className="max-h-24 min-h-[44px] flex-1 resize-none bg-transparent px-3 py-1.5 text-xs outline-none text-white placeholder:text-gray-700 font-mono"
                    onKeyDown={(e) => { 
                      if (e.key === "Enter" && !e.shiftKey) { 
                        e.preventDefault(); 
                        executeGeneration(); 
                      } 
                    }}
                  />
                  <button onClick={executeGeneration} disabled={loading || !input.trim()} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500 text-black hover:opacity-90 transition disabled:opacity-20 shadow-md" aria-label="Execute generation sequence">
                    <Send size={13} />
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* SUPPORT DISPATCH CONTROLS */}
      <button onClick={() => setSupportOpen(true)} className="fixed bottom-4 right-4 z-40 flex items-center gap-1.5 rounded-full bg-[#111113] border border-white/10 hover:border-white/20 px-4 py-2.5 text-xs font-bold text-gray-200 transition shadow-2xl backdrop-blur-md">
        <LifeBuoy size={13} className="text-cyan-400 animate-pulse" /> Support Dispatch
      </button>

      <AnimatePresence>
        {supportOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
            <div className="relative flex h-[500px] w-[750px] max-w-full rounded-2xl border border-white/5 bg-[#0a0a0c] shadow-2xl overflow-hidden p-6 flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold border-b border-white/5 pb-3 uppercase font-mono tracking-wider text-gray-300">Technical Node Dispatch</h3>
                <p className="text-xs text-gray-500 font-mono mt-4 leading-relaxed bg-white/5 p-4 rounded-xl border border-white/5">
                  Our clusters are operating at nominal values. If your H100 sequence allocation fails or stays inside the render queue for more than 180s, drop an analytical ticket below.
                </p>
              </div>
              <div className="flex gap-2">
                <input value={supportInput} onChange={e => setSupportInput(e.target.value)} className="flex-1 rounded-xl bg-black border border-white/5 p-3 text-xs outline-none text-white font-mono" placeholder="Inquire cluster debug parameters..." />
                <button onClick={() => setSupportOpen(false)} className="rounded-xl bg-cyan-500 px-5 text-xs font-bold text-black">Log Ticket</button>
              </div>
              <button onClick={() => setSupportOpen(false)} className="absolute right-4 top-4 text-gray-500 hover:text-white" aria-label="Close support dispatch dashboard"><X size={16} /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

function TopButton({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button className="hidden items-center gap-1.5 rounded-xl border border-white/5 bg-white/5 px-3 py-2 text-xs text-gray-400 transition hover:bg-white/10 hover:text-white md:flex">
      {icon}
      <span className="font-mono text-[11px]">{label}</span>
    </button>
  );
}
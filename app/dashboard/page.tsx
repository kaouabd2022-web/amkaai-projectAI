"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import Link from "next/link";

import {
  Send,
  Plus,
  Sparkles,
  Crown,
  Trash2,
  PanelLeft,
  Bot,
  User,
  Zap,
  Clock3,
  BarChart3,
  Settings,
  CreditCard,
  Wand2,
} from "lucide-react";

import {
  motion,
  AnimatePresence,
} from "framer-motion";

//////////////////////////////////////////////////
// TYPES
//////////////////////////////////////////////////

type Message = {
  role: "user" | "assistant";
  content: string;
};

type Chat = {
  id: string;
  title: string;
  createdAt: number;
  messages: Message[];
};

//////////////////////////////////////////////////
// SMART AI RESPONSES
//////////////////////////////////////////////////

function generateAIResponse(prompt: string) {
  const lower = prompt.toLowerCase();

  //////////////////////////////////////////////////
  // VIDEO
  //////////////////////////////////////////////////

  if (
    lower.includes("video") ||
    lower.includes("cinematic") ||
    lower.includes("film")
  ) {
    return `🎬 Cinematic Scene Generated

Title:
"${prompt}"

📍 Scene Direction:
Ultra cinematic environment with dramatic lighting, realistic camera motion, volumetric fog and dynamic atmosphere.

🎥 Camera:
Slow cinematic dolly movement with depth of field.

✨ Style:
Kling AI realism • 4K • hyper detailed • movie quality.

🔊 Audio:
Ambient atmosphere with immersive sound design.

⏳ Estimated render:
12 seconds`;
  }

  //////////////////////////////////////////////////
  // IMAGE
  //////////////////////////////////////////////////

  if (
    lower.includes("image") ||
    lower.includes("photo") ||
    lower.includes("poster")
  ) {
    return `🖼️ AI Image Prompt Generated

"${prompt}"

Style:
Ultra realistic • cinematic lighting • highly detailed • 8K • masterpiece quality.

📸 Composition:
Professional framing with dramatic shadows and depth.`;
  }

  //////////////////////////////////////////////////
  // LOGO
  //////////////////////////////////////////////////

  if (
    lower.includes("logo") ||
    lower.includes("brand")
  ) {
    return `✨ Brand Identity Generated

Brand Concept:
${prompt}

🎨 Style:
Minimal futuristic luxury branding with glowing accents and premium typography.

📦 Deliverables:
• Logo concept
• Color palette
• Typography direction
• Social branding`;
  }

  //////////////////////////////////////////////////
  // WEBSITE
  //////////////////////////////////////////////////

  if (
    lower.includes("website") ||
    lower.includes("landing")
  ) {
    return `🌐 AI Website Structure Created

Project:
${prompt}

Sections:
• Hero section
• Features
• Pricing
• Testimonials
• CTA
• Footer

✨ Style:
Modern SaaS UI with glassmorphism and cinematic gradients.`;
  }

  //////////////////////////////////////////////////
  // DEFAULT
  //////////////////////////////////////////////////

  return `🤖 AI Analysis Complete

Prompt:
"${prompt}"

✨ AMKAAI generated an intelligent cinematic response based on your request.

Capabilities detected:
• Creative AI generation
• Cinematic understanding
• Visual enhancement
• Advanced prompting

🚀 Ready for production rendering.`;
}

//////////////////////////////////////////////////
// PAGE
//////////////////////////////////////////////////

export default function DashboardPage() {
  const [sidebarOpen, setSidebarOpen] =
    useState(true);

  const [loading, setLoading] =
    useState(false);

  const [input, setInput] = useState("");

  const [credits, setCredits] =
    useState(42);

  const [plan] = useState("PRO");

  const [chats, setChats] = useState<Chat[]>(
    []
  );

  const [activeChatId, setActiveChatId] =
    useState<string | null>(null);

  const bottomRef =
    useRef<HTMLDivElement>(null);

  //////////////////////////////////////////////////
  // FIRST CHAT
  //////////////////////////////////////////////////

  useEffect(() => {
    if (chats.length === 0) {
      createNewChat();
    }
  }, []);

  //////////////////////////////////////////////////
  // AUTO SCROLL
  //////////////////////////////////////////////////

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [chats, loading]);

  //////////////////////////////////////////////////
  // ACTIVE CHAT
  //////////////////////////////////////////////////

  const activeChat = useMemo(() => {
    return chats.find(
      (c) => c.id === activeChatId
    );
  }, [chats, activeChatId]);

  //////////////////////////////////////////////////
  // CREATE CHAT
  //////////////////////////////////////////////////

  const createNewChat = () => {
    const chat: Chat = {
      id: crypto.randomUUID(),
      title: "New Chat",
      createdAt: Date.now(),
      messages: [],
    };

    setChats((prev) => [chat, ...prev]);

    setActiveChatId(chat.id);
  };

  //////////////////////////////////////////////////
  // DELETE CHAT
  //////////////////////////////////////////////////

  const deleteChat = (id: string) => {
    const filtered = chats.filter(
      (c) => c.id !== id
    );

    setChats(filtered);

    if (activeChatId === id) {
      setActiveChatId(
        filtered[0]?.id || null
      );
    }
  };

  //////////////////////////////////////////////////
  // SEND MESSAGE
  //////////////////////////////////////////////////

  const sendMessage = async () => {
    if (!input.trim()) return;

    if (!activeChat) return;

    if (credits <= 0) {
      alert("No credits remaining.");
      return;
    }

    const prompt = input;

    const userMessage: Message = {
      role: "user",
      content: prompt,
    };

    //////////////////////////////////////////////////
    // USER MESSAGE
    //////////////////////////////////////////////////

    setChats((prev) =>
      prev.map((chat) =>
        chat.id === activeChatId
          ? {
              ...chat,

              title:
                chat.messages.length === 0
                  ? prompt.slice(0, 30)
                  : chat.title,

              messages: [
                ...chat.messages,
                userMessage,
              ],
            }
          : chat
      )
    );

    setInput("");

    setLoading(true);

    //////////////////////////////////////////////////
    // SMART AI
    //////////////////////////////////////////////////

    setTimeout(() => {
      const aiResponse =
        generateAIResponse(prompt);

      const aiMessage: Message = {
        role: "assistant",
        content: aiResponse,
      };

      setChats((prev) =>
        prev.map((chat) =>
          chat.id === activeChatId
            ? {
                ...chat,
                messages: [
                  ...chat.messages,
                  aiMessage,
                ],
              }
            : chat
        )
      );

      setCredits((prev) => prev - 1);

      setLoading(false);
    }, 1800);
  };

  return (
    <main className="relative flex h-screen overflow-hidden bg-black text-white">

      {/* BACKGROUND */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.12),transparent_30%),radial-gradient(circle_at_bottom,rgba(168,85,247,0.12),transparent_30%)]" />

      {/* SIDEBAR */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{
              x: -300,
              opacity: 0,
            }}
            animate={{
              x: 0,
              opacity: 1,
            }}
            exit={{
              x: -300,
              opacity: 0,
            }}
            className="relative z-30 flex w-80 flex-col border-r border-white/10 bg-white/5 backdrop-blur-2xl"
          >
            {/* TOP */}
            <div className="border-b border-white/10 p-5">

              <div className="mb-5 flex items-center justify-between">

                <Link
                  href="/"
                  className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-2xl font-black text-transparent"
                >
                  AMKAAI
                </Link>

                <button
                  onClick={() =>
                    setSidebarOpen(false)
                  }
                  className="rounded-xl p-2 transition hover:bg-white/10"
                >
                  <PanelLeft size={18} />
                </button>
              </div>

              <button
                onClick={createNewChat}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 font-bold text-black transition hover:scale-[1.02]"
              >
                <Plus size={18} />
                New Chat
              </button>
            </div>

            {/* CHATS */}
            <div className="flex-1 overflow-y-auto p-4">

              <div className="mb-4 px-2 text-xs uppercase tracking-widest text-gray-500">
                Recent Chats
              </div>

              <div className="space-y-2">

                {chats.map((chat) => (
                  <motion.div
                    key={chat.id}
                    whileHover={{
                      scale: 1.01,
                    }}
                    className={`group flex cursor-pointer items-center justify-between rounded-2xl border p-3 transition ${
                      activeChatId ===
                      chat.id
                        ? "border-cyan-400/30 bg-cyan-400/10"
                        : "border-white/5 bg-white/[0.03] hover:bg-white/5"
                    }`}
                    onClick={() =>
                      setActiveChatId(chat.id)
                    }
                  >
                    <div className="overflow-hidden">

                      <p className="truncate text-sm font-medium">
                        {chat.title}
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        {chat.messages.length} messages
                      </p>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteChat(chat.id);
                      }}
                      className="opacity-0 transition group-hover:opacity-100"
                    >
                      <Trash2
                        size={15}
                        className="text-red-400"
                      />
                    </button>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* PLAN */}
            <div className="border-t border-white/10 p-5">

              <div className="rounded-3xl border border-cyan-400/20 bg-cyan-400/10 p-5">

                <div className="flex items-center gap-2">
                  <Crown
                    size={18}
                    className="text-cyan-400"
                  />

                  <p className="font-bold">
                    {plan} PLAN
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-gray-400">
                    Credits
                  </span>

                  <span className="font-bold text-cyan-400">
                    {credits}
                  </span>
                </div>

                <button className="mt-5 w-full rounded-2xl bg-white py-3 font-bold text-black transition hover:scale-[1.02]">
                  Upgrade
                </button>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* MAIN */}
      <section className="relative z-10 flex flex-1 flex-col">

        {/* TOPBAR */}
        <header className="flex items-center justify-between border-b border-white/10 bg-black/30 px-6 py-4 backdrop-blur-xl">

          <div className="flex items-center gap-3">

            {!sidebarOpen && (
              <button
                onClick={() =>
                  setSidebarOpen(true)
                }
                className="rounded-xl p-2 transition hover:bg-white/10"
              >
                <PanelLeft size={18} />
              </button>
            )}

            <div>
              <h1 className="text-xl font-bold">
                AI Dashboard
              </h1>

              <p className="text-sm text-gray-500">
                Create cinematic AI content
              </p>
            </div>
          </div>

          <div className="hidden items-center gap-3 md:flex">

            <TopButton
              icon={<Zap size={16} />}
              label="Generate"
            />

            <TopButton
              icon={<BarChart3 size={16} />}
              label="Analytics"
            />

            <TopButton
              icon={<CreditCard size={16} />}
              label="Billing"
            />

            <TopButton
              icon={<Settings size={16} />}
              label="Settings"
            />
          </div>
        </header>

        {/* CHAT */}
        <div className="flex flex-1 flex-col overflow-hidden">

          {/* MESSAGES */}
          <div className="flex-1 overflow-y-auto px-6 py-8">

            {activeChat?.messages
              ?.length === 0 && (
              <div className="mx-auto mt-24 max-w-2xl text-center">

                <motion.div
                  initial={{
                    opacity: 0,
                    y: 20,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  className="inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-5 py-2 text-sm text-cyan-300"
                >
                  <Sparkles
                    size={16}
                    className="mr-2"
                  />
                  AI Powered Workspace
                </motion.div>

                <h2 className="mt-8 text-5xl font-black">
                  Create cinematic AI experiences
                </h2>

                <p className="mt-6 text-lg text-gray-400">
                  Generate videos, prompts,
                  concepts, visuals and AI content.
                </p>
              </div>
            )}

            <div className="mx-auto max-w-4xl space-y-8">

              {activeChat?.messages.map(
                (msg, i) => (
                  <motion.div
                    key={i}
                    initial={{
                      opacity: 0,
                      y: 20,
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                    }}
                    className={`flex ${
                      msg.role === "user"
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >
                    <div
                      className={`flex max-w-2xl gap-4 rounded-3xl border p-5 ${
                        msg.role === "user"
                          ? "border-cyan-400/20 bg-cyan-400/10"
                          : "border-white/10 bg-white/5"
                      }`}
                    >
                      <div className="mt-1">
                        {msg.role ===
                        "assistant" ? (
                          <Wand2 className="text-cyan-400" />
                        ) : (
                          <User className="text-white" />
                        )}
                      </div>

                      <div>
                        <p className="whitespace-pre-wrap leading-relaxed text-gray-200">
                          {msg.content}
                        </p>

                        <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
                          <Clock3 size={12} />
                          Just now
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )
              )}

              {/* LOADING */}
              {loading && (
                <motion.div
                  initial={{
                    opacity: 0,
                  }}
                  animate={{
                    opacity: 1,
                  }}
                  className="flex justify-start"
                >
                  <div className="flex items-center gap-4 rounded-3xl border border-white/10 bg-white/5 px-5 py-4">

                    <Bot className="text-cyan-400" />

                    <div className="flex gap-2">
                      <div className="h-2 w-2 animate-bounce rounded-full bg-cyan-400" />

                      <div className="h-2 w-2 animate-bounce rounded-full bg-cyan-400 [animation-delay:0.2s]" />

                      <div className="h-2 w-2 animate-bounce rounded-full bg-cyan-400 [animation-delay:0.4s]" />
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={bottomRef} />
            </div>
          </div>

          {/* INPUT */}
          <div className="border-t border-white/10 bg-black/30 p-5 backdrop-blur-xl">

            <div className="mx-auto max-w-4xl">

              <div className="flex items-end gap-4 rounded-3xl border border-white/10 bg-white/5 p-3 backdrop-blur-xl">

                <textarea
                  value={input}
                  onChange={(e) =>
                    setInput(e.target.value)
                  }
                  placeholder="Ask AMKAAI to generate cinematic content..."
                  className="max-h-40 min-h-[56px] flex-1 resize-none bg-transparent px-3 py-3 text-white outline-none placeholder:text-gray-500"
                  onKeyDown={(e) => {
                    if (
                      e.key === "Enter" &&
                      !e.shiftKey
                    ) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                />

                <button
                  onClick={sendMessage}
                  disabled={loading}
                  className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-400 text-black transition hover:scale-105 disabled:opacity-50"
                >
                  <Send size={18} />
                </button>
              </div>

              <p className="mt-3 text-center text-xs text-gray-500">
                AMKAAI may generate inaccurate content.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

//////////////////////////////////////////////////
// TOP BUTTON
//////////////////////////////////////////////////

function TopButton({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button className="hidden items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-gray-300 transition hover:bg-white/10 md:flex">
      {icon}
      {label}
    </button>
  );
}
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import Header from "./components/Header.jsx";
import Welcome from "./components/Welcome.jsx";
import Message from "./components/Message.jsx";
import Typing from "./components/Typing.jsx";
import Composer from "./components/Composer.jsx";

const STORE = "rebot.chat.v1";
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

function loadChat() {
  try {
    return JSON.parse(localStorage.getItem(STORE) || "[]").map((m) => ({ ...m, animate: false }));
  } catch {
    return [];
  }
}

export default function App() {
  const [messages, setMessages] = useState(loadChat);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [health, setHealth] = useState(null);
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || "light");
  const endRef = useRef(null);

  // theme
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem("rebot.theme", theme); } catch {}
  }, [theme]);

  // persist conversation
  useEffect(() => {
    try {
      const slim = messages.slice(-50).map(({ animate, ...m }) => m);
      localStorage.setItem(STORE, JSON.stringify(slim));
    } catch {}
  }, [messages]);

  // backend health (also reflects background scrape growing the index)
  useEffect(() => {
    let alive = true;
    const ping = () =>
      fetch("/api/health")
        .then((r) => r.json())
        .then((j) => alive && setHealth(j))
        .catch(() => alive && setHealth({ status: "down" }));
    ping();
    const t = setInterval(ping, 30000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  const scrollDown = useCallback(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, []);
  useEffect(scrollDown, [messages.length, loading, scrollDown]);

  const send = useCallback(async (text, baseMessages) => {
    const q = text.trim();
    if (!q || loading) return;
    const prior = baseMessages ?? messages;
    const history = prior.filter((m) => !m.error).slice(-6).map(({ role, content }) => ({ role, content }));
    setMessages([...prior, { id: uid(), role: "user", content: q }]);
    setInput("");
    setLoading(true);
    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: q, history }),
      });
      if (!r.ok) throw new Error("HTTP " + r.status);
      const j = await r.json();
      setMessages((p) => [
        ...p,
        { id: uid(), role: "assistant", content: j.answer, sources: j.sources || [], model: j.model, animate: true },
      ]);
    } catch {
      setMessages((p) => [
        ...p,
        { id: uid(), role: "assistant", error: true, retry: q, content: "Sorry, I couldn't reach the server. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }, [messages, loading]);

  const retry = (msg) => {
    const i = messages.findIndex((m) => m.id === msg.id);
    send(msg.retry, messages.slice(0, Math.max(0, i - 1)));
  };

  const empty = messages.length === 0 && !loading;

  return (
    <div className="app">
      <div className="bg" aria-hidden="true"><span /><span /><span /></div>

      <Header
        health={health}
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
        onClear={() => !loading && setMessages([])}
        canClear={messages.length > 0}
      />

      <main className="chat" role="log" aria-live="polite">
        <div className="chat-inner">
          <AnimatePresence mode="wait">
            {empty && <Welcome key="welcome" onPick={(s) => send(s)} />}
          </AnimatePresence>

          {messages.map((m) => (
            <Message key={m.id} msg={m} onTick={scrollDown} onRetry={retry} />
          ))}

          <AnimatePresence>{loading && <Typing key="typing" />}</AnimatePresence>
          <div ref={endRef} />
        </div>
      </main>

      <Composer value={input} onChange={setInput} onSend={(t) => send(t)} loading={loading} />
    </div>
  );
}

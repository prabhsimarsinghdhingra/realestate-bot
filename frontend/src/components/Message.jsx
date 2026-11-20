import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { AlertCircle, Check, Copy, ExternalLink, RotateCw, Sparkles, User } from "lucide-react";

const reduceMotion = () =>
  typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

function balance(text) {
  // close an unfinished **bold** while the text is being revealed
  return (text.match(/\*\*/g) || []).length % 2 ? text + "**" : text;
}

function shortModel(m) {
  return m ? m.split("/").pop().replace(":free", "") : null;
}

export default function Message({ msg, onTick, onRetry }) {
  const isUser = msg.role === "user";
  const tokens = useMemo(() => msg.content.split(/(\s+)/), [msg.content]);
  const animate = !!msg.animate && !isUser && !reduceMotion();
  const [idx, setIdx] = useState(animate ? 0 : tokens.length);
  const [copied, setCopied] = useState(false);
  const done = idx >= tokens.length;

  useEffect(() => {
    if (!animate) return;
    const step = Math.max(2, Math.ceil(tokens.length / 90));
    const t = setInterval(() => {
      setIdx((n) => {
        const next = Math.min(n + step, tokens.length);
        if (next >= tokens.length) clearInterval(t);
        return next;
      });
      onTick && onTick();
    }, 20);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const text = done ? msg.content : balance(tokens.slice(0, idx).join(""));

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(msg.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {}
  };

  return (
    <motion.div
      className={`row ${isUser ? "user" : "assistant"}`}
      initial={{ opacity: 0, y: 14, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      layout="position"
    >
      {!isUser && (
        <div className={`avatar bot ${msg.error ? "err" : ""}`}>
          {msg.error ? <AlertCircle size={16} /> : <Sparkles size={16} />}
        </div>
      )}

      <div className={`bubble ${isUser ? "user" : "bot"} ${msg.error ? "error" : ""}`}>
        {isUser ? (
          <p>{msg.content}</p>
        ) : (
          <div className="md">
            <ReactMarkdown
              components={{ a: (p) => <a {...p} target="_blank" rel="noopener noreferrer" /> }}
            >
              {text}
            </ReactMarkdown>
            {!done && <span className="caret" />}
          </div>
        )}

        {!isUser && done && (
          <motion.div className="meta" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {msg.sources?.length > 0 && (
              <div className="sources">
                <span className="sources-label">Sources</span>
                {msg.sources.slice(0, 5).map((s, i) => (
                  <motion.a
                    key={s.url}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`chip ${s.source === "Wasalt" ? "was" : "dar"}`}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.06 * i }}
                    whileHover={{ y: -2 }}
                    title={s.title}
                  >
                    <i />
                    <span>{s.title || s.source}</span>
                    <ExternalLink size={12} />
                  </motion.a>
                ))}
              </div>
            )}
            <div className="actions">
              {msg.model && <span className="model">{shortModel(msg.model)}</span>}
              {msg.error && msg.retry ? (
                <button className="ghost" onClick={() => onRetry(msg)}>
                  <RotateCw size={13} /> Retry
                </button>
              ) : (
                <button className="ghost" onClick={copy}>
                  {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? "Copied" : "Copy"}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </div>

      {isUser && <div className="avatar me"><User size={16} /></div>}
    </motion.div>
  );
}

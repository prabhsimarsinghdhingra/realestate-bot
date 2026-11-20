import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowUp, Loader2 } from "lucide-react";

export default function Composer({ value, onChange, onSend, loading }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }, [value]);

  useEffect(() => { if (!loading) ref.current?.focus(); }, [loading]);

  const submit = () => { if (value.trim() && !loading) onSend(value); };
  const canSend = value.trim().length > 0 && !loading;

  return (
    <div className="composer-wrap">
      <div className={`composer ${loading ? "busy" : ""}`}>
        <textarea
          ref={ref}
          rows={1}
          value={value}
          maxLength={800}
          placeholder="Ask about projects, partnerships or services…"
          aria-label="Your question"
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); }
          }}
        />
        <motion.button
          className="send"
          onClick={submit}
          disabled={!canSend}
          aria-label="Send message"
          whileTap={{ scale: 0.9 }}
          whileHover={canSend ? { scale: 1.06 } : {}}
        >
          {loading ? <Loader2 size={18} className="spin" /> : <ArrowUp size={18} />}
        </motion.button>
      </div>
      <p className="disclaimer">
        AI-generated from public DarGlobal &amp; Wasalt data. Verify important details at darglobal.co.uk and wasalt.sa.
      </p>
    </div>
  );
}

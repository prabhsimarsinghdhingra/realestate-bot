import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles } from "lucide-react";

const STEPS = ["Searching knowledge base…", "Reading relevant sources…", "Composing your answer…"];

export default function Typing() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => Math.min(n + 1, STEPS.length - 1)), 1500);
    return () => clearInterval(t);
  }, []);

  return (
    <motion.div
      className="row assistant"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      aria-live="polite"
    >
      <div className="avatar bot pulse"><Sparkles size={16} /></div>
      <div className="bubble typing">
        <div className="typing-head">
          <span className="dots"><i /><i /><i /></span>
          <AnimatePresence mode="wait">
            <motion.span
              key={i}
              className="typing-label"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
            >
              {STEPS[i]}
            </motion.span>
          </AnimatePresence>
        </div>
        <div className="skeleton" style={{ width: "92%" }} />
        <div className="skeleton" style={{ width: "78%" }} />
        <div className="skeleton" style={{ width: "54%" }} />
      </div>
    </motion.div>
  );
}

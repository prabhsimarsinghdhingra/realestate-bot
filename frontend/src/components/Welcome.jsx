import { motion } from "framer-motion";
import { ArrowUpRight, Globe2, Home } from "lucide-react";

const SUGGESTIONS = [
  "What projects does Dar Global have in Dubai?",
  "Who founded Wasalt?",
  "Tell me about Trump Tower Jeddah",
  "Which brands does Dar Global partner with?",
  "What licences does Wasalt hold?",
  "How are DarGlobal and Wasalt related?",
];

const container = { hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.15 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } } };

export default function Welcome({ onPick }) {
  return (
    <motion.section className="welcome" variants={container} initial="hidden" animate="show" exit={{ opacity: 0, y: -10 }}>
      <motion.span className="eyebrow" variants={item}>AI-powered · Built on public data</motion.span>
      <motion.h2 variants={item}>
        Ask anything about <em>luxury development</em> and <em>Saudi proptech</em>
      </motion.h2>
      <motion.p className="lede" variants={item}>
        Get sourced answers about projects, partnerships and services from DarGlobal and Wasalt.
      </motion.p>

      <motion.div className="brand-cards" variants={item}>
        <div className="brand-card dar">
          <Globe2 size={18} />
          <div><strong>DarGlobal</strong><span>International luxury developer</span></div>
        </div>
        <div className="brand-card was">
          <Home size={18} />
          <div><strong>Wasalt</strong><span>Saudi real estate platform</span></div>
        </div>
      </motion.div>

      <motion.div className="suggestions" variants={container}>
        {SUGGESTIONS.map((s) => (
          <motion.button
            key={s}
            className="suggestion"
            variants={item}
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onPick(s)}
          >
            <span>{s}</span>
            <ArrowUpRight size={16} />
          </motion.button>
        ))}
      </motion.div>
    </motion.section>
  );
}

import { AnimatePresence, motion } from "framer-motion";
import { Building2, Moon, Sun, Trash2 } from "lucide-react";

export default function Header({ health, theme, onToggleTheme, onClear, canClear }) {
  const state = !health ? "loading" : health.status === "ok" ? "ok" : "down";
  const label =
    state === "loading" ? "Connecting…" :
    state === "down" ? "Offline" :
    `Live · ${health.chunks} knowledge chunks`;

  return (
    <header className="header">
      <div className="brand">
        <motion.div
          className="logo"
          initial={{ rotate: -12, scale: 0.7, opacity: 0 }}
          animate={{ rotate: 0, scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 220, damping: 14 }}
        >
          <Building2 size={20} />
        </motion.div>
        <div>
          <h1>DarGlobal <span>&amp;</span> Wasalt</h1>
          <p>Property Intelligence Assistant</p>
        </div>
      </div>

      <div className="header-actions">
        <div className={`status status-${state}`} title="Backend status">
          <span className="dot" />
          <span className="status-text">{label}</span>
        </div>

        <AnimatePresence>
          {canClear && (
            <motion.button
              className="icon-btn"
              onClick={onClear}
              aria-label="Clear conversation"
              title="Clear conversation"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              whileTap={{ scale: 0.9 }}
            >
              <Trash2 size={17} />
            </motion.button>
          )}
        </AnimatePresence>

        <button className="icon-btn" onClick={onToggleTheme} aria-label="Toggle theme" title="Toggle theme">
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={theme}
              style={{ display: "flex" }}
              initial={{ rotate: -90, opacity: 0, scale: 0.6 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              exit={{ rotate: 90, opacity: 0, scale: 0.6 }}
              transition={{ duration: 0.18 }}
            >
              {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
            </motion.span>
          </AnimatePresence>
        </button>
      </div>
    </header>
  );
}

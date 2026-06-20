import { useRef, useState, useEffect } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import { Terminal, Shield, Cpu, RefreshCw, Layers, ArrowRight, Activity, Zap } from 'lucide-react';

// Custom trailing cursor glow (desktop only)
export function CustomCursor() {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    const isMobile = /android|ipad|iphone|ipod/i.test(userAgent);
    setIsDesktop(!isMobile);
  }, []);

  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);
  
  const springConfig = { damping: 30, stiffness: 200, mass: 0.6 };
  const cursorXSpring = useSpring(cursorX, springConfig);
  const cursorYSpring = useSpring(cursorY, springConfig);

  useEffect(() => {
    if (!isDesktop) return;
    const moveCursor = (e) => {
      cursorX.set(e.clientX - 12);
      cursorY.set(e.clientY - 12);
    };
    window.addEventListener('mousemove', moveCursor);
    return () => {
      window.removeEventListener('mousemove', moveCursor);
    };
  }, [isDesktop, cursorX, cursorY]);

  if (!isDesktop) return null;

  return (
    <motion.div
      className="custom-cursor-glow"
      style={{
        x: cursorXSpring,
        y: cursorYSpring,
      }}
    />
  );
}

// Magnetic Button with cursor attraction
export function MagneticButton({ children, className, onClick, ...props }) {
  const ref = useRef(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e) => {
    const { clientX, clientY } = e;
    const { left, top, width, height } = ref.current.getBoundingClientRect();
    const centerX = left + width / 2;
    const centerY = top + height / 2;
    
    const distanceX = clientX - centerX;
    const distanceY = clientY - centerY;
    
    // Magnetic pull ratio
    const magneticPull = 0.25; 
    const offsetX = Math.min(Math.max(distanceX * magneticPull, -8), 8);
    const offsetY = Math.min(Math.max(distanceY * magneticPull, -8), 8);
    
    setPosition({ x: offsetX, y: offsetY });
  };

  const handleMouseLeave = () => {
    setPosition({ x: 0, y: 0 });
  };

  return (
    <motion.button
      ref={ref}
      className={className}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      animate={{ x: position.x, y: position.y }}
      transition={{ type: 'spring', stiffness: 200, damping: 15, mass: 0.1 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      {...props}
    >
      {children}
    </motion.button>
  );
}

export default function Homepage({ onLaunchWorkspace }) {
  // Page Transition variants
  const pageVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.5,
        ease: 'easeOut',
        staggerChildren: 0.08
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.45, ease: 'easeOut' }
    }
  };

  return (
    <motion.div 
      className="homepage-container"
      variants={pageVariants}
      initial="hidden"
      animate="visible"
    >
      <CustomCursor />

      {/* Decorative gradients */}
      <div className="bg-glow-spot glow-1" />
      <div className="bg-glow-spot glow-2" />

      {/* Hero Section */}
      <section className="hero-section">
        <motion.div className="hero-badge" variants={itemVariants}>
          <span className="hero-badge-dot" />
          BrowseIQ Autopilot 2.0
        </motion.div>
        
        <motion.h1 className="hero-title" variants={itemVariants}>
          Browser automation,<br />
          accelerated by <span className="title-gradient">cognitive AI</span>.
        </motion.h1>
        
        <motion.p className="hero-subtitle" variants={itemVariants}>
          The first browser autopilot built to perceive page layouts semantically like a human. Connect, launch loops, and watch the AI navigate form contexts seamlessly.
        </motion.p>
        
        <motion.div className="hero-ctas" variants={itemVariants}>
          <MagneticButton className="cta-primary-btn" onClick={onLaunchWorkspace}>
            Launch Workspace
            <ArrowRight className="cta-icon" />
          </MagneticButton>
          <button className="cta-secondary-btn" onClick={() => window.open('https://github.com/notharshagithub/BrowseIQ', '_blank')}>
            View Source Code
          </button>
        </motion.div>
      </section>

      {/* Dashboard Preview / Mock Grid */}
      <motion.section className="preview-section" variants={itemVariants}>
        <div className="preview-window-frame">
          <div className="preview-window-header">
            <div className="preview-dots">
              <span className="p-dot red" />
              <span className="p-dot yellow" />
              <span className="p-dot green" />
            </div>
            <div className="preview-address-bar">
              <Terminal className="p-bar-icon" />
              browseiq.local/workspace
            </div>
          </div>
          <div className="preview-window-body">
            <div className="preview-grid">
              <div className="p-card stat-card">
                <div className="p-card-header">
                  <Activity className="p-card-icon text-cyan" />
                  <span>Agent Precision</span>
                </div>
                <div className="p-card-val">99.8%</div>
                <div className="p-card-desc">Successful completions</div>
              </div>
              <div className="p-card stat-card">
                <div className="p-card-header">
                  <Zap className="p-card-icon text-pink" />
                  <span>Avg Duration</span>
                </div>
                <div className="p-card-val">1.2s</div>
                <div className="p-card-desc">Hydration to action speed</div>
              </div>
              <div className="p-card stat-card">
                <div className="p-card-header">
                  <Cpu className="p-card-icon text-purple" />
                  <span>Model Config</span>
                </div>
                <div className="p-card-val">xAI / Groq</div>
                <div className="p-card-desc">Llama-3.3 Cognitive Loop</div>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Features Grid */}
      <motion.section className="features-section" variants={itemVariants}>
        <h2 className="features-title">Engineered for absolute control</h2>
        <p className="features-subtitle">Built around speed, visual layout precision, and robust error recovery.</p>
        
        <div className="features-grid">
          <motion.div 
            className="feature-card" 
            whileHover={{ y: -4, scale: 1.01 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <div className="f-icon-box">
              <Layers className="f-icon" />
            </div>
            <h3>Visual Perception</h3>
            <p>Bypasses Tailwind bloat and extracts clean semantic coordinate mappings directly for precise canvas clicking.</p>
          </motion.div>
          
          <motion.div 
            className="feature-card"
            whileHover={{ y: -4, scale: 1.01 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <div className="f-icon-box">
              <RefreshCw className="f-icon" />
            </div>
            <h3>Persistent Sessions</h3>
            <p>Maintains browser cookie sessions and running memory states between sequential task commands.</p>
          </motion.div>
          
          <motion.div 
            className="feature-card"
            whileHover={{ y: -4, scale: 1.01 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <div className="f-icon-box">
              <Shield className="f-icon" />
            </div>
            <h3>Self-Healing Selector Fallback</h3>
            <p>Automatically falls back from coordinate click to selector path and forced events if target click is intercepted.</p>
          </motion.div>
        </div>
      </motion.section>

      {/* Footer */}
      <footer className="homepage-footer">
        <p>&copy; 2026 BrowseIQ. Designed for advanced web automation.</p>
      </footer>
    </motion.div>
  );
}

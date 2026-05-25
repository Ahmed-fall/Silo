"use client";

import { useEffect, useState } from "react";

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [isExiting, setIsExiting] = useState(false);
  const [dbStatus, setDbStatus] = useState("CONNECTING...");
  const [mlStatus, setMlStatus] = useState("INITIALIZING...");
  const [visionStatus, setVisionStatus] = useState("OFFLINE");

  useEffect(() => {
    // Simulate high-end system checks
    const t1 = setTimeout(() => setDbStatus("CONNECTED"), 600);
    const t2 = setTimeout(() => setMlStatus("NOMINAL"), 1200);
    const t3 = setTimeout(() => setVisionStatus("ONLINE"), 1800);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  const handleEnter = () => {
    setIsExiting(true);
    setTimeout(() => {
      onComplete();
    }, 800); // Wait for sliding exit animation to complete
  };

  // Programmatically generate a gorgeous, high-fidelity vector wheat stalk line-art
  const renderWheatStalk = () => {
    const kernels = [];
    const count = 12;
    for (let i = 0; i < count; i++) {
      const y = 80 + i * 22; // starting position and spacing
      const scale = 1 - i * 0.035; // taper towards the bottom
      
      // Left kernel lobe and thin awn line
      const leftPath = `M50 ${y} Q${50 - 26 * scale} ${y - 6 * scale} ${50 - 15 * scale} ${y - 18 * scale} Q${50 - 4 * scale} ${y - 12 * scale} 50 ${y}`;
      const leftAwn = `M${50 - 15 * scale} ${y - 18 * scale} L${50 - 32 * scale} ${y - 48 * scale}`;
      
      // Right kernel lobe and thin awn line
      const rightPath = `M50 ${y} Q${50 + 26 * scale} ${y - 6 * scale} ${50 + 15 * scale} ${y - 18 * scale} Q${50 + 4 * scale} ${y - 12 * scale} 50 ${y}`;
      const rightAwn = `M${50 + 15 * scale} ${y - 18 * scale} L${50 + 32 * scale} ${y - 48 * scale}`;

      kernels.push(
        <g key={i} className="wheat-kernel" style={{ animationDelay: `${i * 100}ms` }}>
          {/* Left Side */}
          <path d={leftPath} stroke="#A48259" strokeWidth="1" fill="none" strokeLinecap="round" />
          <path d={leftAwn} stroke="#A48259" strokeWidth="0.75" strokeLinecap="round" opacity="0.4" />
          
          {/* Right Side */}
          <path d={rightPath} stroke="#A48259" strokeWidth="1" fill="none" strokeLinecap="round" />
          <path d={rightAwn} stroke="#A48259" strokeWidth="0.75" strokeLinecap="round" opacity="0.4" />
        </g>
      );
    }

    return (
      <svg className="wheat-stalk-svg" viewBox="0 0 100 400" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Central Stem */}
        <path d="M50 380 V60" stroke="#A48259" strokeWidth="1.25" strokeLinecap="round" />
        
        {/* Terminal spikelet awn */}
        <path d="M50 60 L50 20" stroke="#A48259" strokeWidth="0.75" strokeDasharray="1 1" opacity="0.7" />
        
        {kernels}
      </svg>
    );
  };

  return (
    <div className={`splash-overlay ${isExiting ? "fade-out" : ""}`}>

      <style dangerouslySetInnerHTML={{ __html: `
        .splash-overlay {
          position: fixed;
          inset: 0;
          z-index: 99999;
          background-color: #F5F2EB; /* Archival Bone-Beige */
          display: flex;
          justify-content: center;
          align-items: center;
          overflow: hidden;
          transition: opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .splash-overlay.fade-out {
          opacity: 0;
          pointer-events: none;
        }

        /* Top Government Banner stamp */
        .splash-header {
          position: absolute;
          top: 40px;
          left: 40px;
          right: 40px;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          font-family: var(--font-ibm-mono, monospace);
          color: #1C1A17;
          opacity: 0.85;
          font-size: 10px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          transition: transform 0.8s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.8s;
        }

        .fade-out .splash-header {
          transform: translateY(-20px);
          opacity: 0;
        }

        /* Center Glass Specimen Slide */
        .glass-slide-container {
          perspective: 1000px;
          display: flex;
          justify-content: center;
          align-items: center;
          transition: transform 0.8s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.8s;
        }

        .fade-out .glass-slide-container {
          transform: translateY(-80px) rotateX(10deg);
          opacity: 0;
        }

        .glass-slide {
          position: relative;
          width: 290px;
          height: 540px;
          border-radius: 4px;
          background: rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(14px) saturate(100%) contrast(1.02);
          -webkit-backdrop-filter: blur(14px) saturate(100%) contrast(1.02);
          border: 1px solid rgba(28, 26, 23, 0.09);
          box-shadow: 
            inset 0 0 24px rgba(255, 255, 255, 0.45),
            0 25px 60px rgba(28, 26, 23, 0.04);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
          padding: 45px 25px;
          transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1);
          cursor: pointer;
        }

        .glass-slide:hover {
          transform: scale(1.01) translateY(-2px);
          box-shadow: 
            inset 0 0 30px rgba(255, 255, 255, 0.6),
            0 35px 75px rgba(28, 26, 23, 0.07);
          border-color: rgba(28, 26, 23, 0.15);
        }

        /* Diagonal Glare sweep on slide hover */
        .glass-slide::after {
          content: '';
          position: absolute;
          top: -150%;
          left: -150%;
          width: 300%;
          height: 300%;
          background: linear-gradient(
            45deg,
            transparent 45%,
            rgba(255, 255, 255, 0.25) 50%,
            transparent 55%
          );
          transform: rotate(45deg);
          transition: transform 0.8s ease;
          pointer-events: none;
        }

        .glass-slide:hover::after {
          transform: translate(50%, 50%) rotate(45deg);
        }

        /* SVG Wheat stalk */
        .wheat-stalk-svg {
          width: 65px;
          height: auto;
          transform-origin: 50% 100%;
          animation: sway 12s ease-in-out infinite alternate;
          filter: drop-shadow(0 2px 4px rgba(164, 130, 89, 0.12));
        }

        @keyframes sway {
          0% { transform: rotate(-1.5deg); }
          100% { transform: rotate(1.5deg); }
        }

        .wheat-kernel {
          opacity: 0;
          transform: scale(0.9);
          transform-origin: 50% 50%;
          animation: kernel-fade-in 1.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes kernel-fade-in {
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        /* Typography & Inside Specimen Labels */
        .specimen-title {
          font-family: var(--font-cinzel), serif;
          font-size: 20px;
          font-weight: 400;
          color: #1C1A17;
          letter-spacing: 0.3em;
          text-align: center;
          margin-top: 15px;
          text-transform: uppercase;
        }

        .specimen-subtitle {
          font-family: var(--font-ibm-mono, monospace);
          font-size: 8px;
          color: #7C725E;
          letter-spacing: 0.25em;
          text-transform: uppercase;
          margin-top: 6px;
          text-align: center;
        }

        /* Stamped Status indicators */
        .system-registry {
          width: 100%;
          border-top: 1px solid rgba(28, 26, 23, 0.08);
          padding-top: 16px;
          margin-top: 10px;
        }

        .registry-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 8px;
          letter-spacing: 0.12em;
          color: #5E5442;
          text-transform: uppercase;
          margin: 6px 0;
        }

        .status-badge {
          font-weight: 500;
          color: #1C1A17;
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .status-dot {
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background-color: #A48259;
          display: inline-block;
        }

        .status-dot.active {
          background-color: #10B981;
          box-shadow: 0 0 8px rgba(16, 185, 129, 0.5);
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0% { transform: scale(1); opacity: 0.7; }
          50% { transform: scale(1.4); opacity: 1; }
          100% { transform: scale(1); opacity: 0.7; }
        }

        /* Bottom Control Button stamp */
        .action-button-stamp {
          position: absolute;
          bottom: 50px;
          font-family: var(--font-cinzel), serif;
          background: transparent;
          border: none;
          color: #3E3529; /* Soft Espresso Walnut */
          font-size: 11px; /* Readability bump for serif */
          font-weight: 600;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          cursor: pointer;
          padding: 12px 30px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          gap: 8px;
          z-index: 1;
          transition: color 0.6s cubic-bezier(0.16, 1, 0.3, 1), transform 0.6s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .action-button-stamp:hover {
          color: #F5F2EB;
          transform: translateY(-2px);
          box-shadow: 0 12px 30px rgba(164, 130, 89, 0.20);
        }

        .action-button-stamp:active {
          transform: translateY(0);
        }

        /* Animating Gradient Frame layer */
        .action-button-stamp::before {
          content: '';
          position: absolute;
          inset: -1.5px;
          border-radius: 5px;
          background: linear-gradient(90deg, #A48259, #E6DFC7, #3E3529, #A48259);
          background-size: 300% 100%;
          z-index: -2;
          animation: gradient-flow 7s linear infinite;
          transition: filter 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .action-button-stamp:hover::before {
          animation: gradient-flow 1.8s linear infinite;
          filter: saturate(1.2) brightness(1.1);
        }

        /* Inner background mask layer handling velvet transitions */
        .action-button-stamp::after {
          content: '';
          position: absolute;
          inset: 0.5px;
          border-radius: 3.5px;
          background-color: #F5F2EB;
          z-index: -1;
          transition: background-color 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .action-button-stamp:hover::after {
          background-color: #3E3529; /* Soft Espresso Walnut */
        }

        @keyframes gradient-flow {
          0% { background-position: 0% 50%; }
          100% { background-position: 300% 50%; }
        }

        /* Responsive */
        @media (max-width: 640px) {
          .splash-header {
            left: 20px;
            right: 20px;
            top: 20px;
            flex-direction: column;
            gap: 4px;
          }
          .glass-slide {
            width: 250px;
            height: 460px;
            padding: 30px 15px;
          }
          .wheat-stalk-svg {
            width: 50px;
          }
          .action-button-stamp {
            bottom: 40px;
          }
        }
      `}} />

      {/* Top Banner Stamped Text */}
      <div className="splash-header">
        <div>STATE GRAIN INTELLIGENCE & RESERVES</div>
        <div style={{ opacity: 0.6 }}>CONFIDENTIAL / SECURE ACCESS REGISTRATION</div>
      </div>

      {/* Main Specimen Preservation Glass Slide */}
      <div className="glass-slide-container">
        <div className="glass-slide" onClick={handleEnter}>
          {/* Pressed Stalk */}
          {renderWheatStalk()}

          {/* Catalog Tags */}
          <div style={{ width: "100%" }}>
            <div className="specimen-title">SILO</div>
            <div className="specimen-subtitle">NATIONAL PRESERVATION VAULT</div>
            
            {/* System Security Registry Stamped Logs */}
            <div className="system-registry">
              <div className="registry-item">
                <span>DATABASE</span>
                <span className="status-badge">
                  <span className={`status-dot ${dbStatus === "CONNECTED" ? "active" : ""}`} />
                  {dbStatus}
                </span>
              </div>
              <div className="registry-item">
                <span>PREDICTIVE ML</span>
                <span className="status-badge">
                  <span className={`status-dot ${mlStatus === "NOMINAL" ? "active" : ""}`} />
                  {mlStatus}
                </span>
              </div>
              <div className="registry-item">
                <span>AI VISION SYS</span>
                <span className="status-badge">
                  <span className={`status-dot ${visionStatus === "ONLINE" ? "active" : ""}`} />
                  {visionStatus}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Initiate Access trigger */}
      <button className="action-button-stamp" onClick={handleEnter}>
        [ INITIATE SECURE ACCESS ]
      </button>
    </div>
  );
}

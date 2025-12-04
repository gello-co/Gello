/**
 * Gello Confetti Setup - canvas-confetti configurations
 * Brand colors: #742e10 (brown), #f3d18d (gold), #f2e4de (cream)
 */

const GelloConfetti = {
  // Check reduced motion preference
  prefersReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,

  // Gello brand color palette
  colors: ['#742e10', '#f3d18d', '#f2e4de'],
  goldColors: ['#f3d18d', '#c9a05c'],

  /**
   * Tour completion celebration - single burst
   */
  tourComplete() {
    if (this.prefersReducedMotion || typeof confetti !== 'function') return;

    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.7 },
      colors: this.colors,
      ticks: 200,
      gravity: 1.2,
      scalar: 1.1,
    });
  },

  /**
   * All tours complete - fireworks from both sides
   */
  allToursComplete() {
    if (this.prefersReducedMotion || typeof confetti !== 'function') return;

    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      // Left side
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.6 },
        colors: this.colors,
      });

      // Right side
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.6 },
        colors: this.colors,
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    frame();
  },

  /**
   * Subtle star burst for milestones
   */
  starBurst() {
    if (this.prefersReducedMotion || typeof confetti !== 'function') return;

    confetti({
      particleCount: 30,
      spread: 360,
      ticks: 60,
      gravity: 0,
      decay: 0.95,
      startVelocity: 10,
      shapes: ['star'],
      colors: this.goldColors,
      origin: { y: 0.5 },
    });
  },
};

// Expose globally
window.GelloConfetti = GelloConfetti;
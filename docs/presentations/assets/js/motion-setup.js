/**
 * Gello Motion Setup - Motion One entrance animations
 * Uses spring physics and stagger effects
 */

const GelloMotion = {
  // Check reduced motion preference
  prefersReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,

  /**
   * Initialize card entrance animations on index page
   */
  initCardEntrance() {
    if (this.prefersReducedMotion) {
      // Show cards immediately without animation
      document.querySelectorAll('.tour-card').forEach((card) => {
        card.style.opacity = '1';
        card.style.transform = 'none';
      });
      return;
    }

    // Motion One is exposed as window.Motion from CDN
    const { animate, stagger, spring } = window.Motion;

    // Staggered entrance animation for cards
    // spring() takes positional args: stiffness, damping
    animate(
      '.tour-card',
      {
        opacity: [0, 1],
        y: [40, 0],
        scale: [0.95, 1],
      },
      {
        delay: stagger(0.12),
        duration: 0.5,
        easing: spring(200, 20),
      },
    );

    // Animate shortcuts section after cards
    animate('.shortcuts', { opacity: [0, 1], y: [20, 0] }, { delay: 0.7, duration: 0.4, easing: 'ease-out' });
  },

  /**
   * Animate completion badge pop-in
   * @param {HTMLElement} element - The badge element
   */
  animateCompletionBadge(element) {
    if (this.prefersReducedMotion || !window.Motion) return;

    const { animate, spring } = window.Motion;

    animate(
      element,
      { scale: [0, 1.3, 1], opacity: [0, 1] },
      {
        duration: 0.4,
        easing: spring(400, 12),
      },
    );
  },

  /**
   * Animate progress bar width change
   * @param {number} percent - Target width percentage
   */
  animateProgressBar(percent) {
    const progressBar = document.querySelector('.slide-progress-bar');
    if (!progressBar) return;

    if (this.prefersReducedMotion || !window.Motion) {
      progressBar.style.width = `${percent}%`;
      return;
    }

    const { animate } = window.Motion;

    animate(progressBar, { width: `${percent}%` }, { duration: 0.35, easing: [0.4, 0, 0.2, 1] });
  },

  /**
   * Celebration timeline for section completion
   * @param {string} sectionId - The completed section ID
   */
  celebrateSectionCompletion(sectionId) {
    if (this.prefersReducedMotion || !window.Motion) {
      // Just trigger confetti without animations
      if (window.GelloConfetti) {
        window.GelloConfetti.sectionComplete();
      }
      return;
    }

    const { timeline, spring } = window.Motion;
    const card = document.querySelector(`.tour-card[data-tour="${sectionId}"]`);
    const badge = card?.querySelector('.completion-badge');

    if (!card) {
      // Fallback: just trigger confetti
      if (window.GelloConfetti) {
        window.GelloConfetti.sectionComplete();
      }
      return;
    }

    // Multi-step animation sequence
    const sequence = timeline([
      // Pulse the card
      [card, { scale: [1, 1.02, 1] }, { duration: 0.3 }],
      // Pop in the badge (if present)
      ...(badge ? [[badge, { scale: [0, 1.4, 1], opacity: [0, 1] }, { at: 0.1, easing: spring(500, 15) }]] : []),
    ]);

    // Fire confetti after animation
    sequence.finished.then(() => {
      if (window.GelloConfetti) {
        window.GelloConfetti.sectionComplete();
      }
    });
  },

  /**
   * Celebration for all sections complete
   */
  celebrateAllComplete() {
    if (!window.Motion || !window.GelloConfetti) {
      window.GelloConfetti?.allSectionsComplete();
      return;
    }

    const { animate } = window.Motion;

    // Pulse all completed cards
    if (!this.prefersReducedMotion) {
      animate('.tour-card.completed', { scale: [1, 1.03, 1] }, { duration: 0.3, delay: 0.1 });
    }

    // Trigger fireworks
    setTimeout(() => {
      window.GelloConfetti.allSectionsComplete();
    }, 400);
  },
};

// Expose globally
window.GelloMotion = GelloMotion;

// Auto-initialize on DOMContentLoaded for index page
document.addEventListener('DOMContentLoaded', () => {
  // Only run on index page (has tour-card elements)
  if (document.querySelector('.tour-card')) {
    GelloMotion.initCardEntrance();
  }
});

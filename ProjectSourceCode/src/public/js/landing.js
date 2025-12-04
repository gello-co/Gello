// Landing page scroll animations
document.addEventListener('DOMContentLoaded', () => {
  // Intersection Observer for scroll animations
  var observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.1,
  };

  var observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        // Also trigger feature card animations
        if (
          entry.target.classList.contains('features-grid') ||
          entry.target.closest('.features-grid')
        ) {
          var cards = document.querySelectorAll('.feature-card');
          cards.forEach((card) => {
            card.classList.add('visible');
          });
        }
      }
    });
  }, observerOptions);

  // Observe all animate-on-scroll elements
  document.querySelectorAll('.animate-on-scroll').forEach((el) => {
    observer.observe(el);
  });

  // Observe feature cards individually
  document.querySelectorAll('.feature-card').forEach((el) => {
    observer.observe(el);
  });
});

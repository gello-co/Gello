/**
 * Gello Tour Progress - Alpine.js Store
 * Tracks tour completion state in localStorage
 */

document.addEventListener('alpine:init', () => {
  Alpine.store('tourProgress', {
    STORAGE_KEY: 'gello-tour-progress',

    tours: {
      '01-project-overview': { completed: false, lastVisit: null },
      '02-architecture': { completed: false, lastVisit: null },
      '03-services': { completed: false, lastVisit: null },
      '04-database': { completed: false, lastVisit: null },
      '05-testing': { completed: false, lastVisit: null },
    },

    allComplete: false,

    init() {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        try {
          const data = JSON.parse(saved);
          if (data.tours) {
            Object.keys(this.tours).forEach((id) => {
              if (data.tours[id]) {
                this.tours[id] = data.tours[id];
              }
            });
          }
          this.allComplete = Object.values(this.tours).every((t) => t.completed);
        } catch (e) {
          console.warn('Failed to parse tour progress:', e);
        }
      }
    },

    markComplete(tourId) {
      if (!this.tours[tourId]) return false;

      this.tours[tourId] = {
        completed: true,
        lastVisit: new Date().toISOString(),
      };
      this.allComplete = Object.values(this.tours).every((t) => t.completed);
      this.save();
      return this.allComplete;
    },

    isComplete(tourId) {
      return this.tours[tourId]?.completed ?? false;
    },

    getCompletedCount() {
      return Object.values(this.tours).filter((t) => t.completed).length;
    },

    getTotalCount() {
      return Object.keys(this.tours).length;
    },

    getNextIncomplete() {
      const tourOrder = [
        '01-project-overview',
        '02-architecture',
        '03-services',
        '04-database',
        '05-testing',
      ];
      return tourOrder.find((id) => !this.tours[id]?.completed) || null;
    },

    save() {
      localStorage.setItem(
        this.STORAGE_KEY,
        JSON.stringify({
          version: 1,
          tours: this.tours,
          allComplete: this.allComplete,
          lastUpdated: new Date().toISOString(),
        }),
      );
    },

    reset() {
      Object.keys(this.tours).forEach((id) => {
        this.tours[id] = { completed: false, lastVisit: null };
      });
      this.allComplete = false;
      this.save();
    },
  });
});

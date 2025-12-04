/**
 * Gello Slide Progress - Alpine.js Store
 * Tracks section completion state in localStorage
 */

document.addEventListener('alpine:init', () => {
  Alpine.store('slideProgress', {
    STORAGE_KEY: 'gello-slide-progress',

    sections: {
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
          if (data.sections) {
            Object.keys(this.sections).forEach((id) => {
              if (data.sections[id]) {
                this.sections[id] = data.sections[id];
              }
            });
          }
          this.allComplete = Object.values(this.sections).every((t) => t.completed);
        } catch (e) {
          console.warn('Failed to parse slide progress:', e);
        }
      }
    },

    markComplete(sectionId) {
      if (!this.sections[sectionId]) return false;

      this.sections[sectionId] = {
        completed: true,
        lastVisit: new Date().toISOString(),
      };
      this.allComplete = Object.values(this.sections).every((t) => t.completed);
      this.save();
      return this.allComplete;
    },

    isComplete(sectionId) {
      return this.sections[sectionId]?.completed ?? false;
    },

    getCompletedCount() {
      return Object.values(this.sections).filter((t) => t.completed).length;
    },

    getTotalCount() {
      return Object.keys(this.sections).length;
    },

    getNextIncomplete() {
      const sectionOrder = [
        '01-project-overview',
        '02-architecture',
        '03-services',
        '04-database',
        '05-testing',
      ];
      return sectionOrder.find((id) => !this.sections[id]?.completed) || null;
    },

    save() {
      localStorage.setItem(
        this.STORAGE_KEY,
        JSON.stringify({
          version: 1,
          sections: this.sections,
          allComplete: this.allComplete,
          lastUpdated: new Date().toISOString(),
        }),
      );
    },

    reset() {
      Object.keys(this.sections).forEach((id) => {
        this.sections[id] = { completed: false, lastVisit: null };
      });
      this.allComplete = false;
      this.save();
    },
  });
});

import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: 'src',
  manifest: {
    name: 'Matineer - Movie Marathon Planner',
    description: 'Plan the ultimate movie day. Find showtimes, avoid overlaps, and line up the perfect back-to-back screenings.',
    permissions: ['storage', 'unlimitedStorage', 'offscreen'],
    host_permissions: [
      '*://*.amctheatres.com/*',
      '*://*.mdblist.com/*'
    ],
    action: {
      default_title: 'Open Matineer'
    }
  }
});

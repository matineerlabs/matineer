export interface AppSettings {
  // Scheduling Defaults (ordered identically to MarathonControls sidebar)
  defaultEarliestStart: string;
  defaultLatestEnd: string;
  defaultTrailerMin: number;
  defaultMinWaitMin: number;
  defaultMaxWaitMin: number;
  preferPremiumFormats: boolean;

  // Browsing & Display Preferences
  showRatings: boolean;
  rankNonAListLast: boolean;
  theme: 'dark' | 'light';

  // Integrations
  mdblistApiKey: string;
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  defaultEarliestStart: '9:30am',
  defaultLatestEnd: '10:30pm',
  defaultTrailerMin: 25,
  defaultMinWaitMin: -20,
  defaultMaxWaitMin: 15,
  preferPremiumFormats: true,
  showRatings: true,
  rankNonAListLast: false,
  theme: 'dark',
  mdblistApiKey: '',
};

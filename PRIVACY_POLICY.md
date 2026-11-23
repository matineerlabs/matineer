# Privacy Policy for Matineer - Movie Marathon Planner

**Last Updated:** November 21, 2026

Matineer ("the Extension") is an open-source browser extension designed to help moviegoers plan multi-movie theatrical schedules. We take your privacy seriously: **Matineer does not collect, store, track, or transmit any personal user data to any developer-operated server.**

---

## 1. Data Stored Locally on Your Device

All user preferences and cached schedule data are stored strictly locally inside your browser using Chrome's native storage APIs (`chrome.storage.local` and `IndexedDB`):
- **Theater & Schedule Preferences:** Your selected AMC theater, favorite theaters, movie watchlist status ("Seen", "Won't Watch", "Must See"), and marathon timing settings.
- **Optional MDBList API Key:** If you choose to enter a personal MDBList API key in Settings to display movie ratings, that key is stored strictly locally on your device in `chrome.storage.local` and is only sent directly from your browser to `https://api.mdblist.com` when fetching movie ratings.
- **Local Showtime & Metadata Cache:** Public movie showtimes and movie ratings are cached locally in your browser's `IndexedDB` so that navigating between dates and tabs is fast and minimizes redundant network requests. You can clear this cache at any time from the Settings modal.

---

## 2. Third-Party Network Requests

Because Matineer operates entirely client-side without a backend server, your browser makes direct HTTPS requests only to the following public endpoints when you use the Extension:

1. **AMC Theatres (`https://www.amctheatres.com`)**
   - **Purpose:** Fetches publicly available movie titles, formats, runtimes, and showtime schedules for the theater and date you select.
   - **Data Sent:** Standard public page requests for the selected theater and date. Matineer does not read, access, or modify your AMC account, login credentials, or payment details.
2. **MDBList API (`https://api.mdblist.com`)** *(Optional)*
   - **Purpose:** Fetches public movie ratings (Rotten Tomatoes, IMDb) and movie synopses if you configure an MDBList API key in Settings.
3. **GitHub Raw Status Configuration (`https://raw.githubusercontent.com/matineerlabs/matineer/status/status.json`)**
   - **Purpose:** Periodically checks a static JSON file hosted on GitHub to verify whether your installed version of the Extension is compatible with AMC's latest website layout or if an extension update is required.

---

## 3. No Analytics, Tracking, or Data Sales

- **No Analytics or Telemetry:** Matineer does not include Google Analytics, crash trackers, fingerprinting scripts, or third-party advertising SDKs.
- **No Browsing History Access:** Matineer only runs when you open the Matineer interface and does not monitor or read your general web browsing activity.
- **No Sale or Transfer of Data:** We do not collect, sell, rent, or transfer any user data to third parties.

---

## 4. Independent Project Disclaimer

Matineer is an independent, open-source fan project and is not affiliated with, endorsed by, or officially connected with AMC Entertainment Holdings, Inc., MDBList, IMDb, or Rotten Tomatoes.

---

## 5. Contact

If you have questions about this Privacy Policy or the Extension's source code, please open an issue on our public GitHub repository:
`https://github.com/matineerlabs/matineer`

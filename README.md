<p align="center">
  <img src="extension/public/icon/128-unbounded.png" alt="Matineer Logo" width="84" />
</p>

<h1 align="center">Matineer — Movie Marathon Planner</h1>

Matineer is an open-source Chrome extension that helps you plan multi-movie theater days around your schedule. Pick a theater and date, set your available hours, trailer time, wait times between movies, and optional meal or coffee breaks, and Matineer automatically builds back-to-back movie schedules that fit.

Matineer currently supports AMC Theatres locations and is designed to pair especially well with AMC A-List subscriptions.

> **Disclaimer:** Matineer is an independent, fan-built open-source project. While it currently supports AMC Theatres showtimes, it is **not affiliated with, endorsed by, or connected to AMC Theatres, any other theater chain, movie studios, film distributors, ticketing platforms, or rating providers**. All movie titles, showtimes, and ratings belong to their respective owners.

---

## Contents

- [Features](#features)
- [Quick Start](#quick-start)
- [User Guide](#user-guide)
- [Setting Up MDBList (Optional Ratings & Metadata)](#setting-up-mdblist-optional-ratings--metadata)
- [Troubleshooting & FAQ](#troubleshooting--faq)
- [Development & Building from Source](#development--building-from-source)
- [Privacy & License](#privacy--license)

---

## Features

- **Automatic Schedule Builder** — Finds valid multi-movie combinations within your start and end times while factoring in trailers and how long you want to wait between movies.
- **Flexible Activity Breaks** — Add meal, coffee, or rest breaks and let Matineer place them automatically between screenings.
- **Must-See, Pinning & Watchlist Controls** — Mark films as Must-See (using any of your selected formats), pin a specific showtime, or hide movies you've already watched.
- **500+ Theater Locations** — Search supported theaters, star your favorites, and switch locations anytime.
- **Optional Movie Ratings** — Connect a free MDBList API key to show Rotten Tomatoes (Critics & Audience) and IMDb scores right on each movie card.
- **Private & Local** — Your showtimes, preferences, watch history, and cached ratings stay right in your browser, with no accounts, ads, or tracking.

---

## Quick Start

1. **Select a Theater & Date**:
   Open Matineer from your browser toolbar, pick a theater (star your favorites for quick access), and choose a date to load showtimes.
2. **Set Your Scheduling Rules**:
   In the left sidebar under Scheduling Rules, choose your Time Window (earliest start and latest end), Trailer Allowance, and Min / Max Wait between movies.
3. **Add Breaks (Optional)**:
   Under Flexible Activity Breaks, add a break (such as a 45-minute dinner) if you want Matineer to automatically leave room between movies.
4. **Pick Your Movies & Choose a Schedule**:
   Use the Movies tab to mark favorites as Must-See, pin a specific showtime, or exclude movies you don't want to see. Then switch to Schedules to compare your options.

---

## User Guide

### Scheduling Rules

- **Time Window (Earliest Start / Latest End):** Keeps your marathon within the hours you want to be at the theater. Late-night showings that run past midnight are supported too.
- **Trailer Allowance:** Accounts for pre-show trailers so your wait time between movies reflects when the feature actually ends and when you need to be in your seat for the next one.
- **Min / Max Wait Between Movies:** Controls how tight or relaxed your schedule feels. Allowing a longer Max Wait or shorter Min Wait will usually give you more schedule choices.

### Flexible Activity Breaks

- Add one or more breaks (such as lunch, dinner, or an intermission) with a duration and an optional time window.
- Matineer places each break into an open gap between movies that fits your rules.

### Movies Tab: Must-See, Pinning & Watchlist Status

- **Must-See vs. Pinning a Showtime:**
  - **Must-See:** Tells Matineer that the movie must appear in every generated schedule, choosing from whichever selected formats (e.g., Standard, IMAX, Dolby) you've enabled for that movie.
  - **Pinning a Showtime:** Locks in one exact showtime for that movie so every generated schedule will be built around that specific screening.
- **Exclude / Watched / Won't Watch:** Keep movies you've already seen or aren't interested in out of your schedules.
- **Formats & Showtime List:** Toggle which formats you're open to seeing and expand any movie to view all of its showtimes for the day.

### Settings & Caching

Click the Settings (gear) icon to:
- Save your default scheduling rules so new sessions start how you like.
- Add or update your MDBList API Key.
- Clear cached data or reset your local watch history.

#### How long is data cached?
To keep things fast and avoid unnecessary repeat requests:
- **Showtimes:** Cached locally for 1 hour.
- **Movie ratings & metadata:** Cached locally for 24 hours.

You can clear either cache anytime in Settings to force a fresh update.

---

<a id="mdblist-setup"></a>
## Setting Up MDBList (Optional Ratings & Metadata)

Matineer works out of the box for showtimes and scheduling. If you also want movie ratings and extra details (like genres and a movie description when you hover over a movie card), you can connect a free [MDBList](https://mdblist.com) account.

### What Is Displayed
Once your MDBList API key is saved, Matineer displays:
- **Rotten Tomatoes Critics Score** (on the movie card)
- **Rotten Tomatoes Audience Score** (on the movie card)
- **IMDb Rating** (on the movie card)
- **Genres & Movie Description** (shown in the pop-up card when you hover over a movie)

Clicking the ratings badge on a movie card opens Rotten Tomatoes search or the IMDb page for that movie.

### How to Get & Add Your API Key

1. Create or sign in to a free account at [mdblist.com](https://mdblist.com).
2. Open your MDBList Preferences page and copy your API Key.
3. In Matineer, click the Settings (gear) icon.
4. Paste your key into the MDBList API Key box and click Save. Matineer checks that your key works before saving and stores fetched ratings locally for 24 hours.

> **Note on Matching:** Matineer matches theater listings to MDBList using title and year clues. Occasionally a movie's score may be missing or matched to the wrong title—most often for re-releases, special events, or alternate titles.

---

## Troubleshooting & FAQ

<details>
<summary><strong>Why did Matineer say no schedules were found?</strong></summary>

A few common reasons:
- Your Time Window is too short for the movies you marked Must-See or pinned.
- Your Min / Max Wait range is too narrow for the available showtimes.
- Two Must-See or pinned movies only play at overlapping times.
- An Activity Break doesn't fit into any gap between the remaining showtimes.

Try widening your Time Window, increasing Max Wait, or unpinning a showtime to see more options.

</details>

<details>
<summary><strong>Why did loading showtimes fail or get blocked?</strong></summary>

Theater websites sometimes show a temporary security check when pages are requested in the background. If loading fails:
1. Open the theater's showtimes page directly in a normal browser tab so the page loads normally.
2. Return to Matineer and try loading the date again.

</details>

<details>
<summary><strong>A movie's rating is missing or shows the wrong film.</strong></summary>

Ratings are matched automatically using movie title and year clues, so special event titles or re-releases can occasionally miss or mismatch. You can clear cached metadata in Settings if you want Matineer to look it up again.

</details>

<details>
<summary><strong>How do I refresh showtimes or ratings right away?</strong></summary>

Open Settings (gear icon) and clear the showtimes cache (normally refreshed every 1 hour) or the metadata cache (normally refreshed every 24 hours).

</details>

---

## Development & Building from Source

### Prerequisites
- [Node.js](https://nodejs.org/) (v20+) and `npm`
- Google Chrome (or a Chromium-based browser) for loading the unpacked extension

### Commands

All extension source and build scripts live in [`extension/`](extension/):

```bash
cd extension
npm install
```

| Command | Description |
| :--- | :--- |
| `npm run dev` | Start WXT in development mode with hot reload |
| `npm run compile` | Run TypeScript typechecking (`tsc --noEmit`) |
| `npm test` | Run the unit test suite (`vitest run`) |
| `npm run build` | Build the production MV3 extension into `extension/.output/chrome-mv3/` |
| `npm run zip` | Package the release archive (`extension/.output/extension-<version>-chrome.zip`) |

### Loading Unpacked in Chrome
1. Run `npm run build` inside `extension/`.
2. Open `chrome://extensions` and enable Developer mode.
3. Click Load unpacked and select `extension/.output/chrome-mv3/`.

---

## Privacy & License

- **Privacy Policy:** See [PRIVACY_POLICY.md](PRIVACY_POLICY.md). Matineer stores all data locally in your browser and only contacts `amctheatres.com` (for theater showtimes) and `mdblist.com` (if you choose to add an MDBList API key).
- **Open Source:** Source code is hosted at [matineerlabs/matineer](https://github.com/matineerlabs/matineer).

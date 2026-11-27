<h1 align="center">
  <img src="extension/public/icon/128-unbounded.png" alt="Matineer Logo" width="60" align="absmiddle" />
  Matineer: Movie Marathon Planner
</h1>

Matineer is an open-source Chrome extension for planning multi-movie theater days around your schedule. Pick a theater and date, set your available hours, trailer time, wait times between movies, and optional meal or coffee breaks, and Matineer builds back-to-back movie schedules that fit.

Matineer currently supports AMC Theatres locations and works especially well with AMC A-List subscriptions.

> Disclaimer: Matineer is an independent, fan-built open-source project. While it currently supports AMC Theatres showtimes, it is not affiliated with, endorsed by, or connected to AMC Theatres, any other theater chain, movie studios, film distributors, ticketing platforms, or rating providers. All movie titles, showtimes, and ratings belong to their respective owners.

## Contents

- [Features](#features)
- [Quick Start](#quick-start)
- [User Guide](#user-guide)
- [Setting Up MDBList (Optional Ratings & Metadata)](#setting-up-mdblist-optional-ratings--metadata)
- [Troubleshooting & FAQ](#troubleshooting--faq)
- [Development & Building from Source](#development--building-from-source)
- [Privacy & License](#privacy--license)

## Features

- Automatically build multi-movie combinations within your start and end times, accounting for trailers and how long you want to wait between movies.
- Add meal, coffee, or rest breaks and let Matineer place them in open gaps between screenings.
- Mark films as Must-See (using any of your selected formats), pin a specific showtime, or hide movies you have already watched.
- Search 500+ supported theater locations, star your favorites, and switch locations anytime.
- Connect a free MDBList API key to show Rotten Tomatoes (Critics and Audience) and IMDb scores on each movie card.
- Keep your showtimes, preferences, watch history, and cached ratings in your browser, with no accounts, ads, or tracking.

## Quick Start

Install the extension from the [Chrome Web Store](https://chromewebstore.google.com/detail/jcbibnficgmeajiianncahokknlmojpg?utm_source=item-share-cb) (or see [Development & Building from Source](#development--building-from-source) if you prefer to build it yourself).

1. Open Matineer from your browser toolbar, pick a theater, and choose a date to load showtimes.
2. Set your Time Window, Trailer Allowance, and Min / Max Wait under Scheduling Rules.
3. Optionally add breaks under Flexible Activity Breaks.
4. Use the Movies tab to mark Must-See films, pin showtimes, or exclude movies, then switch to Schedules to compare options.
5. (Optional, recommended) Add a free MDBList API key in Settings to display Rotten Tomatoes and IMDb ratings, genres, and movie descriptions. See [Setting Up MDBList](#setting-up-mdblist-optional-ratings--metadata).

## User Guide

### Scheduling Rules

- Time Window (Earliest Start / Latest End) keeps your marathon within the hours you want to be at the theater. Late-night showings that run past midnight are supported too.
- Trailer Allowance accounts for pre-show trailers so your wait time between movies reflects when the feature actually ends and when you need to be in your seat for the next one.
- Min / Max Wait Between Movies controls how tight or relaxed your schedule feels. Allowing a longer Max Wait or shorter Min Wait will usually give you more schedule choices.

### Flexible Activity Breaks

- Add Lunch, Dinner, Intermission, or Quick Breather breaks and pick a duration for each.
- Lunch (11:00 AM to 2:30 PM) and Dinner (5:00 PM to 8:30 PM) are placed within mealtime hours, while Intermission and Quick Breather can fit into any open gap between movies.

### Movies Tab: Must-See, Pinning & Watchlist Status

- Must-See tells Matineer that a movie must appear in every generated schedule, choosing from whichever selected formats (such as Standard, IMAX, or Dolby) you enabled for that movie.
- Pinning a Showtime locks in one exact showtime so every generated schedule is built around that specific screening.
- Exclude leaves a movie out of generated schedules for your current plan without hiding it from the list.
- Watched and Won't Watch mark a movie as inactive and move it to the collapsible section at the bottom of the Movies tab, where you can view or restore it anytime.
- Format toggles let you choose which formats (such as Standard, IMAX, or Dolby) you are open to seeing for each movie.
- Expand any movie card to view its full showtime list for the day.

### Settings & Caching

Click the Settings (gear) icon to:
- Save your default scheduling rules so new sessions start how you like.
- Add or update your MDBList API Key.
- Clear cached data or reset your local watch history.

#### How Long Is Data Cached?

Showtimes are cached locally for 1 hour, and movie ratings and metadata are cached locally for 24 hours. You can clear either cache anytime in Settings to force a fresh update.

<a id="mdblist-setup"></a>
## Setting Up MDBList (Optional Ratings & Metadata)

Matineer works out of the box for showtimes and scheduling. If you also want movie ratings and extra details (like genres and a movie description when you hover over a movie card), you can connect a free [MDBList](https://mdblist.com) account.

### What Is Displayed

Once your MDBList API key is saved, Matineer shows Rotten Tomatoes Critics and Audience scores and the IMDb rating on each movie card, plus genres and a movie description in the pop-up card when you hover over a movie. Clicking the ratings badge on a movie card opens Rotten Tomatoes search or the IMDb page for that movie.

### How to Get & Add Your API Key

1. Create or sign in to a free account at [mdblist.com](https://mdblist.com).
2. Open your [MDBList Preferences](https://mdblist.com/preferences/) page, scroll down to the **API Access** dropdown, and copy your API key.
3. In Matineer, open the **Settings** page (click the gear icon).
4. Paste your key into the **MDBList API Key** box and click **Save**. Matineer checks that your key works before saving and stores fetched ratings locally for 24 hours.

> Note on matching: Matineer matches theater listings to MDBList using title and year clues. Occasionally a movie's score may be missing or matched to the wrong title, most often for re-releases, special events, or alternate titles.

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
1. Open the theater's showtimes page in a regular browser tab and wait for it to load.
2. Return to Matineer and try loading the date again.

</details>

<details>
<summary><strong>A movie's rating is missing or shows the wrong film.</strong></summary>

Ratings are matched automatically using movie title and year clues, so special event titles or re-releases can occasionally miss or mismatch. You can clear cached metadata in Settings if you want Matineer to look it up again.

</details>

<details>
<summary><strong>How do I refresh showtimes or ratings right away?</strong></summary>

Open Settings (gear icon) and clear the Showtimes Cache or Ratings Cache. See [How Long Is Data Cached?](#how-long-is-data-cached) for default refresh intervals.

</details>

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

## Privacy & License

Matineer stores all data locally in your browser and only contacts `amctheatres.com` (for theater showtimes) and `mdblist.com` (if you choose to add an MDBList API key). See [PRIVACY_POLICY.md](PRIVACY_POLICY.md) for the full privacy policy.

The source code is hosted at [matineerlabs/matineer](https://github.com/matineerlabs/matineer).

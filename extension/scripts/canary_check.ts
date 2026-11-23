import { describe, it } from 'vitest';
import { Window } from 'happy-dom';
import { AmcHtmlParser } from '../src/shared/utils/parser';
import * as fs from 'fs';
import * as path from 'path';

if (typeof globalThis.DOMParser === 'undefined') {
  const win = new Window();
  globalThis.DOMParser = win.DOMParser as unknown as typeof DOMParser;
}

interface FlagshipTheater {
  name: string;
  url: string;
}

const FLAGSHIP_THEATERS: FlagshipTheater[] = [
  {
    name: 'AMC Empire 25 (NYC)',
    url: 'https://www.amctheatres.com/movie-theatres/new-york-city/amc-empire-25/showtimes',
  },
  {
    name: 'AMC Burbank 16 (LA)',
    url: 'https://www.amctheatres.com/movie-theatres/los-angeles/amc-burbank-16/showtimes',
  },
  {
    name: 'AMC Lincoln Square 13 (NYC)',
    url: 'https://www.amctheatres.com/movie-theatres/new-york-city/amc-lincoln-square-13/showtimes',
  },
];

function getCandidateDates(): string[] {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const twoDaysOut = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return [fmt(tomorrow), fmt(twoDaysOut)];
}

function isWafOrMaintenancePage(status: number, html: string): string | null {
  if (status >= 500) {
    return `HTTP ${status} (AMC Server Error / Maintenance)`;
  }
  if (status === 403 || status === 429) {
    return `HTTP ${status} (WAF / Rate Limit on runner IP)`;
  }
  const lower = html.toLowerCase();
  if (
    html.includes('Incapsula') ||
    html.includes('distil_') ||
    lower.includes('cf-chl') ||
    lower.includes('challenge-platform') ||
    lower.includes('access denied') ||
    lower.includes('pardon our interruption')
  ) {
    return 'WAF / Bot Challenge detected on runner IP';
  }
  return null;
}

describe('Live AMC Scraper Canary', () => {
  it(
    'validates AmcHtmlParser against live flagship theaters with multi-theater consensus',
    async () => {
      const parser = new AmcHtmlParser();
      const dates = getCandidateDates();

      let wafOrMaintenanceCount = 0;
      let realHtmlFailures = 0;
      const diagnostics: string[] = [];
      let lastFailedHtml = '';
      let lastFailedLabel = '';

      for (const theater of FLAGSHIP_THEATERS) {
        for (const dateStr of dates) {
          const targetUrl = `${theater.url}?date=${dateStr}`;
          console.log(`[Canary] Checking ${theater.name} for ${dateStr}: ${targetUrl}`);

          try {
            const res = await fetch(targetUrl, {
              headers: {
                'User-Agent':
                  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                Accept:
                  'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
              },
            });

            const html = await res.text();
            const wafReason = isWafOrMaintenancePage(res.status, html);

            if (wafReason) {
              wafOrMaintenanceCount++;
              const msg = `[Canary] SKIPPED ${theater.name} (${dateStr}): ${wafReason}`;
              console.warn(msg);
              diagnostics.push(msg);
              continue;
            }

            if (!res.ok) {
              wafOrMaintenanceCount++;
              const msg = `[Canary] SKIPPED ${theater.name} (${dateStr}): HTTP ${res.status}`;
              console.warn(msg);
              diagnostics.push(msg);
              continue;
            }

            const movies = parser.parse(html);
            let totalShowings = 0;
            let nonDefaultRuntimes = 0;

            for (const m of movies) {
              if (m.runtime_min && m.runtime_min !== 105) {
                nonDefaultRuntimes++;
              }
              for (const showList of Object.values(m.showings_by_format || {})) {
                totalShowings += showList.length;
              }
            }

            console.log(
              `[Canary] Result for ${theater.name} (${dateStr}): ${movies.length} movies, ${totalShowings} showings, ${nonDefaultRuntimes} parsed runtimes`
            );

            // Consensus pass criteria: at least 3 movies with >= 5 total showtimes
            if (movies.length >= 3 && totalShowings >= 5) {
              console.log(
                `[Canary] PASS: ${theater.name} (${dateStr}) parsed cleanly (${movies.length} movies, ${totalShowings} showtimes).`
              );
              return;
            }

            realHtmlFailures++;
            lastFailedHtml = html;
            lastFailedLabel = `${theater.name} (${dateStr})`;
            diagnostics.push(
              `[Canary] LOW/ZERO PARSE on ${theater.name} (${dateStr}): HTTP 200 (${html.length} bytes), parsed ${movies.length} movies / ${totalShowings} showings.`
            );
          } catch (err: any) {
            wafOrMaintenanceCount++;
            diagnostics.push(
              `[Canary] NETWORK ERROR on ${theater.name} (${dateStr}): ${err?.message || err}`
            );
          }
        }
      }

      // If every single attempt hit a WAF challenge or 5xx server maintenance, do NOT fail the build with a false alarm
      if (realHtmlFailures === 0 && wafOrMaintenanceCount > 0) {
        console.warn(
          '[Canary] All flagship checks encountered WAF challenge or AMC 5xx maintenance. Exiting without false-positive failure.\n' +
            diagnostics.join('\n')
        );
        return;
      }

      // Save HTML snapshot for artifact inspection in GitHub Actions
      if (lastFailedHtml) {
        const snapshotPath = path.resolve(__dirname, '../canary_failed_snapshot.html');
        fs.writeFileSync(snapshotPath, lastFailedHtml, 'utf-8');
        console.error(
          `[Canary] Saved failed HTML snapshot from ${lastFailedLabel} to ${snapshotPath}`
        );
      }

      throw new Error(
        `AMC Scraper Canary failed across all flagship theaters!\n${diagnostics.join('\n')}`
      );
    },
    60000
  );
});

import { MovieResponse, ShowingItemResponse } from '../types/schemas';
import { normalizeMovieKey } from './movie';
import { parseRuntimeStr } from './time';

const TIME_PATTERN = /\b(\d{1,2}:\d{2})\s*([ap]\.?m\.?)?\b/i;

const PROMOTIONAL_PROGRAM_PATTERNS: Array<[RegExp, string]> = [
  [/\bfan\s*faves?\b/i, "Fan Faves"],
  [/\bthrills\s*&\s*chills\b|\bthrills\s+and\s+chills\b/i, "Thrills & Chills"],
  [/\bamc\s*artisan\s*films?\b|\bartisan\s*films?\b/i, "AMC Artisan Films"],
  [/\bwelcome\s+to\s+horrorwood\b/i, "Horrorwood Series"],
  [/\bdine-?in\s*delivery\b/i, "Dine-In Delivery"],
  [/\bprivate\s*theatre\s*rentals?\b/i, "Private Rental"],
  [/\bbig\s*screen\s*classics?\b/i, "Big Screen Classics"],
  [/\bflashback\s*cinema\b/i, "Flashback Cinema"]
];

export class AmcHtmlParser {
  private _detectPromoProgram(text: string): string | null {
    if (!text) return null;
    for (const [pattern, label] of PROMOTIONAL_PROGRAM_PATTERNS) {
      if (pattern.test(text)) return label;
    }
    return null;
  }

  private _detectPhysicalFormat(fmtItem: Element, card?: Element): string {
    const h3 = fmtItem.querySelector('h3');
    const snippets: string[] = [];

    const uls = fmtItem.querySelectorAll('ul[id*="attributes" i]');
    for (const ul of uls) {
      for (const li of ul.querySelectorAll('li')) {
        snippets.push((li.textContent || '').trim());
      }
    }

    const allTags = fmtItem.querySelectorAll('*');
    for (const tag of allTags) {
      if (h3 && h3.contains(tag)) continue;
      const txt = (tag.textContent || '').trim();
      if (txt) snippets.push(txt);
      for (const attr of ['aria-label', 'title', 'alt', 'data-format']) {
        const val = tag.getAttribute(attr);
        if (val) snippets.push(val.trim());
      }
    }

    if (card && snippets.length === 0) {
      const cardTags = card.querySelectorAll('span, div, li, p');
      for (const tag of cardTags) {
        const txt = (tag.textContent || '').trim();
        if (txt) snippets.push(txt);
      }
    }

    const combined = snippets.join(' ').toLowerCase();

    if (combined.includes("dolby")) return "Dolby Cinema at AMC";
    if (combined.includes("imax with laser")) return "IMAX with Laser at AMC";
    if (combined.includes("imax")) return "IMAX at AMC";
    if (combined.includes("prime")) return "Prime at AMC";
    if (combined.includes("4dx")) return "4DX at AMC";
    if (combined.includes("screenx")) return "ScreenX at AMC";
    if (combined.includes("xl at amc") || /\bxl\b/.test(combined)) return "XL at AMC";
    if (combined.includes("reald 3d") || combined.includes("3d")) return "RealD 3D";
    if (combined.includes("laser")) return "Laser at AMC";

    return "Digital";
  }

  private _extractRuntimeText(card: Element): string {
    const tags = card.querySelectorAll('span, li, p');
    for (const tag of tags) {
      if (tag.closest('h1, h2, h3, a')) continue;
      const txt = (tag.textContent || '').trim();
      if (!txt || txt.length > 40 || /after showtime/i.test(txt)) continue;

      const combinedMatch = txt.match(/\b(\d{1,2})\s*(?:HR|hr|h)\b\s*(\d{1,2})\s*(?:MIN|min|m)\b/i);
      if (combinedMatch && combinedMatch[1] && combinedMatch[2]) {
        return `${combinedMatch[1]}h${combinedMatch[2]}m`;
      }

      const hrOnlyMatch = txt.match(/(?:^|[^\d])(\d{1,2})\s*(?:HR|hr|h)\b/i);
      const minOnlyMatch = txt.match(/(?:^|[^\d])(\d{1,2})\s*(?:MIN|min|m)\b/i);
      if (hrOnlyMatch && hrOnlyMatch[1] && minOnlyMatch && minOnlyMatch[1]) {
        return `${hrOnlyMatch[1]}h${minOnlyMatch[1]}m`;
      }
      if (hrOnlyMatch && hrOnlyMatch[1] && !minOnlyMatch) {
        return `${hrOnlyMatch[1]}h0m`;
      }
      if (minOnlyMatch && minOnlyMatch[1] && !hrOnlyMatch) {
        return `0h${minOnlyMatch[1]}m`;
      }
    }

    const textContent = card.textContent || '';
    const hrMatch = textContent.match(/(?:^|[^\d])(\d{1,2})\s*(?:HR|hr|h)\b/i);
    const minMatch = textContent.match(/(?:^|[^\d])(\d{1,2})\s*(?:MIN|min|m)\b/i);

    const hrs = hrMatch && hrMatch[1] ? hrMatch[1] : null;
    const mins = minMatch && minMatch[1] ? minMatch[1] : null;

    if (hrs && mins) return `${hrs}h${mins}m`;
    if (hrs) return `${hrs}h0m`;
    if (mins) return `0h${mins}m`;
    return "1h45m";
  }

  private _extractPosterUrl(card: Element): string | null {
    const img = card.querySelector('img');
    if (img) {
      const src = img.getAttribute('src') || img.getAttribute('data-src');
      if (src && src.startsWith('http')) return src;
    }
    return null;
  }

  private _checkAListEligibility(card: Element): boolean {
    const textContent = card.textContent || '';
    if (/Excluded from A-List/i.test(textContent)) return false;

    const allTags = card.querySelectorAll('*');
    for (const elem of allTags) {
      for (const attr of ['aria-label', 'title', 'alt']) {
        const val = elem.getAttribute(attr);
        if (val && /Excluded from A-List/i.test(val)) return false;
      }
    }
    return true;
  }

  private _extractMpaaRating(card: Element): string | null {
    const tags = card.querySelectorAll('span, div, p, li');
    for (const tag of tags) {
      const txt = (tag.textContent || '').trim();
      if (/^(PG-13|NC-17|PG|G|R|NR)$/i.test(txt)) return txt.toUpperCase();
      const m = txt.match(/\bRated\s+(PG-13|NC-17|PG|G|R|NR)\b/i);
      if (m && m[1]) return m[1].toUpperCase();
    }

    const cardText = card.textContent || '';
    let m = cardText.match(/\b(PG-13|NC-17|PG|G|R|NR)\b\s*[·\|\•]\s*\d+\s*(?:HR|MIN)/i);
    if (m && m[1]) return m[1].toUpperCase();

    m = cardText.match(/\d+\s*(?:HR|MIN)\s*[·\|\•]\s*\b(PG-13|NC-17|PG|G|R|NR)\b/i);
    if (m && m[1]) return m[1].toUpperCase();

    return null;
  }

  private _extractGenre(card: Element): string | null {
    const tags = card.querySelectorAll('span, p, li, div');
    for (const tag of tags) {
      const aria = tag.getAttribute('aria-label') || '';
      if (aria.toLowerCase().includes('genre')) return (tag.textContent || '').trim();
      const txt = (tag.textContent || '').trim();
      if (txt.toLowerCase().startsWith('genre:')) return txt.substring(6).trim();
    }
    return null;
  }

  private _extractSynopsis(card: Element): string | null {
    const pTags = card.querySelectorAll('p');
    for (const tag of pTags) {
      const classes = (tag.getAttribute('class') || '').toLowerCase();
      if (['synopsis', 'desc', 'overview', 'plot'].some(k => classes.includes(k))) {
        const txt = (tag.textContent || '').trim();
        if (txt.length > 20) return txt;
      }
    }
    return null;
  }

  private _extractRtScores(card: Element): [string | null, string | null] {
    let criticScore: string | null = null;
    let audienceScore: string | null = null;

    const cardStr = card.outerHTML || '';

    let mCrit = cardStr.match(/(\d{1,3})%\s*(?:Tomatometer|Critic)/i);
    if (!mCrit) mCrit = cardStr.match(/(?:Tomatometer|tomatometer-score)["'\s:=]+(\d{1,3})/i);
    if (mCrit && mCrit[1]) criticScore = `${mCrit[1]}%`;

    let mAud = cardStr.match(/(\d{1,3})%\s*(?:Popcornmeter|Audience)/i);
    if (!mAud) mAud = cardStr.match(/(?:Popcornmeter|audience-score|popcornmeter-score)["'\s:=]+(\d{1,3})/i);
    if (mAud && mAud[1]) audienceScore = `${mAud[1]}%`;

    return [criticScore, audienceScore];
  }

  private _extractFormatShowtimes(card: Element): Record<string, ShowingItemResponse[]> {
    const theatersShowtimes: Record<string, ShowingItemResponse[]> = {};
    let formatItems = Array.from(card.querySelectorAll('li[role="listitem"]'));
    if (formatItems.length === 0) formatItems = [card];

    for (const fmtItem of formatItems) {
      const timeLinks = Array.from(fmtItem.querySelectorAll('a[href*="/showtimes/"]'));
      const timeNodes = Array.from(fmtItem.querySelectorAll('time'));
      const buttons = Array.from(fmtItem.querySelectorAll('button'));

      const soldOutButtons = buttons.filter(btn => {
        if (!btn.querySelector('time')) return false;

        const isDisabled = btn.hasAttribute('disabled');
        const textContent = (btn.textContent || '').toLowerCase();
        const hasSoldOutText = textContent.includes('sold out');

        const hasSrOnly = !!btn.querySelector('.sr-only');
        const hasOpacity40 = !!btn.querySelector('.opacity-40');
        const hasSoldOutSpan = Array.from(btn.querySelectorAll('span')).some(s => (s.textContent || '').toLowerCase().includes('sold out'));

        const detailsContainer = btn.nextElementSibling;
        const detailsHasSoldOut = detailsContainer && (detailsContainer.textContent || '').toLowerCase().includes('sold out');

        return isDisabled || hasSoldOutText || hasSrOnly || hasOpacity40 || hasSoldOutSpan || detailsHasSoldOut;
      });

      if (timeLinks.length === 0 && timeNodes.length === 0 && soldOutButtons.length === 0) continue;

      let fmtName: string | null = null;
      const ariaLabel = fmtItem.getAttribute('aria-label') || '';
      if (ariaLabel && ariaLabel.includes('Showtimes')) {
        const cleaned = ariaLabel.replace('Showtimes', '').trim();
        if (!['undefined', 'null', 'none', ''].includes(cleaned.toLowerCase())) {
          fmtName = cleaned;
        }
      }

      if (!fmtName) {
        const h3 = fmtItem.querySelector('h3');
        if (h3) {
          for (const span of h3.querySelectorAll('span')) {
            const classes = span.getAttribute('class') || '';
            if (classes.includes('sr-only') || classes.includes('font-thin')) continue;
            const text = (span.textContent || '').trim();
            if (text && !TIME_PATTERN.test(text) && !['undefined', 'null', 'none', ''].includes(text.toLowerCase())) {
              const part = text.split(':')[0];
              if (part) {
                fmtName = part.trim();
                break;
              }
            }
          }
          if (!fmtName) {
            const text = (h3.textContent || '').trim();
            if (text && !TIME_PATTERN.test(text) && !['undefined', 'null', 'none', ''].includes(text.toLowerCase())) {
              const part = text.split(':')[0];
              if (part) {
                fmtName = part.trim();
              }
            }
          }
        }
      }

      if (!fmtName || ['undefined', 'null', 'none', ''].includes(fmtName.toLowerCase())) {
        fmtName = "Digital";
      }

      const programLabel = this._detectPromoProgram(fmtName);
      if (programLabel) {
        fmtName = this._detectPhysicalFormat(fmtItem, card);
      }

      const showingsByTime: Record<string, ShowingItemResponse> = {};

      for (const btn of soldOutButtons) {
        const text = (btn.textContent || '').trim();
        const timeNode = btn.querySelector('time');
        const timeText = timeNode ? (timeNode.textContent || '').trim() : text;
        const match = timeText.match(TIME_PATTERN) || text.match(TIME_PATTERN);

        if (match && match[1]) {
          const timeDigits = match[1];
          let period = match[2] || '';
          if (!period) {
            const aria = btn.getAttribute('aria-label') || '';
            const pMatch = aria.match(/([ap]\.?m\.?)/i);
            if (pMatch && pMatch[1]) period = pMatch[1];
          }
          const formattedTime = `${timeDigits}${period.replace(/\./g, '').toLowerCase()}`;
          if (!showingsByTime[formattedTime]) {
            const shData: ShowingItemResponse = {
              time: formattedTime,
              url: undefined,
              booking_urls: [],
              is_sold_out: true
            };
            if (programLabel) shData.program_label = programLabel;
            showingsByTime[formattedTime] = shData;
          }
        }
      }

      if (timeLinks.length > 0) {
        for (const aTag of timeLinks) {
          const href = aTag.getAttribute('href') || '';
          const fullUrl = href.startsWith('/') ? `https://www.amctheatres.com${href}` : href;
          const text = (aTag.textContent || '').trim();
          const match = text.match(TIME_PATTERN);
          if (match && match[1]) {
            const timeDigits = match[1];
            let period = match[2] || '';
            if (!period) {
              const aria = aTag.getAttribute('aria-label') || '';
              const pMatch = aria.match(/([ap]\.?m\.?)/i);
              if (pMatch && pMatch[1]) period = pMatch[1];
            }
            const formattedTime = `${timeDigits}${period.replace(/\./g, '').toLowerCase()}`;
            const existing = showingsByTime[formattedTime];
            if (!existing) {
              const shData: ShowingItemResponse = {
                time: formattedTime,
                url: fullUrl || undefined,
                booking_urls: fullUrl ? [fullUrl] : []
              };
              if (programLabel) shData.program_label = programLabel;
              showingsByTime[formattedTime] = shData;
            } else {
              const currentUrls = existing.booking_urls || [];
              if (fullUrl && !currentUrls.includes(fullUrl)) {
                currentUrls.push(fullUrl);
                currentUrls.sort();
                existing.booking_urls = currentUrls;
                existing.url = currentUrls[0];
              }
            }
          }
        }
      } else {
        for (const tNode of timeNodes) {
          const text = (tNode.textContent || '').trim();
          const match = text.match(TIME_PATTERN);
          if (match && match[1]) {
            const timeDigits = match[1];
            let period = match[2] || '';
            if (!period) {
              const parentAria = tNode.parentElement ? tNode.parentElement.getAttribute('aria-label') : '';
              const aria = tNode.getAttribute('aria-label') || parentAria || '';
              const pMatch = aria.match(/([ap]\.?m\.?)/i);
              if (pMatch && pMatch[1]) period = pMatch[1];
            }
            const formattedTime = `${timeDigits}${period.replace(/\./g, '').toLowerCase()}`;
            if (!showingsByTime[formattedTime]) {
              const shData: ShowingItemResponse = {
                time: formattedTime,
                url: undefined,
                booking_urls: []
              };
              if (programLabel) shData.program_label = programLabel;
              showingsByTime[formattedTime] = shData;
            }
          }
        }
      }

      const showingsForFmt = Object.values(showingsByTime);
      if (showingsForFmt.length > 0) {
        if (!theatersShowtimes[fmtName]) theatersShowtimes[fmtName] = [];
        theatersShowtimes[fmtName]!.push(...showingsForFmt);
      }
    }

    return theatersShowtimes;
  }

  /**
   * Fallback for unrendered HTML.
   * Copies React's block-into-placeholder move by hand if Chrome Tab rendering fails.
   */
  private _resolveStreamedSegments(doc: Document): void {
    const hiddenBlocks = Array.from(doc.querySelectorAll('div[hidden][id^="S:"]'));
    for (const block of hiddenBlocks) {
      const blockId = block.id.replace('S:', '');
      const placeholder = doc.querySelector(`template[id="P:${blockId}"], template[id="B:${blockId}"]`);
      if (placeholder && placeholder.parentNode) {
        // Move children
        while (block.firstChild) {
          placeholder.parentNode.insertBefore(block.firstChild, placeholder);
        }
      }
    }
  }

  parse(html: string): MovieResponse[] {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    this._resolveStreamedSegments(doc);

    const movieLinks = Array.from(doc.querySelectorAll('a[href*="/movies/"]'));
    if (movieLinks.length === 0) {
      const allLinks = Array.from(doc.querySelectorAll('a'));
      for (const link of allLinks) {
        const href = link.getAttribute('href') || '';
        if (href.includes('/movies/')) {
          movieLinks.push(link);
        }
      }
    }
    const seenTitles = new Set<string>();
    const movies: MovieResponse[] = [];

    for (const link of movieLinks) {
      const title = (link.textContent || '').trim();
      if (!title || seenTitles.has(title) || ['movies', 'all movies', 'see all', 'private theatre rental'].includes(title.toLowerCase())) {
        continue;
      }

      let card = link.closest('div[class*="ShowtimesByTheatre-film"], div[class*="ShowtimesByTheatre-film" i], div[class*="Film" i], section, div.movie');
      if (!card) {
        let curr: Element | null = link;
        while (curr && curr.tagName.toLowerCase() !== 'body') {
          const parent: HTMLElement | null = curr.parentElement;
          if (!parent) break;
          const subLinks = Array.from(parent.querySelectorAll('a[href*="/movies/"]'));
          const distinct = new Set(subLinks.map(l => (l.textContent || '').trim()).filter(t => t));
          if (distinct.size > 1) {
            card = curr as HTMLElement;
            break;
          }
          curr = parent;
        }
      }

      if (!card) card = link as HTMLElement;

      seenTitles.add(title);
      const runtimeStr = this._extractRuntimeText(card);
      let runtimeMin = 105;
      try {
        runtimeMin = parseRuntimeStr(runtimeStr);
      } catch (e) {
        // ignore error
      }

      const posterUrl = this._extractPosterUrl(card);
      const isAList = this._checkAListEligibility(card);
      const theatersShowtimes = this._extractFormatShowtimes(card);
      const rated = this._extractMpaaRating(card);
      const genre = this._extractGenre(card);
      const plot = this._extractSynopsis(card);
      const [rtScore, audienceScore] = this._extractRtScores(card);

      if (Object.keys(theatersShowtimes).length > 0) {
        const normKey = normalizeMovieKey(title);
        let existingMovie = movies.find(m => normalizeMovieKey(m.title) === normKey);

        if (existingMovie) {
          if (!existingMovie.showings_by_format) existingMovie.showings_by_format = {};

          for (const [fmt, showList] of Object.entries(theatersShowtimes)) {
            if (existingMovie.showings_by_format[fmt]) {
              const existingList = existingMovie.showings_by_format[fmt];
              const byT: Record<string, ShowingItemResponse> = {};
              for (const s of existingList) {
                if (s.time) byT[s.time] = s;
              }
              for (const s of showList) {
                if (s.time) {
                  const t = s.time;
                  if (byT[t]) {
                    const uSet = new Set(byT[t].booking_urls || []);
                    if (byT[t].url) uSet.add(byT[t].url!);
                    for (const u of s.booking_urls || []) {
                      if (u) uSet.add(u);
                    }
                    if (s.url) uSet.add(s.url);
                    byT[t].booking_urls = Array.from(uSet).sort();
                    if (byT[t].booking_urls && byT[t].booking_urls!.length > 0) {
                      byT[t].url = byT[t].booking_urls![0];
                    }
                    if (!byT[t].program_label && s.program_label) {
                      byT[t].program_label = s.program_label;
                    }
                    if (s.is_sold_out) {
                      byT[t].is_sold_out = true;
                    }
                  } else {
                    byT[t] = s;
                    existingList.push(s);
                  }
                } else {
                  existingList.push(s);
                }
              }
            } else {
              existingMovie.showings_by_format[fmt] = showList;
            }
          }

          if (!existingMovie.poster_url && posterUrl) existingMovie.poster_url = posterUrl;
          if (!existingMovie.rated && rated) existingMovie.rated = rated;
          if (!existingMovie.genre && genre) existingMovie.genre = genre;
          if (!existingMovie.plot && plot) existingMovie.plot = plot;
          if (!existingMovie.rt_score && rtScore) existingMovie.rt_score = rtScore;
          if (!existingMovie.audience_score && audienceScore) existingMovie.audience_score = audienceScore;
        } else {
          movies.push({
            title,
            runtime_min: runtimeMin,
            runtime_str: runtimeStr,
            showings_by_format: theatersShowtimes,
            poster_url: posterUrl || undefined,
            is_a_list_eligible: isAList,
            rated: rated || undefined,
            genre: genre || undefined,
            plot: plot || undefined,
            rt_score: rtScore || undefined,
            audience_score: audienceScore || undefined
          });
        }
      }
    }

    return movies;
  }
}

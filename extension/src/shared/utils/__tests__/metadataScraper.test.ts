import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  parseAmcTitle,
  scoreMdblistCandidate,
  fetchMetadataSingle,
  cleanTitleVariants,
} from '../metadataScraper';

describe('parseAmcTitle', () => {
  const CURRENT_YEAR = 2026;

  it('correctly parses standard releases and strips screening format tags', () => {
    const res1 = parseAmcTitle('Wicked (Early Access Screening)', CURRENT_YEAR);
    expect(res1.primaryQuery).toBe('Wicked');
    expect(res1.isReRelease).toBe(false);
    expect(res1.isNonMovieEvent).toBe(false);

    const res2 = parseAmcTitle('Alien: Romulus (IMAX Live)', CURRENT_YEAR);
    expect(res2.primaryQuery).toBe('Alien: Romulus');

    const res3 = parseAmcTitle('Dune: Part Two: An IMAX Experience', CURRENT_YEAR);
    expect(res3.primaryQuery).toBe('Dune: Part Two');

    const res4 = parseAmcTitle('Smile 2 (Fan Event)', CURRENT_YEAR);
    expect(res4.primaryQuery).toBe('Smile 2');

    const res5 = parseAmcTitle('Moana 2 (Spanish)', CURRENT_YEAR);
    expect(res5.primaryQuery).toBe('Moana 2');

    const res6 = parseAmcTitle('Deadpool & Wolverine (Open Caption)', CURRENT_YEAR);
    expect(res6.primaryQuery).toBe('Deadpool & Wolverine');
  });

  it('extracts anniversary years and marks as re-release', () => {
    const res1 = parseAmcTitle('Interstellar (10th Anniversary)', 2026);
    expect(res1.primaryQuery).toBe('Interstellar');
    expect(res1.inferredYear).toBe(2016);
    expect(res1.isReRelease).toBe(true);
    expect(res1.isNonMovieEvent).toBe(false);

    const res2 = parseAmcTitle('The Matrix 25th Anniversary', 2026);
    expect(res2.primaryQuery).toBe('The Matrix');
    expect(res2.inferredYear).toBe(2001);
    expect(res2.isReRelease).toBe(true);
  });

  it('extracts explicit release years in parens/brackets', () => {
    const res = parseAmcTitle('Rear Window (1954)', 2026);
    expect(res.primaryQuery).toBe('Rear Window');
    expect(res.inferredYear).toBe(1954);
    expect(res.isReRelease).toBe(true);
  });

  it('detects re-releases from presenter prefixes and keywords', () => {
    const res1 = parseAmcTitle('Studio Ghibli Fest: Princess Mononoke', 2026);
    expect(res1.primaryQuery).toBe('Princess Mononoke');
    expect(res1.isReRelease).toBe(true);

    const res2 = parseAmcTitle('Coraline (Re-Release)', 2026);
    expect(res2.primaryQuery).toBe('Coraline');
    expect(res2.isReRelease).toBe(true);

    const res3 = parseAmcTitle('Spirited Away 25th Anniversary - Studio Ghibli Fest 2026', 2026);
    expect(res3.primaryQuery).toBe('Spirited Away');
    expect(res3.inferredYear).toBe(2001);
    expect(res3.isReRelease).toBe(true);
  });

  it('detects pre-flight non-movie events', () => {
    expect(parseAmcTitle('AMC Screen Unseen', 2026).isNonMovieEvent).toBe(true);
    expect(parseAmcTitle('Scream Unseen: Mystery Movie', 2026).isNonMovieEvent).toBe(true);
    expect(parseAmcTitle('Secret Movie Screening', 2026).isNonMovieEvent).toBe(true);
    expect(parseAmcTitle('UFC 310: Jones vs Miocic', 2026).isNonMovieEvent).toBe(true);
    expect(parseAmcTitle('WWE Bad Blood', 2026).isNonMovieEvent).toBe(true);
    expect(parseAmcTitle('The Met: Live in HD: Tosca', 2026).isNonMovieEvent).toBe(true);
    expect(parseAmcTitle('2026 Oscar Nominated Short Films: Live Action', 2026).isNonMovieEvent).toBe(true);
    expect(parseAmcTitle('Lord of the Rings Trilogy Marathon', 2026).isNonMovieEvent).toBe(true);
    expect(parseAmcTitle('Private Theatre Rental', 2026).isNonMovieEvent).toBe(true);
  });

  it('generates fallbackQuery for colon or dash subtitle titles', () => {
    const res = parseAmcTitle('Mission: Impossible - The Final Reckoning', 2026);
    expect(res.primaryQuery).toBe('Mission: Impossible - The Final Reckoning');
    expect(res.fallbackQuery).toBe('Mission: Impossible');

    const res2 = parseAmcTitle('Star Wars - Episode IV: A New Hope', 2026);
    expect(res2.fallbackQuery).toBe('Star Wars');

    const res3 = parseAmcTitle('Dune: Part Two', 2026);
    expect(res3.primaryQuery).toBe('Dune: Part Two');
    expect(res3.fallbackQuery).toBe('Dune');
  });

  it('generates fallbackQuery for leading possessive prefixes', () => {
    const res1 = parseAmcTitle("Disney's Hexed", 2026);
    expect(res1.primaryQuery).toBe("Disney's Hexed");
    expect(res1.fallbackQuery).toBe('Hexed');

    const res2 = parseAmcTitle("DreamWorks' The Wild Robot", 2026);
    expect(res2.primaryQuery).toBe("DreamWorks' The Wild Robot");
    expect(res2.fallbackQuery).toBe('The Wild Robot');

    const res3 = parseAmcTitle("Disney's It", 2026);
    expect(res3.fallbackQuery).toBeNull();
  });

  it('cleanTitleVariants wraps parseAmcTitle', () => {
    const variants = cleanTitleVariants('Mission: Impossible - The Final Reckoning');
    expect(variants[0]).toBe('Mission: Impossible - The Final Reckoning');
    expect(variants[1]).toBe('Mission: Impossible');
  });
});

describe('scoreMdblistCandidate', () => {
  const showingYear = 2026;

  it('scores exact title matches and current release year highly', () => {
    const cand = {
      title: 'Gladiator II',
      year: 2026,
      imdbid: 'tt2104990',
      score: 75,
    };
    const parsed = parseAmcTitle('Gladiator II', showingYear);
    const score = scoreMdblistCandidate(cand, 'Gladiator II', parsed, showingYear);

    // Title exact match: 30, Year match: 20, Bonus: 5 => 55
    expect(score).toBe(55);
    expect(score).toBeGreaterThanOrEqual(25);
  });

  it('scores article stripped matches', () => {
    const cand = {
      title: 'The Wild Robot',
      year: 2026,
      imdbid: 'tt29623480',
      score: 85,
    };
    const parsed = parseAmcTitle('Wild Robot', showingYear);
    const score = scoreMdblistCandidate(cand, 'Wild Robot', parsed, showingYear);

    // Article stripped: 28, Year match: 20, Bonus: 5 => 53
    expect(score).toBe(53);
    expect(score).toBeGreaterThanOrEqual(25);
  });

  it('correctly matches classic anniversary release over modern remake', () => {
    const parsed = parseAmcTitle('Rear Window (1954)', showingYear);

    const classicCand = {
      title: 'Rear Window',
      year: 1954,
      imdbid: 'tt0047396',
      score: 88,
    };
    const remakeCand = {
      title: 'Rear Window',
      year: 1998,
      imdbid: 'tt0160752',
      score: 55,
    };

    const classicScore = scoreMdblistCandidate(classicCand, 'Rear Window', parsed, showingYear);
    const remakeScore = scoreMdblistCandidate(remakeCand, 'Rear Window', parsed, showingYear);

    // Classic: 30 (title) + 25 (inferredYear match) + 5 (bonus) = 60
    expect(classicScore).toBe(60);
    // Remake: 30 (title) - 20 (year diff > 2) + 5 (bonus) = 15 (< 25 threshold)
    expect(remakeScore).toBe(15);
    expect(remakeScore).toBeLessThan(25);
  });

  it('does not penalize older movies when isReRelease is true', () => {
    const parsed = parseAmcTitle('Coraline (Re-Release)', showingYear);
    expect(parsed.isReRelease).toBe(true);

    const cand = {
      title: 'Coraline',
      year: 2009,
      imdbid: 'tt0327597',
      score: 80,
    };
    const score = scoreMdblistCandidate(cand, 'Coraline', parsed, showingYear);

    // Title: 30 + ReRelease older year bonus: 10 + Entry bonus: 5 => 45
    expect(score).toBe(45);
    expect(score).toBeGreaterThanOrEqual(25);
  });

  it('keeps exact title matches above threshold even if release year is slightly older (e.g. indie/festival run)', () => {
    const parsed = parseAmcTitle('Your Mother Your Mother Your Mother', showingYear);
    const cand = {
      title: 'Your Mother, Your Mother, Your Mother',
      year: 2023,
      imdbid: 'tt12345678',
      score: 70,
    };
    const score = scoreMdblistCandidate(cand, 'Your Mother Your Mother Your Mother', parsed, showingYear);

    // Exact title: 30, soft older penalty: -5, bonus: 5 => 30 >= 25 threshold
    expect(score).toBe(30);
    expect(score).toBeGreaterThanOrEqual(25);
  });

  it('rejects short-word false positives', () => {
    const parsed = parseAmcTitle('Heretic', showingYear);
    const cand = {
      title: 'Her',
      year: 2026,
      imdbid: 'tt1798709',
      score: 80,
    };

    const score = scoreMdblistCandidate(cand, 'Heretic', parsed, showingYear);
    expect(score).toBe(-999);
  });
});

describe('fetchMetadataSingle', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns default empty result without calling fetch if no API key is provided', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const result = await fetchMetadataSingle('Gladiator II', 148, 2026, null);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.title).toBe('Gladiator II');
    expect(result.rt_score).toBeNull();
    expect(result.rt_fetch_attempted).toBe(false);
  });

  it('skips external API call for non-movie events', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const result = await fetchMetadataSingle('AMC Screen Unseen', 120, 2026, 'test_key');

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.rt_fetch_attempted).toBe(true);
    expect(result.rt_score).toBeNull();
  });

  it('fetches search and detail from MDBList and extracts ratings and metadata', async () => {
    const mockSearchResponse = {
      search: [
        {
          id: 101,
          title: 'Gladiator II',
          year: 2026,
          imdbid: 'tt2104990',
          score: 80,
        },
      ],
    };

    const mockDetailResponse = {
      id: 101,
      title: 'Gladiator II',
      year: 2026,
      runtime: 148,
      certification: 'R',
      genres: [{ name: 'Action' }, { name: 'Drama' }],
      description: 'An epic tale of Rome.',
      ratings: [
        { source: 'tomatoes', value: 85 },
        { source: 'popcorn', value: 92 },
        { source: 'imdb', value: 7.8 },
      ],
      ids: { imdb: 'tt2104990' },
      poster: 'https://images.mdblist.com/poster/101.jpg',
    };

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any) => {
      const urlStr = String(url);
      if (urlStr.includes('/search/movie')) {
        return {
          ok: true,
          json: async () => mockSearchResponse,
        } as any;
      }
      if (urlStr.includes('/imdb/movie/tt2104990')) {
        return {
          ok: true,
          json: async () => mockDetailResponse,
        } as any;
      }
      return { ok: false } as any;
    });

    const result = await fetchMetadataSingle('Gladiator II', 148, 2026, 'test_key');

    expect(result.title).toBe('Gladiator II');
    expect(result.matched_title).toBe('Gladiator II');
    expect(result.rt_score).toBe('85%');
    expect(result.audience_score).toBe('92%');
    expect(result.imdb_rating).toBe('7.8');
    expect(result.imdb_id).toBe('tt2104990');
    expect(result.rated).toBe('R');
    expect(result.genre).toBe('Action, Drama');
    expect(result.plot).toBe('An epic tale of Rome.');
    expect(result.poster_url).toBe('https://images.mdblist.com/poster/101.jpg');
    expect(result.rt_fetch_attempted).toBe(true);
    expect(result.imdb_fetch_attempted).toBe(true);
  });

  it('rejects candidate when runtime differs significantly on non-exact title match (Runtime Sanity Guard)', async () => {
    const mockSearchResponse = {
      search: [
        {
          id: 202,
          title: 'Gladiator II Behind the Scenes Short',
          year: 2026,
          imdbid: 'tt9999999',
          score: 70,
        },
      ],
    };

    const mockDetailResponse = {
      id: 202,
      title: 'Gladiator II Behind the Scenes Short',
      year: 2026,
      runtime: 15, // 15 mins vs 148 mins (> 35 mins diff!)
      ratings: [{ source: 'imdb', value: 6.0 }],
    };

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any) => {
      const urlStr = String(url);
      if (urlStr.includes('/search/movie')) {
        return {
          ok: true,
          json: async () => mockSearchResponse,
        } as any;
      }
      if (urlStr.includes('/imdb/movie/tt9999999')) {
        return {
          ok: true,
          json: async () => mockDetailResponse,
        } as any;
      }
      return { ok: false } as any;
    });

    const result = await fetchMetadataSingle('Gladiator II', 148, 2026, 'test_key');

    // Should reject the detail match because of runtime mismatch on non-exact title
    expect(result.matched_title).toBeNull();
    expect(result.imdb_rating).toBeNull();
  });

  it("falls back to stripped title when leading possessive primary search misses (e.g. Disney's Hexed)", async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any) => {
      const urlStr = String(url);
      if (urlStr.includes('/search/movie?query=Disney%27s%20Hexed')) {
        return {
          ok: true,
          json: async () => ({ search: [] }),
        } as any;
      }
      if (urlStr.includes('/search/movie?query=Hexed')) {
        return {
          ok: true,
          json: async () => ({
            search: [
              {
                id: 42001,
                title: 'Hexed',
                year: 2026,
                imdbid: 'tt3000001',
                score: 72,
              },
            ],
          }),
        } as any;
      }
      if (urlStr.includes('/imdb/movie/tt3000001')) {
        return {
          ok: true,
          json: async () => ({
            id: 42001,
            title: 'Hexed',
            year: 2026,
            runtime: 95,
            ratings: [
              { source: 'tomatoes', value: 81 },
              { source: 'imdb', value: 7.1 },
            ],
            ids: { imdb: 'tt3000001' },
          }),
        } as any;
      }
      return { ok: false } as any;
    });

    const result = await fetchMetadataSingle("Disney's Hexed", 95, 2026, 'test_key');

    expect(result.matched_title).toBe('Hexed');
    expect(result.rt_score).toBe('81%');
    expect(result.imdb_rating).toBe('7.1');
    expect(fetchSpy).toHaveBeenCalledTimes(3);
  });
});

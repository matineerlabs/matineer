import { describe, it, expect } from 'vitest';
import { AmcHtmlParser } from '../parser';
import * as fs from 'fs';
import * as path from 'path';

describe('AmcHtmlParser', () => {
  it('parses hidden blocks when DOM string includes them directly (fallback test)', () => {

    const testHtml = `
      <html><body>
        <div hidden id="S:1">
          <li role="listitem" aria-label="Laser at AMC Showtimes">
            <h3><span>Laser at AMC</span></h3>
            <a href="/showtimes/1005" aria-label="1:30 PM">1:30pm</a>
          </li>
        </div>
        <section>
          <h2><a href="/movies/hidden-movie">Hidden Movie</a></h2>
          <span>2 HR</span>
          <ul>
            <template id="P:1"></template>
          </ul>
        </section>
      </body></html>
    `;

    const parser = new AmcHtmlParser();
    const movies = parser.parse(testHtml);
    expect(movies.length).toBe(1);
    expect(movies[0]!.title).toBe('Hidden Movie');
    expect(movies[0]!.showings_by_format?.['Laser at AMC']?.length).toBe(1);
    expect(movies[0]!.showings_by_format?.['Laser at AMC']?.[0]?.time).toBe('1:30pm');
  });

  it('parses showtimes sample', () => {
    const html = fs.readFileSync(path.join(__dirname, 'fixtures/amc_showtimes_sample.html'), 'utf-8');
    const parser = new AmcHtmlParser();
    const movies = parser.parse(html);

    expect(movies.length).toBe(2);

    const alpha = movies.find(m => m.title === 'Alpha Quest');
    expect(alpha).toBeDefined();
    expect(alpha?.runtime_min).toBe(103);
    expect(alpha?.showings_by_format?.['Dolby Cinema at AMC']?.length).toBe(2);
    expect(alpha?.showings_by_format?.['Laser at AMC']?.length).toBe(1);

    const beta = movies.find(m => m.title === 'Beta Night');
    expect(beta).toBeDefined();
    expect(beta?.runtime_min).toBe(120);
    expect(beta?.is_a_list_eligible).toBe(false);

    expect(alpha?.showings_by_format?.['IMAX at AMC']?.length).toBe(1);
  });

  it('correctly parses runtime when movie title ends with numbers or release years', () => {
    const testHtml = `
      <html><body>
        <section id="the-victoria-s-secret-fashion-show-2026-85041">
          <header>
            <div>
              <h1><a href="/movies/the-victoria-s-secret-fashion-show-2026-85041">The Victoria's Secret Fashion Show 2026</a></h1>
              <ul id="the-victoria-s-secret-fashion-show-2026-85041-details">
                <li><span class="uppercase">1 HR 40 MIN</span></li>
              </ul>
            </div>
          </header>
          <li role="listitem" aria-label="XL at AMC Showtimes">
            <h3><span>XL at AMC</span></h3>
            <a href="/showtimes/101" aria-label="7:00 PM">7:00pm</a>
          </li>
        </section>
        <section id="spirited-away-25th-anniversary-studio-ghibli-fest-2026-83591">
          <header>
            <div>
              <h1><a href="/movies/spirited-away-25th-anniversary-studio-ghibli-fest-2026-83591">Spirited Away 25th Anniversary - Studio Ghibli Fest 2026</a></h1>
              <ul id="spirited-away-25th-anniversary-studio-ghibli-fest-2026-83591-details">
                <li><span class="uppercase">2 HR 12 MIN</span></li>
              </ul>
            </div>
          </header>
          <li role="listitem" aria-label="Digital Showtimes">
            <h3><span>Digital</span></h3>
            <a href="/showtimes/102" aria-label="8:00 PM">8:00pm</a>
          </li>
        </section>
      </body></html>
    `;

    const parser = new AmcHtmlParser();
    const movies = parser.parse(testHtml);

    const vs = movies.find(m => m.title.includes("Victoria's Secret"));
    expect(vs).toBeDefined();
    expect(vs?.runtime_str).toBe('1h40m');
    expect(vs?.runtime_min).toBe(100);

    const sa = movies.find(m => m.title.includes("Spirited Away"));
    expect(sa).toBeDefined();
    expect(sa?.runtime_str).toBe('2h12m');
    expect(sa?.runtime_min).toBe(132);
  });
});

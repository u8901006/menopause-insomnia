import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const PUBMED_SEARCH = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi';
const PUBMED_FETCH = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi';
const USER_AGENT = 'MenopauseInsomniaBot/1.0 (research aggregator)';
const NCBI_TOOL = 'menopauseinsomnia';
const NCBI_EMAIL = 'github-actions[bot]@users.noreply.github.com';

const JOURNALS = [
  'Menopause',
  'Climacteric',
  'Maturitas',
  'Sleep',
  'Sleep Med',
  'J Clin Sleep Med',
  'Behav Sleep Med',
  'Sleep Med Rev',
  'J Sleep Res',
  'Sleep Health',
  'Arch Womens Ment Health',
  'J Affect Disord',
  'Psychoneuroendocrinology',
  'J Psychosom Res',
  'Nutrients',
  'BMC Womens Health',
  'J Womens Health (Larchmt)',
  'Am J Obstet Gynecol',
  'Fertil Steril',
  'Neurobiol Aging',
  'Biol Psychiatry',
  'J Clin Endocrinol Metab',
  'Psychosom Med',
  'Int J Environ Res Public Health',
  'J Clin Med',
  'Nat Sci Sleep',
  'Chronobiol Int',
  'Front Endocrinol (Lausanne)',
  'BMC Psychiatry',
  'Complement Ther Med',
  'Phytother Res',
  'Sports Med',
  'Menopause',
  'Sleep Biol Rhythms',
  'Brain Sci',
  'Psychol Med',
  'Health Psychol',
  'J Nutr Health Aging',
  'Obesity (Silver Spring)',
  'Menopause',
];

const MENOPAUSE_BLOCK = '(menopause[tiab] OR menopausal[tiab] OR perimenopause[tiab] OR perimenopausal[tiab] OR postmenopausal[tiab])';
const SLEEP_BLOCK = '(insomnia[tiab] OR sleep[tiab] OR "sleep quality"[tiab] OR "sleep disturbance"[tiab])';

const SEARCH_QUERIES = [
  { name: 'core', query: `${MENOPAUSE_BLOCK} AND (insomnia[tiab] OR "sleep quality"[tiab] OR "sleep disturbance"[tiab])` },
  { name: 'vasomotor', query: `${MENOPAUSE_BLOCK} AND ${SLEEP_BLOCK} AND ("hot flashes"[tiab] OR "night sweats"[tiab] OR "vasomotor"[tiab])` },
  { name: 'mood', query: `${MENOPAUSE_BLOCK} AND ${SLEEP_BLOCK} AND (depression[tiab] OR anxiety[tiab] OR stress[tiab])` },
  { name: 'treatment', query: `${MENOPAUSE_BLOCK} AND ${SLEEP_BLOCK} AND (CBT-I[tiab] OR "cognitive behavioral"[tiab] OR "hormone therapy"[tiab] OR estrogen[tiab])` },
  { name: 'lifestyle', query: `${MENOPAUSE_BLOCK} AND ${SLEEP_BLOCK} AND (exercise[tiab] OR yoga[tiab] OR acupuncture[tiab] OR diet[tiab] OR nutrition[tiab])` },
  { name: 'neuro', query: `${MENOPAUSE_BLOCK} AND ${SLEEP_BLOCK} AND (estradiol[tiab] OR cortisol[tiab] OR circadian[tiab] OR actigraphy[tiab] OR polysomnography[tiab])` },
];

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { days: 7, maxPapers: 50, output: 'papers.json' };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--days' && args[i + 1]) opts.days = parseInt(args[i + 1], 10);
    if (args[i] === '--max-papers' && args[i + 1]) opts.maxPapers = parseInt(args[i + 1], 10);
    if (args[i] === '--output' && args[i + 1]) opts.output = args[i + 1];
  }
  return opts;
}

function getDateNDaysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0].replace(/-/g, '/');
}

function loadSummarizedPmids() {
  const p = resolve(ROOT, 'docs', 'summarized_pmids.json');
  if (existsSync(p)) {
    try {
      return new Set(JSON.parse(readFileSync(p, 'utf-8')));
    } catch { return new Set(); }
  }
  return new Set();
}

async function pubmedSearch(query, retmax = 50) {
  const params = new URLSearchParams({
    db: 'pubmed',
    term: query,
    retmax: String(retmax),
    sort: 'date',
    retmode: 'json',
    tool: NCBI_TOOL,
    email: NCBI_EMAIL,
  });
  const url = `${PUBMED_SEARCH}?${params.toString()}`;
  try {
    const resp = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(30000),
    });
    if (!resp.ok) {
      console.error(`[ERROR] PubMed HTTP ${resp.status}`);
      return [];
    }
    const text = await resp.text();
    if (text.startsWith('<!') || text.startsWith('<html')) {
      console.error(`[ERROR] PubMed returned HTML error page`);
      return [];
    }
    try {
      const data = JSON.parse(text);
      return data?.esearchresult?.idlist || [];
    } catch {
      console.error(`[ERROR] PubMed non-JSON: ${text.slice(0, 80)}`);
      return [];
    }
  } catch (e) {
    console.error(`[ERROR] PubMed search failed: ${e.message}`);
    return [];
  }
}

function extractXmlField(xml, tag) {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const m = xml.match(re);
  return m ? m[1].trim() : '';
}

function extractAbstractSections(xml) {
  const parts = [];
  const sectionRe = /<AbstractText[^>]*Label="([^"]*)"[^>]*>([\s\S]*?)<\/AbstractText>/g;
  let m;
  while ((m = sectionRe.exec(xml)) !== null) {
    const text = m[2].replace(/<[^>]+>/g, '').trim();
    if (text) parts.push(`${m[1]}: ${text}`);
  }
  if (parts.length === 0) {
    const plainRe = /<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/g;
    let pm;
    while ((pm = plainRe.exec(xml)) !== null) {
      const text = pm[1].replace(/<[^>]+>/g, '').trim();
      if (text) parts.push(text);
    }
  }
  return parts.join(' ').slice(0, 2000);
}

function extractKeywords(xml) {
  const kws = [];
  const re = /<Keyword>([^<]+)<\/Keyword>/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    kws.push(m[1].trim());
  }
  return kws;
}

async function fetchDetails(pmids) {
  if (!pmids.length) return [];
  const params = new URLSearchParams({
    db: 'pubmed',
    id: pmids.join(','),
    retmode: 'xml',
    tool: NCBI_TOOL,
    email: NCBI_EMAIL,
  });
  const url = `${PUBMED_FETCH}?${params.toString()}`;
  try {
    const resp = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/xml',
      },
      signal: AbortSignal.timeout(60000),
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const xml = await resp.text();

    const papers = [];
    const articleRe = /<PubmedArticle>([\s\S]*?)<\/PubmedArticle>/g;
    let match;
    while ((match = articleRe.exec(xml)) !== null) {
      const block = match[1];

      const title = extractXmlField(block, 'ArticleTitle').replace(/<[^>]+>/g, '').trim();
      const abstract = extractAbstractSections(block);
      const journal = extractXmlField(block, 'Title').trim();

      let dateStr = '';
      const yearM = block.match(/<Year>(\d{4})<\/Year>/);
      const monthM = block.match(/<Month>([^<]+)<\/Month>/);
      const dayM = block.match(/<Day>(\d+)<\/Day>/);
      if (yearM) {
        dateStr = yearM[1];
        if (monthM) dateStr += ` ${monthM[1]}`;
        if (dayM) dateStr += ` ${dayM[1]}`;
      }

      const pmidM = block.match(/<PMID[^>]*>(\d+)<\/PMID>/);
      const pmid = pmidM ? pmidM[1] : '';
      const link = pmid ? `https://pubmed.ncbi.nlm.nih.gov/${pmid}/` : '';
      const keywords = extractKeywords(block);

      if (title) {
        papers.push({ pmid, title, journal, date: dateStr, abstract, url: link, keywords });
      }
    }
    return papers;
  } catch (e) {
    console.error(`[ERROR] PubMed fetch failed: ${e.message}`);
    return [];
  }
}

async function main() {
  const opts = parseArgs();
  const lookback = getDateNDaysAgo(opts.days);
  const dateFilter = `"${lookback}"[Date - Publication] : "3000"[Date - Publication]`;

  const summarized = loadSummarizedPmids();
  console.error(`[INFO] Already summarized: ${summarized.size} PMIDs`);

  const allPmids = new Set();
  for (const sq of SEARCH_QUERIES) {
    const fullQuery = `${sq.query} AND ${dateFilter}`;
    console.error(`[INFO] Running search: ${sq.name}...`);
    const ids = await pubmedSearch(sq.query, opts.maxPapers);
    for (const id of ids) allPmids.add(id);
    await new Promise(r => setTimeout(r, 1500));
  }

  console.error(`[INFO] Unique PMIDs found: ${allPmids.size}`);

  const newPmids = [...allPmids].filter(id => !summarized.has(id));
  console.error(`[INFO] New (unsampled) PMIDs: ${newPmids.length}`);

  if (newPmids.length === 0) {
    const tz = new Date().toLocaleString('en-US', { timeZone: 'Asia/Taipei' });
    const date = tz.split(',')[0].replace(/(\d+)\/(\d+)\/(\d+)/, (_, m, d, y) => `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`);
    const output = { date, count: 0, papers: [] };
    const outPath = resolve(ROOT, opts.output);
    writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf-8');
    console.error(`[INFO] No new papers. Saved empty result to ${opts.output}`);
    return;
  }

  const limitedPmids = newPmids.slice(0, opts.maxPapers);
  console.error(`[INFO] Fetching details for ${limitedPmids.length} papers...`);
  const papers = await fetchDetails(limitedPmids);
  console.error(`[INFO] Fetched ${papers.length} paper details`);

  const tz = new Date().toLocaleString('en-US', { timeZone: 'Asia/Taipei' });
  const date = tz.split(',')[0].replace(/(\d+)\/(\d+)\/(\d+)/, (_, m, d, y) => `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`);
  const output = { date, count: papers.length, papers };
  const outPath = resolve(ROOT, opts.output);
  writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf-8');
  console.error(`[INFO] Saved ${papers.length} papers to ${opts.output}`);
}

main().catch(e => {
  console.error(`[FATAL] ${e.message}`);
  process.exit(1);
});

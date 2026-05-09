import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const PUBMED_SEARCH = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi';
const PUBMED_FETCH = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi';
const USER_AGENT = 'MenopauseInsomniaBot/1.0 (research aggregator)';

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

const SEARCH_QUERIES = [
  {
    name: 'broad_master',
    query: [
      '("Menopause"[Mesh] OR menopause[tiab] OR menopausal[tiab]',
      'OR perimenopause[tiab] OR perimenopausal[tiab]',
      'OR postmenopause[tiab] OR postmenopausal[tiab]',
      'OR climacteric*[tiab] OR "menopausal transition"[tiab]',
      'OR "midlife women"[tiab] OR "mid-life women"[tiab])',
      'AND',
      '("Sleep Initiation and Maintenance Disorders"[Mesh]',
      'OR "Sleep Wake Disorders"[Mesh]',
      'OR insomnia[tiab] OR "insomnia disorder"[tiab]',
      'OR "sleep disturbance"[tiab] OR "sleep disturbances"[tiab]',
      'OR "sleep problem"[tiab] OR "sleep problems"[tiab]',
      'OR "sleep disorder"[tiab] OR "sleep disorders"[tiab]',
      'OR "poor sleep"[tiab] OR "sleep quality"[tiab]',
      'OR "sleep maintenance"[tiab] OR "sleep onset"[tiab]',
      'OR "early awakening"[tiab] OR "night awakening"[tiab]',
      'OR "nocturnal awakening"[tiab] OR WASO[tiab])',
    ].join(' '),
  },
  {
    name: 'vasomotor_sleep',
    query: [
      '(menopause[tiab] OR menopausal[tiab] OR perimenopause[tiab] OR perimenopausal[tiab])',
      'AND',
      '(insomnia[tiab] OR "sleep disturbance"[tiab] OR "sleep disturbances"[tiab] OR "sleep quality"[tiab])',
      'AND',
      '("hot flash"[tiab] OR "hot flashes"[tiab] OR "hot flush"[tiab] OR "hot flushes"[tiab]',
      'OR "night sweat"[tiab] OR "night sweats"[tiab] OR "vasomotor symptom"[tiab] OR "vasomotor symptoms"[tiab])',
    ].join(' '),
  },
  {
    name: 'mood_sleep',
    query: [
      '(menopause[tiab] OR menopausal[tiab] OR perimenopausal[tiab] OR postmenopausal[tiab])',
      'AND',
      '(insomnia[tiab] OR "sleep disturbance"[tiab] OR "sleep disturbances"[tiab] OR "sleep quality"[tiab])',
      'AND',
      '(depression[tiab] OR depressive[tiab] OR anxiety[tiab] OR anxious[tiab]',
      'OR "psychological distress"[tiab] OR stress[tiab] OR irritability[tiab])',
    ].join(' '),
  },
  {
    name: 'treatment_cbti',
    query: [
      '(menopause[tiab] OR menopausal[tiab] OR perimenopausal[tiab] OR postmenopausal[tiab])',
      'AND',
      '(insomnia[tiab] OR "sleep disturbance"[tiab] OR "sleep disturbances"[tiab] OR "sleep quality"[tiab])',
      'AND',
      '("cognitive behavioral therapy"[tiab] OR CBT[tiab] OR CBT-I[tiab]',
      'OR "behavioral sleep medicine"[tiab] OR "sleep hygiene"[tiab]',
      'OR "stimulus control"[tiab] OR "sleep restriction"[tiab])',
    ].join(' '),
  },
  {
    name: 'hormone_therapy',
    query: [
      '(menopause[tiab] OR menopausal[tiab] OR perimenopausal[tiab] OR postmenopausal[tiab])',
      'AND',
      '(insomnia[tiab] OR "sleep disturbance"[tiab] OR "sleep quality"[tiab])',
      'AND',
      '("hormone therapy"[tiab] OR "hormone replacement"[tiab]',
      'OR estrogen[tiab] OR estradiol[tiab] OR progesterone[tiab] OR progestin[tiab])',
    ].join(' '),
  },
  {
    name: 'nutrition_lifestyle',
    query: [
      '(menopause[tiab] OR menopausal[tiab] OR perimenopausal[tiab] OR postmenopausal[tiab])',
      'AND',
      '(insomnia[tiab] OR "sleep disturbance"[tiab] OR "sleep disturbances"[tiab] OR "sleep quality"[tiab])',
      'AND',
      '(nutrition[tiab] OR diet[tiab] OR dietary[tiab] OR caffeine[tiab] OR alcohol[tiab]',
      'OR "soy isoflavone"[tiab] OR phytoestrogen[tiab] OR magnesium[tiab]',
      'OR "vitamin D"[tiab] OR omega-3[tiab] OR exercise[tiab]',
      'OR "physical activity"[tiab] OR yoga[tiab] OR mindfulness[tiab] OR acupuncture[tiab])',
    ].join(' '),
  },
  {
    name: 'neuroscience',
    query: [
      '(menopause[tiab] OR menopausal[tiab] OR perimenopausal[tiab] OR postmenopausal[tiab])',
      'AND',
      '(insomnia[tiab] OR "sleep disturbance"[tiab] OR "sleep quality"[tiab] OR sleep[tiab])',
      'AND',
      '(neuroendocrine[tiab] OR neurobiology[tiab] OR estradiol[tiab] OR hypothalamus[tiab]',
      'OR thermoregulation[tiab] OR orexin[tiab] OR GABA[tiab] OR serotonin[tiab]',
      'OR cortisol[tiab] OR "HPA axis"[tiab] OR inflammation[tiab]',
      'OR circadian[tiab] OR melatonin[tiab] OR actigraphy[tiab] OR polysomnography[tiab])',
    ].join(' '),
  },
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
  });
  try {
    const resp = await fetch(PUBMED_SEARCH, {
      method: 'POST',
      headers: {
        'User-Agent': USER_AGENT,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
      signal: AbortSignal.timeout(30000),
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const text = await resp.text();
    try {
      const data = JSON.parse(text);
      return data?.esearchresult?.idlist || [];
    } catch {
      console.error(`[ERROR] PubMed returned non-JSON: ${text.slice(0, 100)}`);
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
  });
  try {
    const resp = await fetch(PUBMED_FETCH, {
      method: 'POST',
      headers: {
        'User-Agent': USER_AGENT,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
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
    const ids = await pubmedSearch(fullQuery, opts.maxPapers);
    for (const id of ids) allPmids.add(id);
    await new Promise(r => setTimeout(r, 400));
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

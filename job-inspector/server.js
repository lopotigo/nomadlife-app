import express from 'express';
import fetch from 'node-fetch';
import OpenAI from 'openai';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());
app.use(express.static(join(__dirname, 'public')));

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const FEDERICO_PROFILE = `
Name: Federico Poletti
Age: 48, based in Sardinia, Italy (CET timezone)
Stack: TypeScript, React 18, Node.js, Express, PostgreSQL, Drizzle ORM, OpenAI API, Tailwind CSS, Framer Motion, Leaflet, WebSockets
Experience: 1 year self-taught (built NomadLife solo - a full production PWA with AI chatbot, real-time chat, map, booking, marketplace, PWA, SEO, SendGrid, Stripe-ready)
Background: PhD Political Science — strong analytical, writing, research skills
Preferred: Remote only, EU timezone compatible (Italy/CET)
Job types: Full-time, Part-time, Contract, Freelance
Rate: €25-35/hr or €2000-5000/month
Portfolio: nomad-life.app — full production app, not a tutorial project
Languages: Italian (native), English (professional), basic French/Spanish
NOT interested in: On-site only, requires 5+ years experience strict gate, pure mobile native (Swift/Kotlin), blockchain/crypto
Strengths: AI integration (OpenAI), full-stack solo execution, product thinking, quick learner
`;

function daysSincePosted(dateStr) {
  if (!dateStr) return null;
  const posted = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now - posted) / (1000 * 60 * 60 * 24));
  return isNaN(diff) ? null : diff;
}

function calcOpportunityScore(job) {
  let score = 0;
  const days = daysSincePosted(job.postedAt);
  const title = (job.title || '').toLowerCase();
  const desc = (job.description || '').toLowerCase();
  const company = (job.company || '').toLowerCase();

  // Freshness (max 6)
  if (days !== null) {
    if (days <= 1) score += 6;
    else if (days <= 3) score += 5;
    else if (days <= 7) score += 3;
    else if (days <= 14) score += 1;
  }

  // Salary clarity (max 3)
  if (job.salary && job.salary.trim() !== '') score += 3;

  // Startup/small team signals (max 3)
  const startupSignals = ['startup', 'early stage', 'seed', 'series a', 'small team', 'founding', 'stealth'];
  if (startupSignals.some(s => desc.includes(s) || company.includes(s))) score += 3;

  // AI/SaaS sector (max 2)
  const aiSaasSignals = ['ai', 'saas', 'openai', 'llm', 'gpt', 'machine learning', 'nlp'];
  if (aiSaasSignals.some(s => desc.includes(s) || title.includes(s))) score += 2;

  // NOT a senior-gated role (max 1)
  const seniorGate = ['5+ years', '5 years', 'senior only', '7+ years', '10+ years'];
  if (!seniorGate.some(s => desc.includes(s))) score += 1;

  return Math.min(score, 15);
}

function calcCompetitionLevel(job) {
  const days = daysSincePosted(job.postedAt);
  const desc = (job.description || '').toLowerCase();
  const startupSignals = ['startup', 'early stage', 'seed', 'series a', 'small team', 'founding'];
  const isStartup = startupSignals.some(s => desc.includes(s));

  if (days !== null && days <= 3) return 'low';
  if (isStartup || (days !== null && days <= 7)) return 'low';
  if (days !== null && days <= 14) return 'medium';
  return 'high';
}

async function fetchRemotiveJobs() {
  try {
    const res = await fetch('https://remotive.com/api/remote-jobs?category=software-dev&limit=30');
    const data = await res.json();
    return (data.jobs || []).map(j => ({
      id: `remotive-${j.id}`,
      title: j.title,
      company: j.company_name,
      url: j.url,
      description: j.description?.replace(/<[^>]*>/g, '').slice(0, 600),
      tags: j.tags || [],
      source: 'Remotive',
      salary: j.salary || '',
      location: j.candidate_required_location || 'Remote',
      postedAt: j.publication_date || null,
      companySize: j.company_num_employees || '',
    }));
  } catch (e) {
    console.error('Remotive error:', e.message);
    return [];
  }
}

async function fetchJobicyJobs() {
  try {
    const res = await fetch('https://jobicy.com/api/v2/remote-jobs?tag=react,nodejs,typescript&count=20');
    const data = await res.json();
    return (data.jobs || []).map(j => ({
      id: `jobicy-${j.id}`,
      title: j.jobTitle,
      company: j.companyName,
      url: j.url,
      description: j.jobDescription?.replace(/<[^>]*>/g, '').slice(0, 600),
      tags: j.jobIndustry || [],
      source: 'Jobicy',
      salary: j.annualSalaryMin ? `$${j.annualSalaryMin}-${j.annualSalaryMax}` : '',
      location: j.jobGeo || 'Remote',
      postedAt: j.pubDate || null,
      companySize: '',
    }));
  } catch (e) {
    console.error('Jobicy error:', e.message);
    return [];
  }
}

async function fetchRemoteOKJobs() {
  try {
    const res = await fetch('https://remoteok.com/api', {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; JobInspector/1.0)' }
    });
    const data = await res.json();
    return (data || [])
      .filter(j => j.id && j.position)
      .filter(j => {
        const tags = (j.tags || []).join(' ').toLowerCase();
        const pos = (j.position || '').toLowerCase();
        return tags.includes('react') || tags.includes('node') || tags.includes('typescript') ||
               tags.includes('javascript') || tags.includes('fullstack') || tags.includes('full-stack') ||
               pos.includes('react') || pos.includes('node') || pos.includes('full stack') || pos.includes('ai');
      })
      .slice(0, 20)
      .map(j => ({
        id: `remoteok-${j.id}`,
        title: j.position,
        company: j.company || 'Unknown',
        url: j.url || `https://remoteok.com/remote-jobs/${j.id}`,
        description: j.description?.replace(/<[^>]*>/g, '').slice(0, 600) || '',
        tags: j.tags || [],
        source: 'RemoteOK',
        salary: j.salary || '',
        location: 'Remote Worldwide',
        postedAt: j.date ? new Date(j.date * 1000).toISOString() : null,
        companySize: '',
      }));
  } catch (e) {
    console.error('RemoteOK error:', e.message);
    return [];
  }
}

async function fetchRemotiveAIJobs() {
  try {
    const res = await fetch('https://remotive.com/api/remote-jobs?category=ai&limit=20');
    const data = await res.json();
    return (data.jobs || []).map(j => ({
      id: `remotive-ai-${j.id}`,
      title: j.title,
      company: j.company_name,
      url: j.url,
      description: j.description?.replace(/<[^>]*>/g, '').slice(0, 600),
      tags: j.tags || [],
      source: 'Remotive AI',
      salary: j.salary || '',
      location: j.candidate_required_location || 'Remote',
      postedAt: j.publication_date || null,
      companySize: j.company_num_employees || '',
    }));
  } catch (e) {
    console.error('Remotive AI error:', e.message);
    return [];
  }
}

function isIrrelevantJob(job) {
  const title = (job.title || '').toLowerCase();
  const irrelevant = ['copywriter', 'sales', 'microbiology', 'office assistant', 'maintenance', 'paid media',
    'video editor', 'inside sales', 'business transformation', 'marketing specialist', 'content writer',
    'graphic design', 'devops', 'ios developer', 'android developer', 'ruby on rails', 'php developer'];
  return irrelevant.some(k => title.includes(k));
}

async function scoreJob(job) {
  try {
    const daysOld = daysSincePosted(job.postedAt);
    const opportunityScore = calcOpportunityScore(job);
    const competitionLevel = calcCompetitionLevel(job);

    const prompt = `You are a strategic job matching AI for Federico Poletti. Score this job 0-85 (tech match only, opportunity added separately).

FEDERICO'S PROFILE:
${FEDERICO_PROFILE}

JOB:
Title: ${job.title}
Company: ${job.company}
Location: ${job.location}
Tags: ${Array.isArray(job.tags) ? job.tags.join(', ') : job.tags}
Salary: ${job.salary || 'not specified'}
Description: ${job.description}

SCORING (total 85):
1. Tech stack match (0-35): TypeScript/React/Node.js/PostgreSQL/OpenAI = full. Adjacent = partial. Unrelated = 0.
2. Experience gate (0-25): Junior/no gate/1yr ok = 25. "3+ years" = max 15. "5+ years strict" = max 8. "Senior only" = max 5.
3. Remote + EU compatible (0-15): Truly remote EU-friendly = 15. US timezones only = 5. On-site = 0.
4. Portfolio fit (0-10): Does NomadLife (PWA, AI chatbot, maps, booking, real-time chat) showcase skills for this role?

RULES:
- On-site/relocation required: max 15 total
- Blockchain/crypto/Web3: max 10 total
- Non-tech role (sales, design, writing): max 5 total

Respond ONLY with valid JSON:
{"score": 72, "reasons": ["React + Node.js match", "EU remote OK", "No experience gate mentioned"], "dealbreakers": [], "pitchAngle": "Lead with NomadLife's AI chatbot and real-time features as direct proof."}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 250,
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(response.choices[0].message.content);
    const matchScore = result.score || 0;
    const totalScore = Math.min(matchScore + opportunityScore, 100);

    return {
      score: totalScore,
      matchScore,
      opportunityScore,
      reasons: result.reasons || [],
      dealbreakers: result.dealbreakers || [],
      pitchAngle: result.pitchAngle || '',
      freshnessDays: daysOld,
      competitionLevel,
    };
  } catch (e) {
    console.error('Scoring error:', e.message);
    return { score: 0, matchScore: 0, opportunityScore: 0, reasons: [], dealbreakers: ['Scoring error'], pitchAngle: '', freshnessDays: null, competitionLevel: 'medium' };
  }
}

app.get('/api/inspector/jobs', async (req, res) => {
  try {
    console.log('Fetching jobs from sources...');
    const [remotiveJobs, jobicyJobs, remoteOKJobs, remotiveAIJobs] = await Promise.all([
      fetchRemotiveJobs(),
      fetchJobicyJobs(),
      fetchRemoteOKJobs(),
      fetchRemotiveAIJobs(),
    ]);

    const seen = new Set();
    const allJobs = [...remotiveJobs, ...jobicyJobs, ...remoteOKJobs, ...remotiveAIJobs].filter(j => {
      const key = `${j.title}-${j.company}`.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      if (isIrrelevantJob(j)) return false;
      return true;
    });
    console.log(`Found ${allJobs.length} jobs after pre-filter. Scoring...`);

    const scored = await Promise.all(
      allJobs.map(async (job) => {
        const scoring = await scoreJob(job);
        return { ...job, ...scoring };
      })
    );

    const sorted = scored.sort((a, b) => b.score - a.score);
    res.json({ jobs: sorted, total: sorted.length, timestamp: new Date().toISOString() });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

const PORT = 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Job Inspector running on port ${PORT}`);
});

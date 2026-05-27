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

async function scoreJob(job) {
  try {
    const daysOld = daysSincePosted(job.postedAt);
    const freshnessNote = daysOld !== null
      ? `Posted ${daysOld} day(s) ago — ${daysOld <= 3 ? 'VERY FRESH, low competition' : daysOld <= 7 ? 'fresh, moderate competition' : daysOld <= 14 ? 'some competition' : 'older posting, high competition'}`
      : 'Posting date unknown';

    const prompt = `You are a strategic job matching AI helping Federico Poletti land remote work. Score this job 0-100 and provide actionable insights.

FEDERICO'S PROFILE:
${FEDERICO_PROFILE}

JOB POSTING:
Title: ${job.title}
Company: ${job.company}
Company size: ${job.companySize || 'unknown'}
Location: ${job.location}
Tags: ${Array.isArray(job.tags) ? job.tags.join(', ') : job.tags}
Salary: ${job.salary || 'not specified'}
Freshness: ${freshnessNote}
Description: ${job.description}

SCORING CRITERIA (total 100):
1. Tech stack match (0-30): TypeScript, React, Node.js, PostgreSQL, OpenAI API, Tailwind = full points. Adjacent techs = partial.
2. Experience gate (0-20): Does it EXPLICITLY require 3+ years? If yes, penalize heavily. If junior/1yr ok or no gate = full points.
3. Remote + EU compatible (0-20): Must be truly remote. EU/CET timezone compatible = full points. US-only hours = deduct.
4. Strategic opportunity (0-15): Award points for: fresh posting (≤3 days = +8), startup stage = +4, salary clearly stated = +3, AI/SaaS sector = +3, small company (more direct access) = +3. Max 15.
5. Portfolio fit (0-15): Does NomadLife (PWA, AI chatbot, maps, booking, marketplace, real-time) directly showcase relevant skills for this role?

IMPORTANT RULES:
- If job requires on-site or relocation: score max 20
- If job has "5+ years required" or "senior only" with strict gate: score max 40
- If job is blockchain/crypto/Web3: score max 15
- Startup or small team = big opportunity bonus for Federico

Respond ONLY with valid JSON:
{
  "score": 85,
  "matchScore": 72,
  "opportunityScore": 13,
  "reasons": ["React + Node.js exact match", "EU remote confirmed", "Fresh posting — low competition"],
  "dealbreakers": [],
  "pitchAngle": "Lead with NomadLife as proof of solo full-stack AI delivery — mention the real-time chat and OpenAI integration directly.",
  "freshnessDays": ${daysOld !== null ? daysOld : 'null'},
  "competitionLevel": "low"
}

competitionLevel must be: "low" (≤3 days old or startup) | "medium" | "high" (>14 days or enterprise)`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 350,
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(response.choices[0].message.content);
    return {
      score: result.score || 0,
      matchScore: result.matchScore || 0,
      opportunityScore: result.opportunityScore || 0,
      reasons: result.reasons || [],
      dealbreakers: result.dealbreakers || [],
      pitchAngle: result.pitchAngle || '',
      freshnessDays: result.freshnessDays,
      competitionLevel: result.competitionLevel || 'medium',
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
      return true;
    });
    console.log(`Found ${allJobs.length} jobs. Scoring...`);

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

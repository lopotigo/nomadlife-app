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
Stack: TypeScript, React 18, Node.js, Express, PostgreSQL, Drizzle ORM, OpenAI API, Tailwind CSS
Experience: 1 year self-taught (built NomadLife solo - a full production PWA with AI, real-time chat, map, booking, marketplace)
Preferred location: Remote only, EU timezone compatible (Italy)
Job types: Full-time, Part-time, Contract, Freelance
Rate: €25-35/hr or €2000-5000/month
NOT interested in: On-site only, requires 5+ years experience, pure mobile native (Swift/Kotlin), blockchain/crypto
Portfolio: nomad-life.app
Languages: Italian (native), English (professional)
`;

async function fetchRemotiveJobs() {
  try {
    const res = await fetch('https://remotive.com/api/remote-jobs?category=software-dev&limit=30');
    const data = await res.json();
    return (data.jobs || []).map(j => ({
      id: `remotive-${j.id}`,
      title: j.title,
      company: j.company_name,
      url: j.url,
      description: j.description?.replace(/<[^>]*>/g, '').slice(0, 500),
      tags: j.tags || [],
      source: 'Remotive',
      salary: j.salary || '',
      location: j.candidate_required_location || 'Remote',
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
      description: j.jobDescription?.replace(/<[^>]*>/g, '').slice(0, 500),
      tags: j.jobIndustry || [],
      source: 'Jobicy',
      salary: j.annualSalaryMin ? `$${j.annualSalaryMin}-${j.annualSalaryMax}` : '',
      location: j.jobGeo || 'Remote',
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
        description: j.description?.replace(/<[^>]*>/g, '').slice(0, 500) || '',
        tags: j.tags || [],
        source: 'RemoteOK',
        salary: j.salary || '',
        location: 'Remote Worldwide',
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
      description: j.description?.replace(/<[^>]*>/g, '').slice(0, 500),
      tags: j.tags || [],
      source: 'Remotive AI',
      salary: j.salary || '',
      location: j.candidate_required_location || 'Remote',
    }));
  } catch (e) {
    console.error('Remotive AI error:', e.message);
    return [];
  }
}

async function scoreJob(job) {
  try {
    const prompt = `You are a job matching AI. Score this job from 0-100 for Federico Poletti.

FEDERICO'S PROFILE:
${FEDERICO_PROFILE}

JOB POSTING:
Title: ${job.title}
Company: ${job.company}
Location: ${job.location}
Tags: ${Array.isArray(job.tags) ? job.tags.join(', ') : job.tags}
Salary: ${job.salary}
Description: ${job.description}

Score criteria:
- Tech stack match (0-35): Does it use TypeScript, React, Node.js, PostgreSQL, or OpenAI?
- Remote/EU compatible (0-25): Is it truly remote and EU-friendly?
- Experience match (0-20): Does it accept junior/1yr experience?
- Compensation match (0-10): Is salary/rate in range?
- Sector fit (0-10): Is it SaaS, AI, startup, or web product?

Respond with ONLY valid JSON:
{"score": 85, "reasons": ["React + Node.js stack match", "EU remote accepted", "AI features mentioned"], "dealbreakers": []}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 200,
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(response.choices[0].message.content);
    return { score: result.score || 0, reasons: result.reasons || [], dealbreakers: result.dealbreakers || [] };
  } catch (e) {
    return { score: 0, reasons: [], dealbreakers: ['Scoring error'] };
  }
}

app.get('/api/jobs', async (req, res) => {
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

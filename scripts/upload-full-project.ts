// Script to upload the full NomadLife project to GitHub
import { createRepository, pushFile, getGitHubUser } from "../server/github";
import * as fs from "fs";
import * as path from "path";

const IGNORE_PATTERNS = [
  'node_modules',
  '.git',
  'dist',
  '.replit',
  'replit.nix',
  '.upm',
  '.cache',
  '.config',
  'scripts/upload-full-project.ts',
  'scripts/create-github-repo.ts',
  '/tmp',
  '.env',
  'package-lock.json'
];

function shouldIgnore(filePath: string): boolean {
  return IGNORE_PATTERNS.some(pattern => filePath.includes(pattern));
}

function getAllFiles(dir: string, baseDir: string = dir): string[] {
  const files: string[] = [];
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const relativePath = path.relative(baseDir, fullPath);
    
    if (shouldIgnore(relativePath)) continue;
    
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      files.push(...getAllFiles(fullPath, baseDir));
    } else {
      files.push(relativePath);
    }
  }
  
  return files;
}

async function main() {
  try {
    console.log("Getting GitHub user info...");
    const githubUser = await getGitHubUser();
    console.log(`Logged in as: ${githubUser.login}`);

    const repoName = "nomadlife-app";
    const repoDescription = "NomadLife - Full-stack social platform for digital nomads with React, Express, PostgreSQL";
    
    console.log(`Creating repository: ${repoName}...`);
    const repo = await createRepository(repoName, repoDescription, false);
    console.log(`Repository created: ${repo.html_url}`);

    console.log("\nCollecting project files...");
    const projectRoot = process.cwd();
    const files = getAllFiles(projectRoot);
    
    console.log(`Found ${files.length} files to upload\n`);

    for (const file of files) {
      try {
        const content = fs.readFileSync(path.join(projectRoot, file), 'utf-8');
        console.log(`Uploading: ${file}`);
        await pushFile(githubUser.login, repoName, file, content, `Add ${file}`);
        await new Promise(resolve => setTimeout(resolve, 500)); // Rate limiting
      } catch (err: any) {
        if (err.message?.includes('binary')) {
          console.log(`Skipping binary file: ${file}`);
        } else {
          console.log(`Error uploading ${file}: ${err.message}`);
        }
      }
    }

    console.log("\n✅ Project uploaded successfully!");
    console.log(`📁 URL: ${repo.html_url}`);

  } catch (error: any) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

main();

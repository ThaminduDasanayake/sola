import { invoke } from '@tauri-apps/api/core';
import type { ProjectTelemetry } from '../types';
import { saveProjects } from './db';

export interface VercelAccountInfo {
  token: string | null;
  teamId: string | null;
  isFromEnv: boolean;
  username?: string;
  email?: string;
}

interface RawVercelProject {
  id: string;
  name: string;
  framework?: string;
  updatedAt?: number;
  alias?: Array<string | { domain?: string; alias?: string }>;
  link?: {
    type?: string;
    repo?: string;
    org?: string;
  };
  targets?: {
    production?: {
      id?: string;
      url?: string;
      readyState?: string;
      alias?: string[];
    };
  };
  latestDeployments?: Array<{
    id: string;
    url?: string;
    target?: string;
    readyState?: string;
    alias?: string[];
    createdAt?: number;
    creator?: {
      username?: string;
    };
    meta?: {
      githubCommitMessage?: string;
      githubCommitRef?: string;
      githubCommitAuthorName?: string;
      githubCommitAuthorLogin?: string;
      commitMessage?: string;
      branch?: string;
    };
  }>;
}

/**
 * Extracts the permanent production site URL for a Vercel project.
 * Unlike ephemeral deployment hash URLs (which can be cancelled or expired),
 * the permanent site URL is always active.
 */
function extractPermanentSiteUrl(p: RawVercelProject): string {
  // 1. Check production deployment's alias list
  const prodDep = p.latestDeployments?.find((d) => d.target === 'production') || p.targets?.production;
  if (prodDep?.alias && Array.isArray(prodDep.alias) && prodDep.alias.length > 0) {
    const custom = prodDep.alias.find((a) => typeof a === 'string' && !a.endsWith('.vercel.app'));
    const chosen = custom || prodDep.alias[0];
    if (chosen) {
      return chosen.startsWith('http') ? chosen : `https://${chosen}`;
    }
  }

  // 2. Check project-level alias list
  if (p.alias && Array.isArray(p.alias) && p.alias.length > 0) {
    const list = p.alias
      .map((item) => (typeof item === 'string' ? item : item.domain || item.alias || ''))
      .filter(Boolean);
    const custom = list.find((d) => !d.endsWith('.vercel.app'));
    const chosen = custom || list[0];
    if (chosen) {
      return chosen.startsWith('http') ? chosen : `https://${chosen}`;
    }
  }

  // 3. Check targets.production.url if it is an apex/permanent alias
  if (p.targets?.production?.url) {
    const u = p.targets.production.url;
    // Exclude ephemeral branch preview or hash URLs
    if (!u.includes('-git-') && !u.match(/[a-z0-9]{9,}\.vercel\.app$/)) {
      return u.startsWith('http') ? u : `https://${u}`;
    }
  }

  // 4. Default canonical permanent Vercel domain: https://<project-name>.vercel.app
  // This domain is always permanently routed to the live production deployment.
  return `https://${p.name.toLowerCase()}.vercel.app`;
}

export class VercelService {
  /**
   * Retrieves the current Vercel credentials.
   * Checks localStorage override first, then falls back to .env loaded by Tauri backend.
   */
  async getCredentials(): Promise<{ token: string | null; teamId: string | null; isFromEnv: boolean }> {
    const localToken = typeof window !== 'undefined' ? localStorage.getItem('sola_vercel_token') : null;
    const localTeam = typeof window !== 'undefined' ? localStorage.getItem('sola_vercel_team_id') : null;

    if (localToken && localToken.trim().length > 0) {
      return {
        token: localToken.trim(),
        teamId: localTeam?.trim() || null,
        isFromEnv: false,
      };
    }

    try {
      const envConfig = await invoke<{ token: string | null; team_id: string | null }>('get_vercel_credentials');
      if (envConfig && envConfig.token && envConfig.token.trim().length > 0) {
        return {
          token: envConfig.token.trim(),
          teamId: envConfig.team_id?.trim() || null,
          isFromEnv: true,
        };
      }
    } catch (e) {
      console.warn('Could not read Vercel credentials from backend:', e);
    }

    return { token: null, teamId: null, isFromEnv: false };
  }

  /**
   * Validates a token and fetches basic user profile info.
   */
  async verifyToken(token: string, teamId?: string | null): Promise<{ valid: boolean; name?: string; error?: string }> {
    try {
      const url = new URL('https://api.vercel.com/v2/user');
      if (teamId) {
        url.searchParams.set('teamId', teamId);
      }
      const res = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${token.trim()}`,
        },
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        return {
          valid: false,
          error: errJson.error?.message || `Vercel API returned status ${res.status}`,
        };
      }

      const data = await res.json();
      return {
        valid: true,
        name: data.user?.username || data.user?.name || data.user?.email || 'Vercel User',
      };
    } catch (err: any) {
      return {
        valid: false,
        error: err.message || 'Network error contacting Vercel API',
      };
    }
  }

  /**
   * Fetches projects from Vercel, normalizes their status, and caches in SQLite.
   */
  async syncProjects(): Promise<{ success: boolean; projects: ProjectTelemetry[]; error?: string }> {
    const { token, teamId } = await this.getCredentials();

    if (!token) {
      return {
        success: false,
        projects: [],
        error: 'No Vercel API token found. Add VERCEL_API_TOKEN to .env or configure in Settings.',
      };
    }

    try {
      const url = new URL('https://api.vercel.com/v9/projects');
      url.searchParams.set('limit', '50');
      if (teamId) {
        url.searchParams.set('teamId', teamId);
      }

      const res = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const msg = errData.error?.message || `Vercel error ${res.status}`;
        return { success: false, projects: [], error: msg };
      }

      const data = await res.json();
      const rawProjects: RawVercelProject[] = data.projects || [];

      const normalized: ProjectTelemetry[] = rawProjects.map((p, idx) => {
        const latest = p.latestDeployments?.[0];
        const prodDeployment =
          p.latestDeployments?.find((d) => d.target === 'production') ||
          p.targets?.production;

        const latestState = (latest?.readyState || '').toUpperCase();
        const prodState = (prodDeployment?.readyState || '').toUpperCase();

        // Determine live site status
        let status: ProjectTelemetry['last_status'] = 'unknown';

        if (latestState === 'BUILDING' || latestState === 'INITIALIZING' || latestState === 'QUEUED') {
          status = 'building';
        } else if (prodState === 'READY') {
          status = 'healthy';
        } else if (latestState === 'READY') {
          status = 'healthy';
        } else if (latestState === 'ERROR') {
          status = 'failed';
        } else if (latestState === 'CANCELED') {
          // If production is active, keep healthy; otherwise warning
          status = prodState === 'READY' ? 'healthy' : 'warning';
        }

        // Format permanent site URL (never temporary or canceled)
        const permanentSiteUrl = extractPermanentSiteUrl(p);

        // Format temporary deployment preview URL
        let deploymentUrl: string | undefined = undefined;
        if (latest?.url) {
          deploymentUrl = latest.url.startsWith('http') ? latest.url : `https://${latest.url}`;
        }

        // Format repo slug
        let repoSlug: string | undefined = undefined;
        if (p.link?.repo) {
          repoSlug = p.link.org ? `${p.link.org}/${p.link.repo}` : p.link.repo;
        }

        // Commit information
        const commitMsg =
          latest?.meta?.githubCommitMessage ||
          latest?.meta?.commitMessage ||
          undefined;
        const commitBranch =
          latest?.meta?.githubCommitRef ||
          latest?.meta?.branch ||
          undefined;
        const commitAuthor =
          latest?.meta?.githubCommitAuthorName ||
          latest?.meta?.githubCommitAuthorLogin ||
          latest?.creator?.username ||
          undefined;

        // Deployment timestamp
        let lastDeploymentAt: string = new Date().toISOString();
        if (latest?.createdAt) {
          lastDeploymentAt = new Date(latest.createdAt).toISOString();
        } else if (p.updatedAt) {
          lastDeploymentAt = new Date(p.updatedAt).toISOString();
        }

        return {
          id: idx + 1,
          name: p.name,
          repo_slug: repoSlug,
          vercel_project_id: p.id,
          framework: p.framework || undefined,
          live_url: permanentSiteUrl,
          deployment_url: deploymentUrl,
          last_commit_message: commitMsg,
          last_commit_branch: commitBranch,
          last_commit_author: commitAuthor,
          last_deployment_at: lastDeploymentAt,
          latest_build_state: latestState || undefined,
          last_status: status,
          last_checked_at: new Date().toISOString(),
          open_prs: 0,
          db_storage_used_pct: undefined,
        };
      });

      // Save to SQLite
      await saveProjects(normalized);

      // Save last check timestamp
      if (typeof window !== 'undefined') {
        localStorage.setItem('sola_last_vercel_sync', Date.now().toString());
      }

      return { success: true, projects: normalized };
    } catch (err: any) {
      console.error('Failed to sync Vercel projects:', err);
      return {
        success: false,
        projects: [],
        error: err.message || 'Network error fetching Vercel projects',
      };
    }
  }
}

export const vercelService = new VercelService();

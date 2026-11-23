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
  link?: {
    type?: string;
    repo?: string;
    org?: string;
  };
  targets?: {
    production?: {
      url?: string;
      readyState?: string;
    };
  };
  latestDeployments?: Array<{
    id: string;
    url?: string;
    readyState?: string;
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
        const prodTarget = p.targets?.production;

        // Determine deployment status
        const rawState = (latest?.readyState || prodTarget?.readyState || '').toUpperCase();
        let status: ProjectTelemetry['last_status'] = 'unknown';
        if (rawState === 'READY') {
          status = 'healthy';
        } else if (rawState === 'BUILDING' || rawState === 'INITIALIZING' || rawState === 'QUEUED') {
          status = 'building';
        } else if (rawState === 'ERROR') {
          status = 'failed';
        } else if (rawState === 'CANCELED') {
          status = 'warning';
        }

        // Format repo slug
        let repoSlug: string | undefined = undefined;
        if (p.link?.repo) {
          repoSlug = p.link.org ? `${p.link.org}/${p.link.repo}` : p.link.repo;
        }

        // Format live and deployment URLs
        let deploymentUrl: string | undefined = undefined;
        if (latest?.url) {
          deploymentUrl = latest.url.startsWith('http') ? latest.url : `https://${latest.url}`;
        }

        let liveUrl: string | undefined = undefined;
        if (prodTarget?.url) {
          liveUrl = prodTarget.url.startsWith('http') ? prodTarget.url : `https://${prodTarget.url}`;
        } else {
          liveUrl = deploymentUrl;
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
          live_url: liveUrl,
          deployment_url: deploymentUrl,
          last_commit_message: commitMsg,
          last_commit_branch: commitBranch,
          last_commit_author: commitAuthor,
          last_deployment_at: lastDeploymentAt,
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

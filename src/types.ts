export interface AIChoice {
  [key: string]: string;
}

export interface ScriptTypeChoice {
  [key: string]: string;
}

export type StepStatus = 'pending' | 'running' | 'done' | 'error' | 'skipped';

export interface Step {
  key: string;
  label: string;
  status: StepStatus;
  detail: string;
}

export interface ReleaseMetadata {
  filename: string;
  size: number;
  release: string;
  asset_url: string;
}

export interface ReleaseAsset {
  name: string;
  url: string; // API URL for downloading (requires auth for private repos)
  browser_download_url: string; // Browser URL (doesn't work for private repos)
  size: number;
}

export interface ReleaseData {
  tag_name: string;
  assets: ReleaseAsset[];
  draft: boolean;
  prerelease: boolean;
}

export interface InitOptions {
  projectName?: string;
  aiAssistant?: string;
  scriptType?: string;
  ignoreAgentTools?: boolean;
  noGit?: boolean;
  here?: boolean;
  force?: boolean;
  skipTls?: boolean;
  debug?: boolean;
  githubToken?: string;
}

export interface BuildforceConfig {
  specsFolder: string;
  framework: string;
}

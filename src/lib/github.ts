import axios from "axios";
import fs from "fs-extra";
import path from "path";
import chalk from "chalk";
import ora from "ora";
import { REPO_OWNER, REPO_NAME } from "../constants.js";
import { ReleaseData, ReleaseMetadata } from "../types.js";
import { getGithubAuthHeaders } from "../utils/index.js";

/**
 * Download template from GitHub releases or use local artifact
 */
export async function downloadTemplateFromGithub(
  aiAssistant: string,
  downloadDir: string,
  options: {
    scriptType?: string;
    verbose?: boolean;
    showProgress?: boolean;
    debug?: boolean;
    githubToken?: string;
    skipTls?: boolean;
    localZipPath?: string;
  } = {}
): Promise<{ zipPath: string; metadata: ReleaseMetadata }> {
  const {
    scriptType = "sh",
    verbose = true,
    showProgress = true,
    debug = false,
    githubToken,
    skipTls = false,
    localZipPath,
  } = options;

  // If localZipPath is provided, skip GitHub download and use local artifact
  if (localZipPath) {
    if (!fs.existsSync(localZipPath)) {
      throw new Error(`Local artifact not found: ${localZipPath}`);
    }

    const stats = await fs.stat(localZipPath);
    const filename = path.basename(localZipPath);

    if (verbose) {
      console.log(chalk.cyan("Using local artifact:"), filename);
      console.log(chalk.cyan("Size:"), stats.size.toLocaleString(), "bytes");
      console.log(chalk.cyan("Source:"), "local");
    }

    const metadata: ReleaseMetadata = {
      filename,
      size: stats.size,
      release: "local",
      asset_url: localZipPath,
    };

    return { zipPath: localZipPath, metadata };
  }

  const headers = getGithubAuthHeaders(githubToken);

  const client = axios.create({
    timeout: 30000,
    headers,
    httpsAgent: skipTls
      ? new (require("https").Agent)({ rejectUnauthorized: false })
      : undefined,
  });

  if (verbose) {
    console.log(chalk.cyan("Fetching latest release information..."));
  }

  // For private repos, /releases/latest may not work reliably
  // Instead, fetch all releases and get the first non-draft, non-prerelease one
  const apiUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases`;
  let releaseData: ReleaseData;
  try {
    const response = await client.get<ReleaseData[]>(apiUrl, {
      headers,
    });

    if (response.status !== 200) {
      let msg = `GitHub API returned ${response.status} for ${apiUrl}`;
      if (debug) {
        msg += `\nResponse headers: ${JSON.stringify(
          response.headers
        )}\nBody (truncated 500): ${JSON.stringify(response.data).substring(
          0,
          500
        )}`;
      }
      throw new Error(msg);
    }

    // Get the first release that is not a draft or prerelease
    const latestRelease = response.data.find(
      (release) => !release.draft && !release.prerelease
    );

    if (!latestRelease) {
      throw new Error("No published releases found");
    }

    releaseData = latestRelease;
  } catch (e: any) {
    console.error(chalk.red("Error fetching release information"));
    console.error(e.message);
    throw e;
  }

  // Find the template asset for the specified AI assistant
  const assets = releaseData.assets || [];
  const pattern = `buildforce-cli-template-${aiAssistant}-${scriptType}`;
  const matchingAssets = assets.filter(
    (asset) => asset.name.includes(pattern) && asset.name.endsWith(".zip")
  );

  const asset = matchingAssets[0];

  if (!asset) {
    console.error(
      chalk.red("No matching release asset found") +
        ` for ${chalk.bold(aiAssistant)} (expected pattern: ${chalk.bold(
          pattern
        )})`
    );
    const assetNames = assets.map((a) => a.name).join("\n");
    console.error(chalk.yellow("Available Assets:"));
    console.error(assetNames || "(no assets)");
    throw new Error("No matching release asset found");
  }

  // For private repos, use the API URL instead of browser_download_url
  const downloadUrl = asset.url;
  const filename = asset.name;
  const fileSize = asset.size;

  if (verbose) {
    console.log(chalk.cyan("Found template:"), filename);
    console.log(chalk.cyan("Size:"), fileSize.toLocaleString(), "bytes");
    console.log(chalk.cyan("Release:"), releaseData.tag_name);
  }

  const zipPath = path.join(downloadDir, filename);

  if (verbose) {
    console.log(chalk.cyan("Downloading template..."));
  }

  const spinner = showProgress ? ora("Downloading...").start() : null;

  try {
    // For downloading release assets from private repos, we need to set Accept header
    // to application/octet-stream
    const response = await client.get(downloadUrl, {
      responseType: "stream",
      headers: {
        ...headers,
        Accept: "application/octet-stream",
      },
    });

    if (response.status !== 200) {
      throw new Error(`Download failed with ${response.status}`);
    }

    const writer = fs.createWriteStream(zipPath);
    response.data.pipe(writer);

    await new Promise<void>((resolve, reject) => {
      writer.on("finish", () => resolve());
      writer.on("error", reject);
    });

    if (spinner) {
      spinner.succeed("Download complete");
    }
  } catch (e: any) {
    if (spinner) {
      spinner.fail("Download failed");
    }
    console.error(chalk.red("Error downloading template"));
    if (fs.existsSync(zipPath)) {
      fs.unlinkSync(zipPath);
    }
    throw e;
  }

  if (verbose) {
    console.log("Downloaded:", filename);
  }

  const metadata: ReleaseMetadata = {
    filename,
    size: fileSize,
    release: releaseData.tag_name,
    asset_url: downloadUrl,
  };

  return { zipPath, metadata };
}

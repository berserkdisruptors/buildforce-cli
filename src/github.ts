import axios from "axios";
import fs from "fs-extra";
import path from "path";
import chalk from "chalk";
import ora from "ora";
import { REPO_OWNER, REPO_NAME } from "./constants.js";
import { ReleaseData, ReleaseMetadata } from "./types.js";
import { getGithubAuthHeaders } from "./utils.js";

/**
 * Download template from GitHub releases
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
  } = {}
): Promise<{ zipPath: string; metadata: ReleaseMetadata }> {
  const {
    scriptType = "sh",
    verbose = true,
    showProgress = true,
    debug = false,
    githubToken,
    skipTls = false,
  } = options;

  const client = axios.create({
    timeout: 30000,
    headers: getGithubAuthHeaders(githubToken),
    httpsAgent: skipTls
      ? new (require("https").Agent)({ rejectUnauthorized: false })
      : undefined,
  });

  if (verbose) {
    console.log(chalk.cyan("Fetching latest release information..."));
  }

  const apiUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest`;

  let releaseData: ReleaseData;
  try {
    const response = await client.get<ReleaseData>(apiUrl);

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

    releaseData = response.data;
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

  const downloadUrl = asset.browser_download_url;
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
    const response = await client.get(downloadUrl, {
      responseType: "stream",
      headers: getGithubAuthHeaders(githubToken),
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

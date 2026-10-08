import { Router } from 'express';
import JSZip from 'jszip';

export const gitRouter = Router();

// Binary file extensions to exclude or treat as binary placeholder
const BINARY_EXTENSIONS = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'ico', 'pdf', 'zip', 'tar', 'gz',
  'mp4', 'mp3', 'wav', 'ogg', 'mov', 'exe', 'dll', 'so', 'dylib', 'woff',
  'woff2', 'ttf', 'eot', 'bin', 'iso'
]);

function isBinaryFile(filePath: string): boolean {
  const ext = filePath.split('.').pop()?.toLowerCase();
  return ext ? BINARY_EXTENSIONS.has(ext) : false;
}

gitRouter.post('/clone-repo', async (req, res) => {
  const { owner, repo, branch, token } = req.body || {};

  if (!owner || !repo) {
    return res.status(400).json({
      success: false,
      message: 'fatal: owner and repository name are required',
    });
  }

  const cleanOwner = String(owner).trim();
  const cleanRepo = String(repo).trim().replace(/\.git$/, '');
  const targetBranch = branch ? String(branch).trim() : '';

  try {
    const headers: Record<string, string> = {
      'User-Agent': 'Kollab-IDE',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Try codeload zip URL (HEAD or specified branch)
    const zipUrl = targetBranch
      ? `https://codeload.github.com/${cleanOwner}/${cleanRepo}/zip/refs/heads/${targetBranch}`
      : `https://codeload.github.com/${cleanOwner}/${cleanRepo}/zip/HEAD`;

    let zipRes = await fetch(zipUrl, { headers });

    // If branch failed or 404, fallback to HEAD
    if (!zipRes.ok && targetBranch) {
      zipRes = await fetch(`https://codeload.github.com/${cleanOwner}/${cleanRepo}/zip/HEAD`, { headers });
    }

    if (!zipRes.ok) {
      if (zipRes.status === 404 || zipRes.status === 401 || zipRes.status === 403) {
        return res.status(zipRes.status).json({
          success: false,
          message: `fatal: could not access GitHub repository ${cleanOwner}/${cleanRepo} (${zipRes.status}). If this repository is private, please authenticate using: git config github.token <YOUR_TOKEN>`,
        });
      }
      return res.status(zipRes.status).json({
        success: false,
        message: `fatal: GitHub returned error status ${zipRes.status} (${zipRes.statusText || 'Error'})`,
      });
    }

    const arrayBuffer = await zipRes.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);

    const rawDirectories = new Set<string>();
    const rawFiles: { path: string; content: string }[] = [];

    const entries = Object.values(zip.files);

    for (const entry of entries) {
      // GitHub ZIP entries have format: "<repo>-<branch>/sub/path"
      const slashIndex = entry.name.indexOf('/');
      if (slashIndex === -1) continue; // Skip root folder container

      const relPath = entry.name.substring(slashIndex + 1);
      if (!relPath || relPath.startsWith('.git/')) continue; // Ignore empty and git internals

      if (entry.dir) {
        const cleanDir = relPath.replace(/\/$/, '');
        if (cleanDir) rawDirectories.add(cleanDir);
      } else {
        // Collect parent directory hierarchy
        const parts = relPath.split('/');
        for (let i = 1; i < parts.length; i++) {
          rawDirectories.add(parts.slice(0, i).join('/'));
        }

        let content = '';
        if (isBinaryFile(relPath)) {
          content = `// [Binary file: ${relPath}]`;
        } else {
          try {
            content = await entry.async('string');
          } catch {
            content = '// [Unable to decode file content]';
          }
        }

        rawFiles.push({ path: relPath, content });
      }
    }

    return res.json({
      success: true,
      owner: cleanOwner,
      repo: cleanRepo,
      defaultBranch: targetBranch || 'main',
      directories: Array.from(rawDirectories),
      files: rawFiles,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: `fatal: network error cloning from GitHub: ${error.message}`,
    });
  }
});

import { createHmac, randomUUID } from 'node:crypto';
import { constants, type BigIntStats } from 'node:fs';
import { open, rename, unlink, type FileHandle } from 'node:fs/promises';
import path from 'node:path';

import { policyFail, policyFailFromFsError, policyOk, type PolicyResult } from './policy-result';
import { parseWorkspaceRelativePath } from './relative-path';
import { resolveWorkspacePath, revalidateResolvedPath } from './resolve-path';
import {
  MAX_DISPLAY_BYTES,
  SAFE_OPEN_FLAGS,
  matchesFileVersion,
  matchesRegularFile,
  readResolvedTextSnapshot,
  type VerifiedTextFile,
  type VerifiedTextSnapshot,
} from './verified-read';
import { sameIdentity, type FileIdentity, type WorkspaceRoot } from './workspace-root';
import { checkWriteProtection } from './write-protection';

const UTF8_BOM = Buffer.from([0xef, 0xbb, 0xbf]);
const STAGING_FLAGS = constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | SAFE_OPEN_FLAGS;

export interface RevisionedTextFile extends VerifiedTextFile {
  readonly revision: string;
}

/** Scoped to one workspace opening; links cannot supply a revision for a canonical write. */
export function revisionForSnapshot(key: Buffer, file: VerifiedTextSnapshot): string {
  return revisionForBytes(
    key,
    file.relativePath,
    file.resolved.identity,
    file.bytes,
    file.resolved.followedLink,
  );
}

export function hasWritableMode(stats: BigIntStats): boolean {
  // Atomic replacement must not bypass a read-only mode or propagate special mode bits.
  return stats.ino !== 0n && (stats.mode & 0o222n) !== 0n && (stats.mode & 0o7000n) === 0n;
}

/** Saves only an existing verified UTF-8 file, with an atomic replacement on the same volume. */
export async function saveVerifiedTextFile(
  root: WorkspaceRoot,
  revisionKey: Buffer,
  input: string,
  content: string,
  expectedRevision: string,
): Promise<PolicyResult<RevisionedTextFile>> {
  const target = await resolveWorkspacePath(root, input, 'write');
  if (!target.ok) return target;
  const protection = await checkWriteProtection(root, target.value.relativePath);
  if (!protection.ok) return protection;
  if (root.identity.ino === 0n) return policyFail('READ_ONLY');

  const original = await readResolvedTextSnapshot(target.value, MAX_DISPLAY_BYTES, 'write');
  if (!original.ok) return original;
  if (!hasWritableMode(original.value.stats)) return policyFail('READ_ONLY');
  if (revisionForSnapshot(revisionKey, original.value) !== expectedRevision) {
    return policyFail('TARGET_CHANGED');
  }

  const encoded = encodeReplacement(original.value, content);
  if (!encoded.ok) return encoded;
  const { text, bytes } = encoded.value;
  const relativePath = target.value.relativePath;
  if (bytes.equals(original.value.bytes)) {
    return policyOk({
      relativePath,
      content: text,
      sizeBytes: bytes.length,
      revision: expectedRevision,
    });
  }
  const replacement = await replaceFile(root, original.value, bytes);
  if (!replacement.ok) return replacement;
  return policyOk({
    relativePath,
    content: text,
    sizeBytes: bytes.length,
    revision: revisionForBytes(revisionKey, relativePath, replacement.value, bytes, false),
  });
}

function revisionForBytes(
  key: Buffer,
  relativePath: string,
  identity: FileIdentity,
  bytes: Uint8Array,
  followedLink: boolean,
): string {
  return createHmac('sha256', key)
    .update(
      JSON.stringify([
        relativePath,
        identity.dev.toString(),
        identity.ino.toString(),
        followedLink,
      ]),
    )
    .update(bytes)
    .digest('hex');
}

function encodeReplacement(
  original: VerifiedTextSnapshot,
  input: string,
): PolicyResult<{ readonly text: string; readonly bytes: Buffer }> {
  if (input.length > MAX_DISPLAY_BYTES) return policyFail('FILE_TOO_LARGE');
  // Buffer encodes unpaired surrogates as replacement characters; refuse that loss of data.
  if (input.includes('\0') || /[\uD800-\uDFFF]/u.test(input))
    return policyFail('UNSUPPORTED_ENCODING');
  const hasBom = original.bytes.subarray(0, UTF8_BOM.length).equals(UTF8_BOM);
  // A leading U+FEFF in a BOM-free file would be read back as a newly inserted BOM.
  if (!hasBom && input.startsWith('\uFEFF')) return policyFail('UNSUPPORTED_ENCODING');
  const usesCrlf =
    original.content.includes('\r\n') && !/(?:^|[^\r])\n|\r(?!\n)/.test(original.content);
  const text = usesCrlf ? input.replace(/\r\n|[\r\n]/g, '\r\n') : input;
  const size = Buffer.byteLength(text, 'utf8') + (hasBom ? UTF8_BOM.length : 0);
  if (size > MAX_DISPLAY_BYTES) return policyFail('FILE_TOO_LARGE');
  const bytes = hasBom
    ? Buffer.concat([UTF8_BOM, Buffer.from(text, 'utf8')], size)
    : Buffer.from(text, 'utf8');
  return policyOk({ text, bytes });
}

async function replaceFile(
  root: WorkspaceRoot,
  original: VerifiedTextSnapshot,
  bytes: Buffer,
): Promise<PolicyResult<FileIdentity>> {
  const target = original.resolved;
  const name = `.agentide-save-${randomUUID()}`;
  const tempPath = path.join(path.dirname(target.canonicalPath), name);
  const tempRelative = path.posix.join(path.posix.dirname(target.relativePath), name);
  const tempRequest = parseWorkspaceRelativePath(tempRelative);
  if (!tempRequest.ok) return tempRequest;
  let handle: FileHandle | undefined;
  let identity: FileIdentity | undefined;
  let committed = false;

  try {
    const beforeStage = await revalidateResolvedPath(root, target);
    if (!beforeStage.ok) return beforeStage;
    if (!matchesFileVersion(original.stats, beforeStage.value)) return policyFail('TARGET_CHANGED');

    // Exclusive creation cannot follow or truncate an existing entry. Check where the opened
    // file actually landed before writing any user bytes to it.
    handle = await open(tempPath, STAGING_FLAGS, 0o600);
    const created = await handle.stat({ bigint: true });
    if (!created.isFile() || created.nlink !== 1n || created.ino === 0n)
      return policyFail('TARGET_CHANGED');
    identity = { dev: created.dev, ino: created.ino };
    if (created.dev !== original.stats.dev) return policyFail('IO_ERROR');
    const staged = await resolveWorkspacePath(root, tempRelative, 'write');
    if (!staged.ok) return staged;
    if (staged.value.canonicalPath !== tempPath || !sameIdentity(identity, staged.value.identity)) {
      return policyFail('TARGET_CHANGED');
    }

    const { uid, gid, mode } = original.stats;
    await handle.writeFile(bytes);
    if (process.platform !== 'win32') {
      if (created.uid !== uid || created.gid !== gid) await handle.chown(Number(uid), Number(gid));
      await handle.chmod(Number(mode & 0o777n));
    }
    await handle.sync();
    const stageStats = await handle.stat({ bigint: true });
    if (!matchesRegularFile(stageStats, identity) || stageStats.size !== BigInt(bytes.length)) {
      return policyFail('TARGET_CHANGED');
    }
    if (
      process.platform !== 'win32' &&
      (stageStats.uid !== uid ||
        stageStats.gid !== gid ||
        (stageStats.mode & 0o777n) !== (mode & 0o777n))
    ) {
      return policyFail('IO_ERROR');
    }
    await handle.close();
    handle = undefined;

    const protection = await checkWriteProtection(root, target.relativePath);
    if (!protection.ok) return protection;
    const stageCurrent = await revalidateResolvedPath(root, staged.value);
    if (!stageCurrent.ok) return stageCurrent;
    // Reopen after closing the write handle: Windows can defer last-write times until close.
    const stagedText = await readResolvedTextSnapshot(stageCurrent.value);
    if (!stagedText.ok) return stagedText;
    if (!stagedText.value.bytes.equals(bytes)) return policyFail('TARGET_CHANGED');

    const current = await revalidateResolvedPath(root, target);
    if (!current.ok) return current;
    if (!matchesFileVersion(original.stats, current.value)) return policyFail('TARGET_CHANGED');
    const latest = await readResolvedTextSnapshot(current.value, MAX_DISPLAY_BYTES, 'write');
    if (!latest.ok) return latest;
    if (
      !latest.value.bytes.equals(original.bytes) ||
      !matchesFileVersion(latest.value.stats, current.value)
    ) {
      return policyFail('TARGET_CHANGED');
    }
    const beforeCommit = await revalidateResolvedPath(root, current.value);
    if (!beforeCommit.ok) return beforeCommit;
    if (!matchesFileVersion(latest.value.stats, beforeCommit.value))
      return policyFail('TARGET_CHANGED');

    await rename(tempPath, target.canonicalPath);
    committed = true;
    return policyOk(identity);
  } catch (error) {
    return policyFailFromFsError(error);
  } finally {
    await handle?.close().catch(() => undefined);
    if (!committed && identity !== undefined) {
      // A changed parent/name is no longer ours to clean up. Never unlink an unverified path.
      const leftover = await resolveWorkspacePath(root, tempRelative, 'write');
      if (
        leftover.ok &&
        leftover.value.canonicalPath === tempPath &&
        sameIdentity(identity, leftover.value.identity)
      ) {
        await unlink(tempPath).catch(() => undefined);
      }
    }
  }
}

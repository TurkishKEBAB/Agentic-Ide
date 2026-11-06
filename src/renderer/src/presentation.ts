import type { IpcErrorCode } from '../../shared/ipc-contract';

const LANGUAGE_BY_EXTENSION: Readonly<Record<string, string>> = {
  ts: 'typescript',
  tsx: 'typescript',
  mts: 'typescript',
  cts: 'typescript',
  js: 'javascript',
  jsx: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  json: 'json',
  css: 'css',
  scss: 'scss',
  less: 'less',
  html: 'html',
  htm: 'html',
  md: 'markdown',
  yml: 'yaml',
  yaml: 'yaml',
  xml: 'xml',
  py: 'python',
  ps1: 'powershell',
  sh: 'shell',
};

/** Monaco language id for a workspace-relative path (plaintext when unknown). */
export function languageForPath(relativePath: string): string {
  const name = relativePath.slice(relativePath.lastIndexOf('/') + 1);
  const dot = name.lastIndexOf('.');
  if (dot <= 0) {
    return 'plaintext';
  }
  return LANGUAGE_BY_EXTENSION[name.slice(dot + 1).toLowerCase()] ?? 'plaintext';
}

const MESSAGES: Readonly<Record<IpcErrorCode, string>> = {
  NO_WORKSPACE: 'Önce bir çalışma klasörü açın.',
  INVALID_REQUEST: 'İstek geçersiz.',
  UNAUTHORIZED_SENDER: 'Bu çağrıya izin verilmiyor.',
  INTERNAL: 'Beklenmeyen bir hata oluştu.',
  INVALID_INPUT: 'Yol boş, çok uzun veya kontrol karakteri içeriyor.',
  ABSOLUTE_PATH: 'Yalnızca çalışma klasörüne göre göreli yollar kabul edilir.',
  TRAVERSAL: 'Üst dizine (..) çıkılamaz.',
  ENCODED_TRAVERSAL: 'Kodlanmış (%xx) yol söz dizimi kabul edilmez.',
  INVALID_SEGMENT: 'Yol, ayrılmış veya belirsiz bir dosya adı içeriyor.',
  OUTSIDE_WORKSPACE: 'Yol çalışma klasörünün dışına çıkıyor.',
  LINK_ESCAPE: 'Bağlantı (symlink/junction) çalışma klasörünün dışını gösteriyor.',
  LINK_NOT_ALLOWED: 'Bu işlem için bağlantılar izlenmez.',
  HARDLINK_UNSUPPORTED: 'Birden fazla hard link’i olan dosyalar desteklenmiyor.',
  UNSUPPORTED_FILE_TYPE: 'Bu dosya türü bu işlem için desteklenmiyor.',
  NON_CANONICAL_PATH: 'Yol, dosyanın gerçek adıyla eşleşmiyor.',
  NOT_FOUND: 'Dosya bulunamadı.',
  TARGET_CHANGED: 'Dosya doğrulama sırasında değişti; tekrar deneyin.',
  ROOT_UNSUPPORTED: 'Bu klasör çalışma alanı olarak kullanılamaz.',
  ROOT_CHANGED: 'Çalışma klasörü açıldıktan sonra değişti; yeniden açın.',
  FILE_TOO_LARGE: 'Dosya görüntülemek için çok büyük (en fazla 1 MiB).',
  UNSUPPORTED_ENCODING: 'Yalnızca UTF-8 metin dosyaları görüntülenebilir.',
  IO_ERROR: 'Dosya sistemi işlemi başarısız oldu.',
};

/** User-facing Turkish message for a broker error code. */
export function messageForError(code: IpcErrorCode): string {
  return MESSAGES[code];
}

/** Indentation depth of a workspace-relative path in the file tree. */
export function depthOf(relativePath: string): number {
  return relativePath.split('/').length - 1;
}

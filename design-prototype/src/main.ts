import '@fontsource-variable/inter';
import '@fontsource/jetbrains-mono/latin-400.css';
import '@fontsource/jetbrains-mono/latin-ext-400.css';
import './style.css';
import './tutorial.css';
import { button, escapeHtml, fileName, icon, iconButton, select } from './markup.ts';
import { defaultWorkset, paths, WORKSET_LIMIT, type Files } from './project.ts';
import { commands, matchingFiles, mountCommand } from './command.ts';
import { exampleRequest, modelLabels, WorkspaceState, type ModelId } from './state.ts';
import type { mountEditor } from './editor.ts';
import { documentationRequest, planChanges, type GroupId, type PlanVariant } from './plan.ts';
import { conflictView, historyIntent, historyList, historyStrip, setReceipt, snapshotBar, type Snapshot } from './history-view.ts';
import { safetyView } from './safety-view.ts';
import { remaining, reviewView, type DiffMode } from './review.ts';
import { riskView, visionDetail, visionOverview, visionPanel, type VisionCard } from './vision.ts';
import { intentView, planDetail, planPanel, proposalView, requestDetail, sourceDetail, sourcePanel, sourcePreview, workflowView } from './views.ts';
import { pickerRows, type Entry } from './file-picker.ts';
import { captureFocus } from './focus-return.ts';
import { NativeFiles, type NativeWorkspaceApi } from './native-files.ts';
import { FirstTaskTutorial, laterPracticeComment, practiceComment, type TutorialEvent } from './tutorial.ts';
import { tutorialCard } from './tutorial-view.ts';

const app = select<HTMLDivElement>('#app');
app.innerHTML = `
  <a class="skip-link" href="#main">Çalışma alanına geç</a>
  <header class="topbar">
    <div class="brand"><img src="./mark.svg" width="36" height="36" alt="" /> <span>Agentic IDE</span></div>
    <span class="tag prototype-tag" id="workspace-mode"></span>
    <div class="header-workspace" id="workspace"></div>
    <nav class="view-tabs" id="view-tabs" aria-label="Görünüm"></nav>
    <div class="header-actions" id="header-actions"></div>
  </header>
  <main class="scroll-area" id="main" tabindex="-1">
    <div class="page">
      <div id="intro"></div>
      <div id="work-view" hidden>
        <section class="intent" id="intent"></section>
        <div id="workflow"></div>
        <div class="layout">
          <section class="flow" aria-labelledby="flow-title">
            <div class="flow-bar">
              <div class="section-heading" id="flow-heading"></div>
              <div class="workset" id="workset" role="group" aria-label="Çalışma seti"></div>
            </div>
            <article class="code-card">
              <div id="editor-head"></div>
              <div class="editor-surface">
                <div id="editor-host" class="editor-host" role="group" aria-label="Kod alanı"><span class="editor-loading" role="status">Monaco yükleniyor…</span></div>
                <div id="editor-placeholder" class="editor-placeholder" hidden></div>
              </div>
              <div id="proposal"></div>
              <div id="editor-foot"></div>
            </article>
            <div id="previews" class="previews"></div>
          </section>
          <aside class="editor-aside" id="editor-aside"><div id="tutorial-home"></div><div class="side-stack" id="side-stack"></div></aside>
        </div>
      </div>
    </div>
  </main>
  <footer class="dock">
    <div class="dock-inner">
      <form class="command" id="command" aria-label="Tek giriş satırı">
        <span class="command-icon">${icon('terminal', 21)}</span>
        <input id="command-input" role="combobox" aria-controls="command-matches" aria-expanded="false" aria-autocomplete="list" aria-label="Komut, dosya araması veya ajan isteği" disabled placeholder="Önce bir çalışma alanı aç…" autocomplete="off" spellcheck="false" />
        <kbd>Ctrl K</kbd>
        <button type="submit" class="button primary" id="send" disabled>Gönder ${icon('arrow')}</button>
        <div id="command-matches" class="command-matches" role="listbox" aria-label="Giriş satırı önerileri" hidden></div>
      </form>
      <div class="history-row">
        <div class="history-label">${icon('history', 16)} <span>Geçmiş</span></div>
        <div class="history-track" id="history"><span class="quiet">Henüz bir değişiklik seti yok.</span></div>
        <div id="demo"></div>
      </div>
    </div>
  </footer>
  <dialog id="sheet" aria-labelledby="sheet-title"></dialog>
  <div id="live" class="sr-only" role="status" aria-live="polite"></div>
`;

const dialog = select<HTMLDialogElement>('#sheet');
const intro = select('#intro');
const state = new WorkspaceState();
const nativeApi = (window as Window & { agentIde?: NativeWorkspaceApi }).agentIde;
const native = nativeApi ? new NativeFiles(nativeApi) : null;
const tutorial = new FirstTaskTutorial();
const coachHost = document.createElement('div');
coachHost.id = 'tutorial-coach';
let workspaceMode: 'practice' | 'local' = 'practice';
let view: 'editor' | 'intent' = 'editor';
let practiceSaved: Files = { ...state.files };
let localView = { activePath: '', workset: [] as string[] };
let practiceView = { activePath: '', workset: [] as string[], view: 'editor' as 'editor' | 'intent' };
let requestGeneration = 0;
let pendingFile = '';
let workspaceMessage = '';
let returnSheetFocus: (() => void) | null = null;
let tutorialMessage = '';
let exercise: { kind: 'expiry' | 'conflict'; stage: number } | null = null;
let light = false;
let demoStep = 1;
let sheetKind = '';
let reviewMode: DiffMode = 'split';
let reviewPath = '';
let snapshot: Snapshot | null = null;
let riskHigh = false;
let riskConfirmed = false;
const riskChecked = new Set<string>();
const demoLabels = [
  'Açılış ve çalışma alanı', 'Gezinme ve elle düzenleme', 'Tek giriş satırından istek',
  'Plan ve bağlam', 'Diff ve grup onayı', 'Güvenlik uyarıları',
  'Uygulama, geçmiş ve geri alma', 'Vizyon katmanı',
];
const commandInput = select<HTMLInputElement>('#command-input');
const commandControl = mountCommand(select('#command'), commandInput, select('#command-matches'), commandFiles, runCommand);
let activePath = '';
let workset: string[] = [];
let codeEditor: ReturnType<typeof mountEditor> | undefined;
let editorLoading: Promise<void> | undefined;

function announce(message: string): void {
  select('#live').textContent = message;
}

function snapshotSet() {
  return state.history.find(set => set.id === snapshot?.id);
}

function snapshotFrame() {
  return snapshot ? snapshotSet()?.frames[snapshot.frame] : undefined;
}

function visibleFiles() {
  if (workspaceMode === 'local') return native?.files ?? {};
  return snapshot ? (snapshotFrame()?.files ?? state.initialFiles) : state.files;
}

function workspaceOpen(): boolean {
  return workspaceMode === 'local' ? Boolean(native?.name) : state.open;
}

function entries(): readonly Entry[] {
  return workspaceMode === 'local'
    ? native?.entries ?? []
    : Object.keys(visibleFiles()).map(path => ({ path, kind: 'file' }));
}

function commandFiles(): Files {
  if (workspaceMode === 'practice') return visibleFiles();
  return Object.fromEntries(entries().filter(entry => entry.kind === 'file')
    .map(entry => [entry.path, native?.files[entry.path] ?? '']));
}

function mixedEndings(path: string): boolean {
  const endings: string[] = native?.metadata(path)?.content.match(/\r\n|\r|\n/g) ?? [];
  return endings.includes('\r') || (endings.includes('\r\n') && endings.includes('\n'));
}

function canEdit(path: string): boolean {
  if (!path || snapshot) return false;
  return workspaceMode === 'local' ? Boolean(native?.writable(path) && !mixedEndings(path)) : path !== paths.env;
}

function dirty(path: string): boolean {
  if (workspaceMode === 'local') return native?.dirtyPaths().includes(path) ?? false;
  return !snapshot && Object.hasOwn(state.files, path) && state.files[path] !== practiceSaved[path];
}

function syncEditor(): void {
  if (workspaceOpen()) codeEditor?.sync(visibleFiles(), activePath, snapshot ? 'snapshot' : workspaceMode, !canEdit(activePath));
}

function bootEditor(): Promise<void> {
  editorLoading ??= import('./editor.ts').then(({ mountEditor: mount }) => {
    const host = select('#editor-host');
    host.replaceChildren();
    codeEditor = mount(host, (path, text) => {
      if (!canEdit(path)) return;
      const changed = workspaceMode === 'local' ? native?.edit(path, text) : state.edit(path, text);
      if (!changed) return;
      renderEditorHead();
      renderWorkset();
      renderPlanPanels();
      renderAgentStatus();
      renderTutorial();
    });
    codeEditor.theme(light);
    syncEditor();
  });
  return editorLoading;
}

async function openFile(path: string, line?: number, focus = true): Promise<void> {
  const generation = ++requestGeneration;
  if (!workspaceOpen() || !entries().some(entry => entry.path === path && entry.kind === 'file')) return;
  if (!workset.includes(path)) {
    if (workset.length >= WORKSET_LIMIT) {
      pendingFile = path;
      showSheet('Çalışma seti dolu', `<p class="sheet-intro"><code>${escapeHtml(path)}</code> dosyasını açmak için kapatacağın dosyayı seç.</p><div class="file-list">${workset.map(open => button('replace-file', `${escapeHtml(open)}${dirty(open) ? ' · Kaydedilmedi' : ''}`, { value: open, glyph: 'close', className: 'ghost' })).join('')}</div>`);
      return;
    }
  }
  if (workspaceMode === 'local' && native) {
    const result = await native.open(path);
    if (generation !== requestGeneration || workspaceMode !== 'local') return;
    if (!result.ok) return showWorkspaceError(result.error.code, 'Dosya açılamadı');
  }
  if (!workset.includes(path)) workset.push(path);
  activePath = path;
  workspaceMessage = '';
  renderWorkView();
  if (workspaceMode === 'practice' && !snapshot && path === paths.session) observeTutorial('file-opened');
  if (focus || line) {
    await bootEditor();
    if (generation === requestGeneration && !dialog.open) codeEditor?.focus(line);
  }
}

function renderEditorHead(): void {
  const locked = !canEdit(activePath);
  const localStatus = workspaceMode === 'local' ? native?.status(activePath) : null;
  const status = snapshot ? 'Geçmiş · Salt okunur'
    : localStatus === 'saving' ? 'Kaydediliyor…'
    : localStatus === 'conflict' ? 'Disk sürümü değişti'
    : activePath && locked ? (workspaceMode === 'local' && mixedEndings(activePath) ? 'Karışık satır sonu · Salt okunur' : 'Salt okunur')
    : dirty(activePath) ? 'Kaydedilmedi' : activePath ? 'Kaydedildi' : 'Dosya seçilmedi';
  select('#editor-head').innerHTML = `<header class="editor-head">
    <div class="editor-file"><span class="ts-mark">${/\.tsx?$/i.test(activePath) ? 'TS' : icon(locked && activePath ? 'lock' : 'file', 14)}</span><code data-testid="file-path">${escapeHtml(activePath || 'Editör')}</code></div>
    <div class="editor-actions">
      <span class="mode-pill ${dirty(activePath) ? 'manual' : ''}">${icon(locked ? 'lock' : 'pen', 13)} ${status}</span>
      ${workspaceMode === 'local' && activePath ? iconButton('reload-file', 'Dosyayı yeniden yükle', 'history') : ''}
      ${button('save-file', 'Kaydet', { glyph: 'check', disabled: locked || localStatus === 'saving', className: 'ghost editor-save' })}
    </div>
  </header>${view === 'intent' && !snapshot && state.plan?.sources.some(source => source.path === activePath) ? `<div class="editor-why"><span>NEDEN BURADA</span> ${escapeHtml(state.plan.sources.find(source => source.path === activePath)!.reason)}</div>` : ''}`;
}

function renderWorkset(): void {
  select('#workset').innerHTML = `<span class="workset-label">Çalışma seti <b>${workset.length}/${WORKSET_LIMIT}</b></span>` + workset.map(path =>
    `<span class="file-chip ${path === activePath ? 'active' : ''} ${dirty(path) ? 'dirty' : ''}"><button type="button" data-act="open-file" data-value="${escapeHtml(path)}" aria-pressed="${path === activePath}" title="${escapeHtml(path)}${dirty(path) ? ' · Kaydedilmedi' : ''}"><span class="dot"></span>${escapeHtml(fileName(path))}</button>${iconButton('close-file', `${fileName(path)} dosyasını kapat`, 'close', path)}</span>`,
  ).join('') + button('file-picker', 'Dosya aç', { glyph: 'plus', className: 'ghost workset-open' })
    + iconButton('file-tree', 'Klasör ağacı', 'folder');
}

function renderWorkView(): void {
  const open = workspaceOpen();
  const workView = select('#work-view');
  workView.hidden = !open;
  workView.dataset.view = snapshot ? 'intent' : view;
  select('#main').dataset.editor = String(open && view === 'editor' && !snapshot);
  intro.hidden = open;
  if (!open) return;
  renderWorkspaceCrumb();
  renderViewTabs();
  const set = snapshotSet();
  select('#intent').innerHTML = snapshot ? historyIntent(set, snapshotFrame()) : intentView(state.plan);
  select('#workflow').innerHTML = snapshot ? snapshotBar(set, snapshot.frame, !!set && state.canRollback(set.id))
    : state.plan ? workflowView(state.plan, state.completed || state.approval || demoStep === 7 ? 4 : demoStep === 6 ? 3 : demoStep === 5 ? 2 : 1) : '';
  select('#flow-heading').innerHTML = `<h2 id="flow-title">${view === 'editor' && !snapshot ? 'Editör' : 'Kod akışı'}</h2>`;
  renderWorkset();
  renderEditorHead();
  const placeholder = select('#editor-placeholder');
  placeholder.hidden = Boolean(activePath);
  placeholder.innerHTML = activePath ? '' : `<span class="tile-icon">${icon('code', 22)}</span><h3>Bir dosya aç</h3><p>Çalışma alanından bir dosya seç ve editörde başla.</p>${button('file-picker', 'Dosya seç', { glyph: 'file', className: 'ghost' })}<kbd>Ctrl P</kbd>`;
  select('#editor-foot').innerHTML = `<div class="editor-foot"><span data-testid="status">${escapeHtml(workspaceMessage || (workspaceMode === 'local' ? 'Yerel çalışma alanı' : 'Deneme projesi · Bellek içi'))}</span><span>${icon('keyboard', 15)} Ctrl S <i></i> UTF-8 <i></i> ${/\.tsx?$/i.test(activePath) ? 'TypeScript' : 'Düz metin'}</span></div>`;
  renderPlanPanels();
  syncEditor();
  renderTutorial();
  void bootEditor();
}

function renderPlanPanels(): void {
  if (workspaceMode === 'local' || (view === 'editor' && !snapshot)) {
    select('#previews').innerHTML = '';
    select('#proposal').innerHTML = '';
    select('#side-stack').innerHTML = '';
    return;
  }
  const plan = snapshot ? null : state.plan;
  const sources = plan?.sources;
  const set = state.currentSet;
  select('#previews').innerHTML = sources ? sources.filter(source => source.path !== activePath).map(sourcePreview).join('') : '';
  const applied = !!set?.applied && set.reverted === undefined;
  const change = plan && (applied ? set?.applied?.changes : state.completed ? [] : planChanges(plan))?.find(item => item.path === activePath);
  select('#proposal').innerHTML = change && plan && !state.planStale && activePath !== paths.env ? proposalView(change, plan.revision, applied) : '';
  select('#side-stack').innerHTML = snapshot
    ? `<section class="panel idle-panel"><span class="tile-icon">${icon('history', 22)}</span><h2>Geçmiş kaydı</h2><p class="lede">Bu kod, seçili adımın salt okunur görüntüsüdür.</p>${button('return-live', 'Canlı çalışma alanına dön', { className: 'ghost', suffix: 'arrow' })}</section>`
    : plan
    ? (set?.applied ? setReceipt(set, state.canRollback(set.id)) + visionPanel() : planPanel(plan, state)) + sourcePanel(plan.sources)
    : `<section class="panel idle-panel"><span class="tile-icon">${icon('spark', 22)}</span><h2>İstek bekleniyor</h2><p class="lede">Plan, kaynak satırları ve yazma kararı bir istekten sonra burada görünür.</p>${button('example', 'Örnek isteği kullan', { className: 'ghost', suffix: 'arrow' })}</section>`;
}

function chooseFile(tree = false): void {
  if (!workspaceOpen()) return;
  showSheet(tree ? 'Klasör ağacı' : 'Dosya aç', `<label class="picker-label" for="picker-search">Dosya adı veya yolu</label>
    <input id="picker-search" class="picker-search" autocomplete="off" placeholder="Dosya ara…" />
    <div id="file-tree" data-testid="file-tree" data-tree="${tree}" class="file-picker">${pickerRows(entries(), '', tree)}</div>`, 'files');
  select('#picker-search').focus();
}

function focusEditor(): void {
  if (codeEditor && activePath) codeEditor.focus();
  else select('#main').focus();
}

function showSheet(title: string, body: string, kind = '', restore?: () => void): void {
  if (!dialog.open) returnSheetFocus = restore ?? captureFocus(focusEditor);
  sheetKind = kind;
  dialog.className = kind ? `sheet-${kind}` : '';
  dialog.innerHTML = `<header class="sheet-head"><div><h2 id="sheet-title">${escapeHtml(title)}</h2>${workspaceOpen() ? `<p class="sheet-context">${escapeHtml(activePath || 'Çalışma alanı')} · ${agentStatus()}</p>` : ''}</div>${iconButton('close-sheet', 'Pencereyi kapat', 'close')}</header><div class="sheet-body">${body}</div>`;
  if (!dialog.open) dialog.showModal();
  else dialog.querySelector<HTMLElement>('[data-act="close-sheet"]')?.focus();
  renderTutorial();
}

dialog.addEventListener('close', () => {
  if (dialog.open) return;
  const restore = returnSheetFocus;
  returnSheetFocus = null;
  renderTutorial();
  if (document.activeElement === document.body || !document.activeElement?.isConnected) restore?.();
});

function renderViewTabs(): void {
  const editor = !snapshot && view === 'editor';
  select('#view-tabs').innerHTML = workspaceOpen() && workspaceMode === 'practice' && state.plan
    ? `<button type="button" data-act="view-editor" aria-pressed="${editor}">${icon('code', 15)} Editör</button>
       <button type="button" data-act="view-intent" aria-pressed="${!editor}">${icon('target', 15)} Niyet</button>`
    : '';
}

function render(): void {
  const open = workspaceOpen();
  renderWorkspaceCrumb();
  renderViewTabs();
  select('#workspace-mode').innerHTML = `<span class="dot"></span> ${workspaceMode === 'local' ? 'Masaüstü' : open ? 'Deneme' : native ? 'Masaüstü' : 'Önizleme'}`;
  select('#header-actions').innerHTML = `<span class="agent-state" id="agent-status"></span>
    ${workspaceMode === 'practice' && native?.name ? button('return-local', 'Yerel projeye dön', { glyph: 'folder', className: 'ghost' }) : ''}
    ${workspaceMode === 'practice' && open ? button('model', state.model === 'local' ? 'Yerel model' : 'Bulut modeli', { glyph: state.model === 'local' ? 'chip' : 'cloud', suffix: 'chevron', className: 'model-button ghost' }) : ''}
    ${button('help', 'Yardım', { glyph: 'note', className: 'ghost help-button' })}
    ${iconButton('theme', light ? 'Koyu temaya geç' : 'Açık temaya geç', light ? 'moon' : 'sun')}`;
  renderAgentStatus();
  const input = commandInput;
  input.disabled = !open;
  input.placeholder = open ? (workspaceMode === 'local' ? '@dosya ara veya /komut çalıştır…' : 'Bir istek yaz, @dosya ara veya /komut çalıştır…') : 'Önce bir çalışma alanı aç…';
  select<HTMLButtonElement>('#send').disabled = !open;
  intro.innerHTML = open ? '' : `
    <section class="welcome">
      <div class="welcome-copy">
        <p class="eyebrow">${icon('spark')} AGENTIC IDE</p>
        <h1>Çalışma alanını aç.</h1>
        <p class="lede">İlk Görev ile bir dosya açmayı, ajan önerisini incelemeyi ve değişikliği güvenle geri almayı dene.</p>
        <div class="welcome-actions">
          ${button('tutorial-start', 'İlk Göreve başla', { glyph: 'target', suffix: 'arrow', className: 'primary' })}
          ${native ? '<button type="button" class="button ghost" data-act="workspace" data-testid="open-folder">' + icon('folder') + '<span>Klasör aç</span></button>'
            : button('open-workspace', 'Deneme projesini aç', { glyph: 'folder', className: 'ghost' })}
        </div>
        <p class="welcome-foot">${icon('shield')} Eğitim için ayrı örnek proje</p>
      </div>
      <div class="welcome-graphic" aria-hidden="true">
        <div class="graphic-center">${icon('layers', 64)}</div>
        <div class="graphic-node top">${icon('target')} <span>İSTEK</span></div>
        <div class="graphic-node left">${icon('diff')} <span>İNCELEME</span></div>
        <div class="graphic-node right">${icon('check')} <span>KARAR</span></div>
        <div class="graphic-grid"></div>
      </div>
    </section>`;
  renderWorkView();
  renderDock();
}

function agentStatus(): string {
  if (workspaceMode === 'local') return 'Yerel düzenleme';
  if (snapshot) return 'Geçmiş görüntüleniyor';
  if (state.approval) return 'Uygulama bekliyor';
  if (state.planStale) return 'Plan güncelliğini yitirdi';
  return state.plan && !state.completed ? 'İnceleme bekliyor' : 'Ajan hazır';
}

function renderAgentStatus(): void {
  select('#agent-status').innerHTML = `<span class="dot"></span> ${agentStatus()}`;
  const context = dialog.querySelector('.sheet-context');
  if (context) context.textContent = `${activePath} · ${agentStatus()}`;
}

function renderWorkspaceCrumb(): void {
  const name = workspaceMode === 'local' ? native?.name : state.open ? 'auth-lab' : '';
  select('#workspace').innerHTML = workspaceOpen()
    ? button('workspace', native ? 'Klasör aç' : 'Çalışma alanı', { glyph: 'folder', className: 'workspace-button' })
      + `<span class="workspace-name" data-testid="workspace-name">${escapeHtml(name ?? '')}</span>`
      + (activePath ? `<span class="active-crumb" title="${escapeHtml(activePath)}"><span aria-hidden="true">/</span><code>${escapeHtml(fileName(activePath))}</code></span>` : '')
    : '';
}

function renderDock(): void {
  select('#demo').innerHTML = button('demo', `Demo akışı <code>${String(demoStep).padStart(2, '0')}/08</code>`, { glyph: 'layers', suffix: 'chevron', className: 'demo-button ghost' });
  select('#history').innerHTML = workspaceMode === 'local' ? '<span class="quiet">Yerel dosya düzenleme</span>' : historyStrip(state, snapshot);
}

function rememberWorkspace(): void {
  if (workspaceMode === 'local') localView = { activePath, workset: [...workset] };
  else practiceView = { activePath, workset: [...workset], view };
}

function enterPractice(): void {
  if (workspaceMode === 'practice') return;
  rememberWorkspace();
  requestGeneration++;
  workspaceMode = 'practice';
  ({ activePath, workset, view } = practiceView);
  workspaceMessage = '';
}

function returnLocal(): void {
  if (!native?.name || workspaceMode === 'local') return;
  rememberWorkspace();
  if (tutorial.phase === 'active') tutorial.pause();
  if (dialog.open) dialog.close();
  requestGeneration++;
  workspaceMode = 'local';
  snapshot = null;
  ({ activePath, workset } = localView);
  view = 'editor';
  workspaceMessage = '';
  commandInput.value = '';
  render();
  focusEditor();
}

function showWorkspaceError(code: string, title: string): void {
  if (code === 'STALE') return;
  const messages: Record<string, string> = {
    BUSY: 'Açık dosya işleminin bitmesini bekle ve yeniden dene.',
    SAVE_IN_PROGRESS: 'Bu dosya kaydediliyor. İşlem tamamlandığında tekrar dene.',
    PROTECTED_PATH: 'Bu dosya çalışma alanının koruma kuralları kapsamında.',
    PROTECTION_UNAVAILABLE: 'Koruma kuralları doğrulanamadı. Dosyayı yeniden yüklemeyi dene.',
    READ_ONLY: 'Dosya salt okunur.',
    FILE_TOO_LARGE: 'Dosya editörün boyut sınırını aşıyor.',
    UNSUPPORTED_ENCODING: 'Editör bu dosyanın kodlamasını okuyamadı.',
    NOT_FOUND: 'Dosya çalışma alanında bulunamadı.',
    TARGET_CHANGED: 'Dosyanın diskteki sürümü değişti. Güncel sürümü inceleyebilirsin.',
    ROOT_CHANGED: 'Çalışma alanı değişti. Klasörü yeniden aç.',
  };
  showSheet(title, `<p>${escapeHtml(messages[code] ?? 'Çalışma alanı işlemi tamamlanamadı. Dosyayı veya klasörü yeniden açıp tekrar dene.')}</p>`, 'workspace-error');
}

async function chooseLocal(confirmed = false): Promise<void> {
  if (!native) return chooseWorkspace();
  if (native.busy) return showWorkspaceError('BUSY', 'Çalışma alanı bekliyor');
  if (!confirmed && native.dirtyPaths().length) {
    showSheet('Kaydedilmemiş dosyalar', `<p class="sheet-intro">Yeni bir klasör seçersen yerel taslaklar kapanır. İptal ederek düzenlemene dönebilirsin.</p><div class="sheet-actions">${button('close-sheet', 'Vazgeç', { className: 'ghost' })}${button('choose-local-confirm', 'Taslakları bırak ve klasör seç', { className: 'primary', glyph: 'folder' })}</div>`, 'workspace-confirm');
    return;
  }
  if (dialog.open) dialog.close();
  const picking = native.choose();
  syncEditor();
  const result = await picking;
  if (!result.ok) {
    syncEditor();
    return showWorkspaceError(result.error.code, 'Klasör açılamadı');
  }
  if (!result.value) {
    syncEditor();
    return;
  }
  rememberWorkspace();
  if (tutorial.phase === 'active') tutorial.pause();
  requestGeneration++;
  workspaceMode = 'local';
  snapshot = null;
  view = 'editor';
  activePath = '';
  workset = [];
  localView = { activePath, workset };
  workspaceMessage = 'Klasör içeriği yükleniyor…';
  codeEditor?.reset('local');
  commandInput.value = '';
  commandControl.hide();
  render();
  const listing = await native.list();
  if (workspaceMode !== 'local') return;
  if (!listing.ok) return showWorkspaceError(listing.error.code, 'Klasör listelenemedi');
  workspaceMessage = listing.value.truncated ? 'Liste sınırına ulaşıldı' : 'Yerel çalışma alanı';
  renderWorkView();
  if (dialog.open && sheetKind === 'files') refreshFilePicker();
  else if (!dialog.open && !activePath) select('#main').focus();
}

function practiceCommentExists(text: string | undefined, comment: string): boolean {
  return Boolean(text?.split('\n').some(line => line.trim() === comment));
}

async function saveFile(path = activePath): Promise<boolean> {
  if (!canEdit(path)) return false;
  if (workspaceMode === 'local' && native) {
    const saving = native.save(path);
    renderEditorHead();
    const result = await saving;
    if (workspaceMode === 'local') {
      renderEditorHead();
      renderWorkset();
    }
    if (!result.ok) {
      if (workspaceMode !== 'local') return false;
      if (result.error.code === 'TARGET_CHANGED') {
        showSheet('Dosya değişti', `<p class="sheet-intro"><code>${escapeHtml(path)}</code> dosyasının diskteki sürümü değişti. Taslağına dönebilir veya diskteki sürümü seçebilirsin.</p><div class="sheet-actions">${button('close-sheet', 'Taslağa dön', { className: 'ghost' })}${button('reload-file', 'Diskteki sürümü yükle', { value: path, className: 'primary' })}</div>`, 'disk-conflict');
      } else showWorkspaceError(result.error.code, 'Dosya kaydedilemedi');
      return false;
    }
    if (workspaceMode === 'local') {
      workspaceMessage = dirty(path) ? 'Önceki düzenleme kaydedildi · Yeni düzenleme açık' : 'Dosya kaydedildi.';
      const status = document.querySelector('[data-testid="status"]');
      if (status) status.textContent = workspaceMessage;
      announce(workspaceMessage);
    }
    return true;
  }
  const text = state.files[path];
  if (text === undefined) return false;
  const wasDirty = dirty(path);
  practiceSaved[path] = text;
  workspaceMessage = 'Deneme kopyası kaydedildi.';
  renderWorkView();
  if (wasDirty && path === paths.session && practiceCommentExists(text, practiceComment)) observeTutorial('practice-saved');
  announce(workspaceMessage);
  return true;
}

function requestReload(path: string): void {
  if (workspaceMode !== 'local' || !native || !path) return;
  if (dirty(path)) {
    showSheet('Dosyayı yeniden yükle', `<p class="sheet-intro"><code>${escapeHtml(path)}</code> için diskteki sürümü açmak mevcut taslağı kapatır.</p><div class="sheet-actions">${button('close-sheet', 'Vazgeç', { className: 'ghost' })}${button('reload-confirm', 'Taslağı bırak ve yükle', { value: path, className: 'primary' })}</div>`, 'reload-confirm');
  } else void reloadFile(path);
}

async function reloadFile(path: string): Promise<void> {
  if (!native || workspaceMode !== 'local') return;
  const result = await native.reload(path);
  if (workspaceMode !== 'local') return;
  if (!result.ok) return showWorkspaceError(result.error.code, 'Dosya yüklenemedi');
  if (dialog.open) dialog.close();
  workspaceMessage = 'Diskteki sürüm yüklendi.';
  renderWorkView();
  focusEditor();
  announce(workspaceMessage);
}

function closeFile(path: string, confirmed = false, replace = false): void {
  if (!workset.includes(path)) return;
  if (workspaceMode === 'local' && native?.status(path) === 'saving') {
    showWorkspaceError('SAVE_IN_PROGRESS', 'Dosya kaydediliyor');
    return;
  }
  if (!confirmed && dirty(path)) {
    showSheet('Kaydedilmemiş dosya', `<p class="sheet-intro"><code>${escapeHtml(path)}</code> taslağını kaydedebilir veya düzenlemeyi bırakabilirsin.</p><div class="sheet-actions">
      ${button('close-sheet', 'Vazgeç', { className: 'ghost' })}
      ${button(replace ? 'replace-discard' : 'close-discard', 'Düzenlemeyi bırak', { value: path, className: 'ghost' })}
      ${button(replace ? 'replace-save' : 'close-save', 'Kaydet ve kapat', { value: path, className: 'primary' })}
    </div>`, 'dirty-close');
    return;
  }
  if (workspaceMode === 'local') native?.close(path);
  else if (dirty(path) && practiceSaved[path] !== undefined) {
    state.edit(path, practiceSaved[path]);
  }
  workset = workset.filter(item => item !== path);
  if (path === activePath) activePath = workset[0] ?? '';
  if (dialog.open) dialog.close();
  renderWorkView();
  if (replace && pendingFile) {
    const next = pendingFile;
    pendingFile = '';
    void openFile(next);
  } else focusEditor();
}

function observeTutorial(event: TutorialEvent): void {
  if (workspaceMode === 'practice' && tutorial.observe(event)) renderTutorial();
}

function renderTutorial(): void {
  const show = workspaceMode === 'practice' && workspaceOpen() && (tutorial.phase === 'active' || tutorial.phase === 'finished' || exercise !== null);
  const inDialog = show && dialog.open;
  const slot = inDialog ? dialog.querySelector('.sheet-body') : select('#tutorial-home');
  if (slot && coachHost.parentElement !== slot) slot.prepend(coachHost);
  coachHost.hidden = !show;
  const markup = show ? (exercise ? exerciseCard() : tutorialCard(tutorial))
    + (tutorialMessage ? `<p class="notice amber tutorial-message" role="status">${escapeHtml(tutorialMessage)}</p>` : '') : '';
  if (coachHost.dataset.rendered !== markup) {
    coachHost.dataset.rendered = markup;
    coachHost.innerHTML = markup;
  }
  const editorOnly = view === 'editor' && !snapshot;
  select('#editor-aside').hidden = editorOnly && (!show || inDialog);
  select('#work-view').classList.toggle('has-coach', show && !inDialog);
  document.querySelectorAll('.tutorial-target').forEach(node => node.classList.remove('tutorial-target'));
  if (show && exercise) {
    const selector = exercise.kind === 'conflict' ? '[data-act="undo"]'
      : exercise.stage === 1 && state.approval ? '[data-act="expire-approval"]' : '[data-act="approve"]';
    if (exercise.stage < 3) Array.from((dialog.open ? dialog : app).querySelectorAll(selector))
      .find(node => node.getClientRects().length)?.classList.add('tutorial-target');
    return;
  }
  if (!show || tutorial.phase !== 'active' || !tutorial.hints || tutorial.completed) return;
  let target = tutorial.current.target;
  if (tutorial.index === 0 && sheetKind === 'files' && dialog.open) target = `[data-act="pick-file"][data-value="${paths.session}"]`;
  if (tutorial.index === 1 && dirty(paths.session)) target = '[data-act="save-file"]';
  if (tutorial.index === 5 && dialog.open && sheetKind === 'safety') target = '[data-act="safe-revision"]';
  if (tutorial.index >= 3 && tutorial.index < 7 && editorOnly && !dialog.open) target = '[data-act="view-intent"]';
  if (tutorial.index === 6) target = state.approval ? '[data-act="apply"]' : dialog.open ? target : '[data-act="review"], [data-act="view-intent"][aria-pressed="false"]';
  if (tutorial.index === 7 && !practiceCommentExists(practiceSaved[paths.session], laterPracticeComment)) target = dirty(paths.session) ? '[data-act="save-file"]' : '#editor-host';
  const scope = dialog.open ? dialog : app;
  Array.from(scope.querySelectorAll(target)).find(node => node.getClientRects().length)?.classList.add('tutorial-target');
}

function resetPractice(open: boolean): void {
  enterPractice();
  requestGeneration++;
  state.reset(open);
  practiceSaved = { ...state.files };
  snapshot = null;
  activePath = '';
  workset = [];
  view = 'editor';
  workspaceMessage = '';
  tutorialMessage = '';
  exercise = null;
  codeEditor?.reset('practice');
  codeEditor?.reset('snapshot');
  commandInput.value = '';
  commandControl.hide();
  announce('');
}

function startTutorial(hints = true): void {
  if (dialog.open) dialog.close();
  resetPractice(true);
  tutorial.start(hints);
  demoStep = 2;
  render();
  coachHost.querySelector<HTMLElement>('#tutorial-title')?.focus();
}

function showHelp(): void {
  const running = tutorial.phase === 'active' || tutorial.phase === 'paused';
  showSheet('Yardım', `<div class="help-options">
    ${button(running ? 'tutorial-resume' : 'tutorial-start', running ? 'İlk Göreve devam et' : 'İlk Göreve başla', { glyph: 'target', className: 'primary' })}
    ${running ? button('tutorial-restart', 'İlk Görevi baştan başlat', { glyph: 'history', className: 'ghost' }) : ''}
    ${button('exercise-expiry', 'Süresi dolan onay alıştırması', { glyph: 'clock', className: 'ghost' })}
    ${button('exercise-conflict', 'Çakışmalı geri alma alıştırması', { glyph: 'history', className: 'ghost' })}
    ${button('key-help', 'Klavye kısayolları', { glyph: 'keyboard', className: 'ghost' })}
  </div>`, 'help');
}

function resumeTutorial(): void {
  if (dialog.open) dialog.close();
  enterPractice();
  tutorial.resume();
  render();
  focusTutorial();
}

function focusTutorial(): void {
  coachHost.querySelector<HTMLElement>('#tutorial-title')?.focus({ preventScroll: false });
}

function exerciseCard(): string {
  if (!exercise) return '';
  const expiry = exercise.kind === 'expiry';
  const done = exercise.stage === 3;
  const title = expiry ? 'Süresi dolan onay' : 'Çakışmalı geri alma';
  const copy = done
    ? expiry ? 'Yeni diff incelemesiyle geçerli onayı yeniden aldın.' : 'Geri alma çakışmayı gösterdi. Sonraki düzenlemeyi inceleyebilirsin.'
    : expiry
      ? exercise.stage === 1 && state.approval ? 'Süre dolumunu göster düğmesini seç. Uygulama için yeni onay istenecek.'
        : exercise.stage === 2 ? 'Görüntülenen yamayı incele ve grubu yeniden onayla.' : 'Diff’i incele ve seçili grubu onayla.'
      : 'Uygulanan setten sonra aynı satır elle değiştirildi. Bu seti geri al düğmesine basıp çakışmayı incele.';
  return `<section class="tutorial-card exercise-card"><header class="tutorial-head"><p class="eyebrow">Alıştırma</p>${iconButton('exercise-exit', 'Alıştırmayı kapat', 'close')}</header>
    <div class="tutorial-body"><div class="tutorial-copy"><h2 id="tutorial-title" tabindex="-1">${title}</h2><p>${copy}</p></div>
    ${done ? button('exercise-exit', 'Bitir', { className: 'primary', glyph: 'check' }) : ''}</div></section>`;
}

function startExercise(kind: 'expiry' | 'conflict'): void {
  loadDemo(kind === 'expiry' ? 5 : 7, false);
  exercise = { kind, stage: 0 };
  if (kind === 'conflict') {
    if (dialog.open) dialog.close();
    state.loadAppliedExample(exampleRequest);
    practiceSaved = { ...state.files };
    const content = state.files[paths.session];
    if (content !== undefined) state.edit(paths.session, content.replace('expiresAt: Date;', 'expiresAt: Date; // dış düzenleme'));
    render();
  }
  renderTutorial();
  coachHost.querySelector<HTMLElement>('#tutorial-title')?.focus();
}

function fillExample(): void {
  commandInput.value = exampleRequest;
  commandInput.focus();
  commandInput.setSelectionRange(commandInput.value.length, commandInput.value.length);
  commandControl.hide();
}

function chooseModel(): void {
  showSheet('Ajan modeli', `<p class="sheet-intro">Bir sonraki istekte kullanılacak modeli sen seçersin. İki seçenek de demo yanıtı üretir.</p>
    <div class="model-options">${Object.entries(modelLabels).map(([id, label]) =>
      button('pick-model', label + (state.model === id ? ' · Seçili' : ''), { value: id, glyph: id === 'local' ? 'chip' : 'cloud', className: state.model === id ? 'selected-option' : 'ghost' }),
    ).join('')}</div>`);
}

function chooseDemo(): void {
  showSheet('Demo akışı', `<p class="sheet-intro">Her adım kendi sentetik başlangıç durumunu yükler. Bellekteki düzenlemeler sıfırlanır.</p>
    <div class="demo-options">${demoLabels.map((label, index) =>
      button('load-demo', `<code>${String(index + 1).padStart(2, '0')}</code> ${label}`, { value: String(index + 1), suffix: 'right', className: index + 1 === demoStep ? 'selected-option' : 'ghost' }),
    ).join('')}</div>`);
}

function loadDemo(step: number, focusView = true): void {
  if (dialog.open) dialog.close();
  demoStep = step;
  resetPractice(step > 1);
  tutorial.reset();
  if (step === 8) state.loadAppliedExample(exampleRequest);
  else {
    if (step >= 4) state.start(exampleRequest);
    if (step === 5 || step === 7) state.revise('clean');
  }
  reviewMode = 'split';
  reviewPath = '';
  activePath = step > 1 ? paths.session : '';
  workset = step > 1 ? [...defaultWorkset] : [];
  practiceSaved = { ...state.files };
  view = step >= 4 ? 'intent' : 'editor';
  render();
  select('#main').scrollTop = 0;
  if (step === 3) fillExample();
  else if (step === 5 || step === 7) showReview();
  else if (step === 6) showSafety();
  else if (step === 8) showVision();
  else if (focusView) select('#main').focus();
}

function runCommand(value: string): void {
  if (value.startsWith('@')) {
    const file = matchingFiles(commandFiles(), value.slice(1))[0];
    if (file) void openFile(file);
    else showSheet('Dosya bulunamadı', '<p>Çalışma alanındaki dosyaları görmek için <code>@</code> yaz veya <code>/dosyalar</code> komutunu kullan.</p>');
    return;
  }
  if (value.startsWith('/')) {
    switch (value.toLocaleLowerCase('tr')) {
      case '/dosyalar': chooseFile(true); return;
      case '/yardım': showHelp(); return;
      case '/plan': showPlan(); return;
      case '/diff': showReview(); return;
      case '/kontroller': showSafety(); return;
      case '/geçmiş': case '/gecmis': if (workspaceMode === 'practice') showSheet('Değişiklik geçmişi', historyList(state), 'history'); return;
      case '/tema': toggleTheme(); return;
      case '/vizyon': showVision(); return;
      default:
        showSheet('Tek giriş satırı', `<p class="sheet-intro"><code>@dosya</code> dosya veya kod arar. Düz metin bir ajan isteği açar.</p>
          <ul class="command-help">${commands.map(([name, description]) => `<li><code>${name}</code><span>${description}</span></li>`).join('')}</ul>`);
        return;
    }
  }
  if (workspaceMode === 'local') {
    return showSheet('Ajan alıştırması', `<p>Bu sürümde ajan görevlerini deneme projesinde çalıştırabilirsin.</p><div class="sheet-actions">${button('tutorial-start', 'İlk Göreve başla', { glyph: 'target', className: 'primary' })}</div>`);
  }
  if (snapshot) {
    commandInput.value = value;
    return showSheet('Canlı çalışma alanına dön', `<p class="sheet-intro">Yeni istekler canlı çalışma alanında başlatılır.</p><div class="sheet-actions">${button('return-live', 'Canlıya dön', { className: 'primary', suffix: 'arrow' })}</div>`);
  }
  if (tutorial.phase === 'active' && (tutorial.index !== 2 || tutorial.completed)) {
    commandInput.value = value;
    tutorialMessage = tutorial.index < 2 ? 'Önce dosya açma ve kaydetme adımlarını tamamla.' : 'İlk Görev açık. Başka bir istek için rehberi duraklatabilirsin.';
    renderTutorial();
    return;
  }
  if (tutorial.phase === 'active' && !/authsession.*expiresat|expiresat.*authsession/i.test(value)) {
    commandInput.value = value;
    tutorialMessage = 'Bu alıştırmada AuthSession ve expiresAt içeren örnek isteği gönder.';
    renderTutorial();
    return;
  }
  const request = state.start(value);
  if (request) {
    tutorialMessage = '';
    view = 'intent';
    demoStep = 4;
    render();
    select('#main').scrollTop = 0;
    observeTutorial('request-sent');
    announce('İstek kaydedildi. Dosya bazlı plan hazır.');
  }
}

function showPlan(): void {
  if (workspaceMode === 'local' || !state.plan) return showSheet('Plan', '<p>İlk Görev üzerinden bir ajan planını inceleyebilirsin.</p>');
  showSheet('Dosya bazında plan', planDetail(state.plan) + (state.completed || snapshot ? '' : `<div class="sheet-actions">${button('cancel-task', 'Görevi iptal et', { className: 'ghost' })}${button('revise-plan', 'Planı yeniden oluştur', { glyph: 'history', className: 'ghost' })}</div>`));
}

function showReview(path?: string, focus?: string): void {
  if (workspaceMode === 'local' || snapshot) return;
  const restore = captureFocus(focusEditor);
  if (state.completed) {
    const set = state.currentSet!;
    return showSheet('Değişiklik seti', setReceipt(set, state.canRollback(set.id)));
  }
  const plan = state.plan;
  if (!plan) return showSheet('Diff incelemesi', '<p>Bir diff görmek için önce bir görev isteği gönder.</p>');
  const changes = planChanges(plan);
  const change = changes.find(item => item.path === (path ?? reviewPath))
    ?? state.selectedChanges[0] ?? changes[0];
  if (!change) return showSheet('Diff incelemesi', '<p>Bu planda görüntülenecek bir yama yok.</p>');
  reviewPath = change.path;
  if (demoStep !== 7) demoStep = 5;
  state.markReviewed(change.path);
  renderPlanPanels();
  renderAgentStatus();
  select('#workflow').innerHTML = workflowView(plan, state.approval ? 4 : 2);
  renderDock();
  showSheet('Diff incelemesi', reviewView(state, plan, change, reviewMode), 'review', restore);
  if (plan.variant === 'initial') observeTutorial('diff-reviewed');
  if (plan.variant === 'clean' && state.security?.blocking.length === 0 && !state.planStale) observeTutorial('safe-diff-reviewed');
  if (focus) dialog.querySelector<HTMLElement>(focus)?.focus();
}

function showSafety(): void {
  if (workspaceMode === 'local' || snapshot || state.completed) return;
  const restore = captureFocus(focusEditor);
  const report = state.security;
  if (!report || !state.plan) return showSheet('Güvenlik kontrolleri', '<p>Bir plan hazır olduğunda yazma kontrolleri burada görünür.</p>');
  demoStep = 6;
  state.recordControls();
  select('#workflow').innerHTML = workflowView(state.plan, 3);
  renderDock();
  showSheet('Güvenlik kontrolleri', safetyView(state, report), 'safety', restore);
}

function updateApprovalClock(): void {
  const expired = state.tick();
  if (expired && workspaceMode === 'practice') {
    if (exercise?.kind === 'expiry' && exercise.stage === 1) exercise.stage = 2;
    render();
    if (dialog.open && sheetKind === 'review') showReview(reviewPath, '[data-act="diff-mode"][aria-pressed="true"]');
    announce('Onayın süresi doldu. Yeni onay gerekiyor.');
  }
  if (state.approval) {
    const time = remaining(state.approval.expiresAt);
    document.querySelectorAll('[data-lease-time]').forEach(node => { node.textContent = time; });
  }
}

function openSnapshot(id: string, frame?: number): void {
  const set = state.history.find(entry => entry.id === id);
  if (workspaceMode !== 'practice' || !state.open || (id !== 'initial' && !set)) return;
  if (dialog.open) dialog.close();
  snapshot = { id, frame: frame ?? (set ? set.frames.length - 1 : 0) };
  render();
  select('#main').scrollTop = 0;
  if (frame === undefined) select('#main').focus();
  else document.querySelector<HTMLElement>('.snapshot-steps [aria-current]')?.focus();
  announce('Geçmiş görüntüsü açıldı. Canlı dosyalar korundu.');
}

function returnLive(): void {
  if (dialog.open) dialog.close();
  snapshot = null;
  render();
  focusEditor();
}

function updatePracticeSaved(before: Files): void {
  for (const [path, text] of Object.entries(state.files)) {
    if (practiceSaved[path] === before[path]) practiceSaved[path] = text;
  }
}

function applyPatch(): void {
  if (workspaceMode !== 'practice') return;
  if (tutorial.phase === 'active' && (tutorial.index < 6 || !state.isSelected('core'))) {
    tutorialMessage = tutorial.index < 6 ? 'Uygulama adımına gelene kadar rehberi takip et.' : 'Bu görev için Oturum bütünlüğü grubunu seç.';
    renderTutorial();
    return;
  }
  const before = state.files;
  if (snapshot || !state.apply()) {
    render();
    if (dialog.open && sheetKind === 'review') showReview();
    announce('Uygulama için geçerli bir onay gerekiyor.');
    return;
  }
  updatePracticeSaved(before);
  if (dialog.open) dialog.close();
  demoStep = 7;
  tutorialMessage = '';
  workspaceMessage = 'Onaylı yama uygulandı.';
  observeTutorial('patch-applied');
  render();
  select('#main').scrollTop = 0;
  focusEditor();
  announce('Onaylı değişiklik seti uygulandı. Geçmiş kaydı hazır.');
}

function rollbackSet(id: string): void {
  if (workspaceMode !== 'practice') return;
  if (tutorial.phase === 'active' && (tutorial.index !== 7 || !practiceCommentExists(practiceSaved[paths.session], laterPracticeComment))) {
    tutorialMessage = 'Geri alma adımında yeni yorumu session.ts dosyasına ekle ve kaydet.';
    renderTutorial();
    return;
  }
  const before = state.files;
  const result = state.rollback(id);
  if (result.status === 'conflict') {
    if (exercise?.kind === 'conflict') exercise.stage = 3;
    showSheet('Geri alma çakışması', conflictView(result.conflicts), 'conflict');
    announce('Geri alma durdu. Çakışan düzenlemeler canlı kodda korundu.');
  } else if (result.status === 'reverted') {
    updatePracticeSaved(before);
    tutorialMessage = '';
    if (practiceCommentExists(state.files[paths.session], laterPracticeComment)) observeTutorial('patch-undone');
    returnLive();
    announce('Set geri alındı. Bağımsız elle düzenlemeler korundu.');
  } else {
    announce('Bu değişiklik seti geri alma penceresinde değil.');
  }
}

function showVision(): void {
  if (workspaceMode !== 'practice') return;
  demoStep = 8;
  renderDock();
  showSheet('Vizyon katmanı', visionOverview(state.currentSet), 'vision');
}

function showRisk(focus?: string): void {
  showSheet('Riske göre onay', riskView(riskHigh, riskChecked, riskConfirmed), 'vision-detail');
  if (focus) dialog.querySelector<HTMLElement>(focus)?.focus();
}

function toggleTheme(): void {
  light = !light;
  document.documentElement.dataset.theme = light ? 'light' : 'dark';
  codeEditor?.theme(light);
  render();
  select('[data-act="theme"]').focus();
}

function chooseWorkspace(): void {
  showSheet('Çalışma alanı seç', `
    <p class="sheet-intro">Bu prototip, oturum ve kimlik doğrulama akışını sentetik bir projede gösterir.</p>
    <div class="workspace-option">
      <span class="tile-icon">${icon('folder', 23)}</span>
      <div><strong>auth-lab</strong><p>TypeScript · ${Object.keys(state.initialFiles).length} dosya · Bellek içi demo</p></div>
      ${button('open-workspace', 'Alanı aç', { className: 'primary', suffix: 'arrow' })}
    </div>
  `);
}

function refreshFilePicker(): void {
  const input = document.querySelector<HTMLInputElement>('#picker-search');
  const list = document.querySelector<HTMLElement>('#file-tree');
  if (!input || !list) return;
  list.innerHTML = pickerRows(entries(), input.value, list.dataset.tree === 'true');
  renderTutorial();
}

function closeAfterSaving(path: string, replace: boolean): void {
  const mode = workspaceMode;
  void saveFile(path).then(saved => {
    if (saved && mode === workspaceMode && !dirty(path)) closeFile(path, true, replace);
  });
}

function confirmCancelTask(): void {
  if (workspaceMode !== 'practice' || !state.plan || state.completed || snapshot) return;
  showSheet('Görevi iptal et', `<p class="sheet-intro">Plan ve varsa onayı kapanacak. İptal kararı geçmişe kaydedilir.</p>
    <div class="sheet-actions">${button('close-sheet', 'Çalışmaya dön', { className: 'ghost' })}${button('confirm-cancel-task', 'Görevi iptal et', { className: 'primary', glyph: 'close' })}</div>`, 'cancel-task');
}

function confirmPracticeReset(action: string, value: string): void {
  if (workspaceMode !== 'practice' || !state.open || (tutorial.phase === 'idle' && !workset.some(dirty))) {
    if (action === 'exercise') startExercise(value === 'conflict' ? 'conflict' : 'expiry');
    else startTutorial(value !== 'unguided');
    return;
  }
  showSheet('Deneme projesini yenile', `<p class="sheet-intro">Yeni alıştırma için deneme projesi ve rehber ilerlemesi sıfırlanır.</p><div class="sheet-actions">${button('close-sheet', 'Vazgeç', { className: 'ghost' })}${button('reset-practice', 'Yeni alıştırmayı başlat', { value: `${action}/${value}`, className: 'primary', suffix: 'arrow' })}</div>`, 'practice-confirm');
}

function setView(next: 'editor' | 'intent'): void {
  if (next === 'editor') snapshot = null;
  view = next;
  renderWorkView();
  renderDock();
  renderAgentStatus();
  select('#main').scrollTop = 0;
  document.querySelector<HTMLElement>(`[data-act="view-${next}"]`)?.focus();
}

app.addEventListener('click', event => {
  const target = (event.target as HTMLElement).closest<HTMLElement>('[data-act]');
  const action = target?.dataset.act;
  const value = target?.dataset.value ?? '';
  switch (action) {
    case 'workspace': void chooseLocal(); break;
    case 'choose-local-confirm': void chooseLocal(true); break;
    case 'return-local': returnLocal(); break;
    case 'help': showHelp(); break;
    case 'key-help':
      showSheet('Klavye kısayolları', `<dl class="key-list">
        <dt><kbd>Ctrl P</kbd></dt><dd>Dosya aç</dd><dt><kbd>Ctrl S</kbd></dt><dd>Etkin dosyayı kaydet</dd>
        <dt><kbd>Ctrl K</kbd></dt><dd>Tek giriş satırına geç</dd><dt><kbd>Esc</kbd></dt><dd>Geçici görünümü kapat</dd>
        <dt><kbd>Tab</kbd></dt><dd>Arayüz ve Monaco arasında ilerle</dd></dl><p class="quiet">macOS’te Ctrl yerine ⌘ kullan.</p>`, 'help');
      break;
    case 'tutorial-start':
    case 'tutorial-restart':
    case 'tutorial-unguided': confirmPracticeReset('tutorial', action === 'tutorial-unguided' ? 'unguided' : 'guided'); break;
    case 'reset-practice': {
      const [kind, variant] = value.split('/');
      if (kind === 'exercise') startExercise(variant === 'conflict' ? 'conflict' : 'expiry');
      else startTutorial(variant !== 'unguided');
      break;
    }
    case 'tutorial-resume': resumeTutorial(); break;
    case 'tutorial-pause':
    case 'tutorial-exit':
      if (tutorial.phase === 'finished') {
        if (native) void chooseLocal();
        else chooseWorkspace();
      } else if (tutorial.phase === 'paused') resumeTutorial();
      else {
        tutorial.pause();
        tutorialMessage = '';
        renderTutorial();
        if (dialog.open) dialog.querySelector<HTMLElement>('[data-act="close-sheet"]')?.focus();
        else document.querySelector<HTMLElement>('[data-act="help"]')?.focus();
        announce('İlk Görev duraklatıldı. Yardım’dan devam edebilirsin.');
      }
      break;
    case 'tutorial-prev':
    case 'tutorial-next':
      if (action === 'tutorial-prev') tutorial.previous();
      else tutorial.next();
      tutorialMessage = '';
      renderTutorial();
      focusTutorial();
      break;
    case 'tutorial-why':
    case 'tutorial-hint': {
      if (action === 'tutorial-why') tutorial.toggleWhy();
      else tutorial.hints = !tutorial.hints;
      renderTutorial();
      coachHost.querySelector<HTMLElement>(`[data-act="${action}"]`)?.focus();
      break;
    }
    case 'exercise-expiry': confirmPracticeReset('exercise', 'expiry'); break;
    case 'exercise-conflict': confirmPracticeReset('exercise', 'conflict'); break;
    case 'exercise-exit':
      exercise = null;
      renderTutorial();
      if (dialog.open) dialog.querySelector<HTMLElement>('[data-act="close-sheet"]')?.focus();
      else focusEditor();
      break;
    case 'view-editor': setView('editor'); break;
    case 'view-intent': setView('intent'); break;
    case 'demo': chooseDemo(); break;
    case 'load-demo': loadDemo(Number(target?.dataset.value)); break;
    case 'example': fillExample(); break;
    case 'model': chooseModel(); break;
    case 'vision': showVision(); break;
    case 'vision-card': {
      const card = target?.dataset.value as VisionCard;
      if (card === 'risk') {
        riskHigh = false;
        riskConfirmed = false;
        riskChecked.clear();
        showRisk();
      } else {
        const detail = visionDetail(card, state.currentSet);
        showSheet(detail.title, detail.body, 'vision-detail');
      }
      break;
    }
    case 'vision-risk-mode':
      riskHigh = target?.dataset.value === 'high';
      riskConfirmed = false;
      riskChecked.clear();
      showRisk('[data-act="vision-risk-mode"][aria-pressed="true"]');
      break;
    case 'vision-risk-approve':
      riskConfirmed = true;
      showRisk('[data-act="vision-risk-mode"][aria-pressed="true"]');
      announce('Vizyon örneği için açık onay kaydedildi.');
      break;
    case 'vision-note-request':
      dialog.close();
      snapshot = null;
      render();
      commandInput.value = documentationRequest;
      commandInput.focus();
      break;
    case 'request-detail': if (workspaceMode === 'practice' && state.plan) showSheet('Kullanıcı isteği', requestDetail(state.plan)); break;
    case 'plan-detail': showPlan(); break;
    case 'review':
    case 'apply-view': showReview(); break;
    case 'apply': applyPatch(); break;
    case 'cancel-task': confirmCancelTask(); break;
    case 'confirm-cancel-task':
      if (state.cancel()) {
        dialog.close();
        tutorial.reset();
        exercise = null;
        tutorialMessage = '';
        view = 'editor';
        workspaceMessage = 'Görev iptal edildi.';
        render();
        focusEditor();
        announce('Görev iptal edildi. Geçmiş kaydı hazır.');
      }
      break;
    case 'history-menu': showSheet('Değişiklik geçmişi', historyList(state), 'history'); break;
    case 'history-open': if (target?.dataset.value) openSnapshot(target.dataset.value); break;
    case 'history-frame': if (snapshot) openSnapshot(snapshot.id, Number(target?.dataset.value)); break;
    case 'return-live': returnLive(); break;
    case 'undo': if (target?.dataset.value) rollbackSet(target.dataset.value); break;
    case 'resolve-conflict': {
      const [path, line] = (target?.dataset.value ?? '').split(':');
      returnLive();
      if (path) void openFile(path, Number(line));
      break;
    }
    case 'review-file':
      showReview(target?.dataset.value, `[data-act="review-file"][aria-current="true"]`);
      break;
    case 'diff-mode':
      reviewMode = target?.dataset.value === 'unified' ? 'unified' : 'split';
      showReview(reviewPath, '[data-act="diff-mode"][aria-pressed="true"]');
      break;
    case 'safety': showSafety(); break;
    case 'safe-revision':
      if (tutorial.phase === 'active' && tutorial.index < 5) {
        tutorialMessage = 'Önce v1 diff’ini incele ve güvenlik adımına ilerle.';
        renderTutorial();
        break;
      }
      tutorialMessage = '';
      state.revise('clean');
      renderWorkView();
      showReview(paths.session);
      announce('Engelli adım çıkarıldı. Yeni planın diff’i ve yeni onay gerekiyor.');
      break;
    case 'review-large':
      if (state.reviewLarge()) {
        showReview(reviewPath, '[data-act="approve"]');
        announce('Büyük düzenleme inceleme kararı kaydedildi. Grup onayı bekleniyor.');
      }
      break;
    case 'safety-example': {
      const variant = target?.dataset.value as PlanVariant;
      state.revise(variant);
      renderWorkView();
      if (variant === 'large') showReview(paths.token);
      else showSafety();
      break;
    }
    case 'approve':
      if (tutorial.phase === 'active' && tutorial.index < 6) {
        tutorialMessage = 'Onay için rehberdeki bir sonraki adıma ilerle.';
        renderTutorial();
        break;
      }
      if (state.approve()) {
        if (exercise?.kind === 'expiry') exercise.stage = exercise.stage === 2 ? 3 : 1;
        tutorialMessage = '';
        announce('Seçili gruplar 10 dakika için onaylandı.');
      }
      render();
      showReview(reviewPath, '[data-act="apply"]');
      break;
    case 'expire-approval':
      if (state.approval) {
        state.tick(state.approval.expiresAt);
        if (exercise?.kind === 'expiry' && exercise.stage === 1) exercise.stage = 2;
      }
      announce('Demo saati onayın sonuna ulaştı. Yeni onay gerekiyor.');
      render();
      showReview(reviewPath, '[data-act="approve"]');
      break;
    case 'revise-plan':
      state.revise();
      if (dialog.open) dialog.close();
      render();
      select('#main').focus();
      announce('Yeni plan hazır.');
      break;
    case 'inspect-source': {
      const source = state.plan?.sources.find(item => item.path === target?.dataset.value);
      if (source) {
        showSheet('Bağlam kaynağı', sourceDetail(source), 'source');
        observeTutorial('source-reviewed');
      }
      break;
    }
    case 'focus-source': {
      const source = state.plan?.sources.find(item => item.path === target?.dataset.value);
      if (source) {
        dialog.close();
        void openFile(source.path, source.focus);
      }
      break;
    }
    case 'pick-model':
      state.model = target?.dataset.value as ModelId;
      dialog.close();
      render();
      select('[data-act="model"]').focus();
      announce(`${modelLabels[state.model]} seçildi.`);
      break;
    case 'open-workspace':
      if (workspaceOpen() && tutorial.phase !== 'finished') {
        dialog.close();
        setView('editor');
        focusEditor();
      } else loadDemo(2);
      break;
    case 'file-picker': chooseFile(); break;
    case 'file-tree': chooseFile(true); break;
    case 'pick-file':
      dialog.close();
      if (value) void openFile(value);
      break;
    case 'open-file': if (value) void openFile(value); break;
    case 'close-file': if (value) closeFile(value); break;
    case 'replace-file': if (value) closeFile(value, false, true); break;
    case 'close-discard': case 'replace-discard': if (value) closeFile(value, true, action === 'replace-discard'); break;
    case 'close-save': case 'replace-save': if (value) closeAfterSaving(value, action === 'replace-save'); break;
    case 'save-file': {
      const restore = captureFocus(focusEditor);
      void saveFile().then(() => { if (!dialog.open && document.activeElement === document.body) restore(); });
      break;
    }
    case 'reload-file': requestReload(value || activePath); break;
    case 'reload-confirm': if (value) void reloadFile(value); break;
    case 'close-sheet': dialog.close(); break;
    case 'theme': toggleTheme(); break;
  }
});

app.addEventListener('input', event => {
  if (event.target instanceof HTMLInputElement && event.target.id === 'picker-search') refreshFilePicker();
});

document.addEventListener('keydown', event => {
  const key = event.key.toLowerCase();
  if (event.target instanceof HTMLInputElement && event.target.id === 'picker-search' && (key === 'enter' || key === 'arrowdown')) {
    const first = dialog.querySelector<HTMLButtonElement>('[data-act="pick-file"]');
    if (first) {
      event.preventDefault();
      if (key === 'enter') first.click();
      else first.focus();
    }
    return;
  }
  if (!(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey || !workspaceOpen()) return;
  if (key === 'p' || key === 's' || key === 'k') {
    event.preventDefault();
    event.stopPropagation();
    if (dialog.open) return;
    if (key === 'p') chooseFile();
    else if (key === 's') void saveFile();
    else {
      commandInput.focus();
      commandInput.select();
    }
  }
}, true);

window.addEventListener('beforeunload', event => {
  if (native?.dirtyPaths().length) {
    event.preventDefault();
    event.returnValue = '';
  }
});

app.addEventListener('change', event => {
  const input = event.target as HTMLInputElement;
  const group = input.dataset.group as GroupId | undefined;
  const riskFile = input.dataset.riskFile;
  if (riskFile) {
    if (input.checked) riskChecked.add(riskFile);
    else riskChecked.delete(riskFile);
    riskConfirmed = false;
    showRisk(`[data-risk-file="${CSS.escape(riskFile)}"]`);
    return;
  }
  if (!group) return;
  state.selectGroup(group, input.checked);
  showReview(reviewPath, `#group-${group}`);
});
setInterval(updateApprovalClock, 1000);

const requestedStep = Number(new URLSearchParams(location.search).get('adim'));
loadDemo(Number.isInteger(requestedStep) && requestedStep >= 1 && requestedStep <= 8 ? requestedStep : 1, false);

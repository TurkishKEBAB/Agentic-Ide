import { reverseChange, type ChangeSet, type HistoryFrame, type Milestone, type UndoConflict, type UndoResult } from './history.ts';
import { paths, projectFiles } from './project.ts';
import { checkPlan, type SafetyReport } from './safety.ts';
import { documentationRequest, makePlan, type Change, type GroupId, type Plan, type PlanVariant } from './plan.ts';

export const exampleRequest = 'AuthSession arayüzüne expiresAt: Date ekle';
export const modelLabels = {
  local: 'Yerel · Qwen2.5 Coder',
  cloud: 'Bulut · GPT-4.1 mini',
};
export type ModelId = keyof typeof modelLabels;

export interface TaskRequest {
  id: string;
  text: string;
  model: ModelId;
  time: number;
}

export const APPROVAL_MS = 10 * 60 * 1000;

interface Approval {
  key: string;
  expiresAt: number;
}

export class WorkspaceState {
  open = false;
  history: ChangeSet[] = [];
  readonly initialFiles = Object.freeze(projectFiles());
  files = projectFiles();
  readonly manualFiles = new Set<string>();
  model: ModelId = 'local';
  request: TaskRequest | null = null;
  plan: Plan | null = null;
  contentVersion = 0;
  approval: Approval | null = null;
  approvalNotice = '';
  private selection = new Set<GroupId>();
  private reviewedKey: string | null = null;
  private largeKey: string | null = null;
  private sequence = 23;

  reset(open: boolean): void {
    this.open = open;
    this.files = projectFiles();
    this.manualFiles.clear();
    this.request = null;
    this.history = [];
    this.plan = null;
    this.contentVersion = 0;
    this.selection.clear();
    this.invalidate('');
    this.sequence = 23;
  }

  loadAppliedExample(text: string, time = Date.now()): void {
    this.reset(true);
    this.start(text, time - 4000);
    const plan = this.revise('clean', time - 3000)!;
    const set = this.currentSet!;
    const changes = this.selectedChanges;
    set.example = true;
    this.record(set, 'controls', 'Örnek kayıt · Yazma kontrolleri tamamlandı.', time - 2000);
    this.record(set, 'decision', 'Örnek kayıt · Kullanıcı bağlı grubu onayladı.', time - 1000);
    this.files = { ...this.files, ...Object.fromEntries(changes.map(change => [change.path, change.after])) };
    this.contentVersion = plan.baseVersion + 1;
    set.applied = { changes, time };
    this.invalidate('');
    this.record(set, 'applied', 'Önceden uygulanmış demo kaydı · 3 dosya.', time);
  }

  edit(path: string, text: string): boolean {
    if (!this.open || path === paths.env || this.files[path] === undefined || this.files[path] === text) return false;
    this.files[path] = text;
    this.manualFiles.add(path);
    this.contentVersion += 1;
    if (this.plan) this.invalidate('İçerik değişti. Planı yenile ve yeniden onayla.');
    return true;
  }

  start(text: string, time = Date.now()): TaskRequest | null {
    if (!this.open || !text.trim()) return null;
    this.request = { id: `N-${String(++this.sequence).padStart(3, '0')}`, text: text.trim(), model: this.model, time };
    this.plan = null;
    const set: ChangeSet = { id: this.request.id, request: this.request, frames: [] };
    this.history.push(set);
    this.record(set, 'request', 'Kullanıcı isteği alındı.', time);
    this.revise(this.request.text === documentationRequest ? 'clean' : 'initial', time);
    this.approvalNotice = '';
    return this.request;
  }

  revise(variant: PlanVariant = this.plan?.variant ?? 'initial', time = Date.now()): Plan | null {
    const set = this.currentSet;
    if (!this.request || !set || this.completed) return null;
    const previous = this.plan;
    const oldSelection = this.selection;
    this.plan = makePlan(this.request, this.files, (this.plan?.revision ?? 0) + 1, this.contentVersion, variant);
    this.selection = new Set(this.plan.groups.filter(group => previous && previous.variant === variant
      ? oldSelection.has(group.id) : group.id !== 'notes' || this.request?.text === documentationRequest).map(group => group.id));
    this.invalidate(previous ? 'Plan revize edildi. Yeni diff ve onay gerekiyor.' : '');
    this.record(set, 'plan', `Plan v${this.plan.revision} hazırlandı.`, time);
    return this.plan;
  }

  cancel(time = Date.now()): boolean {
    const set = this.currentSet;
    if (!this.plan || !set || set.applied) return false;
    this.record(set, 'cancelled', 'Kullanıcı görevi iptal etti.', time);
    this.request = null;
    this.plan = null;
    this.selection.clear();
    this.invalidate('');
    return true;
  }

  get planStale(): boolean {
    return this.plan !== null && !this.completed && this.plan.baseVersion !== this.contentVersion;
  }

  get selectedChanges(): Change[] {
    return this.plan?.groups.filter(group => this.selection.has(group.id)).flatMap(group => group.changes) ?? [];
  }

  isSelected(id: GroupId): boolean {
    return this.selection.has(id);
  }

  selectGroup(id: GroupId, selected: boolean): void {
    if (this.completed || !this.plan?.groups.some(group => group.id === id) || this.selection.has(id) === selected) return;
    if (selected) this.selection.add(id);
    else this.selection.delete(id);
    this.invalidate('Grup seçimi değişti. Yeni onay gerekiyor.');
  }

  private get decisionKey(): string {
    return `${this.request?.id}:${this.plan?.revision}:${this.contentVersion}:${[...this.selection].sort().join(',')}`;
  }

  private invalidate(message: string): void {
    this.approval = null;
    this.reviewedKey = null;
    this.largeKey = null;
    this.approvalNotice = message;
  }

  markReviewed(path: string): void {
    if (!this.completed && !this.planStale && this.selectedChanges.some(change => change.path === path)) this.reviewedKey = this.decisionKey;
  }

  get security(): SafetyReport | null {
    return this.plan ? checkPlan(this.plan, this.files, this.selectedChanges) : null;
  }

  get largeReviewed(): boolean {
    return this.largeKey === this.decisionKey;
  }

  get canReviewLarge(): boolean {
    const report = this.security;
    return !this.completed && !!report?.large && report.blocking.length === 0 && !this.planStale && this.reviewedKey === this.decisionKey;
  }

  reviewLarge(): boolean {
    if (!this.canReviewLarge) return false;
    this.largeKey = this.decisionKey;
    return true;
  }

  get canApprove(): boolean {
    const report = this.security;
    return !this.completed && !!report && !this.planStale && report.blocking.length === 0 && (!report.large || this.largeReviewed)
      && this.selectedChanges.length > 0 && this.reviewedKey === this.decisionKey;
  }

  approve(now = Date.now()): boolean {
    this.tick(now);
    const set = this.currentSet;
    if (!set || this.approval || !this.canApprove) return false;
    this.recordControls(now);
    this.approval = { key: this.decisionKey, expiresAt: now + APPROVAL_MS };
    this.approvalNotice = '';
    this.record(set, 'decision', `${this.selection.size} grup 10 dakika için onaylandı.`, now);
    return true;
  }

  tick(now = Date.now()): boolean {
    if (!this.approval || this.approval.expiresAt > now) return false;
    this.invalidate('Onayın süresi doldu. Diff’i incele ve yeniden onayla.');
    return true;
  }

  get currentSet(): ChangeSet | undefined {
    return this.history.at(-1);
  }

  get completed(): boolean {
    return !!this.currentSet?.applied;
  }

  private record(set: ChangeSet, stage: Milestone, detail: string, time: number): void {
    const revision = set.id === this.request?.id ? this.plan?.revision : set.frames.at(-1)?.revision;
    const frame: HistoryFrame = {
      stage, time, detail,
      ...(revision === undefined ? {} : { revision }),
      files: Object.freeze({ ...this.files }),
    };
    set.frames.push(frame);
  }

  recordControls(time = Date.now()): void {
    const set = this.currentSet;
    const report = this.security;
    if (!set || !report || this.completed) return;
    const detail = report.blocking.length > 0
      ? `${report.blocking.length} engelleyici bulgu.`
      : report.large && !this.largeReviewed ? 'Büyük düzenleme incelemesi bekleniyor.' : 'Yazma kontrolleri tamamlandı.';
    if (set.frames.at(-1)?.stage !== 'controls' || set.frames.at(-1)?.detail !== detail) {
      this.record(set, 'controls', detail, time);
    }
  }

  canApply(now = Date.now()): boolean {
    return this.approval !== null && this.approval.key === this.decisionKey
      && this.approval.expiresAt > now && this.canApprove
      && this.selectedChanges.every(change => this.files[change.path] === change.before);
  }

  apply(now = Date.now()): boolean {
    this.tick(now);
    const set = this.currentSet;
    if (!set || !this.canApply(now)) return false;
    const changes = this.selectedChanges;
    this.files = { ...this.files, ...Object.fromEntries(changes.map(change => [change.path, change.after])) };
    this.contentVersion++;
    set.applied = { changes, time: now };
    this.invalidate('');
    this.record(set, 'applied', `${changes.length} dosya açık onayla güncellendi.`, now);
    return true;
  }

  canRollback(id: string): boolean {
    return this.history.filter(set => set.applied).slice(-10).some(set => set.id === id && set.reverted === undefined);
  }

  rollback(id: string, now = Date.now()): UndoResult {
    const set = this.history.find(entry => entry.id === id);
    if (!set?.applied || !this.canRollback(id)) return { status: 'unavailable' };
    const restored = { ...this.files };
    const conflicts: UndoConflict[] = [];
    for (const change of set.applied.changes) {
      const result = reverseChange(change, this.files[change.path]);
      if ('conflict' in result) conflicts.push(result.conflict);
      else restored[change.path] = result.text;
    }
    if (conflicts.length) return { status: 'conflict', conflicts };
    this.files = restored;
    this.contentVersion++;
    set.reverted = now;
    this.invalidate(this.completed ? '' : 'Canlı içerik değişti. Planı yenile ve yeniden onayla.');
    this.record(set, 'reverted', 'Ters yama uygulandı. Sonraki bağımsız düzenlemeler korundu.', now);
    return { status: 'reverted' };
  }
}

import test from 'node:test';
import assert from 'node:assert/strict';
import { paths } from '../src/project.ts';
import { exampleRequest, WorkspaceState } from '../src/state.ts';

function cleanPlan() {
  const state = new WorkspaceState();
  state.reset(true);
  state.start(exampleRequest, 0);
  state.revise('clean');
  return state;
}

test('the core selection covers the interface and both callers as a unit', () => {
  const state = cleanPlan();
  assert.deepEqual(state.selectedChanges.map(change => change.path), [paths.session, paths.login, paths.middleware]);
  state.selectGroup('core', false);
  assert.deepEqual(state.selectedChanges, []);
});

test('approval requires a diff review and expires at ten minutes', () => {
  const state = cleanPlan();
  assert.equal(state.approve(1000), false);
  state.markReviewed(paths.session);
  assert.equal(state.approve(1000), true);
  assert.equal(state.tick(600999), false);
  assert.equal(state.tick(601000), true);
  assert.equal(state.approval, null);
});

test('changes to selection, plan revision or live content invalidate approval', () => {
  const changes = [
    (state: WorkspaceState) => state.selectGroup('notes', true),
    (state: WorkspaceState) => state.revise('clean'),
    (state: WorkspaceState) => state.edit(paths.token, state.files[paths.token] + '// user note\n'),
  ];
  for (const change of changes) {
    const state = cleanPlan();
    state.markReviewed(paths.session);
    assert.equal(state.approve(1000), true);
    change(state);
    assert.equal(state.approval, null);
    assert.equal(state.approve(2000), false);
  }
});

test('deselecting a protected secret-bearing group still requires a fresh plan', () => {
  const state = new WorkspaceState();
  state.reset(true);
  state.start(exampleRequest, 0);
  assert.deepEqual(state.security?.blocking.map(finding => finding.rule), ['protected', 'secret']);
  state.selectGroup('env', false);
  state.markReviewed(paths.session);
  assert.equal(state.approve(1000), false);
  state.revise('clean');
  assert.equal(state.approve(1000), false);
  state.markReviewed(paths.session);
  assert.equal(state.approve(1000), true);
});

test('a proposed path outside the workspace blocks approval', () => {
  const state = cleanPlan();
  state.revise('outside');
  assert.equal(state.security?.blocking[0]?.rule, 'boundary');
  state.markReviewed(paths.session);
  assert.equal(state.approve(1000), false);
});

test('a large patch requires its own review for the current selection', () => {
  const state = cleanPlan();
  state.revise('large');
  assert.ok(state.security?.large);
  state.markReviewed(paths.session);
  assert.equal(state.approve(1000), false);
  assert.equal(state.reviewLarge(), true);
  assert.equal(state.approve(1000), true);
  state.selectGroup('core', false);
  state.markReviewed(paths.token);
  assert.equal(state.approve(1000), false);
});

function appliedPlan() {
  const state = cleanPlan();
  state.markReviewed(paths.session);
  assert.equal(state.approve(1000), true);
  assert.equal(state.apply(1200), true);
  return state;
}

test('expired approval cannot write any part of a set', () => {
  const state = cleanPlan();
  const before = { ...state.files };
  state.markReviewed(paths.session);
  assert.equal(state.approve(1000), true);
  assert.equal(state.apply(601000), false);
  assert.deepEqual(state.files, before);
});

test('apply records stable before and after snapshots for the linked group', () => {
  const state = appliedPlan();
  const set = state.currentSet!;
  assert.match(state.files[paths.session], /expiresAt: Date;/);
  assert.match(state.files[paths.login], /return \{ userId: user.id, token, expiresAt \}/);
  assert.match(state.files[paths.middleware], /session\.expiresAt\.getTime\(\)/);
  assert.doesNotMatch(set.frames[0].files[paths.session], /expiresAt/);
  assert.match(set.frames.at(-1)!.files[paths.session], /expiresAt: Date;/);
  state.edit(paths.session, state.files[paths.session] + '// later note\n');
  assert.doesNotMatch(set.frames.at(-1)!.files[paths.session], /later note/);
});

test('rollback preserves a later manual edit in the same file', () => {
  const state = appliedPlan();
  state.edit(paths.session, state.files[paths.session] + '// later note\n');
  assert.equal(state.rollback(state.currentSet!.id).status, 'reverted');
  assert.doesNotMatch(state.files[paths.session], /expiresAt/);
  assert.match(state.files[paths.session], /later note/);
});

test('an overlapping manual edit stops rollback for every file in the set', () => {
  const state = appliedPlan();
  state.edit(paths.session, state.files[paths.session].replace('expiresAt: Date;', 'expiresAt: Date; // manual'));
  const beforeUndo = { ...state.files };
  const result = state.rollback(state.currentSet!.id);
  assert.equal(result.status, 'conflict');
  if (result.status === 'conflict') assert.equal(result.conflicts[0].path, paths.session);
  assert.deepEqual(state.files, beforeUndo);
});

test('file-name matches outrank references to that file in other code', async () => {
  const { matchingFiles } = await import('../src/command.ts');
  const state = cleanPlan();
  assert.equal(matchingFiles(state.files, 'token')[0], paths.token);
});

test('only the ten newest applied sets remain eligible for rollback', () => {
  const state = cleanPlan();
  const starting = { ...state.files };
  const ids: string[] = [];
  for (let index = 0; index < 11; index++) {
    for (const path of [paths.session, paths.login, paths.middleware]) state.edit(path, starting[path]);
    state.start(exampleRequest);
    state.revise('clean');
    state.markReviewed(paths.session);
    assert.equal(state.approve(1000), true);
    assert.equal(state.apply(1001), true);
    ids.push(state.currentSet!.id);
  }
  assert.equal(state.canRollback(ids[0]), false);
  assert.equal(state.canRollback(ids[1]), true);
});

test('the vision example loads a past receipt and carries no live approval', () => {
  const state = new WorkspaceState();
  state.loadAppliedExample(exampleRequest, 8000);
  assert.equal(state.currentSet?.example, true);
  assert.match(state.files[paths.session], /expiresAt: Date;/);
  assert.equal(state.approval, null);
  assert.equal(state.apply(8001), false);
});

test('cancelling a task revokes its approval and leaves a cancelled history step', () => {
  const state = cleanPlan();
  state.markReviewed(paths.session);
  assert.equal(state.approve(100), true);
  const before = { ...state.files };
  assert.equal(state.cancel(), true);
  assert.equal(state.apply(200), false);
  assert.deepEqual(state.files, before);
  assert.equal(state.currentSet?.frames.at(-1)?.stage, 'cancelled');
});

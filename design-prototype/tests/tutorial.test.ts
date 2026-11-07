import assert from 'node:assert/strict';
import test from 'node:test';
import { FirstTaskTutorial, type TutorialEvent } from '../src/tutorial.ts';
import { tutorialCard } from '../src/tutorial-view.ts';

const walkthrough = [
  'file-opened', 'practice-saved', 'request-sent', 'source-reviewed',
  'diff-reviewed', 'safe-diff-reviewed', 'patch-applied', 'patch-undone',
] as const satisfies readonly TutorialEvent[];

test('only the current step action enables advancement', () => {
  const coach = new FirstTaskTutorial();
  assert.equal(coach.observe('file-opened'), false);
  coach.start();
  coach.next();
  assert.equal(coach.index, 0);
  assert.equal(coach.observe('practice-saved'), false);
  assert.equal(coach.completed, false);

  assert.equal(coach.observe('file-opened'), true);
  assert.equal(coach.observe('file-opened'), false);
  assert.equal(coach.completed, true);
  assert.equal(coach.index, 0);
  coach.next();
  assert.equal(coach.index, 1);
  assert.equal(coach.completed, false);
  assert.equal(coach.observe('file-opened'), false);
});

test('each real action unlocks one step and the final action enables completion', () => {
  const coach = new FirstTaskTutorial();
  coach.start();
  for (const [index, event] of walkthrough.entries()) {
    assert.equal(coach.index, index);
    assert.equal(coach.current.event, event);
    assert.equal(coach.completed, false);
    assert.equal(coach.observe(event), true);
    assert.equal(coach.phase, 'active');
    coach.next();
  }
  assert.equal(coach.phase, 'finished');
  assert.equal(coach.index, 7);
  assert.equal(coach.observe('patch-undone'), false);
});

test('returning to an earlier explanation keeps already completed actions', () => {
  const coach = new FirstTaskTutorial();
  coach.start();
  coach.previous();
  assert.equal(coach.index, 0);
  coach.observe('file-opened');
  coach.next();
  coach.observe('practice-saved');
  coach.next();

  coach.previous();
  assert.equal(coach.index, 1);
  assert.equal(coach.completed, true);
  assert.equal(coach.observe('request-sent'), false);
  coach.previous();
  assert.equal(coach.completed, true);
  coach.next();
  assert.equal(coach.completed, true);
  coach.next();
  assert.equal(coach.completed, false);
});

test('pausing keeps progress without accepting actions or navigation', () => {
  const coach = new FirstTaskTutorial();
  coach.start(false);
  coach.observe('file-opened');
  coach.next();
  coach.toggleWhy();
  coach.pause();
  assert.equal(coach.phase, 'paused');
  assert.equal(coach.observe('practice-saved'), false);
  coach.previous();
  coach.next();
  assert.equal(coach.index, 1);

  coach.resume();
  assert.equal(coach.phase, 'active');
  assert.equal(coach.why, true);
  assert.equal(coach.hints, false);
  assert.equal(coach.observe('practice-saved'), true);
  coach.next();
  assert.equal(coach.why, false);
});

test('reset returns to idle and starting again requires a new action', () => {
  const coach = new FirstTaskTutorial();
  coach.start();
  coach.observe('file-opened');
  coach.reset();
  coach.resume();
  assert.equal(coach.phase, 'idle');
  assert.equal(coach.completed, false);

  coach.start(false);
  coach.next();
  assert.equal(coach.index, 0);
  assert.equal(coach.hints, false);
});

test('the card unlocks the Next control only after an accepted action', () => {
  const coach = new FirstTaskTutorial();
  assert.equal(tutorialCard(coach), '');
  coach.start();
  assert.match(tutorialCard(coach), /data-act="tutorial-next" disabled>/);
  coach.observe('file-opened');
  assert.match(tutorialCard(coach), /data-act="tutorial-next">/);
});

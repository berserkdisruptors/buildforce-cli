import { describe, it, expect, vi } from 'vitest';
import { StepTracker } from '../../../src/lib/step-tracker.js';

describe('StepTracker', () => {
  it('creates with a title', () => {
    const tracker = new StepTracker('Test Title');
    const rendered = tracker.render();
    expect(rendered).toContain('Test Title');
  });

  it('adds steps in pending state', () => {
    const tracker = new StepTracker('Title');
    tracker.add('step1', 'First Step');
    const rendered = tracker.render();
    expect(rendered).toContain('First Step');
  });

  it('does not add duplicate keys', () => {
    const tracker = new StepTracker('Title');
    tracker.add('step1', 'First Step');
    tracker.add('step1', 'Duplicate Step');
    const rendered = tracker.render();
    expect(rendered).toContain('First Step');
    expect(rendered).not.toContain('Duplicate Step');
  });

  it('starts a step (running state)', () => {
    const tracker = new StepTracker('Title');
    tracker.add('step1', 'Step 1');
    tracker.start('step1', 'running...');
    const rendered = tracker.render();
    expect(rendered).toContain('Step 1');
    expect(rendered).toContain('running...');
  });

  it('completes a step', () => {
    const tracker = new StepTracker('Title');
    tracker.add('step1', 'Step 1');
    tracker.complete('step1', 'done!');
    const rendered = tracker.render();
    expect(rendered).toContain('done!');
  });

  it('marks step as error', () => {
    const tracker = new StepTracker('Title');
    tracker.add('step1', 'Step 1');
    tracker.error('step1', 'failed!');
    const rendered = tracker.render();
    expect(rendered).toContain('failed!');
  });

  it('marks step as skipped', () => {
    const tracker = new StepTracker('Title');
    tracker.add('step1', 'Step 1');
    tracker.skip('step1', 'not needed');
    const rendered = tracker.render();
    expect(rendered).toContain('not needed');
  });

  it('auto-adds unknown keys on update', () => {
    const tracker = new StepTracker('Title');
    tracker.complete('new-key', 'auto-added');
    const rendered = tracker.render();
    expect(rendered).toContain('auto-added');
  });

  it('calls refresh callback on changes', () => {
    const tracker = new StepTracker('Title');
    const refresh = vi.fn();
    tracker.attachRefresh(refresh);
    tracker.add('step1', 'Step 1');
    expect(refresh).toHaveBeenCalled();
  });

  it('ignores refresh callback errors', () => {
    const tracker = new StepTracker('Title');
    tracker.attachRefresh(() => { throw new Error('refresh error'); });
    // Should not throw
    expect(() => tracker.add('step1', 'Step 1')).not.toThrow();
  });

  it('renders multiple steps in order', () => {
    const tracker = new StepTracker('Title');
    tracker.add('a', 'Alpha');
    tracker.add('b', 'Beta');
    tracker.add('c', 'Charlie');
    const rendered = tracker.render();
    const aIdx = rendered.indexOf('Alpha');
    const bIdx = rendered.indexOf('Beta');
    const cIdx = rendered.indexOf('Charlie');
    expect(aIdx).toBeLessThan(bIdx);
    expect(bIdx).toBeLessThan(cIdx);
  });
});

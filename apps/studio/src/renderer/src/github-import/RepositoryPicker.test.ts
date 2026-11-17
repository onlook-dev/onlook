import { expect, test } from 'bun:test';
import type { GithubRepository } from '@studio/events';
import { listPadding, metaInk, nextRow, repositoryState, rowInk } from './RepositoryPicker.js';

const repository: GithubRepository = { id: 1, fullName: 'team/site', private: false, defaultBranch: 'main', archived: false, canPull: true, canPush: true };

test('a row carries one state, and a block outranks every other thing it could say', () => {
  expect(repositoryState(repository)).toBe('normal');
  expect(repositoryState({ ...repository, archived: true })).toBe('archived');
  expect(repositoryState({ ...repository, onThisComputer: true })).toBe('local');
  expect(repositoryState({ ...repository, archived: true, onThisComputer: true })).toBe('local');
  expect(repositoryState({ ...repository, archived: true, onThisComputer: true, access: 'sso' })).toBe('sso');
  expect(repositoryState({ ...repository, access: 'approval' })).toBe('approval');
});

test('a lifted or selected row turns white, and a blocked one never lights up', () => {
  for (const state of ['normal', 'local', 'archived'] as const) {
    expect(rowInk(state, { selected: false, lifted: false })).toBe('#e6e6e6');
    expect(rowInk(state, { selected: false, lifted: true })).toBe('#fff');
    expect(rowInk(state, { selected: true, lifted: false })).toBe('#fff');
  }
  for (const state of ['sso', 'approval'] as const) {
    expect(rowInk(state, { selected: false, lifted: true })).toBe('#7a7a7a');
    expect(rowInk(state, { selected: true, lifted: true })).toBe('#9a9a9a');
  }
});

/* The handoff rests the right-hand label a step behind the name and brings the two together only when the row lifts. */
test('a row label rests grey and joins the name in white on hover or selection', () => {
  for (const state of ['local', 'archived'] as const) {
    expect(metaInk(state, { selected: false, lifted: false })).toBe('#8a8a8a');
    expect(metaInk(state, { selected: false, lifted: true })).toBe('#fff');
    expect(metaInk(state, { selected: true, lifted: false })).toBe('#fff');
  }
  for (const state of ['sso', 'approval'] as const) {
    expect(metaInk(state, { selected: false, lifted: true })).toBe('#8a8a8a');
    expect(metaInk(state, { selected: true, lifted: true })).toBe('#9a9a9a');
  }
});

test('arrows walk the list without running off either end, and Home and End reach both', () => {
  expect(nextRow('ArrowDown', 0, 3)).toBe(1);
  expect(nextRow('ArrowDown', 2, 3)).toBe(2);
  expect(nextRow('ArrowUp', 0, 3)).toBe(0);
  expect(nextRow('ArrowUp', 2, 3)).toBe(1);
  expect(nextRow('Home', 2, 3)).toBe(0);
  expect(nextRow('End', 0, 3)).toBe(2);
  expect(nextRow('Enter', 0, 3)).toBeUndefined();
  expect(nextRow('ArrowDown', 0, 0)).toBeUndefined();
});

test('the list gives back whatever width a classic scrollbar takes, so rows end where the search field does', () => {
  expect(listPadding(0)).toBe('8px 20px 8px 20px');
  expect(listPadding(15)).toBe('8px 5px 8px 20px');
  expect(listPadding(24)).toBe('8px 0px 8px 20px');
});

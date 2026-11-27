import {replay, winner} from './utils/engineView';

test('replay preserves move routing and alternating marks', () => {
  const state = replay([40,36,4,37,13,39]);
  expect(state.activeBoard).toBe(3);
  expect(state.turn).toBe('X');
  expect(state.boards[4][4]).toBe('X');
  expect(state.boards[4][3]).toBe('O');
});
test('three drawn sectors do not form a winning line', () => {
  expect(winner(['D','D','D',null,null,null,null,null,null])).toBeNull();
  expect(winner(['X','X','X',null,null,null,null,null,null])).toBe('X');
});

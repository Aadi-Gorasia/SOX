// A board rotation/reflection must transform BOTH sector and cell coordinates.
const TRANSFORMS = Array.from({length:8}, (_,t) => Array.from({length:9}, (_,i) => {
  let row=Math.floor(i/3), col=i%3;
  if(t>=4) col=2-col;
  for(let k=0;k<t%4;k++) [row,col]=[col,2-row];
  return row*3+col;
}));
function rootSymmetries(state) {
  return TRANSFORMS.filter(map => {
    if(state.activeBoard!==null && map[state.activeBoard]!==state.activeBoard) return false;
    for(let sector=0;sector<9;sector++) {
      if(state.winners[sector]!==state.winners[map[sector]]) return false;
      for(let cell=0;cell<9;cell++) {
        if(state.boards[sector][cell]!==state.boards[map[sector]][map[cell]]) return false;
      }
    }
    return true;
  });
}
function orbit(move, symmetries) {
  const sector=Math.floor(move/9),cell=move%9;
  return Math.min(...symmetries.map(map=>map[sector]*9+map[cell]));
}
module.exports={TRANSFORMS,rootSymmetries,orbit};

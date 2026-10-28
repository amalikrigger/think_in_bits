// HAUNTED HALLS: the first Panther Prowl maze.
//
// Draw a maze with these characters (one character = one tile):
//
//   #  wall (a row of lockers)        .  candy corn
//   o  golden paw (Panther Power)     _  empty hallway (no candy)
//   P  where the panther starts       G  where a ghost starts
//   -  ghost-house door (ghosts only)
//   *  where bonus treats appear (optional)
//
// Rules the game checks when it loads (problems show up on screen):
//   - Every row is the same length.
//   - Exactly one P and one door. The door sits in the TOP wall of the ghost
//     house, with hallway above it and the house below it.
//   - The ghost house is closed in by walls, and every G is inside it.
//   - Every candy can be reached.
//   - Tunnels come in pairs: a gap at the left end of a row needs a gap at the
//     right end of the same row (same for top and bottom).
//
// Tip: keep it symmetrical, avoid dead ends, and test it by playing!

export default {
  id: 'haunted-halls',
  name: 'Haunted Halls',
  grid: `
#####################
#o.................o#
#.##.###.#.#.###.##.#
#.##.###.....###.##.#
.....................
#.##.#.#######.#.##.#
#....#....#....#....#
####.####.#.####.####
####.#.........#.####
####.#.###-###.#.####
####...#GG_GG#...####
####.#.#######.#.####
####.#....*....#.####
####.#.#######.#.####
#.........#.........#
#.##.####.#.####.##.#
#o.#......P......#.o#
##.#.###########.#.##
......#.......#......
#.###....###....###.#
#...................#
#####################
`,
};

// MIDNIGHT GYM: the second Panther Prowl maze.
//
// What's different from Haunted Halls: the ghost house is higher up, there's
// a tunnel through the TOP and BOTTOM (column 11) as well as one on the
// sides, and the panther starts lower down between two golden paws.
//
// Same characters as every maze (see haunted-halls.js for the full legend):
//   #  wall   .  candy corn   o  golden paw   _  empty hallway
//   P  panther start   G  ghost start   -  ghost-house door   *  bonus treat

export default {
  id: 'midnight-gym',
  name: 'Midnight Gym',
  grid: `
##########.##########
#o.......#.#.......o#
#.###.##.#.#.##.###.#
#...................#
#.###.#.#####.#.###.#
#.....#...#...#.....#
###.#.###.#.###.#.###
#...#...........#...#
#.#.#..###-###..#.#.#
#.#....#GG_GG#....#.#
#.#.#..#######..#.#.#
#...#...........#...#
#.###.#.#####.#.###.#
#.....#...*...#.....#
###.###.#.#.#.###.###
....#...#...#...#....
#.#.#.###.#.###.#.#.#
#o#.......P.......#o#
#.#.###.#####.###.#.#
#...................#
##########.##########
`,
};

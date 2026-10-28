// Every maze the game knows about. To add a maze: make a new file in this
// folder (copy haunted-halls.js), then import it and add it to the list below.

import hauntedHalls from './haunted-halls.js';
import midnightGym from './midnight-gym.js';

export const MAZE_SOURCES = [hauntedHalls, midnightGym];

export { Location } from './location.entity';
export { LocationInventory } from './location-inventory.entity';
export { PutawayTask } from './putaway-task.entity';
export { PutawayTaskLine } from './putaway-task-line.entity';

import { Location } from './location.entity';
import { LocationInventory } from './location-inventory.entity';
import { PutawayTask } from './putaway-task.entity';
import { PutawayTaskLine } from './putaway-task-line.entity';

export const PUTAWAY_ENTITIES = [
  Location,
  LocationInventory,
  PutawayTask,
  PutawayTaskLine,
];

/**
 * Legacy adapter that re-exports the shared ECS factory for controllers that
 * still import from the historical entities path.
 */
export {
  createWorld,
  createEntity,
  EXPECTED_COMPONENTS,
} from '../../systems/ecs/factory.js';

export { default } from '../../systems/ecs/factory.js';

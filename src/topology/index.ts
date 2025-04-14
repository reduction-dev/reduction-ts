/**
 * The Topology module has types used to define the static configuration of a
 * Reduction job.
 * @module
 */

export { Job, type JobParams } from './job';
export { Operator, type OperatorParams } from './operator';
export { ValueSpec } from './value-spec';
export { MapSpec } from './map-spec';
export { Sink } from './sink';
export { type ConfigVar, ConfigParam } from './config-var';
export { TestRun, type TestRunOptions } from './test-run';

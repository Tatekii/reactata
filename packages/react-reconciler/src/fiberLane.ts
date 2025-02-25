// 代表 update 的优先级
export type Lane = number;
// 代表 lane 的集合
export type Lanes = number;

export const NoLane = 0b0000;
export const NoLanes = 0b0000;

export const SyncLane = 0b0001;
export const InputContinuousLane = 0b0010;
export const DefaultLane = 0b0100;
export const IdleLane = 0b1000;
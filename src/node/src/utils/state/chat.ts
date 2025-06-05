import EventEmitter from 'eventemitter3';

export interface UserInterruptEvent {
  type: 'user-interrupt';
  text: string;
}

export interface TernimateEvent {
  type: 'terminate';
}

export type GlobalEvent = UserInterruptEvent | TernimateEvent;

export const globalEventEmitter = new EventEmitter<{
  [key: string]: (event: GlobalEvent) => void;
}>();
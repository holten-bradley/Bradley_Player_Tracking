import type { EventType, EventResult, ShotValue } from '../types/game';

export interface ActionLeaf {
  label: string;
  type: EventType;
  result?: EventResult;
  /** 2 or 3 for SHOT_ON so we can derive opponent points. */
  shotValue?: ShotValue;
}

export interface ActionNode {
  label: string;
  children: (ActionNode | ActionLeaf)[];
}

/** Tree for click-hold menu: Dribble / Pass / Shot → sub-options → leaf (type + result). */
export const OFFENSIVE_ACTION_TREE: ActionNode = {
  label: 'Action',
  children: [
    {
      label: 'Dribble',
      children: [
        { label: 'Turnover', type: 'TURNOVER' },
        {
          label: 'Pass',
          children: [
            { label: 'Complete', type: 'PASS', result: 'COMPLETE' },
            { label: 'Turnover', type: 'PASS', result: 'TURNOVER' },
          ],
        },
        {
          label: 'Shot',
          children: [
            { label: '2pt Make', type: 'ATTEMPTED_2', result: 'MADE' },
            { label: '2pt Miss', type: 'ATTEMPTED_2', result: 'MISSED' },
            { label: '3pt Make', type: 'ATTEMPTED_3', result: 'MADE' },
            { label: '3pt Miss', type: 'ATTEMPTED_3', result: 'MISSED' },
          ],
        },
      ],
    },
    {
      label: 'Pass',
      children: [
        { label: 'Complete', type: 'PASS', result: 'COMPLETE' },
        { label: 'Turnover', type: 'PASS', result: 'TURNOVER' },
      ],
    },
    {
      label: 'Shot',
      children: [
        { label: '2pt Make', type: 'ATTEMPTED_2', result: 'MADE' },
        { label: '2pt Miss', type: 'ATTEMPTED_2', result: 'MISSED' },
        { label: '3pt Make', type: 'ATTEMPTED_3', result: 'MADE' },
        { label: '3pt Miss', type: 'ATTEMPTED_3', result: 'MISSED' },
      ],
    },
  ],
};

/** Live tracking: Pass, Shot (→ 2pt/3pt), Dribble pass, Dribble shot (→ 2pt/3pt). */
export const LIVE_ACTION_TREE: ActionNode = {
  label: 'Action',
  children: [
    { label: 'Pass', type: 'PASS' },
    {
      label: 'Shot',
      children: [
        { label: '2pt', type: 'ATTEMPTED_2' },
        { label: '3pt', type: 'ATTEMPTED_3' },
      ],
    },
    { label: 'Dribble pass', type: 'DRIBBLE', result: 'PASS' },
    {
      label: 'Dribble shot',
      children: [
        { label: '2pt', type: 'ATTEMPTED_2' },
        { label: '3pt', type: 'ATTEMPTED_3' },
      ],
    },
  ],
};

/** Live tracking defense: Dribbled on, Shot on (→ 2pt/3pt then Make/Miss), Passed on, Forced turnover. */
export const LIVE_DEFENSIVE_ACTION_TREE: ActionNode = {
  label: 'Action',
  children: [
    { label: 'Dribbled on', type: 'DRIBBLED_ON' },
    {
      label: 'Shot on',
      children: [
        { label: '2pt', type: 'SHOT_ON', shotValue: 2 },
        { label: '3pt', type: 'SHOT_ON', shotValue: 3 },
      ],
    },
    { label: 'Passed on', type: 'PASS_ON' },
    { label: 'Forced turnover', type: 'TURNOVER' },
  ],
};

/** Tree for defense: SHOT_ON (2pt/3pt + make/miss), PASS_ON, DRIBBLED_ON. */
export const DEFENSIVE_ACTION_TREE: ActionNode = {
  label: 'Action',
  children: [
    {
      label: 'Shot on',
      children: [
        { label: '2pt Make', type: 'SHOT_ON', result: 'SHOT_MADE', shotValue: 2 },
        { label: '2pt Miss', type: 'SHOT_ON', result: 'SHOT_MISSED', shotValue: 2 },
        { label: '3pt Make', type: 'SHOT_ON', result: 'SHOT_MADE', shotValue: 3 },
        { label: '3pt Miss', type: 'SHOT_ON', result: 'SHOT_MISSED', shotValue: 3 },
      ],
    },
    {
      label: 'Pass on',
      children: [
        { label: 'Pass completed', type: 'PASS_ON', result: 'PASS_COMPLETED' },
        { label: 'Pass incomplete', type: 'PASS_ON', result: 'PASS_INCOMPLETE' },
      ],
    },
    {
      label: 'Dribbled on',
      children: [
        { label: 'Forced turnover', type: 'DRIBBLED_ON', result: 'FORCED_TURNOVER' },
        { label: 'Forced pass', type: 'DRIBBLED_ON', result: 'FORCED_PASS' },
        { label: 'Allowed continued', type: 'DRIBBLED_ON', result: 'ALLOWED_CONTINUED' },
      ],
    },
  ],
};

function isLeaf(node: ActionNode | ActionLeaf): node is ActionLeaf {
  return 'type' in node;
}

export function getLeaf(node: ActionNode | ActionLeaf): ActionLeaf | null {
  if (isLeaf(node)) return node;
  return null;
}

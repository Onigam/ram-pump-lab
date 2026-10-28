// Explode offsets of the ram world (metres at explode 1), every part moving along the axis it is assembled on. All the parts
// of the ram are lifted off the anchor studs of the foundation by `LIFT`, and then move along their own axis: the valves and
// the flange along X (upstream or downstream), the stacks (waste valve, check valve, chamber, gauge, snifter) up. The outlet
// valve and the union follow the chamber, so that they stay coaxial with its outlet port. The foundation only steps up by a
// few millimetres: it is the reference everything leaves.

/** Height by which the ram is lifted off the studs of its foundation. */
export const LIFT = 0.07;

export const EXPLODE: Record<string, [number, number, number]> = {
  ram: [0, LIFT, 0],
  'inlet-valve': [-0.14, LIFT, 0],
  strainer: [-0.3, LIFT, 0],
  'inlet-flange': [-0.46, LIFT, 0],
  'waste-valve': [0, LIFT + 0.18, 0],
  'delivery-valve': [0, LIFT + 0.11, 0],
  snifter: [0, LIFT + 0.11, 0],
  'air-chamber': [0, LIFT + 0.22, 0],
  gauge: [0, LIFT + 0.34, 0],
  'outlet-valve': [0.16, LIFT + 0.22, 0],
  'delivery-union': [0.32, LIFT + 0.22, 0],
  'drain-valve': [0.22, LIFT, 0],
  foundation: [0, 0.003, 0],
};

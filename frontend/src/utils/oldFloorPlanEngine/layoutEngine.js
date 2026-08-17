export default function layoutEngine(project, building) {
  const width = Number(building?.length) || 35;
  const height = Number(building?.width) || 32;

  /*
    Template proportions are based on the building dimensions.

    Coordinate system:

    (0,0) ───────────────────────── width
      │
      │
      │
    height
  */

  return [
    {
      id: "kitchen",
      type: "kitchen",
      name: "Kitchen & Dining",
      x: 0,
      y: 0,
      width: width * 0.36,
      height: height * 0.42,
    },

    {
      id: "living",
      type: "living",
      name: "Living Room",
      x: width * 0.36,
      y: 0,
      width: width * 0.36,
      height: height * 0.42,
    },

    {
      id: "bedroom-2",
      type: "bedroom",
      name: "Bedroom 2",
      x: width * 0.72,
      y: 0,
      width: width * 0.28,
      height: height * 0.5,
    },

    {
      id: "utility",
      type: "utility",
      name: "Utility",
      x: 0,
      y: height * 0.42,
      width: width * 0.2,
      height: height * 0.23,
    },

    {
      id: "bathroom",
      type: "bathroom",
      name: "Bathroom",
      x: width * 0.2,
      y: height * 0.42,
      width: width * 0.2,
      height: height * 0.23,
    },

    {
      id: "passage",
      type: "passage",
      name: "Passage",
      x: width * 0.4,
      y: height * 0.42,
      width: width * 0.32,
      height: height * 0.23,
    },

    {
      id: "master-bedroom",
      type: "bedroom",
      name: "Master Bedroom",
      x: 0,
      y: height * 0.65,
      width: width * 0.4,
      height: height * 0.35,
    },

    {
      id: "family-area",
      type: "living",
      name: "Family Area",
      x: width * 0.4,
      y: height * 0.65,
      width: width * 0.32,
      height: height * 0.35,
    },

    {
      id: "bedroom-3",
      type: "bedroom",
      name: "Bedroom 3",
      x: width * 0.72,
      y: height * 0.5,
      width: width * 0.28,
      height: height * 0.5,
    },
  ];
}
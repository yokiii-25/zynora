const steps = [
  {
    number: "01",
    title: "Choose",
    description:
      "Start a new AI-powered project or choose to upload your existing floor plan.",
  },
  {
    number: "02",
    title: "Generate / Upload",
    description:
      "Generate a custom design using AI or upload your architect's plan for visualization.",
  },
  {
    number: "03",
    title: "Customize",
    description:
      "Modify layouts, rooms, interiors, materials, and exterior styles to match your vision.",
  },
  {
    number: "04",
    title: "Visualize",
    description:
      "Experience your project in an interactive 3D environment before construction begins.",
  },
  {
    number: "05",
    title: "Build",
    description:
      "Use your finalized design as the foundation for planning and construction.",
  },
];

function HowItWorks() {
  return (
    <section className="howItWorksSection" id="how-it-works">
      <div className="sectionHeader">
        <p className="sectionEyebrow">HOW IT WORKS</p>
        <h2>From idea to reality in five simple steps</h2>
        <p>
          Whether you're creating a new home or visualizing an existing plan,
          Zynora guides you through the complete design journey.
        </p>
      </div>

      <div className="stepsContainer">
        {steps.map((step) => (
          <div className="stepCard" key={step.number}>
            <div className="stepNumber">{step.number}</div>

            <h3>{step.title}</h3>

            <p>{step.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default HowItWorks;
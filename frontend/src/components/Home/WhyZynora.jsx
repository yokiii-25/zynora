const reasons = [
  {
    icon: "🤖",
    title: "AI Powered",
    description:
      "Generate smarter home designs based on your requirements, preferences, and project details.",
  },
  {
    icon: "🧊",
    title: "Interactive 3D",
    description:
      "Explore your design in an interactive 3D environment before construction begins.",
  },
  {
    icon: "📍",
    title: "Location Aware",
    description:
      "Create designs that consider plot orientation, climate, sunlight, and surrounding conditions.",
  },
  {
    icon: "⚡",
    title: "Faster Than Traditional Design",
    description:
      "Move from idea to visualization faster while keeping full control over your design decisions.",
  },
];

function WhyZynora() {
  return (
    <section className="whyZynoraSection" id="features">
      <div className="sectionHeader">
        <p className="sectionEyebrow">WHY ZYNORA?</p>
        <h2>Smarter tools for better home design</h2>
        <p>
          Zynora combines artificial intelligence, visualization, and location
          intelligence to simplify the design process.
        </p>
      </div>

      <div className="reasonGrid">
        {reasons.map((reason) => (
          <article className="reasonCard" key={reason.title}>
            <div className="reasonIcon" aria-hidden="true">
              {reason.icon}
            </div>

            <h3>{reason.title}</h3>
            <p>{reason.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export default WhyZynora;
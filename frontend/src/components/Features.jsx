const features = [
  {
    icon: "🎙️",
    title: "Design Through Conversation",
    description:
      "Explain your dream home naturally using voice or text in your preferred language.",
  },
  {
    icon: "🌍",
    title: "Location-Aware Design",
    description:
      "ZYNORA considers climate, sunlight, wind, terrain, and local conditions.",
  },
  {
    icon: "🏡",
    title: "Personalized Spaces",
    description:
      "Designs adapt to your family, lifestyle, accessibility needs, and budget.",
  },
];

function Features() {
  return (
    <section className="features" id="features">
      <div className="sectionHeading">
        <p className="eyebrow">DESIGN INTELLIGENTLY</p>
        <h2>More than a floor-plan generator</h2>
        <p>
          ZYNORA understands the people and environment behind every home.
        </p>
      </div>

      <div className="featureGrid">
        {features.map((feature) => (
          <article className="featureCard" key={feature.title}>
            <div className="featureIcon">{feature.icon}</div>
            <h3>{feature.title}</h3>
            <p>{feature.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export default Features;
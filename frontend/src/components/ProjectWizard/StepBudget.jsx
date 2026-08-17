function StepBudget({ project, setProject }) {
  const styleOptions = [
    "Modern",
    "Minimalist",
    "Traditional",
    "Contemporary",
    "Luxury",
    "Industrial",
    "Tropical",
    "Eco-Friendly",
  ];

  const materialOptions = [
    "Concrete",
    "Brick",
    "Wood",
    "Stone",
    "Glass",
    "Steel",
  ];

  const sustainabilityOptions = [
    "Solar Panels",
    "Rainwater Harvesting",
    "Natural Ventilation",
    "Energy-Efficient Lighting",
    "Greywater Recycling",
    "Green Roof",
  ];

  function handleChange(event) {
    const { name, value } = event.target;

    setProject({
      ...project,
      [name]: value,
    });
  }

  function handleOptionChange(option, category) {
    const currentOptions = project[category] || [];

    const updatedOptions = currentOptions.includes(option)
      ? currentOptions.filter((item) => item !== option)
      : [...currentOptions, option];

    setProject({
      ...project,
      [category]: updatedOptions,
    });
  }

  return (
    <div className="wizardStep">
      <p className="wizardEyebrow">BUDGET & DESIGN</p>

      <h2>Define your budget and preferred style</h2>

      <p className="wizardDescription">
        These preferences help ZYNORA generate a design that matches your
        financial plan, visual taste, and sustainability goals.
      </p>

      <div className="formSection">
        <h3>Budget details</h3>

        <div className="formGrid">
          <div>
            <label htmlFor="budget">Estimated budget</label>

            <input
              id="budget"
              name="budget"
              type="number"
              min="1"
              placeholder="Example: 5000000"
              value={project.budget}
              onChange={handleChange}
            />
          </div>

          <div>
            <label htmlFor="currency">Currency</label>

            <select
              id="currency"
              name="currency"
              value={project.currency}
              onChange={handleChange}
            >
              <option value="">Select currency</option>
              <option value="INR">Indian Rupee — INR</option>
              <option value="USD">US Dollar — USD</option>
              <option value="EUR">Euro — EUR</option>
              <option value="GBP">British Pound — GBP</option>
              <option value="AED">UAE Dirham — AED</option>
            </select>
          </div>

          <div>
            <label htmlFor="budgetFlexibility">Budget flexibility</label>

            <select
              id="budgetFlexibility"
              name="budgetFlexibility"
              value={project.budgetFlexibility}
              onChange={handleChange}
            >
              <option value="">Select flexibility</option>
              <option value="Strict">Strict budget</option>
              <option value="Up to 5%">Up to 5% extra</option>
              <option value="Up to 10%">Up to 10% extra</option>
              <option value="Flexible">Flexible for better design</option>
            </select>
          </div>

          <div>
            <label htmlFor="constructionPriority">
              Construction priority
            </label>

            <select
              id="constructionPriority"
              name="constructionPriority"
              value={project.constructionPriority}
              onChange={handleChange}
            >
              <option value="">Select priority</option>
              <option value="Lowest Cost">Lowest cost</option>
              <option value="Balanced">Balanced cost and quality</option>
              <option value="Premium Quality">Premium quality</option>
              <option value="Fast Completion">Fast completion</option>
            </select>
          </div>
        </div>
      </div>

      <div className="formSection">
        <h3>Architectural style</h3>

        <div className="optionGrid">
          {styleOptions.map((option) => (
            <label className="optionCard" key={option}>
              <input
                type="radio"
                name="style"
                value={option}
                checked={project.style === option}
                onChange={handleChange}
              />

              <span>{option}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="formSection">
        <h3>Preferred materials</h3>

        <div className="optionGrid">
          {materialOptions.map((option) => (
            <label className="optionCard" key={option}>
              <input
                type="checkbox"
                checked={(project.preferredMaterials || []).includes(option)}
                onChange={() =>
                  handleOptionChange(option, "preferredMaterials")
                }
              />

              <span>{option}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="formSection">
        <h3>Sustainability features</h3>

        <div className="optionGrid">
          {sustainabilityOptions.map((option) => (
            <label className="optionCard" key={option}>
              <input
                type="checkbox"
                checked={(project.sustainabilityFeatures || []).includes(
                  option
                )}
                onChange={() =>
                  handleOptionChange(option, "sustainabilityFeatures")
                }
              />

              <span>{option}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="formSection">
        <h3>Additional design notes</h3>

        <label htmlFor="designNotes">
          Tell ZYNORA about any special ideas
        </label>

        <textarea
          id="designNotes"
          name="designNotes"
          rows="5"
          placeholder="Example: I want a large open kitchen, natural lighting, a quiet study room, and a garden-facing living room."
          value={project.designNotes}
          onChange={handleChange}
        />
      </div>
    </div>
  );
}

export default StepBudget;
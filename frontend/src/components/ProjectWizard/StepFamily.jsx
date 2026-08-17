function StepFamily({ project, setProject }) {
  const lifestyleOptions = [
    "Home Office",
    "Prayer Room",
    "Garden",
    "Home Gym",
    "Home Theater",
    "Swimming Pool",
    "Elevator",
    "Balcony",
  ];

  const accessibilityOptions = [
    "Wheelchair Friendly",
    "Entrance Ramp",
    "Wide Doors",
    "Ground-Floor Bedroom",
    "Accessible Bathroom",
  ];

  function handleChange(event) {
    const { name, value, type, checked } = event.target;

    setProject({
      ...project,
      [name]: type === "checkbox" ? checked : value,
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
      <p className="wizardEyebrow">FAMILY & LIFESTYLE</p>

      <h2>Who will live in this home?</h2>

      <p className="wizardDescription">
        These details help ZYNORA create a home that matches your family,
        lifestyle, room needs, and accessibility requirements.
      </p>

      <div className="formSection">
        <h3>Family details</h3>

        <div className="formGrid">
          <div>
            <label htmlFor="familySize">Family members</label>

            <input
              id="familySize"
              name="familySize"
              type="number"
              min="1"
              placeholder="Example: 4"
              value={project.familySize}
              onChange={handleChange}
            />
          </div>

          <div>
            <label htmlFor="children">Children</label>

            <input
              id="children"
              name="children"
              type="number"
              min="0"
              placeholder="Example: 2"
              value={project.children}
              onChange={handleChange}
            />
          </div>

          <div>
            <label htmlFor="seniorCitizens">Senior citizens</label>

            <input
              id="seniorCitizens"
              name="seniorCitizens"
              type="number"
              min="0"
              placeholder="Example: 1"
              value={project.seniorCitizens}
              onChange={handleChange}
            />
          </div>

          <div>
            <label htmlFor="pets">Pets</label>

            <input
              id="pets"
              name="pets"
              type="number"
              min="0"
              placeholder="Example: 1"
              value={project.pets}
              onChange={handleChange}
            />
          </div>
        </div>
      </div>

      <div className="formSection">
        <h3>Room requirements</h3>

        <div className="formGrid">
          <div>
            <label htmlFor="bedrooms">Bedrooms</label>

            <select
              id="bedrooms"
              name="bedrooms"
              value={project.bedrooms}
              onChange={handleChange}
            >
              <option value="">Select bedrooms</option>
              <option value="1">1 bedroom</option>
              <option value="2">2 bedrooms</option>
              <option value="3">3 bedrooms</option>
              <option value="4">4 bedrooms</option>
              <option value="5">5 bedrooms</option>
              <option value="6+">6 or more</option>
            </select>
          </div>

          <div>
            <label htmlFor="bathrooms">Bathrooms</label>

            <select
              id="bathrooms"
              name="bathrooms"
              value={project.bathrooms}
              onChange={handleChange}
            >
              <option value="">Select bathrooms</option>
              <option value="1">1 bathroom</option>
              <option value="2">2 bathrooms</option>
              <option value="3">3 bathrooms</option>
              <option value="4">4 bathrooms</option>
              <option value="5+">5 or more</option>
            </select>
          </div>

          <div>
            <label htmlFor="parkingSpaces">Parking spaces</label>

            <select
              id="parkingSpaces"
              name="parkingSpaces"
              value={project.parkingSpaces}
              onChange={handleChange}
            >
              <option value="">Select parking</option>
              <option value="0">No parking</option>
              <option value="1">1 vehicle</option>
              <option value="2">2 vehicles</option>
              <option value="3">3 vehicles</option>
              <option value="4+">4 or more</option>
            </select>
          </div>

          <div>
            <label htmlFor="workFromHome">Work from home?</label>

            <select
              id="workFromHome"
              name="workFromHome"
              value={project.workFromHome}
              onChange={handleChange}
            >
              <option value="">Select an option</option>
              <option value="No">No</option>
              <option value="Sometimes">Sometimes</option>
              <option value="Yes">Yes</option>
            </select>
          </div>
        </div>
      </div>

      <div className="formSection">
        <h3>Lifestyle features</h3>

        <div className="optionGrid">
          {lifestyleOptions.map((option) => (
            <label className="optionCard" key={option}>
              <input
                type="checkbox"
                checked={(project.lifestyleFeatures || []).includes(option)}
                onChange={() =>
                  handleOptionChange(option, "lifestyleFeatures")
                }
              />

              <span>{option}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="formSection">
        <h3>Accessibility requirements</h3>

        <div className="optionGrid">
          {accessibilityOptions.map((option) => (
            <label className="optionCard" key={option}>
              <input
                type="checkbox"
                checked={(project.accessibilityFeatures || []).includes(
                  option
                )}
                onChange={() =>
                  handleOptionChange(option, "accessibilityFeatures")
                }
              />

              <span>{option}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

export default StepFamily;
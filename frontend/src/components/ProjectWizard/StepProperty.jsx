function StepProperty({ project, setProject }) {
  function handleChange(event) {
    const { name, value } = event.target;

    setProject({
      ...project,
      [name]: value,
    });
  }

  return (
    <div className="wizardStep">
      <p className="wizardEyebrow">PROPERTY DETAILS</p>

      <h2>Tell us about your land</h2>

      <p className="wizardDescription">
        These details help ZYNORA understand the available space and basic site
        orientation.
      </p>

      <div className="formGrid">
        <div>
          <label htmlFor="propertyType">Property type</label>

          <select
            id="propertyType"
            name="propertyType"
            value={project.propertyType}
            onChange={handleChange}
          >
            <option value="">Select property type</option>
            <option value="House">House</option>
            <option value="Villa">Villa</option>
            <option value="Apartment">Apartment</option>
            <option value="Farmhouse">Farmhouse</option>
          </select>
        </div>

        <div>
          <label htmlFor="floors">Number of floors</label>

          <select
            id="floors"
            name="floors"
            value={project.floors}
            onChange={handleChange}
          >
            <option value="">Select floors</option>
            <option value="1">Ground floor only</option>
            <option value="2">Two floors</option>
            <option value="3">Three floors</option>
            <option value="4+">Four or more</option>
          </select>
        </div>

        <div>
          <label htmlFor="landLength">Land length</label>

          <input
            id="landLength"
            name="landLength"
            type="number"
            min="1"
            placeholder="Example: 60"
            value={project.landLength}
            onChange={handleChange}
          />
        </div>

        <div>
          <label htmlFor="landWidth">Land width</label>

          <input
            id="landWidth"
            name="landWidth"
            type="number"
            min="1"
            placeholder="Example: 40"
            value={project.landWidth}
            onChange={handleChange}
          />
        </div>

        <div>
          <label htmlFor="measurementUnit">Measurement unit</label>

          <select
            id="measurementUnit"
            name="measurementUnit"
            value={project.measurementUnit}
            onChange={handleChange}
          >
            <option value="">Select unit</option>
            <option value="Feet">Feet</option>
            <option value="Meters">Meters</option>
          </select>
        </div>

        <div>
          <label htmlFor="roadFacing">Road-facing direction</label>

          <select
            id="roadFacing"
            name="roadFacing"
            value={project.roadFacing}
            onChange={handleChange}
          >
            <option value="">Select direction</option>
            <option value="North">North</option>
            <option value="East">East</option>
            <option value="South">South</option>
            <option value="West">West</option>
            <option value="Unknown">Not sure</option>
          </select>
        </div>

        <div className="fullWidthField">
          <label htmlFor="plotShape">Plot shape</label>

          <select
            id="plotShape"
            name="plotShape"
            value={project.plotShape}
            onChange={handleChange}
          >
            <option value="">Select plot shape</option>
            <option value="Rectangle">Rectangle</option>
            <option value="Square">Square</option>
            <option value="Irregular">Irregular</option>
            <option value="Corner Plot">Corner plot</option>
          </select>
        </div>
      </div>
    </div>
  );
}

export default StepProperty;
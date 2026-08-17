function StepLocation({ project, setProject }) {
  function handleLocationChange(event) {
    setProject({
      ...project,
      location: event.target.value,
    });
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      alert("Location access is not supported by this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        setProject({
          ...project,
          latitude,
          longitude,
          location: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
        });
      },
      () => {
        alert("Unable to access your location. Please enter it manually.");
      }
    );
  }

  return (
    <div className="wizardStep">
      <p className="wizardEyebrow">PROPERTY LOCATION</p>

      <h2>Where will your home be built?</h2>

      <p className="wizardDescription">
        Enter the city, area, or address. Later, we will connect this step to
        Google Maps and environmental analysis.
      </p>

      <label htmlFor="projectLocation">Location</label>

      <input
        id="projectLocation"
        type="text"
        placeholder="Example: Coimbatore, Tamil Nadu"
        value={project.location}
        onChange={handleLocationChange}
      />

      <button
        type="button"
        className="locationButton"
        onClick={useCurrentLocation}
      >
        📍 Use my current location
      </button>

      {project.latitude && project.longitude && (
        <div className="locationResult">
          <strong>Location captured</strong>
          <span>Latitude: {project.latitude.toFixed(5)}</span>
          <span>Longitude: {project.longitude.toFixed(5)}</span>
        </div>
      )}
    </div>
  );
}

export default StepLocation;
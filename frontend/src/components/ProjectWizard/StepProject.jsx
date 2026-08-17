function StepProject({ project, setProject }) {
  function handleNameChange(event) {
    setProject({
      ...project,
      name: event.target.value,
    });
  }

  return (
    <div className="wizardStep">
      <p className="wizardEyebrow">LET'S BEGIN</p>

      <h2>Name your home project</h2>

      <p className="wizardDescription">
        Choose a memorable name for your future home.
      </p>

      <label htmlFor="projectName">Project name</label>

      <input
        id="projectName"
        name="projectName"
        type="text"
        placeholder="Example: Green Haven Villa"
        value={project.name}
        onChange={handleNameChange}
        autoFocus
      />
    </div>
  );
}

export default StepProject;
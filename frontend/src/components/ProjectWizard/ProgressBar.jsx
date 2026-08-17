function ProgressBar({ currentStep, totalSteps }) {
  const percentage = (currentStep / totalSteps) * 100;

  return (
    <div className="progressWrapper">
      <div className="progressInfo">
        <span>
          Step {currentStep} of {totalSteps}
        </span>

        <span>{Math.round(percentage)}%</span>
      </div>

      <div className="progressTrack">
        <div
          className="progressFill"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export default ProgressBar;
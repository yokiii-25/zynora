function WizardNavigation({
  currentStep,
  totalSteps,
  nextStep,
  previousStep,
  loading,
}) {
  const isFirstStep = currentStep === 1;
  const isFinalStep = currentStep === totalSteps;

  return (
    <div className="wizardNavigation">
      <button
        type="button"
        className="wizardSecondaryButton"
        onClick={previousStep}
        disabled={isFirstStep || loading}
      >
        ← Previous
      </button>

      {!isFinalStep ? (
        <button
          type="button"
          className="wizardPrimaryButton"
          onClick={nextStep}
          disabled={loading}
        >
          Continue →
        </button>
      ) : (
        <button
          type="submit"
          className="wizardPrimaryButton"
          disabled={loading}
        >
          {loading
            ? "Generating Floor Plan..."
            : "Generate Floor Plan"}
        </button>
      )}
    </div>
  );
}

export default WizardNavigation;
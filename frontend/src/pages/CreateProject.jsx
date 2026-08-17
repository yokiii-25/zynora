import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import ProgressBar from "../components/ProjectWizard/ProgressBar";
import WizardNavigation from "../components/ProjectWizard/WizardNavigation";
import StepProject from "../components/ProjectWizard/StepProject";
import StepLocation from "../components/ProjectWizard/StepLocation";
import StepProperty from "../components/ProjectWizard/StepProperty";
import StepFamily from "../components/ProjectWizard/StepFamily";
import StepBudget from "../components/ProjectWizard/StepBudget";

function CreateProject() {
  const totalSteps = 6;

  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  const [project, setProject] = useState({
    name: "",
    location: "",
    latitude: null,
    longitude: null,

    propertyType: "",
    floors: "",
    landLength: "",
    landWidth: "",
    measurementUnit: "",
    roadFacing: "",
    plotShape: "",

    familySize: "",
    children: "",
    seniorCitizens: "",
    pets: "",
    bedrooms: "",
    bathrooms: "",
    parkingSpaces: "",
    workFromHome: "",
    lifestyleFeatures: [],
    accessibilityFeatures: [],

    budget: "",
    currency: "",
    budgetFlexibility: "",
    constructionPriority: "",
    style: "",
    preferredMaterials: [],
    sustainabilityFeatures: [],
    designNotes: "",
  });

  function nextStep() {
    if (loading) {
      return;
    }

    if (currentStep === 1 && !project.name.trim()) {
      alert("Please enter a project name.");
      return;
    }

    if (currentStep === 2 && !project.location.trim()) {
      alert("Please enter or capture the property location.");
      return;
    }

    if (currentStep === 3) {
      if (!project.propertyType) {
        alert("Please select the property type.");
        return;
      }

      if (!project.floors) {
        alert("Please select the number of floors.");
        return;
      }

      if (!project.landLength || Number(project.landLength) <= 0) {
        alert("Please enter a valid land length.");
        return;
      }

      if (!project.landWidth || Number(project.landWidth) <= 0) {
        alert("Please enter a valid land width.");
        return;
      }

      if (!project.measurementUnit) {
        alert("Please select the measurement unit.");
        return;
      }

      if (!project.roadFacing) {
        alert("Please select the road-facing direction.");
        return;
      }

      if (!project.plotShape) {
        alert("Please select the plot shape.");
        return;
      }
    }

    if (currentStep === 4) {
      if (!project.familySize || Number(project.familySize) < 1) {
        alert("Please enter the number of family members.");
        return;
      }

      if (project.children === "" || Number(project.children) < 0) {
        alert("Please enter the number of children.");
        return;
      }

      if (
        project.seniorCitizens === "" ||
        Number(project.seniorCitizens) < 0
      ) {
        alert("Please enter the number of senior citizens.");
        return;
      }

      if (project.pets === "" || Number(project.pets) < 0) {
        alert("Please enter the number of pets.");
        return;
      }

      const countedFamilyMembers =
        Number(project.children) + Number(project.seniorCitizens);

      if (countedFamilyMembers > Number(project.familySize)) {
        alert(
          "Children and senior citizens cannot exceed the total family size."
        );
        return;
      }

      if (!project.bedrooms) {
        alert("Please select the number of bedrooms.");
        return;
      }

      if (!project.bathrooms) {
        alert("Please select the number of bathrooms.");
        return;
      }

      if (project.parkingSpaces === "") {
        alert("Please select the required parking spaces.");
        return;
      }

      if (!project.workFromHome) {
        alert("Please select your work-from-home preference.");
        return;
      }
    }

    if (currentStep === 5) {
      if (!project.budget || Number(project.budget) <= 0) {
        alert("Please enter a valid estimated budget.");
        return;
      }

      if (!project.currency) {
        alert("Please select the budget currency.");
        return;
      }

      if (!project.budgetFlexibility) {
        alert("Please select the budget flexibility.");
        return;
      }

      if (!project.constructionPriority) {
        alert("Please select the construction priority.");
        return;
      }

      if (!project.style) {
        alert("Please select an architectural style.");
        return;
      }
    }

    setCurrentStep((previousStep) =>
      Math.min(previousStep + 1, totalSteps)
    );
  }

  function previousStep() {
    if (loading) {
      return;
    }

    setCurrentStep((previousStep) =>
      Math.max(previousStep - 1, 1)
    );
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (loading || currentStep !== totalSteps) {
      return;
    }

    try {
      localStorage.setItem(
        "zynoraProjectData",
        JSON.stringify(project)
      );

      // The site planner is the geometry gate between requirements and plan
      // generation. It lets the user confirm footprint, rotation/placement,
      // and setbacks before the backend retrieves and validates a plan.
      localStorage.setItem(
        "zynoraDesignResult",
        JSON.stringify({
          source: "project_requirements",
          design: {},
        })
      );

      navigate("/site-planner");
    } catch (error) {
      console.error("Unable to save project details:", error);

      alert(
        error.message ||
          "Unable to continue to site planning. Please try again."
      );
    }
  }

  function renderCurrentStep() {
    switch (currentStep) {
      case 1:
        return (
          <StepProject
            project={project}
            setProject={setProject}
          />
        );

      case 2:
        return (
          <StepLocation
            project={project}
            setProject={setProject}
          />
        );

      case 3:
        return (
          <StepProperty
            project={project}
            setProject={setProject}
          />
        );

      case 4:
        return (
          <StepFamily
            project={project}
            setProject={setProject}
          />
        );

      case 5:
        return (
          <StepBudget
            project={project}
            setProject={setProject}
          />
        );

      case 6:
        return (
          <div className="wizardStep">
            <p className="wizardEyebrow">FINAL REVIEW</p>

            <h2>Review your project</h2>

            <p className="wizardDescription">
              Confirm the information before ZYNORA generates your floor plan.
            </p>

            <div className="reviewSummary">
              <div>
                <span>Project name</span>
                <strong>{project.name || "Not provided"}</strong>
              </div>

              <div>
                <span>Location</span>
                <strong>{project.location || "Not provided"}</strong>
              </div>

              {project.latitude !== null &&
                project.longitude !== null && (
                  <div>
                    <span>Coordinates</span>

                    <strong>
                      {Number(project.latitude).toFixed(5)},{" "}
                      {Number(project.longitude).toFixed(5)}
                    </strong>
                  </div>
                )}

              <div>
                <span>Property type</span>
                <strong>{project.propertyType || "Not provided"}</strong>
              </div>

              <div>
                <span>Floors</span>
                <strong>{project.floors || "Not provided"}</strong>
              </div>

              <div>
                <span>Land dimensions</span>

                <strong>
                  {project.landLength && project.landWidth
                    ? `${project.landLength} × ${project.landWidth} ${
                        project.measurementUnit || ""
                      }`
                    : "Not provided"}
                </strong>
              </div>

              <div>
                <span>Road-facing direction</span>
                <strong>{project.roadFacing || "Not provided"}</strong>
              </div>

              <div>
                <span>Plot shape</span>
                <strong>{project.plotShape || "Not provided"}</strong>
              </div>

              <div>
                <span>Family members</span>
                <strong>{project.familySize || "Not provided"}</strong>
              </div>

              <div>
                <span>Children</span>
                <strong>
                  {project.children !== ""
                    ? project.children
                    : "Not provided"}
                </strong>
              </div>

              <div>
                <span>Senior citizens</span>
                <strong>
                  {project.seniorCitizens !== ""
                    ? project.seniorCitizens
                    : "Not provided"}
                </strong>
              </div>

              <div>
                <span>Pets</span>
                <strong>
                  {project.pets !== ""
                    ? project.pets
                    : "Not provided"}
                </strong>
              </div>

              <div>
                <span>Bedrooms</span>
                <strong>{project.bedrooms || "Not provided"}</strong>
              </div>

              <div>
                <span>Bathrooms</span>
                <strong>{project.bathrooms || "Not provided"}</strong>
              </div>

              <div>
                <span>Parking spaces</span>
                <strong>
                  {project.parkingSpaces !== ""
                    ? project.parkingSpaces
                    : "Not provided"}
                </strong>
              </div>

              <div>
                <span>Work from home</span>
                <strong>{project.workFromHome || "Not provided"}</strong>
              </div>

              <div>
                <span>Lifestyle features</span>
                <strong>
                  {project.lifestyleFeatures.length > 0
                    ? project.lifestyleFeatures.join(", ")
                    : "None selected"}
                </strong>
              </div>

              <div>
                <span>Accessibility features</span>
                <strong>
                  {project.accessibilityFeatures.length > 0
                    ? project.accessibilityFeatures.join(", ")
                    : "None selected"}
                </strong>
              </div>

              <div>
                <span>Budget</span>
                <strong>
                  {project.budget
                    ? `${project.currency} ${Number(
                        project.budget
                      ).toLocaleString()}`
                    : "Not provided"}
                </strong>
              </div>

              <div>
                <span>Budget flexibility</span>
                <strong>
                  {project.budgetFlexibility || "Not provided"}
                </strong>
              </div>

              <div>
                <span>Construction priority</span>
                <strong>
                  {project.constructionPriority || "Not provided"}
                </strong>
              </div>

              <div>
                <span>Architectural style</span>
                <strong>{project.style || "Not provided"}</strong>
              </div>

              <div>
                <span>Preferred materials</span>
                <strong>
                  {project.preferredMaterials.length > 0
                    ? project.preferredMaterials.join(", ")
                    : "None selected"}
                </strong>
              </div>

              <div>
                <span>Sustainability features</span>
                <strong>
                  {project.sustainabilityFeatures.length > 0
                    ? project.sustainabilityFeatures.join(", ")
                    : "None selected"}
                </strong>
              </div>

              <div>
                <span>Additional notes</span>
                <strong>
                  {project.designNotes.trim() || "No additional notes"}
                </strong>
              </div>
            </div>

            {loading && (
              <div className="generationStatus">
                <p>Generating your floor plan...</p>
                <span>
                  ZYNORA is selecting, adapting, and validating the best plan.
                </span>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  }

  return (
    <main className="createProjectPage">
      <div className="wizardContainer">
        <div className="wizardHeader">
          <Link to="/" className="wizardBrand">
            ZYNORA
          </Link>

          <Link to="/" className="backHomeLink">
            ← Back to home
          </Link>
        </div>

        <ProgressBar
          currentStep={currentStep}
          totalSteps={totalSteps}
        />

        <form className="wizardForm" onSubmit={handleSubmit}>
          {renderCurrentStep()}

          <WizardNavigation
            currentStep={currentStep}
            totalSteps={totalSteps}
            nextStep={nextStep}
            previousStep={previousStep}
            loading={loading}
          />
        </form>
      </div>
    </main>
  );
}

export default CreateProject;

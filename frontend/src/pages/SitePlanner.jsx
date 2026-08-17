import { useNavigate } from "react-router-dom";
import SitePlannerCanvas from "../components/SitePlanner/SitePlannerCanvas";

function SitePlanner() {
  const navigate = useNavigate();

  const storedResult = localStorage.getItem(
    "zynoraDesignResult"
  );

  const storedProject = localStorage.getItem(
    "zynoraProjectData"
  );

  let result = null;
  let project = null;

  try {
    result = storedResult
      ? JSON.parse(storedResult)
      : null;

    project = storedProject
      ? JSON.parse(storedProject)
      : null;
  } catch (error) {
    console.error(
      "Unable to read site planner data:",
      error
    );
  }

  if (!result || !project) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-20 text-white">
        <div className="mx-auto max-w-xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-emerald-400">
            ZYNORA Site Planner
          </p>

          <h1 className="mt-3 text-3xl font-bold">
            Site planning data is missing
          </h1>

          <p className="mt-4 text-slate-400">
            Complete the project wizard and generate
            the design before opening the site planner.
          </p>

          <button
            type="button"
            onClick={() =>
              navigate("/create-project")
            }
            className="mt-8 rounded-xl bg-emerald-500 px-6 py-3 font-semibold text-slate-950 transition hover:bg-emerald-400"
          >
            Create Project
          </button>
        </div>
      </main>
    );
  }

  function handleConfirmLayout(layout) {
    try {
      localStorage.setItem(
        "zynoraSiteLayout",
        JSON.stringify(layout)
      );

      navigate("/floor-plan");
    } catch (error) {
      console.error(
        "Unable to save site layout:",
        error
      );

      alert(
        "Unable to save the site layout. Please try again."
      );
    }
  }

  function handleBack() {
    navigate("/create-project");
  }

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-10 text-white">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-emerald-400">
                ZYNORA Site Planner
              </p>

              <h1 className="mt-2 text-4xl font-bold">
                Position your building
              </h1>

              <p className="mt-3 max-w-3xl text-slate-400">
                Enter the exact building dimensions,
                drag the building anywhere inside the
                plot, or enter an exact setback value.
                The building size will remain fixed while
                its position changes.
              </p>
            </div>

            <button
              type="button"
              onClick={handleBack}
              className="rounded-xl border border-white/15 px-5 py-3 text-sm font-semibold transition hover:bg-white/10"
            >
              Back to Project
            </button>
          </div>
        </header>

        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <StepCard
            number="1"
            title="Set size"
            description="Enter the building length and width."
          />

          <StepCard
            number="2"
            title="Position"
            description="Drag the building or edit any setback."
          />

          <StepCard
            number="3"
            title="Generate"
            description="Confirm the layout and create the 2D plan."
          />
        </div>

        <SitePlannerCanvas
          project={project}
          design={result.design}
          onConfirm={handleConfirmLayout}
        />
      </div>
    </main>
  );
}

function StepCard({
  number,
  title,
  description,
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500 font-bold text-slate-950">
          {number}
        </div>

        <div>
          <h2 className="font-semibold text-white">
            {title}
          </h2>

          <p className="mt-1 text-sm leading-5 text-slate-400">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

export default SitePlanner;
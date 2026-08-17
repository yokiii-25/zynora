import { useNavigate } from "react-router-dom";

function DesignResult() {
  const navigate = useNavigate();

  const storedResult = localStorage.getItem("zynoraDesignResult");

  if (!storedResult) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-20 text-white">
        <div className="mx-auto max-w-xl text-center">
          <h1 className="text-3xl font-bold">
            No design report found
          </h1>

          <p className="mt-4 text-slate-400">
            Create a project to generate an AI design report.
          </p>

          <button
            onClick={() => navigate("/create-project")}
            className="mt-8 rounded-xl bg-emerald-500 px-6 py-3 font-semibold text-slate-950"
          >
            Create Project
          </button>
        </div>
      </main>
    );
  }

  let result;

  try {
    result = JSON.parse(storedResult);
  } catch {
    localStorage.removeItem("zynoraDesignResult");

    return (
      <main className="min-h-screen bg-slate-950 px-6 py-20 text-white">
        <div className="mx-auto max-w-xl text-center">
          <h1 className="text-3xl font-bold">
            Invalid design report
          </h1>

          <button
            onClick={() => navigate("/create-project")}
            className="mt-8 rounded-xl bg-emerald-500 px-6 py-3 font-semibold text-slate-950"
          >
            Create a New Project
          </button>
        </div>
      </main>
    );
  }

  const design = result.design;

  if (!design) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-20 text-white">
        <div className="mx-auto max-w-xl text-center">
          <h1 className="text-3xl font-bold">
            Design data is missing
          </h1>

          <button
            onClick={() => navigate("/create-project")}
            className="mt-8 rounded-xl bg-emerald-500 px-6 py-3 font-semibold text-slate-950"
          >
            Create a New Project
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-10 text-white">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-3xl border border-white/10 bg-white/5 p-8">
          <p className="text-sm font-medium uppercase tracking-widest text-emerald-400">
            ZYNORA AI Design Report
          </p>

          <h1 className="mt-3 text-4xl font-bold">
            {design.recommended_style}
          </h1>

          <p className="mt-4 max-w-3xl text-slate-300">
            {design.project_summary}
          </p>

          <p className="mt-5 text-sm text-slate-500">
            Project ID: {result.projectId}
          </p>
        </section>

        <section className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Built-up Area"
            value={design.estimated_built_up_area}
          />

          <StatCard
            title="Estimated Cost"
            value={design.estimated_cost}
          />

          <StatCard
            title="Timeline"
            value={design.construction_timeline}
          />

          <StatCard
            title="Sustainability"
            value={`${design.sustainability_score}%`}
          />
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <ReportCard title="Design Concept">
            <p>{design.design_concept}</p>
          </ReportCard>

          <ReportCard title="Natural Light Strategy">
            <p>{design.natural_light_strategy}</p>
          </ReportCard>

          <ReportCard title="Ventilation Strategy">
            <p>{design.ventilation_strategy}</p>
          </ReportCard>

          <ReportCard title="Professional Disclaimer">
            <p>{design.professional_disclaimer}</p>
          </ReportCard>
        </section>

        <section className="mt-8">
          <h2 className="text-2xl font-bold">
            Floor Plan Strategy
          </h2>

          <div className="mt-5 grid gap-6 lg:grid-cols-2">
            {design.floor_plan_strategy?.map((floor, index) => (
              <ReportCard
                key={`${floor.floor}-${index}`}
                title={floor.floor}
              >
                <ul className="space-y-2">
                  {floor.recommended_spaces?.map((space, spaceIndex) => (
                    <li key={`${space}-${spaceIndex}`}>
                      ✓ {space}
                    </li>
                  ))}
                </ul>

                <p className="mt-5 text-slate-400">
                  {floor.planning_notes}
                </p>
              </ReportCard>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-2xl font-bold">
            Room Recommendations
          </h2>

          <div className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {design.room_recommendations?.map((room, index) => (
              <ReportCard
                key={`${room.room}-${index}`}
                title={room.room}
              >
                <p className="font-semibold text-emerald-400">
                  {room.recommended_size}
                </p>

                <p className="mt-3">
                  {room.design_notes}
                </p>
              </ReportCard>
            ))}
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <ListCard
            title="Sustainability Recommendations"
            items={design.sustainability_recommendations}
          />

          <ListCard
            title="Accessibility Recommendations"
            items={design.accessibility_recommendations}
          />

          <ListCard
            title="Budget Recommendations"
            items={design.budget_recommendations}
          />

          <ListCard
            title="Future Expansion Options"
            items={design.future_expansion_options}
          />

          <ListCard
            title="Important Considerations"
            items={design.important_considerations}
          />
        </section>

        <div className="mt-10 flex flex-wrap gap-4">
          <button
            onClick={() => navigate("/create-project")}
            className="rounded-xl bg-emerald-500 px-6 py-3 font-semibold text-slate-950"
          >
            Create Another Project
          </button>

          <button
            onClick={() => navigate("/")}
            className="rounded-xl border border-white/15 px-6 py-3 font-semibold"
          >
            Back to Home
          </button>
        </div>
      </div>
    </main>
  );
}

function StatCard({ title, value }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <p className="text-sm text-slate-400">
        {title}
      </p>

      <p className="mt-2 text-xl font-bold">
        {value || "Not available"}
      </p>
    </article>
  );
}

function ReportCard({ title, children }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <h3 className="text-xl font-semibold">
        {title}
      </h3>

      <div className="mt-4 leading-7 text-slate-300">
        {children}
      </div>
    </article>
  );
}

function ListCard({ title, items = [] }) {
  return (
    <ReportCard title={title}>
      <ul className="space-y-3">
        {items.length > 0 ? (
          items.map((item, index) => (
            <li key={`${item}-${index}`}>
              ✓ {item}
            </li>
          ))
        ) : (
          <li>No recommendations available.</li>
        )}
      </ul>
    </ReportCard>
  );
}

export default DesignResult;
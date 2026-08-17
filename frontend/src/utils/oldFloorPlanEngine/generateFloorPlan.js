console.log(
  "CORRECT BACKEND FLOOR PLAN GENERATOR LOADED"
);
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000";

export default async function generateFloorPlan(
  project,
  siteLayout
) {
  if (!project) {
    throw new Error(
      "Project data is missing."
    );
  }

  const building =
    siteLayout?.building;

  if (!building) {
    throw new Error(
      "Building data is missing from the site layout."
    );
  }

  const length = Number(
    building.length
  );

  const width = Number(
    building.width
  );

  if (
    !Number.isFinite(length) ||
    length <= 0 ||
    !Number.isFinite(width) ||
    width <= 0
  ) {
    console.log(
      "Received building:",
      building
    );

    throw new Error(
      "Valid building length and width are required."
    );
  }

  console.log("Sending request:", {
  project,
  site_layout: {
    building: {
      length,
      width,
    },
  },
});

const response = await fetch(
  `${API_BASE_URL}/api/floor-plans/generate`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      project,
      site_layout: {
        building: {
          length,
          width,
        },
      },
    }),
  }
);

      let data;

    try {
      data = await response.json();

      console.log("Backend response:", data);

    } catch {
      throw new Error(
        "The backend returned an invalid response."
      );
    }

  if (!response.ok) {
    const detail = data?.detail;

    if (typeof detail === "string") {
      throw new Error(detail);
    }

    console.error("Backend response:", data);

    throw new Error(
      detail?.error ||
      detail?.message ||
      data?.error ||
      data?.message ||
      JSON.stringify(detail) ||
      `Generation failed with status ${response.status}.`
    );
  }

  return data;
}
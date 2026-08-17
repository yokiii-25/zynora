const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000";

export async function generateFloorPlanFromDataset({
  project,
  siteLayout,
}) {
  const response = await fetch(
    `${API_BASE_URL}/api/floor-plans/generate`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        project,
        site_layout: siteLayout,
      }),
    }
  );

  if (!response.ok) {
    let message = "Unable to generate floor plan.";

    try {
      const errorData = await response.json();

      message =
        errorData.detail ||
        errorData.message ||
        message;
    } catch {
      // Keep the default message when the server
      // does not return JSON.
    }

    throw new Error(message);
  }

  return response.json();
}
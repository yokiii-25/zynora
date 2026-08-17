const API_BASE_URL =
  "http://127.0.0.1:8000";


async function readErrorMessage(response) {
  try {
    const data = await response.json();

    if (typeof data.detail === "string") {
      return data.detail;
    }

    if (data.detail?.message) {
      return data.detail.message;
    }

    if (data.message) {
      return data.message;
    }
  } catch {
    // The backend returned a non-JSON response.
  }

  return (
    `Request failed with status ` +
    `${response.status}.`
  );
}


export async function checkBackendHealth() {
  const response = await fetch(
    `${API_BASE_URL}/health`
  );

  if (!response.ok) {
    throw new Error(
      await readErrorMessage(response)
    );
  }

  return response.json();
}


export async function checkRoomClassifierHealth() {
  const response = await fetch(
    `${API_BASE_URL}` +
      `/api/room-classification/health`
  );

  if (!response.ok) {
    throw new Error(
      await readErrorMessage(response)
    );
  }

  return response.json();
}


export async function generateFloorPlan(project) {
  const requestBody = {
    project: {
      ...project,
      bedrooms: Number(
        project.bedrooms
      ),
      bathrooms: Number(
        project.bathrooms
      ),
      floors: Number(
        project.floors
      ),
    },

    site_layout: {
      building: {
        length: Number(
          project.landLength
        ),
        width: Number(
          project.landWidth
        ),
      },
    },
  };

  const response = await fetch(
    `${API_BASE_URL}` +
      `/api/floor-plans/generate`,
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify(
        requestBody
      ),
    }
  );

  if (!response.ok) {
    throw new Error(
      await readErrorMessage(response)
    );
  }

  return response.json();
}


export async function uploadFloorPlan(file, planWidth = 40) {
  const formData = new FormData();

  formData.append(
    "file",
    file
  );

  formData.append("plan_width", String(planWidth));

  const response = await fetch(
    `${API_BASE_URL}` +
      `/api/floor-plans/upload`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!response.ok) {
    throw new Error(
      await readErrorMessage(response)
    );
  }

  return response.json();
}


export async function classifySvgRooms(file) {
  const formData = new FormData();

  formData.append(
    "file",
    file
  );

  const response = await fetch(
    `${API_BASE_URL}` +
      `/api/room-classification/predict`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!response.ok) {
    throw new Error(
      await readErrorMessage(response)
    );
  }

  return response.json();
}

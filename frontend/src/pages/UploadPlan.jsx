import {
  useRef,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  classifySvgRooms,
  uploadFloorPlan,
} from "../services/api";


function UploadPlan() {
  const navigate = useNavigate();
  const inputRef = useRef(null);

  const [
    selectedFile,
    setSelectedFile,
  ] = useState(null);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    uploadMode,
    setUploadMode,
  ] = useState(null);

  const [planWidth, setPlanWidth] = useState("40");


  function detectUploadMode(fileName) {
    const normalizedName =
      fileName.toLowerCase();

    if (
      normalizedName.endsWith(
        ".svg"
      )
    ) {
      return "svg-classification";
    }

    return "image-processing";
  }


  function handleFileChange(event) {
    const file =
      event.target.files?.[0];

    if (!file) {
      setSelectedFile(null);
      setUploadMode(null);
      return;
    }

    const allowedExtensions = [
      ".pdf",
      ".jpg",
      ".jpeg",
      ".png",
      ".svg",
    ];

    const fileName =
      file.name.toLowerCase();

    const isAllowed =
      allowedExtensions.some(
        (extension) =>
          fileName.endsWith(
            extension
          )
      );

    if (!isAllowed) {
      setError(
        "Please select a PDF, JPG, JPEG, PNG, or SVG file."
      );

      setSelectedFile(null);
      setUploadMode(null);
      event.target.value = "";
      return;
    }

    const mode =
      detectUploadMode(
        file.name
      );

    const maximumSize =
      mode === "svg-classification"
        ? 20 * 1024 * 1024
        : 15 * 1024 * 1024;

    if (
      file.size >
      maximumSize
    ) {
      setError(
        mode ===
          "svg-classification"
          ? "The SVG file must be smaller than 20 MB."
          : "The floor-plan file must be smaller than 15 MB."
      );

      setSelectedFile(null);
      setUploadMode(null);
      event.target.value = "";
      return;
    }

    setError("");
    setSelectedFile(file);
    setUploadMode(mode);
  }


  async function handleSvgClassification() {
    const response =
      await classifySvgRooms(
        selectedFile
      );

    if (
      !response.success ||
      !Array.isArray(
        response.rooms
      )
    ) {
      throw new Error(
        "The backend did not return room predictions."
      );
    }

    localStorage.setItem(
      "zynoraRoomClassification",
      JSON.stringify(
        response
      )
    );

    localStorage.setItem(
      "zynoraUploadedSvgName",
      selectedFile.name
    );

    navigate(
      "/room-classification"
    );
  }


  async function handleImageUpload() {
    const response =
      await uploadFloorPlan(
        selectedFile,
        Number(planWidth)
      );

    if (!response.floor_plan) {
      throw new Error(
        "The backend did not return floor-plan data."
      );
    }

    localStorage.setItem(
      "zynoraUploadedFloorPlan",
      JSON.stringify(
        response.floor_plan
      )
    );

    localStorage.setItem(
      "zynoraFloorPlan",
      JSON.stringify(
        response.floor_plan
      )
    );

    navigate(
      "/3d-design"
    );
  }


  async function handleUpload() {
    if (!selectedFile || loading) {
      setError(
        "Please select a floor-plan file first."
      );
      return;
    }

    if (
      detectUploadMode(selectedFile.name) === "image-processing" &&
      (!Number.isFinite(Number(planWidth)) || Number(planWidth) < 5)
    ) {
      setError("Enter the plan's overall width (at least 5 feet).");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const currentMode = detectUploadMode(
        selectedFile.name
      );

      console.log(
        "Uploading:",
        selectedFile.name
      );

      console.log(
        "Detected upload mode:",
        currentMode
      );

      if (
        currentMode ===
        "svg-classification"
      ) {
        const response =
          await classifySvgRooms(
            selectedFile
          );

        if (
          !response.success ||
          !Array.isArray(response.rooms)
        ) {
          throw new Error(
            "The backend did not return room predictions."
          );
        }
        const svgText =
          await selectedFile.text();

        localStorage.setItem(
          "zynoraUploadedSvgContent",
          svgText
        );

        localStorage.setItem(
          "zynoraRoomClassification",
          JSON.stringify(response)
        );

        localStorage.setItem(
          "zynoraUploadedSvgName",
          selectedFile.name
        );

        navigate(
          "/room-classification"
        );

        return;
      }

      const response =
        await uploadFloorPlan(
          selectedFile,
          Number(planWidth)
        );

      if (!response.floor_plan) {
        throw new Error(
          "The backend did not return floor-plan data."
        );
      }

      localStorage.setItem(
        "zynoraUploadedFloorPlan",
        JSON.stringify(
          response.floor_plan
        )
      );

      localStorage.setItem(
        "zynoraFloorPlan",
        JSON.stringify(
          response.floor_plan
        )
      );

      navigate("/3d-design");
    } catch (uploadError) {
      console.error(
        "Floor-plan upload error:",
        uploadError
      );

      setError(
        uploadError.message ||
          "The floor plan could not be processed."
      );
    } finally {
      setLoading(false);
    }
  }


  function removeSelectedFile() {
    setSelectedFile(null);
    setUploadMode(null);
    setError("");

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }


  function formatFileSize(size) {
    const megabytes =
      size /
      (1024 * 1024);

    if (megabytes >= 1) {
      return (
        `${megabytes.toFixed(2)} MB`
      );
    }

    return (
      `${(
        size / 1024
      ).toFixed(1)} KB`
    );
  }


  const isSvgMode =
    uploadMode ===
    "svg-classification";


  return (
    <main className="uploadPlanPage">
      <section className="uploadPlanCard">
        <button
          className="backButton"
          type="button"
          onClick={() =>
            navigate("/")
          }
          disabled={loading}
        >
          ← Back to Home
        </button>

        <p className="sectionEyebrow">
          AI FLOOR-PLAN ANALYSIS
        </p>

        <h1>
          Upload Your Existing Floor Plan
        </h1>

        <p>
          Upload a PDF, image, or SVG floor
          plan. SVG plans receive AI room-type
          predictions, while PDF and image
          files are prepared for 3D
          visualization.
        </p>

        <label className="uploadBox">
          <span className="uploadIcon">
            📐
          </span>

          <strong>
            {selectedFile
              ? "Floor plan selected"
              : "Select your floor plan"}
          </strong>

          <span>
            PDF, JPG, JPEG, PNG, or SVG
          </span>

          <input
            ref={inputRef}
            type="file"
            accept={
              ".pdf,.jpg,.jpeg,.png,.svg"
            }
            onChange={
              handleFileChange
            }
            disabled={loading}
          />
        </label>

        {selectedFile && (
          <div className="selectedFile">
            <div>
              <strong>
                📄 {selectedFile.name}
              </strong>

              <p>
                {formatFileSize(
                  selectedFile.size
                )}
              </p>

              <p>
                {isSvgMode
                  ? "AI room classification"
                  : "3D floor-plan processing"}
              </p>
            </div>

            <button
              type="button"
              className="removeFileButton"
              onClick={
                removeSelectedFile
              }
              disabled={loading}
            >
              Remove
            </button>
          </div>
        )}

        {selectedFile && !isSvgMode && (
          <label style={{ display: "grid", gap: "7px", marginTop: "14px" }}>
            <strong>Known building width (feet)</strong>
            <span style={{ color: "#647080", fontSize: "13px" }}>
              This gives PDF/JPG/PNG wall detection a real scale. Keep 40 only
              when the plan is approximately 40 feet wide.
            </span>
            <input
              type="number"
              min="5"
              max="500"
              step="0.1"
              value={planWidth}
              onChange={(event) => setPlanWidth(event.target.value)}
              disabled={loading}
              style={{
                padding: "11px 12px",
                border: "1px solid #cfd9df",
                borderRadius: "10px",
                font: "inherit",
              }}
            />
          </label>
        )}

        {loading && (
          <div className="uploadProcessing">
            <div className="uploadSpinner" />

            <div>
              <strong>
                {isSvgMode
                  ? "Classifying rooms…"
                  : "Analyzing your blueprint…"}
              </strong>

              <p>
                {isSvgMode
                  ? "Extracting room features and running the V5 classifier."
                  : "Detecting walls and preparing the 3D structure."}
              </p>
            </div>
          </div>
        )}

        {error && (
          <p className="uploadError">
            {error}
          </p>
        )}

        <button
          className="primaryBtn"
          type="button"
          onClick={handleUpload}
          disabled={
            !selectedFile ||
            loading
          }
        >
          {loading
            ? isSvgMode
              ? "Classifying Rooms..."
              : "Processing Floor Plan..."
            : isSvgMode
              ? "Analyze SVG Rooms"
              : "Upload and Visualize"}
        </button>
      </section>
    </main>
  );
}


export default UploadPlan;

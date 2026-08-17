import { useEffect, useState } from "react";

const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_BACKEND_URL ||
  "http://127.0.0.1:8000"
).replace(/\/+$/, "");

const INITIAL_OPTIONS = {
  provider: "exact",
  style: "Modern contemporary",
  materials: "Painted concrete, glass, stone, and wood accents",
  roof: "Keep the roof massing shown in the reference",
  lighting: "Bright natural daylight",
  surroundings: "Simple landscaped residential plot",
  customInstructions: "",
  quality: "preview",
  renderType: "exterior",
  structureMode: "balanced",
  seed: "-1",
};

const fieldStyle = {
  width: "100%",
  padding: "9px 10px",
  border: "1px solid #d8e0e6",
  borderRadius: "9px",
  background: "#ffffff",
  color: "#26313c",
  font: "inherit",
  fontSize: "13px",
  outlineColor: "#1b8268",
};

function captureCanvas(canvas, mimeType = "image/jpeg") {
  return new Promise((resolve, reject) => {
    if (!canvas) {
      reject(new Error("The 3D view is not ready yet."));
      return;
    }

    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
          return;
        }

        reject(new Error("The browser could not capture the current 3D view."));
      },
      mimeType,
      mimeType === "image/png" ? undefined : 0.94,
    );
  });
}

function Field({ label, children }) {
  return (
    <label>
      <span
        style={{
          display: "block",
          marginBottom: "5px",
          color: "#34414d",
          fontSize: "12px",
          fontWeight: 800,
        }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}

export default function RealisticRenderPanel({
  canvasElement,
  viewMode,
  onCaptureModeChange,
  geometryValidation,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [options, setOptions] = useState(INITIAL_OPTIONS);
  const [error, setError] = useState("");
  const [resultUrl, setResultUrl] = useState("");
  const [resultMeta, setResultMeta] = useState(null);
  const [rendererStatus, setRendererStatus] = useState(null);

  useEffect(() => {
    return () => {
      if (resultUrl) {
        URL.revokeObjectURL(resultUrl);
      }
    };
  }, [resultUrl]);

  useEffect(() => {
    if (!isOpen || options.provider !== "local") {
      return undefined;
    }

    let cancelled = false;
    setRendererStatus({ checking: true });

    fetch(`${API_BASE_URL}/local-renderer/status`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Local renderer status failed (${response.status}).`);
        }

        return response.json();
      })
      .then((status) => {
        if (!cancelled) {
          setRendererStatus(status);
        }
      })
      .catch((statusError) => {
        if (!cancelled) {
          setRendererStatus({
            error:
              statusError instanceof Error
                ? statusError.message
                : "Unable to check the local renderer.",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, options.provider]);

  function updateOption(name, value) {
    setOptions((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleGenerate() {
    if (!canvasElement || isGenerating) {
      return;
    }

    if (geometryValidation && !geometryValidation.valid) {
      setError(
        `Export blocked: ${
          geometryValidation.errors?.[0] ??
          "the floor-plan geometry is invalid."
        }`,
      );
      return;
    }

    setError("");
    setIsGenerating(true);

    try {
      onCaptureModeChange?.(true);

      await new Promise((resolve) => {
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => {
            window.requestAnimationFrame(resolve);
          });
        });
      });

      const exactOutput = options.provider === "exact";
      const referenceBlob = await captureCanvas(
        canvasElement,
        exactOutput ? "image/png" : "image/jpeg",
      );
      onCaptureModeChange?.(false);

      if (exactOutput) {
        setResultMeta({
          provider: "exact",
          model: "ZYNORA deterministic Three.js shell",
          quality: "canvas",
          seed: "",
        });
        setResultUrl(URL.createObjectURL(referenceBlob));
        setIsOpen(false);
        return;
      }

      const formData = new FormData();

      formData.append(
        "reference_image",
        referenceBlob,
        "zynora-3d-reference.jpg",
      );
      formData.append("provider", options.provider);
      formData.append("style", options.style);
      formData.append("materials", options.materials);
      formData.append("roof", options.roof);
      formData.append("lighting", options.lighting);
      formData.append("surroundings", options.surroundings);
      formData.append("custom_instructions", options.customInstructions);
      formData.append("quality", options.quality);
      formData.append("render_type", options.renderType);
      formData.append("view_mode", viewMode);
      formData.append("structure_mode", options.structureMode);
      formData.append("seed", options.seed || "-1");

      const response = await fetch(`${API_BASE_URL}/generate-realistic-house`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);

        throw new Error(
          payload?.detail || `Image generation failed (${response.status}).`,
        );
      }

      const generatedBlob = await response.blob();

      if (!generatedBlob.type.startsWith("image/")) {
        throw new Error("The backend did not return an image.");
      }

      setResultMeta({
        provider:
          response.headers.get("X-Zynora-Render-Provider") || options.provider,
        model: response.headers.get("X-Zynora-Render-Model") || "",
        quality:
          response.headers.get("X-Zynora-Render-Quality") || options.quality,
        seed: response.headers.get("X-Zynora-Render-Seed") || "",
      });
      setResultUrl(URL.createObjectURL(generatedBlob));
      setIsOpen(false);
    } catch (generationError) {
      setError(
        generationError instanceof Error
          ? generationError.message
          : "Unable to generate the realistic house image.",
      );
    } finally {
      onCaptureModeChange?.(false);
      setIsGenerating(false);
    }
  }

  const localRendererBlocked = Boolean(
    options.provider === "local" &&
    rendererStatus &&
    !rendererStatus.checking &&
    !rendererStatus.error &&
    !rendererStatus.ready,
  );
  const geometryBlocked = Boolean(
    geometryValidation && !geometryValidation.valid,
  );

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError("");
          setIsOpen((current) => !current);
        }}
        disabled={!canvasElement}
        style={{
          position: "absolute",
          top: "14px",
          right: "14px",
          zIndex: 16,
          padding: "10px 14px",
          border: 0,
          borderRadius: "11px",
          background: canvasElement
            ? "linear-gradient(135deg, #1b8268, #12634f)"
            : "#aab5bc",
          color: "#ffffff",
          boxShadow: "0 9px 25px rgba(18, 99, 79, 0.28)",
          fontSize: "12px",
          fontWeight: 850,
          cursor: canvasElement ? "pointer" : "not-allowed",
        }}
      >
        Export / Render House
      </button>

      {isOpen && (
        <aside
          aria-label="Realistic house render settings"
          style={{
            position: "absolute",
            top: "64px",
            right: "14px",
            zIndex: 20,
            width: "min(340px, calc(100% - 28px))",
            maxHeight: "calc(100% - 82px)",
            overflowY: "auto",
            padding: "16px",
            border: "1px solid #dce4e9",
            borderRadius: "15px",
            background: "rgba(255, 255, 255, 0.97)",
            boxShadow: "0 18px 50px rgba(20, 33, 43, 0.2)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: "12px",
            }}
          >
            <div>
              <strong style={{ color: "#1f2d37", fontSize: "15px" }}>
                Exterior output
              </strong>
              <p
                style={{
                  margin: "4px 0 0",
                  color: "#647080",
                  fontSize: "11px",
                  lineHeight: 1.45,
                }}
              >
                Exact mode builds a closed exterior shell and locks an elevated
                camera automatically.
              </p>
            </div>

            <button
              type="button"
              aria-label="Close render settings"
              onClick={() => setIsOpen(false)}
              style={{
                border: 0,
                background: "transparent",
                color: "#647080",
                fontSize: "22px",
                lineHeight: 1,
                cursor: "pointer",
              }}
            >
              ×
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gap: "11px",
              marginTop: "14px",
            }}
          >
            <Field label="Rendering engine">
              <select
                value={options.provider}
                onChange={(event) =>
                  updateOption("provider", event.target.value)
                }
                style={fieldStyle}
              >
                <option value="exact">
                  Exact local 3D shell · free and deterministic
                </option>
                <option value="local">Free local renderer · NVIDIA GPU</option>
                <option value="gemini">Gemini API · paid quota required</option>
              </select>
            </Field>

            {options.provider === "exact" && (
              <div
                role="status"
                style={{
                  padding: "9px 10px",
                  border: "1px solid #b8ddd1",
                  borderRadius: "9px",
                  background: "#eef8f4",
                  color: "#276555",
                  fontSize: "11px",
                  lineHeight: 1.45,
                }}
              >
                No API, model download, or GPU generation is used. Indoor
                partitions and furniture are hidden; the slab, facade walls,
                openings, and roof remain exact.
              </div>
            )}

            {geometryBlocked && (
              <div
                role="alert"
                style={{
                  padding: "9px 10px",
                  border: "1px solid #e0b8b8",
                  borderRadius: "9px",
                  background: "#fff1f1",
                  color: "#8b3636",
                  fontSize: "11px",
                  lineHeight: 1.45,
                }}
              >
                Export is blocked until every declared floor is parsed and all
                indoor rooms are contained by a closed exterior shell.
              </div>
            )}

            {options.provider === "local" && (
              <div
                role="status"
                style={{
                  padding: "9px 10px",
                  border: `1px solid ${
                    rendererStatus?.ready ? "#b8ddd1" : "#e5d8bd"
                  }`,
                  borderRadius: "9px",
                  background: rendererStatus?.ready ? "#eef8f4" : "#fff9ec",
                  color: rendererStatus?.ready ? "#276555" : "#755b28",
                  fontSize: "11px",
                  lineHeight: 1.45,
                }}
              >
                {rendererStatus?.checking && "Checking the local renderer…"}

                {rendererStatus?.error && rendererStatus.error}

                {rendererStatus &&
                  !rendererStatus.checking &&
                  !rendererStatus.error &&
                  !rendererStatus.installed &&
                  "Local packages are not installed. Run setup-local-renderer.ps1 once."}

                {rendererStatus?.installed &&
                  !rendererStatus.cuda_available &&
                  "PyTorch is installed, but it cannot access the NVIDIA GPU."}

                {rendererStatus?.ready && (
                  <>
                    Ready on {rendererStatus.device_name || "NVIDIA GPU"}.
                    {rendererStatus.model_loaded
                      ? " The model is loaded."
                      : rendererStatus.model_cache_present
                        ? " The first render will load the cached model."
                        : " The first setup must download the model files."}
                  </>
                )}
              </div>
            )}

            {options.provider !== "exact" && (
              <>
            <Field label="Render type">
              <select
                value={options.renderType}
                onChange={(event) =>
                  updateOption("renderType", event.target.value)
                }
                style={fieldStyle}
              >
                <option value="exterior">Exterior house concept</option>
                <option value="cutaway">3D plan cutaway</option>
              </select>
            </Field>

            <Field label="Architectural style">
              <select
                value={options.style}
                onChange={(event) => updateOption("style", event.target.value)}
                style={fieldStyle}
              >
                <option>Modern contemporary</option>
                <option>Minimalist</option>
                <option>Luxury modern</option>
                <option>Traditional Tamil</option>
                <option>Kerala-inspired</option>
                <option>Industrial modern</option>
              </select>
            </Field>

            <Field label="Exterior materials">
              <input
                type="text"
                maxLength={240}
                value={options.materials}
                onChange={(event) =>
                  updateOption("materials", event.target.value)
                }
                style={fieldStyle}
              />
            </Field>

            <Field label="Roof treatment">
              <select
                value={options.roof}
                onChange={(event) => updateOption("roof", event.target.value)}
                style={fieldStyle}
              >
                <option>Keep the roof massing shown in the reference</option>
                <option>Flat terrace roof</option>
                <option>Sloped tiled roof</option>
                <option>Mixed flat and sloped roof</option>
              </select>
            </Field>

            <Field label="Lighting">
              <select
                value={options.lighting}
                onChange={(event) =>
                  updateOption("lighting", event.target.value)
                }
                style={fieldStyle}
              >
                <option>Bright natural daylight</option>
                <option>Warm sunset</option>
                <option>Soft overcast daylight</option>
                <option>Night exterior lighting</option>
              </select>
            </Field>

            <Field label="Plot surroundings">
              <input
                type="text"
                maxLength={180}
                value={options.surroundings}
                onChange={(event) =>
                  updateOption("surroundings", event.target.value)
                }
                style={fieldStyle}
              />
            </Field>

            <Field label="Additional request">
              <textarea
                rows={3}
                maxLength={500}
                placeholder="Example: cream facade with warm wood fins"
                value={options.customInstructions}
                onChange={(event) =>
                  updateOption("customInstructions", event.target.value)
                }
                style={{ ...fieldStyle, resize: "vertical" }}
              />
            </Field>

            <Field label="Output quality">
              <select
                value={options.quality}
                onChange={(event) =>
                  updateOption("quality", event.target.value)
                }
                style={fieldStyle}
              >
                {options.provider === "local" ? (
                  <>
                    <option value="preview">Fast local preview · 640 px</option>
                    <option value="final">
                      Detailed local render · 768 px
                    </option>
                  </>
                ) : (
                  <>
                    <option value="preview">Gemini preview · 1K</option>
                    <option value="final">Gemini final · 2K</option>
                  </>
                )}
              </select>
            </Field>

            {options.provider === "local" && (
              <>
                <Field label="Geometry fidelity">
                  <select
                    value={options.structureMode}
                    onChange={(event) =>
                      updateOption("structureMode", event.target.value)
                    }
                    style={fieldStyle}
                  >
                    <option value="strict">Strict · closest to 3D edges</option>
                    <option value="balanced">Balanced · recommended</option>
                    <option value="creative">
                      Creative · more visual change
                    </option>
                  </select>
                </Field>

                <Field label="Seed (-1 = random)">
                  <input
                    type="number"
                    min="-1"
                    max="2147483647"
                    step="1"
                    value={options.seed}
                    onChange={(event) =>
                      updateOption("seed", event.target.value)
                    }
                    style={fieldStyle}
                  />
                </Field>
              </>
            )}
              </>
            )}
          </div>

          <p
            style={{
              margin: "12px 0 0",
              padding: "9px 10px",
              borderRadius: "9px",
              background: "#f2f7f5",
              color: "#52616c",
              fontSize: "11px",
              lineHeight: 1.45,
            }}
          >
            {options.provider === "exact"
              ? "This is the geometry-faithful Phase 1 output. It is suitable for validation and as a clean reference for a later Blender render."
              : "The AI options are retained as optional fallbacks and may alter geometry. Verify their output against the exact exterior first."}
          </p>

          {error && (
            <p
              role="alert"
              style={{
                margin: "10px 0 0",
                color: "#a03737",
                fontSize: "12px",
                lineHeight: 1.4,
              }}
            >
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={handleGenerate}
            disabled={
              isGenerating ||
              !canvasElement ||
              localRendererBlocked ||
              geometryBlocked
            }
            style={{
              width: "100%",
              marginTop: "13px",
              padding: "11px 14px",
              border: 0,
              borderRadius: "10px",
              background:
                isGenerating || localRendererBlocked || geometryBlocked
                  ? "#829b93"
                  : "#1b8268",
              color: "#ffffff",
              fontSize: "13px",
              fontWeight: 850,
              cursor: isGenerating
                ? "wait"
                : localRendererBlocked || geometryBlocked
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            {isGenerating
              ? options.provider === "exact"
                ? "Building exact exterior…"
                : options.provider === "local"
                  ? "Rendering on your NVIDIA GPU…"
                  : "Generating with Gemini…"
              : options.provider === "exact"
                ? "Create Exact Exterior PNG"
                : options.provider === "local"
                  ? "Render Locally from Current View"
                  : "Generate with Gemini"}
          </button>
        </aside>
      )}

      {resultUrl && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Generated realistic house"
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 30,
            display: "grid",
            placeItems: "center",
            padding: "18px",
            background: "rgba(13, 22, 29, 0.88)",
          }}
        >
          <div
            style={{
              width: "min(980px, 100%)",
              maxHeight: "100%",
              overflow: "auto",
              padding: "12px",
              borderRadius: "15px",
              background: "#ffffff",
              boxShadow: "0 24px 70px rgba(0, 0, 0, 0.38)",
            }}
          >
            <img
              src={resultUrl}
              alt={
                resultMeta?.provider === "exact"
                  ? "Exact ZYNORA exterior shell"
                  : "AI-generated realistic visualization of the ZYNORA house"
              }
              style={{
                display: "block",
                width: "100%",
                height: "auto",
                maxHeight: "calc(92vh - 150px)",
                objectFit: "contain",
                borderRadius: "10px",
                background: "#e8ecef",
              }}
            />

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "10px",
                padding: "11px 3px 1px",
              }}
            >
              <p
                style={{
                  margin: 0,
                  color: "#5c6974",
                  fontSize: "11px",
                }}
              >
                {resultMeta?.provider === "exact"
                  ? "Static PNG exported from the interactive exterior"
                  : resultMeta?.provider === "local"
                    ? "Local ControlNet concept"
                    : "Gemini concept"}
                {resultMeta?.seed ? ` · seed ${resultMeta.seed}` : ""}
                {" · "}Verify the final design with a qualified architect.
              </p>

              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => setResultUrl("")}
                  style={{
                    padding: "9px 12px",
                    border: "1px solid #d5dde3",
                    borderRadius: "9px",
                    background: "#ffffff",
                    color: "#3b4853",
                    fontWeight: 750,
                    cursor: "pointer",
                  }}
                >
                  Return to interactive 3D
                </button>

                <a
                  href={resultUrl}
                  download={
                    resultMeta?.provider === "exact"
                      ? "zynora-exact-exterior.png"
                      : "zynora-realistic-house.jpg"
                  }
                  style={{
                    padding: "9px 12px",
                    borderRadius: "9px",
                    background: "#1b8268",
                    color: "#ffffff",
                    fontSize: "13px",
                    fontWeight: 800,
                    textDecoration: "none",
                  }}
                >
                  Download Image
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

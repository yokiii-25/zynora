import { useEffect, useRef, useState } from "react";
import "./exteriorSlides.css";

const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_BACKEND_URL ||
  "http://127.0.0.1:8000"
).replace(/\/+$/, "");

const EXTERIOR_VIEWS = [
  { id: "front", title: "Front elevation" },
  { id: "front-left", title: "Front-left perspective" },
  { id: "front-right", title: "Front-right perspective" },
  { id: "left", title: "Left-side elevation" },
  { id: "right", title: "Right-side elevation" },
];

const INITIAL_OPTIONS = {
  provider: "local",
  style: "Modern contemporary",
  materials: "Painted concrete, glass, stone, and warm wood accents",
  roof: "Keep the roof massing shown in the reference",
  lighting: "Bright natural daylight",
  surroundings: "Simple landscaped residential plot",
  quality: "preview",
  structureMode: "balanced",
  instructions: "",
};

function waitForFrames(count = 5) {
  return new Promise((resolve) => {
    function next(remaining) {
      if (remaining <= 0) return resolve();
      window.requestAnimationFrame(() => next(remaining - 1));
    }
    next(count);
  });
}

function captureCanvas(canvas) {
  return new Promise((resolve, reject) => {
    canvas?.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error("Unable to capture the exterior control view.")),
      "image/jpeg",
      0.94,
    );
  });
}

async function responseError(response) {
  const payload = await response.json().catch(() => null);
  return payload?.detail || `Exterior generation failed (${response.status}).`;
}

export default function ExteriorSlidesPanel({
  canvasElement,
  geometryValidation,
  onViewChange,
  onCaptureModeChange,
}) {
  const [options, setOptions] = useState(INITIAL_OPTIONS);
  const [slides, setSlides] = useState({});
  const [activeSlide, setActiveSlide] = useState("front");
  const [generatingView, setGeneratingView] = useState("");
  const [completed, setCompleted] = useState(0);
  const [error, setError] = useState("");
  const [status, setStatus] = useState({ checking: true });
  const urlsRef = useRef(new Set());

  const geometryBlocked = Boolean(
    geometryValidation && !geometryValidation.valid,
  );
  const isGenerating = Boolean(generatingView);
  const finishedCount = Object.keys(slides).length;

  useEffect(() => () => {
    urlsRef.current.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  useEffect(() => {
    if (options.provider !== "local") return;
    let cancelled = false;
    fetch(`${API_BASE_URL}/local-renderer/status`)
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("Renderer status unavailable.")))
      .then((value) => !cancelled && setStatus(value))
      .catch((reason) => !cancelled && setStatus({ error: reason.message }));
    return () => { cancelled = true; };
  }, [options.provider]);

  const activeResult = slides[activeSlide];
  const localBlocked = options.provider === "local" && status && !status.checking && !status.error && !status.ready;
  const canGenerate = canvasElement && !geometryBlocked && !localBlocked && !isGenerating;

  const sharedSeed = 15485863;

  function update(name, value) {
    setOptions((current) => ({ ...current, [name]: value }));
  }

  function storeSlide(view, blob, meta) {
    const url = URL.createObjectURL(blob);
    urlsRef.current.add(url);
    setSlides((current) => {
      const previous = current[view.id];
      if (previous?.url) {
        URL.revokeObjectURL(previous.url);
        urlsRef.current.delete(previous.url);
      }
      return { ...current, [view.id]: { ...view, url, meta } };
    });
  }

  async function generateView(view) {
    setGeneratingView(view.id);
    setActiveSlide(view.id);
    onCaptureModeChange?.(true);
    onViewChange(view.id);
    await waitForFrames(7);

    const reference = await captureCanvas(canvasElement);
    const form = new FormData();
    form.append("reference_image", reference, `zynora-${view.id}-control.jpg`);
    form.append("provider", options.provider);
    form.append("style", options.style);
    form.append("materials", options.materials);
    form.append("roof", options.roof);
    form.append("lighting", options.lighting);
    form.append("surroundings", options.surroundings);
    form.append("quality", options.quality);
    form.append("render_type", "exterior");
    form.append("view_mode", "perspective");
    form.append("structure_mode", options.structureMode);
    form.append("seed", String(sharedSeed));
    form.append(
      "custom_instructions",
      `This is slide ${view.title}. Keep exactly the same house, facade palette, materials, roof, openings and landscaping as every other view in this five-image set. ${options.instructions}`.trim(),
    );

    const response = await fetch(`${API_BASE_URL}/generate-realistic-house`, {
      method: "POST",
      body: form,
    });
    if (!response.ok) throw new Error(await responseError(response));
    const blob = await response.blob();
    if (!blob.type.startsWith("image/")) throw new Error("The renderer did not return an image.");

    storeSlide(view, blob, {
      provider: response.headers.get("X-Zynora-Render-Provider") || options.provider,
      model: response.headers.get("X-Zynora-Render-Model") || "",
      seed: response.headers.get("X-Zynora-Render-Seed") || String(sharedSeed),
    });
  }

  async function generatePack() {
    if (!canGenerate) return;
    setError("");
    setCompleted(0);
    try {
      for (let index = 0; index < EXTERIOR_VIEWS.length; index += 1) {
        await generateView(EXTERIOR_VIEWS[index]);
        setCompleted(index + 1);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to generate the exterior slides.");
    } finally {
      onCaptureModeChange?.(false);
      setGeneratingView("");
    }
  }

  async function regenerate(view) {
    if (!canGenerate) return;
    setError("");
    try {
      await generateView(view);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to regenerate this slide.");
    } finally {
      onCaptureModeChange?.(false);
      setGeneratingView("");
    }
  }

  function download(slide) {
    const anchor = document.createElement("a");
    anchor.href = slide.url;
    anchor.download = `ZYNORA-${slide.id}.jpg`;
    anchor.click();
  }

  return (
    <section className="exteriorSlides">
      <div className="exteriorSlides__heading">
        <div>
          <span>REALISTIC EXTERIOR PACK</span>
          <h2>Five consistent views of one design</h2>
          <p>The hidden control model fixes the viewpoint; the selected renderer applies the façade and environment.</p>
        </div>
        <strong>{finishedCount}/5 ready</strong>
      </div>

      <div className="exteriorSlides__layout">
        <aside className="exteriorSlides__settings">
          <label>Rendering engine
            <select value={options.provider} onChange={(event) => update("provider", event.target.value)}>
              <option value="local">Local NVIDIA renderer</option>
              <option value="gemini">Gemini image renderer</option>
            </select>
          </label>
          <label>Architectural style
            <select value={options.style} onChange={(event) => update("style", event.target.value)}>
              <option>Modern contemporary</option>
              <option>Minimalist</option>
              <option>Luxury modern</option>
              <option>Traditional Tamil</option>
              <option>Kerala-inspired</option>
            </select>
          </label>
          <label>Exterior materials
            <input value={options.materials} maxLength={240} onChange={(event) => update("materials", event.target.value)} />
          </label>
          <label>Roof treatment
            <select value={options.roof} onChange={(event) => update("roof", event.target.value)}>
              <option>Keep the roof massing shown in the reference</option>
              <option>Flat terrace roof</option>
              <option>Sloped tiled roof</option>
              <option>Mixed flat and sloped roof</option>
            </select>
          </label>
          <label>Lighting
            <select value={options.lighting} onChange={(event) => update("lighting", event.target.value)}>
              <option>Bright natural daylight</option>
              <option>Warm sunset</option>
              <option>Soft overcast daylight</option>
              <option>Night exterior lighting</option>
            </select>
          </label>
          <label>Additional façade request
            <textarea rows="3" value={options.instructions} maxLength={420} onChange={(event) => update("instructions", event.target.value)} placeholder="Example: cream walls, teak fins and charcoal frames" />
          </label>

          {options.provider === "local" && (
            <p className={`exteriorSlides__status ${status?.ready ? "is-ready" : ""}`}>
              {status?.checking && "Checking local renderer…"}
              {status?.ready && `Ready on ${status.device_name || "NVIDIA GPU"}.`}
              {status?.error && status.error}
              {localBlocked && "Local renderer is not ready. Run its setup or select Gemini."}
            </p>
          )}
          {geometryBlocked && <p className="exteriorSlides__error">The floor-plan geometry must be valid before rendering.</p>}
          {error && <p className="exteriorSlides__error">{error}</p>}

          <button className="exteriorSlides__generate" type="button" disabled={!canGenerate} onClick={generatePack}>
            {isGenerating ? `Generating ${completed + 1} of 5…` : finishedCount ? "Regenerate complete pack" : "Generate five exterior slides"}
          </button>
          <small>Five images run sequentially to avoid exhausting GPU memory. Keep the backend running.</small>
        </aside>

        <div className="exteriorSlides__gallery">
          <div className="exteriorSlides__stage">
            {activeResult ? (
              <img src={activeResult.url} alt={activeResult.title} />
            ) : (
              <div className="exteriorSlides__empty">
                <strong>{isGenerating ? `Generating ${EXTERIOR_VIEWS.find((view) => view.id === generatingView)?.title || "view"}…` : "Your exterior design pack will appear here"}</strong>
                <span>Select the design options and generate all five views.</span>
              </div>
            )}
          </div>

          <div className="exteriorSlides__thumbs">
            {EXTERIOR_VIEWS.map((view, index) => {
              const slide = slides[view.id];
              return (
                <button key={view.id} type="button" className={activeSlide === view.id ? "is-active" : ""} onClick={() => { setActiveSlide(view.id); onViewChange(view.id); }}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  {slide ? <img src={slide.url} alt="" /> : <i>{generatingView === view.id ? "Rendering…" : view.title}</i>}
                </button>
              );
            })}
          </div>

          {activeResult && (
            <div className="exteriorSlides__actions">
              <div><strong>{activeResult.title}</strong><span>Same shared design seed · verify geometry before construction</span></div>
              <button type="button" disabled={isGenerating} onClick={() => regenerate(EXTERIOR_VIEWS.find((view) => view.id === activeSlide))}>Regenerate slide</button>
              <button type="button" onClick={() => download(activeResult)}>Download JPG</button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

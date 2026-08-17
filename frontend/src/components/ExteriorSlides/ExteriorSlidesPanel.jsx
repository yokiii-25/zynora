import { useEffect, useMemo, useState } from "react";
import "./exteriorSlides.css";

const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_BACKEND_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000"
).replace(/\/+$/, "");

const LAST_JOB_KEY = "zynoraBlenderExteriorJob";

const EXTERIOR_VIEWS = [
  { id: "front-hero", title: "Front hero" },
  { id: "front-left", title: "Front-left perspective" },
  { id: "front-straight", title: "Front elevation" },
  { id: "right-side", title: "Right-side perspective" },
  { id: "left-side", title: "Left-side perspective" },
];

const INITIAL_OPTIONS = {
  engine: "eevee",
  quality: "preview",
  style: "warm-modern",
};

function apiUrl(path) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}

async function responseError(response, fallback) {
  const payload = await response.json().catch(() => null);
  if (typeof payload?.detail === "string") return payload.detail;
  return fallback || `Exterior rendering failed (${response.status}).`;
}

export default function ExteriorSlidesPanel({
  floorPlanJson,
  geometryValidation,
}) {
  const [options, setOptions] = useState(INITIAL_OPTIONS);
  const [activeSlide, setActiveSlide] = useState("front-hero");
  const [job, setJob] = useState(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState({ checking: true });

  const geometryBlocked = Boolean(
    geometryValidation && !geometryValidation.valid,
  );
  const sourceReady = Boolean(
    floorPlanJson?.schemaVersion === "zynora.floorplan.v1" &&
    Array.isArray(floorPlanJson?.floors) &&
    floorPlanJson.floors.length,
  );
  const isGenerating = ["queued", "running"].includes(job?.status);
  const rendererBlocked = Boolean(
    status.checking ||
    status.error ||
    !status.installed ||
    (status.busy && !isGenerating),
  );
  const canGenerate = sourceReady && !geometryBlocked && !rendererBlocked && !isGenerating;
  const finishedCount = job?.images?.length || 0;

  const slides = useMemo(() => {
    const result = {};
    for (const image of job?.images || []) {
      result[image.id] = {
        ...image,
        url: apiUrl(image.url),
      };
    }
    return result;
  }, [job]);

  const activeResult = slides[activeSlide] || null;

  async function refreshRendererStatus() {
    try {
      const response = await fetch(`${API_BASE_URL}/blender-renderer/status`);
      if (!response.ok) {
        throw new Error(await responseError(response, "Blender status is unavailable."));
      }
      setStatus(await response.json());
    } catch (reason) {
      setStatus({
        checking: false,
        error: reason instanceof Error ? reason.message : "Blender status is unavailable.",
      });
    }
  }

  useEffect(() => {
    refreshRendererStatus();
  }, []);

  useEffect(() => {
    const savedJobId = window.localStorage.getItem(LAST_JOB_KEY);
    if (!savedJobId) return;

    let cancelled = false;
    fetch(`${API_BASE_URL}/blender-renderer/jobs/${savedJobId}`)
      .then(async (response) => {
        if (response.status === 404) {
          window.localStorage.removeItem(LAST_JOB_KEY);
          return null;
        }
        if (!response.ok) {
          throw new Error(await responseError(response));
        }
        return response.json();
      })
      .then((value) => {
        if (!cancelled && value) setJob(value);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!job?.jobId || !["queued", "running"].includes(job.status)) return;

    let cancelled = false;
    let timer = null;

    async function poll() {
      try {
        const response = await fetch(
          `${API_BASE_URL}/blender-renderer/jobs/${job.jobId}`,
          { cache: "no-store" },
        );
        if (!response.ok) throw new Error(await responseError(response));
        const current = await response.json();
        if (cancelled) return;
        setJob(current);

        if (["queued", "running"].includes(current.status)) {
          timer = window.setTimeout(poll, 900);
        } else {
          refreshRendererStatus();
          if (current.status === "failed") {
            setError(current.error?.split("\n")[0] || "Blender could not render the exterior pack.");
          }
        }
      } catch (reason) {
        if (!cancelled) {
          setError(reason instanceof Error ? reason.message : "Unable to read Blender progress.");
        }
      }
    }

    timer = window.setTimeout(poll, 400);
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [job?.jobId, job?.status]);

  function update(name, value) {
    setOptions((current) => ({ ...current, [name]: value }));
  }

  async function generatePack() {
    if (!canGenerate) return;
    setError("");
    setJob(null);
    setActiveSlide("front-hero");

    try {
      const response = await fetch(`${API_BASE_URL}/blender-renderer/jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          floorPlan: floorPlanJson,
          engine: options.engine,
          quality: options.quality,
          style: options.style,
        }),
      });
      if (!response.ok) throw new Error(await responseError(response));
      const createdJob = await response.json();
      window.localStorage.setItem(LAST_JOB_KEY, createdJob.jobId);
      setJob(createdJob);
      setStatus((current) => ({ ...current, ready: false, busy: true }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to start Blender.");
      refreshRendererStatus();
    }
  }

  function downloadImage(slide) {
    const anchor = document.createElement("a");
    anchor.href = slide.url;
    anchor.download = slide.filename || `ZYNORA-${slide.id}.png`;
    anchor.click();
  }

  function downloadPack() {
    if (!job?.downloadUrl) return;
    const anchor = document.createElement("a");
    anchor.href = apiUrl(job.downloadUrl);
    anchor.download = "ZYNORA-five-exterior-views.zip";
    anchor.click();
  }

  const statusText = status.checking
    ? "Checking Blender 4.5…"
    : status.error
      ? status.error
      : status.installed
        ? status.busy
          ? isGenerating
            ? "Blender is rendering this five-view pack."
            : "Blender is busy with another render."
          : "Blender five-view renderer is ready."
        : status.message || "Blender renderer is not installed.";

  return (
    <section className="exteriorSlides">
      <div className="exteriorSlides__heading">
        <div>
          <span>ZYNORA BLENDER EXTERIOR PACK</span>
          <h2>Five exact views of the current house</h2>
          <p>One FloorPlanJSON builds one shared Blender scene, so every slide keeps identical walls, openings, materials and proportions.</p>
        </div>
        <strong>{finishedCount}/5 ready</strong>
      </div>

      <div className="exteriorSlides__layout">
        <aside className="exteriorSlides__settings">
          <label>Rendering engine
            <select value={options.engine} onChange={(event) => update("engine", event.target.value)}>
              <option value="eevee">Blender Eevee - fast preview</option>
              <option value="cycles">Blender Cycles - RTX / OptiX</option>
            </select>
          </label>

          <label>Output quality
            <select value={options.quality} onChange={(event) => update("quality", event.target.value)}>
              <option value="preview">Preview - 960 × 540</option>
              <option value="final">Final - 1600 × 900</option>
            </select>
          </label>

          <label>Material palette
            <select value={options.style} onChange={(event) => update("style", event.target.value)}>
              <option value="warm-modern">Warm modern - cream and timber</option>
              <option value="graphite-white">Graphite and white</option>
              <option value="sandstone">Sandstone and dark wood</option>
            </select>
          </label>

          <p className={`exteriorSlides__status ${status?.installed && !rendererBlocked ? "is-ready" : ""}`}>
            {statusText}
          </p>

          {!sourceReady && (
            <p className="exteriorSlides__error">The current 3D model is still preparing its FloorPlanJSON.</p>
          )}
          {geometryBlocked && (
            <p className="exteriorSlides__error">The floor-plan geometry must be valid before rendering.</p>
          )}
          {error && <p className="exteriorSlides__error">{error}</p>}

          {job && (
            <div className="exteriorSlides__progress" aria-live="polite">
              <div>
                <span>{job.stage}</span>
                <strong>{job.progress || 0}%</strong>
              </div>
              <progress max="100" value={job.progress || 0} />
            </div>
          )}

          <button
            className="exteriorSlides__generate"
            type="button"
            disabled={!canGenerate}
            onClick={generatePack}
          >
            {isGenerating
              ? `Rendering ${Math.min(finishedCount + 1, 5)} of 5…`
              : finishedCount === 5
                ? "Render a new five-view pack"
                : "Generate five exterior slides"}
          </button>
          <small>Blender creates all five views sequentially in one shared scene. Cycles Final gives the best local result on the RTX 3050; Eevee Preview is the fastest test.</small>
        </aside>

        <div className="exteriorSlides__gallery">
          <div className="exteriorSlides__stage">
            {activeResult ? (
              <img src={activeResult.url} alt={activeResult.title} />
            ) : (
              <div className="exteriorSlides__empty">
                <strong>{isGenerating ? job?.stage || "Blender is rendering…" : "Your five Blender views will appear here"}</strong>
                <span>Choose the engine, quality and material palette, then start the render.</span>
              </div>
            )}
          </div>

          <div className="exteriorSlides__thumbs">
            {EXTERIOR_VIEWS.map((view, index) => {
              const slide = slides[view.id];
              return (
                <button
                  key={view.id}
                  type="button"
                  className={activeSlide === view.id ? "is-active" : ""}
                  onClick={() => setActiveSlide(view.id)}
                >
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  {slide ? (
                    <img src={slide.url} alt="" />
                  ) : (
                    <i>{isGenerating && finishedCount === index ? "Rendering…" : view.title}</i>
                  )}
                </button>
              );
            })}
          </div>

          {activeResult && (
            <div className="exteriorSlides__actions">
              <div>
                <strong>{activeResult.title}</strong>
                <span>{job.engine === "cycles" ? "Cycles / OptiX" : "Eevee"} · {job.quality} · {job.style}</span>
              </div>
              <button type="button" onClick={() => downloadImage(activeResult)}>Download PNG</button>
              {job?.downloadUrl && (
                <button className="is-primary" type="button" onClick={downloadPack}>Download all five</button>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

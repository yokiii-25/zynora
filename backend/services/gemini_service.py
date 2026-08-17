import base64
import json
import os
import time
from typing import Any

from dotenv import load_dotenv
from google import genai


load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
MODEL_NAME = os.getenv(
    "GEMINI_MODEL",
    "gemini-3.1-flash-lite",
)
IMAGE_PREVIEW_MODEL = os.getenv(
    "GEMINI_IMAGE_MODEL",
    "gemini-3.1-flash-image",
)
IMAGE_FINAL_MODEL = os.getenv(
    "GEMINI_IMAGE_FINAL_MODEL",
    "gemini-3-pro-image",
)

if not GEMINI_API_KEY:
    raise RuntimeError(
        "GEMINI_API_KEY is missing. Add it to the backend .env file."
    )

client = genai.Client(api_key=GEMINI_API_KEY)


DESIGN_RESPONSE_SCHEMA = {
    "type": "object",
    "properties": {
        "project_summary": {
            "type": "string",
            "description": (
                "A concise summary of the client's home requirements."
            ),
        },
        "design_concept": {
            "type": "string",
            "description": (
                "The main architectural concept recommended for the project."
            ),
        },
        "recommended_style": {
            "type": "string",
            "description": (
                "Recommended architectural style based on the request."
            ),
        },
        "estimated_built_up_area": {
            "type": "string",
            "description": (
                "Estimated total built-up area including the measurement unit."
            ),
        },
        "estimated_cost": {
            "type": "string",
            "description": (
                "A broad cost estimate using the user's selected currency."
            ),
        },
        "construction_timeline": {
            "type": "string",
            "description": (
                "A broad estimated construction duration."
            ),
        },
        "floor_plan_strategy": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "floor": {
                        "type": "string",
                    },
                    "recommended_spaces": {
                        "type": "array",
                        "items": {
                            "type": "string",
                        },
                    },
                    "planning_notes": {
                        "type": "string",
                    },
                },
                "required": [
                    "floor",
                    "recommended_spaces",
                    "planning_notes",
                ],
            },
        },
        "room_recommendations": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "room": {
                        "type": "string",
                    },
                    "recommended_size": {
                        "type": "string",
                    },
                    "design_notes": {
                        "type": "string",
                    },
                },
                "required": [
                    "room",
                    "recommended_size",
                    "design_notes",
                ],
            },
        },
        "recommended_materials": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "material": {
                        "type": "string",
                    },
                    "recommended_use": {
                        "type": "string",
                    },
                    "reason": {
                        "type": "string",
                    },
                },
                "required": [
                    "material",
                    "recommended_use",
                    "reason",
                ],
            },
        },
        "sustainability_score": {
            "type": "integer",
            "minimum": 0,
            "maximum": 100,
        },
        "sustainability_recommendations": {
            "type": "array",
            "items": {
                "type": "string",
            },
        },
        "natural_light_strategy": {
            "type": "string",
        },
        "ventilation_strategy": {
            "type": "string",
        },
        "accessibility_recommendations": {
            "type": "array",
            "items": {
                "type": "string",
            },
        },
        "budget_recommendations": {
            "type": "array",
            "items": {
                "type": "string",
            },
        },
        "future_expansion_options": {
            "type": "array",
            "items": {
                "type": "string",
            },
        },
        "important_considerations": {
            "type": "array",
            "items": {
                "type": "string",
            },
        },
        "professional_disclaimer": {
            "type": "string",
        },
    },
    "required": [
        "project_summary",
        "design_concept",
        "recommended_style",
        "estimated_built_up_area",
        "estimated_cost",
        "construction_timeline",
        "floor_plan_strategy",
        "room_recommendations",
        "recommended_materials",
        "sustainability_score",
        "sustainability_recommendations",
        "natural_light_strategy",
        "ventilation_strategy",
        "accessibility_recommendations",
        "budget_recommendations",
        "future_expansion_options",
        "important_considerations",
        "professional_disclaimer",
    ],
}


def build_design_prompt(project: dict[str, Any]) -> str:
    project_json = json.dumps(
        project,
        indent=2,
        ensure_ascii=False,
    )

    return f"""
You are ZYNORA AI, a residential architectural planning assistant.

Your role is to analyze the homeowner's requirements and produce a practical,
clear, budget-aware preliminary home design recommendation.

PROJECT INFORMATION:

{project_json}

CORE RESPONSIBILITIES:

1. Understand the land, family, rooms, lifestyle, accessibility, budget,
   preferred materials, design style, and sustainability requirements.

2. Recommend a sensible distribution of spaces across the requested floors.

3. Make the design practical for daily family life, privacy, movement,
   natural lighting, ventilation, parking, accessibility, and future needs.

4. Respect the user's stated budget and budget flexibility.

5. Use the user's selected currency when discussing estimated cost.

6. Respect the requested architectural style, but suggest improvements when
   they make the project more practical.

7. Consider the road-facing direction when discussing entry placement,
   natural light, ventilation, and room arrangement.

8. Consider children, senior citizens, pets, work-from-home requirements,
   lifestyle features, and accessibility requirements.

IMPORTANT SAFETY AND ACCURACY RULES:

1. This is a preliminary AI-generated concept, not a construction-ready plan.

2. Do not claim that the design complies with local laws, building codes,
   structural standards, fire rules, zoning rules, or permit requirements.

3. Do not invent exact soil conditions, climate conditions, flood risk,
   terrain, sunlight data, wind data, market rates, or legal requirements.

4. Do not claim that the latitude and longitude have been professionally
   surveyed.

5. Clearly state where an architect, structural engineer, quantity surveyor,
   geotechnical engineer, contractor, or local authority must be consulted.

6. Cost and timeline values must be broad estimates, not guarantees.

7. Do not provide structural calculations, beam dimensions, column sizes,
   foundation depths, electrical load calculations, or construction
   instructions.

8. Do not recommend removing accessibility features requested by the user.

9. Never invent requirements that were not provided. When information is
   uncertain, make a reasonable preliminary assumption and clearly label it.

DESIGN QUALITY RULES:

1. Avoid generic suggestions.

2. Connect every major recommendation to the project information.

3. Keep recommendations realistic for the available plot and number of floors.

4. Avoid recommending more rooms than can reasonably fit.

5. Use practical room-size ranges rather than pretending to know exact final
   dimensions.

6. Prioritize circulation, privacy, daylight, cross-ventilation, storage,
   usability, accessibility, and maintainability.

7. Recommend sustainable features only when they are suitable for the
   project and budget.

8. Use concise, professional, homeowner-friendly language.

Return only the required structured JSON response.
Do not include Markdown, code fences, headings outside the JSON, or any
additional commentary.
"""


def validate_design_response(design: dict[str, Any]) -> dict[str, Any]:
    required_fields = DESIGN_RESPONSE_SCHEMA["required"]

    missing_fields = [
        field
        for field in required_fields
        if field not in design
    ]

    if missing_fields:
        raise ValueError(
            f"AI response is missing fields: {missing_fields}"
        )

    design["sustainability_score"] = max(
        0,
        min(
            100,
            int(design["sustainability_score"]),
        ),
    )

    list_fields = [
        "floor_plan_strategy",
        "room_recommendations",
        "recommended_materials",
        "sustainability_recommendations",
        "accessibility_recommendations",
        "budget_recommendations",
        "future_expansion_options",
        "important_considerations",
    ]

    for field in list_fields:
        if not isinstance(design[field], list):
            raise ValueError(
                f"AI response field '{field}' must be a list."
            )

    return design


def generate_home_design(
    project: dict[str, Any],
) -> dict[str, Any]:
    if not project:
        raise ValueError("Project data cannot be empty.")

    prompt = build_design_prompt(project)
    last_error = None

    for attempt in range(3):
        try:
            response = client.models.generate_content(
                model=MODEL_NAME,
                contents=prompt,
                config={
                    "response_mime_type": "application/json",
                    "response_json_schema": DESIGN_RESPONSE_SCHEMA,
                },
            )

            if not response.text:
                raise ValueError(
                    "Gemini returned an empty response."
                )

            design = json.loads(response.text)

            return validate_design_response(design)

        except Exception as error:
            last_error = error

            print(
                f"Gemini design attempt {attempt + 1} failed:",
                repr(error),
            )

            if attempt < 2:
                time.sleep(3)

    raise RuntimeError(
        "Gemini home design generation failed after "
        f"3 attempts: {last_error}"
    )


def _clean_render_option(
    value: Any,
    fallback: str,
    maximum_length: int,
) -> str:
    if value is None:
        return fallback

    cleaned = " ".join(str(value).strip().split())

    if not cleaned:
        return fallback

    return cleaned[:maximum_length]


def build_realistic_render_prompt(
    options: dict[str, Any],
) -> str:
    style = _clean_render_option(
        options.get("style"),
        "Modern contemporary",
        80,
    )
    materials = _clean_render_option(
        options.get("materials"),
        "painted concrete, glass, stone, and wood accents",
        240,
    )
    roof = _clean_render_option(
        options.get("roof"),
        "Keep the roof massing shown in the reference",
        100,
    )
    lighting = _clean_render_option(
        options.get("lighting"),
        "Bright natural daylight",
        80,
    )
    surroundings = _clean_render_option(
        options.get("surroundings"),
        "Simple landscaped residential plot",
        180,
    )
    custom_instructions = _clean_render_option(
        options.get("custom_instructions"),
        "No additional changes",
        500,
    )

    return f"""
Create one photorealistic architectural exterior concept render from the
attached ZYNORA 3D screenshot.

GEOMETRY FIDELITY IS THE HIGHEST PRIORITY:

1. Treat the attached image as the authoritative building reference.
2. Preserve the visible footprint, proportions, wall layout, floor count,
   relative heights, openings, stairs, roof massing, and camera angle.
3. Do not rotate, mirror, stretch, crop, or redesign the building geometry.
4. Do not add or remove floors, rooms, wings, balconies, doors, or windows
   unless they are explicitly visible in the reference.
5. Apply realistic facade materials, glazing, lighting, landscaping, and
   shadows without replacing the underlying design.
6. If the reference does not reveal a detail, use a conservative, simple
   residential solution rather than inventing a major architectural feature.

USER'S VISUAL PREFERENCES:

- Architectural style: {style}
- Exterior materials: {materials}
- Roof treatment: {roof}
- Lighting and time: {lighting}
- Plot surroundings: {surroundings}
- Additional request: {custom_instructions}

OUTPUT RULES:

- Produce a clean, realistic residential visualization of the complete house.
- Keep the full building visible and use the same viewpoint as the reference.
- Use physically plausible materials, daylight, reflections, and shadows.
- Do not include people, vehicles, captions, dimensions, logos, or UI text.
- This is a visual concept only, not a construction-ready or code-compliant
  architectural document.
"""


def _extract_interaction_image(
    interaction: Any,
) -> tuple[bytes, str]:
    output_image = getattr(
        interaction,
        "output_image",
        None,
    )

    if output_image is None:
        raise ValueError(
            "Gemini returned no generated image."
        )

    encoded_data = getattr(
        output_image,
        "data",
        None,
    )
    mime_type = getattr(
        output_image,
        "mime_type",
        None,
    ) or "image/jpeg"

    if not encoded_data:
        raise ValueError(
            "Gemini returned an empty generated image."
        )

    if isinstance(encoded_data, bytes):
        encoded_data = encoded_data.decode("ascii")

    try:
        image_bytes = base64.b64decode(encoded_data)
    except Exception as error:
        raise ValueError(
            "Gemini returned invalid image data."
        ) from error

    if not image_bytes:
        raise ValueError(
            "Gemini returned an empty generated image."
        )

    return image_bytes, mime_type


def generate_realistic_house_render(
    reference_image: bytes,
    reference_mime_type: str,
    options: dict[str, Any] | None = None,
) -> dict[str, Any]:
    if not reference_image:
        raise ValueError(
            "A 3D reference image is required."
        )

    render_options = options or {}
    quality = str(
        render_options.get("quality", "preview")
    ).strip().lower()

    if quality not in {"preview", "final"}:
        raise ValueError(
            "Render quality must be 'preview' or 'final'."
        )

    model_name = (
        IMAGE_FINAL_MODEL
        if quality == "final"
        else IMAGE_PREVIEW_MODEL
    )
    image_size = (
        "2K"
        if quality == "final"
        else "1K"
    )
    prompt = build_realistic_render_prompt(
        render_options
    )
    encoded_reference = base64.b64encode(
        reference_image
    ).decode("ascii")
    last_error = None

    for attempt in range(2):
        try:
            interaction = client.interactions.create(
                model=model_name,
                input=[
                    {
                        "type": "text",
                        "text": prompt,
                    },
                    {
                        "type": "image",
                        "data": encoded_reference,
                        "mime_type": reference_mime_type,
                    },
                ],
                response_format={
                    "type": "image",
                    "mime_type": "image/jpeg",
                    "aspect_ratio": "16:9",
                    "image_size": image_size,
                },
            )

            image_bytes, mime_type = (
                _extract_interaction_image(
                    interaction
                )
            )

            return {
                "image_bytes": image_bytes,
                "mime_type": mime_type,
                "model": model_name,
                "quality": quality,
            }

        except Exception as error:
            last_error = error

            print(
                f"Gemini image attempt {attempt + 1} failed:",
                repr(error),
            )

            if attempt == 0:
                time.sleep(2)

    raise RuntimeError(
        "Gemini realistic house rendering failed after "
        f"2 attempts: {last_error}"
    )

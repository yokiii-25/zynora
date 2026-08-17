import uuid

from fastapi import APIRouter, HTTPException

from services.gemini_service import generate_home_design


router = APIRouter()


@router.post("/generate-design")
async def generate_design(project: dict):
    try:
        project_id = str(uuid.uuid4())

        design_report = generate_home_design(project)

        return {
            "success": True,
            "projectId": project_id,
            "design": design_report,
        }

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        ) from error

    except Exception as error:
        print("Generate design error:", repr(error))

        raise HTTPException(
            status_code=500,
            detail="Unable to generate the AI design report.",
        ) from error
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database.database import get_db
from database.models import Project


router = APIRouter(
    prefix="/projects",
    tags=["Projects"],
)


class ProjectCreate(BaseModel):
    name: str
    location: str | None = None
    property_type: str | None = None
    floors: int | None = None
    plot_width: float | None = None
    plot_length: float | None = None
    bedrooms: int | None = None
    bathrooms: int | None = None
    budget: float | None = None
    currency: str = "INR"
    style: str | None = None
    status: str = "draft"
    design_notes: str | None = None


class ProjectUpdate(BaseModel):
    name: str | None = None
    location: str | None = None
    property_type: str | None = None
    floors: int | None = None
    plot_width: float | None = None
    plot_length: float | None = None
    bedrooms: int | None = None
    bathrooms: int | None = None
    budget: float | None = None
    currency: str | None = None
    style: str | None = None
    status: str | None = None
    design_notes: str | None = None


def project_to_dict(project: Project):
    return {
        "id": project.id,
        "name": project.name,
        "location": project.location,
        "property_type": project.property_type,
        "floors": project.floors,
        "plot_width": project.plot_width,
        "plot_length": project.plot_length,
        "bedrooms": project.bedrooms,
        "bathrooms": project.bathrooms,
        "budget": project.budget,
        "currency": project.currency,
        "style": project.style,
        "status": project.status,
        "design_notes": project.design_notes,
        "created_at": project.created_at,
        "updated_at": project.updated_at,
    }


@router.post("")
def create_project(
    data: ProjectCreate,
    db: Session = Depends(get_db),
):
    project = Project(**data.model_dump())

    db.add(project)
    db.commit()
    db.refresh(project)

    return project_to_dict(project)


@router.get("")
def get_projects(
    db: Session = Depends(get_db),
):
    projects = (
        db.query(Project)
        .order_by(Project.id.desc())
        .all()
    )

    return [
        project_to_dict(project)
        for project in projects
    ]


@router.get("/{project_id}")
def get_project(
    project_id: int,
    db: Session = Depends(get_db),
):
    project = db.get(Project, project_id)

    if not project:
        raise HTTPException(
            status_code=404,
            detail="Project not found",
        )

    return project_to_dict(project)


@router.put("/{project_id}")
def update_project(
    project_id: int,
    data: ProjectUpdate,
    db: Session = Depends(get_db),
):
    project = db.get(Project, project_id)

    if not project:
        raise HTTPException(
            status_code=404,
            detail="Project not found",
        )

    updates = data.model_dump(
        exclude_unset=True,
    )

    for key, value in updates.items():
        setattr(project, key, value)

    db.commit()
    db.refresh(project)

    return project_to_dict(project)


@router.delete("/{project_id}")
def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
):
    project = db.get(Project, project_id)

    if not project:
        raise HTTPException(
            status_code=404,
            detail="Project not found",
        )

    db.delete(project)
    db.commit()

    return {
        "message": "Project deleted successfully",
        "id": project_id,
    }

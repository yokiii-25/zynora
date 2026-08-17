from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.design import router as design_router
from floorplan_routes import router as floorplan_router
from floorplan_upload_routes import (
    router as floorplan_upload_router,
)
from room_classification_routes import (
    router as room_classification_router,
)
from routes.realistic_render import (
    router as realistic_render_router,
)
from routes.floorplan_geometry import (
    router as floorplan_geometry_router,
)
from routes.blender_render import (
    router as blender_render_router,
)


app = FastAPI(
    title="ZYNORA API",
    version="0.6.0",
    description=(
        "Backend API for the ZYNORA "
        "AI home-design platform."
    ),
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(floorplan_router)
app.include_router(floorplan_upload_router)
app.include_router(design_router)
app.include_router(room_classification_router)
app.include_router(realistic_render_router)
app.include_router(floorplan_geometry_router)
app.include_router(blender_render_router)


@app.get("/")
def root():
    return {
        "message": "Welcome to the ZYNORA API",
        "status": "running",
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
    }

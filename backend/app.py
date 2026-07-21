from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="ZYNORA API",
    version="0.1.0",
    description="Backend API for the ZYNORA AI home-design platform.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {
        "message": "Welcome to the ZYNORA API",
        "status": "running",
    }


@app.get("/health")
def health_check():
    return {"status": "healthy"}
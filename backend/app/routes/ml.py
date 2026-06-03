import os
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

router = APIRouter()

PLOTS_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "ml")

ALLOWED_PLOTS = {"feature_importance", "risk_distribution"}


@router.get("/plots/{plot_name}")
def get_plot(plot_name: str):
    if plot_name not in ALLOWED_PLOTS:
        raise HTTPException(status_code=404, detail="Plot not found")

    path = os.path.join(PLOTS_DIR, f"{plot_name}.png")
    if not os.path.isfile(path):
        raise HTTPException(status_code=404, detail="Plot file not found — run training first")

    return FileResponse(path, media_type="image/png")

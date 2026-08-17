from __future__ import annotations

from pathlib import Path

import cv2
import fitz
import numpy as np


SUPPORTED_IMAGE_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
}


def load_pdf_first_page(
    file_path: Path,
) -> np.ndarray:
    document = fitz.open(file_path)

    try:
        if document.page_count == 0:
            raise ValueError(
                "The PDF does not contain any pages."
            )

        page = document.load_page(0)

        # Higher resolution makes wall extraction more accurate.
        matrix = fitz.Matrix(2.0, 2.0)

        pixmap = page.get_pixmap(
            matrix=matrix,
            alpha=False,
        )

        image_array = np.frombuffer(
            pixmap.samples,
            dtype=np.uint8,
        )

        image = image_array.reshape(
            pixmap.height,
            pixmap.width,
            pixmap.n,
        )

        if pixmap.n == 3:
            return cv2.cvtColor(
                image,
                cv2.COLOR_RGB2BGR,
            )

        if pixmap.n == 4:
            return cv2.cvtColor(
                image,
                cv2.COLOR_RGBA2BGR,
            )

        raise ValueError(
            "The PDF page has an unsupported image format."
        )

    finally:
        document.close()


def load_floor_plan_image(
    file_path: Path,
) -> np.ndarray:
    extension = file_path.suffix.lower()

    if extension == ".pdf":
        return load_pdf_first_page(file_path)

    if extension not in SUPPORTED_IMAGE_EXTENSIONS:
        raise ValueError(
            "Only PDF, JPG, JPEG and PNG files are supported."
        )

    image = cv2.imread(
        str(file_path),
        cv2.IMREAD_COLOR,
    )

    if image is None:
        raise ValueError(
            "The uploaded floor-plan image could not be opened."
        )

    return image


def resize_for_processing(
    image: np.ndarray,
    maximum_dimension: int = 2000,
) -> tuple[np.ndarray, float]:
    height, width = image.shape[:2]

    largest_dimension = max(
        width,
        height,
    )

    if largest_dimension <= maximum_dimension:
        return image.copy(), 1.0

    scale = maximum_dimension / largest_dimension

    resized_width = max(
        1,
        round(width * scale),
    )

    resized_height = max(
        1,
        round(height * scale),
    )

    resized = cv2.resize(
        image,
        (
            resized_width,
            resized_height,
        ),
        interpolation=cv2.INTER_AREA,
    )

    return resized, float(scale)
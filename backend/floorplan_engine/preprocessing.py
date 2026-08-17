from __future__ import annotations

from pathlib import Path

import cv2
import numpy as np
from skimage.morphology import skeletonize


def convert_to_grayscale(
    image: np.ndarray,
) -> np.ndarray:
    if len(image.shape) == 2:
        return image.copy()

    return cv2.cvtColor(
        image,
        cv2.COLOR_BGR2GRAY,
    )


def improve_contrast(
    grayscale: np.ndarray,
) -> np.ndarray:
    clahe = cv2.createCLAHE(
        clipLimit=2.0,
        tileGridSize=(8, 8),
    )

    return clahe.apply(grayscale)


def threshold_blueprint(
    grayscale: np.ndarray,
) -> np.ndarray:
    blurred = cv2.GaussianBlur(
        grayscale,
        (5, 5),
        0,
    )

    # Dark lines become white; background becomes black.
    binary = cv2.adaptiveThreshold(
        blurred,
        255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY_INV,
        41,
        12,
    )

    return binary


def remove_small_noise(
    binary: np.ndarray,
) -> np.ndarray:
    number_of_labels, labels, statistics, _ = (
        cv2.connectedComponentsWithStats(
            binary,
            connectivity=8,
        )
    )

    cleaned = np.zeros_like(binary)

    minimum_component_area = max(
        12,
        int(binary.shape[0] * binary.shape[1] * 0.000005),
    )

    for label_index in range(
        1,
        number_of_labels,
    ):
        area = statistics[
            label_index,
            cv2.CC_STAT_AREA,
        ]

        if area >= minimum_component_area:
            cleaned[
                labels == label_index
            ] = 255

    return cleaned


def extract_thick_wall_regions(
    binary: np.ndarray,
) -> np.ndarray:
    """
    Keep thick drawing strokes and suppress thin details such as:

    - furniture outlines
    - labels
    - door arcs
    - dashed guide lines
    - decorative textures

    The distance transform measures the distance of each white
    pixel from the nearest background pixel. Thick wall strokes
    have a larger internal distance than thin furniture lines.
    """

    distance = cv2.distanceTransform(
        binary,
        cv2.DIST_L2,
        5,
    )

    positive_values = distance[
        distance > 0
    ]

    if positive_values.size == 0:
        raise ValueError(
            "The uploaded image does not contain detectable dark lines."
        )

    maximum_distance = float(
        positive_values.max()
    )

    # Adaptive thickness threshold.
    thickness_threshold = max(
        1.3,
        min(
            3.5,
            maximum_distance * 0.30,
        ),
    )

    thick_core = np.where(
        distance >= thickness_threshold,
        255,
        0,
    ).astype(np.uint8)

    # Rebuild the thick line around its centre.
    rebuild_size = max(
        3,
        int(round(thickness_threshold * 2)) + 1,
    )

    if rebuild_size % 2 == 0:
        rebuild_size += 1

    rebuild_kernel = cv2.getStructuringElement(
        cv2.MORPH_RECT,
        (
            rebuild_size,
            rebuild_size,
        ),
    )

    wall_regions = cv2.dilate(
        thick_core,
        rebuild_kernel,
        iterations=1,
    )

    # Keep strong horizontal and vertical structures.
    height, width = binary.shape[:2]

    horizontal_length = max(
        15,
        int(width * 0.012),
    )

    vertical_length = max(
        15,
        int(height * 0.012),
    )

    horizontal_kernel = cv2.getStructuringElement(
        cv2.MORPH_RECT,
        (
            horizontal_length,
            3,
        ),
    )

    vertical_kernel = cv2.getStructuringElement(
        cv2.MORPH_RECT,
        (
            3,
            vertical_length,
        ),
    )

    horizontal_regions = cv2.morphologyEx(
        wall_regions,
        cv2.MORPH_OPEN,
        horizontal_kernel,
    )

    vertical_regions = cv2.morphologyEx(
        wall_regions,
        cv2.MORPH_OPEN,
        vertical_kernel,
    )

    structural_regions = cv2.bitwise_or(
        horizontal_regions,
        vertical_regions,
    )

    # Join tiny gaps created by image noise.
    closing_kernel = cv2.getStructuringElement(
        cv2.MORPH_RECT,
        (5, 5),
    )

    structural_regions = cv2.morphologyEx(
        structural_regions,
        cv2.MORPH_CLOSE,
        closing_kernel,
        iterations=1,
    )

    return structural_regions


def skeletonize_wall_regions(
    wall_regions: np.ndarray,
) -> np.ndarray:
    boolean_image = wall_regions > 0

    skeleton = skeletonize(
        boolean_image
    )

    return (
        skeleton.astype(np.uint8)
        * 255
    )


def preprocess_floor_plan(
    image: np.ndarray,
) -> dict[str, np.ndarray]:
    grayscale = convert_to_grayscale(image)

    contrasted = improve_contrast(
        grayscale
    )

    binary = threshold_blueprint(
        contrasted
    )

    cleaned_binary = remove_small_noise(
        binary
    )

    wall_regions = extract_thick_wall_regions(
        cleaned_binary
    )

    skeleton = skeletonize_wall_regions(
        wall_regions
    )

    return {
        "grayscale": grayscale,
        "contrasted": contrasted,
        "binary": binary,
        "cleaned_binary": cleaned_binary,
        "wall_regions": wall_regions,
        "skeleton": skeleton,
    }


def save_debug_images(
    stages: dict[str, np.ndarray],
    output_directory: Path,
) -> None:
    output_directory.mkdir(
        parents=True,
        exist_ok=True,
    )

    for stage_name, image in stages.items():
        output_path = (
            output_directory
            / f"{stage_name}.png"
        )

        cv2.imwrite(
            str(output_path),
            image,
        )
import os
import uuid
import cv2
import numpy as np


def generate_forensic_heatmap(
    processed_bgr: np.ndarray,
    ela_map: np.ndarray,
    suspicious_regions: list,
    output_dir: str = "static/heatmaps"
) -> str:
    """
    Generates a thermal heatmap overlay on top of the document image,
    draws bounding boxes for suspicious anomaly zones, and saves safely to disk.
    Returns the relative image file path / URL.
    """
    os.makedirs(output_dir, exist_ok=True)

    h, w = processed_bgr.shape[:2]

    # Normalize ELA map to 0-255
    ela_norm = cv2.normalize(ela_map, None, alpha=0, beta=255, norm_type=cv2.NORM_MINMAX)

    # Apply Jet / Turbo Colormap to ELA matrix
    heatmap_color = cv2.applyColorMap(ela_norm, cv2.COLORMAP_JET)

    # Blend original image with heatmap (65% original, 35% heatmap)
    blended = cv2.addWeighted(processed_bgr, 0.65, heatmap_color, 0.35, 0)

    # Draw bounding boxes for detected suspicious regions
    for region in suspicious_regions:
        bbox = region.get("boundingBox", {})
        x_pct = bbox.get("x", 0)
        y_pct = bbox.get("y", 0)
        w_pct = bbox.get("width", 0)
        h_pct = bbox.get("height", 0)

        x1 = int((x_pct / 100.0) * w)
        y1 = int((y_pct / 100.0) * h)
        x2 = int(((x_pct + w_pct) / 100.0) * w)
        y2 = int(((y_pct + h_pct) / 100.0) * h)

        # Draw red border rectangle
        cv2.rectangle(blended, (x1, y1), (x2, y2), (0, 0, 240), 3)
        # Label badge background
        cv2.rectangle(blended, (x1, max(0, y1 - 22)), (x1 + 140, y1), (0, 0, 180), -1)
        # Text label
        cv2.putText(
            blended,
            f"[{region.get('type', 'ANOMALY')}]",
            (x1 + 5, max(12, y1 - 6)),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.45,
            (255, 255, 255),
            1,
            cv2.LINE_AA,
        )

    # Generate unique filename
    unique_id = uuid.uuid4().hex[:10]
    filename = f"heatmap_{unique_id}.jpg"
    filepath = os.path.join(output_dir, filename)

    # Save output image
    cv2.imwrite(filepath, blended)

    return f"/static/heatmaps/{filename}"

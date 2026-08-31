import cv2
import numpy as np


def preprocess_document_image(image: np.ndarray, max_dim: int = 1600) -> dict:
    """
    Preprocesses uploaded document image:
    1. Calculates resolution & aspect ratio
    2. Resizes if dimensions exceed max_dim while preserving aspect ratio
    3. Performs blur detection using Laplacian variance
    4. Computes mean luminance & contrast metrics
    """
    orig_h, orig_w = image.shape[:2]

    # Resize while preserving aspect ratio if larger than max_dim
    scale = 1.0
    if max(orig_h, orig_w) > max_dim:
        scale = max_dim / float(max(orig_h, orig_w))
        new_w = int(orig_w * scale)
        new_h = int(orig_h * scale)
        resized_img = cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_AREA)
    else:
        resized_img = image.copy()

    # Convert to Grayscale for quality checks
    gray = cv2.cvtColor(resized_img, cv2.COLOR_BGR2GRAY)

    # Blur detection via Laplacian Variance
    laplacian_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    is_blurry = laplacian_var < 100.0  # standard threshold for document blur

    # Contrast & Luminance metrics
    mean_luminance = float(np.mean(gray))
    std_contrast = float(np.std(gray))

    # Basic contrast normalization
    normalized_gray = cv2.equalizeHist(gray)

    return {
        "original_image": image,
        "processed_bgr": resized_img,
        "processed_gray": gray,
        "normalized_gray": normalized_gray,
        "original_shape": (orig_h, orig_w),
        "processed_shape": resized_img.shape[:2],
        "blur_score": laplacian_var,
        "is_blurry": is_blurry,
        "mean_luminance": mean_luminance,
        "contrast_std": std_contrast,
    }

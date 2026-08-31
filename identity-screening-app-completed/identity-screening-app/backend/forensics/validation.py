import io
import cv2
import numpy as np
from PIL import Image
from fastapi import UploadFile, HTTPException, status

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png"}
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/pjpeg"}
MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024  # 25 MB


async def validate_uploaded_image(file: UploadFile) -> tuple[np.ndarray, bytes, str]:
    """
    Validates uploaded file extension, size, MIME type, and checks for image corruption.
    Enforces JPG, JPEG, and PNG formats only with user-friendly error messages.
    """
    filename = file.filename or "uploaded_document.jpg"
    ext = "." + filename.split(".")[-1].lower() if "." in filename else ""

    # Strict File Format Check
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file type. Please upload a valid document image in JPG, JPEG, or PNG format."
        )

    # Check Content Type if provided
    if file.content_type and file.content_type.lower() not in ALLOWED_MIME_TYPES and file.content_type != "application/octet-stream":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file type. Please upload a valid document image in JPG, JPEG, or PNG format."
        )

    # Read raw bytes
    contents = await file.read()
    file_size = len(contents)

    if file_size == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded file is empty (0 bytes). Please upload a valid image file."
        )

    if file_size > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File size exceeds maximum allowed threshold of 25MB (Received {file_size / (1024 * 1024):.1f}MB)."
        )

    # Corruption & Header Integrity Check via PIL & OpenCV
    try:
        pil_img = Image.open(io.BytesIO(contents))
        pil_img.verify()  # Verifies file header and structural integrity
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded file is corrupted or unreadable. Please upload a valid image file."
        )

    # Decode BGR numpy array using OpenCV
    try:
        np_arr = np.frombuffer(contents, np.uint8)
        image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        if image is None or image.size == 0:
            raise ValueError("Decoded image matrix is empty.")
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded file is corrupted or unreadable. Please upload a valid image file."
        )

    return image, contents, filename

import io
import cv2
import numpy as np
from PIL import Image
from fastapi import UploadFile, HTTPException, status
from typing import Tuple, Dict, Any, Optional

from .document_source import classify_document_source

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".pdf"}
ALLOWED_MIME_TYPES = {
    "image/jpeg", 
    "image/png", 
    "image/pjpeg", 
    "image/webp", 
    "application/pdf", 
    "application/x-pdf",
    "application/octet-stream"
}
MAX_FILE_SIZE_BYTES = 30 * 1024 * 1024  # 30 MB


def render_pdf_to_image(contents: bytes) -> Tuple[np.ndarray, Dict[str, Any]]:
    """
    Renders the primary page of an uploaded PDF (e-Aadhaar, e-PAN, passport copy)
    to a high-resolution BGR numpy array and extracts digital vector text streams.
    """
    try:
        import pypdfium2 as pdfium
        pdf = pdfium.PdfDocument(contents)
        if len(pdf) == 0:
            raise ValueError("PDF contains 0 pages.")
        
        # Render page 0 at 2.5x scale (approx 200-300 DPI for high OCR accuracy)
        page = pdf.get_page(0)
        pil_image = page.render(scale=2.5).to_pil()
        rgb_array = np.array(pil_image.convert("RGB"))
        bgr_image = cv2.cvtColor(rgb_array, cv2.COLOR_RGB2BGR)

        # Extract native PDF vector text layer if available
        extracted_pdf_text = ""
        pdf_metadata = {}
        try:
            from pypdf import PdfReader
            reader = PdfReader(io.BytesIO(contents))
            pdf_metadata = {str(k): str(v) for k, v in (reader.metadata or {}).items()}
            for p in reader.pages[:2]:
                txt = p.extract_text()
                if txt:
                    extracted_pdf_text += txt + "\n"
        except Exception:
            pass

        pdf_info = {
            "page_count": len(pdf),
            "pdf_metadata": pdf_metadata,
            "has_native_text_layer": len(extracted_pdf_text.strip()) > 20,
            "native_text": extracted_pdf_text.strip(),
            "rendered_shape": bgr_image.shape
        }

        return bgr_image, pdf_info
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unable to parse or render uploaded PDF document: {str(e)}"
        )


async def validate_uploaded_image(file: UploadFile) -> Tuple[np.ndarray, bytes, str, Dict[str, Any]]:
    """
    Validates uploaded file extension, size, MIME type, and checks for image/PDF corruption.
    Supports JPG, JPEG, PNG, WebP, and PDF formats with intelligent document source classification.
    Returns: (image_bgr, raw_bytes, filename, source_info)
    """
    filename = file.filename or "uploaded_document.jpg"
    ext = "." + filename.split(".")[-1].lower() if "." in filename else ""

    # Strict File Format Check
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file type. Please upload a valid document in JPG, JPEG, PNG, WebP, or PDF format."
        )

    # Read raw bytes
    contents = await file.read()
    file_size = len(contents)

    if file_size == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded file is empty (0 bytes). Please upload a valid document."
        )

    if file_size > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File size exceeds maximum allowed threshold of 30MB (Received {file_size / (1024 * 1024):.1f}MB)."
        )

    # Branch A: PDF Document
    if ext == ".pdf" or contents.startswith(b"%PDF-"):
        image_bgr, pdf_info = render_pdf_to_image(contents)
        source_info = classify_document_source(image_bgr, contents, filename, "application/pdf")
        source_info["pdf_info"] = pdf_info
        return image_bgr, contents, filename, source_info

    # Branch B: Standard Raster Image (JPG, PNG, WebP)
    try:
        pil_img = Image.open(io.BytesIO(contents))
        pil_img.verify()
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded image file is corrupted or unreadable. Please upload a valid image file."
        )

    try:
        np_arr = np.frombuffer(contents, np.uint8)
        image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        if image is None or image.size == 0:
            raise ValueError("Decoded image matrix is empty.")
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded image could not be decoded. Please upload a valid image file."
        )

    source_info = classify_document_source(image, contents, filename, file.content_type or "")
    return image, contents, filename, source_info

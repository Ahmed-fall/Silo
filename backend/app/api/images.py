from fastapi import APIRouter, HTTPException, UploadFile, File
from app.core.database import get_db
from app.core.config import settings
from app.models.image import ImageResponse
from typing import List
import uuid
import os

router = APIRouter(prefix="/images", tags=["images"])


@router.post("/upload", response_model=ImageResponse)
async def upload_image(silo_id: uuid.UUID, file: UploadFile = File(...)):
    db = await get_db()

    silo = await db.fetchrow("SELECT id FROM silos WHERE id = $1", silo_id)
    if not silo:
        raise HTTPException(status_code=404, detail="Silo not found")

    ext = os.path.splitext(file.filename)[1]
    filename = f"{uuid.uuid4()}{ext}"
    file_path = os.path.join(settings.uploads_dir, filename)

    os.makedirs(settings.uploads_dir, exist_ok=True)
    contents = await file.read()
    with open(file_path, "wb") as f:
        f.write(contents)

    row = await db.fetchrow(
        """
        INSERT INTO images (silo_id, file_path)
        VALUES ($1, $2)
        RETURNING *
        """,
        silo_id,
        file_path,
    )
    return dict(row)


@router.get("/{silo_id}", response_model=List[ImageResponse])
async def get_images(silo_id: uuid.UUID):
    db = await get_db()

    silo = await db.fetchrow("SELECT id FROM silos WHERE id = $1", silo_id)
    if not silo:
        raise HTTPException(status_code=404, detail="Silo not found")

    rows = await db.fetch(
        """
        SELECT * FROM images
        WHERE silo_id = $1
        ORDER BY uploaded_at DESC
        """,
        silo_id,
    )
    return [dict(row) for row in rows]
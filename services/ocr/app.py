from fastapi import FastAPI
from pydantic import BaseModel
from PIL import Image
import io, base64, pytesseract

app = FastAPI()

class OCRIn(BaseModel):
    imageBase64: str

@app.get("/health")
def health():
    return {"ok": True}

@app.post("/ocr")
def ocr(inp: OCRIn):
    try:
        img_bytes = base64.b64decode(inp.imageBase64)
        img = Image.open(io.BytesIO(img_bytes))
        text = pytesseract.image_to_string(img)
        return {"text": text}
    except Exception as e:
        return {"text": "", "error": str(e)}

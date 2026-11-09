import logging
import json
import os
import uuid
from collections.abc import AsyncIterator

from emergentintegrations.llm.chat import LlmChat, StreamDone, TextDelta, UserMessage
from fastapi import APIRouter, Depends, HTTPException
from starlette.responses import StreamingResponse

from clerk_auth import require_user
from models.social import TranslateRequest

router = APIRouter()
logger = logging.getLogger(__name__)


def _translation_error(exc: Exception) -> HTTPException:
    message = str(exc)
    logger.exception("Translation provider failed: %s", message)
    lowered = message.lower()
    if "401" in lowered or "unauthorized" in lowered or "invalid api key" in lowered:
        return HTTPException(status_code=503, detail="Translation service credentials need attention")
    if "402" in lowered or "out of credits" in lowered or "insufficient_quota" in lowered:
        return HTTPException(status_code=402, detail="Translation is temporarily out of credits")
    if "429" in lowered or "rate limit" in lowered or "too many requests" in lowered:
        return HTTPException(status_code=429, detail="Translation is busy; try again shortly")
    return HTTPException(status_code=502, detail="Translation could not be completed")


@router.post("/translate")
async def translate_text(
    body: TranslateRequest,
    user: dict = Depends(require_user),
) -> StreamingResponse:
    api_key = os.environ["EMERGENT_LLM_KEY"]
    prompt = (
        f"Translate the text into {body.target_language}. Preserve its meaning and tone. "
        "Return only the translated text, with no quotation marks, labels, or explanation.\n\n"
        f"Text:\n{body.text}"
    )
    chat = (
        LlmChat(
            api_key=api_key,
            session_id=f"translation-{user['user_id']}-{uuid.uuid4()}",
            system_message="You are a precise translator. Translate only the provided text.",
        )
        .with_model("openai", "gpt-5.4")
        .with_params(max_tokens=900)
    )

    async def stream() -> AsyncIterator[str]:
        try:
            async for event in chat.stream_message(UserMessage(text=prompt)):
                if isinstance(event, TextDelta):
                    yield f"data: {json.dumps({'text': event.content})}\n\n"
                elif isinstance(event, StreamDone):
                    break
        except Exception as exc:
            error = _translation_error(exc)
            yield f"event: error\ndata: {json.dumps({'status': error.status_code, 'detail': error.detail})}\n\n"
        yield "event: done\ndata: {}\n\n"

    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )

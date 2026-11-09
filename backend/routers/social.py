import asyncio
import hashlib
import logging
import os
import time
import uuid
from datetime import datetime, timedelta, timezone

import httpx
from fastapi import APIRouter, Depends, HTTPException

from clerk_auth import require_user
from lib.db import db
from models.social import (
    ConversationResponse,
    DiscoverProfile,
    LocationResolveRequest,
    LocationResolveResponse,
    MessageCreate,
    MessageResponse,
    Phrase,
    PhraseCreate,
    ProfileResponse,
    ProfileUpsert,
    TypingStatus,
    UnreadCount,
)

router = APIRouter()
logger = logging.getLogger(__name__)
_geocode_lock = asyncio.Lock()
_last_geocode_at = 0.0


def _utc_datetime(value: datetime) -> datetime:
    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


@router.get("/profile/me", response_model=ProfileResponse | None)
async def get_my_profile(user: dict = Depends(require_user)):
    profile = await db.profiles.find_one({"user_id": user["user_id"]}, {"_id": 0})
    return ProfileResponse(**{**profile, "updated_at": _utc_datetime(profile["updated_at"])}) if profile else None


@router.put("/profile/me", response_model=ProfileResponse)
async def save_my_profile(
    body: ProfileUpsert,
    user: dict = Depends(require_user),
) -> ProfileResponse:
    now = datetime.now(timezone.utc)
    profile = ProfileResponse(
        **body.model_dump(),
        user_id=user["user_id"],
        updated_at=now,
    )
    await db.profiles.update_one(
        {"user_id": user["user_id"]},
        {"$set": profile.model_dump()},
        upsert=True,
    )
    return profile


def _match(me: dict, profile: dict) -> DiscoverProfile:
    my_learning = {lang.casefold() for lang in me.get("learning_languages", [])}
    my_known = {skill["language"].casefold() for skill in me.get("known_languages", [])}
    score, reasons = 0, []
    for skill in profile.get("known_languages", []):
        if skill["language"].casefold() in my_learning:
            score += 3 if skill["level"] == "native" else 2
            reasons.append(f"{skill['level'].capitalize()} in {skill['language']}")
    shared = [lang for lang in profile.get("learning_languages", []) if lang.casefold() in my_known]
    if shared:
        score += 2
        reasons.append(f"Learning {', '.join(shared)}")
    return DiscoverProfile(
        **{**profile, "updated_at": _utc_datetime(profile["updated_at"])},
        match_score=score,
        match_reasons=reasons,
    )


@router.get("/profiles", response_model=list[DiscoverProfile])
async def list_profiles(user: dict = Depends(require_user)) -> list[DiscoverProfile]:
    me = await db.profiles.find_one({"user_id": user["user_id"]}, {"_id": 0}) or {}
    profiles = await db.profiles.find(
        {"user_id": {"$ne": user["user_id"]}},
        {"_id": 0},
    ).sort("updated_at", -1).to_list(200)
    result = [_match(me, profile) for profile in profiles]
    result.sort(key=lambda item: item.match_score, reverse=True)
    return result


@router.get("/profiles/{user_id}", response_model=DiscoverProfile)
async def get_profile(user_id: str, user: dict = Depends(require_user)) -> DiscoverProfile:
    profile = await db.profiles.find_one({"user_id": user_id}, {"_id": 0})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    me = await db.profiles.find_one({"user_id": user["user_id"]}, {"_id": 0}) or {}
    return _match(me, profile)


async def _participant_conversation(conversation_id: str, user_id: str) -> dict:
    conversation = await db.conversations.find_one(
        {"id": conversation_id, "participant_ids": user_id}, {"_id": 0}
    )
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conversation


@router.post("/conversations/{conversation_id}/typing", status_code=204)
async def ping_typing(conversation_id: str, user: dict = Depends(require_user)) -> None:
    await _participant_conversation(conversation_id, user["user_id"])
    await db.typing.update_one(
        {"conversation_id": conversation_id, "user_id": user["user_id"]},
        {"$set": {"at": datetime.now(timezone.utc)}},
        upsert=True,
    )


@router.get("/conversations/{conversation_id}/typing", response_model=TypingStatus)
async def get_typing(conversation_id: str, user: dict = Depends(require_user)) -> TypingStatus:
    await _participant_conversation(conversation_id, user["user_id"])
    since = datetime.now(timezone.utc) - timedelta(seconds=5)
    partner = await db.typing.find_one(
        {"conversation_id": conversation_id, "user_id": {"$ne": user["user_id"]}, "at": {"$gte": since}},
        {"_id": 0},
    )
    return TypingStatus(typing=partner is not None)


@router.get("/messages/unread-count", response_model=UnreadCount)
async def unread_count(user: dict = Depends(require_user)) -> UnreadCount:
    count = await db.messages.count_documents(
        {"recipient_user_id": user["user_id"], "read": {"$ne": True}}
    )
    return UnreadCount(count=count)


@router.get("/phrases", response_model=list[Phrase])
async def list_phrases(user: dict = Depends(require_user)) -> list[Phrase]:
    docs = await db.phrases.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return [Phrase(**{**doc, "created_at": _utc_datetime(doc["created_at"])}) for doc in docs]


@router.post("/phrases", response_model=Phrase)
async def save_phrase(body: PhraseCreate, user: dict = Depends(require_user)) -> Phrase:
    phrase = Phrase(**body.model_dump(), id=str(uuid.uuid4()), created_at=datetime.now(timezone.utc))
    await db.phrases.insert_one({**phrase.model_dump(), "user_id": user["user_id"]})
    return phrase


@router.delete("/phrases/{phrase_id}", status_code=204)
async def delete_phrase(phrase_id: str, user: dict = Depends(require_user)) -> None:
    deleted = await db.phrases.delete_one({"id": phrase_id, "user_id": user["user_id"]})
    if deleted.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Phrase not found")


@router.post("/location/resolve", response_model=LocationResolveResponse)
async def resolve_location(
    body: LocationResolveRequest,
    user: dict = Depends(require_user),
) -> LocationResolveResponse:
    del user
    global _last_geocode_at
    async with _geocode_lock:
        delay = 1.0 - (time.monotonic() - _last_geocode_at)
        if delay > 0:
            await asyncio.sleep(delay)
        try:
            async with httpx.AsyncClient(timeout=8.0, follow_redirects=True) as client:
                response = await client.get(
                    "https://nominatim.openstreetmap.org/reverse",
                    params={
                        "format": "jsonv2",
                        "lat": body.latitude,
                        "lon": body.longitude,
                        "addressdetails": 1,
                        "zoom": 10,
                    },
                    headers={
                        "User-Agent": "TongueCircle/1.0 (language learning community)",
                        "Accept": "application/json",
                        "Accept-Language": "en",
                    },
                )
            _last_geocode_at = time.monotonic()
        except httpx.RequestError as exc:
            logger.warning("Reverse geocoding request failed")
            raise HTTPException(status_code=503, detail="Location service is unavailable") from exc

    if response.status_code == 429:
        raise HTTPException(status_code=503, detail="Location service is busy; try again shortly")
    if response.status_code >= 500:
        raise HTTPException(status_code=503, detail="Location service is unavailable")
    if response.status_code != 200:
        raise HTTPException(status_code=502, detail="Could not resolve this location")

    address = response.json().get("address", {})
    city = (
        address.get("city")
        or address.get("town")
        or address.get("village")
        or address.get("municipality")
    )
    country = address.get("country")
    if not city or not country:
        raise HTTPException(status_code=422, detail="No approximate city and country found")
    return LocationResolveResponse(
        city=city[:100],
        country=country[:100],
        country_code=str(address.get("country_code", ""))[:2].lower(),
    )


@router.get("/conversations", response_model=list[ConversationResponse])
async def list_conversations(user: dict = Depends(require_user)) -> list[ConversationResponse]:
    docs = await db.conversations.find(
        {"participant_ids": user["user_id"]},
        {"_id": 0},
    ).sort("updated_at", -1).to_list(100)
    result: list[ConversationResponse] = []
    for conversation in docs:
        other_id = next(
            participant
            for participant in conversation["participant_ids"]
            if participant != user["user_id"]
        )
        profile = await db.profiles.find_one({"user_id": other_id}, {"_id": 0})
        if not profile:
            continue
        unread = await db.messages.count_documents(
            {
                "conversation_id": conversation["id"],
                "recipient_user_id": user["user_id"],
                "read": {"$ne": True},
            }
        )
        result.append(
            ConversationResponse(
                id=conversation["id"],
                other_user_id=other_id,
                other_display_name=profile["display_name"],
                other_main_photo=profile["main_photo"],
                last_message=conversation.get("last_message", ""),
                updated_at=_utc_datetime(conversation["updated_at"]),
                unread_count=unread,
            )
        )
    return result


@router.get("/conversations/{conversation_id}/messages", response_model=list[MessageResponse])
async def list_messages(
    conversation_id: str,
    user: dict = Depends(require_user),
) -> list[MessageResponse]:
    conversation = await db.conversations.find_one(
        {"id": conversation_id, "participant_ids": user["user_id"]},
        {"_id": 0},
    )
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    messages = await db.messages.find(
        {"conversation_id": conversation_id},
        {"_id": 0},
    ).sort("created_at", 1).to_list(500)
    # Opening a conversation marks the partner's messages to you as read.
    await db.messages.update_many(
        {"conversation_id": conversation_id, "recipient_user_id": user["user_id"], "read": {"$ne": True}},
        {"$set": {"read": True}},
    )
    return [
        MessageResponse(**{**message, "created_at": _utc_datetime(message["created_at"])})
        for message in messages
    ]


@router.post("/messages", response_model=MessageResponse)
async def send_message(
    body: MessageCreate,
    user: dict = Depends(require_user),
) -> MessageResponse:
    sender_id = user["user_id"]
    recipient_id = body.recipient_user_id
    if recipient_id == sender_id:
        raise HTTPException(status_code=400, detail="You cannot message yourself")
    recipient = await db.profiles.find_one({"user_id": recipient_id}, {"_id": 0, "user_id": 1})
    if not recipient:
        raise HTTPException(status_code=404, detail="Profile not found")

    participants = sorted([sender_id, recipient_id])
    conversation_id = hashlib.sha256("|".join(participants).encode()).hexdigest()[:32]
    now = datetime.now(timezone.utc)
    await db.conversations.update_one(
        {"id": conversation_id},
        {
            "$setOnInsert": {"id": conversation_id, "participant_ids": participants},
            "$set": {"last_message": body.text, "updated_at": now},
        },
        upsert=True,
    )
    message = MessageResponse(
        id=str(uuid.uuid4()),
        conversation_id=conversation_id,
        sender_user_id=sender_id,
        recipient_user_id=recipient_id,
        text=body.text,
        created_at=now,
    )
    await db.messages.insert_one(message.model_dump())
    return message

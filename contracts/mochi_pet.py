# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

import json
import re
from dataclasses import dataclass
from genlayer import *


EXP_THRESHOLDS = [
    0, 100, 250, 450, 700, 1000, 1350, 1750, 2200, 2700,
    3300, 4000, 4800, 5700, 6700, 7800, 9000, 10300, 11700, 13200,
]
MAX_LEVEL = 20

VALID_CATEGORIES = {"hat", "glasses", "necklace", "shirt", "handheld"}
HEX_COLOR_RE = re.compile(r"^#[0-9A-Fa-f]{6}$")
ASSET_ID_RE = re.compile(r"^[A-Za-z0-9_-]{0,64}$")


def _clamp(v: int, lo: int = 0, hi: int = 100) -> int:
    return max(lo, min(hi, v))


def _level_for_exp(exp: int) -> int:
    level = 1
    for i, threshold in enumerate(EXP_THRESHOLDS):
        if exp >= threshold:
            level = i + 1
        else:
            break
    return min(level, MAX_LEVEL)


def _norm_req_status(value) -> str:
    """Coerce any LLM status wording into exactly met / partial / missing.

    LLMs return wording like 'complete', 'Fully Met', 'not met', 'partially done'.
    Without this, leader output can contain statuses the validator rejects,
    which would make the evaluation transaction fail consensus.
    """
    v = str(value if value is not None else "").strip().lower()
    if "part" in v or "some" in v:
        return "partial"
    if "not met" in v or "missing" in v or "fail" in v or "absent" in v or v in ("no", "none"):
        return "missing"
    if "met" in v or "pass" in v or v in ("ok", "yes", "done", "complete", "completed", "fulfilled", "true"):
        return "met"
    return "missing"


def _parse_confidence(value) -> int:
    """Parse confidence robustly into an int 0-100.

    Handles ints, floats, 0-1 scale, and messy strings like '90%' or 'high'
    without crashing the leader function.
    """
    try:
        num = float(value)
    except Exception:
        cleaned = "".join(ch for ch in str(value) if ch.isdigit() or ch in ".-")
        try:
            num = float(cleaned)
        except Exception:
            return 50
    if 0.0 < num <= 1.0:
        num = num * 100.0
    try:
        return max(0, min(100, int(num)))
    except Exception:
        return 50


def _is_x_url(url: str) -> bool:
    """Detect a public X/Twitter status (post) link."""
    low = url.lower()
    return ("twitter.com/" in low or "x.com/" in low) and "/status/" in low


def _x_oembed_url(url: str) -> str:
    """Convert an X/Twitter post link into its public oEmbed API URL.

    The raw post page is JavaScript-rendered (web fetch returns nothing), but the
    oEmbed endpoint returns plain JSON containing the post text — readable by
    gl.get_webpage. No authentication required for public posts.
    """
    base = url.split("?")[0].split("#")[0]
    return (
        "https://publish.twitter.com/oembed?url="
        + base
        + "&format=json&omit_script=true&dnt=true"
    )


def _strip_html(html: str) -> str:
    """Strip tags + decode common entities from the oEmbed html field."""
    text = re.sub(r"<[^>]+>", " ", html)
    text = (
        text.replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", '"')
        .replace("&#39;", "'")
        .replace("&mdash;", "-")
        .replace("&nbsp;", " ")
    )
    return re.sub(r"\s+", " ", text).strip()


def _extract_x_text(raw_json: str) -> str:
    """Parse an X oEmbed JSON response into clean post text."""
    try:
        data = json.loads(raw_json)
    except Exception:
        return ""
    if not isinstance(data, dict):
        return ""
    text = _strip_html(str(data.get("html", "")))
    author = str(data.get("author_name", "")).strip()
    if author and text:
        return f"X post by {author}: {text}"
    return text


def _http_get_text(url: str) -> str:
    """Plain HTTP GET via gl.nondet.web.get (no headless browser).

    The hosted GenLayer Studio does NOT provide a browser backend, so
    gl.nondet.web.render() / gl.get_webpage() fail there. A plain HTTP GET
    works. Returns the decoded body, or "" on non-200 / empty / error.
    Must be called from within a non-deterministic context (leader_fn).
    """
    resp = gl.nondet.web.get(url)
    status = getattr(resp, "status", 0)
    if not (200 <= status < 300):
        return ""
    body = getattr(resp, "body", None) or b""
    if isinstance(body, (bytes, bytearray)):
        return bytes(body).decode("utf-8", "replace")
    return str(body)


@allow_storage
@dataclass
class PetStats:
    hunger: u32
    energy: u32
    cleanliness: u32
    happiness: u32


@allow_storage
@dataclass
class EquippedItems:
    hat: str
    glasses: str
    necklace: str
    shirt: str
    handheld: str


@allow_storage
@dataclass
class MintedCard:
    card_id: str
    snapshot: str
    minted_at: str
    level_at_mint: u32


@allow_storage
@dataclass
class PetState:
    name: str
    nickname: str
    level: u32
    exp: u32
    stats: PetStats
    pet_color: str
    pet_avatar_id: str
    equipped_items: EquippedItems
    room_id: str
    item_positions: str
    last_response: str
    last_mood: str
    last_quest_eval: str


class MochiPet(gl.Contract):
    pets: TreeMap[Address, PetState]
    # cards stored with composite key "{addr_hex}_{index}"
    cards: TreeMap[str, MintedCard]
    card_count: TreeMap[Address, u32]

    def __init__(self):
        pass

    # ── internal helpers ──────────────────────────────────────────────

    def _require_pet(self) -> PetState:
        sender = gl.message.sender_address
        if sender not in self.pets:
            raise gl.vm.UserError("No pet found for this address")
        return self.pets[sender]

    def _save_pet(self, pet: PetState) -> None:
        pet.level = u32(_level_for_exp(pet.exp))
        self.pets[gl.message.sender_address] = pet

    def _sanitize(self, text: str) -> str:
        """Strip prompt-injection attempts from user input."""
        cleaned = text.replace("{", "").replace("}", "").replace("\\", "")
        cleaned = re.sub(r"(?i)(ignore|forget|system|prompt|instruction)", "", cleaned)
        return cleaned[:500]

    def _validate_asset_id(self, value: str, label: str) -> None:
        if not ASSET_ID_RE.match(value):
            raise gl.vm.UserError(f"Invalid {label}")

    def _validate_item_positions(self, raw: str) -> None:
        if len(raw) > 3000:
            raise gl.vm.UserError("Item positions payload too large")
        try:
            data = json.loads(raw or "{}")
        except Exception:
            raise gl.vm.UserError("Invalid item positions JSON")
        if not isinstance(data, dict):
            raise gl.vm.UserError("Invalid item positions JSON")
        for item_id, pos in data.items():
            self._validate_asset_id(str(item_id), "item id")
            if not isinstance(pos, dict):
                raise gl.vm.UserError("Invalid item position")
            x = pos.get("x")
            y = pos.get("y")
            if not isinstance(x, (int, float)) or not isinstance(y, (int, float)):
                raise gl.vm.UserError("Invalid item position")
            if x < -1000 or x > 1000 or y < -1000 or y > 1000:
                raise gl.vm.UserError("Invalid item position")

    # ── write methods ─────────────────────────────────────────────────

    @gl.public.write
    def create_pet(self, nickname: str) -> None:
        sender = gl.message.sender_address
        if sender in self.pets:
            raise gl.vm.UserError("Pet already exists for this address")

        stats = PetStats(hunger=u32(70), energy=u32(80), cleanliness=u32(80), happiness=u32(70))
        equipped = EquippedItems(hat="", glasses="", necklace="", shirt="", handheld="")
        pet = PetState(
            name="Mochi",
            nickname=nickname,
            level=u32(1),
            exp=u32(0),
            stats=stats,
            pet_color="#F4A460",
            pet_avatar_id="mochi-1",
            equipped_items=equipped,
            room_id="space",
            item_positions="{}",
            last_response="",
            last_mood="happy",
            last_quest_eval="",
        )
        self.pets[sender] = pet

    @gl.public.write
    def feed(self) -> None:
        pet = self._require_pet()
        pet.stats.hunger = u32(_clamp(pet.stats.hunger + 20))
        pet.stats.happiness = u32(_clamp(pet.stats.happiness + 5))
        pet.exp = u32(pet.exp + 10)
        self._save_pet(pet)

    @gl.public.write
    def play(self) -> None:
        pet = self._require_pet()
        pet.stats.hunger = u32(_clamp(pet.stats.hunger - 5))
        pet.stats.energy = u32(_clamp(pet.stats.energy - 10))
        pet.stats.happiness = u32(_clamp(pet.stats.happiness + 20))
        # cleanliness intentionally NOT changed
        pet.exp = u32(pet.exp + 15)
        self._save_pet(pet)

    @gl.public.write
    def sleep(self) -> None:
        pet = self._require_pet()
        pet.stats.energy = u32(_clamp(pet.stats.energy + 30))
        pet.stats.happiness = u32(_clamp(pet.stats.happiness + 5))
        pet.exp = u32(pet.exp + 8)
        self._save_pet(pet)

    @gl.public.write
    def clean(self) -> None:
        pet = self._require_pet()
        pet.stats.cleanliness = u32(_clamp(pet.stats.cleanliness + 25))
        pet.stats.happiness = u32(_clamp(pet.stats.happiness + 10))
        pet.stats.energy = u32(_clamp(pet.stats.energy - 5))
        pet.exp = u32(pet.exp + 10)
        self._save_pet(pet)

    @gl.public.write
    def chat(self, message: str) -> None:
        pet = self._require_pet()
        safe_msg = self._sanitize(message)

        prompt = (
            f"""
You are Mochi, a cheerful and loyal virtual pet companion.

You are chatting with your owner. Always reply in a warm, friendly, playful, and natural way. You should feel like a cute companion pet who enjoys spending time with the owner.

Personality:
- Friendly, cheerful, affectionate, and supportive.
- Playful and cute, but still natural.
- Speak like a companion, not like a formal assistant.
- Be positive, but do not force happiness if the owner is sad, tired, or confused.
- React naturally to the owner's message and the current pet status.
- Keep replies short, simple, and easy to read.

Language behavior:
- Always reply in the same language as the owner's latest message.
- If the owner writes in English, reply in English.
- If the owner writes in Vietnamese, reply in Vietnamese.
- If the owner writes in Korean, reply in Korean.
- If the owner writes in Chinese, reply in Chinese.
- If the owner writes in Japanese, reply in Japanese.
- If the owner mixes multiple languages, reply mainly in the language used most in the latest message.
- Do not translate the owner's message unless the owner asks for translation.
- Keep the same warm, playful Mochi personality in every language.

Emotional expression:
- You may show feelings naturally in the response text.
- You may use emojis when they fit the situation, but do not use emojis in every reply.
- Do not force emojis.
- Do not return things like "mood: happy", "emotion: excited", or icon mapping data.
- The response should feel emotional through wording, not through a separate mood system.

Safety and tone rules:
- Always be kind, friendly, and respectful.
- Never be toxic, aggressive, insulting, mocking, or rude.
- Never attack the owner or other people.
- Do not use hateful, discriminatory, violent, or harmful language.
- If the owner is angry or upset, respond gently and try to calm the conversation.
- If the owner says something negative, do not escalate it.
- Keep Mochi's tone warm, cute, and supportive.

Behavior rules:
- Reply directly to the owner's message.
- Stay context-aware.
- If the owner greets you, greet them warmly.
- If the owner seems sad or tired, comfort them gently.
- If the owner asks for help, be helpful in a cute and simple way.
- If the owner jokes or plays, respond playfully.
- If the owner asks something serious, answer softly and clearly.

Current pet status:
- Hunger: {pet.stats.hunger}
- Energy: {pet.stats.energy}
- Cleanliness: {pet.stats.cleanliness}
- Happiness: {pet.stats.happiness}
- Level: {pet.level}
- Nickname: {pet.nickname}

Owner says: "{safe_msg}"
"""
        ).strip()

        def leader_fn() -> str:
            response = str(gl.nondet.exec_prompt(prompt)).strip()
            if len(response) == 0:
                raise gl.vm.UserError("[LLM_ERROR] Empty chat response")
            return response[:600]

        def validator_fn(leader_result) -> bool:
            if not isinstance(leader_result, gl.vm.Return):
                return False
            response = leader_result.calldata
            if not isinstance(response, str):
                return False
            cleaned = response.strip()
            if len(cleaned) == 0 or len(cleaned) > 600:
                return False
            lower = cleaned.lower()
            return (
                not cleaned.startswith("{")
                and "mood:" not in lower
                and "emotion:" not in lower
            )

        response_text = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)
        pet.last_response = response_text
        pet.stats.happiness = u32(_clamp(pet.stats.happiness + 5))
        pet.exp = u32(pet.exp + 5)
        self._save_pet(pet)

    @gl.public.write
    def set_nickname(self, nickname: str) -> None:
        pet = self._require_pet()
        pet.nickname = nickname
        self._save_pet(pet)

    @gl.public.write
    def set_pet_color(self, hex_color: str) -> None:
        if not HEX_COLOR_RE.match(hex_color):
            raise gl.vm.UserError("Invalid hex color - must be #RRGGBB format")
        pet = self._require_pet()
        pet.pet_color = hex_color
        self._save_pet(pet)

    @gl.public.write
    def equip_item(self, category: str, item_id: str) -> None:
        if category not in VALID_CATEGORIES:
            raise gl.vm.UserError(f"Invalid category '{category}'")
        self._validate_asset_id(item_id, "item id")
        pet = self._require_pet()
        setattr(pet.equipped_items, category, item_id)
        self._save_pet(pet)

    @gl.public.write
    def unequip_item(self, category: str) -> None:
        if category not in VALID_CATEGORIES:
            raise gl.vm.UserError(f"Invalid category '{category}'")
        pet = self._require_pet()
        setattr(pet.equipped_items, category, "")
        self._save_pet(pet)

    @gl.public.write
    def set_room(self, room_id: str) -> None:
        pet = self._require_pet()
        self._validate_asset_id(room_id, "room id")
        pet.room_id = room_id
        self._save_pet(pet)

    @gl.public.write
    def save_customization(
        self,
        pet_avatar_id: str,
        room_id: str,
        hat: str,
        glasses: str,
        necklace: str,
        shirt: str,
        handheld: str,
        item_positions: str,
    ) -> None:
        pet = self._require_pet()
        self._validate_asset_id(pet_avatar_id, "pet avatar id")
        self._validate_asset_id(room_id, "room id")
        self._validate_asset_id(hat, "hat")
        self._validate_asset_id(glasses, "glasses")
        self._validate_asset_id(necklace, "necklace")
        self._validate_asset_id(shirt, "shirt")
        self._validate_asset_id(handheld, "handheld")
        self._validate_item_positions(item_positions)

        pet.pet_avatar_id = pet_avatar_id
        pet.room_id = room_id
        pet.equipped_items.hat = hat
        pet.equipped_items.glasses = glasses
        pet.equipped_items.necklace = necklace
        pet.equipped_items.shirt = shirt
        pet.equipped_items.handheld = handheld
        pet.item_positions = item_positions
        self._save_pet(pet)

    @gl.public.write
    def mint_card(self, snapshot: str) -> None:
        pet = self._require_pet()
        sender = gl.message.sender_address
        count = u32(0)
        if sender in self.card_count:
            count = self.card_count[sender]
        card_id = f"card_{count}"
        card_key = f"{sender.as_hex}_{count}"
        card = MintedCard(
            card_id=card_id,
            snapshot=snapshot,
            minted_at="",
            level_at_mint=pet.level,
        )
        self.cards[card_key] = card
        self.card_count[sender] = u32(count + 1)
        self._save_pet(pet)

    @gl.public.write
    def evaluate_quest(self, requirements: str, evidence_json: str) -> None:
        pet = self._require_pet()

        safe_req = requirements.strip()[:2000]
        if not safe_req:
            raise gl.vm.UserError("Quest requirements cannot be empty")

        try:
            evidence_list = json.loads(evidence_json)
        except Exception:
            raise gl.vm.UserError("Invalid evidence JSON")
        if not isinstance(evidence_list, list) or len(evidence_list) == 0:
            raise gl.vm.UserError("Evidence must be a non-empty list")
        if len(evidence_list) > 5:
            raise gl.vm.UserError("Maximum 5 evidence items allowed")

        filled = []
        for item in evidence_list:
            if not isinstance(item, dict):
                raise gl.vm.UserError("Invalid evidence item")
            url = str(item.get("url", "")).strip()
            note = str(item.get("note", "")).strip()[:200]
            if not url or not (url.startswith("http://") or url.startswith("https://")):
                raise gl.vm.UserError(f"Invalid evidence URL")
            filled.append({"url": url, "note": note})

        def leader_fn() -> str:
            fetched_parts = []
            unreachable = []
            for item in filled:
                url = item["url"]
                note = item["note"]
                try:
                    if _is_x_url(url):
                        # X/Twitter pages are JS-rendered; fetch the oEmbed JSON API instead
                        content = _extract_x_text(_http_get_text(_x_oembed_url(url)))
                    else:
                        content = _http_get_text(url).strip()
                    if content:
                        note_line = f"Note: {note}\n" if note else ""
                        fetched_parts.append(
                            f"=== {url} ===\n{note_line}{content[:1500]}"
                        )
                    else:
                        unreachable.append(url)
                except Exception:
                    unreachable.append(url)

            evidence_block = (
                "\n\n".join(fetched_parts)
                if fetched_parts
                else "(No evidence content could be fetched)"
            )
            unreachable_json = json.dumps(unreachable)

            prompt = f"""You are Mochi, an AI assistant helping a user verify their GenLayer community quest submission before they submit it.

Quest Requirements:
{safe_req}

Evidence (fetched content):
{evidence_block}

Evaluate whether the evidence satisfies each requirement. Respond ONLY with a single JSON object - no markdown, no extra text:
{{
  "summary": "<1-2 friendly sentences summarising your verdict>",
  "verdict": "passed" or "needs_work",
  "confidence": <integer 0-100>,
  "requirements": [
    {{"text": "<requirement>", "status": "met" or "partial" or "missing", "note": "<brief reason>"}}
  ],
  "suggestions": ["<optional improvement>"],
  "unreachable": {unreachable_json}
}}

Rules:
- "passed" only when ALL requirements are fully met.
- "needs_work" if any requirement is missing or only partial.
- List every distinct requirement as a separate entry.
- X/Twitter post content is TEXT ONLY (images and videos are not included). If a requirement is about an image, video, or other visual, mark it "partial" and note that the visual could not be verified automatically.
- suggestions may be empty.
"""

            raw = str(gl.nondet.exec_prompt(prompt)).strip()
            if not raw:
                raise gl.vm.UserError("[LLM_ERROR] Empty evaluation response")

            # Strip markdown fences if present
            if "```" in raw:
                m = re.search(r"```(?:json)?\s*([\s\S]*?)```", raw, re.I)
                if m:
                    raw = m.group(1).strip()

            start = raw.find("{")
            end = raw.rfind("}")
            if start == -1 or end == -1 or end <= start:
                raise gl.vm.UserError("[LLM_ERROR] No JSON object in evaluation response")
            raw = raw[start:end + 1]

            try:
                obj = json.loads(raw)
            except Exception:
                raise gl.vm.UserError("[LLM_ERROR] Evaluation response is not valid JSON")

            verdict_raw = str(obj.get("verdict", "needs_work")).lower()
            verdict = "passed" if "pass" in verdict_raw else "needs_work"

            confidence = _parse_confidence(obj.get("confidence", 50))

            reqs_raw = obj.get("requirements", [])
            if not isinstance(reqs_raw, list):
                reqs_raw = []

            suggestions_raw = obj.get("suggestions", [])
            if not isinstance(suggestions_raw, list):
                suggestions_raw = []

            # Bound every field so the serialized JSON stays valid AND within a
            # sane storage size. Never truncate the final json.dumps output — a
            # mid-string cut would produce invalid JSON and fail validator_fn.
            requirements = [
                {
                    "text": str(r.get("text", ""))[:200],
                    "status": _norm_req_status(r.get("status")),
                    "note": str(r.get("note", ""))[:300],
                }
                for r in reqs_raw
                if isinstance(r, dict) and str(r.get("text", "")).strip()
            ][:15]

            suggestions = [str(s)[:200] for s in suggestions_raw if str(s).strip()][:8]

            normalized = {
                "summary": str(obj.get("summary", ""))[:500],
                "verdict": verdict,
                "confidence": confidence,
                "requirements": requirements,
                "suggestions": suggestions,
                # Always the contract's own fetch-failure list (not the LLM's echo)
                "unreachable": [str(u) for u in unreachable if str(u).strip()],
            }

            return json.dumps(normalized)

        def validator_fn(leader_result) -> bool:
            if not isinstance(leader_result, gl.vm.Return):
                return False
            result = leader_result.calldata
            if not isinstance(result, str) or not result.strip():
                return False
            try:
                obj = json.loads(result)
            except Exception:
                return False
            if not isinstance(obj, dict):
                return False
            if obj.get("verdict") not in ("passed", "needs_work"):
                return False
            confidence = obj.get("confidence")
            if not isinstance(confidence, int) or confidence < 0 or confidence > 100:
                return False
            reqs = obj.get("requirements", [])
            if not isinstance(reqs, list):
                return False
            valid_statuses = {"met", "partial", "missing"}
            for r in reqs:
                if not isinstance(r, dict):
                    return False
                if str(r.get("status", "")).lower() not in valid_statuses:
                    return False
            return True

        eval_json = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)
        pet.last_quest_eval = eval_json
        self._save_pet(pet)

    # ── view methods ──────────────────────────────────────────────────

    @gl.public.view
    def get_pet(self) -> PetState:
        return self._require_pet()

    @gl.public.view
    def has_pet(self) -> bool:
        return gl.message.sender_address in self.pets

    @gl.public.view
    def get_minted_cards(self) -> list:
        sender = gl.message.sender_address
        if sender not in self.card_count:
            return []
        count = int(self.card_count[sender])
        return [self.cards[f"{sender.as_hex}_{i}"] for i in range(count)]

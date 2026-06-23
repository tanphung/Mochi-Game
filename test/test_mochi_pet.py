"""
Direct mode tests for MochiPet contract.
Run with: pytest test/test_mochi_pet.py -v
"""
import json
import pytest
from gltest.direct import create_address


CONTRACT_PATH = "contracts/mochi_pet.py"
LLM_MOCK_PATTERN = r".*You are Mochi.*"
LLM_MOCK_RESPONSE = "Meow! I'm so happy to see you!"
QUEST_LLM_MOCK_RESPONSE = json.dumps({
    "summary": "Great work! Your submission meets all requirements.",
    "verdict": "passed",
    "confidence": 90,
    "requirements": [
        {"text": "Write a post on X", "status": "met", "note": "Post found at the URL."},
    ],
    "suggestions": [],
    "unreachable": [],
})


# ── test 1: create pet ───────────────────────────────────────────────

def test_create_pet(direct_vm, direct_deploy, direct_alice):
    direct_vm.sender = direct_alice
    contract = direct_deploy(CONTRACT_PATH)
    contract.create_pet("Luna")

    pet = contract.get_pet()
    assert pet.name == "Mochi"
    assert pet.nickname == "Luna"
    assert int(pet.level) == 1
    assert int(pet.exp) == 0
    assert int(pet.stats.hunger) == 70
    assert int(pet.stats.energy) == 80
    assert int(pet.stats.cleanliness) == 80
    assert int(pet.stats.happiness) == 70
    assert pet.pet_color == "#F4A460"
    assert pet.pet_avatar_id == "mochi-1"
    assert pet.room_id == "space"
    assert pet.item_positions == "{}"


# ── test 2: create pet twice fails ──────────────────────────────────

def test_create_pet_twice_fails(direct_vm, direct_deploy, direct_alice):
    direct_vm.sender = direct_alice
    contract = direct_deploy(CONTRACT_PATH)
    contract.create_pet("Luna")

    with direct_vm.expect_revert("Pet already exists for this address"):
        contract.create_pet("Luna2")


# ── test 3: feed effects ─────────────────────────────────────────────

def test_feed_effects(direct_vm, direct_deploy, direct_alice):
    direct_vm.sender = direct_alice
    contract = direct_deploy(CONTRACT_PATH)
    contract.create_pet("Pip")

    # snapshot primitive values before action
    before = contract.get_pet()
    hunger_before = int(before.stats.hunger)
    happiness_before = int(before.stats.happiness)
    exp_before = int(before.exp)

    contract.feed()
    after = contract.get_pet()

    assert int(after.stats.hunger) == hunger_before + 20
    assert int(after.stats.happiness) == happiness_before + 5
    assert int(after.exp) == exp_before + 10


# ── test 4: play does NOT change cleanliness ─────────────────────────

def test_play_no_cleanliness_change(direct_vm, direct_deploy, direct_alice):
    direct_vm.sender = direct_alice
    contract = direct_deploy(CONTRACT_PATH)
    contract.create_pet("Pip")

    before = contract.get_pet()
    cleanliness_before = int(before.stats.cleanliness)
    happiness_before = int(before.stats.happiness)
    hunger_before = int(before.stats.hunger)
    energy_before = int(before.stats.energy)

    contract.play()
    after = contract.get_pet()

    assert int(after.stats.cleanliness) == cleanliness_before
    assert int(after.stats.happiness) == happiness_before + 20
    assert int(after.stats.hunger) == hunger_before - 5
    assert int(after.stats.energy) == energy_before - 10


# ── test 5: stats clamp at 100 ───────────────────────────────────────

def test_clamp_stats_max_100(direct_vm, direct_deploy, direct_alice):
    direct_vm.sender = direct_alice
    contract = direct_deploy(CONTRACT_PATH)
    contract.create_pet("Pip")

    for _ in range(10):
        contract.feed()

    after = contract.get_pet()
    assert int(after.stats.hunger) <= 100
    assert int(after.stats.happiness) <= 100


# ── test 6: level up ─────────────────────────────────────────────────

def test_level_up(direct_vm, direct_deploy, direct_alice):
    direct_vm.sender = direct_alice
    contract = direct_deploy(CONTRACT_PATH)
    contract.create_pet("Pip")

    # Need 100 EXP for level 2; feed gives +10 each
    for _ in range(10):
        contract.feed()

    pet = contract.get_pet()
    assert int(pet.exp) >= 100
    assert int(pet.level) >= 2


# ── test 7: multi level-up ───────────────────────────────────────────

def test_multi_level_up(direct_vm, direct_deploy, direct_alice):
    direct_vm.sender = direct_alice
    contract = direct_deploy(CONTRACT_PATH)
    contract.create_pet("Pip")

    # 450 EXP → level 4; feed gives +10, need 45
    for _ in range(45):
        contract.feed()

    pet = contract.get_pet()
    assert int(pet.exp) >= 450
    assert int(pet.level) >= 4


# ── test 8: chat mocked LLM ──────────────────────────────────────────

def test_chat_mocked_llm(direct_vm, direct_deploy, direct_alice):
    direct_vm.sender = direct_alice
    contract = direct_deploy(CONTRACT_PATH)
    contract.create_pet("Pip")

    before = contract.get_pet()
    happiness_before = int(before.stats.happiness)
    exp_before = int(before.exp)

    direct_vm.mock_llm(LLM_MOCK_PATTERN, LLM_MOCK_RESPONSE)
    contract.chat("Hello!")
    after = contract.get_pet()

    assert after.last_response == "Meow! I'm so happy to see you!"
    assert int(after.stats.happiness) == happiness_before + 5
    assert int(after.exp) == exp_before + 5


def test_chat_stores_plain_text_response(direct_vm, direct_deploy, direct_alice):
    direct_vm.sender = direct_alice
    contract = direct_deploy(CONTRACT_PATH)
    contract.create_pet("Pip")

    direct_vm.mock_llm(LLM_MOCK_PATTERN, "Xin chao, minh day ne!")
    contract.chat("xin chao")
    after = contract.get_pet()

    assert after.last_response == "Xin chao, minh day ne!"


# ── test 9: set_pet_color invalid hex ───────────────────────────────

def test_set_pet_color_invalid_hex(direct_vm, direct_deploy, direct_alice):
    direct_vm.sender = direct_alice
    contract = direct_deploy(CONTRACT_PATH)
    contract.create_pet("Pip")

    with direct_vm.expect_revert("Invalid hex color"):
        contract.set_pet_color("notacolor")

    with direct_vm.expect_revert("Invalid hex color"):
        contract.set_pet_color("#ZZZ000")

    with direct_vm.expect_revert("Invalid hex color"):
        contract.set_pet_color("FF0000")  # missing #


# ── test 10: equip invalid category ─────────────────────────────────

def test_equip_invalid_category(direct_vm, direct_deploy, direct_alice):
    direct_vm.sender = direct_alice
    contract = direct_deploy(CONTRACT_PATH)
    contract.create_pet("Pip")

    with direct_vm.expect_revert("Invalid category"):
        contract.equip_item("wings", "angel_wings_01")


# ── test 11: mint card unique IDs ───────────────────────────────────

def test_save_customization(direct_vm, direct_deploy, direct_alice):
    direct_vm.sender = direct_alice
    contract = direct_deploy(CONTRACT_PATH)
    contract.create_pet("Pip")

    positions = '{"glasses_heart":{"x":12,"y":-88}}'
    contract.save_customization(
        "mochi-2",
        "space",
        "",
        "glasses_heart",
        "",
        "",
        "",
        positions,
    )

    pet = contract.get_pet()
    assert pet.pet_avatar_id == "mochi-2"
    assert pet.room_id == "space"
    assert pet.equipped_items.glasses == "glasses_heart"
    assert pet.item_positions == positions


def test_mint_card_unique_ids(direct_vm, direct_deploy, direct_alice):
    direct_vm.sender = direct_alice
    contract = direct_deploy(CONTRACT_PATH)
    contract.create_pet("Pip")

    contract.mint_card("snapshot_data_1")
    contract.mint_card("snapshot_data_2")

    cards = contract.get_minted_cards()
    cards_list = list(cards)
    assert len(cards_list) == 2

    ids = [c.card_id for c in cards_list]
    assert ids[0] != ids[1], "Minted card IDs must be unique"


# ── test 12: evaluate_quest stores JSON result ───────────────────────

def test_evaluate_quest_stores_result(direct_vm, direct_deploy, direct_alice):
    direct_vm.sender = direct_alice
    contract = direct_deploy(CONTRACT_PATH)
    contract.create_pet("Pip")

    evidence = json.dumps([{"url": "https://example.com/post", "note": "My submission"}])
    direct_vm.mock_web(r"https://example\.com/post", "This is my amazing post about Optimistic Democracy...")
    direct_vm.mock_llm(LLM_MOCK_PATTERN, QUEST_LLM_MOCK_RESPONSE)

    contract.evaluate_quest("Write a post about Optimistic Democracy", evidence)

    pet = contract.get_pet()
    assert pet.last_quest_eval, "last_quest_eval should be populated after evaluation"
    result = json.loads(pet.last_quest_eval)
    assert result["verdict"] == "passed"
    assert result["confidence"] == 90
    assert len(result["requirements"]) == 1
    assert result["requirements"][0]["status"] == "met"


# ── test 13: evaluate_quest rejects empty requirements ───────────────

def test_evaluate_quest_rejects_empty_requirements(direct_vm, direct_deploy, direct_alice):
    direct_vm.sender = direct_alice
    contract = direct_deploy(CONTRACT_PATH)
    contract.create_pet("Pip")

    evidence = json.dumps([{"url": "https://example.com/post", "note": ""}])
    with direct_vm.expect_revert("Quest requirements cannot be empty"):
        contract.evaluate_quest("   ", evidence)


# ── test 14: evaluate_quest rejects bad evidence JSON ────────────────

def test_evaluate_quest_rejects_invalid_evidence(direct_vm, direct_deploy, direct_alice):
    direct_vm.sender = direct_alice
    contract = direct_deploy(CONTRACT_PATH)
    contract.create_pet("Pip")

    with direct_vm.expect_revert("Invalid evidence JSON"):
        contract.evaluate_quest("Do something", "not-json")

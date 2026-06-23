"""Windows compatibility for gltest.direct stdin injection.

gltest.direct duplicates a temporary file onto fd 0 while importing contracts.
Linux allows unlinking that file immediately; Windows does not. Defer cleanup
until after VMContext restores stdin at fixture teardown.
"""

import os
import tempfile

import pytest
from gltest.direct import loader as direct_loader


WINDOWS_STDIN_TEMP_PATHS = []


def _inject_message_to_fd0_windows(vm):
    try:
        from genlayer.py import calldata
        from genlayer.py.types import Address
    except ImportError:
        return

    sender_addr = Address(vm.sender) if isinstance(vm.sender, bytes) else vm.sender
    contract_addr = (
        Address(vm._contract_address)
        if isinstance(vm._contract_address, bytes)
        else vm._contract_address
    )
    origin_addr = Address(vm.origin) if isinstance(vm.origin, bytes) else vm.origin

    message_data = {
        "contract_address": contract_addr,
        "sender_address": sender_addr,
        "origin_address": origin_addr,
        "stack": [],
        "value": vm._value,
        "datetime": vm._datetime,
        "is_init": False,
        "chain_id": vm._chain_id,
        "entry_kind": 0,
        "entry_data": b"",
        "entry_stage_data": None,
    }

    encoded = calldata.encode(message_data)
    fd, path = tempfile.mkstemp()
    try:
        os.write(fd, encoded)
        os.lseek(fd, 0, os.SEEK_SET)
        vm._original_stdin_fd = os.dup(0)
        os.dup2(fd, 0)
        WINDOWS_STDIN_TEMP_PATHS.append(path)
    finally:
        os.close(fd)


if os.name == "nt":
    direct_loader._inject_message_to_fd0 = _inject_message_to_fd0_windows


@pytest.fixture(autouse=True)
def cleanup_windows_stdin_temp_files():
    yield
    if os.name != "nt":
        return
    while WINDOWS_STDIN_TEMP_PATHS:
        path = WINDOWS_STDIN_TEMP_PATHS.pop()
        try:
            os.unlink(path)
        except OSError:
            pass

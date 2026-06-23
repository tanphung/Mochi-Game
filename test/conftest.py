"""Windows compatibility for gltest direct-mode stdin injection.

gltest replaces fd 0 with a temp file and immediately unlinks it. On Windows the
unlink fails while fd 0 still points at that file. This patch defers cleanup
until the VM restores stdin after each test.
"""

from __future__ import annotations

import os
import tempfile
from typing import Any


try:
    from gltest.direct import loader
    from gltest.direct import vm as vm_module
except Exception:  # pragma: no cover - only relevant when gltest is installed
    loader = None
else:
    if not getattr(loader, "_mochi_windows_stdin_patch", False):
        original_cleanup = vm_module.VMContext._cleanup_after_deactivate

        def patched_inject_message_to_fd0(vm: Any) -> None:
            from genlayer.py import calldata
            from genlayer.py.types import Address

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
                vm._mochi_stdin_temp_path = path
            finally:
                os.close(fd)

        def patched_cleanup_after_deactivate(self: Any) -> None:
            path = getattr(self, "_mochi_stdin_temp_path", None)
            original_cleanup(self)
            if path:
                try:
                    os.unlink(path)
                except FileNotFoundError:
                    pass
                finally:
                    self._mochi_stdin_temp_path = None

        loader._inject_message_to_fd0 = patched_inject_message_to_fd0
        vm_module.VMContext._cleanup_after_deactivate = patched_cleanup_after_deactivate
        loader._mochi_windows_stdin_patch = True

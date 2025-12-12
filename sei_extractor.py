#!/usr/bin/env python3
"""
Tesla Dashcam SEI extractor.

Quick start:
    pip install protobuf
    protoc --python_out=. dashcam.proto
    python sei_extractor.py path/to/dashcam-video.mp4
"""
import struct
import sys
from typing import Generator, Optional, Tuple

from google.protobuf.json_format import MessageToDict
from google.protobuf.message import DecodeError

import dashcam_pb2


def run():
    if len(sys.argv) != 2:
        print("Usage: python sei_extractor.py <dashcam-video.mp4>")
        sys.exit(1)
    path = sys.argv[1]
    if not path.lower().endswith(".mp4"):
        print("Error: input file must end with .mp4")
        sys.exit(1)
    main(path)


def main(path: str):
    """Main function to extract and print SEI metadata from the video file, in CSV format."""
    has_sei = False
    with open(path, "rb") as fp:
        offset, size = find_mdat(fp)
        headers = [
            field.name for field in dashcam_pb2.SeiMetadata.DESCRIPTOR.fields]
        for meta in iter_sei_messages(fp, offset, size):
            if not has_sei:
                has_sei = True
                print(','.join(headers))
            row_dict = {header: '' for header in headers}
            for key, value in MessageToDict(meta, preserving_proto_field_name=True).items():
                row_dict[key] = value
            print(','.join(str(row_dict[h]) for h in headers))
    if not has_sei:
        print("No SEI metadata found. Requirements:")
        print("  * Tesla firmware 2025.44.25 or later")
        print("  * HW3 or above")
        print("  * If car is parked, SEI data may not be present")


def iter_sei_messages(fp, offset: int, size: int):
    """Yield parsed SeiMetadata messages from the MP4 file."""
    for nal in iter_nals(fp, offset, size):
        payload = extract_proto_payload(nal)
        if not payload:
            continue
        meta = dashcam_pb2.SeiMetadata()
        try:
            meta.ParseFromString(payload)
        except DecodeError:
            continue
        yield meta


def extract_proto_payload(nal: bytes) -> Optional[bytes]:
    """Extract protobuf payload from SEI NAL unit."""
    if not isinstance(nal, bytes) or len(nal) < 2:
        return None
    for i in range(3, len(nal) - 1):
        byte = nal[i]
        if byte == 0x42:
            continue
        if byte == 0x69:
            if i > 2:
                return strip_emulation_prevention_bytes(nal[i + 1:-1])
            break
        break
    return None


def strip_emulation_prevention_bytes(data: bytes) -> bytes:
    """Remove emulation prevention bytes (0x03 following 0x00 0x00)."""
    stripped = bytearray()
    zero_count = 0
    for byte in data:
        if zero_count >= 2 and byte == 0x03:
            zero_count = 0
            continue
        stripped.append(byte)
        zero_count = 0 if byte != 0 else zero_count + 1
    return bytes(stripped)


def iter_nals(fp, offset: int, size: int) -> Generator[bytes, None, None]:
    """Yield SEI user NAL units from the MP4 mdat atom."""
    NAL_ID_SEI = 6
    NAL_SEI_ID_USER_DATA_UNREGISTERED = 5

    fp.seek(offset)
    consumed = 0
    while size == 0 or consumed < size:
        header = fp.read(4)
        if len(header) < 4:
            break
        nal_size = struct.unpack(">I", header)[0]
        if nal_size < 2:
            fp.seek(nal_size, 1)
            consumed += 4 + nal_size
            continue

        first_two = fp.read(2)
        if len(first_two) != 2:
            break

        if (first_two[0] & 0x1F) != NAL_ID_SEI or first_two[1] != NAL_SEI_ID_USER_DATA_UNREGISTERED:
            fp.seek(nal_size - 2, 1)
            consumed += 4 + nal_size
            continue  # skip non-SEI NALs

        rest = fp.read(nal_size - 2)
        if len(rest) != nal_size - 2:
            break
        payload = first_two + rest
        consumed += 4 + nal_size
        yield payload


def find_mdat(fp) -> Tuple[int, int]:
    """Return (offset, size) for the first mdat atom."""
    fp.seek(0)
    while True:
        header = fp.read(8)
        if len(header) < 8:
            raise RuntimeError("mdat atom not found")
        size32, atom_type = struct.unpack(">I4s", header)
        if size32 == 1:
            large = fp.read(8)
            if len(large) != 8:
                raise RuntimeError("truncated extended atom size")
            atom_size = struct.unpack(">Q", large)[0]
            header_size = 16
        else:
            atom_size = size32 if size32 else 0
            header_size = 8
        if atom_type == b"mdat":
            payload_size = atom_size - header_size if atom_size else 0
            return fp.tell(), payload_size
        if atom_size < header_size:
            raise RuntimeError("invalid MP4 atom size")
        fp.seek(atom_size - header_size, 1)


if __name__ == "__main__":
    run()

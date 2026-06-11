"""HWPX ZIP 패키징 — 한컴 호환 OCF 구조 유지."""

from __future__ import annotations

import io
import struct
import zlib
import zipfile

from app.common.hwpx.hwpx_templates import (
    HwpxTemplateKind,
    load_template_hwpx_bytes,
    template_hwpx_path,
)

_TEMPLATE_CACHE: dict[str, bytes] = {}

# 템플릿 ZIP에서 그대로 유지 (교체 시 '손상' 가능성 높음)
_TEMPLATE_ONLY_PATHS = frozenset(
    {
        "mimetype",
        "version.xml",
        "Contents/header.xml",
        "META-INF/container.rdf",
        "Contents/content.hpf",
        "META-INF/container.xml",
        "META-INF/manifest.xml",
        "settings.xml",
        "Preview/PrvImage.png",
    }
)

_LOCAL_SIG = b"PK\x03\x04"
_CENTRAL_SIG = b"PK\x01\x02"
_EOCD_SIG = b"PK\x05\x06"


def _load_template_bytes(kind: HwpxTemplateKind) -> bytes:
    key = kind
    if key not in _TEMPLATE_CACHE:
        _TEMPLATE_CACHE[key] = load_template_hwpx_bytes(kind)
    return _TEMPLATE_CACHE[key]


def has_hwpx_template(kind: HwpxTemplateKind = "empty") -> bool:
    return template_hwpx_path(kind).is_file()


def _dos_time_date(date_time: tuple[int, int, int, int, int, int]) -> tuple[int, int]:
    year, month, day, hour, minute, second = date_time
    dos_time = (hour << 11) | (minute << 5) | (second // 2)
    dos_date = ((year - 1980) << 9) | (month << 5) | day
    return dos_time, dos_date


def _version_made_by(info: zipfile.ZipInfo) -> int:
    """한컴 HWPX 템플릿과 동일 (create_system=11 → 0x0B17)."""
    return (info.create_system << 8) | 0x17


def _version_needed() -> int:
    return 0x14


def _parse_central_records(template: bytes) -> dict[str, bytes]:
    records: dict[str, bytes] = {}
    pos = template.find(_CENTRAL_SIG)
    while pos >= 0 and template[pos : pos + 4] == _CENTRAL_SIG:
        header = template[pos : pos + 46]
        (
            _sig,
            _vmb,
            _vn,
            _fl,
            _cm,
            _mt,
            _md,
            _crc,
            _cs,
            _us,
            fn_len,
            extra_len,
            comment_len,
            _dn,
            _ia,
            _ea,
            _ro,
        ) = struct.unpack("<4sHHHHHHIIIHHHHHII", header)
        total = 46 + fn_len + extra_len + comment_len
        name = template[pos + 46 : pos + 46 + fn_len].decode("utf-8")
        records[name.replace("\\", "/")] = template[pos : pos + total]
        pos += total
    return records


def _patch_central_offset(record: bytes, header_offset: int) -> bytes:
    patched = bytearray(record)
    struct.pack_into("<I", patched, 42, header_offset)
    return bytes(patched)


def _local_record_size(template: bytes, info: zipfile.ZipInfo) -> int:
    start = info.header_offset
    name_len = struct.unpack_from("<H", template, start + 26)[0]
    extra_len = struct.unpack_from("<H", template, start + 28)[0]
    return 30 + name_len + extra_len + info.compress_size


def _copy_local_record(template: bytes, info: zipfile.ZipInfo) -> bytes:
    start = info.header_offset
    size = _local_record_size(template, info)
    return template[start : start + size]


def _compress_payload(
    data: bytes,
    *,
    compress_type: int,
    flag_bits: int,
) -> tuple[bytes, int, int, int, int]:
    """(compressed, crc, comp_size, file_size, flags)."""
    if compress_type == zipfile.ZIP_STORED:
        crc = zlib.crc32(data) & 0xFFFFFFFF
        return data, crc, len(data), len(data), flag_bits & ~0x4

    flags = flag_bits | 0x4
    compressor = zlib.compressobj(1, zlib.DEFLATED, -zlib.MAX_WBITS)
    compressed = compressor.compress(data) + compressor.flush()
    crc = zlib.crc32(data) & 0xFFFFFFFF
    return compressed, crc, len(compressed), len(data), flags


def _build_local_record(
    filename: str,
    data: bytes,
    info: zipfile.ZipInfo,
) -> tuple[bytes, dict[str, int | str]]:
    name_bytes = filename.encode("utf-8")
    extra = info.extra or b""
    compressed, crc, comp_size, file_size, flags = _compress_payload(
        data,
        compress_type=info.compress_type,
        flag_bits=info.flag_bits,
    )
    dos_time, dos_date = _dos_time_date(info.date_time)
    header = struct.pack(
        "<4sHHHHHIIIHH",
        _LOCAL_SIG,
        _version_needed(),
        flags,
        info.compress_type,
        dos_time,
        dos_date,
        crc,
        comp_size,
        file_size,
        len(name_bytes),
        len(extra),
    )
    blob = header + name_bytes + extra + compressed
    return blob, {
        "filename": filename,
        "crc": crc,
        "compress_size": comp_size,
        "file_size": file_size,
        "compress_type": info.compress_type,
        "flag_bits": flags,
        "header_offset": 0,
    }


def _build_central_directory(
    entries: list[dict[str, int | str | bytes | tuple[int, int, int, int, int, int]]],
    *,
    template_records: dict[str, bytes] | None = None,
) -> bytes:
    buf = bytearray()
    for entry in entries:
        info = entry["info"]
        assert isinstance(info, zipfile.ZipInfo)
        name = str(entry["filename"])
        offset = int(entry["header_offset"])

        if entry.get("copied_raw") and template_records and name in template_records:
            buf.extend(_patch_central_offset(template_records[name], offset))
            continue

        name_bytes = name.encode("utf-8")
        extra = info.extra or b""
        comment = info.comment or b""
        dos_time, dos_date = _dos_time_date(info.date_time)
        header = struct.pack(
            "<4sHHHHHHIIIHHHHHII",
            _CENTRAL_SIG,
            _version_made_by(info),
            _version_needed(),
            int(entry["flag_bits"]),
            int(entry["compress_type"]),
            dos_time,
            dos_date,
            int(entry["crc"]),
            int(entry["compress_size"]),
            int(entry["file_size"]),
            len(name_bytes),
            len(extra),
            len(comment),
            0,
            info.internal_attr,
            info.external_attr,
            offset,
        )
        buf.extend(header)
        buf.extend(name_bytes)
        buf.extend(extra)
        if comment:
            buf.extend(comment)
    return bytes(buf)


def _build_eocd(entry_count: int, cd_size: int, cd_offset: int) -> bytes:
    return struct.pack(
        "<4s4H2IH",
        _EOCD_SIG,
        0,
        0,
        entry_count,
        entry_count,
        cd_size,
        cd_offset,
        0,
    )


def pack_hwpx_zip_bytes(
    template: bytes,
    file_contents: dict[str, bytes],
    *,
    extra_files: dict[str, bytes] | None = None,
    allow_template_paths: frozenset[str] | set[str] = frozenset(),
) -> bytes:
    """
    지정 ZIP 템플릿 바이트로 재패킹 — 변경 없는 항목은 원본 압축 바이트 그대로 복사.
    extra_files: 템플릿에 없던 BinData 등 신규 ZIP 항목.
    allow_template_paths: 평소 보호되는 _TEMPLATE_ONLY_PATHS 중 이번에는 교체를 허용할 경로
        (예: charPr/borderFill을 추가한 Contents/header.xml). 호출자가 cross-reference를
        일관되게 유지한 경우에만 사용한다.
    """
    extra_files = extra_files or {}
    with zipfile.ZipFile(io.BytesIO(template), "r") as zin:
        infos = zin.infolist()
        original_payload = {
            i.filename.replace("\\", "/"): zin.read(i.filename) for i in infos
        }

    template_cd = _parse_central_records(template)
    out = bytearray()
    cd_meta: list[dict[str, int | str | bytes | tuple[int, int, int, int, int, int]]] = []

    for info in infos:
        name = info.filename.replace("\\", "/")
        protected = name in _TEMPLATE_ONLY_PATHS and name not in allow_template_paths
        replace = name in file_contents and not protected
        if replace and file_contents[name] == original_payload.get(name):
            replace = False

        if replace:
            pack_info = info
            blob, meta = _build_local_record(name, file_contents[name], pack_info)
            meta["info"] = pack_info
            meta["header_offset"] = len(out)
            meta["copied_raw"] = False
            out.extend(blob)
            cd_meta.append(meta)
        else:
            blob = _copy_local_record(template, info)
            meta = {
                "filename": name,
                "crc": info.CRC,
                "compress_size": info.compress_size,
                "file_size": info.file_size,
                "compress_type": info.compress_type,
                "flag_bits": info.flag_bits,
                "header_offset": len(out),
                "info": info,
                "copied_raw": True,
            }
            out.extend(blob)
            cd_meta.append(meta)

    if extra_files:
        template_info = infos[0] if infos else zipfile.ZipInfo()
        for name, data in sorted(extra_files.items()):
            pack_info = zipfile.ZipInfo(name)
            pack_info.compress_type = zipfile.ZIP_DEFLATED
            pack_info.flag_bits = 0x4
            pack_info.date_time = template_info.date_time
            pack_info.create_system = template_info.create_system
            blob, meta = _build_local_record(name, data, pack_info)
            meta["info"] = pack_info
            meta["header_offset"] = len(out)
            meta["copied_raw"] = False
            out.extend(blob)
            cd_meta.append(meta)

    cd_offset = len(out)
    cd_blob = _build_central_directory(cd_meta, template_records=template_cd)
    out.extend(cd_blob)
    out.extend(_build_eocd(len(cd_meta), len(cd_blob), cd_offset))
    return bytes(out)


def pack_hwpx_zip(
    file_contents: dict[str, bytes],
    *,
    template_kind: HwpxTemplateKind = "empty",
) -> bytes:
    """템플릿 종류별 HWPX 재패킹."""
    return pack_hwpx_zip_bytes(_load_template_bytes(template_kind), file_contents)


def pack_hwpx_zip_standalone(file_contents: dict[str, bytes]) -> bytes:
    """템플릿 없을 때 최소 OCF ZIP (fallback)."""
    out = io.BytesIO()
    order = [
        "mimetype",
        "META-INF/",
        "META-INF/container.xml",
        "META-INF/manifest.xml",
        "version.xml",
        "settings.xml",
        "Contents/",
        "Contents/content.hpf",
        "Contents/header.xml",
        "Contents/section0.xml",
        "Meta/",
        "Meta/meta.xml",
        "Preview/",
        "Preview/PrvText.txt",
    ]

    with zipfile.ZipFile(out, "w") as zf:
        for path in order:
            if path not in file_contents:
                continue
            data = file_contents[path]
            info = zipfile.ZipInfo(path)
            if path.endswith("/") or path == "mimetype":
                info.compress_type = zipfile.ZIP_STORED
                if path.endswith("/"):
                    data = b""
            else:
                info.compress_type = zipfile.ZIP_DEFLATED
                info.flag_bits = 0x4
            zf.writestr(info, data)

    return out.getvalue()

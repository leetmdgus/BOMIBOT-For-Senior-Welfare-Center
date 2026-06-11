"""HWPX — BinData·hp:pic 인라인 이미지 임베드."""

from __future__ import annotations

import re
from dataclasses import dataclass, field

from lxml import etree

from app.common.hwpx.html_images import HtmlImageSegment, image_pixel_size
from app.common.hwpx.section0_template_fill import HP_NS

HC_NS = "http://www.hancom.co.kr/hwpml/2011/core"
HP = f"{{{HP_NS}}}"
HC = f"{{{HC_NS}}}"

# 본문 셀 최대 너비(HWPUNIT) — A4 본문 폭 근사
MAX_IMAGE_HWP_WIDTH = 30000
HWPUNIT_PER_PX = 75


@dataclass
class EmbeddedImage:
    item_id: str
    zip_path: str
    data: bytes
    ext: str
    width_px: int
    height_px: int
    width_hwp: int
    height_hwp: int


@dataclass
class HwpxImageCatalog:
    _images: list[EmbeddedImage] = field(default_factory=list)

    def add(self, segment: HtmlImageSegment) -> str:
        index = len(self._images) + 1
        item_id = f"image{index}"
        ext = segment.ext or "png"
        zip_path = f"BinData/{item_id}.{ext}"
        width_px = segment.width_px or image_pixel_size(segment.data)[0]
        height_px = segment.height_px or image_pixel_size(segment.data)[1]
        width_hwp, height_hwp = _fit_hwp_size(width_px, height_px)
        self._images.append(
            EmbeddedImage(
                item_id=item_id,
                zip_path=zip_path,
                data=segment.data,
                ext=ext,
                width_px=width_px,
                height_px=height_px,
                width_hwp=width_hwp,
                height_hwp=height_hwp,
            )
        )
        return item_id

    def get(self, item_id: str) -> EmbeddedImage | None:
        for image in self._images:
            if image.item_id == item_id:
                return image
        return None

    def bin_files(self) -> dict[str, bytes]:
        return {image.zip_path: image.data for image in self._images}

    @property
    def has_images(self) -> bool:
        return bool(self._images)


def _fit_hwp_size(width_px: int, height_px: int) -> tuple[int, int]:
    width_hwp = max(1, int(width_px * HWPUNIT_PER_PX))
    height_hwp = max(1, int(height_px * HWPUNIT_PER_PX))
    if width_hwp <= MAX_IMAGE_HWP_WIDTH:
        return width_hwp, height_hwp
    scale = MAX_IMAGE_HWP_WIDTH / width_hwp
    return MAX_IMAGE_HWP_WIDTH, max(1, int(height_hwp * scale))


def _next_pic_id() -> int:
    if not hasattr(_next_pic_id, "_counter"):
        _next_pic_id._counter = 2_000_000_001  # type: ignore[attr-defined]
    value = _next_pic_id._counter  # type: ignore[attr-defined]
    _next_pic_id._counter += 1  # type: ignore[attr-defined]
    return value


def build_pic_element(parent_run: etree._Element, image: EmbeddedImage) -> etree._Element:
    """hp:run 자식으로 hp:pic 생성."""
    pic_id = _next_pic_id()
    width = image.width_hwp
    height = image.height_hwp
    org_w = max(1, int(image.width_px * HWPUNIT_PER_PX))
    org_h = max(1, int(image.height_px * HWPUNIT_PER_PX))
    sca_x = width / org_w if org_w else 1.0
    sca_y = height / org_h if org_h else 1.0

    pic = etree.SubElement(
        parent_run,
        f"{HP}pic",
        {
            "id": str(pic_id),
            "zOrder": "0",
            "numberingType": "PICTURE",
            "textWrap": "TOP_AND_BOTTOM",
            "textFlow": "BOTH_SIDES",
            "lock": "0",
            "dropcapstyle": "None",
            "href": "",
            "groupLevel": "0",
            "instid": str(pic_id),
            "reverse": "0",
        },
    )
    etree.SubElement(pic, f"{HP}offset", {"x": "0", "y": "0"})
    etree.SubElement(pic, f"{HP}orgSz", {"width": str(org_w), "height": str(org_h)})
    etree.SubElement(pic, f"{HP}curSz", {"width": str(width), "height": str(height)})
    etree.SubElement(pic, f"{HP}flip", {"horizontal": "0", "vertical": "0"})
    etree.SubElement(
        pic,
        f"{HP}rotationInfo",
        {
            "angle": "0",
            "centerX": str(width // 2),
            "centerY": str(height // 2),
            "rotateimage": "1",
        },
    )
    rendering = etree.SubElement(pic, f"{HP}renderingInfo")
    etree.SubElement(
        rendering,
        f"{HC}transMatrix",
        {"e1": "1", "e2": "0", "e3": "0", "e4": "0", "e5": "1", "e6": "0"},
    )
    etree.SubElement(
        rendering,
        f"{HC}scaMatrix",
        {
            "e1": f"{sca_x:.6f}",
            "e2": "0",
            "e3": "0",
            "e4": "0",
            "e5": f"{sca_y:.6f}",
            "e6": "0",
        },
    )
    etree.SubElement(
        rendering,
        f"{HC}rotMatrix",
        {"e1": "1", "e2": "0", "e3": "0", "e4": "0", "e5": "1", "e6": "0"},
    )
    img_rect = etree.SubElement(pic, f"{HP}imgRect")
    etree.SubElement(img_rect, f"{HC}pt0", {"x": "0", "y": "0"})
    etree.SubElement(img_rect, f"{HC}pt1", {"x": str(org_w), "y": "0"})
    etree.SubElement(img_rect, f"{HC}pt2", {"x": str(org_w), "y": str(org_h)})
    etree.SubElement(img_rect, f"{HC}pt3", {"x": "0", "y": str(org_h)})
    etree.SubElement(
        pic,
        f"{HP}imgClip",
        {"left": "0", "right": str(org_w), "top": "0", "bottom": str(org_h)},
    )
    etree.SubElement(pic, f"{HP}inMargin", {"left": "0", "right": "0", "top": "0", "bottom": "0"})
    etree.SubElement(pic, f"{HP}imgDim", {"dimwidth": str(org_w), "dimheight": str(org_h)})
    etree.SubElement(
        pic,
        f"{HC}img",
        {
            "binaryItemIDRef": image.item_id,
            "bright": "0",
            "contrast": "0",
            "effect": "REAL_PIC",
            "alpha": "0",
        },
    )
    etree.SubElement(pic, f"{HP}effects")
    etree.SubElement(
        pic,
        f"{HP}sz",
        {
            "width": str(width),
            "widthRelTo": "ABSOLUTE",
            "height": str(height),
            "heightRelTo": "ABSOLUTE",
            "protect": "0",
        },
    )
    etree.SubElement(
        pic,
        f"{HP}pos",
        {
            "treatAsChar": "1",
            "affectLSpacing": "0",
            "flowWithText": "1",
            "allowOverlap": "0",
            "holdAnchorAndSO": "0",
            "vertRelTo": "PARA",
            "horzRelTo": "COLUMN",
            "vertAlign": "TOP",
            "horzAlign": "LEFT",
            "vertOffset": "0",
            "horzOffset": "0",
        },
    )
    etree.SubElement(pic, f"{HP}outMargin", {"left": "0", "right": "0", "top": "0", "bottom": "0"})
    return pic


def inject_image_into_tc(tc: etree._Element, item_id: str, catalog: HwpxImageCatalog) -> None:
    image = catalog.get(item_id)
    if image is None:
        return

    sub_list = tc.find(f"{HP}subList")
    if sub_list is None:
        return
    para = sub_list.find(f"{HP}p")
    if para is None:
        para = etree.SubElement(
            sub_list,
            f"{HP}p",
            {
                "id": "2147483648",
                "paraPrIDRef": "0",
                "styleIDRef": "0",
                "pageBreak": "0",
                "columnBreak": "0",
                "merged": "0",
            },
        )

    pic_run = etree.SubElement(para, f"{HP}run", {"charPrIDRef": "0"})
    build_pic_element(pic_run, image)

    for lineseg in para.findall(f"{HP}linesegarray"):
        para.remove(lineseg)


def _bin_data_entry(image: EmbeddedImage) -> str:
    mime = image.ext.upper()
    if mime == "JPG":
        mime = "JPEG"
    return f'<hh:binData id="{image.item_id}" type="{mime}" compress="false"/>'


def patch_header_bindata(header_xml: bytes, catalog: HwpxImageCatalog) -> bytes:
    """header.xml에 binData 항목 추가.

    - binDataList는 hh:refList의 '첫' 자식이어야 한다(OWPML refList 순서: binDataList → fontfaces → …).
    - 이미 binDataList가 있으면 그 안에 append하고 itemCnt를 갱신(기존 항목 보존).
    """
    if not catalog.has_images:
        return header_xml
    text = header_xml.decode("utf-8")
    entries = "".join(_bin_data_entry(img) for img in catalog._images)

    existing = re.search(r"<hh:binDataList\b([^>]*)>", text)
    if existing:
        open_tag = existing.group(0)
        cnt = re.search(r'itemCnt="(\d+)"', open_tag)
        prev = int(cnt.group(1)) if cnt else 0
        new_count = prev + len(catalog._images)
        if cnt:
            new_open = re.sub(r'itemCnt="\d+"', f'itemCnt="{new_count}"', open_tag, count=1)
        else:
            new_open = open_tag[:-1] + f' itemCnt="{new_count}">'
        text = text.replace(open_tag, new_open, 1)
        text = text.replace("</hh:binDataList>", entries + "</hh:binDataList>", 1)
        return text.encode("utf-8")

    block = f'<hh:binDataList itemCnt="{len(catalog._images)}">{entries}</hh:binDataList>'
    if "<hh:fontfaces" in text:  # refList 첫 자식으로 (fontfaces 앞)
        return text.replace("<hh:fontfaces", block + "<hh:fontfaces", 1).encode("utf-8")
    open_ref = re.search(r"<hh:refList\b[^>]*>", text)
    if open_ref:
        return text.replace(open_ref.group(0), open_ref.group(0) + block, 1).encode("utf-8")
    return header_xml


def patch_content_hpf(hpf_xml: bytes, catalog: HwpxImageCatalog) -> bytes:
    if not catalog.has_images:
        return hpf_xml
    text = hpf_xml.decode("utf-8")
    manifest_marker = "</opf:manifest>"
    if manifest_marker not in text:
        return hpf_xml

    items: list[str] = []
    for image in catalog._images:
        media = {
            "png": "image/png",
            "jpg": "image/jpeg",
            "jpeg": "image/jpeg",
            "gif": "image/gif",
            "webp": "image/webp",
        }.get(image.ext.lower(), "image/png")
        items.append(
            f'<opf:item id="{image.item_id}" href="{image.zip_path}" media-type="{media}"/>'
        )
    return text.replace(manifest_marker, "".join(items) + manifest_marker, 1).encode("utf-8")


def reset_pic_ids() -> None:
    if hasattr(_next_pic_id, "_counter"):
        delattr(_next_pic_id, "_counter")


def seed_pic_ids(base: int) -> None:
    """업로드 문서의 기존 id/instid와 충돌하지 않도록 pic id 카운터 시작값을 지정."""
    _next_pic_id._counter = max(int(base), 2_000_000_001)  # type: ignore[attr-defined]

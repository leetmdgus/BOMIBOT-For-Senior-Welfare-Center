"""OWPML header / 패키지 골격 — 한글 2014+ 호환."""

from __future__ import annotations

from datetime import UTC, datetime

from app.common.hwpx.encoding import escape_xml

HWPX_FONT_FACE = "맑은 고딕"

HWPX_STYLE = {"body": 0, "title": 1, "heading": 2, "label": 3}
HWPX_CHAR = {"body": 0, "title": 1, "heading": 2, "label": 3}
HWPX_PARA = {"body": 0, "center": 1, "heading": 2}
HWPX_BORDER = {"table": 1, "headerCell": 2}

HWPX_COL = {
    "label2": [9000, 33520],
    "form4": [7500, 13760, 7500, 13760],
    "sub2": [10000, 32520],
    "purpose3": [10000, 10840, 10840, 10840],
}


def _fontface_block(lang: str) -> str:
    charset = "LATIN" if lang == "LATIN" else "HANGUL"
    return f"""<hh:fontface lang="{lang}" fontCnt="1">
        <hh:font id="0" face="{HWPX_FONT_FACE}" charset="{charset}" type="TTF" isEmbedded="0"/>
      </hh:fontface>"""


def build_header_xml(document_title: str) -> str:
    title = escape_xml(document_title or "문서")
    b = HWPX_BORDER
    c = HWPX_CHAR
    p = HWPX_PARA
    s = HWPX_STYLE
    return f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<hh:head xmlns:hh="http://www.hancom.co.kr/hwpml/2011/head"
         xmlns:hc="http://www.hancom.co.kr/hwpml/2011/core"
         xmlns:ha="http://www.hancom.co.kr/hwpml/2011/app"
         version="1.5" secCnt="1">
  <hh:beginNum page="1" footnote="1" endnote="1" pic="1" tbl="1" equation="1"/>
  <hh:refList>
    <hh:fontfaces itemCnt="7">
      {_fontface_block("HANGUL")}
      {_fontface_block("LATIN")}
      {_fontface_block("HANJA")}
      {_fontface_block("JAPANESE")}
      {_fontface_block("OTHER")}
      {_fontface_block("SYMBOL")}
      {_fontface_block("USER")}
    </hh:fontfaces>
    <hh:borderFills itemCnt="3">
      <hh:borderFill id="0" threeD="0" shadow="0" centerLine="NONE" breakCellSeparateLine="0">
        <hh:slash type="NONE" Crooked="0" isCounter="0"/>
        <hh:backSlash type="NONE" Crooked="0" isCounter="0"/>
        <hh:left type="NONE" width="0.1 mm" color="#000000"/>
        <hh:right type="NONE" width="0.1 mm" color="#000000"/>
        <hh:top type="NONE" width="0.1 mm" color="#000000"/>
        <hh:bottom type="NONE" width="0.1 mm" color="#000000"/>
        <hh:diagonal type="NONE" width="0.1 mm" color="#000000"/>
      </hh:borderFill>
      <hh:borderFill id="{b['table']}" threeD="0" shadow="0" centerLine="NONE" breakCellSeparateLine="0">
        <hh:slash type="NONE" Crooked="0" isCounter="0"/>
        <hh:backSlash type="NONE" Crooked="0" isCounter="0"/>
        <hh:left type="SOLID" width="0.12 mm" color="#000000"/>
        <hh:right type="SOLID" width="0.12 mm" color="#000000"/>
        <hh:top type="SOLID" width="0.12 mm" color="#000000"/>
        <hh:bottom type="SOLID" width="0.12 mm" color="#000000"/>
        <hh:diagonal type="NONE" width="0.1 mm" color="#000000"/>
      </hh:borderFill>
      <hh:borderFill id="{b['headerCell']}" threeD="0" shadow="0" centerLine="NONE" breakCellSeparateLine="0">
        <hh:slash type="NONE" Crooked="0" isCounter="0"/>
        <hh:backSlash type="NONE" Crooked="0" isCounter="0"/>
        <hh:left type="SOLID" width="0.12 mm" color="#000000"/>
        <hh:right type="SOLID" width="0.12 mm" color="#000000"/>
        <hh:top type="SOLID" width="0.12 mm" color="#000000"/>
        <hh:bottom type="SOLID" width="0.12 mm" color="#000000"/>
        <hh:diagonal type="NONE" width="0.1 mm" color="#000000"/>
        <hc:fillBrush>
          <hc:winBrush faceColor="#ECECEC" hatchColor="#000000" alpha="0"/>
        </hc:fillBrush>
      </hh:borderFill>
    </hh:borderFills>
    <hh:charProperties itemCnt="4">
      <hh:charPr id="{c['body']}" height="1000" textColor="#111827" shadeColor="none" useFontSpace="0" useKerning="0" symMark="NONE" borderFillIDRef="0">
        <hh:fontRef hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
        <hh:ratio hangul="100" latin="100" hanja="100" japanese="100" other="100" symbol="100" user="100"/>
        <hh:spacing hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
        <hh:relSz hangul="100" latin="100" hanja="100" japanese="100" other="100" symbol="100" user="100"/>
        <hh:offset hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
        <hh:underline type="NONE"/>
        <hh:strikeout shape="NONE" color="#000000"/>
        <hh:outline type="NONE"/>
        <hh:shadow type="NONE" color="#BDBDBD" offsetX="0" offsetY="0"/>
      </hh:charPr>
      <hh:charPr id="{c['title']}" height="1800" textColor="#0F172A" shadeColor="none" useFontSpace="0" useKerning="0" symMark="NONE" borderFillIDRef="0">
        <hh:fontRef hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
        <hh:ratio hangul="100" latin="100" hanja="100" japanese="100" other="100" symbol="100" user="100"/>
        <hh:spacing hangul="-2" latin="-2" hanja="-2" japanese="-2" other="-2" symbol="-2" user="-2"/>
        <hh:relSz hangul="100" latin="100" hanja="100" japanese="100" other="100" symbol="100" user="100"/>
        <hh:offset hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
        <hh:bold/>
        <hh:underline type="NONE"/>
        <hh:strikeout shape="NONE" color="#000000"/>
        <hh:outline type="NONE"/>
        <hh:shadow type="NONE" color="#BDBDBD" offsetX="0" offsetY="0"/>
      </hh:charPr>
      <hh:charPr id="{c['heading']}" height="1200" textColor="#0F172A" shadeColor="none" useFontSpace="0" useKerning="0" symMark="NONE" borderFillIDRef="0">
        <hh:fontRef hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
        <hh:ratio hangul="100" latin="100" hanja="100" japanese="100" other="100" symbol="100" user="100"/>
        <hh:spacing hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
        <hh:relSz hangul="100" latin="100" hanja="100" japanese="100" other="100" symbol="100" user="100"/>
        <hh:offset hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
        <hh:bold/>
        <hh:underline type="NONE"/>
        <hh:strikeout shape="NONE" color="#000000"/>
        <hh:outline type="NONE"/>
        <hh:shadow type="NONE" color="#BDBDBD" offsetX="0" offsetY="0"/>
      </hh:charPr>
      <hh:charPr id="{c['label']}" height="900" textColor="#1E293B" shadeColor="none" useFontSpace="0" useKerning="0" symMark="NONE" borderFillIDRef="0">
        <hh:fontRef hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
        <hh:ratio hangul="100" latin="100" hanja="100" japanese="100" other="100" symbol="100" user="100"/>
        <hh:spacing hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
        <hh:relSz hangul="100" latin="100" hanja="100" japanese="100" other="100" symbol="100" user="100"/>
        <hh:offset hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
        <hh:bold/>
        <hh:underline type="NONE"/>
        <hh:strikeout shape="NONE" color="#000000"/>
        <hh:outline type="NONE"/>
        <hh:shadow type="NONE" color="#BDBDBD" offsetX="0" offsetY="0"/>
      </hh:charPr>
    </hh:charProperties>
    <hh:tabProperties itemCnt="1">
      <hh:tabPr id="0" autoTabLeft="0" autoTabRight="0"/>
    </hh:tabProperties>
    <hh:numberings itemCnt="1">
      <hh:numbering id="1" start="0">
        <hh:paraHead start="1" level="1" align="LEFT" useInstWidth="1" autoIndent="1" widthAdjust="0" textOffsetType="percent" textOffset="0" numFormat="BULLET" charPrIDRef="0" checkable="0">
          <hh:heading type="BULLET" idRef="0" level="0"/>
        </hh:paraHead>
      </hh:numbering>
    </hh:numberings>
    <hh:paraProperties itemCnt="3">
      <hh:paraPr id="{p['body']}" align="JUSTIFY" vertalign="BASELINE" headingType="NONE" level="0" tabPrIDRef="0" condense="0" fontLineHeight="0" snapToGrid="1" suppressLineNumbers="0" checked="0">
        <hh:margin indent="0" left="0" right="0" prev="0" next="0"/>
        <hh:lineSpacing type="PERCENT" value="160" unit="HWPUNIT"/>
        <hh:border borderFillIDRef="0" offsetLeft="0" offsetRight="0" offsetTop="0" offsetBottom="0" connect="0" ignoreMargin="0"/>
      </hh:paraPr>
      <hh:paraPr id="{p['center']}" align="CENTER" vertalign="BASELINE" headingType="NONE" level="0" tabPrIDRef="0" condense="0" fontLineHeight="0" snapToGrid="1" suppressLineNumbers="0" checked="0">
        <hh:margin indent="0" left="0" right="0" prev="0" next="0"/>
        <hh:lineSpacing type="PERCENT" value="160" unit="HWPUNIT"/>
        <hh:border borderFillIDRef="0" offsetLeft="0" offsetRight="0" offsetTop="0" offsetBottom="0" connect="0" ignoreMargin="0"/>
      </hh:paraPr>
      <hh:paraPr id="{p['heading']}" align="LEFT" vertalign="BASELINE" headingType="NONE" level="0" tabPrIDRef="0" condense="0" fontLineHeight="0" snapToGrid="1" suppressLineNumbers="0" checked="0">
        <hh:margin indent="0" left="0" right="0" prev="120" next="60"/>
        <hh:lineSpacing type="PERCENT" value="140" unit="HWPUNIT"/>
        <hh:border borderFillIDRef="0" offsetLeft="0" offsetRight="0" offsetTop="0" offsetBottom="0" connect="0" ignoreMargin="0"/>
      </hh:paraPr>
    </hh:paraProperties>
    <hh:styles itemCnt="4">
      <hh:style id="{s['body']}" type="PARA" name="바탕글" engName="Normal" paraPrIDRef="{p['body']}" charPrIDRef="{c['body']}" nextStyleIDRef="{s['body']}" langID="1042" lockForm="0"/>
      <hh:style id="{s['title']}" type="PARA" name="문서제목" engName="Title" paraPrIDRef="{p['center']}" charPrIDRef="{c['title']}" nextStyleIDRef="{s['body']}" langID="1042" lockForm="0"/>
      <hh:style id="{s['heading']}" type="PARA" name="개요" engName="Heading" paraPrIDRef="{p['heading']}" charPrIDRef="{c['heading']}" nextStyleIDRef="{s['body']}" langID="1042" lockForm="0"/>
      <hh:style id="{s['label']}" type="PARA" name="표라벨" engName="Label" paraPrIDRef="{p['center']}" charPrIDRef="{c['label']}" nextStyleIDRef="{s['body']}" langID="1042" lockForm="0"/>
    </hh:styles>
  </hh:refList>
  <hh:docInfo>
    <ha:title>{title}</ha:title>
  </hh:docInfo>
</hh:head>"""


def build_settings_xml() -> str:
    return """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<ha:HWPApplicationSetting xmlns:ha="http://www.hancom.co.kr/hwpml/2011/app">
  <ha:CaretPosition list="0" para="0" pos="0"/>
</ha:HWPApplicationSetting>"""


def build_version_xml() -> str:
    return """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<hc:version xmlns:hc="http://www.hancom.co.kr/hwpml/2011/core"
            xmlns:ha="http://www.hancom.co.kr/hwpml/2011/app"
            tagtypes="1">
  <ha:app>BOMIBOT</ha:app>
  <ha:appversion>5.1.0.1</ha:appversion>
  <hc:version tagtypes="0">
    <ha:major>5</ha:major>
    <ha:minor>1</ha:minor>
  </hc:version>
</hc:version>"""


def build_container_xml() -> str:
    return """<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="Contents/content.hpf" media-type="application/hwp+zip"/>
  </rootfiles>
</container>"""


def build_meta_xml(title: str) -> str:
    now = datetime.now(UTC).isoformat()
    return f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<opf:metadata xmlns:opf="urn:oasis:names:tc:opendocument:xmlns:package"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:dcterms="http://purl.org/dc/terms/">
  <dc:title>{escape_xml(title)}</dc:title>
  <dc:creator>BOMIBOT</dc:creator>
  <dcterms:created>{now}</dcterms:created>
</opf:metadata>"""


def build_manifest_xml() -> str:
    return """<?xml version="1.0" encoding="UTF-8"?>
<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0">
  <manifest:file-entry manifest:full-path="/" manifest:media-type="application/hwp+zip"/>
  <manifest:file-entry manifest:full-path="mimetype" manifest:media-type="application/hwp+zip"/>
  <manifest:file-entry manifest:full-path="version.xml" manifest:media-type="application/xml"/>
  <manifest:file-entry manifest:full-path="settings.xml" manifest:media-type="application/xml"/>
  <manifest:file-entry manifest:full-path="Contents/content.hpf" manifest:media-type="application/hwpml-package+xml"/>
  <manifest:file-entry manifest:full-path="Contents/header.xml" manifest:media-type="application/hwpml-head+xml"/>
  <manifest:file-entry manifest:full-path="Contents/section0.xml" manifest:media-type="application/hwpml-section+xml"/>
  <manifest:file-entry manifest:full-path="Meta/meta.xml" manifest:media-type="application/xml"/>
  <manifest:file-entry manifest:full-path="Preview/PrvText.txt" manifest:media-type="text/plain"/>
</manifest:manifest>"""


def build_section_open_paragraph() -> str:
    p = HWPX_PARA
    s = HWPX_STYLE
    c = HWPX_CHAR
    return f"""<hp:p id="0" paraPrIDRef="{p['body']}" styleIDRef="{s['body']}" pageBreak="0" columnBreak="0" merged="0">
  <hp:run charPrIDRef="{c['body']}">
    <hp:secPr id="" textDirection="HORIZONTAL" spaceColumns="1134" tabStop="8000" outlineShapeIDRef="0" memoShapeIDRef="0" textVerticalWidth="0" masterPageCnt="0">
      <hp:pagePr landscape="WIDELY" width="59528" height="84188" gutterType="LEFT_ONLY">
        <hp:margin header="4252" footer="4252" gutter="0" left="8504" right="8504" top="5668" bottom="4252"/>
      </hp:pagePr>
      <hp:footNotePr>
        <hp:autoNumFormat type="DIGIT" userChar="" prefixChar="" suffixChar=")" startNumber="1"/>
        <hp:noteLine length="-1" type="SOLID" width="0.12 mm" color="#000000"/>
        <hp:noteSpacing betweenNotes="283" belowLine="567" aboveLine="850"/>
      </hp:footNotePr>
      <hp:endNotePr>
        <hp:autoNumFormat type="DIGIT" userChar="" prefixChar="" suffixChar=")" startNumber="1"/>
        <hp:noteLine length="-1" type="SOLID" width="0.12 mm" color="#000000"/>
        <hp:noteSpacing betweenNotes="0" belowLine="567" aboveLine="850"/>
      </hp:endNotePr>
      <hp:pageBorderFill type="BOTH" borderFillIDRef="0" textBorder="PAPER" headerInside="0" footerInside="0" fillArea="PAPER">
        <hp:offset left="1417" right="1417" top="1417" bottom="1417"/>
      </hp:pageBorderFill>
    </hp:secPr>
    <hp:ctrl><hp:colPr id="" type="NEWSPAPER" layout="LEFT" colCount="1" sameSz="1" sameGap="0"/></hp:ctrl>
  </hp:run>
  <hp:run charPrIDRef="{c['body']}"><hp:t> </hp:t></hp:run>
</hp:p>"""

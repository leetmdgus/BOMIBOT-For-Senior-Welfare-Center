"use client"

// HwpxRenderer.tsx

import React from "react";
import "./HwpxRenderer.css";

type AnyObj = Record<string, any>;

type HwpxDocument = {
  type: string;
  maps?: AnyObj;
  document: {
    paragraphs: HwpxParagraph[];
  };
};

type HwpxParagraph = {
  type: "paragraph";
  index?: number;
  text?: string;
  paragraph_style?: AnyObj;
  runs: HwpxRun[];
};

type HwpxRun =
  | HwpxTextRun
  | HwpxTable
  | HwpxImage
  | HwpxShape
  | AnyObj;

type HwpxTextRun = {
  type: "text_run";
  text: string;
  style?: AnyObj;
};

type HwpxTable = {
  type: "table";
  width?: number;
  height?: number;
  rows: HwpxTableRow[];
};

type HwpxTableRow = {
  type: "table_row";
  cells: HwpxTableCell[];
};

type HwpxTableCell = {
  type: "table_cell";

  row_span?: number;
  col_span?: number;

  width?: number;
  height?: number;

  backgroundColor?: string;

  margin?: {
    left?: number;
    right?: number;
    top?: number;
    bottom?: number;
  };

  vertical_align?: string;

  paragraphs: HwpxParagraph[];
};

type HwpxImage = {
  type: "image";
  src?: string | null;
  bindata_ref?: string | null;
  width?: number;
  height?: number;
};

type HwpxShape = {
  type: "shape";
  shape_tag?: string;
  width?: number;
  height?: number;
};

function hwpxUnitToPx(value?: number | null): number | undefined {
  if (value == null) return undefined;

  // HWP 내부 단위는 정확한 px이 아님.
  // 현재 렌더링용 보정값. 필요 시 조정.
  return value / 100;
}

function mapTextAlign(value?: string): React.CSSProperties["textAlign"] {
  switch (value) {
    case "LEFT":
      return "left";
    case "CENTER":
      return "center";
    case "RIGHT":
      return "right";
    case "JUSTIFY":
      return "justify";
    default:
      return "left";
  }
}

function mapVerticalAlign(value?: string): React.CSSProperties["verticalAlign"] {
  switch (value) {
    case "TOP":
      return "top";
    case "CENTER":
      return "middle";
    case "BOTTOM":
      return "bottom";
    default:
      return "middle";
  }
}

function getParagraphStyle(p: HwpxParagraph): React.CSSProperties {
  const align = p.paragraph_style?.align?.horizontal;

  return {
    textAlign: mapTextAlign(align),
  };
}

function getTextRunStyle(run: HwpxTextRun): React.CSSProperties {
  const s = run.style ?? {};

  return {
    fontFamily: s.font ?? "serif",
    fontSize: s.size_px_guess ? `${s.size_px_guess}px` : undefined,
    color: s.textColor && s.textColor !== "none" ? s.textColor : undefined,
    fontWeight: s.bold ? 700 : 400,
    fontStyle: s.italic ? "italic" : "normal",
    textDecoration:
      s.underline?.type && s.underline.type !== "NONE"
        ? "underline"
        : s.strikeout?.shape && s.strikeout.shape !== "NONE"
          ? "line-through"
          : "none",
    whiteSpace: "pre-wrap",
  };
}

function renderTextRun(run: HwpxTextRun, key: React.Key) {
  return (
    <span key={key} className="hwpx-text-run" style={getTextRunStyle(run)}>
      {run.text}
    </span>
  );
}

function renderTable(table: HwpxTable, key: React.Key) {
  return (
    <table
      key={key}
      className="hwpx-table"
      style={{
        width: hwpxUnitToPx(table.width),
        height: hwpxUnitToPx(table.height),
      }}
    >
      <tbody>
        {table.rows?.map((row, rowIndex) => (
          <tr key={rowIndex}>
            {row.cells?.map((cell, cellIndex) => renderTableCell(cell, cellIndex))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function renderTableCell(cell: HwpxTableCell, key: React.Key) {
  const margin = cell.margin ?? {};

  return (
    <td
      key={key}
      rowSpan={cell.row_span ?? 1}
      colSpan={cell.col_span ?? 1}
      className="hwpx-table-cell"
      style={{
        width: hwpxUnitToPx(cell.width),
        height: hwpxUnitToPx(cell.height),

        paddingTop: hwpxUnitToPx(margin.top) ?? 2,
        paddingRight: hwpxUnitToPx(margin.right) ?? 4,
        paddingBottom: hwpxUnitToPx(margin.bottom) ?? 2,
        paddingLeft: hwpxUnitToPx(margin.left) ?? 4,

        verticalAlign: mapVerticalAlign(cell.vertical_align),

        backgroundColor:
          cell.backgroundColor &&
          cell.backgroundColor !== "none"
            ? cell.backgroundColor
            : undefined,
      }}
    >
      {cell.paragraphs?.map((p, i) => renderParagraph(p, i))}
    </td>
  );
}

function renderImage(image: HwpxImage, key: React.Key) {
  if (!image.src) {
    return (
      <div
        key={key}
        className="hwpx-image-placeholder"
        style={{
          width: hwpxUnitToPx(image.width) ?? 160,
          height: hwpxUnitToPx(image.height) ?? 80,
        }}
      >
        image: {image.bindata_ref ?? "unresolved"}
      </div>
    );
  }

  return (
    <img
      key={key}
      className="hwpx-image"
      src={image.src}
      alt=""
      style={{
        width: hwpxUnitToPx(image.width),
        height: hwpxUnitToPx(image.height),
      }}
    />
  );
}

function renderShape(shape: HwpxShape, key: React.Key) {
  return (
    <div
      key={key}
      className="hwpx-shape-placeholder"
      style={{
        width: hwpxUnitToPx(shape.width) ?? 100,
        height: hwpxUnitToPx(shape.height) ?? 40,
      }}
    >
      shape: {shape.shape_tag ?? "unknown"}
    </div>
  );
}

function renderRun(run: HwpxRun, key: React.Key) {
  switch (run.type) {
    case "text_run":
      return renderTextRun(run as HwpxTextRun, key);

    case "table":
      return renderTable(run as HwpxTable, key);

    case "image":
      return renderImage(run as HwpxImage, key);

    case "shape":
      return renderShape(run as HwpxShape, key);

    default:
      return null;
  }
}

function renderParagraph(p: HwpxParagraph, key: React.Key) {
  return (
    <p key={key} className="hwpx-paragraph" style={getParagraphStyle(p)}>
      {p.runs?.map((run, i) => renderRun(run, i))}
    </p>
  );
}

export function HwpxRenderer({ data }: { data: HwpxDocument }) {
  return (
    <div className="hwpx-root">
      <div className="hwpx-page">
        {data.document.paragraphs.map((p, i) => renderParagraph(p, i))}
      </div>
    </div>
  );
}
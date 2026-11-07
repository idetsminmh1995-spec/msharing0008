(function (root) {
  "use strict";

  const VIEWPORT_TOP_FRACTION = 0.2;
  const VIEWPORT_HEIGHT_FRACTION = 0.28;
  const SYSTEM_HEIGHT_VIEWBOX_UNITS = 20.8;

  function parseSvgMetrics(svg) {
    if (typeof svg !== "string") throw new TypeError("SVG must be a string.");
    const rootTag = svg.match(/<svg\b[^>]*>/i)?.[0];
    if (!rootTag)
      throw new Error("Notation renderer returned no SVG root element.");

    const attributes = {};
    for (const match of rootTag.matchAll(
      /([:\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g,
    )) {
      attributes[match[1]] = match[2] ?? match[3] ?? "";
    }
    const number = (value, fallback) => {
      const parsed = Number.parseFloat(value ?? "");
      return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
    };
    const viewBoxParts = (attributes.viewBox || "")
      .trim()
      .split(/[\s,]+/)
      .map(Number);
    if (
      viewBoxParts.length !== 4 ||
      viewBoxParts.some((part) => !Number.isFinite(part))
    ) {
      throw new Error("Notation SVG has an invalid viewBox.");
    }
    const [viewBoxX, viewBoxY, viewBoxWidth, viewBoxHeight] = viewBoxParts;
    if (!(viewBoxWidth > 0) || !(viewBoxHeight > 0)) {
      throw new Error("Notation SVG has an empty viewBox.");
    }
    const widthPx = number(attributes.width, viewBoxWidth);
    const heightPx = number(attributes.height, viewBoxHeight);

    return {
      widthPx,
      heightPx,
      viewBoxX,
      viewBoxY,
      viewBoxWidth,
      viewBoxHeight,
      pixelsPerViewBoxX: widthPx / viewBoxWidth,
      pixelsPerViewBoxY: heightPx / viewBoxHeight,
    };
  }

  function computeSystemViewport(metrics, canvasWidth, canvasHeight, systemY) {
    if (
      !metrics ||
      !Number.isFinite(canvasWidth) ||
      !Number.isFinite(canvasHeight) ||
      !(canvasWidth > 0) ||
      !(canvasHeight > 0) ||
      !Number.isFinite(systemY)
    ) {
      throw new TypeError(
        "A valid SVG geometry, canvas size, and system y are required.",
      );
    }

    const bandY = canvasHeight * VIEWPORT_TOP_FRACTION;
    const bandHeight = canvasHeight * VIEWPORT_HEIGHT_FRACTION;
    const sourceY = Math.max(
      0,
      (systemY - metrics.viewBoxY) * metrics.pixelsPerViewBoxY,
    );
    const sourceHeight = Math.min(
      SYSTEM_HEIGHT_VIEWBOX_UNITS * metrics.pixelsPerViewBoxY,
      metrics.heightPx - sourceY,
    );
    if (!(sourceHeight > 0))
      throw new Error("The active notation system is outside the SVG image.");

    // Keep the notation at its rendered size whenever it fits. On a 1280×720
    // frame this reduces a 20.8-space system only 3.1% to fit the 202px strip.
    const scale = Math.min(1, bandHeight / sourceHeight);
    const sourceWidth = Math.min(metrics.widthPx, canvasWidth / scale);
    const destinationWidth = sourceWidth * scale;
    const destinationHeight = sourceHeight * scale;

    return {
      sourceX: 0,
      sourceY,
      sourceWidth,
      sourceHeight,
      destinationX: (canvasWidth - destinationWidth) / 2,
      destinationY: bandY,
      destinationWidth,
      destinationHeight,
      bandY,
      bandHeight,
    };
  }

  function withEmbeddedBravura(svg, fontDataUrl) {
    if (
      typeof fontDataUrl !== "string" ||
      !fontDataUrl.startsWith("data:font/woff2;base64,")
    ) {
      throw new TypeError("Bravura must be supplied as a WOFF2 data URL.");
    }
    const rootTag = svg.match(/<svg\b[^>]*>/i)?.[0];
    if (!rootTag)
      throw new Error("Notation renderer returned no SVG root element.");
    const fontStyle = `<style type="text/css">@font-face{font-family:'Bravura';src:url('${fontDataUrl}') format('woff2');font-style:normal;font-weight:normal}</style>`;
    return svg.replace(rootTag, `${rootTag}${fontStyle}`);
  }

  const api = { parseSvgMetrics, computeSystemViewport, withEmbeddedBravura };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.NotationOverlay = api;
})(typeof window !== "undefined" ? window : globalThis);

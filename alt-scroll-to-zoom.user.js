// ==UserScript==
// @name        Alt + Scroll to Zoom and Pan
// @namespace   snomiao@gmail.com
// @match       http://*/*
// @match       https://*/*
// @grant       none
// @version     2.1.1
// @author      snomiao@gmail.com
// @description  alt + wheel scroll to zoom the entire page, alt + primary-button to drag to pan the entire page. Handy when your PC have not touch pad or touchscreen. Inspired by Google Maps.
// @run-at      document-end
// @license     MIT
// ==/UserScript==

// alt + scroll to zoom the entire page
// alt + mouse middle drag to pan the entire page

main();

function main() {
  if (!supportPassive()) {
    alert(
      "Your browser does not support passive event listener, which may cause performance issues. Please consider using a modern browser."
    );
  }
  const ac = new AbortController();
  const signal = ac.signal;

  // hot-reload support
  globalThis.altScrollToZoomAbortController?.abort();
  globalThis.altScrollToZoomAbortController = ac;

  const zoomer = createTransformer(document.body);

  let listening = false;
  
  // alt+left to pan
  window.addEventListener(
    "mousedown",
    (event) => {
      if (!(event.altKey && event.button === 0)) return;
      event.preventDefault();
      if (doubleClickChecker.isDoubleClick()) {
        zoomer.reset();
        return;
      }
      let start = [event.pageX, event.pageY];
      function onMouseMove(event) {
        const current = [event.pageX, event.pageY];
        const movement = vecOpVec(current, "-", start);
        zoomer.move(movement);
        start = current;
      }
      function onMouseUp(event) {
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      }
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    },
    { signal }
  );

  // alt+wheel to zoom
  /**
   * @param {WheelEvent} event
   */
  function wheelHandler(event) {
    const isModifiersOK =
      event.altKey && !event.ctrlKey && !event.shiftKey && !event.metaKey;
    if (!isModifiersOK) return;
    event.preventDefault();

    // get mouse pos
    const mouse = [event.pageX, event.pageY];
    console.log("Mouse at", {
      x: [event.pageX, event.clientX, event.screenX, event.offsetX, event.movementX],
      y: [event.pageY, event.clientY, event.screenY, event.offsetY, event.movementY],
    });
    const scale = Math.pow(1.1, -event.deltaY / 100);
    console.log("Zooming", { scale, mouse });
    zoomer.zoom(scale, mouse);
  }

  function modifierHandler(event) {
    const isModifiersOK =
      event.altKey && !event.ctrlKey && !event.shiftKey && !event.metaKey;
    if (!isModifiersOK) return;

    if (isModifiersOK) {
      !listening &&
        window.addEventListener("wheel", wheelHandler, { passive: false });
      listening = true;
    } else {
      listening &&
        window.removeEventListener("wheel", wheelHandler, { passive: false });
      listening = false;
    }
  }
  window.addEventListener("keydown", modifierHandler, { signal });
  window.addEventListener("keyup", modifierHandler, { signal });
}

function createTransformer(el = document.body) {
  const initialScale = el.style.scale || "1";
  const initialTranslate = el.style.translate || "0px 0px";
  const initialTransition = el.style.transition || "none";
  // el.style.transition = "transform 0.1s ease-out";
  el.style.transformOrigin = "0 0";

  let s = {
    scale: parseFloat(initialScale),
    translate: initialTranslate
      .split(" ")
      .map((v) => v.replace("px", ""))
      .map((v) => parseFloat(v)),
  };
  console.log("Initial zoom state:", s);
  const apply = () => {
    el.style.transform = `matrix(${s.scale}, 0, 0, ${s.scale}, ${s.translate[0]}, ${s.translate[1]})`;
  };
  return {
    zoom: (
      dscale,
      center = [window.innerWidth / 2, window.innerHeight / 2]
    ) => {
      const newscale = Math.max(0.1, Math.min(s.scale * dscale, 10));
      const scalechange = newscale - s.scale;
      const offset = vecOp(center, "*", -scalechange);

      console.log(s.translate, offset, newscale, s.scale);
      s = {
        scale: newscale,
        translate: vecOpVec(s.translate, "+", offset),
      };
      console.log("scaled: ", { ...s, dscale, center, scalechange, offset });
      apply();
    },
    move: (movement) => {
      s.translate = vecOpVec(s.translate, "+", movement);
      apply();
    },
    reset: () => {
      s = {
        scale: parseFloat(initialScale),
        translate: initialTranslate
          .split(" ")
          .map((v) => v.replace("px", ""))
          .map((v) => parseFloat(v)),
      };
      apply();
    },
  };
}

function vecOp(v, op, n) {
  return (
    {
      "*": () => v.map((x) => x * n),
      "+": () => v.map((x) => x + n),
      "-": () => v.map((x) => x - n),
      "/": () => v.map((x) => x / n),
    }[op]?.() ?? DIE("Unknown operation: " + op)
  );
}
function vecOpVec(v0, op, v1) {
  if (v0.length !== v1.length) DIE("Vector length mismatch");
  return (
    {
      "*": () => v0.map((x, i) => x * v1[i]),
      "+": () => v0.map((x, i) => x + v1[i]),
      "-": () => v0.map((x, i) => x - v1[i]),
      "/": () => v0.map((x, i) => x / v1[i]),
    }[op]?.() ?? DIE("Unknown operation: " + op)
  );
}

function DIE(msg) {
  throw new Error(msg);
}

function supportPassive() {
  let supportsPassive = false;
  try {
    window.addEventListener(
      "test",
      null,
      Object.defineProperty({}, "passive", {
        get: function () {
          supportsPassive = true;
        },
      })
    );
  } catch (e) {}
  return supportsPassive;
}

function sign(x) {
  return x === 0 ? 0 : x > 0 ? 1 : -1;
}

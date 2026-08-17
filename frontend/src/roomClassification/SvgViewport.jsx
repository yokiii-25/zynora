import {
  forwardRef,
} from "react";

function SvgViewport(
  {
    svgContent,
    camera,

    onWheel,

    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerLeave,

    onClick,

    children,
  },
  ref
) {
  return (
    <div className="svgViewportOuter">

      <div
        ref={ref}
        className="svgViewport"

        onWheel={onWheel}

        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={onPointerLeave}

        onClick={onClick}
      >

        <div
          className="svgViewportContent"
          style={camera}
          dangerouslySetInnerHTML={{
            __html: svgContent,
          }}
        />

        {children}

      </div>

    </div>
  );
}

export default forwardRef(
  SvgViewport
);
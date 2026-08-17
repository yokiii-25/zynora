import {
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";


const MIN_SCALE = 0.45;
const MAX_SCALE = 4;
const ZOOM_STEP = 0.15;


function clamp(value, minimum, maximum) {
  return Math.min(
    maximum,
    Math.max(minimum, value)
  );
}


export default function useSvgCamera() {
  const viewportRef = useRef(null);

  const dragStateRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    startPanX: 0,
    startPanY: 0,
  });

  const [
    camera,
    setCamera,
  ] = useState({
    scale: 1,
    x: 0,
    y: 0,
  });


  const setScaleAroundPoint =
    useCallback(
      (
        nextScale,
        pointerX,
        pointerY
      ) => {
        setCamera(
          (currentCamera) => {
            const clampedScale =
              clamp(
                nextScale,
                MIN_SCALE,
                MAX_SCALE
              );

            const scaleRatio =
              clampedScale /
              currentCamera.scale;

            return {
              scale: clampedScale,

              x:
                pointerX -
                (
                  pointerX -
                  currentCamera.x
                ) *
                  scaleRatio,

              y:
                pointerY -
                (
                  pointerY -
                  currentCamera.y
                ) *
                  scaleRatio,
            };
          }
        );
      },
      []
    );


  const handleWheel =
    useCallback(
      (event) => {
        event.preventDefault();

        const viewport =
          viewportRef.current;

        if (!viewport) {
          return;
        }

        const bounds =
          viewport.getBoundingClientRect();

        const pointerX =
          event.clientX -
          bounds.left;

        const pointerY =
          event.clientY -
          bounds.top;

        const direction =
          event.deltaY < 0
            ? 1
            : -1;

        setCamera(
          (currentCamera) => {
            const nextScale =
              clamp(
                currentCamera.scale +
                  direction *
                    ZOOM_STEP,
                MIN_SCALE,
                MAX_SCALE
              );

            const scaleRatio =
              nextScale /
              currentCamera.scale;

            return {
              scale: nextScale,

              x:
                pointerX -
                (
                  pointerX -
                  currentCamera.x
                ) *
                  scaleRatio,

              y:
                pointerY -
                (
                  pointerY -
                  currentCamera.y
                ) *
                  scaleRatio,
            };
          }
        );
      },
      []
    );


  const handlePointerDown =
    useCallback(
      (event) => {
        if (
          event.button !== 0
        ) {
          return;
        }

        dragStateRef.current = {
          active: true,
          startX: event.clientX,
          startY: event.clientY,
          startPanX: camera.x,
          startPanY: camera.y,
        };

        event.currentTarget
          .setPointerCapture?.(
            event.pointerId
          );
      },
      [
        camera.x,
        camera.y,
      ]
    );


  const handlePointerMove =
    useCallback(
      (event) => {
        const dragState =
          dragStateRef.current;

        if (!dragState.active) {
          return;
        }

        const deltaX =
          event.clientX -
          dragState.startX;

        const deltaY =
          event.clientY -
          dragState.startY;

        setCamera(
          (currentCamera) => ({
            ...currentCamera,

            x:
              dragState.startPanX +
              deltaX,

            y:
              dragState.startPanY +
              deltaY,
          })
        );
      },
      []
    );


  const endDragging =
    useCallback(() => {
      dragStateRef.current.active =
        false;
    }, []);


  const zoomIn =
    useCallback(() => {
      const viewport =
        viewportRef.current;

      if (!viewport) {
        return;
      }

      setScaleAroundPoint(
        camera.scale +
          ZOOM_STEP,

        viewport.clientWidth / 2,
        viewport.clientHeight / 2
      );
    }, [
      camera.scale,
      setScaleAroundPoint,
    ]);


  const zoomOut =
    useCallback(() => {
      const viewport =
        viewportRef.current;

      if (!viewport) {
        return;
      }

      setScaleAroundPoint(
        camera.scale -
          ZOOM_STEP,

        viewport.clientWidth / 2,
        viewport.clientHeight / 2
      );
    }, [
      camera.scale,
      setScaleAroundPoint,
    ]);


  const resetView =
    useCallback(() => {
      setCamera({
        scale: 1,
        x: 0,
        y: 0,
      });
    }, []);


  const fitToScreen =
    useCallback(
      (contentWidth, contentHeight) => {
        const viewport =
          viewportRef.current;

        if (
          !viewport ||
          !contentWidth ||
          !contentHeight
        ) {
          resetView();
          return;
        }

        const padding = 36;

        const availableWidth =
          viewport.clientWidth -
          padding * 2;

        const availableHeight =
          viewport.clientHeight -
          padding * 2;

        const nextScale =
          clamp(
            Math.min(
              availableWidth /
                contentWidth,

              availableHeight /
                contentHeight
            ),
            MIN_SCALE,
            MAX_SCALE
          );

        const scaledWidth =
          contentWidth *
          nextScale;

        const scaledHeight =
          contentHeight *
          nextScale;

        setCamera({
          scale: nextScale,

          x:
            (
              viewport.clientWidth -
              scaledWidth
            ) / 2,

          y:
            (
              viewport.clientHeight -
              scaledHeight
            ) / 2,
        });
      },
      [resetView]
    );


  const transformStyle =
    useMemo(
      () => ({
        transform:
          `translate(${camera.x}px, ${camera.y}px) ` +
          `scale(${camera.scale})`,

        transformOrigin:
          "0 0",
      }),
      [camera]
    );


  return {
    viewportRef,
    camera,
    zoomPercentage:
      Math.round(
        camera.scale * 100
      ),
    transformStyle,
    zoomIn,
    zoomOut,
    resetView,
    fitToScreen,
    handleWheel,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp:
      endDragging,
    handlePointerCancel:
      endDragging,
    handlePointerLeave:
      endDragging,
  };
}
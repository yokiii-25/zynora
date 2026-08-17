import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import SvgViewport from
  "../roomClassification/SvgViewport";

import RoomInspector from
  "../roomClassification/RoomInspector";

import Room3DViewer from
  "../roomClassification/Room3DViewer";

import useSvgCamera from
  "../hooks/useSvgCamera";

import {
  getRoomColor,
} from "../utils/roomColors";

import {
  applyAllRoomStyles,
  getRoomGroupFromEvent,
  scrollToRoomCard,
} from "../utils/roomSvgInteraction";


function RoomClassification() {
  const navigate =
    useNavigate();

  const camera =
    useSvgCamera();

  const [
    selectedRoomId,
    setSelectedRoomId,
  ] = useState(null);

  const [
    hoveredRoom,
    setHoveredRoom,
  ] = useState(null);

  const [
    show3DViewer,
    setShow3DViewer,
  ] = useState(false);

  const [
    tooltipPosition,
    setTooltipPosition,
  ] = useState({
    x: 0,
    y: 0,
  });


  const classification =
    useMemo(() => {
      const stored =
        localStorage.getItem(
          "zynoraRoomClassification"
        );

      if (!stored) {
        return null;
      }

      try {
        return JSON.parse(
          stored
        );
      } catch (error) {
        console.error(
          "Invalid stored classification:",
          error
        );

        return null;
      }
    }, []);


  const svgContent =
    useMemo(() => {
      return localStorage.getItem(
        "zynoraUploadedSvgContent"
      );
    }, []);


  const rooms =
    useMemo(() => {
      if (
        !Array.isArray(
          classification?.rooms
        )
      ) {
        return [];
      }

      return classification.rooms;
    }, [classification]);


  const roomMap =
    useMemo(() => {
      return new Map(
        rooms.map((room) => [
          room.room_id,
          room,
        ])
      );
    }, [rooms]);


  const selectedRoom =
    selectedRoomId
      ? roomMap.get(
          selectedRoomId
        ) || null
      : null;


  const selectedRoomIndex =
    selectedRoom
      ? rooms.findIndex(
          (room) =>
            room.room_id ===
            selectedRoom.room_id
        )
      : -1;


  useEffect(() => {
    const previewElement =
      camera.viewportRef.current;

    if (
      !previewElement ||
      rooms.length === 0
    ) {
      return;
    }

    applyAllRoomStyles(
      previewElement,
      rooms,
      selectedRoomId
    );
  }, [
    camera.viewportRef,
    rooms,
    svgContent,
    selectedRoomId,
  ]);


  useEffect(() => {
    if (!show3DViewer) {
      document.body.style.overflow =
        "";

      return undefined;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";


    function handleEscape(event) {
      if (event.key === "Escape") {
        setShow3DViewer(false);
      }
    }


    window.addEventListener(
      "keydown",
      handleEscape
    );


    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, [show3DViewer]);


  function updateTooltipPosition(
    event
  ) {
    const tooltipWidth = 230;
    const tooltipHeight = 155;
    const offset = 16;

    const nextX =
      Math.max(
        offset,
        Math.min(
          event.clientX + offset,
          window.innerWidth -
            tooltipWidth -
            offset
        )
      );

    const nextY =
      Math.max(
        offset,
        Math.min(
          event.clientY + offset,
          window.innerHeight -
            tooltipHeight -
            offset
        )
      );

    setTooltipPosition({
      x: nextX,
      y: nextY,
    });
  }


  function getRoomFromEvent(
    event
  ) {
    const previewElement =
      camera.viewportRef.current;

    const roomGroup =
      getRoomGroupFromEvent(
        event,
        previewElement
      );

    if (!roomGroup) {
      return null;
    }

    const roomId =
      roomGroup.getAttribute(
        "id"
      );

    if (!roomId) {
      return null;
    }

    return (
      roomMap.get(roomId) ||
      null
    );
  }


  function handlePreviewPointerMove(
    event
  ) {
    camera.handlePointerMove(
      event
    );

    const room =
      getRoomFromEvent(event);

    if (!room) {
      setHoveredRoom(null);
      return;
    }

    setHoveredRoom(room);

    updateTooltipPosition(
      event
    );
  }


  function handlePreviewPointerLeave(
    event
  ) {
    camera.handlePointerLeave(
      event
    );

    setHoveredRoom(null);
  }


  function handlePreviewClick(
    event
  ) {
    const room =
      getRoomFromEvent(event);

    if (!room) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    setHoveredRoom(null);

    setSelectedRoomId(
      room.room_id
    );

    window.setTimeout(() => {
      scrollToRoomCard(
        room.room_id
      );
    }, 100);
  }


  function handleCardClick(
    roomId
  ) {
    setHoveredRoom(null);

    setSelectedRoomId(
      (currentRoomId) =>
        currentRoomId === roomId
          ? null
          : roomId
    );
  }


  function handleCardKeyDown(
    event,
    roomId
  ) {
    if (
      event.key !== "Enter" &&
      event.key !== " "
    ) {
      return;
    }

    event.preventDefault();

    handleCardClick(
      roomId
    );
  }


  function closeInspector() {
    setSelectedRoomId(null);
  }


  function open3DViewer() {
    console.log(
      "Opening complete 3D floor plan",
      {
        path: window.location.pathname,
        detectedRooms: rooms.length,
      }
    );

    if (!svgContent) {
      console.warn(
        "No uploaded SVG is available for the 3D preview."
      );

      return;
    }

    setShow3DViewer(true);
  }


  function openExteriorSlides() {
    if (!svgContent || !classification) {
      return;
    }

    window.localStorage.setItem(
      "zynoraUploadedSvgContent",
      svgContent
    );

    window.localStorage.setItem(
      "zynoraRoomClassification",
      JSON.stringify(classification)
    );

    navigate("/3d-design", {
      state: {
        svgContent,
        classification,
      },
    });
  }


  if (!classification) {
    return (
      <main className="uploadPlanPage">
        <section className="uploadPlanCard">
          <h1>
            No room predictions found
          </h1>

          <p>
            Upload an SVG floor plan before
            opening this page.
          </p>

          <button
            className="primaryBtn"
            type="button"
            onClick={() =>
              navigate(
                "/upload-plan"
              )
            }
          >
            Upload SVG
          </button>
        </section>
      </main>
    );
  }


  return (
    <main className="roomResultsPage">
      <section className="roomResultsHeader">
        <button
          className="backButton"
          type="button"
          onClick={() =>
            navigate(
              "/upload-plan"
            )
          }
        >
          ← Upload Another Plan
        </button>

        <p className="sectionEyebrow">
          ZYNORA V5 ANALYSIS
        </p>

        <h1>
          AI Room Classification
        </h1>

        <p>
          {classification.room_count}
          {" "}
          rooms were detected and
          classified.
        </p>


        <div className="classificationSummary">
          <div>
            <strong>
              {
                classification.summary
                  .high_confidence
              }
            </strong>

            <span>
              High confidence
            </span>
          </div>

          <div>
            <strong>
              {
                classification.summary
                  .review_recommended
              }
            </strong>

            <span>
              Review recommended
            </span>
          </div>

          <div>
            <strong>
              {
                classification.summary
                  .low_confidence
              }
            </strong>

            <span>
              Low confidence
            </span>
          </div>
        </div>


        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "12px",
            flexWrap: "wrap",
            marginTop: "22px",
          }}
        >
          <button
            className="primaryBtn"
            type="button"
            onClick={
              open3DViewer
            }
            disabled={
              !svgContent
            }
            style={{
              minWidth: "250px",
              padding: "13px 20px",
              borderRadius: "12px",
              fontWeight: 800,
              cursor: svgContent
                ? "pointer"
                : "not-allowed",
            }}
          >
            Generate Complete 3D Plan
          </button>

          <button
            className="primaryBtn"
            type="button"
            onClick={
              openExteriorSlides
            }
            disabled={
              !svgContent
            }
            style={{
              minWidth: "250px",
              padding: "13px 20px",
              borderRadius: "12px",
              border: "1px solid #1b8268",
              background: "#ffffff",
              color: "#176a57",
              fontWeight: 800,
              cursor: svgContent
                ? "pointer"
                : "not-allowed",
            }}
          >
            View 5 Exterior Slides
          </button>
        </div>
      </section>


      <section className="roomAnalysisLayout">
        <div className="svgPreviewPanel">
          <h2>
            Floor Plan Preview
          </h2>

          <p className="svgPreviewHint">
            Use the mouse wheel to zoom,
            drag to move the plan, and click
            a room to inspect it.
          </p>


          {svgContent ? (
            <SvgViewport
              ref={
                camera.viewportRef
              }
              svgContent={
                svgContent
              }
              camera={
                camera.transformStyle
              }
              onWheel={
                camera.handleWheel
              }
              onPointerDown={
                camera.handlePointerDown
              }
              onPointerMove={
                handlePreviewPointerMove
              }
              onPointerUp={
                camera.handlePointerUp
              }
              onPointerLeave={
                handlePreviewPointerLeave
              }
              onClick={
                handlePreviewClick
              }
            />
          ) : (
            <p>
              No SVG preview available.
            </p>
          )}


          <RoomInspector
            room={
              selectedRoom
            }
            roomIndex={
              selectedRoomIndex
            }
            onClose={
              closeInspector
            }
            onOpen3D={
              open3DViewer
            }
          />
        </div>


        <div className="roomCardsPanel">
          <section className="roomResultsGrid">
            {rooms.map(
              (
                room,
                index
              ) => {
                const isSelected =
                  selectedRoomId ===
                  room.room_id;

                const roomColor =
                  getRoomColor(
                    room
                      .predicted_room_type
                  );

                const topPredictions =
                  Object.entries(
                    room.probabilities ||
                      {}
                  )
                    .sort(
                      (
                        first,
                        second
                      ) =>
                        Number(
                          second[1]
                        ) -
                        Number(
                          first[1]
                        )
                    )
                    .slice(0, 3);


                return (
                  <article
                    id={
                      `room-card-${room.room_id}`
                    }
                    key={
                      room.room_id
                    }
                    className={
                      isSelected
                        ? "roomResultCard activeRoomCard"
                        : "roomResultCard"
                    }
                    style={{
                      "--room-card-color":
                        roomColor,
                    }}
                    role="button"
                    tabIndex={0}
                    aria-pressed={
                      isSelected
                    }
                    onClick={() =>
                      handleCardClick(
                        room.room_id
                      )
                    }
                    onKeyDown={(
                      event
                    ) =>
                      handleCardKeyDown(
                        event,
                        room.room_id
                      )
                    }
                  >
                    <div className="roomResultTop">
                      <span>
                        Room{" "}
                        {index + 1}
                      </span>

                      <span
                        className={
                          "confidenceBadge " +
                          room
                            .confidence_status
                        }
                      >
                        {
                          room
                            .confidence_percentage
                        }
                        %
                      </span>
                    </div>


                    <div className="roomTitleRow">
                      <span
                        className="roomColorIndicator"
                        style={{
                          backgroundColor:
                            roomColor,
                          color:
                            roomColor,
                        }}
                      />

                      <h2>
                        {
                          room
                            .predicted_room_type
                        }
                      </h2>
                    </div>


                    <p>
                      Original label:{" "}

                      <strong>
                        {
                          room
                            .original_room_type
                        }
                      </strong>
                    </p>


                    <div className="roomMetrics">
                      <span>
                        Area

                        <strong>
                          {Number(
                            room.area
                          ).toFixed(2)}
                        </strong>
                      </span>

                      <span>
                        Furniture

                        <strong>
                          {
                            room
                              .furniture_count
                          }
                        </strong>
                      </span>
                    </div>


                    <h3>
                      Top predictions
                    </h3>

                    <div className="topPredictions">
                      {topPredictions.map(
                        ([
                          className,
                          probability,
                        ]) => (
                          <div
                            key={
                              className
                            }
                          >
                            <span>
                              {
                                className
                              }
                            </span>

                            <strong>
                              {(
                                Number(
                                  probability
                                ) *
                                100
                              ).toFixed(2)}
                              %
                            </strong>
                          </div>
                        )
                      )}
                    </div>
                  </article>
                );
              }
            )}
          </section>
        </div>
      </section>


      {hoveredRoom && (
        <div
          className="svgRoomTooltip"
          style={{
            left:
              tooltipPosition.x,
            top:
              tooltipPosition.y,
          }}
        >
          <strong>
            {
              hoveredRoom
                .predicted_room_type
            }
          </strong>

          <span>
            Confidence:{" "}
            {
              hoveredRoom
                .confidence_percentage
            }
            %
          </span>

          <span>
            Area:{" "}
            {Number(
              hoveredRoom.area
            ).toFixed(2)}
          </span>

          <span>
            Furniture:{" "}
            {
              hoveredRoom
                .furniture_count
            }
          </span>
        </div>
      )}


      {show3DViewer && (
        <Room3DViewer
          onClose={() =>
            setShow3DViewer(
              false
            )
          }
          svgContent={
            svgContent
          }
          classification={
            classification
          }
        />
      )}
    </main>
  );
}


export default RoomClassification;

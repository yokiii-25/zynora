import {
  getRoomColor,
} from "../utils/roomColors";


function getConfidenceLabel(
  confidenceStatus
) {
  if (
    confidenceStatus ===
    "high_confidence"
  ) {
    return "High confidence";
  }

  if (
    confidenceStatus ===
    "review_recommended"
  ) {
    return "Review recommended";
  }

  return "Low confidence";
}


function getRoomRecommendations(
  roomType
) {
  const recommendations = {
    Kitchen: [
      "Maintain a clear work triangle between the sink, stove, and refrigerator.",
      "Provide strong task lighting above counters and cooking areas.",
      "Keep sufficient ventilation near the cooking zone.",
    ],

    Bedroom: [
      "Keep clear walking space around the bed.",
      "Place wardrobes away from window openings.",
      "Use layered lighting for sleeping, reading, and general use.",
    ],

    Bathroom: [
      "Separate wet and dry zones where possible.",
      "Use slip-resistant flooring.",
      "Provide adequate exhaust ventilation.",
    ],

    "Living Room": [
      "Arrange seating to maintain clear circulation.",
      "Use natural light as the primary daytime light source.",
      "Keep television glare away from direct windows.",
    ],

    Dining: [
      "Maintain comfortable clearance around the dining table.",
      "Use focused lighting above the dining area.",
      "Keep the dining zone close to the kitchen.",
    ],

    "Outdoor Area": [
      "Use weather-resistant materials.",
      "Provide shade and effective drainage.",
      "Maintain safe access from the interior.",
    ],

    "Entry Area": [
      "Keep the entrance path unobstructed.",
      "Add storage for shoes and frequently used items.",
      "Provide clear lighting near the doorway.",
    ],

    Laundry: [
      "Provide proper ventilation and drainage.",
      "Keep washing and storage areas organized.",
      "Use moisture-resistant finishes.",
    ],

    Storage: [
      "Use vertical storage to maximize capacity.",
      "Maintain a clear access path.",
      "Separate frequently and rarely used items.",
    ],
  };

  return (
    recommendations[roomType] || [
      "Maintain a clear circulation path.",
      "Use appropriate lighting for the room function.",
      "Choose durable materials suitable for daily use.",
    ]
  );
}


function getSuggestedMaterial(
  roomType
) {
  const materials = {
    Kitchen:
      "Granite or quartz counters with a ceramic backsplash",

    Bedroom:
      "Wood or laminate flooring with a soft wall finish",

    Bathroom:
      "Anti-slip tiles with a moisture-resistant wall finish",

    "Living Room":
      "Vitrified tiles or wood-finish flooring",

    Dining:
      "Durable flooring with an easy-clean wall finish",

    "Outdoor Area":
      "Weather-resistant tiles or natural stone",

    Laundry:
      "Anti-slip tiles and moisture-resistant paint",

    Storage:
      "Durable flooring and washable wall finish",
  };

  return (
    materials[roomType] ||
    "Durable flooring and washable wall finish"
  );
}


function RoomInspector({
  room,
  roomIndex,
  onClose,
  onOpen3D,
}) {
  if (!room) {
    return (
      <aside
        className={
          "roomInspector " +
          "emptyRoomInspector"
        }
      >
        <div className="roomInspectorEmptyIcon">
          🏠
        </div>

        <h2>
          Select a room
        </h2>

        <p>
          Click a room on the floor plan or
          choose a prediction card to view
          its AI analysis.
        </p>
      </aside>
    );
  }


  const roomColor =
    getRoomColor(
      room.predicted_room_type
    );

  const recommendations =
    getRoomRecommendations(
      room.predicted_room_type
    );

  const topPredictions =
    Object.entries(
      room.probabilities || {}
    )
      .sort(
        (
          first,
          second
        ) =>
          Number(second[1]) -
          Number(first[1])
      )
      .slice(0, 3);


  return (
    <aside
      className="roomInspector"
      style={{
        "--inspector-room-color":
          roomColor,
      }}
    >
      <div className="roomInspectorHeader">
        <div>
          <p className="roomInspectorEyebrow">
            ROOM {roomIndex + 1}
          </p>

          <div className="roomInspectorTitle">
            <span
              className="roomInspectorColor"
              style={{
                backgroundColor:
                  roomColor,
              }}
            />

            <h2>
              {
                room.predicted_room_type
              }
            </h2>
          </div>
        </div>

        <button
          type="button"
          className="roomInspectorClose"
          onClick={onClose}
          aria-label="Close room inspector"
        >
          ×
        </button>
      </div>


      <div className="roomInspectorConfidence">
        <div>
          <span>
            Confidence
          </span>

          <strong>
            {
              room.confidence_percentage
            }
            %
          </strong>
        </div>

        <div className="roomConfidenceTrack">
          <div
            className="roomConfidenceValue"
            style={{
              width:
                `${room.confidence_percentage}%`,
            }}
          />
        </div>

        <p>
          {getConfidenceLabel(
            room.confidence_status
          )}
        </p>
      </div>


      <div className="roomInspectorMetrics">
        <div>
          <span>
            Area
          </span>

          <strong>
            {Number(
              room.area
            ).toFixed(2)}
          </strong>
        </div>

        <div>
          <span>
            Furniture
          </span>

          <strong>
            {
              room.furniture_count
            }
          </strong>
        </div>
      </div>


      <section className="roomInspectorSection">
        <h3>
          Classification details
        </h3>

        <div className="roomInspectorRows">
          <div>
            <span>
              Original label
            </span>

            <strong>
              {
                room.original_room_type
              }
            </strong>
          </div>

          <div>
            <span>
              Predicted label
            </span>

            <strong>
              {
                room.predicted_room_type
              }
            </strong>
          </div>
        </div>
      </section>


      <section className="roomInspectorSection">
        <h3>
          Top predictions
        </h3>

        <div className="inspectorPredictions">
          {topPredictions.map(
            ([
              className,
              probability,
            ]) => (
              <div key={className}>
                <span>
                  {className}
                </span>

                <strong>
                  {(
                    Number(probability) *
                    100
                  ).toFixed(2)}
                  %
                </strong>
              </div>
            )
          )}
        </div>
      </section>


      <section className="roomInspectorSection">
        <h3>
          Suggested materials
        </h3>

        <p>
          {getSuggestedMaterial(
            room.predicted_room_type
          )}
        </p>
      </section>


      <section className="roomInspectorSection">
        <h3>
          AI suggestions
        </h3>

        <ul className="roomInspectorSuggestions">
          {recommendations.map(
            (recommendation) => (
              <li key={recommendation}>
                {recommendation}
              </li>
            )
          )}
        </ul>
      </section>


      <div className="roomInspectorActions">
        <button
          type="button"
          className="primaryBtn"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onOpen3D();
          }}
        >
          🏠 Generate 3D Room
        </button>
      </div>
    </aside>
  );
}


export default RoomInspector;
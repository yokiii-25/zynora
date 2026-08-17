import { Routes, Route } from "react-router-dom";
import "./App.css";

import Home from "./pages/Home";
import CreateProject from "./pages/CreateProject";
import Dashboard from "./pages/Dashboard";
import DesignResult from "./pages/DesignResult";
import SitePlanner from "./pages/SitePlanner";
import FloorPlan from "./pages/FloorPlan";
import ThreeDDesign from "./pages/ThreeDDesign";
import UploadPlan from "./pages/UploadPlan";
import RoomClassification from "./pages/RoomClassification";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/create-project" element={<CreateProject />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/design-result" element={<DesignResult />} />
      <Route path="/site-planner" element={<SitePlanner />} />
      <Route path="/floor-plan" element={<FloorPlan />} />
      <Route path="/3d-design" element={<ThreeDDesign />} />
      <Route path="/upload-plan" element={<UploadPlan />} />
      <Route path="/room-classification" element={<RoomClassification />} />
    </Routes>
  );
}

export default App;

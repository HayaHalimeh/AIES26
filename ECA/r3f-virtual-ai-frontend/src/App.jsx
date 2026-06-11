import { Loader } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Leva } from "leva";
import { Experience } from "./components/Experience";
import { UI } from "./components/UI";
import { Lipsync } from "wawa-lipsync";

export const lipsyncManager = new Lipsync();

function App() {
  return (
    <>
      <Loader />
      <Leva hidden/>
      <UI />
    </>
  );
}

export default App;


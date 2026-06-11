import { Loader } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Leva } from "leva";
import { UI } from "./components/UI";


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


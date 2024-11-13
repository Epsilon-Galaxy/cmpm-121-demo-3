// @deno-types="npm:@types/leaflet@^1.9.14"
//import leaflet, { control } from "leaflet";

// Style sheets
import "leaflet/dist/leaflet.css";
import "./style.css";

// Fix missing marker images
import "./leafletWorkaround.ts";

// Deterministic random number generator
//import luck from "./luck.ts";

//Reference to app div elemnt
const app: HTMLDivElement = document.querySelector<HTMLDivElement>("#app")!;

const controlPanelDiv = document.createElement("div");
controlPanelDiv.id = "controlPanel";
app.append(controlPanelDiv);

const mapDiv = document.createElement("div");
mapDiv.id = "map";
app.append(mapDiv);

//Insert latitude and longtitude of location into function.

//const CARDSHOP = leaflet.latLng(1, 1);

const testButton = document.createElement("button");
testButton.innerHTML = "TESTBUTTON";
testButton.style.backgroundColor = "white";
testButton.id = "testbutton";
console.log(testButton.id);
app.append(testButton);

testButton.addEventListener("click", () => {
  alert("button has been clicked");
});

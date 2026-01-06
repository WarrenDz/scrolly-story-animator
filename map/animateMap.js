import "@arcgis/map-components/components/arcgis-map";
import "@arcgis/map-components/components/arcgis-time-slider";
import "@arcgis/map-components/components/arcgis-expand";
import "@arcgis/core/assets/esri/themes/light/main.css";

// Animation configuration
import { animationConfig } from "./configAnimation.js";
import { slideAnimation } from "./animateOnSlide.js";
import {scrollAnimation } from "./animateOnScroll.js";

let slides = [];
let mapElement = null;
let mapView = null;
let timeSlider = null;
let isEmbedded = false;
let hashIndexLast = null;
let hashIndex = null;

export async function loadChoreography(path) {
    try {
        const response = await fetch(path);
        if (!response.ok) throw new Error(`Failed to fetch choreography: ${response.status}`);
        slides = await response.json();
        console.log("Loaded slides", slides);
        return slides;
    } catch (error) {
        console.error("Failed to load choreography:", error);
        throw error;
    }
}

export function configureMap(animationConfig) {
    // Try to find an existing map/scene element; otherwise create one dynamically
    const container = document.getElementById("mapContainer");
    if (!container) throw new Error("mapContainer not found in DOM");

    // Determine which component to create. animationConfig.itemType can be
    // 'webscene' to force a 3D scene; otherwise default to 2D map.
    const prefersScene = animationConfig && (animationConfig.itemType === 'webscene');
    const tagName = prefersScene ? 'arcgis-scene' : 'arcgis-map';

    // Check if the correct type of element already exists
    mapElement = container.querySelector(tagName);
    
    // If wrong type exists, remove it; if correct type doesn't exist, create one
    if (!mapElement) {
        // Remove any existing map/scene of the wrong type
        const existingElement = container.querySelector('arcgis-map, arcgis-scene');
        if (existingElement) {
            existingElement.remove();
        }
        
        mapElement = document.createElement(tagName);
        mapElement.id = 'map';
        // Insert the map/scene as first child so controls overlay correctly
        container.insertBefore(mapElement, container.firstChild);

        // Move any existing controls (animationControls, time expand/slider) into the map element
        const children = Array.from(container.querySelectorAll(':scope > *'));
        for (const child of children) {
            if (child !== mapElement) {
                mapElement.appendChild(child);
            }
        }
        console.log("Created new element:", mapElement);
    }

    mapElement.addEventListener("arcgisViewReadyChange", () => {
        mapView = mapElement.view;
    });

    try {
        console.log("Configured map with", animationConfig);
        if (animationConfig?.itemId) mapElement.setAttribute("item-id", animationConfig.itemId);
        if (animationConfig?.zoom) mapElement.setAttribute("zoom", animationConfig.zoom);
        if (animationConfig?.center) mapElement.setAttribute("center", animationConfig.center);
        timeSlider = document.querySelector('arcgis-time-slider');
        if (timeSlider && animationConfig?.timePlayRate !== undefined) timeSlider.setAttribute("play-rate", animationConfig.timePlayRate);
        if (animationConfig?.disableMapNav) {
            // if mapView is not yet ready, these handlers will be attached later when view is available
            const attachNavHandlers = () => {
                if (!mapView) return;
                mapView.on("mouse-wheel", (event) => {
                    event.stopPropagation();
                });
                mapView.on("drag", (event) => {
                    event.stopPropagation();
                });
            };
            // attempt immediate attach, otherwise attach once view is ready
            if (mapView) attachNavHandlers();
            else mapElement.addEventListener("arcgisViewReadyChange", attachNavHandlers, { once: true });
        }
        return mapElement;

    } catch (error) {
        console.error("Failed to configure map:", error);
    }
}

/**
 * Listen for changes in the URL hash and triggers slide animation
 * based on the corresponding index in slides.
 */
function setupHashListener() {
  window.addEventListener("hashchange", function () {
    console.log("Hash changed to: " + window.location.hash);
    const hashIndex = parseInt(window.location.hash.substring(1), 10);

    if (isNaN(hashIndex) || !slides[hashIndex]) {
      console.log("No valid hash index found.");
      return;
    }

    const currentSlide = slides[hashIndex];
    slideAnimation(currentSlide, mapView, timeSlider, isEmbedded);
  });
}

/**
 * Listen for postMessage events from the "storymap-controller" to coordinate map animations.
 * Determines whether the map is embedded and sets up hash animation if not.
 * Triggers scroll-based animations based on slide progress and static slide updates
 * when the slide index changes.
 */
function setupMessageListener() {
  window.addEventListener("message", (event) => {
    if (event.data.source !== "storymap-controller") return;

    const payload = event.data.payload;

    if (payload.isEmbedded) {
      // log("This story is being viewed via script embed - deferring to scroll animation.");
      isEmbedded = true;
    } else {
      // log("Map is not embedded — enabling hash-based navigation.");
      isEmbedded = false;
    }

    const currentSlide = slides[payload.slide];
    const nextSlide = slides[payload.slide + 1];

    // Scroll-based animation
    scrollAnimation(currentSlide, nextSlide, payload.progress, mapView, timeSlider);
    

    // Slide change detection
    if (payload.slide !== hashIndexLast) {
      hashIndexLast = payload.slide;
      slideAnimation(currentSlide, mapView, timeSlider, isEmbedded); // using isEmbedded to mute some property changes when viewed in embed
    }
  });
}

/**
 * Initializes the map animation environment.
 *
 * - Configures the ArcGIS map using a predefined animation configuration.
 * - Attaches a listener for the `arcgisViewReadyChange` event:
 *    • When the map view becomes ready, stores the view reference.
 *    • Immediately triggers the first slide animation to display initial content.
 * - Locates the ArcGIS time slider component in the DOM for temporal control.
 * - Loads the slide choreography sequence asynchronously from a JSON file.
 * - Sets up the progress slider listener to enable scroll-based animations.
 * - Updates navigation buttons to reflect the initial slide state.
 */
async function initMapAnimator() {
  // Load config and choreography in sequence and rethrow on failure
  try {
    mapElement = configureMap(animationConfig);
    mapElement.addEventListener("arcgisViewReadyChange", () => {
      mapView = mapElement.view;
      slideAnimation(slides[0], mapView, timeSlider, isEmbedded);
    });
    timeSlider = document.querySelector('arcgis-time-slider');
    slides = await loadChoreography(animationConfig.mapChoreography);
    setupHashListener();
    setupMessageListener();

  } catch (err) {
    console.error('initMapAnimator failed:', err);
    throw err;
  }
}

initMapAnimator();
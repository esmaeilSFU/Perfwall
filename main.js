// Three.js setup
let scene, camera, renderer, controls;
let wallGroup;
let currentImage = null;
let imageData = null;
let ground;
let humanFigure;

// Store dimension line objects globally
let dimensionObjects = {
  widthLine: null,
  heightLine: null,
  widthArrowLeft: null,
  widthArrowRight: null,
  heightArrowBottom: null,
  heightArrowTop: null,
  widthLabel: null,
  heightLabel: null,
};

// Add cost parameters
const MATERIAL_COSTS = {
  "brushed-metal": {
    pricePerSquareMeter: 150, // $150 per m²
    pricePerMeterOfHoles: 20, // $20 per meter of holes
  },
  "polished-silver": {
    pricePerSquareMeter: 200,
    pricePerMeterOfHoles: 25,
  },
  bronze: {
    pricePerSquareMeter: 180,
    pricePerMeterOfHoles: 22,
  },
  copper: {
    pricePerSquareMeter: 190,
    pricePerMeterOfHoles: 23,
  },
  gold: {
    pricePerSquareMeter: 250,
    pricePerMeterOfHoles: 30,
  },
  titanium: {
    pricePerSquareMeter: 220,
    pricePerMeterOfHoles: 28,
  },
  "dark-steel": {
    pricePerSquareMeter: 160,
    pricePerMeterOfHoles: 21,
  },
};

// Handle collapsible categories
function setupCollapsibleCategories() {
  const categories = document.querySelectorAll(".parameter-category");

  categories.forEach((category) => {
    const header = category.querySelector(".category-header");
    const content = category.querySelector(".category-content");
    const icon = header.querySelector("i");

    header.addEventListener("click", () => {
      const isExpanded = content.style.display === "block";
      content.style.display = isExpanded ? "none" : "block";
      icon.classList.toggle("fa-chevron-down");
      icon.classList.toggle("fa-chevron-right");
    });
  });
}

// Load default image
function loadDefaultImage() {
  const img = new Image();
  img.crossOrigin = "Anonymous"; // Enable CORS for the image
  img.onload = () => {
    // Create canvas to get image data
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    createWall();
  };
  // Using a free image from Unsplash
  img.src =
    "https://images.unsplash.com/photo-1682687220742-aba13b6e50ba?w=800&auto=format&fit=crop&q=60";
}

// Initialize the scene
function init() {
  // Create scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf8f8f8);

  // Create camera
  camera = new THREE.PerspectiveCamera(
    60, // FOV
    (window.innerWidth - 600) / window.innerHeight, // Adjusted aspect ratio for both sidebars
    0.1,
    1000
  );
  camera.position.set(0, 1, 8); // Raised position for better urban perspective
  camera.lookAt(0, 0, 0);

  // Create renderer with physical rendering for better materials
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth - 600, window.innerHeight); // Adjusted for both sidebars
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.physicallyCorrectLights = true;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.8; // Adjusted for urban environment
  document.getElementById("canvas-container").appendChild(renderer.domElement);

  // Add controls
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.target.set(0, 0, 0); // Look at the middle of the wall

  // Prevent camera from going below ground
  controls.maxPolarAngle = Math.PI / 1.8; // Restrict to 90 degrees (horizontal)
  controls.minPolarAngle = 0; // Restrict upward view to directly overhead
  controls.maxAzimuthAngle = Math.PI / 1.5; // Limit horizontal rotation
  controls.minAzimuthAngle = -Math.PI / 1.5; // Limit horizontal rotation
  controls.minDistance = 2; // Minimum zoom distance
  controls.maxDistance = 30; // Maximum zoom distance

  // Add lights for better material visualization
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
  directionalLight.position.set(5, 8, 5);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  directionalLight.shadow.camera.near = 0.5;
  directionalLight.shadow.camera.far = 500;
  directionalLight.shadow.camera.left = -50;
  directionalLight.shadow.camera.right = 50;
  directionalLight.shadow.camera.top = 50;
  directionalLight.shadow.camera.bottom = -50;
  scene.add(directionalLight);

  // Add environment map for reflections
  const envMapLoader = new THREE.CubeTextureLoader();
  const cityEnvMap = [
    "assets/VancouverConventionCentre/posx.jpg",
    "assets/VancouverConventionCentre/negx.jpg",
    "assets/VancouverConventionCentre/posy.jpg",
    "assets/VancouverConventionCentre/negy.jpg",
    "assets/VancouverConventionCentre/posz.jpg",
    "assets/VancouverConventionCentre/negz.jpg",
  ];

  envMapLoader.load(
    cityEnvMap,
    function (envMap) {
      scene.environment = envMap;
      scene.background = envMap;

      // Adjust renderer settings for bright modern environment
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 0.7; // Adjusted for brighter sky
      renderer.outputEncoding = THREE.sRGBEncoding;

      createGround();
      createWall();
      createHumanFigure();
    },
    undefined,
    function () {
      createGround();
      createWall();
      createHumanFigure();
    }
  );

  // Add event listeners
  window.addEventListener("resize", onWindowResize, false);
  setupParameterListeners();

  // Load default image
  loadDefaultImage();

  // Call this function after DOM is loaded
  document.addEventListener("DOMContentLoaded", () => {
    setupCollapsibleCategories();
  });
}

// Create the wall based on current parameters
function createWall() {
  if (wallGroup) {
    scene.remove(wallGroup);
    wallGroup.traverse((child) => {
      if (child.material) {
        child.material.dispose();
      }
      if (child.geometry) {
        child.geometry.dispose();
      }
    });
  }

  wallGroup = new THREE.Group();
  const parameters = getParameters();

  // Calculate panel dimensions
  const horizontalPanels = Math.ceil(
    parameters.wallWidth / parameters.panelWidth
  );
  const verticalPanels = parameters.verticalPanelDivision;

  // Calculate the width of the last panel
  const regularPanelWidth = parameters.panelWidth - parameters.panelGap;
  const totalRegularPanelsWidth =
    (horizontalPanels - 1) * parameters.panelWidth;
  const lastPanelWidth =
    parameters.wallWidth - totalRegularPanelsWidth - parameters.panelGap;

  const panelHeight =
    parameters.wallHeight / verticalPanels - parameters.panelGap;

  // Calculate costs for all panels
  let totalCosts = {
    total: 0,
    details: { panelArea: 0, totalHoleLength: 0, panelCost: 0, holeCost: 0 },
  };

  // Create panels
  for (let i = 0; i < horizontalPanels; i++) {
    for (let j = 0; j < verticalPanels; j++) {
      // Determine this panel's width
      const panelWidth =
        i === horizontalPanels - 1 ? lastPanelWidth : regularPanelWidth;

      // Calculate position with gap
      const x =
        -parameters.wallWidth / 2 +
        i * parameters.panelWidth +
        panelWidth / 2 +
        parameters.panelGap / 2;
      const y =
        (j - verticalPanels / 2 + 0.5) * (panelHeight + parameters.panelGap);

      // Create panel group
      const panelGroup = new THREE.Group();
      panelGroup.position.set(x, y, 0);

      const panelInfo = {
        i,
        j,
        width: panelWidth,
        height: panelHeight,
        totalX: horizontalPanels,
        totalY: verticalPanels,
      };

      const panel = createPanelWithHoles(
        createPanel(panelWidth, panelHeight, parameters),
        parameters,
        panelInfo
      );

      panelGroup.add(panel);
      panelGroup.castShadow = true;
      panelGroup.receiveShadow = true;
      wallGroup.add(panelGroup);

      // Get number of holes for this panel
      const numHoles =
        panel.children.filter(
          (child) => child instanceof THREE.InstancedMesh
        )[0]?.count || 0;

      // Add to total costs
      totalCosts.details.totalHoleLength += numHoles;
    }
  }

  // Calculate final costs using the total number of holes
  const finalCosts = calculateCosts(
    parameters,
    totalCosts.details.totalHoleLength
  );

  // Update cost display
  updateCostDisplay(finalCosts);

  scene.add(wallGroup);
  updateGroundPosition();
  createDimensionLines();
}

// Create panel with holes
function createPanelWithHoles(panel, parameters, panelInfo) {
  const panelGroup = new THREE.Group();
  panelGroup.position.copy(panel.position);
  panelGroup.rotation.copy(panel.rotation);

  // Enable shadows for the base panel
  panel.castShadow = true;
  panel.receiveShadow = true;

  // Add the base panel first
  panelGroup.add(panel);

  // Add flaps to all four sides
  const flapDepth = 0.1; // 10cm deep flaps
  const flapThickness = 0.0005; // 0.05cm thick flaps
  const flapMaterial = panel.material.clone();

  // Top flap
  const topFlapGeometry = new THREE.BoxGeometry(
    panelInfo.width,
    flapThickness,
    flapDepth
  );
  const topFlap = new THREE.Mesh(topFlapGeometry, flapMaterial);
  topFlap.position.set(
    0,
    panelInfo.height / 2 + flapThickness / 2,
    -flapDepth / 2
  );
  topFlap.castShadow = true;
  topFlap.receiveShadow = true;
  panelGroup.add(topFlap);

  // Bottom flap
  const bottomFlapGeometry = new THREE.BoxGeometry(
    panelInfo.width,
    flapThickness,
    flapDepth
  );
  const bottomFlap = new THREE.Mesh(bottomFlapGeometry, flapMaterial);
  bottomFlap.position.set(
    0,
    -panelInfo.height / 2 - flapThickness / 2,
    -flapDepth / 2
  );
  bottomFlap.castShadow = true;
  bottomFlap.receiveShadow = true;
  panelGroup.add(bottomFlap);

  // Left flap
  const leftFlapGeometry = new THREE.BoxGeometry(
    flapThickness,
    panelInfo.height,
    flapDepth
  );
  const leftFlap = new THREE.Mesh(leftFlapGeometry, flapMaterial);
  leftFlap.position.set(
    -panelInfo.width / 2 - flapThickness / 2,
    0,
    -flapDepth / 2
  );
  leftFlap.castShadow = true;
  leftFlap.receiveShadow = true;
  panelGroup.add(leftFlap);

  // Right flap
  const rightFlapGeometry = new THREE.BoxGeometry(
    flapThickness,
    panelInfo.height,
    flapDepth
  );
  const rightFlap = new THREE.Mesh(rightFlapGeometry, flapMaterial);
  rightFlap.position.set(
    panelInfo.width / 2 + flapThickness / 2,
    0,
    -flapDepth / 2
  );
  rightFlap.castShadow = true;
  rightFlap.receiveShadow = true;
  panelGroup.add(rightFlap);

  // If no image data, return the panel with flaps
  if (!imageData) return panelGroup;

  // Calculate the region of the image this panel represents
  const totalPanelWidth = parameters.wallWidth; // Use total wall width instead of calculated width
  const totalPanelHeight = parameters.wallHeight; // Use total wall height

  // Calculate the normalized position of this panel in the wall (0 to 1)
  const normalizedX = (panelInfo.i * parameters.panelWidth) / totalPanelWidth;
  const normalizedY =
    (panelInfo.j * (parameters.wallHeight / parameters.verticalPanelDivision)) /
    totalPanelHeight;

  // Map the normalized position to image coordinates
  const imageRegionX = Math.floor(normalizedX * imageData.width);
  const imageRegionY = Math.floor(normalizedY * imageData.height);

  // Calculate region width and height based on actual panel dimensions
  const imageRegionWidth = Math.floor(
    (panelInfo.width / totalPanelWidth) * imageData.width
  );
  const imageRegionHeight = Math.floor(
    (panelInfo.height / totalPanelHeight) * imageData.height
  );

  // Calculate the offset distance in meters
  const offsetDistance = parameters.offsetFromEdges * parameters.cellSize;

  // Calculate the available space for cells after applying offset
  const availableWidth = panelInfo.width - 2 * offsetDistance;
  const availableHeight = panelInfo.height - 2 * offsetDistance;

  // Calculate number of cells that can fit in the available space
  const holesX = Math.floor(availableWidth / parameters.cellSize);
  const holesY = Math.floor(availableHeight / parameters.cellSize);

  // Calculate the actual starting positions with centered alignment
  const startX =
    -panelInfo.width / 2 +
    offsetDistance +
    (availableWidth - holesX * parameters.cellSize) / 2;
  const startY =
    -panelInfo.height / 2 +
    offsetDistance +
    (availableHeight - holesY * parameters.cellSize) / 2;

  // Store all cell data before creating geometries
  const cellsData = [];

  // Collect all cell data
  for (let i = 0; i < holesX; i++) {
    for (let j = 0; j < holesY; j++) {
      // Calculate local cell position within panel
      const localX = startX + (i + 0.5) * parameters.cellSize;
      const localY = startY + (j + 0.5) * parameters.cellSize;
      const z = 0.01;

      // Map cell position to image region
      const imageX = imageRegionX + Math.floor((i / holesX) * imageRegionWidth);
      const imageY =
        imageRegionY + Math.floor((j / holesY) * imageRegionHeight);
      const pixelIndex = (imageY * imageData.width + imageX) * 4;

      // Calculate brightness
      const brightness =
        (imageData.data[pixelIndex] +
          imageData.data[pixelIndex + 1] +
          imageData.data[pixelIndex + 2]) /
        3;
      let normalizedBrightness = brightness / 255;

      // Use the invert parameter from HTML input
      if (parameters.invert) {
        normalizedBrightness = 1 - normalizedBrightness;
      }

      // Scale cell size between 0.07 and maxCellScale, then round to the nearest multiple of cellSizeRounding
      const unroundedSize =
        parameters.cellSize *
        (0.07 + normalizedBrightness * (parameters.maxCellScale - 0.07));
      const roundingValue = parameters.cellSizeRounding;
      const cellSize =
        Math.round(unroundedSize / roundingValue) * roundingValue;
      const halfSize = cellSize / 2;

      cellsData.push({
        position: { x: localX, y: localY, z },
        size: cellSize,
        halfSize: halfSize,
        rotation: parameters.cellRotation,
      });
    }
  }

  // Generate all shapes at once
  generateShapes(cellsData, parameters.cellShape, panelGroup);

  return panelGroup;
}

function generateShapes(cellsData, shapeType, panelGroup) {
  // Create base geometry based on shape type
  let geometry;
  switch (shapeType) {
    case 0: // Square
      geometry = new THREE.PlaneGeometry(1, 1);
      break;
    case 1: // Circle
      geometry = new THREE.CircleGeometry(0.5, 32);
      break;
    case 2: // Polygon
      const parameters = getParameters();
      const numSides = parameters.polygonSides;
      geometry = new THREE.CircleGeometry(0.5, numSides);
      break;
  }

  // Create material for holes (always black)
  const material = new THREE.MeshBasicMaterial({
    color: 0x000000,
    side: THREE.DoubleSide,
  });

  // Create instanced mesh
  const instancedMesh = new THREE.InstancedMesh(
    geometry,
    material,
    cellsData.length
  );

  // Temporary objects for matrix calculations
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();

  // Set each instance's transform
  cellsData.forEach((cell, index) => {
    const { position: pos, halfSize, rotation } = cell;
    position.set(pos.x, pos.y, pos.z);
    quaternion.setFromAxisAngle(
      new THREE.Vector3(0, 0, 1),
      (rotation * Math.PI) / 180
    );
    scale.set(halfSize * 2, halfSize * 2, 1);
    matrix.compose(position, quaternion, scale);
    instancedMesh.setMatrixAt(index, matrix);
  });

  instancedMesh.instanceMatrix.needsUpdate = true;
  panelGroup.add(instancedMesh);
}

// Helper function to create rounded rectangle geometry
function createRoundedRectangle(width, height, radius) {
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2 + radius, -height / 2);
  shape.lineTo(width / 2 - radius, -height / 2);
  shape.quadraticCurveTo(
    width / 2,
    -height / 2,
    width / 2,
    -height / 2 + radius
  );
  shape.lineTo(width / 2, height / 2 - radius);
  shape.quadraticCurveTo(width / 2, height / 2, width / 2 - radius, height / 2);
  shape.lineTo(-width / 2 + radius, height / 2);
  shape.quadraticCurveTo(
    -width / 2,
    height / 2,
    -width / 2,
    height / 2 - radius
  );
  shape.lineTo(-width / 2, -height / 2 + radius);
  shape.quadraticCurveTo(
    -width / 2,
    -height / 2,
    -width / 2 + radius,
    -height / 2
  );

  const geometry = new THREE.ShapeGeometry(shape);
  return geometry;
}

// Get current parameter values
function getParameters() {
  const getValue = (id, defaultValue, type = "float") => {
    const element = document.getElementById(id);
    if (!element) return defaultValue;
    if (type === "float") return parseFloat(element.value) || defaultValue;
    if (type === "int") return parseInt(element.value) || defaultValue;
    if (type === "string") return element.value || defaultValue;
    return element.value;
  };

  const getChecked = (id, defaultValue) => {
    const element = document.getElementById(id);
    return element ? element.checked : defaultValue;
  };

  return {
    wallWidth: getValue("wallWidth", 5),
    wallHeight: getValue("wallHeight", 4),
    panelWidth: getValue("panelWidth", 1.5),
    panelGap: getValue("panelGap", 0.05),
    verticalPanelDivision: getValue("verticalPanelDivision", 2, "int"),
    cellSize: getValue("cellSize", 0.1),
    cellSizeRounding: getValue("cellSizeRounding", 0.001),
    maxCellScale: getValue("maxCellScale", 1.0),
    cellShape: getValue("cellShape", 0, "int"),
    cellRotation: getValue("cellRotation", 0),
    invert: getChecked("invertImage", false),
    polygonSides: getValue("polygonSides", 6, "int"),
    panelMaterial: getValue("panelMaterial", "brushed-metal", "string"),
    offsetFromEdges: getValue("offsetFromEdges", 0.1),
  };
}

function getPanelMaterial(materialType) {
  const materials = {
    "brushed-metal": {
      color: 0x888888,
      metalness: 1.0,
      roughness: 0.5,
      envMapIntensity: 1.0,
      clearcoat: 0.3,
      clearcoatRoughness: 0.4,
      reflectivity: 0.8,
      ior: 3.0,
    },
    "polished-silver": {
      color: 0xf0f0f0,
      metalness: 1.0,
      roughness: 0.05,
      envMapIntensity: 2.5,
      clearcoat: 1.0,
      clearcoatRoughness: 0.01,
      reflectivity: 1.0,
      ior: 2.5,
    },
    bronze: {
      color: 0xcd7f32,
      metalness: 1.0,
      roughness: 0.3,
      envMapIntensity: 1.5,
      clearcoat: 0.4,
      clearcoatRoughness: 0.3,
      reflectivity: 0.7,
      ior: 2.8,
    },
    copper: {
      color: 0xca7245,
      metalness: 1.0,
      roughness: 0.2,
      envMapIntensity: 1.8,
      clearcoat: 0.5,
      clearcoatRoughness: 0.2,
      reflectivity: 0.8,
      ior: 2.7,
    },
    gold: {
      color: 0xffd700,
      metalness: 1.0,
      roughness: 0.1,
      envMapIntensity: 2.0,
      clearcoat: 0.8,
      clearcoatRoughness: 0.1,
      reflectivity: 1.0,
      ior: 2.8,
    },
    titanium: {
      color: 0x787878,
      metalness: 1.0,
      roughness: 0.4,
      envMapIntensity: 1.3,
      clearcoat: 0.6,
      clearcoatRoughness: 0.3,
      reflectivity: 0.75,
      ior: 2.9,
    },
    "dark-steel": {
      color: 0x1a1a1a,
      metalness: 1.0,
      roughness: 0.3,
      envMapIntensity: 1.2,
      clearcoat: 0.5,
      clearcoatRoughness: 0.2,
      reflectivity: 0.7,
      ior: 3.0,
    },
  };

  if (!materialType || !materials.hasOwnProperty(materialType)) {
    return materials["brushed-metal"];
  }

  const material = materials[materialType];
  return material;
}

// Setup parameter event listeners
function setupParameterListeners() {
  const parameters = [
    "wallWidth",
    "wallHeight",
    "panelWidth",
    "panelGap",
    "verticalPanelDivision",
    "cellSize",
    "cellSizeRounding",
    "maxCellScale",
    "cellShape",
    "cellRotation",
    "polygonSides",
    "offsetFromEdges",
  ];

  parameters.forEach((param) => {
    const element = document.getElementById(param);
    if (!element) {
      return;
    }

    if (element.type === "range") {
      const valueDisplay = document.getElementById(param + "Value");
      if (valueDisplay) {
        element.addEventListener("input", (e) => {
          // Format the display value based on the parameter
          if (param === "cellSizeRounding" || param === "maxCellScale") {
            valueDisplay.textContent = parseFloat(e.target.value).toFixed(2);
          } else {
            valueDisplay.textContent = e.target.value;
          }
          createWall();
        });
      }
    } else if (element.type === "checkbox" || element.type === "select-one") {
      element.addEventListener("change", () => {
        createWall();
      });
    }
  });

  // Add cell shape change handler to toggle polygon sides input
  const cellShapeSelect = document.getElementById("cellShape");
  const polygonSidesGroup = document.getElementById("polygonSidesGroup");
  const polygonSidesInput = document.getElementById("polygonSides");

  if (cellShapeSelect && polygonSidesGroup && polygonSidesInput) {
    // Initial state
    polygonSidesGroup.style.display =
      cellShapeSelect.value === "2" ? "block" : "none";
    polygonSidesInput.disabled = cellShapeSelect.value !== "2";

    // Add change handler
    cellShapeSelect.addEventListener("change", (e) => {
      const isPolygon = e.target.value === "2";
      polygonSidesGroup.style.display = isPolygon ? "block" : "none";
      polygonSidesInput.disabled = !isPolygon;
      createWall();
    });
  }

  // Material change handler
  const materialSelect = document.getElementById("panelMaterial");
  if (materialSelect) {
    materialSelect.addEventListener("change", () => {
      createWall();
    });
  }

  // Image upload handler
  const imageFileInput = document.getElementById("imageFile");
  if (imageFileInput) {
    imageFileInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const img = new Image();
          img.onload = () => {
            // Create canvas to get image data
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0);
            imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            createWall();
          };
          img.src = event.target.result;
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // Add event listener for the invert checkbox
  const invertImageCheckbox = document.getElementById("invertImage");
  if (invertImageCheckbox) {
    invertImageCheckbox.addEventListener("change", function () {
      createWall();
    });
  }

  // Add event listener for the rotate button
  const rotateButton = document.getElementById("rotateImage");
  if (rotateButton) {
    rotateButton.addEventListener("click", function () {
      if (imageData) {
        imageData = rotateImageData90Degrees(imageData);
        createWall();
      }
    });
  }

  // Update ground position when wall height changes
  const wallHeightInput = document.getElementById("wallHeight");
  if (wallHeightInput) {
    wallHeightInput.addEventListener("input", () => {
      updateGroundPosition();
    });
  }
}

// Handle window resize
function onWindowResize() {
  camera.aspect = (window.innerWidth - 600) / window.innerHeight; // Adjusted for both sidebars
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth - 600, window.innerHeight); // Adjusted for both sidebars
}

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

// Add this function to rotate the image data
function rotateImageData90Degrees(imageData) {
  const width = imageData.width;
  const height = imageData.height;
  const newImageData = new ImageData(height, width);

  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      const sourceIndex = (y * width + x) * 4;
      // In the rotated image, x becomes y, and y becomes (width - 1 - x)
      const destIndex = (x * height + (height - 1 - y)) * 4;

      newImageData.data[destIndex] = imageData.data[sourceIndex];
      newImageData.data[destIndex + 1] = imageData.data[sourceIndex + 1];
      newImageData.data[destIndex + 2] = imageData.data[sourceIndex + 2];
      newImageData.data[destIndex + 3] = imageData.data[sourceIndex + 3];
    }
  }
  return newImageData;
}

// Update ground position when wall parameters change
function updateGroundPosition() {
  if (ground) {
    const parameters = getParameters();
    const groundY = -parameters.wallHeight / 2 - 0.01;
    const groundX = -parameters.wallWidth / 2 - 0.01;
    ground.position.y = groundY;
    ground.position.x = groundX;
    ground.position.z = -2; // Keep ground slightly behind wall

    // Update human figure position if it exists
    if (humanFigure) {
      humanFigure.position.y = -parameters.wallHeight / 2 + 1.8; // Correct position for human figure
      humanFigure.position.x = -parameters.wallWidth / 2 - 0.01; // Correct position for human figure
    }
  }
}

// Add function to create ground
function createGround() {
  const parameters = getParameters();
  const textureLoader = new THREE.TextureLoader();

  // Use concrete texture
  const textureUrl = "assets/concrete.jpg";

  // Load texture
  textureLoader
    .loadAsync(textureUrl)
    .then((colorMap) => {
      // Set texture properties
      colorMap.wrapS = colorMap.wrapT = THREE.RepeatWrapping;
      colorMap.repeat.set(100, 100); // Large repeat for the ground
      colorMap.encoding = THREE.sRGBEncoding;

      // Create ground plane with larger size
      const groundGeometry = new THREE.PlaneGeometry(1000, 1000);
      const groundMaterial = new THREE.MeshPhysicalMaterial({
        map: colorMap,
        roughness: 0.9,
        metalness: 0.0,
        envMapIntensity: 0.5,
        side: THREE.DoubleSide,
        color: 0xffffff, // White color to show texture clearly
      });

      if (ground) {
        scene.remove(ground);
        ground.geometry.dispose();
        ground.material.dispose();
      }

      ground = new THREE.Mesh(groundGeometry, groundMaterial);
      ground.rotation.x = -Math.PI / 2; // Rotate to be horizontal
      ground.position.y = -parameters.wallHeight / 2 - 0.01; // Position just below the wall
      ground.position.z = -2; // Move slightly back
      ground.receiveShadow = true;
      scene.add(ground);
    })
    .catch(() => {
      // Fallback to simple material if texture fails to load
      const groundGeometry = new THREE.PlaneGeometry(1000, 1000);
      const groundMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xcccccc,
        roughness: 0.9,
        metalness: 0.0,
        envMapIntensity: 0.5,
        side: THREE.DoubleSide,
      });

      if (ground) {
        scene.remove(ground);
        ground.geometry.dispose();
        ground.material.dispose();
      }

      ground = new THREE.Mesh(groundGeometry, groundMaterial);
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = -parameters.wallHeight / 2 - 0.01;
      ground.position.z = -2;
      ground.receiveShadow = true;
      scene.add(ground);
    });
}

// Add dimension lines and labels
function createDimensionLines() {
  const parameters = getParameters();
  const wallWidth = parameters.wallWidth;
  const wallHeight = parameters.wallHeight;

  // If dimension objects don't exist, create them
  if (!dimensionObjects.widthLine) {
    // Create dimension line material
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x000000,
      linewidth: 2, // Reduced line width
    });

    // Create width line
    dimensionObjects.widthLine = new THREE.Line(
      new THREE.BufferGeometry(),
      lineMaterial
    );
    dimensionObjects.widthLine.name = "dimension-line-width";

    // Create height line
    dimensionObjects.heightLine = new THREE.Line(
      new THREE.BufferGeometry(),
      lineMaterial
    );
    dimensionObjects.heightLine.name = "dimension-line-height";

    // Create arrows
    dimensionObjects.widthArrowLeft = createArrowCap(0, 0, 0, Math.PI / 2);
    dimensionObjects.widthArrowRight = createArrowCap(0, 0, 0, -Math.PI / 2);
    dimensionObjects.heightArrowBottom = createArrowCap(0, 0, 0, 0);
    dimensionObjects.heightArrowTop = createArrowCap(0, 0, 0, Math.PI);

    // Create labels
    dimensionObjects.widthLabel = createTextLabel("", 0, 0, 0);
    dimensionObjects.widthLabel.scale.set(0.8, 0.4, 0.8); // Reduced scale
    dimensionObjects.heightLabel = createTextLabel("", 0, 0, 0);
    dimensionObjects.heightLabel.scale.set(0.8, 0.4, 0.8); // Reduced scale

    // Add everything to the scene
    scene.add(dimensionObjects.widthLine);
    scene.add(dimensionObjects.heightLine);
    scene.add(dimensionObjects.widthArrowLeft);
    scene.add(dimensionObjects.widthArrowRight);
    scene.add(dimensionObjects.heightArrowBottom);
    scene.add(dimensionObjects.heightArrowTop);
    scene.add(dimensionObjects.widthLabel);
    scene.add(dimensionObjects.heightLabel);
  }

  // Update width line positions with smaller offset
  const widthPoints = [
    new THREE.Vector3(-wallWidth / 2, wallHeight / 2 + 0.3, 0.5), // Reduced offset
    new THREE.Vector3(wallWidth / 2, wallHeight / 2 + 0.3, 0.5),
  ];
  dimensionObjects.widthLine.geometry.dispose();
  dimensionObjects.widthLine.geometry =
    new THREE.BufferGeometry().setFromPoints(widthPoints);

  // Update height line positions with smaller offset
  const heightPoints = [
    new THREE.Vector3(wallWidth / 2 + 0.3, -wallHeight / 2, 0.5), // Reduced offset
    new THREE.Vector3(wallWidth / 2 + 0.3, wallHeight / 2, 0.5),
  ];
  dimensionObjects.heightLine.geometry.dispose();
  dimensionObjects.heightLine.geometry =
    new THREE.BufferGeometry().setFromPoints(heightPoints);

  // Update arrow positions with smaller offset
  dimensionObjects.widthArrowLeft.position.set(
    wallWidth / 2,
    wallHeight / 2 + 0.3, // Reduced offset
    0.5
  );
  dimensionObjects.widthArrowRight.position.set(
    -wallWidth / 2,
    wallHeight / 2 + 0.3, // Reduced offset
    0.5
  );
  dimensionObjects.heightArrowBottom.position.set(
    wallWidth / 2 + 0.3, // Reduced offset
    -wallHeight / 2,
    0.5
  );
  dimensionObjects.heightArrowTop.position.set(
    wallWidth / 2 + 0.3, // Reduced offset
    wallHeight / 2,
    0.5
  );

  // Update label positions and text with smaller offset
  updateDimensionLabel(
    dimensionObjects.widthLabel,
    `${wallWidth.toFixed(1)}m`,
    0,
    wallHeight / 2 + 0.5, // Reduced offset
    0.5
  );
  updateDimensionLabel(
    dimensionObjects.heightLabel,
    `${wallHeight.toFixed(1)}m`,
    wallWidth / 2 + 0.5, // Reduced offset
    0,
    0.5
  );
  dimensionObjects.heightLabel.material.rotation = Math.PI / 2;
}

// Helper function to update dimension label
function updateDimensionLabel(sprite, text, x, y, z) {
  const canvas = sprite.material.map.image;
  const context = canvas.getContext("2d");

  // Clear canvas
  context.clearRect(0, 0, canvas.width, canvas.height);

  // Draw new text
  context.font = "Bold 140px Arial";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = "black";
  context.fillText(text, canvas.width / 2, canvas.height / 2);

  // Update sprite
  sprite.material.map.needsUpdate = true;
  sprite.position.set(x, y, z);
}

// Helper function to create arrow caps with improved visibility
function createArrowCap(x, y, z, rotation) {
  const arrowGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-0.05, 0.1, 0), // Reduced arrow size
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.05, 0.1, 0),
  ]);
  const arrow = new THREE.Line(
    arrowGeometry,
    new THREE.LineBasicMaterial({
      color: 0x000000,
      linewidth: 2, // Reduced line width
    })
  );
  arrow.position.set(x, y, z);
  arrow.rotation.z = rotation;
  return arrow;
}

// Helper function to create text labels with improved visibility
function createTextLabel(text, x, y, z) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  canvas.width = 512;
  canvas.height = 256;

  // Make canvas transparent
  context.clearRect(0, 0, canvas.width, canvas.height);

  // Draw text with smaller font
  context.font = "Bold 100px Arial"; // Reduced font size
  context.textAlign = "center";
  context.textBaseline = "middle";

  // Draw black text only (no outline)
  context.fillStyle = "black";
  context.fillText(text, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.transparent = true;
  const spriteMaterial = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
  });
  const sprite = new THREE.Sprite(spriteMaterial);

  sprite.position.set(x, y, z);
  return sprite;
}

// Add function to create human figure
function createHumanFigure() {
  // Create a GLTF loader
  const loader = new THREE.GLTFLoader();

  // Load the human model
  loader.load(
    "assets/human/scene.gltf",
    function (gltf) {
      const model = gltf.scene;

      // First, get the bounding box before scaling
      const bbox = new THREE.Box3().setFromObject(model);
      const size = bbox.getSize(new THREE.Vector3());

      // Scale the model to approximately 1.8 meters tall
      const desiredHeight = 1.9;
      const scale = desiredHeight / size.y;
      model.scale.setScalar(scale);

      // Update bounding box after scaling
      bbox.setFromObject(model);

      // Position the model on the ground
      const parameters = getParameters();
      model.position.set(
        -parameters.wallWidth / 2 - 0.3, // 0.3 meters to the left of the wall
        -parameters.wallHeight / 2 + 1.8, // Correct position for human figure
        0.5 // Slightly in front of the wall
      );

      // Enable shadows and improve materials
      model.traverse(function (node) {
        if (node.isMesh) {
          node.castShadow = true;
          node.receiveShadow = true;

          if (node.material) {
            // Make material double-sided
            node.material.side = THREE.DoubleSide;
            // Enhance material properties
            node.material.envMap = scene.environment;
            node.material.envMapIntensity = 1;
            node.material.needsUpdate = true;
          }
        }
      });

      // Remove existing human figure if it exists
      if (humanFigure) {
        scene.remove(humanFigure);
      }

      // Store the human figure globally and add to scene
      humanFigure = model;
      scene.add(humanFigure);

      // Ensure the model is visible in the scene
      model.updateMatrixWorld(true);
    },
    undefined,
    function (error) {
      createSimpleFallbackFigure();
    }
  );
}

// Wrap the initialization code in a DOMContentLoaded event listener
document.addEventListener("DOMContentLoaded", function () {
  setupCollapsibleCategories();
  setupOrderForm();
  init();
  animate();
});

// Calculate total cost
function calculateCosts(parameters, numHoles) {
  const material = MATERIAL_COSTS[parameters.panelMaterial];
  if (!material) return { total: 0, details: {} };

  // Calculate panel dimensions
  const horizontalPanels = Math.ceil(
    parameters.wallWidth / parameters.panelWidth
  );
  const verticalPanels = parameters.verticalPanelDivision;
  const regularPanelWidth = parameters.panelWidth - parameters.panelGap;
  const totalRegularPanelsWidth =
    (horizontalPanels - 1) * parameters.panelWidth;
  const lastPanelWidth =
    parameters.wallWidth - totalRegularPanelsWidth - parameters.panelGap;
  const panelHeight =
    parameters.wallHeight / verticalPanels - parameters.panelGap;

  // Calculate total panel area for all panels (both regular and last panels)
  const regularPanelsArea =
    (horizontalPanels - 1) * regularPanelWidth * panelHeight * verticalPanels;
  const lastPanelArea = lastPanelWidth * panelHeight * verticalPanels;
  const panelArea = regularPanelsArea + lastPanelArea;

  // Calculate total length of holes
  let totalHoleLength = 0;
  if (numHoles > 0) {
    // Calculate circumference based on shape
    let circumference;
    switch (parameters.cellShape) {
      case 0: // Square
        circumference = parameters.cellSize * 4;
        break;
      case 1: // Circle
        circumference = parameters.cellSize * Math.PI;
        break;
      case 2: // Polygon
        const numSides = parameters.polygonSides;
        circumference =
          parameters.cellSize * numSides * Math.sin(Math.PI / numSides);
        break;
    }
    totalHoleLength = circumference * numHoles;
  }

  // Calculate costs
  const panelCost = panelArea * material.pricePerSquareMeter;
  const holeCost = totalHoleLength * material.pricePerMeterOfHoles;
  const totalCost = panelCost + holeCost;

  return {
    total: totalCost,
    details: {
      panelArea,
      totalHoleLength,
      panelCost,
      holeCost,
      materialPrice: material.pricePerSquareMeter,
      holePrice: material.pricePerMeterOfHoles,
    },
  };
}

// Update cost display
function updateCostDisplay(costs) {
  const costDisplay = document.getElementById("costDisplay");
  if (!costDisplay) return;

  const { total, details } = costs;
  costDisplay.innerHTML = `
    <div class="cost-section">
      <div class="cost-item">
        <span style="color: #333;">Panel Area:</span>
        <span style="color: #333;">${details.panelArea.toFixed(2)} m²</span>
      </div>
      <div class="cost-item">
        <span style="color: #333;">Total Hole Length:</span>
        <span style="color: #333;">${details.totalHoleLength.toFixed(
          2
        )} m</span>
      </div>
      <div class="cost-item">
        <span style="color: #333;">Panel Cost (${
          details.materialPrice
        }$/m²):</span>
        <span style="color: #333;">$${details.panelCost.toFixed(2)}</span>
      </div>
      <div class="cost-item">
        <span style="color: #333;">Hole Cost (${details.holePrice}$/m):</span>
        <span style="color: #333;">$${details.holeCost.toFixed(2)}</span>
      </div>
      <div class="cost-item total">
        <span style="color: #000; font-weight: bold;">Total Cost:</span>
        <span style="color: #000; font-weight: bold;">$${total.toFixed(
          2
        )}</span>
      </div>
    </div>
  `;

  // Update order summary
  updateOrderSummary(details, total);
}

// Update order summary
function updateOrderSummary(details, total) {
  const orderSummary = document.getElementById("orderSummary");
  if (!orderSummary) return;

  const parameters = getParameters();
  orderSummary.innerHTML = `
    <li>Wall Dimensions: ${parameters.wallWidth}m × ${
    parameters.wallHeight
  }m</li>
    <li>Panel Material: ${parameters.panelMaterial}</li>
    <li>Cell Shape: ${
      parameters.cellShape === 0
        ? "Square"
        : parameters.cellShape === 1
        ? "Circle"
        : "Polygon"
    }</li>
    <li>Total Panels: ${
      Math.ceil(parameters.wallWidth / parameters.panelWidth) *
      parameters.verticalPanelDivision
    }</li>
    <li>Total Area: ${details.panelArea.toFixed(2)} m²</li>
    <li>Total Holes: ${details.totalHoleLength.toFixed(2)} m</li>
    <li style="font-weight: bold; color: #000;">Total Cost: $${total.toFixed(
      2
    )}</li>
  `;
}

// Setup order form handler
function setupOrderForm() {
  const placeOrderButton = document.getElementById("placeOrder");
  if (!placeOrderButton) return;

  placeOrderButton.addEventListener("click", () => {
    const customerName = document.getElementById("customerName").value;
    const customerEmail = document.getElementById("customerEmail").value;
    const customerPhone = document.getElementById("customerPhone").value;
    const orderNotes = document.getElementById("orderNotes").value;

    // Basic validation
    if (!customerName || !customerEmail || !customerPhone) {
      alert("Please fill in all required fields (Name, Email, and Phone)");
      return;
    }

    // Create order object
    const order = {
      customer: {
        name: customerName,
        email: customerEmail,
        phone: customerPhone,
        notes: orderNotes,
      },
      specifications: getParameters(),
      costs: calculateCosts(
        getParameters(),
        totalCosts.details.totalHoleLength
      ),
    };

    // Here you would typically send the order to your backend
    console.log("Order placed:", order);

    // Show success message
    alert("Order placed successfully! We will contact you shortly.");

    // Clear form
    document.getElementById("customerName").value = "";
    document.getElementById("customerEmail").value = "";
    document.getElementById("customerPhone").value = "";
    document.getElementById("orderNotes").value = "";
  });
}

// Create base panel
function createPanel(width, height, parameters) {
  // Create panel geometry
  const panelGeometry = new THREE.PlaneGeometry(width, height);

  // Get material parameters
  const materialParams = getPanelMaterial(parameters.panelMaterial);

  // Create panel material
  const panelMaterial = new THREE.MeshPhysicalMaterial({
    color: materialParams.color,
    metalness: materialParams.metalness,
    roughness: materialParams.roughness,
    envMapIntensity: materialParams.envMapIntensity,
    clearcoat: materialParams.clearcoat,
    clearcoatRoughness: materialParams.clearcoatRoughness,
    reflectivity: materialParams.reflectivity,
    ior: materialParams.ior,
    side: THREE.DoubleSide,
  });

  // Create panel mesh
  const panel = new THREE.Mesh(panelGeometry, panelMaterial);

  // Enable shadows
  panel.castShadow = false;
  panel.receiveShadow = false;

  return panel;
}

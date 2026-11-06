import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  X,
  RotateCcw,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Layers,
  Palette,
  Camera,
  ZoomIn,
  ZoomOut,
  Send,
  Scissors,
  Check,
  Compass,
  Upload,
  Trash2,
  Image as ImageIcon,
} from 'lucide-react';
import { Gender, StylePreference } from '../types';
import { sanitizeInput } from '../lib/security';
import { saveStudioItemToFirestore } from '../lib/firestoreData';
import { useAuth } from '../context/AuthContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  gender: Gender;
  stylePreference: StylePreference;
  activeColorHex?: string;
  lookTitle?: string;
}

interface OutfitSpec {
  lookName: string;
  fabricTexture: string;
  silhouetteFit: string;
  colorSwatches: { name: string; hex: string }[];
  tailoringGuidelines: string;
}

export const ThreeFashionRunwayModal: React.FC<Props> = ({
  isOpen,
  onClose,
  gender,
  stylePreference,
  activeColorHex = '#0f766e',
  lookTitle = 'Bespoke Pakistani Ensemble',
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const photoMeshRef = useRef<THREE.Mesh | null>(null);
  const photoStandGroupRef = useRef<THREE.Group | null>(null);
  const { currentUser } = useAuth();

  const [isControlsCollapsed, setIsControlsCollapsed] = useState(false);
  const [activeAnglePreset, setActiveAnglePreset] = useState<'front' | 'side' | 'back'>('front');
  const [selectedPalette, setSelectedPalette] = useState<string>(activeColorHex);
  const [fabricFinish, setFabricFinish] = useState<'raw-silk' | 'velvet' | 'brocade'>('raw-silk');
  const [isTurntableActive, setIsTurntableActive] = useState<boolean>(true);

  // Custom Outfit Photo Upload & 360 Viewer State
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string | null>(() => {
    try {
      return localStorage.getItem(`pg_3d_uploaded_photo_${currentUser?.uid || 'guest'}`);
    } catch {
      return null;
    }
  });
  const [viewDisplayMode, setViewDisplayMode] = useState<'mannequin' | 'photoStand' | 'both'>('mannequin');

  // Custom prompt dress studio state
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [isRenderingLook, setIsRenderingLook] = useState<boolean>(false);

  // Dynamic bottom spec card details
  const [outfitSpec, setOutfitSpec] = useState<OutfitSpec>({
    lookName: lookTitle,
    fabricTexture: '100% Pure Raw Silk with high tensile handloom sheen',
    silhouetteFit: gender === 'women' ? 'Flared Anarkali Silhouette with Tapered Waist' : 'Structured Slim-Fit Sherwani Cut with Crisp Chest Pad',
    colorSwatches: [
      { name: 'Primary Regal', hex: activeColorHex },
      { name: 'Antique Gold Tilla', hex: '#d4af37' },
      { name: 'Ivory Latha Trim', hex: '#f8fafc' },
      { name: 'Midnight Accent', hex: '#0f172a' },
    ],
    tailoringGuidelines: '1.25-inch Mandarin Ban collar, concealed inner placket, knife-pleat flare and contrast silk lining.',
  });

  // Dynamic 3D references for live updates
  const sceneElementsRef = useRef<{
    mannequinGroup: THREE.Group | null;
    garmentMaterials: THREE.MeshPhysicalMaterial[];
    buttonMaterials: THREE.MeshStandardMaterial[];
    goldTrimMaterials: THREE.MeshStandardMaterial[];
  }>({
    mannequinGroup: null,
    garmentMaterials: [],
    buttonMaterials: [],
    goldTrimMaterials: [],
  });

  // Handle parsing custom dress prompt
  const handleRenderCustomLook = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanPrompt = sanitizeInput(customPrompt.trim());
    const prompt = cleanPrompt.toLowerCase();
    if (!prompt) return;

    setIsRenderingLook(true);

    // Color detection
    let detectedHex = selectedPalette;
    let colorName = 'Bespoke Hue';
    if (prompt.includes('royal blue') || prompt.includes('navy') || prompt.includes('blue')) {
      detectedHex = '#1e3a8a';
      colorName = 'Royal Midnight Blue';
    } else if (prompt.includes('emerald') || prompt.includes('green') || prompt.includes('sabz')) {
      detectedHex = '#064e3b';
      colorName = 'Mughal Emerald Green';
    } else if (prompt.includes('red') || prompt.includes('maroon') || prompt.includes('ruby') || prompt.includes('crimson')) {
      detectedHex = '#881337';
      colorName = 'Royal Ruby Velvet';
    } else if (prompt.includes('black') || prompt.includes('jet') || prompt.includes('siah')) {
      detectedHex = '#09090b';
      colorName = 'Jet Black Boski';
    } else if (prompt.includes('gold') || prompt.includes('mustard') || prompt.includes('amber')) {
      detectedHex = '#b45309';
      colorName = 'Raw Amber Tilla';
    } else if (prompt.includes('white') || prompt.includes('ivory') || prompt.includes('offwhite') || prompt.includes('latha')) {
      detectedHex = '#f8fafc';
      colorName = 'Ivory Cotton Latha';
    } else if (prompt.includes('pink') || prompt.includes('blush') || prompt.includes('rose')) {
      detectedHex = '#be185d';
      colorName = 'Gulabi Rose Petal';
    }

    // Fabric detection
    let detectedFinish: 'raw-silk' | 'velvet' | 'brocade' = fabricFinish;
    let fabricText = outfitSpec.fabricTexture;
    if (prompt.includes('velvet') || prompt.includes('makhmal')) {
      detectedFinish = 'velvet';
      fabricText = 'Micro-Plush Royal Velvet with low-pile light absorption and gold zari embroidery';
    } else if (prompt.includes('brocade') || prompt.includes('banarsi') || prompt.includes('jamawar')) {
      detectedFinish = 'brocade';
      fabricText = 'Authentic Banarsi Brocade woven with metallic gold zari motifs';
    } else if (prompt.includes('silk') || prompt.includes('raw silk') || prompt.includes('boski')) {
      detectedFinish = 'raw-silk';
      fabricText = 'Pure 80g Raw Silk with subtle tactile slub texture';
    }

    // Apply updates
    setTimeout(() => {
      setSelectedPalette(detectedHex);
      setFabricFinish(detectedFinish);
      const newSpec = {
        lookName: cleanPrompt.slice(0, 42) || 'Custom 3D Look',
        fabricTexture: fabricText,
        silhouetteFit: prompt.includes('kurta')
          ? 'Straight-Cut Festive Kurta with 38-inch Daman'
          : prompt.includes('anarkali') || prompt.includes('gown')
          ? 'Full-Flared 16-Kali Kalidar Ensemble with Gota Patti'
          : prompt.includes('sherwani')
          ? 'Structured Aristocratic Sherwani with Shoulder Epaulets'
          : gender === 'women'
          ? 'Tailored Zanana Kurti with Organza Duppata Drape'
          : 'Classic Mardana Sherwani with Knife-Pleat Shalwar',
        colorSwatches: [
          { name: colorName, hex: detectedHex },
          { name: 'Antique Gold Tilla', hex: '#d4af37' },
          { name: 'Accent Trim', hex: '#e2e8f0' },
          { name: 'Shadow Depth', hex: '#020617' },
        ],
        tailoringGuidelines: `Master Darzi cut: ${
          detectedFinish === 'velvet'
            ? 'Interlined fusible canvas, bias piping, heavy metal snap buttons.'
            : 'French seams, hand-rolled hem, 1.25" ban collar with concealed stitch.'
        }`,
      };

      setOutfitSpec(newSpec);
      setIsRenderingLook(false);

      if (currentUser?.uid) {
        saveStudioItemToFirestore(currentUser.uid, {
          id: 'runway_' + Date.now(),
          userId: currentUser.uid,
          type: 'runway_look',
          title: newSpec.lookName,
          data: {
            palette: detectedHex,
            finish: detectedFinish,
            spec: newSpec,
          },
          createdAt: new Date().toISOString(),
        });
      }
    }, 400);
  };

  // Custom Outfit Photo Upload Handlers
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      setUploadedPhotoUrl(dataUrl);
      setViewDisplayMode('both');
      try {
        localStorage.setItem(`pg_3d_uploaded_photo_${currentUser?.uid || 'guest'}`, dataUrl);
      } catch {}
      setOutfitSpec((prev) => ({
        ...prev,
        lookName: 'Custom Outfit 3D Studio',
        fabricTexture: 'User Uploaded Outfit Photo mapped onto 3D Studio perspective canvas',
      }));
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemovePhoto = () => {
    setUploadedPhotoUrl(null);
    setViewDisplayMode('mannequin');
    try {
      localStorage.removeItem(`pg_3d_uploaded_photo_${currentUser?.uid || 'guest'}`);
    } catch {}
  };

  // Preset angle switcher
  const setCameraAngle = (angle: 'front' | 'side' | 'back') => {
    setActiveAnglePreset(angle);
    setIsTurntableActive(false);

    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    let targetX = 0;
    let targetZ = 3.8;
    if (angle === 'side') {
      targetX = 3.8;
      targetZ = 0.2;
    } else if (angle === 'back') {
      targetX = 0;
      targetZ = -3.8;
    }

    // Smooth lerp transition
    const startX = camera.position.x;
    const startZ = camera.position.z;
    const startTime = performance.now();
    const duration = 500;

    const animateCamera = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutCubic
      const ease = 1 - Math.pow(1 - progress, 3);
      camera.position.x = startX + (targetX - startX) * ease;
      camera.position.z = startZ + (targetZ - startZ) * ease;
      camera.position.y = 1.45;
      controls.target.set(0, 1.1, 0);
      controls.update();

      if (progress < 1) {
        requestAnimationFrame(animateCamera);
      }
    };

    requestAnimationFrame(animateCamera);
  };

  const handleZoom = (direction: 'in' | 'out') => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    const factor = direction === 'in' ? 0.8 : 1.25;
    const newPos = camera.position.clone().sub(controls.target).multiplyScalar(factor);
    if (newPos.length() > 1.2 && newPos.length() < 6.5) {
      camera.position.copy(controls.target).add(newPos);
      controls.update();
    }
  };

  const handleResetCamera = () => {
    setCameraAngle('front');
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (camera && controls) {
      camera.position.set(0, 1.45, 3.8);
      controls.target.set(0, 1.1, 0);
      controls.update();
    }
  };

  useEffect(() => {
    if (!isOpen || !mountRef.current) return;

    const container = mountRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Detect software WebGL safely
    const isSoftwareGl = (() => {
      try {
        const gl = document.createElement('canvas').getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return false;
      }
    })();

    // 1. Studio WebGL Renderer with ACES Filmic Tone Mapping
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);

    // 2. Scene & Fog Setup
    const scene = new THREE.Scene();
    const horizonColor = 0x070b14;
    scene.background = new THREE.Color(horizonColor);
    scene.fog = new THREE.FogExp2(horizonColor, 0.045);

    // 3. Studio Environment Map
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 4. Studio Lighting Rig
    const keyLight = new THREE.DirectionalLight(0xfff3e0, 2.9);
    keyLight.position.set(3, 6, 4);
    keyLight.castShadow = !isSoftwareGl;
    if (keyLight.shadow) {
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
      keyLight.shadow.camera.near = 0.5;
      keyLight.shadow.camera.far = 15;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);

    const hemiLight = new THREE.HemisphereLight(0x93c5fd, 0x1e1b4b, 1.4);
    scene.add(hemiLight);

    const rimLight = new THREE.DirectionalLight(0xa855f7, 2.2);
    rimLight.position.set(-4, 4, -4);
    scene.add(rimLight);

    // 5. Camera & OrbitControls
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 50);
    camera.position.set(0, 1.45, 3.8);
    cameraRef.current = camera;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 1.1, 0);
    controls.maxPolarAngle = Math.PI / 2 + 0.02;
    controls.minDistance = 1.2;
    controls.maxDistance = 6.0;
    controlsRef.current = controls;

    // 6. Pedestal & Contact Shadow
    const pedestalGeo = new THREE.CylinderGeometry(1.6, 1.7, 0.08, 48);
    const pedestalMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.25,
      metalness: 0.7,
    });
    const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
    pedestal.position.y = 0.04;
    pedestal.receiveShadow = !isSoftwareGl;
    scene.add(pedestal);

    // Radial shadow plane
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 256;
    shadowCanvas.height = 256;
    const ctx = shadowCanvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createRadialGradient(128, 128, 10, 128, 128, 120);
      grad.addColorStop(0, 'rgba(0, 0, 0, 0.8)');
      grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.35)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 256, 256);
    }
    const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
    const shadowPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(2.4, 2.4),
      new THREE.MeshBasicMaterial({
        map: shadowTexture,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
      })
    );
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = 0.082;
    scene.add(shadowPlane);

    // 7. Composite Procedural Mannequin (Group)
    const mannequinGroup = new THREE.Group();
    mannequinGroup.position.set(0, 0.08, 0);

    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      roughness: 0.2,
      metalness: 0.9,
    });

    const standBaseGeo = new THREE.CylinderGeometry(0.22, 0.26, 0.04, 32);
    const standBase = new THREE.Mesh(standBaseGeo, brassMat);
    standBase.position.y = 0.02;
    mannequinGroup.add(standBase);

    const standPoleGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.85, 16);
    const standPole = new THREE.Mesh(standPoleGeo, brassMat);
    standPole.position.y = 0.44;
    mannequinGroup.add(standPole);

    // Garment Material
    const initialColor = new THREE.Color(selectedPalette);
    const garmentMat = new THREE.MeshPhysicalMaterial({
      color: initialColor,
      roughness: 0.55,
      metalness: 0.15,
      clearcoat: 0.25,
      clearcoatRoughness: 0.4,
      sheen: 0.85,
      sheenColor: new THREE.Color(0xfff1f2),
    });

    const trouserMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.75,
      metalness: 0.05,
    });

    // Torso
    const torsoGeo = new THREE.CylinderGeometry(0.24, 0.21, 0.65, 32);
    const torso = new THREE.Mesh(torsoGeo, garmentMat);
    torso.position.y = 1.25;
    torso.castShadow = !isSoftwareGl;
    mannequinGroup.add(torso);

    // Flared Ghera
    const flareGeo = new THREE.CylinderGeometry(0.21, 0.36, 0.62, 32);
    const flare = new THREE.Mesh(flareGeo, garmentMat);
    flare.position.y = 0.75;
    flare.castShadow = !isSoftwareGl;
    mannequinGroup.add(flare);

    // Trousers
    const legGeo = new THREE.CylinderGeometry(0.08, 0.07, 0.45, 20);
    const leftLeg = new THREE.Mesh(legGeo, trouserMat);
    leftLeg.position.set(-0.1, 0.32, 0);
    mannequinGroup.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeo, trouserMat);
    rightLeg.position.set(0.1, 0.32, 0);
    mannequinGroup.add(rightLeg);

    // Mandarin Ban Collar
    const collarGeo = new THREE.TorusGeometry(0.12, 0.032, 16, 32, Math.PI * 1.85);
    collarGeo.rotateX(Math.PI / 2);
    collarGeo.rotateZ(-Math.PI * 0.92);
    const collar = new THREE.Mesh(collarGeo, garmentMat);
    collar.position.set(0, 1.58, 0);
    mannequinGroup.add(collar);

    // Tilla Gold Placket
    const placketGeo = new THREE.BoxGeometry(0.045, 0.42, 0.012);
    const tillaGoldMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      roughness: 0.18,
      metalness: 0.88,
    });
    const placket = new THREE.Mesh(placketGeo, tillaGoldMat);
    placket.position.set(0, 1.34, 0.22);
    mannequinGroup.add(placket);

    // Gold Buttons
    const buttonGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.008, 12);
    buttonGeo.rotateX(Math.PI / 2);
    const buttonsGroup = new THREE.Group();
    for (let i = 0; i < 5; i++) {
      const btn = new THREE.Mesh(buttonGeo, brassMat);
      btn.position.set(0, 1.48 - i * 0.07, 0.23);
      buttonsGroup.add(btn);
    }
    mannequinGroup.add(buttonsGroup);

    // Royal Draped Shawl
    const shawlCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.32, 1.48, -0.05),
      new THREE.Vector3(-0.28, 1.52, 0.12),
      new THREE.Vector3(-0.16, 1.35, 0.26),
      new THREE.Vector3(-0.26, 0.95, 0.24),
      new THREE.Vector3(-0.28, 0.55, 0.18),
    ]);
    const shawlGeo = new THREE.TubeGeometry(shawlCurve, 32, 0.07, 12, false);
    const shawlMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(selectedPalette).offsetHSL(0.03, 0.1, -0.05),
      roughness: 0.45,
      metalness: 0.2,
      clearcoat: 0.3,
    });
    const shawl = new THREE.Mesh(shawlGeo, shawlMat);
    shawl.castShadow = !isSoftwareGl;
    mannequinGroup.add(shawl);

    // Khussa / Shoes
    const shoeMat = new THREE.MeshStandardMaterial({
      color: 0x3e2723,
      roughness: 0.3,
      metalness: 0.2,
    });
    const leftShoeGeo = new THREE.BoxGeometry(0.1, 0.04, 0.22);
    const leftShoe = new THREE.Mesh(leftShoeGeo, shoeMat);
    leftShoe.position.set(-0.1, 0.095, 0.04);
    mannequinGroup.add(leftShoe);

    const rightShoeGeo = new THREE.BoxGeometry(0.1, 0.04, 0.22);
    const rightShoe = new THREE.Mesh(rightShoeGeo, shoeMat);
    rightShoe.position.set(0.1, 0.095, 0.04);
    mannequinGroup.add(rightShoe);

    // Finial
    const finialGeo = new THREE.SphereGeometry(0.065, 24, 16);
    const finial = new THREE.Mesh(finialGeo, brassMat);
    finial.position.set(0, 1.66, 0);
    mannequinGroup.add(finial);

    scene.add(mannequinGroup);

    // Dedicated 3D Interactive Outfit Stand for Uploaded Photos
    const photoStandGroup = new THREE.Group();
    photoStandGroup.position.set(0, 0.08, 0);

    const frameGeo = new THREE.BoxGeometry(0.92, 1.35, 0.04);
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      metalness: 0.85,
      roughness: 0.25,
    });
    const photoFrame = new THREE.Mesh(frameGeo, frameMat);
    photoFrame.position.set(0, 1.15, 0);
    photoStandGroup.add(photoFrame);

    const photoPlaneGeo = new THREE.PlaneGeometry(0.86, 1.28);
    const photoPlaneMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.35,
      metalness: 0.05,
      side: THREE.DoubleSide,
    });
    const photoPlane = new THREE.Mesh(photoPlaneGeo, photoPlaneMat);
    photoPlane.position.set(0, 1.15, 0.022);
    photoStandGroup.add(photoPlane);

    // Elegant pedestal pole for photo stand
    const standPoleGeo2 = new THREE.CylinderGeometry(0.022, 0.022, 0.45, 16);
    const standPole2 = new THREE.Mesh(standPoleGeo2, brassMat);
    standPole2.position.set(0, 0.25, 0);
    photoStandGroup.add(standPole2);

    photoStandGroup.visible = false;
    scene.add(photoStandGroup);
    photoMeshRef.current = photoPlane;
    photoStandGroupRef.current = photoStandGroup;

    sceneElementsRef.current = {
      mannequinGroup,
      garmentMaterials: [garmentMat, shawlMat],
      buttonMaterials: [brassMat],
      goldTrimMaterials: [tillaGoldMat],
    };

    // 8. 60 FPS Loop
    let frameId = 0;
    const clock = new THREE.Clock();

    const tick = () => {
      const delta = clock.getDelta();
      if (isTurntableActive) {
        if (mannequinGroup) mannequinGroup.rotation.y += delta * 0.35;
        if (photoStandGroup) photoStandGroup.rotation.y += delta * 0.35;
      }
      controls.update();
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [isOpen]);

  // Texture mapping for uploaded photo onto both 3D display stand and mannequin garments
  useEffect(() => {
    if (!uploadedPhotoUrl) {
      if (photoStandGroupRef.current) photoStandGroupRef.current.visible = false;
      if (sceneElementsRef.current.mannequinGroup) {
        sceneElementsRef.current.mannequinGroup.visible = true;
        sceneElementsRef.current.mannequinGroup.position.x = 0;
      }
      sceneElementsRef.current.garmentMaterials.forEach((mat) => {
        mat.map = null;
        mat.needsUpdate = true;
      });
      return;
    }

    const loader = new THREE.TextureLoader();
    loader.load(
      uploadedPhotoUrl,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;

        if (photoMeshRef.current) {
          (photoMeshRef.current.material as THREE.MeshStandardMaterial).map = texture;
          (photoMeshRef.current.material as THREE.MeshStandardMaterial).needsUpdate = true;
        }

        sceneElementsRef.current.garmentMaterials.forEach((mat) => {
          mat.map = texture;
          mat.needsUpdate = true;
        });

        if (viewDisplayMode === 'photoStand') {
          if (photoStandGroupRef.current) {
            photoStandGroupRef.current.visible = true;
            photoStandGroupRef.current.position.x = 0;
          }
          if (sceneElementsRef.current.mannequinGroup) sceneElementsRef.current.mannequinGroup.visible = false;
        } else if (viewDisplayMode === 'mannequin') {
          if (photoStandGroupRef.current) photoStandGroupRef.current.visible = false;
          if (sceneElementsRef.current.mannequinGroup) {
            sceneElementsRef.current.mannequinGroup.visible = true;
            sceneElementsRef.current.mannequinGroup.position.x = 0;
          }
        } else {
          // both
          if (photoStandGroupRef.current) {
            photoStandGroupRef.current.visible = true;
            photoStandGroupRef.current.position.x = 0.65;
          }
          if (sceneElementsRef.current.mannequinGroup) {
            sceneElementsRef.current.mannequinGroup.visible = true;
            sceneElementsRef.current.mannequinGroup.position.x = -0.65;
          }
        }
      },
      undefined,
      (err) => console.warn('Could not load uploaded outfit texture in 3D studio:', err)
    );
  }, [uploadedPhotoUrl, viewDisplayMode, isOpen]);

  // Live Fabric Color & Finish Updates
  useEffect(() => {
    const col = new THREE.Color(selectedPalette);
    sceneElementsRef.current.garmentMaterials.forEach((mat) => {
      mat.color = col;
      if (fabricFinish === 'velvet') {
        mat.roughness = 0.85;
        mat.metalness = 0.05;
        mat.clearcoat = 0.12;
      } else if (fabricFinish === 'raw-silk') {
        mat.roughness = 0.45;
        mat.metalness = 0.22;
        mat.clearcoat = 0.35;
      } else {
        // brocade
        mat.roughness = 0.32;
        mat.metalness = 0.48;
        mat.clearcoat = 0.55;
      }
      mat.needsUpdate = true;
    });
  }, [selectedPalette, fabricFinish]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/90 text-white backdrop-blur-3xl animate-in fade-in zoom-in-95 duration-300 overflow-hidden">
      {/* Top Header Badge & Navigation Controls */}
      <header className="absolute inset-x-0 top-0 z-30 flex items-center justify-between px-4 sm:px-6 py-3.5 bg-gradient-to-b from-black/85 via-black/40 to-transparent pointer-events-none">
        <div className="flex items-center gap-3 pointer-events-auto">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-purple-600/30 border border-purple-500/40 text-purple-300 shadow-lg">
            <Sparkles size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-lg sm:text-xl font-bold tracking-tight text-white drop-shadow-md">
                3D Runway & Dress Studio
              </h2>
              <span className="rounded-full bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                PBR Haute Couture
              </span>
            </div>
            <p className="text-xs text-slate-300 drop-shadow-sm">
              {outfitSpec.lookName} · {gender === 'men' ? 'Mardana Couture' : 'Zanana Couture'}
            </p>
          </div>
        </div>

        {/* Action Bar (Angle buttons, Zoom, Auto-Spin, Photo Upload, Close) */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Hidden File Input for Outfit Photo Upload */}
          <input
            ref={uploadInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={handlePhotoUpload}
          />

          {/* Upload Outfit Photo Button */}
          <button
            onClick={() => uploadInputRef.current?.click()}
            className="flex items-center gap-1.5 rounded-xl border border-purple-400/40 bg-purple-600/30 px-3 py-1.5 text-xs font-semibold text-white shadow-md hover:bg-purple-600/50 hover:border-purple-300 transition cursor-pointer"
            title="Upload photo of your actual clothes to map in 3D"
          >
            <Upload size={13} className="text-purple-300" />
            <span className="hidden sm:inline">Upload Outfit Photo</span>
            <span className="sm:hidden">Upload</span>
          </button>

          {/* Multi-Angle Presets */}
          <div className="hidden sm:flex items-center rounded-xl border border-white/20 bg-black/60 p-1 backdrop-blur-2xl">
            {(
              [
                { id: 'front', label: 'Front View' },
                { id: 'side', label: 'Side Profile' },
                { id: 'back', label: 'Back Silhouette' },
              ] as const
            ).map((angle) => (
              <button
                key={angle.id}
                onClick={() => setCameraAngle(angle.id)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
                  activeAnglePreset === angle.id
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              >
                {angle.label}
              </button>
            ))}
          </div>

          {/* Zoom In / Zoom Out Controls */}
          <div className="flex items-center rounded-xl border border-white/20 bg-black/60 p-0.5 backdrop-blur-2xl">
            <button
              onClick={() => handleZoom('in')}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer"
              title="Zoom In (+)"
              aria-label="Zoom In"
            >
              <ZoomIn size={15} />
            </button>
            <button
              onClick={() => handleZoom('out')}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer"
              title="Zoom Out (-)"
              aria-label="Zoom Out"
            >
              <ZoomOut size={15} />
            </button>
          </div>

          {/* 360 Turntable Toggle */}
          <button
            onClick={() => setIsTurntableActive((prev) => !prev)}
            className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
              isTurntableActive
                ? 'bg-purple-600/50 border-purple-400 text-white shadow-md'
                : 'bg-black/60 border-white/20 text-slate-300 hover:bg-white/10'
            }`}
            title="Toggle 360 Turntable Spin"
          >
            <RotateCcw size={13} className={isTurntableActive ? 'animate-spin' : ''} />
            <span className="hidden md:inline">Auto-360° Spin</span>
          </button>

          {/* Close Modal */}
          <button
            onClick={onClose}
            className="rounded-xl border border-white/20 bg-black/60 p-2 text-slate-300 hover:bg-rose-500/30 hover:border-rose-400 hover:text-white transition cursor-pointer"
            aria-label="Close 3D Runway"
          >
            <X size={18} />
          </button>
        </div>
      </header>

      {/* Floating Top Custom Prompt Dress Studio Bar */}
      <div className="absolute top-18 inset-x-0 z-20 flex justify-center px-4 pointer-events-none">
        <form
          onSubmit={handleRenderCustomLook}
          className="w-full max-w-2xl pointer-events-auto rounded-2xl border border-white/25 bg-slate-900/80 p-2 shadow-2xl backdrop-blur-3xl flex items-center gap-2"
        >
          <div className="flex items-center pl-2 text-purple-400">
            <Sparkles size={16} />
          </div>
          <input
            type="text"
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="Customize your 3D outfit (e.g. 'Royal blue velvet sherwani with gold embroidery for 20s')..."
            className="flex-1 bg-transparent px-2 py-1 text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none"
          />
          <button
            type="submit"
            disabled={isRenderingLook || !customPrompt.trim()}
            className="rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-40 px-3.5 py-1.5 text-xs font-bold text-white shadow-md transition flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            {isRenderingLook ? (
              <>
                <RotateCcw size={13} className="animate-spin" />
                <span>Rendering...</span>
              </>
            ) : (
              <>
                <span>Render 3D Look</span>
                <Send size={12} />
              </>
            )}
          </button>
        </form>
      </div>

      {/* 3D WebGL Canvas Mount (Full-Bleed 100vw x 100vh) */}
      <div
        ref={mountRef}
        className="relative h-full w-full cursor-grab active:cursor-grabbing select-none"
        title="Click and drag to rotate mannequin 360°"
      />

      {/* Mobile Angle Selector bar (Visible on small screens) */}
      <div className="sm:hidden absolute top-32 inset-x-0 z-20 flex justify-center px-4 pointer-events-none">
        <div className="flex items-center rounded-xl border border-white/20 bg-black/70 p-1 backdrop-blur-2xl pointer-events-auto">
          {(
            [
              { id: 'front', label: 'Front' },
              { id: 'side', label: 'Side' },
              { id: 'back', label: 'Back' },
            ] as const
          ).map((angle) => (
            <button
              key={angle.id}
              onClick={() => setCameraAngle(angle.id)}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                activeAnglePreset === angle.id ? 'bg-purple-600 text-white' : 'text-slate-300'
              }`}
            >
              {angle.label}
            </button>
          ))}
        </div>
      </div>

      {/* High-Gloss iOS Liquid Glass Bottom Spec Card & Studio Dock */}
      <div className="absolute inset-x-0 bottom-4 z-20 flex justify-center px-4 pointer-events-none">
        <div className="w-full max-w-3xl pointer-events-auto flex flex-col items-center">
          {/* Collapse / Expand Toggle */}
          <button
            type="button"
            onClick={() => setIsControlsCollapsed((prev) => !prev)}
            className="mb-1.5 flex items-center gap-1.5 rounded-full border border-white/20 bg-slate-900/90 px-3.5 py-1 text-[11px] font-semibold text-slate-200 hover:text-white shadow-xl backdrop-blur-2xl transition cursor-pointer"
          >
            {isControlsCollapsed ? (
              <>
                <ChevronUp size={13} />
                <span>Show Fabric Specs & Colorways</span>
              </>
            ) : (
              <>
                <ChevronDown size={13} />
                <span>Minimize Spec Dock</span>
              </>
            )}
          </button>

          {!isControlsCollapsed && (
            <div className="w-full rounded-2xl border border-white/20 bg-slate-900/85 p-4 shadow-2xl backdrop-blur-3xl space-y-3.5">
              {/* Top row: Unlimited Color Palette, Photo Controls & Weave Finish */}
              <div className="space-y-3 border-b border-white/10 pb-3">
                {/* Row 1: Unlimited Color Palette & Hex Input */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                      <Palette size={14} className="text-purple-400" />
                      <span>Palette:</span>
                    </div>

                    {/* HTML5 Native Color Picker */}
                    <label
                      className="relative flex items-center justify-center h-7 w-7 rounded-lg border border-white/30 bg-black/50 overflow-hidden cursor-pointer hover:border-purple-400 transition"
                      title="Pick any custom color across full 16.7M spectrum"
                    >
                      <input
                        type="color"
                        value={selectedPalette}
                        onChange={(e) => setSelectedPalette(e.target.value)}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                      <span
                        className="h-4 w-4 rounded-full border border-white/40 shadow-xs"
                        style={{ backgroundColor: selectedPalette }}
                      />
                    </label>

                    {/* Hex Code Input */}
                    <input
                      type="text"
                      value={selectedPalette}
                      onChange={(e) => setSelectedPalette(e.target.value)}
                      placeholder="#0f766e"
                      maxLength={7}
                      className="w-20 rounded-lg bg-black/60 border border-white/20 px-2 py-0.5 text-xs text-white font-mono focus:border-purple-400 outline-none"
                      title="Type any 6-digit Hex code (e.g. #064e3b)"
                    />
                  </div>

                  {/* Preset Dynamic Heritage Swatches */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[
                      { hex: '#064e3b', label: 'Mughal Emerald' },
                      { hex: '#1e3a8a', label: 'Royal Midnight' },
                      { hex: '#881337', label: 'Ruby Velvet' },
                      { hex: '#b45309', label: 'Raw Amber' },
                      { hex: '#f8fafc', label: 'Ivory Latha' },
                      { hex: '#09090b', label: 'Jet Boski' },
                      { hex: '#be185d', label: 'Gulabi Rose' },
                      { hex: '#d4af37', label: 'Antique Gold' },
                      { hex: '#3b0764', label: 'Deep Plum' },
                      { hex: '#15803d', label: 'Olive Mehendi' },
                    ].map((color) => (
                      <button
                        key={color.hex}
                        onClick={() => setSelectedPalette(color.hex)}
                        title={color.label}
                        style={{ backgroundColor: color.hex }}
                        className={`h-5 w-5 rounded-full border-2 transition cursor-pointer ${
                          selectedPalette.toLowerCase() === color.hex.toLowerCase()
                            ? 'border-white scale-120 shadow-lg ring-2 ring-purple-400'
                            : 'border-slate-600 opacity-80 hover:opacity-100 hover:scale-110'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Row 2: Custom Photo Upload Mode & Weave Finish */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-white/5">
                  {/* Photo 3D Studio Mapping Controls */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                      <ImageIcon size={14} className="text-purple-400" />
                      <span>Outfit Photo:</span>
                    </div>

                    {uploadedPhotoUrl ? (
                      <div className="flex items-center gap-2">
                        {/* 3D Mode Selector */}
                        <div className="flex rounded-lg border border-white/10 bg-black/50 p-0.5">
                          {(
                            [
                              { id: 'mannequin', label: 'Mannequin' },
                              { id: 'photoStand', label: '3D Stand' },
                              { id: 'both', label: 'Dual View' },
                            ] as const
                          ).map((mode) => (
                            <button
                              key={mode.id}
                              onClick={() => setViewDisplayMode(mode.id)}
                              className={`rounded-md px-2 py-0.5 text-[10px] font-semibold transition ${
                                viewDisplayMode === mode.id
                                  ? 'bg-purple-600 text-white'
                                  : 'text-slate-400 hover:text-white'
                              }`}
                            >
                              {mode.label}
                            </button>
                          ))}
                        </div>

                        {/* Thumbnail & Remove button */}
                        <div className="relative h-6 w-6 rounded-md overflow-hidden border border-white/30">
                          <img src={uploadedPhotoUrl} alt="Outfit" className="h-full w-full object-cover" />
                        </div>
                        <button
                          onClick={handleRemovePhoto}
                          className="rounded-md bg-rose-500/20 border border-rose-500/40 p-1 text-rose-300 hover:bg-rose-500/40 transition cursor-pointer"
                          title="Remove custom photo"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => uploadInputRef.current?.click()}
                        className="flex items-center gap-1.5 rounded-lg border border-purple-500/30 bg-purple-500/10 px-2.5 py-1 text-xs font-semibold text-purple-300 hover:bg-purple-500/20 hover:border-purple-400 transition cursor-pointer"
                      >
                        <Upload size={12} />
                        <span>Upload Outfit Photo</span>
                      </button>
                    )}
                  </div>

                  {/* Fabric Finish */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                      <Layers size={14} className="text-purple-400" />
                      <span>Weave:</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { id: 'raw-silk', label: 'Raw Silk' },
                        { id: 'velvet', label: 'Royal Velvet' },
                        { id: 'brocade', label: 'Banarsi' },
                      ].map((item) => (
                        <button
                          key={item.id}
                          onClick={() => setFabricFinish(item.id as any)}
                          className={`rounded-lg px-2 py-1 text-xs font-medium transition cursor-pointer ${
                            fabricFinish === item.id
                              ? 'bg-purple-600 text-white border border-purple-400 shadow-sm'
                              : 'bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom spec card detailing: Fabric Texture, Silhouette Fit, Color Swatches, Tailoring Guidelines */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-left">
                {/* 1. Fabric Texture */}
                <div className="rounded-xl border border-white/10 bg-white/5 p-2.5">
                  <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-purple-300">
                    <Layers size={11} />
                    <span>Fabric Texture</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-200 line-clamp-2 leading-relaxed">
                    {outfitSpec.fabricTexture}
                  </p>
                </div>

                {/* 2. Silhouette Fit */}
                <div className="rounded-xl border border-white/10 bg-white/5 p-2.5">
                  <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                    <Sparkles size={11} />
                    <span>Silhouette Fit</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-200 line-clamp-2 leading-relaxed">
                    {outfitSpec.silhouetteFit}
                  </p>
                </div>

                {/* 3. Color Swatches */}
                <div className="rounded-xl border border-white/10 bg-white/5 p-2.5">
                  <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-300">
                    <Palette size={11} />
                    <span>Active Palette</span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    {outfitSpec.colorSwatches.map((swatch, idx) => (
                      <div
                        key={idx}
                        className="h-4 w-4 rounded-full border border-white/40 shadow-xs"
                        style={{ backgroundColor: swatch.hex }}
                        title={`${swatch.name}: ${swatch.hex}`}
                      />
                    ))}
                    <span className="text-[10px] text-slate-300 truncate ml-1 font-mono">
                      {selectedPalette}
                    </span>
                  </div>
                </div>

                {/* 4. Tailoring Guidelines */}
                <div className="rounded-xl border border-white/10 bg-white/5 p-2.5">
                  <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-cyan-300">
                    <Scissors size={11} />
                    <span>Tailoring Guidelines</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-200 line-clamp-2 leading-relaxed">
                    {outfitSpec.tailoringGuidelines}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

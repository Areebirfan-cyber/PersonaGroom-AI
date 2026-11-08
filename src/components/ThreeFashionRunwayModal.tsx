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
  const { currentUser } = useAuth();

  const [webGlError, setWebGlError] = useState<string | null>(null);
  const [isControlsCollapsed, setIsControlsCollapsed] = useState(false);
  const [activeAnglePreset, setActiveAnglePreset] = useState<'front' | 'side' | 'back'>('front');
  const [selectedPalette, setSelectedPalette] = useState<string>(activeColorHex);
  const [upperColor, setUpperColor] = useState<string>(activeColorHex);
  const [lowerColor, setLowerColor] = useState<string>('#f8fafc');
  const [garmentSilhouette, setGarmentSilhouette] = useState<'sherwani' | 'kurta' | 'anarkali' | 'prince-coat' | 'waistcoat'>('sherwani');
  const [fabricFinish, setFabricFinish] = useState<'raw-silk' | 'velvet' | 'brocade'>('raw-silk');
  const [isTurntableActive, setIsTurntableActive] = useState<boolean>(true);
  const [usePhotoTexture, setUsePhotoTexture] = useState<boolean>(true);

  // Turntable ref to permanently prevent stale closure inside requestAnimationFrame
  const isTurntableActiveRef = useRef<boolean>(isTurntableActive);
  useEffect(() => {
    isTurntableActiveRef.current = isTurntableActive;
  }, [isTurntableActive]);

  // Custom Outfit Photo Upload State
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string | null>(() => {
    try {
      return localStorage.getItem(`pg_3d_uploaded_photo_${currentUser?.uid || 'guest'}`);
    } catch {
      return null;
    }
  });

  // Custom prompt dress studio state
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [isRenderingLook, setIsRenderingLook] = useState<boolean>(false);

  // Dynamic bottom spec card details
  const [outfitSpec, setOutfitSpec] = useState<OutfitSpec>({
    lookName: lookTitle,
    fabricTexture: '100% Pure Raw Silk with authentic Pakistani fabric drape (Roughness: 0.7)',
    silhouetteFit: gender === 'women' ? 'Flared Anarkali Silhouette with Tapered Waist' : 'Structured Slim-Fit Sherwani Cut with Crisp Chest Pad',
    colorSwatches: [
      { name: 'Primary Regal', hex: activeColorHex },
      { name: 'Antique Gold Tilla', hex: '#d4af37' },
      { name: 'Trousers Ivory', hex: '#f8fafc' },
      { name: 'Midnight Accent', hex: '#0f172a' },
    ],
    tailoringGuidelines: '1.25-inch Mandarin Ban collar, concealed inner placket, knife-pleat flare and contrast silk lining.',
  });

  // Dynamic 3D references for live updates
  const sceneElementsRef = useRef<{
    mannequinGroup: THREE.Group | null;
    garmentMaterials: THREE.MeshPhysicalMaterial[];
    trouserMaterial: THREE.MeshStandardMaterial | null;
    buttonMaterials: THREE.MeshStandardMaterial[];
    goldTrimMaterials: THREE.MeshStandardMaterial[];
    torsoMesh: THREE.Mesh | null;
    flareMesh: THREE.Mesh | null;
    frontDecalMesh: THREE.Mesh | null;
    frontDecalMaterial: THREE.MeshPhysicalMaterial | null;
    placketMesh: THREE.Mesh | null;
    buttonsGroup: THREE.Group | null;
  }>({
    mannequinGroup: null,
    garmentMaterials: [],
    trouserMaterial: null,
    buttonMaterials: [],
    goldTrimMaterials: [],
    torsoMesh: null,
    flareMesh: null,
    frontDecalMesh: null,
    frontDecalMaterial: null,
    placketMesh: null,
    buttonsGroup: null,
  });

  // Helper to extract hex color from descriptive keywords
  const extractColorHex = (text: string, defaultHex: string): { hex: string; name: string } => {
    const t = text.toLowerCase();
    if (t.includes('blue') || t.includes('navy') || t.includes('neela')) return { hex: '#1e3a8a', name: 'Royal Midnight Blue' };
    if (t.includes('emerald') || t.includes('green') || t.includes('sabz')) return { hex: '#064e3b', name: 'Mughal Emerald Green' };
    if (t.includes('red') || t.includes('maroon') || t.includes('ruby') || t.includes('crimson')) return { hex: '#881337', name: 'Royal Ruby Maroon' };
    if (t.includes('black') || t.includes('jet') || t.includes('siah')) return { hex: '#09090b', name: 'Jet Black Boski' };
    if (t.includes('gold') || t.includes('mustard') || t.includes('amber') || t.includes('sunheri')) return { hex: '#b45309', name: 'Raw Amber Gold' };
    if (t.includes('white') || t.includes('ivory') || t.includes('offwhite') || t.includes('safed') || t.includes('latha')) return { hex: '#f8fafc', name: 'Ivory Cotton Latha' };
    if (t.includes('pink') || t.includes('blush') || t.includes('rose') || t.includes('gulabi')) return { hex: '#be185d', name: 'Gulabi Rose Petal' };
    if (t.includes('olive') || t.includes('mehendi')) return { hex: '#15803d', name: 'Olive Mehendi' };
    if (t.includes('plum') || t.includes('purple')) return { hex: '#3b0764', name: 'Royal Imperial Plum' };
    return { hex: defaultHex, name: 'Bespoke Palette' };
  };

  // Handle parsing custom dress prompt
  const handleRenderCustomLook = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanPrompt = sanitizeInput(customPrompt.trim());
    const prompt = cleanPrompt.toLowerCase();
    if (!prompt) return;

    setIsRenderingLook(true);

    // Two-part color parsing: "pant white and coat blue" / "trouser black and sherwani maroon"
    let detectedUpper = upperColor;
    let detectedLower = lowerColor;

    // Check bottom garment color
    const pantMatch = prompt.match(/(?:pant|trouser|shalwar|pajama|sharara|bottom)\s+(?:is\s+)?([a-z]+)/);
    if (pantMatch) {
      detectedLower = extractColorHex(pantMatch[1], detectedLower).hex;
    }

    // Check top garment color
    const topMatch = prompt.match(/(?:coat|kurta|sherwani|jacket|top|shirt|choli)\s+(?:is\s+)?([a-z]+)/);
    if (topMatch) {
      detectedUpper = extractColorHex(topMatch[1], detectedUpper).hex;
    } else {
      // General color detection
      const genColor = extractColorHex(prompt, selectedPalette);
      detectedUpper = genColor.hex;
    }

    // Silhouette detection
    let detectedSilhouette = garmentSilhouette;
    if (prompt.includes('anarkali') || (gender === 'women' && (prompt.includes('gown') || prompt.includes('kalidar') || prompt.includes('lehenga')))) {
      detectedSilhouette = 'anarkali';
    } else if (prompt.includes('kurta') || prompt.includes('kurti')) {
      detectedSilhouette = 'kurta';
    } else if (prompt.includes('sherwani')) {
      detectedSilhouette = 'sherwani';
    } else if (prompt.includes('prince coat') || prompt.includes('prince')) {
      detectedSilhouette = 'prince-coat';
    } else if (prompt.includes('waistcoat')) {
      detectedSilhouette = 'waistcoat';
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
      fabricText = 'Pure 80g Raw Silk with subtle tactile slub texture (Roughness: 0.7)';
    }

    setTimeout(() => {
      setSelectedPalette(detectedUpper);
      setUpperColor(detectedUpper);
      setLowerColor(detectedLower);
      setGarmentSilhouette(detectedSilhouette);
      setFabricFinish(detectedFinish);

      const newSpec: OutfitSpec = {
        lookName: cleanPrompt.slice(0, 42) || 'Custom 3D Look',
        fabricTexture: fabricText,
        silhouetteFit:
          detectedSilhouette === 'anarkali'
            ? 'Full-Flared 16-Kali Kalidar Anarkali with Flowing Hem'
            : detectedSilhouette === 'kurta'
            ? 'Straight-Cut Authentic Kurta with 38-inch Knee Daman'
            : detectedSilhouette === 'prince-coat'
            ? 'Structured Double-Breasted Prince Coat with Mandarin Collar'
            : detectedSilhouette === 'waistcoat'
            ? 'Bespoke Tailored Waistcoat with Brass Buttons'
            : 'Structured Aristocratic Sherwani with Shoulder Epaulets',
        colorSwatches: [
          { name: 'Top Garment', hex: detectedUpper },
          { name: 'Bottom Wear', hex: detectedLower },
          { name: 'Antique Gold Trim', hex: '#d4af37' },
          { name: 'Accent Depth', hex: '#020617' },
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
            palette: detectedUpper,
            upperColor: detectedUpper,
            lowerColor: detectedLower,
            silhouette: detectedSilhouette,
            finish: detectedFinish,
            spec: newSpec,
          },
          createdAt: new Date().toISOString(),
        });
      }
    }, 300);
  };

  // Custom Outfit Photo Upload Handlers + Background Vision Analysis
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = String(reader.result);
      setUploadedPhotoUrl(dataUrl);
      setUsePhotoTexture(true);
      try {
        localStorage.setItem(`pg_3d_uploaded_photo_${currentUser?.uid || 'guest'}`, dataUrl);
      } catch {}

      // Background vision analysis to detect garment type & colors
      try {
        const resp = await fetch('/api/agent/analyze-outfit-photo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ base64Image: dataUrl, gender }),
        });
        if (resp.ok) {
          const analysis = await resp.json();
          if (analysis.upperColorHex) {
            setUpperColor(analysis.upperColorHex);
            setSelectedPalette(analysis.upperColorHex);
          }
          if (analysis.lowerColorHex) {
            setLowerColor(analysis.lowerColorHex);
          }
          if (analysis.upperGarmentType) {
            const g = analysis.upperGarmentType.toLowerCase();
            if (g.includes('anarkali') || g.includes('saree') || g.includes('kurti')) setGarmentSilhouette('anarkali');
            else if (g.includes('kurta')) setGarmentSilhouette('kurta');
            else if (g.includes('prince')) setGarmentSilhouette('prince-coat');
            else if (g.includes('waistcoat')) setGarmentSilhouette('waistcoat');
            else setGarmentSilhouette('sherwani');
          }
        }
      } catch (visErr) {
        console.warn('Photo vision analysis skipped:', visErr);
      }

      setOutfitSpec((prev) => ({
        ...prev,
        lookName: 'Custom Outfit 3D Draping',
        fabricTexture: 'User Uploaded Outfit Photo mapped directly onto 3D Mannequin Torso & Flare',
      }));
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemovePhoto = () => {
    setUploadedPhotoUrl(null);
    setUsePhotoTexture(false);
    try {
      localStorage.removeItem(`pg_3d_uploaded_photo_${currentUser?.uid || 'guest'}`);
    } catch {}
  };

  const handleResetLook = () => {
    setSelectedPalette(activeColorHex);
    setUpperColor(activeColorHex);
    setLowerColor('#f8fafc');
    setFabricFinish('raw-silk');
    setGarmentSilhouette(gender === 'women' ? 'anarkali' : 'sherwani');
    setCustomPrompt('');
    handleResetCamera();
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
    const width = Math.max(container.clientWidth || window.innerWidth, 300);
    const height = Math.max(container.clientHeight || window.innerHeight, 300);

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

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
        alpha: false,
      });
    } catch (err: any) {
      console.error('WebGL Renderer init error:', err);
      setWebGlError('WebGL is not supported or was blocked by your browser/GPU.');
      return;
    }

    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.9;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFShadowMap;

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

    // 4. Studio Lighting Rig: key and ambient reduced by ~30%, neutral rim light
    const keyLight = new THREE.DirectionalLight(0xfff5ea, 2.0);
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

    const hemiLight = new THREE.HemisphereLight(0xe2e8f0, 0x1e293b, 1.0);
    scene.add(hemiLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 0.7);
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

    // 6. Pedestal & Grounding Contact Shadow: darker grey (#3f3f46)
    const pedestalGeo = new THREE.CylinderGeometry(1.6, 1.7, 0.08, 48);
    const pedestalMat = new THREE.MeshStandardMaterial({
      color: 0x3f3f46,
      roughness: 0.4,
      metalness: 0.3,
    });
    const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
    pedestal.position.y = 0.04;
    pedestal.receiveShadow = !isSoftwareGl;
    scene.add(pedestal);

    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 256;
    shadowCanvas.height = 256;
    const ctx = shadowCanvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createRadialGradient(128, 128, 10, 128, 128, 120);
      grad.addColorStop(0, 'rgba(0, 0, 0, 0.85)');
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

    // Garment Materials: authentic fabric roughness 0.7, metalness 0, no sheen/tint wash
    const garmentMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(upperColor),
      roughness: 0.7,
      metalness: 0.0,
      clearcoat: 0.0,
    });

    const trouserMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(lowerColor),
      roughness: 0.75,
      metalness: 0.0,
    });

    const tillaGoldMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      roughness: 0.18,
      metalness: 0.88,
    });

    // Separate front decal material for uploaded photo (transparent with depthWrite false for seamless fade)
    const frontDecalMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(0xffffff),
      roughness: 0.7,
      metalness: 0.0,
      clearcoat: 0.0,
      side: THREE.FrontSide,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });

    // Torso (Upper Garment - Back, sides, and base body use plain extracted coat color)
    const torsoGeo = new THREE.CylinderGeometry(0.24, 0.21, 0.65, 32);
    const torso = new THREE.Mesh(torsoGeo, garmentMat);
    torso.position.y = 1.25;
    torso.castShadow = !isSoftwareGl;
    mannequinGroup.add(torso);

    // Front-facing curved decal: shows photo ONLY ONCE on front arc (~120 degrees at front, collar to hem)
    const frontDecalGeo = new THREE.CylinderGeometry(
      0.2415,
      0.2115,
      0.65,
      32,
      1,
      true,
      -Math.PI / 3,
      (2 * Math.PI) / 3
    );
    const frontDecalMesh = new THREE.Mesh(frontDecalGeo, frontDecalMat);
    frontDecalMesh.position.y = 1.25;
    frontDecalMesh.visible = Boolean(uploadedPhotoUrl && usePhotoTexture);
    mannequinGroup.add(frontDecalMesh);

    // Two Symmetric Straight Tapered Sleeves overlapping torso shoulder edge with 7° outward hang
    const sleeveGeo = new THREE.CylinderGeometry(0.062, 0.050, 0.58, 24);
    const leftSleeve = new THREE.Mesh(sleeveGeo, garmentMat);
    leftSleeve.position.set(-0.265, 1.235, 0);
    leftSleeve.rotation.z = -(7 * Math.PI) / 180; // ~7 deg outward angle
    leftSleeve.castShadow = !isSoftwareGl;
    mannequinGroup.add(leftSleeve);

    const rightSleeve = new THREE.Mesh(sleeveGeo, garmentMat);
    rightSleeve.position.set(0.265, 1.235, 0);
    rightSleeve.rotation.z = (7 * Math.PI) / 180; // ~7 deg outward angle
    rightSleeve.castShadow = !isSoftwareGl;
    mannequinGroup.add(rightSleeve);

    // Shoulder Cap Spheres in coat color to seamlessly hide the shoulder joint
    const shoulderCapGeo = new THREE.SphereGeometry(0.066, 20, 16);
    const leftShoulderCap = new THREE.Mesh(shoulderCapGeo, garmentMat);
    leftShoulderCap.position.set(-0.24, 1.50, 0);
    mannequinGroup.add(leftShoulderCap);

    const rightShoulderCap = new THREE.Mesh(shoulderCapGeo, garmentMat);
    rightShoulderCap.position.set(0.24, 1.50, 0);
    mannequinGroup.add(rightShoulderCap);

    // Gold Cuffs at Wrists: thin ring attached exactly at sleeve end
    const cuffGeo = new THREE.CylinderGeometry(0.053, 0.053, 0.035, 24);
    const leftCuff = new THREE.Mesh(cuffGeo, tillaGoldMat);
    leftCuff.position.set(0, -0.275, 0);
    leftSleeve.add(leftCuff);

    const rightCuff = new THREE.Mesh(cuffGeo, tillaGoldMat);
    rightCuff.position.set(0, -0.275, 0);
    rightSleeve.add(rightCuff);

    // Flared Ghera / Lower Coat: slimmer flare (about 60% of original bottom radius) like a sherwani, not a bell
    const isAnarkali = garmentSilhouette === 'anarkali';
    const isKurta = garmentSilhouette === 'kurta';
    const flareRadiusTop = 0.21;
    const flareRadiusBottom = (isAnarkali ? 0.48 : isKurta ? 0.32 : 0.38) * 0.6;
    const flareHeight = isAnarkali ? 0.75 : 0.62;
    const flareGeo = new THREE.CylinderGeometry(flareRadiusTop, flareRadiusBottom, flareHeight, 32);
    const flare = new THREE.Mesh(flareGeo, garmentMat);
    flare.position.y = isAnarkali ? 0.68 : 0.75;
    flare.castShadow = !isSoftwareGl;
    mannequinGroup.add(flare);

    // Thin gold hem band at bottom of coat (same gold as collar and cuffs)
    const hemGeo = new THREE.CylinderGeometry(
      flareRadiusBottom + 0.003,
      flareRadiusBottom + 0.003,
      0.024,
      32,
      1,
      true
    );
    const hemBand = new THREE.Mesh(hemGeo, tillaGoldMat);
    hemBand.position.set(0, -flareHeight / 2 + 0.012, 0);
    flare.add(hemBand);

    // Trousers / Bottom Wear (Shalwar / Churidar / Sharara)
    const legGeo = new THREE.CylinderGeometry(0.08, 0.07, 0.45, 20);
    const leftLeg = new THREE.Mesh(legGeo, trouserMat);
    leftLeg.position.set(-0.1, 0.32, 0);
    mannequinGroup.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeo, trouserMat);
    rightLeg.position.set(0.1, 0.32, 0);
    mannequinGroup.add(rightLeg);

    // Mandarin Ban Collar in same gold as hem band: small horizontal ring flat on X axis around neck, just below gold ball
    const collarGeo = new THREE.TorusGeometry(0.088, 0.016, 16, 36);
    collarGeo.rotateX(Math.PI / 2);
    const collar = new THREE.Mesh(collarGeo, tillaGoldMat);
    collar.position.set(0, 1.575, 0);
    mannequinGroup.add(collar);

    // Tilla Gold Placket (hidden when photo texture is shown)
    const placketGeo = new THREE.BoxGeometry(0.045, 0.42, 0.012);
    const placket = new THREE.Mesh(placketGeo, tillaGoldMat);
    placket.position.set(0, 1.34, 0.242);
    placket.visible = !Boolean(uploadedPhotoUrl && usePhotoTexture);
    mannequinGroup.add(placket);

    // Gold Buttons (hidden when photo texture is shown)
    const buttonGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.008, 12);
    buttonGeo.rotateX(Math.PI / 2);
    const buttonsGroup = new THREE.Group();
    const btnCount = isKurta ? 4 : 6;
    for (let i = 0; i < btnCount; i++) {
      const btn = new THREE.Mesh(buttonGeo, brassMat);
      btn.position.set(0, 1.48 - i * 0.065, 0.25);
      buttonsGroup.add(btn);
    }
    buttonsGroup.visible = !Boolean(uploadedPhotoUrl && usePhotoTexture);
    mannequinGroup.add(buttonsGroup);

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

    sceneElementsRef.current = {
      mannequinGroup,
      garmentMaterials: [garmentMat],
      trouserMaterial: trouserMat,
      buttonMaterials: [brassMat],
      goldTrimMaterials: [tillaGoldMat],
      torsoMesh: torso,
      flareMesh: flare,
      frontDecalMesh,
      frontDecalMaterial: frontDecalMat,
      placketMesh: placket,
      buttonsGroup,
    };

    // 8. 60 FPS Loop with performance.now() and isTurntableActiveRef
    let frameId = 0;
    let lastTime = performance.now();

    const tick = (now: number) => {
      const delta = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      if (isTurntableActiveRef.current && mannequinGroup) {
        mannequinGroup.rotation.y += delta * 0.35;
      }
      controls.update();
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);

    const handleResize = () => {
      if (!container) return;
      const w = Math.max(container.clientWidth || window.innerWidth, 300);
      const h = Math.max(container.clientHeight || window.innerHeight, 300);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry?.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => {
              m.map?.dispose();
              m.dispose();
            });
          } else if (obj.material) {
            obj.material.map?.dispose();
            obj.material.dispose();
          }
        }
      });
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [isOpen, garmentSilhouette]);

  // Texture mapping for uploaded photo: ONLY ONCE on front arc of torso (cropped upper garment)
  useEffect(() => {
    const decalMesh = sceneElementsRef.current.frontDecalMesh;
    const decalMat = sceneElementsRef.current.frontDecalMaterial;
    const placketMesh = sceneElementsRef.current.placketMesh;
    const buttonsGroup = sceneElementsRef.current.buttonsGroup;

    // 7) The "Use plain colors" toggle must remove the texture and show only the colors
    if (!uploadedPhotoUrl || !usePhotoTexture) {
      if (decalMesh) decalMesh.visible = false;
      if (decalMat) {
        if (decalMat.map) {
          decalMat.map.dispose();
          decalMat.map = null;
        }
        decalMat.needsUpdate = true;
      }
      // 4) Show 3D gold placket and buttons in "Use plain colors" mode
      if (placketMesh) placketMesh.visible = true;
      if (buttonsGroup) buttonsGroup.visible = true;
      return;
    }

    // 4) Hide extra 3D gold placket and buttons when photo texture is shown
    if (placketMesh) placketMesh.visible = false;
    if (buttonsGroup) buttonsGroup.visible = false;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const natW = img.naturalWidth || img.width || 512;
      const natH = img.naturalHeight || img.height || 512;

      // 1) BACKGROUND REMOVAL: sample 4 corner pixels as background color
      const scanCanvas = document.createElement('canvas');
      scanCanvas.width = natW;
      scanCanvas.height = natH;
      const scanCtx = scanCanvas.getContext('2d');
      if (!scanCtx) return;

      scanCtx.drawImage(img, 0, 0);
      const imgDataObj = scanCtx.getImageData(0, 0, natW, natH);
      const px = imgDataObj.data;

      // Sample 4 corner pixels (top-left, top-right, bottom-left, bottom-right)
      const getCornerPixel = (x: number, y: number) => {
        const idx = (y * natW + x) * 4;
        return [px[idx], px[idx + 1], px[idx + 2]];
      };
      const corners = [
        getCornerPixel(Math.min(8, natW - 1), Math.min(8, natH - 1)),
        getCornerPixel(Math.max(0, natW - 9), Math.min(8, natH - 1)),
        getCornerPixel(Math.min(8, natW - 1), Math.max(0, natH - 9)),
        getCornerPixel(Math.max(0, natW - 9), Math.max(0, natH - 9)),
      ];
      const bgR = corners.reduce((acc, c) => acc + c[0], 0) / 4;
      const bgG = corners.reduce((acc, c) => acc + c[1], 0) / 4;
      const bgB = corners.reduce((acc, c) => acc + c[2], 0) / 4;

      // Upper garment scan range (avoid pants in lower 42%)
      const maxScanY = Math.floor(natH * 0.58);
      let minX = natW, maxX = 0, minY = maxScanY, maxY = 0;
      let remainingPixels = 0;

      // Make every pixel close to background color (and near-black pixels) fully transparent
      for (let y = 0; y < maxScanY; y++) {
        for (let x = 0; x < natW; x++) {
          const idx = (y * natW + x) * 4;
          const r = px[idx];
          const g = px[idx + 1];
          const b = px[idx + 2];
          const a = px[idx + 3];

          // Color distance to sampled corner background
          const diffBg = Math.hypot(r - bgR, g - bgG, b - bgB);
          // Near-black pixels / dark strips
          const isNearBlack = r < 24 && g < 24 && b < 24;

          if (a < 100 || diffBg < 45 || isNearBlack) {
            px[idx + 3] = 0; // fully transparent
          } else {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
            remainingPixels++;
          }
        }
      }

      // Ensure lower half (pants/shoes) is 100% transparent
      for (let y = maxScanY; y < natH; y++) {
        for (let x = 0; x < natW; x++) {
          const idx = (y * natW + x) * 4;
          px[idx + 3] = 0;
        }
      }

      scanCtx.putImageData(imgDataObj, 0, 0);

      // Crop to the bounding box of the remaining garment pixels
      let cropX = natW * 0.15;
      let cropY = natH * 0.04;
      let cropW = natW * 0.70;
      let cropH = natH * 0.52;

      if (remainingPixels > 100 && maxX > minX && maxY > minY) {
        cropX = minX;
        cropY = minY;
        cropW = maxX - minX + 1;
        cropH = maxY - minY + 1;
      }

      // 2) DECAL BLEND: scale the cutout decal so it spans the torso width (512x512)
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, 512, 512);
        ctx.drawImage(scanCanvas, cropX, cropY, cropW, cropH, 0, 0, 512, 512);

        // Sample dominant color from non-transparent coat pixels
        try {
          const cutoutData = ctx.getImageData(0, 0, 512, 435).data;
          let rSum = 0, gSum = 0, bSum = 0, sampleCount = 0;
          for (let i = 0; i < cutoutData.length; i += 16) {
            const a = cutoutData[i + 3];
            if (a > 180) {
              rSum += cutoutData[i];
              gSum += cutoutData[i + 1];
              bSum += cutoutData[i + 2];
              sampleCount++;
            }
          }
          if (sampleCount > 0) {
            const sampledR = Math.round(rSum / sampleCount);
            const sampledG = Math.round(gSum / sampleCount);
            const sampledB = Math.round(bSum / sampleCount);
            const sampledHex = `#${((1 << 24) + (sampledR << 16) + (sampledG << 8) + sampledB).toString(16).slice(1)}`;
            setUpperColor(sampledHex);
            setSelectedPalette(sampledHex);

            const sampledColor = new THREE.Color(sampledHex);
            sceneElementsRef.current.garmentMaterials.forEach((m) => {
              m.color = sampledColor;
              m.needsUpdate = true;
            });
          }
        } catch (sampleErr) {
          console.warn('Coat color sampling error:', sampleErr);
        }

        // Fades into plain coat color at bottom edge: soft gradient mask over last 15% of decal
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        const fadeGrad = ctx.createLinearGradient(0, 512 * 0.85, 0, 512);
        fadeGrad.addColorStop(0, 'rgba(0, 0, 0, 0)'); // no fade
        fadeGrad.addColorStop(1, 'rgba(0, 0, 0, 1)'); // 100% transparent at bottom edge
        ctx.fillStyle = fadeGrad;
        ctx.fillRect(0, Math.floor(512 * 0.85), 512, Math.ceil(512 * 0.15));
        ctx.restore();
      }

      const texture = new THREE.CanvasTexture(canvas);
      // 1) Show ONLY ONCE on front: wrapS/wrapT = ClampToEdgeWrapping, repeat 1x1
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.repeat.set(1, 1);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.needsUpdate = true;

      if (decalMat) {
        if (decalMat.map) decalMat.map.dispose();
        decalMat.map = texture;
        decalMat.color = new THREE.Color(0xffffff);
        decalMat.metalness = 0;
        decalMat.roughness = 0.7;
        decalMat.clearcoat = 0.0;
        decalMat.transparent = true;
        decalMat.depthWrite = false;
        decalMat.alphaTest = 0.01;
        decalMat.needsUpdate = true;
      }
      if (decalMesh) {
        decalMesh.visible = true;
      }
    };
    img.onerror = (err) => console.warn('Could not process uploaded outfit texture in 3D studio:', err);
    img.src = uploadedPhotoUrl;
  }, [uploadedPhotoUrl, usePhotoTexture, isOpen, garmentSilhouette]);

  // Live Fabric Color & Finish Updates
  useEffect(() => {
    const upperCol = new THREE.Color(upperColor);
    sceneElementsRef.current.garmentMaterials.forEach((mat) => {
      mat.color = upperCol;
      mat.clearcoat = 0.0;
      if (fabricFinish === 'velvet') {
        mat.roughness = 0.85;
        mat.metalness = 0.0;
      } else if (fabricFinish === 'raw-silk') {
        mat.roughness = 0.7;
        mat.metalness = 0.0;
      } else {
        // brocade
        mat.roughness = 0.45;
        mat.metalness = 0.35;
      }
      mat.needsUpdate = true;
    });

    // When texture is applied, keep front decal material transparent with depthWrite: false so underlying plain coat color blends seamlessly
    if (sceneElementsRef.current.frontDecalMaterial && usePhotoTexture && uploadedPhotoUrl) {
      sceneElementsRef.current.frontDecalMaterial.color.set(0xffffff);
      sceneElementsRef.current.frontDecalMaterial.roughness = 0.7;
      sceneElementsRef.current.frontDecalMaterial.metalness = 0.0;
      sceneElementsRef.current.frontDecalMaterial.clearcoat = 0.0;
      sceneElementsRef.current.frontDecalMaterial.transparent = true;
      sceneElementsRef.current.frontDecalMaterial.depthWrite = false;
      sceneElementsRef.current.frontDecalMaterial.alphaTest = 0.01;
      sceneElementsRef.current.frontDecalMaterial.needsUpdate = true;
    }

    if (sceneElementsRef.current.trouserMaterial) {
      sceneElementsRef.current.trouserMaterial.color = new THREE.Color(lowerColor);
      sceneElementsRef.current.trouserMaterial.needsUpdate = true;
    }
  }, [upperColor, lowerColor, fabricFinish, usePhotoTexture, uploadedPhotoUrl]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/90 text-white backdrop-blur-3xl animate-in fade-in zoom-in-95 duration-300 overflow-hidden">
      {/* Top Header Badge & Navigation Controls */}
      <header className="absolute inset-x-0 top-0 z-30 flex items-center justify-between px-2.5 sm:px-6 py-2 sm:py-3.5 bg-gradient-to-b from-black/85 via-black/40 to-transparent pointer-events-none">
        <div className="flex items-center gap-2 sm:gap-3 pointer-events-auto min-w-0">
          <div className="flex h-7 w-7 sm:h-10 sm:w-10 items-center justify-center rounded-xl sm:rounded-2xl bg-purple-600/30 border border-purple-500/40 text-purple-300 shadow-lg shrink-0">
            <Sparkles size={16} className="sm:hidden" />
            <Sparkles size={20} className="hidden sm:block" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {/* Mobile: single-row title "3D Runway", truncate, one line */}
              <h2 className="sm:hidden font-display text-sm font-bold tracking-tight text-white drop-shadow-md truncate">
                3D Runway
              </h2>
              {/* Desktop: full title */}
              <h2 className="hidden sm:block font-display text-lg sm:text-xl font-bold tracking-tight text-white drop-shadow-md">
                3D Runway & Dress Studio
              </h2>
              {/* Hide PBR Haute Couture badge on mobile */}
              <span className="hidden sm:inline-flex rounded-full bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                PBR Haute Couture
              </span>
            </div>
            {/* No subtitle on mobile */}
            <p className="hidden sm:block text-xs text-slate-300 drop-shadow-sm">
              {outfitSpec.lookName} · {gender === 'men' ? 'Mardana Couture' : 'Zanana Couture'}
            </p>
          </div>
        </div>

        {/* Action Bar (Angle buttons, Zoom, Auto-Spin, Photo Upload, Close) */}
        <div className="flex items-center gap-1 sm:gap-2 pointer-events-auto shrink-0">
          {/* Hidden File Input for Outfit Photo Upload */}
          <input
            ref={uploadInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={handlePhotoUpload}
          />

          {/* Upload Outfit Photo Button (Icon-only on mobile) */}
          <button
            onClick={() => uploadInputRef.current?.click()}
            className="flex items-center justify-center p-1.5 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl border border-purple-400/40 bg-purple-600/30 text-xs font-semibold text-white shadow-md hover:bg-purple-600/50 hover:border-purple-300 transition cursor-pointer"
            title="Upload photo of your actual clothes to map in 3D"
            aria-label="Upload Outfit Photo"
          >
            <Upload size={14} className="text-purple-300" />
            <span className="hidden sm:inline ml-1.5">Upload Outfit Photo</span>
          </button>

          {/* Multi-Angle Presets (Hidden on mobile) */}
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
          <div className="flex items-center rounded-lg sm:rounded-xl border border-white/20 bg-black/60 p-0.5 backdrop-blur-2xl">
            <button
              onClick={() => handleZoom('in')}
              className="p-1 sm:p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-md sm:rounded-lg transition cursor-pointer"
              title="Zoom In (+)"
              aria-label="Zoom In"
            >
              <ZoomIn size={14} />
            </button>
            <button
              onClick={() => handleZoom('out')}
              className="p-1 sm:p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-md sm:rounded-lg transition cursor-pointer"
              title="Zoom Out (-)"
              aria-label="Zoom Out"
            >
              <ZoomOut size={14} />
            </button>
          </div>

          {/* 360 Turntable Toggle (Icon only on mobile) */}
          <button
            onClick={() => setIsTurntableActive((prev) => !prev)}
            className={`rounded-lg sm:rounded-xl border p-1.5 sm:px-3 sm:py-1.5 text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 ${
              isTurntableActive
                ? 'bg-purple-600/50 border-purple-400 text-white shadow-md'
                : 'bg-black/60 border-white/20 text-slate-300 hover:bg-white/10'
            }`}
            title="Toggle 360 Turntable Spin"
            aria-label="Toggle 360 Spin"
          >
            <RotateCcw size={14} className={isTurntableActive ? 'animate-spin' : ''} />
            <span className="hidden md:inline">Auto-360° Spin</span>
          </button>

          {/* Reset Look Button */}
          <button
            onClick={handleResetLook}
            className="hidden sm:flex rounded-xl border border-white/20 bg-black/60 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-white/10 hover:text-white transition cursor-pointer items-center gap-1.5"
            title="Reset to default camera & styling"
          >
            <RotateCcw size={13} />
            <span className="hidden lg:inline">Reset</span>
          </button>

          {/* Close Modal (Always visible, small size on mobile) */}
          <button
            onClick={onClose}
            className="rounded-lg sm:rounded-xl border border-white/20 bg-black/60 p-1.5 sm:p-2 text-slate-300 hover:bg-rose-500/30 hover:border-rose-400 hover:text-white transition cursor-pointer"
            aria-label="Close 3D Runway"
          >
            <X size={16} className="sm:hidden" />
            <X size={18} className="hidden sm:block" />
          </button>
        </div>
      </header>

      {/* Floating Top Custom Prompt Dress Studio Bar with top margin below header */}
      <div className="absolute top-12 sm:top-18 mt-1 sm:mt-0 inset-x-0 z-20 flex justify-center px-3 sm:px-4 pointer-events-none">
        <form
          onSubmit={handleRenderCustomLook}
          className="w-full max-w-2xl pointer-events-auto rounded-xl sm:rounded-2xl border border-white/25 bg-slate-900/80 p-1.5 sm:p-2 shadow-2xl backdrop-blur-3xl flex items-center gap-2"
        >
          <div className="flex items-center pl-1 sm:pl-2 text-purple-400">
            <Sparkles size={14} className="sm:hidden" />
            <Sparkles size={16} className="hidden sm:block" />
          </div>
          <input
            type="text"
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="Customize 3D outfit (e.g. 'Pant white and coat blue sherwani', 'emerald kurta')..."
            className="flex-1 min-w-0 bg-transparent px-2 py-1 text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none"
          />
          <button
            type="submit"
            disabled={isRenderingLook || !customPrompt.trim()}
            className="rounded-lg sm:rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-40 px-2.5 sm:px-3.5 py-1.5 text-xs font-bold text-white shadow-md transition flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            {isRenderingLook ? (
              <>
                <RotateCcw size={12} className="animate-spin" />
                <span className="hidden sm:inline">Rendering...</span>
              </>
            ) : (
              <>
                <span className="hidden sm:inline">Render 3D Look</span>
                <Send size={12} />
              </>
            )}
          </button>
        </form>
      </div>

      {/* 3D WebGL Canvas Mount or Fallback View */}
      {webGlError ? (
        <div className="flex flex-col items-center justify-center h-full w-full p-8 text-center bg-slate-950 text-white space-y-4">
          <div className="p-6 rounded-3xl bg-slate-900/90 border border-purple-500/30 text-slate-200 max-w-md shadow-2xl backdrop-blur-3xl">
            <Sparkles size={36} className="mx-auto mb-3 text-purple-400" />
            <h3 className="font-bold text-base text-white">3D Studio Fallback Mode</h3>
            <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
              {webGlError}
            </p>
            <p className="text-[11px] text-slate-400 mt-2">
              All tailoring specifications, custom prompt inputs, and fabric finishing below remain 100% active.
            </p>
          </div>
        </div>
      ) : (
        <div
          ref={mountRef}
          className="relative h-full w-full cursor-grab active:cursor-grabbing select-none"
          title="Click and drag to rotate mannequin 360°"
        />
      )}

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

      {/* High-Gloss Liquid Glass Bottom Spec Card & Mobile Bottom Sheet */}
      <div className="fixed sm:absolute inset-x-0 bottom-0 sm:bottom-4 z-40 sm:z-20 flex justify-center px-0 sm:px-4 pointer-events-none">
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
            <div className="w-full max-h-[55vh] sm:max-h-none overflow-y-auto rounded-t-2xl sm:rounded-2xl border-t sm:border border-white/20 bg-slate-900/95 sm:bg-slate-900/85 p-3.5 sm:p-4 shadow-2xl backdrop-blur-3xl space-y-3 sm:space-y-3.5">
              {/* Visible Mobile Close Handle */}
              <div
                onClick={() => setIsControlsCollapsed(true)}
                className="sm:hidden flex flex-col items-center justify-center pb-1 pt-0 cursor-pointer"
                title="Tap to minimize fabric specs"
              >
                <div className="h-1.5 w-12 rounded-full bg-white/40 mb-1" />
                <span className="text-[10px] text-slate-400 font-medium">Tap to minimize panel</span>
              </div>

              {/* Top row: Unlimited Color Palette, Photo Controls & Weave Finish */}
              <div className="space-y-3 border-b border-white/10 pb-3">
                {/* Row 1: Unlimited Color Palette & Hex Input */}
                <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
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
                  {/* Direct Photo Draping on 3D Mannequin Controls */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                      <ImageIcon size={14} className="text-purple-400" />
                      <span>Photo Texture:</span>
                    </div>

                    {uploadedPhotoUrl ? (
                      <div className="flex items-center gap-2">
                        {/* Toggle between Photo Texture vs Plain Colorway */}
                        <button
                          onClick={() => setUsePhotoTexture((prev) => !prev)}
                          className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
                            usePhotoTexture
                              ? 'bg-purple-600 text-white shadow-sm border border-purple-400'
                              : 'bg-white/10 text-slate-300 hover:text-white border border-white/15'
                          }`}
                          title="Toggle between photo texture and plain colors"
                        >
                          {usePhotoTexture ? 'Draped on 3D Model' : 'Use plain colors'}
                        </button>

                        {/* Thumbnail */}
                        <div className="relative h-6 w-6 rounded-md overflow-hidden border border-white/30">
                          <img src={uploadedPhotoUrl} alt="Outfit" className="h-full w-full object-cover" />
                        </div>

                        {/* Remove photo */}
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
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                      <Layers size={14} className="text-purple-400" />
                      <span>Weave:</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
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

                {/* Row 3: Quick Silhouette Selector */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/5">
                  <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Scissors size={14} className="text-purple-400" />
                    <span>Silhouette Model:</span>
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { id: 'sherwani', label: 'Royal Sherwani' },
                      { id: 'kurta', label: 'Bespoke Kurta' },
                      { id: 'anarkali', label: 'Kalidar Anarkali' },
                      { id: 'prince-coat', label: 'Prince Coat' },
                      { id: 'waistcoat', label: 'Waistcoat' },
                    ].map((sil) => (
                      <button
                        key={sil.id}
                        onClick={() => setGarmentSilhouette(sil.id as any)}
                        className={`rounded-lg px-2.5 py-1 text-xs font-medium transition cursor-pointer ${
                          garmentSilhouette === sil.id
                            ? 'bg-purple-600 text-white border border-purple-400 shadow-sm'
                            : 'bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10'
                        }`}
                      >
                        {sil.label}
                      </button>
                    ))}
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

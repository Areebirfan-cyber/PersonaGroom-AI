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
  ZoomIn,
  ZoomOut,
  Send,
  Scissors,
  Upload,
  Trash2,
  Image as ImageIcon,
  Footprints,
  User,
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

const SKIN_TONE_PRESETS = [
  { hex: '#e2b89b', label: 'Fair Warm' },
  { hex: '#c9936b', label: 'South Asian Wheatish' },
  { hex: '#a8734f', label: 'Olive Tan' },
  { hex: '#7d5034', label: 'Deep Bronze' },
];

// Generate a procedural woven fabric bump texture (linen/silk/brocade micro-grain)
function createFabricBumpTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, size, size);
    const imgData = ctx.getImageData(0, 0, size, size);
    const d = imgData.data;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = (y * size + x) * 4;
        const warp = Math.sin(x * 0.85) * 14;
        const weft = Math.sin(y * 0.85) * 14;
        const slub = ((x * 13 + y * 29) % 17) - 8;
        const v = Math.max(0, Math.min(255, Math.round(128 + warp + weft + slub)));
        d[idx] = v;
        d[idx + 1] = v;
        d[idx + 2] = v;
        d[idx + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(5, 7);
  tex.needsUpdate = true;
  return tex;
}

// Generate scrolling LED runway strip texture
function createRunwayLedTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, 64, 512);
    for (let y = 0; y < 512; y += 64) {
      const grad = ctx.createLinearGradient(0, y, 0, y + 40);
      grad.addColorStop(0, 'rgba(168, 85, 247, 0.05)');
      grad.addColorStop(0.5, 'rgba(212, 175, 55, 0.95)');
      grad.addColorStop(1, 'rgba(168, 85, 247, 0.05)');
      ctx.fillStyle = grad;
      ctx.fillRect(10, y + 6, 44, 34);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 5);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

// Create a sculpted sneaker/loafer/khussa shoe mesh
function buildFootwearMesh(
  shoeMat: THREE.Material,
  trimMat: THREE.Material,
  sideSign: number
): THREE.Group {
  const group = new THREE.Group();

  // Sole base extruded from foot contour
  const soleShape = new THREE.Shape();
  soleShape.moveTo(-0.042, -0.09);
  soleShape.quadraticCurveTo(0.0, -0.105, 0.042, -0.09);
  soleShape.lineTo(0.046, 0.05);
  soleShape.quadraticCurveTo(0.044, 0.13, 0.0, 0.145);
  soleShape.quadraticCurveTo(-0.044, 0.13, -0.046, 0.05);
  soleShape.closePath();

  const soleGeo = new THREE.ExtrudeGeometry(soleShape, {
    depth: 0.016,
    bevelEnabled: true,
    bevelThickness: 0.004,
    bevelSize: 0.003,
    bevelSegments: 2,
  });
  soleGeo.rotateX(Math.PI / 2);
  const sole = new THREE.Mesh(soleGeo, trimMat);
  sole.position.y = 0.02;
  sole.castShadow = true;
  group.add(sole);

  // Upper leather shoe body
  const upperGeo = new THREE.CapsuleGeometry(0.039, 0.14, 6, 14);
  upperGeo.rotateX(Math.PI / 2);
  upperGeo.scale(1.05, 0.72, 1.0);
  const upper = new THREE.Mesh(upperGeo, shoeMat);
  upper.position.set(0, 0.042, 0.025);
  upper.castShadow = true;
  group.add(upper);

  // Slight upturned heritage khussa/loafer toe detail
  const toeGeo = new THREE.SphereGeometry(0.031, 14, 12);
  toeGeo.scale(1.0, 0.68, 1.35);
  const toe = new THREE.Mesh(toeGeo, shoeMat);
  toe.position.set(sideSign * 0.002, 0.038, 0.105);
  group.add(toe);

  // Subtle gold collar/vamp piping
  const buckleGeo = new THREE.BoxGeometry(0.045, 0.008, 0.014);
  const buckle = new THREE.Mesh(buckleGeo, trimMat);
  buckle.position.set(0, 0.068, 0.035);
  group.add(buckle);

  return group;
}

// Create sculpted forearm + wrist + hand with thumb & finger silhouette
function buildArticulatedHand(skinMat: THREE.Material, sideSign: number): THREE.Group {
  const handGroup = new THREE.Group();

  // Wrist bridge
  const wrist = new THREE.Mesh(new THREE.CapsuleGeometry(0.025, 0.022, 4, 10), skinMat);
  wrist.position.y = -0.01;
  handGroup.add(wrist);

  // Palm (sculpted flattened oval)
  const palmGeo = new THREE.BoxGeometry(0.034, 0.072, 0.058);
  const palm = new THREE.Mesh(palmGeo, skinMat);
  palm.position.set(0, -0.054, 0.004);
  handGroup.add(palm);

  // Fingers group (tapered graceful fingers)
  const fingers = new THREE.Mesh(new THREE.CapsuleGeometry(0.021, 0.048, 4, 10), skinMat);
  fingers.scale.set(0.75, 1.0, 1.15);
  fingers.position.set(-sideSign * 0.002, -0.102, 0.008);
  fingers.rotation.z = sideSign * 0.08;
  handGroup.add(fingers);

  // Thumb
  const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.010, 0.032, 4, 8), skinMat);
  thumb.position.set(-sideSign * 0.016, -0.056, 0.034);
  thumb.rotation.x = 0.42;
  thumb.rotation.z = -sideSign * 0.25;
  handGroup.add(thumb);

  return handGroup;
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
  const [lowerColor, setLowerColor] = useState<string>('#f4f1ea');
  const [skinToneHex, setSkinToneHex] = useState<string>('#c9936b');
  const [garmentSilhouette, setGarmentSilhouette] = useState<
    'sherwani' | 'kurta' | 'anarkali' | 'prince-coat' | 'waistcoat'
  >(gender === 'women' ? 'anarkali' : 'sherwani');
  const [fabricFinish, setFabricFinish] = useState<'raw-silk' | 'velvet' | 'brocade'>('raw-silk');
  const [isTurntableActive, setIsTurntableActive] = useState<boolean>(false);
  const [isWalking, setIsWalking] = useState<boolean>(true);
  const [usePhotoTexture, setUsePhotoTexture] = useState<boolean>(true);

  const isTurntableActiveRef = useRef<boolean>(isTurntableActive);
  useEffect(() => {
    isTurntableActiveRef.current = isTurntableActive;
  }, [isTurntableActive]);

  const isWalkingRef = useRef<boolean>(isWalking);
  useEffect(() => {
    isWalkingRef.current = isWalking;
  }, [isWalking]);

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
    fabricTexture: '100% Pure Raw Silk with woven micro-slub texture (Roughness: 0.82)',
    silhouetteFit:
      gender === 'women'
        ? 'Anatomical Flared Anarkali Silhouette with Sculpted Waist'
        : 'V-Tapered Bespoke Sherwani Cut with Articulated Sleeves',
    colorSwatches: [
      { name: 'Primary Regal', hex: activeColorHex },
      { name: 'Antique Gold Tilla', hex: '#d4af37' },
      { name: 'Trousers Ivory', hex: '#f4f1ea' },
      { name: 'Midnight Accent', hex: '#0f172a' },
    ],
    tailoringGuidelines:
      '1.25-inch Mandarin Ban collar, tailored shoulder pitch, knife-pleat flare & coordinated trousers.',
  });

  // Dynamic 3D references for live updates without rebuilding the WebGL scene
  const sceneElementsRef = useRef<{
    mannequinGroup: THREE.Group | null;
    garmentMaterials: THREE.MeshPhysicalMaterial[];
    trouserMaterial: THREE.MeshStandardMaterial | null;
    skinMaterial: THREE.MeshStandardMaterial | null;
    buttonMaterials: THREE.MeshStandardMaterial[];
    goldTrimMaterials: THREE.MeshStandardMaterial[];
    frontDecalMesh: THREE.Mesh | null;
    frontDecalMaterial: THREE.MeshStandardMaterial | null;
    placketMesh: THREE.Mesh | null;
    buttonsGroup: THREE.Group | null;
    fabricBumpTex: THREE.CanvasTexture | null;
  }>({
    mannequinGroup: null,
    garmentMaterials: [],
    trouserMaterial: null,
    skinMaterial: null,
    buttonMaterials: [],
    goldTrimMaterials: [],
    frontDecalMesh: null,
    frontDecalMaterial: null,
    placketMesh: null,
    buttonsGroup: null,
    fabricBumpTex: null,
  });

  // Apply palette changes immediately to both React state and 3D garment
  const applyPaletteColor = (hex: string) => {
    setSelectedPalette(hex);
    if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
      setUpperColor(hex);
      setOutfitSpec((prev) => ({
        ...prev,
        colorSwatches: [
          { name: 'Top Garment', hex },
          ...prev.colorSwatches.slice(1),
        ],
      }));
    }
  };

  // Helper to extract hex color from descriptive keywords
  const extractColorHex = (text: string, defaultHex: string): { hex: string; name: string } => {
    const t = text.toLowerCase();
    if (t.includes('blue') || t.includes('navy') || t.includes('neela'))
      return { hex: '#1e3a8a', name: 'Royal Midnight Blue' };
    if (t.includes('emerald') || t.includes('green') || t.includes('sabz'))
      return { hex: '#064e3b', name: 'Mughal Emerald Green' };
    if (t.includes('red') || t.includes('maroon') || t.includes('ruby') || t.includes('crimson'))
      return { hex: '#881337', name: 'Royal Ruby Maroon' };
    if (t.includes('black') || t.includes('jet') || t.includes('siah'))
      return { hex: '#14171f', name: 'Jet Black Boski' };
    if (t.includes('gold') || t.includes('mustard') || t.includes('amber') || t.includes('sunheri'))
      return { hex: '#b45309', name: 'Raw Amber Gold' };
    if (
      t.includes('white') ||
      t.includes('ivory') ||
      t.includes('offwhite') ||
      t.includes('safed') ||
      t.includes('latha') ||
      t.includes('cream')
    )
      return { hex: '#f4f1ea', name: 'Ivory Cotton Latha' };
    if (t.includes('pink') || t.includes('blush') || t.includes('rose') || t.includes('gulabi'))
      return { hex: '#be185d', name: 'Gulabi Rose Petal' };
    if (t.includes('olive') || t.includes('mehendi'))
      return { hex: '#365314', name: 'Olive Mehendi' };
    if (t.includes('plum') || t.includes('purple'))
      return { hex: '#4c1d95', name: 'Royal Imperial Plum' };
    if (t.includes('teal') || t.includes('turquoise'))
      return { hex: '#0f766e', name: 'Regal Teal' };
    if (t.includes('beige') || t.includes('camel') || t.includes('khaki') || t.includes('brown'))
      return { hex: '#785a3c', name: 'Heritage Camel' };
    return { hex: defaultHex, name: 'Bespoke Palette' };
  };

  // Handle parsing custom dress prompt
  const handleRenderCustomLook = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanPrompt = sanitizeInput(customPrompt.trim());
    const prompt = cleanPrompt.toLowerCase();
    if (!prompt) return;

    setIsRenderingLook(true);

    let detectedUpper = upperColor;
    let detectedLower = lowerColor;

    const pantMatch = prompt.match(
      /(?:pant|trouser|shalwar|pajama|sharara|bottom)\s+(?:is\s+)?([a-z]+)/
    );
    if (pantMatch) {
      detectedLower = extractColorHex(pantMatch[1], detectedLower).hex;
    }

    const topMatch = prompt.match(
      /(?:coat|kurta|sherwani|jacket|top|shirt|choli|anarkali)\s+(?:is\s+)?([a-z]+)/
    );
    if (topMatch) {
      detectedUpper = extractColorHex(topMatch[1], detectedUpper).hex;
    } else {
      const genColor = extractColorHex(prompt, selectedPalette);
      detectedUpper = genColor.hex;
    }

    let detectedSilhouette = garmentSilhouette;
    if (
      prompt.includes('anarkali') ||
      (gender === 'women' &&
        (prompt.includes('gown') || prompt.includes('kalidar') || prompt.includes('lehenga')))
    ) {
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

    let detectedFinish: 'raw-silk' | 'velvet' | 'brocade' = fabricFinish;
    let fabricText = outfitSpec.fabricTexture;
    if (prompt.includes('velvet') || prompt.includes('makhmal')) {
      detectedFinish = 'velvet';
      fabricText = 'Micro-Plush Royal Velvet with matte pile absorption and gold zari trim';
    } else if (
      prompt.includes('brocade') ||
      prompt.includes('banarsi') ||
      prompt.includes('jamawar')
    ) {
      detectedFinish = 'brocade';
      fabricText = 'Authentic Banarsi Brocade woven with subtle metallic zari slub texture';
    } else if (prompt.includes('silk') || prompt.includes('raw silk') || prompt.includes('boski')) {
      detectedFinish = 'raw-silk';
      fabricText = 'Pure Raw Silk with natural woven bump texture (Roughness: 0.82)';
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
            ? 'Straight-Cut Authentic Kurta with Articulated Sleeves'
            : detectedSilhouette === 'prince-coat'
            ? 'Structured Prince Coat with Sculpted Mandarin Collar'
            : detectedSilhouette === 'waistcoat'
            ? 'Tailored Waistcoat Layered Over Crisp Sleeves'
            : 'V-Tapered Aristocratic Sherwani with Natural Drape',
        colorSwatches: [
          { name: 'Top Garment', hex: detectedUpper },
          { name: 'Bottom Wear', hex: detectedLower },
          { name: 'Antique Gold Trim', hex: '#d4af37' },
          { name: 'Accent Depth', hex: '#020617' },
        ],
        tailoringGuidelines: `Master Darzi cut: ${
          detectedFinish === 'velvet'
            ? 'Interlined fusible canvas, bias piping, fine brass snap buttons.'
            : 'French seams, hand-rolled hem, 1.25" ban collar with coordinated trouser fit.'
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
    }, 250);
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
            if (g.includes('anarkali') || g.includes('saree') || g.includes('kurti'))
              setGarmentSilhouette('anarkali');
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
        lookName: 'Custom Outfit Full-Body Draping',
        fabricTexture:
          '1024px Garment Texture mapped collar-to-hem with synced sleeves & trousers (Roughness: 0.82)',
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
    setLowerColor('#f4f1ea');
    setSkinToneHex('#c9936b');
    setFabricFinish('raw-silk');
    setGarmentSilhouette(gender === 'women' ? 'anarkali' : 'sherwani');
    setCustomPrompt('');
    setIsWalking(true);
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
    let targetZ = 3.65;
    if (angle === 'side') {
      targetX = 3.65;
      targetZ = 0.2;
    } else if (angle === 'back') {
      targetX = 0;
      targetZ = -3.65;
    }

    const startX = camera.position.x;
    const startZ = camera.position.z;
    const startTime = performance.now();
    const duration = 500;

    const animateCamera = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      camera.position.x = startX + (targetX - startX) * ease;
      camera.position.z = startZ + (targetZ - startZ) * ease;
      camera.position.y = 1.32;
      controls.target.set(0, 1.0, 0);
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
      camera.position.set(0, 1.32, 3.65);
      controls.target.set(0, 1.0, 0);
      controls.update();
    }
  };

  // Main Three.js Anatomical Human Fashion Model & Runway Scene
  useEffect(() => {
    if (!isOpen || !mountRef.current) return;

    const container = mountRef.current;
    const width = Math.max(container.clientWidth || window.innerWidth, 300);
    const height = Math.max(container.clientHeight || window.innerHeight, 300);

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
    renderer.toneMappingExposure = 0.98;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFShadowMap;

    container.appendChild(renderer.domElement);

    // Scene & Horizon Fog
    const scene = new THREE.Scene();
    const horizonColor = 0x070b14;
    scene.background = new THREE.Color(horizonColor);
    scene.fog = new THREE.FogExp2(horizonColor, 0.045);

    // Studio Environment Map (RoomEnvironment)
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 3-Point Runway Lighting Rig
    const keyLight = new THREE.DirectionalLight(0xfff4e6, 2.05);
    keyLight.position.set(2.8, 5.5, 4.0);
    keyLight.castShadow = !isSoftwareGl;
    if (keyLight.shadow) {
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
      keyLight.shadow.camera.near = 0.5;
      keyLight.shadow.camera.far = 14;
      keyLight.shadow.camera.left = -2.2;
      keyLight.shadow.camera.right = 2.2;
      keyLight.shadow.camera.top = 2.8;
      keyLight.shadow.camera.bottom = -1.0;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);

    const hemiLight = new THREE.HemisphereLight(0xe2e8f0, 0x1e293b, 0.95);
    scene.add(hemiLight);

    const rimLight = new THREE.DirectionalLight(0xd8b4fe, 0.85);
    rimLight.position.set(-3.5, 3.8, -3.5);
    scene.add(rimLight);

    // Camera & OrbitControls
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 50);
    camera.position.set(0, 1.32, 3.65);
    cameraRef.current = camera;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.target.set(0, 1.0, 0);
    controls.maxPolarAngle = Math.PI / 2 + 0.02;
    controls.minDistance = 1.25;
    controls.maxDistance = 6.0;
    controlsRef.current = controls;

    // -------------------------------------------------------------------
    // 1. SLEEK ILLUMINATED CATWALK RUNWAY STAGE (No pole / no single drum)
    // -------------------------------------------------------------------
    const runwayGroup = new THREE.Group();
    const deckMat = new THREE.MeshStandardMaterial({
      color: 0x181e2c,
      roughness: 0.36,
      metalness: 0.25,
    });
    const plinthMat = new THREE.MeshStandardMaterial({
      color: 0x0b0f18,
      roughness: 0.52,
      metalness: 0.35,
    });

    const catwalkDeck = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.08, 4.6), deckMat);
    catwalkDeck.position.set(0, 0.04, 0);
    catwalkDeck.receiveShadow = !isSoftwareGl;
    runwayGroup.add(catwalkDeck);

    const catwalkPlinth = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.05, 4.8), plinthMat);
    catwalkPlinth.position.set(0, 0.025, 0);
    runwayGroup.add(catwalkPlinth);

    const fabricBumpTex = createFabricBumpTexture();
    const runnerStripMat = new THREE.MeshStandardMaterial({
      color: 0x22293b,
      roughness: 0.72,
      metalness: 0.08,
      bumpMap: fabricBumpTex,
      bumpScale: 0.004,
    });
    const runnerStrip = new THREE.Mesh(new THREE.PlaneGeometry(0.84, 4.5), runnerStripMat);
    runnerStrip.rotation.x = -Math.PI / 2;
    runnerStrip.position.set(0, 0.0815, 0);
    runnerStrip.receiveShadow = !isSoftwareGl;
    runwayGroup.add(runnerStrip);

    // Animated perimeter runway LED light strips
    const ledTexture = createRunwayLedTexture();
    ledTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const ledMat = new THREE.MeshStandardMaterial({
      map: ledTexture,
      emissive: new THREE.Color(0xd4af37),
      emissiveMap: ledTexture,
      emissiveIntensity: 1.45,
      roughness: 0.25,
      metalness: 0.2,
    });
    const leftLed = new THREE.Mesh(new THREE.PlaneGeometry(0.038, 4.46), ledMat);
    leftLed.rotation.x = -Math.PI / 2;
    leftLed.position.set(-0.78, 0.0825, 0);
    runwayGroup.add(leftLed);

    const rightLed = new THREE.Mesh(new THREE.PlaneGeometry(0.038, 4.46), ledMat);
    rightLed.rotation.x = -Math.PI / 2;
    rightLed.position.set(0.78, 0.0825, 0);
    runwayGroup.add(rightLed);

    // Grounding radial contact shadow beneath model's feet
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 256;
    shadowCanvas.height = 256;
    const sctx = shadowCanvas.getContext('2d');
    if (sctx) {
      const grad = sctx.createRadialGradient(128, 128, 12, 128, 128, 120);
      grad.addColorStop(0, 'rgba(0, 0, 0, 0.85)');
      grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.32)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      sctx.fillStyle = grad;
      sctx.fillRect(0, 0, 256, 256);
    }
    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    const contactShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(1.15, 1.3),
      new THREE.MeshBasicMaterial({
        map: shadowTex,
        transparent: true,
        opacity: 0.78,
        depthWrite: false,
      })
    );
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.set(0, 0.083, 0);
    runwayGroup.add(contactShadow);

    scene.add(runwayGroup);

    // -------------------------------------------------------------------
    // 2. REALISTIC ANATOMICAL 3D HUMAN FASHION MODEL (Hierarchical Rig)
    // -------------------------------------------------------------------
    const isWomen = gender === 'women';
    const isAnarkali = garmentSilhouette === 'anarkali';
    const isKurta = garmentSilhouette === 'kurta';
    const isWaistcoat = garmentSilhouette === 'waistcoat';
    const isPrinceCoat = garmentSilhouette === 'prince-coat';

    const mannequinGroup = new THREE.Group();
    mannequinGroup.position.set(0, 0.08, 0); // Feet flush on catwalk surface

    // Realistic PBR Materials
    const skinMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(skinToneHex),
      roughness: 0.55,
      metalness: 0.02,
    });

    const hairMat = new THREE.MeshStandardMaterial({
      color: 0x1a1512,
      roughness: 0.68,
      metalness: 0.04,
    });

    const featureDarkMat = new THREE.MeshStandardMaterial({
      color: 0x1e1612,
      roughness: 0.45,
      metalness: 0.05,
    });

    const eyeWhiteMat = new THREE.MeshStandardMaterial({
      color: 0xf4efe8,
      roughness: 0.3,
      metalness: 0.0,
    });

    const lipMat = new THREE.MeshStandardMaterial({
      color: isWomen ? 0x9b4d52 : 0x8f564a,
      roughness: 0.48,
      metalness: 0.02,
    });

    // Fabric material: realistic matte stitched fabric (roughness 0.82, metalness 0.0, bumpMap)
    const garmentMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(upperColor),
      roughness: fabricFinish === 'velvet' ? 0.88 : fabricFinish === 'brocade' ? 0.62 : 0.82,
      metalness: fabricFinish === 'brocade' ? 0.22 : 0.0,
      clearcoat: 0.0,
      sheen: fabricFinish === 'velvet' ? 0.45 : 0.15,
      sheenRoughness: 0.75,
      bumpMap: fabricBumpTex,
      bumpScale: 0.008,
    });

    const trouserMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(lowerColor),
      roughness: 0.82,
      metalness: 0.0,
      bumpMap: fabricBumpTex,
      bumpScale: 0.006,
    });

    const tillaGoldMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      roughness: 0.24,
      metalness: 0.85,
    });

    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xeab308,
      roughness: 0.22,
      metalness: 0.88,
    });

    const shoeMat = new THREE.MeshStandardMaterial({
      color: 0x2c1b18,
      roughness: 0.35,
      metalness: 0.08,
    });

    // Front-facing full-garment decal material (collar to hem, realistic fabric)
    const frontDecalMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0xffffff),
      roughness: 0.82,
      metalness: 0.0,
      bumpMap: fabricBumpTex,
      bumpScale: 0.007,
      transparent: true,
      alphaTest: 0.12,
      depthWrite: true,
      side: THREE.FrontSide,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });

    // Gender-adjusted anatomical proportions
    const shoulderHalfWidth = isWomen ? 0.186 : 0.224;
    const chestRadius = isWomen ? 0.172 : 0.205;
    const waistRadius = isWomen ? 0.132 : 0.162;
    const hipRadius = isWomen ? 0.185 : 0.174;
    const depthRatio = isWomen ? 0.64 : 0.67;

    // Hem bottom coordinate relative to ground (0)
    const hemBottomY = isAnarkali ? 0.20 : isKurta ? 0.56 : isWaistcoat || isPrinceCoat ? 0.72 : 0.52;
    const hemRadius = isAnarkali ? 0.36 : isKurta ? 0.215 : isWaistcoat || isPrinceCoat ? 0.20 : 0.235;
    const shoulderTopY = 1.44;
    const pelvisPivotY = 0.89;

    // Hierarchy: mannequinGroup -> pelvisGroup -> (torsoPivot + L/R HipPivots)
    const pelvisGroup = new THREE.Group();
    pelvisGroup.position.set(0, pelvisPivotY, 0);
    mannequinGroup.add(pelvisGroup);

    const torsoPivot = new THREE.Group();
    torsoPivot.position.set(0, 0, 0);
    pelvisGroup.add(torsoPivot);

    // Sculpted V-Tapered Full-Length Torso/Garment (LatheGeometry in torsoPivot local coords where y=0 is pelvis 0.89)
    const localHemY = hemBottomY - pelvisPivotY; // negative below pelvis
    const localShoulderY = shoulderTopY - pelvisPivotY; // ~0.55

    const torsoPoints: THREE.Vector2[] = [
      new THREE.Vector2(hemRadius * 0.96, localHemY),
      new THREE.Vector2(hemRadius, localHemY + 0.025),
      new THREE.Vector2(THREE.MathUtils.lerp(hemRadius, hipRadius, 0.55), localHemY * 0.52),
      new THREE.Vector2(hipRadius, 0.0), // Pelvis / Hip level
      new THREE.Vector2(THREE.MathUtils.lerp(hipRadius, waistRadius, 0.65), 0.10),
      new THREE.Vector2(waistRadius, 0.20), // Tapered waist
      new THREE.Vector2(THREE.MathUtils.lerp(waistRadius, chestRadius, 0.58), 0.32),
      new THREE.Vector2(chestRadius, 0.42), // Defined chest
      new THREE.Vector2(shoulderHalfWidth * 0.94, 0.49), // Broad shoulder line
      new THREE.Vector2(shoulderHalfWidth * 0.72, localShoulderY - 0.01),
      new THREE.Vector2(isWomen ? 0.068 : 0.078, localShoulderY + 0.015), // Collar base
    ];

    const torsoGeo = new THREE.LatheGeometry(torsoPoints, 40);
    torsoGeo.scale(1.0, 1.0, depthRatio);
    torsoGeo.computeVertexNormals();
    const torsoMesh = new THREE.Mesh(torsoGeo, garmentMat);
    torsoMesh.castShadow = !isSoftwareGl;
    torsoMesh.receiveShadow = !isSoftwareGl;
    torsoPivot.add(torsoMesh);

    // Front Full-Length Decal Overlay (Neck to Hem — ZERO half-chest cutoff!)
    const decalOffsetPoints = torsoPoints.map(
      (p) => new THREE.Vector2(p.x + 0.0028, p.y)
    );
    const frontDecalGeo = new THREE.LatheGeometry(
      decalOffsetPoints,
      36,
      -Math.PI * 0.34,
      Math.PI * 0.68
    );
    frontDecalGeo.scale(1.0, 1.0, depthRatio);
    frontDecalGeo.computeVertexNormals();
    const frontDecalMesh = new THREE.Mesh(frontDecalGeo, frontDecalMat);
    frontDecalMesh.visible = Boolean(uploadedPhotoUrl && usePhotoTexture);
    torsoPivot.add(frontDecalMesh);

    // Gold Hem Band along bottom of garment
    const hemBandGeo = new THREE.TorusGeometry(hemRadius * 0.985, 0.007, 10, 44);
    hemBandGeo.rotateX(Math.PI / 2);
    hemBandGeo.scale(1.0, 1.0, depthRatio);
    const hemBand = new THREE.Mesh(hemBandGeo, tillaGoldMat);
    hemBand.position.y = localHemY + 0.015;
    torsoPivot.add(hemBand);

    // Sculpted Mandarin Ban Collar (angled comfortably around neck base)
    const collarGeo = new THREE.CylinderGeometry(
      isWomen ? 0.064 : 0.074,
      isWomen ? 0.072 : 0.082,
      0.042,
      32,
      1,
      true
    );
    collarGeo.scale(1.0, 1.0, 0.86);
    const collar = new THREE.Mesh(collarGeo, tillaGoldMat);
    collar.position.set(0, localShoulderY + 0.025, 0.004);
    torsoPivot.add(collar);

    // Front Placket & Buttons (shown in plain colorway mode, hidden when photo texture drapes front)
    const frontChestZ = chestRadius * depthRatio + 0.003;
    const placket = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.32, 0.008), tillaGoldMat);
    placket.position.set(0, 0.38, frontChestZ);
    placket.visible = !Boolean(uploadedPhotoUrl && usePhotoTexture);
    torsoPivot.add(placket);

    const buttonsGroup = new THREE.Group();
    const btnGeo = new THREE.CylinderGeometry(0.0085, 0.0085, 0.007, 14);
    btnGeo.rotateX(Math.PI / 2);
    const btnCount = isKurta ? 4 : 6;
    for (let i = 0; i < btnCount; i++) {
      const btn = new THREE.Mesh(btnGeo, brassMat);
      btn.position.set(0, 0.51 - i * 0.052, frontChestZ + 0.006);
      buttonsGroup.add(btn);
    }
    buttonsGroup.visible = !Boolean(uploadedPhotoUrl && usePhotoTexture);
    torsoPivot.add(buttonsGroup);

    // Women's Draped Dupatta / Shawl Accent over Left Shoulder
    if (isWomen) {
      const dupattaCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.15, 0.14, 0.14),
        new THREE.Vector3(-0.16, 0.45, 0.12),
        new THREE.Vector3(-0.14, localShoulderY + 0.03, 0.02),
        new THREE.Vector3(-0.15, 0.42, -0.13),
        new THREE.Vector3(-0.11, -0.18, -0.17),
      ]);
      const dupattaGeo = new THREE.TubeGeometry(dupattaCurve, 28, 0.044, 12, false);
      dupattaGeo.scale(1.25, 1.0, 0.35);
      const dupattaMat = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(upperColor).offsetHSL(0, 0.04, 0.1),
        roughness: 0.78,
        metalness: 0.0,
        transparent: true,
        opacity: 0.88,
        side: THREE.DoubleSide,
      });
      const dupattaMesh = new THREE.Mesh(dupattaGeo, dupattaMat);
      dupattaMesh.castShadow = !isSoftwareGl;
      torsoPivot.add(dupattaMesh);
    }

    // -------------------------------------------------------------------
    // 3. ANATOMICAL NECK, SCULPTED HEAD, FACIAL FEATURES & HAIR
    // -------------------------------------------------------------------
    const neckCollarGroup = new THREE.Group();
    neckCollarGroup.position.set(0, localShoulderY + 0.02, 0.005);
    torsoPivot.add(neckCollarGroup);

    // Realistic anatomical neck + upper trapezius base
    const neckRadius = isWomen ? 0.046 : 0.055;
    const neckPoints = [
      new THREE.Vector2(neckRadius * 1.45, -0.02),
      new THREE.Vector2(neckRadius * 1.05, 0.02),
      new THREE.Vector2(neckRadius * 0.94, 0.065),
      new THREE.Vector2(neckRadius * 0.96, 0.11),
    ];
    const neckGeo = new THREE.LatheGeometry(neckPoints, 28);
    neckGeo.scale(1.0, 1.0, 0.92);
    const neckMesh = new THREE.Mesh(neckGeo, skinMat);
    neckMesh.castShadow = !isSoftwareGl;
    neckCollarGroup.add(neckMesh);

    const headPivot = new THREE.Group();
    headPivot.position.set(0, 0.11, 0.012);
    neckCollarGroup.add(headPivot);

    // Sculpted Anatomical Head (Oval cranium + tapered jawline via LatheGeometry + Z-depth scaling)
    const headScale = isWomen ? 0.95 : 1.0;
    const headPoints = [
      new THREE.Vector2(0.0, 0.0), // Chin tip
      new THREE.Vector2(0.036 * headScale, 0.015), // Chin contour
      new THREE.Vector2(0.062 * headScale, 0.045), // Jawline
      new THREE.Vector2(0.078 * headScale, 0.088), // Cheekbones
      new THREE.Vector2(0.084 * headScale, 0.132), // Temples / Brow
      new THREE.Vector2(0.079 * headScale, 0.174), // Forehead
      new THREE.Vector2(0.052 * headScale, 0.205), // Upper cranium
      new THREE.Vector2(0.0, 0.216), // Crown apex
    ];
    const headGeo = new THREE.LatheGeometry(headPoints, 32);
    headGeo.scale(0.92, 1.0, 1.08); // Deeper front-to-back than side-to-side
    headGeo.computeVertexNormals();
    const headMesh = new THREE.Mesh(headGeo, skinMat);
    headMesh.castShadow = !isSoftwareGl;
    headPivot.add(headMesh);

    // Sculpted Nose Bridge & Tip
    const noseBridge = new THREE.Mesh(
      new THREE.CylinderGeometry(0.007, 0.012, 0.044, 10),
      skinMat
    );
    noseBridge.position.set(0, 0.095, 0.085 * headScale);
    noseBridge.rotation.x = -0.22;
    headPivot.add(noseBridge);

    const noseTip = new THREE.Mesh(new THREE.SphereGeometry(0.011, 12, 10), skinMat);
    noseTip.position.set(0, 0.076, 0.092 * headScale);
    headPivot.add(noseTip);

    // Left & Right Ears
    [-1, 1].forEach((side) => {
      const earGeo = new THREE.SphereGeometry(0.018 * headScale, 12, 10);
      earGeo.scale(0.42, 1.25, 0.72);
      const ear = new THREE.Mesh(earGeo, skinMat);
      ear.position.set(side * 0.076 * headScale, 0.098, 0.002);
      ear.rotation.y = side * 0.18;
      headPivot.add(ear);
    });

    // Sculpted Eyes, Brows & Lips
    [-1, 1].forEach((side) => {
      // Eye sclera
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.0105, 12, 10), eyeWhiteMat);
      eye.scale.set(1.2, 0.7, 0.65);
      eye.position.set(side * 0.027 * headScale, 0.115, 0.075 * headScale);
      headPivot.add(eye);

      // Iris/Pupil
      const iris = new THREE.Mesh(new THREE.SphereGeometry(0.0058, 10, 8), featureDarkMat);
      iris.position.set(side * 0.027 * headScale, 0.115, 0.081 * headScale);
      headPivot.add(iris);

      // Eyebrow arch
      const brow = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.0045, 0.008), hairMat);
      brow.position.set(side * 0.028 * headScale, 0.132, 0.079 * headScale);
      brow.rotation.z = -side * 0.08;
      headPivot.add(brow);
    });

    // Natural Mouth / Lips contour
    const lips = new THREE.Mesh(new THREE.CapsuleGeometry(0.0045, 0.022, 4, 8), lipMat);
    lips.rotation.z = Math.PI / 2;
    lips.scale.set(1.0, 1.0, 0.6);
    lips.position.set(0, 0.052, 0.080 * headScale);
    headPivot.add(lips);

    // Gender-Adapted Hair & Facial Grooming
    if (isWomen) {
      // Sleek parted hair + low fashion bun/chignon
      const hairCapGeo = new THREE.SphereGeometry(0.084 * headScale, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.62);
      hairCapGeo.scale(0.94, 1.04, 1.11);
      const hairCap = new THREE.Mesh(hairCapGeo, hairMat);
      hairCap.position.set(0, 0.132, -0.006);
      hairCap.rotation.x = -0.18;
      headPivot.add(hairCap);

      const hairBun = new THREE.Mesh(new THREE.SphereGeometry(0.044, 18, 14), hairMat);
      hairBun.scale.set(1.0, 0.9, 1.15);
      hairBun.position.set(0, 0.105, -0.095);
      headPivot.add(hairBun);
    } else {
      // Sculpted men's swept-back coiffure + subtle trimmed jawline beard
      const hairCapGeo = new THREE.SphereGeometry(0.082 * headScale, 22, 16, 0, Math.PI * 2, 0, Math.PI * 0.56);
      hairCapGeo.scale(0.95, 1.02, 1.1);
      const hairCap = new THREE.Mesh(hairCapGeo, hairMat);
      hairCap.position.set(0, 0.136, -0.008);
      hairCap.rotation.x = -0.22;
      headPivot.add(hairCap);

      // Volume front quiff
      const quiff = new THREE.Mesh(new THREE.CapsuleGeometry(0.026, 0.052, 6, 12), hairMat);
      quiff.rotation.z = Math.PI / 2;
      quiff.scale.set(0.8, 1.0, 1.15);
      quiff.position.set(0, 0.194, 0.025);
      headPivot.add(quiff);

      // Subtle groomed beard contour along lower jaw
      const beardGeo = new THREE.LatheGeometry(
        [
          new THREE.Vector2(0.0, 0.0),
          new THREE.Vector2(0.037, 0.015),
          new THREE.Vector2(0.063, 0.044),
          new THREE.Vector2(0.068, 0.062),
        ],
        24,
        -Math.PI * 0.42,
        Math.PI * 0.84
      );
      beardGeo.scale(0.93, 1.0, 1.09);
      const beard = new THREE.Mesh(beardGeo, hairMat);
      beard.position.set(0, -0.001, 0.001);
      headPivot.add(beard);
    }

    // -------------------------------------------------------------------
    // 4. ARTICULATED ARMS, ELBOWS & SCULPTED HANDS (CapsuleGeometry Rig)
    // -------------------------------------------------------------------
    const armOffsetX = shoulderHalfWidth + (isWomen ? 0.018 : 0.022);
    const shoulderYLocal = 0.485;

    const buildArm = (sideSign: number) => {
      const shoulderPivot = new THREE.Group();
      shoulderPivot.position.set(sideSign * armOffsetX, shoulderYLocal, 0.0);
      shoulderPivot.rotation.z = sideSign * 0.085; // Natural slight outward hang

      // Tailored shoulder cap
      const shoulderCap = new THREE.Mesh(
        new THREE.SphereGeometry(isWomen ? 0.050 : 0.058, 18, 14),
        garmentMat
      );
      shoulderCap.scale.set(1.0, 0.92, 0.9);
      shoulderPivot.add(shoulderCap);

      // Upper arm sleeve (or bare skin/kurta sleeve for waistcoat)
      const upperArmMat = garmentMat;
      const upperArm = new THREE.Mesh(
        new THREE.CapsuleGeometry(isWomen ? 0.043 : 0.050, 0.22, 6, 16),
        upperArmMat
      );
      upperArm.position.y = -0.135;
      upperArm.castShadow = !isSoftwareGl;
      shoulderPivot.add(upperArm);

      // Elbow pivot
      const elbowPivot = new THREE.Group();
      elbowPivot.position.set(0, -0.265, 0);
      elbowPivot.rotation.x = -0.20; // Natural anatomical elbow bend
      shoulderPivot.add(elbowPivot);

      // Forearm sleeve
      const forearm = new THREE.Mesh(
        new THREE.CapsuleGeometry(isWomen ? 0.036 : 0.042, 0.21, 6, 16),
        upperArmMat
      );
      forearm.position.y = -0.125;
      forearm.castShadow = !isSoftwareGl;
      elbowPivot.add(forearm);

      // Tailored Gold Wrist Cuff
      const cuff = new THREE.Mesh(
        new THREE.CylinderGeometry(isWomen ? 0.039 : 0.044, isWomen ? 0.039 : 0.044, 0.028, 20),
        tillaGoldMat
      );
      cuff.position.y = -0.235;
      elbowPivot.add(cuff);

      // Articulated Skin Hand
      const hand = buildArticulatedHand(skinMat, sideSign);
      hand.position.y = -0.255;
      elbowPivot.add(hand);

      torsoPivot.add(shoulderPivot);
      return { shoulderPivot, elbowPivot };
    };

    const leftArmRig = buildArm(-1);
    const rightArmRig = buildArm(1);

    // -------------------------------------------------------------------
    // 5. SCULPTED LEGS (Trousers / Shalwar LatheGeometry) & FOOTWEAR
    // -------------------------------------------------------------------
    const hipOffsetX = isWomen ? 0.088 : 0.096;
    const isShalwar = isKurta || isAnarkali;

    const buildLeg = (sideSign: number) => {
      const hipPivot = new THREE.Group();
      hipPivot.position.set(sideSign * hipOffsetX, 0.0, 0);
      pelvisGroup.add(hipPivot);

      // Upper trouser / shalwar thigh (from y = 0 down to knee y = -0.43)
      const thighPoints = isShalwar
        ? [
            new THREE.Vector2(0.085, -0.44),
            new THREE.Vector2(0.115, -0.24),
            new THREE.Vector2(0.118, -0.05),
            new THREE.Vector2(0.095, 0.03),
          ]
        : [
            new THREE.Vector2(0.068, -0.44),
            new THREE.Vector2(0.080, -0.22),
            new THREE.Vector2(0.092, -0.04),
            new THREE.Vector2(0.088, 0.03),
          ];
      const thighGeo = new THREE.LatheGeometry(thighPoints, 24);
      thighGeo.computeVertexNormals();
      const thighMesh = new THREE.Mesh(thighGeo, trouserMat);
      thighMesh.castShadow = !isSoftwareGl;
      hipPivot.add(thighMesh);

      // Knee pivot at y = -0.43 (world y = 0.46)
      const kneePivot = new THREE.Group();
      kneePivot.position.set(0, -0.43, 0);
      hipPivot.add(kneePivot);

      // Lower leg / shin trouser taper (from y = 0 down to ankle y = -0.39)
      const shinPoints = isShalwar
        ? [
            new THREE.Vector2(0.060, -0.39),
            new THREE.Vector2(0.078, -0.22),
            new THREE.Vector2(0.088, -0.04),
            new THREE.Vector2(0.082, 0.02),
          ]
        : [
            new THREE.Vector2(0.050, -0.39),
            new THREE.Vector2(0.062, -0.20),
            new THREE.Vector2(0.068, -0.03),
            new THREE.Vector2(0.066, 0.02),
          ];
      const shinGeo = new THREE.LatheGeometry(shinPoints, 24);
      shinGeo.computeVertexNormals();
      const shinMesh = new THREE.Mesh(shinGeo, trouserMat);
      shinMesh.castShadow = !isSoftwareGl;
      kneePivot.add(shinMesh);

      // Subtle ankle skin bridge
      const ankleSkin = new THREE.Mesh(
        new THREE.CylinderGeometry(0.038, 0.036, 0.05, 16),
        skinMat
      );
      ankleSkin.position.y = -0.405;
      kneePivot.add(ankleSkin);

      // Footwear pivot planted so sole bottom touches world y = 0.08 (local -0.46 from knee -> -0.89 from pelvis)
      const footPivot = new THREE.Group();
      footPivot.position.set(0, -0.46, 0);
      const shoeMesh = buildFootwearMesh(shoeMat, tillaGoldMat, sideSign);
      footPivot.add(shoeMesh);
      kneePivot.add(footPivot);

      return { hipPivot, kneePivot, footPivot };
    };

    const leftLegRig = buildLeg(-1);
    const rightLegRig = buildLeg(1);

    scene.add(mannequinGroup);

    sceneElementsRef.current = {
      mannequinGroup,
      garmentMaterials: [garmentMat],
      trouserMaterial: trouserMat,
      skinMaterial: skinMat,
      buttonMaterials: [brassMat],
      goldTrimMaterials: [tillaGoldMat],
      frontDecalMesh,
      frontDecalMaterial: frontDecalMat,
      placketMesh: placket,
      buttonsGroup,
      fabricBumpTex,
    };

    // -------------------------------------------------------------------
    // 6. HIERARCHICAL RUNWAY WALK KINEMATICS (performance.now delta)
    // -------------------------------------------------------------------
    let frameId = 0;
    let lastTime = performance.now();
    let walkPhase = 0;
    let breathPhase = 0;
    let walkBlend = isWalkingRef.current ? 1 : 0;

    const tick = (now: number) => {
      const delta = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      // Smoothly damp between live walk and static editorial pose
      const targetWalk = isWalkingRef.current ? 1 : 0;
      walkBlend = THREE.MathUtils.damp(walkBlend, targetWalk, 6.0, delta);

      walkPhase += delta * 4.4 * walkBlend;
      breathPhase += delta * 2.0;

      // Legs stride + natural knee flexion + ankle leveling
      const strideSin = Math.sin(walkPhase);
      const strideCos = Math.cos(walkPhase);

      leftLegRig.hipPivot.rotation.x = strideSin * 0.34 * walkBlend;
      rightLegRig.hipPivot.rotation.x = -strideSin * 0.34 * walkBlend;

      const leftKneeBend = Math.max(0, -Math.sin(walkPhase + 0.55)) * 0.42 * walkBlend;
      const rightKneeBend = Math.max(0, Math.sin(walkPhase + 0.55)) * 0.42 * walkBlend;
      leftLegRig.kneePivot.rotation.x = leftKneeBend;
      rightLegRig.kneePivot.rotation.x = rightKneeBend;

      leftLegRig.footPivot.rotation.x =
        (-leftLegRig.hipPivot.rotation.x - leftKneeBend * 0.65) * 0.55;
      rightLegRig.footPivot.rotation.x =
        (-rightLegRig.hipPivot.rotation.x - rightKneeBend * 0.65) * 0.55;

      // Pelvis catwalk sway & vertical stride lift
      pelvisGroup.position.y =
        pelvisPivotY + Math.abs(strideSin) * 0.022 * walkBlend;
      pelvisGroup.rotation.z = strideSin * 0.032 * walkBlend;
      pelvisGroup.rotation.y = strideCos * 0.045 * walkBlend;

      // Torso counter-rotation + natural chest breathing
      torsoPivot.rotation.y = -strideCos * 0.065 * walkBlend;
      torsoPivot.rotation.z = -strideSin * 0.02 * walkBlend;
      const breathExpand = 1 + Math.sin(breathPhase) * 0.008;
      torsoMesh.scale.set(breathExpand, 1, breathExpand);
      frontDecalMesh.scale.set(breathExpand, 1, breathExpand);

      // Subtle head stabilization
      headPivot.rotation.y = strideCos * 0.025 * walkBlend;
      headPivot.rotation.x = Math.sin(breathPhase * 0.7) * 0.015;

      // Articulated arms counter-swing
      leftArmRig.shoulderPivot.rotation.x = -strideSin * 0.26 * walkBlend;
      rightArmRig.shoulderPivot.rotation.x = strideSin * 0.26 * walkBlend;
      leftArmRig.elbowPivot.rotation.x =
        -0.18 - Math.max(0, strideSin) * 0.16 * walkBlend;
      rightArmRig.elbowPivot.rotation.x =
        -0.18 - Math.max(0, -strideSin) * 0.16 * walkBlend;

      // Animated runway floor lights gliding backward under feet while walking
      ledTexture.offset.y = (ledTexture.offset.y - delta * 1.4 * walkBlend) % 1;

      // Contact shadow subtle pulse with foot stride
      contactShadow.scale.setScalar(1.0 + Math.abs(strideSin) * 0.06 * walkBlend);

      // Optional 360 turntable spin
      if (isTurntableActiveRef.current) {
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
      ledTexture.dispose();
      shadowTex.dispose();
      fabricBumpTex.dispose();
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
  }, [isOpen, garmentSilhouette, gender]);

  // -------------------------------------------------------------------
  // FULL-BODY 1024x1024 GARMENT TEXTURE PROCESSOR (NECK TO HEM, NO CUTOFF)
  // -------------------------------------------------------------------
  useEffect(() => {
    const decalMesh = sceneElementsRef.current.frontDecalMesh;
    const decalMat = sceneElementsRef.current.frontDecalMaterial;
    const placketMesh = sceneElementsRef.current.placketMesh;
    const buttonsGroup = sceneElementsRef.current.buttonsGroup;

    if (!uploadedPhotoUrl || !usePhotoTexture) {
      if (decalMesh) decalMesh.visible = false;
      if (decalMat) {
        if (decalMat.map) {
          decalMat.map.dispose();
          decalMat.map = null;
        }
        decalMat.needsUpdate = true;
      }
      if (placketMesh) placketMesh.visible = true;
      if (buttonsGroup) buttonsGroup.visible = true;
      return;
    }

    if (placketMesh) placketMesh.visible = false;
    if (buttonsGroup) buttonsGroup.visible = false;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const natW = img.naturalWidth || img.width || 512;
      const natH = img.naturalHeight || img.height || 512;

      // Step 1: Draw full source onto off-screen inspection canvas
      const scanCanvas = document.createElement('canvas');
      scanCanvas.width = natW;
      scanCanvas.height = natH;
      const scanCtx = scanCanvas.getContext('2d');
      if (!scanCtx) return;

      scanCtx.drawImage(img, 0, 0);
      const imgDataObj = scanCtx.getImageData(0, 0, natW, natH);
      const px = imgDataObj.data;

      // Sample 4 corner background pixels
      const samplePixel = (x: number, y: number) => {
        const idx = (y * natW + x) * 4;
        return [px[idx], px[idx + 1], px[idx + 2]];
      };
      const corners = [
        samplePixel(Math.min(6, natW - 1), Math.min(6, natH - 1)),
        samplePixel(Math.max(0, natW - 7), Math.min(6, natH - 1)),
        samplePixel(Math.min(6, natW - 1), Math.max(0, natH - 7)),
        samplePixel(Math.max(0, natW - 7), Math.max(0, natH - 7)),
      ];
      const bgR = corners.reduce((a, c) => a + c[0], 0) / 4;
      const bgG = corners.reduce((a, c) => a + c[1], 0) / 4;
      const bgB = corners.reduce((a, c) => a + c[2], 0) / 4;

      // Border-connected BFS flood fill background removal (preserves dark interior fabric/embroidery!)
      const visited = new Uint8Array(natW * natH);
      const bgMask = new Uint8Array(natW * natH);
      const queue = new Int32Array(natW * natH);
      let head = 0;
      let tail = 0;

      const trySeed = (x: number, y: number) => {
        const pIdx = y * natW + x;
        if (visited[pIdx]) return;
        const off = pIdx * 4;
        const diff = Math.hypot(px[off] - bgR, px[off + 1] - bgG, px[off + 2] - bgB);
        if (px[off + 3] < 80 || diff < 48) {
          visited[pIdx] = 1;
          bgMask[pIdx] = 1;
          queue[tail++] = pIdx;
        }
      };

      for (let x = 0; x < natW; x++) {
        trySeed(x, 0);
        trySeed(x, natH - 1);
      }
      for (let y = 0; y < natH; y++) {
        trySeed(0, y);
        trySeed(natW - 1, y);
      }

      while (head < tail) {
        const curr = queue[head++];
        const cx = curr % natW;
        const cy = (curr / natW) | 0;
        const neighbors = [
          cx > 0 ? curr - 1 : -1,
          cx < natW - 1 ? curr + 1 : -1,
          cy > 0 ? curr - natW : -1,
          cy < natH - 1 ? curr + natW : -1,
        ];
        for (let n = 0; n < 4; n++) {
          const nIdx = neighbors[n];
          if (nIdx < 0 || visited[nIdx]) continue;
          visited[nIdx] = 1;
          const off = nIdx * 4;
          const diff = Math.hypot(px[off] - bgR, px[off + 1] - bgG, px[off + 2] - bgB);
          if (px[off + 3] < 80 || diff < 46) {
            bgMask[nIdx] = 1;
            queue[tail++] = nIdx;
          }
        }
      }

      // Scan full garment bounding box (upper + lower garment up to 80% height so kurta/coat never clips at chest)
      const maxScanY = Math.floor(natH * 0.80);
      let minX = natW;
      let maxX = 0;
      let minY = maxScanY;
      let maxY = 0;
      let fgCount = 0;

      for (let y = 0; y < natH; y++) {
        for (let x = 0; x < natW; x++) {
          const pIdx = y * natW + x;
          const off = pIdx * 4;
          if (bgMask[pIdx]) {
            px[off + 3] = 0;
          } else if (y < maxScanY) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
            fgCount++;
          }
        }
      }
      scanCtx.putImageData(imgDataObj, 0, 0);

      // Compute clean full-garment crop rectangle
      let cropX = Math.floor(natW * 0.14);
      let cropY = Math.floor(natH * 0.04);
      let cropW = Math.floor(natW * 0.72);
      let cropH = Math.floor(natH * 0.72);

      if (fgCount > 250 && maxX > minX + 16 && maxY > minY + 16) {
        cropX = minX;
        cropY = minY;
        cropW = maxX - minX + 1;
        cropH = maxY - minY + 1;
      }

      // Step 2: Render into crisp 1024x1024 texture canvas (collar at top -> hem at bottom, ZERO cutoff)
      const TEX_SIZE = 1024;
      const canvas = document.createElement('canvas');
      canvas.width = TEX_SIZE;
      canvas.height = TEX_SIZE;
      const ctx = canvas.getContext('2d');

      let sampledUpperHex = upperColor;
      let sampledLowerHex = lowerColor;

      if (ctx) {
        ctx.clearRect(0, 0, TEX_SIZE, TEX_SIZE);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(scanCanvas, cropX, cropY, cropW, cropH, 0, 0, TEX_SIZE, TEX_SIZE);

        // Sample primary garment color from central upper torso (for sleeves & torso wraparound)
        try {
          const chestData = ctx.getImageData(
            Math.floor(TEX_SIZE * 0.25),
            Math.floor(TEX_SIZE * 0.18),
            Math.floor(TEX_SIZE * 0.50),
            Math.floor(TEX_SIZE * 0.45)
          ).data;
          let rSum = 0;
          let gSum = 0;
          let bSum = 0;
          let count = 0;
          for (let i = 0; i < chestData.length; i += 16) {
            if (chestData[i + 3] > 200) {
              rSum += chestData[i];
              gSum += chestData[i + 1];
              bSum += chestData[i + 2];
              count++;
            }
          }
          if (count > 0) {
            const sr = Math.round(rSum / count);
            const sg = Math.round(gSum / count);
            const sb = Math.round(bSum / count);
            sampledUpperHex = `#${((1 << 24) + (sr << 16) + (sg << 8) + sb).toString(16).slice(1)}`;
          }

          // Sample lower area of original photo (y = 78%..92%) for coordinated trousers/shalwar color
          const lowY = Math.floor(natH * 0.78);
          const lowH = Math.max(8, Math.floor(natH * 0.14));
          const lowData = scanCtx.getImageData(
            Math.floor(natW * 0.30),
            lowY,
            Math.floor(natW * 0.40),
            lowH
          ).data;
          let lr = 0;
          let lg = 0;
          let lb = 0;
          let lc = 0;
          for (let i = 0; i < lowData.length; i += 16) {
            if (lowData[i + 3] > 200) {
              lr += lowData[i];
              lg += lowData[i + 1];
              lb += lowData[i + 2];
              lc++;
            }
          }
          if (lc > 15) {
            const tr = Math.round(lr / lc);
            const tg = Math.round(lg / lc);
            const tb = Math.round(lb / lc);
            sampledLowerHex = `#${((1 << 24) + (tr << 16) + (tg << 8) + tb).toString(16).slice(1)}`;
          } else {
            // Smart couture coordination if photo only showed top wear
            const c = new THREE.Color(sampledUpperHex);
            const hsl = { h: 0, s: 0, l: 0 };
            c.getHSL(hsl);
            sampledLowerHex = hsl.l > 0.65 ? '#1e293b' : '#f4f1ea';
          }
        } catch (err) {
          console.warn('Garment color sampling error:', err);
        }

        // Apply extracted colors synchronously to sleeves, torso wraparound, and trousers
        setUpperColor(sampledUpperHex);
        setSelectedPalette(sampledUpperHex);
        setLowerColor(sampledLowerHex);

        const upperCol = new THREE.Color(sampledUpperHex);
        sceneElementsRef.current.garmentMaterials.forEach((m) => {
          m.color = upperCol;
          m.roughness = 0.82;
          m.metalness = 0.0;
          m.needsUpdate = true;
        });

        if (sceneElementsRef.current.trouserMaterial) {
          sceneElementsRef.current.trouserMaterial.color = new THREE.Color(sampledLowerHex);
          sceneElementsRef.current.trouserMaterial.needsUpdate = true;
        }
      }

      const texture = new THREE.CanvasTexture(canvas);
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.repeat.set(1, 1);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.needsUpdate = true;

      if (decalMat) {
        if (decalMat.map) decalMat.map.dispose();
        decalMat.map = texture;
        decalMat.color = new THREE.Color(0xffffff);
        decalMat.roughness = 0.82;
        decalMat.metalness = 0.0;
        decalMat.transparent = true;
        decalMat.alphaTest = 0.12;
        decalMat.depthWrite = true;
        decalMat.needsUpdate = true;
      }
      if (decalMesh) {
        decalMesh.visible = true;
      }
    };
    img.onerror = (err) =>
      console.warn('Could not process uploaded outfit texture in 3D studio:', err);
    img.src = uploadedPhotoUrl;
  }, [uploadedPhotoUrl, usePhotoTexture, isOpen, garmentSilhouette, gender]);

  // Live Fabric Color, Skin Tone & Finish Updates
  useEffect(() => {
    const upperCol = new THREE.Color(upperColor);
    sceneElementsRef.current.garmentMaterials.forEach((mat) => {
      mat.color = upperCol;
      mat.clearcoat = 0.0;
      if (fabricFinish === 'velvet') {
        mat.roughness = 0.88;
        mat.metalness = 0.0;
        mat.sheen = 0.45;
      } else if (fabricFinish === 'raw-silk') {
        mat.roughness = 0.82;
        mat.metalness = 0.0;
        mat.sheen = 0.15;
      } else {
        // brocade
        mat.roughness = 0.62;
        mat.metalness = 0.22;
        mat.sheen = 0.25;
      }
      mat.needsUpdate = true;
    });

    if (sceneElementsRef.current.frontDecalMaterial && usePhotoTexture && uploadedPhotoUrl) {
      sceneElementsRef.current.frontDecalMaterial.color.set(0xffffff);
      sceneElementsRef.current.frontDecalMaterial.roughness = 0.82;
      sceneElementsRef.current.frontDecalMaterial.metalness = 0.0;
      sceneElementsRef.current.frontDecalMaterial.needsUpdate = true;
    }

    if (sceneElementsRef.current.trouserMaterial) {
      sceneElementsRef.current.trouserMaterial.color = new THREE.Color(lowerColor);
      sceneElementsRef.current.trouserMaterial.needsUpdate = true;
    }

    if (sceneElementsRef.current.skinMaterial) {
      sceneElementsRef.current.skinMaterial.color = new THREE.Color(skinToneHex);
      sceneElementsRef.current.skinMaterial.needsUpdate = true;
    }
  }, [upperColor, lowerColor, skinToneHex, fabricFinish, usePhotoTexture, uploadedPhotoUrl]);

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
              <h2 className="sm:hidden font-display text-sm font-bold tracking-tight text-white drop-shadow-md truncate">
                3D Runway
              </h2>
              <h2 className="hidden sm:block font-display text-lg sm:text-xl font-bold tracking-tight text-white drop-shadow-md">
                3D Runway & Dress Studio
              </h2>
              <span className="hidden sm:inline-flex rounded-full bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                PBR Haute Couture
              </span>
            </div>
            <p className="hidden sm:block text-xs text-slate-300 drop-shadow-sm">
              {outfitSpec.lookName} · {gender === 'men' ? 'Mardana Couture' : 'Zanana Couture'}
            </p>
          </div>
        </div>

        {/* Action Bar (Photo Upload, Angle Presets, Zoom, Walk/Pose Toggle, 360 Spin, Close) */}
        <div className="flex items-center gap-1 sm:gap-2 pointer-events-auto shrink-0">
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
            className="flex items-center justify-center p-1.5 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl border border-purple-400/40 bg-purple-600/30 text-xs font-semibold text-white shadow-md hover:bg-purple-600/50 hover:border-purple-300 transition cursor-pointer"
            title="Upload photo of your actual clothes to map full-body in 3D"
            aria-label="Upload Outfit Photo"
          >
            <Upload size={14} className="text-purple-300" />
            <span className="hidden sm:inline ml-1.5">Upload Outfit Photo</span>
          </button>

          {/* Multi-Angle Presets (Desktop) */}
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

          {/* Runway Walk / Pose Toggle */}
          <button
            onClick={() => setIsWalking((prev) => !prev)}
            className={`rounded-lg sm:rounded-xl border p-1.5 sm:px-3 sm:py-1.5 text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 ${
              isWalking
                ? 'bg-emerald-600/50 border-emerald-400 text-white shadow-md'
                : 'bg-black/60 border-white/20 text-slate-300 hover:bg-white/10'
            }`}
            title={isWalking ? 'Switch to Static Pose' : 'Start Runway Walk'}
            aria-label="Toggle Walk or Pose"
          >
            {isWalking ? <Footprints size={14} /> : <User size={14} />}
            <span className="hidden md:inline">{isWalking ? 'Walk' : 'Pose'}</span>
          </button>

          {/* 360 Turntable Toggle */}
          <button
            onClick={() => setIsTurntableActive((prev) => !prev)}
            className={`rounded-lg sm:rounded-xl border p-1.5 sm:px-3 sm:py-1.5 text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 ${
              isTurntableActive
                ? 'bg-purple-600/50 border-purple-400 text-white shadow-md'
                : 'bg-black/60 border-white/20 text-slate-300 hover:bg-white/10'
            }`}
            title="Toggle 360° Turntable Spin"
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

          {/* Close Modal */}
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

      {/* Floating Top Custom Prompt Dress Studio Bar */}
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
            <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">{webGlError}</p>
            <p className="text-[11px] text-slate-400 mt-2">
              All tailoring specifications, custom prompt inputs, and fabric finishing below remain 100% active.
            </p>
          </div>
        </div>
      ) : (
        <div
          ref={mountRef}
          className="relative h-full w-full cursor-grab active:cursor-grabbing select-none"
          title="Click and drag to rotate 3D runway model 360°"
        />
      )}

      {/* Mobile Angle Selector bar */}
      <div className="sm:hidden absolute top-28 inset-x-0 z-20 flex justify-center px-4 pointer-events-none">
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

      {/* Bottom Spec Card & Mobile Bottom Sheet */}
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
              {/* Mobile Close Handle */}
              <div
                onClick={() => setIsControlsCollapsed(true)}
                className="sm:hidden flex flex-col items-center justify-center pb-1 pt-0 cursor-pointer"
                title="Tap to minimize fabric specs"
              >
                <div className="h-1.5 w-12 rounded-full bg-white/40 mb-1" />
                <span className="text-[10px] text-slate-400 font-medium">Tap to minimize panel</span>
              </div>

              {/* Palette, Skin Tone, Photo Controls & Weave Finish */}
              <div className="space-y-3 border-b border-white/10 pb-3">
                {/* Row 1: Unlimited Color Palette, Heritage Swatches & Skin Tone */}
                <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                      <Palette size={14} className="text-purple-400" />
                      <span>Palette:</span>
                    </div>

                    <label
                      className="relative flex items-center justify-center h-7 w-7 rounded-lg border border-white/30 bg-black/50 overflow-hidden cursor-pointer hover:border-purple-400 transition"
                      title="Pick any custom color across full 16.7M spectrum"
                    >
                      <input
                        type="color"
                        value={selectedPalette}
                        onChange={(e) => applyPaletteColor(e.target.value)}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                      <span
                        className="h-4 w-4 rounded-full border border-white/40 shadow-xs"
                        style={{ backgroundColor: selectedPalette }}
                      />
                    </label>

                    <input
                      type="text"
                      value={selectedPalette}
                      onChange={(e) => applyPaletteColor(e.target.value)}
                      placeholder="#0f766e"
                      maxLength={7}
                      className="w-20 rounded-lg bg-black/60 border border-white/20 px-2 py-0.5 text-xs text-white font-mono focus:border-purple-400 outline-none"
                      title="Type any 6-digit Hex code (e.g. #064e3b)"
                    />
                  </div>

                  {/* Preset Dynamic Heritage Swatches + Skin Tone Swatches */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {[
                        { hex: '#064e3b', label: 'Mughal Emerald' },
                        { hex: '#1e3a8a', label: 'Royal Midnight' },
                        { hex: '#881337', label: 'Ruby Velvet' },
                        { hex: '#b45309', label: 'Raw Amber' },
                        { hex: '#f4f1ea', label: 'Ivory Latha' },
                        { hex: '#14171f', label: 'Jet Boski' },
                        { hex: '#be185d', label: 'Gulabi Rose' },
                        { hex: '#d4af37', label: 'Antique Gold' },
                        { hex: '#4c1d95', label: 'Deep Plum' },
                      ].map((color) => (
                        <button
                          key={color.hex}
                          onClick={() => applyPaletteColor(color.hex)}
                          title={color.label}
                          style={{ backgroundColor: color.hex }}
                          className={`h-5 w-5 rounded-full border-2 transition cursor-pointer ${
                            selectedPalette.toLowerCase() === color.hex.toLowerCase()
                              ? 'border-white scale-115 shadow-lg ring-2 ring-purple-400'
                              : 'border-slate-600 opacity-85 hover:opacity-100 hover:scale-110'
                          }`}
                        />
                      ))}
                    </div>

                    <div className="h-4 w-px bg-white/15 hidden sm:block" />

                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-slate-400 mr-0.5">Skin:</span>
                      {SKIN_TONE_PRESETS.map((tone) => (
                        <button
                          key={tone.hex}
                          onClick={() => setSkinToneHex(tone.hex)}
                          title={`Skin tone: ${tone.label}`}
                          style={{ backgroundColor: tone.hex }}
                          className={`h-4 w-4 rounded-full border transition cursor-pointer ${
                            skinToneHex.toLowerCase() === tone.hex.toLowerCase()
                              ? 'border-white scale-115 ring-1 ring-emerald-400'
                              : 'border-slate-600 opacity-80 hover:opacity-100'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Row 2: Custom Photo Upload Mode & Weave Finish */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-white/5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                      <ImageIcon size={14} className="text-purple-400" />
                      <span>Photo Texture:</span>
                    </div>

                    {uploadedPhotoUrl ? (
                      <div className="flex items-center gap-2">
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

                        <div className="relative h-6 w-6 rounded-md overflow-hidden border border-white/30">
                          <img
                            src={uploadedPhotoUrl}
                            alt="Outfit"
                            className="h-full w-full object-cover"
                          />
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

              {/* Bottom spec card detailing */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-left">
                <div className="rounded-xl border border-white/10 bg-white/5 p-2.5">
                  <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-purple-300">
                    <Layers size={11} />
                    <span>Fabric Texture</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-200 line-clamp-2 leading-relaxed">
                    {outfitSpec.fabricTexture}
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/5 p-2.5">
                  <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                    <Sparkles size={11} />
                    <span>Silhouette Fit</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-200 line-clamp-2 leading-relaxed">
                    {outfitSpec.silhouetteFit}
                  </p>
                </div>

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

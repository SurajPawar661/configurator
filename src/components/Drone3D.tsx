import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

interface Drone3DProps {
    pitch: number;
    roll: number;
    yaw: number;
}

// Visual offsets to counteract any built-in tilt in the source .glb file
// CORRECTED: Orientation set to 0 degrees as requested (Straight & Parallel to grid)
const VISUAL_OFFSET_PITCH = 0;
const VISUAL_OFFSET_ROLL = 0;
const VISUAL_OFFSET_YAW = 0;

export const Drone3D = ({ pitch, roll, yaw }: Drone3DProps) => {
    const mountRef = useRef<HTMLDivElement>(null);
    const droneModelRef = useRef<THREE.Group | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const controlsRef = useRef<OrbitControls | null>(null);
    const propRefs = useRef<THREE.Object3D[]>([]);

    useEffect(() => {
        if (!mountRef.current) return;

        // Scene Config: Light Technical Grey
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xf0f0f0);

        const camera = new THREE.PerspectiveCamera(75, 1.6, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ antialias: true });

        renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
        renderer.shadowMap.enabled = true;
        mountRef.current.appendChild(renderer.domElement);

        // Technical Grid (Blueish-Grey)
        const grid = new THREE.GridHelper(20, 40, 0x00aaff, 0xdddddd);
        grid.position.y = -1.2;
        grid.material.opacity = 0.2;
        grid.material.transparent = true;
        scene.add(grid);

        // Main Drone Group
        const droneGroup = new THREE.Group();
        scene.add(droneGroup);
        droneModelRef.current = droneGroup;

        // 1. Minimal Fallback (Axes Helper)
        const axesHelper = new THREE.AxesHelper(1);
        droneGroup.add(axesHelper);

        // 2. GLTF Loader
        const loader = new GLTFLoader();
        loader.load(
            '/drone.glb',
            (gltf) => {
                console.log("GLB Model Loaded");
                droneGroup.remove(axesHelper);
                const model = gltf.scene;
                const box = new THREE.Box3().setFromObject(model);
                const size = box.getSize(new THREE.Vector3());
                const center = box.getCenter(new THREE.Vector3());
                const scale = 2.0 / Math.max(size.x, size.y, size.z);

                model.scale.set(scale, scale, scale);

                // --- CENTERING & ALIGNMENT FIX ---
                // Move the model so its center is at (0,0,0) of the droneGroup
                model.position.set(
                    -center.x * scale,
                    -center.y * scale,
                    -center.z * scale
                );

                model.traverse((o: any) => {
                    if (o.isMesh) {
                        o.castShadow = true; o.receiveShadow = true;
                        if (o.name.toLowerCase().includes('prop') || o.name.toLowerCase().includes('fan')) {
                            propRefs.current.push(o);
                        }
                    }
                });

                droneGroup.add(model);
            },
            undefined,
            (err) => console.warn("GLB load fallback active:", err)
        );

        // Interactivity (Orbit Controls)
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.screenSpacePanning = false;
        controls.minDistance = 2;
        controls.maxDistance = 10;
        controls.maxPolarAngle = Math.PI / 1.5;

        // Lighting
        const mainLight = new THREE.DirectionalLight(0xffffff, 2.5);
        mainLight.position.set(5, 5, 5);
        scene.add(mainLight);
        scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.2));

        camera.position.set(0, 2, 4);
        camera.lookAt(0, 0, 0);
        cameraRef.current = camera;
        controlsRef.current = controls;
        controls.update();

        const animate = () => {
            requestAnimationFrame(animate);

            // Spin GLB props
            propRefs.current.forEach((p) => { p.rotation.y += 0.3; });

            controls.update();
            renderer.render(scene, camera);
        };

        animate();

        const handleResize = () => {
            if (!mountRef.current) return;
            const w = mountRef.current.clientWidth;
            const h = mountRef.current.clientHeight;
            renderer.setSize(w, h);
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
        };

        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
            mountRef.current?.removeChild(renderer.domElement);
        };
    }, []);

    // Active rotation update
    useEffect(() => {
        if (droneModelRef.current) {
            // Live Pitch = (Telemetry Pitch + Visual Bias in GLB) -> Radians
            const totalPitch = pitch + VISUAL_OFFSET_PITCH;
            const totalRoll = roll + VISUAL_OFFSET_ROLL;
            const totalYaw = yaw + VISUAL_OFFSET_YAW;

            droneModelRef.current.rotation.x = -totalPitch * (Math.PI / 180);
            droneModelRef.current.rotation.z = -totalRoll * (Math.PI / 180);
            droneModelRef.current.rotation.y = totalYaw * (Math.PI / 180);
        }
    }, [pitch, roll, yaw]);

    const setView = (type: 'top' | 'side' | 'front' | 'iso') => {
        if (!cameraRef.current || !controlsRef.current) return;

        const cam = cameraRef.current;
        const ctrl = controlsRef.current;

        switch (type) {
            case 'top': cam.position.set(0, 5, 0); break;
            case 'side': cam.position.set(5, 0, 0); break;
            case 'front': cam.position.set(0, 0, -5); break;
            case 'iso': cam.position.set(3, 3, 3); break;
        }

        cam.lookAt(0, 0, 0);
        ctrl.update();
    };

    const handleZoom = (direction: 'in' | 'out') => {
        if (!controlsRef.current) return;
        const zoomSpeed = 1.1;
        if (direction === 'in') {
            controlsRef.current.object.position.multiplyScalar(1 / zoomSpeed);
        } else {
            controlsRef.current.object.position.multiplyScalar(zoomSpeed);
        }
        controlsRef.current.update();
    };

    // Keyboard Shortcuts for Zooming
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === '+' || e.key === '=') handleZoom('in');
            if (e.key === '-' || e.key === '_') handleZoom('out');
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <div ref={mountRef} style={{ width: '100%', height: '100%' }} />

            {/* View Presets & Zoom Overlay */}
            <div style={{
                position: 'absolute',
                bottom: '10px',
                right: '10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                alignItems: 'flex-end'
            }}>
                <div style={{
                    display: 'flex',
                    gap: '5px',
                    background: 'rgba(0,0,0,0.3)',
                    padding: '4px',
                    borderRadius: '4px',
                    backdropFilter: 'blur(4px)'
                }}>
                    {['TOP', 'SIDE', 'FRONT', 'ISO'].map(v => (
                        <button
                            key={v}
                            className="btn-ui"
                            style={{ padding: '2px 6px', fontSize: '8px', border: '1px solid #444' }}
                            onClick={() => setView(v.toLowerCase() as any)}
                        >
                            {v}
                        </button>
                    ))}
                </div>

                {/* Manual Zoom Controls */}
                <div style={{
                    display: 'flex',
                    gap: '5px',
                    background: 'rgba(0,0,0,0.3)',
                    padding: '4px',
                    borderRadius: '4px',
                    backdropFilter: 'blur(4px)'
                }}>
                    <button
                        className="btn-ui"
                        style={{ padding: '2px 8px', fontSize: '7px', fontWeight: 800, border: '1px solid #444' }}
                        onClick={() => handleZoom('in')}
                        title="Zoom In (+)"
                    >
                        Zoom In +
                    </button>
                    <button
                        className="btn-ui"
                        style={{ padding: '2px 8px', fontSize: '7px', fontWeight: 800, border: '1px solid #444' }}
                        onClick={() => handleZoom('out')}
                        title="Zoom Out (-)"
                    >
                        Zoom Out -
                    </button>
                </div>
            </div>
        </div>
    );
};

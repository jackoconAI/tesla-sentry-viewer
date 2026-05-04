"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Move } from "lucide-react";
import {
  CAMERA_ANGLES,
  CAMERA_YAW_DEG,
  type CameraAngle,
} from "@/lib/cameras";
import { clipByAngle, type Clip } from "@/lib/store";
import { type SetVideoRef } from "./video-slot";

interface Props {
  clips: Clip[];
  setVideoRef: SetVideoRef;
}

// Cylinder geometry constants
const RADIUS = 5;
const HEIGHT = 3.5;
const ARC_DEG = 60;
const ARC_RAD = (ARC_DEG * Math.PI) / 180;

export function PanoLayout({ clips, setVideoRef }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoElsRef = useRef<Map<CameraAngle, HTMLVideoElement>>(new Map());
  const [status, setStatus] = useState<"loading" | "ready" | "no-webgl">(
    "loading",
  );

  useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | null = null;

    (async () => {
      const container = containerRef.current;
      if (!container) return;

      // WebGL availability sniff
      try {
        const canvas = document.createElement("canvas");
        if (!canvas.getContext("webgl2") && !canvas.getContext("webgl")) {
          setStatus("no-webgl");
          return;
        }
      } catch {
        setStatus("no-webgl");
        return;
      }

      const THREE = await import("three");
      if (cancelled || !containerRef.current) return;

      const w = container.clientWidth;
      const h = container.clientHeight || 360;

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x000000);

      const camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 100);
      camera.rotation.order = "YXZ";

      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(w, h);
      container.appendChild(renderer.domElement);
      renderer.domElement.style.touchAction = "none";
      renderer.domElement.style.cursor = "grab";

      const meshes: { mesh: import("three").Mesh; tex: import("three").VideoTexture }[] =
        [];

      for (const angle of CAMERA_ANGLES) {
        const v = videoElsRef.current.get(angle);
        if (!v) continue;

        const yawRad = (CAMERA_YAW_DEG[angle] * Math.PI) / 180;
        // Cylinder θ=0 is along +X, increases CCW toward +Z.
        // Camera "looks at -Z" by default (forward = -Z).
        // We want the FRONT cam (yaw 0) centered at −Z direction = θ = −π/2.
        // For each camera at yaw_deg clockwise from front: center θ = −π/2 + yawRad
        // (Three.js Y rotation: positive yaw rotates clockwise looking down.)
        const center = -Math.PI / 2 + yawRad;
        const thetaStart = center - ARC_RAD / 2;

        const geo = new THREE.CylinderGeometry(
          RADIUS,
          RADIUS,
          HEIGHT,
          24,
          1,
          true,
          thetaStart,
          ARC_RAD,
        );

        const tex = new THREE.VideoTexture(v);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;

        const mat = new THREE.MeshBasicMaterial({
          map: tex,
          side: THREE.BackSide,
        });

        const mesh = new THREE.Mesh(geo, mat);
        scene.add(mesh);
        meshes.push({ mesh, tex });
      }

      // Cross-fade adjacent seams with translucent dark "wings" at each camera edge
      // (cheap blend without needing texture overlap).
      const seamGeo = new THREE.PlaneGeometry(0.05, HEIGHT);
      const seamMat = new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      for (let i = 0; i < 6; i++) {
        const seamYaw = (i * 60 - 30) * (Math.PI / 180);
        const seam = new THREE.Mesh(seamGeo, seamMat);
        const center = -Math.PI / 2 + seamYaw;
        seam.position.set(
          RADIUS * Math.cos(center) * 0.999,
          0,
          RADIUS * Math.sin(center) * 0.999,
        );
        seam.lookAt(0, 0, 0);
        scene.add(seam);
      }

      // --- Drag handlers --------------------------------------------------------
      let yaw = 0;
      let pitch = 0;
      let dragging = false;
      let lastX = 0;
      let lastY = 0;

      const onPointerDown = (e: PointerEvent) => {
        dragging = true;
        lastX = e.clientX;
        lastY = e.clientY;
        renderer.domElement.style.cursor = "grabbing";
        try {
          renderer.domElement.setPointerCapture(e.pointerId);
        } catch {}
      };
      const onPointerMove = (e: PointerEvent) => {
        if (!dragging) return;
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        yaw -= dx * 0.005;
        pitch -= dy * 0.005;
        pitch = Math.max(-Math.PI / 4, Math.min(Math.PI / 4, pitch));
        lastX = e.clientX;
        lastY = e.clientY;
      };
      const onPointerUp = (e: PointerEvent) => {
        dragging = false;
        renderer.domElement.style.cursor = "grab";
        try {
          renderer.domElement.releasePointerCapture(e.pointerId);
        } catch {}
      };
      const onWheel = (e: WheelEvent) => {
        e.preventDefault();
        const fov = camera.fov + e.deltaY * 0.05;
        camera.fov = Math.max(40, Math.min(110, fov));
        camera.updateProjectionMatrix();
      };

      renderer.domElement.addEventListener("pointerdown", onPointerDown);
      renderer.domElement.addEventListener("pointermove", onPointerMove);
      renderer.domElement.addEventListener("pointerup", onPointerUp);
      renderer.domElement.addEventListener("pointercancel", onPointerUp);
      renderer.domElement.addEventListener("wheel", onWheel, {
        passive: false,
      });

      const onResize = () => {
        if (!containerRef.current) return;
        const w2 = containerRef.current.clientWidth;
        const h2 = containerRef.current.clientHeight || h;
        camera.aspect = w2 / h2;
        camera.updateProjectionMatrix();
        renderer.setSize(w2, h2);
      };
      const ro = new ResizeObserver(onResize);
      ro.observe(container);

      let raf = 0;
      const animate = () => {
        camera.rotation.y = yaw;
        camera.rotation.x = pitch;
        renderer.render(scene, camera);
        raf = requestAnimationFrame(animate);
      };
      animate();
      setStatus("ready");

      cleanup = () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        renderer.domElement.removeEventListener("pointerdown", onPointerDown);
        renderer.domElement.removeEventListener("pointermove", onPointerMove);
        renderer.domElement.removeEventListener("pointerup", onPointerUp);
        renderer.domElement.removeEventListener("pointercancel", onPointerUp);
        renderer.domElement.removeEventListener("wheel", onWheel);
        meshes.forEach(({ mesh, tex }) => {
          tex.dispose();
          mesh.geometry.dispose();
          (mesh.material as import("three").Material).dispose();
          scene.remove(mesh);
        });
        seamGeo.dispose();
        seamMat.dispose();
        renderer.dispose();
        if (renderer.domElement.parentElement === container) {
          container.removeChild(renderer.domElement);
        }
      };
    })();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, []);

  return (
    <div className="relative w-full bg-black aspect-video overflow-hidden">
      <div ref={containerRef} className="absolute inset-0" />

      {/* Hidden but decoded videos so VideoTexture has frames to sample.
          Using tiny opacity instead of display:none so iOS Safari keeps decoding. */}
      <div
        className="pointer-events-none absolute"
        style={{ left: 0, top: 0, width: 1, height: 1, opacity: 0.001 }}
      >
        {CAMERA_ANGLES.map((angle) => {
          const clip = clipByAngle(clips, angle);
          if (!clip) return null;
          return (
            <video
              key={clip.id}
              ref={(el) => {
                if (el) {
                  videoElsRef.current.set(angle, el);
                  setVideoRef(clip.id)(el);
                } else {
                  videoElsRef.current.delete(angle);
                  setVideoRef(clip.id)(null);
                }
              }}
              src={clip.url}
              playsInline
              preload="auto"
              muted
            />
          );
        })}
      </div>

      {status === "loading" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-xs">Loading 3D viewer…</span>
        </div>
      )}

      {status === "no-webgl" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-center px-6 text-muted-foreground">
          <span className="text-sm">
            WebGL is not available on this device.
          </span>
          <span className="text-xs">Try the Spatial or Cockpit layout.</span>
        </div>
      )}

      {status === "ready" && (
        <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded bg-black/60 px-2 py-1 text-xs text-white/80">
          <Move className="h-3 w-3" />
          drag to look around · scroll to zoom
        </div>
      )}
    </div>
  );
}

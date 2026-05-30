import * as THREE from 'three';
import vertShader from './shaders/orb.vert.glsl?raw';
import fragShader from './shaders/orb.frag.glsl?raw';
import { GESTURES } from '../config/gestures';

export class OrbParticleSystem {
  constructor(scene, gestureId) {
    this.scene = scene;
    this.gestureId = gestureId;
    this.config = GESTURES[gestureId];
    this.formProgress = 0;
    this.formDuration = 2.0; // seconds
    this.isForming = false;
    this.isAlive = false;
    this.position = new THREE.Vector3(0, 0, 0);
    this.targetPosition = new THREE.Vector3(0, 0, 0);

    const behaviorMap = { neutral: 0, repulsion: 1, attraction: 2, oscillate: 3, directional: 4 };
    this.behaviorInt = behaviorMap[this.config.behavior] ?? 0;

    this._buildGeometry();
    this._buildMaterial();
    this.points = new THREE.Points(this.geometry, this.material);
    this.points.visible = false;
    this.scene.add(this.points);
  }

  _buildGeometry() {
    const N = this.config.particleCount;
    const positions = new Float32Array(N * 3);
    const seeds = new Float32Array(N * 3);
    const radials = new Float32Array(N);
    const phases = new Float32Array(N);

    for (let i = 0; i < N; i++) {
      // Random spherical direction
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      seeds[i * 3] = Math.sin(phi) * Math.cos(theta);
      seeds[i * 3 + 1] = Math.sin(phi) * Math.sin(theta);
      seeds[i * 3 + 2] = Math.cos(phi);

      // Bimodal distribution: 65% core-biased, 35% forced into the outer shell
      // so there's a clearly visible coloured outline ring.
      const u = Math.random();
      radials[i] = u < 0.65
        ? Math.random() * Math.random() * 0.60   // dense core/mid
        : 0.68 + Math.random() * 0.32;            // explicit outer shell
      phases[i] = Math.random() * Math.PI * 2;

      positions[i * 3] = seeds[i * 3];
      positions[i * 3 + 1] = seeds[i * 3 + 1];
      positions[i * 3 + 2] = seeds[i * 3 + 2];
    }

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 3));
    this.geometry.setAttribute('aRadial', new THREE.BufferAttribute(radials, 1));
    this.geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
  }

  _buildMaterial() {
    const coreColor = new THREE.Color(this.config.coreColor ?? '#FFFFFF');
    const rimColor = new THREE.Color(this.config.color);
    // Outer-halo tint: fall back to the rim color when no secondary is set.
    const secondaryColor = new THREE.Color(this.config.secondaryColor ?? this.config.color);

    this.material = new THREE.ShaderMaterial({
      vertexShader: vertShader,
      fragmentShader: fragShader,
      uniforms: {
        uTime: { value: 0 },
        uFormProgress: { value: 0 },
        uBlast: { value: 0 },
        uCoreColor: { value: coreColor },
        uRimColor: { value: rimColor },
        uSecondaryColor: { value: secondaryColor },
        uCoreRadius: { value: this.config.coreRadius ?? 0.22 },
        uRimRadius: { value: this.config.rimRadius ?? 0.85 },
        uColorVar: { value: this.config.colorVariation ?? 0.14 },
        uOrbRadius: { value: this.config.orbRadius },
        uAlphaScale: { value: 1.0 },
        uBehavior: { value: this.behaviorInt },
      },
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
    });
  }

  spawn(worldPos) {
    this.targetPosition.copy(worldPos);
    this.position.copy(worldPos);
    this.points.position.copy(worldPos);
    this.formProgress = 0;
    this.isForming = true;
    this.isAlive = true;
    this._fading = false;
    this._launching = false;
    this.points.visible = true;
    this.material.uniforms.uFormProgress.value = 0;
    this.material.uniforms.uBlast.value = 0;
    this.material.uniforms.uAlphaScale.value = 1.0;
  }

  update(deltaTime, time, worldPos) {
    if (!this.isAlive) return;

    // Smooth position tracking
    this.targetPosition.copy(worldPos);
    this.position.lerp(this.targetPosition, 0.08);
    this.points.position.copy(this.position);

    // Forming progress
    if (this.isForming) {
      this.formProgress = Math.min(1, this.formProgress + deltaTime / this.formDuration);
      if (this.formProgress >= 1) this.isForming = false;
    }

    this.material.uniforms.uTime.value = time;
    this.material.uniforms.uFormProgress.value = this.formProgress;
  }

  fadeOut(duration = 0.5) {
    this._fadeStart = this.formProgress;
    this._fadeDuration = duration;
    this._fading = true;
    this._fadeElapsed = 0;
  }

  updateFade(deltaTime) {
    if (!this._fading) return;
    this._fadeElapsed += deltaTime;
    const t = Math.min(1, this._fadeElapsed / this._fadeDuration);
    this.formProgress = this._fadeStart * (1 - t);
    this.material.uniforms.uFormProgress.value = this.formProgress;
    if (t >= 1) {
      this.isAlive = false;
      this.isForming = false;
      this._fading = false;
      this.points.visible = false;
    }
  }

  // Called when gesture is released and the orb was substantially formed.
  // Two things happen simultaneously:
  //   1. uBlast: shader scales each particle outward from the orb's local center
  //   2. points.position.z rushes toward the camera so perspective also blows it up
  // Together these make the orb cover the whole screen before vanishing.
  launchRelease() {
    this._launching = true;
    this._launchProgress = 0;
    this._launchDuration = 0.55;
    this._launchStartZ = this.points.position.z;
    this._launchTargetZ = 0.82;
    this._fading = false;
  }

  updateLaunch(deltaTime) {
    if (!this._launching) return;
    this._launchProgress = Math.min(1, this._launchProgress + deltaTime / this._launchDuration);
    const ease = this._launchProgress * this._launchProgress; // ease-in: slow start, fast finish
    // Rush toward camera
    this.points.position.z = this._launchStartZ + (this._launchTargetZ - this._launchStartZ) * ease;
    // Shader-side expansion: particles also fly outward from orb center
    this.material.uniforms.uBlast.value = ease;
    // Alpha fades so it dissolves before clipping into camera
    this.material.uniforms.uAlphaScale.value = 1.0 - this._launchProgress;
    if (this._launchProgress >= 1) {
      this._launching = false;
      this.isAlive = false;
      this.points.visible = false;
      this.points.position.z = 0;
      this.material.uniforms.uBlast.value = 0;
      this.material.uniforms.uAlphaScale.value = 1.0;
    }
  }

  dispose() {
    this.scene.remove(this.points);
    this.geometry.dispose();
    this.material.dispose();
  }
}

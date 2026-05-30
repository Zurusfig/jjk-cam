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
    const layers = new Float32Array(N);
    const phases = new Float32Array(N);

    for (let i = 0; i < N; i++) {
      // Random spherical direction
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      seeds[i * 3] = Math.sin(phi) * Math.cos(theta);
      seeds[i * 3 + 1] = Math.sin(phi) * Math.sin(theta);
      seeds[i * 3 + 2] = Math.cos(phi);

      // 30% core, 70% halo
      layers[i] = Math.random() < 0.3 ? 0 : 1;
      phases[i] = Math.random() * Math.PI * 2;

      positions[i * 3] = seeds[i * 3];
      positions[i * 3 + 1] = seeds[i * 3 + 1];
      positions[i * 3 + 2] = seeds[i * 3 + 2];
    }

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 3));
    this.geometry.setAttribute('aLayer', new THREE.BufferAttribute(layers, 1));
    this.geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
  }

  _buildMaterial() {
    this.material = new THREE.ShaderMaterial({
      vertexShader: vertShader,
      fragmentShader: fragShader,
      uniforms: {
        uTime: { value: 0 },
        uFormProgress: { value: 0 },
        uColor: { value: new THREE.Color(this.config.color) },
        uOrbRadius: { value: this.config.orbRadius },
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
    this.points.visible = true;
    this.material.uniforms.uFormProgress.value = 0;
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
    // Gradually reduce formProgress to 0 and hide
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

  dispose() {
    this.scene.remove(this.points);
    this.geometry.dispose();
    this.material.dispose();
  }
}

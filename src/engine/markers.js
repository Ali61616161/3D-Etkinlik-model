import * as THREE from 'three';

/** Seçili / üzerine gelinen koltuk işaretçileri + seçili koltuk üstünde ışık sütunu. */
export class Markers {
  constructor(scene, seatGeometry, ownMaterial) {
    // Koltuk görünümünde: kendi oturduğumuz koltuk (açık oturaklı, gerçek siyah renk)
    this.own = new THREE.Mesh(seatGeometry, ownMaterial);
    this.own.visible = false;
    this.own.frustumCulled = false;
    scene.add(this.own);
    this.selected = new THREE.Mesh(
      seatGeometry,
      new THREE.MeshBasicMaterial({ vertexColors: true, color: new THREE.Color(2.6, 0.95, 0.15), toneMapped: false }),
    );
    this.hover = new THREE.Mesh(
      seatGeometry,
      new THREE.MeshBasicMaterial({ vertexColors: true, color: new THREE.Color(1.6, 1.8, 2.2), toneMapped: false }),
    );
    for (const m of [this.selected, this.hover]) {
      m.visible = false;
      m.frustumCulled = false;
      m.renderOrder = 4;
      scene.add(m);
    }
    this.selected.scale.setScalar(1.14);

    const beamGeo = new THREE.CylinderGeometry(0.06, 0.06, 14, 12, 1, true);
    beamGeo.translate(0, 7, 0);
    this.beam = new THREE.Mesh(
      beamGeo,
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(1.8, 0.7, 0.15),
        transparent: true,
        opacity: 0.55,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    this.pin = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 16, 12),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 1.2, 0.25), toneMapped: false }),
    );
    this.beam.visible = this.pin.visible = false;
    this.beam.renderOrder = 5;
    scene.add(this.beam, this.pin);
    this.beamAllowed = true;
  }

  _place(mesh, seat, scale) {
    mesh.position.set(seat.pos[0], seat.pos[1], seat.pos[2]);
    mesh.rotation.set(0, seat.yaw, 0);
    mesh.scale.setScalar(seat.scale * scale);
  }

  setSelected(seat) {
    this.seat = seat;
    this.selected.visible = !!seat;
    if (seat) {
      this._place(this.selected, seat, 1.14);
      this.beam.position.set(seat.pos[0], seat.pos[1] + 0.1, seat.pos[2]);
      this.pin.position.set(seat.pos[0], seat.pos[1] + 4.4, seat.pos[2]);
    }
    this._syncBeam();
  }

  setHover(seat) {
    this.hover.visible = !!seat && seat !== this.seat;
    if (seat) this._place(this.hover, seat, 1.1);
  }

  /** Işık sütunu yalnızca genel görünümde. */
  setOwn(seat) {
    this.own.visible = !!seat;
    if (seat) this._place(this.own, seat, 1);
  }

  setBeamAllowed(v) {
    this.beamAllowed = v;
    this._syncBeam();
  }

  _syncBeam() {
    const on = !!this.seat && this.beamAllowed;
    this.beam.visible = on;
    this.pin.visible = on;
    // koltuğun kendisi birinci şahıs görünümde kamera önünde kalmasın
    this.selected.visible = !!this.seat && this.beamAllowed;
  }

  update(t) {
    if (this.pin.visible) {
      const s = 1 + Math.sin(t * 4) * 0.18;
      this.pin.scale.setScalar(s);
      this.beam.material.opacity = 0.45 + Math.sin(t * 4) * 0.12;
    }
  }
}

import React, { useState, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Html, Line, Sphere } from '@react-three/drei';
import * as THREE from 'three';
import { Sliders, BookOpen, Atom, Zap, Layers, Calculator, PlayCircle } from 'lucide-react';

// --- PHYSICS CONSTANTS & UTILS ---
const K = 8.99; // Coulomb's constant (scaled for visualizer)
const VECTOR_SCALE = 0.15; // Scale factor for force arrows

// --- 3D COMPONENTS ---
const ChargeParticle = ({ id, position, charge, netForce }) => {
  // Positive = Cyan, Negative = Magenta, Neutral = Gray
  const color = charge > 0 ? '#06b6d4' : charge < 0 ? '#ec4899' : '#64748b';
  const radius = Math.max(0.3, Math.abs(charge) * 0.08); 

  // Calculate arrow endpoint
  const start = new THREE.Vector3(...position);
  const forceVec = new THREE.Vector3(...netForce).multiplyScalar(VECTOR_SCALE);
  const end = new THREE.Vector3().addVectors(start, forceVec);
  const forceMag = new THREE.Vector3(...netForce).length().toFixed(1);

  return (
    <group>
      {/* The Charge Sphere */}
      <mesh position={position}>
        <sphereGeometry args={[radius, 32, 32]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} roughness={0.2} />
        
        {/* Floating Label */}
        <Html position={[0, radius + 0.3, 0]} center>
          <div className="flex flex-col items-center pointer-events-none">
            <div className={`px-2 py-1 rounded text-xs font-bold backdrop-blur-md border ${
              charge > 0 ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-200' : 'bg-pink-500/20 border-pink-500/50 text-pink-200'
            }`}>
              q{id}: {charge > 0 ? '+' : ''}{charge}μC
            </div>
          </div>
        </Html>
      </mesh>

      {/* Force Vector Arrow */}
      {forceVec.lengthSq() > 0.01 && (
        <group>
          <Line points={[start, end]} color="#facc15" lineWidth={4} />
          <mesh position={end}>
            <sphereGeometry args={[0.08, 16, 16]} />
            <meshBasicMaterial color="#facc15" />
          </mesh>
          <Html position={end.toArray()} center>
            <div className="text-[10px] text-yellow-400 font-mono mt-2 ml-2 pointer-events-none">
              |F| = {forceMag}N
            </div>
          </Html>
        </group>
      )}
    </group>
  );
};

export default function ElectrostaticsVisualizer() {
  const [activeModule, setActiveModule] = useState('coulomb');
  
  // Interactive State for Charges
  const [charges, setCharges] = useState([
    { id: 1, pos: [-3, 0, 0], q: 5 },
    { id: 2, pos: [3, 0, 0], q: -3 },
    { id: 3, pos: [0, 3, 0], q: 2 },
  ]);

  // Calculate Superposition Forces
  const calculatedCharges = useMemo(() => {
    return charges.map((target, i) => {
      let fx = 0, fy = 0, fz = 0;
      charges.forEach((source, j) => {
        if (i === j) return;
        const dx = target.pos[0] - source.pos[0];
        const dy = target.pos[1] - source.pos[1];
        const dz = target.pos[2] - source.pos[2];
        const rSq = dx*dx + dy*dy + dz*dz;
        const r = Math.sqrt(rSq);
        
        if (r === 0) return;
        
        const fMag = (K * target.q * source.q) / rSq; 
        
        fx += fMag * (dx / r);
        fy += fMag * (dy / r);
        fz += fMag * (dz / r);
      });
      return { ...target, netForce: [fx, fy, fz] };
    });
  }, [charges]);

  // Update charge
  const updateCharge = (index, field, value) => {
    const newCharges = [...charges];
    if (field === 'pos') {
      newCharges[index].pos = value;
    } else {
      newCharges[index][field] = parseFloat(value);
    }
    setCharges(newCharges);
  };

  return (
    <div className="flex h-screen w-full bg-slate-950 font-sans text-slate-200 overflow-hidden selection:bg-cyan-500/30">
      
      {/* LEFT SIDEBAR */}
      <aside className="w-20 lg:w-64 flex-shrink-0 bg-slate-900/60 border-r border-slate-800 backdrop-blur-xl flex flex-col p-4 z-10">
        <div className="flex items-center gap-3 mb-10 px-2 mt-2">
          <Atom className="text-cyan-400 w-8 h-8 animate-pulse" />
          <h1 className="text-xl font-bold tracking-widest hidden lg:block text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-500">
            PHYSICSVERSE
          </h1>
        </div>
        
        <nav className="flex flex-col gap-2">
          <NavItem icon={<Zap size={18}/>} label="Superposition" active={activeModule === 'coulomb'} onClick={() => setActiveModule('coulomb')} />
          <NavItem icon={<Layers size={18}/>} label="Electric Fields" active={false} />
          <NavItem icon={<Atom size={18}/>} label="Gauss's Law" active={false} />
          <NavItem icon={<Calculator size={18}/>} label="Capacitors" active={false} />
        </nav>
      </aside>

      {/* CENTRAL CANVAS */}
      <main className="flex-grow relative cursor-move">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none"></div>
        
        <Canvas camera={{ position: [0, 0, 10], fov: 45 }}>
          <color attach="background" args={['#020617']} />
          <ambientLight intensity={0.4} />
          <pointLight position={[10, 10, 10]} intensity={1.5} color="#ffffff" />
          
          <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
          <gridHelper args={[30, 30, '#1e293b', '#0f172a']} position={[0,-4,0]} />

          {calculatedCharges.map((c) => (
            <ChargeParticle key={c.id} id={c.id} position={c.pos} charge={c.q} netForce={c.netForce} />
          ))}
        </Canvas>

        {/* Status Overlay */}
        <div className="absolute top-6 left-6 bg-slate-900/80 border border-slate-700/50 p-4 rounded-xl backdrop-blur-md shadow-2xl">
          <h2 className="text-xs text-slate-400 uppercase tracking-widest mb-1 font-semibold">Active Engine</h2>
          <div className="text-lg font-mono text-cyan-400">Coulomb Superposition</div>
          <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse"></span>
            Vectors scale dynamically with force magnitude
          </div>
        </div>
      </main>

      {/* RIGHT SIDEBAR */}
      <aside className="w-80 flex-shrink-0 bg-slate-900/60 border-l border-slate-800 backdrop-blur-xl flex flex-col z-10">
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 custom-scrollbar">
          
          {/* Control Panel */}
          <div className="bg-slate-800/40 p-5 rounded-2xl border border-slate-700/50 shadow-inner">
            <h2 className="flex items-center gap-2 font-semibold mb-5 text-cyan-300">
              <Sliders size={18} /> System Parameters
            </h2>
            
            <div className="space-y-6">
              {charges.map((c, index) => (
                <div key={c.id} className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300 font-medium">Charge q{c.id} (μC)</span>
                    <span className="font-mono text-cyan-200">{c.q}</span>
                  </div>
                  <input 
                    type="range" min="-10" max="10" step="1" value={c.q}
                    onChange={(e) => updateCharge(index, 'q', e.target.value)}
                    className={`w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer ${
                      c.q > 0 ? 'accent-cyan-400' : c.q < 0 ? 'accent-pink-500' : 'accent-slate-400'
                    }`}
                  />
                  <div className="flex gap-2">
                    <AxisSlider label="X" value={c.pos[0]} onChange={(v) => { let p = [...c.pos]; p[0]=v; updateCharge(index, 'pos', p) }} />
                    <AxisSlider label="Y" value={c.pos[1]} onChange={(v) => { let p = [...c.pos]; p[1]=v; updateCharge(index, 'pos', p) }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* NCERT Revision Card */}
          <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-5 rounded-2xl border border-slate-700/50 shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.8)]"></div>
            
            <h2 className="flex items-center gap-2 font-semibold mb-4 text-white">
              <BookOpen size={18} className="text-cyan-400" /> NCERT Revision
            </h2>
            
            <div className="text-xs text-slate-300 space-y-4 leading-relaxed">
              <div>
                <strong className="text-pink-300 text-sm">Electric Charge</strong>
                <p className="mt-1">Property of a body by virtue of which it experiences electric force. Quantized: q = ne</p>
              </div>
              
              <div>
                <strong className="text-pink-300 text-sm">Electric Field Intensity</strong>
                <p className="mt-1">Force experienced by a vanishingly small test charge q₀ at a given point.</p>
                <div className="bg-black/40 font-mono text-cyan-300 text-center py-2 mt-2 rounded border border-slate-700">
                  E = lim(q₀→0) F / q₀
                </div>
              </div>

              <div>
                <strong className="text-pink-300 text-sm">Superposition Principle</strong>
                <p className="mt-1">Net electric field is the vector sum of individual fields.</p>
                <div className="bg-black/40 font-mono text-cyan-300 text-center py-2 mt-2 rounded border border-slate-700">
                  F_net = F₁ + F₂ + ... + Fₙ
                </div>
              </div>
            </div>
            
            <button className="mt-5 w-full py-2.5 bg-slate-700/50 hover:bg-cyan-600/30 border border-slate-600 hover:border-cyan-500/50 transition-all rounded-lg flex items-center justify-center gap-2 text-sm font-medium text-white group-hover:shadow-[0_0_15px_rgba(6,182,212,0.2)]">
              <PlayCircle size={16} /> Derivation Player
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}

// --- SUB-COMPONENTS ---
const NavItem = ({ icon, label, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
      active ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.1)]' : 'text-slate-400 hover:bg-slate-800 hover:text-white border border-transparent'
    }`}
  >
    {icon}
    <span className="hidden lg:inline text-sm font-medium">{label}</span>
  </button>
);

const AxisSlider = ({ label, value, onChange }) => (
  <div className="flex-1 flex items-center gap-2 bg-slate-900/50 px-2 py-1 rounded border border-slate-700/50">
    <span className="text-[10px] text-slate-400">{label}:</span>
    <input 
      type="range" min="-5" max="5" step="0.5" value={value} 
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full h-1 bg-slate-700 rounded appearance-none accent-slate-300" 
    />
  </div>
);
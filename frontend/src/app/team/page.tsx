'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Globe } from 'lucide-react';

/**
 * HOW TO ADD IMAGES AND NAMES:
 * 1. To add a member's photo: 
 *    - Place the image file in the `frontend/public/` folder (e.g., `frontend/public/members/john.jpg`).
 *    - Update the `image` field below to `"/members/john.jpg"`.
 * 2. To change names/roles:
 *    - Simply edit the `name` and `role` strings in the objects below.
 */

interface TeamMember {
  name: string;
  role: string;
  image: string;
  socials?: {
    github?: string;
    linkedin?: string;
    instagram?: string;
  };
}

const convenor: TeamMember = {
  name: "Anushka Ghosh",
  role: "CONVENOR",
  image: "/team/anushka.jpg",
};

const coordinators: TeamMember[] = [
  { name: "Debarghya Aich", role: "COORDINATOR", image: "/team/debarghya.jpg" },
  { name: "Subhadeb Mitra", role: "COORDINATOR", image: "/team/subhadeb.jpg" },
];

const volunteers: TeamMember[] = [
  { name: "Monobina Sinha", role: "VOLUNTEER", image: "/team/monobina.jpg" },
  { name: "Soumotirtha Das", role: "VOLUNTEER", image: "/team/soumotirtha.jpg" },
  { name: "Shubhomoy Samanta", role: "VOLUNTEER", image: "/team/shubhomoy.jpg" },
  { name: "Arijit Paswan", role: "VOLUNTEER", image: "/team/arijit.jpg" },
];

const builder: TeamMember = {
  name: "Deepjyoti Dey",
  role: "ARCHITECT & BUILDER",
  image: "/team/deepjyoti.jpg",
  socials: {
    github: "https://github.com/Deepjyoti1307",
    linkedin: "https://www.linkedin.com/in/deepjyoti-dey-13j2004",
    instagram: "https://www.instagram.com/deepjyoti1307"
  }
};

const MemberCard = ({ member, size = "md" }: { member: TeamMember, size?: "lg" | "md" | "sm" }) => (
  <div className={`relative group transition-all duration-500 hover:-translate-y-2 ${size === 'lg' ? 'w-full max-w-sm' : 'w-full'}`}>
    {/* Blood Glow Background */}
    <div className="absolute inset-0 bg-blood-red/30 opacity-0 group-hover:opacity-100 blur-2xl transition-opacity duration-700" />
    
    <div className="relative bg-zinc-950 border border-blood-red/20 group-hover:border-blood-red/80 transition-all duration-500 overflow-hidden shadow-2xl">
      {/* Photo with Blood Overlay */}
      <div className="relative aspect-[3/4] transition-all duration-700">
        <img src={member.image} alt={member.name} className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-1000 grayscale group-hover:grayscale-0" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-80" />
        <div className="absolute inset-0 bg-blood-red/10 opacity-0 group-hover:opacity-40 transition-opacity duration-700 mix-blend-multiply" />
        
        {/* Blood Drip Edge */}
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-blood-red to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        {/* Social Overlay */}
        <div className="absolute bottom-4 right-4 flex flex-col gap-3 translate-x-12 group-hover:translate-x-0 transition-transform duration-500">
          {member.socials?.github && (
            <a href={member.socials.github} target="_blank" rel="noopener noreferrer" className="p-2 bg-black/60 hover:bg-blood-red text-white transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
            </a>
          )}
          {member.socials?.linkedin && (
            <a href={member.socials.linkedin} target="_blank" rel="noopener noreferrer" className="p-2 bg-black/60 hover:bg-blood-red text-white transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>
            </a>
          )}
          {member.socials?.instagram && (
            <a href={member.socials.instagram} target="_blank" rel="noopener noreferrer" className="p-2 bg-black/60 hover:bg-blood-red text-white transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
            </a>
          )}
        </div>
      </div>

      <div className="p-6 space-y-2 bg-zinc-950 border-t border-blood-red/10 group-hover:border-blood-red/40 transition-colors">
        <div className="text-xs font-bold text-blood-red/60 group-hover:text-blood-red tracking-[0.3em] uppercase transition-colors">{member.role}</div>
        <div className="text-2xl font-black text-white tracking-widest uppercase drop-shadow-[0_0_8px_rgba(220,20,60,0)] group-hover:drop-shadow-[0_0_12px_rgba(220,20,60,0.8)] transition-all duration-500">
          {member.name}
        </div>
      </div>

      {/* Tactical Corner Decorations */}
      <div className="absolute top-0 right-0 w-12 h-12">
        <div className="absolute top-3 right-3 w-1.5 h-1.5 bg-blood-red shadow-[0_0_10px_#f00] opacity-40 group-hover:opacity-100 transition-opacity" />
        <div className="absolute top-3 right-3 w-6 h-[1px] bg-blood-red/30 group-hover:bg-blood-red transition-colors" />
        <div className="absolute top-3 right-3 w-[1px] h-6 bg-blood-red/30 group-hover:bg-blood-red transition-colors" />
      </div>
      
      {/* Blood Streak Decoration */}
      <div className="absolute -bottom-1 -right-1 w-24 h-24 bg-blood-red/10 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
    </div>
  </div>
);

export default function TeamPage() {
  return (
    <div className="bg-void-black min-h-screen text-on-surface font-mono relative overflow-x-hidden selection:bg-blood-red/40">

      {/* Background Theme */}
      <div className="fixed inset-0 z-0 bg-cover bg-center opacity-30 pointer-events-none" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCNcx60Jfp1KdmECGFeWD1Wim72Vi6llJHHP3rwVMqMCaB-SAFy8VP7Pt2Es766nwjj8_p2Ft9TGjMgXRccbAW57a0kzkfpyZu8ApmjbBN3PA54lTpJSLb9HW398KFb1WtvGSzw5q5ce2qgpqJPAAG4w9ut3p1BUHkl0FhbVIyC6RhOahSw6q9uzYxJz7bp1hPpdr1WRIGNhGMG_HXr47wmaxa6OXxRP3IOmZZzCxadtWXN22N5Q3Ew5L1ioxiAplPUZJFmiEcyOJq1')" }}>
        <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black" />
        <div className="absolute inset-0 bg-blood-red/5 mix-blend-multiply" />
      </div>

      <div className="relative z-10 p-6 md:p-12 max-w-7xl mx-auto space-y-24 pb-32">

        {/* Navigation */}
        <div className="flex justify-start">
          <Link href="/" className="flex items-center gap-3 text-xs font-bold text-on-surface/60 hover:text-blood-red tracking-[0.4em] uppercase transition-all group">
            {ArrowLeft && <ArrowLeft size={16} className="group-hover:-translate-x-2 transition-transform" />}
            BACK TO MISSION
          </Link>
        </div>

        {/* Header Section */}
        <div className="text-center space-y-6">
          <div className="inline-block px-4 py-1 border border-blood-red/40 bg-blood-red/10 text-blood-red text-xs font-bold tracking-[0.5em] uppercase animate-pulse">
            CLASSIFIED PERSONNEL
          </div>
          <h1 className="text-5xl md:text-7xl font-bold uppercase tracking-[0.3em] text-white drop-shadow-[0_0_20px_rgba(220,20,60,0.5)]">
            THE OPERATIVES
          </h1>
          <p className="max-w-2xl mx-auto text-on-surface-variant/60 tracking-widest text-xs leading-loose uppercase italic">
            "The architects of the digital forensic environment. Tasked with the orchestration of investigative segments and the preservation of truth amidst the chaos."
          </p>
        </div>

        {/* Hierarchy Sections */}
        <div className="space-y-32">

          {/* Level 1: Convenor */}
          <section className="flex flex-col items-center gap-12">
            <div className="text-center">
              <h2 className="text-lg font-bold text-blood-red tracking-[0.6em] uppercase">CONVENOR</h2>
              <div className="h-[2px] w-32 bg-gradient-to-r from-transparent via-blood-red to-transparent mt-4 mx-auto" />
            </div>
            <div className="w-full flex justify-center">
              <MemberCard member={convenor} size="lg" />
            </div>
          </section>

          {/* Level 2: Coordinators */}
          <section className="space-y-12">
            <div className="text-center">
              <h2 className="text-lg font-bold text-blood-red tracking-[0.6em] uppercase">COORDINATORS</h2>
              <div className="h-[2px] w-32 bg-gradient-to-r from-transparent via-blood-red to-transparent mt-4 mx-auto" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-4xl mx-auto">
              {coordinators.map((m, i) => <MemberCard key={i} member={m} />)}
            </div>
          </section>

          {/* Level 3: Volunteers */}
          <section className="space-y-12">
            <div className="text-center">
              <h2 className="text-lg font-bold text-blood-red tracking-[0.6em] uppercase">FIELD VOLUNTEERS</h2>
              <div className="h-[2px] w-32 bg-gradient-to-r from-transparent via-blood-red to-transparent mt-4 mx-auto" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {volunteers.map((m, i) => <MemberCard key={i} member={m} />)}
            </div>
          </section>

          {/* Level 4: Builder (Last) */}
          <section className="flex flex-col items-center gap-12 pt-12 border-t border-white/5">
            <div className="text-center">
              <h2 className="text-lg font-bold text-blood-red tracking-[0.6em] uppercase">CORE DEVELOPER</h2>
              <div className="h-[2px] w-32 bg-gradient-to-r from-transparent via-blood-red to-transparent mt-4 mx-auto" />
            </div>
            <div className="w-full flex justify-center">
              <MemberCard member={builder} size="lg" />
            </div>
          </section>

        </div>

      </div>

      {/* Footer Decoration */}
      <div className="fixed bottom-0 left-0 w-full h-1 bg-blood-red shadow-[0_0_20px_rgba(220,20,60,0.8)] z-50" />
    </div>
  );
}

'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import Logo from './logo.png';
import BreathingText from "@/components/fancy/text/breathing-text";

// Dynamically import the 3D scene so it only runs on the client
const Scene = dynamic(() => import('../components/Scene'), { ssr: false });

export default function LandingPage() {
  return (
    <div className="bg-background text-on-surface font-body-md min-h-screen flex flex-col relative overflow-x-hidden selection:bg-crimson-glare selection:text-white texture-overlay">

      {/* TopAppBar */}
      <header className="absolute top-0 left-0 w-full z-50 flex justify-between items-center px-8 md:px-16 h-20 bg-transparent">
        <div className="flex items-center gap-4">
          <Image src={Logo} alt="TechTrix Logo" width={40} height={40} className="object-contain" />
          <div className="flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-4">
            <span className="font-headline-xl text-xl md:text-2xl text-on-surface tracking-widest uppercase drop-shadow-[0_0_10px_rgba(220,20,60,0.5)]">
              TechTrix 2026
            </span>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <SignedIn>
            <UserButton appearance={{ elements: { userButtonAvatarBox: "w-10 h-10 border-2 border-blood-red" } }} />
          </SignedIn>
        </div>
      </header>

      {/* Main Content Canvas */}
      <main className="flex-1 flex flex-col relative w-full pb-20 md:pb-0">
        {/* Hero Section */}
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-void-black">
          {/* Background Image with Fog Overlay */}
          <div className="absolute inset-0 z-0 bg-cover bg-center" data-alt="A dark, cinematic scene with a blood-stained knife on the floor surrounded by heavy crimson fog." style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCNcx60Jfp1KdmECGFeWD1Wim72Vi6llJHHP3rwVMqMCaB-SAFy8VP7Pt2Es766nwjj8_p2Ft9TGjMgXRccbAW57a0kzkfpyZu8ApmjbBN3PA54lTpJSLb9HW398KFb1WtvGSzw5q5ce2qgpqJPAAG4w9ut3p1BUHkl0FhbVIyC6RhOahSw6q9uzYxJz7bp1hPpdr1WRIGNhGMG_HXr47wmaxa6OXxRP3IOmZZzCxadtWXN22N5Q3Ew5L1ioxiAplPUZJFmiEcyOJq1')" }}>
            <Scene />
            <div className="absolute inset-0 bg-fog-overlay z-10"></div>
            <div className="absolute inset-0 bg-blood-red/20 z-10 mix-blend-multiply"></div>
          </div>
          {/* Content Container */}
          <div className="relative z-20 container mx-auto px-8 md:px-16 text-center max-w-container-max-width">

            <div className="max-w-4xl mx-auto flex flex-col items-center">
              <h1 className="font-display-lg text-6xl md:text-8xl text-on-surface uppercase mb-8 drop-shadow-[0_0_10px_rgba(220,20,60,0.8)] glitch-effect tracking-widest" data-text="MURDER MYSTERY">
                MURDER MYSTERY
              </h1>
              <div className="mb-12 max-w-3xl text-center bg-black/60 p-6 border-l-4 border-blood-red shadow-[0_0_15px_rgba(220,20,60,0.5)]">
                <BreathingText
                  staggerDuration={0.08}
                  className="font-body-lg text-2xl md:text-3xl text-crimson-glare font-bold"
                >
                  The truth is buried in blood.
                </BreathingText>
              </div>
              <SignedOut>
                <Link href="/sign-in" className="bg-blood-red text-white font-headline-xl text-xl md:text-2xl px-12 py-5 rounded-full uppercase tracking-widest shadow-[0_0_20px_rgba(220,20,60,0.8)] hover:shadow-[0_0_40px_rgba(220,20,60,1)] transition-all duration-500 border-2 border-crimson-glare group relative overflow-hidden flex items-center justify-center text-center animate-pulse hover:animate-none">
                  <span className="relative z-10 text-white font-bold drop-shadow-md">JOIN NOW</span>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <div className="absolute inset-0 bg-crimson-glare/20 scale-x-0 group-hover:scale-x-125 transition-transform duration-700 rounded-full"></div>
                </Link>
              </SignedOut>
              <SignedIn>
                <Link href="/dashboard" className="bg-crimson-glare text-white font-headline-xl text-xl md:text-2xl px-12 py-5 rounded-full uppercase tracking-widest shadow-[0_0_20px_rgba(220,20,60,0.8)] border-2 border-white/20 transition-all duration-500 hover:scale-105">
                  <span className="relative z-10 font-bold">DASHBOARD</span>
                </Link>
              </SignedIn>
            </div>
          </div>
          {/* Red Ambient Glow Floor */}
          <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-blood-red/60 to-transparent z-10 pointer-events-none"></div>
        </section>
        {/* Footer */}
        <footer className="absolute bottom-0 w-full bg-transparent py-8 px-4 flex flex-wrap justify-center items-center gap-x-4 gap-y-2 z-50">
          <div className="text-tertiary font-body-md text-xs md:text-sm text-center tracking-wider">
            © 2026 TechTrix 2026. All rights reserved. Made with ❤️ by <span className="text-crimson-glare font-bold">Deepjyoti Dey</span>
          </div>
          <span className="hidden md:inline text-tertiary/30">|</span>
          <a aria-label="Instagram" className="text-tertiary hover:text-crimson-glare transition-all duration-300 flex items-center gap-2" href="https://www.instagram.com/techtrix_official?igsh=dGZjaDcxYzgyd2di" target="_blank" rel="noopener noreferrer">
            <svg className="feather feather-instagram" fill="none" height="18" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="18" xmlns="http://www.w3.org/2000/svg"><rect height="20" rx="5" ry="5" width="20" x="2" y="2"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"></line></svg>
            <span className="font-body-sm text-[10px] uppercase tracking-widest hidden sm:inline">Instagram</span>
          </a>
        </footer>
      </main>
      {/* BottomNavBar (Mobile) */}
      <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center h-16 bg-black/90 backdrop-blur-md lg:hidden bg-surface-container-lowest dark:bg-surface-container-lowest bg-void-black border-t-2 border-blood-red shadow-[0_-4px_20px_rgba(220,20,60,0.2)]">
        <a className="flex flex-col items-center justify-center text-crimson-glare scale-110 drop-shadow-hazard-glow" href="#">
          <span className="material-symbols-outlined">inventory_2</span>
          <span className="font-label-sm text-label-sm mt-1">Files</span>
        </a>
        <a className="flex flex-col items-center justify-center text-on-tertiary-container opacity-60 hover:opacity-100 hover:text-crimson-glare" href="#">
          <span className="material-symbols-outlined">enhanced_encryption</span>
          <span className="font-label-sm text-label-sm mt-1">Vault</span>
        </a>
        <a className="flex flex-col items-center justify-center text-on-tertiary-container opacity-60 hover:opacity-100 hover:text-crimson-glare" href="#">
          <span className="material-symbols-outlined">location_searching</span>
          <span className="font-label-sm text-label-sm mt-1">Map</span>
        </a>
        <a className="flex flex-col items-center justify-center text-on-tertiary-container opacity-60 hover:opacity-100 hover:text-crimson-glare" href="#">
          <span className="material-symbols-outlined">history_edu</span>
          <span className="font-label-sm text-label-sm mt-1">Log</span>
        </a>
      </nav>

    </div>
  );
}

import { SignIn } from "@clerk/nextjs";
import dynamic from 'next/dynamic';
import Image from 'next/image';
import Logo from '../../logo.png';

const Scene = dynamic(() => import('../../../components/Scene'), { ssr: false });

export default function SignInPage() {
  return (
    <div className="bg-background text-on-surface font-body-md min-h-screen flex flex-col relative overflow-x-hidden selection:bg-crimson-glare selection:text-white texture-overlay">
      
      {/* Background with Scene */}
      <div className="fixed inset-0 z-0 bg-void-black">
        <div className="absolute inset-0 z-0 bg-cover bg-center opacity-30" style={{backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCNcx60Jfp1KdmECGFeWD1Wim72Vi6llJHHP3rwVMqMCaB-SAFy8VP7Pt2Es766nwjj8_p2Ft9TGjMgXRccbAW57a0kzkfpyZu8ApmjbBN3PA54lTpJSLb9HW398KFb1WtvGSzw5q5ce2qgpqJPAAG4w9ut3p1BUHkl0FhbVIyC6RhOahSw6q9uzYxJz7bp1hPpdr1WRIGNhGMG_HXr47wmaxa6OXxRP3IOmZZzCxadtWXN22N5Q3Ew5L1ioxiAplPUZJFmiEcyOJq1')"}}>
          <Scene />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-void-black/60 via-transparent to-void-black/80 z-10"></div>
      </div>

      {/* Header */}
      <header className="absolute top-0 left-0 w-full z-50 flex justify-between items-center px-8 md:px-16 h-20 bg-transparent">
        <div className="flex items-center gap-4">
          <Image src={Logo} alt="TechTrix Logo" width={40} height={40} className="object-contain" />
          <div className="flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-4">
            <span className="font-headline-xl text-xl md:text-2xl text-blood-red tracking-widest uppercase">TechTrix 2026</span>
          </div>
        </div>
      </header>

      {/* Login Container */}
      <main className="relative z-20 flex-1 flex flex-col items-center justify-start py-20 px-4 overflow-y-auto">
        <div className="w-full max-w-md bg-void-black/90 backdrop-blur-2xl p-1 border-2 border-blood-red/60 shadow-[0_0_50px_rgba(220,20,60,0.5)] rounded-[2rem] overflow-hidden my-auto animate-pulse-glow">
          <div className="p-10 flex flex-col items-center">
            <h1 className="font-headline-xl text-4xl text-on-surface uppercase mb-10 drop-shadow-[0_0_20px_rgba(220,20,60,1)] tracking-[0.2em] text-center">
              IDENTITY VERIFICATION
            </h1>
            <SignIn 
              forceRedirectUrl="/post-auth"
              appearance={{
                elements: {
                  formButtonPrimary: "bg-crimson-glare hover:bg-blood-red text-white font-headline-md uppercase tracking-widest border-2 border-white/20 transition-all rounded-full h-12 shadow-[0_0_20px_rgba(220,20,60,0.6)] animate-pulse-glow",
                  card: "bg-transparent shadow-none border-0",
                  headerTitle: "hidden",
                  headerSubtitle: "text-on-surface-variant font-body-md text-center mb-6 opacity-70",
                  socialButtonsBlockButton: "bg-crimson-glare border-2 border-white/20 hover:bg-blood-red text-white transition-all rounded-full h-12 shadow-[0_0_15px_rgba(220,20,60,0.4)]",
                  socialButtonsBlockButtonText: "font-headline-md uppercase tracking-widest text-white",
                  dividerText: "text-on-surface-variant font-body-sm uppercase tracking-[0.2em] my-4",
                  formFieldLabel: "text-on-surface font-body-md uppercase tracking-wider mb-2 opacity-80",
                  formFieldInput: "bg-void-black border-2 border-blood-red/20 focus:border-crimson-glare text-on-surface rounded-xl h-11",
                  footer: "hidden",
                  identityPreviewText: "text-on-surface",
                  userButtonPopoverActionButtonText: "text-on-surface",
                  formResendCodeLink: "text-crimson-glare hover:text-blood-red font-bold",
                }
              }}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="absolute bottom-0 w-full bg-transparent py-8 px-8 md:px-16 flex justify-center items-center z-50">
        <div className="text-tertiary font-body-md text-sm md:text-base">
          © 2026 TechTrix 2026. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
